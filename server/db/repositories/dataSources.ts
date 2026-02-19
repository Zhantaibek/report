import { getDb } from '../index.js';

export type DataSourceType = 'postgres' | 'mssql' | 'mysql';

export interface DataSourceRow {
  id: number;
  name: string;
  type: DataSourceType;
  connection_config: string;
  is_active: number;
  created_at: string;
}

export interface ConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export async function getDataSources(activeOnly = false): Promise<DataSourceRow[]> {
  if (activeOnly) {
    const res = await getDb().query('SELECT * FROM data_sources WHERE is_active = 1 ORDER BY id');
    return res.rows as DataSourceRow[];
  }
  const res = await getDb().query('SELECT * FROM data_sources ORDER BY id');
  return res.rows as DataSourceRow[];
}

export async function getDataSourceById(id: number): Promise<DataSourceRow | undefined> {
  const res = await getDb().query('SELECT * FROM data_sources WHERE id = $1', [id]);
  return res.rows[0] as DataSourceRow | undefined;
}

export async function createDataSource(
  name: string,
  type: DataSourceType,
  connectionConfig: ConnectionConfig,
  isActive = true
): Promise<number> {
  const res = await getDb().query(
    'INSERT INTO data_sources (name, type, connection_config, is_active) VALUES ($1, $2, $3, $4) RETURNING id',
    [name, type, JSON.stringify(connectionConfig), isActive ? 1 : 0]
  );
  return (res.rows[0] as { id: number }).id;
}

export async function updateDataSource(
  id: number,
  data: { name?: string; type?: DataSourceType; connection_config?: string; is_active?: boolean }
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let n = 0;
  if (data.name !== undefined) { sets.push(`name = $${++n}`); values.push(data.name); }
  if (data.type !== undefined) { sets.push(`type = $${++n}`); values.push(data.type); }
  if (data.connection_config !== undefined) { sets.push(`connection_config = $${++n}`); values.push(data.connection_config); }
  if (data.is_active !== undefined) { sets.push(`is_active = $${++n}`); values.push(data.is_active ? 1 : 0); }
  if (sets.length === 0) return;
  values.push(id);
  await getDb().query(`UPDATE data_sources SET ${sets.join(', ')} WHERE id = $${n + 1}`, values);
}

export async function deleteDataSource(id: number): Promise<void> {
  await getDb().query('DELETE FROM data_sources WHERE id = $1', [id]);
}
