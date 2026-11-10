import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzePart, analyzeComposition } from '../../src/verify/analyze.ts';
import { knowledgeOf } from '../../src/dossiers/load.ts';
import { readActors } from '../../src/dossiers/actors.ts';
import { readMarker } from '../../src/dossiers/root.ts';
import { loadBehaviorCollection, reviewCoverageItems } from '../../src/behaviors/records.ts';
import { resolveTarget, resolveKnowledgePin } from '../../src/behaviors/resolve.ts';
import { buildBehaviorReport } from '../../src/behaviors/report.ts';
import type { Analysis, PartAnalysis, CompositionAnalysis } from '../../src/verify/analyze.ts';
import type { BehaviorCollection, ReviewEvaluation, ReviewAssessment, ReviewRecord } from '../../src/behaviors/types.ts';

const plugin = fileURLToPath(new URL('../../', import.meta.url));
const root = join(plugin, 'qualification/fixture/dossiers');
const knowledge = knowledgeOf(root), marker = readMarker(root), actors = readActors(root);
const timelock = analyzePart({ root, id: 'timelock', knowledge, marker, actors, includeBehaviors: false });
const control = analyzeComposition({ root, id: 'control', knowledge, marker, includeBehaviors: false });
const parts = Object.fromEntries(control.wiring.members.map(m => { const a = analyzePart({ root, id: m.part, knowledge, marker, actors, includeBehaviors: false }); return [a.ref, a]; }));
const context = (analysis: Analysis) => ({ analysis, analyses: { ...parts, [analysis.ref]: analysis }, knowledge });
const examples = join(plugin, 'qualification/conformance/behavior-contract/examples');
const cancellation = loadBehaviorCollection(join(examples, 'parts/timelock'));
const resolution = loadBehaviorCollection(join(examples, 'compositions/control'));
const noReview: ReviewEvaluation = { reviews: [], assessments: [], dossierReviewed: false };

// These assessments are explicit test inputs to the standing boundary, not authored review evidence.
// Parsing, basis currentness and effective replacement are exercised by behavior-reviews.test.ts.
function assessed(collection: BehaviorCollection, dossier: string, results: ReviewAssessment['result'][]): ReviewEvaluation {
  const subject = { kind: 'dossier' as const, dossier, behaviors: collection.collection!.record.behaviors };
  const mappings = collection.behaviors.flatMap(b => b.record.claims.flatMap(c => c.mappings.map(m => `${b.record.id}/${c.id}/${m.id}`)));
  const record: ReviewRecord = {
    format: 'dossier-review@0.2.0', subject, basis: [], replaces: [],
    coverage: { examined: reviewCoverageItems(subject), unexamined: [] },
    assessments: mappings.map((mapping, i) => ({ mapping, result: results[i] || 'inconclusive', rationale: 'Synthetic semantic assessment for the derivation test.', limitations: [] })),
  };
  return { reviews: [{ file: 'reviews/test.md', record, body: '', sha256: '1'.repeat(64), status: 'current', reasons: [], changed: { claims: [], explanations: [] } }], assessments: record.assessments.map(a => ({ ...a, review: 'reviews/test.md', reviewSha256: '1'.repeat(64) })), dossierReviewed: true };
}
const report = (analysis: Analysis, collection: BehaviorCollection, reviews = noReview) => buildBehaviorReport({ ...context(analysis), collection, reviews });

test('a real Harbor witness remains one path; an illustration and an unsupported recovery remain hypotheses', () => {
  const r = report(timelock, cancellation, assessed(cancellation, timelock.ref, ['supported', 'supported']));
  const [path, general, recovery] = r.behaviors[0].claims;
  assert.equal(path.standing, 'supported');
  assert.equal(path.freshness, 'current');
  assert.ok(path.mappings[0].evidence.evidence.some(e => e.kind === 'path-witness' && e.polarity === 'witness'));
  assert.ok(path.limitations.some(l => l.includes('One recorded path')));
  assert.equal(general.standing, 'hypothesis', 'an illustrative mapping cannot establish a universal claim');
  assert.equal(recovery.standing, 'hypothesis');
  assert.equal(r.coverage.complete, false);
  assert.ok(r.coverage.unassociated.some(p => p.id === 'W1'));
  assert.ok(!r.coverage.unassociated.some(p => p.id === 'W2'));
});

test('evidence requires an independent current semantic assessment, not just a successful answer', () => {
  const r = report(timelock, cancellation);
  assert.equal(r.behaviors[0].claims[0].standing, 'evidence-available');
  assert.equal(r.behaviors[0].claims[0].label, 'evidence available; mapping unreviewed');
  const stale = assessed(cancellation, timelock.ref, ['supported', 'supported']);
  stale.reviews[0].status = 'stale'; stale.assessments = [];
  assert.equal(report(timelock, cancellation, stale).behaviors[0].claims[0].standing, 'evidence-available');
});

