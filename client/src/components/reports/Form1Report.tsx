/**
 * Шаблон отчёта «Отчет о заключенных сделках» (Ф-1).
 * Группировка: Класс → Ценная бумага → строки сделок, итоги по ЦБ, итоги по классу.
 */
import React from 'react';
import { cn } from '../../lib/utils.ts';
import { ReportHeader } from './ReportHeader';

export interface TradeRow {
  dealNo: string;
  dateConcluded: string;
  dateExecution: string;
  seller: string;
  buyer: string;
  quantity: number;
  price: number;
  amount: number;
}

export interface SecurityGroup {
  securityId: string;
  secFullName?: string;
  trades: TradeRow[];
}

export interface ClassGroup {
  classId: string;
  className?: string;
  securities: SecurityGroup[];
}

export interface ReportTradesConcludedData {
  periodFrom: string;
  periodTo: string;
  classes: ClassGroup[];
  totalSummary?: {
    totalQuantity: number;
    totalAmount: number;
    totalTrades: number;
    totalSecurities: number;
  };
}

// const defaultMockData: ReportTradesConcludedData = {
//   periodFrom: '2025-09-01',
//   periodTo: '2026-02-13',
//   classes: [
//     {
//       classId: 'GBA02',
//       securities: [
//         {
//           securityId: 'GBA02271015',
//           trades: [
//             {
//               dealNo: '89',
//               dateConcluded: '10/15/2025',
//               dateExecution: '10/15/2025',
//               seller: 'FRDBROKER',
//               buyer: 'MBANK',
//               quantity: 10_000,
//               price: 86.3,
//               amount: 863_000,
//             },
//             {
//               dealNo: '90',
//               dateConcluded: '10/15/2025',
//               dateExecution: '10/15/2025',
//               seller: 'MBANK',
//               buyer: 'FRDBROKER',
//               quantity: 600_000,
//               price: 84.76,
//               amount: 50_856_000,
//             },
//           ],
//         },
//       ],
//     },
//   ],
// };

function formatNumber(n: number): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatInt(n: number): string {
  return n.toLocaleString('ru-RU');
}

interface Props {
  data?: ReportTradesConcludedData | null;
  className?: string;
  showTotalSummary?: boolean;
}

