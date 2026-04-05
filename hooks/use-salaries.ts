import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSalaries } from '@/services/salary';

export function useSalaries(userId: string | undefined, month: number, year: number) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['salaries', userId, month, year],
    queryFn: () => getSalaries(userId!, month, year),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['salaries', userId] });
  }

  return { ...query, invalidateAll };
}
