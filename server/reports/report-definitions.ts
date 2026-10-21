/**
 * Определения форм отчетов с SQL-запросами
 */

export interface ReportDefinition {
  code: string;
  name: string;
  description: string;
  type: 'table' | 'summary' | 'chart';
  category: string; // Категория отчета для группировки
  singleDate?: boolean; // Если true, требуется только одна дата вместо диапазона
  sql?: string;
}

function normalizeReportCode(code: string): string {
  return code.trim().toLowerCase();
}

/** $3 — ClassCode[], $4 — SecCode[] (ILIKE any), $5 — FirmId[], NULL = без фильтра. */
const TRADES_CLASS_FILTER = '($3::text[] IS NULL OR t."ClassCode" = ANY($3))';
const TRADES_INSTRUMENT_FILTER =
  '($4::text[] IS NULL OR EXISTS (SELECT 1 FROM unnest($4::text[]) AS pat WHERE t."SecCode" ILIKE \'%\' || pat || \'%\'))';
const TRADES_FIRM_FILTER = '($5::text[] IS NULL OR t."FirmId"::text = ANY($5))';
const TRADES_OPTIONAL_FILTERS = `${TRADES_CLASS_FILTER}\n    AND ${TRADES_INSTRUMENT_FILTER}`;
const TRADES_OPTIONAL_FILTERS_WITH_FIRM = `${TRADES_OPTIONAL_FILTERS}\n    AND ${TRADES_FIRM_FILTER}`;
const SEC_CLASS_FILTER = '($3::text[] IS NULL OR sec."ClassCode" = ANY($3))';
const SEC_INSTRUMENT_FILTER =
  '($4::text[] IS NULL OR EXISTS (SELECT 1 FROM unnest($4::text[]) AS pat WHERE sec."SecCode" ILIKE \'%\' || pat || \'%\'))';

/**
 * CTE: одна строка на TradeNum для ноги сделки.
 * В Trades на один TradeNum две строки (Купля и Продажа) — всегда фильтровать Operation
 * и применять DISTINCT ON; после join buy+sell — снова DISTINCT ON в matched_trades.
 *
 * firmFilter: только для отчётов по одной ноге (Купля). Для buy+sell не включать —
 * иначе останутся лишь сделки, где обе стороны = выбранный участник.
 */
function cteDedupTradeLeg(
  alias: string,
  operation: 'Купля' | 'Продажа',
  dateBetween: string,
  firmFilter = false,
): string {
  const filters = firmFilter ? TRADES_OPTIONAL_FILTERS_WITH_FIRM : TRADES_OPTIONAL_FILTERS;
  return `${alias} AS (
  SELECT DISTINCT ON (t."TradeNum")
    t.*
  FROM "Trades" t
  WHERE t."Operation" = '${operation}'
    AND ${dateBetween}
    AND ${filters}
  ORDER BY t."TradeNum", t."TradeDate" DESC
)`;
}

/** Одна строка на FirmId (в справочнике возможны дубли). */
function cteFirmsDedup(alias = 'firms_dedup'): string {
  return `${alias} AS (
  SELECT
    f."FirmId",
    MAX(NULLIF(TRIM(f."FirmName"), '')) AS "FirmName"
  FROM "Firms" f
  GROUP BY f."FirmId"
)`;
}

/** Одна строка на ClassCode. */
function cteClassesDedup(alias = 'classes_dedup'): string {
  return `${alias} AS (
  SELECT
    c."ClassCode",
    MAX(NULLIF(TRIM(c."ClassName"), '')) AS "ClassName"
  FROM "Classes" c
  GROUP BY c."ClassCode"
)`;
}

/** Одна строка на SecCode. */
function cteSecuritiesDedup(alias = 'securities_dedup'): string {
  return `${alias} AS (
  SELECT
    s."SecCode",
    MAX(NULLIF(TRIM(s."SecFullName"), '')) AS "SecFullName",
    MAX(NULLIF(TRIM(s."ISINCode"), '')) AS "ISINCode",
    MAX(s."ClassCode") AS "ClassCode",
    MAX(s."FaceValue") AS "FaceValue",
    MAX(s."CouponValue") AS "CouponValue",
    MAX(s."CouponPeriod") AS "CouponPeriod"
  FROM "Securities" s
  GROUP BY s."SecCode"
)`;
}

/** CTE: одна строка на TradeNum после join Купля+Продажа (без JOIN справочников). */
function cteMatchedTrades(alias = 'matched_trades'): string {
  return `${alias} AS (
  SELECT DISTINCT ON (b."TradeNum")
    b."TradeNum",
    b."TradeDate"::date AS d,
    b."FirmId" AS buyer_firm_id,
    COALESCE(NULLIF(TRIM(bf."FirmName"), ''), NULLIF(TRIM(b."FirmName"), '')) AS buyer_name,
    s."FirmId" AS seller_firm_id,
    COALESCE(NULLIF(TRIM(sf."FirmName"), ''), NULLIF(TRIM(s."FirmName"), '')) AS seller_name,
    b."SecCode" AS sec_code,
    b."Qty" AS qty,
    b."Price" AS price,
    b."Value" AS value,
    b."ClassCode" AS class_code
  FROM buy_trades b
  JOIN sell_trades s ON b."TradeNum" = s."TradeNum"
  LEFT JOIN firms_dedup bf ON bf."FirmId" = b."FirmId"
  LEFT JOIN firms_dedup sf ON sf."FirmId" = s."FirmId"
  ORDER BY b."TradeNum", b."TradeDate" DESC
)`;
}

/** Дата T+N рабочих дней по SettleCode (T0/T1/T2). Сб/Вс пропускаются. */
function sqlSettleBusinessDate(dateExpr: string, settleCodeExpr: string): string {
  const n = `COALESCE(NULLIF(regexp_replace(COALESCE(${settleCodeExpr}, 'T0'), '[^0-9]', '', 'g'), ''), '0')::int`;
  return `(
    SELECT x.d
    FROM (
      SELECT gs::date AS d,
             row_number() OVER (ORDER BY gs) - 1 AS rn
      FROM generate_series(
        (${dateExpr})::date,
        (${dateExpr})::date + ((${n}) * 2 + 10),
        interval '1 day'
      ) AS gs
      WHERE EXTRACT(ISODOW FROM gs) BETWEEN 1 AND 5
    ) x
    WHERE x.rn = (${n})
    LIMIT 1
  )`;
}

const TRADES_DATE_BETWEEN = 't."TradeDate" BETWEEN $1 AND $2';
const TRADES_DATE_BETWEEN_COALESCE = 't."TradeDate" BETWEEN $1 AND COALESCE($2, $1)';
const TRADES_DATE_BETWEEN_COALESCE_DATE = 't."TradeDate" BETWEEN $1::date AND COALESCE($2::date, $1::date)';

/**
 * Базовый SQL-запрос для получения уникальных сделок.
 * Продавец/покупатель через JOIN по Operation (Купля/Продажа).
 *
 * Экспортируется, т.к. используется также в dashboard‑эндпоинтах.
 */
