/**
 * Шаблон отчёта «Сводная ведомость по аукциону ГЦБ».
 * Особенности:
 * - Отображается по одной дате (не диапазон)
 * - Разделение на конкурентные и неконкурентные заявки
 */
import React from 'react';
import { cn } from '../../lib/utils.ts';
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
  return (
    <div className="w-full bg-white pb-6 text-xs print:max-w-none print:px-0">
      <ReportHeader
        formNumber=""
        title="Сводная ведомость по аукциону ГЦБ"
        periodFrom={periodFrom}
        periodTo={periodTo}
      />

      {/* Информация об аукционе */}
      <div className="overflow-x-auto mb-4">
        <table className="w-full border-collapse text-sm">
          <tbody>
            <tr>
              <td className="border border-border px-3 py-2 bg-muted/30 font-medium w-1/2">
                Общая информация по аукциону
              </td>
              <td className="border border-border px-3 py-2">{formatDate(data.auctionDate)}</td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2 bg-muted/30 font-medium">Дата аукциона</td>
              <td className="border border-border px-3 py-2">{formatDate(data.auctionDate)}</td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2 bg-muted/30 font-medium">Вид ГЦБ</td>
              <td className="border border-border px-3 py-2">{data.className ?? data.classCode}</td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2 bg-muted/30 font-medium">Срок обращения ГЦБ</td>
              <td className="border border-border px-3 py-2"></td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2 bg-muted/30 font-medium">Регистрационный номер</td>
              <td className="border border-border px-3 py-2">{data.registrationNumber}</td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2 bg-muted/30 font-medium">Количество ГЦБ (в штуках)</td>
              <td className="border border-border px-3 py-2">{data.summary.totalQty > 0 ? formatInt(data.summary.totalQty) : 'null'}</td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2 bg-muted/30 font-medium">Объем предложения</td>
              <td className="border border-border px-3 py-2">{data.summary.totalNominal > 0 ? formatNumber(data.summary.totalNominal) : 'null'}</td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2 bg-muted/30 font-medium">Купонная ставка (%)</td>
              <td className="border border-border px-3 py-2">{data.couponRate > 0 ? formatNumber(data.couponRate) : ''}</td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2 bg-muted/30 font-medium">Количество участников</td>
              <td className="border border-border px-3 py-2"></td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2 bg-muted/30 font-medium">Финансовые институты</td>
              <td className="border border-border px-3 py-2"></td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2 bg-muted/30 font-medium">Институциональные инвесторы, в том числе страховые компании</td>
              <td className="border border-border px-3 py-2"></td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2 bg-muted/30 font-medium">Инвесторы резидент/Нерезидент</td>
              <td className="border border-border px-3 py-2"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Объем поступивших заявок на аукцион ГЦБ — 5 колонок по форме */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th className="border border-border px-3 py-2 text-center font-medium">
                Объем поступивших заявок на аукцион ГЦБ
              </th>
              <th className="border border-border px-3 py-2 text-center font-medium">
                Кол-во ГЦБ (в штуках)
              </th>
              <th className="border border-border px-3 py-2 text-center font-medium">
                По номиналу (в сомах)
              </th>
              <th className="border border-border px-3 py-2 text-center font-medium">
                По факту (в сомах)
              </th>
              <th className="border border-border px-3 py-2 text-center font-medium">
                % от общего объема поступивших
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="bg-background">
              <td className="border border-border px-3 py-2 font-medium">На конкурентной основе</td>
              <td className="border border-border px-3 py-2 text-right tabular-nums">
                {formatInt(data.summary.competitiveQty)}
              </td>
              <td className="border border-border px-3 py-2 text-right tabular-nums">
                {formatNumber(data.summary.competitiveNominal)}
              </td>
              <td className="border border-border px-3 py-2 text-right tabular-nums">
                {formatNumber(data.summary.competitiveValueActual)}
              </td>
              <td className="border border-border px-3 py-2 text-right tabular-nums">
                {formatNumber(data.summary.competitivePercent)}
              </td>
            </tr>
            <tr className="bg-background">
              <td className="border border-border px-3 py-2 font-medium">На неконкурентной</td>
              <td className="border border-border px-3 py-2 text-right tabular-nums">
                {formatInt(data.summary.nonCompetitiveQty)}
              </td>
              <td className="border border-border px-3 py-2 text-right tabular-nums">
                {formatNumber(data.summary.nonCompetitiveNominal)}
              </td>
              <td className="border border-border px-3 py-2 text-right tabular-nums">
                {formatNumber(data.summary.nonCompetitiveValueActual)}
              </td>
              <td className="border border-border px-3 py-2 text-right tabular-nums">
                {formatNumber(data.summary.nonCompetitivePercent)}
              </td>
            </tr>
            <tr className="bg-primary/10 font-bold">
              <td className="border border-border px-3 py-2">Всего</td>
              <td className="border border-border px-3 py-2 text-right tabular-nums">
                {formatInt(data.summary.totalQty)}
              </td>
              <td className="border border-border px-3 py-2 text-right tabular-nums">
                {formatNumber(data.summary.totalNominal)}
              </td>
              <td className="border border-border px-3 py-2 text-right tabular-nums">
                {formatNumber(data.summary.totalValueActual)}
              </td>
              <td className="border border-border px-3 py-2 text-right tabular-nums">100.00</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Заявки по ценам */}
      <div className="mt-6">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
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
                  <td className="border border-border px-3 py-2 text-right tabular-nums">
                    {formatNumber(group.price)}
                  </td>
                  <td className="border border-border px-3 py-2 text-right tabular-nums">
                    {formatInt(group.totalQty)}
                  </td>
                  <td className="border border-border px-3 py-2 text-right tabular-nums">
                    {formatNumber(group.nominalSum)}
                  </td>
                  <td className="border border-border px-3 py-2 text-right tabular-nums">
                    {formatNumber(group.valueActual)}
                  </td>
                  <td className="border border-border px-3 py-2 text-right tabular-nums">
                    {formatNumber(group.yieldPercent)}
                  </td>
                  <td className="border border-border px-3 py-2 text-right tabular-nums">
                    {formatNumber(group.yieldByPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Подписи */}
      <div className="mt-8 flex justify-between text-sm hidden print:flex">
        <div>
          <p>Уполномоченное лицо ЗАО "Кыргызская Фондовая Биржа"</p>
          <p className="mt-8">___________________________ м.п</p>
        </div>
        <div>
          <p>Уполномоченное лицо ЗАО "Центральный"</p>
          <p className="mt-8">___________________________ м.п</p>
        </div>
      </div>
    </div>
  );
}

export default AuctionSummaryReport;
