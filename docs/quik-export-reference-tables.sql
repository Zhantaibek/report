-- Справочники-зеркала в БД QUIK Export (копии из APP_DB quik_reports).
-- Таблицы создаются автоматически при первой синхронизации; этот скрипт — для ручного развёртывания.

CREATE TABLE IF NOT EXISTS trade_class_rules (
  id SERIAL PRIMARY KEY,
  class_code TEXT NOT NULL UNIQUE,
  class_name TEXT,
  market_type TEXT NOT NULL CHECK (market_type IN ('primary', 'secondary'))
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

CREATE TABLE IF NOT EXISTS currency_rates (
  id SERIAL PRIMARY KEY,
  currency_code TEXT NOT NULL,
  rate_date DATE NOT NULL,
  rate DOUBLE PRECISION NOT NULL,
  UNIQUE (currency_code, rate_date)
);

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

-- Права для пользователя приложения (пример):
-- GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON trade_class_rules, commission_tariffs, currency_rates, emitents TO quikexp;
