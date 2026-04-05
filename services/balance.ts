import { api } from './api';

export interface BalanceData {
  period: {
    month: number;
    year: number;
  };
  totalSalary: number;
  totalExpenses: number;
  balance: number;
  expensesByCategory: Record<string, number>;
  expensesByPaymentType: Record<string, number>;
}

export async function getBalance(
  userId: string,
  month: number,
  year: number,
): Promise<BalanceData> {
  const { data } = await api.get<BalanceData>(
    `/balance/user/${userId}`,
    { params: { month, year } },
  );
  return data;
}
