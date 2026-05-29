import type { Trade } from '../types/index.js';
import { getDataSourceById, getFieldMappingByDataSourceId } from '../config/data-sources.js';
import { buildSelectQuery } from './build-select.js';
import { queryPostgres } from './postgres.js';
import { queryMssql } from './mssql.js';
import { queryMysql } from './mysql.js';
import type { DataSourceType } from '../config/data-sources.js';

export interface TradeFilters {
  dateFrom?: string;
  dateTo?: string;
  brokerId?: number;
  firmCode?: string;
  instrument?: string;
  classCode?: string;
}

export interface FirmItem {
  firmId: string;
  firmName: string;
}

export interface SecurityItem {
  secCode: string;
  classCode: string;
  secFullName: string;
  isinCode: string;
}

export interface ClassItem {
  code: string;
  name: string;
}

/**
 * Run custom SQL query on data source with parameters.
 */
export async function runCustomSqlQuery(
  dataSourceId: number,
  customSql: string,
  filters?: TradeFilters
): Promise<Record<string, unknown>[]> {
  const ds = getDataSourceById(dataSourceId);
  if (!ds || !ds.is_active) return [];

  const config = JSON.parse(ds.connection_config) as {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };

  // Параметры для кастомного SQL: $1=dateFrom, $2=dateTo
  // Если даты не переданы, BETWEEN NULL AND NULL вернёт 0 строк — подставляем одну дату
  const defaultDate = new Date().toISOString().slice(0, 10);
  const params: (string | null)[] = [
    filters?.dateFrom ?? defaultDate,
    filters?.dateTo ?? filters?.dateFrom ?? defaultDate,
  ];

  let rows: Record<string, unknown>[];
  switch (ds.type) {
    case 'postgres':
      rows = await queryPostgres(config, customSql, params);
      break;
    case 'mssql':
      // MSSQL использует другой синтаксис параметров (@p1, @p2...), требуется адаптация
      rows = await queryMssql(config, customSql);
      break;
    case 'mysql':
      // MySQL использует ?, требуется адаптация
      rows = await queryMysql(config, customSql);
      break;
    default:
      return [];
  }

  return rows.map((row) => ({
    ...row,
    sourceId: ds.id,
    sourceName: ds.name,
  }));
}

/**
 * Fetch trades from one external data source. ONLY runs SELECT.
 */
export async function getTrades(
  dataSourceId: number,
  _filters?: TradeFilters
): Promise<Trade[]> {
  const ds = getDataSourceById(dataSourceId);
  if (!ds || !ds.is_active) return [];

  const mapping = getFieldMappingByDataSourceId(dataSourceId);
  if (!mapping) return [];

  const columnMappings = JSON.parse(mapping.column_mappings) as Record<string, string>;
  const { sql } = buildSelectQuery(mapping.table_name, columnMappings, ds.type as DataSourceType);

  let rows: Record<string, unknown>[];
  const config = JSON.parse(ds.connection_config) as { host: string; port: number; user: string; password: string; database: string };

  switch (ds.type) {
    case 'postgres':
      rows = await queryPostgres(config, sql);
      break;
    case 'mssql':
      rows = await queryMssql(config, sql);
      break;
    case 'mysql':
      rows = await queryMysql(config, sql);
      break;
    default:
      return [];
  }

  const trades: Trade[] = rows.map((row) => ({
    ...row,
    sourceId: ds.id,
    sourceName: ds.name,
  })) as Trade[];

  return applyFiltersInMemory(trades, _filters ?? {});
}

function applyFiltersInMemory(trades: Trade[], filters: TradeFilters): Trade[] {
  let result = trades;
  if (filters.dateFrom) {
    result = result.filter((t) => {
      const dt = t.dealTime ?? t.dealDate ?? (t as any).tradeDate;
      if (!dt) return false;
      const dateStr = dt instanceof Date ? dt.toISOString().slice(0, 10) : String(dt).slice(0, 10);
      return dateStr >= filters.dateFrom!;
    });
  }
  if (filters.dateTo) {
    result = result.filter((t) => {
      const dt = t.dealTime ?? t.dealDate ?? (t as any).tradeDate;
      if (!dt) return false;
      const dateStr = dt instanceof Date ? dt.toISOString().slice(0, 10) : String(dt).slice(0, 10);
      return dateStr <= filters.dateTo!;
    });
  }
  if (filters.brokerId != null) {
    result = result.filter((t) => Number(t.brokerId) === filters.brokerId || t.brokerCode === String(filters.brokerId));
  }
  if (filters.firmCode) {
    const fc = filters.firmCode;
    result = result.filter((t) => String(t.brokerCode ?? '') === fc);
  }
  if (filters.instrument) {
    const instrument = filters.instrument.toLowerCase();
    result = result.filter((t) => {
      const secCode = String((t as any).secCode ?? t.instrument ?? '').toLowerCase();
      return secCode.includes(instrument);
    });
  }
  return result;
}

async function queryDs(
  ds: Awaited<ReturnType<typeof getDataSourceById>>,
  sql: string
): Promise<Record<string, unknown>[]> {
  if (!ds || !ds.is_active) return [];
  const config = JSON.parse(ds.connection_config) as { host: string; port: number; user: string; password: string; database: string };
  switch (ds.type) {
    case 'postgres': return queryPostgres(config, sql);
    case 'mssql': return queryMssql(config, sql);
    case 'mysql': return queryMysql(config, sql);
    default: return [];
  }
}

