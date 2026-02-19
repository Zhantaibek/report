import { api } from './client.ts';

export interface Broker {
  id: number;
  name: string;
  code: string | null;
}

export function getBrokers(): Promise<Broker[]> {
  return api.get('/brokers');
}
