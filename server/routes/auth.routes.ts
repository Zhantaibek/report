import { Router } from 'express';
import { authenticate, signToken } from '../auth/service.js';
import { authMiddleware } from '../auth/middleware.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { login, password } = req.body ?? {};
  if (!login || !password) {
    res.status(400).json({ error: 'login and password required' });
    return;
  }
  const user = await authenticate(login, password);
  if (!user) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  const token = signToken(user);
  res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
  res.json({ user: { id: user.id, login: user.login, role: user.role, displayName: user.displayName }, token });
});

router.post('/logout', (_req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

export default router;
