import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.tsx';
import { Button } from '../components/ui/button.tsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table.tsx';
import { RefreshCw } from 'lucide-react';
import { getCurrencyRates, getCurrencyRatesHistory, refreshCurrencyRates } from '../api/currency-rates.ts';
import type { CurrencyRate } from '../api/currency-rates.ts';
import ReportChart from '../components/ReportChart.tsx';
import { getDailyVolumes, getTodayTrades, type DailyVolumePoint, type TodayTrade } from '../api/reports.ts';

export default function Dashboard() {
  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const [ratesHistory, setRatesHistory] = useState<CurrencyRate[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'info' } | null>(null);
  const [todayTrades, setTodayTrades] = useState<TodayTrade[]>([]);
  const [todayLoading, setTodayLoading] = useState(false);
  const [todayError, setTodayError] = useState<string | null>(null);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [rateMonth, setRateMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [volumes, setVolumes] = useState<DailyVolumePoint[]>([]);
  const [volumesLoading, setVolumesLoading] = useState(false);
  const [volumesError, setVolumesError] = useState<string | null>(null);

  useEffect(() => {
    getCurrencyRates().then(setRates).catch(() => {});
    getCurrencyRatesHistory().then(setRatesHistory).catch(() => {});
  }, []);

  useEffect(() => {
    const loadTodayTrades = async () => {
      setTodayLoading(true);
      setTodayError(null);
      try {
        const rows = await getTodayTrades();
        const parsed = rows.map((r) => ({
          ...r,
          quantity: Number(r.quantity ?? 0),
          price: Number(r.price ?? 0),
          value: Number(r.value ?? 0),
        }));
        setTodayTrades(parsed);
      } catch (err) {
        setTodayError(err instanceof Error ? err.message : 'Ошибка загрузки сделок за сегодня');
      } finally {
        setTodayLoading(false);
      }
    };
    loadTodayTrades();
  }, []);

  useEffect(() => {
    const loadVolumes = async () => {
      setVolumesLoading(true);
      setVolumesError(null);
      try {
        const res = await getDailyVolumes(month);
        setVolumes(res.points);
      } catch (err) {
        setVolumesError(err instanceof Error ? err.message : 'Ошибка загрузки объёмов');
      } finally {
        setVolumesLoading(false);
      }
    };
    loadVolumes();
  }, [month]);

  const groupedTodayTrades = useMemo(() => {
    const classMap = new Map<
      string,
      {
        classCode: string;
        className?: string;
        securities: Map<
          string,
          {
            secCode: string;
            secFullName?: string;
            trades: TodayTrade[];
          }
        >;
      }
    >();

    for (const t of todayTrades) {
      const classCode = t.classCode || 'Без класса';
      if (!classMap.has(classCode)) {
        classMap.set(classCode, {
          classCode,
          className: t.className || classCode,
          securities: new Map(),
        });
      }
      const cls = classMap.get(classCode)!;
      const secCode = t.secCode || 'Без кода';
      if (!cls.securities.has(secCode)) {
        cls.securities.set(secCode, {
          secCode,
          secFullName: t.secFullName || secCode,
          trades: [],
        });
      }
      cls.securities.get(secCode)!.trades.push(t);
    }

    return Array.from(classMap.values()).map((cls) => ({
      classCode: cls.classCode,
      className: cls.className,
      securities: Array.from(cls.securities.values()),
    }));
  }, [todayTrades]);

  const volumeChartData = useMemo(() => {
    if (volumes.length === 0) {
      return { labels: [], series: [] as { name: string; data: number[] }[] };
    }
    const labels = volumes.map((p) => {
      const d = p.date;
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
        const [, m, day] = d.split('-');
        return `${day}.${m}`;
      }
      return d;
    });
    const data = volumes.map((p) => p.totalValue);
    return {
      labels,
      series: [{ name: 'Объём сделок', data }],
    };
  }, [volumes]);

  const currencyChartData = useMemo(() => {
    if (ratesHistory.length === 0) {
      return { labels: [], series: [] as { name: string; data: number[] }[] };
    }
    const usd = ratesHistory
      .filter((r) => r.currencyCode === 'USD' && r.rateDate?.startsWith(rateMonth))
      .sort((a, b) => a.rateDate.localeCompare(b.rateDate));
    if (usd.length === 0) {
      return { labels: [], series: [] as { name: string; data: number[] }[] };
    }
    const labels = usd.map((r) => {
      const d = r.rateDate.slice(0, 10);
      const [, m, day] = d.split('-');
      return `${day}.${m}`;
    });
    return {
      labels,
      series: [{ name: 'USD/сом', data: usd.map((r) => r.rate) }],
    };
  }, [ratesHistory, rateMonth]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setMessage(null);
    try {
      const res = await refreshCurrencyRates();
      setRates(res.rates);
      getCurrencyRatesHistory().then(setRatesHistory).catch(() => {});
      setMessage({ text: 'Курс обновлён', type: 'success' });
    } catch {
      setMessage({ text: 'Ошибка при обновлении', type: 'info' });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Верх: два блока по 50% */}
      <div className="flex flex-col md:flex-row md:gap-6 md:items-stretch">
        {/* Лево: Курсы валют */}
        <Card className="w-full md:w-1/2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-baseline gap-3">
                  <CardTitle>Курсы валют</CardTitle>
                  {rates[0] && (
                    <span className="text-sm text-muted-foreground">
                      USD: {rates[0].rate.toFixed(2)} сом
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="h-8 w-8"
                >
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Месяц:</span>
                  <input
                    type="month"
                    value={rateMonth}
                    onChange={(e) => setRateMonth(e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                  />
                </div>
                <a
                  href="https://www.nbkr.kg/index.jsp?lang=RUS"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Источник: НБКР
                </a>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2 pb-3">
            {message && (
              <p
                className={`text-sm mb-3 ${
                  message.type === 'success' ? 'text-green-600' : 'text-muted-foreground'
                }`}
              >
                {message.text}
              </p>
            )}
            {currencyChartData.labels.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет данных по курсу USD за выбранный месяц.</p>
            ) : (
              <ReportChart labels={currencyChartData.labels} series={currencyChartData.series} type="area" />
            )}
          </CardContent>
        </Card>

        {/* Право: График объёмов */}
        <Card className="w-full md:w-1/2 mt-6 md:mt-0">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle>Объёмы сделок по дням</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Месяц:</span>
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {volumesLoading ? (
              <p className="text-sm text-muted-foreground">Загрузка…</p>
            ) : volumesError ? (
              <p className="text-sm text-destructive">{volumesError}</p>
            ) : volumeChartData.labels.length === 0 ? (
              <p className="text-sm text-muted-foreground">Нет данных для выбранного месяца.</p>
            ) : (
              <ReportChart labels={volumeChartData.labels} series={volumeChartData.series} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Низ: Торги за сегодня */}
      <Card>
        <CardHeader>
          <CardTitle>Торги за сегодня</CardTitle>
        </CardHeader>
        <CardContent>
          {todayLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка…</p>
          ) : todayError ? (
            <p className="text-sm text-destructive">{todayError}</p>
          ) : todayTrades.length === 0 ? (
            <p className="text-sm text-muted-foreground">За сегодня сделок не найдено.</p>
          ) : (
            <div className="space-y-4">
              {groupedTodayTrades.map((cls) => (
                <div key={cls.classCode} className="space-y-2">
                  <h3 className="text-sm font-semibold">
                    Класс: {cls.className || cls.classCode}
                  </h3>
                  <div className="space-y-3">
                    {cls.securities.map((sec) => (
                      <div key={sec.secCode}>
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          ЦБ: {sec.secFullName || sec.secCode} ({sec.secCode})
                        </p>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Дата</TableHead>
                              <TableHead>№ сделки</TableHead>
                              <TableHead>Покупатель</TableHead>
                              <TableHead>Продавец</TableHead>
                              <TableHead className="text-right">Кол-во ЦБ</TableHead>
                              <TableHead className="text-right">Цена</TableHead>
                              <TableHead className="text-right">Сумма</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sec.trades.map((t) => (
                              <TableRow key={t.id}>
                                <TableCell>{t.tradeDate}</TableCell>
                                <TableCell>{t.id}</TableCell>
                                <TableCell>{t.buyerName || ''}</TableCell>
                                <TableCell>{t.sellerName || ''}</TableCell>
                                <TableCell className="text-right">
                                  {t.quantity.toLocaleString('ru-RU')}
                                </TableCell>
                                <TableCell className="text-right">
                                  {t.price.toLocaleString('ru-RU', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </TableCell>
                                <TableCell className="text-right">
                                  {t.value.toLocaleString('ru-RU', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
