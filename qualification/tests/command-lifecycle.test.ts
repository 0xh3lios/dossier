import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import type { SpawnSyncReturns } from 'node:child_process';
import { createActor } from 'xstate';
import { getShortestPaths } from '@xstate/graph';
import { commandEvents, commandExpectation, commandLifecycle, riskEvents, riskExpectation, riskLifecycle } from '../conformance/command-lifecycle.ts';
import { fingerprint } from '../conformance/files.ts';
import { sha256 } from '../../src/hash.ts';
import { parseSystemProse } from '../../src/prose/prose.ts';
import { bundleDigest } from '../../src/trials/receipt.ts';
import { answerOf } from '../conformance/evidence.ts';
import type { VerifyJson } from '../../src/commands/verify.ts';

const plugin = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const budget = readFileSync(join(plugin, 'qualification/conformance/fixtures/budget.md'), 'utf8').replaceAll('the operator', 'the public');
const words = 'This synthetic owner accepts only the recorded bounded violation.';
const chartCall = (because: string) => `kind: chart\nexecutes:\n  - prose.md\nreach: capacity 0..2; balance 0..3\nexpect:\n  checks: pass\nbecause: ${because}\n`;
// Where each kind of fault stops the command: after integrity.json binds the candidate, after the
// candidate becomes the entry, after the bundle moves to trials/, or after decisions.log is replaced.
type Fault = { kind: 'manifest' | 'entry' | 'bundle' | 'decision'; dir: string };

