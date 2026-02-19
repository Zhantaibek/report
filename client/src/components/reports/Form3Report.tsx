/**
 * Шаблон отчёта «Форма 3 - Отчет о заключенных сделках».
 * Группировка: Участник торгов → Класс → Ценная бумага → сделки.
 */
import React from 'react';
import { cn } from '../../lib/utils';
import { ReportHeader } from './ReportHeader';

export interface TradeItem {
  id: string;
  tradeDate: string;
  settleDate: string;
  brokerName: string;
  counterpartyName: string;
  price: number;
  quantity: number;
  value: number;
}

export interface SecurityGroup {
  secCode: string;
  trades: TradeItem[];
}

export interface ClassGroup {
  classCode: string;
  securities: SecurityGroup[];
}

export interface ParticipantGroup {
  participantName: string;
  classes: ClassGroup[];
}

export interface ReportTradesForm3Data {
  periodFrom: string;
  periodTo: string;
  participants: ParticipantGroup[];
  totalSummary?: {
    totalQuantity: number;
    totalAmount: number;
    totalTrades: number;
    totalSecurities: number;
  };
}

interface Props {
  data: ReportTradesForm3Data;
  className?: string;
  showTotalSummary?: boolean;
}

function formatDate(dateStr: string | Date | null | undefined): string {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return '0,00';
  return num.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatInt(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return Math.round(num).toLocaleString('ru-RU');
}

export default function Form3Report({ data, className, showTotalSummary = true }: Props) {
  return (
    <div
      className={cn(
        'w-full bg-white pb-6 text-xs print:max-w-none print:px-0',
        className
      )}
    >
      <ReportHeader
        formNumber="Ф-3"
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
                № сделки
              </th>
              <th className="border border-border px-3 py-2 text-center font-medium">
                Дата заключения
              </th>
              <th className="border border-border px-3 py-2 text-center font-medium">
                Дата исполнения
              </th>
              <th className="border border-border px-3 py-2 text-center font-medium">
                Продавец
              </th>
              <th className="border border-border px-3 py-2 text-center font-medium">
                Покупатель
              </th>
              <th className="border border-border px-3 py-2 text-right font-medium">
                Цена
              </th>
              <th className="border border-border px-3 py-2 text-right font-medium">
                Кол-во ЦБ
              </th>
              <th className="border border-border px-3 py-2 text-right font-medium">
                Сумма сделки
              </th>
            </tr>
          </thead>
          <tbody>
            {data.participants.map((participant, pIdx) => {
              return (
                <React.Fragment key={pIdx}>
                  {/* Заголовок участника */}
                  <tr className="bg-muted/80">
                    <td colSpan={8} className="border border-border px-3 py-2 font-semibold">
                      Участник торгов: {participant.participantName}
                    </td>
                  </tr>
                  
                  {participant.classes.map((cls, cIdx) => (
                    <React.Fragment key={`${pIdx}-${cIdx}`}>
                      {/* Заголовок класса */}
                      <tr className="bg-muted/60">
                        <td colSpan={8} className="border border-border px-3 py-2 font-medium">
                          Класс: {cls.classCode}
                        </td>
                      </tr>
                      
                      {cls.securities.map((sec, sIdx) => {
                        const secTotal = sec.trades.reduce((sum, t) => sum + t.value, 0);
                        const secQtyTotal = sec.trades.reduce((sum, t) => sum + t.quantity, 0);
                        
                        return (
                          <React.Fragment key={`${pIdx}-${cIdx}-${sIdx}`}>
                            {/* Заголовок ценной бумаги */}
                            <tr className="bg-muted/40">
                              <td colSpan={8} className="border border-border px-3 py-2 text-sm">
                                Ценная бумага: {sec.secCode}
                              </td>
                            </tr>
                            
                            {/* Сделки */}
                            {sec.trades.map((trade, tIdx) => (
                                <tr key={`${pIdx}-${cIdx}-${sIdx}-${tIdx}`} className="hover:bg-muted/20">
                                  <td className="border border-border px-3 py-2 text-center">{trade.id}</td>
                                  <td className="border border-border px-3 py-2 text-center">{formatDate(trade.tradeDate)}</td>
                                  <td className="border border-border px-3 py-2 text-center">{formatDate(trade.settleDate)}</td>
                                  <td className="border border-border px-3 py-2">{trade.brokerName}</td>
                                  <td className="border border-border px-3 py-2">{trade.counterpartyName}</td>
                                  <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNumber(trade.price)}</td>
                                  <td className="border border-border px-3 py-2 text-right tabular-nums">{formatInt(trade.quantity)}</td>
                                  <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNumber(trade.value)}</td>
                                </tr>
                            ))}
                            
                            {/* Итого по ЦБ */}
                            <tr className="bg-muted/50 font-medium">
                              <td colSpan={5} className="border border-border px-3 py-2">
                                Итого по ЦБ:
                              </td>
                              <td className="border border-border px-3 py-2" />
                              <td className="border border-border px-3 py-2 text-right tabular-nums">
                                {formatInt(secQtyTotal)}
                              </td>
                              <td className="border border-border px-3 py-2 text-right tabular-nums">
                                {formatNumber(secTotal)}
                              </td>
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  ))}
                  
                  {/* Итого по участнику торгов */}
                  <tr className="bg-muted/70 font-semibold">
                    <td colSpan={5} className="border border-border px-3 py-2">
                      Итого по участнику торгов:
                    </td>
                    <td className="border border-border px-3 py-2" />
                    <td className="border border-border px-3 py-2 text-right tabular-nums">
                      {formatInt(
                        participant.classes.reduce(
                          (sum, cls) => sum + cls.securities.reduce(
                            (s, sec) => s + sec.trades.reduce((t, tr) => t + tr.quantity, 0),
                            0
                          ),
                          0
                        )
                      )}
                    </td>
                    <td className="border border-border px-3 py-2 text-right tabular-nums">
                      {formatNumber(
                        participant.classes.reduce(
                          (sum, cls) => sum + cls.securities.reduce(
                            (s, sec) => s + sec.trades.reduce((t, tr) => t + tr.value, 0),
                            0
                          ),
                          0
                        )
                      )}
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
            
            {/* Итого по всему отчёту */}
            {showTotalSummary && data.totalSummary && (
              <>
                <tr className="bg-primary/10 font-bold">
                  <td colSpan={5} className="border border-border px-3 py-2">
                    Всего:
                  </td>
                  <td className="border border-border px-3 py-2" />
                  <td className="border border-border px-3 py-2 text-right tabular-nums">
                    {formatInt(data.totalSummary.totalQuantity)}
                  </td>
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