export const baseTradesQuery = `
WITH
${cteDedupTradeLeg('buy_trades', 'Купля', TRADES_DATE_BETWEEN)},
${cteDedupTradeLeg('sell_trades', 'Продажа', TRADES_DATE_BETWEEN)},
${cteFirmsDedup()},
${cteClassesDedup()},
${cteSecuritiesDedup()}
SELECT DISTINCT ON (b."TradeNum")
  b."TradeNum" AS "id",
  b."FirmId"   AS "buyerId",
  COALESCE(NULLIF(TRIM(bf."FirmName"), ''), b."FirmName") AS "buyerName",
  s."FirmId"   AS "sellerId",
  COALESCE(NULLIF(TRIM(sf."FirmName"), ''), s."FirmName") AS "sellerName",
  s."FirmId"   AS "brokerCode",
  COALESCE(NULLIF(TRIM(sf."FirmName"), ''), s."FirmName") AS "brokerName",
  b."FirmId"   AS "counterparty",
  COALESCE(NULLIF(TRIM(bf."FirmName"), ''), b."FirmName") AS "counterpartyName",
  b."ClassCode" AS "classCode",
  COALESCE(cl."ClassName", b."ClassCode") AS "className",
  b."SecCode" AS "secCode",
  sec."SecFullName" AS "secFullName",
  sec."ISINCode" AS "isinCode",
  to_char(b."TradeDate", 'YYYY-MM-DD') AS "tradeDate",
  to_char(b."SettleDate", 'YYYY-MM-DD') AS "settleDate",
  b."Price" AS "price",
  b."Qty" AS "quantity",
  b."Value" AS "value",
  COALESCE(b."Accruedint", s."Accruedint", 0) AS "accruedInt"
FROM buy_trades b
JOIN sell_trades s ON b."TradeNum" = s."TradeNum"
LEFT JOIN firms_dedup bf ON bf."FirmId" = b."FirmId"
LEFT JOIN firms_dedup sf ON sf."FirmId" = s."FirmId"
LEFT JOIN classes_dedup cl ON cl."ClassCode" = b."ClassCode"
LEFT JOIN securities_dedup sec ON sec."SecCode" = b."SecCode"
ORDER BY b."TradeNum", b."TradeDate" DESC
`.trim();

/**
 * SQL для Формы 9 - Ведомость заключенных сделок
 * Купля/Продажа через JOIN; справочники через *_dedup.
 */
const form9Query = `
WITH
${cteDedupTradeLeg('buy_trades', 'Купля', TRADES_DATE_BETWEEN_COALESCE)},
${cteDedupTradeLeg('sell_trades', 'Продажа', TRADES_DATE_BETWEEN_COALESCE)},
${cteFirmsDedup()},
${cteClassesDedup()},
${cteSecuritiesDedup()}
SELECT DISTINCT ON (b."TradeNum")
  b."TradeNum" AS "id",
  b."ClassCode" AS "classCode",
  COALESCE(c."ClassName", b."ClassCode") AS "className",
  b."SecCode" AS "secCode",
  to_char(b."TradeDate", 'YYYY-MM-DD') AS "tradeDate",
  b."FirmId" AS "buyerFirmId",
  s."FirmId" AS "sellerFirmId",
  s."FirmId" AS "brokerCode",
  COALESCE(NULLIF(TRIM(sf."FirmName"), ''), NULLIF(TRIM(s."FirmName"), '')) AS "sellerName",
  s."Account" AS "sellAccount",
  COALESCE(NULLIF(TRIM(bf."FirmName"), ''), NULLIF(TRIM(b."FirmName"), '')) AS "buyerName",
  b."Account" AS "buyAccount",
  b."Qty" AS "quantity",
  b."Value" AS "value",
  COALESCE(b."Accruedint", s."Accruedint", 0) AS "accruedInt",
  sec."SecFullName" AS "secFullName"
FROM buy_trades b
JOIN sell_trades s ON b."TradeNum" = s."TradeNum"
LEFT JOIN firms_dedup bf ON bf."FirmId" = b."FirmId"
LEFT JOIN firms_dedup sf ON sf."FirmId" = s."FirmId"
LEFT JOIN classes_dedup c ON c."ClassCode" = b."ClassCode"
LEFT JOIN securities_dedup sec ON sec."SecCode" = b."SecCode"
ORDER BY b."TradeNum", b."TradeDate" DESC
`.trim();

/**
 * SQL для отчета по аукциону - детализация по ценам
 * Особенности:
 * - Группирует заявки по цене для нижней таблицы
 * - Агрегирует количество, номинал, доходность
 * - Также возвращает общую информацию из Securities
 */
const auctionSummaryQuery = `
WITH
${cteDedupTradeLeg('buy_trades', 'Купля', TRADES_DATE_BETWEEN_COALESCE, true)},
${cteSecuritiesDedup()},
${cteClassesDedup()},
orders_dedup AS (
  SELECT DISTINCT ON (o."OrderNum")
    o."OrderNum",
    o."SecCode",
    o."FirmId"
  FROM "Orders" o
  WHERE o."TradeDate" BETWEEN $1 AND COALESCE($2, $1)
    AND o."Operation" IN ('Купля', 'Покупка')
    AND ${TRADES_OPTIONAL_FILTERS_WITH_FIRM.replace(/t\./g, 'o.')}
  ORDER BY o."OrderNum", o."OrderDateTime" DESC
),
participants_by_sec AS (
  SELECT
    "SecCode",
    COUNT(DISTINCT "FirmId")::int AS "participantCount"
  FROM orders_dedup
  WHERE "FirmId" IS NOT NULL AND TRIM("FirmId"::text) <> ''
  GROUP BY "SecCode"
)
SELECT
  ROUND(b."Price", 2) AS "price",
  b."SecCode" AS "secCode",
  to_char(MAX(b."TradeDate"), 'YYYY-MM-DD') AS "tradeDate",
  MAX(b."ClassCode") AS "classCode",
  MAX(COALESCE(cl."ClassName", b."ClassCode")) AS "className",
  SUM(b."Qty" * COALESCE(s."FaceValue", 1)) AS "nominalSum",
  SUM(b."Qty" * b."Price") AS "valueActual",
  ROUND(AVG(COALESCE(b."Yield", 0)), 2) AS "yieldPercent",
  ROUND(AVG(COALESCE(b."Yield", 0)), 2) AS "yieldByPrice",
  SUM(b."Qty") AS "totalQty",
  MAX(s."SecFullName") AS "secFullName",
  COALESCE(MAX(p."participantCount"), 0) AS "participantCount",
  CASE 
    WHEN b."Price" > 0 THEN 'Конкурентная'
    ELSE 'Неконкурентная'
  END AS "bidType"
FROM buy_trades b
LEFT JOIN securities_dedup s ON s."SecCode" = b."SecCode"
LEFT JOIN classes_dedup cl ON cl."ClassCode" = b."ClassCode"
LEFT JOIN participants_by_sec p ON p."SecCode" = b."SecCode"
GROUP BY b."Price", b."SecCode", 
  CASE 
    WHEN b."Price" > 0 THEN 'Конкурентная'
    ELSE 'Неконкурентная'
  END
ORDER BY b."Price" DESC
`.trim();
/**
 * Вторая сводная ведомость — сравнение текущего и предыдущего аукциона.
 * Одна дата: $1 = дата текущего аукциона (приложение передаёт также $2 = dateTo, используем COALESCE($1,$2)).
 */
