// Regression tests for behavior rules that an independent mutation review found unguarded: for each one,
// a deliberate break of the implementation left every test green. Each test here holds one rule and fails
// when the implementation breaks it. Read-only checks read Harbor (qualification/fixture) in place; anything
// that writes works on a temporary copy. Every behavior, review and assessment written here is synthetic,
// says so in its text, and claims no independent semantic judgment.
import { after, test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import type { SpawnSyncReturns } from 'node:child_process';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyAll } from '../../src/commands/verify.ts';
import { answerContext } from '../../src/commands/trial.ts';
import { publishAnswer } from '../../src/dossiers/publication.ts';
import { knowledgeOf, loadPart } from '../../src/dossiers/load.ts';
import { locate } from '../../src/dossiers/root.ts';
import { passageOf } from '../../src/trials/answers.ts';
import { requiredReviewBasis } from '../../src/behaviors/dependencies.ts';
import { loadBehaviorCollection, parseBehavior, parseCollection, reviewCoverageItems } from '../../src/behaviors/records.ts';
import { resolveTarget } from '../../src/behaviors/resolve.ts';
import { buildBehaviorReport } from '../../src/behaviors/report.ts';
import type { ClaimReport, Unassociated } from '../../src/behaviors/report.ts';
import type { Question, Readable } from '../../src/trials/answers.ts';
import type { Analysis, CompositionAnalysis, PartAnalysis } from '../../src/verify/analyze.ts';
import type { AssessmentResult, BehaviorCollection, BehaviorRecord, Claim, ClaimScope, KnowledgePin, Mapping, ReviewEvaluation, ReviewRecord, ReviewSubject } from '../../src/behaviors/types.ts';

const plugin = fileURLToPath(new URL('../../', import.meta.url));
const cli = join(plugin, 'src/cli.ts');
const fixture = join(plugin, 'qualification/fixture'), fixtureRoot = join(fixture, 'dossiers');
const SYNTHETIC = 'Synthetic test input. It claims no independent semantic judgment.';
const document = (record: unknown, body: string) => '```json\n' + JSON.stringify(record, null, 2) + '\n```\n\n' + body + '\n';
const digest = (bytes: string | Uint8Array): string => createHash('sha256').update(bytes).digest('hex');
const noReview: ReviewEvaluation = { reviews: [], assessments: [], dossierReviewed: false };

