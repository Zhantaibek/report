import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.tsx';
import { Button } from '../components/ui/button.tsx';
import { SelectWithSearch, type SelectOptionGroup } from '../components/ui/select.tsx';
import { Play, Printer, RotateCcw, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, BarChart2, FileText, Building2, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  loadReportRunHistory,
  saveReportRun,
  type SavedReportRun,
} from '../lib/report-run-history.ts';
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
import Form4Report, {
  type ReportTradesForm4Data,
  type ClassGroupForm4,
} from '../components/reports/Form4Report.tsx';
import Form3Report, {
  type ReportTradesForm3Data,
  type ParticipantGroup,
} from '../components/reports/Form3Report.tsx';
import { Form6AReport, type ClassData, type SecurityData, type TradeData } from '../components/reports/Form6AReport.tsx';
import { Form6BReport } from '../components/reports/Form6BReport.tsx';
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
import { Form14Report, type Form14Row } from '../components/reports/Form14Report.tsx';
import { Form15Report, type Form15Row } from '../components/reports/Form15Report.tsx';
import { Form13Report, type Form13Summary } from '../components/reports/Form13Report.tsx';
import { Form06Report, buildForm06Data } from '../components/reports/Form06Report.tsx';
import { OrdersSummaryReport, buildOrdersSummaryData } from '../components/reports/OrdersSummaryReport.tsx';
import { TradesBySecReport, buildTradesBySecData } from '../components/reports/TradesBySecReport.tsx';
import {
  StateHoldingForm5Top5Report,
  buildStateHoldingForm5Top5Data,
} from '../components/reports/StateHoldingForm5Top5Report.tsx';
import {
  StateHoldingForm6Report,
  buildStateHoldingForm6Data,
} from '../components/reports/StateHoldingForm6Report.tsx';
import {
  StateHoldingForm7Report,
  buildStateHoldingForm7Data,
} from '../components/reports/StateHoldingForm7Report.tsx';
import {
  StateHoldingForm8Report,
  buildStateHoldingForm8Data,
} from '../components/reports/StateHoldingForm8Report.tsx';
import {
  StateHoldingForm9Report,
  buildStateHoldingForm9Data,
} from '../components/reports/StateHoldingForm9Report.tsx';
import {
  StateHoldingForm10Report,
  buildStateHoldingForm10Data,
} from '../components/reports/StateHoldingForm10Report.tsx';
import { UsdReport } from '../components/reports/UsdReport.tsx';
import { ExchangeContractGold } from '../components/reports/ExchangeContractGold.tsx';
import { GoldDailySummaryReport } from '../components/reports/GoldDailySummaryReport.tsx';
import { ReportPagination } from '../components/reports/ReportPagination.tsx';
import { DateInput } from '../components/ui/date-input.tsx';
import { Alert, AlertDescription } from '../components/ui/alert.tsx';

/**
 * Источник данных формы:
 *   quik   — основная БД (Postgres/MSSQL)
 *   usd    — Oracle отчёт по USD (runUsdReport)
 *   gold   — Oracle отчёт по золоту (runGoldReport)
 */
type FormDataSource = 'quik' | 'usd' | 'gold';

/**
 * Режим фильтров в панели:
 *   quik   — Класс + Инструмент + Участник
 *   firm   — только Участник
 *   oracle — выбор инструмента из Oracle
 *   none   — только даты и класс
 */
type FormFilterMode = 'quik' | 'firm' | 'oracle' | 'none';

interface FormMeta {
  /** Используется собственный React-шаблон вместо общей таблицы. */
  customView: true;
  /** Откуда берём данные при нажатии «Сформировать». */
  dataSource: FormDataSource;
  /** Какие дополнительные фильтры показывать. */
  filterMode: FormFilterMode;
}

const FORM_META: Record<string, FormMeta> = {
  // ── Системные отчёты ──────────────────────────────────────────────────────
  Blank_Form_1:   { customView: true, dataSource: 'quik', filterMode: 'quik' },
  Blank_Form_2:   { customView: true, dataSource: 'quik', filterMode: 'quik' },
  Blank_Form_3:   { customView: true, dataSource: 'quik', filterMode: 'quik' },
  Blank_Form_4:   { customView: true, dataSource: 'quik', filterMode: 'quik' },
  Blank_Form_5:   { customView: true, dataSource: 'quik', filterMode: 'quik' },
  Blank_Form_6:   { customView: true, dataSource: 'quik', filterMode: 'quik' },
  Blank_Form_6A:  { customView: true, dataSource: 'quik', filterMode: 'quik' },
  Blank_Form_6B:  { customView: true, dataSource: 'quik', filterMode: 'quik' },
  Blank_Form_06:  { customView: true, dataSource: 'quik', filterMode: 'none' },
  Blank_Form_7:   { customView: true, dataSource: 'quik', filterMode: 'quik' },
  Blank_Form_8:   { customView: true, dataSource: 'quik', filterMode: 'quik' },
  Blank_Form_9:   { customView: true, dataSource: 'quik', filterMode: 'quik' },
  Blank_Form_13:  { customView: true, dataSource: 'quik', filterMode: 'quik' },
  Blank_Form_14:  { customView: true, dataSource: 'quik', filterMode: 'quik' },
  Blank_Form_15:  { customView: true, dataSource: 'quik', filterMode: 'quik' },
  Orders_Summary: { customView: true, dataSource: 'quik', filterMode: 'quik' },
  Trades_By_Sec:  { customView: true, dataSource: 'quik', filterMode: 'quik' },
  Blank_Form_USD: { customView: true, dataSource: 'usd',  filterMode: 'oracle' },

  // ── Аукцион ───────────────────────────────────────────────────────────────
  Auction_Summary:              { customView: true, dataSource: 'quik', filterMode: 'quik' },
  Auction_Summary_2:            { customView: true, dataSource: 'quik', filterMode: 'quik' },
  Auction_Bid_Classification:   { customView: true, dataSource: 'quik', filterMode: 'quik' },
  Auction_Central_Depository:   { customView: true, dataSource: 'quik', filterMode: 'quik' },
  Auction_Additional_Placement: { customView: true, dataSource: 'quik', filterMode: 'quik' },
  Auction_Exchange_Contract:    { customView: true, dataSource: 'quik', filterMode: 'quik' },
  Auction_Exchange_Certificate: { customView: true, dataSource: 'quik', filterMode: 'quik' },

  // ── Юридические документы ─────────────────────────────────────────────────
  Exchange_Contract:     { customView: true, dataSource: 'quik', filterMode: 'quik' },
  Exchange_Certificate:  { customView: true, dataSource: 'quik', filterMode: 'quik' },
  Exchange_Contract_Gold:{ customView: true, dataSource: 'gold', filterMode: 'oracle' },
  Gold_Daily_Summary:    { customView: true, dataSource: 'gold', filterMode: 'oracle' },

  // ── ГосФинНадзор ──────────────────────────────────────────────────────────
  StateHolding_Form5_Top5: { customView: true, dataSource: 'quik', filterMode: 'none' },
  StateHolding_Form6:      { customView: true, dataSource: 'quik', filterMode: 'none' },
  StateHolding_Form7:      { customView: true, dataSource: 'quik', filterMode: 'firm' },
  StateHolding_Form8:      { customView: true, dataSource: 'quik', filterMode: 'none' },
  StateHolding_Form9:      { customView: true, dataSource: 'quik', filterMode: 'none' },
  StateHolding_Form10:     { customView: true, dataSource: 'quik', filterMode: 'none' },
};

/** Подсветка селекта, когда выбрано конкретное значение (не «все»). */
const FILTER_ACTIVE_TRIGGER = 'border-emerald-300 bg-emerald-50';

/** Все формы с собственным шаблоном (не generic-таблица); для них доступна печать. */
const FORMS_WITH_CUSTOM_VIEW = new Set(Object.keys(FORM_META));

/** Порядок категорий в выпадающем списке «Форма». */
const REPORT_FORM_CATEGORY_ORDER = [
  'Отчеты по системной информации',
  'Юридические документы',
  'Отчеты по Аукциону',
  'Отчеты ГосФинНадзор',
] as const;

