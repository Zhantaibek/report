/**
 * Биржевой контракт — без рамок таблицы, метка+значение (жирный), блоки через пустую строку.
 */
import React from 'react';
import { KSELogoHeader } from './KSELogoHeader';

export interface ExchangeContractData {
  id: string | number;
  tradeDate: string;
  tradeDateTime?: string | null;
  classCode?: string;
  className?: string;
  secCode?: string;
  secFullName?: string;
  sellerName?: string | null;
  sellAccount?: string | null;
  sellerClientCode?: string | null;
  buyerName?: string | null;
  buyAccount?: string | null;
  buyerClientCode?: string | null;
  quantity: number;
  price: number;
  value: number;
  settleDate?: string | null;
  couponRate?: number | null;
}

function fmtNum(n: number | null | undefined, decimals = 8): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  const s = String(d).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s; // оставляем ISO формат как в макете: 2026-02-20
}

function fmtTime(d: string | null | undefined): string {
  if (!d) return '—';
  const match = String(d).match(/(\d{2}:\d{2}:\d{2})/);
  return match ? match[1] : '—';
}

/** Одна строка: 50% метка, 50% значение (жирный). */
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline leading-snug py-[1px]">
      <span className="w-1/2 min-w-0 pr-2 text-foreground">{label}</span>
      <span className="w-1/2 min-w-0 font-semibold text-foreground">{value ?? '—'}</span>
    </div>
  );
}

/** Две пары на одной строке: левая половина 50% (метка+значение), правая 50% (метка+значение). */
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

/** Разделитель между блоками. */
function Gap() {
  return <div className="mt-3" />;
}

const LEGAL_TEXT =
  'Настоящий Биржевой контракт удостоверяет факт заключения сделки купли-продажи ценных бумаг в ходе биржевых торгов, организованных ЗАО "Кыргызская Фондовая Биржа", а также определяет взаимные обязательства между Продавцом и Покупателем по исполнению этой сделки купли-продажи и обязательства Участников торгов по оплате комиссионного сбора в пользу ЗАО "Кыргызская Фондовая Биржа".';

function OneContract({ data }: { data: ExchangeContractData }) {
  const tradeDate = data.tradeDate ?? '';
  const tradeTime = data.tradeDateTime ? fmtTime(data.tradeDateTime) : (tradeDate ? fmtTime(tradeDate) : '—');
  const couponVal = data.couponRate != null && data.couponRate > 0
    ? fmtNum(data.couponRate, 2)
    : '—';

  return (
    <div className="w-full bg-white text-sm leading-normal">
      <KSELogoHeader />

      <h1 className="text-lg font-bold mb-2 text-center">Биржевой контракт №{data.id ?? '—'}</h1>
      <p className="text-center text-sm mb-4">
        <span className="text-foreground">Номер сделки: </span>
        <span className="font-semibold text-foreground">{data.id ?? '—'}</span>
      </p>

      {/* Блок 1: дата и время */}
      <Row2
        label1="Дата заключения сделки"
        value1={fmtDate(tradeDate)}
        label2="Время заключения сделки"
        value2={tradeTime}
      />

      <Gap />

      {/* Блок 2: Продавец */}
      <Row label="Участник торгов (Продавец / представитель Продавца)" value={data.sellerName || '—'} />
      <Row label="Счет списания ценных бумаг" value={data.sellAccount || '—'} />
      <Row label="Трейдер Участника торгов" value={data.sellerClientCode || '—'} />

      <Gap />

      {/* Блок 3: Покупатель */}
      <Row label="Участник торгов (Покупатель / представитель Покупателя)" value={data.buyerName || '—'} />
      <Row label="Счет зачисления ценных бумаг" value={data.buyAccount || '—'} />
      <Row label="Трейдер Участника торгов" value={data.buyerClientCode || '—'} />

      <Gap />

      {/* Блок 4: ЦБ */}
      <Row label="Вид ЦБ, эмитент ЦБ" value={data.className || data.classCode || '—'} />
      <Row label="Торговый символ ценной бумаги" value={data.secFullName || data.secCode || '—'} />
      <Row label="Ставка купона" value={couponVal} />

      <Gap />

      {/* Блок 5: сделка (3 двойных строки) */}
      <Row2
        label1="Количество ЦБ"
        value1={`${fmtNum(data.quantity, 2)} шт.`}
        label2="Дата исполнения сделки"
        value2={fmtDate(data.settleDate)}
      />
      <Row2
        label1="Цена за 1 ЦБ"
        value1={`${fmtNum(data.price, 2)} с.`}
        label2="Комиссионный сбор с Продавца"
        value2="—"
      />
      <Row2
        label1="Сумма сделки"
        value1={`${fmtNum(data.value, 2)} с.`}
        label2="Комиссионный сбор с Покупателя"
        value2="—"
      />

      <Gap />

      {/* Блок 6: подписи трейдеров — 50% / 50% */}
      <div className="flex items-end mt-1 mb-4">
        <div className="w-1/2 min-w-0 pr-4">
          <span className="text-foreground text-sm">Подпись трейдера Продавца</span>
          <span className="inline-block border-b border-foreground w-full max-w-[8rem] ml-2 mb-0.5" />
        </div>
        <div className="w-1/2 min-w-0">
          <span className="text-foreground text-sm">Подпись трейдера Покупателя</span>
          <span className="inline-block border-b border-foreground w-full max-w-[8rem] ml-2 mb-0.5" />
        </div>
      </div>

      {/* Юридический текст — по центру */}
      <p className="text-center text-sm leading-relaxed text-foreground font-bold">
        {LEGAL_TEXT}
      </p>

      {/* Подпись биржи */}
      <div className="mt-4 flex items-end gap-2">
        <span className="text-sm text-foreground shrink-0">Подпись уполномоченного лица ЗАО «Кыргызская Фондовая Биржа»</span>
        <span className="flex-1 border-b border-foreground mb-0.5" />
      </div>
    </div>
  );
}

export function ExchangeContractReport({ data }: { data: ExchangeContractData }) {
  return (
    <div className="w-full pb-6 print:max-w-none print:px-0">
      <OneContract data={data} />
      <div className="mt-10 pt-8 border-t-2 border-dashed border-gray-300">
        <OneContract data={data} />
      </div>
    </div>
  );
}

export default ExchangeContractReport;
