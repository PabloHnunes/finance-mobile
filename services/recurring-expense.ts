import { api } from './api';
import { PaginatedResponse } from './types';
import { ExpenseCategory, PaymentType } from './expense';

export interface RecurringExpenseHistory {
  id: string;
  amount: number;
  month: number;
  year: number;
  createdAt: string;
}

export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  expenseCategory?: ExpenseCategory;
  paymentType?: PaymentType;
  isPriority: boolean;
  splitParts: number;
  userPart: number;
  dueDay: number;
  isActive: boolean;
  bankId?: string | null;
  userId: string;
  bank?: { id: string; name: string; documentType: string } | null;
  history?: RecurringExpenseHistory[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecurringExpenseRequest {
  name: string;
  amount: number;
  expenseCategory?: ExpenseCategory;
  paymentType?: PaymentType;
  isPriority?: boolean;
  splitParts?: number;
  userPart?: number;
  dueDay: number;
  startDate: string;
  bankId?: string | null;
}

export interface UpdateRecurringExpenseRequest {
  name?: string;
  amount?: number;
  expenseCategory?: ExpenseCategory;
  paymentType?: PaymentType;
  isPriority?: boolean;
  splitParts?: number;
  userPart?: number;
  dueDay?: number;
  isActive?: boolean;
  bankId?: string | null;
  fromMonth?: number;
  fromYear?: number;
}

export async function createRecurringExpense(
  userId: string,
  data: CreateRecurringExpenseRequest,
): Promise<RecurringExpense> {
  const { data: entry } = await api.post<RecurringExpense>(
    `/recurring-expenses/${userId}`,
    data,
  );
  return entry;
}

export async function getRecurringExpenses(userId: string): Promise<RecurringExpense[]> {
  const { data } = await api.get<PaginatedResponse<RecurringExpense>>(
    `/recurring-expenses/user/${userId}`,
  );
  return data.list;
}

export async function updateRecurringExpense(
  id: string,
  userId: string,
  data: UpdateRecurringExpenseRequest,
): Promise<RecurringExpense> {
  const { data: entry } = await api.put<RecurringExpense>(
    `/recurring-expenses/${id}/user/${userId}`,
    data,
  );
  return entry;
}

export async function deleteRecurringExpense(
  id: string,
  userId: string,
  month: number,
  year: number,
): Promise<void> {
  await api.delete(`/recurring-expenses/${id}/user/${userId}`, {
    params: { month, year },
  });
}

export async function generateMonthlyExpenses(
  userId: string,
  month: number,
  year: number,
) {
  const { data } = await api.post(
    `/recurring-expenses/generate/${userId}`,
    null,
    { params: { month, year } },
  );
  return data;
}
