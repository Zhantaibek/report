/**
 * Разовый импорт emitents: QUIK Export → APP_DB.
 * Запуск: npm run db:migrate && npm run db:import-emitents
 */
import dotenv from 'dotenv';

dotenv.config();

import { config } from '../config/index.js';
import { isProductionApp } from '../config/app-env.js';
import { getQuikConnectionConfig } from '../config/quik-db.js';
import { queryPostgres } from '../data-sources/postgres.js';
import { initDb, getDb, closeDb, setDb } from './index.js';

const COLUMNS = [
  'id',
  'name',
  'address',
  'city',
  'area',
  'state',
  'code',
  'infusion',
  'price',
  'ind',
  'name_eng',
] as const;

const BATCH_SIZE = 200;

async function main(): Promise<void> {
  if (!isProductionApp()) {
    console.error('[import-emitents] Запускайте только на сервере (APP_ENV=production)');
    process.exit(1);
  }

  const quikConfig = getQuikConnectionConfig();
  if (!quikConfig) {
    throw new Error('QUIK Export не настроен (POSTGRES_QUIK_*)');
  }

  console.log(`[import-emitents] QUIK: ${quikConfig.host}/${quikConfig.database}`);
  const countRes = await queryPostgres(quikConfig, 'SELECT COUNT(*)::int AS cnt FROM emitents');
  const quikCount = Number(countRes[0]?.cnt ?? 0);
  console.log(`[import-emitents] QUIK emitents count: ${quikCount}`);
  if (quikCount === 0) {
    console.warn('[import-emitents] Nothing to import');
    return;
  }

  const rows = await queryPostgres(
    quikConfig,
    `SELECT ${COLUMNS.join(', ')} FROM emitents ORDER BY id ASC`,
  );
  if (rows.length !== quikCount) {
    throw new Error(`Expected ${quikCount} rows, fetched ${rows.length}`);
  }
  console.log(`[import-emitents] Fetched ${rows.length} rows`);

  setDb(await initDb(config.database));
  const db = getDb();

  await db.query('BEGIN');
  try {
    await db.query('TRUNCATE emitents RESTART IDENTITY');

    for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
      const batch = rows.slice(offset, offset + BATCH_SIZE);
      const placeholders = batch
        .map(
          (_, rowIdx) =>
            `(${COLUMNS.map((_, colIdx) => `$${rowIdx * COLUMNS.length + colIdx + 1}`).join(', ')})`,
        )
        .join(', ');
      const values = batch.flatMap((row) => COLUMNS.map((col) => row[col] ?? null));
      await db.query(
        `INSERT INTO emitents (${COLUMNS.join(', ')}) VALUES ${placeholders}`,
        values,
      );
    }

    await db.query(
      `SELECT setval(pg_get_serial_sequence('emitents', 'id'), COALESCE((SELECT MAX(id) FROM emitents), 1), true)`,
    );
    await db.query('COMMIT');
  } catch (err) {
    await db.query('ROLLBACK');
    throw err;
  } finally {
    await closeDb();
  }

  console.log(`[import-emitents] Imported ${rows.length} rows into APP_DB`);
}

main().catch((err) => {
  console.error('[import-emitents] Failed:', err);
  process.exit(1);
});
