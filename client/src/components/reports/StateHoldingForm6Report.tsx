/**
 * Госхолдинг Форма 6 — Отчет о сделках.
 * Колонки: Номер сделки, Дата, ЦБ, Рег. № ЦБ, Продавец, Покупатель,
 * Кол-во ЦБ (первичный/вторичный), Цена (первичный/вторичный), Объем (первичный/вторичный),
 * Нелистинг/листинг (категория/уровень).
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

/** Определяет, является ли сделка первичным рынком по названию класса. */
function isPrimaryMarket(className: string): boolean {
  const cl = (className ?? '').toLowerCase();
  return (
    cl.includes('аукцион') ||
    cl.includes('размещ') ||
    cl.includes('первичн') ||
    cl.includes('эмисс') ||
    cl.includes('выпуск') ||
    cl.includes('допразмещ')
  );
}

export interface StateHoldingForm6Row {
  tradeDate: string;
  secFullName: string;
  secCode: string;
  isinCode: string;
  id: string;
  buyerName: string;
  sellerName: string;
  className: string;
  quantity: number;
  price: number;
  value: number;
}

export interface StateHoldingForm6Data {
  periodFrom: string;
  periodTo: string;
  rows: StateHoldingForm6Row[];
}

interface Props {
  data: StateHoldingForm6Data;
}

export function StateHoldingForm6Report({ data }: Props) {
  let totalQtyPrimary = 0;
  let totalQtySecondary = 0;
  let totalVolPrimary = 0;
  let totalVolSecondary = 0;

  for (const row of data.rows) {
    if (isPrimaryMarket(row.className)) {
      totalQtyPrimary += row.quantity;
      totalVolPrimary += row.value;
    } else {
      totalQtySecondary += row.quantity;
      totalVolSecondary += row.value;
    }
  }

  return (
    <div className="w-full bg-white pb-6 text-xs print:max-w-none print:px-0 print:pb-0">
      <ReportHeader
        formNumber="Форма 6"
        title="Отчет о сделках"
        periodFrom={data.periodFrom}
        periodTo={data.periodTo}
      />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th className="border border-border px-2 py-1 text-center font-medium" rowSpan={2}>
                Номер сделки
              </th>
              <th className="border border-border px-2 py-1 text-center font-medium" rowSpan={2}>Дата</th>
              <th className="border border-border px-2 py-1 text-center font-medium" rowSpan={2}>
                ЦБ
              </th>
              <th className="border border-border px-2 py-1 text-center font-medium" rowSpan={2}>
                Рег. № ЦБ
              </th>
              <th className="border border-border px-2 py-1 text-center font-medium" rowSpan={2}>
                Продавец
              </th>
              <th className="border border-border px-2 py-1 text-center font-medium" rowSpan={2}>
                Покупатель
              </th>
              <th className="border border-border px-2 py-1 text-center font-medium" colSpan={2}>
                Количество ценных бумаг (шт.)
              </th>
              <th className="border border-border px-2 py-1 text-center font-medium" colSpan={2}>
                Цена за 1 ценную бумагу (сом.)
              </th>
              <th className="border border-border px-2 py-1 text-center font-medium" colSpan={2}>
                Объем сделки
              </th>
              <th className="border border-border px-2 py-1 text-center font-medium" rowSpan={2}>
                Нелистинг/листинг (категория/уровень листинга)
              </th>
            </tr>
            <tr className="bg-muted/60">
              <th className="border border-border px-2 py-1 text-center font-medium">первичный рынок</th>
              <th className="border border-border px-2 py-1 text-center font-medium">вторичный рынок</th>
              <th className="border border-border px-2 py-1 text-center font-medium">первичный рынок</th>
              <th className="border border-border px-2 py-1 text-center font-medium">вторичный рынок</th>
              <th className="border border-border px-2 py-1 text-center font-medium">первичный рынок</th>
              <th className="border border-border px-2 py-1 text-center font-medium">вторичный рынок</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, idx) => {
              const primary = isPrimaryMarket(row.className);
              return (
                <tr key={idx} className="hover:bg-muted/20">
                  <td className="border border-border px-2 py-1 text-center tabular-nums">{row.id}</td>
                  <td className="border border-border px-2 py-1 whitespace-nowrap">{formatDate(row.tradeDate)}</td>
                  <td className="border border-border px-2 py-1">{row.secFullName || row.secCode}</td>
                  <td className="border border-border px-2 py-1 whitespace-nowrap">{row.isinCode || row.secCode}</td>
                  <td className="border border-border px-2 py-1">{row.sellerName}</td>
                  <td className="border border-border px-2 py-1">{row.buyerName}</td>
                  <td className="border border-border px-2 py-1 text-right tabular-nums">
                    {primary ? formatInt(row.quantity) : ''}
                  </td>
                  <td className="border border-border px-2 py-1 text-right tabular-nums">
                    {!primary ? formatInt(row.quantity) : ''}
                  </td>
                  <td className="border border-border px-2 py-1 text-right tabular-nums">
                    {primary ? formatNum(row.price) : ''}
                  </td>
                  <td className="border border-border px-2 py-1 text-right tabular-nums">
                    {!primary ? formatNum(row.price) : ''}
                  </td>
                  <td className="border border-border px-2 py-1 text-right tabular-nums">
                    {primary ? formatNum(row.value) : ''}
                  </td>
                  <td className="border border-border px-2 py-1 text-right tabular-nums">
                    {!primary ? formatNum(row.value) : ''}
                  </td>
                  <td className="border border-border px-2 py-1 text-center">{row.className}</td>
                </tr>
              );
            })}
            <tr className="bg-muted/80 font-bold">
              <td className="border border-border px-2 py-1" colSpan={6}>Итого</td>
              <td className="border border-border px-2 py-1 text-right tabular-nums">{formatInt(totalQtyPrimary)}</td>
              <td className="border border-border px-2 py-1 text-right tabular-nums">{formatInt(totalQtySecondary)}</td>
              <td className="border border-border px-2 py-1" colSpan={2} />
              <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(totalVolPrimary)}</td>
              <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(totalVolSecondary)}</td>
              <td className="border border-border px-2 py-1" />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function buildStateHoldingForm6Data(
  rows: Record<string, unknown>[],
  periodFrom: string,
  periodTo: string,
): StateHoldingForm6Data {
  const out: StateHoldingForm6Row[] = rows.map((r) => ({
    tradeDate: String(r.tradeDate ?? '').slice(0, 10),
    secFullName: String(r.secFullName ?? ''),
    secCode: String(r.secCode ?? ''),
    isinCode: String(r.isinCode ?? ''),
    id: String(r.id ?? ''),
    buyerName: String(r.buyerName ?? ''),
    sellerName: String(r.sellerName ?? ''),
    className: String(r.className ?? ''),
    quantity: Number(r.quantity ?? 0),
    price: Number(r.price ?? 0),
    value: Number(r.value ?? 0),
  }));
  return { periodFrom, periodTo, rows: out };
}
