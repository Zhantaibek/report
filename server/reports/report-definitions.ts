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

/**
 * Базовый SQL-запрос для получения уникальных сделок
 */
const baseTradesQuery = `
WITH unique_trades AS (
  SELECT DISTINCT ON (t."TradeNum")
    t.*
  FROM "Trades" t
  WHERE t."TradeDate" BETWEEN $1 AND $2
  ORDER BY t."TradeNum", t."TradeDate" DESC
)
SELECT 
  "TradeNum" AS "id",
  "Operation" AS "operation",
  "FirmId" AS "brokerCode",
  "FirmName" AS "brokerName",
  "CPFirmId" AS "counterparty",
  "CPFirmName" AS "counterpartyName",
  "ClassCode" AS "classCode",
  "SecCode" AS "secCode",
  "TradeDate" AS "tradeDate",
  "SettleDate" AS "settleDate",
  "Price" AS "price",
  "Qty" AS "quantity",
  "Value" AS "value"
FROM unique_trades
ORDER BY "ClassCode", "SecCode", "TradeDate", "TradeNum"
`.trim();

/**
 * SQL для Формы 9 - Ведомость заключенных сделок
 * Особенности:
 * - Может использовать одну дату или диапазон (BETWEEN $1 AND $2)
 * - Группирует по TradeNum с агрегацией MAX
 * - Разделяет счета продавца и покупателя через CASE
 * - Присоединяет Securities для получения полного названия
 */
const form9Query = `
WITH unique_trades AS (
  SELECT 
    t.*
  FROM "Trades" t
  WHERE t."TradeDate" BETWEEN $1 AND COALESCE($2, $1)
  ORDER BY t."TradeNum", t."TradeDate" DESC
)
SELECT
  t."TradeNum" AS "id",
  MAX(t."ClassCode") AS "classCode",
  MAX(t."SecCode") AS "secCode",
  MAX(t."TradeDate") AS "tradeDate",
  MAX(CASE WHEN t."Operation" = 'Продажа' THEN t."Account" END) AS "sellAccount",
  MAX(CASE WHEN t."Operation" = 'Купля' THEN t."Account" END) AS "buyAccount",
  MAX(t."Qty") AS "quantity",
  MAX(t."Value") AS "value",
  MAX(s."SecFullName") AS "secFullName"
FROM unique_trades t
LEFT JOIN "Securities" s ON t."SecCode" = s."SecCode"
GROUP BY t."TradeNum"
ORDER BY t."TradeNum"
`.trim();

/**
 * SQL для отчета по аукциону - детализация по ценам
 * Особенности:
 * - Группирует заявки по цене для нижней таблицы
 * - Агрегирует количество, номинал, доходность
 * - Также возвращает общую информацию из Securities
 */
const auctionSummaryQuery = `
WITH trade_sums AS (
  SELECT DISTINCT ON (t."TradeNum")
    t."TradeDate",
    t."ClassCode",
    COALESCE(t."Yield", 0) AS "Yield",
    t."TradeNum",
    t."Price",
    t."Qty",
    t."Value",
    t."OrderNum",
    t."SecCode"
  FROM "Trades" t
  WHERE t."TradeDate" BETWEEN $1 AND COALESCE($2, $1)
  ORDER BY t."TradeNum", t."TradeDate" DESC
)
SELECT
  ROUND(t."Price", 2) AS "price",
  t."SecCode" AS "secCode",
  MAX(t."TradeDate") AS "tradeDate",
  MAX(t."ClassCode") AS "classCode",
  SUM(t."Qty" * COALESCE(s."FaceValue", 1)) AS "nominalSum",
  SUM(t."Qty" * t."Price") AS "valueActual",
  ROUND(AVG(t."Yield"), 2) AS "yieldPercent",
  ROUND(AVG(t."Yield"), 2) AS "yieldByPrice",
  SUM(t."Qty") AS "totalQty",
  MAX(s."SecFullName") AS "secFullName",
  CASE 
    WHEN t."Price" > 0 THEN 'Конкурентная'
    ELSE 'Неконкурентная'
  END AS "bidType"
FROM trade_sums t
LEFT JOIN "Securities" s ON s."SecCode" = t."SecCode"
GROUP BY t."Price", t."SecCode", 
  CASE 
    WHEN t."Price" > 0 THEN 'Конкурентная'
    ELSE 'Неконкурентная'
  END
ORDER BY t."Price" DESC
`.trim();

