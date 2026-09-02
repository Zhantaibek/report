/**
 * Форма 2 по сделкам USD из Oracle.
 * Структура как у Формы 2 (Класс → ЦБ → агрегация), строки по датам как в «Отчет USD».
 */
import React from 'react';
import { cn } from '../../lib/utils.ts';
import { ReportHeader } from './ReportHeader';

export interface Form2UsdDayRow {
  tradeDate: string;
  tradesCount: number;
  totalQuantity: number;
  totalAmount: number;
  maxPrice: number;
  minPrice: number;
  avgPrice: number;
  lastTradePrice: number;
  lastTradeQuantity: number;
  lastTradeAmount: number;
}

export interface Form2UsdSecurity {
  securityId: string;
  secFullName?: string;
  days: Form2UsdDayRow[];
  totals: {
    tradesCount: number;
    totalQuantity: number;
    totalAmount: number;
  };
}

export interface Form2UsdClassGroup {
  classId: string;
  className?: string;
  securities: Form2UsdSecurity[];
}

export interface Form2UsdReportData {
  periodFrom: string;
  periodTo: string;
  classes: Form2UsdClassGroup[];
  totalSummary?: {
    totalQuantity: number;
    totalAmount: number;
  };
}

function formatNumber(n: number): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatInt(n: number): string {
  return n.toLocaleString('ru-RU');
}

function formatDate(d: unknown): string {
  if (!d) return '';
  if (d instanceof Date) return d.toLocaleDateString('ru-RU');
  const dateStr = String(d);
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const [y, m, day] = dateStr.slice(0, 10).split('-');
    return `${day}/${m}/${y}`;
  }
  return dateStr;
}

function aggregateDay(trades: Record<string, unknown>[]): Form2UsdDayRow {
  const sorted = [...trades].sort((a, b) => Number(a.id ?? 0) - Number(b.id ?? 0));
  const totalQuantity = sorted.reduce((s, t) => s + Number(t.quantity ?? 0), 0);
  const totalAmount = sorted.reduce((s, t) => s + Number(t.value ?? 0), 0);
  const prices = sorted.map((t) => Number(t.price ?? 0)).filter((p) => p > 0);
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const last = sorted[sorted.length - 1];
  return {
    tradeDate: formatDate(sorted[0]?.tradeDate),
    tradesCount: sorted.length,
    totalQuantity,
    totalAmount,
    maxPrice,
    minPrice,
    avgPrice,
    lastTradePrice: Number(last?.price ?? 0),
    lastTradeQuantity: Number(last?.quantity ?? 0),
    lastTradeAmount: Number(last?.value ?? 0),
  };
}

export function buildForm2UsdData(
  rows: Record<string, unknown>[],
  periodFrom: string,
  periodTo: string,
): Form2UsdReportData {
  const classMap = new Map<string, Map<string, Map<string, Record<string, unknown>[]>>>();
  const classNames = new Map<string, string>();
  const secNames = new Map<string, string>();

  for (const row of rows) {
    const classId = String(row.classCode ?? 'USD');
    const secId = String(row.secCode ?? row.id ?? 'Без кода');
    const day = String(row.tradeDate ?? '').slice(0, 10);
    if (row.className != null) classNames.set(classId, String(row.className));
    if (row.secFullName != null) secNames.set(secId, String(row.secFullName));
    if (!classMap.has(classId)) classMap.set(classId, new Map());
    const secMap = classMap.get(classId)!;
    if (!secMap.has(secId)) secMap.set(secId, new Map());
    const dayMap = secMap.get(secId)!;
    if (!dayMap.has(day)) dayMap.set(day, []);
    dayMap.get(day)!.push(row);
  }

  const classes: Form2UsdClassGroup[] = [];
  let grandQty = 0;
  let grandAmt = 0;

  for (const [classId, secMap] of classMap) {
    const securities: Form2UsdSecurity[] = [];
    for (const [securityId, dayMap] of secMap) {
      const days = Array.from(dayMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, trades]) => aggregateDay(trades));
      const totals = days.reduce(
        (acc, d) => ({
          tradesCount: acc.tradesCount + d.tradesCount,
          totalQuantity: acc.totalQuantity + d.totalQuantity,
          totalAmount: acc.totalAmount + d.totalAmount,
        }),
        { tradesCount: 0, totalQuantity: 0, totalAmount: 0 },
      );
      grandQty += totals.totalQuantity;
      grandAmt += totals.totalAmount;
      securities.push({
        securityId,
        secFullName: secNames.get(securityId) ?? securityId,
        days,
        totals,
      });
    }
    classes.push({
      classId,
      className: classNames.get(classId) ?? classId,
      securities,
    });
  }

  return {
    periodFrom,
    periodTo,
    classes,
    totalSummary: { totalQuantity: grandQty, totalAmount: grandAmt },
  };
}

interface Props {
  data?: Form2UsdReportData | null;
  className?: string;
}

