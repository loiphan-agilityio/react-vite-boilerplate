import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, type Plugin } from 'vite';
import { configDefaults } from 'vitest/config';

/**
 * Content-Security-Policy of the built app. connect-src allows any https origin so a real
 * VITE_API_URL works without an edit here; narrow it to your API's origin once you know it.
 * 'unsafe-inline' styles: sonner inserts a <style> element. Scripts stay 'self' only.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "worker-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

/**
 * Adds the policy as a <meta> tag to the app's own index.html, in builds only: `pnpm dev` needs an
 * inline React Refresh script, and Storybook (which loads this config for its own pages) needs
 * inline scripts too. Headers in netlify.toml would reach the Storybook deploy as well.
 */
const cspMetaTag = (): Plugin => {
  let appIndexHtml = '';

  return {
    name: 'csp-meta-tag',
    apply: 'build',
    configResolved: ({ root }) => {
      appIndexHtml = resolve(root, 'index.html');
    },
    transformIndexHtml: (html, { filename }) =>
      resolve(filename) === appIndexHtml
        ? [
            {
              tag: 'meta',
              attrs: { 'http-equiv': 'Content-Security-Policy', content: contentSecurityPolicy },
              injectTo: 'head-prepend',
            },
          ]
        : html,
  };
};

/**
 * public/mockServiceWorker.js is copied into every build, but only a build with
 * VITE_API_MOCKING=true registers it (main.tsx): drop it from the others, so a production build
 * ships no part of the mock API. Only in the app's own build: Storybook loads this config too and
 * serves the worker to its stories. The app build is the one that turns the app's index.html.
 */
const mockWorkerOnlyWhenMocking = (): Plugin => {
  let appIndexHtml = '';
  let worker = '';
  let mocking = false;
  let appBuild = false;

  return {
    name: 'mock-worker-only-when-mocking',
    apply: 'build',
    configResolved: ({ root, build, env }) => {
      appIndexHtml = resolve(root, 'index.html');
      worker = resolve(root, build.outDir, 'mockServiceWorker.js');
      mocking = env.VITE_API_MOCKING === 'true';
    },
    transformIndexHtml: (html, { filename }) => {
      if (resolve(filename) === appIndexHtml) appBuild = true;

      return html;
    },
    closeBundle: async () => {
      if (appBuild && !mocking) await rm(worker, { force: true });
    },
  };
};

export default defineConfig({
  plugins: [react(), tailwindcss(), cspMetaTag(), mockWorkerOnlyWhenMocking()],
  // Reads the `@/*` alias from tsconfig, so the alias is declared once.
  resolve: { tsconfigPaths: true },
  build: {
    rolldownOptions: {
      output: {
        // The libraries change far less often than the app: in chunks of their own, a deploy that
        // touches only app code leaves them cached (assets/* are immutable for a year, see
        // netlify.toml). One app chunk was 160 kB gzip, almost all of it these libraries.
        codeSplitting: {
          groups: [
            {
              name: 'react',
              test: /[\\/]node_modules[\\/](react|react-dom|react-router|scheduler)[\\/]/,
            },
            { name: 'effect', test: /[\\/]node_modules[\\/]effect[\\/]/ },
            { name: 'vendor', test: /[\\/]node_modules[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // `pnpm check` runs lint and typecheck alongside the tests (the builds come after, see the root
    // package.json). With a worker per core the machine was oversubscribed: workers failed to start
    // ("Failed to start forks worker") and lazy routes loaded past the findBy* timeout. Half the
    // cores leaves room for the rest.
    maxWorkers: '50%',
    // Above setup.ts's 5s findBy* timeout, so a slow element fails as a missing element (with the
    // DOM printed), not as a bare test timeout.
    testTimeout: 10_000,
    css: false,
    coverage: {
      provider: 'v8',
      include: ['src/features/**', 'src/lib/**'],
      exclude: ['**/*.test.{ts,tsx}', '**/*.stories.tsx'],
      thresholds: { lines: 80 },
    },
    // .claude holds Claude Code skills, whose templates and examples contain their own tests;
    // e2e/ holds the Playwright tests (`pnpm test:e2e`).
    exclude: [...configDefaults.exclude, '.claude/**', 'e2e/**'],
  },
});