const AUCTION2_DATE_FILTER = 't."TradeDate"::date <= (COALESCE($1, $2))::date';
const AUCTION_SINGLE_DATE_FILTER = 't."TradeDate"::date = (COALESCE($1, $2))::date';
const auctionSummary2Query = `
WITH
${cteDedupTradeLeg('buy_trades', 'Купля', AUCTION2_DATE_FILTER, true)},
${cteSecuritiesDedup()},

-- Доходность при макс/мин цене за один проход
ranked AS (
    SELECT
        "TradeDate", "SecCode", "Price", "Yield",
        ROW_NUMBER() OVER (PARTITION BY "TradeDate", "SecCode" ORDER BY "Price" DESC NULLS LAST) AS rn_desc,
        ROW_NUMBER() OVER (PARTITION BY "TradeDate", "SecCode" ORDER BY "Price" ASC NULLS FIRST) AS rn_asc
    FROM buy_trades
),
yield_at_prices AS (
    SELECT
        "TradeDate",
        "SecCode",
        MAX(CASE WHEN rn_desc = 1 THEN "Yield" END) AS yield_by_max_price,
        MAX(CASE WHEN rn_asc = 1 THEN "Yield" END) AS yield_by_cutoff_price
    FROM ranked
    GROUP BY "TradeDate", "SecCode"
),

auctions AS (
    SELECT
        a."TradeDate",
        a."SecCode",
        ROUND(SUM(a."Qty" * COALESCE(s."FaceValue", 1)) / 1000, 2) AS offer_volume,
        ROUND(SUM(a."Qty" * COALESCE(s."FaceValue", 1)) / 1000, 2) AS demand_volume,
        ROUND(SUM(a."Qty" * COALESCE(s."FaceValue", 1)) / 1000, 2) AS placement_volume,
        ROUND(SUM(a."Qty" * a."Price") / NULLIF(SUM(a."Qty"), 0), 2) AS avg_price,
        ROUND(SUM(a."Qty" * COALESCE(a."Yield", 0)) / NULLIF(SUM(a."Qty"), 0), 2) AS avg_yield,
        MAX(a."Price") AS max_price,
        y.yield_by_max_price,
        MIN(a."Price") AS cutoff_price,
        y.yield_by_cutoff_price
    FROM buy_trades a
    LEFT JOIN securities_dedup s ON s."SecCode" = a."SecCode"
    LEFT JOIN yield_at_prices y ON y."TradeDate" = a."TradeDate" AND y."SecCode" = a."SecCode"
    GROUP BY a."TradeDate", a."SecCode", y.yield_by_max_price, y.yield_by_cutoff_price
),

orders_agg AS (
    SELECT
        o."TradeDate",
        o."SecCode",
        SUM(CASE WHEN o."Price" > 0 THEN o."Qty" ELSE 0 END) AS qty_competitive,
        SUM(CASE WHEN o."Price" > 0 THEN o."Qty" * COALESCE(s."FaceValue", 1) ELSE 0 END) AS value_nominal_competitive,
        SUM(CASE WHEN o."Price" > 0 THEN o."Value" ELSE 0 END) AS value_actual_competitive,
        ROUND(AVG(CASE WHEN o."Price" > 0 THEN o."Price" END), 2) AS avg_price_competitive,
        ROUND(AVG(CASE WHEN o."Price" > 0 THEN o."Yield" END), 2) AS avg_yield_competitive,
        SUM(CASE WHEN o."Price" = 0 THEN o."Qty" ELSE 0 END) AS qty_non_competitive,
        SUM(CASE WHEN o."Price" = 0 THEN o."Qty" * COALESCE(s."FaceValue", 1) ELSE 0 END) AS value_nominal_non_competitive,
        SUM(CASE WHEN o."Price" = 0 THEN o."Value" ELSE 0 END) AS value_actual_non_competitive,
        SUM(o."Qty") AS qty_total,
        SUM(o."Qty" * COALESCE(s."FaceValue", 1)) AS value_nominal_total,
        SUM(o."Value") AS value_actual_total
    FROM buy_trades o
    LEFT JOIN securities_dedup s ON s."SecCode" = o."SecCode"
    GROUP BY o."TradeDate", o."SecCode"
),

-- Предыдущий аукцион по каждому инструменту: последняя дата до текущей
prev_auctions AS (
    SELECT DISTINCT ON ("SecCode")
        "TradeDate", "SecCode", offer_volume, demand_volume, placement_volume,
        avg_price, avg_yield, max_price, yield_by_max_price, cutoff_price, yield_by_cutoff_price
    FROM auctions
    WHERE "TradeDate"::date < (COALESCE($1, $2))::date
    ORDER BY "SecCode", "TradeDate" DESC
)

SELECT
    cur."SecCode" AS cur_sec_code,
    prev."SecCode" AS prev_sec_code,
    to_char(cur."TradeDate", 'YYYY-MM-DD') AS current_date,
    to_char(prev."TradeDate", 'YYYY-MM-DD') AS previous_date,
    cur.offer_volume AS current_offer_volume,
    prev.offer_volume AS previous_offer_volume,
    ROUND(cur.offer_volume - prev.offer_volume, 2) AS diff_offer_volume,
    cur.demand_volume AS current_demand_volume,
    prev.demand_volume AS previous_demand_volume,
    ROUND(cur.demand_volume - prev.demand_volume, 2) AS diff_demand_volume,
    cur.placement_volume AS current_placement_volume,
    prev.placement_volume AS previous_placement_volume,
    ROUND(cur.placement_volume - prev.placement_volume, 2) AS diff_placement_volume,
    cur.avg_price AS current_avg_price,
    prev.avg_price AS previous_avg_price,
    ROUND(cur.avg_price - prev.avg_price, 2) AS diff_avg_price,
    cur.avg_yield AS current_avg_yield,
    prev.avg_yield AS previous_avg_yield,
    ROUND(cur.avg_yield - prev.avg_yield, 2) AS diff_avg_yield,
    cur.max_price AS current_max_price,
    prev.max_price AS previous_max_price,
    ROUND(cur.max_price - prev.max_price, 2) AS diff_max_price,
    cur.yield_by_max_price AS current_yield_by_max_price,
    prev.yield_by_max_price AS previous_yield_by_max_price,
    ROUND(COALESCE(cur.yield_by_max_price, 0) - COALESCE(prev.yield_by_max_price, 0), 2) AS diff_yield_by_max_price,
    cur.cutoff_price AS current_cutoff_price,
    prev.cutoff_price AS previous_cutoff_price,
    ROUND(cur.cutoff_price - prev.cutoff_price, 2) AS diff_cutoff_price,
    cur.yield_by_cutoff_price AS current_yield_by_cutoff_price,
    prev.yield_by_cutoff_price AS previous_yield_by_cutoff_price,
    ROUND(COALESCE(cur.yield_by_cutoff_price, 0) - COALESCE(prev.yield_by_cutoff_price, 0), 2) AS diff_yield_by_cutoff_price,
    o_cur.qty_competitive AS qty_competitive_current,
    o_cur.value_nominal_competitive AS value_nominal_competitive_current,
    o_cur.value_actual_competitive AS value_actual_competitive_current,
    o_cur.avg_price_competitive AS avg_price_competitive_current,
    o_cur.avg_yield_competitive AS avg_yield_competitive_current,
    o_cur.qty_non_competitive AS qty_non_competitive_current,
    o_cur.value_nominal_non_competitive AS value_nominal_non_competitive_current,
    o_cur.value_actual_non_competitive AS value_actual_non_competitive_current,
    o_cur.qty_total AS qty_total_current,
    o_cur.value_nominal_total AS value_nominal_total_current,
    o_cur.value_actual_total AS value_actual_total_current
FROM auctions cur
LEFT JOIN prev_auctions prev ON cur."SecCode" = prev."SecCode"
LEFT JOIN orders_agg o_cur
  ON o_cur."SecCode" = cur."SecCode" AND o_cur."TradeDate" = cur."TradeDate"
WHERE cur."TradeDate"::date = (COALESCE($1, $2))::date
`.trim();

/**
 * Третий отчёт по аукциону — Классификация заявок.
 * Одна дата ($1). По каждому инструменту (SecCode) + дата: общая информация (объём выпуска, неконкурентные)
 * и таблица по дилерам: наименование, номинальная стоимость, цена заявки, доходность.
 */
