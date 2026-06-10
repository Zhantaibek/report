import { api } from './client';

export interface EmitentRow {
  id: number;
  name: string | null;
  address: string | null;
  city: number | null;
  area: number | null;
  state: number | null;
  code: string | null;
  infusion: number | null;
  price: number | null;
  ind: number | null;
  name_eng: string | null;
}

export interface CreateEmitentBody {
  name: string;
  address?: string | null;
  city?: number | null;
  area?: number | null;
  state?: number | null;
  code?: string | null;
  infusion?: number | null;
  price?: number | null;
  ind?: number | null;
  name_eng?: string | null;
}

export interface UpdateEmitentBody {
  name?: string;
  address?: string | null;
  city?: number | null;
  area?: number | null;
  state?: number | null;
  code?: string | null;
  infusion?: number | null;
  price?: number | null;
  ind?: number | null;
  name_eng?: string | null;
}

export function getEmitents() {
  return api.get<EmitentRow[]>('/emitents');
}

export function createEmitent(body: CreateEmitentBody) {
  return api.post<EmitentRow>('/emitents', body);
}

export function updateEmitent(id: number, body: UpdateEmitentBody) {
  return api.put<EmitentRow>(`/emitents/${id}`, body);
}

export function deleteEmitent(id: number) {
  return api.delete(`/emitents/${id}`);
}
