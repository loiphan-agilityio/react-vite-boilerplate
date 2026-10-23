import { Skeleton } from '@repo/ui/components/skeleton';
import type { RouteObject } from 'react-router';

/** Shown while the first page's chunk loads; without one React Router renders nothing and warns. */
const hydrateFallbackElement = (
  <div role="status" aria-label="Loading">
    <Skeleton className="h-8 w-full" />
  </div>
);

/** Public: `/login`. Spread into the root route's `children` in `app/routes.tsx`. */
export const authRoutes = (): RouteObject[] => [
  {
    path: 'login',
    hydrateFallbackElement,
    lazy: { Component: async () => (await import('./components/LoginPage')).LoginPage },
  },
];

/** A pathless layout: every route in `children` needs a signed-in user. */
export const protectedRoutes = (children: RouteObject[]): RouteObject => ({
  hydrateFallbackElement,
  lazy: { Component: async () => (await import('./components/RequireAuth')).RequireAuth },
  children,
});
