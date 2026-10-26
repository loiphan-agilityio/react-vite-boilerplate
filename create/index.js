#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { constants, existsSync, statSync } from 'node:fs';
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';

const REPO = 'https://github.com/loiphan-agilityio/react-vite-boilerplate.git';

/** What the mock API of the auth overlay accepts (features/auth/mocks.ts); index.test.js keeps them equal. */
const DEMO_ACCOUNT = 'demo@example.com / password';

const USAGE = `Usage: create-react-vite-turbo <dir> [--landing | --app] [--auth | --no-auth] [--name <name>] [--from <local checkout>]`;

const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });

/** Enter, or a stdin that is not a terminal, counts as "No". */
const askAuth = async () => {
  if (!process.stdin.isTTY) return false;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('Include authentication? (y/N) ');
  rl.close();

  return /^y(es)?$/i.test(answer.trim());
};

/** Enter, or a stdin that is not a terminal, counts as a web app. */
const askLanding = async () => {
  if (!process.stdin.isTTY) return false;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question('Build a landing page or a web app? (landing/APP) ');

  rl.close();

  return /^l(anding)?$/i.test(answer.trim());
};

/** Copies relative paths from one tree into another; with `COPYFILE_EXCL` an existing file is an error. */
const copyFiles = async (from, dest, files, mode = 0) => {
  for (const file of files) {
    await mkdir(dirname(join(dest, file)), { recursive: true });
    await copyFile(join(from, file), join(dest, file), mode);
  }
};

/** The working tree of a local checkout, uncommitted files included (used by the tests). */
const copyWorkingTree = (from, dest) => {
  const files = git('-C', from, 'ls-files', '-z', '-co', '--exclude-standard').split('\0');

  return copyFiles(
    from,
    dest,
    // Files only: an untracked nested repository (a clone, a git worktree) is listed as `dir/`, a
    // tracked one (a gitlink, a submodule) as `dir`, and a deleted file is listed but missing.
    files.filter(
      (file) => file && statSync(join(from, file), { throwIfNoEntry: false })?.isFile() === true,
    ),
  );
};

/** The overlay never overwrites a file of the base. */
const copyOverlay = async (from, dest) => {
  const entries = await readdir(from, { recursive: true, withFileTypes: true });

  const files = entries
    .filter((e) => e.isFile())
    .map((e) => relative(from, join(e.parentPath, e.name)));

  await copyFiles(from, dest, files, constants.COPYFILE_EXCL);
};

/** Each patch must match exactly once, so a base that drifted fails loudly instead of being overwritten. */
const applyPatches = async (dest, patches) => {
  for (const { file, find, replace } of patches) {
    const path = join(dest, file);
    const text = await readFile(path, 'utf8');
    const count = text.split(find).length - 1;

    if (count !== 1) {
      throw new Error(
        `Patch for ${file}: expected 1 match for ${JSON.stringify(find)}, found ${count}.`,
      );
    }

    await writeFile(
      path,
      text.replace(find, () => replace),
    );
  }
};

/**
 * Applies create/templates/<name>: removes the paths its remove.json lists (so a file can be
 * replaced), copies its files/ (never over a base file) and applies its patches.json.
 */
const applyTemplate = async (dest, name) => {
  const template = join(dest, 'create/templates', name);
  const removeList = join(template, 'remove.json');

  if (existsSync(removeList)) {
    for (const path of JSON.parse(await readFile(removeList, 'utf8'))) {
      await rm(join(dest, path), { recursive: true, force: true });
    }
  }

  await copyOverlay(join(template, 'files'), dest);
  await applyPatches(dest, JSON.parse(await readFile(join(template, 'patches.json'), 'utf8')));
};

/** A valid npm package name from a folder name or `--name`: `My Shop!` becomes `my-shop`. */
const toPackageName = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[._-]+|-+$/g, '') || 'app';

/** Names the project after itself instead of `boilerplate`; a file the tree lacks is skipped. */
const nameProject = async (dest, name) => {
  const renames = [
    ['package.json', /^ {2}"name": "boilerplate",$/m, `  "name": "${name}",`],
    [
      'README.md',
      /^<h1 align="center">boireact-vite-boilerplatelerplate<\/h1>$/m,
      `<h1 align="center">${name}</h1>`,
    ],
    ['CLAUDE.md', /^# boilerplate \(monorepo\)$/m, `# ${name} (monorepo)`],
    ['apps/web/index.html', /<title>Boilerplate<\/title>/, `<title>${name}</title>`],
    ['apps/web/public/site.webmanifest', /"name": "Boilerplate"/, `"name": "${name}"`],
    ['apps/web/public/site.webmanifest', /"short_name": "Boilerplate"/, `"short_name": "${name}"`],
  ];

  for (const [file, find, replace] of renames) {
    const path = join(dest, file);

    if (!existsSync(path)) continue;
    await writeFile(path, (await readFile(path, 'utf8')).replace(find, replace));
  }
};

const main = async () => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    allowNegative: true,
    options: {
      landing: { type: 'boolean' },
      app: { type: 'boolean' },
      auth: { type: 'boolean' },
      from: { type: 'string' },
      name: { type: 'string' },
    },
  });

  if (positionals.length !== 1) throw new Error(USAGE);

  const dest = resolve(positionals[0]);

  if (existsSync(dest)) throw new Error(`${dest} already exists.`);
  // A caller that generates into a temporary folder (web-dev's create-project.sh) passes --name.
  const name = toPackageName(values.name ?? basename(dest));
  const landing = values.landing ?? (values.app === undefined ? await askLanding() : !values.app);

  // A landing page is public and has no sign-in to protect.
  if (landing && values.auth === true) {
    throw new Error('A landing page has no sign-in: pass --no-auth.');
  }

  const withAuth = landing ? false : (values.auth ?? (await askAuth()));

  try {
    if (values.from) {
      await copyWorkingTree(resolve(values.from), dest);
    } else {
      git('clone', '--depth', '1', REPO, dest);
      await rm(join(dest, '.git'), { recursive: true, force: true });
    }

    if (landing) await applyTemplate(dest, 'landing');

    if (withAuth) await applyTemplate(dest, 'auth');

    await rm(join(dest, 'create'), { recursive: true, force: true });

    for (const doc of ['CLAUDE.md', 'README.md']) {
      const file = join(dest, doc);

      if (!existsSync(file)) continue;

      const text = await readFile(file, 'utf8');

      const stripped = text.replace(
        /<!-- template-only -->[\s\S]*?<!-- \/template-only -->\n*/g,
        '',
      );

      await writeFile(file, `${stripped.trimEnd()}\n`);
    }

    await nameProject(dest, name);
  } catch (error) {
    await rm(dest, { recursive: true, force: true });
    throw error;
  }

  const kind = landing
    ? 'a landing page'
    : withAuth
      ? 'a web app with authentication'
      : 'a web app';

  console.log(`\nCreated ${positionals[0]}: ${kind}. Next:\n`);
  console.log(
    `  cd ${positionals[0]}\n  git init\n  pnpm install\n  ${landing ? 'pnpm dev' : 'pnpm dev:mock'}`,
  );

  if (withAuth) console.log(`\nThen sign in with the demo account: ${DEMO_ACCOUNT}`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
