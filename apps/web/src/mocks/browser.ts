import { setupWorker } from 'msw/browser';

import { handlers } from './handlers';

/**
 * MSW in the browser: `pnpm dev:mock` and `pnpm build:mock` (VITE_API_MOCKING=true) start it in
 * src/main.tsx, and Storybook in its preview.
 */
export const worker = setupWorker(...handlers);
