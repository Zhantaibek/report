/**
 * Шаблон отчёта «Сводная ведомость» (вторая) — итоги размещения и сравнение текущего с предыдущим аукционом.
 */
import React from 'react';
import { ReportHeader } from './ReportHeader';

export interface AuctionSummary2Row {
  cur_sec_code: string;
  prev_sec_code: string;
  current_date: string;
  previous_date: string | null;
  current_offer_volume: number;
  previous_offer_volume: number | null;
  diff_offer_volume: number | null;
  current_demand_volume: number;
  previous_demand_volume: number | null;
  diff_demand_volume: number | null;
  current_placement_volume: number;
  previous_placement_volume: number | null;
  diff_placement_volume: number | null;
  current_avg_price: number;
  previous_avg_price: number | null;
  diff_avg_price: number | null;
  current_avg_yield: number;
  previous_avg_yield: number | null;
  diff_avg_yield: number | null;
  current_max_price: number;
  previous_max_price: number | null;
  diff_max_price: number | null;
  current_yield_by_max_price: number | null;
  previous_yield_by_max_price: number | null;
  diff_yield_by_max_price: number | null;
  current_cutoff_price: number;
  previous_cutoff_price: number | null;
  diff_cutoff_price: number | null;
  current_yield_by_cutoff_price: number | null;
  previous_yield_by_cutoff_price: number | null;
  diff_yield_by_cutoff_price: number | null;
  qty_competitive_current: number;
  value_nominal_competitive_current: number;
  value_actual_competitive_current: number;
  avg_price_competitive_current: number | null;
  avg_yield_competitive_current: number | null;
  qty_non_competitive_current: number;
  value_nominal_non_competitive_current: number;
  value_actual_non_competitive_current: number;
  qty_total_current: number;
  value_nominal_total_current: number;
  value_actual_total_current: number;
}

