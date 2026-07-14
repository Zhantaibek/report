/**
 * Отчет о сделках по ЦБ — группировка по инструменту (эмитент + ISIN).
 */
import React from 'react';
import { ReportHeader } from './ReportHeader';

function formatDate(dateStr: string): string {
  const s = String(dateStr).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

function formatNum(n: number, decimals = 2): string {
  if (n == null || Number.isNaN(n)) return '';
  return n.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatInt(n: number): string {
  if (n == null || Number.isNaN(n)) return '0';
  return Math.round(n).toLocaleString('ru-RU');
}

/** «ОАО X, акция простая» → эмитент + вид ЦБ */
export function splitSecFullName(full: string): { issuerName: string; secType: string } {
  const s = full.trim();
  const idx = s.lastIndexOf(',');
  if (idx > 0) {
    return { issuerName: s.slice(0, idx).trim(), secType: s.slice(idx + 1).trim() };
  }
  return { issuerName: s, secType: '' };
}

export interface TradesBySecTrade {
  tradeDate: string;
  quantity: number;
  price: number;
  value: number;
}

export interface TradesBySecGroup {
  secCode: string;
  isinCode: string;
  issuerName: string;
  secType: string;
  trades: TradesBySecTrade[];
  totalQuantity: number;
  totalValue: number;
}

export interface TradesBySecData {
  periodFrom: string;
  periodTo: string;
  groups: TradesBySecGroup[];
}

interface Props {
  data: TradesBySecData;
}

export function TradesBySecReport({ data }: Props) {
  return (
    <div className="w-full bg-white pb-6 text-xs print:max-w-none print:px-0 print:pb-0">
      <ReportHeader
        formNumber=""
        title="Отчет о сделках по ЦБ"
        periodFrom={data.periodFrom}
        periodTo={data.periodTo}
      />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th className="border border-border px-2 py-2 text-left font-medium">Наименование эмитента</th>
              <th className="border border-border px-2 py-2 text-left font-medium">Вид ЦБ</th>
              <th className="border border-border px-2 py-2 text-left font-medium">Дата провед. сделки</th>
              <th className="border border-border px-2 py-2 text-right font-medium">Кол-во ЦБ</th>
              <th className="border border-border px-2 py-2 text-right font-medium">Цена ЦБ</th>
              <th className="border border-border px-2 py-2 text-right font-medium">Объем сделки</th>
            </tr>
          </thead>
          <tbody>
            {data.groups.map((g) => (
              <React.Fragment key={g.secCode || g.isinCode}>
                <tr className="bg-muted/50">
                  <td className="border border-border px-2 py-1.5 font-medium" colSpan={6}>
                    {g.issuerName}
                    {(g.isinCode || g.secCode) && (
                      <span className="ml-3 font-normal tabular-nums">{g.isinCode || g.secCode}</span>
                    )}
                  </td>
                </tr>
                {g.trades.map((t, idx) => (
                  <tr key={`${g.secCode}-${t.tradeDate}-${idx}`} className="hover:bg-muted/20">
                    <td className="border border-border px-2 py-1" />
                    <td className="border border-border px-2 py-1">{g.secType}</td>
                    <td className="border border-border px-2 py-1 whitespace-nowrap">{formatDate(t.tradeDate)}</td>
                    <td className="border border-border px-2 py-1 text-right tabular-nums">{formatInt(t.quantity)}</td>
                    <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(t.price)}</td>
                    <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(t.value)}</td>
                  </tr>
                ))}
                <tr className="bg-muted/40 font-semibold">
                  <td className="border border-border px-2 py-1" colSpan={3}>
                    Итого :
                  </td>
                  <td className="border border-border px-2 py-1 text-right tabular-nums">
                    {formatInt(g.totalQuantity)}
                  </td>
                  <td className="border border-border px-2 py-1" />
                  <td className="border border-border px-2 py-1 text-right tabular-nums">
                    {formatNum(g.totalValue)}
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function buildTradesBySecData(
  rows: Record<string, unknown>[],
  periodFrom: string,
  periodTo: string,
): TradesBySecData {
  const bySec = new Map<string, TradesBySecGroup>();

  for (const r of rows) {
    const secCode = String(r.secCode ?? '').trim();
    const isinCode = String(r.isinCode ?? '').trim() || secCode;
    const key = secCode || isinCode || '—';
    const fullName = String(r.secFullName ?? '').trim() || key;
    const { issuerName, secType } = splitSecFullName(fullName);
    const trade: TradesBySecTrade = {
      tradeDate: String(r.tradeDate ?? '').slice(0, 10),
      quantity: Number(r.quantity ?? 0),
      price: Number(r.price ?? 0),
      value: Number(r.value ?? 0),
    };

    let g = bySec.get(key);
    if (!g) {
      g = {
        secCode: secCode || key,
        isinCode,
        issuerName: issuerName || key,
        secType: secType || String(r.className ?? '').trim(),
        trades: [],
        totalQuantity: 0,
        totalValue: 0,
      };
      bySec.set(key, g);
    }
    g.trades.push(trade);
    g.totalQuantity += trade.quantity;
    g.totalValue += trade.value;
  }

  const groups = [...bySec.values()]
    .map((g) => ({
      ...g,
      trades: [...g.trades].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate)),
    }))
    .sort((a, b) => a.issuerName.localeCompare(b.issuerName, 'ru') || a.isinCode.localeCompare(b.isinCode));

  return { periodFrom, periodTo, groups };
}

export default TradesBySecReport;
