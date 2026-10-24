// Checks run on staged files before each commit (husky pre-commit), from the repository root.
// ESLint runs only under apps/, packages/ and create/, which have an eslint.config.js; a root
// file (oxlint.config.ts) or the vendored anti-slop rules (tools/) have none. anti-slop and
// Prettier run on every file (each skips what its ignore list names).
import { relative } from 'node:path';

const quote = (files) => files.map((file) => JSON.stringify(file)).join(' ');

export default {
  '*.{js,mjs,ts,tsx}': (files) => {
    // lint-staged passes absolute paths: match the folder under the repository root, not one the
    // clone happens to sit in (a checkout under ~/apps/).
    const withEslintConfig = files.filter((file) =>
      /^(apps|packages|create)[\\/]/.test(relative(process.cwd(), file)),
    );

    return [
      ...(withEslintConfig.length > 0
        ? [`eslint --max-warnings=0 --no-warn-ignored --fix ${quote(withEslintConfig)}`]
        : []),
      `oxlint --fix ${quote(files)}`,
      `prettier --write ${quote(files)}`,
    ];
  },
  '*.{json,css,html,yml,yaml}': 'prettier --write',
};
