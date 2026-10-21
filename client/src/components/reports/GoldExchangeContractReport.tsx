/**
 * Биржевой контракт по золоту (данные QUIK, класс драгметаллов).
 * Метка + значение (жирный), блоки через пустую строку, два экземпляра на листе.
 */
import React from 'react';
import { KSELogoHeader } from './KSELogoHeader';

export interface GoldExchangeContractData {
  id: string | number;
  tradeDate: string;
  tradeDateTime?: string | null;
  secCode?: string;
  secFullName?: string;
  sellerName?: string | null;
  sellAccount?: string | null;
  sellerTrader?: string | null;
  buyerName?: string | null;
  buyAccount?: string | null;
  buyerTrader?: string | null;
  quantity: number;
  price: number;
  value: number;
  settleDate?: string | null;
  sellerCommission?: number | null;
  buyerCommission?: number | null;
}

function fmtNum(n: number | null | undefined, decimals = 2): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString('ru-RU', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  const s = String(d).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const [y, m, day] = s.split('-');
  return `${day}.${m}.${y}`;
}

function fmtTime(d: string | null | undefined): string {
  if (!d) return '—';
  const match = String(d).match(/(\d{2}:\d{2}:\d{2})/);
  return match ? match[1] : '—';
}

function Row({ label, value, bold }: { label: string; value: React.ReactNode; bold?: boolean }) {
  return (
    <div className="flex items-baseline leading-snug py-[1px]">
      <span className={`w-1/2 min-w-0 pr-2 text-foreground ${bold ? 'font-bold' : ''}`}>{label}</span>
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
  return <div className="print-gap mt-3" />;
}

function Signature({ label }: { label: string }) {
  return (
    <div className="flex items-end gap-2 mb-3">
      <span className="text-sm text-foreground shrink-0">{label}</span>
      <span className="flex-1 border-b border-foreground mb-0.5 min-w-0" />
    </div>
  );
}

const LEGAL_TEXT =
  'Настоящий Биржевой контракт удостоверяет факт заключения сделки купли-продажи драгоценных металлов в ходе биржевых торгов, организованных ЗАО "Кыргызская фондовая биржа", а также определяет взаимные обязательства между продавцом и покупателем по исполнению этой сделки купли-продажи и обязательства Участников торгов по оплате комиссионного сбора в пользу ЗАО "Кыргызская фондовая биржа".';

function OneGoldContract({ data }: { data: GoldExchangeContractData }) {
  const tradeTime = fmtTime(data.tradeDateTime ?? data.tradeDate);
  const sellerComm = `${fmtNum(data.sellerCommission ?? 0)} с.`;
  const buyerComm = `${fmtNum(data.buyerCommission ?? 0)} с.`;

  return (
    <div className="print-duplex-copy w-full bg-white text-sm leading-normal">
      <div className="print-duplex-head">
        <KSELogoHeader />
        <h1 className="text-lg font-bold text-center mb-1">БИРЖЕВОЙ КОНТРАКТ №{data.id ?? '—'}</h1>
        <p className="text-center text-sm italic mb-3">
          (в редакции решений Совета директоров ЗАО «КФБ» от 13 марта 2026 года)
        </p>
        <p className="text-sm font-bold mb-3">г. Бишкек</p>
      </div>

      <div className="print-duplex-body">
        <Row label="Номер сделки" value={data.id ?? '—'} />
        <Row2
          label1="Дата заключения сделки"
          value1={fmtDate(data.tradeDate)}
          label2="Время заключения сделки"
          value2={tradeTime}
        />

        <Gap />

        <Row label="Участник торгов (Продавец)" value={data.sellerName || '—'} bold />
        <Row label="Счет Продавца" value={data.sellAccount || '—'} />
        <Row label="Трейдер Продавца" value={data.sellerTrader || '—'} />

        <Gap />

        <Row label="Участник торгов (Покупатель)" value={data.buyerName || '—'} bold />
        <Row label="Счет Покупателя" value={data.buyAccount || '—'} />
        <Row label="Трейдер Покупателя" value={data.buyerTrader || '—'} />

        <Gap />

        <Row label="Торговый инструмент" value={data.secFullName || '—'} />
        <Row label="Торговый символ торгового инструмента" value={data.secCode || '—'} />
        <Row label="Количество торгового инструмента" value={`${fmtNum(data.quantity, 0)} шт.`} />
        <Row label="Цена торгового инструмента" value={`${fmtNum(data.price)} с.`} />
        <Row label="Сумма сделки" value={`${fmtNum(data.value)} с.`} />
        <Row label="Дата исполнения сделки" value={fmtDate(data.settleDate)} />

        <Gap />

        <Row label="Комиссионный сбор с Продавца" value={sellerComm} />
        <Row label="Комиссионный сбор с Покупателя" value={buyerComm} />
      </div>

      <div className="print-duplex-foot mt-6">
        <Signature label="Подпись трейдера Участника торгов (представителя Продавца)" />
        <Signature label="Подпись трейдера Участника торгов (представителя Покупателя)" />

        <p className="mt-4 text-justify text-sm leading-relaxed text-foreground">
          {LEGAL_TEXT}
        </p>
      </div>
    </div>
  );
}

export function GoldExchangeContractReport({ data }: { data: GoldExchangeContractData }) {
  return (
    <div className="print-duplex-sheet w-full pb-6 print:max-w-none print:px-0 print:pb-0">
      <OneGoldContract data={data} />
      <div className="print-duplex-sep mt-10 pt-8 border-t-2 border-dashed border-gray-300" aria-hidden />
      <OneGoldContract data={data} />
    </div>
  );
}

export default GoldExchangeContractReport;
