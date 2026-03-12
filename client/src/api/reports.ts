import { api } from './client.ts';

export interface RunFilters {
  dateFrom?: string;
  dateTo?: string;
  brokerId?: number;
  firmCode?: string;
  instrument?: string;
  classCode?: string;
}

export interface FirmItem {
  firmId: string;
  firmName: string;
}

export interface SecurityItem {
  secCode: string;
  classCode: string;
  secFullName: string;
}

export interface ClassItem {
  code: string;
  name: string;
}

export interface TableResult {
  type: 'table';
  rows: Record<string, unknown>[];
  total: number;
}

export interface SummaryResult {
  type: 'summary';
  rows: Record<string, unknown>[];
}

export interface ChartResult {
  type: 'chart';
  labels: string[];
  series: { name: string; data: number[] }[];
}

export type ReportResult = TableResult | SummaryResult | ChartResult;

export function runReport(params: {
  reportFormId: number;
  dataSourceIds?: number[];
  filters: RunFilters;
}): Promise<ReportResult> {
  return api.post('/reports/run', params);
}

export function getSecurities(): Promise<SecurityItem[]> {
  return api.get('/reports/securities');
}

export function getClasses(): Promise<ClassItem[]> {
  return api.get('/reports/classes');
}

export function getFirms(): Promise<FirmItem[]> {
  return api.get('/reports/firms');
}

export interface UsdReportRow {
  trade_date: string;
  deal_count: number;
  sec_count: number;
  price_usd: number;
  volume_usd: number;
  usd_rate: number;
  volume_som: number;
}

export interface OracleInstrument {
  id: number;
  namerus: string;
  extcode: string;
}

export function getOracleInstruments(): Promise<OracleInstrument[]> {
  return api.get('/reports/usd/instruments');
}

export function runUsdReport(dateFrom: string, dateTo: string, ownId?: number): Promise<{ rows: UsdReportRow[] }> {
  return api.post('/reports/usd', { dateFrom, dateTo, ownId });
}

export interface TodayTrade {
  id: string;
  tradeDate: string;
  settleDate: string | null;
  classCode: string;
  className?: string;
  secCode: string;
  secFullName?: string;
  buyerName?: string | null;
  sellerName?: string | null;
  quantity: number;
  price: number;
  value: number;
}

export function getTodayTrades(): Promise<TodayTrade[]> {
  return api.get('/reports/today-trades');
}

export interface DailyVolumePoint {
  date: string;
  totalValue: number;
}

export function getDailyVolumes(month: string): Promise<{ month: string; points: DailyVolumePoint[] }> {
  return api.get(`/reports/daily-volumes?month=${encodeURIComponent(month)}`);
}

export async function exportReport(params: {
  reportFormId: number;
  dataSourceIds?: number[];
  filters: RunFilters;
  format: 'xlsx' | 'csv';
}): Promise<Blob> {
  const res = await fetch('/api/reports/export', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.blob();
}
