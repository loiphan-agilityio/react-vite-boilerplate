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
    queryFn: ({ signal }) => runEffect(getMe(), signal),
  });

export const useSignIn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (credentials: Credentials) => runEffect(signIn(credentials)),
    onSuccess: ({ token, user }) => {
      tokenStore.set(token);
      queryClient.setQueryData(authKeys.me(), user);
    },
  });
};
