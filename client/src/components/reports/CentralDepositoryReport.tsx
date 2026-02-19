/**
 * Четвёртый отчёт по аукциону — Ведомость для Центрального депозитария.
 * Общая информация по аукциону + таблица по дилерам: фактическое количество ГЦБ, фактическая стоимость, цена заявки, доходность.
 */
import React from 'react';
import { ReportHeader } from './ReportHeader';

export interface CentralDepositoryRow {
  dealer_name: string;
  actual_qty: number;
  actual_value: number;
  bid_price: number;
  yield_pct: number;
}

export interface CentralDepositoryData {
  registration_number: string;
  auction_date: string;
  issue_volume: number;
  non_competitive_amount: number;
  rows: CentralDepositoryRow[];
}

function formatNum(n: number | string | null | undefined, decimals = 2): string {
  const val = typeof n === 'string' ? Number(n) : n;
  if (val == null || Number.isNaN(val)) return '—';
  return Number(val).toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatInt(n: number | string | null | undefined): string {
  const val = typeof n === 'string' ? Number(n) : n;
  if (val == null || Number.isNaN(val)) return '—';
  return Number(val).toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(d: string | Date | null | undefined): string {
  if (d == null) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function CentralDepositoryReport({ data, reportDate }: { data: CentralDepositoryData; reportDate: string }) {
  const d = reportDate || data.auction_date || '';
  const totalQty = data.rows.reduce((s, r) => s + Number(r.actual_qty ?? 0), 0);
  const totalValue = data.rows.reduce((s, r) => s + Number(r.actual_value ?? 0), 0);

  return (
    <div className="w-full bg-white pb-6 text-sm print:max-w-none print:px-0">
      <ReportHeader formNumber="" title="Ведомость для Центрального депозитария" periodFrom={d} periodTo={d} />

      {/* Общая информация по аукциону */}
      <div className="mb-6 overflow-x-auto">
        <table className="w-full table-fixed border-collapse border border-border text-sm">
          <colgroup>
            <col style={{ width: '70%' }} />
            <col style={{ width: '30%' }} />
          </colgroup>
          <thead>
            <tr className="bg-muted/60">
              <th className="border border-border px-3 py-2 text-left font-medium">Общая информация по аукциону</th>
              <th className="border border-border px-3 py-2 text-right font-medium">Значение</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-border px-3 py-2">Регистрационный номер</td>
              <td className="border border-border px-3 py-2 text-right tabular-nums">{data.registration_number || '—'}</td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2">Дата аукциона</td>
              <td className="border border-border px-3 py-2 text-right tabular-nums">{formatDate(data.auction_date)}</td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2">Объем выпуска (сом)</td>
              <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.issue_volume)}</td>
            </tr>
            <tr>
              <td className="border border-border px-3 py-2">в т.ч Неконкурентные на сумму (сом)</td>
              <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.non_competitive_amount)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Таблица: наименование дилера, фактическое количество гцб, фактическая стоимость, цена заявки, доходность — последние две колонки = 30% */}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse border border-border text-sm">
          <colgroup>
            <col style={{ width: '30%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '15%' }} />
          </colgroup>
          <thead>
            <tr className="bg-muted/60">
              <th className="border border-border px-3 py-2 text-left font-medium">Наименование дилера</th>
              <th className="border border-border px-3 py-2 text-right font-medium">Фактическое количество гцб</th>
              <th className="border border-border px-3 py-2 text-right font-medium">Фактическая стоимость (сом)</th>
              <th className="border border-border px-3 py-2 text-right font-medium">Цена заявки (сом)</th>
              <th className="border border-border px-3 py-2 text-right font-medium">Доходность по цене (в %)</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, idx) => (
              <tr key={idx}>
                <td className="border border-border px-3 py-2">{row.dealer_name || '—'}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatInt(row.actual_qty)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(row.actual_value)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(row.bid_price)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(row.yield_pct)}</td>
              </tr>
            ))}
            <tr className="bg-muted/30 font-medium">
              <td className="border border-border px-3 py-2">Итого:</td>
              <td className="border border-border px-3 py-2 text-right tabular-nums">{formatInt(totalQty)}</td>
              <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(totalValue)}</td>
              <td className="border border-border px-3 py-2"></td>
              <td className="border border-border px-3 py-2"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CentralDepositoryReport;
