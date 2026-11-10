import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { lstatSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { initializeDossierLocked } from '../../src/dossiers/initialize.ts';
import { rewriteSetupMarker } from '../../src/commands/setup.ts';
import { durableWrite, withPublicationLock } from '../../src/dossiers/publication.ts';

// Records are checked-in files that other people and other accounts read: a server running as its own
// user, a container, a teammate's checkout. The tools must leave them readable as the umask allows, never
// owner-only, and the folders they create traversable.

const begin = { time: '2026-11-05T00:00:00Z', verb: 'begin', args: ['modeled'], words: 'Begin the dossier.' };

function withUmask<T>(mask: number, body: () => T): T {
  const previous = process.umask(mask);
  try { return body(); } finally { process.umask(previous); }
}
function rootFor(t: TestContext): string {
  const root = mkdtempSync(join(tmpdir(), 'dossier-record-modes-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
function modes(root: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry), stat = lstatSync(path);
      out[relative(root, path)] = (stat.mode & 0o777).toString(8);
      if (stat.isDirectory()) walk(path);
    }
  };
  walk(root);
  return out;
}

test('setup and initialization leave every record and folder readable under the umask', t => {
  const root = rootFor(t);
  const found = withUmask(0o022, () => {
    rewriteSetupMarker(root, '0.2.0', '2026-11-05');
    withPublicationLock(root, () => initializeDossierLocked(root, 'parts', 'gate', { 'prose.md': '# Gate\n\nTier: modeled\n' }, begin));
    withPublicationLock(root, () => initializeDossierLocked(root, 'compositions', 'control', { 'prose.md': '# Control\n', 'wiring.md': '# Wiring\n' }, begin));
    return modes(root);
  });
  assert.ok(Object.keys(found).includes('parts/gate/integrity.json'));
  assert.ok(Object.keys(found).includes('compositions/control/decisions.log'));
  for (const [path, mode] of Object.entries(found)) {
    const directory = lstatSync(join(root, path)).isDirectory();
    assert.equal(mode, directory ? '755' : '644', `${path} is ${mode}`);
  }
});

test('a rewrite replaces an owner-only record with a readable one', t => {
  const root = rootFor(t), path = join(root, 'record.md');
  writeFileSync(path, 'old\n', { mode: 0o600 });
  withUmask(0o022, () => durableWrite(path, 'new\n'));
  assert.equal(readFileSync(path, 'utf8'), 'new\n');
  assert.equal((lstatSync(path).mode & 0o777).toString(8), '644');
});

test('the umask still decides: a private umask keeps records private', t => {
  const root = rootFor(t), path = join(root, 'record.md');
  withUmask(0o077, () => durableWrite(path, 'text\n'));
  assert.equal((lstatSync(path).mode & 0o777).toString(8), '600');
});

test('no record writer in the storage layer hard-codes an owner-only mode', () => {
  const dir = fileURLToPath(new URL('../../src/dossiers/', import.meta.url));
  const offenders: string[] = [];
  for (const file of readdirSync(dir).filter(name => name.endsWith('.ts'))) {
    readFileSync(join(dir, file), 'utf8').split('\n').forEach((line, i) => {
      // The publication lock is a transient local file that never reaches a checkout.
      if (/0o[67]00/.test(line) && !/ownLock|fd = openSync\(path, 'wx', 0o600\)/.test(line)) offenders.push(`${file}:${i + 1}: ${line.trim()}`);
    });
  }
  assert.deepEqual(offenders, []);
});
