import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as tlc from '../../src/trials/checkers/tlc.ts';
import * as alloy from '../../src/trials/checkers/alloy.ts';
import * as apalache from '../../src/trials/checkers/apalache.ts';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const recorded = (...p: string[]) => join(root, 'qualification', 'tests', 'recorded', ...p);
const rec = (...p: string[]) => readFileSync(recorded(...p), 'utf8');
const scratch = () => mkdtempSync(join(tmpdir(), 'dossier-checkers-'));
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// A stand-in executable that echoes its arguments and the environment the
// drivers must set, so run() is checked without a JVM.
function fake(dir: string, name: string) {
  const p = join(dir, name);
  writeFileSync(p, ['#!/bin/sh', 'for a in "$@"; do echo "$a"; done', 'echo "JAVA_HOME=$JAVA_HOME"', 'echo "TMPDIR=$TMPDIR"', 'echo "PATH=$PATH"'].join('\n') + '\n');
  chmodSync(p, 0o755);
  return p;
}

test('toolchains: each driver names the variable it needs and the file it was pointed at', () => {
  assert.match(tlc.toolchain({}).error!, /TLA_TOOLS is not set/);
  assert.match(alloy.toolchain({}).error!, /ALLOY_JAR is not set/);
  assert.match(apalache.toolchain({}).error!, /APALACHE is not set/);
  assert.match(tlc.toolchain({ TLA_TOOLS: '/nowhere/tla2tools.jar' }).error!, /does not exist/);
  assert.match(alloy.toolchain({ ALLOY_JAR: '/nowhere/alloy.jar' }).error!, /does not exist/);
  assert.match(apalache.toolchain({ APALACHE: '/nowhere/apalache-mc' }).error!, /does not exist/);
  const file = recorded('versions.txt');
  assert.deepEqual(tlc.toolchain({ TLA_TOOLS: file }), { java: 'java', jar: file });
  assert.deepEqual(alloy.toolchain({ ALLOY_JAR: file, JAVA: '/j/bin/java' }), { java: '/j/bin/java', jar: file });
  assert.deepEqual(apalache.toolchain({ APALACHE: file }), { java: 'java', bin: file });
  assert.deepEqual(tlc.run({ tla: 'X.tla', cfg: 'X.cfg', trialDir: '/nowhere', env: {} }), { aborted: 'TLA_TOOLS is not set; point it at tla2tools.jar' });
  assert.match(alloy.run({ als: 'X.als', command: 'c', trialDir: '/nowhere', env: {} }).aborted!, /ALLOY_JAR/);
  assert.match(apalache.run({ tla: 'X.tla', inv: 'I', length: 1, trialDir: '/nowhere', env: {} }).aborted!, /APALACHE/);
  assert.equal(apalache.version({}), null);
});

test('apalache environment: a configured JAVA leads PATH and JAVA_HOME is two levels above it', () => {
  const e = apalache.environment({ JAVA: '/opt/jdk/Contents/Home/bin/java', PATH: `/usr/bin${delimiter}/bin`, OTHER: '1' }, { TMPDIR: '/t' });
  assert.equal(e.PATH, `/opt/jdk/Contents/Home/bin${delimiter}/usr/bin${delimiter}/bin`);
  assert.equal(e.JAVA_HOME, '/opt/jdk/Contents/Home');
  assert.equal(e.OTHER, '1'); assert.equal(e.TMPDIR, '/t');
  const bare = apalache.environment({ PATH: '/usr/bin' });
  assert.equal(bare.PATH, '/usr/bin'); assert.equal(bare.JAVA_HOME, undefined);
});