function compareReportFormCategories(a: string, b: string): number {
  const ia = (REPORT_FORM_CATEGORY_ORDER as readonly string[]).indexOf(a);
  const ib = (REPORT_FORM_CATEGORY_ORDER as readonly string[]).indexOf(b);
  const ra = ia === -1 ? 1000 : ia;
  const rb = ib === -1 ? 1000 : ib;
  if (ra !== rb) return ra - rb;
  return a.localeCompare(b, 'ru');
}

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

function formatRunDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return Number.isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('ru-RU');
}

function formatSavedAt(ts: number): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function countReportResult(
  res: ReportResult | null,
  usd: UsdReportRow[] | null,
  gold: GoldContractRow[] | null,
): number {
  if (usd != null) return usd.length;
  if (gold != null) return gold.length;
  if (!res) return 0;
  if (res.type === 'table' || res.type === 'summary') return res.rows.length;
  if (res.type === 'chart') return res.labels.length;
  return 0;
}

function buildRunSummary(
  form: ReportForm,
  filters: RunFilters,
  selectedOwnId?: number,
  oracleInstruments?: OracleInstrument[],
): string {
  const parts: string[] = [];
  if (filters.dateFrom) {
    if (form.singleDate || filters.dateFrom === filters.dateTo) {
      parts.push(formatRunDate(filters.dateFrom));
    } else {
      parts.push(`${formatRunDate(filters.dateFrom)} – ${formatRunDate(filters.dateTo)}`);
    }
  }
  if (filters.classCode) parts.push(`класс: ${filters.classCode}`);
  if (filters.instrument) parts.push(`инстр.: ${filters.instrument}`);
  if (filters.firmCode) parts.push(`участн.: ${filters.firmCode}`);
  if (selectedOwnId != null) {
    const inv = oracleInstruments?.find((i) => i.id === selectedOwnId);
    if (inv) parts.push(inv.extcode || inv.namerus);
  }
  return parts.join(' · ');
}

