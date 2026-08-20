import { Router } from 'express';
import * as XLSX from 'xlsx';
import { authMiddleware, requireRole } from '../auth/middleware.js';
import {
  getAllQuikUsers,
  createQuikUser,
  updateQuikUser,
  deleteQuikUser,
  replaceQuikUsers,
  findQuikUserByUid,
  findQuikUserByLogin,
  type QuikUserDto,
} from '../db/repositories/quikUsers.js';

const router = Router();
router.use(authMiddleware);

router.get('/', async (_req, res) => {
  res.json(await getAllQuikUsers());
});

router.use(requireRole('admin'));

router.post('/import', async (req, res) => {
  const fileBase64 = String(req.body?.fileBase64 ?? '');
  if (!fileBase64) {
    res.status(400).json({ error: 'fileBase64 required' });
    return;
  }
  let rows: QuikUserDto[];
  try {
    rows = parseQuikUsersExcel(fileBase64);
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Не удалось прочитать Excel' });
    return;
  }
  if (rows.length === 0) {
    res.status(400).json({ error: 'В файле нет строк с ID пользователя' });
    return;
  }
  const result = await replaceQuikUsers(rows);
  res.json(result);
});

router.post('/', async (req, res) => {
  const dto = parseBody(req.body ?? {});
  if (!dto.ok) {
    res.status(400).json({ error: dto.error });
    return;
  }
  const dup = await findDuplicate(dto.data);
  if (dup) {
    res.status(409).json(dup);
    return;
  }
  try {
    const row = await createQuikUser(dto.data);
    res.status(201).json(row);
  } catch (err: unknown) {
    const dupErr = uniqueError(err);
    if (dupErr) {
      res.status(409).json(dupErr);
      return;
    }
    throw err;
  }
});

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  const dto = parseBody(req.body ?? {}, true);
  if (!dto.ok) {
    res.status(400).json({ error: dto.error });
    return;
  }
  const dup = await findDuplicate(dto.data, id);
  if (dup) {
    res.status(409).json(dup);
    return;
  }
  try {
    const row = await updateQuikUser(id, dto.data);
    if (!row) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(row);
  } catch (err: unknown) {
    const dupErr = uniqueError(err);
    if (dupErr) {
      res.status(409).json(dupErr);
      return;
    }
    throw err;
  }
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }
  await deleteQuikUser(id);
  res.status(204).send();
});

function parseBody(
  body: Record<string, unknown>,
  partial = false,
): { ok: true; data: QuikUserDto } | { ok: false; error: string } {
  const uid = parseIntNum(body.uid);
  if (!partial && uid == null) return { ok: false, error: 'uid required' };
  if (partial && body.uid !== undefined && uid == null) return { ok: false, error: 'invalid uid' };

  const lastName = body.last_name !== undefined ? String(body.last_name ?? '').trim() : undefined;
  if (!partial && !lastName) return { ok: false, error: 'last_name required' };
  if (partial && body.last_name !== undefined && !lastName) return { ok: false, error: 'last_name cannot be empty' };

  const data: QuikUserDto = {
    uid: uid ?? 0,
    last_name: lastName,
    first_name: optStr(body.first_name),
    patronymic: optStr(body.patronymic),
    login: optStr(body.login),
    date_from: optStr(body.date_from),
    date_to: optStr(body.date_to),
    org_code: optStr(body.org_code),
    org_name: optStr(body.org_name),
    blocked: body.blocked !== undefined ? Boolean(body.blocked) : false,
    comment: optStr(body.comment),
    is_service: body.is_service !== undefined ? Boolean(body.is_service) : false,
    main_uid: body.main_uid !== undefined ? parseIntNum(body.main_uid) : null,
    last_login: optStr(body.last_login),
  };
  if (partial) {
    const out: Partial<QuikUserDto> = {};
    if (body.uid !== undefined) out.uid = uid!;
    if (body.last_name !== undefined) out.last_name = lastName;
    if (body.first_name !== undefined) out.first_name = data.first_name;
    if (body.patronymic !== undefined) out.patronymic = data.patronymic;
    if (body.login !== undefined) out.login = data.login;
    if (body.date_from !== undefined) out.date_from = data.date_from;
    if (body.date_to !== undefined) out.date_to = data.date_to;
    if (body.org_code !== undefined) out.org_code = data.org_code;
    if (body.org_name !== undefined) out.org_name = data.org_name;
    if (body.blocked !== undefined) out.blocked = data.blocked;
    if (body.comment !== undefined) out.comment = data.comment;
    if (body.is_service !== undefined) out.is_service = data.is_service;
    if (body.main_uid !== undefined) out.main_uid = data.main_uid;
    if (body.last_login !== undefined) out.last_login = data.last_login;
    return { ok: true, data: out as QuikUserDto };
  }
  return { ok: true, data };
}