export default function Form1Report({ data, className, showTotalSummary = true }: Props) {
  if (!data) return null;

  return (
    <div
      className={cn(
        'w-full bg-white pb-6 text-xs print:max-w-none print:px-0 print:pb-0',
        className
      )}
    >
      <ReportHeader
        formNumber="Ф-1"
        title="Отчет о заключенных сделках"
        periodFrom={data.periodFrom}
        periodTo={data.periodTo}
      />

      {/* Таблица */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm table-fixed">
          <thead>
            <tr className="bg-muted/60">
              <th className="border border-border px-3 py-2 text-center font-medium">
                № сделки
              </th>
              <th className="border border-border px-3 py-2 text-center font-medium">
                Дата заключения
              </th>
              <th className="border border-border px-3 py-2 text-center font-medium">
                Дата исполнения
              </th>
              <th className="border border-border px-3 py-2 text-center font-medium w-[18%]">
                Продавец
              </th>
              <th className="border border-border px-3 py-2 text-center font-medium w-[18%]">
                Покупатель
              </th>
              <th className="border border-border px-3 py-2 text-right font-medium">
                Кол-во ЦБ
              </th>
              <th className="border border-border px-3 py-2 text-right font-medium">
                Цена
              </th>
              <th className="border border-border px-3 py-2 text-right font-medium">
                Сумма сделки
              </th>
            </tr>
          </thead>
          <tbody>
            {data.classes.map((cls) => {
              let classQuantity = 0;
              let classAmount = 0;
              return (
                <React.Fragment key={cls.classId}>
                  {/* Класс */}
                  <tr className="bg-muted/50">
                    <td
                      colSpan={8}
                      className="border border-border px-3 py-1.5 font-medium"
                    >
                      Класс: {cls.className ?? cls.classId}
                    </td>
                  </tr>
                  {cls.securities.map((sec) => {
                    const secQuantity = sec.trades.reduce((s, t) => s + t.quantity, 0);
                    const secAmount = sec.trades.reduce((s, t) => s + t.amount, 0);
                    classQuantity += secQuantity;
                    classAmount += secAmount;
                    return (
                      <React.Fragment key={sec.securityId}>
                        {/* Ценная бумага */}
                        <tr className="bg-muted/40">
                          <td
                            colSpan={8}
                            className="border border-border px-3 py-1.5 font-medium"
                          >
                            Ценная бумага: {sec.secFullName ?? sec.securityId}
                          </td>
                        </tr>
                        {/* Строки сделок */}
                        {sec.trades.map((row) => (
                          <tr key={row.dealNo} className="bg-background">
                            <td className="border border-border px-3 py-2">
                              {row.dealNo}
                            </td>
                            <td className="border border-border px-3 py-2">
                              {row.dateConcluded}
                            </td>
                            <td className="border border-border px-3 py-2">
                              {row.dateExecution}
                            </td>
                            <td className="border border-border px-3 py-2 break-words align-top">
                              {row.seller}
                            </td>
                            <td className="border border-border px-3 py-2 break-words align-top">
                              {row.buyer}
                            </td>
                            <td className="border border-border px-3 py-2 text-right tabular-nums">
                              {formatInt(row.quantity)}
                            </td>
                            <td className="border border-border px-3 py-2 text-right tabular-nums">
                              {formatNumber(row.price)}
                            </td>
                            <td className="border border-border px-3 py-2 text-right tabular-nums">
                              {formatNumber(row.amount)}
                            </td>
                          </tr>
                        ))}
                        {/* Итого по ЦБ */}
                        <tr className="bg-muted/60 font-semibold">
                          <td
                            colSpan={5}
                            className="border border-border px-3 py-2"
                          >
                            Итого по ЦБ:
                          </td>
                          <td className="border border-border px-3 py-2 text-right tabular-nums">
                            {formatInt(secQuantity)}
                          </td>
                          <td className="border border-border px-3 py-2" />
                          <td className="border border-border px-3 py-2 text-right tabular-nums">
                            {formatNumber(secAmount)}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                  {/* Итого по классу */}
                  <tr className="bg-muted font-semibold">
                    <td
                      colSpan={5}
                      className="border border-border px-3 py-2"
                    >
                      Итого по классу:
                    </td>
                    <td className="border border-border px-3 py-2 text-right tabular-nums">
                      {formatInt(classQuantity)}
                    </td>
                    <td className="border border-border px-3 py-2" />
                    <td className="border border-border px-3 py-2 text-right tabular-nums">
                      {formatNumber(classAmount)}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
            
            {/* Итого по всему отчёту (показывается только на последней странице) */}
            {showTotalSummary && data.totalSummary && (
              <>
                <tr className="bg-primary/10 font-bold">
                  <td colSpan={5} className="border border-border px-3 py-2">
                    Всего:
                  </td>
                  <td className="border border-border px-3 py-2 text-right tabular-nums">
                    {formatInt(data.totalSummary.totalQuantity)}
                  </td>
                  <td className="border border-border px-3 py-2" />
                  <td className="border border-border px-3 py-2 text-right tabular-nums">
                    {formatNumber(data.totalSummary.totalAmount)}
                  </td>
                </tr>
                <tr className="bg-primary/10">
                  <td colSpan={8} className="border border-border px-3 py-2">
                    Количество финансовых инструментов: <span className="font-semibold">{data.totalSummary.totalSecurities}</span>
                  </td>
                </tr>
                <tr className="bg-primary/10">
                  <td colSpan={8} className="border border-border px-3 py-2">
                    Количество сделок: <span className="font-semibold">{data.totalSummary.totalTrades}</span>
                  </td>
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
