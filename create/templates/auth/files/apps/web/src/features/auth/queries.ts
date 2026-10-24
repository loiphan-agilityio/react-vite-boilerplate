import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';

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
    // A 401 here (or to any other request) drops the token in the API layer: see `tokenStore.reject`.
    queryFn: ({ signal }) => runEffect(getMe(), signal),
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
