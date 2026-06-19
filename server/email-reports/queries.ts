import { getQuikConnectionConfig } from '../config/quik-db.js';
import { queryPostgres } from '../data-sources/postgres.js';

/** Заявки за день: покупка/продажа в отдельных колонках (таблица Orders в QUIK Export). */
export const dailyOrdersSql = `
WITH
orders_dedup AS (
  SELECT DISTINCT ON (o."OrderNum")
    o.*
  FROM "Orders" o
  WHERE o."TradeDate"::date BETWEEN $1::date AND $2::date
  ORDER BY o."OrderNum", o."OrderDateTime" DESC
),
securities_dedup AS (
  SELECT
    s."SecCode",
    MAX(NULLIF(TRIM(s."SecFullName"), '')) AS "SecFullName"
  FROM "Securities" s
  GROUP BY s."SecCode"
)
SELECT
  COALESCE(sec."SecFullName", d."SecCode") AS sec_name,
  CASE WHEN d."Operation" IN ('Купля', 'Покупка') THEN d."Qty" END AS buy_qty,
  CASE WHEN d."Operation" IN ('Купля', 'Покупка') THEN d."Price" END AS buy_price,
  CASE WHEN d."Operation" = 'Продажа' THEN d."Qty" END AS sell_qty,
  CASE WHEN d."Operation" = 'Продажа' THEN d."Price" END AS sell_price,
  to_char(d."OrderDateTime", 'DD.MM.YYYY HH24:MI:SS') AS order_datetime
FROM orders_dedup d
LEFT JOIN securities_dedup sec ON sec."SecCode" = d."SecCode"
ORDER BY d."OrderDateTime", d."OrderNum"
`.trim();

/** Свод по сделкам за день: агрегация по коду ЦБ. */
export const dailyTradesSql = `
WITH
buy_trades AS (
  SELECT DISTINCT ON (t."TradeNum")
    t.*
  FROM "Trades" t
  WHERE t."Operation" = 'Купля'
    AND t."TradeDate"::date BETWEEN $1::date AND $2::date
  ORDER BY t."TradeNum", t."TradeDate" DESC
),
securities_dedup AS (
  SELECT
    s."SecCode",
    MAX(NULLIF(TRIM(s."SecFullName"), '')) AS "SecFullName"
  FROM "Securities" s
  GROUP BY s."SecCode"
),
classes_dedup AS (
  SELECT
    c."ClassCode",
    MAX(NULLIF(TRIM(c."ClassName"), '')) AS "ClassName"
  FROM "Classes" c
  GROUP BY c."ClassCode"
)
SELECT
  MAX(COALESCE(sec."SecFullName", b."SecCode")) AS sec_name,
  MAX(COALESCE(cl."ClassName", b."ClassCode")) AS sec_type,
  COUNT(DISTINCT b."TradeNum")::bigint AS deal_count,
  ROUND(SUM(b."Qty"), 0) AS qty,
  MAX(b."Price") AS max_price,
  MIN(b."Price") AS min_price,
  ROUND(SUM(b."Price" * b."Qty") / NULLIF(SUM(b."Qty"), 0), 2) AS avg_price,
  ROUND(SUM(b."Value"), 2) AS volume
FROM buy_trades b
LEFT JOIN classes_dedup cl ON cl."ClassCode" = b."ClassCode"
LEFT JOIN securities_dedup sec ON sec."SecCode" = b."SecCode"
GROUP BY b."SecCode", b."ClassCode"
ORDER BY MAX(COALESCE(cl."ClassName", b."ClassCode")), MAX(COALESCE(sec."SecFullName", b."SecCode"))
`.trim();

export async function fetchDailyOrders(
  reportDate: string,
): Promise<Record<string, unknown>[]> {
  const cfg = getQuikConnectionConfig();
  if (!cfg) throw new Error('QUIK Export не настроен');
  return queryPostgres(cfg, dailyOrdersSql, [reportDate, reportDate]);
}

export async function fetchDailyTrades(
  reportDate: string,
): Promise<Record<string, unknown>[]> {
  const cfg = getQuikConnectionConfig();
  if (!cfg) throw new Error('QUIK Export не настроен');
  return queryPostgres(cfg, dailyTradesSql, [reportDate, reportDate]);
}
