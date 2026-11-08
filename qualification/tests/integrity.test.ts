import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir, hostname } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import type { TestContext } from 'node:test';
import { sha256 } from '../../src/hash.ts';
import { formatDecision, parseDecisions, retiredBy } from '../../src/dossiers/decisions.ts';
import { committedPrefix, prefixHead, readIntegrity, validateIntegrity } from '../../src/dossiers/integrity.ts';
import { acquirePublicationLock, inspectPublicationLock, LOCK, publishAnswer, publishDecisionLocked, recoverAnswer, recoverDecisions, recoverPublicationLock, validateBundle, withPublicationLock, writeIntegrity } from '../../src/dossiers/publication.ts';
import type { PublicationOptions } from '../../src/dossiers/publication.ts';
import { loadComponent } from '../../src/dossiers/load.ts';
import { locate } from '../../src/dossiers/root.ts';
import { answerContext } from '../../src/commands/trial.ts';
import { verifyAll } from '../../src/commands/verify.ts';
import { completed, entryText } from '../../src/trials/answers.ts';
import { answerOf } from '../conformance/evidence.ts';
import type { Entry } from '../../src/trials/answers.ts';
import { bundleDigest, writeReceipt } from '../../src/trials/receipt.ts';
import type { AnswerRead } from '../../src/trials/answers.ts';
import { fingerprint } from '../conformance/files.ts';

const plugin = fileURLToPath(new URL('../../', import.meta.url));
const cli = join(plugin, 'src/cli.ts');
const empty = () => ({ schema: 1 as const, evidence: {}, decisionHead: null });
const decision = { time: '2026-11-05T00:00:00Z', verb: 'begin', args: ['charted'], words: 'Begin this component.' };
// The boundaries of a publication that writes an entry, in the order STORE-ANSWER gives: the
// candidate (1), the manifest that binds it (2), the entry in place and the directory flushed (3),
// the bundle moved to the local trials/ (4).
const ORDER = ['answer:candidate', 'manifest:temporary-written', 'manifest:temporary-flushed', 'manifest:replaced', 'manifest:directory-flushed', 'answer:placed', 'answer:directory-flushed', 'answer:shelved'];

function temp(t: TestContext) {
  const work = mkdtempSync(join(tmpdir(), 'dossier-integrity-'));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  return work;
}
// A dossier with an empty manifest and nothing else, for the tests of the manifest and the decisions.
function bare(t: TestContext) {
  const root = join(temp(t), 'dossiers'), dir = join(root, 'components/adapter');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(root, 'dossier.json'), JSON.stringify({ plugin: '0.1.0', storage: 'integrity-v1' }));
  writeIntegrity(dir, empty());
  return { root, dir };
}
function stopAt(name: string): PublicationOptions { return { boundary: (stage: string) => { if (stage === name) throw new Error(`interrupted at ${stage}`); } }; }

// The real command against the dossiers root at `root`, with `env` added to this process's; it must succeed.
const dossierAt = (root: string, env: NodeJS.ProcessEnv = {}) => (...args: string[]) => {
  const r = spawnSync(process.execPath, [cli, args[0], '--root', root, ...args.slice(1)], { encoding: 'utf8', env: { ...process.env, DOSSIER_ROOT: '', ...env } });
  assert.equal(r.status, 0, `${args.join(' ')}\n${r.stdout}\n${r.stderr}`);
  return r.stdout;
};
// A new dossiers root at `root`: the marker, with `marker` added to it, and one public actor.
function newRoot(root: string, marker: object = {}) {
  mkdirSync(join(root, 'actors'), { recursive: true });
  writeFileSync(join(root, 'dossier.json'), JSON.stringify({ plugin: '0.1.0', storage: 'integrity-v1', ...marker }));
  writeFileSync(join(root, 'actors/actors.md'), '# Actors\n\n```yaml\nactors:\n  - id: public\n    kind: public\n    modes: [honest, malicious]\n```\n');
  writeFileSync(join(root, 'actors/scenarios.md'), '# Scenarios\n\n```yaml\nscenarios:\n  - id: all-honest\n    modes: {}\n```\n');
}

// A small charted component, run through the real command once: a chart answer and an external answer
// on its first prose, with their readings; then a chart trial on prose without A1, which replaces the
// chart answer and leaves the external question, which expects A1, gone. Tests publish copies of these
// bundles into fresh copies of the dossier.
interface Template { root: string; dir: string; prose: { first: string; second: string }; chart: string; external: string; replacing: string; names: { chart: string; external: string }; first: Record<string, string> }
let built: (Template & { work: string }) | null = null;
after(() => { if (built) rmSync(built.work, { recursive: true, force: true }); });
function template(): Template {
  if (built) return built;
  const work = mkdtempSync(join(tmpdir(), 'dossier-integrity-template-'));
  const root = join(work, 'dossiers'), dir = join(root, 'components/gate');
  const runner = join(work, 'runner.mjs');
  writeFileSync(runner, `#!${process.execPath}\nimport { readFileSync } from 'node:fs';\nconst input = JSON.parse(readFileSync(0, 'utf8'));\nconst outcomes = Object.fromEntries(Object.entries(input.call.expect).map(([name, o]) => [name, o.expect]));\nconsole.log(JSON.stringify({ outcomes, covers: Object.keys(outcomes) }));\n`);
  chmodSync(runner, 0o755);
  newRoot(root, { external: { check: { command: [runner] } } });
  const command = dossierAt(root);
  const trial = (name: string, text: string) => {
    mkdirSync(join(dir, 'calls'), { recursive: true });
    writeFileSync(join(dir, 'calls', name), text);
    return command('trial', 'gate', name).match(/^trial: (\S+)/m)![1];
  };
  command('decide', 'gate', 'begin', 'charted', '--', 'Begin the gate.');
  const first = readFileSync(join(plugin, 'qualification/conformance/fixtures/budget.md'), 'utf8').replaceAll('the operator', 'the public');
  const second = first.replace('## Always\n[A1] Always, {paid + balance = 3}.\n\n', '');
  assert.notEqual(second, first);
  writeFileSync(join(dir, 'prose.md'), first);
  const chartCall = (because: string) => `kind: chart\nexecutes:\n  - prose.md\nreach: capacity 0..2; balance 0..3\nexpect:\n  checks: pass\nbecause: ${because}\n`;
  const chart = trial('chart.md', chartCall('Three attempted payments exhaust capacity.'));
  const external = trial('external.md', 'kind: external\nrunner: check\nexecutes:\n  - prose.md\nreach: the named prose\nexpect:\n  A1: pass\nbecause: the runner observes the sum the budget keeps\n');
  const names = { chart: answerOf(dir, chart)!.name, external: answerOf(dir, external)!.name };
  for (const name of Object.values(names)) writeFileSync(join(dir, 'evidence', `${name}.md`), `The reading of ${name}.\n`);
  const records: Record<string, string> = {};
  for (const path of ['integrity.json', 'decisions.log', ...readdirSync(join(dir, 'evidence')).map(name => `evidence/${name}`)]) records[path] = readFileSync(join(dir, path), 'utf8');
  writeFileSync(join(dir, 'prose.md'), second);
  const replacing = trial('again.md', chartCall('The same finite meaning without A1.'));
  built = { work, root, dir, prose: { first, second }, chart, external, replacing, names, first: records };
  return built;
}

