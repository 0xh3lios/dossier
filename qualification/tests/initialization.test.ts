import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { initializeDossierLocked } from '../../src/dossiers/initialize.ts';
import type { InitialInputs } from '../../src/dossiers/initialize.ts';
import { rewriteSetupMarker } from '../../src/commands/setup.ts';
import { readIntegrity, STORAGE } from '../../src/dossiers/integrity.ts';
import { parseDecisions } from '../../src/dossiers/decisions.ts';
import { listComponents, listSystems } from '../../src/dossiers/root.ts';
import { acquirePublicationLock, durableWrite, inspectPublicationLock, recoverPublicationLock, withPublicationLock } from '../../src/dossiers/publication.ts';
import { fingerprint } from '../conformance/files.ts';

const plugin = fileURLToPath(new URL('../../', import.meta.url));
const begin = { time: '2026-11-05T00:00:00Z', verb: 'begin', args: ['modeled'], words: 'Begin the dossier.' };
const today = '2026-11-05';
// Acquiring and removing transient locks changes directory mtimes; all record
// bytes, file modes and file mtimes must still be unchanged by a refused retry.
const recordsFingerprint = (dir: string) => Object.fromEntries(Object.entries(fingerprint(dir)).filter(([, value]) => !value.endsWith(':directory')));
function rootFor(t: TestContext, marker: unknown = { storage: STORAGE, plugin: '0.1.0' }): string {
  const root = mkdtempSync(join(tmpdir(), 'dossier-initialization-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  if (marker !== undefined) writeFileSync(join(root, 'dossier.json'), JSON.stringify(marker) + '\n');
  return root;
}
function command(root: string, ...args: string[]) {
  return spawnSync(process.execPath, [join(plugin, 'src/cli.ts'), ...args, '--root', root], { encoding: 'utf8', env: { ...process.env, DOSSIER_ROOT: root } });
}
function complete(dir: string, inputs: InitialInputs, decision: boolean): void {
  for (const [name, text] of Object.entries(inputs)) assert.equal(readFileSync(join(dir, name), 'utf8'), text);
  const record = readIntegrity(dir);
  assert.deepEqual(record.problems, []);
  assert.deepEqual(record.manifest?.evidence, {});
  assert.equal(parseDecisions(record.decisions).decisions.length, decision ? 1 : 0);
  assert.equal(record.pendingDecisions, '');
}

test('every initialization write boundary leaves either no visible dossier or complete authority; retry cannot duplicate it', t => {
  const cases: { kind: 'components' | 'systems'; inputs: InitialInputs; decision: boolean }[] = [
    { kind: 'components', inputs: { 'prose.md': '# Gate\n\nTier: modeled\n' }, decision: true },
    { kind: 'systems', inputs: { 'prose.md': '# Control\n', 'composition.md': '# Composition\n' }, decision: true },
    { kind: 'components', inputs: { 'prose.md': '# Imported\n', 'margin.md': 'Observed records, awaiting interpretation.\n' }, decision: false },
  ];
  for (const scenario of cases) {
    const baseline = rootFor(t), boundaries: string[] = [];
    withPublicationLock(baseline, () => initializeDossierLocked(baseline, scenario.kind, 'sample', scenario.inputs, scenario.decision ? begin : undefined, { boundary: name => { boundaries.push(name); } }));
    for (const [stop, name] of boundaries.entries()) {
      const root = rootFor(t), dir = join(root, scenario.kind, 'sample');
      let seen = 0;
      assert.throws(() => withPublicationLock(root, () => initializeDossierLocked(root, scenario.kind, 'sample', scenario.inputs, scenario.decision ? begin : undefined, {
        boundary: () => { if (seen++ === stop) throw new Error(`interrupted at ${name}`); },
      })), /interrupted/);
      if (!existsSync(dir)) {
        assert.deepEqual(listComponents(root), []);
        assert.deepEqual(listSystems(root), []);
        assert.ok(readdirSync(join(root, scenario.kind)).every(entry => entry.startsWith('.initializing-')));
        withPublicationLock(root, () => initializeDossierLocked(root, scenario.kind, 'sample', scenario.inputs, scenario.decision ? begin : undefined));
      } else {
        const before = fingerprint(dir);
        assert.throws(() => withPublicationLock(root, () => initializeDossierLocked(root, scenario.kind, 'sample', scenario.inputs, scenario.decision ? begin : undefined)), /cannot replace its authority/);
        assert.deepEqual(fingerprint(dir), before);
      }
      complete(dir, scenario.inputs, scenario.decision);
    }
  }
});

test('a killed initializer leaves a recoverable root lock and a retry begins exactly once', t => {
  for (const stop of ['initialization:staged', 'initialization:sealed', 'initialization:renamed']) {
    const root = rootFor(t), dir = join(root, 'components/gate');
    const inputs = { 'prose.md': '# Gate\n\nTier: modeled\n' };
    const script = `
      import { initializeDossierLocked } from ${JSON.stringify(new URL('../../src/dossiers/initialize.ts', import.meta.url).href)};
      import { withPublicationLock } from ${JSON.stringify(new URL('../../src/dossiers/publication.ts', import.meta.url).href)};
      withPublicationLock(${JSON.stringify(root)}, () => initializeDossierLocked(${JSON.stringify(root)}, 'components', 'gate', ${JSON.stringify(inputs)}, ${JSON.stringify(begin)}, { boundary(name) { if (name === ${JSON.stringify(stop)}) process.kill(process.pid, 'SIGKILL'); } }));
    `;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
    assert.equal(child.signal, 'SIGKILL', child.stderr);
    assert.equal(existsSync(dir), stop === 'initialization:renamed');
    assert.equal(inspectPublicationLock(root).state, 'dead-local');
    assert.throws(() => acquirePublicationLock(root), /locked/);
    recoverPublicationLock(root);
    const retry = command(root, 'decide', 'gate', 'begin', 'modeled');
    assert.equal(retry.status, 0, retry.stderr);
    const first = recordsFingerprint(dir);
    assert.equal(command(root, 'decide', 'gate', 'begin', 'modeled').status, 0);
    assert.deepEqual(recordsFingerprint(dir), first);
    assert.deepEqual(readIntegrity(dir).problems, []);
    assert.equal(parseDecisions(readIntegrity(dir).decisions).decisions.length, 1);
    assert.equal(inspectPublicationLock(root).state, 'absent');
  }
});

test('begin and import publish complete component and system records without replacing existing inputs', t => {
  const root = rootFor(t, { storage: STORAGE, plugin: '0.1.0', knowledge: { root: join(plugin, 'qualification/fixture/knowledge') } });
  for (const args of [['decide', 'gate', 'begin', 'charted'], ['decide', 'systems/control', 'begin'], ['import', 'vault']]) {
    const result = command(root, ...args);
    assert.equal(result.status, 0, result.stderr);
  }
  assert.deepEqual(listComponents(root), ['gate', 'vault']);
  assert.deepEqual(listSystems(root), ['control']);
  for (const name of ['components/gate', 'systems/control', 'components/vault']) assert.deepEqual(readIntegrity(join(root, name)).problems, []);
  const imported = join(root, 'components/vault');
  const before = fingerprint(imported);
  assert.ok(existsSync(join(imported, 'margin.md')));
  assert.equal(readIntegrity(imported).manifest?.decisionHead, null, 'import authors a draft, not an owner decision');
  assert.equal(command(root, 'import', 'vault').status, 1);
  assert.deepEqual(fingerprint(imported), before);
  const prose = readFileSync(join(imported, 'prose.md'), 'utf8');
  assert.equal(command(root, 'decide', 'vault', 'begin', 'modeled').status, 0);
  assert.equal(readFileSync(join(imported, 'prose.md'), 'utf8'), prose);
});

test('begin adopts hand-drafted inputs, but refuses records without integrity.json and an aliased destination, rewriting neither', t => {
  const root = rootFor(t), dir = join(root, 'components/gate');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'prose.md'), 'Keep these authored words.');
  const begun = command(root, 'decide', 'gate', 'begin', '--', 'Begin the drafted gate.');
  assert.equal(begun.status, 0, begun.stderr);
  assert.equal(readFileSync(join(dir, 'prose.md'), 'utf8'), 'Keep these authored words.', 'the drafted words are kept');
  const record = readIntegrity(dir);
  assert.deepEqual(record.problems, []);
  assert.equal(parseDecisions(record.decisions).decisions.length, 1, 'the begin is committed');
  // A decision log or an entry in evidence/ without integrity.json is a record whose binding was lost.
  for (const [id, lost, message] of [
    ['vault', 'decisions.log', /holds decisions\.log but no integrity\.json; restore integrity\.json from version control/],
    ['token', 'evidence/tlc-A1-3fa2c1.json', /holds evidence\/ but no integrity\.json; restore integrity\.json from version control/],
  ] as const) {
    const damaged = join(root, 'components', id);
    mkdirSync(join(damaged, 'evidence'), { recursive: true });
    writeFileSync(join(damaged, 'prose.md'), 'Keep these authored words too.');
    writeFileSync(join(damaged, lost), 'a record whose binding was lost\n');
    const before = recordsFingerprint(damaged);
    const refused = command(root, 'decide', id, 'begin', '--', 'Begin over lost authority.');
    assert.equal(refused.status, 2);
    assert.match(refused.stderr, message);
    assert.deepEqual(recordsFingerprint(damaged), before);
  }
  // A trial's local bundle is no record (STORE-BUNDLE), so a folder holding only bundles and authored inputs is adopted.
  const local = join(root, 'components/oracle');
  for (const folder of ['trials/2026-11-07-1000-chart-aaaaaa', '.running/2026-11-07-1001-chart-bbbbbb']) {
    mkdirSync(join(local, folder), { recursive: true });
    writeFileSync(join(local, folder, 'result.json'), '{"result": "as-called"}\n');
  }
  writeFileSync(join(local, 'prose.md'), 'Drafted beside local bundles.');
  const adopted = command(root, 'decide', 'oracle', 'begin', '--', 'Begin the drafted oracle.');
  assert.equal(adopted.status, 0, adopted.stderr);
  assert.deepEqual(readIntegrity(local).manifest?.evidence, {}, 'the bundles are not bound');
  assert.equal(parseDecisions(readIntegrity(local).decisions).decisions.length, 1);
  const outside = rootFor(t), aliasRoot = rootFor(t);
  symlinkSync(outside, join(aliasRoot, 'components'));
  const outsideBefore = fingerprint(outside);
  assert.throws(() => withPublicationLock(aliasRoot, () => initializeDossierLocked(aliasRoot, 'components', 'gate', { 'prose.md': '# Gate\n' })), /symbolic link/);
  assert.deepEqual(fingerprint(outside), outsideBefore);
});

