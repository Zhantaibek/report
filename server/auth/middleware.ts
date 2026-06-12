import type { Request, Response, NextFunction } from 'express';
import { verifyToken, userRowToAuthUser } from './service.js';
import { findUserById } from '../db/repositories/users.js';
import type { AuthUser } from '../types/index.js';

function getToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return req.cookies?.token ?? null;
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = getToken(req);
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
  const user = await findUserById(payload.userId);
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }
  req.user = userRowToAuthUser(user) as AuthUser;
  next();
}

export function requireRole(...roles: AuthUser['role'][]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    next();
  };
}

export function applyBrokerFilter(_req: Request, _filters: Record<string, unknown>): void {
  // broker_id removed from users
}
