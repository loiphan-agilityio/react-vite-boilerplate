#!/usr/bin/env node
// pnpm check:report: runs the gates of pnpm check one after another, keeps going after a failure,
// and prints the output checklist: lint (ESLint, Prettier, anti-slop), typecheck, unit tests with
// their pass rate and line coverage, build, Storybook build, and e2e with its pass rate.
//
//   node tools/check-report.mjs [--only <gate,...>] [--skip <gate,...>]
//
// Gates: lint, typecheck, unit, build, storybook, e2e. The checklist is Markdown on stdout, is
// appended to $GITHUB_STEP_SUMMARY when CI sets it, and is written as JSON to check-report.json.
// Exits 1 when a gate fails.
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: { only: { type: 'string' }, skip: { type: 'string' } },
});

const out = mkdtempSync(join(tmpdir(), 'check-report-'));
const vitestJson = join(out, 'vitest.json');

// Coverage stays where `pnpm test` writes it (CI uploads apps/web/coverage/), with a summary added.
const coverageDir = join('apps', 'web', 'coverage');
const e2eJson = join(out, 'e2e.json');
const quote = (/** @type {string} */ path) => JSON.stringify(path);

/** @type {(path: string) => any} */
const readJson = (path) => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : undefined);

/** @type {(passed: number, total: number) => string} */
const rate = (passed, total) =>
  total === 0
    ? 'no tests'
    : `${Math.round((passed / total) * 1000) / 10}% (${passed}/${total} passed)`;

const gates = [
  { id: 'lint', name: 'Lint (ESLint, Prettier, anti-slop)', command: 'pnpm lint' },
  { id: 'typecheck', name: 'Typecheck', command: 'pnpm typecheck' },
  {
    id: 'unit',
    name: 'Unit tests',
    command: [
      'pnpm --filter web exec vitest run --coverage',
      '--coverage.reporter=text --coverage.reporter=html --coverage.reporter=json-summary',
      `--reporter=default --reporter=json --outputFile.json=${quote(vitestJson)}`,
    ].join(' '),
    detail: () => {
      const results = readJson(vitestJson);
      const lines = readJson(join(coverageDir, 'coverage-summary.json'))?.total?.lines?.pct;

      return {
        result: results ? rate(results.numPassedTests, results.numTotalTests) : 'no results',
        note: lines === undefined ? '' : `line coverage ${lines}%`,
      };
    },
  },
  { id: 'build', name: 'Build', command: 'pnpm build' },
  { id: 'storybook', name: 'Storybook build', command: 'pnpm build-storybook' },
  {
    id: 'e2e',
    name: 'E2E (Playwright)',
    command: 'pnpm --filter web exec playwright test --reporter=list,json',
    env: { PLAYWRIGHT_JSON_OUTPUT_NAME: e2eJson },
    detail: () => {
      const stats = readJson(e2eJson)?.stats;

      if (!stats) return { result: 'no results', note: '' };

      const total = stats.expected + stats.unexpected + stats.flaky;

      return {
        result: rate(stats.expected, total),
        note: [
          stats.flaky > 0 && `${stats.flaky} flaky`,
          stats.skipped > 0 && `${stats.skipped} skipped`,
        ]
          .filter(Boolean)
          .join(', '),
      };
    },
  },
];

const listed = (/** @type {string | undefined} */ list) => new Set(list?.split(',') ?? []);
const only = listed(values.only);
const skip = listed(values.skip);
const selected = gates.filter(({ id }) => (only.size === 0 || only.has(id)) && !skip.has(id));

const rows = selected.map((gate) => {
  console.log(`\n▶ ${gate.name}: ${gate.command}`);
  const started = Date.now();

  const { status } = spawnSync(gate.command, {
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, ...gate.env },
  });

  const ok = status === 0;
  const detail = gate.detail?.() ?? { result: 'pass', note: '' };

  return {
    gate: gate.id,
    name: gate.name,
    ok,
    result: ok ? detail.result : `FAIL${detail.result === 'pass' ? '' : `: ${detail.result}`}`,
    note: detail.note,
    seconds: Math.round((Date.now() - started) / 1000),
  };
});

const failed = rows.filter((row) => !row.ok);

const markdown = [
  '## Check report',
  '',
  '| Gate | Status | Result | Time |',
  '|---|---|---|---|',
  ...rows.map(
    (row) =>
      `| ${row.name} | ${row.ok ? 'pass' : 'FAIL'} | ${[row.result, row.note].filter(Boolean).join('; ')} | ${row.seconds}s |`,
  ),
  '',
  failed.length === 0
    ? `All ${rows.length} gates pass.`
    : `${failed.length} of ${rows.length} gates failed: ${failed.map((row) => row.name).join(', ')}.`,
  '',
].join('\n');

console.log(`\n${markdown}`);

writeFileSync('check-report.json', `${JSON.stringify({ gates: rows }, null, 2)}\n`);

if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);

process.exitCode = failed.length === 0 ? 0 : 1;
