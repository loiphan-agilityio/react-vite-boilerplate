import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { type ApiError, InvalidResponseError, NetworkError, ServerError } from '@/lib/api/errors';
import { reportError } from '@/lib/report-error';

declare module '@tanstack/react-query' {
  interface Register {
    /** `runEffect` rejects with an `ApiError`, so that is the type of every `query.error`. */
    defaultError: ApiError;
  }
}

/** Only failures that can succeed on a second try are retried; 4xx answers will not change. */
const isTransient = (error: ApiError) =>
  error instanceof NetworkError || (error instanceof ServerError && error.status >= 500);

/**
 * A bug, not a state the screen already explains: the server failed (5xx) or answered with a body
 * that breaks its schema. A 4xx or a lost connection is the user's to see, not to report.
 */
const isUnexpected = (error: ApiError) =>
  error instanceof InvalidResponseError || (error instanceof ServerError && error.status >= 500);

export const createQueryClient = () =>
  new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (isUnexpected(error)) {
          reportError(error, { source: 'query', where: JSON.stringify(query.queryKey) });
        }
      },
    }),
    mutationCache: new MutationCache({
      onError: (error) => {
        if (isUnexpected(error)) reportError(error, { source: 'mutation' });
      },
    }),
    defaultOptions: {
      queries: {
        // Avoid refetching the same data on every route change.
        staleTime: 30_000,
        retry: (failureCount, error) => failureCount < 1 && isTransient(error),
      },
      // Mutations are not idempotent: never retry them automatically.
      mutations: { retry: 0 },
    },
  });
