import type { CommissionTariff, CommissionSide } from '../db/repositories/commissionTariffs.js';
import { loadCommissionTariffs, getTariffsForClassSync } from './commission-tariffs.js';

export interface CommissionContext {
  classCode?: string;
  volume: number;
  side: CommissionSide;
  tradeDate?: string;
  brokerId?: string | number;
  firmCode?: string;
}

export interface CommissionResult {
  sellerCommission?: number;
  buyerCommission?: number;
  sellerRatePercent?: number;
  buyerRatePercent?: number;
}

export function resolveTariffForVolume(
  tariffs: CommissionTariff[],
  volume: number,
  side: CommissionSide,
  tradeDate?: string,
): CommissionTariff | null {
  const v = Number(volume) || 0;
  const applicable = tariffs.filter((t) => {
    if (!t.is_active) return false;
    if (t.side !== 'both' && t.side !== side) return false;
    const fromOk = v >= Number(t.volume_from ?? 0);
    const to = t.volume_to != null ? Number(t.volume_to) : null;
    const toOk = to == null ? true : v <= to;
    return fromOk && toOk;
  });
  if (applicable.length === 0) return null;
  // Выбираем тариф с наибольшим volume_from (самый узкий верхний диапазон) и при равенстве — с меньшим id
  applicable.sort((a, b) => {
    const byFrom = Number(b.volume_from ?? 0) - Number(a.volume_from ?? 0);
    if (byFrom !== 0) return byFrom;
    return a.id - b.id;
  });
  return applicable[0];
}

export async function calculateCommissionForTrade(ctx: {
  classCode?: string;
  value?: number;
  tradeDate?: string;
}): Promise<CommissionResult> {
  const volume = Number(ctx.value ?? 0);
  if (!volume || volume <= 0) return {};

  const allTariffs = await loadCommissionTariffs();
  if (!allTariffs.length) return {};

  const tariffsForClass = getTariffsForClassSync(allTariffs, ctx.classCode);

  const sellerTariff = resolveTariffForVolume(tariffsForClass, volume, 'seller', ctx.tradeDate);
  const buyerTariff = resolveTariffForVolume(tariffsForClass, volume, 'buyer', ctx.tradeDate);
 
  const result: CommissionResult = {};

  // 1) Тариф "Обе стороны" — общая комиссия делится поровну между продавцом и покупателем.
  // discount_percent трактуем как % от суммы комиссии (а не от ставки).
  if (sellerTariff && buyerTariff && sellerTariff.id === buyerTariff.id && sellerTariff.side === 'both') {
    const baseRate = Number(sellerTariff.rate_percent);
    const discount = sellerTariff.discount_percent != null ? Number(sellerTariff.discount_percent) : 0;

    const rawCommission = (volume * baseRate) / 100;
    const cap = sellerTariff.max_commission != null ? Number(sellerTariff.max_commission) : null;
    let totalCommission = cap != null ? Math.min(rawCommission, cap) : rawCommission;
    if (discount) {
      totalCommission = totalCommission * (1 - discount / 100);
    }
    const halfCommission = totalCommission / 2;
    const perSideRate = baseRate / 2;

    result.sellerRatePercent = perSideRate;
    result.buyerRatePercent = perSideRate;
    result.sellerCommission = halfCommission;
    result.buyerCommission = halfCommission;

    return result;
  }

  // 2) Отдельный тариф для продавца
  if (sellerTariff) {
    const baseRate = Number(sellerTariff.rate_percent);
    const discount = sellerTariff.discount_percent != null ? Number(sellerTariff.discount_percent) : 0;
    let rate = baseRate;

    let commission = (volume * rate) / 100;
    if (discount) {
      commission = commission * (1 - discount / 100);
    }
    const cap = sellerTariff.max_commission != null ? Number(sellerTariff.max_commission) : null;
    if (cap != null) {
      commission = Math.min(commission, cap);
    }

    // Если сторона тарифа "продавец", считаем, что ставка задана для обеих сторон и продавец платит только половину
    if (sellerTariff.side === 'seller') {
      rate = rate / 2;
      commission = commission / 2;
    }

    result.sellerRatePercent = rate;
    result.sellerCommission = commission;
  }

  // 3) Отдельный тариф для покупателя — платит половину комиссии по своему тарифу
  if (buyerTariff) {
    const baseRate = Number(buyerTariff.rate_percent);
    const discount = buyerTariff.discount_percent != null ? Number(buyerTariff.discount_percent) : 0;
    let rate = baseRate;

    let commission = (volume * rate) / 100;
    if (discount) {
      commission = commission * (1 - discount / 100);
    }
    const cap = buyerTariff.max_commission != null ? Number(buyerTariff.max_commission) : null;
    if (cap != null) {
      commission = Math.min(commission, cap);
    }

    if (buyerTariff.side === 'buyer') {
      rate = rate / 2;
      commission = commission / 2;
    }

    result.buyerRatePercent = rate;
    result.buyerCommission = commission;
  }

  return result;
}

