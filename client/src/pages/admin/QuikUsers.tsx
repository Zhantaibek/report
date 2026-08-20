import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Input } from '../../components/ui/input.tsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table.tsx';
import { Modal } from '../../components/ui/modal.tsx';
import { DateInput } from '../../components/ui/date-input.tsx';
import {
  getQuikUsers,
  createQuikUser,
  updateQuikUser,
  deleteQuikUser,
  importQuikUsers,
  type QuikUserRow,
} from '../../api/quik-users.ts';
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Import } from 'lucide-react';

const PAGE_SIZE = 20;

type FieldError = {
  uid?: string;
  login?: string;
  last_name?: string;
};

const emptyForm = () => ({
  uid: '',
  last_name: '',
  first_name: '',
  patronymic: '',
  login: '',
  date_from: undefined as string | undefined,
  date_to: undefined as string | undefined,
  org_code: '',
  org_name: '',
  blocked: false,
  comment: '',
  is_service: false,
  main_uid: '',
});

function fio(row: { last_name: string | null; first_name: string | null; patronymic: string | null }): string {
  return [row.last_name, row.first_name, row.patronymic].filter(Boolean).join(' ') || '—';
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const s = String(iso).slice(0, 10);
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : s;
}

function formatDateTime(v: string | null | undefined): string {
  if (!v) return '—';
  const s = String(v).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}:\d{2}(?::\d{2})?))?/);
  if (!m) return s;
  return m[4] ? `${m[3]}.${m[2]}.${m[1]} ${m[4]}` : `${m[3]}.${m[2]}.${m[1]}`;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const r = String(reader.result ?? '');
      const i = r.indexOf(',');
      resolve(i >= 0 ? r.slice(i + 1) : r);
    };
    reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
    reader.readAsDataURL(file);
  });
}

