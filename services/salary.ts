import { api } from './api';
import { PaginatedResponse } from './types';

export interface Salary {
  id: string;
  name: string;
  isMain: boolean;
  userId: string;
  createdAt: string;
  updatedAt: string;
  history: SalaryHistory[];
}

export interface SalaryHistory {
  id: string;
  amount: number;
  month: number;
  year: number;
  salaryId: string;
  createdAt: string;
}

export interface CreateSalaryRequest {
  name: string;
  isMain?: boolean;
  amount: number;
  month?: number;
  year?: number;
}

export async function createSalary(userId: string, data: CreateSalaryRequest): Promise<Salary> {
  const { data: salary } = await api.post<Salary>(`/salaries/${userId}`, data);
  return salary;
}

export interface SalaryWithAmount extends Salary {
  activeAmount?: number;
}

export async function getSalaries(
  userId: string,
  month?: number,
  year?: number,
): Promise<SalaryWithAmount[]> {
  const { data } = await api.get<PaginatedResponse<SalaryWithAmount>>(
    `/salaries/user/${userId}`,
    { params: { ...(month && year ? { month, year } : {}) } },
  );
  return data.list;
}

export interface UpdateSalaryRequest {
  name?: string;
  isMain?: boolean;
  amount?: number;
  month?: number;
  year?: number;
}

export async function updateSalary(id: string, userId: string, data: UpdateSalaryRequest): Promise<Salary> {
  const { data: salary } = await api.put<Salary>(`/salaries/${id}/user/${userId}`, data);
  return salary;
}

export async function deleteSalary(id: string, userId: string): Promise<void> {
  await api.delete(`/salaries/${id}/user/${userId}`);
}
