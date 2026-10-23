#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { constants, existsSync } from 'node:fs';
import { copyFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';

const REPO = 'https://github.com/loiphan-agilityio/react-vite-boilerplate.git';

const USAGE = `Usage: create-react-vite-boilerplate <dir> [--auth | --no-auth] [--from <local checkout>]`;

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
    files.filter((file) => file && existsSync(join(from, file))),
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

const main = async () => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    allowNegative: true,
    options: { auth: { type: 'boolean' }, from: { type: 'string' } },
  });
  if (positionals.length !== 1) throw new Error(USAGE);

  const dest = resolve(positionals[0]);
  if (existsSync(dest)) throw new Error(`${dest} already exists.`);
  const withAuth = values.auth ?? (await askAuth());

  try {
    if (values.from) {
      await copyWorkingTree(resolve(values.from), dest);
    } else {
      git('clone', '--depth', '1', REPO, dest);
      await rm(join(dest, '.git'), { recursive: true, force: true });
    }

    if (withAuth) {
      const auth = join(dest, 'create/templates/auth');
      await copyOverlay(join(auth, 'files'), dest);
      await applyPatches(dest, JSON.parse(await readFile(join(auth, 'patches.json'), 'utf8')));
    }

    await rm(join(dest, 'create'), { recursive: true, force: true });
    const claude = join(dest, 'CLAUDE.md');
    const text = await readFile(claude, 'utf8');
    const stripped = text.replace(/<!-- template-only -->[\s\S]*?<!-- \/template-only -->\n*/g, '');
    await writeFile(claude, `${stripped.trimEnd()}\n`);
  } catch (error) {
    await rm(dest, { recursive: true, force: true });
    throw error;
  }

  console.log(`\nCreated ${positionals[0]}${withAuth ? ' with authentication' : ''}. Next:\n`);
  console.log(`  cd ${positionals[0]}\n  git init\n  pnpm install\n  pnpm dev:mock`);
};

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
