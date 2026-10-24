import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Reads the `@/*` alias from tsconfig, so the alias is declared once.
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // Above setup.ts's 10s findBy* timeout, so a slow first route load fails as a missing element
    // (with the DOM printed), not as a bare test timeout.
    testTimeout: 20_000,
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
