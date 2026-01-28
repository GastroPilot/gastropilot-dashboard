'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Stale time of 30 seconds for most queries
            staleTime: 30 * 1000,
            // Refetch on window focus for fresh data
            refetchOnWindowFocus: true,
            // Retry failed queries up to 2 times
            retry: 2,
            // Don't refetch on reconnect immediately
            refetchOnReconnect: 'always',
          },
          mutations: {
            // Retry mutations once on failure
            retry: 1,
          },
        },
      })
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
