import jwt from 'jsonwebtoken';
import { ldapService, type LdapUser } from './ldapService.js';
import {
  findUserByLogin,
  createUserFromLdap,
  syncUserLdapProfile,
  type UserRow,
  type UserLdapProfile,
} from '../db/repositories/users.js';
import type { AuthUser } from '../types/index.js';
import type { JwtPayload } from './types.js';
import { config } from '../config/index.js';

export class LdapAuthError extends Error {
  constructor(
    message: string,
    readonly statusCode: 401 | 500 = 401
  ) {
    super(message);
    this.name = 'LdapAuthError';
  }
}

function ldapUserToProfile(ldapUser: LdapUser): UserLdapProfile {
  return {
    displayName: ldapUser.name,
    email: ldapUser.email,
    position: ldapUser.position,
    phone: ldapUser.phone,
    departmentName: ldapUser.department_name,
    organization: ldapUser.organization,
  };
}

export function userRowToAuthUser(user: UserRow): AuthUser {
  return {
    id: user.id,
    login: user.login,
    role: user.role,
    displayName: user.display_name,
    email: user.email,
    position: user.position,
    phone: user.phone,
    departmentName: user.department_name,
    organization: user.organization,
  };
}

function profileChanged(user: UserRow, profile: UserLdapProfile): boolean {
  return (
    user.display_name !== profile.displayName ||
    user.email !== profile.email ||
    user.position !== profile.position ||
    user.phone !== profile.phone ||
    user.department_name !== profile.departmentName ||
    user.organization !== profile.organization
  );
}

async function syncUserFromLdap(ldapUser: LdapUser): Promise<AuthUser> {
  const profile = ldapUserToProfile(ldapUser);
  let user = await findUserByLogin(ldapUser.login);

  if (!user) {
    await createUserFromLdap(ldapUser.login, 'employee', profile);
    user = await findUserByLogin(ldapUser.login);
    if (!user) throw new Error('Failed to create user');
    return userRowToAuthUser(user);
  }

  if (profileChanged(user, profile)) {
    await syncUserLdapProfile(user.id, profile);
    user = { ...user, ...profileToRowFields(profile) };
  }

  return userRowToAuthUser(user);
}

function profileToRowFields(profile: UserLdapProfile): Pick<UserRow, 'display_name' | 'email' | 'position' | 'phone' | 'department_name' | 'organization'> {
  return {
    display_name: profile.displayName,
    email: profile.email,
    position: profile.position,
    phone: profile.phone,
    department_name: profile.departmentName,
    organization: profile.organization,
  };
}

export async function authenticate(login: string, password: string): Promise<AuthUser> {
  let ldapUser: LdapUser | null;

  try {
    ldapUser = await ldapService.authenticate(login, password);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes('not found') ||
      message.includes('No Such Object') ||
      message.includes('Invalid Credentials') ||
      message.includes('49')
    ) {
      throw new LdapAuthError('Неверный логин или пароль', 401);
    }
    console.error('[LDAP Auth]', message);
    throw new LdapAuthError('Ошибка подключения к серверу авторизации', 500);
  }

  if (!ldapUser) {
    throw new LdapAuthError('Неверный логин или пароль', 401);
  }

  return syncUserFromLdap(ldapUser);
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
