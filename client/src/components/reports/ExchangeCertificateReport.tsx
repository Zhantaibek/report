/**
 * Биржевое свидетельство — структура по макету: участник/трейдер, вводный текст, данные в две колонки, юридический текст, подпись.
 */
import React from 'react';

export interface ExchangeCertificateData {
  id: string | number;
  tradeDate: string;
  classCode?: string;
  secCode?: string;
  sellerName?: string | null;
  sellAccount?: string | null;
  buyerName?: string | null;
  buyAccount?: string | null;
  quantity: number;
  price: number;
  value: number;
  settleDate?: string | null;
}

function fmtNum(n: number | null | undefined, decimals = 8): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  const s = String(d).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s;
}

function fmtTime(d: string | null | undefined): string {
  if (!d) return '—';
  const match = String(d).match(/(\d{2}:\d{2}:\d{2})/);
  return match ? match[1] : '—';
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline leading-snug py-[1px]">
      <span className="w-1/2 min-w-0 pr-2 text-foreground">{label}</span>
      <span className="w-1/2 min-w-0 font-semibold text-foreground">{value ?? '—'}</span>
    </div>
  );
}

function Row2({
  label1, value1, label2, value2,
}: { label1: string; value1: React.ReactNode; label2: string; value2: React.ReactNode }) {
  return (
    <div className="flex items-baseline leading-snug py-[1px]">
      <span className="w-1/4 min-w-0 pr-2 text-foreground">{label1}</span>
      <span className="w-1/4 min-w-0 pr-2 font-semibold text-foreground">{value1 ?? '—'}</span>
      <span className="w-1/4 min-w-0 pr-2 text-foreground">{label2}</span>
      <span className="w-1/4 min-w-0 font-semibold text-foreground">{value2 ?? '—'}</span>
    </div>
  );
}

function Gap() {
  return <div className="mt-3" />;
}

const LEGAL_TEXT =
  'Настоящий Биржевой контракт удостоверяет факт заключения сделки купли-продажи ценных бумаг в ходе биржевых торгов, организация ЗАО "Кыргызская Фондовая Биржа", а также определяет взаимные обязательства между Продавцом и Покупателем по исполнению этой сделки купли-продажи и обязательства Участников торгов по оплате комиссионного сбора в пользу ЗАО "Кыргызская Фондовая Биржа".';

function OneCertificate({ data }: { data: ExchangeCertificateData }) {
  const tradeDate = data.tradeDate ?? '';
  const tradeTime = tradeDate ? fmtTime(tradeDate) : '—';

  return (
    <div className="w-full bg-white text-sm leading-normal">
      {/* Шапка */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-start gap-3">
          <img src="/favicon.png" alt="KSE" className="h-12 w-12 shrink-0 object-contain" />
          <div className="leading-tight">
            <p className="font-semibold">Кыргызская Фондовая Биржа</p>
            <p className="text-muted-foreground">Кыргыз Фондулук Биржасы</p>
            <p className="text-muted-foreground">Kyrgyz Stock Exchange</p>
          </div>
        </div>
        <p className="text-muted-foreground text-sm">г. Бишкек</p>
      </div>

      <h1 className="text-lg font-bold mb-4 text-center">Биржевое свидетельство №{data.id ?? '—'} S</h1>

      {/* Участник и трейдер — 50% / 50% */}
      <Row label="Участник торгов:" value={data.sellerName || '—'} />
      <Row label="Трейдер Участника" value="—" />

      <Gap />

      {/* Вводный текст по центру */}
      <p className="text-center text-sm my-3">
        В ходе торгов, проводимых ЗАО «Кыргызская Фондовая Биржа», заключили
      </p>
      <p className="text-center font-semibold text-sm mb-4">
        Номер сделки: {data.id ?? '—'}
      </p>

      {/* Данные сделки — две колонки 50% / 50% */}
      <Row2
        label1="Дата заключения сделки"
        value1={fmtDate(tradeDate)}
        label2="Время заключения сделки"
        value2={tradeTime}
      />
      <Row2
        label1="Счет списания ЦБ:"
        value1={data.sellAccount || '—'}
        label2="Счет зачисление ЦБ:"
        value2={data.buyAccount || '—'}
      />
      <Row label="Вид ЦБ, эмитент ЦБ" value={data.classCode || '—'} />
      <Row label="Торговый символ ценной бумаги" value={data.secCode || '—'} />
      <Row2
        label1="Количество ЦБ"
        value1={`${fmtNum(data.quantity)} шт.`}
        label2="Сумма сделки"
        value2={`${fmtNum(data.value)} с.`}
      />
      <Row2
        label1="Цена за 1 ЦБ"
        value1={`${fmtNum(data.price)} с.`}
        label2="Дата исполнения сделки"
        value2={fmtDate(data.settleDate)}
      />
      <div className="flex items-baseline leading-snug py-[1px]">
        <span className="w-1/2 min-w-0" />
        <span className="w-1/4 min-w-0 pr-2 text-foreground">Комиссионный сбор Продавца</span>
        <span className="w-1/4 min-w-0 font-semibold text-foreground">—</span>
      </div>
      <div className="flex items-baseline leading-snug py-[1px]">
        <span className="w-1/2 min-w-0" />
        <span className="w-1/4 min-w-0 pr-2 text-foreground">Комиссионный сбор Покупателя</span>
        <span className="w-1/4 min-w-0 font-semibold text-foreground">—</span>
      </div>

      <Gap />

      <p className="text-center text-sm leading-relaxed text-foreground">
        {LEGAL_TEXT}
      </p>

      <div className="mt-4 flex items-end gap-2">
        <span className="text-sm text-foreground shrink-0">Подпись уполномоченного лица ЗАО «Кыргызская Фондовая Биржа»</span>
        <span className="flex-1 border-b border-foreground mb-0.5" />
      </div>
    </div>
  );
}

export function ExchangeCertificateReport({ data }: { data: ExchangeCertificateData }) {
  return (
    <div className="w-full pb-6 print:max-w-none print:px-0">
      <OneCertificate data={data} />
      <div className="mt-10 pt-8 border-t-2 border-dashed border-gray-300">
        <OneCertificate data={data} />
      </div>
    </div>
  );
}

export default ExchangeCertificateReport;
