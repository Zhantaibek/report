import { getDb } from '../index.js';
import type { UserRole } from '../../types/index.js';

export interface UserRow {
  id: number;
  login: string;
  role: UserRole;
  display_name: string | null;
  email: string | null;
  position: string | null;
  phone: string | null;
  department_name: string | null;
  organization: string | null;
  created_at: string;
}

export interface UserLdapProfile {
  displayName: string | null;
  email: string | null;
  position: string | null;
  phone: string | null;
  departmentName: string | null;
  organization: string | null;
}

export function formatUserListItem(u: UserRow) {
  return {
    id: u.id,
    login: u.login,
    role: u.role,
    display_name: u.display_name,
    email: u.email,
    position: u.position,
    phone: u.phone,
    department_name: u.department_name,
    organization: u.organization,
    created_at: u.created_at,
  };
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

export async function createUserFromLdap(
  login: string,
  role: UserRole,
  profile: UserLdapProfile
): Promise<number> {
  const res = await getDb().query(
    `INSERT INTO users (login, role, display_name, email, position, phone, department_name, organization)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      login,
      role,
      profile.displayName,
      profile.email,
      profile.position,
      profile.phone,
      profile.departmentName,
      profile.organization,
    ]
  );
  return (res.rows[0] as { id: number }).id;
}

export async function createUser(
  login: string,
  role: UserRole,
  displayName: string | null
): Promise<number> {
  const res = await getDb().query(
    `INSERT INTO users (login, role, display_name) VALUES ($1, $2, $3) RETURNING id`,
    [login, role, displayName]
  );
  return (res.rows[0] as { id: number }).id;
}

export async function updateUserRole(id: number, role: UserRole): Promise<void> {
  await getDb().query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
}

export async function syncUserLdapProfile(id: number, profile: UserLdapProfile): Promise<void> {
  await getDb().query(
    `UPDATE users SET
      display_name = $1,
      email = $2,
      position = $3,
      phone = $4,
      department_name = $5,
      organization = $6
     WHERE id = $7`,
    [
      profile.displayName,
      profile.email,
      profile.position,
      profile.phone,
      profile.departmentName,
      profile.organization,
      id,
    ]
  );
}