export default function Reports() {
  const { user } = useAuth();
  const historyUserKey = user?.login ?? user?.id?.toString() ?? 'guest';
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
  const [recentRuns, setRecentRuns] = useState<SavedReportRun[]>([]);
  const limit = 20;

  useEffect(() => {
    setRecentRuns(loadReportRunHistory(historyUserKey));
  }, [historyUserKey]);

  useEffect(() => {
    getReportForms().then(setForms).catch(() => {});
    getFirms().then(setFirms).catch(() => {});
    getSecurities().then(setSecurities).catch(() => {});
    getClasses().then(setClasses).catch(() => {});
  }, []);

  const persistRunToHistory = useCallback(
    (resultCount: number) => {
      const form = forms.find((f) => String(f.id) === selectedFormId);
      if (!form || !filters.dateFrom || !filters.dateTo) return;
      const entry: SavedReportRun = {
        id: `${Date.now()}-${selectedFormId}`,
        savedAt: Date.now(),
        reportFormId: selectedFormId,
        reportFormLabel: (form.description || form.name || '').trim(),
        filters: { ...filters },
        selectedOwnId,
        summary: buildRunSummary(form, filters, selectedOwnId, oracleInstruments),
        resultCount,
      };
      setRecentRuns(saveReportRun(historyUserKey, entry));
    },
    [forms, selectedFormId, filters, selectedOwnId, oracleInstruments, historyUserKey],
  );

  const filtersFromSavedEntry = useCallback((entry: SavedReportRun): RunFilters | null => {
    const form = forms.find((f) => String(f.id) === entry.reportFormId);
    if (!form) return null;
    const mode = FORM_META[form.code]?.filterMode ?? 'quik';
    const restored: RunFilters = {
      dateFrom: entry.filters.dateFrom,
      dateTo: entry.filters.dateTo,
    };
    if (mode === 'quik') {
      restored.classCode = entry.filters.classCode;
      restored.instrument = entry.filters.instrument;
      restored.firmCode = entry.filters.firmCode;
    } else if (mode === 'firm') {
      restored.firmCode = entry.filters.firmCode;
    }
    return restored;
  }, [forms]);

  const applySavedRun = useCallback(
    async (entry: SavedReportRun) => {
      const form = forms.find((f) => String(f.id) === entry.reportFormId);
      if (!form) return;
      const restored = filtersFromSavedEntry(entry);
      if (!restored) return;
      const mode = FORM_META[form.code]?.filterMode ?? 'quik';
      setSelectedFormId(entry.reportFormId);
      setFilters(restored);
      setSelectedOwnId(mode === 'oracle' ? entry.selectedOwnId : undefined);
      setResult(null);
      setUsdRows(null);
      setGoldRows(null);
      setPage(1);
      setRunError(null);
      setValidationError(null);
      if (mode === 'oracle') {
        setLoadingInstruments(true);
        try {
          const list = await getOracleInstruments();
          setOracleInstruments(list);
        } catch {
          /* ignore */
        } finally {
          setLoadingInstruments(false);
        }
      }
    },
    [forms, filtersFromSavedEntry],
  );

  const executeRun = useCallback(
    async (reportFormId: string, runFilters: RunFilters, ownId?: number): Promise<number> => {
      const form = forms.find((f) => String(f.id) === reportFormId);
      const meta = form ? FORM_META[form.code] : undefined;
      const ds = meta?.dataSource ?? 'quik';
      if (ds === 'usd') {
        const res = await runUsdReport(runFilters.dateFrom!, runFilters.dateTo!, ownId);
        setUsdRows(res.rows);
        setResult(null);
        setGoldRows(null);
        return res.rows.length;
      }
      if (ds === 'gold') {
        const res = await runGoldReport(runFilters.dateFrom!, runFilters.dateTo!, ownId);
        setGoldRows(res.rows);
        setResult(null);
        setUsdRows(null);
        return res.rows.length;
      }
      const res = await runReport({ reportFormId: Number(reportFormId), filters: runFilters });
      setResult(res);
      setUsdRows(null);
      setGoldRows(null);
      return countReportResult(res, null, null);
    },
    [forms],
  );

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
      const resultCount = await executeRun(selectedFormId, filters, selectedOwnId);
      persistRunToHistory(resultCount);
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

  const runFromSavedEntry = async (entry: SavedReportRun) => {
    const restored = filtersFromSavedEntry(entry);
    if (!restored?.dateFrom || !restored.dateTo) return;
    const form = forms.find((f) => String(f.id) === entry.reportFormId);
    if (!form) return;
    const mode = FORM_META[form.code]?.filterMode ?? 'quik';
    const ownId = mode === 'oracle' ? entry.selectedOwnId : undefined;
    setLoading(true);
    setRunError(null);
    setValidationError(null);
    setPage(1);
    setUsdRows(null);
    setGoldRows(null);
    try {
      await applySavedRun(entry);
      const resultCount = await executeRun(entry.reportFormId, restored, ownId);
      const historyEntry: SavedReportRun = {
        id: `${Date.now()}-${entry.reportFormId}`,
        savedAt: Date.now(),
        reportFormId: entry.reportFormId,
        reportFormLabel: entry.reportFormLabel,
        filters: restored,
        selectedOwnId: ownId,
        summary: entry.summary,
        resultCount,
      };
      setRecentRuns(saveReportRun(historyUserKey, historyEntry));
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

  const reportFormSelectGroups = useMemo(() => {
    const acc = forms.reduce((acc, form) => {
      const category = form.category || 'Без категории';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(form);
      return acc;
    }, {} as Record<string, ReportForm[]>);
    return Object.entries(acc).sort(([a], [b]) => compareReportFormCategories(a, b));
  }, [forms]);

  const selectedForm = forms.find((f) => String(f.id) === selectedFormId);
  const selectedFormMeta = selectedForm ? FORM_META[selectedForm.code] : undefined;

  /** Режим фильтров текущей формы. */
  const filterMode = selectedFormMeta?.filterMode ?? 'quik';

  /** Пользователь сам заполнил форму и период — список недавних скрываем. */
  const userFilledAllParams = Boolean(
    selectedFormId && filters.dateFrom && filters.dateTo,
  );
  const showRecentRuns = recentRuns.length > 0 && !userFilledAllParams;

  const showPostRunActions = Boolean(
    selectedFormMeta?.customView &&
      ((result != null && (result.type !== 'table' || result.rows.length > 0)) ||
        (usdRows != null && usdRows.length > 0) ||
        (goldRows != null && goldRows.length > 0)),
  );
  const filterRow1GridClass =
    filterMode === 'none'
      ? 'grid grid-cols-2 gap-4'
      : filterMode === 'firm'
        ? 'grid grid-cols-3 gap-4'
        : filterMode === 'oracle'
          ? 'grid grid-cols-1 gap-4'
          : 'grid grid-cols-4 gap-4';
  const showClassFilter = filterMode !== 'oracle';

  const handlePrint = () => {
    setIsPrinting(true);
    const prevTitle = document.title;
    document.title = ' ';
    const isSystemInfo = selectedForm?.category === 'Отчеты по системной информации';
    let landscapeStyle: HTMLStyleElement | null = null;
    if (isSystemInfo) {
      document.body.classList.add('print-system-info');
      landscapeStyle = document.createElement('style');
      landscapeStyle.setAttribute('data-print-landscape', '1');
      landscapeStyle.textContent = '@page { size: A4 landscape; margin: 10mm 12mm 10mm 18mm; }';
      document.head.appendChild(landscapeStyle);
    }
    const restore = () => {
      document.title = prevTitle;
      document.body.classList.remove('print-system-info');
      landscapeStyle?.remove();
      setIsPrinting(false);
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    setTimeout(() => window.print(), 100);
  };

  const handleReset = () => {
    setSelectedFormId('');
    setFilters({ dateFrom: undefined, dateTo: undefined });
    setSelectedOwnId(undefined);
    setResult(null);
    setUsdRows(null);
    setGoldRows(null);
    setPage(1);
    setRunError(null);
    setValidationError(null);
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
    if (!selectedForm) return null;
    const { code } = selectedForm;
    // Вспомогательная: N записей по 1 на страницу
    const onePerPage = (n: number) => n > 0 ? { totalRecords: n, totalPages: n } : null;

    if (code === 'Gold_Daily_Summary' && goldRows?.length)    return { totalRecords: 1, totalPages: 1 };
    if (code === 'Exchange_Contract_Gold' && goldRows?.length) return onePerPage(goldRows.length);
    if (!result || result.type !== 'table' || result.rows.length === 0) return null;

    const rows = result.rows as Record<string, unknown>[];

    if (code === 'Blank_Form_1' && groupedResult)
      return { totalRecords: groupedResult.total, totalPages: groupedResult.totalPages };

    // Форма 06 / Form5 Top5 — одна страница (топ-5 участников)
    if (code === 'Blank_Form_06' || code === 'StateHolding_Form5_Top5') {
      return { totalRecords: 1, totalPages: 1 };
    }

    // Форма 13 — одна сводная страница
    if (code === 'Blank_Form_13') {
      return { totalRecords: 1, totalPages: 1 };
    }

    // Форма 14 — пагинация по участникам (покупатель + продавец)
    if (code === 'Blank_Form_14') {
      const names = new Set<string>();
      for (const r of rows) {
        const buyer = String(r.buyerName ?? '').trim();
        const seller = String(r.sellerName ?? '').trim();
        if (buyer) names.add(buyer);
        if (seller) names.add(seller);
      }
      const n = names.size;
      return { totalRecords: n, totalPages: Math.ceil(n / limit) || 0 };
    }

    // Форма 15 — пагинация по агрегированным ЦБ
    if (code === 'Blank_Form_15') {
      const secCount = new Set(rows.map((r) => String(r.secCode ?? r.secFullName ?? ''))).size;
      return { totalRecords: secCount, totalPages: Math.ceil(secCount / limit) || 0 };
    }

    // Сводная ведомость заявок — пагинация по ЦБ
    if (code === 'Orders_Summary') {
      const secCount = new Set(rows.map((r) => String(r.secCode ?? r.secFullName ?? ''))).size;
      return { totalRecords: secCount, totalPages: Math.ceil(secCount / limit) || 0 };
    }

    // Отчет о сделках по ЦБ — пагинация по инструментам
    if (code === 'Trades_By_Sec') {
      const secCount = new Set(rows.map((r) => String(r.secCode ?? r.isinCode ?? ''))).size;
      return { totalRecords: secCount, totalPages: Math.ceil(secCount / limit) || 0 };
    }

    // Формы с уникальной группировкой: 1 группа = 1 страница
    if (code === 'Auction_Summary')
      return onePerPage(new Set(rows.map((r) => String(r.secCode ?? ''))).size);
    if (code === 'Auction_Bid_Classification' || code === 'Auction_Central_Depository')
      return onePerPage(new Set(rows.map((r) => `${r.registration_number ?? ''}\t${r.auction_date ?? ''}`)).size);
    if (code === 'Auction_Additional_Placement')
      return onePerPage(new Set(rows.map((r) => `${r.sec_code ?? ''}\t${r.trade_date ?? ''}`)).size);

    // Формы с 1 документом/записью на страницу
    if (
      code === 'Auction_Summary_2'
      || code === 'Exchange_Contract'
      || code === 'Exchange_Certificate'
      || code === 'Auction_Exchange_Contract'
      || code === 'Auction_Exchange_Certificate'
    )
      return onePerPage(rows.length);

    // Стандартная пагинация
    return { totalRecords: result.total, totalPages: Math.ceil(result.total / limit) };
  }, [result, selectedForm, groupedResult, goldRows, limit]);

  // ── Основная функция рендера для выбранной формы ────────────────────────
  const renderFormContent = () => {
    if (!selectedForm) return null;
    const { code } = selectedForm;
    const tableRows = result?.type === 'table' ? (result.rows as Record<string, unknown>[]) : null;
    const dateFrom = filters.dateFrom || '';
    const dateTo   = filters.dateTo   || '';

    // paginate + опциональные итоги (для форм 5/6/8 и похожих)
    const getPagedRows = (rows: Record<string, unknown>[]) =>
      paginate(rows, page, limit, isPrinting, result?.type === 'table' ? result.total : undefined);
    const getSimpleTotals = (allRows: Record<string, unknown>[], totalPages: number) => {
      if (!isPrinting && page !== totalPages) return undefined;
      const { totalQuantity, totalAmount: totalVolume } = calcTotalsQuantityAndAmount(allRows);
      return { totalQuantity, totalVolume, dealCount: allRows.length };
    };

    // ── Blank_Form_1 ────────────────────────────────────────────────────────
    if (code === 'Blank_Form_1') {
      if (!groupedResult || !tableRows?.length) return null;
      return (
        <div className="mt-6" key={`form1-${page}`}>
          <Form1Report data={groupedResult.data} showTotalSummary={isPrinting || page === groupedResult.totalPages} />
        </div>
      );
    }

    // ── Blank_Form_2 ────────────────────────────────────────────────────────
    if (code === 'Blank_Form_2') {
      if (!tableRows?.length) return null;
      const { pagedRows, totalPages } = getPagedRows(tableRows);
      const { totalQuantity, totalAmount } = calcTotalsQuantityAndAmount(tableRows);
      return (
        <div className="mt-6" key={`form2-${page}`}>
          <Form2Report
            data={{ periodFrom: dateFrom, periodTo: dateTo, classes: groupByClassAndSecForm2(pagedRows), totalSummary: { totalQuantity, totalAmount } }}
            showTotalSummary={isPrinting || page === totalPages}
          />
        </div>
      );
    }

    // ── Blank_Form_3 ────────────────────────────────────────────────────────
    if (code === 'Blank_Form_3') {
      if (!tableRows?.length) return null;
      const { pagedRows, totalPages } = getPagedRows(tableRows);
      const { totalQuantity, totalAmount, totalTrades, totalSecurities } = calcTotalsWithUnique(tableRows);
      return (
        <div className="mt-6" key={`form3-${page}`}>
          <Form3Report
            data={{ periodFrom: dateFrom, periodTo: dateTo, participants: groupByParticipantAndClassAndSec(pagedRows), totalSummary: { totalQuantity, totalAmount, totalTrades, totalSecurities } }}
            showTotalSummary={isPrinting || page === totalPages}
          />
        </div>
      );
    }

    // ── Blank_Form_4 ────────────────────────────────────────────────────────
    if (code === 'Blank_Form_4') {
      if (!tableRows?.length) return null;
      const { pagedRows, totalPages } = getPagedRows(tableRows);
      const { totalQuantity, totalAmount } = calcTotalsQuantityAndAmount(tableRows);
      return (
        <div className="mt-6" key={`form4-${page}`}>
          <Form4Report
            data={{ periodFrom: dateFrom, periodTo: dateTo, classes: groupByClassAndSecForm4(pagedRows), totalSummary: { totalQuantity, totalAmount } }}
            showTotalSummary={isPrinting || page === totalPages}
          />
        </div>
      );
    }

    // ── Blank_Form_6A / Blank_Form_6B ───────────────────────────────────────
    if (code === 'Blank_Form_6A' || code === 'Blank_Form_6B') {
      if (!tableRows?.length) return null;
      const { pagedRows } = getPagedRows(tableRows);
      const reportData = { periodFrom: dateFrom, periodTo: dateTo, classes: groupByClassSecAndDate(pagedRows) };
      return (
        <div className="mt-6" key={`${code.toLowerCase()}-${page}`}>
          {code === 'Blank_Form_6B'
            ? <Form6BReport data={reportData} />
            : <Form6AReport data={reportData} />}
        </div>
      );
    }

    // ── Blank_Form_5 / Blank_Form_6 / Blank_Form_8 (общий паттерн) ─────────
    if (code === 'Blank_Form_5' || code === 'Blank_Form_6' || code === 'Blank_Form_8') {
      if (!tableRows?.length) return null;
      const { pagedRows, totalPages } = getPagedRows(tableRows);
      const totals = getSimpleTotals(tableRows, totalPages);
      if (code === 'Blank_Form_5') return <div className="mt-6" key={`form5-${page}`}><Form5Report data={buildForm5Data(pagedRows, dateFrom, dateTo, totals)} /></div>;
      if (code === 'Blank_Form_6') return <div className="mt-6" key={`form6-${page}`}><Form6Report data={buildForm6Data(pagedRows, dateFrom, dateTo, totals)} /></div>;
      return <div className="mt-6" key={`form8-${page}`}><Form8Report data={buildForm8Data(pagedRows, dateFrom, dateTo, totals)} /></div>;
    }

    // ── Blank_Form_7 ────────────────────────────────────────────────────────
    if (code === 'Blank_Form_7') {
      if (!tableRows?.length) return null;
      return <div className="mt-6"><Form7Report data={buildForm7Data(tableRows, dateFrom, dateTo)} /></div>;
    }

    // ── Blank_Form_9 ────────────────────────────────────────────────────────
    if (code === 'Blank_Form_9') {
      if (!tableRows?.length) return null;
      const { pagedRows, totalPages } = getPagedRows(tableRows);
      const { totalQuantity, totalAmount: totalValue, totalTrades, totalSecurities } = calcTotalsWithUnique(tableRows);
      return (
        <div className="mt-6" key={`form9-${page}`}>
          <Form9Report
            data={{
              periodFrom: dateFrom,
              periodTo: dateTo,
              classes: groupByClassAndSecForm9(pagedRows),
              totalSummary: (isPrinting || page === totalPages) ? { totalQuantity, totalValue, totalTrades, totalSecurities } : undefined,
            }}
          />
        </div>
      );
    }

    // ── Blank_Form_06 ───────────────────────────────────────────────────────
    if (code === 'Blank_Form_06') {
      if (!tableRows?.length) return null;
      return (
        <div className="mt-6" key="form06">
          <Form06Report data={buildForm06Data(tableRows, dateFrom, dateTo)} />
        </div>
      );
    }

    // ── Blank_Form_13 ───────────────────────────────────────────────────────
    if (code === 'Blank_Form_13') {
      if (!tableRows?.length) return null;
      return (
        <div className="mt-6" key="form13">
          <Form13Report
            data={{
              periodFrom: dateFrom,
              periodTo: dateTo,
              summary: buildForm13Summary(tableRows),
            }}
          />
        </div>
      );
    }

    // ── Blank_Form_14 ───────────────────────────────────────────────────────
    if (code === 'Blank_Form_14') {
      if (!tableRows?.length) return null;
      const allRows = buildForm14Rows(tableRows);
      const { pagedRows, totalPages } = paginate(allRows, page, limit, isPrinting);
      return (
        <div className="mt-6" key={`form14-${page}`}>
          <Form14Report
            data={{
              periodFrom: dateFrom,
              periodTo: dateTo,
              rows: pagedRows,
              totals: (isPrinting || page === totalPages) ? buildForm14Totals(allRows) : undefined,
            }}
          />
        </div>
      );
    }

    // ── Blank_Form_15 ───────────────────────────────────────────────────────
    if (code === 'Blank_Form_15') {
      if (!tableRows?.length) return null;
      const allRows = buildForm15Rows(tableRows);
      const { pagedRows, totalPages } = paginate(allRows, page, limit, isPrinting);
      return (
        <div className="mt-6" key={`form15-${page}`}>
          <Form15Report
            data={{
              periodFrom: dateFrom,
              periodTo: dateTo,
              rows: pagedRows,
              totals: (isPrinting || page === totalPages) ? buildForm15Totals(allRows) : undefined,
            }}
          />
        </div>
      );
    }

    // ── Orders_Summary ──────────────────────────────────────────────────────
    if (code === 'Orders_Summary') {
      if (!tableRows?.length) return null;
      const all = buildOrdersSummaryData(tableRows, dateFrom, dateTo);
      const { pagedRows } = paginate(all.securities, page, limit, isPrinting);
      return (
        <div className="mt-6" key={`orders-summary-${page}`}>
          <OrdersSummaryReport data={{ ...all, securities: pagedRows }} />
        </div>
      );
    }

    // ── Trades_By_Sec ───────────────────────────────────────────────────────
    if (code === 'Trades_By_Sec') {
      if (!tableRows?.length) return null;
      const all = buildTradesBySecData(tableRows, dateFrom, dateTo);
      const { pagedRows } = paginate(all.groups, page, limit, isPrinting);
      return (
        <div className="mt-6" key={`trades-by-sec-${page}`}>
          <TradesBySecReport data={{ ...all, groups: pagedRows }} />
        </div>
      );
    }

    // ── StateHolding_Form5_Top5 ─────────────────────────────────────────────
    if (code === 'StateHolding_Form5_Top5') {
      if (!tableRows?.length) return null;
      return (
        <div className="mt-6">
          <StateHoldingForm5Top5Report data={buildStateHoldingForm5Top5Data(tableRows, dateFrom, dateTo)} />
        </div>
      );
    }

    // ── StateHolding_Form6 ──────────────────────────────────────────────────
    if (code === 'StateHolding_Form6') {
      if (!tableRows?.length) return null;
      const { pagedRows } = getPagedRows(tableRows);
      return (
        <div className="mt-6">
          <StateHoldingForm6Report data={buildStateHoldingForm6Data(pagedRows, dateFrom, dateTo)} />
        </div>
      );
    }

    // ── StateHolding_Form7 ──────────────────────────────────────────────────
    if (code === 'StateHolding_Form7') {
      if (!tableRows?.length) return null;
      return (
        <div className="mt-6">
          <StateHoldingForm7Report data={buildStateHoldingForm7Data(tableRows, dateFrom, dateTo)} />
        </div>
      );
    }

    // ── StateHolding_Form8 ──────────────────────────────────────────────────
    if (code === 'StateHolding_Form8') {
      if (!tableRows?.length) return null;
      const { pagedRows } = getPagedRows(tableRows);
      return (
        <div className="mt-6">
          <StateHoldingForm8Report data={buildStateHoldingForm8Data(pagedRows, dateFrom, dateTo)} />
        </div>
      );
    }

    // ── StateHolding_Form9 ──────────────────────────────────────────────────
    if (code === 'StateHolding_Form9') {
      if (!tableRows?.length) return null;
      const { pagedRows } = getPagedRows(tableRows);
      return (
        <div className="mt-6">
          <StateHoldingForm9Report data={buildStateHoldingForm9Data(pagedRows, dateFrom, dateTo)} />
        </div>
      );
    }

    // ── StateHolding_Form10 ─────────────────────────────────────────────────
    if (code === 'StateHolding_Form10') {
      if (!tableRows?.length) return null;
      const { pagedRows } = getPagedRows(tableRows);
      return (
        <div className="mt-6">
          <StateHoldingForm10Report data={buildStateHoldingForm10Data(pagedRows, dateFrom, dateTo)} />
        </div>
      );
    }

    // ── Auction_Summary ─────────────────────────────────────────────────────
    if (code === 'Auction_Summary') {
      if (!tableRows?.length) return null;
      const byAuction = new Map<string, Record<string, unknown>[]>();
      for (const row of tableRows) {
        const key = String(row.secCode ?? '');
        if (!byAuction.has(key)) byAuction.set(key, []);
        byAuction.get(key)!.push(row);
      }
      const auctionKeys = Array.from(byAuction.keys()).sort();
      const start = isPrinting ? 0 : (page - 1);
      const end   = isPrinting ? auctionKeys.length : Math.min(start + 1, auctionKeys.length);
      return (
        <>
          {auctionKeys.slice(start, end).map((secCode, idx) => {
            const rows = byAuction.get(secCode)!;
            const priceGroups = rows
              .map((row) => ({ price: Number(row.price ?? 0), nominalSum: Number(row.nominalSum ?? 0), totalQty: Number(row.totalQty ?? 0), valueActual: Number(row.valueActual ?? 0), yieldPercent: Number(row.yieldPercent ?? 0), yieldByPrice: Number(row.yieldByPrice ?? 0) }))
              .sort((a, b) => b.yieldPercent - a.yieldPercent);
            let competitiveQty = 0, competitiveNominal = 0, competitiveValueActual = 0;
            let nonCompetitiveQty = 0, nonCompetitiveNominal = 0, nonCompetitiveValueActual = 0;
            let totalQty = 0, totalNominal = 0, totalValueActual = 0;
            for (const row of rows) {
              const qty = Number(row.totalQty ?? 0), nominal = Number(row.nominalSum ?? 0), val = Number(row.valueActual ?? 0);
              totalQty += qty; totalNominal += nominal; totalValueActual += val;
              if (String(row.bidType ?? '') === 'Конкурентная') {
                competitiveQty += qty; competitiveNominal += nominal; competitiveValueActual += val;
              } else {
                nonCompetitiveQty += qty; nonCompetitiveNominal += nominal; nonCompetitiveValueActual += val;
              }
            }
            const totalVolume = totalNominal || totalValueActual || 1;
            const first = rows[0];
            const auctionData: AuctionSummaryData = {
              auctionDate: dateFrom,
              secCode: String(first?.secCode ?? ''),
              classCode: String(first?.classCode ?? ''),
              className: first?.className != null ? String(first.className) : undefined,
              secFullName: String(first?.secFullName ?? ''),
              registrationNumber: String(first?.secCode ?? ''),
              couponRate: Number(first?.yieldPercent ?? 0),
              participantCount: Number(first?.participantCount ?? 0),
              bids: [],
              summary: {
                competitiveQty, competitiveNominal, competitiveValueActual, competitivePercent: (competitiveNominal / totalVolume) * 100,
                nonCompetitiveQty, nonCompetitiveNominal, nonCompetitiveValueActual, nonCompetitivePercent: (nonCompetitiveNominal / totalVolume) * 100,
                totalQty, totalNominal, totalValueActual,
              },
              priceGroups,
            };
            return (
              <div key={`auction-${secCode}-${idx}`} className={idx === 0 ? 'mt-6' : 'mt-10 print:break-before-page'}>
                <AuctionSummaryReport data={auctionData} />
              </div>
            );
          })}
        </>
      );
    }

    // ── Auction_Summary_2 ───────────────────────────────────────────────────
    if (code === 'Auction_Summary_2') {
      if (!tableRows?.length) return null;
      const start = isPrinting ? 0 : (page - 1);
      const end   = isPrinting ? tableRows.length : start + 1;
      return (
        <>
          {tableRows.slice(start, end).map((row, idx) => (
            <div key={`auction2-${row.cur_sec_code ?? idx}-${page}`} className={idx === 0 ? 'mt-6' : 'mt-10 print:break-before-page'}>
              <AuctionSummary2Report data={row as unknown as AuctionSummary2Row} reportDate={dateFrom} />
            </div>
          ))}
        </>
      );
    }

    // ── Auction_Bid_Classification / Auction_Central_Depository (общий паттерн) ──
    if (code === 'Auction_Bid_Classification' || code === 'Auction_Central_Depository') {
      if (!tableRows?.length) {
        return (
          <div className="mt-6 rounded-md bg-muted/50 border border-border px-4 py-6 text-center text-muted-foreground">
            Нет данных за выбранную дату. Проверьте дату и наличие сделок в источнике данных.
          </div>
        );
      }
      const byAuction = new Map<string, Record<string, unknown>[]>();
      for (const r of tableRows) {
        const key = `${r.registration_number ?? ''}\t${r.auction_date ?? ''}`;
        if (!byAuction.has(key)) byAuction.set(key, []);
        byAuction.get(key)!.push(r);
      }
      const auctionKeys = Array.from(byAuction.keys()).sort();
      const start = isPrinting ? 0 : (page - 1);
      const end   = isPrinting ? auctionKeys.length : start + 1;
      return (
        <>
          {auctionKeys.slice(start, end).map((key, idx) => {
            const group = byAuction.get(key)!;
            const first = group[0];
            const common = {
              registration_number: String(first?.registration_number ?? ''),
              auction_date: String(first?.auction_date ?? ''),
              issue_volume: Number(first?.issue_volume ?? 0),
              non_competitive_amount: Number(first?.non_competitive_amount ?? 0),
            };
            const cls = idx === 0 ? 'mt-6' : 'mt-10 print:break-before-page';
            if (code === 'Auction_Bid_Classification') {
              return (
                <div key={`bid-class-${key}`} className={cls}>
                  <BidClassificationReport
                    data={{ ...common, rows: group.map((r) => ({ dealer_name: String(r.dealer_name ?? ''), nominal_value: Number(r.nominal_value ?? 0), bid_price: Number(r.bid_price ?? 0), yield_pct: Number(r.yield_pct ?? 0) })) }}
                    reportDate={dateFrom}
                  />
                </div>
              );
            }
            return (
              <div key={`central-dep-${key}`} className={cls}>
                <CentralDepositoryReport
                  data={{ ...common, rows: group.map((r) => ({ dealer_name: String(r.dealer_name ?? ''), actual_qty: Number(r.actual_qty ?? 0), actual_value: Number(r.actual_value ?? 0), bid_price: Number(r.bid_price ?? 0), yield_pct: Number(r.yield_pct ?? 0) })) }}
                  reportDate={dateFrom}
                />
              </div>
            );
          })}
        </>
      );
    }

    // ── Auction_Additional_Placement ────────────────────────────────────────
    if (code === 'Auction_Additional_Placement') {
      if (!tableRows?.length) {
        return (
          <div className="mt-6 rounded-md bg-muted/50 border border-border px-4 py-6 text-center text-muted-foreground">
            Нет данных за выбранную дату. Проверьте дату и наличие сделок в источнике данных.
          </div>
        );
      }
      const byKey = new Map<string, Record<string, unknown>[]>();
      for (const r of tableRows) {
        const key = `${r.sec_code ?? ''}\t${r.trade_date ?? ''}`;
        if (!byKey.has(key)) byKey.set(key, []);
        byKey.get(key)!.push(r);
      }
      const keys  = Array.from(byKey.keys()).sort();
      const start = isPrinting ? 0 : (page - 1);
      const end   = isPrinting ? keys.length : start + 1;
      return (
        <>
          {keys.slice(start, end).map((key, idx) => {
            const r = byKey.get(key)![0];
            const data: AdditionalPlacementData = {
              sec_code: String(r.sec_code ?? ''), trade_date: String(r.trade_date ?? ''),
              class_code: String(r.class_code ?? ''), class_name: r.class_name != null ? String(r.class_name) : undefined,
              sec_full_name: String(r.sec_full_name ?? ''), face_value: Number(r.face_value ?? 100),
              issue_qty: Number(r.issue_qty ?? 0), coupon_rate: Number(r.coupon_rate ?? 0),
              avg_price: Number(r.avg_price ?? 0), avg_yield: Number(r.avg_yield ?? 0),
              total_qty: Number(r.total_qty ?? 0), total_value: Number(r.total_value ?? 0),
              participant_count: Number(r.participant_count ?? 0), financial_participants: Number(r.financial_participants ?? 0),
              institutional_investors: Number(r.institutional_investors ?? 0),
              resident_count: Number(r.resident_count ?? 0), non_resident_count: Number(r.non_resident_count ?? 0),
            };
            return (
              <div key={`add-placement-${key}`} className={idx === 0 ? 'mt-6' : 'mt-10 print:break-before-page'}>
                <AdditionalPlacementReport data={data} reportDate={dateFrom} title={selectedForm.description || selectedForm.name} />
              </div>
            );
          })}
        </>
      );
    }

    // ── Exchange_Contract / Exchange_Certificate (+ аукционные копии) ──────
    if (
      code === 'Exchange_Contract'
      || code === 'Exchange_Certificate'
      || code === 'Auction_Exchange_Contract'
      || code === 'Auction_Exchange_Certificate'
    ) {
      if (!tableRows?.length) return null;
      const showDealNumber =
        code === 'Auction_Exchange_Contract' || code === 'Auction_Exchange_Certificate';
      const start = isPrinting ? 0 : (page - 1);
      const end   = isPrinting ? tableRows.length : start + 1;
      return (
        <>
          {tableRows.slice(start, end).map((row, idx) => {
            const base = {
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
            const cls = idx === 0 ? 'mt-6' : 'mt-10 print:break-before-page';
            if (code === 'Exchange_Contract' || code === 'Auction_Exchange_Contract') {
              return (
                <div key={`exchange-contract-${row.id ?? idx}-${page}`} className={cls}>
                  <ExchangeContractReport data={base as ExchangeContractData} showDealNumber={showDealNumber} />
                </div>
              );
            }
            return (
              <div key={`exchange-cert-${row.id ?? idx}-${page}`} className={cls}>
                <ExchangeCertificateReport
                  data={{ ...base, yield: row.yield != null ? Number(row.yield) : null } as ExchangeCertificateData}
                  showDealNumber={showDealNumber}
                />
              </div>
            );
          })}
        </>
      );
    }

    // ── Exchange_Contract_Gold / Gold_Daily_Summary (данные из Oracle) ──────
    if (code === 'Exchange_Contract_Gold' || code === 'Gold_Daily_Summary') {
      if (goldRows === null) return null;
      if (!goldRows.length) {
        return (
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
        );
      }
      if (code === 'Exchange_Contract_Gold') {
        return <ExchangeContractGold rows={goldRows} page={page} isPrinting={isPrinting} selectedOwnId={selectedOwnId} oracleInstruments={oracleInstruments} />;
      }
      const inv = selectedOwnId !== undefined ? oracleInstruments.find((i) => i.id === selectedOwnId) : undefined;
      return (
        <GoldDailySummaryReport
          rows={goldRows}
          reportDate={dateFrom}
          instrumentLabel={inv ? (inv.extcode ? `${inv.extcode} — ${inv.namerus}` : inv.namerus) : undefined}
        />
      );
    }

    // ── Blank_Form_USD ──────────────────────────────────────────────────────
    if (code === 'Blank_Form_USD') {
      if (usdRows == null) return null;
      const inv = selectedOwnId !== undefined ? oracleInstruments.find((i) => i.id === selectedOwnId) : undefined;
      return (
        <div className="mt-6">
          <UsdReport
            rows={usdRows}
            dateFrom={filters.dateFrom}
            dateTo={filters.dateTo}
            instrument={inv ? (inv.extcode ? `${inv.extcode} — ${inv.namerus}` : inv.namerus) : undefined}
          />
        </div>
      );
    }

    // ── Fallback: generic table (формы без собственного шаблона) ───────────
    if (result?.type === 'table' && !FORMS_WITH_CUSTOM_VIEW.has(code)) {
      const start = (page - 1) * limit;
      return <ReportTable rows={result.rows.slice(start, start + limit)} />;
    }

    return null;
  };

  return (
    <div>
      <Card className="print:border-none print:shadow-none">
        <CardContent className="pt-6">
          {/* ── Filter panel ── */}
          <div className="mb-6 print:hidden space-y-4">

            {/* Row 1: Форма | Класс | Инструмент | Участник */}
            <div className={filterRow1GridClass}>

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
                    const meta = form ? FORM_META[form.code] : undefined;
                    if (meta?.filterMode === 'oracle') {
                      setFilters((prev) => ({
                        ...prev,
                        classCode: undefined,
                        instrument: undefined,
                        firmCode: undefined,
                      }));
                    } else if (meta?.filterMode === 'none') {
                      setFilters((prev) => ({
                        ...prev,
                        instrument: undefined,
                        firmCode: undefined,
                      }));
                    } else if (meta?.filterMode === 'firm') {
                      setFilters((prev) => ({
                        ...prev,
                        instrument: undefined,
                      }));
                    }
                    if (meta?.filterMode === 'oracle') {
                      setLoadingInstruments(true);
                      getOracleInstruments()
                        .then(setOracleInstruments)
                        .catch(() => {})
                        .finally(() => setLoadingInstruments(false));
                    }
                  }}
                  placeholder="— выбрать —"
                  dropdownWidth="wide"
                  searchFields={['label']}
                  triggerClassName={selectedFormId ? FILTER_ACTIVE_TRIGGER : undefined}
                  groups={reportFormSelectGroups.map(([category, categoryForms]): SelectOptionGroup => ({
                    label: category,
                    icon: category === 'Отчеты по Аукциону'
                      ? <BarChart2 className="mr-2 h-4 w-4 shrink-0 opacity-70" />
                      : category === 'Отчеты ГосФинНадзор'
                        ? <Building2 className="mr-2 h-4 w-4 shrink-0 opacity-70" />
                        : <FileText className="mr-2 h-4 w-4 shrink-0 opacity-70" />,
                    options: categoryForms.map((form) => {
                      const isOracle = FORM_META[form.code]?.dataSource === 'usd'
                        || FORM_META[form.code]?.dataSource === 'gold';
                      return {
                        value: String(form.id),
                        label: (form.description || form.name || '').trim(),
                        className: isOracle ? 'bg-amber-50 hover:bg-amber-100' : undefined,
                      };
                    }),
                  }))}
                />
              </div>

              {/* Oracle-инструмент (USD / Золото) */}
              {filterMode === 'oracle' && (
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
                    triggerClassName={selectedOwnId !== undefined ? FILTER_ACTIVE_TRIGGER : undefined}
                    options={[
                      { value: '0', label: '— все инструменты —' },
                      ...oracleInstruments.map((i) => ({
                        value: String(i.id),
                        label: i.extcode ? `${i.extcode} — ${i.namerus}` : i.namerus,
                      })),
                    ]}
                  />
                </div>
              )}

              {/* Класс (все QUIK-отчёты, кроме Oracle) */}
              {showClassFilter && (
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
                    triggerClassName={filters.classCode ? FILTER_ACTIVE_TRIGGER : undefined}
                    options={[
                      { value: '0', label: '— все классы —' },
                      ...classes.map((c) => ({
                        value: c.code,
                        label: c.name !== c.code ? `${c.code} — ${c.name}` : c.code,
                      })),
                    ]}
                  />
                </div>
              )}

              {/* Только Участник */}
              {filterMode === 'firm' && (
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
                    triggerClassName={filters.firmCode ? FILTER_ACTIVE_TRIGGER : undefined}
                    options={[
                      { value: '0', label: '— все участники —' },
                      ...firms.map((f) => ({
                        value: f.firmId,
                        label: f.firmName && f.firmName !== f.firmId ? `${f.firmName} (${f.firmId})` : f.firmId,
                      })),
                    ]}
                  />
                </div>
              )}

              {/* Инструмент + Участник (полный QUIK) */}
              {filterMode === 'quik' && (
                <>
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
                      triggerClassName={filters.instrument ? FILTER_ACTIVE_TRIGGER : undefined}
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
                      triggerClassName={filters.firmCode ? FILTER_ACTIVE_TRIGGER : undefined}
                      options={[
                        { value: '0', label: '— все участники —' },
                        ...firms.map((f) => ({
                          value: f.firmId,
                          label: f.firmName && f.firmName !== f.firmId ? `${f.firmName} (${f.firmId})` : f.firmId,
                        })),
                      ]}
                    />
                  </div>
                </>
              )}
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
                      className={`block h-10 px-3 rounded-md border text-sm disabled:opacity-50 disabled:cursor-not-allowed w-40 ${
                        filters.dateFrom ? FILTER_ACTIVE_TRIGGER : 'border-input bg-background'
                      }`}
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
                        className={`block h-10 px-3 rounded-md border text-sm disabled:opacity-50 disabled:cursor-not-allowed w-40 ${
                          filters.dateFrom ? FILTER_ACTIVE_TRIGGER : 'border-input bg-background'
                        }`}
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
                        className={`block h-10 px-3 rounded-md border text-sm disabled:opacity-50 disabled:cursor-not-allowed w-40 ${
                          filters.dateTo ? FILTER_ACTIVE_TRIGGER : 'border-input bg-background'
                        }`}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Кнопки */}
              <div className="flex items-end justify-end gap-2">
                {showPostRunActions && (
                  <>
                    <Button variant="secondary" onClick={handlePrint}>
                      <Printer className="h-4 w-4 mr-1.5" />
                      Печать
                    </Button>
                    <Button variant="secondary" onClick={handleReset} disabled={loading}>
                      <RotateCcw className="h-4 w-4 mr-1.5" />
                      Сброс
                    </Button>
                  </>
                )}
                <Button
                  className="w-[9.75rem]"
                  onClick={run}
                  disabled={!selectedFormId || loading}
                >
                  {loading ? 'Загрузка…' : (
                    <>
                      <Play className="h-4 w-4 mr-1.5" />
                      Сформировать
                    </>
                  )}
                </Button>
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
              {renderFormContent()}
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

      {showRecentRuns && (
        <div className="mt-6 print:hidden">
          <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#3d848c' }}>
            Недавние отчёты
          </p>
          <div className="flex flex-col gap-2">
            {recentRuns.map((entry) => {
              const formMissing = !forms.some((f) => String(f.id) === entry.reportFormId);
              const savedAtLabel = formatSavedAt(entry.savedAt);
              return (
                <div
                  key={entry.id}
                  className="flex w-full min-w-0 items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm"
                >
                  <History className="h-4 w-4 shrink-0 text-[#3d848c]" />
                  <div className="min-w-0 flex-1 flex flex-col gap-1">
                    <p className="font-medium leading-snug break-words">{entry.reportFormLabel}</p>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      {entry.summary && <span>{entry.summary}</span>}
                      {entry.resultCount === 0 && (
                        <span className="text-amber-700 dark:text-amber-500">нет данных</span>
                      )}
                      {entry.resultCount != null && entry.resultCount > 0 && (
                        <span className="text-green-700 dark:text-green-500">
                          записей: {entry.resultCount}
                        </span>
                      )}
                      {savedAtLabel && (
                        <span className="tabular-nums text-[#3d848c] dark:text-[#6eb8bf]">
                          {savedAtLabel}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => runFromSavedEntry(entry)}
                    disabled={loading || formMissing}
                    className="shrink-0 text-sm font-medium text-[#3d848c] hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:no-underline"
                  >
                    Сформировать
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
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

// Общий хелпер: строит Map<classCode → Map<secCode → rows[]>> + словари имён
function buildClassSecMap(rows: Record<string, unknown>[]) {
  const classMap = new Map<string, Map<string, Record<string, unknown>[]>>();
  const classCodeToName = new Map<string, string>();
  const secCodeToFullName = new Map<string, string>();
  for (const row of rows) {
    const classCode = String(row.classCode ?? 'Без класса');
    const secCode   = String(row.secCode   ?? 'Без кода');
    if (!classCodeToName.has(classCode) && row.className  != null) classCodeToName.set(classCode, String(row.className));
    if (!secCodeToFullName.has(secCode) && row.secFullName != null) secCodeToFullName.set(secCode, String(row.secFullName));
    if (!classMap.has(classCode)) classMap.set(classCode, new Map());
    const secMap = classMap.get(classCode)!;
    if (!secMap.has(secCode)) secMap.set(secCode, []);
    secMap.get(secCode)!.push(row);
  }
  return { classMap, classCodeToName, secCodeToFullName };
}

// Общий хелпер: агрегация сделок по ЦБ (используется в Форм2 и Форм4)
function aggregateSecGroup(trades: Record<string, unknown>[]) {
  const totalQuantity = trades.reduce((s, t) => s + Number(t.quantity ?? 0), 0);
  const totalAmount   = trades.reduce((s, t) => s + Number(t.value    ?? 0), 0);
  const prices = trades.map((t) => Number(t.price ?? 0)).filter((p) => p > 0);
  const maxPrice = prices.length ? Math.max(...prices) : 0;
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const last = trades[trades.length - 1];
  return {
    tradesCount:       trades.length,
    totalQuantity,
    totalAmount,
    maxPrice, minPrice, avgPrice,
    lastTradePrice:    Number(last?.price    ?? 0),
    lastTradeQuantity: Number(last?.quantity ?? 0),
    lastTradeAmount:   Number(last?.value    ?? 0),
    tradeDate: formatDate(trades[0]?.tradeDate),
  };
}

// Группировка для Форм 2 и 4: Класс → ЦБ → агрегация (идентичная структура)
function groupByClassAndSecForm2(rows: Record<string, unknown>[]): ClassGroupForm2[] {
  const { classMap, classCodeToName, secCodeToFullName } = buildClassSecMap(rows);
  return Array.from(classMap.entries()).map(([classId, secMap]) => ({
    classId,
    className: classCodeToName.get(classId) ?? classId,
    securities: Array.from(secMap.entries()).map(([securityId, trades]) => ({
      securityId,
      secFullName: secCodeToFullName.get(securityId) ?? securityId,
      ...aggregateSecGroup(trades),
    })),
  }));
}


// Группировка для Формы 4: Класс → ЦБ → агрегация (та же структура, что и Form2)
function groupByClassAndSecForm4(rows: Record<string, unknown>[]): ClassGroupForm4[] {
  const { classMap, classCodeToName, secCodeToFullName } = buildClassSecMap(rows);
  return Array.from(classMap.entries()).map(([classId, secMap]) => ({
    classId,
    className: classCodeToName.get(classId) ?? classId,
    securities: Array.from(secMap.entries()).map(([securityId, trades]) => ({
      securityId,
      secFullName: secCodeToFullName.get(securityId) ?? securityId,
      ...aggregateSecGroup(trades),
    })),
  }));
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
  const { classMap, classCodeToName } = buildClassSecMap(rows);

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

/**
 * Форма 13: сводка комиссионных сборов за период.
 * Рыночные = secondary, Регистрационные = primary.
 * Комиссия — sellerCommission + buyerCommission из report-engine.
 */
function buildForm13Summary(rows: Record<string, unknown>[]): Form13Summary {
  let volume = 0;
  let commission = 0;
  let dealCount = 0;
  let marketDealCount = 0;
  let marketCommission = 0;
  let registrationDealCount = 0;
  let registrationCommission = 0;
  const participants = new Set<string>();

  for (const r of rows) {
    const tradeVolume = Number(r.value ?? 0);
    const tradeCommission = Number(r.sellerCommission ?? 0) + Number(r.buyerCommission ?? 0);
    const marketType = String(r.marketType ?? '');
    const isRegistration = marketType === 'primary';

    volume += tradeVolume;
    commission += tradeCommission;
    dealCount += 1;

    const buyer = String(r.buyerName ?? '').trim();
    const seller = String(r.sellerName ?? '').trim();
    if (buyer) participants.add(buyer);
    if (seller) participants.add(seller);

    if (isRegistration) {
      registrationDealCount += 1;
      registrationCommission += tradeCommission;
    } else {
      marketDealCount += 1;
      marketCommission += tradeCommission;
    }
  }

  return {
    volume,
    commission,
    actualRatePercent: volume > 0 ? (commission / volume) * 100 : 0,
    participantCount: participants.size,
    dealCount,
    avgCommission: dealCount > 0 ? commission / dealCount : 0,
    marketDealCount,
    marketCommission,
    registrationDealCount,
    registrationCommission,
  };
}

/**
 * Форма 14: агрегация по участнику (покупатель / продавец отдельно).
 * Комиссия стороны — buyerCommission / sellerCommission по тарифу ЦБ.
 */
function buildForm14Rows(rows: Record<string, unknown>[]): Form14Row[] {
  type Acc = {
    participantName: string;
    volume: number;
    commission: number;
    dealCount: number;
    marketDealCount: number;
    marketCommission: number;
    registrationDealCount: number;
    registrationCommission: number;
  };
  const byParticipant = new Map<string, Acc>();

  const addSide = (name: string, volume: number, commission: number, isRegistration: boolean) => {
    const key = name.trim() || '—';
    let acc = byParticipant.get(key);
    if (!acc) {
      acc = {
        participantName: key,
        volume: 0,
        commission: 0,
        dealCount: 0,
        marketDealCount: 0,
        marketCommission: 0,
        registrationDealCount: 0,
        registrationCommission: 0,
      };
      byParticipant.set(key, acc);
    }
    acc.volume += volume;
    acc.commission += commission;
    acc.dealCount += 1;
    if (isRegistration) {
      acc.registrationDealCount += 1;
      acc.registrationCommission += commission;
    } else {
      acc.marketDealCount += 1;
      acc.marketCommission += commission;
    }
  };

  for (const r of rows) {
    const volume = Number(r.value ?? 0);
    const marketType = String(r.marketType ?? '');
    const isRegistration = marketType === 'primary';
    const buyerName = String(r.buyerName ?? '').trim();
    const sellerName = String(r.sellerName ?? '').trim();
    addSide(buyerName, volume, Number(r.buyerCommission ?? 0), isRegistration);
    addSide(sellerName, volume, Number(r.sellerCommission ?? 0), isRegistration);
  }

  const totalCommission = Array.from(byParticipant.values()).reduce((s, a) => s + a.commission, 0) || 1;

  return Array.from(byParticipant.values())
    .map((a) => ({
      participantName: a.participantName,
      volume: a.volume,
      commission: a.commission,
      actualRatePercent: a.volume > 0 ? (a.commission / a.volume) * 100 : 0,
      dealCount: a.dealCount,
      avgCommission: a.dealCount > 0 ? a.commission / a.dealCount : 0,
      marketDealCount: a.marketDealCount,
      marketCommission: a.marketCommission,
      registrationDealCount: a.registrationDealCount,
      registrationCommission: a.registrationCommission,
      sharePercent: (a.commission / totalCommission) * 100,
    }))
    .sort((a, b) => a.participantName.localeCompare(b.participantName, 'ru'));
}

function buildForm14Totals(rows: Form14Row[]): Form14Row {
  const totals = rows.reduce(
    (acc, r) => {
      acc.volume += r.volume;
      acc.commission += r.commission;
      acc.dealCount += r.dealCount;
      acc.marketDealCount += r.marketDealCount;
      acc.marketCommission += r.marketCommission;
      acc.registrationDealCount += r.registrationDealCount;
      acc.registrationCommission += r.registrationCommission;
      return acc;
    },
    {
      participantName: 'Итого',
      volume: 0,
      commission: 0,
      dealCount: 0,
      marketDealCount: 0,
      marketCommission: 0,
      registrationDealCount: 0,
      registrationCommission: 0,
    },
  );
  return {
    ...totals,
    actualRatePercent: totals.volume > 0 ? (totals.commission / totals.volume) * 100 : 0,
    avgCommission: totals.dealCount > 0 ? totals.commission / totals.dealCount : 0,
    sharePercent: 100,
  };
}

/**
 * Форма 15: агрегация по ЦБ.
 * Рыночные = secondary (вторичка), Регистрационные = primary (первичка).
 * Комиссия — из тарифов ЦБ (sellerCommission + buyerCommission из report-engine).
 */
function buildForm15Rows(rows: Record<string, unknown>[]): Form15Row[] {
  type Acc = {
    secName: string;
    volume: number;
    commission: number;
    dealCount: number;
    marketDealCount: number;
    marketCommission: number;
    registrationDealCount: number;
    registrationCommission: number;
  };
  const bySec = new Map<string, Acc>();

  for (const r of rows) {
    const secCode = String(r.secCode ?? '');
    const secFullName = String(r.secFullName ?? '').trim();
    const key = secCode || secFullName || '—';
    const volume = Number(r.value ?? 0);
    // Комиссия по тарифу класса ЦБ (commission_tariffs)
    const commission = Number(r.sellerCommission ?? 0) + Number(r.buyerCommission ?? 0);
    const marketType = String(r.marketType ?? '');
    const isRegistration = marketType === 'primary'; // первичка
    const isMarket = marketType === 'secondary' || !isRegistration; // вторичка

    let acc = bySec.get(key);
    if (!acc) {
      acc = {
        secName: secFullName || secCode || '—',
        volume: 0,
        commission: 0,
        dealCount: 0,
        marketDealCount: 0,
        marketCommission: 0,
        registrationDealCount: 0,
        registrationCommission: 0,
      };
      bySec.set(key, acc);
    }
    acc.volume += volume;
    acc.commission += commission;
    acc.dealCount += 1;
    if (isRegistration) {
      acc.registrationDealCount += 1;
      acc.registrationCommission += commission;
    } else if (isMarket) {
      acc.marketDealCount += 1;
      acc.marketCommission += commission;
    }
  }

  const totalCommission = Array.from(bySec.values()).reduce((s, a) => s + a.commission, 0) || 1;

  return Array.from(bySec.values())
    .map((a) => ({
      secName: a.secName,
      volume: a.volume,
      commission: a.commission,
      actualRatePercent: a.volume > 0 ? (a.commission / a.volume) * 100 : 0,
      dealCount: a.dealCount,
      avgCommission: a.dealCount > 0 ? a.commission / a.dealCount : 0,
      marketDealCount: a.marketDealCount,
      marketCommission: a.marketCommission,
      registrationDealCount: a.registrationDealCount,
      registrationCommission: a.registrationCommission,
      sharePercent: (a.commission / totalCommission) * 100,
    }))
    .sort((a, b) => a.secName.localeCompare(b.secName, 'ru'));
}

function buildForm15Totals(rows: Form15Row[]): Form15Row {
  const totals = rows.reduce(
    (acc, r) => {
      acc.volume += r.volume;
      acc.commission += r.commission;
      acc.dealCount += r.dealCount;
      acc.marketDealCount += r.marketDealCount;
      acc.marketCommission += r.marketCommission;
      acc.registrationDealCount += r.registrationDealCount;
      acc.registrationCommission += r.registrationCommission;
      return acc;
    },
    {
      secName: 'Итого',
      volume: 0,
      commission: 0,
      dealCount: 0,
      marketDealCount: 0,
      marketCommission: 0,
      registrationDealCount: 0,
      registrationCommission: 0,
    },
  );
  return {
    ...totals,
    actualRatePercent: totals.volume > 0 ? (totals.commission / totals.volume) * 100 : 0,
    avgCommission: totals.dealCount > 0 ? totals.commission / totals.dealCount : 0,
    sharePercent: 100,
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
