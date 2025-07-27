import request from '@/utils/request';
import type { AuthCredential } from '@/types';

const baseUrl = '/api/auth-credential';

export const authCredentialApi = {
  getAll: () => request.get<AuthCredential[]>(baseUrl),
  getById: (id: number) => request.get<AuthCredential>(`${baseUrl}/${id}`),
  create: (data: Partial<AuthCredential>) => request.post<AuthCredential>(baseUrl, data, { showSuccessMessage: true, successMessage: '凭据创建成功！' }),
  update: (id: number, data: Partial<AuthCredential>) => request.put<AuthCredential>(`${baseUrl}/${id}`, data, { showSuccessMessage: true, successMessage: '凭据更新成功！' }),
  delete: (id: number) => request.delete(`${baseUrl}/${id}`, { showSuccessMessage: true, successMessage: '凭据删除成功！' }),
};