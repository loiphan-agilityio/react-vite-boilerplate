// lint-staged runs ESLint from the repo root and fails on a file with no config. The overlay is
// linted inside a generated app (see README.md), not here.
export default [{ ignores: ['templates/**'] }];