// A fresh copy of the template's dossier: its prose, its records (none: an empty manifest; first:
// the two answers on the first prose, with their readings), and the bundles of trials waiting in
// .running/ as the runner leaves them when it starts to publish.
function dossier(t: TestContext, { prose = 'first', records = 'none', waiting = [] }: { prose?: 'first' | 'second'; records?: 'none' | 'first'; waiting?: string[] } = {}) {
  const T = template(), work = temp(t);
  const root = join(work, 'dossiers'), dir = join(root, 'components/gate');
  cpSync(T.root, root, { recursive: true, filter: source => !/\/components\/gate\/(evidence|trials|calls)$/.test(source) });
  writeFileSync(join(dir, 'prose.md'), T.prose[prose]);
  if (records === 'none') writeIntegrity(dir, { ...empty(), decisionHead: JSON.parse(T.first['integrity.json']).decisionHead });
  else {
    mkdirSync(join(dir, 'evidence'));
    for (const [path, text] of Object.entries(T.first)) writeFileSync(join(dir, path), text);
  }
  for (const id of waiting) cpSync(join(T.dir, 'trials', id), join(dir, '.running', id), { recursive: true });
  return {
    work, root, dir,
    staging: (id: string) => join(dir, '.running', id),
    context: () => answerContext(locate(root, 'gate')!, loadComponent(root, 'gate'), dir),
    gate: () => verifyAll({ root, version: '0.1.0' }).components.find(c => c.id === 'gate')!,
  };
}
// The record's files with their bytes, modes and mtimes: what a publication that writes nothing must leave as it was.
const recordFiles = (dir: string) => Object.fromEntries(Object.entries(fingerprint(dir)).filter(([path, signature]) => !signature.endsWith(':directory') && (path === 'integrity.json' || path === 'decisions.log' || path.startsWith('evidence/'))));
// What a publication leaves: the record's bytes, and the bundles in the local trials/ and in .running/.
function state(dir: string) {
  const files: Record<string, string> = {};
  for (const path of ['integrity.json', 'decisions.log']) files[path] = readFileSync(join(dir, path), 'utf8');
  if (existsSync(join(dir, 'evidence'))) for (const name of readdirSync(join(dir, 'evidence')).sort()) files[`evidence/${name}`] = readFileSync(join(dir, 'evidence', name), 'utf8');
  const bundles = (folder: string) => existsSync(join(dir, folder)) ? Object.fromEntries(readdirSync(join(dir, folder)).sort().map(id => [id, bundleDigest(join(dir, folder, id))])) : {};
  return { files, trials: bundles('trials'), running: bundles('.running') };
}

// A small modeled gate whose A1 an inductive Apalache trial proves, run once through the real command
// with a stand-in for Apalache that prints a recorded run with no error, for the step and for the base.
// `before` is the dossier as it was before that trial; tests stage the trial's bundle into fresh copies of it.
interface Inductive { before: string; dir: string; trial: string }
let proved: (Inductive & { work: string }) | null = null;
after(() => { if (proved) rmSync(proved.work, { recursive: true, force: true }); });
function inductive(): Inductive {
  if (proved) return proved;
  const work = mkdtempSync(join(tmpdir(), 'dossier-integrity-inductive-'));
  const root = join(work, 'dossiers'), dir = join(root, 'components/gate'), before = join(work, 'before');
  newRoot(root);
  dossierAt(root)('decide', 'gate', 'begin', 'modeled', '--', 'Begin the gate.');
  writeFileSync(join(dir, 'prose.md'), '# Gate\n\nTier: modeled\nModule: gate\n\n## States\n[S1] Ready: waiting.\n\n## Events\n[E1] ping, from the public: a ping.\n\n## Moves\n[M1] When Ready receives ping, it stays Ready.\n\n## Always\n[A1] Always, {Ready}.\n\n## Words only\n[T1] This piece promises nothing eventual.\n');
  mkdirSync(join(dir, 'model'));
  writeFileSync(join(dir, 'model/Gate.tla'), '---- MODULE Gate ----\nVARIABLE state\nInit == state = "Ready"\nNext == state\' = state\nA1 == state = "Ready"\n====\n');
  cpSync(root, before, { recursive: true });
  const apalache = join(work, 'apalache');
  writeFileSync(apalache, `#!/bin/sh\nif [ "$1" = version ]; then echo 0.62.4; exit 0; fi\ncat '${join(plugin, 'qualification/tests/recorded/apalache/inductive-step.txt')}'\n`);
  chmodSync(apalache, 0o755);
  mkdirSync(join(dir, 'calls'));
  writeFileSync(join(dir, 'calls/inductive.md'), 'kind: apalache\nmode: inductive\nexecutes:\n  - model/Gate.tla\nreach: unbounded; A1 inductive\nexpect:\n  A1: holds\nbecause: ping leaves the gate Ready\n');
  const trial = dossierAt(root, { APALACHE: apalache })('trial', 'gate', 'inductive.md').match(/^trial: (\S+)/m)![1];
  proved = { work, before, dir, trial };
  return proved;
}
// A fresh copy of the gate before its inductive trial, a question with no answer yet, with that
// trial's bundle waiting in .running/ as the runner leaves it when it starts to publish.
function inductiveWaiting(t: TestContext) {
  const I = inductive(), root = join(temp(t), 'dossiers'), dir = join(root, 'components/gate');
  cpSync(I.before, root, { recursive: true });
  cpSync(join(I.dir, 'trials', I.trial), join(dir, '.running', I.trial), { recursive: true });
  return {
    root, dir, id: I.trial, staging: join(dir, '.running', I.trial),
    context: () => answerContext(locate(root, 'gate')!, loadComponent(root, 'gate'), dir),
    gate: () => verifyAll({ root, version: '0.1.0' }).components.find(c => c.id === 'gate')!,
  };
}
// A bundle's result.json edited, and its receipt sealed again over the edit, as a runner that wrote
// that result would have sealed it.
function resealed(staging: string, edit: (result: Record<string, unknown>) => void) {
  const path = join(staging, 'result.json'), result = JSON.parse(readFileSync(path, 'utf8'));
  edit(result);
  writeFileSync(path, JSON.stringify(result, null, 2) + '\n');
  writeReceipt(staging, JSON.parse(readFileSync(join(staging, 'receipt.json'), 'utf8')));
}

