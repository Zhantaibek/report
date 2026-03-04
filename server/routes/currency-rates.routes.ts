import { Router } from 'express';
import { getCurrencyRates, getLatestCurrencyRates } from '../db/repositories/currencyRates.js';
import { fetchAndSaveRates } from '../jobs/currency-rates.js';
import { authMiddleware } from '../auth/middleware.js';

const router = Router();
router.use(authMiddleware);

const mapRow = (r: { currency_code: string; rate_date: string; rate: number; updated_at: string }) => ({
  currencyCode: r.currency_code,
  rateDate: r.rate_date,
  rate: r.rate,
  updatedAt: r.updated_at,
});

/** Последний курс по каждой валюте */
router.get('/latest', async (_req, res) => {
  const rates = await getLatestCurrencyRates();
  res.json(rates.map(mapRow));
});

/** История курсов (все даты) */
router.get('/', async (_req, res) => {
  const rates = await getCurrencyRates();
  res.json(rates.map(mapRow));
});

/** Обновление курса */
router.post('/refresh', async (_req, res) => {
  const result = await fetchAndSaveRates();
  const rates = await getLatestCurrencyRates();
  const status = result.updated.length > 0 ? 'updated' : 'skipped';
  res.json({ ok: true, status, rates: rates.map(mapRow) });
});

export default router;