test('setup serializes its marker read under the root lock and keeps every field it does not update', t => {
  const root = rootFor(t, { plugin: 'old', setup: '2020-01-01', custom: { retained: true }, knowledge: { root: 'records', note: 'keep' }, storage: STORAGE });
  const releaseOther = acquirePublicationLock(root);
  try {
    const committed = { ...JSON.parse(readFileSync(join(root, 'dossier.json'), 'utf8')), otherNote: 'committed by another writer before setup' };
    durableWrite(join(root, 'dossier.json'), JSON.stringify(committed));
    assert.throws(() => rewriteSetupMarker(root, 'new', today), /locked/);
    assert.deepEqual(JSON.parse(readFileSync(join(root, 'dossier.json'), 'utf8')), committed);
  } finally { releaseOther(); }
  let checkedLock = false;
  const { marker, created } = rewriteSetupMarker(root, 'new', today, 'new-records', { boundary(name) {
    if (name !== 'root-marker:locked') return;
    checkedLock = true;
    assert.equal(inspectPublicationLock(root).state, 'live-local');
    assert.throws(() => acquirePublicationLock(root), /locked/);
  } });
  assert.ok(checkedLock);
  assert.equal(created, false);
  assert.deepEqual(marker, { plugin: 'new', setup: '2020-01-01', custom: { retained: true }, knowledge: { root: 'new-records', note: 'keep' }, storage: STORAGE, otherNote: 'committed by another writer before setup', updated: today });
  const unnamed = rootFor(t, { plugin: 'old' });
  assert.equal(rewriteSetupMarker(unnamed, 'new', today).marker.storage, STORAGE, 'with no dossier under it there is nothing to protect, and setup names the format');
  const holding = rootFor(t, { plugin: 'old' });
  mkdirSync(join(holding, 'components', 'gate'), { recursive: true });
  const before = readFileSync(join(holding, 'dossier.json'), 'utf8');
  assert.throws(() => rewriteSetupMarker(holding, 'new', today), /names no storage while dossiers exist under it/);
  assert.equal(readFileSync(join(holding, 'dossier.json'), 'utf8'), before, 'setup does not claim records in a format it does not read');
});

