// Defects an independent review of 0.2.0 found in the behavior engine, each with the reproduction it
// gave, run on a copy of Harbor. Synthetic reviews here test freshness and derivation, not judgment.
//   node --test qualification/tests/behavior-defects.test.ts
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, copyFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { verifyAll } from '../../src/commands/verify.ts';
import { analyzePart } from '../../src/verify/analyze.ts';
import { buildBehaviorReport } from '../../src/behaviors/report.ts';
import { resolveTarget } from '../../src/behaviors/resolve.ts';
import { protectBehaviorAnswers } from '../../src/behaviors/retention.ts';
import { reviewCoverageItems } from '../../src/behaviors/records.ts';
import { entryName } from '../../src/trials/answers.ts';
import { fileHash } from '../../src/hash.ts';
import { knowledgeOf, loadActors } from '../../src/dossiers/load.ts';
import { openKnowledge } from '../../src/knowledge.ts';
import type { MappingTarget, ReviewRecord, ReviewSubject } from '../../src/behaviors/types.ts';

const plugin = fileURLToPath(new URL('../../', import.meta.url));
const bin = join(plugin, 'bin', 'dossier');

function harbor(t: TestContext): string {
  const work = mkdtempSync(join(tmpdir(), 'dossier-behavior-defects-'));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  cpSync(join(plugin, 'qualification/fixture'), join(work, 'fixture'), { recursive: true });
  return join(work, 'fixture', 'dossiers');
}
const cli = (root: string, ...args: string[]) => spawnSync(bin, [...args, '--root', root], { encoding: 'utf8', maxBuffer: 100 * 1024 * 1024 });
const verify = (root: string) => JSON.parse(cli(root, 'verify', '--json').stdout);
const dossier = (v: { parts: { id: string }[]; compositions: { id: string }[] }, ref: string) =>
  // The JSON shape of verify --json.
  (ref.startsWith('parts/') ? v.parts : v.compositions).find(a => a.id === ref.split('/')[1]) as any;
function readDoc(file: string) {
  const text = readFileSync(file, 'utf8'), match = /^```json\r?\n([\s\S]*?)\r?\n```(?:\r?\n|$)/.exec(text)!;
  return { record: JSON.parse(match[1]), body: text.slice(match[0].length) };
}
function writeDoc(file: string, record: unknown, body: string) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, '```json\n' + JSON.stringify(record, null, 2) + '\n```\n\n' + body + '\n');
}
// A review built from review-basis, with every mapping assessed supported and every item examined.
function syntheticReview(root: string, ref: string, behavior?: string, edit: (record: ReviewRecord) => void = () => {}): ReviewRecord {
  const r = cli(root, 'review-basis', ref, ...(behavior ? ['--behavior', behavior] : []), '--json');
  assert.equal(r.status, 0, r.stderr || r.stdout);
  const { subject, basis, coverageItems } = JSON.parse(r.stdout);
  const assessments = subject.behaviors.flatMap((id: string) => readDoc(join(root, ref, 'behaviors', `${id}.md`)).record.claims.flatMap((c: { id: string; mappings: { id: string }[] }) => c.mappings.map(m => ({ mapping: `${id}/${c.id}/${m.id}`, result: 'supported', rationale: 'Synthetic assessment for a freshness test.', limitations: [] }))));
  const record: ReviewRecord = { format: 'dossier-review@0.2.0', subject, basis, coverage: { examined: coverageItems, unexamined: [] }, replaces: [], assessments };
  edit(record);
  writeDoc(join(root, ref, 'reviews/synthetic.md'), record, 'Synthetic review used only to test review freshness and claim derivation.');
  return record;
}

