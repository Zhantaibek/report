import { getDb } from '../index.js';

export interface ReportFormDto {
  id: number;
  code: string;
  name: string;
  description: string | null;
  type: 'table' | 'summary' | 'chart';
  category: string;
  singleDate: boolean;
}

export interface CreateReportFormDto {
  code: string;
  name: string;
  description: string | null;
  type: 'table' | 'summary' | 'chart';
  category: string;
  singleDate?: boolean;
}

export async function getReportForms(): Promise<ReportFormDto[]> {
  const db = getDb();
  const result = await db.query<ReportFormDto>('SELECT id, code, name, description, type, category, COALESCE(single_date, false) as "singleDate" FROM report_forms ORDER BY category, id');
  return result.rows;
}

export async function getReportFormById(id: number): Promise<ReportFormDto | undefined> {
  const db = getDb();
  const result = await db.query<ReportFormDto>('SELECT id, code, name, description, type, category, COALESCE(single_date, false) as "singleDate" FROM report_forms WHERE id = $1', [id]);
  return result.rows[0];
}

export async function getReportFormByCode(code: string): Promise<ReportFormDto | undefined> {
  const db = getDb();
  const result = await db.query<ReportFormDto>('SELECT id, code, name, description, type, category, COALESCE(single_date, false) as "singleDate" FROM report_forms WHERE code = $1', [code]);
  return result.rows[0];
}

export async function createReportForm(data: CreateReportFormDto): Promise<number> {
  const db = getDb();
  const result = await db.query<{ id: number }>(
    'INSERT INTO report_forms (code, name, description, type, category, single_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
    [data.code, data.name, data.description, data.type, data.category, data.singleDate ?? false]
  );
  return result.rows[0].id;
}

export async function updateReportFormByCode(
  code: string,
  data: { singleDate?: boolean; category?: string; description?: string | null },
): Promise<void> {
  const db = getDb();
  if (data.singleDate !== undefined) {
    await db.query('UPDATE report_forms SET single_date = $1 WHERE code = $2', [data.singleDate, code]);
  }
  if (data.category !== undefined) {
    await db.query('UPDATE report_forms SET category = $1 WHERE code = $2', [data.category, code]);
  }
  if (data.description !== undefined) {
    await db.query('UPDATE report_forms SET description = $1 WHERE code = $2', [data.description, code]);
  }
}
