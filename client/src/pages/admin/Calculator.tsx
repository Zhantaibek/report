import { useState, type ReactNode } from 'react';
import { Printer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Input } from '../../components/ui/input.tsx';
import { Label } from '../../components/ui/label.tsx';
import { DateInput } from '../../components/ui/date-input.tsx';

type Mode = 'gkv' | 'gko';

function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(iso: string, days: number): string {
  const d = parseLocalDate(iso);
  d.setDate(d.getDate() + days);
  return toLocalISO(d);
}

function addYears(iso: string, years: number): string {
  const d = parseLocalDate(iso);
  d.setFullYear(d.getFullYear() + years);
  return toLocalISO(d);
}

function countDays(sdate: string, edate: string): number {
  const start = parseLocalDate(sdate);
  const end = parseLocalDate(edate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function countYears(sdate: string, edate: string): number {
  const start = parseLocalDate(sdate);
  const end = parseLocalDate(edate);
  let yearDifference = end.getFullYear() - start.getFullYear();
  if (
    end.getMonth() < start.getMonth() ||
    (end.getMonth() === start.getMonth() && end.getDate() < start.getDate())
  ) {
    yearDifference--;
  }
  return yearDifference;
}

function yieldPct(price: number): string {
  return ((((100 - price) / price) * (360 / 364)) * 100).toFixed(2);
}

function money(n: number): string {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

type GkvResult = {
  daysRemaining: number;
  daysBetween: number;
  buyPrice: string;
  sellPrice: string;
  increase: string;
  priceToBuy: string;
  buyCurrency: string;
  sellCurrency: string;
  repayCurrency: string;
};

type GkoResult = {
  daysRemaining: number;
  daysBetween: number;
  buyPrice: string;
  sellPrice: string;
  amount: string;
  total: string;
  increase: string;
};

type ResultRow = { label: string; value: ReactNode; section?: boolean };

function ReqLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <Label htmlFor={htmlFor}>
      {children} <span className="text-destructive">*</span>
    </Label>
  );
}

function isFilled(v: string): boolean {
  return v.trim() !== '';
}

function isPositiveNumber(v: string): boolean {
  const n = Number(v);
  return isFilled(v) && Number.isFinite(n) && n > 0;
}

function isNonNegNumber(v: string): boolean {
  const n = Number(v);
  return isFilled(v) && Number.isFinite(n) && n >= 0;
}

const modeBtn = (active: boolean) =>
  `px-4 py-2 text-sm font-medium rounded-md border transition-colors print:hidden ${
    active
      ? 'border-[#3d848c] bg-[#3d848c]/10 text-[#3d848c]'
      : 'border-border text-muted-foreground hover:text-foreground hover:border-[#3d848c]/40'
  }`;

function ResultTable({ title, rows }: { title: string; rows: ResultRow[] }) {
  return (
    <div className="overflow-x-auto">
      <h3 className="mb-3 text-base font-semibold print:mb-2">{title}</h3>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="border border-[#dddddd] bg-[#efefef] px-3 py-2 text-left font-semibold w-[70%]">
              Показатель
            </th>
            <th className="border border-[#dddddd] bg-[#efefef] px-3 py-2 text-right font-semibold w-[30%]">
              Значение
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) =>
            row.section ? (
              <tr key={i} className="bg-muted/40">
                <td colSpan={2} className="border border-[#dddddd] px-3 py-2 font-semibold">
                  {row.label}
                </td>
              </tr>
            ) : (
              <tr key={i} className="odd:bg-background even:bg-muted/20">
                <td className="border border-[#dddddd] px-3 py-2">{row.label}</td>
                <td className="border border-[#dddddd] px-3 py-2 text-right font-medium tabular-nums whitespace-nowrap">
                  {row.value}
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

function GkvCalculator() {
  const [dateDeploy, setDateDeploy] = useState('');
  const [dateRepay, setDateRepay] = useState('');
  const [dateBuy, setDateBuy] = useState('');
  const [volume, setVolume] = useState('');
  const [price, setPrice] = useState('');
  const [dateSell, setDateSell] = useState('');
  const [profitToBuy, setProfitToBuy] = useState('');
  const [result, setResult] = useState<GkvResult | null>(null);
  const [error, setError] = useState('');

  const onDeployChange = (iso: string | undefined) => {
    if (!iso) {
      setDateDeploy('');
      return;
    }
    setDateDeploy(iso);
    setDateRepay(addDays(iso, 364));
    setDateBuy(iso);
  };

  const calculate = () => {
    if (
      !isFilled(dateRepay) ||
      !isFilled(dateBuy) ||
      !isFilled(dateSell) ||
      !isPositiveNumber(volume) ||
      !isPositiveNumber(price) ||
      !isNonNegNumber(profitToBuy)
    ) {
      setError('Заполните все обязательные поля (*) корректными значениями');
      setResult(null);
      return;
    }
    setError('');
    const p = Number(price);
    const vol = Number(volume);
    const profit = Number(profitToBuy);
    const daysRemaining = countDays(dateBuy, dateRepay);
    const daysBetween = Math.floor(
      (parseLocalDate(dateSell).getTime() - parseLocalDate(dateBuy).getTime()) / (1000 * 60 * 60 * 24)
    );
    const currencyPrice = Number(((((100 - p) / 364) * daysBetween) + p).toFixed(4));
    const currencyPriceBuy = Number((currencyPrice - (currencyPrice / 100) * profit).toFixed(4));
    const repayPrice = ((100 - p) / 364) * daysRemaining + p;

    setResult({
      daysRemaining,
      daysBetween,
      buyPrice: `${p} / ${yieldPct(p)} %`,
      sellPrice: `${currencyPrice} / ${yieldPct(currencyPrice)} %`,
      increase: (((100 - p) / 364) * daysBetween).toFixed(4),
      priceToBuy: `${currencyPriceBuy} / ${yieldPct(currencyPriceBuy)} %`,
      buyCurrency: money(vol * p),
      sellCurrency: money(vol * currencyPrice),
      repayCurrency: money(vol * repayPrice),
    });
  };

  const handlePrint = () => window.print();

  const rows: ResultRow[] | null = result
    ? [
        { label: 'Дни', value: '', section: true },
        { label: 'Кол-во дней до погашения с момента покупки', value: result.daysRemaining },
        { label: 'Кол-во дней между покупкой и продажей', value: result.daysBetween },
        { label: 'Цена', value: '', section: true },
        { label: 'Цена по номиналу', value: 100 },
        { label: 'Цена покупки / доходность', value: result.buyPrice },
        { label: 'Цена сейчас / доходность', value: result.sellPrice },
        { label: 'Увеличение цены на каждую ГКВ', value: result.increase },
        { label: 'Цена по которой надо покупать / доходность', value: result.priceToBuy },
        { label: 'Деньги', value: '', section: true },
        { label: 'Количество денег при покупке', value: result.buyCurrency },
        { label: 'Количество денег при продаже сейчас', value: result.sellCurrency },
        { label: 'Количество денег по погашению', value: result.repayCurrency },
      ]
    : null;

  return (
    <Card className="print:border-none print:shadow-none">
      <CardHeader className="print:pb-2">
        <CardTitle className="text-lg">Калькулятор цены и доходности ГКВ</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 print:hidden">
          <div className="space-y-2">
            <Label>Дата размещения</Label>
            <DateInput value={dateDeploy || undefined} onChange={onDeployChange} className="w-full" />
          </div>
          <div className="space-y-2">
            <ReqLabel>Дата погашения</ReqLabel>
            <DateInput
              value={dateRepay || undefined}
              onChange={(v) => setDateRepay(v ?? '')}
              className="w-full"
              required
            />
          </div>
          <div className="space-y-2">
            <ReqLabel>Дата покупки</ReqLabel>
            <DateInput
              value={dateBuy || undefined}
              onChange={(v) => setDateBuy(v ?? '')}
              className="w-full"
              required
            />
          </div>
          <div className="space-y-2">
            <ReqLabel htmlFor="gkv-volume">Объем ГКВ</ReqLabel>
            <Input
              id="gkv-volume"
              type="number"
              required
              placeholder="напр. 1000"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <ReqLabel htmlFor="gkv-price">Цена покупки ГКВ</ReqLabel>
            <Input
              id="gkv-price"
              type="number"
              required
              placeholder="напр. 90 (от номинала 100)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <ReqLabel>Дата продажи</ReqLabel>
            <DateInput
              value={dateSell || undefined}
              onChange={(v) => setDateSell(v ?? '')}
              className="w-full"
              required
            />
          </div>
          <div className="space-y-2">
            <ReqLabel htmlFor="gkv-profit">На сколько % ниже покупать</ReqLabel>
            <Input
              id="gkv-profit"
              type="number"
              required
              placeholder="напр. 1 (%)"
              value={profitToBuy}
              onChange={(e) => setProfitToBuy(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive print:hidden">{error}</p>}

        <div className="flex justify-end gap-2 print:hidden">
          <Button type="button" onClick={calculate}>
            Посчитать
          </Button>
          <Button type="button" variant="outline" onClick={handlePrint} disabled={!result}>
            <Printer size={16} className="mr-1.5" />
            Печать
          </Button>
        </div>

        {rows && <ResultTable title="Результат расчёта цены и доходности ГКВ" rows={rows} />}
      </CardContent>
    </Card>
  );
}

function GkoCalculator() {
  const [dateDeploy, setDateDeploy] = useState('');
  const [dateRepay, setDateRepay] = useState('');
  const [dateBuy, setDateBuy] = useState('');
  const [coupon, setCoupon] = useState('');
  const [volume, setVolume] = useState('');
  const [result, setResult] = useState<GkoResult | null>(null);
  const [error, setError] = useState('');

  const onDeployChange = (iso: string | undefined) => {
    if (!iso) {
      setDateDeploy('');
      return;
    }
    setDateDeploy(iso);
    setDateRepay(addYears(iso, 2));
    setDateBuy(iso);
  };

  const calculate = () => {
    if (
      !isFilled(dateDeploy) ||
      !isFilled(dateRepay) ||
      !isFilled(dateBuy) ||
      !isPositiveNumber(coupon) ||
      !isPositiveNumber(volume)
    ) {
      setError('Заполните все обязательные поля (*) корректными значениями');
      setResult(null);
      return;
    }
    setError('');
    const vol = Number(volume);
    const couponRate = Number(coupon);
    const price = 100;
    const totalDays = countDays(dateDeploy, dateRepay);
    const daysFromDeploy = countDays(dateDeploy, dateBuy);
    const increaseDay =
      ((couponRate * countYears(dateDeploy, dateRepay) * vol) / totalDays) * daysFromDeploy;
    const nkdPerUnit = increaseDay / vol;
    const sellPrice = price + nkdPerUnit;

    setResult({
      daysRemaining: totalDays,
      daysBetween: daysFromDeploy,
      buyPrice: `${money(price)} сом`,
      sellPrice: `${money(sellPrice)} сом`,
      amount: vol.toLocaleString('ru-RU'),
      total: `${money(vol * price)} сом`,
      increase: `${money(increaseDay)} сом`,
    });
  };

  const handlePrint = () => window.print();

  const rows: ResultRow[] | null = result
    ? [
        { label: 'Дни', value: '', section: true },
        { label: 'Кол-во дней до погашения с момента покупки', value: result.daysRemaining },
        { label: 'Кол-во дней с момента размещения', value: result.daysBetween },
        { label: 'Цена', value: '', section: true },
        { label: 'Цена за 1 ГКО (номинал)', value: result.buyPrice },
        { label: 'Текущая цена продажи (за 1 ГКО)', value: result.sellPrice },
        { label: 'Количество ГКО', value: result.amount },
        { label: 'Объем ГКО', value: result.total },
        { label: 'Накопленный купонный доход', value: result.increase },
      ]
    : null;

  return (
    <Card className="print:border-none print:shadow-none">
      <CardHeader className="print:pb-2">
        <CardTitle className="text-lg">Калькулятор накопленного купонного дохода (ГКО)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 print:hidden">
          <div className="space-y-2">
            <ReqLabel>Дата размещения</ReqLabel>
            <DateInput
              value={dateDeploy || undefined}
              onChange={onDeployChange}
              className="w-full"
              required
            />
          </div>
          <div className="space-y-2">
            <ReqLabel>Дата погашения</ReqLabel>
            <DateInput
              value={dateRepay || undefined}
              onChange={(v) => setDateRepay(v ?? '')}
              className="w-full"
              required
            />
          </div>
          <div className="space-y-2">
            <ReqLabel>Дата покупки / продажи</ReqLabel>
            <DateInput
              value={dateBuy || undefined}
              onChange={(v) => setDateBuy(v ?? '')}
              className="w-full"
              required
            />
          </div>
          <div className="space-y-2">
            <ReqLabel htmlFor="gko-coupon">Купонная ставка</ReqLabel>
            <Input
              id="gko-coupon"
              type="number"
              required
              placeholder="напр. 12 (% годовых)"
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <ReqLabel htmlFor="gko-volume">Количество ГКО</ReqLabel>
            <Input
              id="gko-volume"
              type="number"
              required
              placeholder="напр. 1000 (шт.)"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive print:hidden">{error}</p>}

        <div className="flex justify-end gap-2 print:hidden">
          <Button type="button" onClick={calculate}>
            Посчитать
          </Button>
          <Button type="button" variant="outline" onClick={handlePrint} disabled={!result}>
            <Printer size={16} className="mr-1.5" />
            Печать
          </Button>
        </div>

        {rows && <ResultTable title="Результат расчёта НКД (ГКО)" rows={rows} />}
      </CardContent>
    </Card>
  );
}

export default function Calculator() {
  const [mode, setMode] = useState<Mode>('gkv');

  return (
    <div className="space-y-4">
      <div className="flex gap-2 print:hidden">
        <button type="button" className={modeBtn(mode === 'gkv')} onClick={() => setMode('gkv')}>
          ГКВ
        </button>
        <button type="button" className={modeBtn(mode === 'gko')} onClick={() => setMode('gko')}>
          ГКО
        </button>
      </div>
      {mode === 'gkv' ? <GkvCalculator /> : <GkoCalculator />}
    </div>
  );
}
