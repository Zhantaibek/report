import pg from 'pg';
import type { ConnectionConfig } from '../config/data-sources.js';
import { canMutateQuikExport } from '../config/app-env.js';
import { QuikConnectionError, isConnectionError } from './postgres.js';

const DEFAULT_CONNECT_TIMEOUT_MS = 5_000;

export async function withPostgresClient<T>(
  config: ConnectionConfig,
  fn: (client: pg.Client) => Promise<T>,
): Promise<T> {
  if (!canMutateQuikExport()) {
    throw new Error('Запись в QUIK Export запрещена при APP_ENV=development');
  }

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
    return await fn(client);
  } catch (err) {
    if (isConnectionError(err)) {
      throw new QuikConnectionError();
    }
    throw err;
  } finally {
    await client.end().catch(() => {});
  }
}
