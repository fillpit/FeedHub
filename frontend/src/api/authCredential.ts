import request from '@/utils/request';
import type { AuthCredential } from '@/types/authCredential';

const baseUrl = '/api/auth-credential';

export const authCredentialApi = {
  getAll: () => request.get<AuthCredential[]>(baseUrl),
  getById: (id: number) => request.get<AuthCredential>(`${baseUrl}/${id}`),
  create: (data: Partial<AuthCredential>) => request.post<AuthCredential>(baseUrl, data),
  update: (id: number, data: Partial<AuthCredential>) => request.put<AuthCredential>(`${baseUrl}/${id}`, data),
  delete: (id: number) => request.delete(`${baseUrl}/${id}`),
}; 