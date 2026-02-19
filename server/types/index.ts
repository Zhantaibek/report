// Canonical trade DTO (after mapping from external DBs)
export interface Trade {
  id: string | number;
  brokerId?: string | number;
  brokerCode?: string;
  instrument?: string;
  amount?: number;
  price?: number;
  dealTime?: string;
  side?: 'buy' | 'sell';
  sourceId?: number;
  sourceName?: string;
  [key: string]: unknown;
}

export type ReportFormType = 'table' | 'summary' | 'chart';

export interface ColumnDef {
  field: string;
  label: string;
  format?: string;
  visible?: boolean;
}

export interface AggregateDef {
  field: string;
  op: 'sum' | 'count' | 'avg';
  label: string;
}

export interface ReportFormDto {
  id: number;
  name: string;
  code: string;
  description: string | null;
  type: ReportFormType;
  columns: ColumnDef[] | null;
  groupBy: string[] | null;
  aggregates: AggregateDef[] | null;
  filters: string[] | null;
  chartConfig: Record<string, unknown> | null;
  requiredFields: string[] | null;
  customSql: string | null;
}

export interface RunReportParams {
  reportFormId: number;
  dataSourceIds?: number[];
  filters: {
    dateFrom?: string;
    dateTo?: string;
    brokerId?: number;
    firmCode?: string;
    instrument?: string;
    classCode?: string;
  };
  page?: number;
  limit?: number;
}

export interface TableReportResult {
  type: 'table';
  rows: Record<string, unknown>[];
  total: number;
}

export interface SummaryReportResult {
  type: 'summary';
  rows: Record<string, unknown>[];
}

export interface ChartReportResult {
  type: 'chart';
  labels: string[];
  series: { name: string; data: number[] }[];
}

export type ReportResult = TableReportResult | SummaryReportResult | ChartReportResult;

export type UserRole = 'admin' | 'broker' | 'exchange';

export interface AuthUser {
  id: number;
  login: string;
  role: UserRole;
  displayName: string | null;
}
