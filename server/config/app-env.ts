export type AppEnv = 'development' | 'production';

/**
 * Окружение приложения (не путать с NODE_ENV сборки).
 * development — локальная разработка, без записи в боевой QUIK Export.
 * production — сервер/Docker, синхронизация справочников в QUIK разрешена.
 */
export function getAppEnv(): AppEnv {
  const raw = (process.env.APP_ENV ?? '').trim().toLowerCase();
  if (raw === 'production' || raw === 'prod') return 'production';
  if (raw === 'development' || raw === 'dev') return 'development';
  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
}

export function isProductionApp(): boolean {
  return getAppEnv() === 'production';
}

/** Запись в QUIK Export (синк справочников) — только на prod. */
export function canMutateQuikExport(): boolean {
  return isProductionApp();
}
