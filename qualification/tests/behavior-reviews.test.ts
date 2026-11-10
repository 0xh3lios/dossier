import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { evaluateReviews } from '../../src/behaviors/reviews.ts';
import { behaviorParts, loadBehaviorCollection, parseReview, recordDigest, reviewCoverageItems } from '../../src/behaviors/records.ts';
import type { AssessmentResult, BehaviorRecord, ReviewBasisEntry, ReviewRecord, ReviewSubject } from '../../src/behaviors/types.ts';

const doc = (record: unknown, body = '# Review\n\nThe named artifacts were read for the declared scope.\n') => '```json\n' + JSON.stringify(record, null, 2) + '\n```\n\n' + body;
function fixture(t: { after: (fn: () => void) => void }) {
  const work = mkdtempSync(join(tmpdir(), 'behavior-review-')); t.after(() => rmSync(work, { recursive: true, force: true }));
  const root = join(work, 'dossiers'), knowledge = join(work, 'knowledge'), dossier = 'parts/timelock', dir = join(root, dossier);
  mkdirSync(join(dir, 'behaviors'), { recursive: true }); mkdirSync(join(dir, 'reviews')); mkdirSync(knowledge);
  writeFileSync(join(root, 'dossier.json'), JSON.stringify({ plugin: '0.2.0', storage: 'integrity-v1', knowledge: { root: '../knowledge' } }));
  writeFileSync(join(dir, 'README.md'), doc({ format: 'dossier-collection@0.2.0', behaviors: ['cancel-plan'] }, '# Timelock\n\nRead cancellation first.\n'));
  const behavior: BehaviorRecord = { format: 'dossier-behavior@0.2.0', id: 'cancel-plan', title: 'Cancel a plan', claims: [{ id: 'C1', kind: 'descriptive', statement: 'The walk cancels a plan.', scope: { level: 'model', description: 'The W2 path.', pins: [] }, assumptions: [], mappings: [{ id: 'M1', target: { kind: 'walk', dossier, id: 'W2', scenario: null }, relation: 'supports', rationale: 'The path contains cancellation.', limitations: ['One path only.'] }] }] };
  const writeBehavior = () => writeFileSync(join(dir, 'behaviors/cancel-plan.md'), doc(behavior, '# Cancellation\n\nGovernance can cancel a waiting plan.\n'));
  writeBehavior(); writeFileSync(join(dir, 'prose.md'), '[W2] cancel.\n');
  const requiredPaths = ['dossier.json', `${dossier}/README.md`, `${dossier}/behaviors/cancel-plan.md`, `${dossier}/prose.md`];
  // A subject behavior file's entry binds its parts too, as review-basis prints them.
  const basis = (path: string, which: 'dossiers' | 'knowledge' = 'dossiers', role: 'required' | 'additional' = 'required'): ReviewBasisEntry => {
    const text = readFileSync(join(which === 'dossiers' ? root : knowledge, path), 'utf8'), entry: ReviewBasisEntry = { role, root: which, path, sha256: recordDigest(text) };
    return which === 'dossiers' && path === `${dossier}/behaviors/cancel-plan.md` ? { ...entry, ...behaviorParts(text) } : entry;
  };
  const requiredBasis = (_subject: ReviewSubject) => ({ files: requiredPaths.map(p => basis(p)), issues: [] as string[] });
  const makeReview = (result: AssessmentResult = 'supported', kind: 'behavior' | 'dossier' = 'behavior'): ReviewRecord => {
    const subject: ReviewSubject = { kind, dossier, behaviors: ['cancel-plan'] };
    return { format: 'dossier-review@0.2.0', subject, basis: requiredBasis(subject).files, coverage: { examined: reviewCoverageItems(subject), unexamined: [] }, replaces: [], assessments: behavior.claims.flatMap(c => c.mappings.map(m => ({ mapping: `${behavior.id}/${c.id}/${m.id}`, result, rationale: 'The exact path has the claimed outcome.', limitations: ['Only this path is asserted.'] }))) };
  };
  const write = (file: string, record: ReviewRecord) => { const text = doc(record); writeFileSync(join(dir, file), text); return recordDigest(text); };
  const evaluate = (knowledgeRoot: string | null = knowledge) => evaluateReviews({ root, dossier, collection: loadBehaviorCollection(dir), knowledgeRoot, requiredBasis });
  return { work, root, knowledge, dossier, dir, behavior, writeBehavior, requiredPaths, basis, makeReview, write, evaluate, requiredBasis };
}

