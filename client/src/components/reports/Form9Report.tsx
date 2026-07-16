/**
 * Шаблон отчёта «Ведомость заключенных сделок в торговой системе» (Ф-9).
 * Группировка: Класс → Ценная бумага → строки сделок.
 */
import React from 'react';
import { ReportHeader } from './ReportHeader';

export interface TradeRow {
  id: string; // TradeNum
  tradeDate: string;
  sellerName: string;
  sellAccount: string;
  buyerName: string;
  buyAccount: string;
  quantity: number;
  value: number;
  accruedInt: number;
}

export interface SecurityGroup {
  secCode: string;
  secFullName: string;
  trades: TradeRow[];
}

export interface ClassGroup {
  classCode: string;
  className?: string;
  securities: SecurityGroup[];
}

export interface ReportForm9Data {
  periodFrom: string;
  periodTo: string;
  classes: ClassGroup[];
  totalSummary?: {
    totalQuantity: number;
    totalValue: number;
    totalAccruedInt: number;
    totalTrades: number;
    totalSecurities: number;
  };
}

const COLS = 9;

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
    <div className="w-full bg-white pb-6 text-xs print:max-w-none print:px-0 print:pb-0">
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
                Продавец
              </th>
              <th className="border border-border px-3 py-2 text-center font-medium">
                Счет депо продавца
              </th>
              <th className="border border-border px-3 py-2 text-center font-medium">
                Покупатель
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
              <th className="border border-border px-3 py-2 text-center font-medium">
                НКД
              </th>
            </tr>
          </thead>
          <tbody>
            {data.classes.map((cls) => {
              let classQuantity = 0;
              let classValue = 0;
              let classAccruedInt = 0;

              return (
                <React.Fragment key={cls.classCode}>
                  <tr className="bg-muted/70">
                    <td
                      colSpan={COLS}
                      className="border border-border px-3 py-1.5 font-medium"
                    >
                      Класс: {cls.className ?? cls.classCode}
                    </td>
                  </tr>

                  {cls.securities.map((sec) => {
                    const secQuantity = sec.trades.reduce((sum, t) => sum + t.quantity, 0);
                    const secValue = sec.trades.reduce((sum, t) => sum + t.value, 0);
                    const secAccruedInt = sec.trades.reduce((sum, t) => sum + t.accruedInt, 0);
                    classQuantity += secQuantity;
                    classValue += secValue;
                    classAccruedInt += secAccruedInt;

                    return (
                      <React.Fragment key={sec.secCode}>
                        <tr className="bg-muted/40">
                          <td
                            colSpan={COLS}
                            className="border border-border px-3 py-1.5 font-medium"
                          >
                            Ценная бумага: {sec.secCode} - {sec.secFullName}
                          </td>
                        </tr>

                        {sec.trades.map((trade) => (
                          <tr key={trade.id} className="bg-background">
                            <td className="border border-border px-3 py-2">
                              {trade.id}
                            </td>
                            <td className="border border-border px-3 py-2">
                              {formatDate(trade.tradeDate)}
                            </td>
                            <td className="border border-border px-3 py-2">
                              {trade.sellerName || '—'}
                            </td>
                            <td className="border border-border px-3 py-2">
                              {trade.sellAccount || '—'}
                            </td>
                            <td className="border border-border px-3 py-2">
                              {trade.buyerName || '—'}
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
                            <td className="border border-border px-3 py-2 text-right tabular-nums">
                              {formatNumber(trade.accruedInt)}
                            </td>
                          </tr>
                        ))}

                        <tr className="bg-muted/60 font-semibold">
                          <td
                            colSpan={6}
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
                          <td className="border border-border px-3 py-2 text-right tabular-nums">
                            {formatNumber(secAccruedInt)}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}

                  <tr className="bg-muted font-semibold">
                    <td
                      colSpan={6}
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
                    <td className="border border-border px-3 py-2 text-right tabular-nums">
                      {formatNumber(classAccruedInt)}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}

            {data.totalSummary && (
              <>
                <tr className="bg-primary/10 font-bold">
                  <td colSpan={6} className="border border-border px-3 py-2">
                    Всего:
                  </td>
                  <td className="border border-border px-3 py-2 text-right tabular-nums">
                    {formatInt(data.totalSummary.totalQuantity)}
                  </td>
                  <td className="border border-border px-3 py-2 text-right tabular-nums">
                    {formatNumber(data.totalSummary.totalValue)}
                  </td>
                  <td className="border border-border px-3 py-2 text-right tabular-nums">
                    {formatNumber(data.totalSummary.totalAccruedInt)}
                  </td>
                </tr>
                <tr className="bg-primary/10">
                  <td colSpan={COLS} className="border border-border px-3 py-2">
                    Количество финансовых инструментов:{' '}
                    <span className="font-semibold">{data.totalSummary.totalSecurities}</span>
                  </td>
                </tr>
                <tr className="bg-primary/10">
                  <td colSpan={COLS} className="border border-border px-3 py-2">
                    Количество сделок:{' '}
                    <span className="font-semibold">{data.totalSummary.totalTrades}</span>
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-8 text-sm hidden print:block">
        <p>Уполномоченное лицо ЗАО "Кыргызская Фондовая Биржа"</p>
        <p className="mt-8">___________________________ м.п</p>
      </div>
    </div>
  );
}

export default Form9Report;
