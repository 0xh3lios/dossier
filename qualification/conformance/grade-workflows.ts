// These expectations follow the raw task facts, not a generated ledger golden.
// Free-text fidelity and the adequacy of the deliberate fault still need review.
// An answer cites trial ids. HEAD keeps one answer per question in evidence/<name>.json, so each id
// is graded against the entry that trial established, or, once a later answer replaced it, against
// the entry's previous answer. The local trials/ bundles are no record: the runner may write them,
// and the grade rests on the entries, except where noted for a replaced answer's call.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fingerprint } from './files.ts';
import { verifyAll } from '../../src/commands/verify.ts';
import { loadComposition } from '../../src/dossiers/load.ts';
import { parseDecisions } from '../../src/dossiers/decisions.ts';
import { evaluate } from '../../src/prose/expr.ts';
import { TRIAL_ID } from '../../src/trials/trials.ts';
import { completed, EVIDENCE } from '../../src/trials/answers.ts';
import { bundleDigest } from '../../src/trials/receipt.ts';
import { answerOf } from './evidence.ts';
import type { Entry, Previous } from '../../src/trials/answers.ts';
import type { CompositionAnalysis } from '../../src/verify/analyze.ts';
import type { TlcTraceStep } from '../../src/trials/checkers/tlc.ts';

const riskWords = 'I accept that the two-tick deadline can fail while the executor is offline. This acceptance does not assert recovery or make N1 true.';
const read = (workspace: string, name: string) => readFileSync(join(workspace, name), 'utf8');
const isView = (name: string) => name === 'dossiers/index.md' || /^dossiers\/(?:parts|compositions)\/[^/]+\/ledger\.md$/.test(name);
const isIntegrity = (name: string) => /^dossiers\/(?:parts|compositions)\/[^/]+\/integrity\.json$/.test(name);
const isGenerated = (name: string) => /^dossiers\/compositions\/[^/]+\/model\/generated(?:\/|$)/.test(name);
// Where a trial executes and where its bundle stays: on the machine that ran it, never a record.
const isLocalBundle = (name: string) => /^dossiers\/(?:parts|compositions)\/[^/]+\/(?:trials|\.running)(?:\/|$)/.test(name);
const isEvidence = (name: string, dir: string) => name.startsWith(`${dir}/${EVIDENCE}/`);

// The entries the workspace started with, by path. Preparation keeps their text with the manifest.
function startingEntries(initialTexts: Record<string, string>): Record<string, Entry> {
  return Object.fromEntries(Object.entries(initialTexts).filter(([name]) => /\/evidence\/[^/]+\.json$/.test(name)).map(([name, text]) => [name, JSON.parse(text) as Entry]));
}
// Every trial whose answer the workspace already held, current or previous: none is fresh evidence.
function startingTrials(start: Record<string, Entry>): Set<string> {
  return new Set(Object.values(start).flatMap(e => [e.established.trial, ...(e.previous ? [e.previous.established.trial] : [])]));
}

