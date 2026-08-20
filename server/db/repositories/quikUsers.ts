import { getDb } from '../index.js';

export interface QuikUser {
  id: number;
  uid: number;
  last_name: string | null;
  first_name: string | null;
  patronymic: string | null;
  login: string | null;
  date_from: string | null;
  date_to: string | null;
  org_code: string | null;
  org_name: string | null;
  blocked: boolean;
  comment: string | null;
  is_service: boolean;
  main_uid: number | null;
  last_login: string | null;
  created_at: string;
}

export interface QuikUserDto {
  uid: number;
  last_name?: string | null;
  first_name?: string | null;
  patronymic?: string | null;
  login?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  org_code?: string | null;
  org_name?: string | null;
  blocked?: boolean;
  comment?: string | null;
  is_service?: boolean;
  main_uid?: number | null;
  last_login?: string | null;
}

const SELECT_FIELDS = `
  id, uid, last_name, first_name, patronymic, login,
  to_char(date_from, 'YYYY-MM-DD') AS date_from,
  to_char(date_to, 'YYYY-MM-DD') AS date_to,
  org_code, org_name, blocked, comment, is_service, main_uid,
  to_char(last_login, 'YYYY-MM-DD HH24:MI:SS') AS last_login,
  created_at
`;

export function formatQuikUserName(u: QuikUser): string {
  const fio = [u.last_name, u.first_name, u.patronymic]
    .map((p) => (p ?? '').trim())
    .filter(Boolean)
    .join(' ');
  return fio || (u.login ?? '').trim() || String(u.uid);
}

export async function getAllQuikUsers(): Promise<QuikUser[]> {
  const res = await getDb().query<QuikUser>(
    `SELECT ${SELECT_FIELDS} FROM quik_users ORDER BY uid ASC, id ASC`,
  );
  return res.rows;
}

export async function getQuikUserById(id: number): Promise<QuikUser | null> {
  const res = await getDb().query<QuikUser>(
    `SELECT ${SELECT_FIELDS} FROM quik_users WHERE id = $1`,
    [id],
  );
  return res.rows[0] ?? null;
}

export async function findQuikUserByUid(uid: number, excludeId?: number): Promise<QuikUser | null> {
  const res = await getDb().query<QuikUser>(
    excludeId != null
      ? `SELECT ${SELECT_FIELDS} FROM quik_users WHERE uid = $1 AND id <> $2`
      : `SELECT ${SELECT_FIELDS} FROM quik_users WHERE uid = $1`,
    excludeId != null ? [uid, excludeId] : [uid],
  );
  return res.rows[0] ?? null;
}

export async function findQuikUserByLogin(login: string, excludeId?: number): Promise<QuikUser | null> {
  const value = login.trim();
  if (!value) return null;
  const res = await getDb().query<QuikUser>(
    excludeId != null
      ? `SELECT ${SELECT_FIELDS} FROM quik_users WHERE LOWER(login) = LOWER($1) AND id <> $2`
      : `SELECT ${SELECT_FIELDS} FROM quik_users WHERE LOWER(login) = LOWER($1)`,
    excludeId != null ? [value, excludeId] : [value],
  );
  return res.rows[0] ?? null;
}

export async function createQuikUser(data: QuikUserDto): Promise<QuikUser> {
  const res = await getDb().query<QuikUser>(
    `INSERT INTO quik_users (
       uid, last_name, first_name, patronymic, login,
       date_from, date_to, org_code, org_name, blocked, comment,
       is_service, main_uid, last_login
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING ${SELECT_FIELDS}`,
    bind(data),
  );
  return res.rows[0];
}

export async function updateQuikUser(id: number, data: Partial<QuikUserDto>): Promise<QuikUser | null> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const map: Array<[keyof QuikUserDto, unknown]> = [
    ['uid', data.uid],
    ['last_name', data.last_name],
    ['first_name', data.first_name],
    ['patronymic', data.patronymic],
    ['login', data.login],
    ['date_from', data.date_from],
    ['date_to', data.date_to],
    ['org_code', data.org_code],
    ['org_name', data.org_name],
    ['blocked', data.blocked],
    ['comment', data.comment],
    ['is_service', data.is_service],
    ['main_uid', data.main_uid],
    ['last_login', data.last_login],
  ];

  for (const [key, value] of map) {
    if (value === undefined) continue;
    if (key === 'uid' || key === 'main_uid') {
      fields.push(`${key} = $${idx}`);
      values.push(value);
    } else if (key === 'blocked' || key === 'is_service') {
      fields.push(`${key} = $${idx}`);
      values.push(Boolean(value));
    } else if (key === 'date_from' || key === 'date_to' || key === 'last_login') {
      fields.push(`${key} = $${idx}`);
      values.push(value || null);
    } else {
      fields.push(`${key} = $${idx}`);
      values.push(trimOrNull(value as string | null));
    }
    idx += 1;
  }

  if (fields.length === 0) return getQuikUserById(id);

  values.push(id);
  const res = await getDb().query<QuikUser>(
    `UPDATE quik_users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING ${SELECT_FIELDS}`,
    values,
  );
  return res.rows[0] ?? null;
}

export async function deleteQuikUser(id: number): Promise<void> {
  await getDb().query('DELETE FROM quik_users WHERE id = $1', [id]);
}

export async function replaceQuikUsers(rows: QuikUserDto[]): Promise<{ count: number }> {
  const db = getDb();
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    await client.query('TRUNCATE quik_users RESTART IDENTITY');
    for (const row of rows) {
      await client.query(
        `INSERT INTO quik_users (
           uid, last_name, first_name, patronymic, login,
           date_from, date_to, org_code, org_name, blocked, comment,
           is_service, main_uid, last_login
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        bind(row),
      );
    }
    await client.query('COMMIT');
    return { count: rows.length };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function bind(data: QuikUserDto): unknown[] {
  return [
    data.uid,
    trimOrNull(data.last_name),
    trimOrNull(data.first_name),
    trimOrNull(data.patronymic),
    trimOrNull(data.login),
    data.date_from || null,
    data.date_to || null,
    trimOrNull(data.org_code),
    trimOrNull(data.org_name),
    Boolean(data.blocked),
    trimOrNull(data.comment),
    Boolean(data.is_service),
    data.main_uid ?? null,
    data.last_login || null,
  ];
}

function trimOrNull(value?: string | null): string | null {
  if (value == null) return null;
  const t = String(value).trim();
  return t === '' ? null : t;
}
