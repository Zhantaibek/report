/**
 * PostgreSQL schema for app DB. External trading DBs are never modified.
 */
export const schema = `
-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  login TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin', 'employee')),
  display_name TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Report forms (minimal metadata, SQL in code)
CREATE TABLE IF NOT EXISTS report_forms (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK(type IN ('table', 'summary', 'chart')),
  category TEXT NOT NULL DEFAULT 'Отчеты по системной информации',
  single_date BOOLEAN DEFAULT FALSE
);

-- Курсы валют к сому: одна строка на каждый день и каждую валюту
CREATE TABLE IF NOT EXISTS currency_rates (
  id SERIAL PRIMARY KEY,
  currency_code TEXT NOT NULL,
  rate_date DATE NOT NULL DEFAULT CURRENT_DATE,
  rate DOUBLE PRECISION NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (currency_code, rate_date)
);

-- Идемпотентные ALTER TABLE для существующих установок
DO $$ BEGIN
  -- Добавляем rate_date если нет
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'currency_rates' AND column_name = 'rate_date'
  ) THEN
    ALTER TABLE currency_rates ADD COLUMN rate_date DATE NOT NULL DEFAULT CURRENT_DATE;
  END IF;

  -- Удаляем base_currency если есть
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'currency_rates' AND column_name = 'base_currency'
  ) THEN
    ALTER TABLE currency_rates DROP COLUMN base_currency;
  END IF;

  -- Удаляем старый уникальный индекс только по currency_code
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'currency_rates_currency_code_key' AND contype = 'u'
  ) THEN
    ALTER TABLE currency_rates DROP CONSTRAINT currency_rates_currency_code_key;
  END IF;
END $$;

-- Уникальный индекс (currency_code, rate_date) — для существующих установок
CREATE UNIQUE INDEX IF NOT EXISTS currency_rates_code_date_idx ON currency_rates(currency_code, rate_date);

-- Миграция: удаляем таблицы data_sources, field_mappings, brokers (перенесены в код / .env)
DO $$ BEGIN
  DROP TABLE IF EXISTS field_mappings;
  DROP TABLE IF EXISTS data_sources;
  DROP TABLE IF EXISTS brokers;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Миграция: удаляем broker_id из users если существует
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'broker_id'
  ) THEN
    ALTER TABLE users DROP COLUMN IF EXISTS broker_id;
  END IF;
END $$;

-- Миграция: только роли admin и employee
DO $$
DECLARE
  cname text;
BEGIN
  UPDATE users SET role = 'employee' WHERE role IN ('broker', 'exchange');
  FOR cname IN
    SELECT con.conname FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    WHERE rel.relname = 'users' AND con.contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE users DROP CONSTRAINT IF EXISTS %I', cname);
  END LOOP;
  ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'employee'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
`;