test('integrity schema refuses unknown formats and cannot contain derived conclusions', () => {
  assert.deepEqual(validateIntegrity(empty()), empty());
  const bound = { ...empty(), evidence: { 'tlc-N1-executor-offline-9b1e04': 'a'.repeat(64) } };
  assert.deepEqual(validateIntegrity(bound), bound);
  for (const value of [
    { ...empty(), schema: 2 }, { ...empty(), marks: {} },
    { schema: 1, trials: {}, decisionHead: null }, { ...empty(), trials: {} },
    { ...empty(), evidence: { '../outside': 'a'.repeat(64) } }, { ...empty(), evidence: { 'tlc-A1-3fa2c1.json': 'a'.repeat(64) } },
    { ...empty(), evidence: { 'tlc-A1-3fa2c1': null } }, { ...empty(), evidence: { 'tlc-A1-3fa2c1': 'a'.repeat(63) } },
    { ...empty(), decisionHead: { algorithm: 'sha256-line-8', digest: '0'.repeat(8) } }, { ...empty(), decisionHead: { algorithm: 'sha256-prefix', bytes: -1, digest: '0'.repeat(64) } },
  ]) assert.throws(() => validateIntegrity(value), JSON.stringify(value));
});

test('only an intact committed decision prefix applies; a pending retire cannot hide a dossier', t => {
  const { dir, root } = bare(t);
  withPublicationLock(dir, () => publishDecisionLocked(dir, decision));
  const committed = readFileSync(join(dir, 'decisions.log'), 'utf8');
  const suffix = formatDecision({ ...decision, verb: 'retire', words: 'A pending retirement.' }, committed.trimEnd()) + '\n';
  writeFileSync(join(dir, 'decisions.log'), committed + suffix);
  let record = readIntegrity(dir);
  assert.equal(record.decisions, committed);
  assert.equal(record.pendingDecisions, suffix);
  assert.equal(retiredBy(parseDecisions(record.decisions).decisions), null);
  assert.equal(record.problems[0].name, 'decision publication incomplete');
  writeFileSync(join(dir, 'decisions.log'), committed + 'a malformed suffix');
  assert.equal(readIntegrity(dir).decisions, committed, 'malformed pending bytes do not erase committed decisions');
  writeFileSync(join(dir, 'decisions.log'), committed.replace('Begin this', 'Alter this'));
  record = readIntegrity(dir);
  assert.equal(record.decisions, '');
  assert.equal(record.problems[0].name, 'decisions chain broken');
  rmSync(join(dir, 'integrity.json'));
  assert.equal(readIntegrity(dir).mode, 'invalid', 'a missing manifest grants no authority');
  rmSync(join(root, 'dossier.json'));
  assert.equal(readIntegrity(dir).mode, 'invalid', 'missing root marker also cannot downgrade');
});

test('prefix hashing binds earlier owner words, not only the final short-chain link', () => {
  const one = formatDecision(decision), two = formatDecision({ ...decision, verb: 'accept', args: ['A1@12345678'], words: 'Accept.' }, one);
  const log = one + '\n' + two + '\n', head = prefixHead(log)!;
  assert.equal(committedPrefix(log, head).text, log);
  assert.match(committedPrefix(log.replace('Begin this', 'Alter this'), head).problem!, /digest/);
  assert.match(committedPrefix(one + '\n', head).problem!, /truncated/);
});

test('the CLI preserves quoted owner words exactly, including surrounding whitespace', t => {
  const { root } = bare(t), words = '  Keep these exact words.\nIncluding this line.  ';
  const run = (verb: string, supplied: string) => spawnSync(process.execPath, [cli, 'decide', '--root', root, 'components/new-piece', verb, ...(verb === 'begin' ? ['charted'] : []), '--', supplied], { encoding: 'utf8' });
  const begin = run('begin', words);
  assert.equal(begin.status, 0, begin.stderr);
  const dir = join(root, 'components/new-piece');
  const recorded = parseDecisions(readIntegrity(dir).decisions).decisions[0];
  assert.ok(!recorded.malformed);
  assert.equal(recorded.words, words);
  const before = readFileSync(join(dir, 'decisions.log'), 'utf8');
  assert.equal(run('retire', '   ').status, 2, 'whitespace alone is still no owner reason');
  assert.equal(readFileSync(join(dir, 'decisions.log'), 'utf8'), before);
});

test('a symbolic link in place of .running/ is refused by validation, publication and recovery before anything is published', t => {
  const T = template(), d = dossier(t), outside = join(d.work, 'outside');
  mkdirSync(outside);
  cpSync(join(T.dir, 'trials', T.chart), join(outside, T.chart), { recursive: true });
  symlinkSync(outside, join(d.dir, '.running'), 'dir');
  const before = fingerprint(outside);
  assert.throws(() => validateBundle(d.dir, T.chart), /not a symbolic link/);
  assert.throws(() => publishAnswer(d.dir, T.chart, d.context()), /symbolic link/);
  assert.throws(() => recoverAnswer(d.dir, T.chart, d.context()), /symbolic link/);
  assert.deepEqual(readIntegrity(d.dir).manifest!.evidence, {});
  assert.equal(existsSync(join(d.dir, 'evidence')), false);
  assert.deepEqual(fingerprint(outside), before, 'nothing is written through the link');
});

