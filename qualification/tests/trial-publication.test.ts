import { emptyCollection } from './collection-fixture.ts';
// Exercise the public CLI at the boundaries between a call, execution and
// publication. Fake checker processes make races and failures deterministic;
// they do not stand in for the separate real-toolchain qualification suite.
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fingerprint } from '../conformance/files.ts';
import { fileHash } from '../../src/hash.ts';
import { writeGenerated } from '../../src/models/materialize.ts';
import { parseCall } from '../../src/trials/calls.ts';
import { executionDependencies, planTrial } from '../../src/trials/plan.ts';
import { trialBundle } from '../conformance/evidence.ts';
import type { Entry } from '../../src/trials/answers.ts';

const plugin = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const cli = join(plugin, 'src/cli.ts');
const prose = '# Gate\n\nTier: modeled\nModule: gate\n\n## States\n[S1] Ready: waiting.\n\n## Events\n[E1] ping, from the public: a ping.\n\n## Moves\n[M1] When Ready receives ping, it stays Ready.\n\n## Always\n[A1] Always, {Ready}.\n\n## Words only\n[T1] This piece promises nothing eventual.\n';
const moduleText = '---- MODULE Gate ----\nEXTENDS Naturals, Helper\nVARIABLE state\nInit == state = "Ready"\nNext == state\' = state\nA1 == HelperOK\n====\n';
const tlcCall = 'kind: tlc\nexecutes:\n  - model/Gate.tla\n  - model/Gate.cfg\nreach: one state\nexpect:\n  A1: holds\nbecause: the only reachable state is ready\n';
const externalCall = 'kind: external\nrunner: check\nexecutes:\n  - prose.md\nreach: the named prose\nexpect:\n  check: pass\nbecause: the runner observes this file\n';
const success = '@!@!@STARTMSG 2186:0 @!@!@\nModel checking completed. No error has been found.\n@!@!@ENDMSG 2186 @!@!@\n';
const empty = { schema: 1, evidence: {}, decisionHead: null };
// A runner that answers each expectation as the call predicts it, unless OUTCOME_<name> says otherwise.
const echo = `import {readFileSync} from 'node:fs'; const input = JSON.parse(readFileSync(0, 'utf8')); const outcomes = Object.fromEntries(Object.entries(input.call.expect).map(([n, o]) => [n, process.env['OUTCOME_' + n] || o.expect])); console.log(JSON.stringify({ outcomes, covers: Object.keys(outcomes) }));`;
const T0 = '2026-11-07T12:34:00.000Z', T1 = '2026-11-07T12:35:00.000Z', T2 = '2026-11-07T12:36:00.000Z';

