/**
 * Источники данных и маппинг полей из .env и кода (без таблиц data_sources / field_mappings).
 */

export type DataSourceType = 'postgres' | 'mssql' | 'mysql';

export interface DataSourceRow {
  id: number;
  name: string;
  type: DataSourceType;
  connection_config: string;
  is_active: number;
  created_at: string;
}

export interface ConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionTimeoutMillis?: number;
}

export interface FieldMappingRow {
  data_source_id: number;
  table_name: string;
  column_mappings: string;
}

const QUIK_SOURCE_ID = 1;

function buildQuikSource(): DataSourceRow | null {
  const host = process.env.POSTGRES_QUIK_HOST;
  const database = process.env.POSTGRES_QUIK_DATABASE;
  const user = process.env.POSTGRES_QUIK_USER;
  const password = process.env.POSTGRES_QUIK_PASSWORD ?? '';
  if (!host || !database || !user || String(password).length === 0) return null;
  const port = parseInt(process.env.POSTGRES_QUIK_PORT ?? '5432', 10);
  const config: ConnectionConfig = {
    host,
    port: Number.isNaN(port) ? 5432 : port,
    database,
    user,
    password,
  };
  return {
    id: QUIK_SOURCE_ID,
    name: 'QUIK Export',
    type: 'postgres',
    connection_config: JSON.stringify(config),
    is_active: 1,
    created_at: new Date().toISOString(),
  };
}

/** Маппинг колонок для Trades (в коде). */
const TRADES_FIELD_MAPPING: Record<string, string> = {
  id: 'TradeNum',
  operation: 'Operation',
  brokerCode: 'FirmId',
  brokerName: 'FirmName',
  counterparty: 'CPFirmId',
  counterpartyName: 'CPFirmName',
  classCode: 'ClassCode',
  secCode: 'SecCode',
  tradeDate: 'TradeDate',
  settleDate: 'SettleDate',
  price: 'Price',
  quantity: 'Qty',
  value: 'Value',
};

export function getDataSources(activeOnly = false): DataSourceRow[] {
  const ds = buildQuikSource();
  if (!ds) return [];
  if (activeOnly && ds.is_active !== 1) return [];
  return [ds];
}

export function getDataSourceById(id: number): DataSourceRow | undefined {
  const ds = buildQuikSource();
  if (!ds || ds.id !== id) return undefined;
  return ds;
}

export function getFieldMappingByDataSourceId(dataSourceId: number): FieldMappingRow | undefined {
  const ds = getDataSourceById(dataSourceId);
  if (!ds) return undefined;
  return {
    data_source_id: ds.id,
    table_name: 'Trades',
    column_mappings: JSON.stringify(TRADES_FIELD_MAPPING),
  };
}
