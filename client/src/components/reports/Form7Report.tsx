/**
 * Форма отчёта F7 — по секторам и ЦБ: Дата, Кол-во сделок, Кол-во ЦБ, Max/Min/Средняя цена, Объём.
 * Иерархия: Сектор → Ценная бумага → строки по дате, Итого по ЦБ, Итого по сектору, Итого.
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

export interface Form7Row {
  sector: string;
  secCode: string;
  secFullName: string;
  tradeDate: string;
  dealCount: number;
  quantity: number;
  maxPrice: number;
  minPrice: number;
  avgPrice: number;
  volume: number;
}

export interface Form7Sector {
  sector: string;
  securities: {
    secFullName: string;
    secCode: string;
    rows: Form7Row[];
    totalDealCount: number;
    totalQuantity: number;
    totalVolume: number;
    maxPrice: number;
    minPrice: number;
    avgPrice: number;
  }[];
  totalDealCount: number;
  totalQuantity: number;
  totalVolume: number;
}

export interface ReportForm7Data {
  periodFrom: string;
  periodTo: string;
  sectors: Form7Sector[];
  grandTotalDealCount: number;
  grandTotalQuantity: number;
  grandTotalVolume: number;
}

interface Props {
  data: ReportForm7Data;
}

export function Form7Report({ data }: Props) {
  return (
    <div className="w-full bg-white pb-6 text-xs print:max-w-none print:px-0 print:pb-0">
      <ReportHeader
        formNumber="Ф-7"
        title="Отчет о заключенных сделках"
        periodFrom={data.periodFrom}
        periodTo={data.periodTo}
      />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th className="border border-border px-3 py-2 text-left font-medium">Дата</th>
              <th className="border border-border px-3 py-2 text-center font-medium">Кол-во сделок</th>
              <th className="border border-border px-3 py-2 text-center font-medium">Кол-во ЦБ</th>
              <th className="border border-border px-3 py-2 text-right font-medium">Max цена</th>
              <th className="border border-border px-3 py-2 text-right font-medium">Min цена</th>
              <th className="border border-border px-3 py-2 text-right font-medium">Средняя цена</th>
              <th className="border border-border px-3 py-2 text-right font-medium">Объем сделок</th>
            </tr>
          </thead>
          <tbody>
            {data.sectors.map((sector, sIdx) => (
              <React.Fragment key={sIdx}>
                <tr className="bg-muted/70">
                  <td colSpan={7} className="border border-border px-3 py-2 font-semibold">
                    Сектор: {sector.sector}
                  </td>
                </tr>
                {sector.securities.map((sec, secIdx) => (
                  <React.Fragment key={secIdx}>
                    <tr className="bg-muted/50">
                      <td colSpan={7} className="border border-border px-3 py-2 font-medium">
                        Ценная бумага: {sec.secFullName || sec.secCode}
                      </td>
                    </tr>
                    {sec.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-muted/20">
                        <td className="border border-border px-3 py-2">{formatDate(row.tradeDate)}</td>
                        <td className="border border-border px-3 py-2 text-center tabular-nums">{row.dealCount}</td>
                        <td className="border border-border px-3 py-2 text-center tabular-nums">{formatInt(row.quantity)}</td>
                        <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(row.maxPrice)}</td>
                        <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(row.minPrice)}</td>
                        <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(row.avgPrice)}</td>
                        <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(row.volume)}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/40 font-medium">
                      <td className="border border-border px-3 py-2">Итого по ЦБ</td>
                      <td className="border border-border px-3 py-2 text-center tabular-nums">{sec.totalDealCount}</td>
                      <td className="border border-border px-3 py-2 text-center tabular-nums">{formatInt(sec.totalQuantity)}</td>
                      <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(sec.maxPrice)}</td>
                      <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(sec.minPrice)}</td>
                      <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(sec.avgPrice)}</td>
                      <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(sec.totalVolume)}</td>
                    </tr>
                  </React.Fragment>
                ))}
                <tr className="bg-muted/60 font-semibold">
                  <td className="border border-border px-3 py-2">Итого по сектору</td>
                  <td className="border border-border px-3 py-2 text-center tabular-nums">{sector.totalDealCount}</td>
                  <td className="border border-border px-3 py-2 text-center tabular-nums">{formatInt(sector.totalQuantity)}</td>
                  <td className="border border-border px-3 py-2" />
                  <td className="border border-border px-3 py-2" />
                  <td className="border border-border px-3 py-2" />
                  <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(sector.totalVolume)}</td>
                </tr>
              </React.Fragment>
            ))}
            <tr className="bg-muted/80 font-bold">
              <td className="border border-border px-3 py-2">Итого</td>
              <td className="border border-border px-3 py-2 text-center tabular-nums">{data.grandTotalDealCount}</td>
              <td className="border border-border px-3 py-2 text-center tabular-nums">{formatInt(data.grandTotalQuantity)}</td>
              <td className="border border-border px-3 py-2" />
              <td className="border border-border px-3 py-2" />
              <td className="border border-border px-3 py-2" />
              <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.grandTotalVolume)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