test('a counterexample on a walk conflicts with its witness, so the claim cannot stand supported', t => {
  const root = harbor(t), dir = join(root, 'parts/timelock'), localModel = 'model/WitnessConflict.als';
  writeFileSync(join(dir, localModel), 'module WitnessConflict\n\npred W2_path { some none }\nrun W2_path for 4\n');
  const v = verifyAll({ root, version: '0.2.0' }), original = v.parts.find(a => a.id === 'timelock')!;
  const witness = original.completed.find(a => a.entry.question.expects.includes('NotW2'))!;
  // An in-memory answer from another checker that found no instance of the walk's path.
  const bad = structuredClone(witness);
  bad.entry.question = { ...bad.entry.question, kind: 'alloy', checker: 'alloy', executes: [localModel], expects: ['W2_path'] };
  bad.entry.basis.executed = { 'prose.md': fileHash(join(dir, 'prose.md')), [localModel]: fileHash(join(dir, localModel)) };
  bad.entry.basis.inputIdentity.files = { ...bad.entry.basis.executed };
  bad.entry.answer = { ...bad.entry.answer, result: 'miscalled', outcomes: { W2_path: 'no instance' }, enabled: ['W2_path'], trace: undefined } as typeof bad.entry.answer;
  bad.name = entryName(bad.entry.question);
  bad.entry.established.at = '2026-11-09T23:59:00Z';
  const a = analyzePart({ root, id: 'timelock', knowledge: v.knowledge, actors: v.actors, answers: [...original.answers, bad], includeBehaviors: false });
  const target: MappingTarget = { kind: 'answer', dossier: a.ref, question: witness.entry.question, check: 'NotW2' };
  const context = { analysis: a, analyses: { [a.ref]: a }, knowledge: v.knowledge };
  const resolution = resolveTarget(target, context);
  assert.ok(resolution.evidence.some(e => e.polarity === 'witness' && e.admissible) && resolution.evidence.some(e => e.polarity === 'counterexample' && e.admissible));
  assert.notDeepEqual(resolution.conflicts, [], 'the witness and the counterexample conflict');
  const collection = structuredClone(original.behaviorCollection!);
  collection.behaviors = [collection.behaviors.find(b => b.record.id === 'cancel-plan')!];
  collection.behaviors[0].record.claims = [collection.behaviors[0].record.claims[0]];
  collection.behaviors[0].record.claims[0].mappings[0].target = target;
  collection.collection!.record.behaviors = ['cancel-plan'];
  const subject: ReviewSubject = { kind: 'behavior', dossier: a.ref, behaviors: ['cancel-plan'] };
  const record: ReviewRecord = { format: 'dossier-review@0.2.0', subject, basis: [], replaces: [], coverage: { examined: reviewCoverageItems(subject), unexamined: [] }, assessments: [{ mapping: 'cancel-plan/C1/M1', result: 'supported', rationale: 'Synthetic.', limitations: [] }] };
  const reviews = { reviews: [{ file: 'reviews/synthetic.md', record, body: '', sha256: '1'.repeat(64), status: 'current' as const, reasons: [], changed: { claims: [], explanations: [] } }], assessments: record.assessments.map(x => ({ ...x, review: 'reviews/synthetic.md', reviewSha256: '1'.repeat(64) })), dossierReviewed: false };
  assert.equal(buildBehaviorReport({ ...context, collection, reviews }).behaviors[0].claims[0].standing, 'contested');
});

test('a refusal the model covers by absence is observed evidence a reviewed claim can stand on', t => {
  const root = harbor(t), ref = 'parts/timelock', file = join(root, ref, 'behaviors/schedule-and-execute.md');
  const v = verifyAll({ root, version: '0.2.0' }), analyses = Object.fromEntries([...v.parts, ...v.compositions].map(a => [a.ref, a])), a = analyses[ref];
  const r = resolveTarget({ kind: 'passage', dossier: ref, id: 'R2', side: 'model' }, { analysis: a, analyses, knowledge: v.knowledge });
  assert.equal(r.formal?.mark, 'checked');
  assert.ok(r.available, 'R2 is checked on the model side, by absence');
  assert.ok(r.evidence.every(e => e.kind === 'model-observation' && e.polarity === 'observed'));
  const { record } = readDoc(file), claim = record.claims.find((c: { id: string }) => c.id === 'C3');
  claim.mappings[0].target.side = 'model';
  writeDoc(file, record, 'Synthetic: the claim asks for the model side of R2.');
  syntheticReview(root, ref, 'schedule-and-execute');
  const found = dossier(verify(root), ref).behaviors.behaviors.find((b: { id: string }) => b.id === 'schedule-and-execute').claims.find((c: { id: string }) => c.id === 'C3');
  assert.equal(found.standing, 'supported');
});