function temporary(t: TestContext): string {
  const dir = mkdtempSync(join(tmpdir(), 'dossier-behavior-obligations-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}
// A copy of Harbor to write in. Its independent reviews stay behind: these tests supply synthetic ones.
function copyHarbor(into: string): string {
  cpSync(fixture, join(into, 'fixture'), { recursive: true, filter: path => basename(path) !== 'reviews' });
  return join(into, 'fixture/dossiers');
}
const harbor = (t: TestContext): string => copyHarbor(temporary(t));

function inspect(root: string) {
  const verified = verifyAll({ root, version: '0.2.0' });
  const all: Analysis[] = [...verified.parts, ...verified.compositions];
  const byRef: Record<string, Analysis> = Object.fromEntries(all.map(a => [a.ref, a]));
  const at = (ref: string): Analysis => {
    assert.ok(byRef[ref], `the root holds ${ref}`);
    return byRef[ref];
  };
  const context = (analysis: Analysis) => ({ analysis, analyses: { ...byRef, [analysis.ref]: analysis }, knowledge: verified.knowledge });
  return { verified, all, byRef, at, context };
}
// Harbor as it stands, analyzed once and only read. Tests that vary it copy what they change.
let harborState: ReturnType<typeof inspect> | null = null;
const harborRead = () => harborState ??= inspect(fixtureRoot);
const partAt = (ref: string): PartAnalysis => { const a = harborRead().at(ref); assert.equal(a.kind, 'part'); return a as PartAnalysis; };
const compositionAt = (ref: string): CompositionAnalysis => { const a = harborRead().at(ref); assert.equal(a.kind, 'composition'); return a as CompositionAnalysis; };

// The real command, with this process's node, against the root named.
function dossier(root: string, ...args: string[]): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [cli, ...args, '--root', root], { encoding: 'utf8', env: { ...process.env, DOSSIER_ROOT: '' }, maxBuffer: 64 * 1024 * 1024 });
}
const manifest = (root: string, ref: string) => JSON.parse(readFileSync(join(root, ref, 'integrity.json'), 'utf8')) as { evidence: Record<string, string> };

// Synthetic authored records, parsed by the plugin's own parsers so that they are well formed.
const claimOf = (level: ClaimScope['level'], pins: KnowledgePin[], mappings: Mapping[]): Claim => ({
  id: 'C1', kind: 'descriptive', statement: 'The synthetic claim under test.',
  scope: { level, description: `A synthetic ${level}-level scope.`, pins }, assumptions: [], mappings,
});
const behaviorOf = (id: string, claims: Claim[]): BehaviorRecord => ({ format: 'dossier-behavior@0.2.0', id, title: `Synthetic ${id}`, claims });
function collectionOf(behaviors: BehaviorRecord[]): BehaviorCollection {
  return {
    collection: parseCollection(document({ format: 'dossier-collection@0.2.0', behaviors: behaviors.map(b => b.id) }, `# Synthetic collection\n\n${SYNTHETIC}`)),
    behaviors: behaviors.map(b => parseBehavior(document(b, `# ${b.title}\n\n${SYNTHETIC}`), b.id)),
    issues: [],
  };
}
const exactAnswer = (dossierRef: string, answer: Readable, check: string, id = 'M1'): Mapping => ({
  id, target: { kind: 'answer', dossier: dossierRef, question: answer.entry.question, check }, relation: 'supports',
  rationale: 'Synthetic mapping: the exact recorded question supplies this claim.', limitations: [],
});
// A current, fully examined dossier review given straight to the standing derivation as an explicit
// test input. Parsing and basis freshness are behavior-reviews.test.ts's concern.
function assessed(collection: BehaviorCollection, dossierRef: string, results: Record<string, AssessmentResult>): ReviewEvaluation {
  const subject: ReviewSubject = { kind: 'dossier', dossier: dossierRef, behaviors: collection.collection!.record.behaviors };
  const record: ReviewRecord = {
    format: 'dossier-review@0.2.0', subject, basis: [], replaces: [], coverage: { examined: reviewCoverageItems(subject), unexamined: [] },
    assessments: Object.entries(results).map(([mapping, result]) => ({ mapping, result, rationale: 'Synthetic assessment supplied to the standing derivation.', limitations: [] })),
  };
  const file = 'reviews/synthetic.md', sha256 = '1'.repeat(64);
  return { reviews: [{ file, record, body: SYNTHETIC, sha256, status: 'current', reasons: [], changed: { claims: [], explanations: [] } }], assessments: record.assessments.map(a => ({ ...a, review: file, reviewSha256: sha256 })), dossierReviewed: true };
}

// --- BEH-RETENTION through the publication path -------------------------------------------------------
// A second chart question on the Timelock, one that also executes the orientation, answers everything its
// recorded chart answer answers. Publishing it supersedes that answer unless a mapping still needs it.
const SUPERSEDING_CALL = 'kind: chart\nexecutes:\n  - prose.md\n  - README.md\nreach: the finite chart\nexpect:\n  checks: pass\nbecause: A second question whose answer stands in for the recorded chart answer.\n';
const PROBE = 'publication-probe';
function supersedingTrial(root: string): SpawnSyncReturns<string> {
  mkdirSync(join(root, 'parts/timelock/calls'), { recursive: true });
  writeFileSync(join(root, 'parts/timelock/calls/supersede.md'), SUPERSEDING_CALL);
  return dossier(root, 'trial', 'timelock', 'supersede.md');
}
// The Timelock's recorded chart answer, the one the second question stands in for.
function recordedChart(): Readable {
  const answer = partAt('parts/timelock').completed.find(a => a.entry.question.kind === 'chart');
  assert.ok(answer, 'Harbor records a chart answer for the Timelock');
  return answer;
}
// That trial run once through the command, on a Harbor copy where no mapping names the recorded answer.
// Its sealed bundle stays in trials/<id>/ for the tests that publish it again into fresh copies.
const shared: string[] = [];
after(() => { for (const dir of shared) rmSync(dir, { recursive: true, force: true }); });
let unprotected: { root: string; id: string; stdout: string } | null = null;
function unprotectedRun() {
  if (unprotected) return unprotected;
  const work = mkdtempSync(join(tmpdir(), 'dossier-behavior-obligations-run-'));
  shared.push(work);
  const root = copyHarbor(work), r = supersedingTrial(root);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const id = /^trial: (\S+)/m.exec(r.stdout)?.[1];
  assert.ok(id, r.stdout);
  return unprotected = { root, id, stdout: r.stdout };
}
// A Control behavior whose one claim maps targets in its member: an incoming dependency of the Timelock.
function incoming(root: string, mappings: Mapping[]): { write: (mappings: Mapping[]) => void } {
  const dir = join(root, 'compositions/control'), readme = join(dir, 'README.md');
  const collection = parseCollection(readFileSync(readme, 'utf8'));
  collection.record.behaviors.push(PROBE);
  writeFileSync(readme, document(collection.record, collection.body));
  const write = (next: Mapping[]) => writeFileSync(join(dir, `behaviors/${PROBE}.md`), document(behaviorOf(PROBE, [claimOf('model', [], next)]), `# Publication dependency\n\n${SYNTHETIC}`));
  write(mappings);
  return { write };
}

test('publication drops only what retention lets go: a superseded answer that an incoming mapping names stays published and bound', t => {
  const selected = recordedChart(), free = unprotectedRun();
  // With no mapping that names it, the new answer stands in for the recorded one and publication drops it.
  assert.match(free.stdout, new RegExp(`removed evidence/${selected.name}\\.json`));
  assert.equal(existsSync(join(free.root, 'parts/timelock/evidence', `${selected.name}.json`)), false);
  assert.equal(Object.hasOwn(manifest(free.root, 'parts/timelock').evidence, selected.name), false);
  // A Control behavior maps the exact question. Retention keeps the answer, and so must publication.
  const root = harbor(t), entry = join(root, 'parts/timelock/evidence', `${selected.name}.json`);
  incoming(root, [exactAnswer('parts/timelock', selected, 'checks')]);
  const bytes = readFileSync(entry);
  const r = supersedingTrial(root);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const published = /^answer: evidence\/(\S+)\.json · published/m.exec(r.stdout)?.[1];
  assert.ok(published && published !== selected.name, r.stdout);
  assert.match(r.stdout, new RegExp(`kept evidence/${selected.name}\\.json: needed by compositions/control#${PROBE}/C1/M1`));
  assert.doesNotMatch(r.stdout, new RegExp(`removed evidence/${selected.name}\\.json`), 'a retained answer is not also removed');
  assert.ok(existsSync(entry), 'the retained entry is still in evidence/');
  assert.equal(digest(readFileSync(entry)), digest(bytes), 'with its recorded bytes');
  const bound = manifest(root, 'parts/timelock').evidence;
  assert.equal(bound[selected.name], digest(bytes), 'and the manifest still binds it');
  assert.ok(bound[published], 'beside the answer just published');
  const after = inspect(root);
  const claim = after.at('compositions/control').behaviors?.behaviors.find(b => b.id === PROBE)?.claims[0];
  assert.ok(claim, 'the incoming behavior is reported');
  assert.equal(claim.mappings[0].evidence.freshness, 'current', 'its target still resolves to the exact answer');
  assert.equal(claim.mappings[0].evidence.available, true);
  assert.deepEqual(after.at('parts/timelock').tripwires, []);
});

test('publication runs retention\'s stability check before it commits the manifest: a mapping added during the write refuses it with the answer kept and bound', t => {
  const selected = recordedChart(), free = unprotectedRun();
  const root = harbor(t), dir = join(root, 'parts/timelock');
  const behavior = incoming(root, []);
  // The run's sealed bundle waits in .running/, as the runner leaves it when it starts to publish.
  cpSync(join(free.root, 'parts/timelock/trials', free.id), join(dir, '.running', free.id), { recursive: true });
  const before = readFileSync(join(dir, 'integrity.json'), 'utf8'), entries = readdirSync(join(dir, 'evidence')).sort();
  const bytes = readFileSync(join(dir, 'evidence', `${selected.name}.json`));
  assert.equal(JSON.parse(before).evidence[selected.name], digest(bytes));
  const context = answerContext(locate(root, 'timelock')!, loadPart(root, 'timelock'), dir, { root, knowledge: knowledgeOf(root) });
  const stages: string[] = [];
  let dropping: { superseded?: string[] } = {};
  assert.throws(() => publishAnswer(dir, free.id, context, {
    boundary(stage) {
      stages.push(stage);
      if (stage !== 'manifest:temporary-written') return;
      // Retention has let the recorded answer go: the publication listed it beside the bundle, and the
      // manifest without it is written but not yet committed. Meanwhile Control comes to map that answer.
      dropping = JSON.parse(readFileSync(join(dir, '.running', `${free.id}.dropped.json`), 'utf8'));
      behavior.write([exactAnswer('parts/timelock', selected, 'checks')]);
    },
  }), /behavior dependencies changed/);
  assert.ok(stages.includes('manifest:temporary-written'), `the mapping changed while the manifest was written: ${stages.join(', ')}`);
  assert.ok(dropping.superseded?.includes(selected.name), `the publication was about to drop ${selected.name}: ${JSON.stringify(dropping)}`);
  assert.ok(!stages.includes('manifest:replaced'), 'the manifest is never replaced');
  assert.equal(readFileSync(join(dir, 'integrity.json'), 'utf8'), before, 'authority is as it was');
  assert.deepEqual(readdirSync(join(dir, 'evidence')).sort(), entries, 'no entry is placed or removed');
  assert.equal(digest(readFileSync(join(dir, 'evidence', `${selected.name}.json`))), digest(bytes), 'the answer is kept');
  assert.equal(manifest(root, 'parts/timelock').evidence[selected.name], digest(bytes), 'and bound');
});

// --- BEH-STANDING ---------------------------------------------------------------------------------------
test('a TLC, Alloy or bounded Apalache answer stays bounded-model evidence; only an inductive Apalache answer is inductive-model', () => {
  const h = harborRead(), seen = new Map<string, number>();
  for (const a of h.all) for (const read of a.completed) {
    const q = read.entry.question;
    if (q.kind === 'blunder') continue;
    const inductive = q.checker === 'apalache' && read.entry.answer.mode === 'inductive';
    for (const check of q.expects) {
      const where = `${a.ref}/evidence/${read.name}.json, ${check}`, id = passageOf(check);
      const property = ['tlc', 'alloy', 'apalache'].includes(q.checker) && Boolean(id && /^[AON][1-9]\d*$/.test(id));
      const deciding = resolveTarget({ kind: 'answer', dossier: a.ref, question: q, check }, h.context(a)).evidence.find(e => e.deciding && e.entry === read.name);
      // A chart, an external runner, a walk or a type check is never inductive either.
      if (!property) { if (deciding && !inductive) assert.notEqual(deciding.kind, 'inductive-model', where); continue; }
      assert.ok(deciding, where);
      assert.equal(deciding.kind, inductive ? 'inductive-model' : 'bounded-model', where);
      const category = q.checker === 'apalache' ? `apalache ${read.entry.answer.mode}` : q.checker;
      seen.set(category, (seen.get(category) || 0) + 1);
    }
  }
  for (const category of ['tlc', 'alloy', 'apalache bounded', 'apalache inductive']) assert.ok(seen.get(category), `Harbor holds a ${category} answer to a property`);
  // The same kinds reach a cell's evidence: a TLC check and a bounded Apalache counterexample.
  for (const [ref, property, scenario, checker] of [['compositions/control', 'N1', 'all-honest', 'tlc'], ['compositions/upkeep', 'N1', 'lanes-offline', 'apalache']] as const) {
    const deciding = resolveTarget({ kind: 'cell', dossier: ref, property, scenario }, h.context(h.at(ref))).evidence.filter(e => e.deciding);
    assert.deepEqual(deciding.map(e => [e.checker, e.kind]), [[checker, 'bounded-model']], `${ref} ${property} × ${scenario}`);
  }
});

test('a deployment-scope claim with only model evidence and a supporting review stays a hypothesis, as a source-scope claim does', () => {
  const h = harborRead(), timelock = partAt('parts/timelock');
  const record = h.verified.knowledge.resolve('timelock#observation:delay-check-2026-11-01');
  assert.ok(record, 'Harbor\'s knowledge base resolves the pinned observation');
  const pin: KnowledgePin = { ref: record.ref, revision: `sha256:${record.sha256}` };
  const witness: Mapping = { id: 'M1', target: { kind: 'walk', dossier: timelock.ref, id: 'W2', scenario: null }, relation: 'supports', rationale: 'Synthetic mapping: W2 records the stated path in the model.', limitations: [] };
  const claimAt = (level: ClaimScope['level'], pins: KnowledgePin[]): ClaimReport => {
    const collection = collectionOf([behaviorOf('scoped-witness', [claimOf(level, pins, [witness])])]);
    const reviews = assessed(collection, timelock.ref, { 'scoped-witness/C1/M1': 'supported' });
    return buildBehaviorReport({ ...h.context(timelock), collection, reviews }).behaviors[0].claims[0];
  };
  assert.equal(claimAt('model', []).standing, 'supported', 'at model scope the reviewed witness supports the claim');
  for (const level of ['deployment', 'source'] as const) {
    const claim = claimAt(level, [pin]);
    assert.equal(claim.freshness, 'current', `${level}: the pin and the evidence are current`);
    assert.deepEqual(claim.mappings[0].assessment.results, ['supported'], `${level}: the review supports the mapping`);
    assert.equal(claim.standing, 'hypothesis', `${level}: model evidence alone does not reach ${level} scope`);
    assert.ok(claim.limitations.some(l => /does not establish source or deployment correspondence/.test(l)), `${level}: the report says why`);
  }
});

test('a claim with one current supported mapping and another stale one is not supported, and its freshness is stale', () => {
  const h = harborRead(), timelock = partAt('parts/timelock');
  const answerFor = (check: string): Readable => {
    const answer = timelock.completed.find(a => a.entry.question.kind !== 'blunder' && a.entry.question.expects.includes(check));
    assert.ok(answer, check);
    return answer;
  };
  const w1 = answerFor('NotW1'), w2 = answerFor('NotW2');
  const changed = Object.keys(w1.entry.basis.executed).find(path => !Object.hasOwn(w2.entry.basis.executed, path));
  assert.ok(changed, 'the W1 answer executed a file the W2 answer did not');
  // In memory only: that file is as if edited since the W1 trial ran.
  const edited = { ...timelock, files: { ...timelock.files, [changed]: 'f'.repeat(64) } } as PartAnalysis;
  const claimWith = (mappings: Mapping[]): ClaimReport => {
    const collection = collectionOf([behaviorOf('mixed-support', [claimOf('model', [], mappings)])]);
    const reviews = assessed(collection, timelock.ref, Object.fromEntries(mappings.map(m => [`mixed-support/C1/${m.id}`, 'supported' as const])));
    return buildBehaviorReport({ ...h.context(edited), collection, reviews }).behaviors[0].claims[0];
  };
  const current = exactAnswer(timelock.ref, w2, 'NotW2', 'M1'), stale = exactAnswer(timelock.ref, w1, 'NotW1', 'M2');
  const alone = claimWith([current]);
  assert.equal(alone.freshness, 'current');
  assert.equal(alone.standing, 'supported', 'the current mapping alone supports the claim');
  const mixed = claimWith([current, stale]);
  assert.deepEqual(mixed.mappings.map(m => m.evidence.freshness), ['current', 'stale']);
  assert.deepEqual(mixed.mappings.map(m => m.assessment.results), [['supported'], ['supported']]);
  assert.equal(mixed.freshness, 'stale');
  assert.ok(mixed.reasons.some(r => r.includes(changed)), mixed.reasons.join('; '));
  assert.notEqual(mixed.standing, 'supported', 'a stale declared dependency withholds support');
  assert.notEqual(mixed.label, 'supported within the stated scope');
});

// --- BEH-TARGET -----------------------------------------------------------------------------------------
test('a partial check is not admissible and makes no target available', () => {
  const h = harborRead();
  // Harbor's own partial checks: TLC stops at the counterexample a walk or a violation calls for, so the
  // TypeOK check beside it is checked only in part.
  const cases: [string, (q: Question) => boolean, string][] = [
    ['parts/timelock', q => q.expects.includes('NotW2'), 'NotW2'],
    ['compositions/control', q => q.property === 'N1' && q.scenario === 'executor-offline', 'N1'],
  ];
  for (const [ref, matches, complete] of cases) {
    const analysis = h.at(ref);
    const answer = analysis.completed.find(a => a.entry.question.kind !== 'blunder' && matches(a.entry.question));
    assert.ok(answer, ref);
    assert.ok(answer.entry.answer.partial?.includes('TypeOK'), `${ref}/evidence/${answer.name}.json records TypeOK as partial`);
    const target = (check: string) => resolveTarget({ kind: 'answer', dossier: ref, question: answer.entry.question, check }, h.context(analysis));
    const partial = target('TypeOK'), selected = partial.evidence.find(e => e.deciding);
    assert.equal(partial.freshness, 'current', ref);
    assert.ok(selected, ref);
    assert.equal(selected.admissible, false, `${ref}: a partial check is not admissible`);
    assert.ok(selected.limitations.some(l => /partial/.test(l)), `${ref}: the evidence says it is partial`);
    assert.equal(partial.available, false, `${ref}: and supplies no available target`);
    assert.equal(target(complete).available, true, `${ref}: the same answer's complete check stays available`);
  }
  // A cell whose deciding answer checked its property only in part (an in-memory variant of Harbor's).
  const control = compositionAt('compositions/control');
  const cell = { kind: 'cell', dossier: control.ref, property: 'N1', scenario: 'all-honest' } as const;
  const decided = control.completed.find(a => a.entry.question.kind !== 'blunder' && a.entry.question.property === 'N1' && a.entry.question.scenario === 'all-honest');
  assert.ok(decided);
  assert.equal(resolveTarget(cell, h.context(control)).available, true);
  const check = Object.keys(decided.entry.answer.outcomes).find(name => passageOf(name) === 'N1');
  assert.ok(check);
  const narrowed = structuredClone(decided);
  narrowed.entry.answer.partial = [check];
  const swapped = { ...control, answers: control.answers.map(a => a.name === decided.name ? narrowed : a), completed: control.completed.map(a => a.name === decided.name ? narrowed : a) } as CompositionAnalysis;
  const r = resolveTarget(cell, h.context(swapped)), deciding = r.evidence.find(e => e.deciding);
  assert.ok(deciding);
  assert.equal(deciding.admissible, false);
  assert.equal(r.available, false, 'a cell decided by a partial check is not available');
  assert.equal(resolveTarget({ kind: 'answer', dossier: control.ref, question: narrowed.entry.question, check }, h.context(swapped)).available, false);
});

test('a cell target under an unknown scenario resolves as missing, with no formal mark', () => {
  const h = harborRead(), control = compositionAt('compositions/control');
  const cell = (property: string, scenario: string) => resolveTarget({ kind: 'cell', dossier: control.ref, property, scenario }, h.context(control));
  const known = cell('N1', 'all-honest');
  assert.equal(known.freshness, 'current');
  assert.ok(known.formal?.mark, 'the property has a cell under a scenario it names');
  // O1 names only all-honest, so governance-captured is a scenario it has no cell under.
  assert.ok(!control.cells.some(c => c.property === 'O1' && c.scenario === 'governance-captured'));
  for (const [property, scenario] of [['N1', 'typo-scenario'], ['O1', 'governance-captured']]) {
    const r = cell(property, scenario), where = `${property} × ${scenario}`;
    assert.equal(r.freshness, 'missing', where);
    assert.equal(r.formal, null, `${where}: no formal mark is borrowed from another scenario`);
    assert.equal(r.available, false, where);
    assert.deepEqual(r.evidence, [], where);
    assert.deepEqual(r.owner, [], where);
    assert.match(r.reasons.join('; '), /does not exist/, where);
  }
});

// --- REVIEW-OWED ----------------------------------------------------------------------------------------
test('a fully examined, current dossier review whose assessments are inconclusive or contested does not clear review owed', t => {
  const root = harbor(t), ref = 'compositions/control';
  const { verified, byRef, at } = inspect(root), analysis = at(ref), collection = analysis.behaviorCollection!;
  assert.deepEqual(collection.issues, []);
  const subject: ReviewSubject = { kind: 'dossier', dossier: ref, behaviors: collection.collection!.record.behaviors };
  const closure = requiredReviewBasis(subject, { root, analysis, analyses: byRef, knowledge: verified.knowledge, collection });
  assert.deepEqual(closure.issues, []);
  const mappings = collection.behaviors.flatMap(b => b.record.claims.flatMap(c => c.mappings.map(m => `${b.record.id}/${c.id}/${m.id}`)));
  assert.ok(mappings.length > 1);
  const write = (file: string, result: (index: number) => AssessmentResult) => {
    const record: ReviewRecord = {
      format: 'dossier-review@0.2.0', subject, basis: closure.files, coverage: { examined: reviewCoverageItems(subject), unexamined: [] }, replaces: [],
      assessments: mappings.map((mapping, i) => ({ mapping, result: result(i), rationale: 'Synthetic assessment: this test exercises review debt, not the connection.', limitations: [] })),
    };
    mkdirSync(join(analysis.dir, 'reviews'), { recursive: true });
    writeFileSync(join(analysis.dir, file), document(record, `# Synthetic review\n\n${SYNTHETIC}`));
  };
  const state = () => {
    const a = inspect(root).at(ref);
    return { reviews: Object.fromEntries(a.reviews.map(r => [r.file, r.status])), owed: a.reviewOwed, flagged: a.flags.some(f => f.name === 'review owed'), route: a.route.pass };
  };
  // The control case: conclusive, uncontested assessments in a fully examined current review clear the debt.
  write('reviews/synthetic-first.md', () => 'supported');
  let s = state();
  assert.deepEqual(s.reviews, { 'reviews/synthetic-first.md': 'current' });
  assert.equal(s.owed, null);
  const inconclusive: [string, (index: number) => AssessmentResult][] = [
    ['every assessment inconclusive', () => 'inconclusive'],
    ['one assessment inconclusive', i => i === 0 ? 'inconclusive' : 'supported'],
  ];
  for (const [why, result] of inconclusive) {
    write('reviews/synthetic-first.md', result);
    s = state();
    assert.deepEqual(s.reviews, { 'reviews/synthetic-first.md': 'current' }, `${why}: the review is current and fully examined`);
    assert.ok(s.owed, `${why}: the review stays owed`);
    assert.ok(s.flagged, why);
    assert.equal(s.route, 'Review', why);
  }
  // Contested: two current, fully examined dossier reviews disagree on one mapping.
  write('reviews/synthetic-first.md', () => 'supported');
  write('reviews/synthetic-second.md', i => i === 0 ? 'too-broad' : 'supported');
  s = state();
  assert.deepEqual(s.reviews, { 'reviews/synthetic-first.md': 'current', 'reviews/synthetic-second.md': 'current' });
  assert.ok(s.owed, 'contested assessments leave the review owed');
  assert.ok(s.flagged);
  assert.equal(s.route, 'Review');
});

// --- BEH-FRESHNESS: the command a reviewer copies the basis from -----------------------------------------
test('dossier review-basis --json prints the same non-empty basis that requiredReviewBasis computes', () => {
  const h = harborRead();
  for (const [ref, behavior] of [['parts/timelock', null], ['parts/timelock', 'cancel-plan'], ['compositions/control', null]] as const) {
    const where = `${ref}${behavior ? ` --behavior ${behavior}` : ''}`;
    // review-basis writes nothing, so it reads Harbor in place.
    const r = dossier(fixtureRoot, 'review-basis', ref, ...(behavior ? ['--behavior', behavior] : []), '--json');
    assert.equal(r.status, 0, `${where}: ${r.stderr}`);
    const printed = JSON.parse(r.stdout) as { subject: ReviewSubject; basis: unknown[]; coverageItems: string[]; issues: string[] };
    const analysis = h.at(ref), collection = analysis.behaviorCollection!;
    const subject: ReviewSubject = { kind: behavior ? 'behavior' : 'dossier', dossier: ref, behaviors: behavior ? [behavior] : collection.collection!.record.behaviors };
    const closure = requiredReviewBasis(subject, { root: fixtureRoot, analysis, analyses: h.byRef, knowledge: h.verified.knowledge, collection });
    assert.deepEqual(closure.issues, [], where);
    assert.ok(closure.files.length > 0, `${where}: the subject rests on files`);
    assert.deepEqual(printed.subject, subject, where);
    assert.ok(printed.basis.length > 0, `${where}: the command prints the basis`);
    assert.deepEqual(printed.basis, closure.files, `${where}: exactly the one the tool computes`);
    assert.deepEqual(printed.coverageItems, reviewCoverageItems(subject), where);
    assert.deepEqual(printed.issues, [], where);
  }
});

// --- BEH-FORMAT -----------------------------------------------------------------------------------------
test('a collection with an unknown format identifier is refused', t => {
  const readme = (format: string) => document({ format, behaviors: [] }, `# Synthetic collection\n\n${SYNTHETIC}`);
  assert.equal(parseCollection(readme('dossier-collection@0.2.0')).record.format, 'dossier-collection@0.2.0');
  const work = temporary(t);
  for (const [i, format] of ['dossier-collection@9.9.9', 'dossier-collection@0.1.0', 'dossier-collection', 'dossier-behavior@0.2.0'].entries()) {
    assert.throws(() => parseCollection(readme(format)), /collection\.format/, format);
    const dir = join(work, `parts/demo${i}`);
    mkdirSync(join(dir, 'behaviors'), { recursive: true });
    writeFileSync(join(dir, 'README.md'), readme(format));
    const loaded = loadBehaviorCollection(dir);
    assert.equal(loaded.collection, null, format);
    assert.ok(loaded.issues.some(issue => issue.path === 'README.md' && /collection\.format/.test(issue.message)), `${format}: ${JSON.stringify(loaded.issues)}`);
  }
  // Verify reports such a collection as a tripwire instead of reading it.
  const root = harbor(t), path = join(root, 'parts/timelock/README.md'), text = readFileSync(path, 'utf8');
  assert.ok(text.includes('"dossier-collection@0.2.0"'));
  writeFileSync(path, text.replace('"dossier-collection@0.2.0"', '"dossier-collection@9.9.9"'));
  const timelock = inspect(root).at('parts/timelock');
  assert.ok(timelock.tripwires.some(w => w.name === 'invalid behavior collection' && /README\.md/.test(w.where) && /collection\.format/.test(w.where)), JSON.stringify(timelock.tripwires));
});

// --- BEH-COVERAGE ---------------------------------------------------------------------------------------
test('a composition\'s report lists its unassociated cells, walks and scenarios', () => {
  const h = harborRead(), control = compositionAt('compositions/control'), authored = control.behaviorCollection!;
  assert.deepEqual(authored.issues, []);
  assert.ok(control.cells.length > 0 && control.walks.length > 0, 'Control has cells and walks under scenarios');
  const reported = (collection: BehaviorCollection) => {
    const unassociated = buildBehaviorReport({ ...h.context(control), collection, reviews: noReview }).coverage.unassociated;
    const of = (kind: Unassociated['kind']) => unassociated.filter(u => u.kind === kind && u.scenario !== null).map(u => kind === 'scenario' ? u.id : `${u.id} × ${u.scenario}`).sort();
    return { cells: of('cell'), walks: of('walk'), scenarios: of('scenario') };
  };
  const keeping = (behaviors: string[]) => {
    const collection = structuredClone(authored);
    for (const b of collection.behaviors) if (!behaviors.includes(b.record.id)) for (const c of b.record.claims) c.mappings = [];
    return collection;
  };
  const cells = control.cells.map(c => `${c.property} × ${c.scenario}`), walks = control.walks.map(w => `${w.id} × ${w.scenario}`);
  const scenarios = [...new Set([...control.cells.map(c => c.scenario), ...control.walks.map(w => w.scenario)])];
  // No behavior associates anything: every cell, walk and scenario is listed.
  assert.deepEqual(reported(keeping([])), { cells: [...cells].sort(), walks: [...walks].sort(), scenarios: [...scenarios].sort() });
  // Only the emergency halt is associated: its cells and scenarios leave the list, and the rest stay.
  const halt = authored.behaviors.find(b => b.record.id === 'emergency-halt');
  assert.ok(halt, 'Control explains its emergency halt');
  const targets = halt.record.claims.flatMap(c => c.mappings.map(m => m.target)).flatMap(t => t.kind === 'cell' ? [t] : []);
  assert.ok(targets.length > 0);
  const associated = new Set(targets.map(t => `${t.property} × ${t.scenario}`)), named = new Set(targets.map(t => t.scenario));
  const some = reported(keeping(['emergency-halt']));
  assert.deepEqual(some.cells, cells.filter(c => !associated.has(c)).sort());
  assert.deepEqual(some.walks, [...walks].sort());
  assert.deepEqual(some.scenarios, scenarios.filter(s => !named.has(s)).sort());
  assert.ok(some.cells.length > 0 && some.cells.length < cells.length);
});

test('an empty collection\'s report says coverage is not complete', t => {
  const h = harborRead(), empty = collectionOf([]);
  for (const ref of ['parts/timelock', 'compositions/control']) {
    const report = buildBehaviorReport({ ...h.context(h.at(ref)), collection: empty, reviews: noReview });
    assert.deepEqual(report.behaviors, [], ref);
    assert.equal(report.summary.behaviors, 0, ref);
    assert.equal(report.coverage.complete, false, `${ref}: an empty collection explains nothing in full`);
    assert.ok(report.coverage.unassociated.length > 0, `${ref}: and leaves everything unassociated`);
  }
  // As verify reports a dossier whose authored collection is empty.
  const root = harbor(t), dir = join(root, 'parts/timelock');
  writeFileSync(join(dir, 'README.md'), document({ format: 'dossier-collection@0.2.0', behaviors: [] }, `# Timelock\n\n${SYNTHETIC} The collection is emptied.`));
  for (const name of readdirSync(join(dir, 'behaviors'))) unlinkSync(join(dir, 'behaviors', name));
  const timelock = inspect(root).at('parts/timelock');
  assert.deepEqual(timelock.behaviorCollection?.issues, []);
  assert.equal(timelock.behaviors?.summary.behaviors, 0);
  assert.equal(timelock.behaviors?.coverage.complete, false);
});

// --- Reader and writer conformance: the ledger view -----------------------------------------------------
test('a freshly rendered ledger carries the behavior section with a link per behavior', t => {
  const root = harbor(t);
  const dirs = ['parts', 'compositions'].flatMap(kind => readdirSync(join(root, kind)).sort().map(id => join(root, kind, id)));
  // The committed views go first, so every ledger read below is one this render wrote.
  for (const dir of dirs) unlinkSync(join(dir, 'ledger.md'));
  unlinkSync(join(root, 'index.md'));
  const r = dossier(root, 'render');
  assert.equal(r.status, 0, r.stdout + r.stderr);
  let behaviors = 0;
  for (const dir of dirs) {
    const where = `${basename(dirname(dir))}/${basename(dir)}`;
    const ledger = readFileSync(join(dir, 'ledger.md'), 'utf8'), json = ledger.lastIndexOf('\n```json\n');
    assert.ok(json > 0, `${where}: the ledger ends with its machine form`);
    const markdown = ledger.slice(0, json), collection = loadBehaviorCollection(dir);
    assert.deepEqual(collection.issues, [], where);
    assert.ok(collection.behaviors.length > 0, `${where}: Harbor explains every dossier`);
    assert.match(markdown, /^## Behaviors$/m, `${where}: the ledger has its behavior section`);
    const links = [...markdown.matchAll(/^### \[([^\]\n]+)\]\(behaviors\/([^)\s]+)\.md\)$/gm)].map(m => [m[2], m[1]]);
    assert.deepEqual(links, collection.behaviors.map(b => [b.record.id, b.record.title]), `${where}: one link per behavior, titled and in reading order`);
    for (const b of collection.behaviors) for (const c of b.record.claims) assert.ok(markdown.includes(`\n- ${c.id}: ${c.statement} — `), `${where}: ${b.record.id}/${c.id} is listed`);
    behaviors += links.length;
  }
  assert.ok(behaviors > 0);
});
