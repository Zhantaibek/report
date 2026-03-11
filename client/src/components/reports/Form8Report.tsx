/**
 * Форма 8 — Отчет о заключенных сделках:
 * Дата, Наименование компании, Торговый символ, ISIN, Цена, Кол-во, Сумма.
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
  if (n == null || Number.isNaN(n)) return '0';
  return Math.round(n).toLocaleString('ru-RU');
}

export interface Form8Row {
  tradeDate: string;
  companyName: string;
  symbol: string;
  isin: string;
  price: number;
  quantity: number;
  value: number;
}

export interface ReportForm8Data {
  periodFrom: string;
  periodTo: string;
  rows: Form8Row[];
  totalQuantity: number;
  totalVolume: number;
  dealCount: number;
}

interface Props {
  data: ReportForm8Data;
}

export function Form8Report({ data }: Props) {
  return (
    <div className="w-full bg-white pb-6 text-xs print:max-w-none print:px-0">
      <ReportHeader
        formNumber=""
        title="Отчет о заключенных сделках"
        periodFrom={data.periodFrom}
        periodTo={data.periodTo}
      />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th className="border border-border px-3 py-2 text-left font-medium">Дата</th>
              <th className="border border-border px-3 py-2 text-left font-medium">Наименование компании</th>
              <th className="border border-border px-3 py-2 text-left font-medium">Торговый символ</th>
              <th className="border border-border px-3 py-2 text-left font-medium">ISIN</th>
              <th className="border border-border px-3 py-2 text-right font-medium">Цена</th>
              <th className="border border-border px-3 py-2 text-right font-medium">Кол-во</th>
              <th className="border border-border px-3 py-2 text-right font-medium">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-muted/20">
                <td className="border border-border px-3 py-2">{formatDate(row.tradeDate)}</td>
                <td className="border border-border px-3 py-2">{row.companyName}</td>
                <td className="border border-border px-3 py-2">{row.symbol}</td>
                <td className="border border-border px-3 py-2">{row.isin}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(row.price)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatInt(row.quantity)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(row.value)}</td>
              </tr>
            ))}
            <tr className="bg-muted/80 font-bold">
              <td className="border border-border px-3 py-2">Итого:</td>
              <td className="border border-border px-3 py-2" colSpan={3} />
              <td className="border border-border px-3 py-2" />
              <td className="border border-border px-3 py-2 text-right tabular-nums">
                {formatInt(data.totalQuantity)}
              </td>
              <td className="border border-border px-3 py-2 text-right tabular-nums">
                {formatNum(data.totalVolume)}
              </td>
            </tr>
            <tr className="bg-muted/80">
              <td className="border border-border px-3 py-2" colSpan={7}>
                Количество сделок: {data.dealCount}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

