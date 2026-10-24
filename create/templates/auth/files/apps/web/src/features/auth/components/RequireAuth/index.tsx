import { Alert, AlertDescription, AlertTitle } from '@repo/ui/components/alert';
import { Button } from '@repo/ui/components/button';
import { Skeleton } from '@repo/ui/components/skeleton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useSyncExternalStore } from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router';

import { toUserMessage, UnauthorizedError } from '@/lib/api/errors';
import { tokenStore } from '@/lib/api/token';

import { meQueryOptions } from '../../queries';

/** Layout for routes that need a signed-in user; see `protectedRoutes` in `routes.tsx`. */
export const RequireAuth = () => {
  const { pathname, search, hash } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // Re-renders when the token is set or dropped (a 401 to any request, a sign-out in another tab).
  const token = useSyncExternalStore(tokenStore.subscribe, tokenStore.get);
  const hasToken = token !== null;
  const me = useQuery({ ...meQueryOptions(), enabled: hasToken });

  // Another tab signed in as someone else: everything cached here (`me` included) belongs to the
  // previous user, so start over with the new token.
  const previousToken = useRef(token);
  useEffect(() => {
    if (previousToken.current !== null && token !== null && token !== previousToken.current) {
      void queryClient.resetQueries();
    }

    previousToken.current = token;
  }, [token, queryClient]);

  const signOut = () => {
    tokenStore.clear();
    queryClient.clear();
    void navigate('/login');
  };

  if (!hasToken || me.error instanceof UnauthorizedError) {
    return (
      <Navigate to={`/login?redirect=${encodeURIComponent(pathname + search + hash)}`} replace />
    );
  }

  if (me.isPending) {
    return (
      <div role="status" aria-label="Loading your account">
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (me.isError) {
    // Retry for a passing failure; Sign out for one that will not pass (a disabled account
    // answers 403), so the user is never stuck here.
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load your account</AlertTitle>
        <AlertDescription>{toUserMessage(me.error)}</AlertDescription>
        <div className="mt-3 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void me.refetch();
            }}
          >
            Retry
          </Button>
          <Button variant="outline" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <>
      <div className="mb-8 flex items-center justify-between gap-4 text-sm">
        <span>
          Signed in as <strong>{me.data.name}</strong>
        </span>
        <Button variant="outline" size="sm" onClick={signOut}>
          Sign out
        </Button>
      </div>
      <Outlet />
    </>
  );
};
