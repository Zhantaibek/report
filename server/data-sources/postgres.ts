import pg from 'pg';
import type { ConnectionConfig } from '../config/data-sources.js';

const DEFAULT_CONNECT_TIMEOUT_MS = 5_000;

export class QuikConnectionError extends Error {
  constructor(message = 'Не удалось подключиться к базе QUIK Export') {
    super(message);
    this.name = 'QuikConnectionError';
  }
}

export function isConnectionError(err: unknown): boolean {
  if (err instanceof QuikConnectionError) return true;
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('timeout expired') || msg.includes('connect timeout')) return true;
  }
  if (!err || typeof err !== 'object') return false;
  const code = 'code' in err ? String((err as { code?: string }).code) : '';
  return ['ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET', 'EHOSTUNREACH'].includes(code);
}

export async function queryPostgres(
  config: ConnectionConfig,
  sql: string,
  params: unknown[] = []
): Promise<Record<string, unknown>[]> {
  const client = new pg.Client({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectionTimeoutMillis: config.connectionTimeoutMillis ?? DEFAULT_CONNECT_TIMEOUT_MS,
  });
  try {
    await client.connect();
    const res = await client.query(sql, params);
    return (res.rows as Record<string, unknown>[]) ?? [];
  } catch (err) {
    if (isConnectionError(err)) {
      throw new QuikConnectionError();
    }
    throw err;
  } finally {
    await client.end().catch(() => {});
  }
}

export async function testConnectionPostgres(config: ConnectionConfig): Promise<boolean> {
  try {
    await queryPostgres(config, 'SELECT 1');
    return true;
  } catch {
    return false;
  }
}
