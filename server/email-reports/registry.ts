import { fetchDailyOrders, fetchDailyTrades } from './queries.js';
import { config } from '../config/index.js';
import {
  DAILY_ORDERS_COLUMNS,
  DAILY_ORDERS_TABLE_HEADER,
  DAILY_TRADES_COLUMNS,
  rowsToDocxBuffer,
} from './docx.js';

export interface EmailReportDefinition {
  code: string;
  name: string;
  reportTitle: string;
  sheetName: string;
  columnLabels: Record<string, string>;
  buildFilename: (reportDate: string) => string;
  fetchRows: (reportDate: string) => Promise<Record<string, unknown>[]>;
}

export const EMAIL_REPORT_DEFINITIONS: EmailReportDefinition[] = [
  {
    code: 'daily-orders',
    name: 'Информация о приказах в торговой системе',
    reportTitle: 'Информация о приказах в торговой системе',
    sheetName: 'Заявки',
    columnLabels: DAILY_ORDERS_COLUMNS,
    buildFilename: (reportDate) => `zayavki_${reportDate}.docx`,
    fetchRows: (reportDate) => fetchDailyOrders(reportDate),
  },
  {
    code: 'daily-trades',
    name: 'Отчет о заключенных сделках',
    reportTitle: 'Отчет о заключенных сделках',
    sheetName: 'Сделки',
    columnLabels: DAILY_TRADES_COLUMNS,
    buildFilename: (reportDate) => `sdelki_${reportDate}.docx`,
    fetchRows: (reportDate) => fetchDailyTrades(reportDate),
  },
];

export function getEmailReportDefinition(code: string): EmailReportDefinition | undefined {
  return EMAIL_REPORT_DEFINITIONS.find((d) => d.code === code);
}

export async function generateEmailReportBuffer(
  definition: EmailReportDefinition,
  reportDate: string,
): Promise<{ filename: string; buffer: Buffer }> {
  const rows = await definition.fetchRows(reportDate);
  const buffer = await rowsToDocxBuffer(rows, definition.columnLabels, {
    title: definition.reportTitle,
    reportDate,
    utcOffsetHours: config.emailReports.utcOffsetHours,
    tableHeaderRows: definition.code === 'daily-orders' ? DAILY_ORDERS_TABLE_HEADER : undefined,
  });
  return {
    filename: definition.buildFilename(reportDate),
    buffer,
  };
}
