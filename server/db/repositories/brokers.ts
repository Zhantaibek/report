import { getDb } from '../index.js';

export interface Broker {
  id: number;
  name: string;
  email: string;
  firm_id: string | null;
  address: string | null;
  contacts: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CreateBrokerDto {
  name: string;
  email: string;
  firm_id?: string | null;
  address?: string | null;
  contacts?: string | null;
  is_active?: boolean;
}

export interface UpdateBrokerDto {
  name?: string;
  email?: string;
  firm_id?: string | null;
  address?: string | null;
  contacts?: string | null;
  is_active?: boolean;
}

const SELECT_FIELDS = 'id, name, email, firm_id, address, contacts, is_active, created_at';

export async function getAllBrokers(): Promise<Broker[]> {
  const db = getDb();
  const result = await db.query<Broker>(
    `SELECT ${SELECT_FIELDS} FROM brokers ORDER BY name ASC, id ASC`,
  );
  return result.rows;
}

export async function getBrokerById(id: number): Promise<Broker | null> {
  const db = getDb();
  const result = await db.query<Broker>(
    `SELECT ${SELECT_FIELDS} FROM brokers WHERE id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function createBroker(data: CreateBrokerDto): Promise<Broker> {
  const db = getDb();
  const result = await db.query<Broker>(
    `INSERT INTO brokers (name, email, firm_id, address, contacts, is_active)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${SELECT_FIELDS}`,
    [
      data.name.trim(),
      data.email.trim().toLowerCase(),
      trimOrNull(data.firm_id),
      trimOrNull(data.address),
      trimOrNull(data.contacts),
      data.is_active ?? true,
    ],
  );
  return result.rows[0];
}

export async function updateBroker(id: number, data: UpdateBrokerDto): Promise<Broker | null> {
  const db = getDb();

  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    if (key === 'name') {
      fields.push(`${key} = $${idx}`);
      values.push(String(value).trim());
    } else if (key === 'email') {
      fields.push(`${key} = $${idx}`);
      values.push(String(value).trim().toLowerCase());
    } else if (key === 'firm_id' || key === 'address' || key === 'contacts') {
      fields.push(`${key} = $${idx}`);
      values.push(trimOrNull(value as string | null));
    } else if (key === 'is_active') {
      fields.push(`${key} = $${idx}`);
      values.push(Boolean(value));
    }
    idx += 1;
  }

  if (fields.length === 0) {
    return getBrokerById(id);
  }

  values.push(id);
  const sql = `UPDATE brokers SET ${fields.join(', ')} WHERE id = $${idx} RETURNING ${SELECT_FIELDS}`;
  const result = await db.query<Broker>(sql, values);
  return result.rows[0] ?? null;
}

export async function deleteBroker(id: number): Promise<void> {
  const db = getDb();
  await db.query('DELETE FROM brokers WHERE id = $1', [id]);
}

function trimOrNull(value?: string | null): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t === '' ? null : t;
}