const auctionBidClassificationQuery = `
WITH
${cteDedupTradeLeg('buy_trades', 'Купля', AUCTION_SINGLE_DATE_FILTER, true)},
${cteSecuritiesDedup()},
auction_totals AS (
  SELECT
    u."TradeDate",
    u."SecCode",
    SUM(u."Qty" * COALESCE(s."FaceValue", 1)) AS issue_volume,
    SUM(CASE WHEN u."Price" = 0 THEN u."Value" ELSE 0 END) AS non_competitive_amount
  FROM buy_trades u
  LEFT JOIN securities_dedup s ON s."SecCode" = u."SecCode"
  GROUP BY u."TradeDate", u."SecCode"
),
by_dealer AS (
  SELECT
    u."TradeDate",
    u."SecCode",
    COALESCE(NULLIF(TRIM(u."FirmName"), ''), '—') AS dealer_name,
    SUM(u."Qty" * COALESCE(s."FaceValue", 1)) AS nominal_value,
    ROUND(SUM(u."Qty" * u."Price") / NULLIF(SUM(u."Qty"), 0), 2) AS bid_price,
    ROUND(SUM(u."Qty" * COALESCE(u."Yield", 0)) / NULLIF(SUM(u."Qty"), 0), 2) AS yield_pct
  FROM buy_trades u
  LEFT JOIN securities_dedup s ON s."SecCode" = u."SecCode"
  GROUP BY u."TradeDate", u."SecCode", u."FirmName"
)
SELECT
  b."SecCode" AS registration_number,
  to_char(b."TradeDate", 'YYYY-MM-DD') AS auction_date,
  a.issue_volume,
  a.non_competitive_amount,
  b.dealer_name,
  b.nominal_value,
  b.bid_price,
  b.yield_pct
FROM by_dealer b
JOIN auction_totals a ON a."TradeDate" = b."TradeDate" AND a."SecCode" = b."SecCode"
ORDER BY b."SecCode", b."TradeDate", b.nominal_value DESC
`.trim();

/**
 * Пятый отчёт — Информация по допразмещению.
 * Агрегирует данные по торгам за одну дату: средняя цена, доходность, кол-во участников,
 * итоги размещения. Объём эмиссии и кол-во ГЦБ берутся из Securities.
 */
const additionalPlacementQuery = `
WITH
${cteDedupTradeLeg('buy_trades', 'Купля', AUCTION_SINGLE_DATE_FILTER, true)},
${cteSecuritiesDedup()},
${cteClassesDedup()}
SELECT
  u."SecCode"                                                                       AS sec_code,
  to_char(u."TradeDate", 'YYYY-MM-DD')                                               AS trade_date,
  MAX(u."ClassCode")                                                                AS class_code,
  MAX(COALESCE(c."ClassName", u."ClassCode"))                                       AS class_name,
  MAX(s."SecFullName")                                                              AS sec_full_name,
  COALESCE(MAX(s."FaceValue"), 100)                                                 AS face_value,
  SUM(u."Qty")                                                                      AS issue_qty,
  0                                                                                 AS coupon_rate,
  ROUND(SUM(u."Qty" * u."Price") / NULLIF(SUM(u."Qty"), 0), 2)                     AS avg_price,
  ROUND(SUM(u."Qty" * COALESCE(u."Yield", 0)) / NULLIF(SUM(u."Qty"), 0), 2)         AS avg_yield,
  SUM(u."Qty")                                                                      AS total_qty,
  SUM(u."Value")                                                                    AS total_value,
  COUNT(DISTINCT u."FirmId")                                                        AS participant_count,
  0                                                                                 AS financial_participants,
  COUNT(DISTINCT u."FirmId")                                                        AS institutional_investors,
  COUNT(DISTINCT u."FirmId")                                                        AS resident_count,
  0                                                                                 AS non_resident_count
FROM buy_trades u
LEFT JOIN securities_dedup s ON s."SecCode" = u."SecCode"
LEFT JOIN classes_dedup c ON c."ClassCode" = u."ClassCode"
GROUP BY u."SecCode", u."TradeDate"
ORDER BY u."TradeDate", u."SecCode"
`.trim();

/**
 * Четвёртый отчёт по аукциону — Ведомость для Центрального депозитария.
 * Та же структура, что и Классификация заявок: общая информация + таблица по дилерам.
 * В таблице: наименование дилера, фактическое количество ГЦБ, фактическая стоимость (сом), цена заявки, доходность.
 */
const auctionCentralDepositoryQuery = `
WITH
${cteDedupTradeLeg('buy_trades', 'Купля', AUCTION_SINGLE_DATE_FILTER, true)},
${cteSecuritiesDedup()},
auction_totals AS (
  SELECT
    u."TradeDate",
    u."SecCode",
    SUM(u."Qty" * COALESCE(s."FaceValue", 1)) AS issue_volume,
    SUM(CASE WHEN u."Price" = 0 THEN u."Value" ELSE 0 END) AS non_competitive_amount
  FROM buy_trades u
  LEFT JOIN securities_dedup s ON s."SecCode" = u."SecCode"
  GROUP BY u."TradeDate", u."SecCode"
),
by_dealer AS (
  SELECT
    u."TradeDate",
    u."SecCode",
    COALESCE(NULLIF(TRIM(u."FirmName"), ''), '—') AS dealer_name,
    SUM(u."Qty") AS actual_qty,
    SUM(u."Value") AS actual_value,
    ROUND(SUM(u."Qty" * u."Price") / NULLIF(SUM(u."Qty"), 0), 2) AS bid_price,
    ROUND(SUM(u."Qty" * COALESCE(u."Yield", 0)) / NULLIF(SUM(u."Qty"), 0), 2) AS yield_pct
  FROM buy_trades u
  LEFT JOIN securities_dedup s ON s."SecCode" = u."SecCode"
  GROUP BY u."TradeDate", u."SecCode", u."FirmName"
)
SELECT
  b."SecCode" AS registration_number,
  to_char(b."TradeDate", 'YYYY-MM-DD') AS auction_date,
  a.issue_volume,
  a.non_competitive_amount,
  b.dealer_name,
  b.actual_qty,
  b.actual_value,
  b.bid_price,
  b.yield_pct
FROM by_dealer b
JOIN auction_totals a ON a."TradeDate" = b."TradeDate" AND a."SecCode" = b."SecCode"
ORDER BY b."SecCode", b."TradeDate", b.actual_value DESC
`.trim();

/**
 * SQL для Биржевого контракта (один документ на сделку).
 * Продавец/покупатель через JOIN по Operation.
 * Справочники только через *_dedup — иначе дубли Firms/Securities размножают строки.
 */
const exchangeContractQuery = `
WITH
${cteDedupTradeLeg('buy_trades', 'Купля', TRADES_DATE_BETWEEN_COALESCE)},
${cteDedupTradeLeg('sell_trades', 'Продажа', TRADES_DATE_BETWEEN_COALESCE)},
${cteFirmsDedup()},
${cteClassesDedup()},
${cteSecuritiesDedup()}
SELECT DISTINCT ON (b."TradeNum")
  b."TradeNum" AS "id",
  to_char(b."TradeDate", 'YYYY-MM-DD') AS "tradeDate",
  to_char(${sqlSettleBusinessDate('b."TradeDate"', 'b."SettleCode"')}, 'YYYY-MM-DD') AS "conclusionDate",
  b."SettleCode" AS "settleCode",
  to_char(b."TradeDateTime", 'HH24:MI:SS') AS "tradeDateTime",
  b."ClassCode" AS "classCode",
  COALESCE(cl."ClassName", b."ClassCode") AS "className",
  b."SecCode" AS "secCode",
  sec."SecFullName" AS "secFullName",
  b."FirmId" AS "buyerFirmId",
  s."FirmId" AS "sellerFirmId",
  s."FirmId" AS "brokerCode",
  COALESCE(NULLIF(TRIM(sf."FirmName"), ''), NULLIF(TRIM(s."FirmName"), '')) AS "sellerName",
  s."Account" AS "sellAccount",
  NULLIF(TRIM(s."ClientCode"), '') AS "sellerClientCode",
  s."UID" AS "sellerUid",
  COALESCE(NULLIF(TRIM(bf."FirmName"), ''), NULLIF(TRIM(b."FirmName"), '')) AS "buyerName",
  b."Account" AS "buyAccount",
  NULLIF(TRIM(b."ClientCode"), '') AS "buyerClientCode",
  b."UID" AS "buyerUid",
  b."Qty" AS "quantity",
  b."Price" AS "price",
  b."Value" AS "value",
  COALESCE(b."Accruedint", s."Accruedint", 0) AS "accruedInt",
  to_char(b."SettleDate", 'YYYY-MM-DD') AS "settleDate",
  b."Yield" AS "yield",
  ROUND(365.0 / NULLIF(sec."CouponPeriod", 0)) * sec."CouponValue" AS "couponRate"
FROM buy_trades b
JOIN sell_trades s ON b."TradeNum" = s."TradeNum"
LEFT JOIN firms_dedup bf ON bf."FirmId" = b."FirmId"
LEFT JOIN firms_dedup sf ON sf."FirmId" = s."FirmId"
LEFT JOIN classes_dedup cl ON cl."ClassCode" = b."ClassCode"
LEFT JOIN securities_dedup sec ON sec."SecCode" = b."SecCode"
ORDER BY b."TradeNum", b."TradeDate" DESC
`.trim();

