import { QueryClient } from '@tanstack/react-query'

import { isApiError } from '@/lib/api'

/**
 * Shared query client. 4xx responses are deterministic (a 404 will not fix
 * itself), so only transient 5xx/network failures are retried.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (isApiError(error) && error.status < 500) return false
        return failureCount < 2
      },
    },
    mutations: {
      retry: false,
    },
  },
})
