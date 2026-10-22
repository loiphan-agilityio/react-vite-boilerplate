import config from '@repo/eslint-config';
import { defineConfig } from 'eslint/config';
import { join } from 'node:path';

// The shared config leaves tsconfigRootDir to each consumer; globs like src/features/** resolve
// against this file's directory.
export default defineConfig([
  config,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: { parserOptions: { tsconfigRootDir: import.meta.dirname } },
  },
  {
    // The rule reads ./package.json from the cwd, which is the repo root under lint-staged.
    files: ['.storybook/main.ts'],
    rules: {
      'storybook/no-uninstalled-addons': [
        'error',
        { packageJsonLocation: join(import.meta.dirname, 'package.json') },
      ],
    },
  },
]);
