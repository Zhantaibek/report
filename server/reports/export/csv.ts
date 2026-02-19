import type { ReportResult } from '../../types/index.js';

function escapeCsvCell(val: unknown): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

export function reportToCsv(result: ReportResult): string {
  let rows: unknown[][];

  if (result.type === 'table') {
    const headers = result.rows.length ? Object.keys(result.rows[0]) : [];
    rows = [headers, ...result.rows.map((r) => headers.map((h) => (r as Record<string, unknown>)[h]))];
  } else if (result.type === 'summary') {
    const headers = result.rows.length ? Object.keys(result.rows[0]) : [];
    rows = [headers, ...result.rows.map((r) => headers.map((h) => (r as Record<string, unknown>)[h]))];
  } else {
    const seriesNames = result.series.map((s) => s.name);
    rows = [['Label', ...seriesNames]];
    result.labels.forEach((label, i) => {
      rows.push([label, ...result.series.map((s) => s.data[i])]);
    });
  }

  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}
