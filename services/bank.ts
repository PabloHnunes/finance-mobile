import { api } from './api';
import { PaginatedResponse } from './types';

export type DocumentType = 'PF' | 'CNPJ';

export interface Bank {
  id: string;
  name: string;
  description?: string;
  documentType: DocumentType;
  documentNumber: string;
  color?: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBankRequest {
  name: string;
  description?: string;
  documentType: DocumentType;
  documentNumber: string;
  color?: string;
}

export async function createBank(userId: string, data: CreateBankRequest): Promise<Bank> {
  const { data: bank } = await api.post<Bank>(`/banks/${userId}`, data);
  return bank;
}

export async function getBanks(userId: string): Promise<Bank[]> {
  const { data } = await api.get<PaginatedResponse<Bank>>(`/banks/user/${userId}`);
  return data.list;
}

export interface UpdateBankRequest {
  name?: string;
  description?: string;
  color?: string | null;
}

export async function updateBank(id: string, userId: string, data: UpdateBankRequest): Promise<Bank> {
  const { data: bank } = await api.put<Bank>(`/banks/${id}/user/${userId}`, data);
  return bank;
}

export async function deleteBank(id: string, userId: string): Promise<void> {
  await api.delete(`/banks/${id}/user/${userId}`);
}
