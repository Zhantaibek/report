import pg from 'pg';
import { schema } from './schema-pg.js';
import type { DatabaseConfig } from '../config/index.js';

export type Pool = pg.Pool;

let _pool: pg.Pool | null = null;

export async function initDb(config: DatabaseConfig): Promise<pg.Pool> {
  const pool = new pg.Pool({
    host: config.host,
    port: config.port,
    database: config.database,
    user: config.user,
    password: config.password,
  });
  const client = await pool.connect();
  try {
    await client.query(schema);
  } finally {
    client.release();
  }
  _pool = pool;
  return pool;
}

export function setDb(pool: pg.Pool): void {
  _pool = pool;
}

export function getDb(): pg.Pool {
  if (!_pool) throw new Error('DB not initialized. Call setDb(await initDb(config)) first.');
  return _pool;
}

export async function closeDb(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}
