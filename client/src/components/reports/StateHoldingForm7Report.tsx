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

function Form7TableHead() {
  return (
    <thead>
      <tr className="bg-muted/60">
        <th className="border border-border px-2 py-2 text-left font-medium" rowSpan={2}>
          Наименование ценной бумаги
        </th>
        <th className="border border-border px-2 py-2 text-left font-medium" rowSpan={2}>
          Дата
        </th>
        <th className="border border-border px-2 py-2 text-left font-medium" rowSpan={2}>
          Государственный регистрационный номер
        </th>
        <th className="border border-border px-2 py-2 text-right font-medium" rowSpan={2}>
          Количество сделок
        </th>
        <th className="border border-border px-2 py-2 text-right font-medium" rowSpan={2}>
          Количество ценных бумаг (шт.)
        </th>
        <th className="border border-border px-2 py-2 text-center font-medium" colSpan={3}>
          Цена ценной бумаги (сом.)
        </th>
        <th className="border border-border px-2 py-2 text-right font-medium" rowSpan={2}>
          Объем сделки (сом.)
        </th>
      </tr>
      <tr className="bg-muted/60">
        <th className="border border-border px-2 py-2 text-right font-medium">max цена</th>
        <th className="border border-border px-2 py-2 text-right font-medium">min цена</th>
        <th className="border border-border px-2 py-2 text-right font-medium">средняя цена</th>
      </tr>
    </thead>
  );
}

