import { api } from './client';

export type EmailReportSendStatus = 'pending' | 'sent' | 'failed' | 'partial';

export interface EmailReportRow {
  id: number;
  report_code: string;
  report_name: string;
  report_date: string;
  filename: string;
  generated_at: string;
  broker_ids: number[];
  broker_names: string;
  broker_count: number;
  sent_at: string | null;
  send_status: EmailReportSendStatus;
  send_error: string | null;
}

export interface EmailReportType {
  code: string;
  name: string;
  reportTitle?: string;
}

export interface SendNowResult {
  reportDate: string;
  brokersProcessed: number;
  emailsSent: number;
  errors: string[];
}

export function getEmailReportTypes() {
  return api.get<EmailReportType[]>('/email-reports/types');
}

export function getEmailReports(params?: {
  dateFrom?: string;
  dateTo?: string;
  brokerId?: number;
  reportCode?: string;
  status?: EmailReportSendStatus;
}) {
  const q = new URLSearchParams();
  if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
  if (params?.dateTo) q.set('dateTo', params.dateTo);
  if (params?.brokerId != null) q.set('brokerId', String(params.brokerId));
  if (params?.reportCode) q.set('reportCode', params.reportCode);
  if (params?.status) q.set('status', params.status);
  const qs = q.toString();
  return api.get<EmailReportRow[]>(`/email-reports${qs ? `?${qs}` : ''}`);
}

export function sendEmailReportsNow(body?: {
  reportDate?: string;
  force?: boolean;
}) {
  return api.post<SendNowResult>('/email-reports/send-now', body ?? {});
}

export function resendEmailReport(id: number) {
  return api.post<{ ok: boolean }>(`/email-reports/${id}/resend`, {});
}

export function downloadEmailReportUrl(reportId: number): string {
  return `/api/email-reports/${reportId}/download`;
}
