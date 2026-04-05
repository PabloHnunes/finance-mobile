import { api } from './api';

export type FinancingType = 'PERSONAL_LOAN' | 'VEHICLE' | 'PROPERTY' | 'OTHER';
export type AmortizationType = 'SAC' | 'PRICE';
export type FeeType = 'FIXED' | 'ON_BALANCE' | 'ON_INSTALLMENT' | 'ON_TOTAL_AMOUNT';

export interface FinancingFee {
  name: string;
  type: FeeType;
  value: number;
}

export interface FinancingDetail {
  id: string;
  financingType: FinancingType;
  amortizationType: AmortizationType;
  totalAmount: number;
  interestRate: number;
  totalInstallments: number;
  paidInstallments: number;
  startMonth: number;
  startYear: number;
  expenseEntryId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFinancingRequest {
  description?: string;
  financingType: FinancingType;
  amortizationType: AmortizationType;
  totalAmount: number;
  interestRate?: number;
  nominalAnnualRate?: number;
  effectiveAnnualRate?: number;
  monetaryCorrection?: number;
  fees?: FinancingFee[];
  totalInstallments: number;
  paidInstallments?: number;
  startMonth: number;
  startYear: number;
  bankId?: string;
  paymentType?: string;
  splitParts?: number;
  userPart?: number;
}

export async function createFinancing(
  userId: string,
  data: CreateFinancingRequest,
): Promise<FinancingDetail> {
  const { data: financing } = await api.post<FinancingDetail>(
    `/financings/${userId}`,
    data,
  );
  return financing;
}

export async function getFinancings(userId: string): Promise<FinancingDetail[]> {
  const { data } = await api.get<FinancingDetail[]>(
    `/financings/user/${userId}`,
  );
  return data;
}

export async function getFinancingInstallments(id: string, userId: string) {
  const { data } = await api.get(`/financings/${id}/user/${userId}/installments`);
  return data;
}

export async function getFinancingSchedule(id: string, userId: string) {
  const { data } = await api.get(`/financings/${id}/user/${userId}/schedule`);
  return data;
}

export async function updateFinancing(
  id: string,
  userId: string,
  data: { description?: string; paidInstallments?: number; interestRate?: number; splitParts?: number; userPart?: number; bankId?: string; fromMonth?: number; fromYear?: number },
) {
  const { data: financing } = await api.put(`/financings/${id}/user/${userId}`, data);
  return financing;
}

export async function deleteFinancing(id: string, userId: string): Promise<void> {
  await api.delete(`/financings/${id}/user/${userId}`);
}

export async function deleteFinancingAll(id: string, userId: string): Promise<void> {
  await api.delete(`/financings/${id}/user/${userId}/all`);
}
