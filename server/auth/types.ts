import type { AuthUser } from '../types/index.js';

export interface JwtPayload {
  userId: number;
  login: string;
  role: AuthUser['role'];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
