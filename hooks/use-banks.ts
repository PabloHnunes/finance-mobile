import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getBanks } from '@/services/bank';

export function useBanks(userId: string | undefined) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['banks', userId],
    queryFn: () => getBanks(userId!),
    enabled: !!userId,
    staleTime: 1000 * 60 * 10,  // 10 min — bancos mudam raramente
    gcTime: 1000 * 60 * 60,      // 1h em cache
  });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['banks', userId] });
  }

  return { ...query, invalidate };
}
