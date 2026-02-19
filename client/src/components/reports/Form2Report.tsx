/**
 * Шаблон отчёта «Форма 2 - Отчет о заключенных сделках».
 * Группировка: Класс → Ценная бумага → агрегированные данные по сделкам.
 */
import React from 'react';
import { cn } from '../../lib/utils.ts';
import { ReportHeader } from './ReportHeader';

export interface SecuritySummary {
  securityId: string;
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

export interface ClassGroupForm2 {
  classId: string;
  securities: SecuritySummary[];
}

export interface ReportTradesForm2Data {
  periodFrom: string;
  periodTo: string;
  classes: ClassGroupForm2[];
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

interface Props {
  data?: ReportTradesForm2Data | null;
  className?: string;
  showTotalSummary?: boolean;
}

export default function Form2Report({ data, className, showTotalSummary = true }: Props) {
  if (!data) return null;

  return (
    <div
      className={cn(
        'w-full bg-white pb-6 text-xs print:max-w-none print:px-0',
        className
      )}
    >
      <ReportHeader
        formNumber="Ф-2"
        title="Отчет о заключенных сделках"
        periodFrom={data.periodFrom}
        periodTo={data.periodTo}
      />

      {/* Таблица */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th className="border border-border px-3 py-2 text-center font-medium">
                Дата
              </th>
              <th className="border border-border px-3 py-2 text-center font-medium">
                Кол-во сделок
              </th>
              <th className="border border-border px-3 py-2 text-right font-medium">
                Кол-во ЦБ
              </th>
              <th className="border border-border px-3 py-2 text-right font-medium">
                Макс цена
              </th>
              <th className="border border-border px-3 py-2 text-right font-medium">
                Мин цена
              </th>
              <th className="border border-border px-3 py-2 text-right font-medium">
                Средняя цена
              </th>
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
              <th className="border border-border px-3 py-2 text-center font-medium">Цена</th>
              <th className="border border-border px-3 py-2 text-center font-medium">Кол-во ЦБ</th>
              <th className="border border-border px-3 py-2 text-center font-medium">Объем</th>
            </tr>
          </thead>
          <tbody>
            {data.classes.map((cls) => {
              return (
                <React.Fragment key={cls.classId}>
                  {/* Класс */}
                  <tr className="bg-muted/50">
                    <td
                      colSpan={9}
                      className="border border-border px-3 py-1.5 font-medium"
                    >
                      Класс: {cls.classId}
                    </td>
                  </tr>
                  {cls.securities.map((sec) => {
                    return (
                      <React.Fragment key={sec.securityId}>
                        {/* Ценная бумага */}
                        <tr className="bg-muted/40">
                          <td
                            colSpan={9}
                            className="border border-border px-3 py-1.5 font-medium"
                          >
                            Ценная бумага: {sec.securityId}
                          </td>
                        </tr>
                        {/* Строка данных */}
                        <tr className="bg-background">
                          <td className="border border-border px-3 py-2">
                            {sec.tradeDate}
                          </td>
                          <td className="border border-border px-3 py-2 text-center tabular-nums">
                            {sec.tradesCount}
                          </td>
                          <td className="border border-border px-3 py-2 text-right tabular-nums">
                            {formatInt(sec.totalQuantity)}
                          </td>
                          <td className="border border-border px-3 py-2 text-right tabular-nums">
                            {formatNumber(sec.maxPrice)}
                          </td>
                          <td className="border border-border px-3 py-2 text-right tabular-nums">
                            {formatNumber(sec.minPrice)}
                          </td>
                          <td className="border border-border px-3 py-2 text-right tabular-nums">
                            {formatNumber(sec.avgPrice)}
                          </td>
                          <td className="border border-border px-3 py-2 text-right tabular-nums">
                            {formatNumber(sec.lastTradePrice)}
                          </td>
                          <td className="border border-border px-3 py-2 text-right tabular-nums">
                            {formatInt(sec.lastTradeQuantity)}
                          </td>
                          <td className="border border-border px-3 py-2 text-right tabular-nums">
                            {formatNumber(sec.lastTradeAmount)}
                          </td>
                        </tr>
                        {/* Итого по ЦБ */}
                        <tr className="bg-muted/60 font-semibold">
                          <td className="border border-border px-3 py-2">
                            Итого по ЦБ:
                          </td>
                          <td className="border border-border px-3 py-2 text-center tabular-nums">
                            {sec.tradesCount}
                          </td>
                          <td className="border border-border px-3 py-2 text-right tabular-nums">
                            {formatInt(sec.totalQuantity)}
                          </td>
                          <td className="border border-border px-3 py-2" />
                          <td className="border border-border px-3 py-2" />
                          <td className="border border-border px-3 py-2" />
                          <td className="border border-border px-3 py-2" />
                          <td className="border border-border px-3 py-2" />
                          <td className="border border-border px-3 py-2" />
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })}
            
            {/* Итого по всему отчёту (показывается только на последней странице) */}
            {showTotalSummary && data.totalSummary && (
              <tr className="bg-primary/10 font-bold">
                <td className="border border-border px-3 py-2">
                  Всего:
                </td>
                <td className="border border-border px-3 py-2" />
                <td className="border border-border px-3 py-2 text-right tabular-nums">
                  {formatInt(data.totalSummary.totalQuantity)}
                </td>
                <td className="border border-border px-3 py-2" />
                <td className="border border-border px-3 py-2" />
                <td className="border border-border px-3 py-2" />
                <td className="border border-border px-3 py-2" />
                <td className="border border-border px-3 py-2" />
                <td className="border border-border px-3 py-2 text-right tabular-nums">
                  {formatNumber(data.totalSummary.totalAmount)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