test('the accepted offline-executor counterexample keeps the requirement contradicted and acceptance separate', () => {
  const before = structuredClone(control.cells.find(c => c.property === 'N1' && c.scenario === 'executor-offline'));
  const r = report(control, resolution, assessed(resolution, control.ref, ['supported', 'supported']));
  const [offline, honest] = r.behaviors[0].claims;
  assert.equal(offline.standing, 'contradicted');
  assert.equal(offline.mappings[0].evidence.formal?.mark, 'violated');
  assert.ok(offline.mappings[0].evidence.owner[0].accepted);
  assert.equal(honest.standing, 'supported');
  assert.equal(honest.scope.description, resolution.behaviors[0].record.claims[1].scope.description);
  assert.deepEqual(control.cells.find(c => c.property === 'N1' && c.scenario === 'executor-offline'), before);
});

test('inductive model evidence retains its reach and sensitivity instead of acquiring source scope', () => {
  const r = resolveTarget({ kind: 'cell', dossier: control.ref, property: 'A1', scenario: 'all-honest' }, context(control));
  assert.equal(r.freshness, 'current');
  assert.ok(r.evidence.some(e => e.kind === 'inductive-model' && e.admissible));
  assert.ok(r.evidence.some(e => e.kind === 'sensitivity' && !e.admissible));
  assert.ok(r.evidence.find(e => e.kind === 'inductive-model')!.reach);
  const source = structuredClone(cancellation);
  const c = source.behaviors[0].record.claims[0];
  const pin = knowledge.resolve('timelock#observation:delay-check-2026-11-01')!;
  c.scope = { level: 'source', description: 'A source-level claim with a model-only witness.', pins: [{ ref: pin.ref, revision: `sha256:${pin.sha256}` }] };
  const result = report(timelock, source, assessed(source, timelock.ref, ['supported', 'supported'])).behaviors[0].claims[0];
  assert.equal(result.standing, 'hypothesis');
  assert.ok(result.limitations.some(limit => /does not establish source or deployment correspondence/.test(limit)));
  assert.equal(result.standing, 'hypothesis');
});

test('record pins compare the full record revision and never substitute changed text', () => {
  const record = knowledge.resolve('timelock#observation:delay-check-2026-11-01')!;
  const current = resolveKnowledgePin({ ref: record.ref, revision: `sha256:${record.sha256}` }, knowledge);
  assert.equal(current.freshness, 'current'); assert.equal(current.text, record.text);
  const stale = resolveKnowledgePin({ ref: record.ref, revision: `sha256:${'0'.repeat(64)}` }, knowledge);
  assert.equal(stale.freshness, 'stale'); assert.equal(stale.text, null);
  assert.deepEqual(stale.dependency, { root: 'knowledge', path: record.path });
  assert.equal(resolveKnowledgePin({ ref: 'missing#property:never', revision: `sha256:${'0'.repeat(64)}` }, knowledge).freshness, 'missing');
});

test('an exact answer resolves a recorded check, not a name invented underneath an aggregate', () => {
  const answer = timelock.completed.find(a => a.entry.question.expects.includes('NotW2'))!;
  const yes = resolveTarget({ kind: 'answer', dossier: timelock.ref, question: answer.entry.question, check: 'NotW2' }, context(timelock));
  assert.equal(yes.freshness, 'current'); assert.equal(yes.available, true);
  const no = resolveTarget({ kind: 'answer', dossier: timelock.ref, question: answer.entry.question, check: 'testEveryCancellationDelay' }, context(timelock));
  assert.equal(no.freshness, 'missing'); assert.equal(no.available, false);
  assert.match(no.reasons[0], /absent from the recorded answer/);
});

test('an exact passing answer cannot hide a different current counterexample for the same cell', () => {
  const good = control.completed.find(a => a.entry.question.property === 'N1' && a.entry.question.scenario === 'all-honest' && a.entry.question.kind !== 'blunder')!;
  // Two independently named, already-validated publication candidates are the resolver's inputs.
  // No invented solver evidence is written to Harbor or another dossier.
  const bad = structuredClone(good);
  bad.name = 'synthetic-counterexample'; bad.entry.question.kind = 'synthetic-negative-question';
  bad.entry.answer.outcomes.N1 = 'violated';
  for (const key of Object.keys(bad.entry.answer.outcomes)) if (key.includes('N1')) bad.entry.answer.outcomes[key] = 'violated';
  const analysis = { ...control, completed: [...control.completed, bad], answers: [...control.answers, bad] } as CompositionAnalysis;
  const own = Object.keys(good.entry.answer.outcomes).find(n => n.includes('N1'))!;
  const r = resolveTarget({ kind: 'answer', dossier: control.ref, question: good.entry.question, check: own }, context(analysis));
  assert.equal(r.freshness, 'current');
  assert.ok(r.conflicts.length > 0);
  assert.ok(r.evidence.some(e => e.entry === bad.name && e.polarity === 'counterexample'));
  assert.ok(r.dependencies.some(d => d.path.endsWith('/synthetic-counterexample.json')));
});

