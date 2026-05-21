/**
 * Госхолдинг Форма 7 — Отчет о сделках по брокерским и дилерским фирмам.
 * Иерархия: Брокерская фирма → ЦБ → строки по дате, Итого по ЦБ, Итого.
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

export interface StateHoldingForm7Row {
  brokerCode: string;
  brokerName: string;
  secCode: string;
  secFullName: string;
  isinCode: string;
  tradeDate: string;
  dealCount: number;
  quantity: number;
  maxPrice: number;
  minPrice: number;
  avgPrice: number;
  volume: number;
}

interface SecGroup {
  secCode: string;
  secFullName: string;
  isinCode: string;
  rows: StateHoldingForm7Row[];
  totalDealCount: number;
  totalQuantity: number;
  totalVolume: number;
  maxPrice: number;
  minPrice: number;
  avgPrice: number;
}

interface FirmGroup {
  brokerCode: string;
  brokerName: string;
  securities: SecGroup[];
  totalDealCount: number;
  totalQuantity: number;
  totalVolume: number;
}

export interface StateHoldingForm7Data {
  periodFrom: string;
  periodTo: string;
  firms: FirmGroup[];
  grandTotalDealCount: number;
  grandTotalQuantity: number;
  grandTotalVolume: number;
}

interface Props {
  data: StateHoldingForm7Data;
}

export function StateHoldingForm7Report({ data }: Props) {
  return (
    <div className="w-full bg-white pb-6 text-xs print:max-w-none print:px-0 print:pb-0">
      <ReportHeader
        formNumber="Форма 7"
        title="Отчет о сделках по брокерским и дилерским фирмам"
        periodFrom={data.periodFrom}
        periodTo={data.periodTo}
      />

      {data.firms.map((firm, fIdx) => (
        <div key={fIdx} className="mb-6">
          <div className="mb-2 text-sm font-semibold">
            Брокерская фирма: {firm.brokerName || firm.brokerCode}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-border text-xs">
              <thead>
                <tr className="bg-muted/60">
                  <th className="border border-border px-2 py-1 text-center font-medium" rowSpan={2}>
                    Наименование ценной бумаги
                  </th>
                  <th className="border border-border px-2 py-1 text-center font-medium" rowSpan={2}>
                    Дата
                  </th>
                  <th className="border border-border px-2 py-1 text-center font-medium" rowSpan={2}>
                    Государственный регистрационный номер
                  </th>
                  <th className="border border-border px-2 py-1 text-center font-medium" rowSpan={2}>
                    Количество сделок
                  </th>
                  <th className="border border-border px-2 py-1 text-center font-medium" rowSpan={2}>
                    Количество ценных бумаг (шт.)
                  </th>
                  <th className="border border-border px-2 py-1 text-center font-medium" colSpan={3}>
                    Цена ценной бумаги (сом.)
                  </th>
                  <th className="border border-border px-2 py-1 text-center font-medium" rowSpan={2}>
                    Объем сделки (сом.)
                  </th>
                </tr>
                <tr className="bg-muted/60">
                  <th className="border border-border px-2 py-1 text-center font-medium">max цена</th>
                  <th className="border border-border px-2 py-1 text-center font-medium">min цена</th>
                  <th className="border border-border px-2 py-1 text-center font-medium">средняя цена</th>
                </tr>
              </thead>
              <tbody>
                {firm.securities.map((sec, sIdx) => (
                  <React.Fragment key={sIdx}>
                    {sec.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-muted/20">
                        <td className="border border-border px-2 py-1">{row.secFullName || row.secCode}</td>
                        <td className="border border-border px-2 py-1 whitespace-nowrap">{formatDate(row.tradeDate)}</td>
                        <td className="border border-border px-2 py-1 whitespace-nowrap">{row.isinCode || row.secCode}</td>
                        <td className="border border-border px-2 py-1 text-right tabular-nums">{formatInt(row.dealCount)}</td>
                        <td className="border border-border px-2 py-1 text-right tabular-nums">{formatInt(row.quantity)}</td>
                        <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(row.maxPrice)}</td>
                        <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(row.minPrice)}</td>
                        <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(row.avgPrice)}</td>
                        <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(row.volume)}</td>
                      </tr>
                    ))}
                    <tr className="bg-muted/40 font-medium">
                      <td className="border border-border px-2 py-1" colSpan={3}>
                        Итого по ценным бумагам
                      </td>
                      <td className="border border-border px-2 py-1 text-right tabular-nums">{formatInt(sec.totalDealCount)}</td>
                      <td className="border border-border px-2 py-1 text-right tabular-nums">{formatInt(sec.totalQuantity)}</td>
                      <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(sec.maxPrice)}</td>
                      <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(sec.minPrice)}</td>
                      <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(sec.avgPrice)}</td>
                      <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(sec.totalVolume)}</td>
                    </tr>
                  </React.Fragment>
                ))}
                <tr className="bg-muted/70 font-semibold">
                  <td className="border border-border px-2 py-1" colSpan={3}>
                    Итого по фирме
                  </td>
                  <td className="border border-border px-2 py-1 text-right tabular-nums">{formatInt(firm.totalDealCount)}</td>
                  <td className="border border-border px-2 py-1 text-right tabular-nums">{formatInt(firm.totalQuantity)}</td>
                  <td className="border border-border px-2 py-1" colSpan={3} />
                  <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(firm.totalVolume)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {data.firms.length > 1 && (
        <table className="w-full border-collapse border border-border text-xs mt-2">
          <tbody>
            <tr className="bg-muted/80 font-bold">
              <td className="border border-border px-2 py-1" colSpan={3}>Итого</td>
              <td className="border border-border px-2 py-1 text-right tabular-nums">{formatInt(data.grandTotalDealCount)}</td>
              <td className="border border-border px-2 py-1 text-right tabular-nums">{formatInt(data.grandTotalQuantity)}</td>
              <td className="border border-border px-2 py-1" colSpan={3} />
              <td className="border border-border px-2 py-1 text-right tabular-nums">{formatNum(data.grandTotalVolume)}</td>
            </tr>
          </tbody>
        </table>
      )}
    </div>
  );
}

export function buildStateHoldingForm7Data(
  rows: Record<string, unknown>[],
  periodFrom: string,
  periodTo: string,
): StateHoldingForm7Data {
  const firmMap = new Map<string, FirmGroup>();

  for (const r of rows) {
    const brokerCode = String(r.brokerCode ?? '');
    const brokerName = String(r.brokerName ?? brokerCode);
    const secCode = String(r.secCode ?? '');

    if (!firmMap.has(brokerCode)) {
      firmMap.set(brokerCode, {
        brokerCode,
        brokerName,
        securities: [],
        totalDealCount: 0,
        totalQuantity: 0,
        totalVolume: 0,
      });
    }
    const firm = firmMap.get(brokerCode)!;

    let sec = firm.securities.find((s) => s.secCode === secCode);
    if (!sec) {
      sec = {
        secCode,
        secFullName: String(r.secFullName ?? secCode),
        isinCode: String(r.isinCode ?? secCode),
        rows: [],
        totalDealCount: 0,
        totalQuantity: 0,
        totalVolume: 0,
        maxPrice: 0,
        minPrice: Infinity,
        avgPrice: 0,
      };
      firm.securities.push(sec);
    }

    const row: StateHoldingForm7Row = {
      brokerCode,
      brokerName,
      secCode,
      secFullName: String(r.secFullName ?? secCode),
      isinCode: String(r.isinCode ?? secCode),
      tradeDate: String(r.tradeDate ?? '').slice(0, 10),
      dealCount: Number(r.dealCount ?? 0),
      quantity: Number(r.quantity ?? 0),
      maxPrice: Number(r.maxPrice ?? 0),
      minPrice: Number(r.minPrice ?? 0),
      avgPrice: Number(r.avgPrice ?? 0),
      volume: Number(r.volume ?? 0),
    };

    sec.rows.push(row);
    sec.totalDealCount += row.dealCount;
    sec.totalQuantity += row.quantity;
    sec.totalVolume += row.volume;
    if (row.maxPrice > sec.maxPrice) sec.maxPrice = row.maxPrice;
    if (row.minPrice < sec.minPrice) sec.minPrice = row.minPrice;

    firm.totalDealCount += row.dealCount;
    firm.totalQuantity += row.quantity;
    firm.totalVolume += row.volume;
  }

  let grandTotalDealCount = 0;
  let grandTotalQuantity = 0;
  let grandTotalVolume = 0;

  for (const firm of firmMap.values()) {
    grandTotalDealCount += firm.totalDealCount;
    grandTotalQuantity += firm.totalQuantity;
    grandTotalVolume += firm.totalVolume;

    // avgPrice для итого по ЦБ — средневзвешенная
    for (const sec of firm.securities) {
      if (sec.minPrice === Infinity) sec.minPrice = 0;
      const totalQty = sec.rows.reduce((s, r) => s + r.quantity, 0);
      sec.avgPrice = totalQty > 0
        ? sec.rows.reduce((s, r) => s + r.avgPrice * r.quantity, 0) / totalQty
        : 0;
    }
  }

  return {
    periodFrom,
    periodTo,
    firms: Array.from(firmMap.values()),
    grandTotalDealCount,
    grandTotalQuantity,
    grandTotalVolume,
  };
}
