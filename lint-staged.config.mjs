// Checks run on staged files before each commit (husky pre-commit), from the repository root:
// Oxlint (oxlint.config.ts, type-aware) and Prettier, each skipping what its ignore list names.
const quote = (files) => files.map((file) => JSON.stringify(file)).join(' ');

export default {
  // --no-error-on-unmatched-pattern: a commit of only ignored files (shadcn's generated components
  // in packages/ui, the hooks in .claude/) leaves Oxlint nothing to lint, which is not an error.
  '*.{js,mjs,ts,tsx}': (files) => [
    `oxlint --type-aware --deny-warnings --no-error-on-unmatched-pattern --fix ${quote(files)}`,
    `prettier --write ${quote(files)}`,
  ],
  '*.{json,css,html,yml,yaml}': 'prettier --write',
};
