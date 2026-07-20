import type { Trade } from '../types/index.js';

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  brokerId?: number;
  firmCode?: string | string[];
  instrument?: string | string[];
  classCode?: string | string[];
}

/** Нормализация фильтра к массиву непустых строк. */
export function normalizeFilterValues(v?: string | string[] | null): string[] | undefined {
  if (v == null) return undefined;
  const list = (Array.isArray(v) ? v : [v]).map((x) => String(x).trim()).filter(Boolean);
  return list.length > 0 ? list : undefined;
}

/** Участник = покупатель или продавец (в QUIK на сделку две ноги). */
function tradeMatchesFirm(t: Trade, firmCode: string): boolean {
  const row = t as Record<string, unknown>;
  const ids = [
    row.brokerCode,
    row.brokerId,
    row.buyerId,
    row.sellerId,
    row.counterparty,
    row.buyerFirmId,
    row.sellerFirmId,
    row.firmId,
    row.firm_id,
  ];
  return ids.some((id) => id != null && String(id) === firmCode);
}

export function applyFilters(trades: Trade[], filters: ReportFilters): Trade[] {
  let result = trades;
  if (filters.dateFrom) {
    result = result.filter((t) => {
      const dt = t.dealTime ?? (t as Record<string, unknown>).dealDate ?? (t as Record<string, unknown>).tradeDate;
      if (!dt) return false;
      const dateStr = dt instanceof Date ? dt.toISOString().slice(0, 10) : String(dt).slice(0, 10);
      return dateStr >= filters.dateFrom!;
    });
  }
  if (filters.dateTo) {
    result = result.filter((t) => {
      const dt = t.dealTime ?? (t as Record<string, unknown>).dealDate ?? (t as Record<string, unknown>).tradeDate;
      if (!dt) return false;
      const dateStr = dt instanceof Date ? dt.toISOString().slice(0, 10) : String(dt).slice(0, 10);
      return dateStr <= filters.dateTo!;
    });
  }
  if (filters.brokerId != null) {
    const brokerId = String(filters.brokerId);
    result = result.filter((t) => tradeMatchesFirm(t, brokerId));
  }
  const firmCodes = normalizeFilterValues(filters.firmCode);
  if (firmCodes) {
    result = result.filter((t) => firmCodes.some((fc) => tradeMatchesFirm(t, fc)));
  }
  const classCodes = normalizeFilterValues(filters.classCode);
  if (classCodes) {
    const set = new Set(classCodes.map((c) => c.toLowerCase()));
    result = result.filter((t) => {
      const row = t as Record<string, unknown>;
      const code = String(row.classCode ?? row.class_code ?? '').toLowerCase();
      return set.has(code);
    });
  }
  const instruments = normalizeFilterValues(filters.instrument);
  if (instruments) {
    const pats = instruments.map((i) => i.toLowerCase());
    result = result.filter((t) => {
      const row = t as Record<string, unknown>;
      const secCode = String(
        row.secCode ?? row.sec_code ?? row.cur_sec_code ?? row.registration_number ?? t.instrument ?? '',
      ).toLowerCase();
      return pats.some((inst) => secCode === inst || secCode.includes(inst));
    });
  }
  return result;
}

/** Add dealDate (YYYY-MM-DD) for grouping if dealTime exists */
export function normalizeTradesForReport(trades: Trade[]): Trade[] {
  return trades.map((t) => {
    const dealTime = t.dealTime ?? (t as Record<string, unknown>).dealDate ?? (t as Record<string, unknown>).tradeDate;
    let dealDate: string | undefined;
    if (dealTime) {
      dealDate = dealTime instanceof Date ? dealTime.toISOString().slice(0, 10) : String(dealTime).slice(0, 10);
    }
    return { ...t, dealDate };
  });
}