function preserve(exercise: string, workspace: string, before: Record<string, string>, initialTexts: Record<string, string>) {
  const after = fingerprint(workspace);
  const target = exercise === 'compose-probe' ? 'transfer' : 'control';
  const targetDir = `dossiers/compositions/${target}`;
  const start = startingEntries(initialTexts);
  const old = startingTrials(start);
  for (const [name, signature] of Object.entries(before)) {
    if (signature.endsWith(':directory')) {
      assert.ok(after[name]?.endsWith(':directory'), `starting directory removed: ${name}`);
      assert.equal(after[name].split(':')[0], signature.split(':')[0], `permissions changed: ${name}`);
    } else if (isView(name) || isGenerated(name) || isIntegrity(name) || isLocalBundle(name) || name === 'dossiers/dossier.json' || name === `${targetDir}/decisions.log`) continue;
    else if (exercise === 'refresh-decision' && name === `${targetDir}/calls/continuation.md`) {
      assert.ok(!after[name], 'the prepared call is consumed by the continuation trial');
    } else if (isEvidence(name, targetDir)) continue; // Starting answers of the target: below.
    else assert.equal(after[name], signature, `starting artifact changed: ${name}`);
  }
  // A starting answer changes only by a publication: the runner replaces the entry with the answer
  // of a trial run here and removes the replaced answer's reading. An answer it did not replace
  // keeps its entry and its reading byte for byte. No task here removes a question, so every
  // starting entry stays; verify, which the grade requires clean, binds whatever replaced one.
  const published = new Set<string>();
  for (const [name, entry] of Object.entries(start)) {
    if (!isEvidence(name, targetDir)) continue;
    assert.ok(after[name], `starting answer removed: ${name}`);
    const reading = name.replace(/\.json$/, '.md');
    if (after[name] === before[name]) {
      assert.equal(after[reading], before[reading], `starting artifact changed: ${reading}`);
      continue;
    }
    const now = JSON.parse(read(workspace, name)) as Entry;
    assert.ok(now.established.trial !== entry.established.trial && !old.has(now.established.trial), `starting answer edited, not replaced by a new trial: ${name}`);
    published.add(name);
  }
  for (const name of Object.keys(after)) {
    if (!isEvidence(name, targetDir) || Object.hasOwn(start, name) || !name.endsWith('.json')) continue;
    published.add(name);
  }
  const allowedNew = (name: string) => {
    if (['answer.md', 'answer.json'].includes(name) || isView(name) || isIntegrity(name) || isGenerated(name)) return true;
    // A reading is new only beside an answer published here.
    if (isEvidence(name, targetDir) && name.endsWith('.md')) return published.has(name.replace(/\.md$/, '.json'));
    if (exercise === 'compose-probe') return name.startsWith(targetDir + '/') || /^dossiers\/parts\/(source|sink)\/chart(?:\/|$)/.test(name);
    return name === `${targetDir}/decisions.log` || /^dossiers\/compositions\/control\/(?:calls|evidence|trials|\.running|model\/blunders)(?:\/|$)/.test(name);
  };
  for (const [name, signature] of Object.entries(after)) {
    if (Object.hasOwn(before, name)) continue;
    if (signature.endsWith(':directory') && Object.keys(after).some(child => child.startsWith(name + '/') && allowedNew(child))) continue;
    assert.ok(allowedNew(name), `unexpected write: ${name}`);
  }
  const marker = JSON.parse(read(workspace, 'dossiers/dossier.json'));
  const initialMarker = JSON.parse(initialTexts['dossiers/dossier.json']);
  assert.deepEqual(marker, initialMarker, 'the root marker is unchanged');
  for (const [name, old] of Object.entries(initialTexts).filter(([name]) => name.endsWith('/decisions.log'))) {
    const now = read(workspace, name);
    if (name === `${targetDir}/decisions.log`) assert.ok(now.startsWith(old), 'old decision bytes remain an exact prefix');
    else assert.equal(now, old, `unrequested decision changed: ${name}`);
  }
  return after;
}

// The current answer a cited trial established: the entry that names it, as verify reads it under
// its integrity.json binding, fresh in this task and interpreted in its reading.
function current(workspace: string, analysis: CompositionAnalysis, id: unknown, old: Set<string>): Entry {
  assert.ok(typeof id === 'string' && TRIAL_ID.test(id), 'cite a real trial id');
  assert.ok(!old.has(id), 'the task cites fresh evidence, not a stale old trial');
  const cited = answerOf(join(workspace, `dossiers/${analysis.ref}`), id);
  assert.ok(cited, `cite the trial that established a current answer: no entry in ${analysis.ref}/${EVIDENCE}/ names ${id}`);
  const found = analysis.answers.find(a => a.name === cited.name);
  assert.ok(found && found.entry && found.entry.established.trial === id, 'verify reads the cited answer from its bound entry');
  assert.deepEqual(found.problems, []);
  assert.ok(completed(found));
  assert.ok(found.reading?.trim(), `interpret each cited answer in ${EVIDENCE}/${cited.name}.md`);
  return found.entry;
}

