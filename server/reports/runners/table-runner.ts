import type { Trade, ColumnDef, ReportFormDto } from '../../types/index.js';

export function runTable(
  trades: Trade[],
  form: ReportFormDto,
  _page?: number,
  _limit?: number
): { rows: Record<string, unknown>[]; total: number } {
  const columns = form.columns ?? [];
  
  let rows: Record<string, unknown>[];
  
  // Если колонки не заданы, возвращаем все поля
  if (columns.length === 0) {
    rows = trades.map(t => ({ ...t } as Record<string, unknown>));
  } else {
    const fieldSet = new Set(columns.map((c: ColumnDef) => c.field));
    rows = trades.map((t) => {
      const row: Record<string, unknown> = {};
      for (const key of Object.keys(t)) {
        if (fieldSet.has(key)) row[key] = (t as Record<string, unknown>)[key];
      }
      return row;
    });
  }

  return { rows, total: rows.length };
}