function formatNum(n: number | string | null | undefined, decimals = 2): string {
  const val = typeof n === 'string' ? Number(n) : n;
  if (val == null || Number.isNaN(val)) return '—';
  return Number(val).toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function formatDate(d: string | Date | null | undefined): string {
  if (d == null) return '—';
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function AuctionSummary2Report({ data, reportDate }: { data: AuctionSummary2Row; reportDate: string }) {
  const d = reportDate || data.current_date || '';
  return (
    <div className="w-full bg-white pb-6 text-sm print:max-w-none print:px-0">
      <ReportHeader formNumber="" title="Сводная ведомость" periodFrom={d} periodTo={d} />

      {/* Итоги размещения (текущий аукцион) */}
      <div className="mt-4">
        <p className="mb-2 font-medium">Итоги размещения:</p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-border text-sm mb-6">
            <thead>
              <tr className="bg-muted/60">
                <th className="border border-border px-3 py-2 text-left font-medium w-1/4">размещено:</th>
                <th className="border border-border px-3 py-2 text-center font-medium">
                  Кол-во ГЦБ (в штуках)
                </th>
                <th className="border border-border px-3 py-2 text-center font-medium">
                  Сумма удовлетворенных заявок (по номиналу, в сомах)
                </th>
                <th className="border border-border px-3 py-2 text-center font-medium">
                  Сумма удовлетворенных заявок (по факту, в сомах)
                </th>
                <th className="border border-border px-3 py-2 text-center font-medium">Средневзвешенная цена (сом)</th>
                <th className="border border-border px-3 py-2 text-center font-medium">Доходность (в %)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border px-3 py-2 font-medium">На конкурентной основе</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">
                  {formatNum(data.qty_competitive_current, 0)}
                </td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">
                  {formatNum(data.value_nominal_competitive_current)}
                </td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">
                  {formatNum(data.value_actual_competitive_current)}
                </td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">
                  {formatNum(data.avg_price_competitive_current)}
                </td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">
                  {formatNum(data.avg_yield_competitive_current)}
                </td>
              </tr>
              <tr>
                <td className="border border-border px-3 py-2 font-medium">На неконкурентной основе</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">
                  {formatNum(data.qty_non_competitive_current, 0)}
                </td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">
                  {formatNum(data.value_nominal_non_competitive_current)}
                </td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">
                  {formatNum(data.value_actual_non_competitive_current)}
                </td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">—</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">—</td>
              </tr>
              <tr>
                <td className="border border-border px-3 py-2 font-medium">Всего:</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">
                  {formatNum(data.qty_total_current, 0)}
                </td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">
                  {formatNum(data.value_nominal_total_current)}
                </td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">
                  {formatNum(data.value_actual_total_current)}
                </td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">
                  {formatNum(data.avg_price_competitive_current)}
                </td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">
                  {formatNum(data.avg_yield_competitive_current)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Сравнение текущего и предыдущего аукциона */}
      <div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-border text-sm">
            <thead>
              <tr className="bg-muted/60">
                <th className="border border-border px-3 py-2 text-left font-medium w-1/3"></th>
                <th className="border border-border px-3 py-2 text-center font-medium">
                  Текущий аукцион {data.cur_sec_code} {formatDate(data.current_date)}
                </th>
                <th className="border border-border px-3 py-2 text-center font-medium">
                  Предыдущий аукцион {data.prev_sec_code || data.cur_sec_code} {formatDate(data.previous_date)}
                </th>
                <th className="border border-border px-3 py-2 text-center font-medium">Абсолютная разница</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-border px-3 py-2 font-medium">Объем предложения (в тыс. сомах)</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.current_offer_volume)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.previous_offer_volume)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.diff_offer_volume)}</td>
              </tr>
              <tr>
                <td className="border border-border px-3 py-2 font-medium">Объем спроса (по номиналу, в тыс. сомах)</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.current_demand_volume)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.previous_demand_volume)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.diff_demand_volume)}</td>
              </tr>
              <tr>
                <td className="border border-border px-3 py-2 font-medium">Объем размещения (по номиналу, в тыс. сомах)</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.current_placement_volume)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.previous_placement_volume)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.diff_placement_volume)}</td>
              </tr>
              <tr>
                <td className="border border-border px-3 py-2 font-medium">Средневзвешенная цена (в сомах)</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.current_avg_price)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.previous_avg_price)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.diff_avg_price)}</td>
              </tr>
              <tr>
                <td className="border border-border px-3 py-2 font-medium">Средневзвешенная доходность (в %)</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.current_avg_yield)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.previous_avg_yield)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.diff_avg_yield)}</td>
              </tr>
              <tr>
                <td className="border border-border px-3 py-2 font-medium">Максимальная цена (в сомах)</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.current_max_price)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.previous_max_price)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.diff_max_price)}</td>
              </tr>
              <tr>
                <td className="border border-border px-3 py-2 font-medium">Доходность по максимальной цене (в %)</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.current_yield_by_max_price)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.previous_yield_by_max_price)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.diff_yield_by_max_price)}</td>
              </tr>
              <tr>
                <td className="border border-border px-3 py-2 font-medium">Цена отсечения (в сомах)</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.current_cutoff_price)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.previous_cutoff_price)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.diff_cutoff_price)}</td>
              </tr>
              <tr>
                <td className="border border-border px-3 py-2 font-medium">Доходность по цене отсечения (в %)</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.current_yield_by_cutoff_price)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.previous_yield_by_cutoff_price)}</td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNum(data.diff_yield_by_cutoff_price)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Подписи при печати */}
      <div className="mt-8 flex justify-between text-sm hidden print:flex">
        <div>
          <p>Уполномоченное лицо ЗАО &quot;Кыргызская Фондовая Биржа&quot;</p>
          <p className="mt-8">___________________________ м.п</p>
        </div>
        <div>
          <p>Уполномоченное лицо ЗАО &quot;Центральный&quot;</p>
          <p className="mt-8">___________________________ м.п</p>
        </div>
      </div>
    </div>
  );
}

export default AuctionSummary2Report;