function parseQuikUsersExcel(fileBase64: string): QuikUserDto[] {
  const buf = Buffer.from(fileBase64, 'base64');
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error('Пустой файл');
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: false });
  const byUid = new Map<number, QuikUserDto>();
  for (const row of raw) {
    const mapped = mapExcelRow(row);
    if (mapped) byUid.set(mapped.uid, mapped);
  }
  return [...byUid.values()];
}

function mapExcelRow(row: Record<string, unknown>): QuikUserDto | null {
  const get = (...keys: string[]) => {
    for (const [k, v] of Object.entries(row)) {
      const n = normalizeHeader(k);
      if (keys.some((key) => n === normalizeHeader(key))) return v;
    }
    return null;
  };
  const uid = parseIntNum(get('ID польз.', 'ID польз', 'uid', 'ID'));
  if (uid == null) return null;
  return {
    uid,
    last_name: str(get('Фамилия', 'last_name')),
    first_name: str(get('Имя', 'first_name')),
    patronymic: str(get('Отчество', 'patronymic')),
    login: str(get('Логин', 'login')),
    date_from: parseDate(get('Дата начала', 'date_from')),
    date_to: parseDate(get('Дата окончания', 'date_to')),
    org_code: str(get('Код организации', 'org_code')),
    org_name: str(get('Наименование организации', 'org_name')),
    blocked: parseBool(get('Заблокирован', 'blocked')),
    comment: str(get('Комментарий', 'comment')),
    is_service: parseBool(get('Служебный', 'is_service')),
    main_uid: parseIntNum(get('UID основного пользователя', 'main_uid')),
    last_login: parseDateTime(get('Последний вход', 'last_login')),
  };
}

function normalizeHeader(s: string): string {
  return s.toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ').trim();
}

function str(v: unknown): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  return t === '' ? null : t;
}

function parseIntNum(v: unknown): number | null {
  if (v == null || v === '') return null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function parseBool(v: unknown): boolean {
  if (v == null || v === '') return false;
  if (typeof v === 'boolean') return v;
  const s = String(v).trim().toLowerCase();
  return s === 'да' || s === 'yes' || s === 'true' || s === '1';
}

function parseDate(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  const dmy = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const n = Number(s);
  if (Number.isFinite(n) && n > 20000) {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + Math.floor(n));
    return epoch.toISOString().slice(0, 10);
  }
  return null;
}

function parseDateTime(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())} ${p(v.getHours())}:${p(v.getMinutes())}:${p(v.getSeconds())}`;
  }
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) {
    const p = (n: string) => n.padStart(2, '0');
    const time = m[4] ? `${p(m[4])}:${m[5]}${m[6] ? `:${p(m[6])}` : ':00'}` : '00:00:00';
    return `${m[3]}-${p(m[2])}-${p(m[1])} ${time}`;
  }
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}(?::\d{2})?))?/);
  if (iso) return `${iso[1]} ${iso[2] ?? '00:00:00'}`;
  return parseDate(v);
}

function optStr(v: unknown): string | null | undefined {
  if (v === undefined) return undefined;
  return str(v);
}

async function findDuplicate(
  data: Partial<QuikUserDto>,
  excludeId?: number,
): Promise<{ error: string; field: 'uid' | 'login' } | null> {
  if (data.uid != null) {
    const byUid = await findQuikUserByUid(data.uid, excludeId);
    if (byUid) return { error: 'Пользователь с таким ID уже существует', field: 'uid' };
  }
  const login = data.login?.trim();
  if (login) {
    const byLogin = await findQuikUserByLogin(login, excludeId);
    if (byLogin) return { error: 'Пользователь с таким логином уже существует', field: 'login' };
  }
  return null;
}

function uniqueError(err: unknown): { error: string; field: 'uid' | 'login' } | null {
  if (typeof err !== 'object' || err === null) return null;
  if ((err as { code?: string }).code !== '23505') return null;
  const constraint = String((err as { constraint?: string }).constraint ?? '');
  if (constraint.includes('login')) {
    return { error: 'Пользователь с таким логином уже существует', field: 'login' };
  }
  return { error: 'Пользователь с таким ID уже существует', field: 'uid' };
}

export default router;
