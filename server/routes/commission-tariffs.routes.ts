import { Router } from 'express';
import { authMiddleware, requireRole } from '../auth/middleware.js';
import {
  getAllCommissionTariffs,
  createCommissionTariff,
  updateCommissionTariff,
  deleteCommissionTariff,
} from '../db/repositories/commissionTariffs.js';
import { clearCommissionTariffsCache } from '../reports/commission-tariffs.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (_req, res) => {
  const list = await getAllCommissionTariffs();
  res.json(list);
});

router.use(requireRole('admin'));

router.post('/', async (req, res) => {
  const body = req.body ?? {};
  const {
    class_code,
    volume_from,
    volume_to,
    side,
    rate_percent,
    discount_percent,
    max_commission,
    valid_from,
    valid_to,
    is_active,
  } = body;
  if (side == null || rate_percent == null) {
    res.status(400).json({ error: 'side, rate_percent required' });
    return;
  }
  const volFrom = volume_from != null && volume_from !== '' ? Math.round(Number(volume_from)) : 0;
  const row = await createCommissionTariff({
    class_code: class_code ?? null,
    volume_from: volFrom,
    volume_to: volume_to != null && volume_to !== '' ? Math.round(Number(volume_to)) : null,
    side,
    rate_percent: Number(rate_percent),
    discount_percent: discount_percent != null ? Number(discount_percent) : null,
    max_commission: max_commission != null && max_commission !== '' ? Math.round(Number(max_commission)) : null,
    valid_from: valid_from ?? null,
    valid_to: valid_to ?? null,
    is_active: is_active !== false,
  });
  clearCommissionTariffsCache();
  res.status(201).json(row);
});

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const body = req.body ?? {};
  const data: Record<string, unknown> = {};
  if (body.class_code !== undefined) data.class_code = body.class_code;
  if (body.volume_from !== undefined) data.volume_from = Math.round(Number(body.volume_from));
  if (body.volume_to !== undefined) data.volume_to = body.volume_to == null || body.volume_to === '' ? null : Math.round(Number(body.volume_to));
  if (body.side !== undefined) data.side = body.side;
  if (body.rate_percent !== undefined) data.rate_percent = Number(body.rate_percent);
  if (body.discount_percent !== undefined) data.discount_percent = body.discount_percent == null ? null : Number(body.discount_percent);
  if (body.max_commission !== undefined) {
    data.max_commission =
      body.max_commission == null || body.max_commission === ''
        ? null
        : Math.round(Number(body.max_commission));
  }
  if (body.valid_from !== undefined) data.valid_from = body.valid_from;
  if (body.valid_to !== undefined) data.valid_to = body.valid_to;
  if (body.is_active !== undefined) data.is_active = Boolean(body.is_active);

  const row = await updateCommissionTariff(id, data as any);
  if (!row) {
    res.status(404).json({ error: 'Tariff not found' });
    return;
  }
  clearCommissionTariffsCache();
  res.json(row);
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  await deleteCommissionTariff(id);
  clearCommissionTariffsCache();
  res.status(204).send();
});

export default router;
