'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { ApiError } from '@/lib/api/client';

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const shouldRetryQuery = (failureCount: number, error: unknown): boolean => {
    if (error instanceof ApiError) {
      if (error.status >= 400 && error.status < 500) {
        return false;
      }
      return error.status >= 500 && failureCount < 1;
    }

    return failureCount < 1;
  };

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Keep data warm for short periods to reduce duplicate reads.
            staleTime: 30 * 1000,
            // Avoid request bursts when users switch back to the tab.
            refetchOnWindowFocus: false,
            // Revalidate once after network recovers.
            refetchOnReconnect: true,
            // Skip retries for 4xx and do only one retry for transient errors.
            retry: shouldRetryQuery,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
          },
          mutations: {
            // Retry mutations once on failure
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