/** Класс драгметаллов КФБ в QUIK (сертификаты золотых слитков). */
const GOLD_CLASS_CODE = 'QME_MTL';

/**
 * Сделки с золотом из QUIK: те же поля, что у Биржевого контракта, только класс драгметаллов.
 * Используется Биржевым контрактом по золоту и Сводным отчётом по золоту.
 */
const goldTradesQuery = `
SELECT *
FROM (
${exchangeContractQuery}
) gold
WHERE gold."classCode" = '${GOLD_CLASS_CODE}'
ORDER BY gold."tradeDate", gold."id"
`.trim();

/**
 * Форма 5 — ведомость сделок: Дата, Эмитент, Гос. рег. номер ЦБ, № сделки, Покупатель, Продавец, Кол-во ЦБ, Цена, Объем.
 * Использует базовый запрос по сделкам (одна строка на сделку).
 */
const form5Query = baseTradesQuery;

/**
 * Форма 6 — аналог формы 5, но с отдельной колонкой «Листинг / Непистинг».
 * По данным использует тот же базовый запрос.
 */
const form6Query = baseTradesQuery;

/**
 * Форма 4 — отдельный запрос (на текущем этапе идентичен форме 2).
 * Вынесен отдельно для дальнейшего независимого изменения.
 */
const form4Query = baseTradesQuery;

/**
 * Форма 8 — Отчет о заключенных сделках (упрощённый вид: компания, торговый символ, цена, кол-во, сумма).
 * Использует одну строку на сделку без агрегирования.
 */
const form8Query = `
WITH
${cteDedupTradeLeg('buy_trades', 'Купля', TRADES_DATE_BETWEEN_COALESCE, true)},
${cteSecuritiesDedup()}
SELECT
  to_char(b."TradeDate", 'YYYY-MM-DD') AS "tradeDate",
  sec."SecFullName" AS "companyName",
  b."SecCode" AS "symbol",
  NULL::text AS "isin",
  b."Price" AS "price",
  b."Qty" AS "quantity",
  b."Value" AS "value"
FROM buy_trades b
LEFT JOIN securities_dedup sec ON sec."SecCode" = b."SecCode"
ORDER BY b."TradeDate", sec."SecFullName", b."SecCode", b."TradeNum"
`.trim();

/**
 * Госхолдинг Форма 10 — индекс за торговый день (расчёт из QUIK).
 * Листинговые акции: VWAP за день × вес (суммарный объём сделок за период по бумаге).
 * Индекс = капитализация корзины / капитализация в первый торговый день × 100.
 */
const stateHoldingForm10Query = `
WITH
${cteClassesDedup()},
index_universe AS (
  SELECT DISTINCT sec."SecCode"
  FROM "Securities" sec
  LEFT JOIN classes_dedup cl ON cl."ClassCode" = sec."ClassCode"
  WHERE sec."ClassCode" = 'LISTEDSTOCKK'
     OR (
       LOWER(COALESCE(cl."ClassName", sec."ClassCode", '')) LIKE '%листинг%'
       AND LOWER(COALESCE(cl."ClassName", sec."ClassCode", '')) LIKE '%акц%'
     )
),
${cteDedupTradeLeg('buy_trades', 'Купля', TRADES_DATE_BETWEEN_COALESCE_DATE, true)},
period_weights AS (
  SELECT
    t."SecCode",
    SUM(t."Qty")::numeric AS qty_weight
  FROM buy_trades t
  INNER JOIN index_universe u ON u."SecCode" = t."SecCode"
  GROUP BY t."SecCode"
  HAVING SUM(t."Qty") > 0
),
daily_vwap AS (
  SELECT
    t."TradeDate"::date AS d,
    t."SecCode",
    SUM(t."Price" * t."Qty") / NULLIF(SUM(t."Qty"), 0) AS vwap
  FROM buy_trades t
  INNER JOIN index_universe u ON u."SecCode" = t."SecCode"
  GROUP BY t."TradeDate"::date, t."SecCode"
),
daily_cap AS (
  SELECT
    dv.d,
    SUM(dv.vwap * pw.qty_weight) AS market_cap
  FROM daily_vwap dv
  INNER JOIN period_weights pw ON pw."SecCode" = dv."SecCode"
  GROUP BY dv.d
),
first_day AS (
  SELECT MIN(d) AS d0 FROM daily_cap
),
base_cap AS (
  SELECT dc.market_cap
  FROM daily_cap dc
  INNER JOIN first_day fd ON dc.d = fd.d0
  LIMIT 1
)
SELECT
  to_char(dc.d, 'YYYY-MM-DD') AS "id",
  to_char(dc.d, 'YYYY-MM-DD') AS "tradeDate",
  ROUND(
    dc.market_cap / NULLIF((SELECT market_cap FROM base_cap), 0) * 100,
    4
  ) AS "indexValue"
FROM daily_cap dc
ORDER BY dc.d
`.trim();

/**
 * Госхолдинг, Форма 5 — топ-5 участников по сумме сделок (сом) за период, разбивка по дням.
 * Размещение / обращение — по справочнику «Классификация рынка».
 */
const stateHoldingForm5Top5Query = `
WITH
${cteDedupTradeLeg('buy_trades', 'Купля', TRADES_DATE_BETWEEN_COALESCE_DATE, true)},
${cteFirmsDedup()},
__MARKET_RULES_CTE__,
base AS (
  SELECT
    b."TradeNum",
    b."TradeDate"::date AS d,
    b."FirmId" AS buyer_firm_id,
    COALESCE(NULLIF(TRIM(bf."FirmName"), ''), NULLIF(TRIM(b."FirmName"), '')) AS buyer_name,
    b."Qty" AS qty,
    b."Value" AS value,
    b."ClassCode" AS class_code
  FROM buy_trades b
  LEFT JOIN firms_dedup bf ON bf."FirmId" = b."FirmId"
),
classified AS (
  SELECT
    b.*,
    CASE WHEN mr.market_type = 'primary' THEN b.value ELSE 0::numeric END AS placement_part,
    CASE WHEN mr.market_type = 'primary' THEN 0::numeric ELSE b.value END AS circulation_part
  FROM base b
  LEFT JOIN market_rules mr ON LOWER(mr.class_code) = LOWER(b.class_code)
),
legs AS (
  SELECT DISTINCT ON ("TradeNum")
    d,
    buyer_firm_id AS firm_id,
    buyer_name AS firm_name,
    "TradeNum",
    qty,
    value,
    placement_part,
    circulation_part
  FROM classified
  WHERE buyer_name IS NOT NULL AND TRIM(buyer_name) <> ''
  ORDER BY "TradeNum", d DESC
),
by_participant_day AS (
  SELECT
    d,
    COALESCE(NULLIF(TRIM(firm_id::text), ''), 'n:' || UPPER(TRIM(firm_name))) AS part_key,
    MAX(firm_name) AS firm_name,
    COUNT(DISTINCT "TradeNum")::bigint AS deal_count,
    SUM(qty)::numeric AS qty_securities,
    SUM(placement_part)::numeric AS sum_placement,
    SUM(circulation_part)::numeric AS sum_circulation,
    SUM(value)::numeric AS sum_total
  FROM legs
  GROUP BY d, COALESCE(NULLIF(TRIM(firm_id::text), ''), 'n:' || UPPER(TRIM(firm_name)))
),
period_totals AS (
  SELECT
    part_key,
    MAX(firm_name) AS firm_name,
    SUM(sum_total)::numeric AS period_total
  FROM by_participant_day
  GROUP BY part_key
),
top5 AS (
  SELECT part_key, firm_name, period_total
  FROM period_totals
  ORDER BY period_total DESC NULLS LAST
  LIMIT 5
),
ranked_participants AS (
  SELECT
    t.part_key,
    t.firm_name,
    t.period_total,
    ROW_NUMBER() OVER (ORDER BY t.period_total DESC NULLS LAST) AS "seqNo"
  FROM top5 t
)
SELECT
  (rp.part_key || '-' || to_char(bd.d, 'YYYYMMDD')) AS id,
  rp."seqNo",
  rp.part_key AS "participantKey",
  to_char(bd.d, 'YYYY-MM-DD') AS "tradeDate",
  rp.firm_name AS "participantName",
  bd.deal_count AS "dealCount",
  ROUND(bd.qty_securities, 0) AS "secQty",
  ROUND(bd.sum_placement, 2) AS "amountPlacement",
  ROUND(bd.sum_circulation, 2) AS "amountCirculation",
  ROUND(bd.sum_total, 2) AS "amountTotal"
FROM by_participant_day bd
JOIN ranked_participants rp ON rp.part_key = bd.part_key
ORDER BY rp."seqNo" ASC, bd.d ASC
`.trim();

