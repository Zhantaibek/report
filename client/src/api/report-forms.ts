import { api } from './client.ts';

export interface ReportForm {
  id: number;
  name: string;
  code: string;
  description: string | null;
  type: 'table' | 'summary' | 'chart';
  category: string;
  singleDate: boolean;
  columns: { field: string; label: string }[] | null;
  groupBy: string[] | null;
  aggregates: { field: string; op: string; label: string }[] | null;
  filters: string[] | null;
  chartConfig: Record<string, unknown> | null;
  requiredFields: string[] | null;
}

export function getReportForms(): Promise<ReportForm[]> {
  return api.get('/report-forms');
}

export function getReportForm(id: number): Promise<ReportForm> {
  return api.get(`/report-forms/${id}`);
}
