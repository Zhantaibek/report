import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { Button } from '../../components/ui/button.tsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table.tsx';
import { Modal } from '../../components/ui/modal.tsx';
import { getClasses } from '../../api/reports.ts';
import type { ClassItem } from '../../api/reports.ts';
import { SelectWithSearch } from '../../components/ui/select.tsx';
import {
  getCommissionTariffs,
  createCommissionTariff,
  updateCommissionTariff,
  deleteCommissionTariff,
  type CommissionTariffRow,
  type CommissionSide,
} from '../../api/commission-tariffs.ts';
import { Plus, Pencil, Trash2 } from 'lucide-react';

const SIDE_LABELS: Record<CommissionSide, string> = {
  seller: 'Продавец',
  buyer: 'Покупатель',
  both: 'Обе стороны',
};

const SIDES: CommissionSide[] = ['both', 'seller', 'buyer'];

function formatIntWithSpaces(value: number | string): string {
  const num = typeof value === 'number' ? value : Number(String(value).replace(/\s/g, ''));
  if (!Number.isFinite(num)) return String(value);
  // ru-RU даёт неразрывный пробел, заменяем на обычный
  return num.toLocaleString('ru-RU', { maximumFractionDigits: 0 }).replace(/\u00A0/g, ' ');
}

function parseIntFromFormatted(value: string): number {
  const raw = value.replace(/\s/g, '');
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

type FieldError = {
  classCode?: string;
  volume?: string;
  ratePercent?: string;
  maxCommission?: string;
};

export default function CommissionTariffs() {
  const [list, setList] = useState<CommissionTariffRow[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [filterClass, setFilterClass] = useState<string>('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [classCode, setClassCode] = useState<string>('');
  const [volumeFrom, setVolumeFrom] = useState<string>('');
  const [volumeTo, setVolumeTo] = useState<string>('');
  const [side, setSide] = useState<CommissionSide>('both');
  const [ratePercent, setRatePercent] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<string>('');
  const [maxCommission, setMaxCommission] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [submitError, setSubmitError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldError>({});
  const [loading, setLoading] = useState(false);

  const loadList = () => {
    getCommissionTariffs().then(setList).catch(() => {});
  };

  useEffect(() => {
    loadList();
    getClasses().then(setClasses).catch(() => {});
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setClassCode('');
    setVolumeFrom('');
    setVolumeTo('');
    setSide('both');
    setRatePercent('');
    setDiscountPercent('');
    setMaxCommission('');
    setIsActive(true);
    setSubmitError('');
    setFormOpen(true);
  };

  const openEdit = (row: CommissionTariffRow) => {
    setEditingId(row.id);
    setClassCode(row.class_code ?? '');
    setVolumeFrom(
      row.volume_from != null && Number(row.volume_from) !== 0
        ? formatIntWithSpaces(Math.round(Number(row.volume_from)))
        : ''
    );
    setVolumeTo(
      row.volume_to != null
        ? formatIntWithSpaces(Math.round(Number(row.volume_to)))
        : ''
    );
    setSide(row.side);
    setRatePercent(String(row.rate_percent));
    setDiscountPercent(row.discount_percent != null ? Number(row.discount_percent).toFixed(2) : '0.00');
    setMaxCommission(
      row.max_commission != null && Number(row.max_commission) !== 0
        ? formatIntWithSpaces(Math.round(Number(row.max_commission)))
        : ''
    );
    setIsActive(row.is_active);
    setSubmitError('');
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setSubmitError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setFieldErrors({});
    if (!classCode) {
      setFieldErrors((prev) => ({ ...prev, classCode: 'Выберите класс' }));
    }

    const hasVolFrom = volumeFrom.trim() !== '';
    const hasVolTo = volumeTo.trim() !== '';
    if (!hasVolFrom && !hasVolTo) {
      setFieldErrors((prev) => ({ ...prev, volume: 'Укажите объём от или до' }));
    }

    const volFrom = hasVolFrom ? parseIntFromFormatted(volumeFrom) : 0;
    const rate = Number(ratePercent);
    if (volumeFrom.trim() !== '' && (!Number.isFinite(volFrom) || volFrom < 0)) {
      setFieldErrors((prev) => ({ ...prev, volume: 'Объём от должен быть числом ≥ 0' }));
    }
    if (!Number.isFinite(rate) || rate < 0) {
      setFieldErrors((prev) => ({ ...prev, ratePercent: 'Укажите ставку % (число ≥ 0)' }));
    }
    const volTo = hasVolTo ? parseIntFromFormatted(volumeTo) : null;
    if (volTo != null && (!Number.isFinite(volTo) || volTo < volFrom)) {
      setFieldErrors((prev) => ({ ...prev, volume: 'Объём до должен быть ≥ объёма от' }));
    }
    const hasMaxCommission = maxCommission.trim() !== '';
    const maxCommValue = hasMaxCommission ? parseIntFromFormatted(maxCommission) : null;
    if (hasMaxCommission && (maxCommValue == null || !Number.isFinite(maxCommValue) || maxCommValue < 0)) {
      setFieldErrors((prev) => ({ ...prev, maxCommission: 'Укажите верхний предел комиссии (число ≥ 0)' }));
    }

    const hasErrors =
      !classCode ||
      (!hasVolFrom && !hasVolTo) ||
      (volumeFrom.trim() !== '' && (!Number.isFinite(volFrom) || volFrom < 0)) ||
      (volTo != null && (!Number.isFinite(volTo) || volTo < volFrom)) ||
      !Number.isFinite(rate) ||
      rate < 0 ||
      (hasMaxCommission && (maxCommValue == null || !Number.isFinite(maxCommValue) || maxCommValue < 0));

    if (hasErrors) {
      setSubmitError('Исправьте ошибки в форме');
      return;
    }

    setLoading(true);
    try {
      const body = {
        class_code: classCode || null,
        volume_from: volFrom,
        volume_to: volTo,
        side,
        rate_percent: rate,
        discount_percent: discountPercent.trim() === '' ? 0 : Number(discountPercent),
        max_commission: hasMaxCommission ? maxCommValue : null,
        is_active: isActive,
      };
      if (editingId !== null) {
        await updateCommissionTariff(editingId, body);
      } else {
        await createCommissionTariff(body);
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
    if (!window.confirm('Удалить тариф?')) return;
    setLoading(true);
    try {
      await deleteCommissionTariff(id);
      loadList();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка удаления');
    } finally {
      setLoading(false);
    }
  };

  const formatVolume = (n: number | null) => {
    if (n == null || n == 0) return '—';

    if (n >= 1_000_000_000) {
      return `${Number((n / 1_000_000_000).toFixed(1))} млрд`;
    }

    if (n >= 1_000_000) {
      return `${Number((n / 1_000_000).toFixed(1))} млн`;
    }

    return String(Math.round(n));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
          <CardTitle>Тарифы комиссионных сборов</CardTitle>
          <div className="flex items-center gap-3">
            <SelectWithSearch
              value={filterClass}
              onValueChange={(v) => setFilterClass(v === '__all__' ? '' : (v ?? ''))}
              placeholder="Все классы"
              withSearch={false}
              triggerClassName="h-9 w-44 text-sm"
              options={[
                { value: '__all__', label: 'Все классы' },
                ...[...new Set(list.map((r) => r.class_code).filter(Boolean))].map((code) => ({
                  value: code as string,
                  label: code as string,
                })),
              ]}
            />
            <Button onClick={openCreate} size="sm">
              <Plus className="h-4 w-4 mr-1.5" />
              Добавить тариф
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Modal
            open={formOpen}
            onClose={closeForm}
            closeOnBackdropClick={false}
            title={editingId !== null ? 'Редактирование тарифа' : 'Новый тариф'}
          >
            <form onSubmit={handleSubmit} className="space-y-3">
              {submitError && <p className="text-sm text-destructive">{submitError}</p>}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Класс <span className="text-destructive">*</span>
                </label>
                <SelectWithSearch
                  value={classCode}
                  onValueChange={(v) => setClassCode(v ?? '')}
                  placeholder="— выбрать классы —"
                  searchFields={['label', 'value']}
                  options={classes.map((c) => ({
                    value: c.code,
                    label: c.name !== c.code ? `${c.code} — ${c.name}` : c.code,
                  }))}
                  triggerClassName={
                    fieldErrors.classCode ? 'border-destructive focus:ring-destructive' : undefined
                  }
                />
                {fieldErrors.classCode && (
                  <p className="mt-1 text-xs text-destructive">{fieldErrors.classCode}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Объём от (сом)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={volumeFrom}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\s/g, '');
                      if (raw === '') {
                        setVolumeFrom('');
                        return;
                      }
                      if (!/^\d+$/.test(raw)) return;
                      setVolumeFrom(formatIntWithSpaces(raw));
                    }}
                    placeholder="0"
                    className={`w-full h-9 rounded-md border bg-background px-3 text-sm ${
                      fieldErrors.volume ? 'border-destructive focus:ring-2 focus:ring-destructive' : 'border-input'
                    }`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Объём до (сом)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={volumeTo}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\s/g, '');
                      if (raw === '') {
                        setVolumeTo('');
                        return;
                      }
                      if (!/^\d+$/.test(raw)) return;
                      setVolumeTo(formatIntWithSpaces(raw));
                    }}
                    placeholder="0"
                    className={`w-full h-9 rounded-md border bg-background px-3 text-sm ${
                      fieldErrors.volume ? 'border-destructive focus:ring-2 focus:ring-destructive' : 'border-input'
                    }`}
                  />
                </div>
              </div>
              {fieldErrors.volume && (
                <p className="mt-1 text-xs text-destructive">{fieldErrors.volume}</p>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Сторона</label>
                <SelectWithSearch
                  value={side}
                  onValueChange={(v) => setSide((v as CommissionSide) ?? 'both')}
                  placeholder="— выбрать сторону —"
                  withSearch={false}
                  options={SIDES.map((s) => ({
                    value: s,
                    label: SIDE_LABELS[s],
                  }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Ставка (%) <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={ratePercent}
                    onChange={(e) => setRatePercent(e.target.value)}
                    required
                    placeholder="0.00"
                    className={`w-full h-9 rounded-md border bg-background px-3 text-sm ${
                      fieldErrors.ratePercent
                        ? 'border-destructive focus:ring-2 focus:ring-destructive'
                        : 'border-input'
                    }`}
                  />
                  {fieldErrors.ratePercent && (
                    <p className="mt-1 text-xs text-destructive">{fieldErrors.ratePercent}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Скидка (%)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    placeholder="0.00"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-3 items-start">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Комиссия не более (сом)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={maxCommission}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\s/g, '');
                        if (raw === '') {
                          setMaxCommission('');
                          return;
                        }
                        if (!/^\d+$/.test(raw)) return;
                        setMaxCommission(formatIntWithSpaces(raw));
                      }}
                      placeholder="0"
                      className={`w-full h-9 rounded-md border bg-background px-3 text-sm ${
                        fieldErrors.maxCommission
                          ? 'border-destructive focus:ring-2 focus:ring-destructive'
                          : 'border-input'
                      }`}
                    />
                    {fieldErrors.maxCommission && (
                      <p className="mt-1 text-xs text-destructive">{fieldErrors.maxCommission}</p>
                    )}
                  </div>
                  <div />
                </div>
                <div className="mt-1 flex items-center justify-start">
                  <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      id="tariff-active"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="h-5 w-5 rounded border border-input accent-[#3d848c]"
                    />
                    <span className="text-sm font-medium">Активен</span>
                  </label>
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

          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground">Нет тарифов. Добавьте первый.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Класс</TableHead>
                  <TableHead className="text-right">Объём от</TableHead>
                  <TableHead className="text-right">Объём до</TableHead>
                  <TableHead>Сторона</TableHead>
                  <TableHead className="text-right">Ставка %</TableHead>
                  <TableHead className="text-right">Скидка %</TableHead>
                  <TableHead className="text-right">Комиссия не более (сом)</TableHead>
                  <TableHead>Активен</TableHead>
                  <TableHead className="w-24 text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.filter((r) => !filterClass || r.class_code === filterClass).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.class_code ?? 'Все'}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatVolume(row.volume_from)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatVolume(row.volume_to)}</TableCell>
                    <TableCell>{SIDE_LABELS[row.side]}</TableCell>
                    <TableCell className="text-right tabular-nums">{Number(row.rate_percent).toFixed(2)}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.discount_percent != null && row.discount_percent !== 0 ? Number(row.discount_percent).toFixed(2) : '0'}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.max_commission != null && row.max_commission !== 0
                        ? formatIntWithSpaces(Math.round(Number(row.max_commission)))
                        : '—'}
                    </TableCell>
                    <TableCell>{row.is_active ? 'Да' : 'Нет'}</TableCell>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
