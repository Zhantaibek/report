import { Router } from 'express';
import {
  getCurrencyRates,
  getLatestCurrencyRates,
  upsertCurrencyRate,
  updateCurrencyRateById,
  deleteCurrencyRate,
} from '../db/repositories/currencyRates.js';
import { fetchAndSaveRates } from '../jobs/currency-rates.js';
import { authMiddleware } from '../auth/middleware.js';
import { scheduleReferenceSyncToQuik } from '../db/sync-reference-to-quik.js';

const router = Router();
router.use(authMiddleware);

const mapRow = (r: { id: number; currency_code: string; rate_date: string; rate: number; updated_at: string }) => ({
  id: r.id,
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

/** Обновление курса (автообновление из внешнего источника) */
router.post('/refresh', async (_req, res) => {
  const result = await fetchAndSaveRates();
  scheduleReferenceSyncToQuik(['currency_rates']);
  const rates = await getLatestCurrencyRates();
  const status = result.updated.length > 0 ? 'updated' : 'skipped';
  res.json({ ok: true, status, rates: rates.map(mapRow) });
});

/** Создать курс вручную */
router.post('/', async (req, res) => {
  const { currency_code, rate_date, rate } = req.body as {
    currency_code: string;
    rate_date: string;
    rate: number;
  };
  if (!currency_code || !rate_date || rate == null) {
    res.status(400).json({ error: 'currency_code, rate_date и rate обязательны' });
    return;
  }
  await upsertCurrencyRate(currency_code.toUpperCase(), Number(rate), rate_date);
  scheduleReferenceSyncToQuik(['currency_rates']);
  res.json({ ok: true });
});

/** Изменить курс по id */
router.put('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const { currency_code, rate_date, rate } = req.body as {
    currency_code: string;
    rate_date: string;
    rate: number;
  };
  if (!id || !currency_code || !rate_date || rate == null) {
    res.status(400).json({ error: 'currency_code, rate_date и rate обязательны' });
    return;
  }
  await updateCurrencyRateById(id, currency_code.toUpperCase(), Number(rate), rate_date);
  scheduleReferenceSyncToQuik(['currency_rates']);
  res.json({ ok: true });
});

/** Удалить курс по id */
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!id) {
    res.status(400).json({ error: 'Неверный id' });
    return;
  }
  await deleteCurrencyRate(id);
  scheduleReferenceSyncToQuik(['currency_rates']);
  res.json({ ok: true });
});

export default router;
