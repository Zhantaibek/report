import type { CommissionTariff } from '../db/repositories/commissionTariffs.js';
import { getAllCommissionTariffs } from '../db/repositories/commissionTariffs.js';

let cachedTariffs: CommissionTariff[] | null = null;
let lastLoadedAt: number | null = null;
const CACHE_TTL_MS = 60_000;

export async function loadCommissionTariffs(force = false): Promise<CommissionTariff[]> {
  const now = Date.now();
  if (!force && cachedTariffs && lastLoadedAt && now - lastLoadedAt < CACHE_TTL_MS) {
    return cachedTariffs;
  }
  const rows = await getAllCommissionTariffs();
  cachedTariffs = rows;
  lastLoadedAt = now;
  return rows;
}

export function clearCommissionTariffsCache() {
  cachedTariffs = null;
  lastLoadedAt = null;
}

export function getTariffsForClassSync(all: CommissionTariff[], classCode?: string): CommissionTariff[] {
  const code = (classCode ?? '').trim();
  const lower = code.toLowerCase();

  const exact = all.filter((t) => (t.class_code ?? '').toLowerCase() === lower);
  if (exact.length > 0) return exact;

  if (code) {
    const prefix = all.filter((t) => {
      const cc = (t.class_code ?? '').toLowerCase();
      return cc && lower.startsWith(cc);
    });
    if (prefix.length > 0) return prefix;
  }

  return all.filter((t) => t.class_code == null || t.class_code === '');
}

