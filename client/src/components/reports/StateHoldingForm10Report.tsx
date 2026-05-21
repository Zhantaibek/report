/**
 * Госхолдинг Форма 10 — Значение индекса за торговый день.
 * Колонки: Дата расчета индекса, Значение индекса (пунктов),
 * Изменения индекса по сравнению с индексом предыдущего торгового дня (в %).
 */
import React from 'react';
import { ReportHeader } from './ReportHeader';
import type { IndexRow } from '../../api/reports';

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const s = String(dateStr).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

function formatNum(n: number | null | undefined, decimals = 2): string {
  if (n == null || Number.isNaN(n)) return '';
  return n.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export interface StateHoldingForm10Row {
  indexDate: string;
  indexValue: number;
  changePct: number | null;
}

export interface StateHoldingForm10Data {
  periodFrom: string;
  periodTo: string;
  rows: StateHoldingForm10Row[];
}

interface Props {
  data: StateHoldingForm10Data;
}

export function StateHoldingForm10Report({ data }: Props) {
  return (
    <div className="w-full bg-white pb-6 text-xs print:max-w-none print:px-0 print:pb-0">
      <ReportHeader
        formNumber="Форма 10"
        title="Значение индекса за торговый день"
        periodFrom={data.periodFrom}
        periodTo={data.periodTo}
      />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border text-xs">
          <thead>
            <tr className="bg-muted/60">
              <th className="border border-border px-2 py-2 text-center font-medium w-8">
                №
              </th>
              <th className="border border-border px-2 py-2 text-center font-medium">
                Дата расчета индекса
              </th>
              <th className="border border-border px-2 py-2 text-center font-medium">
                Значение индекса (пунктов)
              </th>
              <th className="border border-border px-2 py-2 text-center font-medium">
                Изменения индекса по сравнению с индексом предыдущего торгового дня (в %)
              </th>
            </tr>
            <tr className="bg-muted/40">
              {['1', '2', '3', '4'].map((n) => (
                <th key={n} className="border border-border px-2 py-1 text-center text-muted-foreground font-normal">
                  {n}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-muted/20">
                <td className="border border-border px-2 py-1 text-center">{idx + 1}</td>
                <td className="border border-border px-2 py-1 whitespace-nowrap">{formatDate(row.indexDate)}</td>
                <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(row.indexValue, 2)}</td>
                <td className="border border-border px-2 py-1 text-right tabular-nums">
                  {row.changePct != null ? formatNum(row.changePct, 2) : ''}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function buildStateHoldingForm10Data(
  rows: IndexRow[],
  periodFrom: string,
  periodTo: string,
): StateHoldingForm10Data {
  const out: StateHoldingForm10Row[] = rows.map((r, i) => {
    const prev = i > 0 ? rows[i - 1].index_value : null;
    const changePct =
      prev != null && prev !== 0
        ? ((r.index_value - prev) / prev) * 100
        : null;
    return {
      indexDate:  r.index_date,
      indexValue: r.index_value,
      changePct,
    };
  });
  return { periodFrom, periodTo, rows: out };
}