test('tlc.run: the argv in -tool mode, the module directory as cwd, scratch under the trial and gone after', () => {
  const dir = scratch();
  const java = fake(dir, 'java');
  const jar = recorded('versions.txt');
  const model = join(dir, 'model');
  mkdirSync(join(model, 'cfgs'), { recursive: true });
  writeFileSync(join(model, 'Parcel.tla'), ''); writeFileSync(join(model, 'Parcel.cfg'), ''); writeFileSync(join(model, 'cfgs', 'A1_all-honest.cfg'), '');
  const trialDir = join(dir, 'trial');
  const r = tlc.run({ tla: join(model, 'Parcel.tla'), cfg: join(model, 'Parcel.cfg'), trialDir, env: { ...process.env, JAVA: java, TLA_TOOLS: jar } });
  assert.equal(r.aborted, undefined);
  assert.deepEqual(r.argv, [java, '-XX:+UseParallelGC', `-Djava.io.tmpdir=${join(trialDir, 'states', 'tmp')}`, '-cp', jar, 'tlc2.TLC', '-tool', '-coverage', '1', '-workers', '1', '-cleanup', '-metadir', join(trialDir, 'states'), '-config', 'Parcel.cfg', 'Parcel.tla']);
  assert.equal(r.cwd, model);
  assert.equal(r.exit, 0); assert.equal(r.signal, null); assert.equal(r.timedOut, false); assert.equal(r.error, null);
  assert.equal(typeof r.seconds, 'number');
  assert.ok(r.stdout!.includes('tlc2.TLC\n'), 'the stand-in saw the TLC arguments');
  assert.equal(existsSync(join(trialDir, 'states')), false, 'the state directory is removed after the run');
  const cell = tlc.run({ tla: join(model, 'Parcel.tla'), cfg: join(model, 'cfgs', 'A1_all-honest.cfg'), trialDir, workers: '4', env: { ...process.env, JAVA: java, TLA_TOOLS: jar } });
  assert.deepEqual(cell.argv!.slice(-3), ['-config', 'cfgs/A1_all-honest.cfg', 'Parcel.tla']);
  assert.deepEqual(cell.argv!.slice(9, 11), ['-workers', '4']);
  rmSync(dir, { recursive: true, force: true });
});

test('tlc.run: the trace specs a newer TLC writes beside the module on a violation are removed, and nothing that was there before', () => {
  const dir = scratch();
  const java = join(dir, 'java');
  // A stand-in for a TLC that writes <Spec>_TTrace_<epoch>.tla and .bin into its working directory.
  writeFileSync(java, ['#!/bin/sh', 'for a in "$@"; do last="$a"; done', 'spec="${last%.tla}"', 'echo trace > "${spec}_TTrace_1762300000.tla"', 'echo trace > "${spec}_TTrace_1762300000.bin"'].join('\n') + '\n');
  chmodSync(java, 0o755);
  const model = join(dir, 'model');
  mkdirSync(model);
  writeFileSync(join(model, 'Parcel.tla'), ''); writeFileSync(join(model, 'Parcel.cfg', ), '');
  writeFileSync(join(model, 'Parcel_TTrace_1.tla'), 'kept: it was there before the run');
  const r = tlc.run({ tla: join(model, 'Parcel.tla'), cfg: join(model, 'Parcel.cfg'), trialDir: join(dir, 'trial'), env: { ...process.env, JAVA: java, TLA_TOOLS: recorded('versions.txt') } });
  assert.equal(r.exit, 0);
  assert.deepEqual(readdirSync(model).sort(), ['Parcel.cfg', 'Parcel.tla', 'Parcel_TTrace_1.tla']);
  assert.deepEqual(tlc.removeTraceSpecs(join(dir, 'nowhere'), new Set()), []);
  rmSync(dir, { recursive: true, force: true });
});

