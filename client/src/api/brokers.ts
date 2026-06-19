import { api } from './client';

export interface BrokerRow {
  id: number;
  name: string;
  email: string;
  firm_id: string | null;
  address: string | null;
  contacts: string | null;
  is_active: boolean;
  created_at: string;
}

export interface CreateBrokerBody {
  name: string;
  email: string;
  firm_id?: string | null;
  address?: string | null;
  contacts?: string | null;
  is_active?: boolean;
}

export interface UpdateBrokerBody {
  name?: string;
  email?: string;
  firm_id?: string | null;
  address?: string | null;
  contacts?: string | null;
  is_active?: boolean;
}

export function getBrokers() {
  return api.get<BrokerRow[]>('/brokers');
}

export function createBroker(body: CreateBrokerBody) {
  return api.post<BrokerRow>('/brokers', body);
}

export function updateBroker(id: number, body: UpdateBrokerBody) {
  return api.put<BrokerRow>(`/brokers/${id}`, body);
}

export function deleteBroker(id: number) {
  return api.delete(`/brokers/${id}`);
}
