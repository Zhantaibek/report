/**
 * Форма 14 — Отчет по структуре комиссионного сбора (по участникам).
 * Как Форма 15, но агрегация по участнику торгов.
 * Рыночные = вторичный рынок, Регистрационные = первичный рынок.
 */
import React from 'react';
import { ReportHeader } from './ReportHeader';

function formatNum(n: number | null | undefined, decimals = 2): string {
  if (n == null || Number.isNaN(n)) return '';
  return n.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatInt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '0';
  return Math.round(n).toLocaleString('ru-RU');
}

export interface Form14Row {
  participantName: string;
  volume: number;
  commission: number;
  actualRatePercent: number;
  dealCount: number;
  avgCommission: number;
  marketDealCount: number;
  marketCommission: number;
  registrationDealCount: number;
  registrationCommission: number;
  sharePercent: number;
}

export interface ReportForm14Data {
  periodFrom: string;
  periodTo: string;
  rows: Form14Row[];
  totals?: Form14Row;
}

interface Props {
  data: ReportForm14Data;
}

export function Form14Report({ data }: Props) {
  return (
    <div className="w-full bg-white pb-6 text-xs print:max-w-none print:px-0 print:pb-0">
      <ReportHeader
        formNumber="Ф-14"
        title="Отчет по структуре комиссионного сбора"
        periodFrom={data.periodFrom}
        periodTo={data.periodTo}
      />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th className="border border-border px-2 py-1 text-center font-medium" rowSpan={2}>
                Участник торгов
              </th>
              <th className="border border-border px-2 py-1 text-center font-medium" rowSpan={2}>
                Объем сделок
              </th>
              <th className="border border-border px-2 py-1 text-center font-medium" rowSpan={2}>
                Сумма комиссионных
              </th>
              <th className="border border-border px-2 py-1 text-center font-medium" rowSpan={2}>
                Фактич. % комисс. сбора
              </th>
              <th className="border border-border px-2 py-1 text-center font-medium" rowSpan={2}>
                Число сделок
              </th>
              <th className="border border-border px-2 py-1 text-center font-medium" rowSpan={2}>
                Сред. сумма комисс. с одной сделки
              </th>
              <th className="border border-border px-2 py-1 text-center font-medium" colSpan={2}>
                Рыночные
              </th>
              <th className="border border-border px-2 py-1 text-center font-medium" colSpan={2}>
                Регистрационные
              </th>
              <th className="border border-border px-2 py-1 text-center font-medium" rowSpan={2}>
                Удельный вес
              </th>
            </tr>
            <tr className="bg-muted/60">
              <th className="border border-border px-2 py-1 text-center font-medium">Число</th>
              <th className="border border-border px-2 py-1 text-center font-medium">Сумма комисс.</th>
              <th className="border border-border px-2 py-1 text-center font-medium">Число</th>
              <th className="border border-border px-2 py-1 text-center font-medium">Сумма комисс.</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-muted/20">
                <td className="border border-border px-2 py-1">{row.participantName}</td>
                <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(row.volume)}</td>
                <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(row.commission)}</td>
                <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(row.actualRatePercent, 4)}</td>
                <td className="border border-border px-2 py-1 text-right tabular-nums">{formatInt(row.dealCount)}</td>
                <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(row.avgCommission)}</td>
                <td className="border border-border px-2 py-1 text-right tabular-nums">{formatInt(row.marketDealCount)}</td>
                <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(row.marketCommission)}</td>
                <td className="border border-border px-2 py-1 text-right tabular-nums">{formatInt(row.registrationDealCount)}</td>
                <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(row.registrationCommission)}</td>
                <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(row.sharePercent, 2)}</td>
              </tr>
            ))}
            {data.totals && (
              <tr className="bg-muted/80 font-medium">
                <td className="border border-border px-2 py-1">Итого:</td>
                <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(data.totals.volume)}</td>
                <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(data.totals.commission)}</td>
                <td className="border border-border px-2 py-1 text-right tabular-nums">
                  {formatNum(data.totals.actualRatePercent, 4)}
                </td>
                <td className="border border-border px-2 py-1 text-right tabular-nums">{formatInt(data.totals.dealCount)}</td>
                <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(data.totals.avgCommission)}</td>
                <td className="border border-border px-2 py-1 text-right tabular-nums">{formatInt(data.totals.marketDealCount)}</td>
                <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(data.totals.marketCommission)}</td>
                <td className="border border-border px-2 py-1 text-right tabular-nums">{formatInt(data.totals.registrationDealCount)}</td>
                <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(data.totals.registrationCommission)}</td>
                <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(data.totals.sharePercent, 2)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Form14Report;