test('alloy.run: exec with one command, XML solutions under the trial', () => {
  const dir = scratch();
  const java = fake(dir, 'java');
  const jar = recorded('versions.txt');
  const model = join(dir, 'model');
  mkdirSync(model); writeFileSync(join(model, 'Parcel.als'), '');
  const trialDir = join(dir, 'trial');
  const r = alloy.run({ als: join(model, 'Parcel.als'), command: 'A3_no_shared', trialDir, env: { ...process.env, JAVA: java, ALLOY_JAR: jar } });
  assert.equal(r.aborted, undefined);
  assert.deepEqual(r.argv, [java, `-Djava.io.tmpdir=${join(trialDir, 'alloy', 'tmp')}`, '-Djava.awt.headless=true', '-jar', jar, 'exec', '-q', '-c', 'A3_no_shared', '-t', 'xml', '-s', 'sat4j', '-r', '1', '-u', '-1', '-f', '-o', join(trialDir, 'alloy'), 'Parcel.als']);
  assert.equal(r.cwd, model); assert.equal(r.outDir, join(trialDir, 'alloy')); assert.equal(r.exit, 0); assert.equal(r.error, null);
  rmSync(dir, { recursive: true, force: true });
});

test('apalache.run: the check argv, the module directory as cwd, the configured JVM handed to the launcher, scratch under the trial', () => {
  const dir = scratch();
  const launcher = fake(dir, 'apalache-mc');
  const model = join(dir, 'model');
  mkdirSync(join(model, 'cfgs'), { recursive: true });
  writeFileSync(join(model, 'Smoke.tla'), ''); writeFileSync(join(model, 'Smoke.cfg'), ''); writeFileSync(join(model, 'cfgs', 'A1_all-honest.cfg'), '');
  const trialDir = join(dir, 'trial');
  const outDir = join(trialDir, 'apalache');
  const javaHome = join(dir, 'jdk', 'Contents', 'Home');
  const env = { ...process.env, APALACHE: launcher, JAVA: join(javaHome, 'bin', 'java') };
  const r = apalache.run({ tla: join(model, 'Smoke.tla'), cfg: join(model, 'Smoke.cfg'), inv: 'Inv', init: 'Inv', next: 'Step', length: 1, trialDir, env });
  assert.equal(r.aborted, undefined);
  assert.deepEqual(r.argv, [launcher, 'check', '--inv=Inv', '--length=1', '--init=Inv', '--next=Step', '--config=Smoke.cfg', '--no-deadlock', `--out-dir=${outDir}`, 'Smoke.tla']);
  assert.equal(r.cwd, model); assert.equal(r.outDir, outDir);
  assert.equal(r.exit, 0); assert.equal(r.timedOut, false); assert.equal(r.error, null);
  assert.ok(r.stdout!.includes(`JAVA_HOME=${javaHome}\n`), r.stdout);
  assert.ok(r.stdout!.includes(`TMPDIR=${join(outDir, 'tmp')}\n`), r.stdout);
  assert.match(r.stdout!, new RegExp(`^PATH=${escape(join(javaHome, 'bin') + delimiter)}`, 'm'));
  assert.equal(existsSync(join(outDir, 'tmp')), false, 'the launcher scratch is removed after the run');
  assert.ok(existsSync(outDir), 'the output directory stays for parse');
  // a bounded check from Init: no --init, no --next, no --config; length 0 is a real bound
  const base = apalache.run({ tla: join(model, 'Smoke.tla'), inv: 'Inv', length: 0, trialDir, env });
  assert.deepEqual(base.argv, [launcher, 'check', '--inv=Inv', '--length=0', '--no-deadlock', `--out-dir=${outDir}`, 'Smoke.tla']);
  // a system cell's cfg lives under model/cfgs/, named from the module directory
  const cell = apalache.run({ tla: join(model, 'Smoke.tla'), cfg: join(model, 'cfgs', 'A1_all-honest.cfg'), inv: 'A1', length: 3, trialDir, env });
  assert.deepEqual(cell.argv!.slice(2), ['--inv=A1', '--length=3', '--config=cfgs/A1_all-honest.cfg', '--no-deadlock', `--out-dir=${outDir}`, 'Smoke.tla']);
  // without JAVA the launcher is run as found, with the caller's PATH
  const asIs = apalache.run({ tla: join(model, 'Smoke.tla'), inv: 'Inv', length: 1, trialDir, env: { ...process.env, APALACHE: launcher, JAVA: '' } });
  assert.ok(asIs.stdout!.includes(`PATH=${process.env.PATH}\n`));
  rmSync(dir, { recursive: true, force: true });
});

