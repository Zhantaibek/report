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

function isTariffActiveForDate(t: CommissionTariff, date?: string): boolean {
  if (!date) return true;
  const d = date.slice(0, 10);
  if (t.valid_from && d < t.valid_from.toString()) return false;
  if (t.valid_to && d > t.valid_to.toString()) return false;
  return t.is_active;
}

export function resolveTariffForVolume(
  tariffs: CommissionTariff[],
  volume: number,
  side: CommissionSide,
  tradeDate?: string,
): CommissionTariff | null {
  const v = Number(volume) || 0;
  const applicable = tariffs.filter((t) => {
    if (!isTariffActiveForDate(t, tradeDate)) return false;
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

function applyDiscount(baseRate: number, tariff: CommissionTariff, _ctx: CommissionContext): number {
  const discount = tariff.discount_percent != null ? Number(tariff.discount_percent) : 0;
  if (!discount) return baseRate;
  return baseRate - discount;
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

  // 1) Тариф "Обе стороны" — общая комиссия делится поровну между продавцом и покупателем
  if (sellerTariff && buyerTariff && sellerTariff.id === buyerTariff.id && sellerTariff.side === 'both') {
    const baseRate = Number(sellerTariff.rate_percent);
    const rate = applyDiscount(baseRate, sellerTariff, {
      classCode: ctx.classCode,
      volume,
      side: 'seller',
      tradeDate: ctx.tradeDate,
    });
    const rawCommission = (volume * rate) / 100;
    const cap = sellerTariff.max_commission != null ? Number(sellerTariff.max_commission) : null;
    const totalCommission = cap != null ? Math.min(rawCommission, cap) : rawCommission;
    const halfCommission = totalCommission / 2;
    const perSideRate = rate / 2;

    result.sellerRatePercent = perSideRate;
    result.buyerRatePercent = perSideRate;
    result.sellerCommission = halfCommission;
    result.buyerCommission = halfCommission;

    return result;
  }

  // 2) Отдельный тариф для продавца
  if (sellerTariff) {
    const baseRate = Number(sellerTariff.rate_percent);
    let rate = applyDiscount(baseRate, sellerTariff, {
      classCode: ctx.classCode,
      volume,
      side: 'seller',
      tradeDate: ctx.tradeDate,
    });
    let rawCommission = (volume * rate) / 100;
    const cap = sellerTariff.max_commission != null ? Number(sellerTariff.max_commission) : null;
    let commission = cap != null ? Math.min(rawCommission, cap) : rawCommission;

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
    let rate = applyDiscount(baseRate, buyerTariff, {
      classCode: ctx.classCode,
      volume,
      side: 'buyer',
      tradeDate: ctx.tradeDate,
    });
    let rawCommission = (volume * rate) / 100;
    const cap = buyerTariff.max_commission != null ? Number(buyerTariff.max_commission) : null;
    let commission = cap != null ? Math.min(rawCommission, cap) : rawCommission;

    if (buyerTariff.side === 'buyer') {
      rate = rate / 2;
      commission = commission / 2;
    }

    result.buyerRatePercent = rate;
    result.buyerCommission = commission;
  }

  return result;
}

