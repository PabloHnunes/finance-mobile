import { api } from './api';
import { PaginatedResponse } from './types';

export type ExpenseCategory =
  | 'LEISURE'
  | 'LOAN'
  | 'FINANCING'
  | 'GROCERIES'
  | 'TRANSPORTATION'
  | 'UTILITIES'
  | 'HEALTHCARE'
  | 'EDUCATION';

export type PaymentType =
  | 'DEBIT'
  | 'CREDIT'
  | 'PIX'
  | 'CASH'
  | 'TRANSFER'
  | 'BOLETO';

export interface ExpenseEntry {
  id: string;
  amount: number;
  expenseCategory?: ExpenseCategory;
  paymentType?: PaymentType;
  isPriority: boolean;
  splitParts: number;
  userPart: number;
  bankId?: string | null;
  installmentCount: number;
  installmentNumber?: number;
  recurringExpenseId?: string;
  recurringExpense?: { id: string; name: string } | null;
  installmentGroupId?: string;
  financingDetail?: {
    id: string;
    financingType: string;
    amortizationType: string;
    totalAmount: number;
    interestRate: number;
    monetaryCorrection: number;
    totalInstallments: number;
    paidInstallments: number;
    fees?: { name: string; type: string; value: number }[];
  } | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  bank?: { id: string; name: string; documentType: string } | null;
}

export interface CreateExpenseRequest {
  amount: number;
  expenseCategory?: ExpenseCategory;
  paymentType?: PaymentType;
  date?: string;
  splitParts?: number;
  userPart?: number;
  bankId?: string | null;
  installmentCount?: number;
  installmentNumber?: number;
}

export async function createExpense(
  userId: string,
  data: CreateExpenseRequest,
): Promise<ExpenseEntry> {
  const { data: entry } = await api.post<ExpenseEntry>(
    `/expense-entries/${userId}`,
    data,
  );
  return entry;
}

export async function getExpenses(
  userId: string,
  month?: number,
  year?: number,
  limit?: number,
  offset?: number,
): Promise<PaginatedResponse<ExpenseEntry>> {
  const { data } = await api.get<PaginatedResponse<ExpenseEntry>>(
    `/expense-entries/user/${userId}`,
    { params: { ...(month && year ? { month, year } : {}), limit, offset } },
  );
  return data;
}

export async function updateExpense(
  id: string,
  userId: string,
  data: Partial<CreateExpenseRequest>,
): Promise<ExpenseEntry> {
  const { data: entry } = await api.put<ExpenseEntry>(
    `/expense-entries/${id}/user/${userId}`,
    data,
  );
  return entry;
}

export async function deleteExpense(
  id: string,
  userId: string,
  cancelFuture?: boolean,
): Promise<void> {
  await api.delete(`/expense-entries/${id}/user/${userId}`, {
    params: cancelFuture ? { cancelFuture: true } : undefined,
  });
}

export async function settleInstallments(
  id: string,
  userId: string,
): Promise<{ settled: boolean; fromInstallment: number }> {
  const { data } = await api.post(
    `/expense-entries/${id}/user/${userId}/settle`,
  );
  return data;
}