/**
 * Вторая сводная ведомость — сравнение текущего и предыдущего аукциона.
 * Одна дата: $1 = дата текущего аукциона (приложение передаёт также $2 = dateTo, используем COALESCE($1,$2)).
 */
const auctionSummary2Query = `
WITH
unique_trades AS (
    SELECT DISTINCT ON (t."TradeNum")
        t.*
    FROM "Trades" t
    WHERE t."TradeDate"::date <= (COALESCE($1, $2))::date
    ORDER BY t."TradeNum", t."TradeDate" DESC
),

-- Доходность при макс/мин цене за один проход
ranked AS (
    SELECT
        "TradeDate", "SecCode", "Price", "Yield",
        ROW_NUMBER() OVER (PARTITION BY "TradeDate", "SecCode" ORDER BY "Price" DESC NULLS LAST) AS rn_desc,
        ROW_NUMBER() OVER (PARTITION BY "TradeDate", "SecCode" ORDER BY "Price" ASC NULLS FIRST) AS rn_asc
    FROM unique_trades
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
    FROM unique_trades a
    LEFT JOIN "Securities" s ON s."SecCode" = a."SecCode"
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
    FROM unique_trades o
    LEFT JOIN "Securities" s ON s."SecCode" = o."SecCode"
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
    cur."TradeDate" AS current_date,
    prev."TradeDate" AS previous_date,
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
unique_trades AS (
  SELECT DISTINCT ON (t."TradeNum")
    t."TradeDate", t."SecCode", t."FirmName",
    t."Price", t."Qty", t."Value", COALESCE(t."Yield", 0) AS "Yield"
  FROM "Trades" t
  WHERE t."TradeDate"::date = (COALESCE($1, $2))::date
  ORDER BY t."TradeNum", t."TradeDate" DESC
),
auction_totals AS (
  SELECT
    u."TradeDate",
    u."SecCode",
    SUM(u."Qty" * COALESCE(s."FaceValue", 1)) AS issue_volume,
    SUM(CASE WHEN u."Price" = 0 THEN u."Value" ELSE 0 END) AS non_competitive_amount
  FROM unique_trades u
  LEFT JOIN "Securities" s ON s."SecCode" = u."SecCode"
  GROUP BY u."TradeDate", u."SecCode"
),
by_dealer AS (
  SELECT
    u."TradeDate",
    u."SecCode",
    COALESCE(NULLIF(TRIM(u."FirmName"), ''), '—') AS dealer_name,
    SUM(u."Qty" * COALESCE(s."FaceValue", 1)) AS nominal_value,
    ROUND(SUM(u."Qty" * u."Price") / NULLIF(SUM(u."Qty"), 0), 2) AS bid_price,
    ROUND(SUM(u."Qty" * u."Yield") / NULLIF(SUM(u."Qty"), 0), 2) AS yield_pct
  FROM unique_trades u
  LEFT JOIN "Securities" s ON s."SecCode" = u."SecCode"
  GROUP BY u."TradeDate", u."SecCode", u."FirmName"
)
SELECT
  b."SecCode" AS registration_number,
  b."TradeDate" AS auction_date,
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
WITH unique_trades AS (
  SELECT DISTINCT ON (t."TradeNum")
    t."TradeDate", t."SecCode", t."ClassCode",
    t."FirmId", t."FirmName",
    t."Price", t."Qty", t."Value", COALESCE(t."Yield", 0) AS "Yield"
  FROM "Trades" t
  WHERE t."TradeDate"::date = (COALESCE($1, $2))::date
  ORDER BY t."TradeNum", t."TradeDate" DESC
)
SELECT
  u."SecCode"                                                                       AS sec_code,
  u."TradeDate"                                                                     AS trade_date,
  MAX(u."ClassCode")                                                                AS class_code,
  MAX(s."SecFullName")                                                              AS sec_full_name,
  COALESCE(MAX(s."FaceValue"), 100)                                                 AS face_value,
  SUM(u."Qty")                                                                      AS issue_qty,
  0                                                                                 AS coupon_rate,
  ROUND(SUM(u."Qty" * u."Price") / NULLIF(SUM(u."Qty"), 0), 2)                     AS avg_price,
  ROUND(SUM(u."Qty" * u."Yield") / NULLIF(SUM(u."Qty"), 0), 2)                     AS avg_yield,
  SUM(u."Qty")                                                                      AS total_qty,
  SUM(u."Value")                                                                    AS total_value,
  COUNT(DISTINCT u."FirmId")                                                        AS participant_count,
  0                                                                                 AS financial_participants,
  COUNT(DISTINCT u."FirmId")                                                        AS institutional_investors,
  COUNT(DISTINCT u."FirmId")                                                        AS resident_count,
  0                                                                                 AS non_resident_count
FROM unique_trades u
LEFT JOIN "Securities" s ON s."SecCode" = u."SecCode"
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
unique_trades AS (
  SELECT DISTINCT ON (t."TradeNum")
    t."TradeDate", t."SecCode", t."FirmName",
    t."Price", t."Qty", t."Value", COALESCE(t."Yield", 0) AS "Yield"
  FROM "Trades" t
  WHERE t."TradeDate"::date = (COALESCE($1, $2))::date
  ORDER BY t."TradeNum", t."TradeDate" DESC
),
auction_totals AS (
  SELECT
    u."TradeDate",
    u."SecCode",
    SUM(u."Qty" * COALESCE(s."FaceValue", 1)) AS issue_volume,
    SUM(CASE WHEN u."Price" = 0 THEN u."Value" ELSE 0 END) AS non_competitive_amount
  FROM unique_trades u
  LEFT JOIN "Securities" s ON s."SecCode" = u."SecCode"
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
    ROUND(SUM(u."Qty" * u."Yield") / NULLIF(SUM(u."Qty"), 0), 2) AS yield_pct
  FROM unique_trades u
  LEFT JOIN "Securities" s ON s."SecCode" = u."SecCode"
  GROUP BY u."TradeDate", u."SecCode", u."FirmName"
)
SELECT
  b."SecCode" AS registration_number,
  b."TradeDate" AS auction_date,
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
 * SQL для Биржевого контракта (один документ на сделку)
 */
const exchangeContractQuery = `
WITH unique_trades AS (
  SELECT t.*
  FROM "Trades" t
  WHERE t."TradeDate" BETWEEN $1 AND COALESCE($2, $1)
  ORDER BY t."TradeNum", t."TradeDate" DESC
)
SELECT
  t."TradeNum" AS "id",
  MAX(t."TradeDate") AS "tradeDate",
  MAX(t."ClassCode") AS "classCode",
  MAX(t."SecCode") AS "secCode",
  MAX(CASE WHEN t."Operation" = 'Продажа' THEN NULLIF(TRIM(t."FirmName"), '') END) AS "sellerName",
  MAX(CASE WHEN t."Operation" = 'Продажа' THEN t."Account" END) AS "sellAccount",
  MAX(CASE WHEN t."Operation" = 'Купля' THEN NULLIF(TRIM(t."FirmName"), '') END) AS "buyerName",
  MAX(CASE WHEN t."Operation" = 'Купля' THEN t."Account" END) AS "buyAccount",
  MAX(t."Qty") AS "quantity",
  MAX(t."Price") AS "price",
  MAX(t."Value") AS "value",
  MAX(t."SettleDate") AS "settleDate",
  NULL::numeric AS "couponRate"
FROM unique_trades t
GROUP BY t."TradeNum"
ORDER BY t."TradeNum"
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
    code: 'Blank_Form_6A',
    name: 'Blank_Form_6A',
    description: 'Форма 6А - Сводный отчет по сделкам',
    type: 'table',
    category: 'Отчеты по системной информации',
    sql: baseTradesQuery,
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
    code: 'Blank_Form_USD',
    name: 'Blank_Form_USD',
    description: 'Отчет USD',
    type: 'table',
    category: 'Отчеты по системной информации',
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
];

/**
 * Получить определение формы по коду
 */
export function getReportDefinition(code: string): ReportDefinition | undefined {
  return reportDefinitions.find(r => r.code === code);
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
  return reportDefinitions.find(r => r.code === code)?.sql;
}
