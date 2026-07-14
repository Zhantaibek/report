/**
 * Форма 13 — Отчет по комиссионным сборам (сводка за период).
 * Рыночные = secondary, Регистрационные = primary.
 */
import React from 'react';
import { ReportHeader } from './ReportHeader';

function formatNum(n: number | null | undefined, decimals = 2): string {
  if (n == null || Number.isNaN(n)) return '';
  return n.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatInt(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '0';
  return Math.round(n).toLocaleString('ru-RU');
}

export interface Form13Summary {
  volume: number;
  commission: number;
  actualRatePercent: number;
  participantCount: number;
  dealCount: number;
  avgCommission: number;
  marketDealCount: number;
  marketCommission: number;
  registrationDealCount: number;
  registrationCommission: number;
}

export interface ReportForm13Data {
  periodFrom: string;
  periodTo: string;
  summary: Form13Summary;
}

interface Props {
  data: ReportForm13Data;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr className="hover:bg-muted/20">
      <td className="border border-border px-3 py-2">{label}</td>
      <td className="border border-border px-3 py-2 text-right tabular-nums whitespace-nowrap">{value}</td>
    </tr>
  );
}

function SectionRow({ label }: { label: string }) {
  return (
    <tr className="bg-muted/60">
      <td colSpan={2} className="border border-border px-3 py-2 font-semibold">
        {label}
      </td>
    </tr>
  );
}

export function Form13Report({ data }: Props) {
  const s = data.summary;

  return (
    <div className="w-full bg-white pb-6 text-sm print:max-w-none print:px-0 print:pb-0">
      <ReportHeader
        formNumber="Ф-13"
        title="Отчет по комиссионным сборам"
        periodFrom={data.periodFrom}
        periodTo={data.periodTo}
      />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border">
          <thead>
            <tr className="bg-muted/60">
              <th className="border border-border px-3 py-2 text-left font-medium w-[70%]">Показатель</th>
              <th className="border border-border px-3 py-2 text-right font-medium w-[30%]">Значение</th>
            </tr>
          </thead>
          <tbody>
            <Row label="Объем сделок" value={formatNum(s.volume)} />
            <Row label="Сумма комиссионных" value={formatNum(s.commission)} />
            <Row label="Фактический % комиссионного сбора" value={formatNum(s.actualRatePercent, 4)} />
            <Row label="Число участников торгов" value={formatInt(s.participantCount)} />
            <Row label="Число сделок" value={formatInt(s.dealCount)} />
            <Row label="Средняя сумма комиссионных с одной сделки" value={formatNum(s.avgCommission)} />

            <SectionRow label="Рыночные сделки" />
            <Row label="Число сделок" value={formatInt(s.marketDealCount)} />
            <Row label="Сумма комиссионных" value={formatNum(s.marketCommission)} />

            <SectionRow label="Регистрационные сделки" />
            <Row label="Число сделок" value={formatInt(s.registrationDealCount)} />
            <Row label="Сумма комиссионных" value={formatNum(s.registrationCommission)} />
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Form13Report;