export default function Form2UsdReport({ data, className }: Props) {
  if (!data) return null;

  return (
    <div
      className={cn(
        'w-full bg-white pb-6 text-xs print:max-w-none print:px-0 print:pb-0',
        className
      )}
    >
      <ReportHeader
        formNumber="Ф-2"
        title="Отчет о заключенных сделках"
        periodFrom={data.periodFrom}
        periodTo={data.periodTo}
      />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th className="border border-border px-3 py-2 text-center font-medium">Дата</th>
              <th className="border border-border px-3 py-2 text-center font-medium">Кол-во сделок</th>
              <th className="border border-border px-3 py-2 text-right font-medium">Кол-во ЦБ</th>
              <th className="border border-border px-3 py-2 text-right font-medium">Макс цена</th>
              <th className="border border-border px-3 py-2 text-right font-medium">Мин цена</th>
              <th className="border border-border px-3 py-2 text-right font-medium">Средняя цена</th>
              <th className="border border-border px-3 py-2 text-right font-medium">Объем сделок</th>
              <th colSpan={3} className="border border-border px-3 py-2 text-center font-medium">
                Последняя сделка
              </th>
            </tr>
            <tr className="bg-muted/60">
              <th className="border border-border px-3 py-2"></th>
              <th className="border border-border px-3 py-2"></th>
              <th className="border border-border px-3 py-2"></th>
              <th className="border border-border px-3 py-2"></th>
              <th className="border border-border px-3 py-2"></th>
              <th className="border border-border px-3 py-2"></th>
              <th className="border border-border px-3 py-2"></th>
              <th className="border border-border px-3 py-2 text-center font-medium">Цена</th>
              <th className="border border-border px-3 py-2 text-center font-medium">Кол-во ЦБ</th>
              <th className="border border-border px-3 py-2 text-center font-medium">Объем</th>
            </tr>
          </thead>
          <tbody>
            {data.classes.map((cls) => (
              <React.Fragment key={cls.classId}>
                <tr className="bg-muted/50">
                  <td colSpan={10} className="border border-border px-3 py-1.5 font-medium">
                    Класс: {cls.className ?? cls.classId}
                  </td>
                </tr>
                {cls.securities.map((sec) => (
                  <React.Fragment key={sec.securityId}>
                    <tr className="bg-muted/40">
                      <td colSpan={10} className="border border-border px-3 py-1.5 font-medium">
                        Ценная бумага: {sec.secFullName ?? sec.securityId}
                      </td>
                    </tr>
                    {sec.days.map((day) => (
                      <tr key={`${sec.securityId}-${day.tradeDate}`} className="bg-background">
                        <td className="border border-border px-3 py-2">{day.tradeDate}</td>
                        <td className="border border-border px-3 py-2 text-center tabular-nums">
                          {day.tradesCount}
                        </td>
                        <td className="border border-border px-3 py-2 text-right tabular-nums">
                          {formatInt(day.totalQuantity)}
                        </td>
                        <td className="border border-border px-3 py-2 text-right tabular-nums">
                          {formatNumber(day.maxPrice)}
                        </td>
                        <td className="border border-border px-3 py-2 text-right tabular-nums">
                          {formatNumber(day.minPrice)}
                        </td>
                        <td className="border border-border px-3 py-2 text-right tabular-nums">
                          {formatNumber(day.avgPrice)}
                        </td>
                        <td className="border border-border px-3 py-2 text-right tabular-nums">
                          {formatNumber(day.totalAmount)}
                        </td>
                        <td className="border border-border px-3 py-2 text-right tabular-nums">
                          {formatNumber(day.lastTradePrice)}
                        </td>
                        <td className="border border-border px-3 py-2 text-right tabular-nums">
                          {formatInt(day.lastTradeQuantity)}
                        </td>
                        <td className="border border-border px-3 py-2 text-right tabular-nums">
                          {formatNumber(day.lastTradeAmount)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-muted/60 font-semibold">
                      <td className="border border-border px-3 py-2">Итого по ЦБ:</td>
                      <td className="border border-border px-3 py-2 text-center tabular-nums">
                        {sec.totals.tradesCount}
                      </td>
                      <td className="border border-border px-3 py-2 text-right tabular-nums">
                        {formatInt(sec.totals.totalQuantity)}
                      </td>
                      <td className="border border-border px-3 py-2" />
                      <td className="border border-border px-3 py-2" />
                      <td className="border border-border px-3 py-2" />
                      <td className="border border-border px-3 py-2 text-right tabular-nums">
                        {formatNumber(sec.totals.totalAmount)}
                      </td>
                      <td className="border border-border px-3 py-2" />
                      <td className="border border-border px-3 py-2" />
                      <td className="border border-border px-3 py-2" />
                    </tr>
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
            {data.totalSummary && (
              <tr className="bg-primary/10 font-bold">
                <td className="border border-border px-3 py-2">Всего:</td>
                <td className="border border-border px-3 py-2" />
                <td className="border border-border px-3 py-2 text-right tabular-nums">
                  {formatInt(data.totalSummary.totalQuantity)}
                </td>
                <td className="border border-border px-3 py-2" />
                <td className="border border-border px-3 py-2" />
                <td className="border border-border px-3 py-2" />
                <td className="border border-border px-3 py-2 text-right tabular-nums">
                  {formatNumber(data.totalSummary.totalAmount)}
                </td>
                <td className="border border-border px-3 py-2" />
                <td className="border border-border px-3 py-2" />
                <td className="border border-border px-3 py-2" />
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