// STORE-FORMAT: a symbolic link in evidence/ is refused. An entry written through a link in place of
// evidence/ would be published outside the dossier, under a binding verify cannot read.
test('publication and recovery never write an entry through a symbolic link in place of evidence/', t => {
  const T = template(), d = dossier(t, { waiting: [T.chart] }), outside = join(d.work, 'outside');
  mkdirSync(outside);
  symlinkSync(outside, join(d.dir, 'evidence'), 'dir');
  const manifest = readFileSync(join(d.dir, 'integrity.json'), 'utf8');
  assert.throws(() => publishAnswer(d.dir, T.chart, d.context()), 'publication refuses the link');
  assert.deepEqual(readdirSync(outside), [], 'no entry is written through it');
  assert.equal(readFileSync(join(d.dir, 'integrity.json'), 'utf8'), manifest, 'and none is bound');
  const recovered = spawnSync(process.execPath, [cli, 'recover', '--root', d.root, 'gate', 'trial', T.chart], { encoding: 'utf8', env: { ...process.env, DOSSIER_ROOT: '' } });
  assert.equal(recovered.status, 2, `dossier recover refuses the link\n${recovered.stdout}${recovered.stderr}`);
  assert.deepEqual(readdirSync(outside), []);
  assert.equal(readFileSync(join(d.dir, 'integrity.json'), 'utf8'), manifest);
});

test('unreadable authority records fail closed without throwing out of the reader', t => {
  const { dir } = bare(t);
  mkdirSync(join(dir, 'decisions.log'));
  assert.equal(readIntegrity(dir).mode, 'invalid');
  assert.equal(readIntegrity(dir).decisions, '');
  assert.match(readIntegrity(dir).problems[0].where, /regular file/);
  rmSync(join(dir, 'decisions.log'), { recursive: true });
  const outside = join(temp(t), 'manifest.json');
  writeFileSync(outside, JSON.stringify(empty()));
  rmSync(join(dir, 'integrity.json'));
  symlinkSync(outside, join(dir, 'integrity.json'));
  assert.equal(readIntegrity(dir).mode, 'invalid');
  assert.equal(readIntegrity(dir).problems[0].name, 'integrity malformed');
});

test('lock dry-run inspects actual ownership without writing or recovering it', t => {
  const { root, dir } = bare(t);
  const dead = spawnSync(process.execPath, ['-e', 'process.exit(0)']);
  assert.equal(dead.status, 0);
  const cases = [
    { owner: { host: hostname(), pid: dead.pid, token: 'dead' }, state: 'dead-local', status: 0 },
    { owner: { host: hostname(), pid: process.pid, token: 'live' }, state: 'live-local', status: 2 },
    { owner: { host: hostname() + '-other', pid: dead.pid, token: 'foreign' }, state: 'foreign', status: 2 },
    { owner: { pid: 'malformed' }, state: 'unreadable', status: 2 },
  ];
  for (const { owner, state, status } of cases) {
    writeFileSync(join(root, LOCK), JSON.stringify(owner));
    const before = fingerprint(root);
    assert.equal(inspectPublicationLock(root).state, state);
    const result = spawnSync(process.execPath, [cli, 'recover', '--root', root, '--root-lock', '--dry-run'], { encoding: 'utf8' });
    assert.equal(result.status, status, result.stderr);
    assert.match(result.stdout, new RegExp(state));
    assert.deepEqual(fingerprint(root), before);
  }
  writeFileSync(join(dir, '.publication-lock-recovery'), JSON.stringify({ host: hostname(), pid: process.pid, token: 'guard' }));
  assert.equal(inspectPublicationLock(dir).state, 'recovery-in-progress');
});

test('an answer is published in the contract\'s order, and a confirming publication runs only the last step', t => {
  const T = template(), { chart, external } = T.names;
  const d = dossier(t, { prose: 'second', records: 'first', waiting: [T.replacing] });
  const candidate = join(d.staging(T.replacing), 'entry.json'), evidence = (file: string) => join(d.dir, 'evidence', file);
  const bound = () => readIntegrity(d.dir).manifest!.evidence;
  const seen: string[] = [];
  const publication = publishAnswer(d.dir, T.replacing, d.context(), { boundary: name => {
    seen.push(name);
    if (name === 'answer:candidate') {
      assert.ok(existsSync(candidate), 'step 1 writes the candidate beside its bundle');
      assert.deepEqual(bound(), JSON.parse(T.first['integrity.json']).evidence, 'and binds nothing yet');
    } else if (name === 'manifest:replaced') {
      assert.deepEqual(bound(), { [chart]: sha256(readFileSync(candidate)) }, 'step 2 binds the candidate under its entry\'s name, and the gone question\'s line goes with it');
      assert.equal(readFileSync(evidence(`${chart}.json`), 'utf8'), T.first[`evidence/${chart}.json`], 'the recorded answer stays in place until step 3');
      assert.ok(existsSync(evidence(`${external}.json`)), 'the gone question\'s entry is deleted after step 3');
    } else if (name === 'answer:placed') {
      assert.equal(sha256(readFileSync(evidence(`${chart}.json`))), bound()[chart], 'step 3 renames the bound candidate into place');
      assert.equal(existsSync(candidate), false);
    } else if (name === 'answer:directory-flushed') {
      for (const file of [`${chart}.md`, `${external}.json`, `${external}.md`]) assert.equal(existsSync(evidence(file)), false, `${file} is gone before the bundle moves`);
      assert.ok(existsSync(d.staging(T.replacing)), 'the bundle moves last');
    }
  } });
  assert.deepEqual(seen, ORDER);
  assert.deepEqual(publication, { action: 'published', name: chart, replaced: true, gone: [external], superseded: [] });
  assert.ok(existsSync(join(d.dir, 'trials', T.replacing)) && !existsSync(d.staging(T.replacing)), 'step 4 moves the bundle to the local trials/');
  const entry = JSON.parse(readFileSync(evidence(`${chart}.json`), 'utf8')) as Entry;
  assert.equal(entry.established.trial, T.replacing);
  assert.equal(entry.established.bundle, bundleDigest(join(d.dir, 'trials', T.replacing)), 'the entry names the digest of its bundle, which moving it leaves unchanged');

  // The same answer again on the same basis: nothing is written, and the bundle moves to trials/ (step 4 alone).
  const k = dossier(t, { records: 'first', waiting: [T.chart] });
  const before = recordFiles(k.dir), steps: string[] = [];
  const kept = publishAnswer(k.dir, T.chart, k.context(), { boundary: name => { steps.push(name); } });
  assert.deepEqual([kept.action, kept.name, kept.gone], ['kept', chart, []]);
  assert.match(kept.reason!, /same answer on an unchanged basis/);
  assert.deepEqual(steps.filter(name => name === 'answer:candidate' || name === 'answer:placed' || name.startsWith('manifest:')), [], 'no candidate, manifest or placement step runs');
  assert.deepEqual(recordFiles(k.dir), before, 'a confirming publication writes no byte of the record');
  assert.ok(existsSync(join(k.dir, 'trials', T.chart)) && !existsSync(k.staging(T.chart)));
});

