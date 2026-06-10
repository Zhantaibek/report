import { Router } from 'express';
import { authMiddleware, requireRole } from '../auth/middleware.js';
import {
  getAllTradeClassRules,
  createTradeClassRule,
  updateTradeClassRule,
  deleteTradeClassRule,
  type MarketType,
} from '../db/repositories/tradeClassRules.js';
import { clearTradeClassRulesCache } from '../reports/market-type.js';
import { scheduleReferenceSyncToQuik } from '../db/sync-reference-to-quik.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (_req, res) => {
  const list = await getAllTradeClassRules();
  res.json(list);
});

router.use(requireRole('admin'));

const VALID_MARKET_TYPES = new Set<MarketType>(['primary', 'secondary']);

router.post('/', async (req, res) => {
  const body = req.body ?? {};
  const classCode = String(body.class_code ?? '').trim();
  const marketType = body.market_type as MarketType;

  if (!classCode) {
    res.status(400).json({ error: 'class_code required' });
    return;
  }
  if (!VALID_MARKET_TYPES.has(marketType)) {
    res.status(400).json({ error: 'market_type must be primary or secondary' });
    return;
  }

  try {
    const row = await createTradeClassRule({
      class_code: classCode,
      class_name: body.class_name ?? null,
      market_type: marketType,
    });
    clearTradeClassRulesCache();
    scheduleReferenceSyncToQuik(['trade_class_rules']);
    res.status(201).json(row);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      res.status(400).json({ error: 'Класс с таким кодом уже существует' });
      return;
    }
    throw err;
  }
});

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  const body = req.body ?? {};
  const data: Record<string, unknown> = {};
  if (body.class_code !== undefined) {
    const classCode = String(body.class_code).trim();
    if (!classCode) {
      res.status(400).json({ error: 'class_code cannot be empty' });
      return;
    }
    data.class_code = classCode;
  }
  if (body.class_name !== undefined) data.class_name = body.class_name;
  if (body.market_type !== undefined) {
    if (!VALID_MARKET_TYPES.has(body.market_type)) {
      res.status(400).json({ error: 'market_type must be primary or secondary' });
      return;
    }
    data.market_type = body.market_type;
  }

  try {
    const row = await updateTradeClassRule(id, data as any);
    if (!row) {
      res.status(404).json({ error: 'Rule not found' });
      return;
    }
    clearTradeClassRulesCache();
    scheduleReferenceSyncToQuik(['trade_class_rules']);
    res.json(row);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && err.code === '23505') {
      res.status(400).json({ error: 'Класс с таким кодом уже существует' });
      return;
    }
    throw err;
  }
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  await deleteTradeClassRule(id);
  clearTradeClassRulesCache();
  scheduleReferenceSyncToQuik(['trade_class_rules']);
  res.status(204).send();
});

export default router;
