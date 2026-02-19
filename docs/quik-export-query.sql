-- Адаптированный запрос для Формы 1 (Отчет о заключенных сделках)
-- Использует реальную структуру таблицы Trades из QUIK Export

WITH unique_trades AS (
    SELECT 
        DISTINCT ON (t."TradeNum")
        t.*
    FROM "Trades" t
    WHERE t."TradeDate" BETWEEN $1 AND $2
      -- Фильтр по ClassCode (если задан)
      AND ($3::text IS NULL OR t."ClassCode" = $3)
      -- Фильтр по SecCode/инструменту (если задан)
      AND ($4::text IS NULL OR t."SecCode" ILIKE '%' || $4 || '%')
    ORDER BY t."TradeNum", t."TradeDate" DESC
)
SELECT 
    "TradeNum" as id,
    "ClassCode" as class_code,
    "SecCode" as sec_code,
    "TradeDate" as trade_date,
    "SettleDate" as settle_date,
    "FirmId" as firm_id,
    "FirmName" as firm_name,
    "CPFirmId" as cp_firm_id,
    "Price" as price,
    "Qty" as quantity,
    "Value" as value
FROM unique_trades
ORDER BY "TradeDate", "TradeNum";

-- Параметры:
-- $1: dateFrom (формат '2024-01-01')
-- $2: dateTo (формат '2024-12-31')
-- $3: classCode (опционально)
-- $4: instrument/SecCode для фильтра (опционально, ILIKE поиск)