// Each boundary, for a first answer and for an answer that replaces one in the publication that also
// removes a gone question. The incomplete publication grants nothing; a retry of the same run is
// refused while its candidate waits; explicit recovery finishes it with the records an uninterrupted
// publication leaves; and recovering it again changes nothing.
const scenarios = {
  first: { prose: 'first', records: 'none', run: (T: Template) => T.chart },
  replacing: { prose: 'second', records: 'first', run: (T: Template) => T.replacing },
} as const;
for (const scenario of ['first', 'replacing'] as const) for (const stop of ORDER) test(`interrupted answer publication (${scenario}): ${stop}`, async t => {
  const T = template(), { chart, external } = T.names, s = scenarios[scenario], run = s.run(T);
  const make = (t: TestContext) => dossier(t, { prose: s.prose, records: s.records, waiting: [run] });
  const interrupted = (t: TestContext) => {
    const d = make(t);
    assert.throws(() => publishAnswer(d.dir, run, d.context(), stopAt(stop)), /interrupted/);
    return d;
  };
  const whole = make(t);
  publishAnswer(whole.dir, run, whole.context());
  const expected = state(whole.dir);
  const at = ORDER.indexOf(stop);
  const bound = at >= ORDER.indexOf('manifest:replaced'), placed = at >= ORDER.indexOf('answer:placed');
  const cleared = at >= ORDER.indexOf('answer:directory-flushed'), waits = at < ORDER.indexOf('answer:shelved'), candidate = !placed;
  const gone = scenario === 'replacing' && !cleared;

  // What verify concludes in between. Whether it reports a candidate the manifest does not bind yet
  // is the next test's question; here only what such a candidate grants is.
  const d = interrupted(t), a = d.gate();
  const recorded = scenario === 'replacing' ? [T.chart] : [];
  assert.deepEqual(a.marks.W1.trials, placed ? [run] : bound ? [] : recorded, 'the new answer counts only once it is in place under its binding, and the replaced one stops counting once the binding moves');
  const tripwires = a.tripwires.map(trip => trip.name).filter(name => bound || name !== 'answer publication incomplete').sort();
  // Between steps 2 and 3 the gone question's entry is unbound, which is no tripwire: its question is
  // gone, it covers nothing, and the next publication removes it (ANSWER-GONE, ANSWER-DROP, STORE-ANSWER).
  assert.deepEqual(tripwires, [...(bound && !placed ? ['answer publication incomplete'] : [])].sort());
  if (bound && !placed) assert.ok(a.tripwires.some(trip => trip.name === 'answer publication incomplete' && trip.where.includes(`evidence/${chart}.json`) && trip.where.includes(run)));
  assert.ok(!a.tripwires.some(trip => trip.name === 'answer unbound'), 'an unbound entry whose question is gone trips nothing');
  assert.equal(a.flags.some(flag => flag.name === 'question gone' && flag.where.includes(external)), gone, 'until step 3 deletes it, the gone question is flagged and covers nothing');

  await t.test('retry', t => {
    const d = interrupted(t);
    if (candidate) {
      const before = recordFiles(d.dir);
      assert.throws(() => publishAnswer(d.dir, run, d.context()), /earlier candidate; recover it explicitly/);
      assert.deepEqual(recordFiles(d.dir), before, 'a refused retry writes nothing');
      recoverAnswer(d.dir, run, d.context());
    } else if (waits) assert.equal(publishAnswer(d.dir, run, d.context()).action, 'kept', 'with the entry in place the retry finds its own answer and writes no other');
    else assert.throws(() => publishAnswer(d.dir, run, d.context()), /already exists/);
    assert.deepEqual(state(d.dir), expected);
  });
  await t.test('recovery', t => {
    const d = interrupted(t);
    if (waits) assert.equal(recoverAnswer(d.dir, run, d.context()).action, candidate ? 'published' : 'kept');
    else assert.throws(() => recoverAnswer(d.dir, run, d.context()), /no run \S+ waits/);
    assert.deepEqual(state(d.dir), expected);
    const settled = recordFiles(d.dir);
    assert.throws(() => recoverAnswer(d.dir, run, d.context()), /no run \S+ waits/, 'a finished publication leaves nothing to recover');
    assert.deepEqual(recordFiles(d.dir), settled, 'recovering it again changes nothing');
  });
});

// STORE-ANSWER: "An interruption between those steps leaves unbound entries, which cover nothing. The
// next publication removes one whose question is gone". Here the next publication is a new trial's.
test('a gone question\'s entry left unbound by an interruption covers nothing, and the next publication removes it', t => {
  const T = template(), { external } = T.names;
  const d = dossier(t, { prose: 'second', records: 'first', waiting: [T.replacing] });
  assert.throws(() => publishAnswer(d.dir, T.replacing, d.context(), stopAt('answer:placed')), /interrupted/);
  const a = d.gate();
  assert.ok(!a.tripwires.some(trip => trip.name === 'answer unbound'), 'an unbound entry whose question is gone is no tripwire');
  assert.ok(a.flags.some(flag => flag.name === 'question gone' && flag.where.includes(`evidence/${external}.json`)), 'it is flagged question gone');
  assert.ok(!a.completed.some(x => x.entry.established.trial === T.external), 'it covers nothing');
  mkdirSync(join(d.dir, 'calls'));
  writeFileSync(join(d.dir, 'calls', 'other.md'), 'kind: external\nrunner: check\nexecutes:\n  - prose.md\nreach: the named prose\nexpect:\n  other: pass\nbecause: another question about the same prose\n');
  const next = spawnSync(process.execPath, [cli, 'trial', '--root', d.root, 'gate', 'other.md'], { encoding: 'utf8', env: { ...process.env, DOSSIER_ROOT: '' } });
  assert.equal(next.status, 0, `the next publication runs\n${next.stdout}${next.stderr}`);
  assert.match(next.stdout, new RegExp(`^  removed evidence/${external}\\.json: its question no longer exists$`, 'm'));
  for (const file of [`${external}.json`, `${external}.md`]) assert.equal(existsSync(join(d.dir, 'evidence', file)), false, file);
});

