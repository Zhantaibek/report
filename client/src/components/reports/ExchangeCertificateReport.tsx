/**
 * Биржевое свидетельство — структура по макету: участник/трейдер, вводный текст, данные в две колонки, юридический текст, подпись.
 */
import React from 'react';
import { cn } from '../../lib/utils';
import { KSELogoHeader } from './KSELogoHeader';

export interface ExchangeCertificateData {
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
  yield?: number | null;
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

function Row({ label, value, valueBold = true }: { label: string; value: React.ReactNode; valueBold?: boolean }) {
  return (
    <div className="flex items-baseline leading-snug py-[1px]">
      <span className="w-1/2 min-w-0 pr-2 text-foreground">{label}</span>
      <span className={cn('w-1/2 min-w-0 text-foreground', valueBold && 'font-semibold')}>{value ?? '—'}</span>
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

const LEGAL_TEXT_1 =
  'Настоящее биржевое свидетельство подтверждает факт регистрации данной сделки в торговой системе ЗАО "Кыргызская Фондовая Биржа".';
const LEGAL_TEXT_2 =
  'Настоящее биржевое свидетельство определяет обязательства Участника торгов по оплате комиссионного сбора в пользу ЗАО "Кыргызская Фондовая Биржа".';

function OneCertificate({
  data,
  showDealNumber,
}: {
  data: ExchangeCertificateData;
  showDealNumber?: boolean;
}) {
  const tradeDate = data.tradeDate ?? '';
  const tradeTime = data.tradeDateTime ? fmtTime(data.tradeDateTime) : (tradeDate ? fmtTime(tradeDate) : '—');
  const couponVal = data.couponRate != null ? `${fmtNum(data.couponRate, 0)} %` : '—';
  const yieldVal = data.yield != null ? `${fmtNum(data.yield, 2)} %` : '%';
  const sellerComm = data.sellerCommission != null ? `${fmtNum(data.sellerCommission, 2)} с.` : '0 с.';
  const buyerComm = data.buyerCommission != null ? `${fmtNum(data.buyerCommission, 2)} с.` : '0 с.';

  return (
    <div className="print-duplex-copy w-full bg-white text-sm leading-normal">
      <div className="print-duplex-head">
        <KSELogoHeader />
        <h1 className="text-lg font-bold mb-4 text-center">Биржевое свидетельство №{data.id ?? '—'}</h1>
        {showDealNumber && (
          <>
            <p className="text-center text-sm my-3">
              В ходе аукциона по первичному размещению ГЦБ, проводимого ЗАО «Кыргызская Фондовая Биржа», заключил следующую сделку:
            </p>
            <p className="text-center text-sm mb-1">
              <span className="text-foreground">Номер сделки: </span>
              <span className="font-semibold text-foreground">{data.id ?? '—'}</span>
            </p>
          </>
        )}
      </div>

      <div className="print-duplex-body">
        <Row2
          label1="Дата заключения сделки:"
          value1={fmtDate(tradeDate)}
          label2="Время заключения сделки:"
          value2={tradeTime}
        />

        <Row label="Участник торгов (Продавец / представитель Продавца):" value={data.sellerName ?? '—'} />
        <Row label="Счет списания ценных бумаг:" value={data.sellAccount ?? '—'} />
        <Row label="Трейдер Участника торгов:" value={data.sellerClientCode ?? '—'} />

        <Gap />

        <Row label="Участник торгов (Покупатель/представитель):" value={data.buyerName ?? '—'} />
        <Row label="Счет зачисления ценных бумаг:" value={data.buyAccount ?? '—'} />
        <Row label="Трейдер Участника торгов:" value={data.buyerClientCode ?? '—'} />

        <Gap />

        <Row label="Вид ЦБ, эмитент ЦБ:" value={data.secFullName ?? data.className ?? data.classCode ?? '—'} />
        <Row label="Торговый символ ценной бумаги:" value={data.secCode ?? '—'} />
        <Row label="Ставка купона:" value={couponVal} />

        <div className="flex">
          <div className="w-1/2 min-w-0">
            <Row label="Количество ЦБ:" value={`${data.quantity.toLocaleString('ru-RU')} шт.`} />
            <Row label="Цена за 1 ЦБ:" value={`${fmtNum(data.price, 2)} с.`} />
            <Row label="Доходность:" value={yieldVal} />
            <Row label="Сумма сделки:" value={`${fmtNum(data.value, 2)} с.`} />
          </div>
          <div className="w-1/2 min-w-0">
            <Row label="Дата исполнения сделки:" value={fmtDate(data.settleDate)} />
            <Row label="Комиссионный сбор с Продавца:" value={sellerComm} />
            <Row label="Комиссионный сбор с Покупателя:" value={buyerComm} />
          </div>
        </div>
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

        <p className="text-center text-sm leading-relaxed text-foreground font-bold mb-2">
          {LEGAL_TEXT_1}
        </p>
        <p className="text-center text-sm leading-relaxed text-foreground font-bold mb-4">
          {LEGAL_TEXT_2}
        </p>

        <div className="flex items-end gap-2">
          <span className="text-sm text-foreground shrink-0">Подпись уполномоченного лица ЗАО «Кыргызская Фондовая Биржа»</span>
          <span className="flex-1 border-b border-foreground mb-0.5" />
          <span className="text-sm shrink-0 ml-2">М.П.</span>
        </div>
      </div>
    </div>
  );
}

export function ExchangeCertificateReport({
  data,
  showDealNumber = false,
}: {
  data: ExchangeCertificateData;
  showDealNumber?: boolean;
}) {
  return (
    <div className="print-duplex-sheet w-full pb-6 print:max-w-none print:px-0 print:pb-0">
      <OneCertificate data={data} showDealNumber={showDealNumber} />
      <div className="print-duplex-sep mt-10 pt-8 border-t-2 border-dashed border-gray-300" aria-hidden />
      <OneCertificate data={data} showDealNumber={showDealNumber} />
    </div>
  );
}

export default ExchangeCertificateReport;
