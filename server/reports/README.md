# Отчеты - Структура и определения

## Гибридная архитектура форм отчетов

Формы отчетов используют **гибридный подход**:
- **Базовые данные** (id, code, name, description, type) хранятся в БД (таблица `report_forms`)
- **SQL-запросы** и бизнес-логика хранятся в коде (`report-definitions.ts`)

### Файл `report-definitions.ts`

Содержит:
- **`baseTradesQuery`** - базовый SQL-запрос для уникальных сделок
- **`form9Query`** - специальный SQL для Формы 9 (группировка по TradeNum)
- **`auctionSummaryQuery`** - SQL для сводной ведомости по аукциону (агрегация по SecCode с разделением на конкурентные/неконкурентные)
- **`reportDefinitions[]`** - массив всех форм отчетов с их конфигурацией, категорией и SQL
- **`getReportDefinition(code)`** - получить определение по коду
- **`getAllReportDefinitions()`** - получить все формы
- **`getSqlForReport(code)`** - получить SQL по коду формы

### База данных `report_forms`

Минимальная структура:
```sql
CREATE TABLE report_forms (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK(type IN ('table', 'summary', 'chart')),
  category TEXT NOT NULL DEFAULT 'Отчеты по системной информации',
  single_date BOOLEAN DEFAULT FALSE  -- Если TRUE, требуется только одна дата
);
```

### Как это работает

1. **API (report-forms.routes.ts)**:
   - Возвращает формы из БД (`report_forms`)
   - Содержит только базовые метаданные

2. **report-engine.ts**:
   - Получает форму из БД по ID (базовые данные)
   - Получает SQL из `report-definitions.ts` по коду формы
   - Если SQL нет - автогенерация

3. **Синхронизация (seed.ts)**:
   - При запуске `npm run db:seed` автоматически синхронизирует формы из кода в БД
   - Создает только отсутствующие формы

4. **Преимущества**:
   - ✅ SQL версионируется через Git
   - ✅ Переиспользование SQL для похожих форм
   - ✅ Базовые данные в БД для фронтенда
   - ✅ Автоматическая синхронизация через seed

### Добавление нового отчета

**Шаг 1**: Добавьте форму в `report-definitions.ts`:

```typescript
export const reportDefinitions: ReportDefinition[] = [
  // ... существующие формы
  {
    code: 'My_New_Form',
    name: 'My_New_Form',
    description: 'Моя новая форма',
    type: 'table',
    category: 'Отчеты по системной информации', // или другая категория
    sql: baseTradesQuery, // или свой кастомный SQL
  },
];
```

**Шаг 2**: Запустите синхронизацию:

```bash
npm run db:seed
```

Новая форма автоматически появится в БД и будет доступна в API!

### Текущие формы отчетов

#### Отчеты по системной информации:
- **Blank_Form_1** - Форма 1: Отчет о заключенных сделках (использует `baseTradesQuery`)
- **Blank_Form_2** - Форма 2: Отчет о заключенных сделках - агрегация (использует `baseTradesQuery`)
- **Blank_Form_3** - Форма 3: Отчет о заключенных сделках по участникам (использует `baseTradesQuery`)
- **Blank_Form_6A** - Форма 6А: Сводный отчет по сделкам (использует `baseTradesQuery`)
- **Blank_Form_6B** - Форма 6Б: Сводный отчет по сделкам (использует `baseTradesQuery`)
- **Blank_Form_9** - Форма 9: Ведомость заключенных сделок (использует `form9Query`)
- **Blank_Form_USD** - Отчет USD

#### Отчеты по Аукциону:
- **Auction_Summary** - Сводная ведомость по аукциону ГЦБ (использует `auctionSummaryQuery`)
  - Группировка по SecCode
  - Разделение на конкурентные и неконкурентные заявки
  - Вычисление процентов от общего объема

### Группировка отчетов

Отчеты автоматически группируются по категориям в UI. Для добавления новой категории:
1. Создайте формы с новой категорией в `report-definitions.ts`
2. Запустите `npm run db:seed`
3. Новая категория появится в выпадающем списке автоматически
