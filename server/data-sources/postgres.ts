import pg from 'pg';
import type { ConnectionConfig } from '../db/repositories/dataSources.js';

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
  });
  await client.connect();
  try {
    const res = await client.query(sql, params);
    return (res.rows as Record<string, unknown>[]) ?? [];
  } finally {
    await client.end();
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
