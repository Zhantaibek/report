import { useMemo } from 'react';
import { type GoldContractRow } from '../../api/reports.ts';
import { KSELogoHeader } from './KSELogoHeader';

/** Номиналы мерных слитков, г (группировка по полю quantity из Oracle). */
export const GOLD_NOMINALS_GRAMS = [1, 2, 5, 10, 20, 31, 50, 100, 250, 500, 1000] as const;

function matchNominalGrams(quantity: number): number | 'other' {
  if (!Number.isFinite(quantity)) return 'other';
  for (const n of GOLD_NOMINALS_GRAMS) {
    if (Math.abs(quantity - n) < 0.001) return n;
  }
  return 'other';
}

function fmtNum(n: number, decimals = 2): string {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtDateHeader(d: string): string {
  const s = String(d).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const [y, m, day] = s.split('-');
  return `${day}.${m}.${y}`;
}

export interface GoldDailySummaryTableRow {
  nominalLabel: string;
  quantityLabel: string;
  dealNumbers: string;
  price: string;
  sum: string;
  sumValue: number;
}

export function buildGoldDailySummaryRows(rows: GoldContractRow[]): GoldDailySummaryTableRow[] {
  const buckets = new Map<number | 'other', GoldContractRow[]>();
  for (const n of GOLD_NOMINALS_GRAMS) buckets.set(n, []);
  buckets.set('other', []);

  for (const row of rows) {
    const key = matchNominalGrams(row.quantity);
    buckets.get(key)!.push(row);
  }

  const out: GoldDailySummaryTableRow[] = [];

  for (const n of GOLD_NOMINALS_GRAMS) {
    const list = buckets.get(n)!;
    if (list.length === 0) {
      out.push({
        nominalLabel: `${n}гр.`,
        quantityLabel: '—',
        dealNumbers: '—',
        price: '—',
        sum: '—',
        sumValue: 0,
      });
      continue;
    }
    const totalQty = list.reduce((s, r) => s + r.quantity, 0);
    const totalVal = list.reduce((s, r) => s + r.value, 0);
    const wPrice = totalQty > 0 ? totalVal / totalQty : list[0]!.price;
    const serials = [...new Set(list.map((r) => r.serial))].sort((a, b) => a - b).join(', ');
    out.push({
      nominalLabel: `${n}гр.`,
      quantityLabel: fmtNum(totalQty, 2),
      dealNumbers: serials,
      price: fmtNum(wPrice),
      sum: fmtNum(totalVal),
      sumValue: totalVal,
    });
  }

  const other = buckets.get('other')!;
  if (other.length > 0) {
    const totalQty = other.reduce((s, r) => s + r.quantity, 0);
    const totalVal = other.reduce((s, r) => s + r.value, 0);
    const wPrice = totalQty > 0 ? totalVal / totalQty : other[0]!.price;
    const serials = [...new Set(other.map((r) => r.serial))].sort((a, b) => a - b).join(', ');
    out.push({
      nominalLabel: 'Прочее',
      quantityLabel: fmtNum(totalQty, 2),
      dealNumbers: serials,
      price: fmtNum(wPrice),
      sum: fmtNum(totalVal),
      sumValue: totalVal,
    });
  }

  return out;
}

export function GoldDailySummaryReport({
  rows,
  reportDate,
  instrumentLabel,
}: {
  rows: GoldContractRow[];
  reportDate: string;
  instrumentLabel?: string;
}) {
  const tableRows = useMemo(() => buildGoldDailySummaryRows(rows), [rows]);
  const grandTotal = useMemo(() => rows.reduce((s, r) => s + r.value, 0), [rows]);
  const grandQty = useMemo(() => rows.reduce((s, r) => s + r.quantity, 0), [rows]);

  return (
    <div className="w-full bg-white pb-6 text-sm print:max-w-none print:px-0 mt-6">
      <KSELogoHeader />

      <h1 className="text-center text-base font-bold leading-snug mb-1 px-2">
        Сводный отчёт дня (проданные) заключённых и исполненных сделок с драгоценными металлами в торговой системе ЗАО «Кыргызская
        фондовая биржа» на {fmtDateHeader(reportDate)} года
      </h1>

      {instrumentLabel ? (
        <p className="text-center text-sm text-muted-foreground mb-4">Инструмент: {instrumentLabel}</p>
      ) : (
        <div className="mb-4" />
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-border text-sm">
          <thead>
            <tr className="bg-muted/60">
              <th className="border border-border px-2 py-2 text-left font-medium">
                Золото в мерных слитках. Номинал.
              </th>
              <th className="border border-border px-2 py-2 text-center font-medium">Количество, гр.</th>
              <th className="border border-border px-2 py-2 text-center font-medium">Номер сделки</th>
              <th className="border border-border px-2 py-2 text-center font-medium">Цена</th>
              <th className="border border-border px-2 py-2 text-center font-medium">Сумма сделки</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((r, i) => (
              <tr key={`${r.nominalLabel}-${i}`} className="hover:bg-muted/20">
                <td className="border border-border px-2 py-1.5">{r.nominalLabel}</td>
                <td className="border border-border px-2 py-1.5 text-center tabular-nums">{r.quantityLabel}</td>
                <td className="border border-border px-2 py-1.5 text-center tabular-nums">{r.dealNumbers}</td>
                <td className="border border-border px-2 py-1.5 text-right tabular-nums">{r.price}</td>
                <td className="border border-border px-2 py-1.5 text-right tabular-nums">{r.sum}</td>
              </tr>
            ))}
            <tr className="bg-muted/40 font-semibold">
              <td className="border border-border px-2 py-2">Всего:</td>
              <td className="border border-border px-2 py-2 text-center tabular-nums">{fmtNum(grandQty, 2)}</td>
              <td className="border border-border px-2 py-2 text-center">—</td>
              <td className="border border-border px-2 py-2 text-right">—</td>
              <td className="border border-border px-2 py-2 text-right tabular-nums">{fmtNum(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default GoldDailySummaryReport;