// ANSWER-SUPERSEDED, ANSWER-DROP, STORE-ANSWER: a publication asks verify which answers later ones supersede, among
// the entries as it leaves them, the candidate in its question's place and the gone questions out; the
// superseded answers lose their manifest lines with the binding and their files after the rename, in a
// publication that writes an entry and in one that writes nothing.
test('a publication removes the answers verify says later answers supersede, the manifest line first and the files after the rename', t => {
  const T = template(), { chart, external } = T.names;
  const d = dossier(t, { prose: 'second', records: 'first', waiting: [T.replacing] });
  const asked: string[][] = [];
  publishAnswer(d.dir, T.replacing, { ...d.context(), superseded: (answers: AnswerRead[]) => { asked.push(answers.map(x => `${x.name}:${x.entry?.established.trial}`)); return []; } });
  assert.deepEqual(asked, [[`${chart}:${T.replacing}`]], 'the candidate stands in its question\'s place, and the gone question is out');

  const k = dossier(t, { records: 'first', waiting: [T.chart] });
  const bound = () => readIntegrity(k.dir).manifest!.evidence;
  const evidence = (file: string) => join(k.dir, 'evidence', file);
  const seen: string[] = [];
  const kept = publishAnswer(k.dir, T.chart, { ...k.context(), superseded: () => [external, chart] }, { boundary: name => {
    seen.push(name);
    if (name === 'manifest:replaced') {
      assert.deepEqual(Object.keys(bound()), [chart], 'the superseded answer\'s line goes with the manifest');
      assert.ok(existsSync(evidence(`${external}.json`)) && existsSync(evidence(`${external}.md`)), 'its files wait for the rename step');
    }
    if (name === 'answer:directory-flushed') for (const file of [`${external}.json`, `${external}.md`]) assert.equal(existsSync(evidence(file)), false, `${file} is gone before the bundle moves`);
  } });
  assert.deepEqual([kept.action, kept.gone, kept.superseded], ['kept', [], [external]], 'the answer being published is never superseded, whatever verify says of it');
  assert.deepEqual(seen.filter(name => name.startsWith('manifest:')), ORDER.filter(name => name.startsWith('manifest:')), 'a publication that writes nothing still writes the manifest when it removes an answer');
  const a = k.gate();
  assert.deepEqual([a.answerRows.map(r => r.entry), a.tripwires], [[chart], []]);
});

// STORE-RECOVER: what an interrupted publication had dropped from the manifest, it recorded beside its
// bundle, and the recovery deletes exactly those files, whatever verify would say of them by then. The
// second read found the gap, 2026-11-07: a leftover that was no longer superseded stayed unbound for good.
test('a recovery deletes what the interrupted publication had dropped, as it recorded them, whatever changed since', t => {
  const T = template(), { chart, external } = T.names;
  const d = dossier(t, { records: 'first', waiting: [T.chart] });
  const evidence = (file: string) => join(d.dir, 'evidence', file);
  // A rerun that writes nothing supersedes the external answer, and is interrupted once the manifest has lost its line.
  assert.throws(() => publishAnswer(d.dir, T.chart, { ...d.context(), superseded: () => [external] }, stopAt('manifest:replaced')), /interrupted/);
  assert.ok(existsSync(evidence(`${external}.json`)), 'the superseded answer\'s file waits for the recovery');
  assert.deepEqual(Object.keys(readIntegrity(d.dir).manifest!.evidence), [chart], 'its manifest line is gone');
  assert.ok(existsSync(join(d.dir, '.running', `${T.chart}.dropped.json`)), 'the publication recorded what it dropped beside the bundle');
  // By the time the owner recovers, verify no longer calls it superseded: the recorded list decides.
  const r = recoverAnswer(d.dir, T.chart, { ...d.context(), superseded: () => [] });
  assert.deepEqual([r.action, r.superseded], ['kept', [external]], 'the recovery removes what the publication dropped');
  assert.equal(existsSync(evidence(`${external}.json`)) || existsSync(evidence(`${external}.md`)), false, 'its files are gone');
  assert.equal(existsSync(join(d.dir, '.running', `${T.chart}.dropped.json`)), false, 'and the record goes with the bundle');
  const a = d.gate();
  assert.deepEqual([a.answerRows.map(x => x.entry), a.tripwires], [[chart], []], 'nothing is left unbound');
});

// spec/evidence.md, tripwires: answer publication incomplete is "a candidate in .running/ that the
// manifest does not bind, or binds before it is in place".
test('a candidate that the manifest does not bind yet is reported as an incomplete publication, and grants nothing', t => {
  const T = template();
  for (const stop of ['answer:candidate', 'manifest:temporary-written', 'manifest:temporary-flushed']) {
    const d = dossier(t, { waiting: [T.chart] });
    assert.throws(() => publishAnswer(d.dir, T.chart, d.context(), stopAt(stop)), /interrupted/);
    const a = d.gate();
    assert.deepEqual(a.marks.W1.trials, [], `${stop}: an unbound candidate grants no evidence`);
    assert.ok(a.tripwires.some(trip => trip.name === 'answer publication incomplete' && trip.where.includes(T.chart)), `${stop}: verify reports the unbound candidate in .running/${T.chart}/; it reported ${JSON.stringify(a.tripwires)}`);
  }
});