export default function QuikUsers() {
  const [list, setList] = useState<QuikUserRow[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<QuikUserRow | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadList = () => {
    getQuikUsers().then(setList).catch(() => {});
  };

  useEffect(() => {
    loadList();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((row) =>
      [
        String(row.uid),
        row.last_name,
        row.first_name,
        row.patronymic,
        row.login,
        row.org_code,
        row.org_name,
        row.comment,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  }, [list, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const setField = <K extends keyof ReturnType<typeof emptyForm>>(key: K, value: ReturnType<typeof emptyForm>[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setSubmitError('');
    setFieldErrors({});
    setFormOpen(true);
  };

  const openEdit = (row: QuikUserRow) => {
    setEditingId(row.id);
    setForm({
      uid: String(row.uid),
      last_name: row.last_name ?? '',
      first_name: row.first_name ?? '',
      patronymic: row.patronymic ?? '',
      login: row.login ?? '',
      date_from: row.date_from ?? undefined,
      date_to: row.date_to ?? undefined,
      org_code: row.org_code ?? '',
      org_name: row.org_name ?? '',
      blocked: row.blocked,
      comment: row.comment ?? '',
      is_service: row.is_service,
      main_uid: row.main_uid != null ? String(row.main_uid) : '',
    });
    setSubmitError('');
    setFieldErrors({});
    setFormOpen(true);
  };

  const closeForm = () => {
    if (loading) return;
    setFormOpen(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const errors: FieldError = {};
    const uid = Number(form.uid.trim());
    const login = form.login.trim();
    if (!form.uid.trim() || !Number.isFinite(uid)) errors.uid = 'Укажите ID';
    if (!form.last_name.trim()) errors.last_name = 'Укажите фамилию';
    const others = list.filter((u) => u.id !== editingId);
    if (Number.isFinite(uid) && others.some((u) => u.uid === uid)) {
      errors.uid = 'Пользователь с таким ID уже существует';
    }
    if (login && others.some((u) => (u.login ?? '').toLowerCase() === login.toLowerCase())) {
      errors.login = 'Пользователь с таким логином уже существует';
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    const body = {
      uid,
      last_name: form.last_name.trim(),
      first_name: form.first_name.trim() || null,
      patronymic: form.patronymic.trim() || null,
      login: form.login.trim() || null,
      date_from: form.date_from || null,
      date_to: form.date_to || null,
      org_code: form.org_code.trim() || null,
      org_name: form.org_name.trim() || null,
      blocked: form.blocked,
      comment: form.comment.trim() || null,
      is_service: form.is_service,
      main_uid: form.main_uid.trim() ? Number(form.main_uid.trim()) : null,
    };

    setLoading(true);
    setSubmitError('');
    try {
      if (editingId != null) await updateQuikUser(editingId, body);
      else await createQuikUser(body);
      loadList();
      setFormOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка сохранения';
      if (msg.includes('ID')) setFieldErrors((p) => ({ ...p, uid: msg }));
      else if (msg.toLowerCase().includes('логин')) setFieldErrors((p) => ({ ...p, login: msg }));
      else setSubmitError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    setImportMsg('');
    try {
      const b64 = await fileToBase64(file);
      const r = await importQuikUsers(b64);
      setImportMsg(`Импортировано ${r.count} записей`);
      loadList();
    } catch (err) {
      setImportMsg(err instanceof Error ? err.message : 'Ошибка импорта');
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      await deleteQuikUser(deleteTarget.id);
      loadList();
      setDeleteTarget(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка удаления');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (hasError?: boolean) =>
    hasError ? 'border-destructive focus-visible:ring-destructive' : '';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
          <CardTitle>Пользователи</CardTitle>
          <div className="flex items-center gap-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по ФИО, логину, ID…"
              className="h-9 w-64 text-sm"
            />
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => handleImport(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={importing}
              onClick={() => fileRef.current?.click()}
            >
              <Import className="h-4 w-4 mr-1.5" />
              {importing ? 'Импорт…' : 'Импорт Excel'}
            </Button>
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Добавить
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {importMsg && (
            <p className={`text-sm mb-3 ${importMsg.startsWith('Импортировано') ? 'text-emerald-600' : 'text-destructive'}`}>
              {importMsg}
            </p>
          )}

          <Modal
            open={formOpen}
            onClose={closeForm}
            closeOnBackdropClick={false}
            title={editingId !== null ? 'Редактирование пользователя' : 'Новый пользователь'}
          >
            <form onSubmit={handleSubmit} className="space-y-3">
              {submitError && <p className="text-sm text-destructive">{submitError}</p>}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    ID польз. <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={form.uid}
                    onChange={(e) => setField('uid', e.target.value.replace(/[^\d]/g, ''))}
                    inputMode="numeric"
                    className={inputClass(!!fieldErrors.uid)}
                  />
                  {fieldErrors.uid && <p className="mt-1 text-xs text-destructive">{fieldErrors.uid}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Логин</label>
                  <Input
                    value={form.login}
                    onChange={(e) => setField('login', e.target.value)}
                    className={inputClass(!!fieldErrors.login)}
                  />
                  {fieldErrors.login && <p className="mt-1 text-xs text-destructive">{fieldErrors.login}</p>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Фамилия <span className="text-destructive">*</span>
                  </label>
                  <Input
                    value={form.last_name}
                    onChange={(e) => setField('last_name', e.target.value)}
                    className={inputClass(!!fieldErrors.last_name)}
                  />
                  {fieldErrors.last_name && <p className="mt-1 text-xs text-destructive">{fieldErrors.last_name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Имя</label>
                  <Input value={form.first_name} onChange={(e) => setField('first_name', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Отчество</label>
                  <Input value={form.patronymic} onChange={(e) => setField('patronymic', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Дата начала</label>
                  <DateInput
                    value={form.date_from}
                    onChange={(d) => setField('date_from', d)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Дата окончания</label>
                  <DateInput
                    value={form.date_to}
                    onChange={(d) => setField('date_to', d)}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Код организации</label>
                  <Input value={form.org_code} onChange={(e) => setField('org_code', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Наименование организации</label>
                  <Input value={form.org_name} onChange={(e) => setField('org_name', e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">UID основного пользователя</label>
                  <Input
                    value={form.main_uid}
                    onChange={(e) => setField('main_uid', e.target.value.replace(/[^\d]/g, ''))}
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Комментарий</label>
                  <Input value={form.comment} onChange={(e) => setField('comment', e.target.value)} />
                </div>
              </div>

              <div className="flex gap-6 pt-1">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.blocked}
                    onChange={(e) => setField('blocked', e.target.checked)}
                  />
                  Заблокирован
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.is_service}
                    onChange={(e) => setField('is_service', e.target.checked)}
                  />
                  Служебный
                </label>
              </div>

              <div className="flex gap-2 pt-1">
                <Button type="submit" disabled={loading}>
                  {editingId !== null ? 'Сохранить' : 'Создать'}
                </Button>
                <Button type="button" variant="outline" onClick={closeForm} disabled={loading}>
                  Отмена
                </Button>
              </div>
            </form>
          </Modal>

          <Modal
            open={deleteTarget !== null}
            onClose={() => setDeleteTarget(null)}
            closeOnBackdropClick
            title="Удалить пользователя?"
          >
            <p className="text-sm text-muted-foreground">
              {deleteTarget ? (
                <>
                  <span className="text-foreground">{fio(deleteTarget)}</span>
                  {` (ID ${deleteTarget.uid}) будет удалён.`}
                </>
              ) : null}
            </p>
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="destructive" onClick={confirmDelete} disabled={loading}>
                Удалить
              </Button>
              <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={loading}>
                Отмена
              </Button>
            </div>
          </Modal>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {list.length === 0 ? 'Нет записей. Импортируйте Excel или добавьте вручную.' : 'Ничего не найдено по запросу.'}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">ID</TableHead>
                    <TableHead>ФИО</TableHead>
                    <TableHead>Логин</TableHead>
                    <TableHead>Организация</TableHead>
                    <TableHead>Срок</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead>Последний вход</TableHead>
                    <TableHead className="w-24 text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-sm">{row.uid}</TableCell>
                      <TableCell className="max-w-[14rem] truncate" title={fio(row)}>{fio(row)}</TableCell>
                      <TableCell>{row.login ?? '—'}</TableCell>
                      <TableCell className="max-w-[12rem] truncate" title={row.org_name ?? undefined}>
                        {row.org_name ?? row.org_code ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {formatDate(row.date_from)} — {formatDate(row.date_to)}
                      </TableCell>
                      <TableCell>
                        {row.blocked ? (
                          <span className="text-destructive text-sm">Заблокирован</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">Активен</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{formatDateTime(row.last_login)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-0">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => openEdit(row)}
                            disabled={loading}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive"
                            onClick={() => setDeleteTarget(row)}
                            disabled={loading}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between pt-4">
                <span className="text-sm text-muted-foreground">
                  {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} из {filtered.length}
                  {search.trim() && filtered.length !== list.length ? ` (всего ${list.length})` : ''}
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setPage(1)}
                      disabled={safePage === 1}
                      title="Первая"
                    >
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      title="Назад"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 2)
                      .reduce<(number | '...')[]>((acc, p, i, arr) => {
                        if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                        acc.push(p);
                        return acc;
                      }, [])
                      .map((p, i) =>
                        p === '...' ? (
                          <span key={`dots-${i}`} className="px-1 text-muted-foreground text-sm">…</span>
                        ) : (
                          <Button
                            key={p}
                            variant={p === safePage ? 'default' : 'outline'}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => setPage(p as number)}
                          >
                            {p}
                          </Button>
                        ),
                      )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      title="Вперёд"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => setPage(totalPages)}
                      disabled={safePage === totalPages}
                      title="Последняя"
                    >
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
