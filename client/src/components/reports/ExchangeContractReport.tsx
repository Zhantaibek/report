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
  /** НКД по сделке, сом (Trades.Accruedint). */
  accruedInt?: number | null;
  settleDate?: string | null;
  couponRate?: number | null;
  sellerCommission?: number | null;
  buyerCommission?: number | null;
}

function fmtNum(n: number | null | undefined, decimals = 8): string {
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

/** Разделитель между блоками (при печати растягивается). */
function Gap() {
  return <div className="print-gap mt-3" />;
}

const LEGAL_TEXT =
  'Настоящий Биржевой контракт удостоверяет факт заключения сделки купли-продажи ценных бумаг в ходе биржевых торгов, организованных ЗАО "Кыргызская Фондовая Биржа", а также определяет взаимные обязательства между Продавцом и Покупателем по исполнению этой сделки купли-продажи и обязательства Участников торгов по оплате комиссионного сбора в пользу ЗАО "Кыргызская Фондовая Биржа".';

function OneContract({
  data,
  contractTitle,
  showDealNumber,
}: {
  data: ExchangeContractData;
  contractTitle?: string;
  showDealNumber?: boolean;
}) {
  const tradeDate = data.tradeDate ?? '';
  const tradeTime = data.tradeDateTime ? fmtTime(data.tradeDateTime) : (tradeDate ? fmtTime(tradeDate) : '—');
  const couponVal = data.couponRate != null
    ? `${fmtNum(data.couponRate, 2)} %`
    : '0';
  const sellerComm = data.sellerCommission != null ? `${fmtNum(data.sellerCommission, 2)} с.` : '0 с.';
  const buyerComm = data.buyerCommission != null ? `${fmtNum(data.buyerCommission, 2)} с.` : '0 с.';
  const accruedInt = data.accruedInt ?? 0;
  const totalValue = data.value + accruedInt;

  return (
    <div className="print-duplex-copy w-full bg-white text-sm leading-normal">
      <div className="print-duplex-head">
        <KSELogoHeader />
        <h1 className={`text-lg font-bold text-center ${showDealNumber ? 'mb-2' : 'mb-4'}`}>
          {contractTitle ?? 'Биржевой контракт'} №{data.id ?? '—'}
        </h1>
        {showDealNumber && (
          <>
            <p className="text-center text-sm my-3">
              В ходе аукциона по первичному размещению ГЦБ, проводимого ЗАО «Кыргызская Фондовая Биржа», заключил следующую сделку:
            </p>
            <p className="text-center text-sm mb-4">
              <span className="text-foreground">Номер сделки: </span>
              <span className="font-semibold text-foreground">{data.id ?? '—'}</span>
            </p>
          </>
        )}
      </div>

      <div className="print-duplex-body">
        <Row2
          label1="Дата заключения сделки"
          value1={fmtDate(tradeDate)}
          label2="Время заключения сделки"
          value2={tradeTime}
        />

        <Gap />

        <Row label="Участник торгов (Продавец / представитель Продавца)" value={data.sellerName || '—'} />
        <Row label="Счет списания ценных бумаг" value={data.sellAccount || '—'} />
        <Row label="Трейдер Участника торгов" value={data.sellerClientCode || '—'} />

        <Gap />

        <Row label="Участник торгов (Покупатель / представитель Покупателя)" value={data.buyerName || '—'} />
        <Row label="Счет зачисления ценных бумаг" value={data.buyAccount || '—'} />
        <Row label="Трейдер Участника торгов" value={data.buyerClientCode || '—'} />

        <Gap />

        <Row label="Вид ЦБ, эмитент ЦБ" value={data.className || data.classCode || '—'} />
        <Row label="Торговый символ ценной бумаги" value={data.secFullName || data.secCode || '—'} />
        <Row label="Ставка купона" value={couponVal} />

        <Gap />

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
          value2={sellerComm}
        />
        <Row2
          label1="НКД (накопленный купонный доход)"
          value1={`${fmtNum(accruedInt, 2)} с.`}
          label2="Комиссионный сбор с Покупателя"
          value2={buyerComm}
        />
        <Row2
          label1="Сумма сделки (с учётом НКД)"
          value1={`${fmtNum(totalValue, 2)} с.`}
          label2=""
          value2=""
        />
      </div>

      <div className="print-duplex-foot">
        <div className="flex mb-4">
          <div className="w-1/2 flex items-end gap-2">
            <span className="text-sm text-foreground shrink-0">Подпись трейдера Продавца</span>
            <span className="flex-1 border-b border-foreground mb-0.5 min-w-0" />
          </div>
          <div className="w-1/2 flex items-end gap-2">
            <span className="text-sm text-foreground shrink-0">Подпись трейдера Покупателя</span>
            <span className="flex-1 border-b border-foreground mb-0.5 min-w-0" />
          </div>
        </div>

        <p className="text-center text-sm leading-relaxed text-foreground font-bold">
          {LEGAL_TEXT}
        </p>

        <div className="mt-4 flex items-end gap-2">
          <span className="text-sm text-foreground shrink-0">Подпись уполномоченного лица ЗАО «Кыргызская Фондовая Биржа»</span>
          <span className="flex-1 border-b border-foreground mb-0.5" />
        </div>
      </div>
    </div>
  );
}

export function ExchangeContractReport({
  data,
  contractTitle,
  showDealNumber = false,
}: {
  data: ExchangeContractData;
  contractTitle?: string;
  showDealNumber?: boolean;
}) {
  return (
    <div className="print-duplex-sheet w-full pb-6 print:max-w-none print:px-0 print:pb-0">
      <OneContract data={data} contractTitle={contractTitle} showDealNumber={showDealNumber} />
      <div className="print-duplex-sep mt-10 pt-8 border-t-2 border-dashed border-gray-300" aria-hidden />
      <OneContract data={data} contractTitle={contractTitle} showDealNumber={showDealNumber} />
    </div>
  );
}

export default ExchangeContractReport;
