import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card.tsx';
import { Button } from '../../components/ui/button.tsx';
import { DateInput } from '../../components/ui/date-input.tsx';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table.tsx';
import { SelectWithSearch } from '../../components/ui/select.tsx';
import {
  getEmailReports,
  getEmailReportTypes,
  sendEmailReportsNow,
  resendEmailReport,
  downloadEmailReportUrl,
  type EmailReportRow,
  type EmailReportType,
} from '../../api/email-reports.ts';
import { getBrokers, type BrokerRow } from '../../api/brokers.ts';
import { Download, RefreshCw, Send, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { Modal } from '../../components/ui/modal.tsx';

const PAGE_SIZE = 20;

const STATUS_LABELS: Record<string, string> = {
  pending: 'Ожидает',
  sent: 'Отправлен',
  failed: 'Ошибка',
  partial: 'Частично',
};

function formatDateTime(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString('ru-RU');
}

function formatDate(value: string): string {
  if (!value) return '—';
  const d = new Date(value.slice(0, 10));
  if (isNaN(d.getTime())) return value.slice(0, 10);
  return d.toLocaleDateString('ru-RU');
}

function brokerCountLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod100 >= 11 && mod100 <= 14) return `${count} брокеров`;
  if (mod10 === 1) return `${count} брокер`;
  if (mod10 >= 2 && mod10 <= 4) return `${count} брокера`;
  return `${count} брокеров`;
}

