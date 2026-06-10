import { Router } from 'express';
import { authMiddleware, requireRole } from '../auth/middleware.js';
import {
  getAllEmitents,
  createEmitent,
  updateEmitent,
  deleteEmitent,
} from '../db/repositories/emitents.js';
import { scheduleReferenceSyncToQuik } from '../db/sync-reference-to-quik.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (_req, res) => {
  const list = await getAllEmitents();
  res.json(list);
});

router.use(requireRole('admin'));

function parseOptionalInt(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function parseOptionalNumber(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

router.post('/', async (req, res) => {
  const body = req.body ?? {};
  const name = String(body.name ?? '').trim();
  if (!name) {
    res.status(400).json({ error: 'name required' });
    return;
  }

  const row = await createEmitent({
    name,
    address: body.address ?? null,
    city: parseOptionalInt(body.city) ?? null,
    area: parseOptionalInt(body.area) ?? null,
    state: parseOptionalInt(body.state) ?? null,
    code: body.code ?? null,
    infusion: parseOptionalNumber(body.infusion) ?? null,
    price: parseOptionalNumber(body.price) ?? null,
    ind: parseOptionalInt(body.ind) ?? null,
    name_eng: body.name_eng ?? null,
  });
  scheduleReferenceSyncToQuik(['emitents']);
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

  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) {
      res.status(400).json({ error: 'name cannot be empty' });
      return;
    }
    data.name = name;
  }
  if (body.address !== undefined) data.address = body.address;
  if (body.city !== undefined) data.city = parseOptionalInt(body.city);
  if (body.area !== undefined) data.area = parseOptionalInt(body.area);
  if (body.state !== undefined) data.state = parseOptionalInt(body.state);
  if (body.code !== undefined) data.code = body.code;
  if (body.infusion !== undefined) data.infusion = parseOptionalNumber(body.infusion);
  if (body.price !== undefined) data.price = parseOptionalNumber(body.price);
  if (body.ind !== undefined) data.ind = parseOptionalInt(body.ind);
  if (body.name_eng !== undefined) data.name_eng = body.name_eng;

  const row = await updateEmitent(id, data as any);
  if (!row) {
    res.status(404).json({ error: 'Emitent not found' });
    return;
  }
  scheduleReferenceSyncToQuik(['emitents']);
  res.json(row);
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  await deleteEmitent(id);
  scheduleReferenceSyncToQuik(['emitents']);
  res.status(204).send();
});

export default router;
