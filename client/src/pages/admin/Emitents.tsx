import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Input } from '../../components/ui/input.tsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table.tsx';
import { Modal } from '../../components/ui/modal.tsx';
import {
  getEmitents,
  createEmitent,
  updateEmitent,
  deleteEmitent,
  type EmitentRow,
} from '../../api/emitents.ts';
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 20;

type FieldError = {
  name?: string;
  code?: string;
  infusion?: string;
  price?: string;
};

function trimCode(code: string | null | undefined): string {
  return (code ?? '').trim();
}

function formatDecimal(value: number | string | null | undefined, digits: number): string {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });
}

function parseOptionalInt(value: string): number | null {
  const t = value.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function parseOptionalNumber(value: string): number | null {
  const t = value.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

const emptyForm = () => ({
  name: '',
  address: '',
  city: '',
  area: '',
  state: '',
  code: '',
  infusion: '',
  price: '',
  ind: '',
  name_eng: '',
});

export default function Emitents() {
  const [list, setList] = useState<EmitentRow[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmitentRow | null>(null);

  const loadList = () => {
    getEmitents().then(setList).catch(() => {});
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
    return list.filter((row) => {
      const hay = [
        row.name,
        row.name_eng,
        trimCode(row.code),
        row.address,
        String(row.id),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [list, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setSubmitError('');
    setFieldErrors({});
    setFormOpen(true);
  };

  const openEdit = (row: EmitentRow) => {
    setEditingId(row.id);
    setForm({
      name: row.name ?? '',
      address: row.address ?? '',
      city: row.city != null ? String(row.city) : '',
      area: row.area != null ? String(row.area) : '',
      state: row.state != null ? String(row.state) : '',
      code: trimCode(row.code),
      infusion: row.infusion != null ? String(row.infusion) : '',
      price: row.price != null ? String(row.price) : '',
      ind: row.ind != null ? String(row.ind) : '',
      name_eng: row.name_eng ?? '',
    });
    setSubmitError('');
    setFieldErrors({});
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setSubmitError('');
    setFieldErrors({});
  };

  const setField = (key: keyof ReturnType<typeof emptyForm>, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    const errors: FieldError = {};

    const name = form.name.trim();
    if (!name) errors.name = 'Укажите наименование';

    const code = form.code.trim();
    if (code.length > 4) errors.code = 'Код — не более 4 символов';

    if (form.infusion.trim() && parseOptionalNumber(form.infusion) == null) {
      errors.infusion = 'Укажите число';
    }
    if (form.price.trim() && parseOptionalNumber(form.price) == null) {
      errors.price = 'Укажите число';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitError('Исправьте ошибки в форме');
      return;
    }

    const body = {
      name,
      address: form.address.trim() || null,
      city: parseOptionalInt(form.city),
      area: parseOptionalInt(form.area),
      state: parseOptionalInt(form.state),
      code: code || null,
      infusion: parseOptionalNumber(form.infusion),
      price: parseOptionalNumber(form.price),
      ind: parseOptionalInt(form.ind),
      name_eng: form.name_eng.trim() || null,
    };

    setLoading(true);
    try {
      if (editingId !== null) {
        await updateEmitent(editingId, body);
      } else {
        await createEmitent(body);
      }
      loadList();
      closeForm();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      await deleteEmitent(deleteTarget.id);
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
          <CardTitle>Эмитенты</CardTitle>
          <div className="flex items-center gap-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию, коду, адресу…"
              className="h-9 w-64 text-sm"
            />
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Добавить
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Modal
            open={formOpen}
            onClose={closeForm}
            closeOnBackdropClick={false}
            title={editingId !== null ? 'Редактирование эмитента' : 'Новый эмитент'}
          >
            <form onSubmit={handleSubmit} className="space-y-3">
              {submitError && <p className="text-sm text-destructive">{submitError}</p>}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Наименование <span className="text-destructive">*</span>
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  className={inputClass(!!fieldErrors.name)}
                />
                {fieldErrors.name && (
                  <p className="mt-1 text-xs text-destructive">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Наименование (англ.)</label>
                <Input value={form.name_eng} onChange={(e) => setField('name_eng', e.target.value)} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Код</label>
                  <Input
                    value={form.code}
                    onChange={(e) => setField('code', e.target.value)}
                    maxLength={4}
                    className={`font-mono ${inputClass(!!fieldErrors.code)}`}
                  />
                  {fieldErrors.code && (
                    <p className="mt-1 text-xs text-destructive">{fieldErrors.code}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Инд.</label>
                  <Input
                    value={form.ind}
                    onChange={(e) => setField('ind', e.target.value.replace(/[^\d-]/g, ''))}
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Адрес</label>
                <Input value={form.address} onChange={(e) => setField('address', e.target.value)} />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Город</label>
                  <Input
                    value={form.city}
                    onChange={(e) => setField('city', e.target.value.replace(/[^\d-]/g, ''))}
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Район</label>
                  <Input
                    value={form.area}
                    onChange={(e) => setField('area', e.target.value.replace(/[^\d-]/g, ''))}
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Область</label>
                  <Input
                    value={form.state}
                    onChange={(e) => setField('state', e.target.value.replace(/[^\d-]/g, ''))}
                    inputMode="numeric"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Уставной капитал</label>
                  <Input
                    value={form.infusion}
                    onChange={(e) => setField('infusion', e.target.value)}
                    className={inputClass(!!fieldErrors.infusion)}
                  />
                  {fieldErrors.infusion && (
                    <p className="mt-1 text-xs text-destructive">{fieldErrors.infusion}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Номинал</label>
                  <Input
                    value={form.price}
                    onChange={(e) => setField('price', e.target.value)}
                    className={inputClass(!!fieldErrors.price)}
                  />
                  {fieldErrors.price && (
                    <p className="mt-1 text-xs text-destructive">{fieldErrors.price}</p>
                  )}
                </div>
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
            title="Удалить эмитента?"
          >
            <p className="text-sm text-muted-foreground">
              {deleteTarget ? (
                <>
                  <span className="text-foreground">{deleteTarget.name ?? '—'}</span>
                  {trimCode(deleteTarget.code) ? ` (${trimCode(deleteTarget.code)})` : ''} будет удалён.
                </>
              ) : null}
            </p>
            <div className="flex gap-2 pt-4">
              <Button type="button" variant="destructive" onClick={confirmDelete} disabled={loading}>
                Удалить
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteTarget(null)}
                disabled={loading}
              >
                Отмена
              </Button>
            </div>
          </Modal>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {list.length === 0 ? 'Нет записей.' : 'Ничего не найдено по запросу.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">ID</TableHead>
                  <TableHead className="w-16">Код</TableHead>
                  <TableHead>Наименование</TableHead>
                  <TableHead>Адрес</TableHead>
                  <TableHead className="text-right">Уст. кап.</TableHead>
                  <TableHead className="text-right">Номинал</TableHead>
                  <TableHead className="w-24 text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-sm text-muted-foreground">{row.id}</TableCell>
                    <TableCell className="font-mono text-sm">{trimCode(row.code) || '—'}</TableCell>
                    <TableCell className="max-w-[16rem] truncate" title={row.name ?? undefined}>
                      {row.name ?? '—'}
                    </TableCell>
                    <TableCell className="max-w-[12rem] truncate text-sm text-muted-foreground" title={row.address ?? undefined}>
                      {row.address ?? '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatDecimal(row.infusion, 2)}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {formatDecimal(row.price, 6)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => openEdit(row)}
                          disabled={loading}
                          title="Изменить"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(row)}
                          disabled={loading}
                          title="Удалить"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {filtered.length > 0 && totalPages > 1 && (
                <span>Страница {safePage} из {totalPages}</span>
              )}
              <span>
                {search.trim() && filtered.length !== list.length
                  ? `${filtered.length} из ${list.length} записей`
                  : `${filtered.length} записей`}
              </span>
            </div>
            {filtered.length > 0 && totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage(1)}
                  disabled={safePage === 1}
                  title="Первая"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  <ChevronLeft className="h-3.5 w-3.5 -ml-2" />
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
                    )
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
                  <ChevronRight className="h-3.5 w-3.5" />
                  <ChevronRight className="h-3.5 w-3.5 -ml-2" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
