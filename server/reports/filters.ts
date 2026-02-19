import type { Trade } from '../types/index.js';

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  brokerId?: number;
  firmCode?: string;
  instrument?: string;
  classCode?: string;
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
    result = result.filter((t) => {
      const brokerId = filters.brokerId!;
      const isFirm = Number(t.brokerId) === brokerId || String(t.brokerCode) === String(brokerId);
      const isCounterparty = String((t as any).counterparty ?? '') === String(brokerId);
      return isFirm || isCounterparty;
    });
  }
  if (filters.firmCode) {
    const fc = filters.firmCode;
    result = result.filter((t) => String(t.brokerCode ?? '') === fc);
  }
  if (filters.classCode) {
    const cc = filters.classCode.toLowerCase();
    result = result.filter((t) => {
      return String((t as Record<string, unknown>).classCode ?? '').toLowerCase() === cc;
    });
  }
  if (filters.instrument) {
    const inst = filters.instrument.toLowerCase();
    result = result.filter((t) => {
      const secCode = String((t as any).secCode ?? t.instrument ?? '').toLowerCase();
      return secCode === inst || secCode.includes(inst);
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
