import sql from 'mssql';
import type { ConnectionConfig } from '../db/repositories/dataSources.js';

export async function queryMssql(
  config: ConnectionConfig,
  querySql: string,
  params: unknown[] = []
): Promise<Record<string, unknown>[]> {
  const pool = await sql.connect({
    server: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    options: { encrypt: false, trustServerCertificate: true },
  });
  try {
    const result = await pool.request().query(querySql);
    return (result.recordset as Record<string, unknown>[]) ?? [];
  } finally {
    await pool.close();
  }
}

export async function testConnectionMssql(config: ConnectionConfig): Promise<boolean> {
  try {
    await queryMssql(config, 'SELECT 1');
    return true;
  } catch {
    return false;
  }
}
