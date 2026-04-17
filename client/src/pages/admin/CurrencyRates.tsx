import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table.tsx';
import { Modal } from '../../components/ui/modal.tsx';
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  getCurrencyRatesHistory,
  createCurrencyRate,
  updateCurrencyRate,
  deleteCurrencyRate,
  type CurrencyRate,
} from '../../api/currency-rates.ts';

const PAGE_SIZE = 20;

type FieldError = {
  currencyCode?: string;
  rateDate?: string;
  rate?: string;
};

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('ru-RU');
}

export default function CurrencyRates() {
  const [list, setList] = useState<CurrencyRate[]>([]);

  // Filters
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  // Pagination
  const [page, setPage] = useState(1);

  // Form
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [currencyCode, setCurrencyCode] = useState('');
  const [rateDate, setRateDate] = useState('');
  const [rate, setRate] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
  const [loading, setLoading] = useState(false);

  const loadList = () => {
    getCurrencyRatesHistory().then(setList).catch(() => {});
  };

  useEffect(() => {
    loadList();
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filterDateFrom, filterDateTo]);

  const filtered = useMemo(() => {
    return list.filter((r) => {
      const d = r.rateDate.slice(0, 10);
      if (filterDateFrom && d < filterDateFrom) return false;
      if (filterDateTo && d > filterDateTo) return false;
      return true;
    });
  }, [list, filterDateFrom, filterDateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const resetFilters = () => {
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const hasFilters = filterDateFrom || filterDateTo;

  // Form handlers
  const openCreate = () => {
    setEditingId(null);
    setCurrencyCode('');
    setRateDate(new Date().toISOString().slice(0, 10));
    setRate('');
    setSubmitError('');
    setFieldErrors({});
    setFormOpen(true);
  };

  const openEdit = (row: CurrencyRate) => {
    setEditingId(row.id);
    setCurrencyCode(row.currencyCode);
    setRateDate(row.rateDate.slice(0, 10));
    setRate(String(row.rate));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    const errors: FieldError = {};

    const code = currencyCode.trim().toUpperCase();
    if (!code) errors.currencyCode = 'Укажите код валюты';
    if (!rateDate) errors.rateDate = 'Укажите дату';

    const rateNum = Number(rate.replace(',', '.'));
    if (!rate.trim() || !Number.isFinite(rateNum) || rateNum <= 0) {
      errors.rate = 'Укажите курс (число > 0)';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitError('Исправьте ошибки в форме');
      return;
    }

    setLoading(true);
    try {
      const body = { currency_code: code, rate_date: rateDate, rate: rateNum };
      if (editingId !== null) {
        await updateCurrencyRate(editingId, body);
      } else {
        await createCurrencyRate(body);
      }
      loadList();
      closeForm();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Удалить курс?')) return;
    setLoading(true);
    try {
      await deleteCurrencyRate(id);
      loadList();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка удаления');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (hasError?: string) =>
    `w-full h-9 rounded-md border bg-background px-3 text-sm ${
      hasError ? 'border-destructive focus:ring-2 focus:ring-destructive' : 'border-input'
    }`;

  const filterInput = 'h-8 rounded-md border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
          <CardTitle>Курсы валют</CardTitle>
          <Button onClick={openCreate} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Добавить курс
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <Modal
            open={formOpen}
            onClose={closeForm}
            closeOnBackdropClick={false}
            title={editingId !== null ? 'Редактирование курса' : 'Новый курс'}
          >
            <form onSubmit={handleSubmit} className="space-y-3">
              {submitError && <p className="text-sm text-destructive">{submitError}</p>}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Код валюты <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={currencyCode}
                  onChange={(e) => setCurrencyCode(e.target.value.toUpperCase())}
                  placeholder="USD"
                  maxLength={10}
                  className={inputClass(fieldErrors.currencyCode)}
                />
                {fieldErrors.currencyCode && (
                  <p className="mt-1 text-xs text-destructive">{fieldErrors.currencyCode}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Дата <span className="text-destructive">*</span>
                </label>
                <input
                  type="date"
                  value={rateDate}
                  onChange={(e) => setRateDate(e.target.value)}
                  className={inputClass(fieldErrors.rateDate)}
                />
                {fieldErrors.rateDate && (
                  <p className="mt-1 text-xs text-destructive">{fieldErrors.rateDate}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Курс (к сому) <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="0.00"
                  className={inputClass(fieldErrors.rate)}
                />
                {fieldErrors.rate && (
                  <p className="mt-1 text-xs text-destructive">{fieldErrors.rate}</p>
                )}
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

          {/* Filters */}
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Дата с</span>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className={`${filterInput} w-36`}
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">Дата по</span>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className={`${filterInput} w-36`}
              />
            </div>
            {hasFilters && (
              <Button variant="outline" size="sm" onClick={resetFilters} className="h-8">
                Сбросить
              </Button>
            )}
            <span className="text-xs text-muted-foreground self-end pb-1 ml-auto">
              {filtered.length} записей
            </span>
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {list.length === 0 ? 'Нет данных. Добавьте первый курс.' : 'Нет записей по заданным фильтрам.'}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Валюта</TableHead>
                    <TableHead>Дата</TableHead>
                    <TableHead className="text-right">Курс (сом)</TableHead>
                    <TableHead>Обновлён</TableHead>
                    <TableHead className="w-24 text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageItems.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{row.currencyCode}</TableCell>
                      <TableCell>{formatDate(row.rateDate)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {Number(row.rate).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(row.updatedAt).toLocaleString('ru-RU')}
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
                            onClick={() => handleDelete(row.id)}
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">
                    Страница {safePage} из {totalPages}
                  </span>
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
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
