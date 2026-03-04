import { api } from './client.ts';

export interface AuthUser {
  id: number;
  login: string;
  role: 'admin' | 'employee';
  displayName: string | null;
}

export async function login(login: string, password: string): Promise<{ user: AuthUser; token: string }> {
  return api.post('/auth/login', { login, password });
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout', {});
}

export async function getMe(): Promise<{ user: AuthUser }> {
  return api.get('/auth/me');
}
