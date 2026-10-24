import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('./index.js', import.meta.url));
const repo = dirname(dirname(cli));
const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
const read = (dir, file) => readFileSync(join(dir, file), 'utf8');

describe('create-react-vite-turbo', () => {
  let tmp;
  let auth;
  let plain;
  let authOutput;
  let plainOutput;

  before(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'rvb-'));
    auth = join(tmp, 'auth');
    plain = join(tmp, 'plain');

    for (const [dir, flag] of [
      [auth, '--auth'],
      [plain, '--no-auth'],
    ]) {
      const { status, stderr, stdout } = run(dir, '--from', repo, flag);
      assert.equal(status, 0, stderr);

      if (dir === auth) authOutput = stdout;
      else plainOutput = stdout;
    }
  });
  after(() => rm(tmp, { recursive: true, force: true }));

  it('leaves no CLI and no template-only text in either project', () => {
    for (const dir of [auth, plain]) {
      assert.ok(!existsSync(join(dir, 'create')));
      assert.ok(!read(dir, 'CLAUDE.md').includes('template-only'));
    }
  });

  it('names the project after its folder', () => {
    assert.equal(JSON.parse(read(plain, 'package.json')).name, 'plain');
    assert.ok(read(plain, 'README.md').startsWith('# plain\n'));
    assert.ok(read(plain, 'CLAUDE.md').startsWith('# plain (monorepo)\n'));
    assert.ok(read(plain, 'apps/web/index.html').includes('<title>plain</title>'));
  });

  it('takes --name instead, as a valid package name', () => {
    const out = join(tmp, 'tmp.Xy12');
    const { status, stderr } = run(out, '--from', repo, '--no-auth', '--name', 'My Shop!');
    assert.equal(status, 0, stderr);
    assert.equal(JSON.parse(read(out, 'package.json')).name, 'my-shop');
    assert.ok(read(out, 'README.md').startsWith('# my-shop\n'));
  });

  it('without auth, gives the base project', () => {
    assert.ok(read(plain, 'apps/web/src/lib/runtime.ts').includes('AuthToken.none'));
    assert.ok(!existsSync(join(plain, 'apps/web/src/features/auth')));
  });

  it('with auth, adds the feature and wires it in', () => {
    assert.ok(existsSync(join(auth, 'apps/web/src/features/auth/routes.tsx')));
    assert.ok(
      read(auth, 'apps/web/src/lib/runtime.ts').includes(
        'AuthToken.fromGetter(tokenStore.get, tokenStore.reject)',
      ),
    );
    assert.ok(read(auth, 'apps/web/src/app/routes.tsx').includes('protectedRoutes('));
  });

  it('with auth, shows the account the mock API accepts everywhere the user may look', () => {
    const mocks = read(auth, 'apps/web/src/features/auth/mocks.ts');
    const email = /email: '([^']+)'/.exec(mocks)[1];
    const password = /mockPassword = '([^']+)'/.exec(mocks)[1];

    for (const text of [
      authOutput,
      read(auth, 'apps/web/src/features/auth/components/LoginPage/index.tsx'),
      read(auth, 'apps/web/CLAUDE.md'),
      read(auth, 'README.md'),
    ]) {
      assert.ok(text.includes(email) && text.includes(password));
    }

    assert.ok(!plainOutput.includes(email) && !read(plain, 'README.md').includes(email));
  });

  it('refuses a folder that already exists', () => {
    const { status, stderr } = run(auth, '--from', repo, '--auth');
    assert.equal(status, 1);
    assert.match(stderr, /already exists/);
  });

  it('copies a working tree that holds a nested git repository, without that repository', async () => {
    const source = join(tmp, 'with-nested');
    await mkdir(join(source, 'nested'), { recursive: true });
    await writeFile(join(source, 'CLAUDE.md'), '# x\n');
    await writeFile(join(source, 'a.txt'), 'a\n');
    execFileSync('git', ['init', '-q', source]);
    // A clone or a git worktree inside the checkout (`.claude/worktrees/<name>`, say).
    execFileSync('git', ['init', '-q', join(source, 'nested')]);
    await writeFile(join(source, 'nested/b.txt'), 'b\n');

    const out = join(tmp, 'from-nested');
    const { status, stderr } = run(out, '--from', source, '--no-auth');
    assert.equal(status, 0, stderr);
    assert.equal(read(out, 'a.txt'), 'a\n');
    assert.ok(!existsSync(join(out, 'nested')));
  });

  it('copies a working tree that tracks a nested repository (a gitlink, a submodule)', async () => {
    const source = join(tmp, 'with-gitlink');
    const nested = join(source, 'nested');
    await mkdir(nested, { recursive: true });
    await writeFile(join(source, 'CLAUDE.md'), '# x\n');
    execFileSync('git', ['init', '-q', source]);
    execFileSync('git', ['init', '-q', nested]);
    await writeFile(join(nested, 'b.txt'), 'b\n');
    const commit = ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'b'];
    execFileSync('git', ['-C', nested, 'add', 'b.txt']);
    execFileSync('git', ['-C', nested, ...commit]);
    // `git add` of a folder that is a repository records a gitlink: ls-files lists `nested`.
    execFileSync('git', ['-C', source, 'add', 'CLAUDE.md', 'nested']);

    const out = join(tmp, 'from-gitlink');
    const { status, stderr } = run(out, '--from', source, '--no-auth');
    assert.equal(status, 0, stderr);
    assert.equal(read(out, 'CLAUDE.md'), '# x\n');
    assert.ok(!existsSync(join(out, 'nested')));
  });

  it('stops on a patch that does not match exactly once, and removes the output', async () => {
    const source = join(tmp, 'source');
    await mkdir(join(source, 'create/templates/auth/files'), { recursive: true });
    await writeFile(join(source, 'create/templates/auth/files/new.txt'), 'new\n');
    await writeFile(join(source, 'CLAUDE.md'), '# x\n');
    await writeFile(join(source, 'a.txt'), 'one two\n');
    await writeFile(
      join(source, 'create/templates/auth/patches.json'),
      JSON.stringify([{ file: 'a.txt', find: 'three', replace: 'x' }]),
    );
    execFileSync('git', ['init', '-q', source]);

    const out = join(tmp, 'broken');
    const { status, stderr } = run(out, '--from', source, '--auth');
    assert.equal(status, 1);
    assert.match(stderr, /a\.txt.*"three".*found 0/);
    assert.ok(!existsSync(out));
  });
});
