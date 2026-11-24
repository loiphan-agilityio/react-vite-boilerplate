// PostToolUse hook (.claude/settings.json, and each app's .claude/settings.json): runs Prettier on
// the file Claude just wrote or edited, as lint-staged does at commit time. .prettierignore still
// applies (Markdown, .claude, components/ui). The repository root is found from this file's own
// location, so a session started in an app formats files in packages/ too. Files outside the
// repository are left alone, and a failure never blocks the edit: `pnpm lint` still gates.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const file = JSON.parse(readFileSync(0, 'utf8')).tool_input?.file_path;
const rel = typeof file === 'string' ? relative(root, file) : '..';
if (!rel.startsWith('..') && !isAbsolute(rel)) {
  spawnSync(
    process.execPath,
    ['node_modules/prettier/bin/prettier.cjs', '--write', '--ignore-unknown', file],
    { cwd: root },
  );
}
