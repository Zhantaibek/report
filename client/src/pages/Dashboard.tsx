import { Fragment, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.tsx';
import { Button } from '../components/ui/button.tsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table.tsx';
import { ChevronLeft, ChevronRight, DollarSign, Handshake, Scale, TrendingUp } from 'lucide-react';
import { getCurrencyRates } from '../api/currency-rates.ts';
import type { CurrencyRate } from '../api/currency-rates.ts';
import ReportChart from '../components/ReportChart.tsx';
import { getDailyVolumes, getTodayTrades, type DailyVolumePoint, type TodayTrade } from '../api/reports.ts';

export default function Dashboard() {
  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const [todayTrades, setTodayTrades] = useState<TodayTrade[]>([]);
  const [todayPage, setTodayPage] = useState(1);
  const [todayPerPage, setTodayPerPage] = useState(20);
  const [todayLoading, setTodayLoading] = useState(false);
  const [todayError, setTodayError] = useState<string | null>(null);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [volumes, setVolumes] = useState<DailyVolumePoint[]>([]);
  const [volumesLoading, setVolumesLoading] = useState(false);
  const [volumesError, setVolumesError] = useState<string | null>(null);

  useEffect(() => {
    getCurrencyRates().then(setRates).catch(() => {});
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
        setTodayPage(1);
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

  const pagedTodayTrades = useMemo(() => {
    const start = (todayPage - 1) * todayPerPage;
    const end = start + todayPerPage;
    return todayTrades.slice(start, end);
  }, [todayPage, todayPerPage, todayTrades]);

  const todayTotalPages = useMemo(() => {
    if (todayTrades.length === 0) return 1;
    return Math.ceil(todayTrades.length / todayPerPage);
  }, [todayPerPage, todayTrades]);

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

    for (const t of pagedTodayTrades) {
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
  }, [pagedTodayTrades]);

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

  const todayVolume = useMemo(
    () => todayTrades.reduce((sum, t) => sum + t.value, 0),
    [todayTrades],
  );

  const avgDealPrice = useMemo(() => {
    if (todayTrades.length === 0) return null;
    return todayTrades.reduce((sum, t) => sum + t.price, 0) / todayTrades.length;
  }, [todayTrades]);

  const usdRate = useMemo(
    () => rates.find((r) => r.currencyCode === 'USD') ?? rates[0] ?? null,
    [rates],
  );

  const stats = [
    {
      title: 'Объём торгов за сегодня',
      value: todayLoading
        ? '…'
        : `${todayVolume.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} сом`,
      icon: TrendingUp,
    },
    {
      title: 'Количество сделок за сегодня',
      value: todayLoading ? '…' : todayTrades.length.toLocaleString('ru-RU'),
      icon: Handshake,
    },
    {
      title: 'Средняя цена сделки за сегодня',
      value: todayLoading
        ? '…'
        : avgDealPrice == null
          ? '—'
          : `${avgDealPrice.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} сом`,
      icon: Scale,
    },
    {
      title: 'Курс USD/KGS',
      value: usdRate ? `${usdRate.rate.toFixed(2)} сом` : '—',
      icon: DollarSign,
      hint: 'Источник: НБКР',
      hintLink: 'https://www.nbkr.kg/index.jsp?lang=RUS',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-stretch">
        <Card className="w-full lg:w-3/5 lg:min-w-0">
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
          <CardContent className="min-h-[280px]">
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

        <div className="grid w-full grid-cols-2 gap-4 lg:w-2/5 lg:min-w-0">
          {stats.map((item) => (
            <Card key={item.title} className="h-full">
              <CardContent className="flex h-full flex-col justify-center gap-3 p-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#3d848c]/10 text-[#3d848c]">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <p className="text-xs leading-tight text-muted-foreground">{item.title}</p>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-semibold">{item.value}</p>
                  {'hint' in item && item.hint ? (
                    <p className="text-[10px] text-muted-foreground">
                      {item.hintLink ? (
                        <a
                          href={item.hintLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {item.hint}
                        </a>
                      ) : (
                        item.hint
                      )}
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Низ: Торги за день */}
      <Card>
        <CardHeader>
          <CardTitle>Торги за день</CardTitle>
        </CardHeader>
        <CardContent>
          {todayLoading ? (
            <p className="text-sm text-muted-foreground">Загрузка…</p>
          ) : todayError ? (
            <p className="text-sm text-destructive">{todayError}</p>
          ) : todayTrades.length === 0 ? (
            <p className="text-sm text-muted-foreground">Сделок не найдено.</p>
          ) : (
            <div className="space-y-4">
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
                  {groupedTodayTrades.map((cls) => (
                    <Fragment key={cls.classCode}>
                      <TableRow className="bg-muted/40 hover:bg-muted/40">
                        <TableCell colSpan={7} className="py-2 text-sm font-semibold">
                          Класс: {cls.className || cls.classCode}
                        </TableCell>
                      </TableRow>
                      {cls.securities.map((sec) => (
                        <Fragment key={`${cls.classCode}-${sec.secCode}`}>
                          <TableRow className="bg-muted/20 hover:bg-muted/20">
                            <TableCell colSpan={7} className="py-1.5 text-xs font-medium text-muted-foreground">
                              ЦБ: {sec.secFullName || sec.secCode} ({sec.secCode})
                            </TableCell>
                          </TableRow>
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
                        </Fragment>
                      ))}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <p className="text-xs text-muted-foreground">
                    Показано {(todayPage - 1) * todayPerPage + 1}-
                    {Math.min(todayPage * todayPerPage, todayTrades.length)} из {todayTrades.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">На странице:</span>
                    <select
                      value={todayPerPage}
                      onChange={(e) => {
                        setTodayPerPage(Number(e.target.value));
                        setTodayPage(1);
                      }}
                      className="h-7 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      {[10, 20, 50, 100].map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setTodayPage((p) => Math.max(1, p - 1))}
                    disabled={todayPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-16 text-center text-xs text-muted-foreground">
                    {todayPage} / {todayTotalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setTodayPage((p) => Math.min(todayTotalPages, p + 1))}
                    disabled={todayPage >= todayTotalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
