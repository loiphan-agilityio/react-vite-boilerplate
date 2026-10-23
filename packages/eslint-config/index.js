// @repo/eslint-config: the shared flat config. Each consumer must set
// languageOptions.parserOptions.tsconfigRootDir to its own import.meta.dirname (projectService
// resolves tsconfig from it). File globs such as src/features/** are relative to the consumer's
// eslint.config.js.
import js from '@eslint/js';
import pluginQuery from '@tanstack/eslint-plugin-query';
import prettier from 'eslint-config-prettier';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettierPlugin from 'eslint-plugin-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import storybook from 'eslint-plugin-storybook';
import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// `const { title } = item`, not `const title = item.title`. Array indexes stay as they are.
const preferDestructuring = {
  VariableDeclarator: { object: true, array: false },
  AssignmentExpression: { object: false, array: false },
};

// Version traps and stack conventions, enforced instead of remembered.
const restrictedPaths = [
  {
    name: 'react-router-dom',
    message:
      'React Router 8 has no react-router-dom: import from "react-router" (RouterProvider from "react-router/dom").',
  },
  {
    name: 'zod',
    message: 'Validation uses Effect Schema (import { Schema } from "effect").',
  },
  { name: 'axios', message: 'HTTP goes through ApiClient (src/lib/api/client.ts).' },
  { name: '@effect/platform', message: 'Effect 4 ships HTTP in "effect/http".' },
  {
    name: 'msw',
    importNames: ['http', 'HttpResponse', 'delay', 'passthrough', 'bypass'],
    message:
      'MSW 3: import http/HttpResponse from "msw/http", and delay/bypass/passthrough from "msw/utils/<name>".',
  },
  { name: 'clsx', message: 'Use cn from "@repo/ui/lib/utils".' },
  { name: 'tailwind-merge', message: 'Use cn from "@repo/ui/lib/utils".' },
];

// A feature reaches another feature only through its public surface (schemas, model, queries,
// routes); its api, mocks and components are internal. Imports inside a feature are relative.
const featureBoundary = {
  // The extension is optional: tsconfig allows `.ts` imports, and `.js` resolves to `.ts`.
  regex: String.raw`^(@/features/[^/]+|(\.\./)+[^./][^/]*)/(api|mocks|components)(\.[cm]?[jt]sx?)?(/|$)`,
  message:
    "Another feature's api, mocks and components are internal: import its schemas, model, queries or routes, or move shared markup to src/components.",
};

export default defineConfig([
  // **/ matches at any depth and a trailing slash marks a directory.
  // .claude holds Claude Code skills (their templates and examples are not part of this app).
  globalIgnores([
    '**/dist/',
    '**/coverage/',
    '**/storybook-static/',
    '**/playwright-report/',
    '**/test-results/',
    '**/blob-report/',
    '**/public/mockServiceWorker.js',
    '**/.claude/',
  ]),
  {
    // One code style, so code written later reads like the template: arrow functions only
    // (`function*` stays for Effect.gen / Effect.fn), and ES2015+ syntax wherever it applies.
    // The TypeScript block below swaps dot-notation and prefer-destructuring for their
    // type-aware versions.
    files: ['**/*.{js,ts,tsx}'],
    plugins: { prettier: prettierPlugin },
    rules: {
      // Formatting shows up as a warning in the editor and `eslint --fix` applies it; the
      // lint scripts use --max-warnings=0, so it still fails CI.
      'prettier/prettier': 'warn',
      'func-style': ['error', 'expression'],
      'prefer-arrow-callback': 'error',
      'arrow-body-style': ['error', 'as-needed'],
      'object-shorthand': ['error', 'always'],
      'prefer-template': 'error',
      'prefer-destructuring': ['error', preferDestructuring],
      'dot-notation': 'error',
      'prefer-object-spread': 'error',
      'prefer-object-has-own': 'error',
      'prefer-exponentiation-operator': 'error',
      'logical-assignment-operators': ['error', 'always', { enforceForIfStatements: true }],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-useless-rename': 'error',
      'no-useless-computed-key': 'error',
      'no-useless-concat': 'error',
      'no-useless-return': 'error',
      'no-else-return': ['error', { allowElseIf: false }],
      'no-lonely-if': 'error',
      'operator-assignment': 'error',
      eqeqeq: ['error', 'smart'],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
      pluginQuery.configs['flat/recommended'],
      prettier,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { projectService: true },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/consistent-type-exports': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
      'prefer-destructuring': 'off',
      '@typescript-eslint/prefer-destructuring': ['error', preferDestructuring],
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      'no-restricted-imports': ['error', { paths: restrictedPaths }],
      'no-restricted-globals': [
        'error',
        {
          name: 'fetch',
          message: 'Call the API through ApiClient + runEffect, never fetch directly.',
        },
        {
          name: 'XMLHttpRequest',
          message: 'Call the API through ApiClient + runEffect, never XMLHttpRequest.',
        },
      ],
      // `no-restricted-globals` only sees a bare `fetch` or `XMLHttpRequest`; these are the same
      // calls by another name.
      'no-restricted-properties': [
        'error',
        ...['window', 'globalThis', 'self'].flatMap((object) => [
          {
            object,
            property: 'fetch',
            message: 'Call the API through ApiClient + runEffect, never fetch directly.',
          },
          {
            object,
            property: 'XMLHttpRequest',
            message: 'Call the API through ApiClient + runEffect, never XMLHttpRequest.',
          },
        ]),
      ],
    },
  },
  {
    files: ['src/features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { paths: restrictedPaths, patterns: [featureBoundary] }],
    },
  },
  {
    files: ['**/*.test.{ts,tsx}', 'src/test/**', 'src/mocks/**'],
    languageOptions: { globals: { ...globals.browser, ...globals.vitest } },
  },
  {
    files: ['vite.config.ts', 'eslint.config.js', 'playwright.config.ts', 'e2e/**'],
    languageOptions: { globals: globals.node },
  },
  {
    // Stories and the Storybook config export objects, not components: Fast Refresh does not apply.
    files: ['**/*.stories.tsx', '.storybook/**'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  storybook.configs['flat/recommended'],
]);
