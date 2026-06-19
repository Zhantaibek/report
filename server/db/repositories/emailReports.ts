import { getDb } from '../index.js';

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

export async function listEmailReports(params?: {
  reportDateFrom?: string;
  reportDateTo?: string;
  brokerId?: number;
  reportCode?: string;
  sendStatus?: EmailReportSendStatus;
  limit?: number;
  offset?: number;
}): Promise<EmailReportRow[]> {
  const db = getDb();
  const conditions: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (params?.reportDateFrom) {
    conditions.push(`er.report_date >= $${idx++}`);
    values.push(params.reportDateFrom);
  }
  if (params?.reportDateTo) {
    conditions.push(`er.report_date <= $${idx++}`);
    values.push(params.reportDateTo);
  }
  if (params?.reportCode) {
    conditions.push(`er.report_code = $${idx++}`);
    values.push(params.reportCode);
  }
  if (params?.brokerId != null) {
    conditions.push(`$${idx++} = ANY(er.broker_ids)`);
    values.push(params.brokerId);
  }
  if (params?.sendStatus) {
    conditions.push(`er.send_status = $${idx++}`);
    values.push(params.sendStatus);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = params?.limit ?? 200;
  const offset = params?.offset ?? 0;

  const result = await db.query<EmailReportRow>(
    `SELECT
       er.id,
       er.report_code,
       er.report_name,
       er.report_date::text AS report_date,
       er.filename,
       er.generated_at,
       er.broker_ids,
       COALESCE(
         (SELECT string_agg(b.name, ', ' ORDER BY b.name)
          FROM brokers b WHERE b.id = ANY(er.broker_ids)),
         ''
       ) AS broker_names,
       COALESCE(array_length(er.broker_ids, 1), 0) AS broker_count,
       er.sent_at,
       er.send_status,
       er.send_error
     FROM email_reports er
     ${where}
     ORDER BY er.report_date DESC, er.generated_at DESC, er.id DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...values, limit, offset],
  );

  return result.rows.map((row) => ({
    ...row,
    broker_ids: Array.isArray(row.broker_ids) ? row.broker_ids : [],
    send_status: row.send_status as EmailReportSendStatus,
  }));
}

export async function getEmailReportById(id: number): Promise<EmailReportRow | null> {
  const db = getDb();
  const result = await db.query<EmailReportRow>(
    `SELECT
       er.id,
       er.report_code,
       er.report_name,
       er.report_date::text AS report_date,
       er.filename,
       er.generated_at,
       er.broker_ids,
       COALESCE(
         (SELECT string_agg(b.name, ', ' ORDER BY b.name)
          FROM brokers b WHERE b.id = ANY(er.broker_ids)),
         ''
       ) AS broker_names,
       COALESCE(array_length(er.broker_ids, 1), 0) AS broker_count,
       er.sent_at,
       er.send_status,
       er.send_error
     FROM email_reports er
     WHERE er.id = $1`,
    [id],
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    ...row,
    broker_ids: Array.isArray(row.broker_ids) ? row.broker_ids : [],
    send_status: row.send_status as EmailReportSendStatus,
  };
}

export async function upsertEmailReport(data: {
  report_code: string;
  report_name: string;
  report_date: string;
  filename: string;
  broker_ids?: number[];
  send_status?: EmailReportSendStatus;
  send_error?: string | null;
}): Promise<number> {
  const db = getDb();
  const result = await db.query<{ id: number }>(
    `INSERT INTO email_reports (
       report_code, report_name, report_date, filename,
       broker_ids, send_status, send_error
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (report_code, report_date) DO UPDATE SET
       report_name = EXCLUDED.report_name,
       filename = EXCLUDED.filename,
       broker_ids = EXCLUDED.broker_ids,
       send_status = EXCLUDED.send_status,
       send_error = EXCLUDED.send_error,
       sent_at = CASE WHEN EXCLUDED.send_status = 'sent' THEN NOW() ELSE email_reports.sent_at END,
       generated_at = NOW()
     RETURNING id`,
    [
      data.report_code,
      data.report_name,
      data.report_date,
      data.filename,
      data.broker_ids ?? [],
      data.send_status ?? 'pending',
      data.send_error ?? null,
    ],
  );
  return result.rows[0].id;
}

export async function updateEmailReportSendResult(
  id: number,
  data: {
    broker_ids: number[];
    send_status: EmailReportSendStatus;
    send_error?: string | null;
  },
): Promise<void> {
  const db = getDb();
  await db.query(
    `UPDATE email_reports SET
       broker_ids = $2,
       send_status = $3,
       send_error = $4,
       sent_at = CASE WHEN $3 = 'sent' OR $3 = 'partial' THEN NOW() ELSE sent_at END
     WHERE id = $1`,
    [id, data.broker_ids, data.send_status, data.send_error ?? null],
  );
}

export async function isEmailReportAlreadySent(
  reportCode: string,
  reportDate: string,
): Promise<boolean> {
  const db = getDb();
  const result = await db.query<{ ok: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM email_reports
       WHERE report_code = $1 AND report_date = $2 AND send_status = 'sent'
     ) AS ok`,
    [reportCode, reportDate],
  );
  return result.rows[0]?.ok ?? false;
}
