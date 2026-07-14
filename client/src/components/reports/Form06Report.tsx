/**
 * Форма 06 — сведения о 5 участниках с наибольшей суммой сделок (по дням).
 * Данные/агрегация — те же, что у Form5 Top5 (ГосФинНадзор).
 */
import React from 'react';
import { ReportHeader } from './ReportHeader';
import {
  buildStateHoldingForm5Top5Data,
  type StateHoldingForm5Top5Data,
} from './StateHoldingForm5Top5Report';

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
  'Сведения о 5 участниках торговли, имеющих наибольшую сумму совершенных сделок с ценными бумагами, допущенными к обращению через организатора торговли (по каждому рабочему дню недели) за период';

interface Props {
  data: StateHoldingForm5Top5Data;
}

export function Form06Report({ data }: Props) {
  return (
    <div className="w-full bg-white pb-6 text-xs print:max-w-none print:px-0 print:pb-0">
      <ReportHeader formNumber="Ф-06" title={TITLE} periodFrom={data.periodFrom} periodTo={data.periodTo} />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th className="border border-border px-2 py-2 text-left font-medium" rowSpan={2}>
                Дата
              </th>
              <th className="border border-border px-2 py-2 text-right font-medium" rowSpan={2}>
                Кол-во сделок
              </th>
              <th className="border border-border px-2 py-2 text-right font-medium" rowSpan={2}>
                Кол-во ЦБ
              </th>
              <th className="border border-border px-2 py-2 text-center font-medium" colSpan={3}>
                Общая сумма сделок (сом)
              </th>
            </tr>
            <tr className="bg-muted/60">
              <th className="border border-border px-2 py-2 text-right font-medium">Размещение</th>
              <th className="border border-border px-2 py-2 text-right font-medium">Вторичное</th>
              <th className="border border-border px-2 py-2 text-right font-medium">Всего</th>
            </tr>
          </thead>
          <tbody>
            {data.participants.map((p) => (
              <React.Fragment key={p.seqNo}>
                <tr className="bg-muted/40">
                  <td className="border border-border px-2 py-1 font-medium" colSpan={6}>
                    Участник торгов: {p.participantName}
                  </td>
                </tr>
                {p.days.map((day) => (
                  <tr key={`${p.seqNo}-${day.tradeDate}`} className="hover:bg-muted/20">
                    <td className="border border-border px-2 py-1">{formatDate(day.tradeDate)}</td>
                    <td className="border border-border px-2 py-1 text-right tabular-nums">
                      {formatInt(day.dealCount)}
                    </td>
                    <td className="border border-border px-2 py-1 text-right tabular-nums">
                      {formatInt(day.secQty)}
                    </td>
                    <td className="border border-border px-2 py-1 text-right tabular-nums">
                      {formatNum(day.amountPlacement)}
                    </td>
                    <td className="border border-border px-2 py-1 text-right tabular-nums">
                      {formatNum(day.amountCirculation)}
                    </td>
                    <td className="border border-border px-2 py-1 text-right tabular-nums">
                      {formatNum(day.amountTotal)}
                    </td>
                  </tr>
                ))}
                <tr className="bg-muted/30 font-semibold">
                  <td className="border border-border px-2 py-1">Итого :</td>
                  <td className="border border-border px-2 py-1 text-right tabular-nums">
                    {formatInt(p.totalDealCount)}
                  </td>
                  <td className="border border-border px-2 py-1 text-right tabular-nums">
                    {formatInt(p.totalSecQty)}
                  </td>
                  <td className="border border-border px-2 py-1 text-right tabular-nums">
                    {formatNum(p.totalPlacement)}
                  </td>
                  <td className="border border-border px-2 py-1 text-right tabular-nums">
                    {formatNum(p.totalCirculation)}
                  </td>
                  <td className="border border-border px-2 py-1 text-right tabular-nums">
                    {formatNum(p.totalAmount)}
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

export function buildForm06Data(
  rows: Record<string, unknown>[],
  periodFrom: string,
  periodTo: string,
): StateHoldingForm5Top5Data {
  return buildStateHoldingForm5Top5Data(rows, periodFrom, periodTo);
}

export default Form06Report;
