import dotenv from 'dotenv';

dotenv.config();

export type DatabaseConfig = {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
};

export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  apiBase: process.env.API_BASE ?? '/api',
  nodeEnv: process.env.NODE_ENV ?? 'development',

  database: {
    host: process.env.APP_DB_HOST ?? 'localhost',
    port: parseInt(process.env.APP_DB_PORT ?? '5432', 10),
    database: process.env.APP_DB_NAME ?? 'quik_reports',
    user: process.env.APP_DB_USER ?? 'postgres',
    password: process.env.APP_DB_PASSWORD ?? '',
  },

  jwt: {
    secret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },

  currency: {
    // URL API Национального банка Кыргызской Республики (XML, windows-1251)
    apiUrl: process.env.CURRENCY_API_URL ?? 'https://www.nbkr.kg/XML/daily.xml',
    // Время ежедневного запуска: час и минута по UTC+utcOffsetHours (Бишкек = UTC+6)
    dailyHour: parseInt(process.env.CURRENCY_DAILY_HOUR ?? '9', 10),
    dailyMinute: parseInt(process.env.CURRENCY_DAILY_MINUTE ?? '0', 10),
    utcOffsetHours: parseInt(process.env.CURRENCY_UTC_OFFSET ?? '6', 10),
  },

  oracle: {
    host: process.env.ORACLE_DB_HOST ?? '',
    port: parseInt(process.env.ORACLE_DB_PORT ?? '1521', 10),
    sid: process.env.ORACLE_DB_SID ?? '',
    serviceName: process.env.ORACLE_DB_NAME ?? '',
    user: process.env.ORACLE_DB_USER ?? '',
    password: process.env.ORACLE_DB_PASSWORD ?? '',
    ownId: parseInt(process.env.ORACLE_DB_OWNID ?? '0', 10),
  },
};