test('verify tells an interrupted publication from an edited or a removed entry', t => {
  const T = template(), { chart } = T.names;
  const names = (d: ReturnType<typeof dossier>) => d.gate().tripwires.filter(trip => trip.where.includes(`evidence/${chart}.json`)).map(trip => trip.name);
  // An answer replacing a recorded one, stopped after the manifest binds it: the recorded bytes in
  // place differ from the binding because a bound candidate waits, not because anyone edited them.
  const replacing = dossier(t, { prose: 'second', records: 'first', waiting: [T.replacing] });
  assert.throws(() => publishAnswer(replacing.dir, T.replacing, replacing.context(), stopAt('manifest:replaced')), /interrupted/);
  assert.deepEqual(names(replacing), ['answer publication incomplete']);
  rmSync(join(replacing.dir, '.running'), { recursive: true });
  assert.deepEqual(names(replacing), ['answer edited'], 'without the candidate nothing explains the difference');
  // A first answer stopped there: the binding has no file yet because the candidate waits.
  const first = dossier(t, { waiting: [T.chart] });
  assert.throws(() => publishAnswer(first.dir, T.chart, first.context(), stopAt('manifest:replaced')), /interrupted/);
  assert.deepEqual(names(first), ['answer publication incomplete']);
  rmSync(join(first.dir, '.running'), { recursive: true });
  assert.deepEqual(first.gate().removed, [chart], 'without the candidate the bound entry was removed');
  assert.ok(first.gate().tripwires.some(trip => trip.name === 'answer removed' && trip.where.startsWith(`evidence/${chart}.json`)));
  // A hand edit, with no publication under way.
  const edited = dossier(t, { records: 'first' });
  const path = join(edited.dir, 'evidence', `${chart}.json`);
  writeFileSync(path, readFileSync(path, 'utf8').replace('"checks": "pass"', '"checks": "fail"'));
  assert.deepEqual(names(edited), ['answer edited']);
  assert.deepEqual(edited.gate().marks.W1.trials, [], 'an edited entry covers nothing');
});

test('an unbound candidate grants no evidence; recovery publishes the trial\'s own answer, and blesses neither an edited entry nor an edited bundle', t => {
  const T = template(), { chart, external } = T.names;
  const d = dossier(t, { waiting: [T.chart, T.external] });
  const candidate = join(d.staging(T.chart), 'entry.json');
  assert.throws(() => publishAnswer(d.dir, T.chart, d.context(), stopAt('answer:candidate')), /interrupted/);
  // The candidate is altered while it waits: it now says the checks failed.
  const forged = JSON.parse(readFileSync(candidate, 'utf8')) as Entry;
  forged.answer.outcomes = { checks: 'fail' };
  writeFileSync(candidate, entryText(forged));
  assert.deepEqual(d.gate().marks.W1.trials, [], 'an unbound candidate grants no evidence');
  assert.equal(recoverAnswer(d.dir, T.chart, d.context()).action, 'published');
  const path = join(d.dir, 'evidence', `${chart}.json`);
  assert.equal((JSON.parse(readFileSync(path, 'utf8')) as Entry).answer.outcomes.checks, 'pass', 'recovery publishes the trial\'s answer from its bundle, never the unbound candidate\'s bytes');
  assert.deepEqual(d.gate().marks.W1.trials, [T.chart]);
  // A bundle whose receipt no longer matches its files is not published.
  writeFileSync(join(d.staging(T.external), 'receipt.json'), '{}\n');
  const manifest = readFileSync(join(d.dir, 'integrity.json'), 'utf8');
  assert.throws(() => recoverAnswer(d.dir, T.external, d.context()), /invalid trial candidate/);
  assert.equal(readFileSync(join(d.dir, 'integrity.json'), 'utf8'), manifest);
  assert.equal(existsSync(join(d.dir, 'evidence', `${external}.json`)), false);
  // An entry edited after publication is void, and no later publication replaces it.
  const original = readFileSync(path, 'utf8');
  writeFileSync(path, original.replace('"checks": "pass"', '"checks": "fail"'));
  assert.ok(d.gate().tripwires.some(trip => trip.name === 'answer edited'));
  cpSync(join(T.dir, 'trials', T.replacing), d.staging(T.replacing), { recursive: true });
  assert.throws(() => publishAnswer(d.dir, T.replacing, d.context()), /does not match integrity\.json; restore it from version control/);
  assert.throws(() => recoverAnswer(d.dir, T.replacing, d.context()), /does not match integrity\.json/);
  assert.equal(readFileSync(join(d.dir, 'integrity.json'), 'utf8'), manifest, 'no publication rebinds an edited entry');
  writeFileSync(path, original);
  assert.deepEqual(d.gate().tripwires, [], 'the entry restored, its binding matches again');
});

const decisionBoundaries = ['decisions:temporary-written', 'decisions:temporary-flushed', 'decisions:replaced', 'decisions:directory-flushed', 'manifest:temporary-written', 'manifest:temporary-flushed', 'manifest:replaced', 'manifest:directory-flushed'];
for (const stage of decisionBoundaries) test(`interrupted decision publication: ${stage}`, t => {
  const { dir } = bare(t);
  assert.throws(() => withPublicationLock(dir, () => publishDecisionLocked(dir, decision, stopAt(stage))), /interrupted/);
  const record = readIntegrity(dir);
  const committed = ['manifest:replaced', 'manifest:directory-flushed'].includes(stage);
  assert.equal(parseDecisions(record.decisions).decisions.length, committed ? 1 : 0);
  if (record.pendingDecisions) {
    assert.throws(() => recoverDecisions(dir, '0'.repeat(64)), /changed/);
    recoverDecisions(dir, sha256(record.pendingDecisions));
  } else if (!committed) withPublicationLock(dir, () => publishDecisionLocked(dir, decision));
  assert.equal(parseDecisions(readIntegrity(dir).decisions).decisions.length, 1);
});

// A child process that publishes one run of the dossier at `root`, with what the runner gives it.
const publisher = (root: string, id: string, boundary: string) => `
  import { publishAnswer } from ${JSON.stringify(new URL('../../src/dossiers/publication.ts', import.meta.url).href)};
  import { answerContext } from ${JSON.stringify(new URL('../../src/commands/trial.ts', import.meta.url).href)};
  import { loadComponent } from ${JSON.stringify(new URL('../../src/dossiers/load.ts', import.meta.url).href)};
  import { locate } from ${JSON.stringify(new URL('../../src/dossiers/root.ts', import.meta.url).href)};
  const root = ${JSON.stringify(root)}, dir = root + '/components/gate', id = ${JSON.stringify(id)};
  const publish = () => publishAnswer(dir, id, answerContext(locate(root, 'gate'), loadComponent(root, 'gate'), dir), { boundary: ${boundary} });
`;

