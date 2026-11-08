import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { sha256 } from '../../src/hash.ts';
import { bundleDigest, placeOutput, writeReceipt } from '../../src/trials/receipt.ts';
import { readBundle } from '../../src/trials/trials.ts';
import { validateBundle } from '../../src/dossiers/publication.ts';
import type { Receipt } from '../../src/trials/receipt.ts';

const id = '2026-11-05-1200-blunder-abcdef';
const at = '2026-11-05T12:00:00Z';
function temporary(t: TestContext): string {
  const dir = mkdtempSync(join(tmpdir(), 'dossier-trial-bundle-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function put(dir: string, file: string, text: string): void {
  const path = join(dir, file);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
}
// A blunder trial's bundle, as the runner seals it: the call, the result, the diff, an Alloy instance,
// the output and the receipt. Its files are no record: the receipt lets the runner check them.
function bundle(t: TestContext): { dir: string; receipt: Receipt } {
  const dir = temporary(t);
  put(dir, 'call.md', 'kind: blunder\nexecutes:\n  - model/blunders/rogue.als\nreach: scope 2\nblunder: remove the authority restriction\nexpect:\n  A1: counterexample\nbecause: |\n  An unauthorized actor can send.\n');
  put(dir, 'result.json', JSON.stringify({ id, dossier: 'components/gate', kind: 'blunder', checker: 'alloy', at, result: 'as-called', outcomes: { A1: 'counterexample' }, executed: {}, inputIdentity: { strategy: 'private-copy', files: {}, shared: [], limitation: 'A synthetic bundle reads no input.' } }) + '\n');
  put(dir, 'blunder.diff', '- fact Authorized\n+ // authority omitted\n');
  put(dir, 'alloy/instances/witness.xml', '<instance><atom label="Other$0"/></instance>\n');
  const output = placeOutput(dir, 'A1 has a counterexample within scope 2.\n');
  const receipt = writeReceipt(dir, { runner: 'dossier@test', at, executed: {}, output });
  return { dir, receipt };
}

test('a receipt binds every file the runner wrote, Alloy\'s nested instances among them, and no Finder metadata; a reading left in a bundle is stray', t => {
  const { dir } = bundle(t);
  put(dir, '.DS_Store', 'Finder metadata');
  put(dir, 'alloy/.DS_Store', 'other Finder metadata');
  const receipt = writeReceipt(dir, { runner: 'dossier@test', at, executed: {}, output: { hash: sha256('output'), size: 6, stored: 'trial' } });
  assert.deepEqual(Object.keys(receipt.files), ['alloy/instances/witness.xml', 'blunder.diff', 'call.md', 'output.txt', 'result.json']);
  assert.deepEqual([readBundle(dir, id).problems, readBundle(dir, id).stray], [[], []]);
  const digest = bundleDigest(dir);
  put(dir, '.DS_Store', 'new Finder metadata');
  rmSync(join(dir, 'alloy/.DS_Store'));
  assert.equal(bundleDigest(dir), digest, 'Finder metadata is no file of the bundle');
  put(dir, 'reading.md', 'An interpretation, whose place is beside its entry in evidence/.');
  assert.notEqual(bundleDigest(dir), digest, 'a reading left in a bundle is a file like any other, bound by the digest');
  assert.deepEqual(readBundle(dir, id).stray, ['reading.md'], 'and stray, so the runner publishes no such bundle');
});

test('a bundle\'s digest detects an added, deleted, changed or renamed file beside the call and the result', t => {
  for (const file of ['blunder.diff', 'alloy/instances/witness.xml']) {
    const { dir } = bundle(t);
    const digest = bundleDigest(dir), original = readFileSync(join(dir, file), 'utf8');
    put(dir, file, original + 'changed\n');
    assert.notEqual(bundleDigest(dir), digest, `${file} changed`);
    assert.ok(readBundle(dir, id).problems.includes(`receipt artifact edited: ${file}`));
    put(dir, file, original);
    assert.equal(bundleDigest(dir), digest);
    rmSync(join(dir, file));
    assert.notEqual(bundleDigest(dir), digest, `${file} deleted`);
    assert.ok(readBundle(dir, id).problems.includes(`receipt artifact missing: ${file}`));
    put(dir, file, original);
    put(dir, `${file}.extra`, 'a file added later');
    assert.notEqual(bundleDigest(dir), digest, `${file}.extra added`);
    rmSync(join(dir, `${file}.extra`));
    renameSync(join(dir, file), join(dir, `${file}.renamed`));
    assert.notEqual(bundleDigest(dir), digest, 'paths belong to the binding, not only file content');
  }
});

test('bundle identity is independent of file creation order and includes the receipt itself', t => {
  const { dir } = bundle(t), copy = temporary(t);
  cpSync(dir, copy, { recursive: true });
  const files = ['result.json', 'receipt.json', 'output.txt', 'call.md', 'blunder.diff', 'alloy/instances/witness.xml'];
  for (const file of files) { const bytes = readFileSync(join(copy, file)); rmSync(join(copy, file)); writeFileSync(join(copy, file), bytes); }
  assert.equal(bundleDigest(copy), bundleDigest(dir));
  const receipt = JSON.parse(readFileSync(join(copy, 'receipt.json'), 'utf8'));
  put(copy, 'receipt.json', JSON.stringify({ ...receipt, runner: 'someone-else' }) + '\n');
  assert.notEqual(bundleDigest(copy), bundleDigest(dir));
  const numeric = temporary(t);
  put(numeric, '2', 'two'); put(numeric, '10', 'ten');
  assert.equal(bundleDigest(numeric), sha256(JSON.stringify([['10', sha256('ten')], ['2', sha256('two')]])), 'canonical path order is lexical, including integer-like filenames');
});

// A link where a file of the runner's stands, where none of its files belongs, or under the Finder
// metadata name the digest skips: each is refused, not merely stray.
test('bundle and receipt readers reject symbolic links before reading any file\'s contents', t => {
  for (const file of ['blunder.diff', 'alloy', 'notes.md', '.DS_Store']) {
    const { dir } = bundle(t), outside = temporary(t);
    if (file === 'alloy') put(outside, 'instances/witness.xml', 'bytes outside the bundle');
    else put(outside, 'file', 'bytes outside the bundle');
    rmSync(join(dir, file), { recursive: true, force: true });
    symlinkSync(file === 'alloy' ? outside : join(outside, 'file'), join(dir, file));
    assert.throws(() => bundleDigest(dir), /symbolic link/);
    const read = readBundle(dir, id);
    assert.equal(read.call, null, 'the complete tree is inspected before any file is parsed');
    assert.match(read.problems.join('\n'), /symbolic link/);
  }
  const { dir } = bundle(t), parent = temporary(t);
  symlinkSync(dir, join(parent, 'alias'));
  assert.throws(() => bundleDigest(join(parent, 'alias')), /symbolic link/);
  // The runner publishes a bundle only from .running/ under the dossier (STORE-BUNDLE), never through a link there.
  const dossier = temporary(t), outside = temporary(t);
  cpSync(dir, join(outside, id), { recursive: true });
  symlinkSync(outside, join(dossier, '.running'));
  assert.throws(() => validateBundle(dossier, id), /\.running\/ must be a directory, not a symbolic link/);
});

test('receipt paths cannot escape the bundle, name the receipt itself or name Finder metadata', t => {
  for (const file of ['../outside', '/outside', 'C:\\outside', 'alloy/../outside', 'alloy//instance.xml', 'receipt.json', '.DS_Store']) {
    const { dir, receipt } = bundle(t);
    put(dir, 'receipt.json', JSON.stringify({ ...receipt, files: { ...receipt.files, [file]: sha256('outside') } }) + '\n');
    const read = readBundle(dir, id);
    assert.ok(read.problems.includes(`receipt artifact invalid: ${file}`), file);
  }
});

test('a special file in a bundle is refused without opening it', { skip: process.platform === 'win32' ? 'mkfifo is a POSIX fixture utility' : false }, t => {
  const { dir } = bundle(t);
  const result = spawnSync('mkfifo', [join(dir, 'alloy/pipe')], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.throws(() => bundleDigest(dir), /not a regular trial file: alloy\/pipe/);
  assert.match(readBundle(dir, id).problems.join('\n'), /not a regular trial file: alloy\/pipe/);
});
