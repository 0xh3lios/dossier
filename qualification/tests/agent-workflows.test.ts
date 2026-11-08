import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { gradeExercise } from '../conformance/grade-exercise.ts';
import { gradeWorkflow } from '../conformance/grade-workflows.ts';
import { fingerprint } from '../conformance/files.ts';
import { verifyAll } from '../../src/commands/verify.ts';
import { answerOf, listBundles } from '../conformance/evidence.ts';
import { compilePart, checkIR } from '../../src/chart/draw.ts';
import type { Entry } from '../../src/trials/answers.ts';

const plugin = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const toolchain = Boolean(process.env.TLA_TOOLS && existsSync(process.env.TLA_TOOLS));
const live = { skip: !toolchain && 'set TLA_TOOLS and JAVA to exercise the workflow through real TLC' };
// What the runner prints for a trial, and for what publication did with its answer.
const TRIAL_LINE = /^trial: (\S+) · /m;
const ANSWER_LINE = /^answer: (evidence\/\S+)\.json · (published|replaced the recorded answer|kept: .+|refused: .+)$/m;

function prepare(t: TestContext, exercise: string) {
  const work = mkdtempSync(join(tmpdir(), `dossier-${exercise}-`));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  const evaluation = join(work, 'evaluation');
  const result = spawnSync(process.execPath, [join(plugin, 'qualification/conformance/prepare-agent.ts'), exercise, evaluation], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const manifest = JSON.parse(readFileSync(join(evaluation, 'manifest.json'), 'utf8'));
  const workspace = manifest.workspace as string, root = join(workspace, 'dossiers');
  const run = (args: string[], expected = 0) => {
    const result = spawnSync(join(manifest.plugin, 'bin/dossier'), [...args, '--root', root], { encoding: 'utf8', env: { ...process.env, DOSSIER_ROOT: '' }, timeout: 90_000 });
    assert.ifError(result.error);
    // On an unexpected status, show the checker's own output from the trial's local bundle.
    const trialId = result.stdout.match(TRIAL_LINE)?.[1];
    const output = trialId && join(root, args[1] || '', 'trials', trialId, 'output.txt');
    const observation = result.status !== expected && args[0] === 'trial' && output && existsSync(output) ? readFileSync(output, 'utf8') : '';
    assert.equal(result.status, expected, result.stdout + result.stderr + observation);
    return result.stdout;
  };
  const write = (name: string, body: string) => { mkdirSync(dirname(join(workspace, name)), { recursive: true }); writeFileSync(join(workspace, name), body); };
  // Run one call and write the reading of the answer it published, beside its entry in evidence/.
  // A reading of null leaves the answer unread for now.
  const trial = (composition: string, call: string, reading: string | null, expected = 0) => {
    const dir = join(root, 'compositions', composition), before = new Set(listBundles(dir));
    const out = run(['trial', `compositions/${composition}`, call], expected);
    const created = listBundles(dir).filter(id => !before.has(id));
    assert.equal(created.length, 1, 'the trial leaves its bundle in the local trials/');
    assert.equal(out.match(TRIAL_LINE)?.[1], created[0]);
    const published = out.match(ANSWER_LINE);
    assert.ok(published && ['published', 'replaced the recorded answer'].includes(published[2]), out);
    if (reading !== null) write(`dossiers/compositions/${composition}/${published[1]}.md`, reading);
    return created[0];
  };
  return { evaluation, manifest, workspace, root, run, write, trial };
}

test('workflow preparations supply raw inputs and freeze protected starting records without answer keys', async t => {
  const compose = prepare(t, 'compose-probe');
  assert.equal(compose.manifest.schema, 1);
  assert.equal(existsSync(join(compose.workspace, 'answer.json')), false);
  assert.equal(existsSync(join(compose.workspace, 'dossiers/compositions/transfer')), false);
  for (const id of ['source', 'sink']) {
    const { ir } = compilePart(join(compose.root, `parts/${id}/prose.md`));
    assert.deepEqual(ir.errors, []);
    assert.equal((await checkIR({ root: plugin, ir })).outcome, 'pass');
  }
  // The supplied parts start with the manifests a begin leaves: no answers, no decisions.
  const started = verifyAll({ root: compose.root, version: '0.1.0', write: false });
  assert.deepEqual(started.tripwires, []);
  for (const c of started.parts) { assert.deepEqual(c.tripwires, [], c.ref); assert.deepEqual(c.answers, [], c.ref); }
  const refresh = prepare(t, 'refresh-decision');
  assert.ok(readFileSync(join(refresh.workspace, 'dossiers/compositions/control/calls/continuation.md'), 'utf8').includes('N1: holds'));
  const before = fingerprint(refresh.workspace);
  const initial = verifyAll({ root: refresh.root, version: '0.1.0', write: false });
  const control = initial.compositions.find(s => s.id === 'control')!;
  const n1 = control.cells.filter(c => c.property === 'N1');
  assert.equal(n1.length, 3);
  assert.ok(n1.every(c => c.mark === 'lapsed' && !c.accepted));
  assert.deepEqual(fingerprint(refresh.workspace), before);
  // The grader tells a fresh answer from a starting one by the starting entries, kept whole.
  const entries = readdirSync(join(refresh.root, 'compositions/control/evidence')).filter(n => n.endsWith('.json'));
  assert.ok(entries.length > 0);
  for (const name of entries) assert.equal(refresh.manifest.initialTexts[`dossiers/compositions/control/evidence/${name}`], readFileSync(join(refresh.root, 'compositions/control/evidence', name), 'utf8'), name);
  assert.deepEqual(control.answers.map(x => x.entry?.established.trial).sort(), entries.map(name => (JSON.parse(refresh.manifest.initialTexts[`dossiers/compositions/control/evidence/${name}`]) as Entry).established.trial).sort());
  const instructions = readFileSync(join(refresh.evaluation, 'request.md'), 'utf8');
  assert.ok(!instructions.includes('gradeWorkflow') && !instructions.includes('expected-marks'));
});

test('workflow grading lets only the runner change a starting answer and never reads past a hand-made change', t => {
  // Each case starts from its own preparation: the fingerprint holds modification times, so a
  // changed file stays changed even when its bytes are put back.
  const control = 'dossiers/compositions/control/evidence';
  const cases: [string, (w: ReturnType<typeof prepare>, name: string) => void, RegExp][] = [
    ['an entry edited by hand', (w, name) => { const entry = JSON.parse(readFileSync(join(w.workspace, name), 'utf8')); writeFileSync(join(w.workspace, name), JSON.stringify(entry)); }, /starting answer edited, not replaced by a new trial/],
    ['a reading rewritten', (w, name) => writeFileSync(join(w.workspace, name.replace(/\.json$/, '.md')), 'Rewritten old interpretation.\n'), /starting artifact changed: .*\.md/],
    ['an entry removed', (w, name) => rmSync(join(w.workspace, name)), /starting answer removed/],
  ];
  for (const [what, tamper, refusal] of cases) {
    const w = prepare(t, 'refresh-decision');
    const name = Object.keys(w.manifest.initialTexts).filter(n => n.startsWith(`${control}/`)).sort()[0];
    assert.ok(name, 'Harbor\'s control starts with published answers');
    // As its trial would leave it: the prepared call consumed. No solver runs in this test.
    rmSync(join(w.workspace, 'dossiers/compositions/control/calls/continuation.md'));
    tamper(w, name);
    // Grading stops at the starting records, before it reads any answer the task asked for.
    assert.throws(() => gradeWorkflow('refresh-decision', w.workspace, w.manifest.workspaceBefore, w.manifest.initialTexts), refusal, what);
  }
});

test('compose and scoped probe grading checks real TLC answers and rejects unsupported answers or input weakening', live, async t => {
  const w = prepare(t, 'compose-probe');
  assert.match(w.manifest.toolchain.java.sha256, /^[0-9a-f]{64}$/);
  assert.match(w.manifest.toolchain.tlc.sha256, /^[0-9a-f]{64}$/);
  assert.ok(readFileSync(join(w.evaluation, 'request.md'), 'utf8').includes(w.manifest.toolchain.environment.TLA_TOOLS));
  w.run(['decide', 'compositions/transfer', 'begin', 'composition']);
  w.write('dossiers/compositions/transfer/wiring.md', '# Wiring\n\n```yaml\nmembers:\n  - part: source\n    role: member\n  - part: sink\n    role: member\nwiring:\n  - effect: source.credit\n    event: sink.receive\nclosure: []\nscenarios: [all-honest]\n```\n');
  w.write('dossiers/compositions/transfer/prose.md', '# Transfer\n\nConcern: transfer\n\n## Always\n[A1] Always, {source.paid = sink.received}. Scenarios: all-honest.\n\n## Walks\n[W1] Walk Exhaust: from source.Live, source.send, source.send, source.send refused; ends source.Live.\n');
  w.run(['scaffold', 'compositions/transfer']);
  const positiveCall = 'kind: tlc\nproperty: A1\nscenario: all-honest\nexecutes:\n  - model/generated/Transfer.tla\n  - model/generated/A1_all_honest.cfg\nreach: remaining, paid and received 0..2; lot 1; effects up to 4\nexpect:\n  TypeOK: holds\n  A1: holds\nbecause: Each send increments paid and received together.\n';
  w.write('dossiers/compositions/transfer/calls/positive.md', positiveCall);
  const positive = w.trial('transfer', 'positive.md', 'TLC checked the finite ranges and the simultaneous credit update. This is bounded evidence.\n');
  w.write('dossiers/compositions/transfer/calls/witness.md', 'kind: tlc\nwalk: W1\nscenario: all-honest\nexecutes:\n  - model/generated/Transfer.tla\n  - model/generated/W1_all_honest.cfg\nreach: remaining, paid and received 0..2; lot 1; effects up to 4\ntrace-data: source_remaining, source_paid, sink_received\nexpect:\n  TypeOK: holds\n  NotW1: violated; trace: 2/0/0 > 1/1/1 > 0/2/2\nbecause: Two sends exhaust remaining; the next send is refused without changing data.\n');
  const witness = w.trial('transfer', 'witness.md', 'The trace starts at 2/0/0, then sends to 1/1/1 and 0/2/2. The observer confirms the refused third send, which changes no data.\n');
  const module = readFileSync(join(w.root, 'compositions/transfer/model/generated/Transfer.tla'), 'utf8');
  const bad = module.replace('MODULE Transfer', 'MODULE MissingReceive').replace(/sink_received' = \(sink_received \+ source_lot\)/g, "sink_received' = sink_received");
  assert.notEqual(bad.replace('MODULE MissingReceive', 'MODULE Transfer'), module, 'the deliberate receiver fault was applied');
  w.write('dossiers/compositions/transfer/model/blunders/MissingReceive.tla', bad);
  w.write('dossiers/compositions/transfer/model/blunders/MissingReceive.cfg', readFileSync(join(w.root, 'compositions/transfer/model/generated/A1_all_honest.cfg'), 'utf8').replace(/^INVARIANTS .+$/m, 'INVARIANTS A1'));
  w.write('dossiers/compositions/transfer/calls/blunder.md', 'kind: blunder\nproperty: A1\nscenario: all-honest\nexecutes:\n  - model/blunders/MissingReceive.tla\n  - model/blunders/MissingReceive.cfg\nreach: same declared finite ranges\nblunder: Cancel the sink received increment while source paid still increments.\nexpect:\n  A1: violated\nbecause: The first send separates the two counts.\n');
  const blunder = w.trial('transfer', 'blunder.md', 'The deliberate omitted receipt leaves paid 1 and received 0 after the first send. A1 detects this fault.\n');
  const answer = { composition: 'transfer', property: 'A1', scenario: 'all-honest', trial: positive, witnessTrial: witness, blunderTrial: blunder, thirdSendAllowed: false, final: { remaining: 0, paid: 2, received: 2 }, proof: false, limitations: ['Finite abstract TLC check; owner and implementation correspondence remain open.'] };
  w.write('answer.md', 'Two wired sends exhaust capacity; the third is refused. TLC establishes this within the declared finite abstraction.\n');
  w.write('answer.json', JSON.stringify(answer));
  assert.equal((await gradeExercise(w.evaluation)).outcome, 'pass');
  const grade = () => gradeWorkflow('compose-probe', w.workspace, w.manifest.workspaceBefore, w.manifest.initialTexts);
  w.write('answer.json', JSON.stringify({ ...answer, trial: blunder }));
  assert.throws(grade, /'blunder' !== 'tlc'/);
  // A confirming rerun writes no answer (ANSWER-SAME): the entry still names the trial that established
  // it, and the rerun's id, which only its local bundle holds, is no answer an agent can cite.
  const evidence = join(w.root, 'compositions/transfer/evidence'), integrity = join(w.root, 'compositions/transfer/integrity.json');
  const recorded = { evidence: fingerprint(evidence), integrity: readFileSync(integrity, 'utf8') };
  // Reworded reasons give the rerun its own trial id within the same minute; the question and reach are unchanged.
  w.write('dossiers/compositions/transfer/calls/positive.md', positiveCall.replace('because: Each send', 'because: Again, each send'));
  const rerun = w.run(['trial', 'compositions/transfer', 'positive.md']);
  assert.match(rerun, /^answer: evidence\/\S+\.json · kept: /m);
  assert.deepEqual({ evidence: fingerprint(evidence), integrity: readFileSync(integrity, 'utf8') }, recorded, 'a confirming rerun writes nothing');
  assert.equal(existsSync(join(w.root, 'compositions/transfer/calls/positive.md')), false, 'the confirmed call is consumed');
  w.write('answer.json', JSON.stringify({ ...answer, trial: rerun.match(TRIAL_LINE)![1] }));
  assert.throws(grade, /cite the trial that established a current answer/);
  w.write('answer.json', JSON.stringify(answer));
  assert.equal(grade().outcome, 'pass');
  const compositionProse = readFileSync(join(w.root, 'compositions/transfer/prose.md'), 'utf8');
  w.write('dossiers/compositions/transfer/prose.md', compositionProse.replace('source.paid = sink.received', 'source.paid = source.paid'));
  assert.throws(grade, /A1 means equality/);
  w.write('dossiers/compositions/transfer/prose.md', compositionProse);
  const source = join(w.root, 'parts/source/prose.md');
  writeFileSync(source, readFileSync(source, 'utf8').replace('remaining > 0', 'remaining >= 0'));
  assert.throws(grade, /starting artifact changed/);
});

test('refresh and decision grading follows each answer to its entry, records a miscall and keeps accepted violations distinct', live, async t => {
  const w = prepare(t, 'refresh-decision');
  w.run(['scaffold', 'compositions/control']);
  const control = join(w.root, 'compositions/control');
  const call = (scenario: string, because: string) => `kind: tlc\nproperty: N1\nscenario: ${scenario}\nexecutes:\n  - model/generated/Control.tla\n  - model/generated/N1_${scenario.replaceAll('-', '_')}.cfg\nreach: delay 2; amounts up to 2; ceiling 2..4; effects up to 4\nexpect:\n  TypeOK: holds\n  N1: ${scenario === 'executor-offline' ? 'violated' : 'holds'}\nbecause: ${because}\n`;
  const continuation = w.trial('control', 'continuation.md', null, 1);
  // ANSWER-MISCALL: until its reading classifies the miscall, no new answer to its question is
  // published, and the refused call stays pending.
  w.write('dossiers/compositions/control/calls/early.md', call('executor-offline', 'Rerun before the miscall is read.'));
  assert.match(w.run(['trial', 'compositions/control', 'early.md'], 2), /^answer: evidence\/\S+\.json · refused: the recorded answer is a miscall whose reading has no classification/m);
  assert.ok(existsSync(join(control, 'calls/early.md')), 'a refused answer leaves its call pending');
  rmSync(join(control, 'calls/early.md'));
  writeFileSync(join(control, `evidence/${answerOf(control, continuation)!.name}.md`), 'classification: call was wrong\nThe current trace exceeds two ticks without an executor. The prediction was wrong; the requested property and offline scenario remain unchanged.\n');
  const refreshed: Record<string, string> = {};
  for (const scenario of ['all-honest', 'governance-captured', 'executor-offline']) {
    const holds = scenario !== 'executor-offline';
    w.write(`dossiers/compositions/control/calls/${scenario}.md`, call(scenario, holds ? 'The prompt executor resolves a ready plan before another tick.' : 'Without an executor, the unresolved plan exceeds the deadline.'));
    refreshed[scenario] = w.trial('control', `${scenario}.md`, holds ? 'The two-tick deadline holds in the declared finite ranges under the prompt-executor and ticking-chain assumptions.\n' : 'The corrected prediction matches the unchanged model: the counter reaches three without an executor and N1 is violated.\n');
  }
  // The executor-offline answer replaced the classified miscall, which its entry keeps as the previous answer.
  const starting = Object.entries(w.manifest.initialTexts as Record<string, string>).filter(([n]) => n.startsWith('dossiers/compositions/control/evidence/')).map(([n, text]) => ({ path: n, entry: JSON.parse(text) as Entry }));
  const offline = starting.find(({ entry: q }) => q.question.kind === 'tlc' && q.question.property === 'N1' && q.question.scenario === 'executor-offline')!.path;
  const entry = JSON.parse(readFileSync(join(w.workspace, offline), 'utf8')) as Entry;
  assert.equal(entry.established.trial, refreshed['executor-offline']);
  assert.equal(entry.previous?.established.trial, continuation);
  assert.equal(entry.previous?.classification, 'call was wrong');
  const module = readFileSync(join(w.root, 'compositions/control/model/generated/Control.tla'), 'utf8');
  const bad = module.replace('MODULE Control', 'MODULE CurrentImpatient').replace('TickStep == (Mode_chain /= "offline") /\\ Tick /\\ ~Due_public', 'TickStep == (Mode_chain /= "offline") /\\ Tick');
  assert.notEqual(bad.replace('MODULE CurrentImpatient', 'MODULE Control'), module);
  w.write('dossiers/compositions/control/model/blunders/CurrentImpatient.tla', bad);
  w.write('dossiers/compositions/control/model/blunders/CurrentImpatient.cfg', readFileSync(join(w.root, 'compositions/control/model/generated/N1_all_honest.cfg'), 'utf8').replace('INVARIANTS TypeOK N1', 'INVARIANTS N1'));
  w.write('dossiers/compositions/control/calls/current-blunder.md', 'kind: blunder\nproperty: N1\nscenario: all-honest\nexecutes:\n  - model/blunders/CurrentImpatient.tla\n  - model/blunders/CurrentImpatient.cfg\nreach: unchanged declared ranges\nblunder: Permit a tick even while the prompt executor is due.\nexpect:\n  N1: violated\nbecause: The third tick passes the deadline while the plan remains scheduled.\n');
  const blunder = w.trial('control', 'current-blunder.md', 'Removing the prompt-executor tick restriction permits the counter to reach three with the plan unresolved. N1 detects this fault at its current two-tick bound.\n');
  const riskWords = 'I accept that the two-tick deadline can fail while the executor is offline. This acceptance does not assert recovery or make N1 true.';
  w.run(['decide', 'compositions/control', 'risk', 'N1', 'executor-offline', '--', riskWords]);
  const current = verifyAll({ root: w.root, version: '0.1.0', write: false }).compositions.find(s => s.id === 'control')!;
  const answer = { composition: 'control', initialAcceptanceCurrent: false, continuationTrial: continuation, proof: false, cells: current.cells.map(c => ({ property: c.property, scenario: c.scenario, mark: c.mark, accepted: Boolean(c.accepted) })), refreshedTrials: refreshed, blunderTrial: blunder, riskWords, limitations: ['The other six cells remain stale after the generated module changed; acceptance leaves the offline property violated.'] };
  w.write('answer.md', 'The old N1 risk decision was bound to different words. The prepared prediction miscalled; current N1 is violated offline and the supplied risk words accept that violation. Other properties retain stale evidence.\n');
  w.write('answer.json', JSON.stringify(answer));
  assert.equal((await gradeExercise(w.evaluation)).outcome, 'pass');
  const grade = () => gradeWorkflow('refresh-decision', w.workspace, w.manifest.workspaceBefore, w.manifest.initialTexts);
  w.write('answer.json', JSON.stringify({ ...answer, initialAcceptanceCurrent: true }));
  assert.throws(grade, /old acceptance did not apply/);
  // The miscall is no current answer any more: it cannot stand for the executor-offline cell.
  w.write('answer.json', JSON.stringify({ ...answer, refreshedTrials: { ...refreshed, 'executor-offline': continuation } }));
  assert.throws(grade, /cite the trial that established a current answer/);
  w.write('answer.json', JSON.stringify(answer));
  // An entry is bound by integrity.json: one edited by hand is refused until its bytes are back.
  const blunderEntry = readdirSync(join(w.root, 'compositions/control/evidence')).find(n => n.endsWith('.json') && (JSON.parse(readFileSync(join(w.root, 'compositions/control/evidence', n), 'utf8')) as Entry).established.trial === blunder)!;
  const blunderPath = join(w.root, 'compositions/control/evidence', blunderEntry), blunderBytes = readFileSync(blunderPath, 'utf8');
  writeFileSync(blunderPath, JSON.stringify(JSON.parse(blunderBytes)));
  assert.throws(grade, /answer edited/);
  writeFileSync(blunderPath, blunderBytes);
  // A local bundle is no record: changing one the grade does not read changes nothing.
  appendFileSync(join(w.root, 'compositions/control/trials', refreshed['all-honest'], 'output.txt'), 'altered local output\n');
  assert.equal(grade().outcome, 'pass');
  // The replaced miscall's call is read from its bundle, which counts only while it is the bundle
  // that the entry's previous answer names by digest.
  const continuationCall = join(w.root, 'compositions/control/trials', continuation, 'call.md'), prepared = readFileSync(continuationCall, 'utf8');
  writeFileSync(continuationCall, prepared.replace('N1: holds', 'N1: violated'));
  assert.throws(grade, /the bundle is the one the previous answer was established from/);
  writeFileSync(continuationCall, prepared);
  assert.equal(grade().outcome, 'pass');
  w.run(['decide', 'compositions/control', 'accept', 'N1', '--', 'This additional passage acceptance was not authorized by the task.']);
  assert.throws(grade, /exactly the authorized decision/);
  // A starting answer that no trial here replaced keeps its reading.
  const kept = Object.keys(w.manifest.initialTexts).find(n => n.startsWith('dossiers/compositions/control/evidence/') && readFileSync(join(w.workspace, n), 'utf8') === w.manifest.initialTexts[n])!;
  writeFileSync(join(w.workspace, kept.replace(/\.json$/, '.md')), 'Rewritten old interpretation.\n');
  assert.throws(grade, /starting artifact changed/);
});
