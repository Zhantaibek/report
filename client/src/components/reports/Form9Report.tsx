/**
 * Шаблон отчёта «Ведомость заключенных сделок в торговой системе» (Ф-9).
 * Группировка: Класс → Ценная бумага → строки сделок.
 */
import React from 'react';
import { cn } from '../../lib/utils.ts';
import { ReportHeader } from './ReportHeader';

export interface TradeRow {
  id: string; // TradeNum
  tradeDate: string;
  sellAccount: string;
  buyAccount: string;
  quantity: number;
  value: number;
}

export interface SecurityGroup {
  secCode: string;
  secFullName: string;
  trades: TradeRow[];
}

export interface ClassGroup {
  classCode: string;
  securities: SecurityGroup[];
}

export interface ReportForm9Data {
  periodFrom: string;
  periodTo: string;
  classes: ClassGroup[];
  totalSummary?: {
    totalQuantity: number;
    totalValue: number;
    totalTrades: number;
    totalSecurities: number;
  };
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
  return d.toLocaleDateString('ru-RU');
}

export function Form9Report({ data }: { data: ReportForm9Data }) {
  return (
    <div className="w-full bg-white pb-6 text-xs print:max-w-none print:px-0">
      <ReportHeader 
        formNumber="Ф-9"
        title="Ведомость заключенных сделок в торговой системе"
        periodFrom={data.periodFrom}
        periodTo={data.periodTo}
      />

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th className="border border-border px-3 py-2 text-center font-medium">
                № сделки
              </th>
              <th className="border border-border px-3 py-2 text-center font-medium">
                Дата сделки
              </th>
              <th className="border border-border px-3 py-2 text-center font-medium">
                Счет депо продавца
              </th>
              <th className="border border-border px-3 py-2 text-center font-medium">
                Счет депо покупателя
              </th>
              <th className="border border-border px-3 py-2 text-center font-medium">
                Кол-во ЦБ
              </th>
              <th className="border border-border px-3 py-2 text-center font-medium">
                Сумма сделки
              </th>
            </tr>
          </thead>
        <tbody>
          {data.classes.map((cls) => {
            let classQuantity = 0;
            let classValue = 0;

            return (
              <React.Fragment key={cls.classCode}>
                {/* Заголовок класса */}
                <tr className="bg-muted/70">
                  <td
                    colSpan={6}
                    className="border border-border px-3 py-1.5 font-medium"
                  >
                    Класс: {cls.classCode}
                  </td>
                </tr>

                {cls.securities.map((sec) => {
                  const secQuantity = sec.trades.reduce((sum, t) => sum + t.quantity, 0);
                  const secValue = sec.trades.reduce((sum, t) => sum + t.value, 0);
                  classQuantity += secQuantity;
                  classValue += secValue;

                  return (
                    <React.Fragment key={sec.secCode}>
                      {/* Заголовок ценной бумаги */}
                      <tr className="bg-muted/40">
                        <td
                          colSpan={6}
                          className="border border-border px-3 py-1.5 font-medium"
                        >
                          Ценная бумага: {sec.secCode} - {sec.secFullName}
                        </td>
                      </tr>

                      {/* Строки сделок */}
                      {sec.trades.map((trade) => (
                        <tr key={trade.id} className="bg-background">
                          <td className="border border-border px-3 py-2">
                            {trade.id}
                          </td>
                          <td className="border border-border px-3 py-2">
                            {formatDate(trade.tradeDate)}
                          </td>
                          <td className="border border-border px-3 py-2">
                            {trade.sellAccount || '—'}
                          </td>
                          <td className="border border-border px-3 py-2">
                            {trade.buyAccount || '—'}
                          </td>
                          <td className="border border-border px-3 py-2 text-right tabular-nums">
                            {formatInt(trade.quantity)}
                          </td>
                          <td className="border border-border px-3 py-2 text-right tabular-nums">
                            {formatNumber(trade.value)}
                          </td>
                        </tr>
                      ))}

                      {/* Итого по ЦБ */}
                      <tr className="bg-muted/60 font-semibold">
                        <td
                          colSpan={4}
                          className="border border-border px-3 py-2"
                        >
                          Итого по ЦБ:
                        </td>
                        <td className="border border-border px-3 py-2 text-right tabular-nums">
                          {formatInt(secQuantity)}
                        </td>
                        <td className="border border-border px-3 py-2 text-right tabular-nums">
                          {formatNumber(secValue)}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}

                {/* Итого по классу */}
                <tr className="bg-muted font-semibold">
                  <td
                    colSpan={4}
                    className="border border-border px-3 py-2"
                  >
                    Итого по классу:
                  </td>
                  <td className="border border-border px-3 py-2 text-right tabular-nums">
                    {formatInt(classQuantity)}
                  </td>
                  <td className="border border-border px-3 py-2 text-right tabular-nums">
                    {formatNumber(classValue)}
                  </td>
                </tr>
              </React.Fragment>
            );
          })}

          {/* Общий итог */}
          {data.totalSummary && (
            <>
              <tr className="bg-primary/10 font-bold">
                <td colSpan={4} className="border border-border px-3 py-2">
                  Всего:
                </td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">
                  {formatInt(data.totalSummary.totalQuantity)}
                </td>
                <td className="border border-border px-3 py-2 text-right tabular-nums">
                  {formatNumber(data.totalSummary.totalValue)}
                </td>
              </tr>
              <tr className="bg-primary/10">
                <td colSpan={6} className="border border-border px-3 py-2">
                  Количество финансовых инструментов: <span className="font-semibold">{data.totalSummary.totalSecurities}</span>
                </td>
              </tr>
              <tr className="bg-primary/10">
                <td colSpan={6} className="border border-border px-3 py-2">
                  Количество сделок: <span className="font-semibold">{data.totalSummary.totalTrades}</span>
                </td>
              </tr>
            </>
          )}
        </tbody>
      </table>
      </div>

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

export default Form9Report;
