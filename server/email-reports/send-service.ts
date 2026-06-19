import { getAllBrokers, type Broker } from '../db/repositories/brokers.js';
import {
  upsertEmailReport,
  updateEmailReportSendResult,
  isEmailReportAlreadySent,
  getEmailReportById,
} from '../db/repositories/emailReports.js';
import { isSmtpConfigured, sendEmail } from '../email/smtp.js';
import { isQuikConfigured } from '../config/quik-db.js';
import { config } from '../config/index.js';
import {
  EMAIL_REPORT_DEFINITIONS,
  generateEmailReportBuffer,
  getEmailReportDefinition,
} from './registry.js';
import { WORD_CONTENT_TYPE } from './docx.js';

export interface SendDailyReportsResult {
  reportDate: string;
  brokersProcessed: number;
  emailsSent: number;
  errors: string[];
}

export function getReportDateForToday(): string {
  const { utcOffsetHours } = config.emailReports;
  const now = new Date();
  const local = new Date(now.getTime() + utcOffsetHours * 60 * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

interface EmailAttachment {
  filename: string;
  content: Buffer;
  title: string;
}

function formatReportDateForEmail(isoDate: string): string {
  const [y, m, d] = isoDate.slice(0, 10).split('-');
  if (!y || !m || !d) return isoDate;
  return `${parseInt(d, 10)}/${parseInt(m, 10)}/${y}`;
}

function buildDailyReportsEmailText(
  reportDate: string,
  attachments: EmailAttachment[],
): string {
  const dateLabel = formatReportDateForEmail(reportDate);
  const attachmentList = attachments
    .map((a, i) => `${i + 1}. ${a.title} (${a.filename})`)
    .join('\n');

  return (
    `Добрый день!\n\n` +
    `Кыргызская Фондовая Биржа направляет результаты торгов за ${dateLabel}.\n\n` +
    `Во вложении следующие файлы:\n` +
    `${attachmentList}\n\n` +
    `Дата формирования: ${formatGeneratedAtForEmail()}\n\n` +
    `С уважением,\n` +
    `Кыргызская Фондовая Биржа\n` +
    `${config.smtp.from}`
  );
}

function formatGeneratedAtForEmail(): string {
  const { utcOffsetHours } = config.emailReports;
  const local = new Date(Date.now() + utcOffsetHours * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${local.getUTCDate()}/${local.getUTCMonth() + 1}/${local.getUTCFullYear()} ${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
}

export async function sendDailyReportsToBrokers(options?: {
  reportDate?: string;
  force?: boolean;
}): Promise<SendDailyReportsResult> {
  const reportDate = options?.reportDate ?? getReportDateForToday();
  const errors: string[] = [];
  let emailsSent = 0;

  if (!isQuikConfigured()) {
    throw new Error('QUIK Export не настроен');
  }
  if (!isSmtpConfigured()) {
    throw new Error('SMTP не настроен');
  }

  const brokers = (await getAllBrokers()).filter((b) => b.is_active);
  if (brokers.length === 0) {
    return { reportDate, brokersProcessed: 0, emailsSent: 0, errors: [] };
  }

  const attachments: EmailAttachment[] = [];
  const reportIds: number[] = [];

  for (const definition of EMAIL_REPORT_DEFINITIONS) {
    if (!options?.force && await isEmailReportAlreadySent(definition.code, reportDate)) {
      console.log(`[email-reports] Skip ${definition.code} — already sent`);
      continue;
    }

    const { filename, buffer } = await generateEmailReportBuffer(definition, reportDate);
    const reportId = await upsertEmailReport({
      report_code: definition.code,
      report_name: definition.name,
      report_date: reportDate,
      filename,
      broker_ids: [],
      send_status: 'pending',
    });
    reportIds.push(reportId);
    attachments.push({
      filename,
      content: buffer,
      title: definition.reportTitle,
    });
  }

  if (attachments.length === 0) {
    return { reportDate, brokersProcessed: brokers.length, emailsSent: 0, errors: [] };
  }

  const sentBrokerIds: number[] = [];
  const sendErrors: string[] = [];

  for (const broker of brokers) {
    try {
      await sendReportsEmail(broker, reportDate, attachments);
      sentBrokerIds.push(broker.id);
      emailsSent += 1;
    } catch (err) {
      const msg = `${broker.name} (${broker.email}): ${err instanceof Error ? err.message : String(err)}`;
      console.error('[email-reports]', msg);
      sendErrors.push(msg);
      errors.push(msg);
    }
  }

  const sendStatus = sendErrors.length === 0
    ? 'sent'
    : sentBrokerIds.length === 0
      ? 'failed'
      : 'partial';

  for (const reportId of reportIds) {
    await updateEmailReportSendResult(reportId, {
      broker_ids: sentBrokerIds,
      send_status: sendStatus,
      send_error: sendErrors.length > 0 ? sendErrors.join('; ') : null,
    });
  }

  return {
    reportDate,
    brokersProcessed: brokers.length,
    emailsSent,
    errors,
  };
}

async function sendReportsEmail(
  broker: Broker,
  reportDate: string,
  attachments: EmailAttachment[],
): Promise<void> {
  const subject = `Кыргызская Фондовая Биржа - Результаты торгов за ${reportDate}`;
  const text = buildDailyReportsEmailText(reportDate, attachments);

  await sendEmail({
    to: broker.email,
    subject,
    text,
    attachments: attachments.map((a) => ({
      filename: a.filename,
      content: a.content,
      contentType: WORD_CONTENT_TYPE,
    })),
  });
  console.log(`[email-reports] Sent to ${broker.email}`);
}

export async function resendEmailReport(reportId: number): Promise<void> {
  const report = await getEmailReportById(reportId);
  if (!report) throw new Error('Report not found');

  const definition = getEmailReportDefinition(report.report_code);
  if (!definition) throw new Error('Report type not found');

  const reportDate = report.report_date.slice(0, 10);
  const { buffer, filename } = await generateEmailReportBuffer(definition, reportDate);
  await upsertEmailReport({
    report_code: report.report_code,
    report_name: report.report_name,
    report_date: reportDate,
    filename,
    broker_ids: report.broker_ids,
    send_status: report.send_status,
  });

  const brokers = (await getAllBrokers()).filter((b) => b.is_active);
  const errors: string[] = [];
  const sentBrokerIds: number[] = [];

  for (const broker of brokers) {
    try {
      await sendEmail({
        to: broker.email,
        subject: `Кыргызская Фондовая Биржа - ${report.report_name} за ${report.report_date.slice(0, 10)}`,
        text:
          `Добрый день!\n\n` +
          `Кыргызская Фондовая Биржа направляет повторно отчёт «${report.report_name}» ` +
          `за ${formatReportDateForEmail(report.report_date)}.\n\n` +
          `Файл во вложении: ${filename}\n\n` +
          `С уважением,\n` +
          `Кыргызская Фондовая Биржа\n` +
          `${config.smtp.from}`,
        attachments: [{
          filename,
          content: buffer,
          contentType: WORD_CONTENT_TYPE,
        }],
      });
      sentBrokerIds.push(broker.id);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${broker.name}: ${message}`);
    }
  }

  const sendStatus = errors.length === 0
    ? 'sent'
    : sentBrokerIds.length === 0
      ? 'failed'
      : 'partial';

  await updateEmailReportSendResult(reportId, {
    broker_ids: sentBrokerIds,
    send_status: sendStatus,
    send_error: errors.length > 0 ? errors.join('; ') : null,
  });

  if (errors.length > 0 && sentBrokerIds.length === 0) {
    throw new Error(errors.join('; '));
  }
}
