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

/** Ручное обновление курса (только для admin) */
router.post('/refresh', async (req, res) => {
  const user = (req as any).user;
  if (user?.role !== 'admin') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  await fetchAndSaveRates();
  const rates = await getLatestCurrencyRates();
  res.json({ ok: true, rates: rates.map(mapRow) });
});

export default router;