test('TLC frames: a completed run, its stats and its coverage rows', () => {
  const p = tlc.parse(rec('tlc', 'parcel.txt'));
  assert.ok(p.frames > 20);
  assert.match(p.version!, /^TLC2 Version 2\.19/);
  assert.equal(p.completed, true); assert.equal(p.violation, null);
  assert.deepEqual(p.states, { generated: 9, distinct: 9, queued: 0, depth: 5 });
  assert.deepEqual(p.init, { accepted: 1, generated: 1 });
  assert.deepEqual(p.actions.M4_Fail, { distinct: 2, generated: 2 });
  assert.deepEqual(Object.keys(p.actions).sort(), ['M1_Ship', 'M2_Cancel', 'M3_Deliver', 'M4_Fail', 'M5_Fail']);
  assert.deepEqual(p.errors, []);
  assert.deepEqual(p.warnings, ['Please run the Java VM which executes TLC with a throughput optimized garbage collector by passing the "-XX:+UseParallelGC" property.']);
  assert.deepEqual(tlc.outcomes(p, ['TypeOK', 'A1']).outcomes, { TypeOK: 'holds', A1: 'holds' });
});

test('TLC frames: an invariant violation with its trace', () => {
  const p = tlc.parse(rec('tlc', 'parcel-W2.txt'));
  assert.deepEqual(p.violation, { kind: 'invariant', name: 'NotW2' });
  assert.equal(p.completed, false);
  assert.equal(p.trace.length, 5);
  assert.equal(p.trace[0].action, 'Initial predicate');
  assert.equal(p.trace[1].action, 'M1_Ship');
  assert.deepEqual(p.trace.map(s => s.index), [1, 2, 3, 4, 5]);
  assert.deepEqual(p.trace[0].values, { everShipped: 'FALSE', state: '"Packed"', attempts: '0' });
  assert.deepEqual(p.trace.map(s => `${tlc.unquote(s.values!.state)}/${s.values!.attempts}`), ['Packed/0', 'Shipped/0', 'Shipped/1', 'Shipped/2', 'Returned/2']);
  assert.deepEqual(p.init, { accepted: 2, generated: 2 });
  const o = tlc.outcomes(p, ['TypeOK', 'NotW2']);
  assert.deepEqual(o.outcomes, { TypeOK: 'holds', NotW2: 'violated' }); assert.deepEqual(o.partial, ['TypeOK']);
});

test('TLC frames: action property, temporal violation with stuttering, invariant in a blunder, parse failure', () => {
  const r1 = tlc.parse(rec('tlc', 'recall-R1.txt'));
  assert.deepEqual(r1.violation, { kind: 'action', name: 'R1' }); assert.equal(r1.trace[2].action, 'M6_Recall');
  assert.deepEqual(tlc.outcomes(r1, ['R1', 'TypeOK']).outcomes, { R1: 'violated', TypeOK: 'holds' });
  const o1 = tlc.parse(rec('tlc', 'unfair-O1.txt'));
  assert.deepEqual(o1.violation, { kind: 'temporal', name: null });
  assert.equal(o1.trace.length, 5);
  assert.deepEqual(o1.trace[o1.trace.length - 1], { index: 5, stuttering: true });
  assert.deepEqual(tlc.outcomes(o1, ['O1']).outcomes, { O1: 'violated' });
  const a1 = tlc.parse(rec('tlc', 'loose-A1.txt'));
  assert.deepEqual(a1.violation, { kind: 'invariant', name: 'A1' });
  assert.equal(a1.trace.length, 5);
  assert.deepEqual(tlc.outcomes(a1, ['A1']).outcomes, { A1: 'violated' });
  const bad = tlc.parse(rec('tlc', 'parse-error.txt'));
  assert.equal(bad.completed, false); assert.equal(bad.violation, null);
  assert.match(bad.errors[0], /Parsing or semantic analysis failed/);
  assert.deepEqual(tlc.outcomes(bad, ['A1']).outcomes, {});
  assert.equal(tlc.unquote('"Packed"'), 'Packed'); assert.equal(tlc.unquote(3), '3');
});

