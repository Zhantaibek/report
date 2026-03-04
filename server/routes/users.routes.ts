import { Router } from 'express';
import {
  getUsers,
  findUserById,
  createUser,
  updateUser,
  deleteUser,
} from '../db/repositories/users.js';
import { hashPassword } from '../auth/service.js';
import { authMiddleware, requireRole } from '../auth/middleware.js';

const router = Router();
router.use(authMiddleware);
router.use(requireRole('admin'));

router.get('/', async (_req, res) => {
  const users = await getUsers();
  res.json(users.map((u) => ({ id: u.id, login: u.login, role: u.role, display_name: u.display_name, created_at: u.created_at })));
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
  res.json({ ...user, password_hash: undefined });
});

router.post('/', async (req, res) => {
  const { login, password, role, displayName } = req.body ?? {};
  if (!login || !password || !role) {
    res.status(400).json({ error: 'login, password, role required' });
    return;
  }
  const id = await createUser(login, hashPassword(password), role, displayName ?? null);
  res.status(201).json({ id });
});

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const { login, password, role, displayName } = req.body ?? {};
  const data: Parameters<typeof updateUser>[1] = {};
  if (login !== undefined) data.login = login;
  if (password !== undefined) data.passwordHash = hashPassword(password);
  if (role !== undefined) data.role = role;
  if (displayName !== undefined) data.displayName = displayName;
  await updateUser(id, data);
  res.json({ ok: true });
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  if (req.user && req.user.id === id) {
    res.status(403).json({ error: 'Нельзя удалить самого себя' });
    return;
  }
  await deleteUser(id);
  res.json({ ok: true });
});

export default router;
