import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.tsx';
import { Button } from '../components/ui/button.tsx';
import { SelectWithSearch, type SelectOptionGroup } from '../components/ui/select.tsx';
import { Play, Printer, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, BarChart2, FileText } from 'lucide-react';
import { getReportForms } from '../api/report-forms.ts';
import { runReport, runUsdReport, runGoldReport, exportReport, getSecurities, getClasses, getFirms, getOracleInstruments, type ReportResult, type RunFilters, type SecurityItem, type ClassItem, type FirmItem, type UsdReportRow, type GoldContractRow, type OracleInstrument } from '../api/reports.ts';
import type { ReportForm } from '../api/report-forms.ts';
import ReportTable from '../components/ReportTable.tsx';
import ReportSummary from '../components/ReportSummary.tsx';
import ReportChart from '../components/ReportChart.tsx';
import Form1Report, {
  type ReportTradesConcludedData,
} from '../components/reports/Form1Report.tsx';
import Form2Report, {
  type ReportTradesForm2Data,
  type ClassGroupForm2,
} from '../components/reports/Form2Report.tsx';
import Form3Report, {
  type ReportTradesForm3Data,
  type ParticipantGroup,
} from '../components/reports/Form3Report.tsx';
import { Form6AReport, type ReportForm6AData, type ClassData, type SecurityData, type TradeData } from '../components/reports/Form6AReport.tsx';
import { Form9Report, type ReportForm9Data } from '../components/reports/Form9Report.tsx';
import { AuctionSummaryReport, type AuctionSummaryData } from '../components/reports/AuctionSummaryReport.tsx';
import { AuctionSummary2Report, type AuctionSummary2Row } from '../components/reports/AuctionSummary2Report.tsx';
import { BidClassificationReport, type BidClassificationData } from '../components/reports/BidClassificationReport.tsx';
import { CentralDepositoryReport, type CentralDepositoryData } from '../components/reports/CentralDepositoryReport.tsx';
import { AdditionalPlacementReport, type AdditionalPlacementData } from '../components/reports/AdditionalPlacementReport.tsx';
import { ExchangeContractReport, type ExchangeContractData } from '../components/reports/ExchangeContractReport.tsx';
import { ExchangeCertificateReport, type ExchangeCertificateData } from '../components/reports/ExchangeCertificateReport.tsx';
import { Form5Report, type ReportForm5Data, type Form5Row } from '../components/reports/Form5Report.tsx';
import { Form6Report, type ReportForm6Data, type Form6Row } from '../components/reports/Form6Report.tsx';
import { Form8Report, type ReportForm8Data, type Form8Row } from '../components/reports/Form8Report.tsx';
import { Form7Report, type ReportForm7Data, type Form7Row } from '../components/reports/Form7Report.tsx';
import { UsdReport } from '../components/reports/UsdReport.tsx';
import { ReportPagination } from '../components/reports/ReportPagination.tsx';
import { DateInput } from '../components/ui/date-input.tsx';
import { Alert, AlertDescription } from '../components/ui/alert.tsx';

/** Метаданные форм отчётов: конфигурация поведения на клиенте (и потенциально на сервере). */
interface FormMeta {
  /** Используется ли отдельный React‑шаблон вместо общей таблицы. */
  customView?: boolean;
}

const FORM_META: Record<string, FormMeta> = {
  // Бланки по сделкам
  Blank_Form_1: { customView: true },
  Blank_Form_2: { customView: true },
  Blank_Form_3: { customView: true },
  Blank_Form_5: { customView: true },
  Blank_Form_6: { customView: true },
  Blank_Form_6A: { customView: true },
  Blank_Form_7: { customView: true },
  Blank_Form_8: { customView: true },
  Blank_Form_9: { customView: true },
  Blank_Form_USD: { customView: true },

  // Аукционные формы
  Auction_Summary: { customView: true },
  Auction_Summary_2: { customView: true },
  Auction_Bid_Classification: { customView: true },
  Auction_Central_Depository: { customView: true },
  Auction_Additional_Placement: { customView: true },

  // Документы по сделкам
  Exchange_Contract: { customView: true },
  Exchange_Certificate: { customView: true },
  Exchange_Contract_Gold: { customView: true },
};

/** Формы с кастомным отображением (не таблица по умолчанию); для них доступна печать. */
const FORMS_WITH_CUSTOM_VIEW = new Set(
  Object.entries(FORM_META)
    .filter(([, meta]) => meta.customView)
    .map(([code]) => code),
);

function paginate<T>(
  rows: T[],
  page: number,
  perPage: number,
  isPrinting: boolean,
  total?: number,
): { pagedRows: T[]; totalPages: number } {
  if (rows.length === 0) {
    return { pagedRows: [], totalPages: 0 };
  }
  const effectiveTotal = total ?? rows.length;
  if (isPrinting) {
    return {
      pagedRows: rows,
      totalPages: Math.ceil(effectiveTotal / perPage),
    };
  }
  const start = (page - 1) * perPage;
  const end = start + perPage;
  return {
    pagedRows: rows.slice(start, end),
    totalPages: Math.ceil(effectiveTotal / perPage),
  };
}

function calcTotalsQuantityAndAmount(rows: Record<string, unknown>[]): { totalQuantity: number; totalAmount: number } {
  let totalQuantity = 0;
  let totalAmount = 0;
  for (const row of rows) {
    totalQuantity += Number(row.quantity ?? 0);
    totalAmount += Number(row.value ?? 0);
  }
  return { totalQuantity, totalAmount };
}

function calcTotalsWithUnique(
  rows: Record<string, unknown>[],
): { totalQuantity: number; totalAmount: number; totalTrades: number; totalSecurities: number } {
  let totalQuantity = 0;
  let totalAmount = 0;
  const uniqueSecurities = new Set<string>();
  const uniqueTrades = new Set<string>();

  for (const row of rows) {
    totalQuantity += Number(row.quantity ?? 0);
    totalAmount += Number(row.value ?? 0);
    const secCode = String(row.secCode ?? '');
    const tradeId = String(row.id ?? '');
    if (secCode) uniqueSecurities.add(secCode);
    if (tradeId) uniqueTrades.add(tradeId);
  }

  return {
    totalQuantity,
    totalAmount,
    totalTrades: uniqueTrades.size,
    totalSecurities: uniqueSecurities.size,
  };
}