test('TLC frames: a tool-mode cycle closes at its destination and retains its action', () => {
  // Four unchanged frames from Control's 2026-11-05-0443-blunder-48f140
  // output: temporal violation, states 14/15, and the tool-mode back edge.
  const p = tlc.parse(rec('tlc', 'back-to-state.txt'));
  assert.deepEqual(p.violation, { kind: 'temporal', name: null });
  assert.deepEqual(p.trace.map(s => s.index), [14, 15, 16]);
  assert.deepEqual(p.trace.at(-1), { index: 16, backTo: 14, action: 'vault_M3_Move' });
  assert.equal(p.trace[0].values!.vault_joined, '1');
  assert.equal(p.trace[1].values!.vault_joined, '0');
  assert.equal(p.trace[0].action, 'User', 'the first arrival and the closing edge can use different actions');
  assert.equal(p.trace[1].action, 'vault_M4_Release');
  assert.equal(p.trace.at(-1)!.values, undefined, 'a closure is not another concrete state');
  assert.equal(p.completed, false);
  assert.deepEqual(p.errors, []);
  assert.deepEqual(tlc.outcomes(p, ['O1']).outcomes, { O1: 'violated' });
});

test('TLC frames: explicit-index and actionless tool-mode back edges retain their distinct numbering', () => {
  const frame = (body: string) => `@!@!@STARTMSG 2122:4 @!@!@\n${body}\n@!@!@ENDMSG 2122 @!@!@\n`;
  const prefix = '@!@!@STARTMSG 2217:4 @!@!@\n15: <Release line 1, col 1 to line 1, col 9 of module Example>\n/\\ x = 0\n@!@!@ENDMSG 2217 @!@!@\n';
  assert.deepEqual(tlc.parse(prefix + frame('16: Back to state 14')).trace.at(-1), { index: 16, backTo: 14 });
  assert.deepEqual(tlc.parse(prefix + frame('14: Back to state')).trace.at(-1), { index: 16, backTo: 14 });
});

test('Alloy receipts: check without and with a counterexample, run with an instance', () => {
  const dir = (n: string) => recorded('alloy', n);
  const a3 = alloy.parse(dir('A3_no_shared'), 'A3_no_shared');
  assert.equal(a3.outcome, 'no counterexample'); assert.equal(a3.sat, false); assert.deepEqual(a3.xml, []);
  assert.deepEqual(a3.receipt, { name: 'A3_no_shared', type: 'check', overall: 6, source: 'check A3_no_shared for 6', solutions: 0 });
  const a4 = alloy.parse(dir('A4_wrong'), 'A4_wrong');
  assert.equal(a4.outcome, 'counterexample'); assert.equal(a4.type, 'check'); assert.equal(a4.overall, 6); assert.equal(a4.xml!.length, 1);
  assert.equal(a4.receipt!.solutions, 1);
  const w4 = alloy.parse(dir('W4_two_orders'), 'W4_two_orders');
  assert.equal(w4.outcome, 'instance'); assert.equal(w4.type, 'run');
  assert.match(alloy.parse(dir('A4_wrong'), 'Nope').error!, /no entry/);
  assert.match(alloy.parse(recorded('tlc'), 'A4_wrong').error!, /no receipt\.json/);
});

test('Apalache stdout: a bounded run that holds, and the inductive step, report NoError up to their length', () => {
  const p = apalache.parse(rec('apalache', 'bounded-holds.txt'));
  assert.equal(p.outcome, 'NoError'); assert.equal(p.length, 5); assert.equal(p.exitcode, 0);
  assert.equal(p.version, '0.62.4'); assert.equal(p.build, '7954daf');
  assert.deepEqual(p.errors, []); assert.equal(p.violatedInvariant, null); assert.equal(p.trace, null); assert.equal(p.runDir, null);
  assert.deepEqual(apalache.outcomes(p, 'InvHolds'), { InvHolds: 'holds' });
  const ind = apalache.parse(rec('apalache', 'inductive-step.txt'));
  assert.equal(ind.outcome, 'NoError'); assert.equal(ind.length, 1); assert.equal(ind.exitcode, 0);
  assert.deepEqual(ind.errors, []);
  assert.deepEqual(apalache.outcomes(ind, 'Inductive'), { Inductive: 'holds' });
});