function harness(t: TestContext, solver = false) {
  const work = mkdtempSync(join(tmpdir(), 'dossier-command-path-')), root = join(work, 'dossiers');
  // Opt in to retaining the real command artifacts for inspection/replay.
  t.after(() => process.env.DOSSIER_QUAL_KEEP === '1' ? t.diagnostic(`command artifacts: ${work}`) : rmSync(work, { recursive: true, force: true }));
  const env: NodeJS.ProcessEnv = { ...process.env, DOSSIER_ROOT: '' };
  if (!solver) for (const name of ['JAVA', 'TLA_TOOLS', 'ALLOY_JAR', 'APALACHE']) delete env[name];
  // A test-only clock: a command started with `at` takes that time as now, so that a retry in the
  // same minute meets the trial it repeats, whatever the wall clock does between them.
  const clock = join(work, 'clock.mjs');
  writeFileSync(clock, 'const RealDate = Date;\nglobalThis.Date = class extends RealDate { constructor(...args) { super(...(args.length ? args : [process.env.DOSSIER_QUAL_NOW])); } };\n');
  const authority = () => Object.fromEntries(Object.entries(fingerprint(work)).filter(([path]) => /\/(integrity\.json|decisions\.log)$/.test(path)));
  const exec = (args: string[], expected: number | 'SIGKILL' = 0, { fault, at }: { fault?: Fault; at?: string } = {}): SpawnSyncReturns<string> => {
    const authorityBefore = args[0] === 'render' ? authority() : null;
    const imports = [...(at ? [clock] : []), ...(fault ? [join(plugin, 'qualification/conformance/command-fault-hook.mjs')] : [])];
    const environment = { ...env, ...(imports.length ? {
      NODE_OPTIONS: `${env.NODE_OPTIONS || ''} ${imports.map(path => `--import=${pathToFileURL(path).href}`).join(' ')}`.trim(),
      ...(at ? { DOSSIER_QUAL_NOW: at } : {}),
      ...(fault ? { DOSSIER_QUAL_FAULT: fault.kind, DOSSIER_QUAL_FAULT_DIR: fault.dir } : {}),
    } : {}) };
    const result = spawnSync(join(plugin, 'bin/dossier'), [args[0], '--root', root, ...args.slice(1)], { cwd: work, env: environment, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 45000 });
    assert.ifError(result.error);
    assert.equal(expected === 'SIGKILL' ? result.signal : result.status, expected, `${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
    if (authorityBefore) assert.deepEqual(authority(), authorityBefore, 'render preserves every integrity and decision record, including bytes and mtimes');
    return result;
  };
  const run = (args: string[], expected: number | 'SIGKILL' = 0, options: { fault?: Fault; at?: string } = {}) => exec(args, expected, options).stdout;
  const observe = () => {
    const before = fingerprint(work);
    const result = spawnSync(join(plugin, 'bin/dossier'), ['verify', '--json', '--root', root], { cwd: work, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    assert.ifError(result.error); assert.ok(result.status === 0 || result.status === 1, result.stdout + result.stderr);
    assert.deepEqual(fingerprint(work), before, 'default CLI verify preserves all bytes, permissions and mtimes, including failures');
    return JSON.parse(result.stdout) as VerifyJson;
  };
  // A local bundle never changes once it is in trials/, and an entry changes only by a publication
  // the evidence rules allow (ART-EVIDENCE): never by a read, a render, an edit or a decision.
  const bundles = new Map<string, string>();
  let entries: Record<string, string> | null = null;
  const remember = (published = false) => {
    const now = fingerprint(work);
    for (const [path, signature] of bundles) assert.equal(now[path], signature, `a local bundle changed: ${path}`);
    for (const [path, signature] of Object.entries(now)) if (path.includes('/trials/') && !signature.endsWith(':directory')) bundles.set(path, signature);
    const current = Object.fromEntries(Object.entries(now).filter(([path]) => /\/evidence\/[^/]+\.json$/.test(path)));
    if (entries && !published) assert.deepEqual(current, entries, 'no entry changes without a publication');
    entries = current;
  };
  return { work, root, exec, run, observe, remember };
}

function componentAdapter(t: TestContext) {
  const h = harness(t), dir = join(h.root, 'components/budget');
  // The trial whose publication was interrupted once integrity.json bound its candidate.
  let serial = 0, interrupted = '', pendingCall = '';
  // A trial's bundle waits in .running/ until its publication ends, then moves to the local trials/.
  const bundles = () => ['trials', '.running'].flatMap(folder => existsSync(join(dir, folder)) ? readdirSync(join(dir, folder)).filter(name => !name.startsWith('.')) : []).sort();
  const resultOf = (id: string) => JSON.parse(readFileSync(join([join(dir, 'trials', id), join(dir, '.running', id)].find(existsSync)!, 'result.json'), 'utf8'));
  // The agent's reading sits beside the answer the trial published.
  const read = (id: string, text: string) => {
    const answer = answerOf(dir, id);
    assert.ok(answer, `the answer of ${id} is published`);
    writeFileSync(join(dir, 'evidence', `${answer.name}.md`), text);
  };
  const runChart = (limit?: number, interrupt = false) => {
    const name = `chart-${++serial}.md`;
    mkdirSync(join(dir, 'calls'), { recursive: true });
    pendingCall = join(dir, 'calls', name);
    writeFileSync(pendingCall, chartCall(`Three attempted payments exhaust capacity; attempt ${serial} checks the unchanged finite meaning.`));
    const before = new Set(bundles());
    const out = h.run(['trial', 'budget', name, ...(limit ? ['--limit', String(limit)] : [])], interrupt ? 'SIGKILL' : limit ? 3 : 0, interrupt ? { fault: { kind: 'manifest', dir } } : {});
    const added = bundles().filter(id => !before.has(id));
    assert.equal(added.length, 1);
    const result = resultOf(added[0]);
    if (interrupt) {
      interrupted = added[0];
      assert.equal(result.result, 'as-called');
      assert.ok(existsSync(join(dir, '.running', interrupted, 'entry.json')), 'the bound candidate waits beside its bundle');
      assert.ok(existsSync(pendingCall), 'an unfinished publication consumes no call');
    } else {
      assert.equal(result.result, limit ? 'aborted' : 'as-called');
      assert.match(out, /^answer: evidence\/chart-[0-9a-f]{6}\.json · (published|replaced the recorded answer)$/m);
      assert.equal(existsSync(pendingCall), false, 'a published answer consumes its call');
      read(added[0], limit ? 'Exploration stopped at its limit. No successful cover is claimed.\n' : 'The recorded chart checks the finite capacity and balance ranges. Its result is not induction or a deployment proof.\n');
    }
    return added[0];
  };
  const send = (type: string) => {
    if (type === 'AUTHOR') {
      h.run(['setup']); h.run(['decide', 'budget', 'begin', 'charted']);
      writeFileSync(join(dir, 'prose.md'), budget);
      h.run(['draw', 'budget', '--brief']);
    } else if (type === 'ABORT') runChart(1);
    else if (['CHECK', 'RETRY', 'REFRESH'].includes(type)) runChart();
    else if (type === 'EDIT') {
      const path = join(dir, 'prose.md');
      writeFileSync(path, readFileSync(path, 'utf8').replace('Walk Exhaust:', 'Walk ExhaustedCapacity:'));
    } else if (type === 'INTERRUPT_ANSWER') runChart(undefined, true);
    else if (type === 'RECOVER_ANSWER') {
      const before = fingerprint(h.work);
      const preview = h.run(['recover', 'budget', 'trial', interrupted, '--dry-run']);
      assert.match(preview, /^would place evidence\/chart-[0-9a-f]{6}\.json, which integrity\.json already binds$/m);
      assert.deepEqual(fingerprint(h.work), before, 'recovery preview is read-only');
      h.run(['recover', 'budget', 'lock']);
      assert.match(h.run(['recover', 'budget', 'trial', interrupted]), /^published: evidence\/chart-[0-9a-f]{6}\.json$/m);
      assert.equal(readFileSync(pendingCall, 'utf8'), readFileSync(join(dir, 'trials', interrupted, 'call.md'), 'utf8'), 'recovery preserves the pending call the trial captured');
      rmSync(pendingCall);
      read(interrupted, 'Recovered the intact recorded chart execution. It establishes bounded chart checks only.\n');
    } else if (type === 'INTERRUPT_DECISION') {
      h.run(['decide', 'budget', 'accept', 'W1', '--', 'The finite refusal walk is accepted for this synthetic test.'], 'SIGKILL', { fault: { kind: 'decision', dir } });
    } else if (type === 'RECOVER_DECISION') {
      const before = fingerprint(h.work);
      const preview = h.run(['recover', 'budget', 'decisions', '--dry-run']);
      assert.deepEqual(fingerprint(h.work), before);
      assert.match(preview, /The finite refusal walk is accepted for this synthetic test/);
      const digest = preview.match(/pending suffix sha256: ([a-f0-9]{64})/)![1];
      h.run(['recover', 'budget', 'lock']);
      const record = readFileSync(join(dir, 'integrity.json'), 'utf8');
      h.run(['recover', 'budget', 'decisions', '--confirm', '0'.repeat(64)], 2);
      assert.equal(readFileSync(join(dir, 'integrity.json'), 'utf8'), record, 'wrong confirmation grants no owner authority');
      h.run(['recover', 'budget', 'decisions', '--confirm', digest]);
    } else if (type === 'READ') h.observe();
    else if (type === 'RENDER') {
      const record = readFileSync(join(dir, 'integrity.json'), 'utf8');
      const status = h.observe().components[0].tripwires.length ? 1 : 0;
      h.run(['render', '--brief'], status);
      assert.equal(readFileSync(join(dir, 'integrity.json'), 'utf8'), record, 'render never repairs or changes publication authority');
    } else throw new Error(type);
    const observed = h.observe().components.find(c => c.id === 'budget')!;
    h.remember(['CHECK', 'ABORT', 'RETRY', 'REFRESH', 'RECOVER_ANSWER'].includes(type));
    return observed;
  };
  return { ...h, send };
}

test('XState paths execute real author/check, abort/retry, edit/refresh and interrupted publication/recovery commands', async t => {
  const paths = getShortestPaths(commandLifecycle, { events: commandEvents });
  const targets = ['retried', 'refreshed', 'recovered', 'settled'];
  assert.ok(targets.every(value => paths.some(path => path.state.value === value)));
  const covered = new Set<string>();
  for (const target of targets) await t.test(target, t => {
    const path = paths.find(p => p.state.value === target)!;
    const actor = createActor(commandLifecycle).start(), adapter = componentAdapter(t);
    const events = path.steps.map(s => s.event).filter(event => event.type !== 'xstate.init');
    for (const event of events) for (const step of [event, { type: 'READ' }, { type: 'RENDER' }]) {
      actor.send(step); covered.add(step.type);
      const actual = adapter.send(step.type), expected = commandExpectation(actor.getSnapshot().value);
      assert.equal(actual.marks.W1.mark, expected.mark, `${target}: ${step.type}`);
      assert.equal(actual.marks.W1.owner, expected.owner);
      assert.ok(Object.values(actual.marks).every(mark => mark.mark !== 'proved'), 'a chart result, retry or recovery never becomes induction');
      if (expected.tripwire) assert.ok(actual.tripwires.some(trip => trip.name === expected.tripwire));
      else assert.deepEqual(actual.tripwires, []);
      if (!expected.successful) assert.equal(actual.marks.W1.trials.length, 0, 'aborted/unpublished work grants no cover');
    }
    actor.stop();
  });
  assert.deepEqual([...covered].sort(), commandEvents.map(event => event.type).sort(), 'the four selected paths cover every declared command event');
});

// STORE-ANSWER renames three times: integrity.json binds the candidate (2), the candidate becomes the
// entry (3), the bundle moves to trials/ (4). A process killed after each leaves a dead lock and its
// call pending. A retry in the same minute is refused without running or writing anything; explicit
// recovery finishes the publication the trial began, and the call stays pending for its author.
test('a trial killed after each publication rename refuses a retry, and explicit recovery finishes its publication', async t => {
  const T0 = '2026-11-07T12:34:00.000Z', T1 = '2026-11-07T12:35:00.000Z';
  for (const kill of ['manifest', 'entry', 'bundle'] as const) await t.test(kill, t => {
    const h = harness(t), dir = join(h.root, 'components/budget');
    h.run(['setup']); h.run(['decide', 'budget', 'begin', 'charted']);
    writeFileSync(join(dir, 'prose.md'), budget);
    mkdirSync(join(dir, 'calls'));
    const call = join(dir, 'calls', 'chart.md'), text = chartCall('the killed trial checks the finite meaning');
    writeFileSync(call, text);
    h.run(['trial', 'budget', 'chart.md'], 'SIGKILL', { fault: { kind: kill, dir }, at: T0 });
    const bundles = ['.running', 'trials'].flatMap(folder => existsSync(join(dir, folder)) ? readdirSync(join(dir, folder)).filter(name => !name.startsWith('.')) : []);
    assert.equal(bundles.length, 1);
    const id = bundles[0];
    assert.match(id, /^2026-11-07-1234-chart-[0-9a-f]{6}$/);
    const records = () => Object.fromEntries(Object.entries(fingerprint(dir)).filter(([path]) => path === 'integrity.json' || path === 'decisions.log' || path.startsWith('evidence/')));
    const budgetOf = () => h.observe().components.find(c => c.id === 'budget')!;
    let observed = budgetOf();
    if (kill === 'manifest') {
      assert.deepEqual(observed.tripwires.map(trip => trip.name), ['answer publication incomplete'], 'a bound candidate not yet in place is an incomplete publication');
      assert.equal(observed.marks.W1.mark, 'pending');
      assert.deepEqual(observed.marks.W1.trials, [], 'an incomplete publication grants nothing');
    } else {
      assert.deepEqual(observed.tripwires, [], 'the entry is in place under its binding');
      assert.deepEqual([observed.marks.W1.mark, observed.marks.W1.trials], ['checked', [id]]);
    }
    assert.equal(existsSync(join(dir, '.running', id)), kill !== 'bundle');
    assert.equal(readFileSync(call, 'utf8'), text, 'a killed trial consumes no call');
    assert.match(h.run(['recover', 'budget', 'lock', '--dry-run']), /^dead-local: /m, 'the killed writer left its lock behind');
    const before = records();
    const retry = h.exec(['trial', 'budget', 'chart.md'], 2, { at: T0 });
    assert.match(retry.stderr, { manifest: /the candidate in \.running\/\S+\/ is bound and not yet in place/, entry: /holds a run of the same call on the same files this minute/, bundle: /trials\/\S+ already exists/ }[kill]);
    assert.deepEqual(records(), before, 'a refused retry writes no record');
    assert.equal(readFileSync(call, 'utf8'), text);
    h.run(['recover', 'budget', 'lock']);
    const recovered = h.exec(['recover', 'budget', 'trial', id], kill === 'bundle' ? 2 : 0);
    if (kill === 'manifest') assert.match(recovered.stdout, /^published: evidence\/chart-[0-9a-f]{6}\.json$/m);
    else if (kill === 'entry') assert.match(recovered.stdout, /^kept: evidence\/chart-[0-9a-f]{6}\.json · the same answer on an unchanged basis; nothing is written$/m);
    else assert.match(recovered.stderr, /no run \S+ waits in \.running\//);
    observed = budgetOf();
    assert.deepEqual(observed.tripwires, []);
    assert.deepEqual([observed.marks.W1.mark, observed.marks.W1.trials], ['checked', [id]]);
    const answer = answerOf(dir, id)!;
    const manifest = JSON.parse(readFileSync(join(dir, 'integrity.json'), 'utf8'));
    assert.equal(manifest.evidence[answer.name], sha256(readFileSync(join(dir, 'evidence', `${answer.name}.json`))), 'the entry in place is the one the manifest binds');
    assert.equal(existsSync(join(dir, '.running', id)), false);
    assert.equal(answer.entry.established.bundle, bundleDigest(join(dir, 'trials', id)), 'the entry names the digest of the bundle it was established by');
    assert.equal(readFileSync(call, 'utf8'), readFileSync(join(dir, 'trials', id, 'call.md'), 'utf8'), 'recovery preserves the pending call the trial captured');
    // The pending call runs again a minute later: the same answer on the same basis writes nothing and consumes it.
    const settled = records();
    assert.match(h.run(['trial', 'budget', 'chart.md'], 0, { at: T1 }), /^answer: evidence\/chart-[0-9a-f]{6}\.json · kept: the same answer on an unchanged basis; nothing is written$/m);
    assert.deepEqual(records(), settled);
    assert.equal(existsSync(call), false, 'a confirmed answer consumes its call');
  });
});

test('XState risk paths on a copy of Harbor use real CLI decisions: an accepted violation stays violated and lapses with its property or with the scenario under it, and prior evidence is preserved', t => {
  // EDIT rewords N1; SHIFT changes executor-offline under the same name, its words left alone.
  for (const move of ['EDIT', 'SHIFT'] as const) {
    const h = harness(t);
    cpSync(join(plugin, 'qualification/fixture'), h.work, { recursive: true, preserveTimestamps: true });
    const machine = riskLifecycle('accepted'), actor = createActor(machine).start();
    const events = ['ACCEPT', move];
    const dir = join(h.root, 'systems/control');
    const target = () => h.observe().systems.find(s => s.id === 'control')!.cells.find(c => c.property === 'N1' && c.scenario === 'executor-offline')!;
    const shipped = target();
    assert.deepEqual({ mark: shipped.mark, accepted: Boolean(shipped.accepted) }, riskExpectation(actor.getSnapshot().value), 'Harbor ships the violation accepted');
    h.remember();
    for (const event of events) {
      actor.send({ type: event });
      if (event === 'ACCEPT') {
        const shown = target();
        const line = h.run(['decide', 'control', 'risk', 'N1', 'executor-offline', '--', words]).trim();
        const hash = parseSystemProse(readFileSync(join(dir, 'prose.md'), 'utf8')).byId.N1.hash;
        assert.match(line, new RegExp(`^\\S+ risk N1@${hash} executor-offline ${shown.trial} "${words}" [0-9a-f]{8}$`), 'the decision names the trial whose violation the owner was shown');
      } else if (event === 'EDIT') {
        const path = join(dir, 'prose.md');
        writeFileSync(path, readFileSync(path, 'utf8').replace('[N1] Within 3 ticks', '[N1] Within 2 ticks'));
      } else if (event === 'SHIFT') {
        const path = join(h.root, 'actors/scenarios.md'), before = readFileSync(path, 'utf8');
        const after = before.replace('  - id: executor-offline\n    modes: { public: offline }', '  - id: executor-offline\n    modes: { public: offline, governance: malicious }');
        assert.notEqual(after, before, 'executor-offline is declared as the shift expects');
        writeFileSync(path, after);
      }
      for (const read of ['READ', 'RENDER']) {
        actor.send({ type: read });
        if (read === 'RENDER') h.run(['render', '--brief']);
        const cell = target();
        assert.deepEqual({ mark: cell.mark, accepted: Boolean(cell.accepted) }, riskExpectation(actor.getSnapshot().value), `${move}: ${event} then ${read}`);
        if (event === 'SHIFT') assert.ok(cell.lapsed.includes('scenario executor-offline'), cell.lapsed.join(', '));
        h.remember();
      }
    }
    assert.equal(actor.getSnapshot().value, 'lapsed');
    actor.stop();
  }
});

test('XState fresh violation/accept/rerun/reach/edit/refresh path executes real bounded TLC trials', { skip: process.env.TLA_TOOLS ? false : 'TLA_TOOLS is not set: the live bounded system lifecycle requires TLC; chart/recovery and Harbor risk paths run without it' }, t => {
  const h = harness(t, true), component = join(h.root, 'components/budget'), dir = join(h.root, 'systems/limit');
  h.run(['setup']); h.run(['decide', 'budget', 'begin', 'charted']); writeFileSync(join(component, 'prose.md'), budget);
  h.run(['decide', 'limit', 'begin', 'system']);
  writeFileSync(join(dir, 'composition.md'), '# Composition\n```yaml\nmembers:\n  - component: budget\nwiring: []\nclosure: []\nscenarios: [all-honest]\n```\n');
  writeFileSync(join(dir, 'prose.md'), '# Limit\nConcern: limit\n\n## Always\n[A1] Always, {budget.paid = 0}. Scenarios: all-honest.\n');
  const machine = riskLifecycle('pending'), actor = createActor(machine).start();
  // Through every risk event: a rerun that gives the same answer keeps the acceptance; a rerun at
  // a new reach, a reworded property or a changed member each leave the next violation owing a new
  // decision.
  const events = ['VIOLATE', 'ACCEPT', 'RERUN', 'REACH', 'ACCEPT', 'EDIT', 'REFRESH', 'ACCEPT', 'SHIFT', 'REFRESH'];
  assert.deepEqual([...new Set(events)].sort(), riskEvents.map(e => e.type).filter(type => !['READ', 'RENDER'].includes(type)).sort(), 'the path takes every risk event');
  let serial = 0, reach = 'capacity 0..2 and balance 0..3; finite payment budget';
  for (const [step, event] of events.entries()) {
    actor.send({ type: event });
    const published = ['VIOLATE', 'REACH', 'REFRESH'].includes(event);
    if (event === 'VIOLATE' || event === 'RERUN' || event === 'REACH' || event === 'REFRESH') {
      if (event === 'REACH') reach = 'capacity 0..2 and balance 0..3; finite payment budget, every interleaving of one payer';
      h.run(['scaffold', 'limit']);
      mkdirSync(join(dir, 'calls'), { recursive: true });
      const name = `limit-${++serial}.md`;
      writeFileSync(join(dir, 'calls', name), `kind: tlc\nproperty: A1\nscenario: all-honest\nexecutes:\n  - model/generated/Limit.tla\n  - model/generated/A1_all_honest.cfg\nreach: ${reach}\nexpect:\n  TypeOK: holds\n  A1: violated\nbecause: The ${serial === 1 ? 'first' : 'next'} payment contradicts the stated bound.\n`);
      const out = h.run(['trial', 'limit', name]);
      const id = out.match(/^trial: (\S+)/m)![1];
      const answered = out.match(/^answer: evidence\/(\S+)\.json · (.*)$/m)!;
      assert.match(answered[2], published ? (event === 'VIOLATE' ? /^published$/ : /^replaced the recorded answer$/) : /^kept: the same answer on an unchanged basis; nothing is written$/, `${event}: ${out}`);
      const entry = JSON.parse(readFileSync(join(dir, 'evidence', `${answered[1]}.json`), 'utf8'));
      assert.equal(entry.answer.outcomes.A1, 'violated');
      assert.equal(entry.established.trial === id, published, 'a new answer names its trial; a confirming rerun leaves the entry naming the earlier one');
      if (published) writeFileSync(join(dir, 'evidence', `${answered[1]}.md`), `The stored bounded trace reaches paid 1 and violates A1 as predicted (${event}). Risk acceptance remains separate from this observation.\n`);
    } else if (event === 'ACCEPT') h.run(['decide', 'limit', 'risk', 'A1', 'all-honest', '--', words]);
    else if (event === 'EDIT') {
      const path = join(dir, 'prose.md');
      writeFileSync(path, readFileSync(path, 'utf8').replace('budget.paid = 0', 'budget.paid <= 1'));
    } else if (event === 'SHIFT') {
      // The member under the cell changes and the property's words do not: the budget starts with less balance.
      const path = join(component, 'prose.md');
      writeFileSync(path, readFileSync(path, 'utf8').replace('a count from 0 to 3, starting at 3', 'a count from 0 to 3, starting at 2'));
    }
    h.remember(published);
    for (const read of ['READ', 'RENDER']) {
      actor.send({ type: read });
      if (read === 'RENDER') h.run(['render', '--brief']);
      const cell = h.observe().systems.find(s => s.id === 'limit')!.cells[0];
      assert.deepEqual({ mark: cell.mark, accepted: Boolean(cell.accepted) }, riskExpectation(actor.getSnapshot().value), events.slice(0, step + 1).join(' → '));
      if (event === 'REFRESH' || event === 'REACH') assert.ok(cell.acceptanceLapsed && cell.acceptanceLapsed.length, `the earlier acceptance names what moved: ${events.slice(0, step + 1).join(' → ')}`);
      assert.notEqual(cell.mark, 'proved'); h.remember();
    }
  }
  assert.equal(actor.getSnapshot().value, 'violated');
  actor.stop();
});
