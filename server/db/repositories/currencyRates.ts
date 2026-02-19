import { getDb } from '../index.js';

export interface CurrencyRateRow {
  id: number;
  currency_code: string;
  rate_date: string;   // YYYY-MM-DD
  rate: number;
  updated_at: string;
}

/** Все сохранённые курсы, новые сначала */
export async function getCurrencyRates(): Promise<CurrencyRateRow[]> {
  const res = await getDb().query(
    'SELECT * FROM currency_rates ORDER BY rate_date DESC, currency_code'
  );
  return res.rows as CurrencyRateRow[];
}

/** Последний курс по каждой валюте */
export async function getLatestCurrencyRates(): Promise<CurrencyRateRow[]> {
  const res = await getDb().query(`
    SELECT DISTINCT ON (currency_code) *
    FROM currency_rates
    ORDER BY currency_code, rate_date DESC
  `);
  return res.rows as CurrencyRateRow[];
}

/** Курс за конкретный код (последний) */
export async function getCurrencyRateByCode(currencyCode: string): Promise<CurrencyRateRow | undefined> {
  const res = await getDb().query(
    `SELECT * FROM currency_rates WHERE currency_code = $1 ORDER BY rate_date DESC LIMIT 1`,
    [currencyCode]
  );
  return res.rows[0] as CurrencyRateRow | undefined;
}

/** Вставка / обновление курса за конкретную дату */
export async function upsertCurrencyRate(
  currencyCode: string,
  rate: number,
  rateDate?: string   // YYYY-MM-DD; если не передана — сегодня
): Promise<void> {
  const date = rateDate ?? new Date().toISOString().slice(0, 10);
  await getDb().query(
    `INSERT INTO currency_rates (currency_code, rate_date, rate, updated_at)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
     ON CONFLICT (currency_code, rate_date)
     DO UPDATE SET rate = EXCLUDED.rate, updated_at = CURRENT_TIMESTAMP`,
    [currencyCode, date, rate]
  );
}

/** Курс за дату или ближайший предыдущий (для расчётов в отчётах) */
export async function getCurrencyRateForDate(
  currencyCode: string,
  date: string   // YYYY-MM-DD
): Promise<CurrencyRateRow | undefined> {
  const res = await getDb().query(
    `SELECT * FROM currency_rates
     WHERE currency_code = $1 AND rate_date <= $2
     ORDER BY rate_date DESC
     LIMIT 1`,
    [currencyCode, date]
  );
  return res.rows[0] as CurrencyRateRow | undefined;
}