test('an exact answer explains the one check it selects, not every passage the same trial covered', t => {
  const root = harbor(t), ref = 'parts/timelock';
  const answer = JSON.parse(readFileSync(join(root, ref, 'evidence/tlc-A1-N1-59ce72.json'), 'utf8'));
  rmSync(join(root, ref, 'behaviors'), { recursive: true });
  writeDoc(join(root, ref, 'README.md'), { format: 'dossier-collection@0.2.0', behaviors: ['only-a1'] }, '# Only A1\n\nThis collection explains only A1.');
  writeDoc(join(root, ref, 'behaviors/only-a1.md'), { format: 'dossier-behavior@0.2.0', id: 'only-a1', title: 'Only A1', claims: [{ id: 'C1', kind: 'descriptive', statement: 'The bounded A1 check held.', scope: { level: 'model', description: 'A1 at its recorded reach.', pins: [] }, assumptions: [], mappings: [{ id: 'M1', target: { kind: 'answer', dossier: ref, question: answer.question, check: 'A1' }, relation: 'supports', rationale: 'The answer records A1 holding.', limitations: [] }] }] }, '# Only A1\n\nSynthetic.');
  const unassociated = dossier(verify(root), ref).behaviors.coverage.unassociated.map((u: { id: string }) => u.id);
  assert.ok(!unassociated.includes('A1'));
  assert.ok(unassociated.includes('N1'), 'N1, which the same answer covered, is still unexplained');
});

test('a review whose assessments miss a mapping of a behavior it read unchanged is invalid, not stale', t => {
  const root = harbor(t), ref = 'parts/timelock';
  syntheticReview(root, ref, 'cancel-plan', record => { record.assessments.pop(); });
  const result = cli(root, 'verify', '--json'), v = JSON.parse(result.stdout), a = dossier(v, ref);
  const review = a.behaviors.reviews.reviews.find((r: { file: string }) => r.file === 'reviews/synthetic.md');
  assert.equal(review.status, 'invalid');
  assert.equal(result.status, 1, 'an invalid review trips verify');
  assert.ok(a.tripwires.some((x: { name: string }) => x.name === 'invalid review'));
});

test('where fails on a claim or a mapping that does not exist, and names targets by their ids', t => {
  const root = harbor(t), ref = 'parts/timelock';
  for (const suffix of ['C999', 'C1/M999']) {
    const r = cli(root, 'where', `${ref}#cancel-plan/${suffix}`);
    assert.equal(r.status, 1, suffix);
    assert.match(r.stdout, /^no (claim|mapping) /, suffix);
  }
  const ok = cli(root, 'where', `${ref}#cancel-plan/C1/M1`);
  assert.equal(ok.status, 0);
  assert.match(ok.stdout, /^    M1 supports walk W2; /m);
});

test('a contract declared outside its own section competes with the section, so the reference is ambiguous', t => {
  const root = harbor(t), kb = join(dirname(root), 'knowledge'), file = join(kb, 'modules/timelock/contracts/contracts.md');
  writeFileSync(file, '# Contracts\n\n## Contract: timelock\n\nThe primary timelock uses delay 2.\n\n## Other deployment\n\n```yaml\ncontract:\n  id: timelock\n  delay: 0\n```\n');
  assert.equal(openKnowledge(kb).resolve('timelock#contract:timelock'), null);
  writeFileSync(file, '# Contracts\n\n## Contract: timelock\n\nThe primary timelock uses delay 2.\n\n```yaml\ncontract:\n  id: timelock\n  delay: 2\n```\n');
  assert.ok(openKnowledge(kb).resolve('timelock#contract:timelock'), 'a declaration inside its section is the same identity');
});

