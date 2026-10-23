import { Alert, AlertDescription, AlertTitle } from '@repo/ui/components/alert';
import { Button } from '@repo/ui/components/button';
import { Skeleton } from '@repo/ui/components/skeleton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router';

import { toUserMessage } from '@/lib/api/errors';
import { tokenStore } from '@/lib/api/token';

import { meQueryOptions } from '../../queries';

/** Layout for routes that need a signed-in user; see `protectedRoutes` in `routes.tsx`. */
export const RequireAuth = () => {
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const hasToken = tokenStore.get() !== null;
  const me = useQuery({ ...meQueryOptions(), enabled: hasToken });

  if (!hasToken || me.error?._tag === 'UnauthorizedError') {
    return <Navigate to={`/login?redirect=${encodeURIComponent(pathname + search)}`} replace />;
  }

  if (me.isPending) {
    return (
      <div role="status" aria-label="Loading your account">
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (me.isError) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Could not load your account</AlertTitle>
        <AlertDescription>{toUserMessage(me.error)}</AlertDescription>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => {
            void me.refetch();
          }}
        >
          Retry
        </Button>
      </Alert>
    );
  }

  const signOut = () => {
    tokenStore.clear();
    queryClient.clear();
    void navigate('/login');
  };

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