test('setup interruption leaves a whole old or new root marker and safely retries', t => {
  const stops = ['root-marker:locked', 'root-marker:temporary-written', 'root-marker:temporary-flushed', 'root-marker:replaced', 'root-marker:directory-flushed'];
  for (const stop of stops) {
    const old = { storage: STORAGE, plugin: 'old', note: 'preserve' };
    const root = rootFor(t, old);
    assert.throws(() => rewriteSetupMarker(root, 'new', today, undefined, { boundary(name) { if (name === stop) throw new Error('interrupted'); } }), /interrupted/);
    const after = JSON.parse(readFileSync(join(root, 'dossier.json'), 'utf8'));
    assert.equal(after.storage, STORAGE);
    assert.equal(after.note, 'preserve');
    assert.equal(after.plugin, ['root-marker:replaced', 'root-marker:directory-flushed'].includes(stop) ? 'new' : 'old');
    rewriteSetupMarker(root, 'new', today);
    assert.equal(JSON.parse(readFileSync(join(root, 'dossier.json'), 'utf8')).plugin, 'new');
    assert.equal(inspectPublicationLock(root).state, 'absent');
  }
});

test('setup refuses malformed, unsupported and absent storage identities without replacing evidence', t => {
  for (const marker of ['{', '[]', 'null', '{"storage":"integrity-v9"}', '{"storage":null}', '{"knowledge":{"root":1}}', '{"external":{"bad":{"command":[]}}}']) {
    const root = rootFor(t);
    writeFileSync(join(root, 'dossier.json'), marker);
    const before = recordsFingerprint(root);
    assert.throws(() => rewriteSetupMarker(root, 'new', today));
    assert.deepEqual(recordsFingerprint(root), before);
  }
  const root = rootFor(t);
  rmSync(join(root, 'dossier.json'));
  mkdirSync(join(root, 'components'));
  assert.throws(() => rewriteSetupMarker(root, 'new', today), /restore dossier.json from version control/);
  assert.equal(existsSync(join(root, 'dossier.json')), false);
});
