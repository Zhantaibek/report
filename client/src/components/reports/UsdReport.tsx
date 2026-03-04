import React from 'react';
import { ReportHeader } from './ReportHeader';

export interface UsdReportRow {
  trade_date: string | Date;
  deal_count: number;
  sec_count: number;
  price_usd: number;
  volume_usd: number;
  usd_rate: number;
  volume_som: number;
}

function fmt(n: number | string | null | undefined, decimals = 2): string {
  const val = typeof n === 'string' ? Number(n) : n;
  if (val == null || Number.isNaN(val)) return '—';
  return Number(val).toLocaleString('ru-RU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function UsdReport({
  rows,
  dateFrom,
  dateTo,
  instrument,
}: {
  rows: UsdReportRow[];
  dateFrom?: string;
  dateTo?: string;
  instrument?: string;
}) {
  const totalDeals = rows.reduce((s, r) => s + Number(r.deal_count), 0);
  const totalSec = rows.reduce((s, r) => s + Number(r.sec_count), 0);
  const totalVolumeUsd = rows.reduce((s, r) => s + Number(r.volume_usd), 0);
  const totalVolumeSom = rows.reduce((s, r) => s + Number(r.volume_som), 0);

  return (
    <div className="w-full bg-white pb-6 text-sm print:max-w-none print:px-0">
      <ReportHeader
        formNumber=""
        title="Отчёт по сделкам с USD"
        periodFrom={dateFrom ?? ''}
        periodTo={dateTo ?? ''}
      />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th className="border border-border px-3 py-2 text-center font-medium">Дата сделки</th>
              <th className="border border-border px-3 py-2 text-center font-medium">Количество сделок</th>
              <th className="border border-border px-3 py-2 text-center font-medium">Количество ЦБ</th>
              <th className="border border-border px-3 py-2 text-center font-medium">Цена за 1б (USD)</th>
              <th className="border border-border px-3 py-2 text-center font-medium">Объём сделок</th>
              <th className="border border-border px-3 py-2 text-center font-medium">Курс $ к сому</th>
              <th className="border border-border px-3 py-2 text-center font-medium">Объем сделок в сомах</th>
            </tr>
          </thead>
          <tbody>
            {instrument != null && instrument !== '' && (
              <tr className="bg-muted/60">
                <td colSpan={7} className="border border-border px-3 py-2 font-medium">
                  Инструмент: {instrument}
                </td>
              </tr>
            )}
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-muted/20">
                <td className="border border-border px-3 py-1.5 text-center tabular-nums">
                  {fmtDate(row.trade_date)}
                </td>
                <td className="border border-border px-3 py-1.5 text-right tabular-nums">
                  {fmt(row.deal_count, 0)}
                </td>
                <td className="border border-border px-3 py-1.5 text-right tabular-nums">
                  {fmt(row.sec_count, 0)}
                </td>
                <td className="border border-border px-3 py-1.5 text-right tabular-nums">
                  {fmt(row.price_usd, 0)}
                </td>
                <td className="border border-border px-3 py-1.5 text-right tabular-nums">
                  {fmt(row.volume_usd, 2)}
                </td>
                <td className="border border-border px-3 py-1.5 text-right tabular-nums">
                  {fmt(row.usd_rate, 2)}
                </td>
                <td className="border border-border px-3 py-1.5 text-right tabular-nums">
                  {fmt(row.volume_som, 2)}
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 1 && (
            <tfoot>
              <tr className="bg-muted/40 font-semibold">
                <td className="border border-border px-3 py-2 text-center">Итого</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{fmt(totalDeals, 0)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{fmt(totalSec, 0)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">100</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{fmt(totalVolumeUsd, 2)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">—</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{fmt(totalVolumeSom, 2)}</td>
              </tr>
            </tfoot>
          )}
        </table>
        {rows.length === 0 && (
          <p className="mt-4 text-center text-muted-foreground">Нет данных за выбранный период</p>
        )}
      </div>
    </div>
  );
}

export default UsdReport;
