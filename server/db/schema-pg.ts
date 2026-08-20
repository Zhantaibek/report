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

-- Миграция: удаляем устаревшие таблицы data_sources, field_mappings
DO $$ BEGIN
  DROP TABLE IF EXISTS field_mappings;
  DROP TABLE IF EXISTS data_sources;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Брокеры — получатели email-отчётов (firm_id / name из QUIK Firms)
CREATE TABLE IF NOT EXISTS brokers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  firm_id TEXT,
  address TEXT,
  contacts TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_brokers_email ON brokers(LOWER(email));
CREATE UNIQUE INDEX IF NOT EXISTS idx_brokers_firm_id ON brokers(firm_id) WHERE firm_id IS NOT NULL AND firm_id <> '';

-- Пользователи QUIK (справочник, импорт из Excel)
CREATE TABLE IF NOT EXISTS quik_users (
  id SERIAL PRIMARY KEY,
  uid INTEGER NOT NULL UNIQUE,
  last_name TEXT,
  first_name TEXT,
  patronymic TEXT,
  login TEXT,
  date_from DATE,
  date_to DATE,
  org_code TEXT,
  org_name TEXT,
  blocked BOOLEAN NOT NULL DEFAULT FALSE,
  comment TEXT,
  is_service BOOLEAN NOT NULL DEFAULT FALSE,
  main_uid INTEGER,
  last_login TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quik_users_login ON quik_users(login);
CREATE UNIQUE INDEX IF NOT EXISTS idx_quik_users_login_unique ON quik_users (LOWER(login)) WHERE login IS NOT NULL AND btrim(login) <> '';
CREATE INDEX IF NOT EXISTS idx_quik_users_org_code ON quik_users(org_code);

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brokers' AND column_name = 'address'
  ) THEN
    ALTER TABLE brokers ADD COLUMN address TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'brokers' AND column_name = 'contacts'
  ) THEN
    ALTER TABLE brokers ADD COLUMN contacts TEXT;
  END IF;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Отправленные email-отчёты: один файл на тип + дату, рассылка всем брокерам
CREATE TABLE IF NOT EXISTS email_reports (
  id SERIAL PRIMARY KEY,
  report_code TEXT NOT NULL,
  report_name TEXT NOT NULL,
  report_date DATE NOT NULL,
  filename TEXT NOT NULL DEFAULT '',
  broker_ids INTEGER[] NOT NULL DEFAULT '{}',
  sent_at TIMESTAMPTZ,
  send_status TEXT NOT NULL DEFAULT 'pending' CHECK(send_status IN ('pending', 'sent', 'failed', 'partial')),
  send_error TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (report_code, report_date)
);
CREATE INDEX IF NOT EXISTS idx_email_reports_report_date ON email_reports(report_date DESC);

-- Миграция: email_report_brokers -> одна таблица email_reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'email_reports' AND column_name = 'filename'
  ) THEN
    ALTER TABLE email_reports ADD COLUMN filename TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'email_reports' AND column_name = 'content_type'
  ) THEN
    ALTER TABLE email_reports ADD COLUMN content_type TEXT NOT NULL DEFAULT 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'email_reports' AND column_name = 'file_data'
  ) THEN
    ALTER TABLE email_reports ADD COLUMN file_data BYTEA NOT NULL DEFAULT '\\x';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'email_reports' AND column_name = 'broker_ids'
  ) THEN
    ALTER TABLE email_reports ADD COLUMN broker_ids INTEGER[] NOT NULL DEFAULT '{}';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'email_reports' AND column_name = 'sent_at'
  ) THEN
    ALTER TABLE email_reports ADD COLUMN sent_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'email_reports' AND column_name = 'send_status'
  ) THEN
    ALTER TABLE email_reports ADD COLUMN send_status TEXT NOT NULL DEFAULT 'pending';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'email_reports' AND column_name = 'send_error'
  ) THEN
    ALTER TABLE email_reports ADD COLUMN send_error TEXT;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_report_brokers') THEN
    UPDATE email_reports er
    SET
      filename = sub.filename,
      content_type = sub.content_type,
      file_data = sub.file_data,
      broker_ids = sub.broker_ids,
      sent_at = sub.sent_at,
      send_status = sub.send_status,
      send_error = sub.send_error
    FROM (
      SELECT
        erb.email_report_id,
        (array_agg(erb.filename ORDER BY erb.id))[1] AS filename,
        (array_agg(erb.content_type ORDER BY erb.id))[1] AS content_type,
        (array_agg(erb.file_data ORDER BY erb.id))[1] AS file_data,
        array_agg(DISTINCT erb.broker_id ORDER BY erb.broker_id) AS broker_ids,
        MAX(erb.sent_at) AS sent_at,
        CASE
          WHEN BOOL_AND(erb.send_status = 'sent') THEN 'sent'
          WHEN BOOL_AND(erb.send_status = 'pending') THEN 'pending'
          WHEN BOOL_OR(erb.send_status = 'failed') AND BOOL_OR(erb.send_status = 'sent') THEN 'partial'
          WHEN BOOL_OR(erb.send_status = 'failed') THEN 'failed'
          ELSE 'pending'
        END AS send_status,
        NULLIF(string_agg(DISTINCT erb.send_error, '; ') FILTER (WHERE erb.send_error IS NOT NULL), '') AS send_error
      FROM email_report_brokers erb
      GROUP BY erb.email_report_id
    ) sub
    WHERE er.id = sub.email_report_id;

    DROP TABLE email_report_brokers;
  END IF;

  ALTER TABLE email_reports DROP COLUMN IF EXISTS broker_id;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    WHERE t.relname = 'email_reports' AND c.contype = 'u'
      AND pg_get_constraintdef(c.oid) LIKE '%(report_code, report_date)%'
  ) THEN
    DELETE FROM email_reports er
    WHERE er.id NOT IN (
      SELECT MIN(id) FROM email_reports GROUP BY report_code, report_date
    );
    ALTER TABLE email_reports
      ADD CONSTRAINT email_reports_report_code_report_date_key UNIQUE (report_code, report_date);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_email_reports_broker_ids ON email_reports USING GIN (broker_ids);

-- Миграция: файлы не храним в БД (генерация при отправке/скачивании)
DO $$ BEGIN
  ALTER TABLE email_reports DROP COLUMN IF EXISTS file_data;
  ALTER TABLE email_reports DROP COLUMN IF EXISTS content_type;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Миграция: удаляем устаревшие индексы если остались
DO $$ BEGIN
  DROP INDEX IF EXISTS idx_email_reports_sent_at;
  DROP INDEX IF EXISTS idx_email_reports_broker;
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
