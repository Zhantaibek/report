/**
 * PostgreSQL schema for app DB.
 * QUIK Export: только SELECT по торговым таблицам; справочники (trade_class_rules,
 * commission_tariffs, currency_rates, emitents) синхронизируются как зеркала — см. sync-reference-to-quik.ts.
 */
export const schema = `
-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  login TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK(role IN ('admin', 'employee')),
  display_name TEXT,
  email TEXT,
  position TEXT,
  phone TEXT,
  department_name TEXT,
  organization TEXT,
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

CREATE TABLE IF NOT EXISTS commission_tariffs (
  id SERIAL PRIMARY KEY,
  class_code TEXT,
  volume_from NUMERIC(18,0) NOT NULL,
  volume_to NUMERIC(18,0),
  side TEXT NOT NULL CHECK (side IN ('seller', 'buyer', 'both')),
  rate_percent NUMERIC(9,2) NOT NULL,
  discount_percent NUMERIC(9,2),
  max_commission NUMERIC(18,0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
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

-- Commission tariffs: добавляем class_code для существующих БД, если его ещё нет
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commission_tariffs' AND column_name = 'class_code'
  ) THEN
    ALTER TABLE commission_tariffs ADD COLUMN class_code TEXT;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Commission tariffs: объёмы без дробной части (миграция для существующих БД)
DO $$ BEGIN
  ALTER TABLE commission_tariffs ALTER COLUMN volume_from TYPE NUMERIC(18,0) USING volume_from::numeric(18,0);
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE commission_tariffs ALTER COLUMN volume_to TYPE NUMERIC(18,0) USING volume_to::numeric(18,0);
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE commission_tariffs ALTER COLUMN rate_percent TYPE NUMERIC(9,2) USING rate_percent::numeric(9,2);
EXCEPTION WHEN others THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE commission_tariffs ALTER COLUMN discount_percent TYPE NUMERIC(9,2) USING discount_percent::numeric(9,2);
EXCEPTION WHEN others THEN NULL;
END $$;

-- Commission tariffs: верхний предел комиссии
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commission_tariffs' AND column_name = 'max_commission'
  ) THEN
    ALTER TABLE commission_tariffs ADD COLUMN max_commission NUMERIC(18,0);
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Commission tariffs: удаляем priority для существующих БД
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'commission_tariffs' AND column_name = 'priority'
  ) THEN
    ALTER TABLE commission_tariffs DROP COLUMN priority;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  DROP TABLE IF EXISTS commission_tariff_classes;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Эмитенты (справочник; синхронизация в QUIK Export при APP_ENV=production)
CREATE TABLE IF NOT EXISTS emitents (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(255),
  address VARCHAR(500),
  city INTEGER,
  area INTEGER,
  state INTEGER,
  code CHAR(4),
  infusion NUMERIC(18,2),
  price NUMERIC(18,6),
  ind INTEGER,
  name_eng VARCHAR(255)
);

-- Классы торгов: соответствие ClassCode → тип рынка (первичный / вторичный)
CREATE TABLE IF NOT EXISTS trade_class_rules (
  id SERIAL PRIMARY KEY,
  class_code TEXT NOT NULL UNIQUE,
  class_name TEXT,
  market_type TEXT NOT NULL CHECK (market_type IN ('primary', 'secondary'))
);

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

-- Миграция: удаляем password_hash (авторизация через LDAP)
DO $$ BEGIN
  ALTER TABLE users DROP COLUMN IF EXISTS password_hash;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Миграция: поля профиля из LDAP
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'email') THEN
    ALTER TABLE users ADD COLUMN email TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'position') THEN
    ALTER TABLE users ADD COLUMN position TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone') THEN
    ALTER TABLE users ADD COLUMN phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'department_name') THEN
    ALTER TABLE users ADD COLUMN department_name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'organization') THEN
    ALTER TABLE users ADD COLUMN organization TEXT;
  END IF;
EXCEPTION WHEN others THEN NULL;
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
