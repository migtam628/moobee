import { QueryClient } from '@tanstack/react-query';
import { TmdbError } from '@/api/tmdb';

const MAX_RETRIES = 2;

/**
 * Retry only failures that can plausibly succeed on a second attempt. A 401, 404 or a malformed
 * response will fail identically every time, so retrying just delays the error state.
 */
export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  if (failureCount >= MAX_RETRIES) return false;
  return error instanceof TmdbError ? error.retryable : false;
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // TMDB list data changes slowly; serve from cache and dedupe identical requests.
        staleTime: 5 * 60_000,
        gcTime: 30 * 60_000,
        retry: shouldRetryQuery,
        refetchOnWindowFocus: false,
      },
    },
  });
}
