import { Router } from 'express';
import {
  getBrokers,
  getBrokerById,
  createBroker,
  updateBroker,
  deleteBroker,
} from '../db/repositories/brokers.js';
import { authMiddleware, requireRole } from '../auth/middleware.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (_req, res) => {
  res.json(await getBrokers());
});

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const broker = await getBrokerById(id);
  if (!broker) {
    res.status(404).json({ error: 'Broker not found' });
    return;
  }
  res.json(broker);
});

router.post('/', requireRole('admin'), async (req, res) => {
  const { name, code } = req.body ?? {};
  if (!name) {
    res.status(400).json({ error: 'name required' });
    return;
  }
  const id = await createBroker(name, code ?? null);
  res.status(201).json({ id });
});

router.put('/:id', requireRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const { name, code } = req.body ?? {};
  const broker = await getBrokerById(id);
  if (!broker) {
    res.status(404).json({ error: 'Broker not found' });
    return;
  }
  await updateBroker(id, name ?? broker.name, code !== undefined ? code : broker.code);
  res.json({ ok: true });
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  await deleteBroker(id);
  res.json({ ok: true });
});

export default router;