function fixture(t: TestContext) {
  const repo = mkdtempSync(join(tmpdir(), 'dossier-trial-publication-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const root = join(repo, 'dossiers'), dir = join(root, 'parts/gate');
  const write = (path: string, text: string) => { const full = join(repo, path); mkdirSync(dirname(full), { recursive: true }); writeFileSync(full, text); return full; };
  write('dossiers/dossier.json', JSON.stringify({ plugin: '0.2.0', storage: 'integrity-v1' }));
  write('dossiers/parts/gate/integrity.json', JSON.stringify(empty));
  write('dossiers/parts/gate/prose.md', prose);
  write('dossiers/actors/actors.md', '# Actors\n\n```yaml\nactors:\n  - id: public\n    kind: public\n    modes: [honest, malicious]\n```\n');
  write('dossiers/actors/scenarios.md', '# Scenarios\n\n```yaml\nscenarios:\n  - id: all-honest\n    modes: {}\n```\n');
  const run = (args: string[], env: NodeJS.ProcessEnv = {}) => spawnSync(process.execPath, [cli, args[0], '--root', root, ...args.slice(1)], { cwd: repo, env: { ...process.env, DOSSIER_ROOT: '', ...env }, encoding: 'utf8' });
  const executable = (name: string, body: string) => { const path = write(name, `#!${process.execPath}\n${body}\n`); chmodSync(path, 0o755); return path; };
  emptyCollection(dir);
  const external = (body = 'console.log(JSON.stringify({outcomes:{check:"pass"}}));') => {
    const path = executable('checker.mjs', body);
    write('dossiers/dossier.json', JSON.stringify({ plugin: '0.2.0', storage: 'integrity-v1', external: { check: { command: [path] } } }));
    return path;
  };
  const model = () => {
    write('dossiers/parts/gate/model/Gate.tla', moduleText);
    write('dossiers/parts/gate/model/Gate.cfg', 'INIT Init\nNEXT Next\nINVARIANT A1\n');
    write('dossiers/parts/gate/model/Helper.tla', '---- MODULE Helper ----\nEXTENDS Naturals\nHelperOK == TRUE\n====\n');
    write('dossiers/parts/gate/calls/check.md', tlcCall);
  };
  const result = (where = dir) => {
    const ids = readdirSync(join(where, 'trials'));
    assert.equal(ids.length, 1);
    const bundle = trialBundle(where, ids[0]);
    assert.deepEqual([bundle.problems, bundle.stray], [[], []]);
    return bundle.result!;
  };
  const composition = () => {
    const s = 'dossiers/compositions/net';
    write(`${s}/integrity.json`, JSON.stringify(empty));
    write(`${s}/prose.md`, '# Net\n\nConcern: net\n\n## Always\n[A1] Always, {gate.Ready}.\n');
    write(`${s}/wiring.md`, '# Wiring\n\n```yaml\nmembers:\n  - part: gate\n    role: member\nwiring: []\nclosure: []\nscenarios: [all-honest]\n```\n');
    emptyCollection(join(repo,s));
    return join(repo, s);
  };
  // The answers the runner published, by entry name, and one of them read.
  const entries = () => existsSync(join(dir, 'evidence')) ? readdirSync(join(dir, 'evidence')).filter(name => name.endsWith('.json')).map(name => name.slice(0, -5)).sort() : [];
  const entry = (name: string) => JSON.parse(readFileSync(join(dir, 'evidence', `${name}.json`), 'utf8')) as Entry;
  // The dossier as git keeps it: every file but the local bundles and the pending calls, with bytes, modes and mtimes.
  const record = () => Object.fromEntries(Object.entries(fingerprint(dir)).filter(([path, signature]) => !signature.endsWith(':directory') && !/^(trials|\.running|calls)\//.test(path)));
  // A test-only clock: a command started with at(time) takes that time as now, so the same pending
  // call can run again in a later minute without meeting its earlier bundle's name.
  const clock = write('clock.mjs', 'const RealDate = Date;\nglobalThis.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [process.env.DOSSIER_QUAL_NOW])); } };\n');
  const at = (time: string) => ({ NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --import=${pathToFileURL(clock).href}`.trim(), DOSSIER_QUAL_NOW: time });
  return { repo, root, dir, write, run, executable, external, model, result, composition, entries, entry, record, at };
}

test('concurrent commands atomically reserve one staging leaf and execute once', async t => {
  const f = fixture(t), barriers = join(f.repo, 'barriers');
  mkdirSync(barriers);
  const hook = f.write('barrier.mjs', `import fs from 'node:fs'; import {syncBuiltinESMExports} from 'node:module';
const original = fs.mkdirSync;
fs.mkdirSync = function(path, options) {
  if (/\\.running\\/\\d{4}-/.test(String(path))) {
    fs.writeFileSync(process.env.BARRIER + '/' + process.pid, 'ready');
    const until = Date.now() + 15000;
    while (!fs.existsSync(process.env.RELEASE)) { if (Date.now() > until) throw Error('barrier timed out'); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,10); }
  }
  return original(path, options);
};
syncBuiltinESMExports();
const RealDate = Date; globalThis.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : ['2026-11-05T12:34:00Z'])); } };
`);
  const log = join(f.repo, 'executions');
  f.external(`import {appendFileSync} from 'node:fs'; appendFileSync(process.env.RUN_LOG,'run\\n'); console.log(JSON.stringify({outcomes:{check:'pass'}}));`);
  f.write('dossiers/parts/gate/calls/check.md', externalCall);
  const launch = () => {
    const child = spawn(process.execPath, ['--import', hook, cli, 'trial', '--root', f.root, 'gate', 'check.md'], { env: { ...process.env, BARRIER: barriers, RELEASE: join(f.repo, 'release'), RUN_LOG: log }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = ''; child.stdout.on('data', chunk => out += chunk); child.stderr.on('data', chunk => out += chunk);
    const done = new Promise<{ code: number | null; out: string }>((resolve, reject) => { child.on('error', reject); child.on('close', code => resolve({ code, out })); });
    t.after(() => { if (child.exitCode === null) child.kill(); });
    return done;
  };
  const a = launch(), b = launch();
  const deadline = Date.now() + 15000;
  while (readdirSync(barriers).length !== 2) { assert.ok(Date.now() < deadline, 'both processes reach the leaf reservation'); await new Promise(r => setTimeout(r, 20)); }
  writeFileSync(join(f.repo, 'release'), 'go');
  const results = await Promise.all([a, b]);
  assert.deepEqual(results.map(r => r.code).sort(), [0, 2], JSON.stringify(results));
  assert.equal(readFileSync(log, 'utf8'), 'run\n');
  assert.equal(f.result().result, 'as-called');
  assert.equal(f.entries().length, 1, 'one run, one answer');
  assert.equal(existsSync(join(f.dir, '.running')), false);
});

test('a refused composition call leaves generated views and the entire root untouched', t => {
  const f = fixture(t), s = f.composition();
  assert.equal(f.run(['scaffold', 'net']).status, 0);
  writeFileSync(join(s, 'model/generated/Net.tla'), 'reviewer has an old generated view\n');
  f.write('dossiers/compositions/net/calls/wrong.md', tlcCall.replace('model/Gate.tla', 'model/generated/Net.tla').replace('model/Gate.cfg', 'model/generated/A1_all_honest.cfg') + 'property: A9\nscenario: all-honest\n');
  const before = fingerprint(f.root);
  const r = f.run(['trial', 'net', 'wrong.md']);
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /property A9/);
  assert.deepEqual(fingerprint(f.root), before);
});

for (const escape of ['parent', 'destination', 'stale']) test(`materialization refuses a ${escape} symlink before writing or deleting`, t => {
  const f = fixture(t), s = f.composition(), outside = join(f.repo, 'outside');
  mkdirSync(outside);
  writeFileSync(join(outside, 'Net.tla'), 'outside bytes');
  const gen = join(s, 'model/generated');
  if (escape === 'parent') { mkdirSync(join(s, 'model')); symlinkSync(outside, gen); }
  else { mkdirSync(gen, { recursive: true }); symlinkSync(join(outside, 'Net.tla'), join(gen, escape === 'destination' ? 'Net.tla' : 'obsolete.tla')); }
  const before = fingerprint(f.repo);
  const r = f.run(['scaffold', 'net']);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /symbolic link/);
  assert.deepEqual(fingerprint(f.repo), before);
});

test('materializer rejects escaping generated names before changing its directory', t => {
  const f = fixture(t), before = fingerprint(f.dir);
  assert.throws(() => writeGenerated(f.dir, { module: 'Gate', cfgs: { '../escape.cfg': 'bad' } }, 'module'), /invalid generated filename/);
  assert.deepEqual(fingerprint(f.dir), before);
});

test('an edited entry blocks a new execution without any writes, while an edited or deleted local bundle blocks nothing', t => {
  const f = fixture(t), log = join(f.repo, 'executions');
  f.external(`import {appendFileSync} from 'node:fs'; appendFileSync(process.env.RUN_LOG,'run\\n'); console.log(JSON.stringify({outcomes:{check:'pass'}}));`);
  f.write('dossiers/parts/gate/calls/first.md', externalCall);
  const first = f.run(['trial', 'gate', 'first.md'], { RUN_LOG: log });
  assert.equal(first.status, 0, first.stderr);
  const [name] = f.entries(), path = join(f.dir, 'evidence', `${name}.json`), original = readFileSync(path, 'utf8');
  writeFileSync(path, original.replace('"check": "pass"', '"check": "fail"'));
  f.write('dossiers/parts/gate/calls/next.md', externalCall.replace('the named prose', 'a second call'));
  const before = fingerprint(f.root);
  const second = f.run(['trial', 'gate', 'next.md'], { RUN_LOG: log });
  assert.equal(second.status, 2, second.stderr);
  assert.match(second.stderr, new RegExp(`evidence/${name}\\.json: answer edited`));
  assert.equal(readFileSync(log, 'utf8'), 'run\n');
  assert.deepEqual(fingerprint(f.root), before);
  // The entry restored, the local bundle edited and then deleted: neither is a record (STORE-BUNDLE).
  writeFileSync(path, original);
  writeFileSync(join(f.dir, 'trials', first.stdout.match(/^trial: (\S+)/m)![1], 'output.txt'), 'changed after publication\n');
  const third = f.run(['trial', 'gate', 'next.md'], { RUN_LOG: log });
  assert.equal(third.status, 0, third.stderr);
  assert.match(third.stdout, new RegExp(`^answer: evidence/${name}\\.json · replaced the recorded answer$`, 'm'), 'a new reach is a new answer to the same question');
  rmSync(join(f.dir, 'trials'), { recursive: true });
  f.write('dossiers/parts/gate/calls/last.md', externalCall.replace('the named prose', 'a third call'));
  const fourth = f.run(['trial', 'gate', 'last.md'], { RUN_LOG: log });
  assert.equal(fourth.status, 0, fourth.stderr);
  assert.equal(readFileSync(log, 'utf8'), 'run\nrun\nrun\n');
});

test('a confirming rerun writes no byte of the record, however often it runs, and consumes its call', t => {
  const f = fixture(t);
  f.external(echo);
  f.write('dossiers/parts/gate/calls/check.md', externalCall);
  const first = f.run(['trial', 'gate', 'check.md']);
  assert.equal(first.status, 0, first.stderr);
  const name = first.stdout.match(/^answer: evidence\/(\S+)\.json · published$/m)![1];
  writeFileSync(join(f.dir, 'evidence', `${name}.md`), 'The runner observed the named prose as called.\n');
  const before = f.record();
  for (let rerun = 1; rerun <= 10; rerun++) {
    f.write('dossiers/parts/gate/calls/check.md', externalCall.replace('the runner observes this file', `the runner observes this file, again (${rerun})`));
    const r = f.run(['trial', 'gate', 'check.md']);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, new RegExp(`^answer: evidence/${name}\\.json · kept: the same answer on an unchanged basis; nothing is written$`, 'm'));
    assert.equal(existsSync(join(f.dir, 'calls/check.md')), false, 'a confirmed answer consumes its call');
  }
  assert.deepEqual(f.record(), before, 'ten confirming reruns leave the dossier as git keeps it byte for byte, mtimes included');
  assert.equal(readdirSync(join(f.dir, 'trials')).length, 11, 'each run left its bundle on this machine');
});

test('a refused publication leaves the entries and the pending call untouched; once the owner forgets the violation, the same call publishes', t => {
  const f = fixture(t);
  f.external(echo);
  const fails = (because: string) => externalCall.replace('check: pass', 'check: fail').replace('the runner observes this file', because);
  f.write('dossiers/parts/gate/calls/fails.md', fails('the runner finds the fault'));
  const first = f.run(['trial', 'gate', 'fails.md'], f.at(T0));
  assert.equal(first.status, 0, first.stderr);
  const name = first.stdout.match(/^answer: evidence\/(\S+)\.json · published$/m)![1];
  f.write('dossiers/parts/gate/calls/again.md', fails('the fault is still there'));
  const before = f.record(), call = readFileSync(join(f.dir, 'calls/again.md'), 'utf8');
  // The runner now says pass, on the same basis: a violation would disappear without anyone deciding it.
  const refused = f.run(['trial', 'gate', 'again.md'], { ...f.at(T0), OUTCOME_check: 'pass' });
  assert.equal(refused.status, 2, refused.stdout + refused.stderr);
  const digest = JSON.parse(readFileSync(join(f.dir, 'integrity.json'), 'utf8')).evidence[name];
  assert.match(refused.stdout, new RegExp(`^answer: evidence/${name}\\.json · refused: on an unchanged basis this answer would turn check from a counterexample into a pass`, 'm'));
  assert.ok(refused.stdout.includes(`forget ${name}@${digest.slice(0, 8)}`), 'the refusal names the argument forget takes');
  assert.match(refused.stdout, /^  the bundle stays in trials\/\S+\/, and the call stays pending$/m);
  assert.deepEqual(f.record(), before, 'the entries and the manifest are untouched');
  assert.equal(readFileSync(join(f.dir, 'calls/again.md'), 'utf8'), call, 'the call stays pending');
  assert.ok(existsSync(join(f.dir, 'trials', refused.stdout.match(/^trial: (\S+)/m)![1])), 'the refused run\'s bundle stays on this machine');
  const forget = f.run(['decide', 'gate', 'forget', `${name}@${digest.slice(0, 8)}`, '--', 'The fault is fixed outside this model; let the recorded violation go.']);
  assert.equal(forget.status, 0, forget.stdout + forget.stderr);
  const published = f.run(['trial', 'gate', 'again.md'], { ...f.at(T1), OUTCOME_check: 'pass' });
  assert.equal(published.status, 1, published.stdout + published.stderr);
  assert.match(published.stdout, new RegExp(`^answer: evidence/${name}\\.json · replaced the recorded answer$`, 'm'));
  assert.equal(existsSync(join(f.dir, 'calls/again.md')), false, 'the published answer consumes the call');
  const entry = f.entry(name);
  assert.deepEqual([entry.answer.result, entry.answer.outcomes], ['miscalled', { check: 'pass' }]);
  assert.deepEqual(entry.previous?.answer.outcomes, { check: 'fail' }, 'the violation stays at HEAD as the previous answer');
});

test('an unclassified miscall is not replaced; once its reading classifies it, the pending call publishes and the classification moves into previous', t => {
  const f = fixture(t);
  f.external(echo);
  f.write('dossiers/parts/gate/calls/pass.md', externalCall);
  const first = f.run(['trial', 'gate', 'pass.md'], { ...f.at(T0), OUTCOME_check: 'fail' });
  assert.equal(first.status, 1, first.stdout + first.stderr);
  const name = first.stdout.match(/^answer: evidence\/(\S+)\.json · published$/m)![1];
  f.write('dossiers/parts/gate/calls/fail.md', externalCall.replace('check: pass', 'check: fail').replace('the runner observes this file', 'the runner finds the fault the first call missed'));
  const before = f.record();
  const refused = f.run(['trial', 'gate', 'fail.md'], { ...f.at(T0), OUTCOME_check: 'fail' });
  assert.equal(refused.status, 2, refused.stdout + refused.stderr);
  assert.match(refused.stdout, new RegExp(`^answer: evidence/${name}\\.json · refused: the recorded answer is a miscall whose reading has no classification: line; classify it first$`, 'm'));
  assert.deepEqual(f.record(), before);
  assert.ok(existsSync(join(f.dir, 'calls/fail.md')), 'the call stays pending');
  writeFileSync(join(f.dir, 'evidence', `${name}.md`), 'The first call predicted a pass the prose never promised.\nclassification: call was wrong\n');
  const published = f.run(['trial', 'gate', 'fail.md'], { ...f.at(T1), OUTCOME_check: 'fail' });
  assert.equal(published.status, 0, published.stdout + published.stderr);
  assert.match(published.stdout, new RegExp(`^answer: evidence/${name}\\.json · replaced the recorded answer$`, 'm'));
  const entry = f.entry(name);
  assert.deepEqual([entry.previous?.answer.result, entry.previous?.classification], ['miscalled', 'call was wrong']);
  assert.equal(existsSync(join(f.dir, 'evidence', `${name}.md`)), false, 'the replaced answer\'s reading goes with it');
});

// ANSWER-REPLACE and ANSWER-MISCALL, the other branch: the same miscall again on a moved basis replaces
// the classified one without making it previous. The classification goes with the reading.
test('a classified miscall that an equal answer replaces on a moved basis does not become previous: its classification goes with its reading, and the new miscall owes its own', t => {
  const f = fixture(t);
  f.external(echo);
  const t1 = (because: string) => externalCall.replace('check: pass', 'T1: pass').replace('the runner observes this file', because);
  f.write('dossiers/parts/gate/calls/t1.md', t1('the runner observes T1'));
  const first = f.run(['trial', 'gate', 't1.md'], { ...f.at(T0), OUTCOME_T1: 'fail' });
  assert.equal(first.status, 1, first.stdout + first.stderr);
  const name = first.stdout.match(/^answer: evidence\/(\S+)\.json · published$/m)![1];
  const missed = f.entry(name);
  writeFileSync(join(f.dir, 'evidence', `${name}.md`), 'The runner found T1 failing; the call promised a pass the words never made.\nclassification: call was wrong\n');
  // T1, which the question names, is reworded: the basis under the miscall moved.
  writeFileSync(join(f.dir, 'prose.md'), prose.replace('[T1] This piece promises nothing eventual.', '[T1] This piece promises nothing eventual, ever.'));
  f.write('dossiers/parts/gate/calls/again.md', t1('the runner observes T1 as reworded'));
  const again = f.run(['trial', 'gate', 'again.md'], { ...f.at(T1), OUTCOME_T1: 'fail' });
  assert.equal(again.status, 1, again.stdout + again.stderr);
  assert.match(again.stdout, new RegExp(`^answer: evidence/${name}\\.json · replaced the recorded answer$`, 'm'));
  const entry = f.entry(name);
  assert.deepEqual([entry.answer.result, entry.answer.outcomes, entry.previous], ['miscalled', { T1: 'fail' }, null], 'an equal answer: the miscall it replaced does not become previous');
  assert.deepEqual(entry.replaced, { trial: missed.established.trial, moved: ['passage T1'] });
  assert.equal(existsSync(join(f.dir, 'evidence', `${name}.md`)), false, 'the reading went, and its classification with it');
  const gate = JSON.parse(f.run(['verify', '--json']).stdout).parts.find((c: { id: string }) => c.id === 'gate');
  assert.deepEqual(gate.tripwires, [{ name: 'miscall unclassified', where: `evidence/${name}.json` }], 'the new miscall needs a classification of its own');
});

// STORE-ANSWER: publication consumes the pending call only while it holds the bytes its trial captured.
// A call redrafted while the trial runs is new intent, which no earlier trial consumes.
test('a call redrafted while its trial runs stays pending: publication consumes only the call the trial captured', t => {
  const f = fixture(t);
  const call = join(f.dir, 'calls', 'check.md'), redrafted = externalCall.replace('the runner observes this file', 'the runner observes this file, as redrafted');
  f.external(`import {readFileSync,writeFileSync} from 'node:fs'; readFileSync(0, 'utf8'); writeFileSync(process.env.CALL, process.env.REDRAFTED); console.log(JSON.stringify({outcomes:{check:'pass'}}));`);
  f.write('dossiers/parts/gate/calls/check.md', externalCall);
  const r = f.run(['trial', 'gate', 'check.md'], { CALL: call, REDRAFTED: redrafted });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^answer: evidence\/\S+\.json · published$/m, 'the answer to the call as the trial captured it is published');
  assert.equal(readFileSync(call, 'utf8'), redrafted, 'the redrafted call stays pending');
  assert.equal(readFileSync(join(f.dir, 'trials', r.stdout.match(/^trial: (\S+)/m)![1], 'call.md'), 'utf8'), externalCall, 'the bundle keeps the call as captured');
});

test('a question that no longer exists is removed by the next publication with its reading and its manifest line, and not by a refused one', t => {
  const f = fixture(t);
  f.external(echo);
  f.write('dossiers/parts/gate/calls/a1.md', externalCall.replace('check: pass', 'A1: pass').replace('the runner observes this file', 'the runner observes A1'));
  const a1 = f.run(['trial', 'gate', 'a1.md']);
  assert.equal(a1.status, 0, a1.stdout + a1.stderr);
  const gone = a1.stdout.match(/^answer: evidence\/(\S+)\.json · published$/m)![1];
  assert.match(gone, /^external-A1-[0-9a-f]{6}$/);
  writeFileSync(join(f.dir, 'evidence', `${gone}.md`), 'The runner observed A1.\n');
  const fails = (because: string) => externalCall.replace('check: pass', 'check: fail').replace('the runner observes this file', because);
  f.write('dossiers/parts/gate/calls/fails.md', fails('the runner finds the fault'));
  assert.equal(f.run(['trial', 'gate', 'fails.md']).status, 0);
  writeFileSync(join(f.dir, 'prose.md'), prose.replace('## Always\n[A1] Always, {Ready}.\n\n', ''));
  const gate = () => JSON.parse(f.run(['verify', '--json']).stdout).parts.find((c: { id: string }) => c.id === 'gate');
  assert.ok(gate().flags.some((flag: { name: string; where: string }) => flag.name === 'question gone' && flag.where.includes(`evidence/${gone}.json`)));
  // A refused publication removes nothing.
  f.write('dossiers/parts/gate/calls/again.md', fails('the fault is still there'));
  const before = f.record();
  assert.equal(f.run(['trial', 'gate', 'again.md'], { OUTCOME_check: 'pass' }).status, 2);
  assert.deepEqual(f.record(), before, 'the gone question\'s entry, reading and manifest line wait for a publication');
  // The next publication does.
  f.write('dossiers/parts/gate/calls/other.md', externalCall.replace('check: pass', 'other: pass').replace('the runner observes this file', 'another question'));
  const other = f.run(['trial', 'gate', 'other.md']);
  assert.equal(other.status, 0, other.stdout + other.stderr);
  assert.match(other.stdout, new RegExp(`^  removed evidence/${gone}\\.json: its question no longer exists$`, 'm'));
  for (const file of [`${gone}.json`, `${gone}.md`]) assert.equal(existsSync(join(f.dir, 'evidence', file)), false, file);
  assert.equal(Object.hasOwn(JSON.parse(readFileSync(join(f.dir, 'integrity.json'), 'utf8')).evidence, gone), false);
  const after = gate();
  assert.deepEqual(after.tripwires, []);
  assert.ok(!after.flags.some((flag: { name: string }) => flag.name === 'question gone'));
});

// ANSWER-SUPERSEDED and ANSWER-DROP: the answers that decide stand in an answer's place, and a publication drops it.
const about = (expects: string, because: string) => externalCall.replace('check: pass', expects).replace('the runner observes this file', because);
const published = (stdout: string) => stdout.match(/^answer: evidence\/(\S+)\.json · published$/m)![1];

test('an answer is removed by the publication whose answer supersedes it, with its reading and its manifest line', t => {
  const f = fixture(t);
  f.external(echo);
  f.write('dossiers/parts/gate/calls/a1.md', about('A1: pass', 'the runner observes A1'));
  const first = f.run(['trial', 'gate', 'a1.md'], f.at(T0));
  assert.equal(first.status, 0, first.stdout + first.stderr);
  const earlier = published(first.stdout);
  writeFileSync(join(f.dir, 'evidence', `${earlier}.md`), 'The runner observed A1.\n');
  const gate = () => JSON.parse(f.run(['verify', '--json']).stdout).parts.find((c: { id: string }) => c.id === 'gate');
  const marks = (a: { marks: Record<string, { mark: string }> }) => Object.fromEntries(Object.entries(a.marks).map(([id, m]) => [id, m.mark]));
  const before = gate();
  assert.ok(!before.flags.some((flag: { name: string }) => flag.name === 'answer superseded'), 'nothing later: nothing superseded');
  // Another question, about A1 and T1: it touches everything the first answered for, and the marks
  // are the same without the first, so the first goes with this publication.
  f.write('dossiers/parts/gate/calls/both.md', about('A1: pass\n  T1: pass', 'the runner observes A1 and T1'));
  const second = f.run(['trial', 'gate', 'both.md'], f.at(T1));
  assert.equal(second.status, 0, second.stdout + second.stderr);
  const later = published(second.stdout);
  assert.notEqual(later, earlier, 'another question');
  assert.match(second.stdout, new RegExp(`^  removed evidence/${earlier}\\.json: the answers that decide stand in its place$`, 'm'));
  assert.deepEqual(f.entries(), [later]);
  assert.equal(existsSync(join(f.dir, 'evidence', `${earlier}.md`)), false, 'its reading goes with it');
  assert.equal(Object.hasOwn(JSON.parse(readFileSync(join(f.dir, 'integrity.json'), 'utf8')).evidence, earlier), false, 'and its manifest line');
  const after = gate();
  assert.deepEqual([after.tripwires, marks(after)], [[], marks(before)]);
  assert.ok(!after.flags.some((flag: { name: string }) => flag.name === 'answer superseded'));
});

test('a superseded answer that holds a counterexample waits for the owner\'s forget: verify flags it, recheck does not run it, and the next publication removes it, even one that writes nothing', t => {
  const f = fixture(t);
  f.external(echo);
  f.write('dossiers/parts/gate/calls/e1.md', about('E1: fail', 'the runner finds the event refused'));
  const first = f.run(['trial', 'gate', 'e1.md'], { ...f.at(T0), OUTCOME_E1: 'fail' });
  assert.equal(first.status, 0, first.stdout + first.stderr);
  const earlier = published(first.stdout);
  writeFileSync(join(f.dir, 'evidence', `${earlier}.md`), 'retelling: the runner found E1 refused, as called.\n');
  f.write('dossiers/parts/gate/calls/e1-m1.md', about('E1: fail\n  M1: pass', 'the runner observes E1 and M1'));
  const second = f.run(['trial', 'gate', 'e1-m1.md'], { ...f.at(T1), OUTCOME_E1: 'fail' });
  assert.equal(second.status, 0, second.stdout + second.stderr);
  const later = published(second.stdout);
  assert.doesNotMatch(second.stdout, /removed evidence/, 'a counterexample is not let go without the owner');
  assert.deepEqual(f.entries(), [earlier, later].sort());
  const gate = () => JSON.parse(f.run(['verify', '--json']).stdout).parts.find((c: { id: string }) => c.id === 'gate');
  const digest = JSON.parse(readFileSync(join(f.dir, 'integrity.json'), 'utf8')).evidence[earlier].slice(0, 8);
  const withIt = gate();
  assert.deepEqual(withIt.flags.filter((flag: { name: string }) => flag.name === 'answer superseded'), [{ name: 'answer superseded', entry: earlier, where: `evidence/${earlier}.json: the answers that decide stand in its place; it holds a counterexample, so it stays until the owner forgets ${earlier}@${digest}` }]);
  assert.equal(withIt.answers.find((r: { entry: string }) => r.entry === earlier).superseded, true, 'the ledger\'s row says so');
  const re = f.run(['recheck', 'gate'], { OUTCOME_E1: 'fail' });
  assert.equal(re.status, 0, re.stdout + re.stderr);
  assert.match(re.stdout, new RegExp(`^not run: parts/gate/evidence/${earlier}\\.json · answer superseded: `, 'm'));
  assert.match(re.stdout, /^recheck: 1 same, 0 different, 1 not run$/m);
  const forget = f.run(['decide', 'gate', 'forget', `${earlier}@${digest}`, '--', 'the second call asks about E1 and M1; one answer on E1 is enough']);
  assert.equal(forget.status, 0, forget.stdout + forget.stderr);
  assert.match(gate().flags.find((flag: { name: string }) => flag.name === 'answer superseded').where, /, and the owner forgot it; the next publication removes it$/);
  // The same answer again writes nothing, and still removes it.
  f.write('dossiers/parts/gate/calls/again.md', about('E1: fail\n  M1: pass', 'the runner observes E1 and M1 again'));
  const third = f.run(['trial', 'gate', 'again.md'], { ...f.at(T2), OUTCOME_E1: 'fail' });
  assert.equal(third.status, 0, third.stdout + third.stderr);
  assert.match(third.stdout, new RegExp(`^answer: evidence/${later}\\.json · kept: `, 'm'));
  assert.match(third.stdout, new RegExp(`^  removed evidence/${earlier}\\.json: the answers that decide stand in its place$`, 'm'));
  assert.deepEqual(f.entries(), [later]);
  assert.equal(existsSync(join(f.dir, 'evidence', `${earlier}.md`)), false);
  const without = gate();
  const conclusions = (a: { marks: unknown; backing: unknown; tripwires: unknown; route: unknown; flags: { name: string }[] }) => ({ marks: a.marks, backing: a.backing, tripwires: a.tripwires, route: a.route, flags: a.flags.filter(flag => flag.name !== 'answer superseded') });
  assert.deepEqual(conclusions(without), conclusions(withIt), 'removing a superseded answer changes no conclusion');
});

test('a composition checks member integrity before generating or executing', t => {
  const f = fixture(t); f.composition();
  f.write('dossiers/parts/gate/integrity.json', JSON.stringify({ ...empty, evidence: { 'tlc-A1-abcdef': 'a'.repeat(64) } }));
  f.write('dossiers/compositions/net/calls/check.md', tlcCall.replace('model/Gate.tla', 'model/generated/Net.tla').replace('model/Gate.cfg', 'model/generated/A1_all_honest.cfg') + 'property: A1\nscenario: all-honest\n');
  const before = fingerprint(f.root);
  const r = f.run(['trial', 'net', 'check.md']);
  assert.equal(r.status, 2, r.stderr);
  assert.match(r.stderr, /parts\/gate: answer removed: evidence\/tlc-A1-abcdef\.json/);
  assert.deepEqual(fingerprint(f.root), before);
});

test('aborted external and Apalache executions retain the requested runner and scope', t => {
  const f = fixture(t);
  f.external('console.log("no verdict"); process.exitCode = 1;');
  f.write('dossiers/parts/gate/calls/check.md', externalCall);
  const external = f.run(['trial', 'gate', 'check.md']);
  assert.equal(external.status, 3, external.stderr);
  assert.equal(f.result().runner, 'check');
  f.model();
  const apalache = f.executable('apalache.mjs', 'console.error("tool could not start"); process.exitCode = 9;');
  f.write('dossiers/parts/gate/calls/apalache.md', 'kind: apalache\nmode: bounded\nlength: 7\nexecutes:\n  - model/Gate.tla\nreach: seven steps\nexpect:\n  A1: holds\nbecause: the bound is explicit\n');
  const r = f.run(['trial', 'gate', 'apalache.md'], { APALACHE: apalache });
  assert.equal(r.status, 3, r.stderr);
  const id = readdirSync(join(f.dir, 'trials')).find(id => id.includes('-apalache-'))!;
  const result = trialBundle(f.dir, id).result!;
  assert.equal(result.result, 'aborted');
  assert.equal(result.mode, 'bounded');
  assert.equal(result.length, 7);
  // Each question had no answer, so each abort is published, and its answer keeps the requested scope.
  const answers = f.entries().map(name => f.entry(name).answer);
  assert.deepEqual(answers.map(a => [a.result, a.runner ?? null, a.mode ?? null, a.length ?? null]).sort(), [['aborted', 'check', null, null], ['aborted', null, 'bounded', 7]].sort());
});

test('TLC receives private declared files and local import closure despite live edits', t => {
  const f = fixture(t); f.model();
  f.write('dossiers/parts/gate/model/Unused.tla', '---- MODULE Unused ----\n====\n');
  const expected = Object.fromEntries(['model/Gate.tla', 'model/Gate.cfg', 'model/Helper.tla'].map(path => [path, fileHash(join(f.dir, path))]));
  const java = f.executable('java.mjs', `import {readFileSync,writeFileSync} from 'node:fs'; import {join} from 'node:path';
writeFileSync(process.env.ORIGINAL_HELPER, 'changed while the checker runs');
const helper = readFileSync(join(process.cwd(),'Helper.tla'),'utf8');
if (!helper.includes('HelperOK == TRUE')) throw Error('checker read changed live input');
console.log(${JSON.stringify(success)});
`);
  const r = f.run(['trial', 'gate', 'check.md'], { JAVA: java, TLA_TOOLS: join(f.dir, 'model/Gate.cfg'), ORIGINAL_HELPER: join(f.dir, 'model/Helper.tla') });
  assert.equal(r.status, 0, r.stderr);
  const result = f.result();
  assert.deepEqual(result.inputIdentity!.files, expected);
  assert.deepEqual(f.entry(f.entries()[0]).basis.inputIdentity, result.inputIdentity, 'the answer keeps the identity of what it rested on');
  assert.deepEqual(result.inputIdentity!.shared, ['tla:Naturals']);
  assert.match(result.inputIdentity!.limitation, /not a hermetic execution/);
  assert.equal(result.cwd, '$INPUTS/model');
  assert.notEqual(fileHash(join(f.dir, 'model/Helper.tla')), expected['model/Helper.tla']);
  const verified = f.run(['verify', '--json']);
  const gate = JSON.parse(verified.stdout).parts[0];
  assert.equal(gate.marks.A1.mark, 'lapsed', JSON.stringify(gate.marks.A1));
});

test('external runners receive frozen files and cannot silently replace those inputs', t => {
  const f = fixture(t);
  f.external(`import {readFileSync,writeFileSync} from 'node:fs'; const input=JSON.parse(readFileSync(0,'utf8')); writeFileSync(input.files['prose.md'],'changed private input'); console.log(JSON.stringify({outcomes:{check:'pass'}}));`);
  f.write('dossiers/parts/gate/calls/check.md', externalCall);
  const before = readFileSync(join(f.dir, 'prose.md'), 'utf8');
  const r = f.run(['trial', 'gate', 'check.md']);
  assert.equal(r.status, 3, r.stderr);
  assert.match(r.stderr, /input copies changed; publication refused/);
  assert.equal(existsSync(join(f.dir, 'trials')), false);
  assert.equal(existsSync(join(f.dir, 'evidence')), false, 'no answer is published');
  assert.deepEqual(JSON.parse(readFileSync(join(f.dir, 'integrity.json'), 'utf8')), empty);
  assert.equal(existsSync(join(f.dir, 'calls/check.md')), true);
  assert.equal(readFileSync(join(f.dir, 'prose.md'), 'utf8'), before);
});

test('changing only an imported module permits a distinct trial in the same minute', t => {
  const f = fixture(t); f.model();
  const java = f.executable('java.mjs', `console.log(${JSON.stringify(success)});`);
  const env = { JAVA: java, TLA_TOOLS: join(f.dir, 'model/Gate.cfg') };
  const first = f.run(['trial', 'gate', 'check.md'], env);
  assert.equal(first.status, 0, first.stderr);
  f.write('dossiers/parts/gate/model/Helper.tla', '---- MODULE Helper ----\nHelperOK == 1 = 1\n====\n');
  f.write('dossiers/parts/gate/calls/check.md', tlcCall);
  const second = f.run(['trial', 'gate', 'check.md'], env);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(readdirSync(join(f.dir, 'trials')).length, 2);
  assert.match(second.stdout, /^answer: evidence\/tlc-A1-[0-9a-f]{6}\.json · replaced the recorded answer$/m, 'the changed import moved the basis of the same question');
  assert.equal(f.entry(f.entries()[0]).established.trial, second.stdout.match(/^trial: (\S+)/m)![1]);
});

test('import closure includes transitive INSTANCE/config modules and ignores comment imports', t => {
  const f = fixture(t); f.model();
  f.write('dossiers/parts/gate/model/Helper.tla', '---- MODULE Helper ----\n(* EXTENDS NotARead (* INSTANCE Neither *) *)\nH == INSTANCE Leaf\nHelperOK == H!OK\n====\n');
  f.write('dossiers/parts/gate/model/Leaf.tla', '---- MODULE Leaf ----\nOK == TRUE\n====\n');
  f.write('dossiers/parts/gate/model/Override.tla', '---- MODULE Override ----\nValue == 1\n====\n');
  f.write('dossiers/parts/gate/model/Gate.cfg', 'INIT Init\nNEXT Next\nINVARIANT A1\nCONSTANT C <- [Override] Value\n');
  const call = parseCall(tlcCall), { plan, problems } = planTrial({ call, dossierDir: f.dir, kind: 'part' });
  assert.deepEqual(problems, []);
  assert.deepEqual(executionDependencies(f.dir, call, plan), { files: ['model/Gate.cfg', 'model/Gate.tla', 'model/Helper.tla', 'model/Leaf.tla', 'model/Override.tla'], shared: ['tla:Naturals'] });
  f.write('dossiers/parts/gate/model/Leaf.tla', '---- MODULE Leaf ----\n---- MODULE Nested ----\n====\n====\n');
  assert.throws(() => executionDependencies(f.dir, call, plan), /nested TLA\+ modules/);
});

test('Alloy open closure captures reachable local modules and leaves util libraries explicit', t => {
  const f = fixture(t);
  f.write('dossiers/parts/gate/model/Gate.als', 'module Gate\nopen lib/Helper\nopen util/ordering[Thing]\nsig Thing {}\nassert A1 { some Thing }\ncheck A1 for 3\n');
  f.write('dossiers/parts/gate/model/lib/Helper.als', 'module lib/Helper\n// open Missing\nopen lib/Leaf\n');
  f.write('dossiers/parts/gate/model/lib/Leaf.als', 'module lib/Leaf\n');
  const call = parseCall('kind: alloy\nexecutes:\n  - model/Gate.als\nreach: three things\nexpect:\n  A1: no counterexample\nbecause: bounded query\n');
  const { plan, problems } = planTrial({ call, dossierDir: f.dir, kind: 'part' });
  assert.deepEqual(problems, []);
  assert.deepEqual(executionDependencies(f.dir, call, plan), { files: ['model/Gate.als', 'model/lib/Helper.als', 'model/lib/Leaf.als'], shared: ['alloy:util/ordering'] });
});

test('real TLC executes the copied local-module closure', { skip: !process.env.TLA_TOOLS }, t => {
  const f = fixture(t); f.model();
  const r = f.run(['trial', 'gate', 'check.md', '--timeout', '30']);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const result = f.result();
  assert.equal(result.outcomes.A1, 'holds');
  assert.equal(result.inputIdentity!.files['model/Helper.tla'], fileHash(join(f.dir, 'model/Helper.tla')));
});

test('real Alloy executes the copied local open closure', { skip: !process.env.ALLOY_JAR }, t => {
  const f = fixture(t);
  f.write('dossiers/parts/gate/model/Gate.als', 'module Gate\nopen lib/Helper\nassert A1 { okay[] }\ncheck A1 for 3\n');
  f.write('dossiers/parts/gate/model/lib/Helper.als', 'module lib/Helper\nopen lib/Leaf\npred okay[] { leaf[] }\n');
  f.write('dossiers/parts/gate/model/lib/Leaf.als', 'module lib/Leaf\npred leaf[] { no none }\n');
  f.write('dossiers/parts/gate/calls/check.md', 'kind: alloy\nexecutes:\n  - model/Gate.als\nreach: three things\nexpect:\n  A1: no counterexample\nbecause: bounded query\n');
  const r = f.run(['trial', 'gate', 'check.md', '--timeout', '30']);
  assert.equal(r.status, 0, r.stderr + r.stdout);
  assert.equal(f.result().outcomes.A1, 'no counterexample');
});

test('real Apalache executes a copied module and preserves the bounded scope', { skip: !process.env.APALACHE }, t => {
  const f = fixture(t);
  f.write('dossiers/parts/gate/model/Gate.tla', '---- MODULE Gate ----\nEXTENDS Integers\nVARIABLES\n  \\* @type: Int;\n  x\nInit == x = 0\nNext == x\' = x\nA1 == x = 0\n====\n');
  f.write('dossiers/parts/gate/calls/check.md', 'kind: apalache\nmode: bounded\nlength: 2\nexecutes:\n  - model/Gate.tla\nreach: two steps\nexpect:\n  A1: holds\nbecause: x never changes\n');
  const r = f.run(['trial', 'gate', 'check.md', '--timeout', '30']);
  const record = f.result();
  assert.equal(r.status, 0, r.stderr + r.stdout + readFileSync(join(f.dir, 'trials', record.id, 'output.txt'), 'utf8'));
  assert.equal(record.outcomes.A1, 'holds');
  assert.equal(record.mode, 'bounded');
  assert.equal(record.length, 2);
  assert.equal(record.cwd, '$INPUTS/model');
});
