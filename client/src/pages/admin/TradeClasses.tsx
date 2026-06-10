import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table.tsx';
import { Modal } from '../../components/ui/modal.tsx';
import { SelectWithSearch } from '../../components/ui/select.tsx';
import { getClasses } from '../../api/reports.ts';
import type { ClassItem } from '../../api/reports.ts';
import {
  getTradeClassRules,
  createTradeClassRule,
  updateTradeClassRule,
  deleteTradeClassRule,
  type TradeClassRuleRow,
  type MarketType,
} from '../../api/trade-class-rules.ts';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const MARKET_TYPE_LABELS: Record<MarketType, string> = {
  primary: 'Первичный рынок',
  secondary: 'Вторичный рынок',
};

const MARKET_TYPES: MarketType[] = ['primary', 'secondary'];

function formatClassLabel(c: ClassItem): string {
  return c.name !== c.code ? `${c.code} — ${c.name}` : c.code;
}

type FieldError = {
  classCode?: string;
  marketType?: string;
};

export default function TradeClasses() {
  const [list, setList] = useState<TradeClassRuleRow[]>([]);
  const [quikClasses, setQuikClasses] = useState<ClassItem[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [classesError, setClassesError] = useState('');
  const [filterMarketType, setFilterMarketType] = useState<string>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [classCode, setClassCode] = useState('');
  const [className, setClassName] = useState('');
  const [marketType, setMarketType] = useState<MarketType>('secondary');
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TradeClassRuleRow | null>(null);

  const usedClassCodes = useMemo(() => new Set(list.map((r) => r.class_code)), [list]);

  const classOptions = useMemo(() => {
    const fromQuik = quikClasses
      .filter((c) => !usedClassCodes.has(c.code) || c.code === classCode)
      .map((c) => ({
        value: c.code,
        label: formatClassLabel(c),
        name: c.name,
        code: c.code,
      }));

    if (classCode && !fromQuik.some((o) => o.value === classCode)) {
      const label = className && className !== classCode
        ? `${classCode} — ${className}`
        : classCode;
      fromQuik.unshift({ value: classCode, label, name: className || classCode, code: classCode });
    }

    return fromQuik;
  }, [quikClasses, usedClassCodes, classCode, className]);

  const quikAvailable = quikClasses.length > 0;

  const loadList = () => {
    getTradeClassRules().then(setList).catch(() => {});
  };

  const loadQuikClasses = useCallback(() => {
    setClassesLoading(true);
    setClassesError('');
    getClasses()
      .then((data) => {
        setQuikClasses(data);
        if (data.length === 0) {
          setClassesError('QUIK Export недоступен. Укажите код класса вручную.');
        }
      })
      .catch(() => {
        setQuikClasses([]);
        setClassesError('QUIK Export недоступен. Укажите код класса вручную.');
      })
      .finally(() => setClassesLoading(false));
  }, []);

  useEffect(() => {
    loadList();
  }, []);

  useEffect(() => {
    if (formOpen) loadQuikClasses();
  }, [formOpen, loadQuikClasses]);

  const openCreate = () => {
    setEditingId(null);
    setClassCode('');
    setClassName('');
    setMarketType('secondary');
    setSubmitError('');
    setFieldErrors({});
    setFormOpen(true);
  };

  const openEdit = (row: TradeClassRuleRow) => {
    setEditingId(row.id);
    setClassCode(row.class_code);
    setClassName(row.class_name ?? '');
    setMarketType(row.market_type);
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

  const handleClassSelect = (code: string | undefined) => {
    const next = code ?? '';
    setClassCode(next);
    if (!next) {
      setClassName('');
      return;
    }
    const found = quikClasses.find((c) => c.code === next);
    if (found) {
      setClassName(found.name !== found.code ? found.name : '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    const errors: FieldError = {};

    const code = classCode.trim();
    if (!code) errors.classCode = 'Выберите класс или укажите код';
    if (!marketType) errors.marketType = 'Выберите тип рынка';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitError('Исправьте ошибки в форме');
      return;
    }

    const name = className.trim();

    setLoading(true);
    try {
      const body = {
        class_code: code,
        class_name: name || null,
        market_type: marketType,
      };
      if (editingId !== null) {
        await updateTradeClassRule(editingId, body);
      } else {
        await createTradeClassRule(body);
      }
      loadList();
      closeForm();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (row: TradeClassRuleRow) => {
    setDeleteTarget(row);
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setLoading(true);
    try {
      await deleteTradeClassRule(deleteTarget.id);
      loadList();
      setDeleteTarget(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка удаления');
    } finally {
      setLoading(false);
    }
  };

  const filtered = list.filter((r) => !filterMarketType || r.market_type === filterMarketType);

  const inputClass = (hasError?: boolean) =>
    `w-full h-9 rounded-md border bg-background px-3 text-sm font-mono ${
      hasError ? 'border-destructive focus:ring-2 focus:ring-destructive' : 'border-input'
    }`;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
          <CardTitle>Классификация рынка по классам торгов</CardTitle>
          <div className="flex items-center gap-3">
            <SelectWithSearch
              value={filterMarketType || '__all__'}
              onValueChange={(v) => setFilterMarketType(v === '__all__' ? '' : (v ?? ''))}
              placeholder="Все типы"
              withSearch={false}
              listMinHeight="0"
              triggerClassName="h-9 w-48 text-sm"
              options={[
                { value: '__all__', label: 'Все типы рынка' },
                ...MARKET_TYPES.map((t) => ({ value: t, label: MARKET_TYPE_LABELS[t] })),
              ]}
            />
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Добавить класс
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Modal
            open={formOpen}
            onClose={closeForm}
            closeOnBackdropClick={false}
            title={editingId !== null ? 'Редактирование класса' : 'Новый класс'}
          >
            <form onSubmit={handleSubmit} className="space-y-3">
              {submitError && <p className="text-sm text-destructive">{submitError}</p>}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Класс <span className="text-destructive">*</span>
                </label>
                {quikAvailable ? (
                  <SelectWithSearch
                    value={classCode}
                    onValueChange={handleClassSelect}
                    placeholder={classesLoading ? 'Загрузка классов…' : '— выбрать класс —'}
                    searchFields={['label', 'name', 'code', 'value']}
                    options={classOptions}
                    listMinHeight="18rem"
                    triggerClassName={
                      fieldErrors.classCode ? 'border-destructive focus:ring-destructive' : undefined
                    }
                    emptyMessage={classesLoading ? 'Загрузка…' : 'Нет доступных классов'}
                  />
                ) : (
                  <input
                    type="text"
                    value={classCode}
                    onChange={(e) => {
                      setClassCode(e.target.value.toUpperCase());
                      setClassName('');
                    }}
                    placeholder="Например: AUCT_GBA02"
                    className={inputClass(!!fieldErrors.classCode)}
                  />
                )}
                {fieldErrors.classCode && (
                  <p className="mt-1 text-xs text-destructive">{fieldErrors.classCode}</p>
                )}
                {classesError && !quikAvailable && (
                  <p className="mt-1 text-xs text-muted-foreground">{classesError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Тип рынка <span className="text-destructive">*</span>
                </label>
                <SelectWithSearch
                  value={marketType}
                  onValueChange={(v) => setMarketType((v as MarketType) ?? 'secondary')}
                  placeholder="— выбрать тип —"
                  withSearch={false}
                  listMinHeight="0"
                  options={MARKET_TYPES.map((t) => ({
                    value: t,
                    label: MARKET_TYPE_LABELS[t],
                  }))}
                  triggerClassName={
                    fieldErrors.marketType ? 'border-destructive focus:ring-destructive' : undefined
                  }
                />
                {fieldErrors.marketType && (
                  <p className="mt-1 text-xs text-destructive">{fieldErrors.marketType}</p>
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

          <Modal
            open={deleteTarget !== null}
            onClose={cancelDelete}
            closeOnBackdropClick
            title="Удалить запись?"
          >
            <p className="text-sm text-muted-foreground">
              {deleteTarget ? (
                <>
                  Класс{' '}
                  <span className="font-mono text-foreground">{deleteTarget.class_code}</span>
                  {deleteTarget.class_name ? ` (${deleteTarget.class_name})` : ''}{' '}
                  будет удалён без возможности восстановления.
                </>
              ) : null}
            </p>
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="destructive"
                onClick={confirmDelete}
                disabled={loading}
              >
                Удалить
              </Button>
              <Button type="button" variant="outline" onClick={cancelDelete} disabled={loading}>
                Отмена
              </Button>
            </div>
          </Modal>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {list.length === 0
                ? 'Нет записей. Добавьте соответствие класса и типа рынка.'
                : 'Нет записей по выбранному фильтру.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Код класса</TableHead>
                  <TableHead>Название</TableHead>
                  <TableHead>Тип рынка</TableHead>
                  <TableHead className="w-24 text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-sm">{row.class_code}</TableCell>
                    <TableCell>{row.class_name ?? '—'}</TableCell>
                    <TableCell>{MARKET_TYPE_LABELS[row.market_type]}</TableCell>
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
                          onClick={() => handleDeleteClick(row)}
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
        </CardContent>
      </Card>
    </div>
  );
}
