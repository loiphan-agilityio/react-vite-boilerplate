import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

import { UnauthorizedError } from '@/lib/api/errors';
import { runEffect } from '@/lib/api/run';
import { tokenStore } from '@/lib/api/token';

import { getMe, signIn } from './api';
import type { Credentials } from './schemas';

export const authKeys = {
  me: () => ['auth', 'me'] as const,
};

export const meQueryOptions = () =>
  queryOptions({
    queryKey: authKeys.me(),
    queryFn: async ({ signal }) => {
      try {
        return await runEffect(getMe(), signal);
      } catch (error) {
        // The API rejected the token (expired, revoked): drop it, or the sign-in request and every
        // later one would still send it, and a backend that answers 401 to any bad bearer would
        // refuse even the sign-in.
        if (error instanceof UnauthorizedError) tokenStore.clear();
        throw error;
      }
    },
  });

export const useSignIn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (credentials: Credentials) => runEffect(signIn(credentials)),
    onSuccess: ({ token, user }) => {
      // A new session starts empty: nothing cached for the previous user survives the sign-in.
      queryClient.removeQueries();
      tokenStore.set(token);
      queryClient.setQueryData(authKeys.me(), user);
    },
  });
};
