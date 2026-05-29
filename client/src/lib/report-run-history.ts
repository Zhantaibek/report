import type { RunFilters } from '../api/reports.ts';

export const REPORT_RUN_HISTORY_MAX = 10;
const STORAGE_PREFIX = 'quik_reports_recent_runs';

export interface SavedReportRun {
  id: string;
  savedAt: number;
  reportFormId: string;
  reportFormLabel: string;
  filters: RunFilters;
  selectedOwnId?: number;
  summary: string;
  /** Число записей в последнем результате; 0 — данных нет. */
  resultCount?: number;
}

function storageKey(userKey: string): string {
  return `${STORAGE_PREFIX}:${userKey}`;
}

function runsEqual(a: SavedReportRun, b: SavedReportRun): boolean {
  return (
    a.reportFormId === b.reportFormId &&
    a.selectedOwnId === b.selectedOwnId &&
    JSON.stringify(a.filters) === JSON.stringify(b.filters)
  );
}

export function loadReportRunHistory(userKey: string): SavedReportRun[] {
  try {
    const raw = localStorage.getItem(storageKey(userKey));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedReportRun[];
    if (!Array.isArray(parsed)) return [];
    const trimmed = parsed.slice(0, REPORT_RUN_HISTORY_MAX);
    if (trimmed.length < parsed.length) {
      try {
        localStorage.setItem(storageKey(userKey), JSON.stringify(trimmed));
      } catch {
        /* quota / private mode */
      }
    }
    return trimmed;
  } catch {
    return [];
  }
}

export function saveReportRun(userKey: string, entry: SavedReportRun): SavedReportRun[] {
  const prev = loadReportRunHistory(userKey);
  const next = [entry, ...prev.filter((r) => !runsEqual(r, entry))].slice(0, REPORT_RUN_HISTORY_MAX);
  try {
    localStorage.setItem(storageKey(userKey), JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
  return next;
}
