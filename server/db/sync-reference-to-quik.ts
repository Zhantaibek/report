import type pg from 'pg';
import { getDb } from './index.js';
import {
  getQuikConnectionConfig,
  isQuikConfigured,
  QUIK_REFERENCE_TABLES,
  type QuikReferenceTable,
} from '../config/quik-db.js';
import { withPostgresClient } from '../data-sources/postgres-mutate.js';

export interface SyncReferenceResult {
  ok: boolean;
  tables: Partial<Record<QuikReferenceTable, number>>;
  error?: string;
}

const TABLE_COLUMNS: Record<QuikReferenceTable, string[]> = {
  trade_class_rules: ['id', 'class_code', 'class_name', 'market_type'],
  commission_tariffs: [
    'id',
    'class_code',
    'volume_from',
    'volume_to',
    'side',
    'rate_percent',
    'discount_percent',
    'max_commission',
    'is_active',
  ],
  currency_rates: ['id', 'currency_code', 'rate_date', 'rate'],
  emitents: [
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
  ],
};

const TABLE_DDL: Record<QuikReferenceTable, string> = {
  trade_class_rules: `
    CREATE TABLE IF NOT EXISTS trade_class_rules (
      id SERIAL PRIMARY KEY,
      class_code TEXT NOT NULL UNIQUE,
      class_name TEXT,
      market_type TEXT NOT NULL CHECK (market_type IN ('primary', 'secondary'))
    )`,
  commission_tariffs: `
    CREATE TABLE IF NOT EXISTS commission_tariffs (
      id SERIAL PRIMARY KEY,
      class_code TEXT,
      volume_from NUMERIC(18,0) NOT NULL,
      volume_to NUMERIC(18,0),
      side TEXT NOT NULL CHECK (side IN ('seller', 'buyer', 'both')),
      rate_percent NUMERIC(9,2) NOT NULL,
      discount_percent NUMERIC(9,2),
      max_commission NUMERIC(18,0),
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    )`,
  currency_rates: `
    CREATE TABLE IF NOT EXISTS currency_rates (
      id SERIAL PRIMARY KEY,
      currency_code TEXT NOT NULL,
      rate_date DATE NOT NULL,
      rate DOUBLE PRECISION NOT NULL,
      UNIQUE (currency_code, rate_date)
    )`,
  emitents: `
    CREATE TABLE IF NOT EXISTS emitents (
      id BIGSERIAL PRIMARY KEY,
      name VARCHAR(255),
      address VARCHAR(500),
      city INTEGER,
      area INTEGER,
      state INTEGER,
      code CHAR(4),
      infusion NUMERIC(18,2),
      price NUMERIC(18,6),
      ind INTEGER,
      name_eng VARCHAR(255)
    )`,
};

async function ensureReferenceTables(client: pg.Client): Promise<void> {
  for (const table of QUIK_REFERENCE_TABLES) {
    await client.query(TABLE_DDL[table]);
  }
}

async function syncOneTable(client: pg.Client, table: QuikReferenceTable): Promise<number> {
  const columns = TABLE_COLUMNS[table];
  const appDb = getDb();
  const { rows } = await appDb.query<Record<string, unknown>>(
    `SELECT ${columns.join(', ')} FROM ${table} ORDER BY id ASC`,
  );

  await client.query(`TRUNCATE ${table} RESTART IDENTITY`);

  if (rows.length === 0) return 0;

  const batchSize = 200;
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize);
    const valuePlaceholders = batch
      .map(
        (_, rowIdx) =>
          `(${columns.map((_, colIdx) => `$${rowIdx * columns.length + colIdx + 1}`).join(', ')})`,
      )
      .join(', ');
    const values = batch.flatMap((row) => columns.map((col) => row[col]));
    await client.query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${valuePlaceholders}`,
      values,
    );
  }

  // Выровнять sequence после явных id
  await client.query(
    `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1), true)`,
  );

  return rows.length;
}

export async function syncReferenceTablesToQuik(
  tables: QuikReferenceTable[] = [...QUIK_REFERENCE_TABLES],
): Promise<SyncReferenceResult> {
  const config = getQuikConnectionConfig();
  if (!config) {
    return { ok: false, tables: {}, error: 'QUIK Export не настроен (POSTGRES_QUIK_*)' };
  }

  const allowed = new Set(QUIK_REFERENCE_TABLES);
  const toSync = tables.filter((t) => allowed.has(t));
  const result: SyncReferenceResult = { ok: true, tables: {} };

  try {
    await withPostgresClient(config, async (client) => {
      await client.query('BEGIN');
      try {
        await ensureReferenceTables(client);
        for (const table of toSync) {
          result.tables[table] = await syncOneTable(client, table);
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      }
    });
    const summary = toSync.map((t) => `${t}=${result.tables[t] ?? 0}`).join(', ');
    console.log(`[sync-quik] OK: ${summary}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[sync-quik] Failed:', message);
    return { ok: false, tables: result.tables, error: message };
  }

  return result;
}

export async function syncAllReferenceToQuik(): Promise<SyncReferenceResult> {
  return syncReferenceTablesToQuik();
}

/** Фоновая синхронизация после изменений в APP_DB (не блокирует ответ API). */
export function scheduleReferenceSyncToQuik(tables?: QuikReferenceTable[]): void {
  if (!isQuikConfigured()) return;
  void syncReferenceTablesToQuik(tables ?? [...QUIK_REFERENCE_TABLES]).catch((err) => {
    console.error('[sync-quik] Background sync failed:', err);
  });
}
