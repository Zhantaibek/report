import { getDb } from '../index.js';

export interface Emitent {
  id: number;
  name: string | null;
  address: string | null;
  city: number | null;
  area: number | null;
  state: number | null;
  code: string | null;
  infusion: number | null;
  price: number | null;
  ind: number | null;
  name_eng: string | null;
}

export interface CreateEmitentDto {
  name: string;
  address?: string | null;
  city?: number | null;
  area?: number | null;
  state?: number | null;
  code?: string | null;
  infusion?: number | null;
  price?: number | null;
  ind?: number | null;
  name_eng?: string | null;
}

export interface UpdateEmitentDto {
  name?: string;
  address?: string | null;
  city?: number | null;
  area?: number | null;
  state?: number | null;
  code?: string | null;
  infusion?: number | null;
  price?: number | null;
  ind?: number | null;
  name_eng?: string | null;
}

const SELECT_FIELDS =
  'id, name, address, city, area, state, code, infusion, price, ind, name_eng';

export async function getAllEmitents(): Promise<Emitent[]> {
  const db = getDb();
  const result = await db.query<Emitent>(
    `SELECT ${SELECT_FIELDS} FROM emitents ORDER BY name ASC NULLS LAST, id ASC`,
  );
  return result.rows;
}

export async function getEmitentsCount(): Promise<number> {
  const db = getDb();
  const result = await db.query<{ count: number }>(
    'SELECT COUNT(*)::int AS count FROM emitents',
  );
  return result.rows[0]?.count ?? 0;
}

export async function createEmitent(data: CreateEmitentDto): Promise<Emitent> {
  const db = getDb();
  const result = await db.query<Emitent>(
    `INSERT INTO emitents (name, address, city, area, state, code, infusion, price, ind, name_eng)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING ${SELECT_FIELDS}`,
    [
      data.name.trim(),
      trimOrNull(data.address),
      data.city ?? null,
      data.area ?? null,
      data.state ?? null,
      normalizeCode(data.code),
      data.infusion ?? null,
      data.price ?? null,
      data.ind ?? null,
      trimOrNull(data.name_eng),
    ],
  );
  return result.rows[0];
}

export async function updateEmitent(id: number, data: UpdateEmitentDto): Promise<Emitent | null> {
  const db = getDb();

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (key === 'name') {
      fields.push(`${key} = $${idx}`);
      values.push(String(value).trim());
    } else if (key === 'address' || key === 'name_eng') {
      fields.push(`${key} = $${idx}`);
      values.push(trimOrNull(value as string | null));
    } else if (key === 'code') {
      fields.push(`${key} = $${idx}`);
      values.push(normalizeCode(value as string | null));
    } else {
      fields.push(`${key} = $${idx}`);
      values.push(value);
    }
    idx += 1;
  }

  if (fields.length === 0) {
    const existing = await db.query<Emitent>(
      `SELECT ${SELECT_FIELDS} FROM emitents WHERE id = $1`,
      [id],
    );
    return existing.rows[0] ?? null;
  }

  values.push(id);
  const sql = `UPDATE emitents SET ${fields.join(', ')} WHERE id = $${idx} RETURNING ${SELECT_FIELDS}`;
  const result = await db.query<Emitent>(sql, values);
  return result.rows[0] ?? null;
}

export async function deleteEmitent(id: number): Promise<void> {
  const db = getDb();
  await db.query('DELETE FROM emitents WHERE id = $1', [id]);
}

function trimOrNull(value?: string | null): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t === '' ? null : t;
}

function normalizeCode(value?: string | null): string | null {
  const t = trimOrNull(value);
  return t == null ? null : t.slice(0, 4);
}