test('Apalache verdict: only a counterexample violates the invariant; a deadlock establishes nothing, and says so', () => {
  const holds = apalache.parse(rec('apalache', 'bounded-holds.txt'));
  const violated = apalache.parse(rec('apalache', 'bounded-violated.txt'));
  const deadlock = apalache.parse(rec('apalache', 'bounded-holds.txt').replace('The outcome is: NoError', 'The outcome is: Deadlock'));
  assert.equal(deadlock.outcome, 'Deadlock');
  assert.deepEqual(apalache.verdict([{ label: 'bounded', parsed: holds }], 'Inv'), { outcome: 'holds', reason: null });
  assert.deepEqual(apalache.verdict([{ label: 'bounded', parsed: violated }], 'Inv'), { outcome: 'violated', reason: null });
  assert.deepEqual(apalache.verdict([{ label: 'bounded', parsed: deadlock }], 'Inv'), { outcome: 'unknown', reason: 'the bounded run ended in Deadlock, which neither holds nor violates Inv' });
  assert.equal(apalache.verdict([{ label: 'step', parsed: holds }, { label: 'base', parsed: deadlock }], 'Inv').outcome, 'unknown', 'an inductive pair says no more than its weaker run');
  assert.deepEqual(apalache.verdict([{ label: 'step', parsed: violated }, { label: 'base', parsed: holds }], 'Inv'), { outcome: 'violated', reason: null });
});

test('Apalache stdout: a newer run in the same output directory is not this run, as when the base follows the step', () => {
  const out = scratch();
  const named = join(out, 'Smoke.tla', '2026-11-03T13-22-35_11910121991958481877');
  mkdirSync(named, { recursive: true });
  cpSync(recorded('apalache', 'violation1.itf.json'), join(named, 'violation1.itf.json'));
  const later = join(out, 'Smoke.tla', '2026-11-03T13-22-37_2');
  mkdirSync(later, { recursive: true });
  const future = new Date(Date.now() + 3600 * 1000);
  utimesSync(later, future, future);
  const stdout = rec('apalache', 'bounded-violated.txt');
  assert.equal(apalache.namedRun(stdout, out), named);
  const p = apalache.parse(stdout, out);
  assert.equal(p.runDir, named, 'the folder the output names, not the newest');
  assert.equal(p.trace!.states.length, 4);
  assert.equal(apalache.namedRun('no output directory line', out), null);
  assert.equal(apalache.parse('no output directory line', out).runDir, later, 'the newest folder is the fallback');
  assert.equal(apalache.namedRun(stdout, join(out, 'elsewhere')), null);
  rmSync(out, { recursive: true, force: true });
});