test('a whole review binds an authored chart fault before any answer has run it', t => {
  const root = harbor(t), ref = 'parts/timelock', file = join(root, ref, 'chart/blunders/unexecuted.json');
  mkdirSync(dirname(file), { recursive: true });
  copyFileSync(join(root, ref, 'chart/machine.json'), file);
  const record = syntheticReview(root, ref);
  assert.ok(record.basis.some(b => b.path === `${ref}/chart/blunders/unexecuted.json`));
  const status = () => dossier(verify(root), ref).behaviors.reviews.reviews.find((r: { file: string }) => r.file === 'reviews/synthetic.md').status;
  assert.equal(status(), 'current');
  const blunder = JSON.parse(readFileSync(file, 'utf8'));
  blunder.transitions.find((x: { event: string }) => x.event === 'execute').guard = { t: 'bool', v: true };
  writeFileSync(file, JSON.stringify(blunder, null, 2) + '\n');
  assert.equal(status(), 'stale');
});

test('retention sees an executed model change through a link into a hidden folder', t => {
  const root = harbor(t), ref = 'parts/timelock', dir = join(root, ref);
  const model = join(dir, 'model/Timelock.tla'), hidden = join(dir, 'model/.inputs/Timelock.tla');
  mkdirSync(dirname(hidden));
  renameSync(model, hidden);
  symlinkSync('.inputs/Timelock.tla', model);
  const analysis = analyzePart({ root, id: 'timelock', knowledge: knowledgeOf(root), actors: loadActors(root), includeBehaviors: false });
  const old = analysis.completed.find(a => a.entry.question.expects.includes('NotW2'))!;
  const decision = protectBehaviorAnswers(root, ref, analysis.answers, structuredClone(old.entry), old.name, [], []);
  assert.doesNotThrow(() => decision.assertStable());
  appendFileSync(hidden, '\n\\* Changed after the retention scan.\n');
  assert.throws(() => decision.assertStable(), /behavior dependencies changed/);
});

test('an answer a behavior holds by its exact question is not reported superseded, and recheck asks it again', t => {
  const root = harbor(t), ref = 'parts/token', dir = join(root, ref);
  const old = JSON.parse(readFileSync(join(dir, 'evidence/external-W1-08c91c.json'), 'utf8'));
  const file = join(dir, 'behaviors/mint-and-burn.md'), { record } = readDoc(file);
  const claim = record.claims.find((c: { id: string }) => c.id === 'C3');
  claim.mappings[0].target = { kind: 'answer', dossier: ref, question: old.question, check: 'W1' };
  writeDoc(file, record, 'Synthetic: C3 holds the external W1 answer by its exact question.');
  // A second external question, with one more executed file, stands in for the first within the dossier.
  mkdirSync(join(dir, 'calls'), { recursive: true });
  writeFileSync(join(dir, 'calls/retained.md'), 'kind: external\nrunner: replay\nexecutes:\n  - prose.md\n  - model/Token_W1.cfg\nreach: the stand-in deployment\nexpect:\n  W1: pass\nbecause: |\n  Mint, transfer and burn leave the supply at zero.\n');
  const trial = cli(root, 'trial', ref, 'retained.md');
  assert.equal(trial.status, 0, trial.stdout + trial.stderr);
  assert.match(trial.stdout, /kept evidence\/external-W1-08c91c\.json: needed by parts\/token#mint-and-burn\/C3\/M1/);
  const a = dossier(verify(root), ref);
  assert.ok(!a.flags.some((f: { name: string; entry?: string }) => f.name === 'answer superseded' && f.entry === 'external-W1-08c91c'), 'no flag promises a removal that retention refuses');
  assert.ok(!a.answers.find((r: { entry: string }) => r.entry === 'external-W1-08c91c').superseded);
  const recheck = cli(root, 'recheck', ref);
  assert.doesNotMatch(recheck.stdout, /not run: parts\/token\/evidence\/external-W1-08c91c\.json · answer superseded/);
});
