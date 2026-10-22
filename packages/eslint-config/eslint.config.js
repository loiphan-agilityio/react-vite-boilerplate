// lint-staged runs ESLint from the repo root, and ESLint 10 looks up the config from each linted
// file's directory, so this package lints its own index.js with the rules it exports.
export { default } from './index.js';