test('Apalache stdout: a violated invariant, the state it failed in, and the ITF trace from the run directory it names', () => {
  const out = scratch();
  const runDir = join(out, 'Smoke.tla', '2026-11-03T13-22-35_11910121991958481877');
  mkdirSync(runDir, { recursive: true });
  cpSync(recorded('apalache', 'violation1.itf.json'), join(runDir, 'violation1.itf.json'));
  // an earlier run of the same spec in the same output directory is not this trial's
  const older = join(out, 'Smoke.tla', '2026-11-03T12-00-00_1');
  mkdirSync(older, { recursive: true });
  writeFileSync(join(older, 'violation1.itf.json'), JSON.stringify({ vars: ['x'], states: [{ '#meta': { index: 0 }, x: { '#bigint': '9' } }] }));
  const past = new Date(Date.now() - 3600 * 1000);
  utimesSync(older, past, past);
  const stdout = rec('apalache', 'bounded-violated.txt');
  const p = apalache.parse(stdout, out);
  assert.equal(p.outcome, 'Error'); assert.equal(p.exitcode, 12); assert.equal(p.length, null);
  assert.deepEqual(p.violatedInvariant, { state: 3, index: 0 });
  assert.deepEqual(p.errors, []);
  assert.equal(p.runDir, runDir);
  assert.deepEqual(p.trace!.vars, ['s', 'x']);
  assert.equal(p.trace!.states.length, 4);
  assert.ok(p.trace!.states.every(s => !('#meta' in s)), 'states carry no #meta');
  assert.deepEqual(p.trace!.states.map(s => s.s), ['Idle', 'Busy', 'Busy', 'Busy']);
  assert.deepEqual(p.trace!.states.map(s => s.x), [{ '#bigint': '0' }, { '#bigint': '1' }, { '#bigint': '2' }, { '#bigint': '3' }]);
  assert.deepEqual(p.trace!.states.map(s => apalache.plain(s.x)), [0, 1, 2, 3]);
  assert.deepEqual(apalache.plain(p.trace!.states[3]), { s: 'Busy', x: 3 });
  assert.deepEqual(apalache.outcomes(p, 'InvFails'), { InvFails: 'violated' });
  // no output directory, or one with no run under it, means no trace
  assert.equal(apalache.parse(stdout).trace, null);
  assert.equal(apalache.parse(stdout, join(out, 'nowhere')).trace, null);
  rmSync(out, { recursive: true, force: true });
});

const TYPE_ERROR = [
  '# Usage statistics is OFF. We care about your privacy.',
  '',
  'Output directory: /tmp/out/Broken.tla/2026-11-03T13-30-29_3292074147424503462',
  '# APALACHE version: 0.62.4 | build: 7954daf                       I@13:30:29.202',
  'PASS #0: SanyParser                                               I@13:30:29.371',
  'PASS #1: TypeCheckerSnowcat                                       I@13:30:29.499',
  ' > Running Snowcat .::.                                           I@13:30:29.499',
  '[Broken.tla:7:14-7:20]: An operator with the signature ((Int, Int) => Int) cannot be applied to the provided arguments of type Int and Str E@13:30:29.559',
  '[Broken.tla:7:1-7:20]: Error when computing the type of Next      E@13:30:29.561',
  ' > Snowcat asks you to fix the types. Meow.                       I@13:30:29.561',
  'Checker has found an error                                        I@13:30:29.581',
  'It took me 0 days  0 hours  0 min  0 sec                          I@13:30:29.581',
  'Total time: 0.376 sec                                             I@13:30:29.581',
  'EXITCODE: ERROR (120)',
].join('\n') + '\n';

const SYNTAX_ERROR = [
  'Output directory: /tmp/out/Syntax.tla/2026-11-03T13-30-30_1778435653084627268',
  '# APALACHE version: 0.62.4 | build: 7954daf                       I@13:30:30.037',
  'PASS #0: SanyParser                                               I@13:30:30.188',
  'Parsing error: Syntax errors:',
  '',
  '*** Errors: 1',
  '',
  'In module Syntax',
  '',
  'Could not parse module Syntax from file /tmp/Syntax.tla E@13:30:30.235',
  'Checker has found an error                                        I@13:30:30.254',
  'EXITCODE: ERROR (255)',
].join('\n') + '\n';