test('a current focused review contributes assessments without clearing whole-dossier review', t => {
  const f = fixture(t); f.write('reviews/cancel.md', f.makeReview());
  const result = f.evaluate();
  assert.equal(result.reviews[0].status, 'current');
  assert.equal(result.assessments[0].result, 'supported');
  assert.equal(result.dossierReviewed, false);
  f.write('reviews/dossier.md', f.makeReview('supported', 'dossier'));
  assert.equal(f.evaluate().dossierReviewed, true);
});

// spec/review.md: a review binds each subject claim by digest. A changed explanation keeps every
// assessment in effect, and the dossier review no longer clears what the dossier owes.
test('a changed explanation keeps the assessments in effect, and the dossier review no longer clears the debt', t => {
  const f = fixture(t); f.write('reviews/dossier.md', f.makeReview('supported', 'dossier'));
  const before = readFileSync(join(f.dir, 'reviews/dossier.md'), 'utf8');
  assert.equal(f.evaluate().dossierReviewed, true);
  writeFileSync(join(f.dir, 'behaviors/cancel-plan.md'), readFileSync(join(f.dir, 'behaviors/cancel-plan.md'), 'utf8') + '\nA clarification.\n');
  const result = f.evaluate();
  assert.equal(result.reviews[0].status, 'current');
  assert.deepEqual(result.reviews[0].changed, { claims: [], explanations: ['cancel-plan'] });
  assert.deepEqual(result.assessments.map(a => a.mapping), ['cancel-plan/C1/M1'], 'the assessment stays in effect');
  assert.equal(result.dossierReviewed, false, 'what the review examined is no longer the behavior as it stands');
  assert.equal(readFileSync(join(f.dir, 'reviews/dossier.md'), 'utf8'), before, 'nothing rewrites the review');
});

test('a changed claim takes only its own assessments out of effect; an added claim has none, a removed one takes its own', t => {
  const f = fixture(t);
  f.behavior.claims.push({ ...f.behavior.claims[0], id: 'C2', statement: 'The walk also refuses a late execute.' }); f.writeBehavior();
  f.write('reviews/cancel.md', f.makeReview());
  assert.deepEqual(f.evaluate().assessments.map(a => a.mapping).sort(), ['cancel-plan/C1/M1', 'cancel-plan/C2/M1']);
  f.behavior.claims[1].statement = 'The walk refuses a late execute and sends nothing.'; f.writeBehavior();
  let result = f.evaluate();
  assert.equal(result.reviews[0].status, 'current');
  assert.deepEqual(result.reviews[0].changed, { claims: ['cancel-plan/C2'], explanations: [] });
  assert.deepEqual(result.assessments.map(a => a.mapping), ['cancel-plan/C1/M1']);
  f.behavior.claims[1].statement = 'The walk also refuses a late execute.'; f.behavior.claims.push({ ...f.behavior.claims[0], id: 'C3' }); f.writeBehavior();
  result = f.evaluate();
  assert.deepEqual(result.reviews[0].changed.claims, ['cancel-plan/C3']);
  assert.deepEqual(result.assessments.map(a => a.mapping).sort(), ['cancel-plan/C1/M1', 'cancel-plan/C2/M1']);
  f.behavior.claims.splice(1, 2); f.writeBehavior();
  result = f.evaluate();
  assert.deepEqual(result.reviews[0].changed.claims, ['cancel-plan/C2']);
  assert.deepEqual(result.assessments.map(a => a.mapping), ['cancel-plan/C1/M1']);
});