export function StateHoldingForm7Report({ data }: Props) {
  return (
    <div className="w-full bg-white pb-6 text-xs print:max-w-none print:px-0 print:pb-0">
      <ReportHeader
        formNumber="Форма-7"
        title="Отчет о сделках по брокерским и дилерским фирмам"
        periodFrom={data.periodFrom}
        periodTo={data.periodTo}
      />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border text-sm">
          <Form7TableHead />
          <tbody>
            {data.firms.map((firm, fIdx) => (
              <React.Fragment key={fIdx}>
                <tr className="bg-emerald-50/80">
                  <td className="border border-border px-2 py-1 font-medium" colSpan={9}>
                    Брокер (покупатель): {firm.brokerName || firm.brokerCode}
                  </td>
                </tr>
                {firm.securities.map((sec, sIdx) => (
                  <React.Fragment key={sIdx}>
                    {sec.rows.map((row, rIdx) => (
                      <tr key={rIdx}>
                        <td className="border border-border px-2 py-1">{row.secFullName || row.secCode}</td>
                        <td className="border border-border px-2 py-1 whitespace-nowrap">{formatDate(row.tradeDate)}</td>
                        <td className="border border-border px-2 py-1 whitespace-nowrap">{row.isinCode || row.secCode}</td>
                        <td className="border border-border px-2 py-1 text-right">{formatInt(row.dealCount)}</td>
                        <td className="border border-border px-2 py-1 text-right">{formatInt(row.quantity)}</td>
                        <td className="border border-border px-2 py-1 text-right">{formatNum(row.maxPrice)}</td>
                        <td className="border border-border px-2 py-1 text-right">{formatNum(row.minPrice)}</td>
                        <td className="border border-border px-2 py-1 text-right">{formatNum(row.avgPrice)}</td>
                        <td className="border border-border px-2 py-1 text-right">{formatNum(row.volume)}</td>
                      </tr>
                    ))}
                    {sec.rows.length > 1 && (
                      <tr className="font-semibold">
                        <td className="border border-border px-2 py-1" colSpan={3}>
                          Итого по ценным бумагам
                        </td>
                        <td className="border border-border px-2 py-1 text-right">{formatInt(sec.totalDealCount)}</td>
                        <td className="border border-border px-2 py-1 text-right">{formatInt(sec.totalQuantity)}</td>
                        <td className="border border-border px-2 py-1 text-right">{formatNum(sec.maxPrice)}</td>
                        <td className="border border-border px-2 py-1 text-right">{formatNum(sec.minPrice)}</td>
                        <td className="border border-border px-2 py-1 text-right">{formatNum(sec.avgPrice)}</td>
                        <td className="border border-border px-2 py-1 text-right">{formatNum(sec.totalVolume)}</td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                <tr className="font-semibold">
                  <td className="border border-border px-2 py-1" colSpan={3}>
                    Итого по фирме
                  </td>
                  <td className="border border-border px-2 py-1 text-right">{formatInt(firm.totalDealCount)}</td>
                  <td className="border border-border px-2 py-1 text-right">{formatInt(firm.totalQuantity)}</td>
                  <td className="border border-border px-2 py-1" colSpan={3} />
                  <td className="border border-border px-2 py-1 text-right">{formatNum(firm.totalVolume)}</td>
                </tr>
              </React.Fragment>
            ))}
            {data.firms.length > 1 && (
              <tr className="font-semibold">
                <td className="border border-border px-2 py-1" colSpan={3}>Итого</td>
                <td className="border border-border px-2 py-1 text-right">{formatInt(data.grandTotalDealCount)}</td>
                <td className="border border-border px-2 py-1 text-right">{formatInt(data.grandTotalQuantity)}</td>
                <td className="border border-border px-2 py-1" colSpan={3} />
                <td className="border border-border px-2 py-1 text-right">{formatNum(data.grandTotalVolume)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function brokerKeyFromRow(r: Record<string, unknown>): string {
  const code = String(r.brokerCode ?? '').trim();
  if (code) return code;
  const name = String(r.brokerName ?? '').trim();
  return name ? `n:${name.toUpperCase()}` : '';
}

export function buildStateHoldingForm7Data(
  rows: Record<string, unknown>[],
  periodFrom: string,
  periodTo: string,
): StateHoldingForm7Data {
  const firmMap = new Map<string, FirmGroup>();

  for (const r of rows) {
    const brokerKey = brokerKeyFromRow(r);
    if (!brokerKey) continue;

    const brokerCode = String(r.brokerCode ?? brokerKey);
    const brokerName = String(r.brokerName ?? brokerCode);
    const secCode = String(r.secCode ?? '');
    const secFullName = String(r.secFullName ?? secCode);
    const tradeDate = String(r.tradeDate ?? '').slice(0, 10);
    const dealCount = Number(r.dealCount ?? 0);
    const quantity = Number(r.quantity ?? 0);
    const maxPrice = Number(r.maxPrice ?? 0);
    const minPrice = Number(r.minPrice ?? 0);
    const avgPrice = Number(r.avgPrice ?? 0);
    const volume = Number(r.volume ?? 0);

    if (!firmMap.has(brokerKey)) {
      firmMap.set(brokerKey, {
        brokerCode,
        brokerName,
        securities: [],
        totalDealCount: 0,
        totalQuantity: 0,
        totalVolume: 0,
      });
    }
    const firm = firmMap.get(brokerKey)!;
    if (brokerName) firm.brokerName = brokerName;

    let sec = firm.securities.find((s) => s.secCode === secCode);
    if (!sec) {
      sec = {
        secCode,
        secFullName,
        isinCode: String(r.isinCode ?? secCode),
        rows: [],
        totalDealCount: 0,
        totalQuantity: 0,
        totalVolume: 0,
        maxPrice: 0,
        minPrice: 0,
        avgPrice: 0,
      };
      firm.securities.push(sec);
    } else if (secFullName.length > sec.secFullName.length) {
      sec.secFullName = secFullName;
    }

    sec.rows.push({
      brokerCode,
      brokerName,
      secCode,
      secFullName,
      isinCode: String(r.isinCode ?? secCode),
      tradeDate,
      dealCount,
      quantity,
      maxPrice,
      minPrice,
      avgPrice,
      volume,
    });
  }

  let grandTotalDealCount = 0;
  let grandTotalQuantity = 0;
  let grandTotalVolume = 0;

  for (const firm of firmMap.values()) {
    firm.totalDealCount = 0;
    firm.totalQuantity = 0;
    firm.totalVolume = 0;

    for (const sec of firm.securities) {
      sec.rows.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));
      sec.totalDealCount = sec.rows.reduce((s, row) => s + row.dealCount, 0);
      sec.totalQuantity = sec.rows.reduce((s, row) => s + row.quantity, 0);
      sec.totalVolume = sec.rows.reduce((s, row) => s + row.volume, 0);
      const prices = sec.rows.flatMap((row) => [row.maxPrice, row.minPrice].filter((p) => p > 0));
      sec.maxPrice = prices.length ? Math.max(...prices) : 0;
      sec.minPrice = prices.length ? Math.min(...prices) : 0;
      sec.avgPrice =
        sec.totalQuantity > 0
          ? sec.rows.reduce((s, row) => s + row.avgPrice * row.quantity, 0) / sec.totalQuantity
          : 0;

      firm.totalDealCount += sec.totalDealCount;
      firm.totalQuantity += sec.totalQuantity;
      firm.totalVolume += sec.totalVolume;
    }

    grandTotalDealCount += firm.totalDealCount;
    grandTotalQuantity += firm.totalQuantity;
    grandTotalVolume += firm.totalVolume;
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
