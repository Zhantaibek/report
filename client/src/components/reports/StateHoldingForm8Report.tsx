/**
 * Госхолдинг Форма 8 — Список ценных бумаг, допущенных к обращению
 * через торговую систему фондовой биржи.
 * Колонки: Наименование эмитента + кол-во ЦБ в выпуске, Место нахождения,
 * Гос. рег. номер, Код ЦБ, Вид ЦБ, Вид деятельности, Рыночная цена (сом.), Листинг/нелистинг.
 */
import React from 'react';
import { ReportHeader } from './ReportHeader';

function formatNum(n: number | null | undefined, decimals = 2): string {
  if (n == null || Number.isNaN(n) || n === 0) return '';
  return n.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export interface StateHoldingForm8Row {
  secFullName: string;
  secCode: string;
  isinCode: string;
  classCode: string;
  secType: string;
  faceValue: number;
  marketPrice: number;
  listingType: string;
}

export interface StateHoldingForm8Data {
  periodFrom: string;
  periodTo: string;
  rows: StateHoldingForm8Row[];
}

interface Props {
  data: StateHoldingForm8Data;
}

export function StateHoldingForm8Report({ data }: Props) {
  return (
    <div className="w-full bg-white pb-6 text-xs print:max-w-none print:px-0 print:pb-0">
      <ReportHeader
        formNumber="Форма 8"
        title="Список ценных бумаг, допущенных к обращению через торговую систему фондовой биржи"
        periodFrom={data.periodFrom}
        periodTo={data.periodTo}
      />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border text-xs">
          <thead>
            <tr className="bg-muted/60">
              <th className="border border-border px-2 py-2 text-center font-medium">
                Наименование эмитента, общее количество ценных бумаг в выпуске
              </th>
              <th className="border border-border px-2 py-2 text-center font-medium">
                Место нахождения
              </th>
              <th className="border border-border px-2 py-2 text-center font-medium">
                Государственный регистрационный номер
              </th>
              <th className="border border-border px-2 py-2 text-center font-medium">
                Код ценной бумаги
              </th>
              <th className="border border-border px-2 py-2 text-center font-medium">
                Вид ценной бумаги
              </th>
              <th className="border border-border px-2 py-2 text-center font-medium">
                Вид деятельности
              </th>
              <th className="border border-border px-2 py-2 text-center font-medium">
                Рыночная цена (сом.)
              </th>
              <th className="border border-border px-2 py-2 text-center font-medium">
                Листинг/нелистинг
              </th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-muted/20">
                <td className="border border-border px-2 py-1">{row.secFullName}</td>
                <td className="border border-border px-2 py-1" />
                <td className="border border-border px-2 py-1 whitespace-nowrap">{row.isinCode}</td>
                <td className="border border-border px-2 py-1 whitespace-nowrap">{row.secCode}</td>
                <td className="border border-border px-2 py-1">{row.secType}</td>
                <td className="border border-border px-2 py-1" />
                <td className="border border-border px-2 py-1 text-right tabular-nums">
                  {formatNum(row.marketPrice)}
                </td>
                <td className="border border-border px-2 py-1 text-center">{row.listingType}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function buildStateHoldingForm8Data(
  rows: Record<string, unknown>[],
  periodFrom: string,
  periodTo: string,
): StateHoldingForm8Data {
  const out: StateHoldingForm8Row[] = rows.map((r) => ({
    secFullName: String(r.secFullName ?? ''),
    secCode: String(r.secCode ?? ''),
    isinCode: String(r.isinCode ?? ''),
    classCode: String(r.classCode ?? ''),
    secType: String(r.secType ?? ''),
    faceValue: Number(r.faceValue ?? 0),
    marketPrice: Number(r.marketPrice ?? 0),
    listingType: String(r.listingType ?? ''),
  }));
  return { periodFrom, periodTo, rows: out };
}