test('a killed publisher leaves a bound candidate and a dead lock; explicit recovery publishes it once', t => {
  const T = template(), d = dossier(t, { waiting: [T.chart] });
  const killed = spawnSync(process.execPath, ['--input-type=module', '-e', publisher(d.root, T.chart, `name => { if (name === 'manifest:replaced') process.kill(process.pid, 'SIGKILL'); }`) + 'publish();'], { encoding: 'utf8' });
  assert.equal(killed.signal, 'SIGKILL', killed.stderr);
  assert.ok(existsSync(join(d.dir, LOCK)));
  let a = d.gate();
  assert.deepEqual(a.tripwires.map(trip => trip.name), ['answer publication incomplete']);
  assert.deepEqual(a.marks.W1.trials, []);
  assert.throws(() => recoverAnswer(d.dir, T.chart, d.context()), /locked/, 'recovery waits for the dead writer\'s lock to be recovered');
  recoverPublicationLock(d.dir);
  assert.equal(recoverAnswer(d.dir, T.chart, d.context()).action, 'published');
  a = d.gate();
  assert.deepEqual(a.tripwires, []);
  assert.deepEqual(a.marks.W1.trials, [T.chart]);
  const settled = recordFiles(d.dir);
  assert.throws(() => recoverAnswer(d.dir, T.chart, d.context()), /no run \S+ waits/);
  assert.deepEqual(recordFiles(d.dir), settled, 'published once');
  const release = acquirePublicationLock(d.dir);
  assert.throws(() => recoverPublicationLock(d.dir), /still alive/);
  assert.throws(() => acquirePublicationLock(d.dir), /locked/);
  release();
  writeFileSync(join(d.dir, LOCK), JSON.stringify({ host: hostname() + '-another', pid: 1, token: 'foreign' }));
  assert.throws(() => recoverPublicationLock(d.dir), /another host/);
});

test('concurrent publishers retry under one lock without losing either answer', async t => {
  const T = template(), { chart, external } = T.names;
  const d = dossier(t, { waiting: [T.chart, T.external] });
  const run = (id: string) => new Promise<void>((resolve, reject) => {
    const script = publisher(d.root, id, `name => { if (name === 'answer:candidate') Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 30); }`) + `
      for (let attempt = 0; ; attempt++) { try { publish(); break; }
        catch (e) { if (attempt > 60 || !/locked|recovery is in progress/.test(e.message)) throw e; await new Promise(r => setTimeout(r, 10)); } }`;
    const child = spawn(process.execPath, ['--input-type=module', '-e', script], { stdio: ['ignore', 'ignore', 'pipe'] });
    let error = ''; child.stderr.on('data', chunk => { error += chunk; });
    child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(error)));
  });
  await Promise.all([run(T.chart), run(T.external)]);
  const bound = readIntegrity(d.dir).manifest!.evidence;
  assert.deepEqual(Object.keys(bound).sort(), [chart, external].sort());
  for (const name of [chart, external]) assert.equal(sha256(readFileSync(join(d.dir, 'evidence', `${name}.json`))), bound[name]);
  assert.deepEqual(readdirSync(join(d.dir, 'trials')).sort(), [T.chart, T.external].sort());
  const a = d.gate();
  assert.deepEqual(a.tripwires, []);
  assert.deepEqual(a.completed.map(x => x.entry.established.trial).sort(), [T.chart, T.external].sort());
});

test('recovery cannot promote a bounded call or incomplete induction to proved evidence', t => {
  const { dir, id, staging, context } = inductiveWaiting(t);
  assert.match(validateBundle(dir, id).digest, /^[0-9a-f]{64}$/, 'the bundle as the runner left it validates');
  const records = recordFiles(dir);
  const callText = readFileSync(join(staging, 'call.md'), 'utf8');
  const receipt = JSON.parse(readFileSync(join(staging, 'receipt.json'), 'utf8'));
  assert.ok(callText.includes('mode: inductive'));
  writeFileSync(join(staging, 'call.md'), callText.replace('mode: inductive', 'mode: bounded\nlength: 1'));
  writeReceipt(staging, receipt);
  assert.throws(() => validateBundle(dir, id), /mode or length disagree/);
  assert.throws(() => recoverAnswer(dir, id, context()), /mode or length disagree/);
  writeFileSync(join(staging, 'call.md'), callText);
  resealed(staging, result => { result.runs = (result.runs as { label: string }[]).filter(run => run.label !== 'base'); });
  assert.throws(() => validateBundle(dir, id), /base and step/);
  assert.throws(() => recoverAnswer(dir, id, context()), /base and step/);
  assert.deepEqual(recordFiles(dir), records, 'nothing is published');
});

// Each bundle is a real trial's, staged in a copy of its dossier as it was before that trial, so its
// question has no answer yet: the template's external trial, and the stand-in Apalache's inductive one.
test('an abort may lack runner or mode metadata, but conflicting metadata is never adopted', t => {
  const T = template();
  const waiting = {
    external: () => { const d = dossier(t, { waiting: [T.external] }); return { dir: d.dir, id: T.external, context: d.context, gate: d.gate }; },
    apalache: () => { const w = inductiveWaiting(t); return { dir: w.dir, id: w.id, context: w.context, gate: w.gate }; },
  };
  const abort = (result: Record<string, unknown>) => { result.result = 'aborted'; result.reason = 'checker exited before a verdict'; result.outcomes = {}; delete result.runner; delete result.mode; delete result.length; delete result.runs; };
  for (const checker of ['external', 'apalache'] as const) {
    const w = waiting[checker]();
    resealed(join(w.dir, '.running', w.id), abort);
    const published = recoverAnswer(w.dir, w.id, w.context());
    assert.equal(published.action, 'published', 'an aborted trial is published for a question with no answer');
    const a = w.gate();
    assert.equal(completed(a.answers.find(x => x.entry?.established.trial === w.id)!), false, 'an adopted abort still grants no evidence');
    assert.ok(!a.completed.some(x => x.entry.established.trial === w.id));
    assert.ok(a.flags.some(flag => flag.name === 'unrun' && flag.where.includes(`evidence/${published.name}.json`)));
    // The same trial with metadata that conflicts with its call, in a copy of its own, is refused.
    const c = waiting[checker]();
    resealed(join(c.dir, '.running', c.id), result => { abort(result); if (checker === 'external') result.runner = 'a-different-runner'; else result.mode = 'a-different-mode'; });
    const records = recordFiles(c.dir);
    assert.throws(() => validateBundle(c.dir, c.id), /disagree/);
    assert.throws(() => recoverAnswer(c.dir, c.id, c.context()), /disagree/);
    assert.deepEqual(recordFiles(c.dir), records, 'nothing is published');
  }
});
