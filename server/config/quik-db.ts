import type { ConnectionConfig } from './data-sources.js';

/** Таблицы-справочники, которые можно изменять в QUIK Export (копии из APP_DB). */
export const QUIK_REFERENCE_TABLES = [
  'trade_class_rules',
  'commission_tariffs',
  'currency_rates',
  'emitents',
] as const;

export type QuikReferenceTable = (typeof QUIK_REFERENCE_TABLES)[number];

export function getQuikConnectionConfig(): ConnectionConfig | null {
  const host = process.env.POSTGRES_QUIK_HOST;
  const database = process.env.POSTGRES_QUIK_DATABASE;
  const user = process.env.POSTGRES_QUIK_USER;
  const password = process.env.POSTGRES_QUIK_PASSWORD ?? '';
  if (!host || !database || !user || String(password).length === 0) return null;
  const port = parseInt(process.env.POSTGRES_QUIK_PORT ?? '5432', 10);
  return {
    host,
    port: Number.isNaN(port) ? 5432 : port,
    database,
    user,
    password,
  };
}

export function isQuikConfigured(): boolean {
  return getQuikConnectionConfig() != null;
}