/**
 * Сводная ведомость заявок — заявки из Orders, одна строка на OrderNum.
 * Фильтры: $1/$2 даты, $3 ClassCode, $4 SecCode, $5 FirmId.
 */
const ordersSummaryQuery = `
WITH
orders_dedup AS (
  SELECT DISTINCT ON (o."OrderNum")
    o."OrderNum",
    o."OrderDateTime",
    o."TradeDate",
    o."Operation",
    o."Qty",
    o."Price",
    o."Value",
    o."SecCode",
    o."ClassCode",
    o."FirmId"
  FROM "Orders" o
  WHERE o."TradeDate"::date BETWEEN $1::date AND COALESCE($2::date, $1::date)
    AND ($3::text[] IS NULL OR o."ClassCode" = ANY($3))
    AND ($4::text[] IS NULL OR EXISTS (SELECT 1 FROM unnest($4::text[]) AS pat WHERE o."SecCode" ILIKE '%' || pat || '%'))
    AND ($5::text[] IS NULL OR o."FirmId"::text = ANY($5))
  ORDER BY o."OrderNum", o."OrderDateTime" DESC
),
${cteSecuritiesDedup()}
SELECT
  d."OrderNum"::text AS id,
  d."OrderNum"::text AS "orderNum",
  to_char(d."OrderDateTime", 'YYYY-MM-DD HH24:MI:SS') AS "orderDateTime",
  CASE
    WHEN d."Operation" IN ('Купля', 'Покупка') THEN 'покупка'
    WHEN d."Operation" = 'Продажа' THEN 'продажа'
    ELSE LOWER(COALESCE(d."Operation", ''))
  END AS "direction",
  ROUND(COALESCE(d."Qty", 0), 0) AS "quantity",
  ROUND(COALESCE(d."Price", 0), 2) AS "price",
  ROUND(COALESCE(NULLIF(d."Value", 0), d."Qty" * d."Price", 0), 2) AS "volume",
  d."SecCode" AS "secCode",
  COALESCE(NULLIF(TRIM(sec."SecFullName"), ''), d."SecCode") AS "secFullName",
  COALESCE(NULLIF(TRIM(sec."ISINCode"), ''), d."SecCode") AS "isinCode",
  d."ClassCode" AS "classCode",
  d."FirmId"::text AS "firmId",
  d."FirmId"::text AS "firmCode"
FROM orders_dedup d
LEFT JOIN securities_dedup sec ON sec."SecCode" = d."SecCode"
ORDER BY COALESCE(NULLIF(TRIM(sec."SecFullName"), ''), d."SecCode"), d."OrderDateTime", d."OrderNum"
`.trim();

/**
 * Госхолдинг Форма 9 — Информация о торгах (котировки / приказы).
 * Каждая строка — одна сделка: код ЦБ, кол-во, цена покупки, цена продажи, дата и время.
 */
const stateHoldingForm9Query = `
WITH
${cteDedupTradeLeg('buy_trades', 'Купля', TRADES_DATE_BETWEEN_COALESCE)},
${cteDedupTradeLeg('sell_trades', 'Продажа', TRADES_DATE_BETWEEN_COALESCE)},
${cteSecuritiesDedup()}
SELECT
  b."SecCode"                                     AS "secCode",
  COALESCE(sec."SecFullName", b."SecCode")        AS "secFullName",
  to_char(b."TradeDate", 'YYYY-MM-DD')            AS "tradeDate",
  SUM(b."Qty")                                    AS "quantity",
  ROUND(AVG(b."Price"), 2)                        AS "buyPrice",
  ROUND(AVG(s."Price"), 2)                        AS "sellPrice"
FROM buy_trades b
JOIN sell_trades s ON b."TradeNum" = s."TradeNum"
LEFT JOIN securities_dedup sec ON sec."SecCode" = b."SecCode"
GROUP BY b."SecCode", COALESCE(sec."SecFullName", b."SecCode"), b."TradeDate"
ORDER BY b."TradeDate", b."SecCode"
`.trim();

/**
 * Госхолдинг Форма 8 — Список ценных бумаг, допущенных к обращению через торговую систему фондовой биржи.
 * Рыночная цена — средневзвешенная по сделкам за выбранный период.
 * Листинг/нелистинг — определяется по коду класса.
 */
const stateHoldingForm8Query = `
WITH
${cteDedupTradeLeg('buy_trades', 'Купля', TRADES_DATE_BETWEEN_COALESCE, true)},
${cteClassesDedup()},
${cteSecuritiesDedup()},
latest_prices AS (
  SELECT
    t."SecCode",
    ROUND(SUM(t."Price" * t."Qty") / NULLIF(SUM(t."Qty"), 0), 2) AS "marketPrice"
  FROM buy_trades t
  GROUP BY t."SecCode"
)
SELECT
  COALESCE(NULLIF(TRIM(sec."SecFullName"), ''), sec."SecCode") AS "secFullName",
  sec."SecCode" AS "secCode",
  COALESCE(NULLIF(TRIM(sec."ISINCode"), ''), sec."SecCode") AS "isinCode",
  sec."ClassCode" AS "classCode",
  COALESCE(cl."ClassName", sec."ClassCode") AS "secType",
  COALESCE(sec."FaceValue", 0) AS "faceValue",
  COALESCE(lp."marketPrice", 0) AS "marketPrice",
  CASE
    WHEN LOWER(COALESCE(cl."ClassName", sec."ClassCode")) LIKE '%листинг%'
      OR sec."ClassCode" IN ('LISTEDBONDS', 'LISTEDSTOCKK')
    THEN 'Листинг'
    ELSE 'Нелистинг'
  END AS "listingType"
FROM securities_dedup sec
LEFT JOIN classes_dedup cl ON cl."ClassCode" = sec."ClassCode"
LEFT JOIN latest_prices lp ON lp."SecCode" = sec."SecCode"
WHERE ($3::text[] IS NULL OR sec."ClassCode" = ANY($3))
  AND ($4::text[] IS NULL OR EXISTS (SELECT 1 FROM unnest($4::text[]) AS pat WHERE sec."SecCode" ILIKE '%' || pat || '%'))
ORDER BY sec."ClassCode", sec."SecFullName"
`.trim();

/**
 * Госхолдинг Форма 7 — Отчет о сделках по брокерским и дилерским фирмам.
 * Покупатель (Купля); одна строка на TradeNum; группировка брокер + ЦБ + дата.
 */
