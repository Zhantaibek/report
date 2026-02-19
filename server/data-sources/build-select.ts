/**
 * Build ONLY a SELECT query from field mapping. No INSERT/UPDATE/DELETE/DDL.
 * External column names are validated against the mapping (whitelist).
 */
export interface ColumnMappings {
  [canonicalField: string]: string; // canonical -> external column name
}

export function buildSelectQuery(
  tableName: string,
  columnMappings: ColumnMappings,
  dbType: 'postgres' | 'mssql' | 'mysql'
): { sql: string; columns: string[] } {
  const quotedTable = quoteTable(tableName, dbType);
  const selections: string[] = [];
  const columns: string[] = [];

  for (const [canonical, externalCol] of Object.entries(columnMappings)) {
    const quotedCol = quoteIdentifier(externalCol, dbType);
    const alias = quoteIdentifier(canonical, dbType);
    selections.push(`${quotedTable}.${quotedCol} AS ${alias}`);
    columns.push(canonical);
  }

  const sql = `SELECT ${selections.join(', ')} FROM ${quotedTable}`;
  return { sql, columns };
}

function quoteIdentifier(name: string, dbType: string): string {
  if (dbType === 'postgres') return `"${name.replace(/"/g, '""')}"`;
  if (dbType === 'mssql') return `[${name.replace(/]/g, ']]')}]`;
  if (dbType === 'mysql') return '`' + name.replace(/`/g, '``') + '`';
  return name;
}

function quoteTable(name: string, dbType: string): string {
  return quoteIdentifier(name, dbType);
}