function BrokersCell({ names, count }: { names: string; count: number }) {
  const [open, setOpen] = useState(false);
  const list = names ? names.split(', ').filter(Boolean) : [];

  if (count === 0) {
    return <span className="text-sm text-muted-foreground">—</span>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={names || brokerCountLabel(count)}
        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
      >
        <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <span>{brokerCountLabel(count)}</span>
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title={`Брокеры (${count})`}>
        <ul className="space-y-2 text-sm">
          {list.map((name, i) => (
            <li key={`${name}-${i}`} className="break-words border-b border-border pb-2 last:border-0 last:pb-0">
              {name}
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}

export default function EmailReports() {
  const [list, setList] = useState<EmailReportRow[]>([]);
  const [types, setTypes] = useState<EmailReportType[]>([]);
  const [brokers, setBrokers] = useState<BrokerRow[]>([]);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterBrokerId, setFilterBrokerId] = useState('');
  const [filterReportCode, setFilterReportCode] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [sendDate, setSendDate] = useState(() => new Date().toISOString().slice(0, 10));

  const loadList = () => {
    setLoading(true);
    getEmailReports({
      dateFrom: filterDateFrom || undefined,
      dateTo: filterDateTo || undefined,
      brokerId: filterBrokerId ? parseInt(filterBrokerId, 10) : undefined,
      reportCode: filterReportCode || undefined,
      status: (filterStatus as EmailReportRow['send_status']) || undefined,
    })
      .then(setList)
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    getEmailReportTypes().then(setTypes).catch(() => {});
    getBrokers().then(setBrokers).catch(() => {});
  }, []);

  useEffect(() => {
    loadList();
  }, [filterDateFrom, filterDateTo, filterBrokerId, filterReportCode, filterStatus]);

  useEffect(() => {
    setPage(1);
  }, [filterDateFrom, filterDateTo, filterBrokerId, filterReportCode, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = list.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const brokerOptions = useMemo(
    () => [
      { value: '__all__', label: 'Все брокеры' },
      ...brokers.map((b) => ({ value: String(b.id), label: b.name })),
    ],
    [brokers],
  );

  const typeOptions = useMemo(
    () => [
      { value: '__all__', label: 'Все отчёты' },
      ...types.map((t) => ({
        value: t.code,
        label: t.reportTitle ?? t.name,
      })),
    ],
    [types],
  );

  const statusOptions = [
    { value: '__all__', label: 'Все статусы' },
    { value: 'sent', label: 'Отправлен' },
    { value: 'partial', label: 'Частично' },
    { value: 'pending', label: 'Ожидает' },
    { value: 'failed', label: 'Ошибка' },
  ];

  const handleSendNow = async (force = false) => {
    setActionError('');
    setLoading(true);
    try {
      const result = await sendEmailReportsNow({ reportDate: sendDate, force });
      if (result.errors.length > 0) {
        setActionError(result.errors.join('; '));
      }
      loadList();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Ошибка отправки');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (row: EmailReportRow) => {
    setActionError('');
    setLoading(true);
    try {
      await resendEmailReport(row.id);
      loadList();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Ошибка повторной отправки');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="space-y-4 pb-3">
          <CardTitle>Рассылка</CardTitle>
          <div className="grid w-full grid-cols-5 gap-3">
            <div className="min-w-0 w-full">
              <label className="mb-1 block text-xs text-muted-foreground">Период с</label>
              <DateInput
                value={filterDateFrom || undefined}
                onChange={(v) => setFilterDateFrom(v ?? '')}
                className="h-9 w-full text-sm"
              />
            </div>
            <div className="min-w-0 w-full">
              <label className="mb-1 block text-xs text-muted-foreground">Период по</label>
              <DateInput
                value={filterDateTo || undefined}
                onChange={(v) => setFilterDateTo(v ?? '')}
                className="h-9 w-full text-sm"
              />
            </div>
            <div className="min-w-0 w-full">
              <label className="mb-1 block text-xs text-muted-foreground">Брокер</label>
              <SelectWithSearch
                value={filterBrokerId || '__all__'}
                onValueChange={(v) => setFilterBrokerId(v === '__all__' ? '' : (v ?? ''))}
                placeholder="Все брокеры"
                withSearch
                triggerClassName="h-9 w-full text-sm"
                options={brokerOptions}
              />
            </div>
            <div className="min-w-0 w-full">
              <label className="mb-1 block text-xs text-muted-foreground">Тип отчёта</label>
              <SelectWithSearch
                value={filterReportCode || '__all__'}
                onValueChange={(v) => setFilterReportCode(v === '__all__' ? '' : (v ?? ''))}
                placeholder="Все отчёты"
                withSearch={false}
                triggerClassName="h-9 w-full text-sm"
                options={typeOptions}
              />
            </div>
            <div className="min-w-0 w-full">
              <label className="mb-1 block text-xs text-muted-foreground">Статус отправки</label>
              <SelectWithSearch
                value={filterStatus || '__all__'}
                onValueChange={(v) => setFilterStatus(v === '__all__' ? '' : (v ?? ''))}
                placeholder="Все статусы"
                withSearch={false}
                triggerClassName="h-9 w-full text-sm"
                listMinHeight="0"
                options={statusOptions}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-row flex-wrap items-end justify-end gap-2">
              <div className="w-40">
                <label className="mb-1 block text-xs text-muted-foreground">Дата отчёта для отправки</label>
                <DateInput
                  value={sendDate || undefined}
                  onChange={(v) => setSendDate(v ?? '')}
                  className="h-9 w-full text-sm"
                />
              </div>
              <Button size="sm" onClick={() => handleSendNow(false)} disabled={loading}>
                <Send className="h-4 w-4 mr-1.5" />
                Отправить сейчас
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleSendNow(true)} disabled={loading}>
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Принудительно
              </Button>
          </div>

          {actionError && <p className="text-sm text-destructive">{actionError}</p>}

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">Дата отчёта</TableHead>
                <TableHead>Тип отчёта</TableHead>
                <TableHead>Брокеры</TableHead>
                <TableHead className="w-28">Статус</TableHead>
                <TableHead className="w-36">Время отправки</TableHead>
                <TableHead>Файл</TableHead>
                <TableHead className="w-24 text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                    {loading ? 'Загрузка…' : 'Нет отправленных отчётов по выбранным фильтрам.'}
                  </TableCell>
                </TableRow>
              ) : (
                pageItems.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="text-sm">{formatDate(row.report_date)}</TableCell>
                    <TableCell className="text-sm">{row.report_name}</TableCell>
                    <TableCell className="text-sm align-top">
                      <BrokersCell names={row.broker_names} count={row.broker_count} />
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className={row.send_status === 'failed' ? 'text-destructive' : ''}>
                        {STATUS_LABELS[row.send_status] ?? row.send_status}
                      </span>
                      {row.send_error && (
                        <p className="text-xs text-destructive truncate max-w-[10rem]" title={row.send_error}>
                          {row.send_error}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(row.sent_at)}
                    </TableCell>
                    <TableCell className="max-w-[10rem] truncate text-xs text-muted-foreground" title={row.filename}>
                      {row.filename}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          title="Скачать"
                          asChild
                        >
                          <a href={downloadEmailReportUrl(row.id)} download={row.filename}>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleResend(row)}
                          disabled={loading}
                          title="Отправить повторно"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-muted-foreground">
              {list.length > 0 && totalPages > 1 && (
                <span>Страница {safePage} из {totalPages} · </span>
              )}
              <span>{list.length} записей</span>
            </div>
            {list.length > PAGE_SIZE && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
