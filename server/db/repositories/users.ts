import { getDb } from '../index.js';
import type { UserRole } from '../../types/index.js';

export interface UserRow {
  id: number;
  login: string;
  password_hash: string;
  role: UserRole;
  display_name: string | null;
  created_at: string;
}

export async function findUserByLogin(login: string): Promise<UserRow | undefined> {
  const res = await getDb().query('SELECT * FROM users WHERE login = $1', [login]);
  return res.rows[0] as UserRow | undefined;
}

export async function findUserById(id: number): Promise<UserRow | undefined> {
  const res = await getDb().query('SELECT * FROM users WHERE id = $1', [id]);
  return res.rows[0] as UserRow | undefined;
}

export async function getUsers(): Promise<UserRow[]> {
  const res = await getDb().query('SELECT * FROM users ORDER BY id');
  return res.rows as UserRow[];
}

export async function createUser(
  login: string,
  passwordHash: string,
  role: UserRole,
  displayName: string | null
): Promise<number> {
  const res = await getDb().query(
    `INSERT INTO users (login, password_hash, role, display_name) VALUES ($1, $2, $3, $4) RETURNING id`,
    [login, passwordHash, role, displayName]
  );
  return (res.rows[0] as { id: number }).id;
}

export async function updateUser(
  id: number,
  data: { login?: string; passwordHash?: string; role?: UserRole; displayName?: string | null }
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  let n = 0;
  if (data.login !== undefined) { sets.push(`login = $${++n}`); values.push(data.login); }
  if (data.passwordHash !== undefined) { sets.push(`password_hash = $${++n}`); values.push(data.passwordHash); }
  if (data.role !== undefined) { sets.push(`role = $${++n}`); values.push(data.role); }
  if (data.displayName !== undefined) { sets.push(`display_name = $${++n}`); values.push(data.displayName); }
  if (sets.length === 0) return;
  values.push(id);
  await getDb().query(`UPDATE users SET ${sets.join(', ')} WHERE id = $${n + 1}`, values);
}

export async function deleteUser(id: number): Promise<void> {
  await getDb().query('DELETE FROM users WHERE id = $1', [id]);
}
