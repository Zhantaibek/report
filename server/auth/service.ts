import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { findUserByLogin } from '../db/repositories/users.js';
import type { AuthUser } from '../types/index.js';
import type { JwtPayload } from './types.js';
import { config } from '../config/index.js';

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export async function authenticate(login: string, password: string): Promise<AuthUser | null> {
  const user = await findUserByLogin(login);
  if (!user || !verifyPassword(password, user.password_hash)) return null;
  return {
    id: user.id,
    login: user.login,
    role: user.role,
    displayName: user.display_name,
  };
}

export function signToken(user: AuthUser): string {
  const payload: JwtPayload = {
    userId: user.id,
    login: user.login,
    role: user.role,
  };
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}
