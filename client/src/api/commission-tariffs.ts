import { api } from './client';

export type CommissionSide = 'seller' | 'buyer' | 'both';

export interface CommissionTariffRow {
  id: number;
  class_code: string | null;
  volume_from: number;
  volume_to: number | null;
  side: CommissionSide;
  rate_percent: number;
  discount_percent: number | null;
  max_commission: number | null;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
}

export interface CreateTariffBody {
  class_code?: string | null;
  volume_from: number;
  volume_to?: number | null;
  side: CommissionSide;
  rate_percent: number;
  discount_percent?: number | null;
  max_commission?: number | null;
  valid_from?: string | null;
  valid_to?: string | null;
  is_active?: boolean;
}

export interface UpdateTariffBody {
  class_code?: string | null;
  volume_from?: number;
  volume_to?: number | null;
  side?: CommissionSide;
  rate_percent?: number;
  discount_percent?: number | null;
  max_commission?: number | null;
  valid_from?: string | null;
  valid_to?: string | null;
  is_active?: boolean;
}

export function getCommissionTariffs() {
  return api.get<CommissionTariffRow[]>('/commission-tariffs');
}

export function createCommissionTariff(body: CreateTariffBody) {
  return api.post<CommissionTariffRow>('/commission-tariffs', body);
}

export function updateCommissionTariff(id: number, body: UpdateTariffBody) {
  return api.put<CommissionTariffRow>(`/commission-tariffs/${id}`, body);
}

export function deleteCommissionTariff(id: number) {
  return api.delete(`/commission-tariffs/${id}`);
}
