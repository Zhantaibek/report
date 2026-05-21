/**
 * Форма 5 (госхолдинг) — топ-5 участников по сумме сделок в сомах по рабочим дням.
 */
import React from 'react';
import { ReportHeader } from './ReportHeader';

export interface StateHoldingForm5Top5Row {
  seqNo: number;
  tradeDate: string;
  participantName: string;
  dealCount: number;
  secQty: number;
  amountPlacement: number;
  amountCirculation: number;
  amountTotal: number;
}

export interface StateHoldingForm5Top5Data {
  periodFrom: string;
  periodTo: string;
  rows: StateHoldingForm5Top5Row[];
}

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

const TITLE =
  'Сведения о 5 участниках торгов, имеющих наибольшую сумму совершенных сделок в сомах с ценными бумагами, допущенными к обращению через торговую систему фондовой биржи (данные представляются по каждому рабочему дню недели)';

interface Props {
  data: StateHoldingForm5Top5Data;
}

export function StateHoldingForm5Top5Report({ data }: Props) {
  return (
    <div className="w-full bg-white pb-6 text-xs print:max-w-none print:px-0 print:pb-0">
      <ReportHeader formNumber="Форма 5" title={TITLE} periodFrom={data.periodFrom} periodTo={data.periodTo} />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th className="border border-border px-2 py-2 text-left font-medium" rowSpan={2}>
                Дата
              </th>
              <th className="border border-border px-2 py-2 text-left font-medium" rowSpan={2}>
                Наименование участника
              </th>
              <th className="border border-border px-2 py-2 text-right font-medium" rowSpan={2}>
                Количество сделок
              </th>
              <th className="border border-border px-2 py-2 text-right font-medium" rowSpan={2}>
                Количество ЦБ
              </th>
              <th className="border border-border px-2 py-2 text-center font-medium" colSpan={3}>
                Общая сумма сделок (сом.)
              </th>
            </tr>
            <tr className="bg-muted/60">
              <th className="border border-border px-2 py-2 text-right font-medium">размещение</th>
              <th className="border border-border px-2 py-2 text-right font-medium">обращение</th>
              <th className="border border-border px-2 py-2 text-right font-medium">всего</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, idx) => (
              <tr key={`${row.tradeDate}-${row.seqNo}-${idx}`} className="hover:bg-muted/20">
                <td className="border border-border px-2 py-1">{formatDate(row.tradeDate)}</td>
                <td className="border border-border px-2 py-1">{row.participantName}</td>
                <td className="border border-border px-2 py-1 text-right">{formatInt(row.dealCount)}</td>
                <td className="border border-border px-2 py-1 text-right">{formatInt(row.secQty)}</td>
                <td className="border border-border px-2 py-1 text-right">{formatNum(row.amountPlacement)}</td>
                <td className="border border-border px-2 py-1 text-right">{formatNum(row.amountCirculation)}</td>
                <td className="border border-border px-2 py-1 text-right">{formatNum(row.amountTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function buildStateHoldingForm5Top5Data(
  rows: Record<string, unknown>[],
  periodFrom: string,
  periodTo: string,
): StateHoldingForm5Top5Data {
  const out: StateHoldingForm5Top5Row[] = [];
  for (const r of rows) {
    out.push({
      seqNo: Number(r.seqNo ?? 0),
      tradeDate: String(r.tradeDate ?? '').slice(0, 10),
      participantName: String(r.participantName ?? ''),
      dealCount: Number(r.dealCount ?? 0),
      secQty: Number(r.secQty ?? 0),
      amountPlacement: Number(r.amountPlacement ?? 0),
      amountCirculation: Number(r.amountCirculation ?? 0),
      amountTotal: Number(r.amountTotal ?? 0),
    });
  }
  return { periodFrom, periodTo, rows: out };
}
