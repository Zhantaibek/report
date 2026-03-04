import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card.tsx';
import { Button } from '../components/ui/button.tsx';
import { SelectWithSearch, type SelectOptionGroup } from '../components/ui/select.tsx';
import { Play, Printer, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, BarChart2, FileText } from 'lucide-react';
import { getReportForms } from '../api/report-forms.ts';
import { runReport, runUsdReport, exportReport, getSecurities, getClasses, getFirms, getOracleInstruments, type ReportResult, type RunFilters, type SecurityItem, type ClassItem, type FirmItem, type UsdReportRow, type OracleInstrument } from '../api/reports.ts';
import type { ReportForm } from '../api/report-forms.ts';
import ReportTable from '../components/ReportTable.tsx';
import ReportSummary from '../components/ReportSummary.tsx';
import ReportChart from '../components/ReportChart.tsx';
import Form1Report, {
  type ReportTradesConcludedData,
} from '../components/reports/Form1Report.tsx';
import Form2Report, {
  type ReportTradesForm2Data,
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
import { UsdReport } from '../components/reports/UsdReport.tsx';
import { ReportPagination } from '../components/reports/ReportPagination.tsx';

export default function Reports() {
  const [forms, setForms] = useState<ReportForm[]>([]);
  const [firms, setFirms] = useState<FirmItem[]>([]);
  const [securities, setSecurities] = useState<SecurityItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedFormId, setSelectedFormId] = useState<string>('');
  const [filters, setFilters] = useState<RunFilters>({
    dateFrom: '2025-01-10',
    dateTo: '2026-02-13',
  });
  const [result, setResult] = useState<ReportResult | null>(null);
  const [usdRows, setUsdRows] = useState<UsdReportRow[] | null>(null);
  const [oracleInstruments, setOracleInstruments] = useState<OracleInstrument[]>([]);
  const [loadingInstruments, setLoadingInstruments] = useState(false);
  const [selectedOwnId, setSelectedOwnId] = useState<number | undefined>(undefined);
  const [runError, setRunError] = useState<string | null>(null);
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
      alert('Укажите период (дата с и дата по)');
      return;
    }
    setLoading(true);
    setRunError(null);
    setPage(1);
    setUsdRows(null);
    try {
      if (selectedForm?.code === 'Blank_Form_USD') {
        const res = await runUsdReport(filters.dateFrom, filters.dateTo, selectedOwnId);
        setUsdRows(res.rows);
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
    
    // Подсчет итогов по ВСЕМ данным (не только текущей страницы)
    let totalQuantity = 0;
    let totalAmount = 0;
    const uniqueSecurities = new Set<string>();
    const uniqueTrades = new Set<string>();
    
    result.rows.forEach((row: Record<string, unknown>) => {
      totalQuantity += Number(row.quantity ?? 0);
      totalAmount += Number(row.value ?? 0);
      const secCode = String(row.secCode ?? '');
      const tradeId = String(row.id ?? '');
      if (secCode) {
        uniqueSecurities.add(secCode);
      }
      if (tradeId) {
        uniqueTrades.add(tradeId);
      }
    });
    
    // Пагинация на уровне сделок (или все данные для печати)
    const start = (page - 1) * limit;
    const end = start + limit;
    const pagedRows = isPrinting ? result.rows : result.rows.slice(start, end);
    const totalPages = Math.ceil(result.total / limit);
    
    const grouped = groupByClassAndSec(pagedRows);
    return {
      data: {
        periodFrom: filters.dateFrom || '',
        periodTo: filters.dateTo || '',
        classes: grouped,
        totalSummary: {
          totalQuantity,
          totalAmount,
          totalTrades: uniqueTrades.size,
          totalSecurities: uniqueSecurities.size,
        },
      },
      total: result.total,
      totalPages,
    };
  };

  const groupedResult = getGroupedData();

  // Общая пагинация для всех отчётов — один расчёт для верхнего и нижнего блока
  const paginationInfo = useMemo(() => {
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
  }, [result, selectedForm, groupedResult, limit]);

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
                    setSelectedOwnId(undefined);
                    const form = forms.find((f) => String(f.id) === newId);
                    if (form?.code === 'Blank_Form_USD' && oracleInstruments.length === 0) {
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

              {/* Инструмент Oracle — только для USD отчёта */}
              {selectedForm?.code === 'Blank_Form_USD' ? (
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

              {/* Класс / Инструмент / Участник — скрываем для USD отчёта */}
              {selectedForm?.code !== 'Blank_Form_USD' && <>
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
                    <input
                      type="date"
                      value={filters.dateFrom ?? ''}
                      onChange={(e) => {
                        const date = e.target.value || undefined;
                        setFilters({ ...filters, dateFrom: date, dateTo: date });
                      }}
                      disabled={!selectedFormId}
                      className="block h-10 px-3 rounded-md border border-input bg-background text-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none transition"
                      onFocus={(e) => { e.target.style.boxShadow = '0 0 0 2px rgba(61,132,140,0.2)'; e.target.style.borderColor = '#3d848c'; }}
                      onBlur={(e) => { e.target.style.boxShadow = ''; e.target.style.borderColor = ''; }}
                    />
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: '#3d848c' }}>
                        Дата с <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="date"
                        value={filters.dateFrom ?? ''}
                        onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value || undefined })}
                        disabled={!selectedFormId}
                        className="block h-10 px-3 rounded-md border border-input bg-background text-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none transition"
                        onFocus={(e) => { e.target.style.boxShadow = '0 0 0 2px rgba(61,132,140,0.2)'; e.target.style.borderColor = '#3d848c'; }}
                        onBlur={(e) => { e.target.style.boxShadow = ''; e.target.style.borderColor = ''; }}
                      />
                    </div>
                    <span className="text-muted-foreground self-end mb-2.5">—</span>
                    <div className="flex flex-col gap-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wide" style={{ color: '#3d848c' }}>
                        Дата по <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="date"
                        value={filters.dateTo ?? ''}
                        onChange={(e) => setFilters({ ...filters, dateTo: e.target.value || undefined })}
                        disabled={!selectedFormId}
                        className="block h-10 px-3 rounded-md border border-input bg-background text-sm disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none transition"
                        onFocus={(e) => { e.target.style.boxShadow = '0 0 0 2px rgba(61,132,140,0.2)'; e.target.style.borderColor = '#3d848c'; }}
                        onBlur={(e) => { e.target.style.boxShadow = ''; e.target.style.borderColor = ''; }}
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
                {((groupedResult && selectedForm?.code === 'Blank_Form_1') || (usdRows && usdRows.length > 0 && selectedForm?.code === 'Blank_Form_USD') || (result && (selectedForm?.code === 'Blank_Form_2' || selectedForm?.code === 'Blank_Form_3' || selectedForm?.code === 'Blank_Form_6A' || selectedForm?.code === 'Blank_Form_9' || selectedForm?.code === 'Auction_Summary' || selectedForm?.code === 'Auction_Summary_2' || selectedForm?.code === 'Auction_Bid_Classification' || selectedForm?.code === 'Auction_Central_Depository' || selectedForm?.code === 'Auction_Additional_Placement' || selectedForm?.code === 'Exchange_Contract' || selectedForm?.code === 'Exchange_Certificate'))) && (
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
          {runError && (
            <div className="mt-4 rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">
              {runError}
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
              {groupedResult && selectedForm.code === 'Blank_Form_1' && result && result.rows.length > 0 && (
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
                
                const start = (page - 1) * limit;
                const end = start + limit;
                const pagedRows = isPrinting ? result.rows : result.rows.slice(start, end);
                const totalPages = Math.ceil(result.total / limit);
                
                let totalQuantity = 0;
                let totalAmount = 0;
                result.rows.forEach((row: Record<string, unknown>) => {
                  totalQuantity += Number(row.quantity ?? 0);
                  totalAmount += Number(row.value ?? 0);
                });
                
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
                
                const start = (page - 1) * limit;
                const end = start + limit;
                const pagedRows = isPrinting ? result.rows : result.rows.slice(start, end);
                const totalPages = Math.ceil(result.total / limit);
                
                let totalQuantity = 0;
                let totalAmount = 0;
                const uniqueSecurities = new Set<string>();
                const uniqueTrades = new Set<string>();
                result.rows.forEach((row: Record<string, unknown>) => {
                  totalQuantity += Number(row.quantity ?? 0);
                  totalAmount += Number(row.value ?? 0);
                  const secCode = String(row.secCode ?? '');
                  const tradeId = String(row.id ?? '');
                  if (secCode) uniqueSecurities.add(secCode);
                  if (tradeId) uniqueTrades.add(tradeId);
                });
                
                const groupedForm3 = groupByParticipantAndClassAndSec(pagedRows);
                const form3Data: ReportTradesForm3Data = {
                  periodFrom: filters.dateFrom || '',
                  periodTo: filters.dateTo || '',
                  participants: groupedForm3,
                  totalSummary: {
                    totalQuantity,
                    totalAmount,
                    totalTrades: uniqueTrades.size,
                    totalSecurities: uniqueSecurities.size,
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
                
                const start = (page - 1) * limit;
                const end = start + limit;
                const pagedRows = isPrinting ? result.rows : result.rows.slice(start, end);
                const totalPages = Math.ceil(result.total / limit);
                
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

              {/* Если Blank_Form_9 — показываем ведомость заключенных сделок */}
              {(() => {
                if (!result || result.type !== 'table' || selectedForm?.code !== 'Blank_Form_9' || result.rows.length === 0) {
                  return null;
                }
                
                const start = (page - 1) * limit;
                const end = start + limit;
                const pagedRows = isPrinting ? result.rows : result.rows.slice(start, end);
                const totalPages = Math.ceil(result.total / limit);
                
                const groupedForm9 = groupByClassAndSecForm9(pagedRows);
                
                // Подсчет итогов по ВСЕМ данным
                let totalQuantity = 0;
                let totalValue = 0;
                const uniqueSecurities = new Set<string>();
                const uniqueTrades = new Set<string>();
                
                result.rows.forEach((row: Record<string, unknown>) => {
                  totalQuantity += Number(row.quantity ?? 0);
                  totalValue += Number(row.value ?? 0);
                  const secCode = String(row.secCode ?? '');
                  const tradeId = String(row.id ?? '');
                  if (secCode) uniqueSecurities.add(secCode);
                  if (tradeId) uniqueTrades.add(tradeId);
                });
                
                const form9Data: ReportForm9Data = {
                  periodFrom: filters.dateFrom || '',
                  periodTo: filters.dateTo || '',
                  classes: groupedForm9,
                  totalSummary: (isPrinting || page === totalPages) ? {
                    totalQuantity,
                    totalValue,
                    totalTrades: uniqueTrades.size,
                    totalSecurities: uniqueSecurities.size,
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
                        id: row.id ?? '',
                        tradeDate: String(row.tradeDate ?? ''),
                        classCode: String(row.classCode ?? ''),
                        secCode: String(row.secCode ?? ''),
                        sellerName: row.sellerName != null ? String(row.sellerName) : null,
                        sellAccount: row.sellAccount != null ? String(row.sellAccount) : null,
                        buyerName: row.buyerName != null ? String(row.buyerName) : null,
                        buyAccount: row.buyAccount != null ? String(row.buyAccount) : null,
                        quantity: Number(row.quantity ?? 0),
                        price: Number(row.price ?? 0),
                        value: Number(row.value ?? 0),
                        settleDate: row.settleDate != null ? String(row.settleDate) : null,
                        couponRate: row.couponRate != null ? Number(row.couponRate) : null,
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
                        id: row.id ?? '',
                        tradeDate: String(row.tradeDate ?? ''),
                        classCode: String(row.classCode ?? ''),
                        secCode: String(row.secCode ?? ''),
                        sellerName: row.sellerName != null ? String(row.sellerName) : null,
                        sellAccount: row.sellAccount != null ? String(row.sellAccount) : null,
                        buyerName: row.buyerName != null ? String(row.buyerName) : null,
                        buyAccount: row.buyAccount != null ? String(row.buyAccount) : null,
                        quantity: Number(row.quantity ?? 0),
                        price: Number(row.price ?? 0),
                        value: Number(row.value ?? 0),
                        settleDate: row.settleDate != null ? String(row.settleDate) : null,
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
              {result?.type === 'table' && !['Blank_Form_1', 'Blank_Form_2', 'Blank_Form_3', 'Blank_Form_6A', 'Blank_Form_9', 'Blank_Form_USD', 'Auction_Summary', 'Auction_Summary_2', 'Auction_Bid_Classification', 'Auction_Central_Depository', 'Auction_Additional_Placement', 'Exchange_Contract', 'Exchange_Certificate'].includes(selectedForm.code) && (() => {
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
  trades: TradeRow[];
}

interface ClassGroup {
  classId: string;
  securities: SecurityGroup[];
}

function groupByClassAndSec(rows: Record<string, unknown>[]): ClassGroup[] {
  const classMap = new Map<string, Map<string, TradeRow[]>>();

  for (const row of rows) {
    const classCode = String(row.classCode ?? 'Без класса');
    const secCode = String(row.secCode ?? 'Без кода');
    
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
      securities.push({ securityId, trades });
    }
    classes.push({ classId, securities });
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
interface ClassGroupForm2 {
  classId: string;
  securities: {
    securityId: string;
    tradeDate: string;
    tradesCount: number;
    totalQuantity: number;
    maxPrice: number;
    minPrice: number;
    avgPrice: number;
    lastTradePrice: number;
    lastTradeQuantity: number;
    lastTradeAmount: number;
  }[];
}

function groupByClassAndSecForm2(rows: Record<string, unknown>[]): ClassGroupForm2[] {
  const classMap = new Map<string, Map<string, Record<string, unknown>[]>>();

  // Группируем по классу и ЦБ
  for (const row of rows) {
    const classCode = String(row.classCode ?? 'Без класса');
    const secCode = String(row.secCode ?? 'Без кода');
    
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
    
    classes.push({ classId, securities });
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
        securities.push({
          secCode,
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
      
      classes.push({ classCode, securities });
    }
    
    participants.push({ participantName, classes });
  }

  return participants;
}

// Группировка для формы 6A: Класс -> ЦБ -> Сделки
function groupByClassSecAndDate(rows: Record<string, unknown>[]): ClassData[] {
  const classMap = new Map<string, Map<string, Record<string, unknown>[]>>();

  // Группируем по классу -> secCode
  for (const row of rows) {
    const classCode = String(row.classCode ?? 'Без класса');
    const secCode = String(row.secCode ?? 'Без кода');

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

  // Группируем по классу -> secCode
  for (const row of rows) {
    const classCode = String(row.classCode ?? 'Без класса');
    const secCode = String(row.secCode ?? 'Без кода');

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
      securities,
    });
  }

  return classes;
}
