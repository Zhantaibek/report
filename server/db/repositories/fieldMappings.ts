import { getDb } from '../index.js';

export interface FieldMappingRow {
  id: number;
  data_source_id: number;
  table_name: string;
  column_mappings: string;
}

export async function getFieldMappingByDataSourceId(dataSourceId: number): Promise<FieldMappingRow | undefined> {
  const res = await getDb().query('SELECT * FROM field_mappings WHERE data_source_id = $1', [dataSourceId]);
  return res.rows[0] as FieldMappingRow | undefined;
}

export async function upsertFieldMapping(
  dataSourceId: number,
  tableName: string,
  columnMappings: Record<string, string>
): Promise<void> {
  const json = JSON.stringify(columnMappings);
  await getDb().query(
    `INSERT INTO field_mappings (data_source_id, table_name, column_mappings) VALUES ($1, $2, $3)
     ON CONFLICT (data_source_id) DO UPDATE SET table_name = EXCLUDED.table_name, column_mappings = EXCLUDED.column_mappings`,
    [dataSourceId, tableName, json]
  );
}

export async function deleteFieldMapping(dataSourceId: number): Promise<void> {
  await getDb().query('DELETE FROM field_mappings WHERE data_source_id = $1', [dataSourceId]);
}