test('Apalache stdout: no outcome line is an aborted run, with its error lines kept without their timestamps', () => {
  const empty = apalache.parse('');
  assert.equal(empty.outcome, 'aborted'); assert.equal(empty.exitcode, null); assert.equal(empty.length, null);
  assert.equal(empty.trace, null); assert.equal(empty.violatedInvariant, null); assert.deepEqual(empty.errors, []);
  assert.deepEqual(apalache.outcomes(empty, 'Inv'), { Inv: 'unknown' });
  const typed = apalache.parse(TYPE_ERROR);
  assert.equal(typed.outcome, 'aborted'); assert.equal(typed.exitcode, 120); assert.equal(typed.version, '0.62.4');
  assert.deepEqual(typed.errors, [
    '[Broken.tla:7:14-7:20]: An operator with the signature ((Int, Int) => Int) cannot be applied to the provided arguments of type Int and Str',
    '[Broken.tla:7:1-7:20]: Error when computing the type of Next',
  ]);
  assert.deepEqual(apalache.outcomes(typed, 'Inv'), { Inv: 'unknown' });
  const syntax = apalache.parse(SYNTAX_ERROR);
  assert.equal(syntax.outcome, 'aborted'); assert.equal(syntax.exitcode, 255);
  assert.deepEqual(syntax.errors, ['Parsing error: Syntax errors:', '*** Errors: 1', 'Could not parse module Syntax from file /tmp/Syntax.tla']);
});

test('ITF values: integers, sets, tuples, maps, records and unserializable values become plain values', () => {
  assert.equal(apalache.plain({ '#bigint': '42' }), 42);
  assert.equal(apalache.plain({ '#bigint': '-7' }), -7);
  assert.equal(apalache.plain({ '#bigint': '123456789012345678901234567890' }), '123456789012345678901234567890');
  assert.deepEqual(apalache.plain({ '#set': [{ '#bigint': '1' }, 'a'] }), [1, 'a']);
  assert.deepEqual(apalache.plain({ '#tup': ['a', { '#bigint': '2' }] }), ['a', 2]);
  assert.deepEqual(apalache.plain({ '#map': [['k', { '#bigint': '3' }]] }), [['k', 3]]);
  assert.deepEqual(apalache.plain({ a: { '#bigint': '4' }, b: true, c: 'Idle' }), { a: 4, b: true, c: 'Idle' });
  assert.equal(apalache.plain({ '#unserializable': 'Nat' }), 'Nat');
  assert.equal(apalache.plain(null), null);
});

const live = Boolean(process.env.APALACHE && existsSync(process.env.APALACHE));
test('with APALACHE set, a bounded check of Smoke.tla runs end to end and leaves its trace', { skip: !live && 'APALACHE not set' }, () => {
  const trialDir = scratch();
  const r = apalache.run({ tla: recorded('apalache', 'Smoke.tla'), inv: 'InvFails', length: 5, trialDir });
  assert.equal(r.aborted, undefined);
  assert.equal(r.error, null, r.stderr); assert.equal(r.timedOut, false);
  assert.equal(r.exit, 12, r.stdout! + r.stderr!);
  assert.deepEqual(r.argv, [process.env.APALACHE, 'check', '--inv=InvFails', '--length=5', '--no-deadlock', `--out-dir=${join(trialDir, 'apalache')}`, 'Smoke.tla']);
  assert.equal(r.cwd, recorded('apalache'));
  const p = apalache.parse(r.stdout, r.outDir);
  assert.equal(p.outcome, 'Error'); assert.equal(p.exitcode, 12);
  assert.match(p.version!, /^\d+\.\d+\.\d+/);
  assert.deepEqual(p.violatedInvariant, { state: 3, index: 0 });
  assert.ok(p.trace, 'a trace was read from the run directory');
  assert.ok(p.runDir!.startsWith(join(r.outDir!, 'Smoke.tla')), p.runDir!);
  assert.deepEqual(p.trace.vars.slice().sort(), ['s', 'x']);
  assert.deepEqual(p.trace.states.map(s => apalache.plain(s.x)), [0, 1, 2, 3]);
  assert.deepEqual(p.trace.states.map(s => s.s), ['Idle', 'Busy', 'Busy', 'Busy']);
  assert.deepEqual(apalache.outcomes(p, 'InvFails'), { InvFails: 'violated' });
  assert.equal(existsSync(join(r.outDir!, 'tmp')), false, 'the launcher scratch is gone');
  assert.equal(existsSync(join(recorded('apalache'), 'tmp')), false, 'nothing was written beside the module');
  assert.equal(apalache.version(), p.version);
  rmSync(trialDir, { recursive: true, force: true });
});
