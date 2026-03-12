import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  labels: string[];
  series: { name: string; data: number[] }[];
}

const COLORS = ['#0d9488', '#0891b2', '#6366f1', '#8b5cf6', '#ec4899'];

export default function ReportChart({ labels, series }: Props) {
  const data = labels.map((label, i) => {
    const point: Record<string, string | number> = { name: label };
    series.forEach((s) => {
      point[s.name] = s.data[i] ?? 0;
    });
    return point;
  });

  const allValues = series.flatMap((s) => s.data).map((v) => Number(v ?? 0));
  const maxValue = allValues.length ? Math.max(...allValues) : 0;
  const minValue = allValues.length ? Math.min(...allValues) : 0;
  const isRateChart = maxValue > 40 && maxValue < 200;

  const rateDomain: [number, number] = (() => {
    if (!isRateChart || !allValues.length) return [0, 100];
    const padding = 0.5;
    const low = Math.max(0, minValue - padding);
    const high = maxValue + padding;
    return [Number(low.toFixed(2)), Number(high.toFixed(2))];
  })();

  return (
    <div style={{ width: '100%', height: 180 }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="name"
            angle={-20}
            textAnchor="end"
            height={28}
            tick={{ fill: '#64748b', fontSize: 10 }}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 12 }}
            domain={isRateChart ? rateDomain : [0, 'auto']}
            tickFormatter={(v) =>
              isRateChart
                ? Number(v).toFixed(2)
                : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Number(v))
            }
          />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
            labelStyle={{ color: '#1e293b' }}
            formatter={(value: unknown) => {
              const num = Number(value ?? 0);
              const formatted = new Intl.NumberFormat('ru-RU', {
                minimumFractionDigits: isRateChart ? 2 : 0,
                maximumFractionDigits: isRateChart ? 2 : 0,
              }).format(num);
              return isRateChart ? [`${formatted} сом за 1 USD`, 'Курс'] : [`${formatted} сом`, 'Объём сделок'];
            }}
          />
          {series.map((s, i) => (
            <Line
              key={s.name}
              type="monotone"
              dataKey={s.name}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
