import { api } from './client.ts';

export interface CurrencyRate {
  currencyCode: string;
  rateDate: string;
  rate: number;
  baseCurrency: string;
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
