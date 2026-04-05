import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getExpenses, ExpenseEntry } from '@/services/expense';

function fetchExpensesList(userId: string, month: number, year: number) {
  return async () => {
    const response = await getExpenses(userId, month, year);
    return response.list;
  };
}

export function useExpenses(userId: string | undefined, month: number, year: number) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['expenses', userId, month, year],
    queryFn: fetchExpensesList(userId!, month, year),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  // Prefetch apenas meses adjacentes (evita chamadas paralelas em massa)
  useEffect(() => {
    if (!userId) return;

    let prevM = month - 1, prevY = year;
    if (prevM < 1) { prevM = 12; prevY--; }

    let nextM = month + 1, nextY = year;
    if (nextM > 12) { nextM = 1; nextY++; }

    queryClient.prefetchQuery({
      queryKey: ['expenses', userId, prevM, prevY],
      queryFn: fetchExpensesList(userId, prevM, prevY),
      staleTime: 1000 * 60 * 5,
    });

    queryClient.prefetchQuery({
      queryKey: ['expenses', userId, nextM, nextY],
      queryFn: fetchExpensesList(userId, nextM, nextY),
      staleTime: 1000 * 60 * 5,
    });
  }, [userId, month, year, queryClient]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['expenses', userId, month, year] });
  }

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['expenses', userId] });
  }

  async function removeFromCache(expenseId: string, recurringExpenseId?: string | null) {
    queryClient.setQueriesData<ExpenseEntry[]>(
      { queryKey: ['expenses', userId] },
      (old) => old?.filter((e) => {
        if (e.id === expenseId) return false;
        if (recurringExpenseId && e.recurringExpenseId === recurringExpenseId) return false;
        return true;
      }),
    );
  }

  function refetchAfterMutation() {
    setTimeout(() => invalidateAll(), 500);
  }

  return { ...query, invalidate, invalidateAll, removeFromCache, refetchAfterMutation };
}
