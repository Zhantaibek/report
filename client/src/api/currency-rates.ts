import { api } from './client.ts';

export interface CurrencyRate {
  id: number;
  currencyCode: string;
  rateDate: string;
  rate: number;
  updatedAt: string;
}

export function getCurrencyRates(): Promise<CurrencyRate[]> {
  return api.get('/currency-rates/latest');
}

export function getCurrencyRatesHistory(): Promise<CurrencyRate[]> {
  return api.get('/currency-rates');
}

export function refreshCurrencyRates(): Promise<{ ok: boolean; status: 'updated' | 'skipped'; rates: CurrencyRate[] }> {
  return api.post('/currency-rates/refresh', {});
}

export function createCurrencyRate(data: { currency_code: string; rate_date: string; rate: number }): Promise<{ ok: boolean }> {
  return api.post('/currency-rates', data);
}

export function updateCurrencyRate(id: number, data: { currency_code: string; rate_date: string; rate: number }): Promise<{ ok: boolean }> {
  return api.put(`/currency-rates/${id}`, data);
}

export function deleteCurrencyRate(id: number): Promise<{ ok: boolean }> {
  return api.delete(`/currency-rates/${id}`);
}