// The answer a cited trial established, as HEAD keeps it now: still its entry's answer, or the
// entry's previous one once a later answer to the question replaced it (ANSWER-REPLACE).
type Established = { name: string; entry: Entry; current: true; reading: string | null } | { name: string; entry: Entry; current: false; previous: Previous };
function establishedBy(workspace: string, analysis: CompositionAnalysis, id: unknown, old: Set<string>): Established {
  assert.ok(typeof id === 'string' && TRIAL_ID.test(id), 'cite a real trial id');
  assert.ok(!old.has(id), 'the task cites fresh evidence, not a stale old trial');
  const dir = join(workspace, `dossiers/${analysis.ref}`);
  const cited = answerOf(dir, id);
  if (cited) {
    assert.ok(analysis.answers.some(a => a.name === cited.name && a.entry?.established.trial === id && a.problems.length === 0), 'verify reads the cited answer from its bound entry');
    return { name: cited.name, entry: cited.entry, current: true, reading: cited.reading };
  }
  for (const a of analysis.answers) {
    const previous = a.entry?.previous;
    if (!a.entry || !previous || previous.established.trial !== id) continue;
    assert.deepEqual(a.problems, []);
    return { name: a.name, entry: a.entry, current: false, previous };
  }
  return assert.fail(`no entry in ${analysis.ref}/${EVIDENCE}/ holds the answer ${id} established, as its answer or its previous one`);
}

