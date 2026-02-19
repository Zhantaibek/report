import type { Trade, AggregateDef, ReportFormDto } from '../../types/index.js';
import { runSummary } from './summary-runner.js';

export function runChart(trades: Trade[], form: ReportFormDto): { labels: string[]; series: { name: string; data: number[] }[] } {
  const summaryRows = runSummary(trades, form);
  const groupBy = form.groupBy ?? [];
  const aggregates = form.aggregates ?? [];

  const labels = summaryRows.map((r: Record<string, unknown>) => {
    const parts = groupBy.map((f: string) => String(r[f] ?? ''));
    return parts.join(' / ');
  });

  const series = (aggregates as AggregateDef[]).map((agg) => ({
    name: agg.label ?? agg.field,
    data: summaryRows.map((r) => Number(r[agg.label ?? agg.field] ?? 0)),
  }));

  return { labels, series };
}
