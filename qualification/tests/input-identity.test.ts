import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { fileHash, sha256 } from '../../src/hash.ts';
import { verifyAll } from '../../src/commands/verify.ts';
import { entryText, inputIdentityProblem } from '../../src/trials/answers.ts';
import type { Entry } from '../../src/trials/answers.ts';
import type { Integrity } from '../../src/dossiers/integrity.ts';
import type { TrialResult } from '../../src/trials/trials.ts';

const plugin = fileURLToPath(new URL('../../', import.meta.url));
function fixture(t: TestContext) {
  const work = mkdtempSync(join(tmpdir(), 'dossier-inputs-'));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  cpSync(join(plugin, 'qualification/fixture'), work, { recursive: true });
  const root = join(work, 'dossiers');
  return { root, verify: () => verifyAll({ root, version: '0.1.0' }) };
}

// This is an explicitly synthetic reader fixture, not a new solver execution.
// Selected answers get a local dependency in the basis they rest on, to test reader semantics,
// and the edited entries are bound in integrity.json as publication would bind them.
function addDependency(dir: string, selected: (e: Entry) => boolean) {
  const helper = join(dir, 'model/LocalSupport.tla');
  writeFileSync(helper, '---- MODULE LocalSupport ----\nValue == 1\n====\n');
  const record = join(dir, 'integrity.json'), manifest = JSON.parse(readFileSync(record, 'utf8')) as Integrity;
  let edited = 0;
  for (const name of Object.keys(manifest.evidence)) {
    const path = join(dir, 'evidence', `${name}.json`), entry = JSON.parse(readFileSync(path, 'utf8')) as Entry;
    if (!selected(entry)) continue;
    entry.basis.inputIdentity = { strategy: 'private-copy', files: { ...entry.basis.executed, 'model/LocalSupport.tla': fileHash(helper) }, shared: ['Naturals'], limitation: 'Synthetic dependency binding for reader qualification only.' };
    const text = entryText(entry);
    writeFileSync(path, text);
    manifest.evidence[name] = sha256(text);
    edited++;
  }
  assert.ok(edited > 0, 'the selection names at least one answer');
  writeFileSync(record, JSON.stringify(manifest, null, 2) + '\n');
  return helper;
}

test('captured part imports lapse evidence; an unrelated local module does not', t => {
  const w = fixture(t), dir = join(w.root, 'parts/timelock');
  const helper = addDependency(dir, entry => entry.question.kind !== 'blunder');
  assert.deepEqual(w.verify().parts.find(a => a.id === 'timelock')!.tripwires, [], 'the edited entries are bound');
  const before = w.verify().parts.find(a => a.id === 'timelock')!;
  assert.ok(['checked', 'proved', 'held'].includes(before.marks.A1.mark));
  writeFileSync(join(dir, 'model/Unused.tla'), '---- MODULE Unused ----\nValue == 999\n====\n');
  assert.deepEqual(w.verify().parts.find(a => a.id === 'timelock')!.marks, before.marks);
  writeFileSync(helper, readFileSync(helper, 'utf8').replace('Value == 1', 'Value == 2'));
  const after = w.verify().parts.find(a => a.id === 'timelock')!;
  assert.equal(after.marks.A1.mark, 'lapsed');
  assert.ok(after.marks.A1.lapsed?.includes('executed model/LocalSupport.tla'));
});

test('captured composition imports and generated identities lapse correctly without reading generated views', t => {
  const w = fixture(t), dir = join(w.root, 'compositions/control');
  const helper = addDependency(dir, entry => entry.question.kind !== 'blunder' && entry.question.property === 'A1' && entry.question.scenario === 'all-honest');
  assert.deepEqual(w.verify().compositions.find(a => a.id === 'control')!.tripwires, [], 'the edited entries are bound');
  const cell = () => w.verify().compositions.find(a => a.id === 'control')!.cells.find(c => c.property === 'A1' && c.scenario === 'all-honest')!;
  const baseline = cell();
  assert.equal(baseline.mark, 'proved');
  rmSync(join(dir, 'model/generated'), { recursive: true });
  assert.deepEqual(cell(), baseline);
  writeFileSync(join(dir, 'model/Unused.tla'), '---- MODULE Unused ----\nValue == 999\n====\n');
  assert.deepEqual(cell(), baseline);
  rmSync(helper);
  assert.equal(cell().mark, 'lapsed');
  assert.ok(cell().lapsed.includes('executed model/LocalSupport.tla gone'));
});

test('input identity validates paths, bindings and explicit scope before use', () => {
  const h = '1'.repeat(64);
  const result: Pick<TrialResult, 'executed' | 'inputIdentity'> = { executed: { 'model/Main.tla': h }, inputIdentity: { strategy: 'private-copy', files: { 'model/Main.tla': h }, shared: ['Naturals'], limitation: 'Shared toolchain is not frozen.' } };
  assert.equal(inputIdentityProblem(result), null);
  for (const path of ['../outside', '/absolute', 'model/../outside', 'model\\outside', 'model//outside']) {
    assert.match(inputIdentityProblem({ ...result, inputIdentity: { ...result.inputIdentity!, files: { ...result.executed, [path]: h } } })!, /invalid input binding/);
  }
  assert.match(inputIdentityProblem({ ...result, inputIdentity: { ...result.inputIdentity!, files: { 'model/Main.tla': '2'.repeat(64) } } })!, /disagrees/);
  assert.match(inputIdentityProblem({ ...result, inputIdentity: { ...result.inputIdentity!, limitation: '' } })!, /invalid private-copy/);
  assert.equal(inputIdentityProblem({ ...result, inputIdentity: undefined }), 'invalid private-copy identity', 'an answer rests on an input identity: a result or an entry without one is malformed, never silently given one');
});
