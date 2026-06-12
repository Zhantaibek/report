import { Router } from 'express';
import { authenticate, signToken, LdapAuthError } from '../auth/service.js';
import { authMiddleware } from '../auth/middleware.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { login, password } = req.body ?? {};
  if (!login || !password) {
    res.status(400).json({ error: 'Login and password are required' });
    return;
  }
  try {
    const user = await authenticate(login, password);
    const token = signToken(user);
    res.cookie('token', token, { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.json({ user, token });
  } catch (error) {
    if (error instanceof LdapAuthError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error('LDAP login error:', error);
    res.status(500).json({ error: 'Ошибка авторизации' });
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

export default router;
