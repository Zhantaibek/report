import type { Trade, AggregateDef, ReportFormDto } from '../../types/index.js';

export function runSummary(trades: Trade[], form: ReportFormDto): Record<string, unknown>[] {
  const groupBy = form.groupBy ?? [];
  const aggregates = form.aggregates ?? [];

  const groups = new Map<string, Trade[]>();
  for (const t of trades) {
    const key = groupBy.map((f: string) => String((t as Record<string, unknown>)[f] ?? '')).join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(t);
  }

  const result: Record<string, unknown>[] = [];
  for (const [key, group] of groups) {
    const labels = key.split('|');
    const row: Record<string, unknown> = {};
    groupBy.forEach((f: string, i: number) => {
      row[f] = labels[i] || null;
    });
    for (const agg of aggregates as AggregateDef[]) {
      const field = agg.field;
      const op = agg.op;
      let val: number;
      if (op === 'count') {
        val = field === 'id' ? group.length : group.filter((t) => (t as Record<string, unknown>)[field] != null).length;
      } else if (op === 'sum') {
        val = group.reduce((s, t) => s + Number((t as Record<string, unknown>)[field] ?? 0), 0);
      } else if (op === 'avg') {
        const sum = group.reduce((s, t) => s + Number((t as Record<string, unknown>)[field] ?? 0), 0);
        val = group.length ? sum / group.length : 0;
      } else {
        val = 0;
      }
      row[agg.label ?? field] = val;
    }
    result.push(row);
  }
  return result;
}
