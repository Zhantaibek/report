import { Router } from 'express';
import { authMiddleware, applyBrokerFilter } from '../auth/middleware.js';
import { runReport } from '../reports/report-engine.js';
import { reportToXlsxBuffer } from '../reports/export/xlsx.js';
import { reportToCsv } from '../reports/export/csv.js';
import { getDataSources } from '../config/data-sources.js';
import { getSecurities, getClasses, getFirms, runCustomSqlQuery } from '../data-sources/index.js';
import { queryOracleUsd, queryOracleInstruments, queryOracleGold, queryOracleIndex } from '../data-sources/oracle.js';
import { getCurrencyRateForDate } from '../db/repositories/currencyRates.js';
import { baseTradesQuery } from '../reports/report-definitions.js';
import { calculateCommissionForTrade } from '../reports/commission-engine.js';

const router = Router();

router.use(authMiddleware);

router.get('/securities', async (_req, res) => {
  try {
    const sources = getDataSources(true);
    const results = await Promise.all(sources.map((ds) => getSecurities(ds.id)));
    const merged = new Map<string, { secCode: string; classCode: string; secFullName: string }>();
    for (const list of results) {
      for (const item of list) {
        if (!merged.has(item.secCode)) merged.set(item.secCode, item);
      }
    }
    const securities = Array.from(merged.values()).sort((a, b) => a.secCode.localeCompare(b.secCode));
    console.log('[/api/reports/securities] returning', securities.length, 'securities');
    res.json(securities);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load securities' });
  }
});

router.get('/classes', async (_req, res) => {
  try {
    const sources = getDataSources(true);
    const results = await Promise.all(sources.map((ds) => getClasses(ds.id)));
    const merged = new Map<string, { code: string; name: string }>();
    for (const list of results) {
      for (const item of list) {
        if (!merged.has(item.code)) merged.set(item.code, item);
      }
    }
    const classes = Array.from(merged.values()).sort((a, b) => a.code.localeCompare(b.code));
    console.log('[/api/reports/classes] returning', classes.length, 'classes:', classes.map((c) => c.code).join(', '));
    res.json(classes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load classes' });
  }
});

router.get('/firms', async (_req, res) => {
  try {
    const sources = getDataSources(true);
    const results = await Promise.all(sources.map((ds) => getFirms(ds.id)));
    const merged = new Map<string, { firmId: string; firmName: string }>();
    for (const list of results) {
      for (const item of list) {
        if (!merged.has(item.firmId)) merged.set(item.firmId, item);
      }
    }
    const firms = Array.from(merged.values()).sort((a, b) => a.firmId.localeCompare(b.firmId));
    res.json(firms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load firms' });
  }
});

router.post('/run', async (req, res) => {
  try {
    const { reportFormId, dataSourceIds, filters = {}, page, limit } = req.body ?? {};
    if (!reportFormId) {
      res.status(400).json({ error: 'reportFormId required' });
      return;
    }
    const f = { ...filters };
    applyBrokerFilter(req, f);
    const result = await runReport({
      reportFormId: Number(reportFormId),
      dataSourceIds: Array.isArray(dataSourceIds) ? dataSourceIds.map(Number) : undefined,
      filters: f,
      page: page != null ? Number(page) : 1,
      limit: limit != null ? Number(limit) : 50,
    });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Report failed' });
  }
});

/** Список инструментов из Oracle CURRINSTRUMENT */
router.get('/usd/instruments', async (_req, res) => {
  try {
    const instruments = await queryOracleInstruments();
    res.json(instruments);
  } catch (err) {
    console.error('[/api/reports/usd/instruments]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Oracle query failed' });
  }
});

/**
 * USD-отчёт: данные из Oracle (ARCTS.DEAL) + курс USD из PostgreSQL.
 */
router.post('/usd', async (req, res) => {
  try {
    const { dateFrom, dateTo, ownId } = req.body ?? {};
    if (!dateFrom || !dateTo) {
      res.status(400).json({ error: 'dateFrom and dateTo required' });
      return;
    }

    const ownIdNum =
      ownId !== undefined && ownId !== null && ownId !== ''
        ? Number(ownId)
        : undefined;
    const oracleRows = await queryOracleUsd(
      dateFrom,
      dateTo,
      ownIdNum !== undefined && Number.isFinite(ownIdNum) ? ownIdNum : undefined,
    );

    // Добавляем курс USD из нашей PostgreSQL таблицы currency_rates
    const rows = await Promise.all(
      oracleRows.map(async (row) => {
        const rateRow = await getCurrencyRateForDate('USD', row.trade_date);
        const usd_rate = rateRow?.rate ?? null;
        const volume_som = usd_rate != null ? row.volume_usd * usd_rate : null;
        return {
          trade_date: row.trade_date,
          deal_count: row.deal_count,
          sec_count:  row.sec_count,
          price_usd:  100,
          volume_usd: row.volume_usd,
          usd_rate,
          volume_som,
        };
      })
    );

    res.json({ rows });
  } catch (err) {
    console.error('[/api/reports/usd]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Oracle query failed' });
  }
});

/**
 * Биржевой контракт золото: данные из Oracle (ARCTS.DEAL), индивидуальные сделки.
 */
