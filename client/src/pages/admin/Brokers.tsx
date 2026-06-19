import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Input } from '../../components/ui/input.tsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table.tsx';
import { Modal } from '../../components/ui/modal.tsx';
import { SelectWithSearch } from '../../components/ui/select.tsx';
import { getFirms, type FirmItem } from '../../api/reports.ts';
import {
  getBrokers,
  createBroker,
  updateBroker,
  deleteBroker,
  type BrokerRow,
} from '../../api/brokers.ts';
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 20;

type FieldError = {
  name?: string;
  email?: string;
};

function formatFirmLabel(f: FirmItem): string {
  return f.firmName !== f.firmId ? `${f.firmId} — ${f.firmName}` : f.firmId;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('ru-RU');
}

const emptyForm = () => ({
  name: '',
  email: '',
  firmId: '',
  address: '',
  contacts: '',
  isActive: true,
});

export default function Brokers() {
  const [list, setList] = useState<BrokerRow[]>([]);
  const [quikFirms, setQuikFirms] = useState<FirmItem[]>([]);
  const [firmsLoading, setFirmsLoading] = useState(false);
  const [firmsError, setFirmsError] = useState('');
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<string>('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BrokerRow | null>(null);

  const usedFirmIds = useMemo(
    () => new Set(list.filter((r) => r.id !== editingId).map((r) => r.firm_id).filter(Boolean)),
    [list, editingId],
  );

  const firmOptions = useMemo(() => {
    const fromQuik = quikFirms
      .filter((f) => !usedFirmIds.has(f.firmId) || f.firmId === form.firmId)
      .map((f) => ({
        value: f.firmId,
        label: formatFirmLabel(f),
        name: f.firmName,
        firmId: f.firmId,
      }));

    if (form.firmId && !fromQuik.some((o) => o.value === form.firmId)) {
      fromQuik.unshift({
        value: form.firmId,
        label: form.name && form.name !== form.firmId
          ? `${form.firmId} — ${form.name}`
          : form.firmId,
        name: form.name || form.firmId,
        firmId: form.firmId,
      });
    }

    return fromQuik;
  }, [quikFirms, usedFirmIds, form.firmId, form.name]);

  const quikAvailable = quikFirms.length > 0;

  const loadList = () => {
    getBrokers().then(setList).catch(() => {});
  };

  const loadQuikFirms = useCallback(() => {
    setFirmsLoading(true);
    setFirmsError('');
    getFirms()
      .then((data) => {
        setQuikFirms(data);
        if (data.length === 0) {
          setFirmsError('QUIK Export недоступен. Укажите firm_id вручную.');
        }
      })
      .catch(() => {
        setQuikFirms([]);
        setFirmsError('QUIK Export недоступен. Укажите firm_id вручную.');
      })
      .finally(() => setFirmsLoading(false));
  }, []);

  useEffect(() => {
    loadList();
  }, []);

  useEffect(() => {
    if (formOpen) loadQuikFirms();
  }, [formOpen, loadQuikFirms]);

  useEffect(() => {
    setPage(1);
  }, [search, filterActive]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((row) => {
      if (filterActive === 'active' && !row.is_active) return false;
      if (filterActive === 'inactive' && row.is_active) return false;
      if (!q) return true;
      const hay = [row.name, row.email, row.firm_id ?? '', row.address ?? '', row.contacts ?? '', String(row.id)]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [list, search, filterActive]);

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

  const openEdit = (row: BrokerRow) => {
    setEditingId(row.id);
    setForm({
      name: row.name,
      email: row.email,
      firmId: row.firm_id ?? '',
      address: row.address ?? '',
      contacts: row.contacts ?? '',
      isActive: row.is_active,
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

  const handleFirmSelect = (firmId: string | undefined) => {
    const next = firmId ?? '';
    const firm = quikFirms.find((f) => f.firmId === next);
    setForm((prev) => ({
      ...prev,
      firmId: next,
      name: firm?.firmName ?? prev.name,
    }));
    setFieldErrors((prev) => ({ ...prev, name: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    const errors: FieldError = {};

    if (!form.name.trim()) errors.name = 'Укажите наименование';
    if (!form.email.trim()) {
      errors.email = 'Укажите email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      errors.email = 'Некорректный email';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitError('Исправьте ошибки в форме');
      return;
    }

    setLoading(true);
    const body = {
      name: form.name.trim(),
      email: form.email.trim(),
      firm_id: form.firmId.trim() || null,
      address: form.address.trim() || null,
      contacts: form.contacts.trim() || null,
      is_active: form.isActive,
    };
    try {
      if (editingId != null) {
        await updateBroker(editingId, body);
      } else {
        await createBroker(body);
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
      await deleteBroker(deleteTarget.id);
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
          <CardTitle>Брокеры</CardTitle>
          <div className="flex items-center gap-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию, email, адресу, контактам…"
              className="h-9 w-64 text-sm"
            />
            <SelectWithSearch
              value={filterActive || '__all__'}
              onValueChange={(v) => setFilterActive(v === '__all__' ? '' : (v ?? ''))}
              placeholder="Все"
              withSearch={false}
              listMinHeight="0"
              triggerClassName="h-9 w-40 text-sm"
              options={[
                { value: '__all__', label: 'Все' },
                { value: 'active', label: 'Активные' },
                { value: 'inactive', label: 'Неактивные' },
              ]}
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
            title={editingId !== null ? 'Редактирование брокера' : 'Новый брокер'}
          >
            <form onSubmit={handleSubmit} className="space-y-3">
              {submitError && <p className="text-sm text-destructive">{submitError}</p>}

              <div>
                <label className="block text-sm font-medium mb-1">Firm ID (QUIK)</label>
                {quikAvailable ? (
                  <SelectWithSearch
                    value={form.firmId}
                    onValueChange={handleFirmSelect}
                    placeholder={firmsLoading ? 'Загрузка фирм…' : '— выбрать фирму —'}
                    searchFields={['label', 'name', 'firmId', 'value']}
                    options={firmOptions}
                    listMinHeight="18rem"
                    loading={firmsLoading}
                    emptyMessage={firmsLoading ? 'Загрузка…' : 'Нет доступных фирм'}
                  />
                ) : (
                  <Input
                    value={form.firmId}
                    onChange={(e) => setForm((prev) => ({ ...prev, firmId: e.target.value }))}
                    placeholder="FirmId из QUIK"
                    className="font-mono"
                  />
                )}
                {firmsError && !quikAvailable && (
                  <p className="mt-1 text-xs text-muted-foreground">{firmsError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Наименование <span className="text-destructive">*</span>
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  className={inputClass(!!fieldErrors.name)}
                />
                {fieldErrors.name && (
                  <p className="mt-1 text-xs text-destructive">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Email <span className="text-destructive">*</span>
                </label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="email@example.com"
                  className={inputClass(!!fieldErrors.email)}
                />
                {fieldErrors.email && (
                  <p className="mt-1 text-xs text-destructive">{fieldErrors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Адрес</label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                  placeholder="Юридический / почтовый адрес"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Контакты</label>
                <Input
                  value={form.contacts}
                  onChange={(e) => setForm((prev) => ({ ...prev, contacts: e.target.value }))}
                  placeholder="Телефон, ФИО контактного лица"
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                />
                Активен (получает отчёты)
              </label>

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
            title="Удалить брокера?"
          >
            <p className="text-sm text-muted-foreground">
              {deleteTarget ? (
                <>
                  <span className="text-foreground">{deleteTarget.name}</span>
                  {' '}({deleteTarget.email}) будет удалён.
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
              {list.length === 0
                ? 'Нет записей. Добавьте брокера для email-рассылки отчётов.'
                : 'Ничего не найдено по запросу или фильтру.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">ID</TableHead>
                  <TableHead className="w-28">Firm ID</TableHead>
                  <TableHead>Наименование</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Адрес</TableHead>
                  <TableHead>Контакты</TableHead>
                  <TableHead className="w-24">Активен</TableHead>
                  <TableHead className="w-28">Добавлен</TableHead>
                  <TableHead className="w-24 text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageItems.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-sm text-muted-foreground">{row.id}</TableCell>
                    <TableCell className="font-mono text-sm">{row.firm_id ?? '—'}</TableCell>
                    <TableCell className="max-w-[16rem] truncate" title={row.name}>
                      {row.name}
                    </TableCell>
                    <TableCell className="text-sm">{row.email}</TableCell>
                    <TableCell
                      className="max-w-[12rem] truncate text-sm text-muted-foreground"
                      title={row.address ?? undefined}
                    >
                      {row.address ?? '—'}
                    </TableCell>
                    <TableCell
                      className="max-w-[10rem] truncate text-sm text-muted-foreground"
                      title={row.contacts ?? undefined}
                    >
                      {row.contacts ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {row.is_active ? (
                        <span className="text-foreground">Да</span>
                      ) : (
                        <span className="text-muted-foreground">Нет</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(row.created_at)}
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
