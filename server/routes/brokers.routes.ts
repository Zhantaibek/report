import { Router } from 'express';
import { authMiddleware, requireRole } from '../auth/middleware.js';
import {
  getAllBrokers,
  createBroker,
  updateBroker,
  deleteBroker,
} from '../db/repositories/brokers.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (_req, res) => {
  const list = await getAllBrokers();
  res.json(list);
});

router.use(requireRole('admin'));

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

router.post('/', async (req, res) => {
  const body = req.body ?? {};
  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim();
  if (!name) {
    res.status(400).json({ error: 'name required' });
    return;
  }
  if (!email || !isValidEmail(email)) {
    res.status(400).json({ error: 'valid email required' });
    return;
  }

  try {
    const row = await createBroker({
      name,
      email,
      firm_id: body.firm_id ?? null,
      address: body.address ?? null,
      contacts: body.contacts ?? null,
      is_active: body.is_active !== false,
    });
    res.status(201).json(row);
  } catch (err: unknown) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: 'Брокер с таким email или firm_id уже существует' });
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

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) {
      res.status(400).json({ error: 'name cannot be empty' });
      return;
    }
    data.name = name;
  }
  if (body.email !== undefined) {
    const email = String(body.email).trim();
    if (!email || !isValidEmail(email)) {
      res.status(400).json({ error: 'valid email required' });
      return;
    }
    data.email = email;
  }
  if (body.firm_id !== undefined) data.firm_id = body.firm_id;
  if (body.address !== undefined) data.address = body.address;
  if (body.contacts !== undefined) data.contacts = body.contacts;
  if (body.is_active !== undefined) data.is_active = Boolean(body.is_active);

  try {
    const row = await updateBroker(id, data as any);
    if (!row) {
      res.status(404).json({ error: 'Broker not found' });
      return;
    }
    res.json(row);
  } catch (err: unknown) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: 'Брокер с таким email или firm_id уже существует' });
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
  await deleteBroker(id);
  res.status(204).send();
});

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505';
}

export default router;