test('a subject behavior file\'s entry binds parts that are that file\'s, and no other entry binds any', t => {
  const f = fixture(t), review = f.makeReview(), entry = review.basis.find(b => b.path.endsWith('/cancel-plan.md'))!;
  f.write('reviews/cancel.md', { ...review, basis: review.basis.map(b => b === entry ? { ...b, claims: { C1: 'a'.repeat(64) } } : b) });
  const result = f.evaluate();
  assert.equal(result.reviews[0].status, 'invalid');
  assert.match(result.reviews[0].reasons.join(' '), /claims and explanation bound for parts\/timelock\/behaviors\/cancel-plan\.md are not that file's/);
  const { claims: _claims, explanation: _explanation, ...bare } = entry;
  assert.throws(() => parseReview(doc({ ...review, basis: review.basis.map(b => b === entry ? bare : b) })), /must bind its claims and explanation/);
  assert.throws(() => parseReview(doc({ ...review, basis: review.basis.map(b => b.path === 'dossier.json' ? { ...b, claims: entry.claims, explanation: entry.explanation } : b) })), /only the entry for a subject behavior file/);
});

test('newly required evidence stales a review even when every old basis file survives', t => {
  const f = fixture(t); f.write('reviews/cancel.md', f.makeReview());
  mkdirSync(join(f.dir, 'evidence')); writeFileSync(join(f.dir, 'evidence/new.json'), '{}\n');
  f.requiredPaths.push(`${f.dossier}/evidence/new.json`);
  const result = f.evaluate();
  assert.equal(result.reviews[0].status, 'stale');
  assert.match(result.reviews[0].reasons.join(' '), /required basis lacks current dependencies: dossiers:parts\/timelock\/evidence\/new.json/);
});

test('an additional fingerprint stays material and cannot substitute for a required one', t => {
  const f = fixture(t); writeFileSync(join(f.knowledge, 'source.sol'), 'version one');
  const review = f.makeReview(); review.basis.push(f.basis('source.sol', 'knowledge', 'additional'));
  f.write('reviews/cancel.md', review); assert.equal(f.evaluate().reviews[0].status, 'current');
  writeFileSync(join(f.knowledge, 'source.sol'), 'version two');
  assert.equal(f.evaluate().reviews[0].status, 'stale');
  review.basis = f.makeReview().basis; review.basis[0].role = 'additional';
  f.write('reviews/cancel.md', review);
  assert.match(f.evaluate().reviews[0].reasons.join(' '), /required basis lacks current dependencies: dossiers:dossier\.json/);
});

test('a file the tool required once and no longer requires still binds the review, as an additional file does', t => {
  const f = fixture(t); mkdirSync(join(f.dir, 'evidence')); writeFileSync(join(f.dir, 'evidence/old.json'), '{}\n');
  f.requiredPaths.push(`${f.dossier}/evidence/old.json`);
  f.write('reviews/cancel.md', f.makeReview());
  f.requiredPaths.pop();
  assert.equal(f.evaluate().reviews[0].status, 'current', 'a narrower required set stales no review by itself');
  writeFileSync(join(f.dir, 'evidence/old.json'), '{"changed":true}\n');
  assert.match(f.evaluate().reviews[0].reasons.join(' '), /changed dossiers:parts\/timelock\/evidence\/old.json/);
  rmSync(join(f.dir, 'evidence/old.json'));
  assert.equal(f.evaluate().reviews[0].status, 'stale', 'and a file it read that has gone stales it');
});

test('a ledger or the index in a basis binds nothing, since every render rewrites them', t => {
  const f = fixture(t); writeFileSync(join(f.dir, 'ledger.md'), '# Ledger\n'); writeFileSync(join(f.root, 'index.md'), '# Index\n');
  const review = f.makeReview(); review.basis.push(f.basis(`${f.dossier}/ledger.md`, 'dossiers', 'additional'), f.basis('index.md', 'dossiers', 'additional'));
  f.write('reviews/cancel.md', review);
  writeFileSync(join(f.dir, 'ledger.md'), '# Ledger\n\nrendered again\n'); writeFileSync(join(f.root, 'index.md'), '# Index, rendered again\n');
  assert.equal(f.evaluate().reviews[0].status, 'current');
});

// spec/review.md: dossier.json resolves nothing a judgment rests on, so a review that bound it, as
// reviews did before it left the required basis, stays current when it changes.
test('dossier.json in a basis binds nothing, since no judgment rests on it', t => {
  const f = fixture(t); f.write('reviews/cancel.md', f.makeReview());
  writeFileSync(join(f.root, 'dossier.json'), JSON.stringify({ plugin: '0.2.0', storage: 'integrity-v1', knowledge: { root: '../knowledge' }, external: { runner: { command: ['sh', 'run.sh'] } } }));
  const result = f.evaluate();
  assert.equal(result.reviews[0].status, 'current', result.reviews[0].reasons.join('; '));
  assert.deepEqual(result.assessments.map(a => a.mapping), ['cancel-plan/C1/M1']);
});

test('missing knowledge configuration and escaping basis links are invalid', t => {
  const f = fixture(t); writeFileSync(join(f.knowledge, 'source.sol'), 'source');
  const review = f.makeReview(); review.basis.push(f.basis('source.sol', 'knowledge', 'additional'));
  f.write('reviews/cancel.md', review);
  assert.equal(f.evaluate(null).reviews[0].status, 'invalid');
  const outside = join(f.work, 'outside'); writeFileSync(outside, 'outside');
  symlinkSync(outside, join(f.knowledge, 'escape'));
  review.basis.at(-1)!.path = 'escape'; review.basis.at(-1)!.sha256 = recordDigest('outside');
  f.write('reviews/cancel.md', review);
  assert.match(f.evaluate().reviews[0].reasons.join(' '), /escapes root/);
});

test('a claim whose mappings changed has no assessment in effect from the review that read it before', t => {
  const f = fixture(t); f.write('reviews/dossier.md', f.makeReview('supported', 'dossier'));
  f.behavior.claims[0].mappings.push({ ...f.behavior.claims[0].mappings[0], id: 'M2' }); f.writeBehavior();
  const result = f.evaluate();
  assert.deepEqual(result.reviews[0].changed.claims, ['cancel-plan/C1']);
  assert.deepEqual(result.assessments, []);
  assert.equal(result.dossierReviewed, false);
});

test('a correction written after an explanation edit still replaces the earlier assessment of the same claim', t => {
  const f = fixture(t), digest = f.write('reviews/prior.md', f.makeReview());
  writeFileSync(join(f.dir, 'behaviors/cancel-plan.md'), readFileSync(join(f.dir, 'behaviors/cancel-plan.md'), 'utf8') + '\nA clarification.\n');
  const next = f.makeReview('contradicted');
  next.replaces = [{ review: 'reviews/prior.md', sha256: digest, mappings: ['cancel-plan/C1/M1'], reason: 'The outcome conflicts with the claim.' }];
  f.write('reviews/correction.md', next);
  const result = f.evaluate();
  assert.ok(result.reviews.every(r => r.status === 'current'));
  assert.deepEqual(result.assessments.map(a => [a.review, a.result]), [['reviews/correction.md', 'contradicted']]);
});

test('a review cannot fingerprint itself or use a prose-only legacy header', t => {
  const f = fixture(t), review = f.makeReview();
  review.basis.push({ role: 'additional', root: 'dossiers', path: `${f.dossier}/reviews/cancel.md`, sha256: 'a'.repeat(64) });
  f.write('reviews/cancel.md', review);
  assert.equal(f.evaluate().reviews[0].status, 'invalid');
  writeFileSync(join(f.dir, 'reviews/cancel.md'), 'prose@abcdef\n\nNo findings.\n');
  assert.equal(f.evaluate().reviews[0].status, 'invalid');
  assert.equal(f.evaluate().dossierReviewed, false);
});

test('an exact current correction suppresses only its named predecessor assessment', t => {
  const f = fixture(t); f.behavior.claims[0].mappings.push({ ...f.behavior.claims[0].mappings[0], id: 'M2' }); f.writeBehavior();
  const prior = f.makeReview(), digest = f.write('reviews/prior.md', prior);
  const next = f.makeReview('contradicted');
  next.replaces = [{ review: 'reviews/prior.md', sha256: digest, mappings: ['cancel-plan/C1/M1'], reason: 'The first mapping conflicts with this outcome.' }];
  f.write('reviews/correction.md', next);
  const result = f.evaluate();
  assert.ok(result.reviews.every(r => r.status === 'current'));
  assert.deepEqual(result.assessments.filter(a => a.mapping.endsWith('M1')).map(a => a.result), ['contradicted']);
  assert.equal(result.assessments.filter(a => a.mapping.endsWith('M2')).length, 2);
  assert.equal(recordDigest(readFileSync(join(f.dir, 'reviews/prior.md'))), digest);
});

test('dates and file order give no precedence to independently conflicting assessments', t => {
  const f = fixture(t); f.write('reviews/2099-later.md', f.makeReview('supported')); f.write('reviews/2000-earlier.md', f.makeReview('contradicted'));
  const result = f.evaluate();
  assert.deepEqual(result.assessments.map(a => a.result).sort(), ['contradicted', 'supported']);
});

test('stale or removed correction no longer suppresses a current predecessor', t => {
  const f = fixture(t); const digest = f.write('reviews/prior.md', f.makeReview());
  writeFileSync(join(f.knowledge, 'extra.md'), 'extra');
  const correction = f.makeReview('too-broad'); correction.basis.push(f.basis('extra.md', 'knowledge', 'additional'));
  correction.replaces = [{ review: 'reviews/prior.md', sha256: digest, mappings: ['cancel-plan/C1/M1'], reason: 'This additional record narrows the interpretation.' }];
  f.write('reviews/correction.md', correction);
  assert.deepEqual(f.evaluate().assessments.map(a => a.result), ['too-broad']);
  writeFileSync(join(f.knowledge, 'extra.md'), 'changed');
  assert.deepEqual(f.evaluate().assessments.map(a => a.result), ['supported']);
  rmSync(join(f.dir, 'reviews/correction.md'));
  assert.deepEqual(f.evaluate().assessments.map(a => a.result), ['supported']);
});

test('bad digests, unresolved paths, self-references and cycles suppress nothing', t => {
  const f = fixture(t); f.write('reviews/prior.md', f.makeReview());
  const correction = f.makeReview('contradicted'); correction.replaces = [{ review: 'reviews/prior.md', sha256: '0'.repeat(64), mappings: ['cancel-plan/C1/M1'], reason: 'An invalid attempt.' }];
  f.write('reviews/correction.md', correction);
  assert.deepEqual(f.evaluate().assessments.map(a => a.result), ['supported']);
  correction.replaces[0].review = 'reviews/absent.md'; f.write('reviews/correction.md', correction);
  assert.match(f.evaluate().reviews.find(r => r.file.endsWith('correction.md'))!.reasons.join(' '), /missing or invalid/);
  correction.replaces[0].review = 'reviews/correction.md'; f.write('reviews/correction.md', correction);
  assert.match(f.evaluate().reviews.find(r => r.file.endsWith('correction.md'))!.reasons.join(' '), /itself/);
  const other = f.makeReview(); other.replaces = [{ review: 'reviews/correction.md', sha256: '1'.repeat(64), mappings: ['cancel-plan/C1/M1'], reason: 'Cycle.' }];
  correction.replaces[0].review = 'reviews/other.md'; f.write('reviews/correction.md', correction); f.write('reviews/other.md', other);
  assert.ok(f.evaluate().reviews.filter(r => r.file !== 'reviews/prior.md').every(r => r.status === 'invalid' && r.reasons.includes('replacement cycle')));
  assert.deepEqual(f.evaluate().assessments.map(a => a.result), ['supported']);
});

test('independent replacement branches remain jointly visible', t => {
  const f = fixture(t), digest = f.write('reviews/prior.md', f.makeReview());
  for (const result of ['contradicted', 'too-broad'] as const) {
    const r = f.makeReview(result); r.replaces = [{ review: 'reviews/prior.md', sha256: digest, mappings: ['cancel-plan/C1/M1'], reason: `Independent interpretation: ${result}.` }]; f.write(`reviews/${result}.md`, r);
  }
  assert.deepEqual(f.evaluate().assessments.map(a => a.result).sort(), ['contradicted', 'too-broad']);
});

test('dangling review symlinks and unresolved dependency closures cannot grant support', t => {
  const f = fixture(t); symlinkSync(join(f.dir, 'absent.md'), join(f.dir, 'reviews/missing.md'));
  const dangling = f.evaluate();
  assert.deepEqual(dangling.reviews.map(r => [r.file, r.status]), [['reviews/missing.md', 'invalid']]);
  assert.match(dangling.reviews[0].reasons.join(' '), /symbolic links/);
  assert.deepEqual(dangling.assessments, []);
  // Node 24.3's rmSync can leave a dangling link behind. Unlink the directory
  // entry explicitly so dependency freshness is tested independently of it.
  unlinkSync(join(f.dir, 'reviews/missing.md')); f.write('reviews/current.md', f.makeReview());
  assert.deepEqual(f.evaluate().reviews.map(r => [r.file, r.status]), [['reviews/current.md', 'current']]);
  const result = evaluateReviews({ root: f.root, dossier: f.dossier, collection: loadBehaviorCollection(f.dir), knowledgeRoot: f.knowledge, requiredBasis: subject => ({ ...f.requiredBasis(subject), issues: ['pin revision changed'] }) });
  assert.deepEqual(result.reviews.map(r => [r.file, r.status, r.reasons]), [['reviews/current.md', 'stale', ['unresolved dependency: pin revision changed']]]);
  assert.deepEqual(result.assessments, []);
});