test('edited, aborted and lapsed answers supply no current support', () => {
  const answer = timelock.completed.find(a => a.entry.question.expects.includes('NotW2'))!;
  const target = { kind: 'answer' as const, dossier: timelock.ref, question: answer.entry.question, check: 'NotW2' };
  const invalid = { ...answer, problems: [{ name: 'entry edited', where: answer.name }] };
  const broken = { ...timelock, answers: timelock.answers.map(a => a.name === answer.name ? invalid : a) } as PartAnalysis;
  assert.equal(resolveTarget(target, context(broken)).freshness, 'invalid');
  assert.equal(resolveTarget(target, context(broken)).available, false);
  const aborted = structuredClone(answer); aborted.entry.answer.result = 'aborted';
  const stopped = { ...timelock, answers: timelock.answers.map(a => a.name === answer.name ? aborted : a) } as PartAnalysis;
  assert.equal(resolveTarget(target, context(stopped)).available, false);
  const file = Object.keys(answer.entry.basis.executed).find(p => p !== 'prose.md')!;
  const changed = { ...timelock, files: { ...timelock.files, [file]: 'f'.repeat(64) } } as PartAnalysis;
  const stale = resolveTarget(target, context(changed));
  assert.equal(stale.freshness, 'stale'); assert.equal(stale.available, false);
  assert.ok(stale.reasons.some(x => x.includes(file)));
});

test('current conflicting assessments remain contested regardless of order', () => {
  const reviewed = assessed(cancellation, timelock.ref, ['supported', 'supported']);
  reviewed.assessments.push({ ...reviewed.assessments[0], result: 'too-broad', review: 'reviews/second.md' });
  assert.equal(report(timelock, cancellation, reviewed).behaviors[0].claims[0].standing, 'contested');
  reviewed.assessments.reverse();
  assert.equal(report(timelock, cancellation, reviewed).behaviors[0].claims[0].standing, 'contested');
});

test('a part cannot borrow another dossier and a composition can resolve only declared members', () => {
  const outside = resolveTarget({ kind: 'passage', dossier: 'parts/vault', id: 'A1', side: 'model' }, context(timelock));
  assert.equal(outside.freshness, 'invalid');
  const member = resolveTarget({ kind: 'walk', dossier: 'parts/timelock', id: 'W2', scenario: null }, context(control));
  assert.equal(member.freshness, 'current'); assert.equal(member.available, true);
  assert.equal(resolveTarget({ kind: 'cell', dossier: 'compositions/supply', property: 'A1', scenario: 'all-honest' }, context(control)).freshness, 'invalid');
});

test('an omitted semantic examination cannot grant support despite a positive assessment', () => {
  const review = assessed(cancellation, timelock.ref, ['supported', 'supported']);
  const coverage = review.reviews[0].record!.coverage;
  coverage.examined = coverage.examined.filter(k => k !== 'behavior:cancel-plan:mappings');
  coverage.unexamined.push({ item: 'behavior:cancel-plan:mappings', reason: 'Not examined.' });
  assert.equal(report(timelock, cancellation, review).behaviors[0].claims[0].standing, 'hypothesis');
});

test('resolver and report remain read-only and retain the original owner decision bytes', () => {
  const path = join(root, 'compositions/control/decisions.log');
  const before = readFileSync(path, 'utf8');
  report(control, resolution, assessed(resolution, control.ref, ['supported', 'supported']));
  assert.equal(readFileSync(path, 'utf8'), before);
});


test('a missed positive prediction grants no cover while a current negative outcome remains visible', () => {
  const good = control.completed.find(a => a.entry.question.property === 'N1' && a.entry.question.scenario === 'all-honest' && a.entry.question.kind !== 'blunder')!;
  const missed = structuredClone(good); missed.entry.answer.result = 'miscalled';
  const a = { ...control, completed: control.completed.map(r => r.name === good.name ? missed : r), answers: control.answers.map(r => r.name === good.name ? missed : r) } as CompositionAnalysis;
  const target = { kind: 'answer' as const, dossier: a.ref, question: missed.entry.question, check: 'N1' };
  assert.equal(resolveTarget(target, context(a)).available, false);
  missed.entry.answer.outcomes.N1 = 'violated';
  assert.equal(resolveTarget(target, context(a)).available, true, 'a failed prediction cannot hide a real counterexample');
});
