/**
 * Шаблон отчёта «Сводная ведомость по аукциону ГЦБ».
 * Особенности:
 * - Отображается по одной дате (не диапазон)
 * - Разделение на конкурентные и неконкурентные заявки
 */
import React from 'react';
import { parseGcbCirculationTerm } from '../../lib/gcb-circulation-term';
import { ReportHeader } from './ReportHeader';

export interface AuctionBid {
  tradeNum: string;
  secCode: string;
  tradeDate: string;
  classCode: string;
  yield: number;
  price: number;
  qty: number;
  faceValue: number;
  nominal: number;
  totalPrice: number;
  bidType: 'Конкурентная' | 'Неконкурентная';
  participantName: string;
  orderNum: string;
  secFullName: string;
}

export interface AuctionSummaryData {
  auctionDate: string;
  secCode: string;
  classCode: string;
  className?: string;
  secFullName: string;
  registrationNumber: string;
  couponRate: number;
  participantCount: number;
  bids: AuctionBid[];
  summary: {
    competitiveQty: number;
    competitiveNominal: number;
    competitiveValueActual: number;
    competitivePercent: number;
    nonCompetitiveQty: number;
    nonCompetitiveNominal: number;
    nonCompetitiveValueActual: number;
    nonCompetitivePercent: number;
    totalQty: number;
    totalNominal: number;
    totalValueActual: number;
  };
  priceGroups: {
    price: number;
    nominalSum: number;
    totalQty: number;
    valueActual: number;
    yieldPercent: number;
    yieldByPrice: number;
  }[];
}

function formatNumber(n: number): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatInt(n: number): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(date: string): string {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function AuctionSummaryReport({ data }: { data: AuctionSummaryData }) {
  const periodFrom = data.auctionDate || '';
  const periodTo = data.auctionDate || '';
  const circulationTerm = parseGcbCirculationTerm(data.secCode);
  return (
    <div className="w-full bg-white pb-6 text-xs print:max-w-none print:px-0 print:pb-0">
      <ReportHeader
        formNumber=""
        title="Сводная ведомость по аукциону ГЦБ"
        periodFrom={periodFrom}
        periodTo={periodTo}
      />

      {/* Общая сетка 6 кол.: разделитель инфо = правый край «По номиналу» */}
      <div className="overflow-x-auto mb-4">
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-1/6" /><col className="w-1/6" /><col className="w-1/6" />
            <col className="w-1/6" /><col className="w-1/6" /><col className="w-1/6" />
          </colgroup>
          <tbody>
            {(
              [
                ['Общая информация по аукциону', formatDate(data.auctionDate)],
                ['Дата аукциона', formatDate(data.auctionDate)],
                ['Вид ГЦБ', data.className ?? data.classCode],
                ['Срок обращения ГЦБ', circulationTerm],
                ['Регистрационный номер', data.registrationNumber],
                ['Количество ГЦБ (в штуках)', data.summary.totalQty > 0 ? formatInt(data.summary.totalQty) : 'null'],
                ['Объем предложения', data.summary.totalNominal > 0 ? formatNumber(data.summary.totalNominal) : 'null'],
                ['Купонная ставка (%)', data.couponRate > 0 ? formatNumber(data.couponRate) : ''],
                ['Количество участников', data.participantCount > 0 ? formatInt(data.participantCount) : ''],
                ['Финансовые институты', ''],
                ['Институциональные инвесторы, в том числе страховые компании', ''],
                ['Инвесторы резидент/Нерезидент', ''],
              ] as const
            ).map(([label, value]) => (
              <tr key={label}>
                <td colSpan={3} className="border border-border px-3 py-2 bg-muted/30">{label}</td>
                <td colSpan={3} className="border border-border px-3 py-2">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-1/6" /><col className="w-1/6" /><col className="w-1/6" />
            <col className="w-1/6" /><col className="w-1/6" /><col className="w-1/6" />
          </colgroup>
          <thead>
            <tr className="bg-muted/60">
              <th className="border border-border px-3 py-2 text-center font-medium">Объем поступивших заявок на аукцион ГЦБ</th>
              <th className="border border-border px-3 py-2 text-center font-medium">Кол-во ГЦБ (в штуках)</th>
              <th className="border border-border px-3 py-2 text-center font-medium">По номиналу (в сомах)</th>
              <th className="border border-border px-3 py-2 text-center font-medium">По факту (в сомах)</th>
              <th colSpan={2} className="border border-border px-3 py-2 text-center font-medium">% от общего объема поступивших</th>
            </tr>
          </thead>
          <tbody>
            {(
              [
                ['На конкурентной основе', data.summary.competitiveQty, data.summary.competitiveNominal, data.summary.competitiveValueActual, data.summary.competitivePercent],
                ['На неконкурентной', data.summary.nonCompetitiveQty, data.summary.nonCompetitiveNominal, data.summary.nonCompetitiveValueActual, data.summary.nonCompetitivePercent],
                ['Всего', data.summary.totalQty, data.summary.totalNominal, data.summary.totalValueActual, 100],
              ] as const
            ).map(([label, qty, nominal, actual, pct], idx) => (
              <tr key={label} className={idx === 2 ? 'bg-primary/10' : 'bg-background'}>
                <td className="border border-border px-3 py-2">{label}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatInt(qty)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNumber(nominal)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNumber(actual)}</td>
                <td colSpan={2} className="border border-border px-3 py-2 text-right tabular-nums">{formatNumber(pct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-1/6" /><col className="w-1/6" /><col className="w-1/6" />
            <col className="w-1/6" /><col className="w-1/6" /><col className="w-1/6" />
          </colgroup>
          <thead>
            <tr className="bg-muted/60">
              <th className="border border-border px-3 py-2 text-center font-medium">Цена (сом)</th>
              <th className="border border-border px-3 py-2 text-center font-medium">Кол-во ГЦБ (в штуках)</th>
              <th className="border border-border px-3 py-2 text-center font-medium">По номиналу (в сомах)</th>
              <th className="border border-border px-3 py-2 text-center font-medium">По факту (в сомах)</th>
              <th className="border border-border px-3 py-2 text-center font-medium">Доходность (%)</th>
              <th className="border border-border px-3 py-2 text-center font-medium">Доходность по цене (%)</th>
            </tr>
          </thead>
          <tbody>
            {data.priceGroups.map((group, idx) => (
              <tr key={idx} className="bg-background">
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNumber(group.price)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatInt(group.totalQty)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNumber(group.nominalSum)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNumber(group.valueActual)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNumber(group.yieldPercent)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNumber(group.yieldByPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Подписи */}
      <div className="mt-8 text-sm hidden print:block">
        <p>Уполномоченное лицо ЗАО "Кыргызская Фондовая Биржа"</p>
        <p className="mt-8">___________________________ м.п</p>
      </div>
    </div>
  );
}

export default AuctionSummaryReport;
