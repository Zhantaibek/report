import { api } from './client.ts';

export interface CurrencyRate {
  currencyCode: string;
  rate: number;
  baseCurrency: string;
  updatedAt: string;
}

export function getCurrencyRates(): Promise<CurrencyRate[]> {
  return api.get('/currency-rates');
}
