/**
 * Госхолдинг Форма 9 — Информация о торгах (котировки / приказы).
 * Секция «Приказы»: одна строка на ЦБ — агрегация за период.
 */
import React from 'react';
import { ReportHeader } from './ReportHeader';

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

function formatInt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '';
  return Math.round(n).toLocaleString('ru-RU');
}

export interface StateHoldingForm9Row {
  secCode: string;
  secFullName: string;
  tradeDate: string;
  quantity: number;
  buyPrice: number;
  sellPrice: number;
}

export interface StateHoldingForm9Data {
  periodFrom: string;
  periodTo: string;
  rows: StateHoldingForm9Row[];
}

interface Props {
  data: StateHoldingForm9Data;
}

export function StateHoldingForm9Report({ data }: Props) {
  return (
    <div className="w-full bg-white pb-6 text-xs print:max-w-none print:px-0 print:pb-0">
      <ReportHeader
        formNumber="Форма 9"
        title="Информация о торгах"
        periodFrom={data.periodFrom}
        periodTo={data.periodTo}
      />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border text-sm">
          <thead>

            <tr className="bg-muted/60">
              <th className="border border-border px-2 py-2 text-center font-medium">
                Дата
              </th>
              <th className="border border-border px-2 py-2 text-center font-medium">
                Код ценной бумаги
              </th>
              <th className="border border-border px-2 py-2 text-center font-medium">
                Количество ценных бумаг
              </th>
              <th className="border border-border px-2 py-2 text-center font-medium">
                Покупка (сом.)
              </th>
              <th className="border border-border px-2 py-2 text-center font-medium">
                Продажа (сом.)
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-muted/20">
                <td className="border border-border px-2 py-1 whitespace-nowrap">{formatDate(row.tradeDate)}</td>
                <td className="border border-border px-2 py-1">{row.secFullName || row.secCode}</td>
                <td className="border border-border px-2 py-1 text-right tabular-nums">{formatInt(row.quantity)}</td>
                <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(row.buyPrice)}</td>
                <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(row.sellPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function buildStateHoldingForm9Data(
  rows: Record<string, unknown>[],
  periodFrom: string,
  periodTo: string,
): StateHoldingForm9Data {
  const out: StateHoldingForm9Row[] = rows.map((r) => ({
    secCode: String(r.secCode ?? ''),
    secFullName: String(r.secFullName ?? ''),
    tradeDate: String(r.tradeDate ?? '').slice(0, 10),
    quantity: Number(r.quantity ?? 0),
    buyPrice: Number(r.buyPrice ?? 0),
    sellPrice: Number(r.sellPrice ?? 0),
  }));
  return { periodFrom, periodTo, rows: out };
}
