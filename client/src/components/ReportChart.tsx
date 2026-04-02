import {
  LineChart, Line,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface Props {
  labels: string[];
  series: { name: string; data: number[] }[];
  type?: 'line' | 'area';
}

const COLORS = ['#0d9488', '#0891b2', '#6366f1', '#8b5cf6', '#ec4899'];
const AREA_STROKE = '#0d9488';
const AREA_FILL = '#0d9488';

export default function ReportChart({ labels, series, type = 'line' }: Props) {
  const data = labels.map((label, i) => {
    const point: Record<string, string | number> = { name: label };
    series.forEach((s) => { point[s.name] = s.data[i] ?? 0; });
    return point;
  });

  const allValues = series.flatMap((s) => s.data).map((v) => Number(v ?? 0));
  const maxValue = allValues.length ? Math.max(...allValues) : 0;
  const minValue = allValues.length ? Math.min(...allValues) : 0;

  if (type === 'area') {
    const spread = maxValue - minValue;
    const padding = Math.max(spread * 0.15, 0.003);
    const domainMin = (v: number) => Number((v - padding).toFixed(4));
    const domainMax = (v: number) => Number((v + padding).toFixed(4));

    return (
      <div style={{ width: '100%', height: 180 }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 4 }}>
            <defs>
              <linearGradient id="usdGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={AREA_FILL} stopOpacity={0.6} />
                <stop offset="95%" stopColor={AREA_FILL} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="name"
              angle={-20}
              textAnchor="end"
              height={28}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#94a3b8', fontSize: 11 }}
              domain={[domainMin, domainMax]}
              tickFormatter={(v) => Number(v).toFixed(3)}
              axisLine={false}
              tickLine={false}
              width={52}
              allowDecimals
              scale="linear"
            />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 12 }}
              labelStyle={{ color: '#1e293b' }}
              formatter={(value: unknown) => {
                const num = Number(value ?? 0);
                return [
                  num.toLocaleString('ru-RU', { minimumFractionDigits: 4, maximumFractionDigits: 4 }) + ' сом',
                  'USD',
                ];
              }}
            />
            {series.map((s) => (
              <Area
                key={s.name}
                type="monotone"
                dataKey={s.name}
                stroke={AREA_STROKE}
                strokeWidth={1.5}
                fill="url(#usdGrad)"
                dot={false}
                activeDot={{ r: 4, stroke: AREA_STROKE, fill: '#fff', strokeWidth: 2 }}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

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
            domain={[0, 'auto']}
            tickFormatter={(v) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(Number(v))}
          />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0' }}
            labelStyle={{ color: '#1e293b' }}
            formatter={(value: unknown) => {
              const num = Number(value ?? 0);
              return [new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(num) + ' сом', 'Объём сделок'];
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
