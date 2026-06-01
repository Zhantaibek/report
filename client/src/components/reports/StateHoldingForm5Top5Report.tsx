/**
 * Форма 5 (госхолдинг) — топ-5 участников по сумме сделок в сомах.
 * Иерархия: участник → строки по датам → Итого.
 */
import React from 'react';
import { ReportHeader } from './ReportHeader';

export interface StateHoldingForm5Top5DayRow {
  tradeDate: string;
  dealCount: number;
  secQty: number;
  amountPlacement: number;
  amountCirculation: number;
  amountTotal: number;
}

export interface StateHoldingForm5Top5Participant {
  seqNo: number;
  participantName: string;
  days: StateHoldingForm5Top5DayRow[];
  totalDealCount: number;
  totalSecQty: number;
  totalPlacement: number;
  totalCirculation: number;
  totalAmount: number;
}

export interface StateHoldingForm5Top5Data {
  periodFrom: string;
  periodTo: string;
  participants: StateHoldingForm5Top5Participant[];
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
  'Сведения о 5 участниках торгов, имеющих наибольшую сумму совершенных сделок с ценными бумагами, допущенными к обращению через организатора торговли (по каждому рабочему дню недели) за период';

interface Props {
  data: StateHoldingForm5Top5Data;
}

export function StateHoldingForm5Top5Report({ data }: Props) {
  return (
    <div className="w-full bg-white pb-6 text-xs print:max-w-none print:px-0 print:pb-0">
      <ReportHeader formNumber="Форма-5" title={TITLE} periodFrom={data.periodFrom} periodTo={data.periodTo} />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th className="border border-border px-2 py-2 text-center font-medium w-10" rowSpan={2}>
                №
              </th>
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
              <th className="border border-border px-2 py-2 text-right font-medium">Обращение</th>
              <th className="border border-border px-2 py-2 text-right font-medium">Всего</th>
            </tr>
          </thead>
          <tbody>
            {data.participants.map((p) => (
              <React.Fragment key={p.seqNo}>
                <tr className="bg-emerald-50/80">
                  <td className="border border-border px-2 py-1 text-center align-middle">{p.seqNo}</td>
                  <td className="border border-border px-2 py-1 font-medium" colSpan={6}>
                    Участник торгов: {p.participantName}
                  </td>
                </tr>
                {p.days.map((day) => (
                  <tr key={`${p.seqNo}-${day.tradeDate}`}>
                    <td className="border border-border px-2 py-1" />
                    <td className="border border-border px-2 py-1">{formatDate(day.tradeDate)}</td>
                    <td className="border border-border px-2 py-1 text-right">{formatInt(day.dealCount)}</td>
                    <td className="border border-border px-2 py-1 text-right">{formatInt(day.secQty)}</td>
                    <td className="border border-border px-2 py-1 text-right">{formatNum(day.amountPlacement)}</td>
                    <td className="border border-border px-2 py-1 text-right">{formatNum(day.amountCirculation)}</td>
                    <td className="border border-border px-2 py-1 text-right">{formatNum(day.amountTotal)}</td>
                  </tr>
                ))}
                <tr className="font-semibold">
                  <td className="border border-border px-2 py-1" />
                  <td className="border border-border px-2 py-1">Итого</td>
                  <td className="border border-border px-2 py-1 text-right">{formatInt(p.totalDealCount)}</td>
                  <td className="border border-border px-2 py-1 text-right">{formatInt(p.totalSecQty)}</td>
                  <td className="border border-border px-2 py-1 text-right">{formatNum(p.totalPlacement)}</td>
                  <td className="border border-border px-2 py-1 text-right">{formatNum(p.totalCirculation)}</td>
                  <td className="border border-border px-2 py-1 text-right">{formatNum(p.totalAmount)}</td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function participantKeyFromRow(r: Record<string, unknown>): string {
  const key = String(r.participantKey ?? '').trim();
  if (key) return key;
  const name = String(r.participantName ?? '').trim();
  return name ? `n:${name.toUpperCase()}` : '';
}

function mergeDayRow(
  target: StateHoldingForm5Top5DayRow,
  src: StateHoldingForm5Top5DayRow,
): void {
  target.dealCount += src.dealCount;
  target.secQty += src.secQty;
  target.amountPlacement += src.amountPlacement;
  target.amountCirculation += src.amountCirculation;
  target.amountTotal += src.amountTotal;
}

export function buildStateHoldingForm5Top5Data(
  rows: Record<string, unknown>[],
  periodFrom: string,
  periodTo: string,
): StateHoldingForm5Top5Data {
  const byParticipant = new Map<
    string,
    { name: string; daysByDate: Map<string, StateHoldingForm5Top5DayRow> }
  >();

  for (const r of rows) {
    const key = participantKeyFromRow(r);
    if (!key) continue;

    const participantName = String(r.participantName ?? '').trim();
    const tradeDate = String(r.tradeDate ?? '').slice(0, 10);
    if (!tradeDate) continue;

    const day: StateHoldingForm5Top5DayRow = {
      tradeDate,
      dealCount: Number(r.dealCount ?? 0),
      secQty: Number(r.secQty ?? 0),
      amountPlacement: Number(r.amountPlacement ?? 0),
      amountCirculation: Number(r.amountCirculation ?? 0),
      amountTotal: Number(r.amountTotal ?? 0),
    };

    if (!byParticipant.has(key)) {
      byParticipant.set(key, { name: participantName, daysByDate: new Map() });
    }
    const entry = byParticipant.get(key)!;
    if (participantName) entry.name = participantName;

    const existing = entry.daysByDate.get(tradeDate);
    if (existing) mergeDayRow(existing, day);
    else entry.daysByDate.set(tradeDate, day);
  }

  const participants: StateHoldingForm5Top5Participant[] = [...byParticipant.values()]
    .map(({ name, daysByDate }) => {
      const days = [...daysByDate.values()].sort((a, b) => a.tradeDate.localeCompare(b.tradeDate));
      let totalDealCount = 0;
      let totalSecQty = 0;
      let totalPlacement = 0;
      let totalCirculation = 0;
      let totalAmount = 0;
      for (const d of days) {
        totalDealCount += d.dealCount;
        totalSecQty += d.secQty;
        totalPlacement += d.amountPlacement;
        totalCirculation += d.amountCirculation;
        totalAmount += d.amountTotal;
      }
      return {
        seqNo: 0,
        participantName: name,
        days,
        totalDealCount,
        totalSecQty,
        totalPlacement,
        totalCirculation,
        totalAmount,
      };
    })
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, 5)
    .map((p, i) => ({ ...p, seqNo: i + 1 }));

  return { periodFrom, periodTo, participants };
}