export default function Reports() {
  const [forms, setForms] = useState<ReportForm[]>([]);
  const [firms, setFirms] = useState<FirmItem[]>([]);
  const [securities, setSecurities] = useState<SecurityItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [filters, setFilters] = useState<RunFilters>({
    dateFrom: undefined,
    dateTo: undefined,
  });
  const [result, setResult] = useState<ReportResult | null>(null);
  const [usdRows, setUsdRows] = useState<UsdReportRow[] | null>(null);
  const [goldRows, setGoldRows] = useState<GoldContractRow[] | null>(null);
  const [oracleInstruments, setOracleInstruments] = useState<OracleInstrument[]>([]);
  const [loadingInstruments, setLoadingInstruments] = useState(false);
  const [selectedOwnId, setSelectedOwnId] = useState<number | undefined>(undefined);
  const [runError, setRunError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [isPrinting, setIsPrinting] = useState(false);
  const limit = 20;

  useEffect(() => {
    getReportForms().then(setForms).catch(() => {});
    getFirms().then(setFirms).catch(() => {});
    getSecurities().then(setSecurities).catch(() => {});
    getClasses().then(setClasses).catch(() => {});
  }, []);

  const run = async () => {
    if (!selectedFormId) return;
    if (!filters.dateFrom || !filters.dateTo) {
      setValidationError('Укажите период (дата с и дата по)');
      return;
    }
    setLoading(true);
    setRunError(null);
    setValidationError(null);
    setPage(1);
    setUsdRows(null);
    setGoldRows(null);
    try {
      if (selectedForm?.code === 'Blank_Form_USD') {
        const res = await runUsdReport(filters.dateFrom, filters.dateTo, selectedOwnId);
        setUsdRows(res.rows);
        setResult(null);
      } else if (selectedForm?.code === 'Exchange_Contract_Gold') {
        const res = await runGoldReport(filters.dateFrom, filters.dateTo, selectedOwnId);
        setGoldRows(res.rows);
        setResult(null);
      } else {
        const res = await runReport({
          reportFormId: Number(selectedFormId),
          filters,
        });
        setResult(res);
      }
    } catch (err) {
      console.error(err);
      setResult(null);
      setUsdRows(null);
      setGoldRows(null);
      setRunError(err instanceof Error ? err.message : 'Ошибка при формировании отчёта');
    } finally {
      setLoading(false);
    }
  };

  const exportFile = async (format: 'xlsx' | 'csv') => {
    if (!selectedFormId) return;
    try {
      const blob = await exportReport({ reportFormId: Number(selectedFormId), filters, format });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `report.${format}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err) {
      console.error(err);
    }
  };

  // Группируем формы по категориям
  const formsByCategory = forms.reduce((acc, form) => {
    const category = form.category || 'Без категории';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(form);
    return acc;
  }, {} as Record<string, ReportForm[]>);

  const selectedForm = forms.find((f) => String(f.id) === selectedFormId);

  const handlePrint = () => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  };

  // Группировка данных для Blank_Form_1 с пагинацией
  const getGroupedData = (): { data: ReportTradesConcludedData; total: number; totalPages: number } | null => {
    if (!result || result.type !== 'table' || selectedForm?.code !== 'Blank_Form_1') {
      return null;
    }
    
    const {
      totalQuantity,
      totalAmount,
      totalTrades,
      totalSecurities,
    } = calcTotalsWithUnique(result.rows as Record<string, unknown>[]);

    const { pagedRows, totalPages } = paginate(
      result.rows as Record<string, unknown>[],
      page,
      limit,
      isPrinting,
      result.total,
    );
    
    const grouped = groupByClassAndSec(pagedRows);
    return {
      data: {
        periodFrom: filters.dateFrom || '',
        periodTo: filters.dateTo || '',
        classes: grouped,
        totalSummary: {
          totalQuantity,
          totalAmount,
          totalTrades,
          totalSecurities,
        },
      },
      total: result.total,
      totalPages,
    };
  };

  const groupedResult = getGroupedData();

  // Общая пагинация для всех отчётов — один расчёт для верхнего и нижнего блока
  const paginationInfo = useMemo(() => {
    if (selectedForm?.code === 'Exchange_Contract_Gold' && goldRows !== null && goldRows.length > 0) {
      return { totalRecords: goldRows.length, totalPages: goldRows.length };
    }
    if (!result || !selectedForm) return null;
    if (result.type === 'table' && selectedForm.code === 'Blank_Form_1' && groupedResult && result.rows.length > 0)
      return { totalRecords: groupedResult.total, totalPages: groupedResult.totalPages };
    if (result.type === 'table' && selectedForm.code === 'Auction_Summary') {
      if (result.rows.length === 0) return null;
      const byAuction = new Map<string, Record<string, unknown>[]>();
      for (const row of result.rows as Record<string, unknown>[]) {
        const key = String(row.secCode ?? '');
        if (!byAuction.has(key)) byAuction.set(key, []);
        byAuction.get(key)!.push(row);
      }
      const auctionKeys = Array.from(byAuction.keys()).sort();
      const auctionsPerPage = 1;
      return { totalRecords: auctionKeys.length, totalPages: Math.ceil(auctionKeys.length / auctionsPerPage) };
    }
    // Вторая сводная ведомость: одна сделка (сводка) на страницу
    if (result.type === 'table' && selectedForm.code === 'Auction_Summary_2') {
      const total = result.rows.length;
      if (total === 0) return null;
      const perPage = 1;
      return { totalRecords: total, totalPages: Math.ceil(total / perPage) };
    }
    // Допразмещение: одна запись (по secCode + дата) на страницу
    if (result.type === 'table' && selectedForm.code === 'Auction_Additional_Placement') {
      const rows = result.rows as Record<string, unknown>[];
      const keys = new Set(rows.map((r) => `${r.sec_code ?? ''}\t${r.trade_date ?? ''}`));
      const total = keys.size;
      if (total === 0) return null;
      return { totalRecords: total, totalPages: total };
    }
    // Классификация заявок / Ведомость для ЦД: один аукцион (по регистрационному номеру + дата) на страницу
    if (result.type === 'table' && (selectedForm.code === 'Auction_Bid_Classification' || selectedForm.code === 'Auction_Central_Depository')) {
      const rows = result.rows as Record<string, unknown>[];
      const keys = new Set(rows.map((r) => `${r.registration_number ?? ''}\t${r.auction_date ?? ''}`));
      const total = keys.size;
      if (total === 0) return null;
      return { totalRecords: total, totalPages: total };
    }
    // Биржевой контракт / Биржевое свидетельство: один документ на сделку на страницу
    if (result.type === 'table' && (selectedForm.code === 'Exchange_Contract' || selectedForm.code === 'Exchange_Certificate')) {
      const total = result.rows.length;
      if (total === 0) return null;
      return { totalRecords: total, totalPages: total };
    }
    if (result.type === 'table' && result.rows.length > 0)
      return { totalRecords: result.total, totalPages: Math.ceil(result.total / limit) };
    return null;
  }, [result, selectedForm, groupedResult, goldRows, limit]);

  return (
    <div>
      <Card className="print:border-none print:shadow-none">
        <CardContent className="pt-6">
          {/* ── Filter panel ── */}
          <div className="mb-6 print:hidden space-y-4">

            {/* Row 1: Форма | Класс | Инструмент | Участник */}
            <div className="grid grid-cols-4 gap-4">

              {/* Форма отчёта */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#3d848c' }}>
                  Форма отчёта
                </label>
                <SelectWithSearch
                  value={selectedFormId || undefined}
                  onValueChange={(v) => {
                    const newId = v ?? '';
                    setSelectedFormId(newId);
                    setResult(null);
                    setPage(1);
                    setUsdRows(null);
                    setGoldRows(null);
                    setSelectedOwnId(undefined);
                    setValidationError(null);
                    const form = forms.find((f) => String(f.id) === newId);
                    if ((form?.code === 'Blank_Form_USD' || form?.code === 'Exchange_Contract_Gold') && oracleInstruments.length === 0) {
                      setLoadingInstruments(true);
                      getOracleInstruments()
                        .then(setOracleInstruments)
                        .catch(() => {})
                        .finally(() => setLoadingInstruments(false));
                    }
                  }}
                  placeholder="— выбрать —"
                  searchFields={['label']}
                  groups={Object.entries(formsByCategory).map(([category, categoryForms]): SelectOptionGroup => ({
                    label: category,
                    icon: category === 'Отчеты по Аукциону'
                      ? <BarChart2 className="mr-2 h-4 w-4 shrink-0 opacity-70" />
                      : <FileText className="mr-2 h-4 w-4 shrink-0 opacity-70" />,
                    options: categoryForms.map((form) => ({
                      value: String(form.id),
                      label: (form.description || form.name || '').trim(),
                    })),
                  }))}
                />
              </div>

              {/* Инструмент Oracle — для USD и Биржевого контракта золото */}
              {(selectedForm?.code === 'Blank_Form_USD' || selectedForm?.code === 'Exchange_Contract_Gold') ? (
                <div className="space-y-1.5 col-span-3">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#3d848c' }}>
                    Инструмент
                  </label>
                  <SelectWithSearch
                    value={selectedOwnId !== undefined ? String(selectedOwnId) : '0'}
                    onValueChange={(v) => setSelectedOwnId(v && v !== '0' ? Number(v) : undefined)}
                    placeholder={loadingInstruments ? 'Загрузка…' : '— все инструменты —'}
                    loading={loadingInstruments}
                    searchFields={['label', 'value']}
                    options={[
                      { value: '0', label: '— все инструменты —' },
                      ...oracleInstruments.map((i) => ({
                        value: String(i.id),
                        label: i.extcode ? `${i.extcode} — ${i.namerus}` : i.namerus,
                      })),
                    ]}
                  />
                </div>
              ) : null}

              {/* Класс / Инструмент / Участник — скрываем для Oracle-отчётов */}
              {selectedForm?.code !== 'Blank_Form_USD' && selectedForm?.code !== 'Exchange_Contract_Gold' && <>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#3d848c' }}>
                    Класс
                  </label>
                  <SelectWithSearch
                    value={filters.classCode ?? '0'}
                    onValueChange={(v) => {
                      const classCode = v === '0' ? undefined : v;
                      setFilters({ ...filters, classCode, instrument: undefined });
                    }}
                    disabled={!selectedFormId}
                    placeholder="— все классы —"
                    searchFields={['label', 'value']}
                    options={[
                      { value: '0', label: '— все классы —' },
                      ...classes.map((c) => ({
                        value: c.code,
                        label: c.name !== c.code ? `${c.code} — ${c.name}` : c.code,
                      })),
                    ]}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#3d848c' }}>
                    Инструмент
                  </label>
                  <SelectWithSearch
                    value={filters.instrument ?? '0'}
                    onValueChange={(v) => setFilters({ ...filters, instrument: v === '0' ? undefined : v })}
                    disabled={!selectedFormId}
                    placeholder="— все инструменты —"
                    searchFields={['label', 'value']}
                    options={[
                      { value: '0', label: '— все инструменты —' },
                      ...securities
                        .filter((s) => !filters.classCode || s.classCode.toLowerCase() === filters.classCode!.toLowerCase())
                        .map((s) => ({
                          value: s.secCode,
                          label: s.secFullName && s.secFullName !== s.secCode
                            ? `${s.secCode} — ${s.secFullName}`
                            : s.secCode,
                        })),
                    ]}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#3d848c' }}>
                    Участник
                  </label>
                  <SelectWithSearch
                    value={filters.firmCode ?? '0'}
                    onValueChange={(v) => setFilters({ ...filters, firmCode: v && v !== '0' ? v : undefined })}
                    disabled={!selectedFormId}
                    placeholder="— все участники —"
                    searchFields={['label', 'value']}
                    options={[
                      { value: '0', label: '— все участники —' },
                      ...firms.map((f) => ({
                        value: f.firmId,
                        label: f.firmName && f.firmName !== f.firmId ? `${f.firmName} (${f.firmId})` : f.firmId,
                      })),
                    ]}
                  />
                </div>
              </>}
            </div>

            {/* Row 2: Даты | Кнопки */}
            <div className="grid grid-cols-2 gap-4 items-end">

              {/* Даты */}
              <div className="flex items-start gap-3">
                {selectedForm?.singleDate ? (
                  <div className="flex flex-col gap-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: '#3d848c' }}>
                      Дата <span className="text-destructive">*</span>
                    </label>
                    <DateInput
                      value={filters.dateFrom}
                      onChange={(date) => setFilters({ ...filters, dateFrom: date, dateTo: date })}
                      disabled={!selectedFormId}
                      required
                      className="block h-10 px-3 rounded-md border border-input bg-background text-sm disabled:opacity-50 disabled:cursor-not-allowed w-40"
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: '#3d848c' }}>
                        Дата с <span className="text-destructive">*</span>
                      </label>
                      <DateInput
                        value={filters.dateFrom}
                        onChange={(date) => setFilters({ ...filters, dateFrom: date })}
                        disabled={!selectedFormId}
                        required
                        className="block h-10 px-3 rounded-md border border-input bg-background text-sm disabled:opacity-50 disabled:cursor-not-allowed w-40"
                      />
                    </div>
                    <span className="text-muted-foreground self-end mb-2.5">—</span>
                    <div className="flex flex-col gap-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: '#3d848c' }}>
                        Дата по <span className="text-destructive">*</span>
                      </label>
                      <DateInput
                        value={filters.dateTo}
                        onChange={(date) => setFilters({ ...filters, dateTo: date })}
                        disabled={!selectedFormId}
                        required
                        className="block h-10 px-3 rounded-md border border-input bg-background text-sm disabled:opacity-50 disabled:cursor-not-allowed w-40"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Кнопки */}
              <div className="flex items-end justify-end gap-2">
                <Button onClick={run} disabled={!selectedFormId || loading}>
                  {loading ? 'Загрузка…' : (
                    <>
                      <Play className="h-4 w-4 mr-1.5" />
                      Сформировать
                    </>
                  )}
                </Button>
                {((groupedResult && selectedForm?.code === 'Blank_Form_1') || (usdRows?.length && selectedForm?.code === 'Blank_Form_USD') || (goldRows?.length && selectedForm?.code === 'Exchange_Contract_Gold') || (result && selectedForm?.code && FORMS_WITH_CUSTOM_VIEW.has(selectedForm.code))) && (
                  <Button variant="secondary" size="sm" onClick={handlePrint}>
                    <Printer className="h-4 w-4 mr-1.5" />
                    Печать
                  </Button>
                )}
              </div>
            </div>

            {/* Пагинация под фильтрами */}
            {paginationInfo && (
              <ReportPagination
                page={page}
                totalPages={paginationInfo.totalPages}
                totalRecords={paginationInfo.totalRecords}
                onPageChange={setPage}
              />
            )}
          </div>
          {validationError && (
            <div className="mt-4">
              <Alert variant="warning">
                <AlertDescription>{validationError}</AlertDescription>
              </Alert>
            </div>
          )}
          {runError && (
            <div className="mt-4">
              <Alert variant="destructive">
                <AlertDescription>{runError}</AlertDescription>
              </Alert>
            </div>
          )}
          {!selectedFormId && (
            <div className="mt-6 rounded-lg border border-border bg-muted/30 px-5 py-6 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">Выберите форму отчёта</p>
              <p className="mb-1">В поле «Форма» выберите нужный отчёт из списка (по системной информации или по аукциону), укажите период и при необходимости фильтр по инструменту, затем нажмите «Сформировать».</p>
              <p>Для отчётов по аукциону указывается одна дата; для остальных — диапазон «Дата с» и «Дата по».</p>
            </div>
          )}
          {selectedForm && (
            <>
              <div className="border-t border-border mt-2 mb-4 print:hidden" />
              {/* Если Blank_Form_1 — показываем группированный шаблон */}
              {groupedResult && selectedForm.code === 'Blank_Form_1' && result && (result.type === 'table' || result.type === 'summary') && result.rows.length > 0 && (
                <>
                  {/* Отчет */}
                  <div className="mt-6" key={`form1-page-${page}`}>
                    <Form1Report 
                      data={groupedResult.data} 
                      showTotalSummary={isPrinting || page === groupedResult.totalPages}
                    />
                  </div>
                </>
              )}
              
              {/* Если Blank_Form_2 — показываем группированный шаблон Form2 */}
              {(() => {
                if (!result || result.type !== 'table' || selectedForm?.code !== 'Blank_Form_2' || result.rows.length === 0) {
                  return null;
                }

                const { pagedRows, totalPages } = paginate(
                  result.rows as Record<string, unknown>[],
                  page,
                  limit,
                  isPrinting,
                  result.total,
                );

                const { totalQuantity, totalAmount } = calcTotalsQuantityAndAmount(
                  result.rows as Record<string, unknown>[],
                );
                
                const groupedForm2 = groupByClassAndSecForm2(pagedRows);
                const form2Data: ReportTradesForm2Data = {
                  periodFrom: filters.dateFrom || '',
                  periodTo: filters.dateTo || '',
                  classes: groupedForm2,
                  totalSummary: {
                    totalQuantity,
                    totalAmount,
                  },
                };
                
                return (
                  <>
                    <div className="mt-6" key={`form2-page-${page}`}>
                      <Form2Report 
                        data={form2Data} 
                        showTotalSummary={isPrinting || page === totalPages}
                      />
                    </div>
                  </>
                );
              })()}
              
              {/* Если Blank_Form_3 — показываем группированный шаблон Form3 */}
              {(() => {
                if (!result || result.type !== 'table' || selectedForm?.code !== 'Blank_Form_3' || result.rows.length === 0) {
                  return null;
                }

                const { pagedRows, totalPages } = paginate(
                  result.rows as Record<string, unknown>[],
                  page,
                  limit,
                  isPrinting,
                  result.total,
                );

                const {
                  totalQuantity,
                  totalAmount,
                  totalTrades,
                  totalSecurities,
                } = calcTotalsWithUnique(result.rows as Record<string, unknown>[]);
                
                const groupedForm3 = groupByParticipantAndClassAndSec(pagedRows);
                const form3Data: ReportTradesForm3Data = {
                  periodFrom: filters.dateFrom || '',
                  periodTo: filters.dateTo || '',
                  participants: groupedForm3,
                  totalSummary: {
                    totalQuantity,
                    totalAmount,
                    totalTrades,
                    totalSecurities,
                  },
                };
                
                return (
                  <>
                    <div className="mt-6" key={`form3-page-${page}`}>
                      <Form3Report 
                        data={form3Data} 
                        showTotalSummary={isPrinting || page === totalPages}
                      />
                    </div>
                  </>
                );
              })()}

              {/* Если Blank_Form_6A — показываем агрегированный отчет */}
              {(() => {
                if (!result || result.type !== 'table' || selectedForm?.code !== 'Blank_Form_6A' || result.rows.length === 0) {
                  return null;
                }

                const { pagedRows } = paginate(
                  result.rows as Record<string, unknown>[],
                  page,
                  limit,
                  isPrinting,
                  result.total,
                );

                const groupedForm6A = groupByClassSecAndDate(pagedRows);
                const form6AData: ReportForm6AData = {
                  periodFrom: filters.dateFrom || '',
                  periodTo: filters.dateTo || '',
                  classes: groupedForm6A,
                };
                
                return (
                  <>
                    <div className="mt-6" key={`form6a-page-${page}`}>
                      <Form6AReport data={form6AData} />
                    </div>
                  </>
                );
              })()}

              {/* Форма 6 — ведомость заключенных сделок с отдельной колонкой листинга */}
              {(() => {
                if (!result || result.type !== 'table' || selectedForm?.code !== 'Blank_Form_6' || result.rows.length === 0) {
                  return null;
                }

                const { pagedRows, totalPages } = paginate(
                  result.rows as Record<string, unknown>[],
                  page,
                  limit,
                  isPrinting,
                  result.total,
                );

                const showFullTotals = isPrinting || page === totalPages;
                const fullTotals = showFullTotals
                  ? (() => {
                      const { totalQuantity, totalAmount: totalVolume } = calcTotalsQuantityAndAmount(
                        result.rows as Record<string, unknown>[],
                      );
                      return { totalQuantity, totalVolume, dealCount: result.rows.length };
                    })()
                  : undefined;

                const form6Data = buildForm6Data(
                  pagedRows as Record<string, unknown>[],
                  filters.dateFrom || '',
                  filters.dateTo || '',
                  fullTotals,
                );
                return (
                  <div className="mt-6" key={`form6-page-${page}`}>
                    <Form6Report data={form6Data} />
                  </div>
                );
              })()}

              {/* Форма 8 — Отчет о заключенных сделках (компания, символ, ISIN) */}
              {(() => {
                if (!result || result.type !== 'table' || selectedForm?.code !== 'Blank_Form_8' || result.rows.length === 0) {
                  return null;
                }

                const { pagedRows, totalPages } = paginate(
                  result.rows as Record<string, unknown>[],
                  page,
                  limit,
                  isPrinting,
                  result.total,
                );

                const showFullTotals = isPrinting || page === totalPages;
                const fullTotals = showFullTotals
                  ? (() => {
                      const { totalQuantity, totalAmount: totalVolume } = calcTotalsQuantityAndAmount(
                        result.rows as Record<string, unknown>[],
                      );
                      return { totalQuantity, totalVolume, dealCount: result.rows.length };
                    })()
                  : undefined;

                const form8Data = buildForm8Data(
                  pagedRows as Record<string, unknown>[],
                  filters.dateFrom || '',
                  filters.dateTo || '',
                  fullTotals,
                );
                return (
                  <div className="mt-6" key={`form8-page-${page}`}>
                    <Form8Report data={form8Data} />
                  </div>
                );
              })()}

              {/* Форма 5 — ведомость заключенных сделок */}
              {(() => {
                if (!result || result.type !== 'table' || selectedForm?.code !== 'Blank_Form_5' || result.rows.length === 0) {
                  return null;
                }

                const { pagedRows, totalPages } = paginate(
                  result.rows as Record<string, unknown>[],
                  page,
                  limit,
                  isPrinting,
                  result.total,
                );

                const showFullTotals = isPrinting || page === totalPages;
                const fullTotals = showFullTotals
                  ? (() => {
                      const { totalQuantity, totalAmount: totalVolume } = calcTotalsQuantityAndAmount(
                        result.rows as Record<string, unknown>[],
                      );
                      return { totalQuantity, totalVolume, dealCount: result.rows.length };
                    })()
                  : undefined;
                const form5Data = buildForm5Data(
                  pagedRows as Record<string, unknown>[],
                  filters.dateFrom || '',
                  filters.dateTo || '',
                  fullTotals,
                );
                return (
                  <div className="mt-6" key={`form5-page-${page}`}>
                    <Form5Report data={form5Data} />
                  </div>
                );
              })()}

              {/* Форма F7 — по секторам и ЦБ */}
              {(() => {
                if (!result || result.type !== 'table' || selectedForm?.code !== 'Blank_Form_7' || result.rows.length === 0) {
                  return null;
                }
                const form7Data = buildForm7Data(result.rows as Record<string, unknown>[], filters.dateFrom || '', filters.dateTo || '');
                return (
                  <div className="mt-6">
                    <Form7Report data={form7Data} />
                  </div>
                );
              })()}

              {/* Если Blank_Form_9 — показываем ведомость заключенных сделок */}
              {(() => {
                if (!result || result.type !== 'table' || selectedForm?.code !== 'Blank_Form_9' || result.rows.length === 0) {
                  return null;
                }

                const { pagedRows, totalPages } = paginate(
                  result.rows as Record<string, unknown>[],
                  page,
                  limit,
                  isPrinting,
                  result.total,
                );

                const groupedForm9 = groupByClassAndSecForm9(pagedRows);

                const {
                  totalQuantity,
                  totalAmount: totalValue,
                  totalTrades,
                  totalSecurities,
                } = calcTotalsWithUnique(result.rows as Record<string, unknown>[]);
                
                const form9Data: ReportForm9Data = {
                  periodFrom: filters.dateFrom || '',
                  periodTo: filters.dateTo || '',
                  classes: groupedForm9,
                  totalSummary: (isPrinting || page === totalPages) ? {
                    totalQuantity,
                    totalValue,
                    totalTrades,
                    totalSecurities,
                  } : undefined,
                };
                
                return (
                  <>
                    <div className="mt-6" key={`form9-page-${page}`}>
                      <Form9Report data={form9Data} />
                    </div>
                  </>
                );
              })()}

              {/* Если Auction_Summary — по одному отчёту на каждый аукцион (группа по secCode) за дату */}
              {(() => {
                if (!result || result.type !== 'table' || selectedForm?.code !== 'Auction_Summary') {
                  return null;
                }
                if (result.rows.length === 0) {
                  return null;
                }
                // Группируем по аукциону: один аукцион = один инструмент (secCode) на дату
                const byAuction = new Map<string, Record<string, unknown>[]>();
                for (const row of result.rows as Record<string, unknown>[]) {
                  const key = String(row.secCode ?? '');
                  if (!byAuction.has(key)) byAuction.set(key, []);
                  byAuction.get(key)!.push(row);
                }
                const auctionKeys = Array.from(byAuction.keys()).sort();
                const auctionsPerPage = 1; // один торг (аукцион) на страницу — следующий торг со следующей страницы
                const startAuction = isPrinting ? 0 : (page - 1) * auctionsPerPage;
                const endAuction = isPrinting ? auctionKeys.length : Math.min(startAuction + auctionsPerPage, auctionKeys.length);
                const totalPages = Math.ceil(auctionKeys.length / auctionsPerPage);

                return (
                  <>
                    {auctionKeys.slice(startAuction, endAuction).map((secCode, idx) => {
                      const rows = byAuction.get(secCode)!;
                      const priceGroups = rows
                        .map((row: Record<string, unknown>) => ({
                          price: Number(row.price ?? 0),
                          nominalSum: Number(row.nominalSum ?? 0),
                          totalQty: Number(row.totalQty ?? 0),
                          valueActual: Number(row.valueActual ?? 0),
                          yieldPercent: Number(row.yieldPercent ?? 0),
                          yieldByPrice: Number(row.yieldByPrice ?? 0),
                        }))
                        .sort((a, b) => b.yieldPercent - a.yieldPercent); // нисходящая сортировка по доходности (%)
                      let competitiveQty = 0, competitiveNominal = 0, competitiveValueActual = 0;
                      let nonCompetitiveQty = 0, nonCompetitiveNominal = 0, nonCompetitiveValueActual = 0;
                      let totalQty = 0, totalNominal = 0, totalValueActual = 0;
                      rows.forEach((row: Record<string, unknown>) => {
                        const qty = Number(row.totalQty ?? 0);
                        const nominal = Number(row.nominalSum ?? 0);
                        const valueActual = Number(row.valueActual ?? 0);
                        const bidType = String(row.bidType ?? '');
                        totalQty += qty;
                        totalNominal += nominal;
                        totalValueActual += valueActual;
                        if (bidType === 'Конкурентная') {
                          competitiveQty += qty;
                          competitiveNominal += nominal;
                          competitiveValueActual += valueActual;
                        } else {
                          nonCompetitiveQty += qty;
                          nonCompetitiveNominal += nominal;
                          nonCompetitiveValueActual += valueActual;
                        }
                      });
                      const totalVolume = totalNominal || totalValueActual || 1;
                      const firstRow = rows[0] as Record<string, unknown>;
                      const auctionData: AuctionSummaryData = {
                        auctionDate: filters.dateFrom || '',
                        secCode: String(firstRow?.secCode ?? ''),
                        classCode: String(firstRow?.classCode ?? ''),
                        secFullName: String(firstRow?.secFullName ?? ''),
                        registrationNumber: String(firstRow?.secCode ?? ''),
                        couponRate: Number(firstRow?.yieldPercent ?? 0),
                        bids: [],
                        summary: {
                          competitiveQty,
                          competitiveNominal,
                          competitiveValueActual,
                          competitivePercent: (competitiveNominal / totalVolume) * 100,
                          nonCompetitiveQty,
                          nonCompetitiveNominal,
                          nonCompetitiveValueActual,
                          nonCompetitivePercent: (nonCompetitiveNominal / totalVolume) * 100,
                          totalQty,
                          totalNominal,
                          totalValueActual,
                        },
                        priceGroups,
                      };
                      return (
                        <div
                          key={`auction-${secCode}-${idx}`}
                          className={idx === 0 ? 'mt-6' : 'mt-10 print:break-before-page'}
                        >
                          <AuctionSummaryReport data={auctionData} />
                        </div>
                      );
                    })}
                  </>
                );
              })()}

              {/* Если Auction_Summary_2 — вторая сводная ведомость (итоги размещения + сравнение с предыдущим), по одной сделке на страницу */}
              {(() => {
                if (!result || result.type !== 'table' || selectedForm?.code !== 'Auction_Summary_2' || result.rows.length === 0) return null;
                const perPage = 1;
                const start = (page - 1) * perPage;
                const end = isPrinting ? result.rows.length : start + perPage;
                const paged = (result.rows as Record<string, unknown>[]).slice(start, end);
                return (
                  <>
                    {paged.map((row, idx) => (
                      <div key={`auction2-${row.cur_sec_code ?? idx}-${page}`} className={idx === 0 ? 'mt-6' : 'mt-10 print:break-before-page'}>
                        <AuctionSummary2Report data={row as unknown as AuctionSummary2Row} reportDate={filters.dateFrom || ''} />
                      </div>
                    ))}
                  </>
                );
              })()}

              {/* Если Auction_Bid_Classification — классификация заявок по дилерам, один аукцион на страницу */}
              {(() => {
                if (!result || result.type !== 'table' || selectedForm?.code !== 'Auction_Bid_Classification') return null;
                const rows = result.rows as Record<string, unknown>[];
                if (rows.length === 0) {
                  return (
                    <div className="mt-6 rounded-md bg-muted/50 border border-border px-4 py-6 text-center text-muted-foreground">
                      Нет данных за выбранную дату. Проверьте дату и наличие сделок в источнике данных.
                    </div>
                  );
                }
                const byAuction = new Map<string, Record<string, unknown>[]>();
                for (const r of rows) {
                  const key = `${r.registration_number ?? ''}\t${r.auction_date ?? ''}`;
                  if (!byAuction.has(key)) byAuction.set(key, []);
                  byAuction.get(key)!.push(r);
                }
                const auctionKeys = Array.from(byAuction.keys()).sort();
                const perPage = 1;
                const start = (page - 1) * perPage;
                const end = isPrinting ? auctionKeys.length : start + perPage;
                const pagedKeys = auctionKeys.slice(start, end);
                return (
                  <>
                    {pagedKeys.map((key, idx) => {
                      const group = byAuction.get(key)!;
                      const first = group[0];
                      const data: BidClassificationData = {
                        registration_number: String(first?.registration_number ?? ''),
                        auction_date: String(first?.auction_date ?? ''),
                        issue_volume: Number(first?.issue_volume ?? 0),
                        non_competitive_amount: Number(first?.non_competitive_amount ?? 0),
                        rows: group.map((r) => ({
                          dealer_name: String(r.dealer_name ?? ''),
                          nominal_value: Number(r.nominal_value ?? 0),
                          bid_price: Number(r.bid_price ?? 0),
                          yield_pct: Number(r.yield_pct ?? 0),
                        })),
                      };
                      return (
                        <div key={`bid-class-${key}-${page}`} className={idx === 0 ? 'mt-6' : 'mt-10 print:break-before-page'}>
                          <BidClassificationReport data={data} reportDate={filters.dateFrom || ''} />
                        </div>
                      );
                    })}
                  </>
                );
              })()}

              {/* Если Auction_Central_Depository — ведомость для Центрального депозитария, один аукцион на страницу */}
              {(() => {
                if (!result || result.type !== 'table' || selectedForm?.code !== 'Auction_Central_Depository') return null;
                const rows = result.rows as Record<string, unknown>[];
                if (rows.length === 0) {
                  return (
                    <div className="mt-6 rounded-md bg-muted/50 border border-border px-4 py-6 text-center text-muted-foreground">
                      Нет данных за выбранную дату. Проверьте дату и наличие сделок в источнике данных.
                    </div>
                  );
                }
                const byAuction = new Map<string, Record<string, unknown>[]>();
                for (const r of rows) {
                  const key = `${r.registration_number ?? ''}\t${r.auction_date ?? ''}`;
                  if (!byAuction.has(key)) byAuction.set(key, []);
                  byAuction.get(key)!.push(r);
                }
                const auctionKeys = Array.from(byAuction.keys()).sort();
                const perPage = 1;
                const start = (page - 1) * perPage;
                const end = isPrinting ? auctionKeys.length : start + perPage;
                const pagedKeys = auctionKeys.slice(start, end);
                return (
                  <>
                    {pagedKeys.map((key, idx) => {
                      const group = byAuction.get(key)!;
                      const first = group[0];
                      const data: CentralDepositoryData = {
                        registration_number: String(first?.registration_number ?? ''),
                        auction_date: String(first?.auction_date ?? ''),
                        issue_volume: Number(first?.issue_volume ?? 0),
                        non_competitive_amount: Number(first?.non_competitive_amount ?? 0),
                        rows: group.map((r) => ({
                          dealer_name: String(r.dealer_name ?? ''),
                          actual_qty: Number(r.actual_qty ?? 0),
                          actual_value: Number(r.actual_value ?? 0),
                          bid_price: Number(r.bid_price ?? 0),
                          yield_pct: Number(r.yield_pct ?? 0),
                        })),
                      };
                      return (
                        <div key={`central-dep-${key}-${page}`} className={idx === 0 ? 'mt-6' : 'mt-10 print:break-before-page'}>
                          <CentralDepositoryReport data={data} reportDate={filters.dateFrom || ''} />
                        </div>
                      );
                    })}
                  </>
                );
              })()}
              
              {/* Если Exchange_Contract — биржевой контракт, один документ на страницу */}
              {(() => {
                if (!result || result.type !== 'table' || selectedForm?.code !== 'Exchange_Contract' || result.rows.length === 0) return null;
                const perPage = 1;
                const start = (page - 1) * perPage;
                const end = isPrinting ? result.rows.length : start + perPage;
                const paged = (result.rows as Record<string, unknown>[]).slice(start, end);
                return (
                  <>
                    {paged.map((row, idx) => {
                      const data: ExchangeContractData = {
                        id: typeof row.id === 'string' || typeof row.id === 'number' ? row.id : String(row.id ?? ''),
                        tradeDate: String(row.tradeDate ?? ''),
                        tradeDateTime: row.tradeDateTime != null ? String(row.tradeDateTime) : null,
                        classCode: String(row.classCode ?? ''),
                        className: row.className != null ? String(row.className) : undefined,
                        secCode: String(row.secCode ?? ''),
                        secFullName: row.secFullName != null ? String(row.secFullName) : undefined,
                        sellerName: row.sellerName != null ? String(row.sellerName) : null,
                        sellAccount: row.sellAccount != null ? String(row.sellAccount) : null,
                        sellerClientCode: row.sellerClientCode != null ? String(row.sellerClientCode) : null,
                        buyerName: row.buyerName != null ? String(row.buyerName) : null,
                        buyAccount: row.buyAccount != null ? String(row.buyAccount) : null,
                        buyerClientCode: row.buyerClientCode != null ? String(row.buyerClientCode) : null,
                        quantity: Number(row.quantity ?? 0),
                        price: Number(row.price ?? 0),
                        value: Number(row.value ?? 0),
                        settleDate: row.settleDate != null ? String(row.settleDate) : null,
                        couponRate: row.couponRate != null ? Number(row.couponRate) : null,
                        sellerCommission: row.sellerCommission != null ? Number(row.sellerCommission) : null,
                        buyerCommission: row.buyerCommission != null ? Number(row.buyerCommission) : null,
                      };
                      return (
                        <div key={`exchange-contract-${row.id ?? idx}-${page}`} className={idx === 0 ? 'mt-6' : 'mt-10 print:break-before-page'}>
                          <ExchangeContractReport data={data} />
                        </div>
                      );
                    })}
                  </>
                );
              })()}

              {/* Если Exchange_Certificate — биржевое свидетельство */}
              {(() => {
                if (!result || result.type !== 'table' || selectedForm?.code !== 'Exchange_Certificate' || result.rows.length === 0) return null;
                const perPage = 1;
                const start = (page - 1) * perPage;
                const end = isPrinting ? result.rows.length : start + perPage;
                const paged = (result.rows as Record<string, unknown>[]).slice(start, end);
                return (
                  <>
                    {paged.map((row, idx) => {
                      const data: ExchangeCertificateData = {
                        id: typeof row.id === 'string' || typeof row.id === 'number' ? row.id : String(row.id ?? ''),
                        tradeDate: String(row.tradeDate ?? ''),
                        tradeDateTime: row.tradeDateTime != null ? String(row.tradeDateTime) : null,
                        classCode: String(row.classCode ?? ''),
                        className: row.className != null ? String(row.className) : undefined,
                        secCode: String(row.secCode ?? ''),
                        secFullName: row.secFullName != null ? String(row.secFullName) : undefined,
                        sellerName: row.sellerName != null ? String(row.sellerName) : null,
                        sellAccount: row.sellAccount != null ? String(row.sellAccount) : null,
                        sellerClientCode: row.sellerClientCode != null ? String(row.sellerClientCode) : null,
                        buyerName: row.buyerName != null ? String(row.buyerName) : null,
                        buyAccount: row.buyAccount != null ? String(row.buyAccount) : null,
                        buyerClientCode: row.buyerClientCode != null ? String(row.buyerClientCode) : null,
                        quantity: Number(row.quantity ?? 0),
                        price: Number(row.price ?? 0),
                        value: Number(row.value ?? 0),
                        settleDate: row.settleDate != null ? String(row.settleDate) : null,
                        couponRate: row.couponRate != null ? Number(row.couponRate) : null,
                        yield: row.yield != null ? Number(row.yield) : null,
                        sellerCommission: row.sellerCommission != null ? Number(row.sellerCommission) : null,
                        buyerCommission: row.buyerCommission != null ? Number(row.buyerCommission) : null,
                      };
                      return (
                        <div key={`exchange-cert-${row.id ?? idx}-${page}`} className={idx === 0 ? 'mt-6' : 'mt-10 print:break-before-page'}>
                          <ExchangeCertificateReport data={data} />
                        </div>
                      );
                    })}
                  </>
                );
              })()}

              {/* Биржевой контракт золото — данные из Oracle, один документ на сделку */}
              {selectedForm.code === 'Exchange_Contract_Gold' && goldRows !== null && goldRows.length > 0 && (() => {
                const perPage = 1;
                const start = (page - 1) * perPage;
                const end = isPrinting ? goldRows.length : start + perPage;
                const paged = goldRows.slice(start, end);
                const instrumentName = selectedOwnId !== undefined
                  ? (() => {
                      const inv = oracleInstruments.find((i) => i.id === selectedOwnId);
                      return inv ? (inv.extcode ? `${inv.extcode} — ${inv.namerus}` : inv.namerus) : undefined;
                    })()
                  : undefined;
                return (
                  <>
                    {paged.map((row, idx) => {
                      const ext = row.sec_extcode?.trim();
                      const issuer = row.issuer_namerus?.trim();
                      const symbolFromOracle =
                        ext && issuer ? `${ext} — ${issuer}` : ext || issuer || undefined;
                      const data: ExchangeContractData = {
                        id: row.serial,
                        tradeDate: row.trade_date,
                        quantity: row.quantity,
                        price: row.price,
                        value: row.value,
                        sellerName: null,
                        buyerName: null,
                        sellAccount: null,
                        buyAccount: null,
                        sellerClientCode: null,
                        buyerClientCode: null,
                        className: issuer ?? undefined,
                        secFullName: symbolFromOracle ?? instrumentName,
                        secCode: ext ?? instrumentName ?? '',
                      };
                      return (
                        <div key={`gold-contract-${row.serial}-${page}`} className={idx === 0 ? 'mt-6' : 'mt-10 print:break-before-page'}>
                          <ExchangeContractReport data={data} contractTitle="Биржевой контракт (золото)" />
                        </div>
                      );
                    })}
                  </>
                );
              })()}

              {selectedForm.code === 'Exchange_Contract_Gold' && goldRows !== null && goldRows.length === 0 && (
                <div className="mt-6 flex flex-col items-center justify-center py-16 text-center print:hidden">
                  <svg width="56" height="56" viewBox="0 0 56 56" fill="none" className="mb-4 opacity-30">
                    <rect x="8" y="14" width="40" height="32" rx="4" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
                    <path d="M8 22h40" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
                    <path d="M18 32h6M18 38h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-muted-foreground" />
                  </svg>
                  <p className="text-base font-semibold text-foreground">Данные не найдены</p>
                  <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                    За выбранный период и параметры фильтрации сделок по золоту не найдено.
                  </p>
                </div>
              )}

              {/* Если Auction_Additional_Placement — информация по допразмещению */}
              {(() => {
                if (!result || result.type !== 'table' || selectedForm?.code !== 'Auction_Additional_Placement') return null;
                const rows = result.rows as Record<string, unknown>[];
                if (rows.length === 0) {
                  return (
                    <div className="mt-6 rounded-md bg-muted/50 border border-border px-4 py-6 text-center text-muted-foreground">
                      Нет данных за выбранную дату. Проверьте дату и наличие сделок в источнике данных.
                    </div>
                  );
                }
                const byKey = new Map<string, Record<string, unknown>[]>();
                for (const r of rows) {
                  const key = `${r.sec_code ?? ''}\t${r.trade_date ?? ''}`;
                  if (!byKey.has(key)) byKey.set(key, []);
                  byKey.get(key)!.push(r);
                }
                const keys = Array.from(byKey.keys()).sort();
                const start = (page - 1) * 1;
                const end = isPrinting ? keys.length : start + 1;
                const pagedKeys = keys.slice(start, end);
                return (
                  <>
                    {pagedKeys.map((key, idx) => {
                      const r = byKey.get(key)![0];
                      const data: AdditionalPlacementData = {
                        sec_code: String(r.sec_code ?? ''),
                        trade_date: String(r.trade_date ?? ''),
                        class_code: String(r.class_code ?? ''),
                        class_name: r.class_name != null ? String(r.class_name) : undefined,
                        sec_full_name: String(r.sec_full_name ?? ''),
                        face_value: Number(r.face_value ?? 100),
                        issue_qty: Number(r.issue_qty ?? 0),
                        coupon_rate: Number(r.coupon_rate ?? 0),
                        avg_price: Number(r.avg_price ?? 0),
                        avg_yield: Number(r.avg_yield ?? 0),
                        total_qty: Number(r.total_qty ?? 0),
                        total_value: Number(r.total_value ?? 0),
                        participant_count: Number(r.participant_count ?? 0),
                        financial_participants: Number(r.financial_participants ?? 0),
                        institutional_investors: Number(r.institutional_investors ?? 0),
                        resident_count: Number(r.resident_count ?? 0),
                        non_resident_count: Number(r.non_resident_count ?? 0),
                      };
                      return (
                        <div key={`add-placement-${key}`} className={idx === 0 ? 'mt-6' : 'mt-10 print:break-before-page'}>
                          <AdditionalPlacementReport data={data} reportDate={filters.dateFrom || ''} title={selectedForm?.description || selectedForm?.name} />
                        </div>
                      );
                    })}
                  </>
                );
              })()}

              {/* USD отчёт из Oracle */}
              {selectedForm.code === 'Blank_Form_USD' && usdRows !== null && (
                <div className="mt-6">
                  <UsdReport
                    rows={usdRows}
                    dateFrom={filters.dateFrom}
                    dateTo={filters.dateTo}
                    instrument={selectedOwnId !== undefined ? (() => {
                      const inv = oracleInstruments.find((i) => i.id === selectedOwnId);
                      return inv ? (inv.extcode ? `${inv.extcode} — ${inv.namerus}` : inv.namerus) : undefined;
                    })() : undefined}
                  />
                </div>
              )}

              {/* Остальные формы — обычные таблицы */}
              {result?.type === 'table' && selectedForm?.code && !FORMS_WITH_CUSTOM_VIEW.has(selectedForm.code) && (() => {
                const start = (page - 1) * limit;
                const end = start + limit;
                const pagedRows = result.rows.slice(start, end);
                return <ReportTable rows={pagedRows} />;
              })()}
              {/* Общая пагинация снизу — синхронна с верхней */}
              {paginationInfo && (
                <div className="mt-4 print:hidden">
                  <ReportPagination
                    page={page}
                    totalPages={paginationInfo.totalPages}
                    totalRecords={paginationInfo.totalRecords}
                    onPageChange={setPage}
                  />
                </div>
              )}
              {result?.type === 'summary' && <ReportSummary rows={result.rows} />}
              {result?.type === 'chart' && (
                <Card className="mt-6">
                  <CardContent className="pt-6">
                    <ReportChart labels={result.labels} series={result.series} />
                  </CardContent>
                </Card>
              )}

              {/* Нет данных */}
              {result?.type === 'table' && result.rows.length === 0 && (
                <div className="mt-6 flex flex-col items-center justify-center py-16 text-center print:hidden">
                  <svg width="56" height="56" viewBox="0 0 56 56" fill="none" className="mb-4 opacity-30">
                    <rect x="8" y="14" width="40" height="32" rx="4" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
                    <path d="M8 22h40" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
                    <path d="M18 32h6M18 38h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-muted-foreground" />
                    <circle cx="42" cy="42" r="10" fill="hsl(var(--muted))" />
                    <path d="M38 42h8M42 38v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-muted-foreground" opacity="0.5" />
                  </svg>
                  <p className="text-base font-semibold text-foreground">Данные не найдены</p>
                  <p className="mt-1 text-sm text-muted-foreground max-w-sm">
                    За выбранный период и параметры фильтрации сделок не найдено. Попробуйте изменить диапазон дат или фильтры.
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Группировка данных по classCode → secCode → trades
interface TradeRow {
  dealNo: string;
  dateConcluded: string;
  dateExecution: string;
  seller: string;
  buyer: string;
  quantity: number;
  price: number;
  amount: number;
}

interface SecurityGroup {
  securityId: string;
  secFullName?: string;
  trades: TradeRow[];
}

interface ClassGroup {
  classId: string;
  className?: string;
  securities: SecurityGroup[];
}

function groupByClassAndSec(rows: Record<string, unknown>[]): ClassGroup[] {
  const classMap = new Map<string, Map<string, TradeRow[]>>();
  const classCodeToName = new Map<string, string>();
  const secCodeToFullName = new Map<string, string>();

  for (const row of rows) {
    const classCode = String(row.classCode ?? 'Без класса');
    const secCode = String(row.secCode ?? 'Без кода');
    if (!classCodeToName.has(classCode) && row.className != null) classCodeToName.set(classCode, String(row.className));
    if (!secCodeToFullName.has(secCode) && row.secFullName != null) secCodeToFullName.set(secCode, String(row.secFullName));

    // CPFirmId (counterparty) = покупатель, FirmId (broker) = продавец
    const seller = String(row.brokerName ?? '');
    const buyer = String(row.counterpartyName ?? '');

    const trade: TradeRow = {
      dealNo: String(row.id ?? ''),
      dateConcluded: formatDate(row.tradeDate),
      dateExecution: formatDate(row.settleDate),
      seller,
      buyer,
      quantity: Number(row.quantity ?? 0),
      price: Number(row.price ?? 0),
      amount: Number(row.value ?? 0),
    };

    if (!classMap.has(classCode)) {
      classMap.set(classCode, new Map());
    }
    const secMap = classMap.get(classCode)!;
    if (!secMap.has(secCode)) {
      secMap.set(secCode, []);
    }
    secMap.get(secCode)!.push(trade);
  }

  const classes: ClassGroup[] = [];
  for (const [classId, secMap] of classMap.entries()) {
    const securities: SecurityGroup[] = [];
    for (const [securityId, trades] of secMap.entries()) {
      securities.push({ securityId, secFullName: secCodeToFullName.get(securityId) ?? securityId, trades });
    }
    classes.push({ classId, className: classCodeToName.get(classId) ?? classId, securities });
  }

  return classes;
}

function formatDate(d: unknown): string {
  if (!d) return '';
  if (d instanceof Date) return d.toLocaleDateString('ru-RU');
  const dateStr = String(d);
  // Если формат 2025-10-14T... или 2025-10-14
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    const [y, m, day] = dateStr.slice(0, 10).split('-');
    return `${day}/${m}/${y}`;
  }
  return dateStr;
}

// Группировка для Формы 2: Класс → ЦБ → агрегация по дате
function groupByClassAndSecForm2(rows: Record<string, unknown>[]): ClassGroupForm2[] {
  const classMap = new Map<string, Map<string, Record<string, unknown>[]>>();
  const classCodeToName = new Map<string, string>();
  const secCodeToFullName = new Map<string, string>();

  for (const row of rows) {
    const classCode = String(row.classCode ?? 'Без класса');
    const secCode = String(row.secCode ?? 'Без кода');
    if (!classCodeToName.has(classCode) && row.className != null) classCodeToName.set(classCode, String(row.className));
    if (!secCodeToFullName.has(secCode) && row.secFullName != null) secCodeToFullName.set(secCode, String(row.secFullName));

    if (!classMap.has(classCode)) {
      classMap.set(classCode, new Map());
    }
    const secMap = classMap.get(classCode)!;
    if (!secMap.has(secCode)) {
      secMap.set(secCode, []);
    }
    secMap.get(secCode)!.push(row);
  }

  const classes: ClassGroupForm2[] = [];
  for (const [classId, secMap] of classMap.entries()) {
    const securities: ClassGroupForm2['securities'] = [];
    
    for (const [securityId, trades] of secMap.entries()) {
      // Агрегация данных по ЦБ
      const tradesCount = trades.length;
      const totalQuantity = trades.reduce((sum, t) => sum + Number(t.quantity ?? 0), 0);
      const totalAmount = trades.reduce((sum, t) => sum + Number(t.value ?? 0), 0);
      const prices = trades.map(t => Number(t.price ?? 0)).filter(p => p > 0);
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
      
      // Последняя сделка (предполагаем, что данные отсортированы по дате)
      const lastTrade = trades[trades.length - 1];
      const lastTradePrice = Number(lastTrade?.price ?? 0);
      const lastTradeQuantity = Number(lastTrade?.quantity ?? 0);
      const lastTradeAmount = Number(lastTrade?.value ?? 0);
      
      // Дата (берем первую попавшуюся)
      const tradeDate = formatDate(trades[0]?.tradeDate);
      
      securities.push({
        securityId,
        secFullName: secCodeToFullName.get(securityId) ?? securityId,
        tradeDate,
        tradesCount,
        totalQuantity,
        totalAmount,
        maxPrice,
        minPrice,
        avgPrice,
        lastTradePrice,
        lastTradeQuantity,
        lastTradeAmount,
      });
    }
    
    classes.push({ classId, className: classCodeToName.get(classId) ?? classId, securities });
  }

  return classes;
}

// Группировка для Формы 3: Участник → Класс → ЦБ → сделки
function groupByParticipantAndClassAndSec(rows: Record<string, unknown>[]): ParticipantGroup[] {
  const participantMap = new Map<string, Map<string, Map<string, Record<string, unknown>[]>>>();

  for (const row of rows) {
    const participantName = String(row.brokerName ?? 'Без участника');
    const classCode = String(row.classCode ?? 'Без класса');
    const secCode = String(row.secCode ?? 'Без кода');
    
    if (!participantMap.has(participantName)) {
      participantMap.set(participantName, new Map());
    }
    const classMap = participantMap.get(participantName)!;
    if (!classMap.has(classCode)) {
      classMap.set(classCode, new Map());
    }
    const secMap = classMap.get(classCode)!;
    if (!secMap.has(secCode)) {
      secMap.set(secCode, []);
    }
    secMap.get(secCode)!.push(row);
  }

  const participants: ParticipantGroup[] = [];
  for (const [participantName, classMap] of participantMap.entries()) {
    const classes: ParticipantGroup['classes'] = [];
    
    for (const [classCode, secMap] of classMap.entries()) {
      const securities: ParticipantGroup['classes'][0]['securities'] = [];
      
      for (const [secCode, trades] of secMap.entries()) {
        const secFullName = (trades[0] as Record<string, unknown>)?.secFullName != null ? String((trades[0] as Record<string, unknown>).secFullName) : secCode;
        securities.push({
          secCode,
          secFullName,
          trades: trades.map(t => ({
            id: String(t.id ?? ''),
            tradeDate: formatDate(t.tradeDate),
            settleDate: formatDate(t.settleDate),
            brokerName: String(t.brokerName ?? ''),
            counterpartyName: String(t.counterpartyName ?? ''),
            price: Number(t.price ?? 0),
            quantity: Number(t.quantity ?? 0),
            value: Number(t.value ?? 0),
          })),
        });
      }
      const firstName = (() => { for (const [, arr] of secMap) if (arr[0]?.className != null) return String(arr[0].className); return classCode; })();
      classes.push({ classCode, className: firstName, securities });
    }
    
    participants.push({ participantName, classes });
  }

  return participants;
}

// Группировка для формы 6A: Класс -> ЦБ -> Сделки
function groupByClassSecAndDate(rows: Record<string, unknown>[]): ClassData[] {
  const classMap = new Map<string, Map<string, Record<string, unknown>[]>>();
  const classCodeToName = new Map<string, string>();

  for (const row of rows) {
    const classCode = String(row.classCode ?? 'Без класса');
    const secCode = String(row.secCode ?? 'Без кода');
    if (!classCodeToName.has(classCode) && row.className != null) classCodeToName.set(classCode, String(row.className));

    if (!classMap.has(classCode)) {
      classMap.set(classCode, new Map());
    }
    const secMap = classMap.get(classCode)!;
    if (!secMap.has(secCode)) {
      secMap.set(secCode, []);
    }
    secMap.get(secCode)!.push(row);
  }

  const classes: ClassData[] = [];
  
  for (const [classCode, secMap] of classMap.entries()) {
    const securities: SecurityData[] = [];
    let classTotalTrades = 0;
    let classTotalQuantity = 0;
    let classTotalValue = 0;
    const classUniqueTradeIds = new Set<string>();
    let classMaxPrice = 0;

    for (const [secCode, tradesData] of secMap.entries()) {
      const trades: TradeData[] = [];
      let secMaxPrice = 0;
      let secMinPrice = Infinity;
      let secTotalPriceWeighted = 0;
      let secTotalQty = 0;
      let secTotalValue = 0;

      // Обрабатываем каждую сделку отдельно
      for (const trade of tradesData) {
        const tradeId = String(trade.id ?? '');
        const price = Number(trade.price ?? 0);
        const qty = Number(trade.quantity ?? 0);
        const value = Number(trade.value ?? 0);
        const tradeDate = String(trade.tradeDate ?? '').slice(0, 10);

        if (tradeId) classUniqueTradeIds.add(tradeId);

        secMaxPrice = Math.max(secMaxPrice, price);
        secMinPrice = Math.min(secMinPrice, price);
        secTotalPriceWeighted += price * qty;
        secTotalQty += qty;
        secTotalValue += value;

        classMaxPrice = Math.max(classMaxPrice, price);

        trades.push({
          date: tradeDate,
          tradesCount: 1,
          quantity: qty,
          maxPrice: price,
          minPrice: price,
          avgPrice: price,
          secCode,
          totalValue: value,
        });
      }

      const secAvgPrice = secTotalQty > 0 ? secTotalPriceWeighted / secTotalQty : 0;

      securities.push({
        secCode,
        secFullName: String(tradesData[0]?.secFullName ?? secCode),
        trades,
        totalTrades: tradesData.length,
        totalQuantity: secTotalQty,
        totalValue: secTotalValue,
        avgPrice: secAvgPrice,
        maxPrice: secMaxPrice,
        minPrice: secMinPrice === Infinity ? 0 : secMinPrice,
      });

      classTotalTrades += tradesData.length;
      classTotalQuantity += secTotalQty;
      classTotalValue += secTotalValue;
    }

    const classAvgPriceWeighted = securities.reduce((sum, sec) => sum + sec.avgPrice * sec.totalValue, 0);
    const classAvgPrice = classTotalValue > 0 ? classAvgPriceWeighted / classTotalValue : 0;

    classes.push({
      classCode,
      className: classCodeToName.get(classCode) ?? classCode,
      securities,
      totalTrades: classUniqueTradeIds.size,
      totalSecurities: securities.length,
      totalQuantity: classTotalQuantity,
      totalValue: classTotalValue,
      avgPrice: classAvgPrice,
      maxPrice: classMaxPrice,
    });
  }

  return classes;
}

function volumeTypeLabelForm5(className: string): string {
  const c = (className || '').toLowerCase();
  if (c.includes('гцб') || c.includes('гко') || c.includes('государственн')) return 'ГЦБ';
  if (c.includes('облигац')) return 'Листинговые облигации';
  if (c.includes('нелистинг') || c.includes('не листинг')) return 'Нелистинговые акции';
  if (c.includes('акци')) return 'Листинговые акции';
  return 'Листинговые акции';
}

function buildForm5Data(
  rows: Record<string, unknown>[],
  periodFrom: string,
  periodTo: string,
  totalsOverride?: { totalQuantity: number; totalVolume: number; dealCount: number },
): ReportForm5Data {
  const form5Rows: Form5Row[] = [];
  let totalQuantity = 0;
  let totalVolume = 0;

  for (const r of rows) {
    const className = String(r.className ?? '');
    const quantity = Number(r.quantity ?? 0);
    const value = Number(r.value ?? 0);
    totalQuantity += quantity;
    totalVolume += value;
    form5Rows.push({
      tradeDate: String(r.tradeDate ?? '').slice(0, 10),
      secFullName: String(r.secFullName ?? ''),
      secCode: String(r.secCode ?? ''),
      id: String(r.id ?? ''),
      buyerName: String(r.buyerName ?? ''),
      sellerName: String(r.sellerName ?? ''),
      quantity,
      price: Number(r.price ?? 0),
      value,
      volumeType: volumeTypeLabelForm5(className),
    });
  }

  const totals = totalsOverride ?? { totalQuantity, totalVolume, dealCount: form5Rows.length };
  return {
    periodFrom,
    periodTo,
    rows: form5Rows,
    totalQuantity: totals.totalQuantity,
    totalVolume: totals.totalVolume,
    dealCount: totals.dealCount,
  };
}

function buildForm6Data(
  rows: Record<string, unknown>[],
  periodFrom: string,
  periodTo: string,
  totalsOverride?: { totalQuantity: number; totalVolume: number; dealCount: number },
): ReportForm6Data {
  const form6Rows: Form6Row[] = [];
  let totalQuantity = 0;
  let totalVolume = 0;

  for (const r of rows) {
    const className = String(r.className ?? '');
    const quantity = Number(r.quantity ?? 0);
    const value = Number(r.value ?? 0);
    totalQuantity += quantity;
    totalVolume += value;
    const listingType = volumeTypeLabelForm5(className);
    form6Rows.push({
      tradeDate: String(r.tradeDate ?? '').slice(0, 10),
      secFullName: String(r.secFullName ?? ''),
      secCode: String(r.secCode ?? ''),
      id: String(r.id ?? ''),
      buyerName: String(r.buyerName ?? ''),
      sellerName: String(r.sellerName ?? ''),
      quantity,
      price: Number(r.price ?? 0),
      value,
      volumeType: listingType,
      listingType,
    });
  }

  const totals = totalsOverride ?? { totalQuantity, totalVolume, dealCount: form6Rows.length };
  return {
    periodFrom,
    periodTo,
    rows: form6Rows,
    totalQuantity: totals.totalQuantity,
    totalVolume: totals.totalVolume,
    dealCount: totals.dealCount,
  };
}

function buildForm8Data(
  rows: Record<string, unknown>[],
  periodFrom: string,
  periodTo: string,
  totalsOverride?: { totalQuantity: number; totalVolume: number; dealCount: number },
): ReportForm8Data {
  const form8Rows: Form8Row[] = [];
  let totalQuantity = 0;
  let totalVolume = 0;

  for (const r of rows) {
    const quantity = Number(r.quantity ?? 0);
    const value = Number(r.value ?? 0);
    totalQuantity += quantity;
    totalVolume += value;
    form8Rows.push({
      tradeDate: String(r.tradeDate ?? '').slice(0, 10),
      companyName: String((r as any).companyName ?? r.secFullName ?? ''),
      symbol: String((r as any).symbol ?? r.secCode ?? ''),
      isin: String(((r as any).isinCode ?? (r as any).isin) ?? ''),
      price: Number(r.price ?? 0),
      quantity,
      value,
    });
  }

  const totals = totalsOverride ?? { totalQuantity, totalVolume, dealCount: form8Rows.length };
  return {
    periodFrom,
    periodTo,
    rows: form8Rows,
    totalQuantity: totals.totalQuantity,
    totalVolume: totals.totalVolume,
    dealCount: totals.dealCount,
  };
}

function buildForm7Data(rows: Record<string, unknown>[], periodFrom: string, periodTo: string): ReportForm7Data {
  const sectorMap = new Map<string, Map<string, Form7Row[]>>();
  let grandDealCount = 0;
  let grandQuantity = 0;
  let grandVolume = 0;

  for (const r of rows) {
    const sector = String(r.sector ?? r.className ?? '');
    const secCode = String(r.secCode ?? '');
    const secFullName = String(r.secFullName ?? secCode);
    const tradeDate = String(r.tradeDate ?? '').slice(0, 10);
    const dealCount = Number(r.dealCount ?? 0);
    const quantity = Number(r.quantity ?? 0);
    const maxPrice = Number(r.maxPrice ?? 0);
    const minPrice = Number(r.minPrice ?? 0);
    const avgPrice = Number(r.avgPrice ?? 0);
    const volume = Number(r.volume ?? 0);

    if (!sectorMap.has(sector)) sectorMap.set(sector, new Map());
    const secMap = sectorMap.get(sector)!;
    if (!secMap.has(secCode)) secMap.set(secCode, []);
    secMap.get(secCode)!.push({
      sector,
      secCode,
      secFullName,
      tradeDate,
      dealCount,
      quantity,
      maxPrice,
      minPrice,
      avgPrice,
      volume,
    });
    grandDealCount += dealCount;
    grandQuantity += quantity;
    grandVolume += volume;
  }

  const sectors: ReportForm7Data['sectors'] = [];
  for (const [sectorName, secMap] of sectorMap.entries()) {
    const securities: ReportForm7Data['sectors'][0]['securities'] = [];
    let sectorDealCount = 0;
    let sectorQuantity = 0;
    let sectorVolume = 0;

    for (const [secCode, dateRows] of secMap.entries()) {
      const secFullName = dateRows[0]?.secFullName ?? secCode;
      const totalDealCount = dateRows.reduce((s, row) => s + row.dealCount, 0);
      const totalQuantity = dateRows.reduce((s, row) => s + row.quantity, 0);
      const totalVolume = dateRows.reduce((s, row) => s + row.volume, 0);
      const prices = dateRows.flatMap((row) => [row.maxPrice, row.minPrice].filter((p) => p > 0));
      const maxPrice = prices.length ? Math.max(...prices) : 0;
      const minPrice = prices.length ? Math.min(...prices.filter((p) => p > 0)) : 0;
      const avgPrice = totalQuantity > 0 ? dateRows.reduce((s, row) => s + row.avgPrice * row.quantity, 0) / totalQuantity : 0;

      securities.push({
        secCode,
        secFullName,
        rows: dateRows.sort((a, b) => a.tradeDate.localeCompare(b.tradeDate)),
        totalDealCount,
        totalQuantity,
        totalVolume,
        maxPrice,
        minPrice,
        avgPrice,
      });
      sectorDealCount += totalDealCount;
      sectorQuantity += totalQuantity;
      sectorVolume += totalVolume;
    }

    sectors.push({
      sector: sectorName,
      securities,
      totalDealCount: sectorDealCount,
      totalQuantity: sectorQuantity,
      totalVolume: sectorVolume,
    });
  }

  sectors.sort((a, b) => a.sector.localeCompare(b.sector));

  return {
    periodFrom,
    periodTo,
    sectors,
    grandTotalDealCount: grandDealCount,
    grandTotalQuantity: grandQuantity,
    grandTotalVolume: grandVolume,
  };
}

// Группировка данных для Blank_Form_9 (Ведомость заключенных сделок)
function groupByClassAndSecForm9(rows: Record<string, unknown>[]): {
  classCode: string;
  securities: {
    secCode: string;
    secFullName: string;
    trades: {
      id: string;
      tradeDate: string;
      sellAccount: string;
      buyAccount: string;
      quantity: number;
      value: number;
    }[];
  }[];
}[] {
  const classMap = new Map<string, Map<string, Record<string, unknown>[]>>();
  const classCodeToName = new Map<string, string>();

  for (const row of rows) {
    const classCode = String(row.classCode ?? 'Без класса');
    const secCode = String(row.secCode ?? 'Без кода');
    if (!classCodeToName.has(classCode) && row.className != null) classCodeToName.set(classCode, String(row.className));

    if (!classMap.has(classCode)) {
      classMap.set(classCode, new Map());
    }
    const secMap = classMap.get(classCode)!;
    if (!secMap.has(secCode)) {
      secMap.set(secCode, []);
    }
    secMap.get(secCode)!.push(row);
  }

  const classes: {
    classCode: string;
    className?: string;
    securities: {
      secCode: string;
      secFullName: string;
      trades: {
        id: string;
        tradeDate: string;
        sellAccount: string;
        buyAccount: string;
        quantity: number;
        value: number;
      }[];
    }[];
  }[] = [];

  for (const [classCode, secMap] of classMap.entries()) {
    const securities: {
      secCode: string;
      secFullName: string;
      trades: {
        id: string;
        tradeDate: string;
        sellAccount: string;
        buyAccount: string;
        quantity: number;
        value: number;
      }[];
    }[] = [];

    for (const [secCode, tradesData] of secMap.entries()) {
      const trades = tradesData.map((trade) => ({
        id: String(trade.id ?? ''),
        tradeDate: String(trade.tradeDate ?? '').slice(0, 10),
        sellAccount: String(trade.sellAccount ?? ''),
        buyAccount: String(trade.buyAccount ?? ''),
        quantity: Number(trade.quantity ?? 0),
        value: Number(trade.value ?? 0),
      }));

      securities.push({
        secCode,
        secFullName: String(tradesData[0]?.secFullName ?? secCode),
        trades,
      });
    }

    classes.push({
      classCode,
      className: classCodeToName.get(classCode) ?? classCode,
      securities,
    });
  }

  return classes;
}
