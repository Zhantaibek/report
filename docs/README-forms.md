# Настройка форм отчётов для QUIK Export

## 1. Маппинг полей

В seed (`server/db/seed.ts`) уже настроен маппинг для таблицы **Trades** из QUIK Export:

```javascript
await fieldMappingsRepo.upsertFieldMapping(id, 'Trades', {
  id: 'TradeNum',           // Номер сделки
  brokerCode: 'FirmId',     // ID фирмы-брокера
  brokerName: 'FirmName',   // Название фирмы
  counterparty: 'CPFirmId', // ID контрагента
  classCode: 'ClassCode',   // Класс инструмента
  secCode: 'SecCode',       // Код инструмента
  tradeDate: 'TradeDate',   // Дата сделки
  settleDate: 'SettleDate', // Дата расчётов
  price: 'Price',           // Цена
  quantity: 'Qty',          // Количество
  value: 'Value',           // Сумма сделки
});
```

## 2. Создание формы отчёта с кастомным SQL

### Через админку (рекомендуется):

1. Зайти в админку → **Формы отчётов** (если добавить обратно в меню)
2. Создать форму:
   - **Название**: `Blank_Form_1`
   - **Код**: `blank_form_1`
   - **Описание**: `Форма 1 - Отчет о заключенных сделках`
   - **Тип**: `table`
   - **Custom SQL**: вставить запрос из `docs/quik-export-query.sql`

### Через SQL напрямую в БД:

```sql
INSERT INTO report_forms (name, code, description, type, custom_sql)
VALUES (
  'Blank_Form_1',
  'blank_form_1',
  'Форма 1 - Отчет о заключенных сделках',
  'table',
  'WITH unique_trades AS (
    SELECT 
        DISTINCT ON (t."TradeNum")
        t.*
    FROM "Trades" t
    WHERE t."TradeDate" BETWEEN $1 AND $2
      AND ($3::text IS NULL OR t."ClassCode" = $3)
      AND ($4::text IS NULL OR t."SecCode" ILIKE ''%'' || $4 || ''%'')
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
ORDER BY "TradeDate", "TradeNum";'
);
```

## 3. Параметры запроса

Кастомный SQL принимает параметры в следующем порядке:
- **$1**: `dateFrom` — дата начала периода (формат '2024-01-01')
- **$2**: `dateTo` — дата окончания периода
- **$3**: `classCode` — фильтр по классу (опционально, NULL если не задан)
- **$4**: `instrument` — фильтр по инструменту/SecCode (опционально, ILIKE поиск)

## 4. Применение миграции

После обновления кода выполните:

```bash
npm run db:migrate
npm run db:seed
```

Seed обновит маппинг для источника QUIK Export, если он уже существует.

## 5. Использование в UI

После создания формы она появится в списке «Форма отчёта» на странице Отчёты. При выборе формы и нажатии «Сформировать» система выполнит кастомный SQL (если он задан) вместо автоматической генерации запроса.
