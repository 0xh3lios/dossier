import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { fingerprint } from '../conformance/files.ts';
import { resultOf } from '../conformance/evidence.ts';
import type { Entry } from '../../src/trials/answers.ts';
import type { TrialResult } from '../../src/trials/trials.ts';
import { parse as parseTlc } from '../../src/trials/checkers/tlc.ts';
import type { TlcTraceStep } from '../../src/trials/checkers/tlc.ts';

const plugin = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const root = join(plugin, 'qualification/fixture/dossiers');
// Importing the rebuild exposes its reading path without running solvers or
// clearing the fixture. The command-line entrypoint still performs the rebuild.
const { ordinaryReading, recordReading, controlUnfairReading } = await import(pathToFileURL(join(plugin, 'qualification/rebuild-fixture.mjs')).href);

// Harbor's answers: each entry in evidence/, the result.json its trial would have left, rebuilt from
// what the entry keeps, as the rebuild's readings take it, and the reading beside it. Harbor keeps no
// trial's bundle, so the checker's output is not among them.
function answers(): { dir: string; name: string; result: TrialResult; reading: string | null }[] {
  return ['components', 'systems'].flatMap(kind => readdirSync(join(root, kind)).flatMap(id => {
    const dir = join(root, kind, id), folder = join(dir, 'evidence');
    return existsSync(folder) ? readdirSync(folder).filter(file => file.endsWith('.json')).sort().map(file => {
      const name = file.slice(0, -5), reading = join(folder, `${name}.md`);
      const entry = JSON.parse(readFileSync(join(folder, file), 'utf8')) as Entry;
      return { dir, name, result: resultOf(entry), reading: existsSync(reading) ? readFileSync(reading, 'utf8') : null };
    }) : [];
  }));
}

test('PROC-INTERPRET: every answer Harbor publishes has the reading required by the model contract', () => {
  const published = answers();
  assert.ok(published.length > 0, 'the fixture must hold real observations');
  for (const { dir, name, reading } of published) {
    assert.ok(reading !== null, `${dir}/evidence/${name}.md is needed beside its answer`);
    assert.ok(reading.trim(), `${dir}/evidence/${name}.md needs a nonempty interpretation`);
  }
});

test('the rebuild reading path writes the answer\'s reading beside its entry without changing the published answer', t => {
  const { dir, name, result } = answers().find(({ result }) => result.dossier === 'systems/control' && result.property === 'N1' && result.scenario === 'all-honest' && result.kind === 'tlc')!;
  const work = mkdtempSync(join(tmpdir(), 'dossier-fixture-reading-'));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  mkdirSync(join(work, 'evidence'));
  writeFileSync(join(work, 'evidence', `${name}.json`), readFileSync(join(dir, 'evidence', `${name}.json`)));
  writeFileSync(join(work, 'integrity.json'), readFileSync(join(dir, 'integrity.json')));
  const before = fingerprint(work);
  const reading = join(work, 'evidence', `${name}.md`);
  // An ordinary reading reads the answer alone; only an authored one is handed the checker's output.
  recordReading(reading, result, '');
  const after = fingerprint(work);
  for (const [path, hash] of Object.entries(before)) if (!hash.endsWith(':directory')) assert.equal(after[path], hash, `published ${path} changed`);
  assert.deepEqual(Object.keys(after).filter(path => !Object.hasOwn(before, path)), [`evidence/${name}.md`]);
  const text = readFileSync(reading, 'utf8');
  assert.match(text, /bounded evidence/);
  assert.match(text, /Scenario: all-honest/);
  assert.match(text, /cannot be transferred to executor-offline/);
  assert.equal(text, readFileSync(join(dir, 'evidence', `${name}.md`), 'utf8'), 'Harbor\'s reading is the one this path writes for the answer it sits beside');
  assert.throws(() => recordReading(reading, result, '', ' \n'), /nonempty/);
});

test('routine readings retain liveness warnings and distinguish induction from finite checks', () => {
  const completed = answers();
  const liveness = completed.find(({ result }) => result.dossier === 'systems/control' && result.property === 'O1' && result.kind === 'tlc')!.result;
  const text = ordinaryReading(liveness);
  assert.ok(liveness.warnings?.length, 'the real trace carries the state-constraint warning');
  for (const warning of liveness.warnings!) assert.ok(text.includes(warning));
  assert.match(text, /must not be generalized to unconstrained behavior/);
  const induction = completed.find(({ result }) => result.dossier === 'components/timelock' && result.mode === 'inductive')!.result;
  assert.match(ordinaryReading(induction), /Both stored base and step checks pass/);
  assert.throws(() => ordinaryReading({ ...induction, runs: induction.runs!.filter(run => run.label !== 'base') }), /base and step/);
  assert.throws(() => ordinaryReading({ ...induction, runs: induction.runs!.map(run => ({ ...run, outcome: 'Error' })) }), /base and step/);
});

test('the rebuild cannot substitute a routine reading for a counterexample, witness, partial result or blunder', () => {
  const ordinary = answers().find(({ result }) => result.dossier === 'components/adapter' && result.kind === 'tlc' && result.outcomes.A1 === 'holds')!.result;
  for (const change of [
    { result: 'miscalled' }, { result: 'aborted' }, { kind: 'blunder' },
    { walk: 'W1' }, { partial: ['A1'] }, { outcomes: { A1: 'violated' } },
  ]) assert.throws(() => ordinaryReading({ ...ordinary, ...change }), /authored reading/);
  assert.throws(() => ordinaryReading({ ...ordinary, snapshot: { ...ordinary.snapshot, passages: { ...ordinary.snapshot.passages, A1: 'changed-meaning' } } }), /changed passages/);
});

