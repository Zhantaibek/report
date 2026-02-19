import { getDb } from '../index.js';

export interface BrokerRow {
  id: number;
  name: string;
  code: string | null;
}

export async function getBrokers(): Promise<BrokerRow[]> {
  const res = await getDb().query('SELECT * FROM brokers ORDER BY id');
  return res.rows as BrokerRow[];
}

export async function getBrokerById(id: number): Promise<BrokerRow | undefined> {
  const res = await getDb().query('SELECT * FROM brokers WHERE id = $1', [id]);
  return res.rows[0] as BrokerRow | undefined;
}

export async function createBroker(name: string, code: string | null): Promise<number> {
  const res = await getDb().query('INSERT INTO brokers (name, code) VALUES ($1, $2) RETURNING id', [name, code]);
  return (res.rows[0] as { id: number }).id;
}

export async function updateBroker(id: number, name: string, code: string | null): Promise<void> {
  await getDb().query('UPDATE brokers SET name = $1, code = $2 WHERE id = $3', [name, code, id]);
}

export async function deleteBroker(id: number): Promise<void> {
  await getDb().query('DELETE FROM brokers WHERE id = $1', [id]);
}
