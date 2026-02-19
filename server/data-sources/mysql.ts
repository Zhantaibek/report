import mysql from 'mysql2/promise';
import type { ConnectionConfig } from '../db/repositories/dataSources.js';

export async function queryMysql(
  config: ConnectionConfig,
  sql: string,
  params: unknown[] = []
): Promise<Record<string, unknown>[]> {
  const conn = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
  });
  try {
    const [rows] = await conn.execute(sql, params);
    return (rows as Record<string, unknown>[]) ?? [];
  } finally {
    await conn.end();
  }
}

export async function testConnectionMysql(config: ConnectionConfig): Promise<boolean> {
  try {
    await queryMysql(config, 'SELECT 1');
    return true;
  } catch {
    return false;
  }
}
