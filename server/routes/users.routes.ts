import { Router } from 'express';
import { getUsers, findUserById, updateUserRole, formatUserListItem } from '../db/repositories/users.js';
import { authMiddleware, requireRole } from '../auth/middleware.js';
import type { UserRole } from '../types/index.js';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('admin'));

router.get('/', async (_req, res) => {
  const users = await getUsers();
  res.json(users.map(formatUserListItem));
});

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const user = await findUserById(id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(formatUserListItem(user));
});

router.put('/:id/role', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const { role } = req.body ?? {};
  if (role !== 'admin' && role !== 'employee') {
    res.status(400).json({ error: 'Invalid role' });
    return;
  }
  if (req.user?.id === id) {
    res.status(403).json({ error: 'Нельзя изменить свою роль' });
    return;
  }
  const user = await findUserById(id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  await updateUserRole(id, role as UserRole);
  res.json({ ok: true });
});

export default router;
