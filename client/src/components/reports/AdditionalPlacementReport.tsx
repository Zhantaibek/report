/**
 * Отчёт «Информация по допразмещению ГЦБ».
 */
import React from 'react';
import { ReportHeader } from './ReportHeader';

export interface AdditionalPlacementData {
  sec_code: string;
  trade_date: string;
  class_code: string;
  sec_full_name: string;
  face_value: number;
  issue_qty: number;
  coupon_rate: number;
  avg_price: number;
  avg_yield: number;
  total_qty: number;
  total_value: number;
  participant_count: number;
  financial_participants: number;
  institutional_investors: number;
  resident_count: number;
  non_resident_count: number;
}

function fmt(n: number | string | null | undefined, decimals = 2): string {
  const val = typeof n === 'string' ? Number(n) : n;
  if (val == null || Number.isNaN(val)) return '—';
  return Number(val).toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function AdditionalPlacementReport({
  data,
  reportDate,
}: {
  data: AdditionalPlacementData;
  reportDate: string;
}) {
  const dateStr = reportDate || data.trade_date || '';
  const emissionVolume = data.issue_qty > 0 ? data.issue_qty * data.face_value : null;
  const institutional = data.institutional_investors > 0
    ? data.institutional_investors
    : Math.max(0, data.participant_count - data.financial_participants);

  return (
    <div className="w-full bg-white pb-6 text-sm print:max-w-none print:px-0">
      <ReportHeader
        formNumber=""
        title="Информация по допразмещению ГЦБ"
        periodFrom={dateStr}
        periodTo={dateStr}
      />

      {/* Общая информация */}
      <div className="mb-6 overflow-x-auto">
        <table className="w-full table-fixed border-collapse border border-border">
          <colgroup>
            <col style={{ width: '60%' }} />
            <col style={{ width: '40%' }} />
          </colgroup>
          <tbody>
            <tr>
              <td className="border border-border px-3 py-2">Дата дополнительного размещение</td>
              <td className="border border-border px-3 py-2 tabular-nums">{fmtDate(data.trade_date)}</td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2">Вид ГЦБ</td>
              <td className="border border-border px-3 py-2">{data.class_code || '—'}</td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2">Срок обращение ГЦБ</td>
              <td className="border border-border px-3 py-2">{data.sec_full_name || '—'}</td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2">Регистрационный номер</td>
              <td className="border border-border px-3 py-2 tabular-nums">{data.sec_code || '—'}</td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2">Количество ГЦБ (в штуках)</td>
              <td className="border border-border px-3 py-2 tabular-nums">
                {data.issue_qty > 0 ? fmt(data.issue_qty, 0) : '—'}
              </td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2">Объем эмиссии</td>
              <td className="border border-border px-3 py-2 tabular-nums">
                {emissionVolume != null ? fmt(emissionVolume) : '—'}
              </td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2">Средневзвешенная цена(сом)</td>
              <td className="border border-border px-3 py-2 tabular-nums">{fmt(data.avg_price)}</td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2">Доходность (в %)</td>
              <td className="border border-border px-3 py-2 tabular-nums">{fmt(data.avg_yield)}</td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2">Купонная ставка (в %)</td>
              <td className="border border-border px-3 py-2 tabular-nums">
                {data.coupon_rate > 0 ? fmt(data.coupon_rate) : '—'}
              </td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2">Количество участников</td>
              <td className="border border-border px-3 py-2 tabular-nums">{data.participant_count}</td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2 pl-6">Из них:</td>
              <td className="border border-border px-3 py-2"></td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2 pl-6">Финансовые участники</td>
              <td className="border border-border px-3 py-2 tabular-nums">{data.financial_participants}</td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2 pl-6">Институциональные инвесторы</td>
              <td className="border border-border px-3 py-2 tabular-nums">{institutional}</td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2">Инвесторы резидент/Нерезидент</td>
              <td className="border border-border px-3 py-2 tabular-nums">
                {data.resident_count} / {data.non_resident_count}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Итоги */}
      <div className="overflow-x-auto">
        <p className="font-medium mb-1">Итоги дополнительного размещение</p>
        <table className="w-full table-fixed border-collapse border border-border">
          <colgroup>
            <col style={{ width: '33.33%' }} />
            <col style={{ width: '33.33%' }} />
            <col style={{ width: '33.34%' }} />
          </colgroup>
          <thead>
            <tr className="bg-muted/60">
              <th className="border border-border px-3 py-2 text-center font-medium">
                Общее кол-во заявленных ГЦБ (в штуках)
              </th>
              <th className="border border-border px-3 py-2 text-center font-medium">
                Количество удовлетворенных ГЦБ (в штуках)
              </th>
              <th className="border border-border px-3 py-2 text-center font-medium">
                Сумма удовлетворенных ГЦБ по факту (в сомах)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-border px-3 py-2 text-center tabular-nums">{fmt(data.total_qty)}</td>
              <td className="border border-border px-3 py-2 text-center tabular-nums">{fmt(data.total_qty)}</td>
              <td className="border border-border px-3 py-2 text-center tabular-nums">{fmt(data.total_value)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdditionalPlacementReport;
