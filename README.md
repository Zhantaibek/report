# Система отчётности по сделкам (quik_reports_v2)

Веб-приложение для просмотра отчётов по сделкам из нескольких внешних БД (PostgreSQL, MSSQL, MySQL). Только чтение данных; роли: администратор, брокер, сотрудник биржи.

## Требования

- Node.js 18+
- Внешние БД торговой системы (подключаются по настройкам; к ним выполняются **только SELECT**)

## Установка

Создайте БД в PostgreSQL (например `CREATE DATABASE quik_reports;`), скопируйте `.env.example` в `.env` и задайте `APP_DB_*`.

```bash
npm install
npm run db:migrate
npm run db:seed
```

Сидер создаёт:
- пользователя **admin** / пароль **admin**;
- справочник брокеров, формы отчётов, курс USD.

## Запуск

- Разработка (сервер + клиент с hot reload):
  ```bash
  npm run dev
  ```
  Сервер: http://localhost:3001, клиент: http://localhost:5173 (проксирует /api на 3001).

- Production:
  ```bash
  npm run build
  npm start
  ```
  Открыть http://localhost:3001 (API и SPA с одной точки входа).

## Подключение БД QUIK Export (PostgreSQL)

Скопируйте `.env.example` в `.env` и задайте параметры подключения:

- `POSTGRES_QUIK_HOST` (например `172.23.10.84`)
- `POSTGRES_QUIK_PORT` (по умолчанию `5432`)
- `POSTGRES_QUIK_DATABASE` (`quik_export`)
- `POSTGRES_QUIK_USER` (`quikexp`)
- `POSTGRES_QUIK_PASSWORD` — пароль (обязательно)

Затем выполните:

```bash
npm run db:seed
```

В систему будет добавлен источник данных «QUIK Export» с плейсхолдер-маппингом на таблицу `trades`. Если в вашей БД другая таблица или имена столбцов — настройте маппинг в админке (Источники БД → маппинг полей).

## Переменные окружения

См. `.env.example`:
- `PORT` — порт сервера;
- `APP_DB_HOST`, `APP_DB_PORT`, `APP_DB_NAME`, `APP_DB_USER`, `APP_DB_PASSWORD` — подключение к нашей БД (PostgreSQL);
- `JWT_SECRET`, `JWT_EXPIRES_IN` — авторизация;
- `CURRENCY_UPDATE_INTERVAL_MS`, `CURRENCY_API_URL` — обновление курсов валют;
- `POSTGRES_QUIK_*` — подключение к БД QUIK Export (см. выше).

## API (префикс `/api`)

- `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`
- `GET /currency-rates`
- `GET /report-forms`, `GET /report-forms/:id`
- `POST /reports/run` — тело: `reportFormId`, `dataSourceIds?`, `filters`, `page`, `limit`
- `POST /reports/export` — тело: `reportFormId`, `filters`, `format` (xlsx | csv)
- `GET/POST/PUT/DELETE /brokers`, `GET/POST/PUT/DELETE /data-sources`, `GET/POST/PUT/DELETE /users` (admin)
- `GET/POST/PUT/DELETE /admin/report-forms` (admin)

## Структура

- `server/` — Express, наша БД (PostgreSQL), слой доступа к внешним БД (только SELECT), движок отчётов, авторизация, задачи (курсы валют).
- `client/` — SPA (React, Vite): логин, дашборд, отчёты, экспорт, админ-разделы.

К внешним БД торговой системы выполняются **только SELECT**; изменение данных и схемы запрещено.