const stateHoldingForm7Query = `
WITH
${cteDedupTradeLeg('buy_trades', 'Купля', TRADES_DATE_BETWEEN_COALESCE_DATE, true)},
${cteFirmsDedup()},
legs AS (
  SELECT DISTINCT ON (b."TradeNum")
    b."TradeDate"::date AS d,
    b."FirmId" AS buyer_firm_id,
    COALESCE(NULLIF(TRIM(bf."FirmName"), ''), NULLIF(TRIM(b."FirmName"), '')) AS buyer_name,
    COALESCE(
      NULLIF(TRIM(b."FirmId"::text), ''),
      'n:' || UPPER(TRIM(COALESCE(NULLIF(TRIM(bf."FirmName"), ''), NULLIF(TRIM(b."FirmName"), ''))))
    ) AS part_key,
    b."SecCode" AS sec_code,
    b."TradeNum",
    b."Qty" AS qty,
    b."Price" AS price,
    b."Value" AS value
  FROM buy_trades b
  LEFT JOIN firms_dedup bf ON bf."FirmId" = b."FirmId"
  WHERE COALESCE(NULLIF(TRIM(bf."FirmName"), ''), NULLIF(TRIM(b."FirmName"), '')) IS NOT NULL
    AND TRIM(COALESCE(NULLIF(TRIM(bf."FirmName"), ''), NULLIF(TRIM(b."FirmName"), ''))) <> ''
  ORDER BY b."TradeNum", b."TradeDate" DESC
)
SELECT
  (l.part_key || '-' || l.sec_code || '-' || to_char(l.d, 'YYYYMMDD')) AS id,
  MAX(l.buyer_firm_id) AS "brokerCode",
  MAX(l.buyer_name) AS "brokerName",
  l.sec_code AS "secCode",
  (SELECT MAX(COALESCE(NULLIF(TRIM(s."SecFullName"), ''), l.sec_code))
   FROM "Securities" s WHERE s."SecCode" = l.sec_code) AS "secFullName",
  (SELECT MAX(COALESCE(NULLIF(TRIM(s."ISINCode"), ''), l.sec_code))
   FROM "Securities" s WHERE s."SecCode" = l.sec_code) AS "isinCode",
  to_char(l.d, 'YYYY-MM-DD') AS "tradeDate",
  COUNT(DISTINCT l."TradeNum")::bigint AS "dealCount",
  ROUND(SUM(l.qty), 0)::numeric AS "quantity",
  MAX(l.price) AS "maxPrice",
  MIN(l.price) AS "minPrice",
  ROUND(SUM(l.price * l.qty) / NULLIF(SUM(l.qty), 0), 2) AS "avgPrice",
  SUM(l.value)::numeric AS "volume"
FROM legs l
GROUP BY l.part_key, l.sec_code, l.d
ORDER BY "brokerCode", "secCode", "tradeDate"
`.trim();

/**
 * SQL для формы F7 — отчёт по сделкам: Сектор → Ценная бумага → Дата.
 * Агрегация: кол-во сделок, кол-во ЦБ, max/min/средняя цена, объём.
 */
const form7Query = `
WITH
${cteDedupTradeLeg('buy_trades', 'Купля', TRADES_DATE_BETWEEN_COALESCE, true)},
${cteClassesDedup()},
${cteSecuritiesDedup()}
SELECT
  b."ClassCode" AS "classCode",
  COALESCE(cl."ClassName", b."ClassCode") AS "sector",
  b."SecCode" AS "secCode",
  sec."SecFullName" AS "secFullName",
  to_char(b."TradeDate", 'YYYY-MM-DD') AS "tradeDate",
  COUNT(DISTINCT b."TradeNum") AS "dealCount",
  SUM(b."Qty") AS "quantity",
  MAX(b."Price") AS "maxPrice",
  MIN(b."Price") AS "minPrice",
  ROUND(SUM(b."Price" * b."Qty") / NULLIF(SUM(b."Qty"), 0), 2) AS "avgPrice",
  SUM(b."Value") AS "volume"
FROM buy_trades b
LEFT JOIN classes_dedup cl ON cl."ClassCode" = b."ClassCode"
LEFT JOIN securities_dedup sec ON sec."SecCode" = b."SecCode"
GROUP BY b."ClassCode", COALESCE(cl."ClassName", b."ClassCode"), b."SecCode", sec."SecFullName", b."TradeDate"
ORDER BY COALESCE(cl."ClassName", b."ClassCode"), sec."SecFullName", b."TradeDate"
`.trim();

/**
 * Все формы отчетов определены здесь
 */
