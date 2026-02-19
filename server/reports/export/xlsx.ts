import * as XLSX from 'xlsx';
import type { ReportResult } from '../../types/index.js';

export function reportToXlsxBuffer(result: ReportResult): Buffer {
  const wb = XLSX.utils.book_new();
  let rows: unknown[][];

  if (result.type === 'table') {
    const headers = result.rows.length ? Object.keys(result.rows[0]) : [];
    rows = [headers, ...result.rows.map((r) => headers.map((h) => (r as Record<string, unknown>)[h]))];
  } else if (result.type === 'summary') {
    const headers = result.rows.length ? Object.keys(result.rows[0]) : [];
    rows = [headers, ...result.rows.map((r) => headers.map((h) => (r as Record<string, unknown>)[h]))];
  } else {
    const labels = result.labels;
    const seriesNames = result.series.map((s) => s.name);
    rows = [['', ...seriesNames]];
    labels.forEach((label, i) => {
      rows.push([label, ...result.series.map((s) => s.data[i])]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }));
}
