import { api } from './client';

export interface QuikUserRow {
  id: number;
  uid: number;
  last_name: string | null;
  first_name: string | null;
  patronymic: string | null;
  login: string | null;
  date_from: string | null;
  date_to: string | null;
  org_code: string | null;
  org_name: string | null;
  blocked: boolean;
  comment: string | null;
  is_service: boolean;
  main_uid: number | null;
  last_login: string | null;
  created_at: string;
}

export interface QuikUserBody {
  uid: number;
  last_name: string;
  first_name?: string | null;
  patronymic?: string | null;
  login?: string | null;
  date_from?: string | null;
  date_to?: string | null;
  org_code?: string | null;
  org_name?: string | null;
  blocked?: boolean;
  comment?: string | null;
  is_service?: boolean;
  main_uid?: number | null;
}

export interface QuikUsersImportResult {
  count: number;
}

export function getQuikUsers() {
  return api.get<QuikUserRow[]>('/quik-users');
}

export function createQuikUser(body: QuikUserBody) {
  return api.post<QuikUserRow>('/quik-users', body);
}

export function updateQuikUser(id: number, body: Partial<QuikUserBody>) {
  return api.put<QuikUserRow>(`/quik-users/${id}`, body);
}

export function deleteQuikUser(id: number) {
  return api.delete(`/quik-users/${id}`);
}

export function importQuikUsers(fileBase64: string) {
  return api.post<QuikUsersImportResult>('/quik-users/import', { fileBase64 });
}
