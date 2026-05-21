import type { Trade, ReportResult } from '../types/index.js';
import { getDataSources } from '../config/data-sources.js';
import { getTrades, runCustomSqlQuery } from '../data-sources/index.js';
import { applyFilters, normalizeTradesForReport } from './filters.js';
import { runTable } from './runners/table-runner.js';
import { runSummary } from './runners/summary-runner.js';
import { runChart } from './runners/chart-runner.js';
import type { RunReportParams } from '../types/index.js';
import { getReportDefinition, getSqlForReport } from './report-definitions.js';
import { getReportFormById } from '../db/repositories/reportForms.js';
import { calculateCommissionForTrade } from './commission-engine.js';

export async function runReport(params: RunReportParams): Promise<ReportResult> {
  const { reportFormId, dataSourceIds = [], filters } = params;

  // Получаем форму из БД (базовые данные: id, code, name, description, type)
  const dbForm = await getReportFormById(reportFormId);
  if (!dbForm) throw new Error('Report form not found in database');
  
  // Получаем определение из кода (включая SQL-запрос)
  const definition = getReportDefinition(dbForm.code);
  if (!definition) throw new Error(`Report definition for code "${dbForm.code}" not found in code`);
  
  // Преобразуем в формат, совместимый со старым API
  const form = {
    id: dbForm.id,
    code: definition.code,
    name: dbForm.name,
    description: dbForm.description,
    type: dbForm.type,
    columns: null,
    groupBy: null,
    aggregates: null,
    filters: null,
    chartConfig: null,
    requiredFields: null,
    customSql: null,
  };

  const sources = getDataSources(true);
  const sourceIds = dataSourceIds.length > 0 ? dataSourceIds : sources.map((ds) => ds.id);

  const sqlQuery = getSqlForReport(definition.code);
  if (sqlQuery && sourceIds.length === 0) {
    throw new Error('Нет активных источников данных. Настройте переменные POSTGRES_QUIK_HOST, POSTGRES_QUIK_DATABASE, POSTGRES_QUIK_USER, POSTGRES_QUIK_PASSWORD в .env');
  }

  let allTrades: Trade[] = [];

  if (sqlQuery) {
    for (const id of sourceIds) {
      const rows = await runCustomSqlQuery(id, sqlQuery, filters);
      allTrades = allTrades.concat(rows as Trade[]);
    }
  } else {
    // Если SQL не определен, используем автогенерацию
    for (const id of sourceIds) {
      const trades = await getTrades(id, filters);
      allTrades = allTrades.concat(trades);
    }
  }

  // Дедупликация по ID сделки (на случай, если разные источники вернули одинаковые сделки)
  // Для аукционов не дедуплицируем — строки агрегированы (по цене или сравнение текущий/предыдущий)
  let uniqueTrades: Trade[];
  if (form.code === 'Auction_Summary' || form.code === 'Auction_Summary_2' || form.code === 'Auction_Bid_Classification' || form.code === 'Auction_Central_Depository' || form.code === 'Auction_Additional_Placement' || form.code === 'Exchange_Contract' || form.code === 'Exchange_Certificate' || form.code === 'Blank_Form_7' || form.code === 'StateHolding_Form5_Top5' || form.code === 'StateHolding_Form7' || form.code === 'StateHolding_Form8' || form.code === 'StateHolding_Form10') {
    uniqueTrades = allTrades;
  } else {
    const uniqueTradesMap = new Map<string, Trade>();
    for (const trade of allTrades) {
      const tradeId = String((trade as any).id ?? (trade as any).secCode ?? trade.dealNo ?? '');
      if (tradeId && !uniqueTradesMap.has(tradeId)) {
        uniqueTradesMap.set(tradeId, trade);
      }
    }
    uniqueTrades = Array.from(uniqueTradesMap.values());
  }

  // Обогащаем уникальные сделки рассчитанными комиссиями (если есть объём)
  const withCommissions: Trade[] = [];
  for (const trade of uniqueTrades) {
    const value = Number((trade as any).value ?? 0);
    if (!Number.isFinite(value) || value <= 0) {
      withCommissions.push(trade);
      continue;
    }
    const classCode = (trade as any).classCode as string | undefined;
    const tradeDateRaw =
      (trade as any).tradeDate ??
      (trade as any).dealDate ??
      trade.dealTime ??
      undefined;
    const tradeDate =
      tradeDateRaw instanceof Date ? tradeDateRaw.toISOString().slice(0, 10) : (tradeDateRaw ? String(tradeDateRaw).slice(0, 10) : undefined);

    const { sellerCommission, buyerCommission } = await calculateCommissionForTrade({
      classCode,
      value,
      tradeDate,
    });

    if (sellerCommission == null && buyerCommission == null) {
      withCommissions.push(trade);
    } else {
      withCommissions.push({
        ...trade,
        sellerCommission,
        buyerCommission,
      } as Trade);
    }
  }

  // Если использовался custom SQL с параметрами, фильтрация уже применена в запросе
  // Для аукционов в строках нет brokerId — применяем только фильтр по инструменту
  const filtered = sqlQuery
    ? applyFilters(withCommissions, (form.code === 'Auction_Summary' || form.code === 'Auction_Summary_2' || form.code === 'Auction_Bid_Classification' || form.code === 'Auction_Central_Depository' || form.code === 'Auction_Additional_Placement' || form.code === 'Exchange_Contract' || form.code === 'Exchange_Certificate' || form.code === 'Blank_Form_7' || form.code === 'StateHolding_Form5_Top5' || form.code === 'StateHolding_Form7' || form.code === 'StateHolding_Form8' || form.code === 'StateHolding_Form10')
        ? { instrument: filters.instrument, classCode: filters.classCode }
        : { brokerId: filters.brokerId, firmCode: filters.firmCode, instrument: filters.instrument, classCode: filters.classCode })
    : applyFilters(withCommissions, filters);
  const normalized = normalizeTradesForReport(filtered);

  if (form.type === 'table') {
    const out = runTable(normalized, form);
    return { type: 'table', ...out };
  }
  if (form.type === 'summary') {
    const rows = runSummary(normalized, form);
    return { type: 'summary', rows };
  }
  if (form.type === 'chart') {
    const chartData = runChart(normalized, form);
    return { type: 'chart', ...chartData };
  }

  throw new Error('Unknown report form type');
}