router.post('/gold', async (req, res) => {
  try {
    const { dateFrom, dateTo, ownId } = req.body ?? {};
    if (!dateFrom || !dateTo) {
      res.status(400).json({ error: 'dateFrom and dateTo required' });
      return;
    }
    const ownIdNum =
      ownId !== undefined && ownId !== null && ownId !== ''
        ? Number(ownId)
        : undefined;
    const rawRows = await queryOracleGold(
      dateFrom,
      dateTo,
      ownIdNum !== undefined && Number.isFinite(ownIdNum) ? ownIdNum : undefined,
    );
    const rows = await Promise.all(
      rawRows.map(async (row) => {
        const { sellerCommission, buyerCommission } = await calculateCommissionForTrade({
          classCode: row.sec_extcode ?? undefined,
          value: row.value,
          tradeDate: row.trade_date,
        });
        return {
          ...row,
          sellerCommission: sellerCommission ?? 0,
          buyerCommission: buyerCommission ?? 0,
        };
      }),
    );
    res.json({ rows });
  } catch (err) {
    console.error('[/api/reports/gold]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Oracle query failed' });
  }
});

router.post('/index', async (req, res) => {
  try {
    const { dateFrom, dateTo } = req.body ?? {};
    if (!dateFrom || !dateTo) {
      res.status(400).json({ error: 'dateFrom and dateTo required' });
      return;
    }
    const rows = await queryOracleIndex(dateFrom, dateTo);
    res.json({ rows });
  } catch (err) {
    console.error('[/api/reports/index]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Oracle query failed' });
  }
});

router.post('/export', async (req, res) => {
  try {
    const { reportFormId, dataSourceIds, filters = {}, format } = req.body ?? {};
    if (!reportFormId) {
      res.status(400).json({ error: 'reportFormId required' });
      return;
    }
    const f = { ...filters };
    applyBrokerFilter(req, f);
    const result = await runReport({
      reportFormId: Number(reportFormId),
      dataSourceIds: Array.isArray(dataSourceIds) ? dataSourceIds.map(Number) : undefined,
      filters: f,
      page: 1,
      limit: 100000,
    });
    const fmt = (format ?? 'xlsx').toLowerCase();
    if (fmt === 'csv') {
      const csv = reportToCsv(result);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename=report.csv');
      res.send(csv);
    } else {
      const buf = reportToXlsxBuffer(result);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=report.xlsx');
      res.send(buf);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Export failed' });
  }
});

// Для блока "Сделки за сегодня" используем тот же SQL, что и форма 1 (baseTradesQuery).
const todayTradesQuery = baseTradesQuery;

/**
 * Сделки за сегодня для главной страницы.
 * Использует запрос с явным JOIN покупатель/продавец.
 */
router.get('/today-trades', async (_req, res) => {
  try {
    const sources = getDataSources(true);
    if (sources.length === 0) {
      res.json([]);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    let rows: Record<string, unknown>[] = [];

    for (const ds of sources) {
      const part = await runCustomSqlQuery(ds.id, todayTradesQuery, {
        dateFrom: today,
        dateTo: today,
      });
      rows = rows.concat(part);
    }

    const unique = new Map<string, Record<string, unknown>>();
    for (const row of rows) {
      const id = String((row as any).id ?? '');
      if (!id) continue;
      if (!unique.has(id)) {
        unique.set(id, row);
      }
    }

    res.json(Array.from(unique.values()));
  } catch (err) {
    console.error('[/api/reports/today-trades]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load today trades' });
  }
});

/**
 * График по дневным объёмам сделок за выбранный месяц.
 * Параметр month в формате YYYY-MM, по умолчанию — текущий месяц.
 */
router.get('/daily-volumes', async (req, res) => {
  try {
    const { month } = req.query as { month?: string };
    const now = new Date();
    const defaultMonth = now.toISOString().slice(0, 7);
    const m = typeof month === 'string' && /^\d{4}-\d{2}$/.test(month) ? month : defaultMonth;

    const [yearStr, monthStr] = m.split('-');
    const year = Number(yearStr);
    const mon = Number(monthStr); // 1-12
    const startDate = `${m}-01`;
    const endDateObj = new Date(Date.UTC(year, mon, 0));
    const endDate = endDateObj.toISOString().slice(0, 10);

    const sql = `
      SELECT
        to_char(b."TradeDate", 'YYYY-MM-DD') AS "date",
        SUM(b."Value") AS "totalValue"
      FROM "Trades" b
      WHERE b."Operation" = 'Купля'
        AND b."TradeDate" BETWEEN $1 AND $2
      GROUP BY to_char(b."TradeDate", 'YYYY-MM-DD')
      ORDER BY "date"
    `.trim();

    const sources = getDataSources(true);
    if (sources.length === 0) {
      res.json({ month: m, points: [] });
      return;
    }

    const aggregated = new Map<string, number>();

    for (const ds of sources) {
      const part = await runCustomSqlQuery(ds.id, sql, {
        dateFrom: startDate,
        dateTo: endDate,
      });
      for (const row of part) {
        const d = String((row as any).date ?? '');
        const v = Number((row as any).totalValue ?? 0);
        if (!d) continue;
        aggregated.set(d, (aggregated.get(d) ?? 0) + v);
      }
    }

    const points = Array.from(aggregated.entries())
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([date, totalValue]) => ({ date, totalValue }));

    res.json({ month: m, points });
  } catch (err) {
    console.error('[/api/reports/daily-volumes]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load daily volumes' });
  }
});

export default router;