test('Control unfair reading follows the recorded loop closure and refuses a changed loop meaning', () => {
  const { result, reading: published } = answers().find(({ result }) => result.dossier === 'systems/control' && result.property === 'O1' && result.kind === 'blunder')!;
  // Harbor keeps the answer, not TLC's output: the answer's trace ends at the loop's closure as the
  // runner parsed it, and the reading quotes the line TLC closed the loop with.
  const quoted = (published || '').match(/^The output closes the loop with: (.+)$/m);
  assert.ok(quoted, 'the reading quotes the recorded closure');
  const output = `${quoted[1]}\n`;
  // TLC draws its fingerprint and seed afresh on every run, so each rebuild may close the loop at
  // another state, or stutter: the reading follows whichever closure the recorded output holds.
  const back = output.match(/^(\d+): Back to state: </m), stutter = output.match(/^(\d+): Stuttering[ \t]*$/m);
  assert.notEqual(Boolean(back), Boolean(stutter), 'the output records one loop closure');
  const closure = (result.trace as TlcTraceStep[]).at(-1)!;
  if (back) assert.equal(closure.backTo, Number(back[1]), 'the answer\'s trace closes the loop where the quoted line does');
  else assert.deepEqual([closure.stuttering, closure.index], [true, Number(stutter![1])], 'the answer\'s trace stutters where the quoted line does');
  const reading: string = controlUnfairReading(result, output);
  assert.equal(reading, published, 'Harbor\'s reading is the one this path writes from the answer and its closure');
  assert.match(reading, /state-constrained liveness run/);
  const changed = structuredClone(result);
  const states = (changed.trace as { index: number; values?: Record<string, string> }[]).filter(step => step.values);
  const final = states.at(-1)!;
  if (back) {
    const target = Number(back[1]);
    const loop = states.filter(step => step.index >= target);
    const moving = loop.some(step => Object.keys(final.values!).some(name => step.values![name] !== final.values![name]));
    assert.match(reading, new RegExp(`The loop returns to state ${target} and keeps the Timelock scheduled and ready\\.`));
    assert.equal(/Other recorded values change within the loop; this is not full-state stuttering\./.test(reading), moving, 'the reading says whether the loop is stuttering');
    loop[0].values!.timelock_state = '"Idle"';
    assert.throws(() => controlUnfairReading(result, output.replace(`${target}: Back to state:`, '99: Back to state:')), /target is not a recorded state/);
  } else {
    assert.match(reading, new RegExp(`State ${final.index} repeats indefinitely: this is full-state stuttering`));
    final.values!.timelock_state = '"Idle"';
  }
  assert.throws(() => controlUnfairReading(changed, output), /no longer waits with a ready plan/);
});

test('Control unfair reading accepts the real stuttering shape without inventing an action cycle', () => {
  // Reduced projection of the live 2026-11-05-1424-blunder-fc8ba3 observation:
  // original state numbers, action labels, displayed values and closure retained;
  // unrelated variables and coverage output omitted. This is not new solver evidence.
  const observed = [
    ['Initial predicate', 'Idle', 0, 0], ['User', 'Idle', 0, 0],
    ['User', 'Idle', 0, 0], ['Governance', 'Idle', 0, 0],
    ['User', 'Idle', 0, 0], ['User', 'Idle', 0, 1],
    ['Governance', 'Scheduled', 2, 1], ['TickStep', 'Scheduled', 1, 1],
    ['TickStep', 'Scheduled', 0, 1], ['User', 'Scheduled', 0, 1],
    ['User', 'Scheduled', 0, 1], ['User', 'Scheduled', 0, 1],
  ];
  const frame = (code: number, text: string) => `@!@!@STARTMSG ${code}:4 @!@!@\n${text}\n@!@!@ENDMSG ${code} @!@!@\n`;
  const output = observed.map(([action, state, remaining, free], index) => frame(2217, `${index + 1}: <${action}>\n/\\ timelock_state = "${state}"\n/\\ timelock_remaining = ${remaining}\n/\\ vault_free = ${free}\n/\\ vault_issued = 0`)).join('') + frame(2218, '13: Stuttering');
  const parsed = parseTlc(output);
  assert.deepEqual(parsed.trace.at(-1), { index: 13, stuttering: true });
  const result = { dossier: 'systems/control', property: 'O1', result: 'as-called', outcomes: { O1: 'violated' }, trace: parsed.trace, warnings: ['Declaring state or action constraints during liveness checking is dangerous.'] };
  const reading = controlUnfairReading(result, output);
  assert.match(reading, /State 12 repeats indefinitely: this is full-state stuttering/);
  assert.match(reading, /13: Stuttering/);
  assert.match(reading, /\| 12 \| User \| "Scheduled" \| 0 \| 1 \| 0 \|/);
  assert.doesNotMatch(reading, /other actions continue|not full-state stuttering|undefined/);
  assert.match(reading, /state-constrained liveness run/);
  assert.throws(() => controlUnfairReading(result, output.replace('13: Stuttering', '14: Stuttering')), /does not match/);
  assert.throws(() => controlUnfairReading(result, output.replace('13: Stuttering', '')), /exactly one recorded loop closure/);
  assert.throws(() => controlUnfairReading(result, output + frame(2122, '12: Back to state: <User>')), /exactly one recorded loop closure/);
  assert.throws(() => controlUnfairReading({ ...result, outcomes: { O1: 'holds' } }, output), /recorded O1 violation/);
  const changed = structuredClone(result);
  changed.trace[11].values!.timelock_remaining = '1';
  assert.throws(() => controlUnfairReading(changed, output), /no longer waits with a ready plan/);
});
