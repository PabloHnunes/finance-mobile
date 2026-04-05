import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getBalance } from '@/services/balance';

export function useBalance(userId: string | undefined, month: number, year: number) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['balance', userId, month, year],
    queryFn: () => getBalance(userId!, month, year),
    enabled: !!userId,
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['balance', userId, month, year] });
  }

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['balance', userId] });
  }

  return { ...query, invalidate, invalidateAll };
}
