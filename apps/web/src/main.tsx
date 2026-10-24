import '@/styles/index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { AppProviders } from '@/app/providers';
import { createRoutes } from '@/app/routes';
import { config } from '@/lib/config';
import { reportRouteError } from '@/lib/report-error';
import { reloadOnStaleChunk } from '@/lib/stale-chunk';

// A lazy route whose chunk is gone after a deploy reloads the tab once (see stale-chunk.ts).
window.addEventListener('vite:preloadError', reloadOnStaleChunk());

// On in `pnpm dev:mock` and in `pnpm build:mock` (the build CI deploys while the app has no
// backend). The check reads the value Vite replaces at build time (config.apiMocking validated the
// same value): a build without VITE_API_MOCKING=true drops this branch and the MSW chunk with its
// handlers and fixtures, and vite.config.ts leaves mockServiceWorker.js out of it.
if (import.meta.env.VITE_API_MOCKING === 'true' && config.apiMocking) {
  const { worker } = await import('@/mocks/browser');
  // A browser that refuses service workers (private windows, managed policies) still gets the
  // app: requests then reach the network, and data screens show their error state.
  await worker.start({ onUnhandledFrame: 'bypass' }).catch((cause: unknown) => {
    console.warn('[MSW] Mocking is off: the service worker did not start.', cause);
  });
}

const router = createBrowserRouter(createRoutes());
const root = document.getElementById('root');

if (!root) throw new Error('Missing #root element in index.html');

createRoot(root).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} onError={reportRouteError} />
    </AppProviders>
  </StrictMode>,
);
