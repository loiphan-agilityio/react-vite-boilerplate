import '@/styles/index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';

import { AppProviders } from '@/app/providers';
import { createRoutes } from '@/app/routes';
import { config } from '@/lib/config';
import { reloadOnStaleChunk } from '@/lib/stale-chunk';

// A lazy route whose chunk is gone after a deploy reloads the tab once (see stale-chunk.ts).
window.addEventListener('vite:preloadError', reloadOnStaleChunk());

// On in `pnpm dev:mock` and in `pnpm build:mock` (the build CI deploys while the app has no
// backend). A build without VITE_API_MOCKING=true never loads the MSW chunk.
if (config.apiMocking) {
  const { worker } = await import('@/mocks/browser');
  // A browser that refuses service workers (private windows, managed policies) still gets the
  // app: requests then reach the network, and data screens show their error state.
  await worker.start({ onUnhandledFrame: 'bypass' }).catch((error: unknown) => {
    console.warn('[MSW] Mocking is off: the service worker did not start.', error);
  });
}

const router = createBrowserRouter(createRoutes());
const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element in index.html');

createRoot(root).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
