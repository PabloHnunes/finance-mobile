import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,      // 2 min — dados ficam "frescos"
      gcTime: 1000 * 60 * 30,         // 30 min — cache mantido em memória
      refetchOnWindowFocus: false,
    },
  },
});

export { queryClient, QueryClientProvider };