export function gradeWorkflow(exercise: string, workspace: string, before: Record<string, string>, initialTexts: Record<string, string>) {
  const unchanged = fingerprint(workspace);
  try {
    assert.ok(['compose-probe', 'refresh-decision'].includes(exercise));
    preserve(exercise, workspace, before, initialTexts);
    const old = startingTrials(startingEntries(initialTexts));
    const answer = JSON.parse(read(workspace, 'answer.json'));
    assert.ok(read(workspace, 'answer.md').trim(), 'provide a human explanation');
    assert.equal(answer.proof, false, 'these TLC trials provide bounded evidence');
    assert.ok(Array.isArray(answer.limitations) && answer.limitations.length && answer.limitations.every((x: unknown) => typeof x === 'string' && x.trim()));
    const verified = verifyAll({ root: join(workspace, 'dossiers'), version: '0.2.0', write: false });
    assert.deepEqual(verified.tripwires, []);
    for (const item of [...verified.parts, ...verified.compositions]) assert.deepEqual(item.tripwires, [], item.ref);
    const id = exercise === 'compose-probe' ? 'transfer' : 'control';
    const analysis = verified.compositions.find(item => item.id === id);
    assert.ok(analysis);
    assert.equal(answer.composition, id);
    const composition = loadComposition(join(workspace, 'dossiers'), id);
    assert.deepEqual(composition.composed.errors, []);
    if (exercise === 'compose-probe') {
      assert.deepEqual(composition.wiring.members.map(m => m.part).sort(), ['sink', 'source']);
      assert.deepEqual(composition.wiring.wiring, [{ effect: { part: 'source', name: 'credit' }, event: { part: 'sink', name: 'receive' } }]);
      assert.deepEqual(composition.wiring.free, []);
      assert.deepEqual(composition.wiring.scenarios, ['all-honest']);
      assert.equal(composition.prose.properties.length, 1);
      assert.equal(composition.prose.givens.length, 0, 'no assumption can make the property vacuous');
      const property = composition.prose.always.find(p => p.id === 'A1');
      assert.ok(property?.cond);
      assert.deepEqual(property.givens, []);
      for (let paid = 0; paid <= 2; paid++) for (let received = 0; received <= 2; received++) {
        assert.equal(evaluate(property.cond, name => ({ 'source.paid': paid, 'sink.received': received })[name]), paid === received, 'A1 means equality across the declared independent values');
      }
      assert.deepEqual(composition.prose.walks.find(w => w.id === 'W1')?.steps, [false, false, true].map(refused => ({ part: 'source', event: 'send', args: {}, refused })));
      assert.equal(composition.prose.walks.find(w => w.id === 'W1')?.from, 'source.Live');
      assert.equal(composition.prose.walks.find(w => w.id === 'W1')?.ends, 'source.Live');
      assert.equal(answer.property, 'A1'); assert.equal(answer.scenario, 'all-honest');
      assert.equal(answer.thirdSendAllowed, false);
      assert.deepEqual(answer.final, { remaining: 0, paid: 2, received: 2 });
      const positive = current(workspace, analysis, answer.trial, old);
      assert.equal(positive.question.kind, 'tlc');
      assert.equal(positive.question.property, 'A1'); assert.equal(positive.question.scenario, 'all-honest');
      assert.equal(positive.answer.result, 'as-called'); assert.equal(positive.answer.outcomes.A1, 'holds');
      assert.equal(positive.basis.snapshot.passages.A1, composition.prose.byId.A1.hash);
      const witness = current(workspace, analysis, answer.witnessTrial, old);
      assert.equal(witness.question.kind, 'tlc'); assert.equal(witness.question.walk, 'W1');
      assert.equal(witness.question.scenario, 'all-honest'); assert.equal(witness.answer.outcomes.NotW1, 'violated');
      const trace = witness.answer.trace as TlcTraceStep[];
      assert.ok(Array.isArray(trace) && trace.length >= 3, 'the witness entry keeps its actual path');
      const last = trace.filter(step => step.values).at(-1)?.values;
      assert.equal(last?.source_remaining, '0'); assert.equal(last?.source_paid, '2'); assert.equal(last?.sink_received, '2');
      const blunder = current(workspace, analysis, answer.blunderTrial, old);
      assert.equal(blunder.question.kind, 'blunder'); assert.equal(blunder.question.property, 'A1');
      assert.equal(blunder.question.scenario, 'all-honest'); assert.equal(blunder.basis.snapshot.passages.A1, composition.prose.byId.A1.hash);
      assert.equal(blunder.answer.outcomes.A1, 'violated'); assert.equal(blunder.answer.result, 'as-called');
      assert.equal(analysis.cells.find(c => c.property === 'A1' && c.scenario === 'all-honest')?.mark, 'checked');
      assert.equal(analysis.cells.find(c => c.property === 'A1' && c.scenario === 'all-honest')?.trial, answer.trial, 'cite the current property evidence');
      assert.equal(analysis.walks.find(w => w.id === 'W1')?.mark, 'checked');
      assert.equal(analysis.walks.find(w => w.id === 'W1')?.trial, answer.witnessTrial, 'cite the current walk evidence');
      assert.ok(analysis.decisions.every(d => !d.malformed && d.verb === 'begin'), 'no owner acceptance was authorized');
    } else {
      assert.equal(answer.initialAcceptanceCurrent, false, 'the old acceptance did not apply to the changed property');
      assert.equal(composition.prose.withins.find(p => p.id === 'N1')?.k, 2, 'do not relax the deadline');
      // The prepared prediction ran and came back miscalled. Refreshing N1 under executor-offline asks
      // the same question again, so its answer replaces the miscall, which the entry then keeps as its
      // previous answer with the classification its reading carried (ANSWER-MISCALL, ANSWER-REPLACE).
      const prepared = initialTexts['dossiers/compositions/control/calls/continuation.md'];
      const continuation = establishedBy(workspace, analysis, answer.continuationTrial, old);
      assert.equal(continuation.entry.question.property, 'N1'); assert.equal(continuation.entry.question.scenario, 'executor-offline');
      const shown = continuation.current ? continuation.entry.answer : continuation.previous.answer;
      assert.equal(shown.result, 'miscalled'); assert.equal(shown.outcomes.N1, 'violated');
      if (continuation.current) {
        assert.match(continuation.reading || '', /^classification: call was wrong\s*$/m);
        assert.equal(continuation.entry.call.text, prepared, 'execute the interrupted prediction untouched');
      } else {
        assert.equal(continuation.previous.classification, 'call was wrong', 'the replaced miscall keeps its classification');
        // HEAD keeps no call for a replaced answer. Grading runs on the machine that ran the exercise's
        // trials, where the replaced answer's bundle still holds the call it executed, and the digest
        // that previous answer names binds the bundle. This is the one grade that reads a bundle.
        const bundle = join(workspace, `dossiers/compositions/control/trials/${answer.continuationTrial}`);
        assert.ok(existsSync(bundle), `the continuation's answer was replaced, so its call is read from its bundle, trials/${answer.continuationTrial}/, which grading needs on the machine that ran it`);
        assert.equal(bundleDigest(bundle), continuation.previous.established.bundle, 'the bundle is the one the previous answer was established from');
        assert.equal(readFileSync(join(bundle, 'call.md'), 'utf8'), prepared, 'execute the interrupted prediction untouched');
      }
      assert.deepEqual(Object.keys(answer.refreshedTrials).sort(), ['all-honest', 'executor-offline', 'governance-captured']);
      for (const [scenario, trialId] of Object.entries(answer.refreshedTrials)) {
        const trial = current(workspace, analysis, trialId, old);
        assert.equal(trial.question.kind, 'tlc'); assert.equal(trial.question.property, 'N1'); assert.equal(trial.question.scenario, scenario);
        assert.equal(trial.answer.result, 'as-called', 'a current check closes the mistaken prediction without editing it');
        assert.equal(trial.answer.outcomes.N1, scenario === 'executor-offline' ? 'violated' : 'holds');
        assert.equal(trial.basis.snapshot.passages.N1, composition.prose.byId.N1.hash);
        assert.equal(analysis.cells.find(c => c.property === 'N1' && c.scenario === scenario)?.trial, trialId, 'cite the current cell evidence');
      }
      const blunder = current(workspace, analysis, answer.blunderTrial, old);
      assert.equal(blunder.question.kind, 'blunder'); assert.equal(blunder.question.property, 'N1');
      assert.equal(blunder.basis.snapshot.passages.N1, composition.prose.byId.N1.hash);
      assert.equal(blunder.answer.outcomes.N1, 'violated'); assert.equal(blunder.answer.result, 'as-called');
      const expected = analysis.cells.map(c => ({ property: c.property, scenario: c.scenario, mark: c.mark, accepted: Boolean(c.accepted) }));
      const sort = (a: { property: string; scenario: string }, b: { property: string; scenario: string }) => `${a.property}|${a.scenario}`.localeCompare(`${b.property}|${b.scenario}`);
      assert.deepEqual(answer.cells.sort(sort), expected.sort(sort), 'report every cell accurately');
      for (const cell of expected) {
        if (cell.property !== 'N1') assert.equal(cell.mark, 'lapsed', 'unrefreshed module-dependent evidence stays stale');
        else { assert.equal(cell.mark, cell.scenario === 'executor-offline' ? 'violated' : 'checked'); assert.equal(cell.accepted, cell.scenario === 'executor-offline'); }
      }
      assert.equal(answer.riskWords, riskWords);
      const path = 'dossiers/compositions/control/decisions.log';
      const oldLog = initialTexts[path], now = read(workspace, path);
      const all = parseDecisions(now);
      assert.equal(all.broken, null);
      const added = all.decisions.slice(parseDecisions(oldLog).decisions.length);
      assert.equal(added.length, 1, 'record exactly the authorized decision');
      const decision = added[0]; assert.ok(!decision.malformed);
      assert.equal(decision.verb, 'risk'); assert.equal(decision.words, riskWords);
      // The decision names the violation the owner was shown: the trial that established the current
      // executor-offline answer.
      assert.deepEqual(decision.args, [`N1@${composition.prose.byId.N1.hash}`, 'executor-offline', answer.refreshedTrials['executor-offline']]);
      // Every answer this task published concerns N1: the other claims were not to be refreshed.
      for (const a of analysis.answers) if (a.entry && !old.has(a.entry.established.trial)) {
        assert.equal(a.entry.question.property, 'N1', 'do not refresh unrequested claims');
      }
    }
    return { outcome: 'pass', exercise, composition: id, checks: ['raw task semantics', 'current scoped answers', 'starting answers replaced only by publication, inputs preserved', 'exact owner boundary', 'bounded and stale claims'], manual: ['Read answer.md and every new reading against the traces and warnings in the entries.', 'Check that each sensitivity fault tests the requested property without weakening the original input.'] };
  } finally { assert.deepEqual(fingerprint(workspace), unchanged, 'workflow grading is read-only'); }
}
