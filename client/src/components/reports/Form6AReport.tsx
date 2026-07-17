import React from 'react';
import { ReportHeader } from './ReportHeader';

// Утилиты форматирования
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

// Данные одной сделки
export interface TradeData {
  date: string;
  tradesCount: number; // Всегда 1 для отдельной сделки
  quantity: number;
  maxPrice: number;
  minPrice: number;
  avgPrice: number;
  secCode: string; // Per № ЦБ
  totalValue: number;
  accruedInt?: number;
}

// Данные по ценной бумаге
export interface SecurityData {
  secCode: string;
  secFullName?: string;
  trades: TradeData[];
  totalTrades: number;
  totalQuantity: number; // Общее количество ЦБ
  totalValue: number;
  totalAccruedInt?: number;
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
}

// Данные по классу
export interface ClassData {
  classCode: string;
  className?: string;
  securities: SecurityData[];
  totalTrades: number;
  totalSecurities: number;
  totalQuantity: number; // Общее количество ЦБ в классе
  totalValue: number;
  totalAccruedInt?: number;
  avgPrice: number;
  maxPrice: number;
}

export interface ReportForm6AData {
  periodFrom: string;
  periodTo: string;
  classes: ClassData[];
}

interface Props {
  data: ReportForm6AData;
  formNumber?: string;
  title?: string;
  showAccruedInt?: boolean;
}

export function Form6AReport({
  data,
  formNumber = 'Ф-6А',
  title = 'Сводный отчет по сделкам',
  showAccruedInt = false,
}: Props) {
  const colSpan = showAccruedInt ? 9 : 8;

  return (
    <div className="w-full bg-white pb-6 text-xs print:max-w-none print:px-0 print:pb-0">
      <ReportHeader
        formNumber={formNumber}
        title={title}
        periodFrom={data.periodFrom}
        periodTo={data.periodTo}
      />

      {/* Таблица */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th className="border border-border px-3 py-2 text-left font-medium">Дата</th>
              <th className="border border-border px-3 py-2 text-center font-medium">Кол-во<br/>Сделок</th>
              <th className="border border-border px-3 py-2 text-center font-medium">Кол-во ЦБ</th>
              <th className="border border-border px-3 py-2 text-right font-medium">Макс цена</th>
              <th className="border border-border px-3 py-2 text-right font-medium">Мин цена</th>
              <th className="border border-border px-3 py-2 text-right font-medium">Средняя<br/>цена</th>
              <th className="border border-border px-3 py-2 text-center font-medium">Per № ЦБ</th>
              <th className="border border-border px-3 py-2 text-right font-medium">Объем сделок</th>
              {showAccruedInt && (
                <th className="border border-border px-3 py-2 text-right font-medium">НКД</th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.classes.map((cls, clsIdx) => (
              <React.Fragment key={clsIdx}>
                {/* Класс заголовок */}
                <tr className="bg-muted/70">
                  <td colSpan={colSpan} className="border border-border px-3 py-2 font-semibold">
                    Класс: {cls.className ?? cls.classCode}
                  </td>
                </tr>

                {/* Ценные бумаги */}
                {cls.securities.map((sec, secIdx) => (
                  <React.Fragment key={secIdx}>
                    {/* ЦБ заголовок */}
                    <tr className="bg-muted/50">
                      <td colSpan={colSpan} className="border border-border px-3 py-2 font-medium">
                        Ценная Бумага: {sec.secFullName ?? sec.secCode}
                      </td>
                    </tr>

                    {/* Сделки */}
                    {sec.trades.map((trade, tradeIdx) => (
                      <tr key={tradeIdx} className="hover:bg-muted/20">
                        <td className="border border-border px-3 py-2">{formatDate(trade.date)}</td>
                        <td className="border border-border px-3 py-2 text-center tabular-nums">{trade.tradesCount}</td>
                        <td className="border border-border px-3 py-2 text-center tabular-nums">{formatInt(trade.quantity)}</td>
                        <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNumber(trade.maxPrice)}</td>
                        <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNumber(trade.minPrice)}</td>
                        <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNumber(trade.avgPrice)}</td>
                        <td className="border border-border px-3 py-2 text-center">{trade.secCode}</td>
                        <td className="border border-border px-3 py-2 text-right tabular-nums">{formatNumber(trade.totalValue)}</td>
                        {showAccruedInt && (
                          <td className="border border-border px-3 py-2 text-right tabular-nums">
                            {formatNumber(trade.accruedInt)}
                          </td>
                        )}
                      </tr>
                    ))}

                    {/* Итого по ЦБ */}
                    <tr className="bg-muted/40">
                      <td className="border border-border px-3 py-2 font-medium">Итого по ЦБ:</td>
                      <td className="border border-border px-3 py-2 text-center tabular-nums font-semibold">{sec.totalTrades}</td>
                      <td className="border border-border px-3 py-2 text-center tabular-nums font-semibold">{formatInt(sec.totalQuantity)}</td>
                      <td className="border border-border px-3 py-2 text-right tabular-nums font-semibold">{formatNumber(sec.maxPrice)}</td>
                      <td className="border border-border px-3 py-2 text-right tabular-nums font-semibold">{formatNumber(sec.minPrice)}</td>
                      <td className="border border-border px-3 py-2 text-right tabular-nums font-semibold">{formatNumber(sec.avgPrice)}</td>
                      <td className="border border-border px-3 py-2 text-center"></td>
                      <td className="border border-border px-3 py-2 text-right tabular-nums font-semibold">{formatNumber(sec.totalValue)}</td>
                      {showAccruedInt && (
                        <td className="border border-border px-3 py-2 text-right tabular-nums font-semibold">
                          {formatNumber(sec.totalAccruedInt)}
                        </td>
                      )}
                    </tr>
                  </React.Fragment>
                ))}

                {/* Итого по классу */}
                <tr className="bg-muted/60">
                  <td className="border border-border px-3 py-2 font-semibold">Итого по классу:</td>
                  <td className="border border-border px-3 py-2 text-center tabular-nums font-bold">{cls.totalTrades}</td>
                  <td className="border border-border px-3 py-2 text-center tabular-nums font-bold">{formatInt(cls.totalQuantity)}</td>
                  <td className="border border-border px-3 py-2 text-right tabular-nums font-bold">{formatNumber(cls.maxPrice)}</td>
                  <td className="border border-border px-3 py-2 text-right tabular-nums"></td>
                  <td className="border border-border px-3 py-2 text-right tabular-nums font-bold">{formatNumber(cls.avgPrice)}</td>
                  <td className="border border-border px-3 py-2 text-center"></td>
                  <td className="border border-border px-3 py-2 text-right tabular-nums font-bold">{formatNumber(cls.totalValue)}</td>
                  {showAccruedInt && (
                    <td className="border border-border px-3 py-2 text-right tabular-nums font-bold">
                      {formatNumber(cls.totalAccruedInt)}
                    </td>
                  )}
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
