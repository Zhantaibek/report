/**
 * Сводный отчёт дня (проданные) по сделкам с золотом — данные QUIK, класс драгметаллов.
 * Строки — номиналы мерных слитков; номинал берётся из кода сертификата (KA<номинал>1<ДДММГГ>).
 */
import { useMemo } from 'react';
import { KSELogoHeader } from './KSELogoHeader';

export const GOLD_SUMMARY_NOMINALS = [1, 2, 5, 10, 20, 31, 50, 100, 250, 500, 1000] as const;

export interface GoldSummaryTrade {
  id: string | number;
  secCode: string;
  price: number;
  value: number;
}

/** KA011280426 → 1, KA101280426 → 10, KA1001280426 → 100. */
export function nominalFromCertificate(secCode: string): number | null {
  const m = /^KA(\d+?)1\d{6}$/i.exec(secCode.trim());
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
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

interface SummaryRow {
  label: string;
  certificates: string;
  prices: string;
  sum: number | null;
}

function summarize(label: string, trades: GoldSummaryTrade[]): SummaryRow {
  if (trades.length === 0) return { label, certificates: '', prices: '', sum: null };
  const certificates = [...new Set(trades.map((t) => t.secCode))].join(', ');
  const prices = [...new Set(trades.map((t) => t.price))]
    .sort((a, b) => a - b)
    .map((p) => fmtNum(p))
    .join('; ');
  const sum = trades.reduce((s, t) => s + t.value, 0);
  return { label, certificates, prices, sum };
}

export function buildGoldSummaryRows(trades: GoldSummaryTrade[]): SummaryRow[] {
  const byNominal = new Map<number, GoldSummaryTrade[]>();
  const other: GoldSummaryTrade[] = [];
  for (const t of trades) {
    const n = nominalFromCertificate(t.secCode);
    if (n != null && (GOLD_SUMMARY_NOMINALS as readonly number[]).includes(n)) {
      byNominal.set(n, [...(byNominal.get(n) ?? []), t]);
    } else {
      other.push(t);
    }
  }
  const rows = GOLD_SUMMARY_NOMINALS.map((n) => summarize(`${n}гр.`, byNominal.get(n) ?? []));
  if (other.length > 0) rows.push(summarize('Прочее', other));
  return rows;
}

export function GoldSummaryReport({ trades, reportDate }: { trades: GoldSummaryTrade[]; reportDate: string }) {
  const rows = useMemo(() => buildGoldSummaryRows(trades), [trades]);
  const total = useMemo(() => trades.reduce((s, t) => s + t.value, 0), [trades]);

  return (
    <div className="w-full bg-white pb-6 text-sm print:max-w-none print:px-0 mt-6">
      <KSELogoHeader />

      <h1 className="text-center text-base font-bold leading-snug mb-6 px-2">
        Сводный отчет дня (проданные)
        <br />
        заключенных и исполненных сделок с драгоценными металлами в торговой системе ЗАО
        <br />
        «Кыргызская фондовая биржа» на {fmtDateHeader(reportDate)} года
      </h1>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-foreground text-sm">
          <thead>
            <tr>
              <th className="border border-foreground px-2 py-2 text-left align-top font-medium w-1/4">
                Золото в мерных слитках. Номинал.
              </th>
              <th className="border border-foreground px-2 py-2 text-left align-top font-medium">Номер сертификата</th>
              <th className="border border-foreground px-2 py-2 text-left align-top font-medium">Цена</th>
              <th className="border border-foreground px-2 py-2 text-left align-top font-medium">Сумма сделки</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <td className="border border-foreground px-2 py-2">{r.label}</td>
                <td className="border border-foreground px-2 py-2">{r.certificates}</td>
                <td className="border border-foreground px-2 py-2 text-right tabular-nums">{r.prices}</td>
                <td className="border border-foreground px-2 py-2 text-right tabular-nums">
                  {r.sum != null ? fmtNum(r.sum) : ''}
                </td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="border border-foreground px-2 py-2">Всего:</td>
              <td className="border border-foreground px-2 py-2" />
              <td className="border border-foreground px-2 py-2" />
              <td className="border border-foreground px-2 py-2 text-right tabular-nums">{fmtNum(total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default GoldSummaryReport;
