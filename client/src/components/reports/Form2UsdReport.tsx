/**
 * Форма 2 по сделкам USD: те же данные и колонки, что у «Отчет USD»,
 * группировка Класс → ЦБ как у Формы 2.
 */
import React from 'react';
import { cn } from '../../lib/utils.ts';
import { ReportHeader } from './ReportHeader';
import type { UsdReportRow } from '../../api/reports.ts';

function fmt(n: number | string | null | undefined, decimals?: number): string {
  const val = typeof n === 'string' ? Number(n) : n;
  if (val == null || Number.isNaN(val)) return '—';
  return Number(val).toLocaleString('ru-RU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals ?? 10,
  });
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function Form2UsdReport({
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
    <div className={cn('w-full bg-white pb-6 text-xs print:max-w-none print:px-0 print:pb-0')}>
      <ReportHeader
        formNumber="Ф-2"
        title="Отчет о заключенных сделках"
        periodFrom={dateFrom ?? ''}
        periodTo={dateTo ?? ''}
      />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
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
            <tr className="bg-muted/50">
              <td colSpan={7} className="border border-border px-3 py-1.5 font-medium">
                Класс: USD
              </td>
            </tr>
            <tr className="bg-muted/40">
              <td colSpan={7} className="border border-border px-3 py-1.5 font-medium">
                Ценная бумага: {instrument && instrument !== '' ? instrument : 'все инструменты'}
              </td>
            </tr>
            {rows.map((row, i) => (
              <tr key={i} className="bg-background">
                <td className="border border-border px-3 py-2 text-center tabular-nums">
                  {fmtDate(row.trade_date)}
                </td>
                <td className="border border-border px-3 py-2 text-center tabular-nums">
                  {fmt(row.deal_count, 0)}
                </td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">
                  {fmt(row.sec_count, 0)}
                </td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">
                  {fmt(row.price_usd, 0)}
                </td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">
                  {fmt(row.volume_usd, 2)}
                </td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">
                  {fmt(row.usd_rate, 2)}
                </td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">
                  {fmt(row.volume_som)}
                </td>
              </tr>
            ))}
            <tr className="bg-muted/60 font-semibold">
              <td className="border border-border px-3 py-2">Итого по ЦБ:</td>
              <td className="border border-border px-3 py-2 text-center tabular-nums">{fmt(totalDeals, 0)}</td>
              <td className="border border-border px-3 py-2 text-right tabular-nums">{fmt(totalSec, 0)}</td>
              <td className="border border-border px-3 py-2 text-right tabular-nums">100</td>
              <td className="border border-border px-3 py-2 text-right tabular-nums">{fmt(totalVolumeUsd, 2)}</td>
              <td className="border border-border px-3 py-2 text-right tabular-nums">—</td>
              <td className="border border-border px-3 py-2 text-right tabular-nums">{fmt(totalVolumeSom)}</td>
            </tr>
            <tr className="bg-primary/10 font-bold">
              <td className="border border-border px-3 py-2">Всего:</td>
              <td className="border border-border px-3 py-2 text-center tabular-nums">{fmt(totalDeals, 0)}</td>
              <td className="border border-border px-3 py-2 text-right tabular-nums">{fmt(totalSec, 0)}</td>
              <td className="border border-border px-3 py-2" />
              <td className="border border-border px-3 py-2 text-right tabular-nums">{fmt(totalVolumeUsd, 2)}</td>
              <td className="border border-border px-3 py-2" />
              <td className="border border-border px-3 py-2 text-right tabular-nums">{fmt(totalVolumeSom)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
