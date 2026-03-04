/**
 * Ежедневное получение курса USD от Национального банка Кыргызской Республики (НБКР).
 * Endpoint: https://www.nbkr.kg/XML/daily.xml
 * Формат: XML, кодировка windows-1251, разделитель дробной части — запятая.
 * Запускается один раз при старте сервера, затем ежедневно в заданное время (по умолчанию 09:00 UTC+6).
 */
import { upsertCurrencyRate } from '../db/repositories/currencyRates.js';
import { config } from '../config/index.js';

/**
 * Делаем запрос к НБКР и сохраняем курс USD в БД.
 */
export interface RefreshResult {
  updated: string[];
  skipped: string[];
}

export async function fetchAndSaveRates(): Promise<RefreshResult> {
  const result: RefreshResult = { updated: [], skipped: [] };
  try {
    const url = config.currency.apiUrl;
    console.log(`[currency-job] Fetching rates from ${url}`);

    const res = await fetch(url, { headers: { Accept: '*/*' } });
    if (!res.ok) {
      console.error(`[currency-job] HTTP error ${res.status}`);
      return result;
    }

    const buffer = await res.arrayBuffer();
    let text: string;
    try {
      const decoder = new TextDecoder('windows-1251');
      text = decoder.decode(buffer);
    } catch {
      text = new TextDecoder('utf-8').decode(buffer);
    }

    await parseAndSaveNbkrXml(text, result);
    if (result.updated.length === 0 && result.skipped.length === 0) {
      console.warn('[currency-job] No rates found in NBKR response');
    } else {
      console.log(`[currency-job] Updated: ${result.updated.join(', ') || '—'}, Skipped: ${result.skipped.join(', ') || '—'}`);
    }
  } catch (err) {
    console.error('[currency-job] Fetch error:', err);
  }
  return result;
}

/**
 * Разбирает XML-ответ НБКР и сохраняет нужные валюты в БД.
 *
 * Пример XML:
 *   <rates date="19.02.2026">
 *     <currency ISOCode="USD">
 *       <unit>1</unit>
 *       <description>Доллар США</description>
 *       <value>87,41</value>
 *     </currency>
 *   </rates>
 */
async function parseAndSaveNbkrXml(xml: string, result: RefreshResult): Promise<void> {
  const TARGET_CODES = ['USD'];

  const rateDate = new Date().toISOString().slice(0, 10);

  for (const code of TARGET_CODES) {
    const blockRe = new RegExp(
      `<currency[^>]+ISOCode="${code}"[^>]*>[\\s\\S]*?</currency>`,
      'i'
    );
    const block = xml.match(blockRe)?.[0];
    if (!block) continue;

    const valueStr = block.match(/<value>([\d,. ]+)<\/value>/i)?.[1];
    if (!valueStr) continue;

    const rate = parseFloat(valueStr.replace(/\s/g, '').replace(',', '.'));
    if (!isFinite(rate) || rate <= 0) continue;

    try {
      await upsertCurrencyRate(code, rate, rateDate);
      result.updated.push(`${code}=${rate} (${rateDate})`);
    } catch (err) {
      console.error(`[currency-job] DB error for ${code}:`, err);
    }
  }
}

/**
 * Вычисляет, сколько миллисекунд до следующего запуска (targetHour:targetMinute в UTC+offset).
 */
function msUntilNextRun(targetHour: number, targetMinute: number, utcOffsetHours: number): number {
  const now = new Date();
  const localNow = new Date(now.getTime() + utcOffsetHours * 60 * 60 * 1000);

  // Следующий запуск: сегодня в targetHour:targetMinute (UTC+offset)
  const next = new Date(localNow);
  next.setUTCHours(targetHour - utcOffsetHours, targetMinute, 0, 0);

  // Если время уже прошло — переносим на завтра
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  return next.getTime() - now.getTime();
}

/**
 * Запускает задание: немедленный первый прогон, затем ежедневно в config.currency.dailyHour:dailyMinute.
 */
export function startCurrencyRatesJob(): void {
  const { dailyHour, dailyMinute, utcOffsetHours } = config.currency;

  // Немедленный прогон при старте
  fetchAndSaveRates();

  // Планируем следующий запуск и так далее рекурсивно каждые 24 часа
  function scheduleNext() {
    const delay = msUntilNextRun(dailyHour, dailyMinute, utcOffsetHours);
    const nextAt = new Date(Date.now() + delay).toISOString();
    console.log(`[currency-job] Next run scheduled at ${nextAt} (in ${Math.round(delay / 60000)} min)`);

    setTimeout(async () => {
      await fetchAndSaveRates();
      scheduleNext();
    }, delay);
  }

  scheduleNext();
  console.log(`[currency-job] Started. Daily at ${String(dailyHour).padStart(2, '0')}:${String(dailyMinute).padStart(2, '0')} UTC+${utcOffsetHours}`);
}