/**
 * Нечувствительный к регистру поиск значения в строке результата БД.
 * PostgreSQL/MSSQL/MySQL могут возвращать имена колонок в разном регистре.
 */
function getField(row: Record<string, unknown>, ...names: string[]): unknown {
  for (const name of names) {
    if (row[name] !== undefined) return row[name];
    const lower = name.toLowerCase();
    const upper = name.toUpperCase();
    if (row[lower] !== undefined) return row[lower];
    if (row[upper] !== undefined) return row[upper];
    // полный перебор ключей без учёта регистра
    const key = Object.keys(row).find((k) => k.toLowerCase() === lower);
    if (key !== undefined) return row[key];
  }
  return undefined;
}

export async function getSecurities(dataSourceId: number): Promise<SecurityItem[]> {
  const ds = await getDataSourceById(dataSourceId);
  if (!ds || !ds.is_active) return [];
  try {
    const rows = await queryDs(ds, `SELECT "SecCode", "ClassCode", "SecFullName", "ISINCode" FROM "Securities" ORDER BY "ClassCode", "SecFullName", "SecCode"`);
    return rows
      .map((r) => ({
        secCode: String(getField(r, 'SecCode', 'seccode', 'SECCODE') ?? ''),
        classCode: String(getField(r, 'ClassCode', 'classcode', 'CLASSCODE') ?? ''),
        secFullName: String(getField(r, 'SecFullName', 'secfullname', 'SECFULLNAME') ?? ''),
        isinCode: String(getField(r, 'ISINCode', 'isincode', 'ISINCODE') ?? ''),
      }))
      .filter((s) => s.secCode);
  } catch (e) {
    console.error('[getSecurities] error:', e);
    return [];
  }
}

export async function getClasses(dataSourceId: number): Promise<ClassItem[]> {
  const ds = await getDataSourceById(dataSourceId);
  if (!ds || !ds.is_active) return [];

  // Пробуем таблицу Classes с типичными вариантами колонок QUIK
  const classesQueries = [
    // QUIK: ClassCode + ClassName
    `SELECT "ClassCode" AS code, COALESCE("ClassName", "ClassCode") AS name FROM "Classes" ORDER BY "ClassCode"`,
    // Альтернативные имена
    `SELECT "Code" AS code, COALESCE("Name", "Code") AS name FROM "Classes" ORDER BY "Code"`,
    `SELECT "code" AS code, COALESCE("name", "code") AS name FROM "Classes" ORDER BY "code"`,
  ];

  for (const sql of classesQueries) {
    try {
      const rows = await queryDs(ds, sql);
      if (rows.length > 0) {
        return rows
          .map((r) => ({
            code: String(getField(r, 'code') ?? ''),
            name: String(getField(r, 'name') ?? getField(r, 'code') ?? ''),
          }))
          .filter((c) => c.code);
      }
    } catch {
      // этот вариант не подошёл — пробуем следующий
    }
  }

  // Фолбек: distinct ClassCode из Securities
  try {
    const rows = await queryDs(ds, `SELECT DISTINCT "ClassCode" FROM "Securities" WHERE "ClassCode" IS NOT NULL ORDER BY "ClassCode"`);
    if (rows.length > 0) {
      return rows
        .map((r) => {
          const code = String(getField(r, 'ClassCode', 'classcode', 'CLASSCODE') ?? '');
          return { code, name: code };
        })
        .filter((c) => c.code);
    }
  } catch {
    // Securities недоступна — последний фолбек по Trades
  }

  // Последний фолбек: distinct ClassCode из Trades
  try {
    const rows = await queryDs(ds, `SELECT DISTINCT "ClassCode" FROM "Trades" WHERE "ClassCode" IS NOT NULL ORDER BY "ClassCode"`);
    return rows
      .map((r) => {
        const code = String(getField(r, 'ClassCode', 'classcode', 'CLASSCODE') ?? '');
        return { code, name: code };
      })
      .filter((c) => c.code);
  } catch (e) {
    console.error('[getClasses] error:', e);
    return [];
  }
}

export async function getFirms(dataSourceId: number): Promise<FirmItem[]> {
  const ds = await getDataSourceById(dataSourceId);
  if (!ds || !ds.is_active) return [];
  try {
    const rows = await queryDs(ds, `SELECT "FirmId", COALESCE("FirmName", "FirmId") AS "FirmName" FROM "Firms" ORDER BY "FirmId"`);
    return rows
      .map((r) => ({
        firmId: String(getField(r, 'FirmId', 'firmid', 'FIRMID') ?? ''),
        firmName: String(getField(r, 'FirmName', 'firmname', 'FIRMNAME') ?? ''),
      }))
      .filter((f) => f.firmId);
  } catch (e) {
    console.error('[getFirms] error:', e);
    return [];
  }
}

export async function testConnection(
  type: DataSourceType,
  config: { host: string; port: number; user: string; password: string; database: string }
): Promise<boolean> {
  const { testConnectionPostgres } = await import('./postgres.js');
  const { testConnectionMssql } = await import('./mssql.js');
  const { testConnectionMysql } = await import('./mysql.js');
  switch (type) {
    case 'postgres':
      return testConnectionPostgres(config);
    case 'mssql':
      return testConnectionMssql(config);
    case 'mysql':
      return testConnectionMysql(config);
    default:
      return false;
  }
}
