import React from 'react';
import { type GoldContractRow, type OracleInstrument } from '../../api/reports.ts';
import { KSELogoHeader } from './KSELogoHeader';

interface ExchangeContractGoldProps {
  rows: GoldContractRow[];
  page: number;
  isPrinting: boolean;
  selectedOwnId?: number;
  oracleInstruments: OracleInstrument[];
}

interface ExchangeContractGoldData {
  serial: number;
  tradeDate: string;
  quantity: number;
  price: number;
  value: number;
  sellerName?: string | null;
  sellerAccount?: string | null;
  sellerTrader?: string | null;
  buyerName?: string | null;
  buyerAccount?: string | null;
  buyerTrader?: string | null;
  instrumentCode?: string;
  instrumentName?: string;
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
  'Настоящий Биржевой контракт удостоверяет факт заключения сделки купли-продажи золота в ходе биржевых торгов, организованных ЗАО "Кыргызская Фондовая Биржа", а также определяет взаимные обязательства между Продавцом и Покупателем по исполнению этой сделки и обязательства Участников торгов по оплате комиссионного сбора в пользу ЗАО "Кыргызская Фондовая Биржа".';

function OneGoldContract({ data }: { data: ExchangeContractGoldData }) {
  return (
    <div className="w-full bg-white text-sm leading-normal">
      <KSELogoHeader />

      <h1 className="text-lg font-bold mb-2 text-center">Биржевой контракт (золото) №{data.serial ?? '—'} </h1>
      <i>(в редакции решений Совета директоров ЗАО «КФБ» от 13 марта 2026 года)</i>
      <p className="text-center text-sm mb-4">
        <span className="text-foreground">Номер сделки: </span>
        <span className="font-semibold text-foreground">{data.serial ?? '—'}</span>
      </p>

      <Row2
        label1="Дата заключения сделки"
        value1={fmtDate(data.tradeDate)}
        label2="Актив"
        value2="Золото"
      />

      <Gap />

      <Row label="Участник торгов (Продавец)" value={data.sellerName || '—'} />
      <Row label="Счет Продавца" value={data.sellerAccount || '—'} />
      <Row label="Трейдер Продавца" value={data.sellerTrader || '—'} />

      <Gap />

      <Row label="Участник торгов (Покупатель)" value={data.buyerName || '—'} />
      <Row label="Счет Покупателя" value={data.buyerAccount || '—'} />
      <Row label="Трейдер Покупателя" value={data.buyerTrader || '—'} />

      <Gap />

      <Row label="Торговый символ инструмента" value={data.instrumentCode || '—'} />
      <Row label="Товарный инструмент" value={data.instrumentName || '—'} />

      <Gap />

      <Row2
        label1="Количество торгового инструмента"
        value1={`${fmtNum(data.quantity, 2)} гр.`}
        label2="Цена торгового инструмента"
        value2={`${fmtNum(data.price, 2)} с.`}
      />
      <Row
        label="Сумма сделки"
        value={`${fmtNum(data.value, 2)} с.`}
      />

      <Gap />

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
  );
}

export function ExchangeContractGold({
  rows,
  page,
  isPrinting,
  selectedOwnId,
  oracleInstruments,
}: ExchangeContractGoldProps) {
  const perPage = 1;
  const start = (page - 1) * perPage;
  const end = isPrinting ? rows.length : start + perPage;
  const paged = rows.slice(start, end);

  const instrumentName = selectedOwnId !== undefined
    ? (() => {
        const inv = oracleInstruments.find((i) => i.id === selectedOwnId);
        return inv ? (inv.extcode ? `${inv.extcode} — ${inv.namerus}` : inv.namerus) : undefined;
      })()
    : undefined;

  return (
    <>
      {paged.map((row, idx) => {
        const ext = row.sec_extcode?.trim();
        const issuer = row.issuer_namerus?.trim();
        const symbolFromOracle =
          ext && issuer ? `${ext} — ${issuer}` : ext || issuer || undefined;

        const data: ExchangeContractGoldData = {
          serial: row.serial,
          tradeDate: row.trade_date,
          quantity: row.quantity,
          price: row.price,
          value: row.value,
          sellerName: row.seller_name ?? null,
          buyerName: row.buyer_name ?? null,
          sellerAccount: row.sell_account ?? null,
          buyerAccount: row.buy_account ?? null,
          sellerTrader: row.seller_trader ?? null,
          buyerTrader: row.buyer_trader ?? null,
          instrumentCode: ext ?? instrumentName ?? '',
          instrumentName: symbolFromOracle ?? instrumentName ?? issuer ?? undefined,
        };

        return (
          <div key={`gold-contract-${row.serial}-${page}`} className={idx === 0 ? 'mt-6' : 'mt-10 print:break-before-page'}>
            <div className="w-full pb-6 print:max-w-none print:px-0">
              <OneGoldContract data={data} />
              <div className="mt-10 pt-8 border-t-2 border-dashed border-gray-300">
                <OneGoldContract data={data} />
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

export default ExchangeContractGold;
