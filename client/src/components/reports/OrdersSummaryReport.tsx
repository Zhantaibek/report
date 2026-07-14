/**
 * Сводная ведомость заявок — группировка по ЦБ, подытоги по дате и по ЦБ.
 */
import React from 'react';
import { ReportHeader } from './ReportHeader';

function formatDateTime(s: string): string {
  const raw = String(s ?? '').trim();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}:${m[6]}`;
  const d = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (d) return `${d[3]}/${d[2]}/${d[1]}`;
  return raw;
}

function formatNum(n: number, decimals = 2): string {
  if (n == null || Number.isNaN(n)) return '';
  return n.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatInt(n: number): string {
  if (n == null || Number.isNaN(n)) return '0';
  return Math.round(n).toLocaleString('ru-RU');
}

export interface OrdersSummaryOrder {
  orderDateTime: string;
  direction: string;
  quantity: number;
  price: number;
  volume: number;
}

export interface OrdersSummarySecurity {
  secCode: string;
  secFullName: string;
  isinCode: string;
  orders: OrdersSummaryOrder[];
  totalQuantity: number;
  totalVolume: number;
}

export interface OrdersSummaryData {
  periodFrom: string;
  periodTo: string;
  securities: OrdersSummarySecurity[];
}

interface Props {
  data: OrdersSummaryData;
}

function dayKey(orderDateTime: string): string {
  return String(orderDateTime).slice(0, 10);
}

export function OrdersSummaryReport({ data }: Props) {
  return (
    <div className="w-full bg-white pb-6 text-xs print:max-w-none print:px-0 print:pb-0">
      <ReportHeader
        formNumber=""
        title="Сводная ведомость заявок"
        periodFrom={data.periodFrom}
        periodTo={data.periodTo}
      />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th className="border border-border px-2 py-2 text-left font-medium">Дата</th>
              <th className="border border-border px-2 py-2 text-left font-medium">Направление</th>
              <th className="border border-border px-2 py-2 text-right font-medium">Кол-во ЦБ</th>
              <th className="border border-border px-2 py-2 text-right font-medium">Цена</th>
              <th className="border border-border px-2 py-2 text-right font-medium">Объем заявки</th>
            </tr>
          </thead>
          <tbody>
            {data.securities.map((sec) => {
              const byDay = new Map<string, OrdersSummaryOrder[]>();
              for (const o of sec.orders) {
                const k = dayKey(o.orderDateTime);
                if (!byDay.has(k)) byDay.set(k, []);
                byDay.get(k)!.push(o);
              }
              const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));

              return (
                <React.Fragment key={sec.secCode}>
                  <tr className="bg-muted/50">
                    <td className="border border-border px-2 py-1.5 font-medium" colSpan={5}>
                      <span className="mr-6">Ценная бумага: {sec.secFullName}</span>
                      <span>ISIN: {sec.isinCode}</span>
                    </td>
                  </tr>
                  {days.map(([day, orders]) => {
                    const dayQty = orders.reduce((s, o) => s + o.quantity, 0);
                    const dayVol = orders.reduce((s, o) => s + o.volume, 0);
                    return (
                      <React.Fragment key={`${sec.secCode}-${day}`}>
                        {orders.map((o, idx) => (
                          <tr key={`${sec.secCode}-${day}-${idx}`} className="hover:bg-muted/20">
                            <td className="border border-border px-2 py-1 whitespace-nowrap">
                              {formatDateTime(o.orderDateTime)}
                            </td>
                            <td className="border border-border px-2 py-1">{o.direction}</td>
                            <td className="border border-border px-2 py-1 text-right tabular-nums">
                              {formatInt(o.quantity)}
                            </td>
                            <td className="border border-border px-2 py-1 text-right tabular-nums">
                              {formatNum(o.price)}
                            </td>
                            <td className="border border-border px-2 py-1 text-right tabular-nums">
                              {formatNum(o.volume)}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-muted/20 font-medium">
                          <td className="border border-border px-2 py-1" colSpan={2}>
                            Итого:
                          </td>
                          <td className="border border-border px-2 py-1 text-right tabular-nums">
                            {formatInt(dayQty)}
                          </td>
                          <td className="border border-border px-2 py-1" />
                          <td className="border border-border px-2 py-1 text-right tabular-nums">
                            {formatNum(dayVol)}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                  <tr className="bg-muted/40 font-semibold">
                    <td className="border border-border px-2 py-1" colSpan={2}>
                      Итого по ЦБ:
                    </td>
                    <td className="border border-border px-2 py-1 text-right tabular-nums">
                      {formatInt(sec.totalQuantity)}
                    </td>
                    <td className="border border-border px-2 py-1" />
                    <td className="border border-border px-2 py-1 text-right tabular-nums">
                      {formatNum(sec.totalVolume)}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function buildOrdersSummaryData(
  rows: Record<string, unknown>[],
  periodFrom: string,
  periodTo: string,
): OrdersSummaryData {
  const bySec = new Map<string, OrdersSummarySecurity>();

  for (const r of rows) {
    const secCode = String(r.secCode ?? '').trim() || '—';
    const order: OrdersSummaryOrder = {
      orderDateTime: String(r.orderDateTime ?? ''),
      direction: String(r.direction ?? ''),
      quantity: Number(r.quantity ?? 0),
      price: Number(r.price ?? 0),
      volume: Number(r.volume ?? 0),
    };

    let sec = bySec.get(secCode);
    if (!sec) {
      sec = {
        secCode,
        secFullName: String(r.secFullName ?? secCode).trim() || secCode,
        isinCode: String(r.isinCode ?? secCode).trim() || secCode,
        orders: [],
        totalQuantity: 0,
        totalVolume: 0,
      };
      bySec.set(secCode, sec);
    }
    sec.orders.push(order);
    sec.totalQuantity += order.quantity;
    sec.totalVolume += order.volume;
  }

  const securities = [...bySec.values()]
    .map((sec) => ({
      ...sec,
      orders: [...sec.orders].sort((a, b) => a.orderDateTime.localeCompare(b.orderDateTime)),
    }))
    .sort((a, b) => a.secFullName.localeCompare(b.secFullName, 'ru'));

  return { periodFrom, periodTo, securities };
}

export default OrdersSummaryReport;
