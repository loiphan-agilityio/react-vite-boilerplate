#!/usr/bin/env node
// pnpm lighthouse <url>: runs Lighthouse (mobile, the default) on a deployed or previewed page and
// checks its category scores. Accessibility and SEO fail the run below their minimum; performance
// and best practices only warn, since a shared CI runner makes their scores noisy.
//
//   node tools/lighthouse.mjs <url> [--out <dir>]
//
// The scores are Markdown on stdout and are appended to $GITHUB_STEP_SUMMARY when CI sets it; the
// HTML and JSON reports go to <dir> (default lighthouse/). Exits 1 when a minimum is missed.
// Locally: `pnpm build && pnpm --filter web preview`, then `pnpm lighthouse http://localhost:4173`.
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';

const LIGHTHOUSE = 'lighthouse@13.5.0';

const categories = [
  { id: 'accessibility', min: 100, blocking: true },
  { id: 'seo', min: 95, blocking: true },
  { id: 'performance', min: 90, blocking: false },
  { id: 'best-practices', min: 90, blocking: false },
];

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { out: { type: 'string', default: 'lighthouse' } },
});

if (positionals.length !== 1) {
  console.error('Usage: node tools/lighthouse.mjs <url> [--out <dir>]');
  process.exit(1);
}

const [url] = positionals;

mkdirSync(values.out, { recursive: true });

const args = [
  '-y',
  LIGHTHOUSE,
  url,
  `--only-categories=${categories.map(({ id }) => id).join(',')}`,
  // CI's drafts send `X-Robots-Tag: noindex` (a preview must stay out of search results), which
  // this audit fails on each of them. The live site's robots.txt and headers are web-quality's SEO
  // audit to check.
  '--skip-audits=is-crawlable',
  '--output=json',
  '--output=html',
  `--output-path=${join(values.out, 'report')}`,
  '--chrome-flags=--headless=new --no-sandbox',
  '--quiet',
];

// Windows runs npx (npx.cmd) only through a shell, which joins the arguments as they are: quote
// each one (not npx: a quoted batch file finds no npm), so the Chrome flags stay one argument and
// a `&` in the URL stays in the URL.
const { status } =
  process.platform === 'win32'
    ? spawnSync(`npx ${args.map((arg) => `"${arg}"`).join(' ')}`, {
        stdio: 'inherit',
        shell: true,
      })
    : spawnSync('npx', args, { stdio: 'inherit' });

const reportPath = join(values.out, 'report.report.json');

if (status !== 0 || !existsSync(reportPath)) {
  console.error(`Lighthouse did not produce a report for ${url}.`);
  process.exit(1);
}

const report = JSON.parse(readFileSync(reportPath, 'utf8'));

const rows = categories.map(({ id, min, blocking }) => {
  const category = report.categories[id];
  const score = Math.round(category.score * 100);

  // The audits that cost points, worst first, so the summary says what to fix.
  const failing = category.auditRefs
    .filter((ref) => ref.weight > 0 && (report.audits[ref.id]?.score ?? 1) < 1)
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((ref) => report.audits[ref.id].title);

  return { title: category.title, score, min, blocking, ok: score >= min, failing };
});

const missed = rows.filter((row) => row.blocking && !row.ok);

const markdown = [
  `## Lighthouse (mobile): ${url}`,
  '',
  '| Category | Score | Minimum | Status | Top issues |',
  '|---|---|---|---|---|',
  ...rows.map((row) => {
    const status = row.ok ? 'pass' : row.blocking ? 'FAIL' : 'warn';

    return `| ${row.title} | ${row.score} | ${row.min}${row.blocking ? '' : ' (warn)'} | ${status} | ${row.failing.join('; ')} |`;
  }),
  '',
  missed.length === 0
    ? 'Every blocking category meets its minimum.'
    : `Below the minimum: ${missed.map((row) => row.title).join(', ')}.`,
  '',
].join('\n');

console.log(`\n${markdown}`);

if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);

process.exitCode = missed.length === 0 ? 0 : 1;
