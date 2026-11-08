// The dossier command runs from wherever it is linked. bin/dossier finds the plugin from its own
// location and follows symbolic links, so a link to it from a folder on the PATH works.
//   node --test qualification/tests/bin.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;

test('the dossier command runs through a link to it, and through a relative link to that link', t => {
  const dir = mkdtempSync(join(tmpdir(), 'dossier-bin-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  symlinkSync(join(root, 'bin', 'dossier'), join(dir, 'dossier'));
  symlinkSync('dossier', join(dir, 'relative'));
  for (const link of ['dossier', 'relative']) {
    const run = spawnSync(join(dir, link), ['version'], { encoding: 'utf8' });
    assert.equal(run.status, 0, `${link}: ${run.stderr}`);
    assert.ok(run.stdout.includes(version), `${link} printed ${run.stdout}`);
  }
});