export const reportDefinitions: ReportDefinition[] = [
  {
    code: 'Blank_Form_1',
    name: 'Blank_Form_1',
    description: 'Форма 1 - Отчет о заключенных сделках',
    type: 'table',
    category: 'Отчеты по системной информации',
    sql: baseTradesQuery,
  },
  {
    code: 'Blank_Form_2',
    name: 'Blank_Form_2',
    description: 'Форма 2 - Отчет о заключенных сделках',
    type: 'table',
    category: 'Отчеты по системной информации',
    sql: baseTradesQuery,
  },
  {
    code: 'Blank_Form_3',
    name: 'Blank_Form_3',
    description: 'Форма 3 - Отчет о заключенных сделках',
    type: 'table',
    category: 'Отчеты по системной информации',
    sql: baseTradesQuery,
  },
  {
    code: 'Blank_Form_4',
    name: 'Blank_Form_4',
    description: 'Форма 4 - Отчет о заключенных сделках',
    type: 'table',
    category: 'Отчеты по системной информации',
    sql: form4Query,
  },
  {
    code: 'Blank_Form_5',
    name: 'Blank_Form_5',
    description: 'Форма 5 - Отчет о заключенных сделках',
    type: 'table',
    category: 'Отчеты по системной информации',
    sql: form5Query,
  },
  {
    code: 'Blank_Form_6',
    name: 'Blank_Form_6',
    description: 'Форма 6 - Отчет о заключенных сделках',
    type: 'table',
    category: 'Отчеты по системной информации',
    sql: form6Query,
  },
  {
    code: 'Blank_Form_8',
    name: 'Blank_Form_8',
    description: 'Форма 8 - Отчет о заключенных сделках',
    type: 'table',
    category: 'Отчеты по системной информации',
    // Используем базовый запрос по сделкам, а представление (компания, символ, ISIN, цена, кол-во, сумма)
    // формируется на фронтенде в buildForm8Data / Form8Report.
    sql: baseTradesQuery,
  },
  {
    code: 'Blank_Form_6A',
    name: 'Blank_Form_6A',
    description: 'Форма 6А - Сводный отчет по сделкам (первичный рынок)',
    type: 'table',
    category: 'Отчеты по системной информации',
    sql: baseTradesQuery,
  },
  {
    code: 'Blank_Form_6B',
    name: 'Blank_Form_6B',
    description: 'Форма 6Б - Сводный отчет по сделкам (вторичный рынок)',
    type: 'table',
    category: 'Отчеты по системной информации',
    sql: baseTradesQuery,
  },
  {
    code: 'Blank_Form_6B_NKD',
    name: 'Blank_Form_6B_NKD',
    description: 'Форма 6Б - Сводный отчет по сделкам (вторичный рынок + НКД)',
    type: 'table',
    category: 'Отчеты по системной информации',
    sql: baseTradesQuery,
  },
  {
    code: 'Blank_Form_06',
    name: 'Blank_Form_06',
    description:
      'Форма 06 - Сведения о 5 участниках торгов с наибольшей суммой сделок (по рабочим дням периода)',
    type: 'table',
    category: 'Отчеты по системной информации',
    sql: stateHoldingForm5Top5Query,
  },
  {
    code: 'Blank_Form_7',
    name: 'Blank_Form_7',
    description: 'Форма 7 - Отчёт по сделкам по секторам',
    type: 'table',
    category: 'Отчеты по системной информации',
    sql: form7Query,
  },
  {
    code: 'Blank_Form_9',
    name: 'Blank_Form_9',
    description: 'Форма 9 - Ведомость заключенных сделок в торговой системе',
    type: 'table',
    category: 'Отчеты по системной информации',
    singleDate: true,
    sql: form9Query,
  },
  {
    code: 'Blank_Form_13',
    name: 'Blank_Form_13',
    description: 'Форма 13 - Отчет по комиссионным сборам',
    type: 'table',
    category: 'Отчеты по системной информации',
    sql: baseTradesQuery,
  },
  {
    code: 'Blank_Form_14',
    name: 'Blank_Form_14',
    description: 'Форма 14 - Отчет по структуре комиссионного сбора (по участникам)',
    type: 'table',
    category: 'Отчеты по системной информации',
    sql: baseTradesQuery,
  },
  {
    code: 'Blank_Form_15',
    name: 'Blank_Form_15',
    description: 'Форма 15 - Отчет по структуре комиссионного сбора',
    type: 'table',
    category: 'Отчеты по системной информации',
    sql: baseTradesQuery,
  },
  {
    code: 'Orders_Summary',
    name: 'Orders_Summary',
    description: 'Сводная ведомость заявок',
    type: 'table',
    category: 'Отчеты по системной информации',
    sql: ordersSummaryQuery,
  },
  {
    code: 'Trades_By_Sec',
    name: 'Trades_By_Sec',
    description: 'Отчет о сделках по ЦБ',
    type: 'table',
    category: 'Отчеты по системной информации',
    sql: baseTradesQuery,
  },
  {
    code: 'Blank_Form_USD',
    name: 'Blank_Form_USD',
    description: 'Отчет USD',
    type: 'table',
    category: 'Отчеты по системной информации',
  },
  {
    code: 'Blank_Form_2_USD',
    name: 'Blank_Form_2_USD',
    description: 'Форма 2 USD - Отчет о заключенных сделках',
    type: 'table',
    category: 'Отчеты по системной информации',
  },
  {
    code: 'StateHolding_Form5_Top5',
    name: 'StateHolding_Form5_Top5',
    description:
      'Форма 5 — сведения о 5 участниках торгов с наибольшей суммой сделок в сомах (по рабочим дням периода)',
    type: 'table',
    category: 'Отчеты ГосФинНадзор',
    sql: stateHoldingForm5Top5Query,
  },
  {
    code: 'StateHolding_Form6',
    name: 'StateHolding_Form6',
    description: 'Форма 6 — Отчет о сделках (первичный/вторичный рынок, листинг)',
    type: 'table',
    category: 'Отчеты ГосФинНадзор',
    sql: baseTradesQuery,
  },
  {
    code: 'StateHolding_Form7',
    name: 'StateHolding_Form7',
    description: 'Форма 7 — Отчет о сделках по брокерским и дилерским фирмам',
    type: 'table',
    category: 'Отчеты ГосФинНадзор',
    sql: stateHoldingForm7Query,
  },
  {
    code: 'StateHolding_Form8',
    name: 'StateHolding_Form8',
    description: 'Форма 8 — Список ценных бумаг, допущенных к обращению через торговую систему фондовой биржи',
    type: 'table',
    category: 'Отчеты ГосФинНадзор',
    sql: stateHoldingForm8Query,
  },
  {
    code: 'StateHolding_Form9',
    name: 'StateHolding_Form9',
    description: 'Форма 9 — Информация о торгах (котировки, приказы)',
    type: 'table',
    category: 'Отчеты ГосФинНадзор',
    sql: stateHoldingForm9Query,
  },
  {
    code: 'StateHolding_Form10',
    name: 'StateHolding_Form10',
    description: 'Форма 10 — Значение индекса за торговый день',
    type: 'table',
    category: 'Отчеты ГосФинНадзор',
    sql: stateHoldingForm10Query,
  },
  {
    code: 'Auction_Summary',
    name: 'Auction_Summary',
    description: 'Сводная ведомость по аукциону ГЦБ',
    type: 'table',
    category: 'Отчеты по Аукциону',
    singleDate: true,
    sql: auctionSummaryQuery,
  },
  {
    code: 'Auction_Summary_2',
    name: 'Auction_Summary_2',
    description: 'Сводная ведомость 2 — сравнение текущего и предыдущего аукциона',
    type: 'table',
    category: 'Отчеты по Аукциону',
    singleDate: true,
    sql: auctionSummary2Query,
  },
  {
    code: 'Auction_Bid_Classification',
    name: 'Auction_Bid_Classification',
    description: 'Классификация заявок',
    type: 'table',
    category: 'Отчеты по Аукциону',
    singleDate: true,
    sql: auctionBidClassificationQuery,
  },
  {
    code: 'Auction_Central_Depository',
    name: 'Auction_Central_Depository',
    description: 'Ведомость для Центрального депозитария',
    type: 'table',
    category: 'Отчеты по Аукциону',
    singleDate: true,
    sql: auctionCentralDepositoryQuery,
  },
  {
    code: 'Auction_Additional_Placement',
    name: 'Auction_Additional_Placement',
    description: 'Информация по допразмещению',
    type: 'table',
    category: 'Отчеты по Аукциону',
    singleDate: true,
    sql: additionalPlacementQuery,
  },
  {
    code: 'Auction_Exchange_Contract',
    name: 'Auction_Exchange_Contract',
    description: 'Биржевой контракт',
    type: 'table',
    category: 'Отчеты по Аукциону',
    singleDate: true,
    sql: exchangeContractQuery,
  },
  {
    code: 'Auction_Exchange_Certificate',
    name: 'Auction_Exchange_Certificate',
    description: 'Биржевое свидетельство',
    type: 'table',
    category: 'Отчеты по Аукциону',
    singleDate: true,
    sql: exchangeContractQuery,
  },
  {
    code: 'Exchange_Contract',
    name: 'Exchange_Contract',
    description: 'Биржевой контракт',
    type: 'table',
    category: 'Юридические документы',
    singleDate: true,
    sql: exchangeContractQuery,
  },
  {
    code: 'Exchange_Certificate',
    name: 'Exchange_Certificate',
    description: 'Биржевое свидетельство',
    type: 'table',
    category: 'Юридические документы',
    singleDate: true,
    sql: exchangeContractQuery,
  },
  {
    code: 'Exchange_Contract_Gold',
    name: 'Exchange_Contract_Gold',
    description: 'Биржевой контракт золото',
    type: 'table',
    category: 'Юридические документы',
    singleDate: true,
  },
  {
    code: 'Gold_Daily_Summary',
    name: 'Gold_Daily_Summary',
    description: 'Сводный отчёт дня по сделкам с золотом (по номиналам)',
    type: 'table',
    category: 'Юридические документы',
    singleDate: true,
  },
  {
    code: 'Exchange_Contract_Gold_Quik',
    name: 'Exchange_Contract_Gold_Quik',
    description: 'Биржевой контракт по золоту',
    type: 'table',
    category: 'Юридические документы',
    singleDate: true,
    sql: goldTradesQuery,
  },
  {
    code: 'Gold_Summary_Quik',
    name: 'Gold_Summary_Quik',
    description: 'Сводный отчёт по золоту',
    type: 'table',
    category: 'Юридические документы',
    singleDate: true,
    sql: goldTradesQuery,
  },
];

/**
 * Получить определение формы по коду
 */
export function getReportDefinition(code: string): ReportDefinition | undefined {
  const normalizedCode = normalizeReportCode(code);
  return reportDefinitions.find((r) => normalizeReportCode(r.code) === normalizedCode);
}

/**
 * Получить все формы отчетов
 */
export function getAllReportDefinitions(): ReportDefinition[] {
  return reportDefinitions;
}

/**
 * Получить SQL-запрос для формы
 */
export function getSqlForReport(code: string): string | undefined {
  const normalizedCode = normalizeReportCode(code);
  return reportDefinitions.find((r) => normalizeReportCode(r.code) === normalizedCode)?.sql;
}
