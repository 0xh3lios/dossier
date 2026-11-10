// Scoped reviews bind authored interpretation to the exact files examined.
// They never grant evidence or change a formal owner decision.
import { lstatSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { behaviorParts, behaviorPath, parseReview, readRecordFile, recordDigest, recordFileDigest, DOSSIER_REF } from './records.ts';
import { canonical } from '../hash.ts';
import type {
  BehaviorCollection, BehaviorParts, EffectiveAssessment, EvaluatedReview, RequiredBasis,
  ReviewEvaluation, ReviewSubject,
} from './types.ts';

export interface ReviewOptions {
  root: string;
  dossier: string;
  collection: BehaviorCollection;
  knowledgeRoot?: string | null;
  requiredBasis: (subject: ReviewSubject) => RequiredBasis;
}
const sameList = (a: string[], b: string[]): boolean => a.length === b.length && a.every((v, i) => v === b[i]);
const key = (b: { root: string; path: string }): string => `${b.root}:${b.path}`;
const errorText = (error: unknown): string => error instanceof Error ? error.message : String(error);
// A ledger or the index is a view that every render rewrites, and dossier.json resolves nothing a
// judgment rests on. An entry for one binds nothing.
const bindsNothing = (b: { root: string; path: string }): boolean => b.root === 'dossiers' && (b.path === 'index.md' || b.path === 'dossier.json' || /^(?:parts|compositions)\/[^/]+\/ledger\.md$/.test(b.path));

function collectFiles(dir: string, prefix = 'reviews'): { files: string[]; invalid: { file: string; reason: string }[] } {
  const result: ReturnType<typeof collectFiles> = { files: [], invalid: [] };
  let stat;
  try { stat = lstatSync(dir); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return result; throw error; }
  if (stat.isSymbolicLink() || !stat.isDirectory()) return { files: [], invalid: [{ file: prefix, reason: 'reviews must be a directory without symbolic links' }] };
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = `${prefix}/${entry.name}`;
    if (entry.isSymbolicLink()) { result.invalid.push({ file, reason: 'review files and directories cannot be symbolic links' }); continue; }
    if (entry.isDirectory()) { const child = collectFiles(join(dir, entry.name), file); result.files.push(...child.files); result.invalid.push(...child.invalid); }
    else if (entry.isFile() && entry.name.endsWith('.md')) result.files.push(file);
    else if (!(entry.isFile() && entry.name === '.gitkeep')) result.invalid.push({ file, reason: 'reviews must contain Markdown review records' });
  }
  return result;
}
function assessCurrent(review: EvaluatedReview, options: ReviewOptions): void {
  const record = review.record!;
  const invalid = (why: string) => { review.status = 'invalid'; review.reasons.push(why); };
  const stale = (why: string) => { if (review.status !== 'invalid') review.status = 'stale'; review.reasons.push(why); };
  if (record.subject.dossier !== options.dossier) invalid(`review subject ${record.subject.dossier} does not match ${options.dossier}`);
  const ids = options.collection.collection?.record.behaviors || [];
  if (options.collection.issues.length) stale('the behavior collection is missing or invalid');
  if (record.subject.kind === 'dossier' && !sameList(record.subject.behaviors, ids)) stale('reviewed behavior order differs from the current collection');
  if (record.subject.behaviors.some(id => !ids.includes(id))) stale('a reviewed behavior is absent from the current collection');
  // Each subject behavior file is compared part by part. A claim whose digest changed, or that is gone
  // or new, has no assessment in effect from this review; the explanation decides nothing assessed.
  const parted = new Set<string>();
  for (const id of record.subject.behaviors) {
    const path = behaviorPath(options.dossier, id), bound = record.basis.find(b => b.root === 'dossiers' && b.path === path);
    const behavior = options.collection.behaviors.find(b => b.record.id === id);
    if (!bound?.claims || !bound.explanation || !behavior) continue;
    parted.add(key(bound));
    let now: BehaviorParts;
    try { now = behaviorParts(behavior.text); } catch (error) { stale(`cannot read ${path}: ${errorText(error)}`); continue; }
    // As the review read it, the parts it bound are the file's.
    if (behavior.sha256 === bound.sha256 && (canonical(now.claims) !== canonical(bound.claims) || now.explanation !== bound.explanation)) invalid(`the claims and explanation bound for ${path} are not that file's`);
    const assessed = record.assessments.map(a => a.mapping).filter(m => m.startsWith(`${id}/`));
    for (const m of assessed) if (!Object.hasOwn(bound.claims, m.split('/')[1])) invalid(`assessment ${m} names a claim the review does not bind`);
    for (const [claimId, digest] of Object.entries(bound.claims)) {
      const claim = behavior.record.claims.find(c => c.id === claimId);
      if (!claim || now.claims[claimId] !== digest) { review.changed.claims.push(`${id}/${claimId}`); continue; }
      const mine = assessed.filter(m => m.startsWith(`${id}/${claimId}/`)).sort();
      if (!sameList(mine, claim.mappings.map(m => `${id}/${claimId}/${m.id}`).sort())) invalid(`assessments of ${id}/${claimId} do not cover exactly its mappings: one assessment for each mapping`);
    }
    for (const claim of behavior.record.claims) if (!Object.hasOwn(bound.claims, claim.id)) review.changed.claims.push(`${id}/${claim.id}`);
    if (now.explanation !== bound.explanation) review.changed.explanations.push(id);
  }
  let closure: RequiredBasis;
  try { closure = options.requiredBasis(record.subject); }
  catch (error) { closure = { files: [], issues: [errorText(error)] }; }
  for (const problem of closure.issues) stale(`unresolved dependency: ${problem}`);
  // Every file the subject now depends on must be bound. A file the tool required when the review was
  // written and no longer requires still binds, as an additional file does: its digest is checked, so
  // an answer the review read that has since gone, or a fault file removed, stales it. A change in what
  // the tool requires therefore stales no review by itself.
  const required = new Set(record.basis.filter(b => b.role === 'required').map(key));
  const expectedKeys = closure.files.map(key);
  if (closure.files.some(b => b.role !== 'required') || new Set(expectedKeys).size !== expectedKeys.length) stale('required dependency closure is invalid');
  const missing = expectedKeys.filter(p => !required.has(p)).sort();
  if (missing.length) stale(`required basis lacks current dependencies: ${missing.join(', ')}`);
  for (const anchor of [...(record.subject.kind === 'dossier' ? [`${options.dossier}/README.md`] : []), ...record.subject.behaviors.map(id => `${options.dossier}/behaviors/${id}.md`)]) {
    if (!closure.files.some(b => b.root === 'dossiers' && b.path === anchor && b.role === 'required')) stale(`required dependency closure omits ${anchor}`);
  }
  for (const basis of record.basis) {
    if (bindsNothing(basis)) continue;
    if (basis.root === 'dossiers' && basis.path === `${options.dossier}/${review.file}`) { invalid('a review cannot include itself in its basis'); continue; }
    const root = basis.root === 'dossiers' ? options.root : options.knowledgeRoot;
    if (!root) { invalid('knowledge basis requires a configured knowledge root'); continue; }
    try {
      const current = recordFileDigest(root, basis.path, true);
      if (parted.has(key(basis))) continue;
      if (current !== basis.sha256) stale(`changed ${key(basis)}`);
      const resolved = closure.files.find(b => key(b) === key(basis));
      if (resolved && resolved.sha256 !== basis.sha256) stale(`dependency digest differs for ${key(basis)}`);
    } catch (error) {
      const message = errorText(error);
      if (message.includes('escapes root')) invalid(`${key(basis)}: ${message}`);
      else stale(`cannot read ${key(basis)}: ${message}`);
    }
  }
}

/** Evaluate all reviews against one observation of the caller's dependency closure. */
export function evaluateReviews(options: ReviewOptions): ReviewEvaluation {
  if (!DOSSIER_REF.test(options.dossier)) throw new Error('review dossier must be a root-relative part or composition path');
  const dir = join(options.root, options.dossier), files = collectFiles(join(dir, 'reviews'));
  const unchanged = () => ({ claims: [] as string[], explanations: [] as string[] });
  const reviews: EvaluatedReview[] = files.invalid.map(({ file, reason }) => ({ file, record: null, body: '', sha256: '', status: 'invalid', reasons: [reason], changed: unchanged() }));
  // Repeated subjects share a closure computed once for this observation.
  const closures = new Map<string, RequiredBasis>();
  const cachedOptions = { ...options, requiredBasis: (subject: ReviewSubject): RequiredBasis => {
    const subjectKey = JSON.stringify(subject);
    if (!closures.has(subjectKey)) closures.set(subjectKey, options.requiredBasis(subject));
    return closures.get(subjectKey)!;
  } };
  for (const file of files.files) {
    let review: EvaluatedReview = { file, record: null, body: '', sha256: '', status: 'invalid', reasons: [], changed: unchanged() };
    try {
      const text = readRecordFile(dir, file);
      review.sha256 = recordDigest(text);
      const parsed = parseReview(text);
      review = { file, record: parsed.record, body: parsed.body, sha256: parsed.sha256, status: 'current', reasons: [], changed: unchanged() };
      assessCurrent(review, cachedOptions);
    } catch (error) { review.status = 'invalid'; review.reasons.push(errorText(error)); }
    reviews.push(review);
  }
  const byFile = new Map(reviews.map(r => [r.file, r]));
  const invalidate = (review: EvaluatedReview, reason: string) => { review.status = 'invalid'; if (!review.reasons.includes(reason)) review.reasons.push(reason); };
  // Reference shape and exact predecessor identity are checked even when a review
  // is stale; neither a typo nor a malformed replacement may suppress anything.
  for (const review of reviews) if (review.record) {
    for (const replacement of review.record.replaces) {
      const prior = byFile.get(replacement.review);
      if (replacement.review === review.file) { invalidate(review, 'replacement cannot name itself'); continue; }
      if (!prior?.record) { invalidate(review, `replacement review ${replacement.review} is missing or invalid`); continue; }
      if (replacement.sha256 !== prior.sha256) invalidate(review, `replacement digest differs for ${replacement.review}`);
      if (prior.record.subject.dossier !== review.record.subject.dossier) invalidate(review, 'replacement must refer to the same dossier');
      for (const mapping of replacement.mappings) if (!prior.record.assessments.some(a => a.mapping === mapping)) invalidate(review, `prior review has no assessment for ${mapping}`);
    }
  }
  // Cycles have no ordering interpretation. Mark every member invalid, preserving
  // unrelated reviews and making all of their predecessor suppressions inert.
  const done = new Set<string>(), visiting: string[] = [];
  function visit(review: EvaluatedReview): void {
    const index = visiting.indexOf(review.file);
    if (index >= 0) { for (const file of visiting.slice(index)) invalidate(byFile.get(file)!, 'replacement cycle'); return; }
    if (done.has(review.file) || !review.record) return;
    visiting.push(review.file);
    for (const replacement of review.record.replaces) { const prior = byFile.get(replacement.review); if (prior) visit(prior); }
    visiting.pop(); done.add(review.file);
  }
  for (const review of reviews) visit(review);
  const suppressed = new Set<string>();
  for (const review of reviews) if (review.status === 'current' && review.record) {
    for (const replacement of review.record.replaces) {
      const prior = byFile.get(replacement.review);
      if (prior?.status !== 'current' || !prior.record || prior.sha256 !== replacement.sha256) continue;
      // Both reviews bound the mapping's claim with the same digest: the claim and its mappings are the same.
      for (const mapping of replacement.mappings) {
        const [behavior, claim] = mapping.split('/'), path = behaviorPath(options.dossier, behavior);
        const own = review.record.basis.find(b => b.role === 'required' && b.root === 'dossiers' && b.path === path);
        const old = prior.record.basis.find(b => b.role === 'required' && b.root === 'dossiers' && b.path === path);
        if (own?.claims?.[claim] && own.claims[claim] === old?.claims?.[claim]) suppressed.add(`${prior.file}#${mapping}`);
      }
    }
  }
  const outOfEffect = (r: EvaluatedReview, mapping: string) => suppressed.has(`${r.file}#${mapping}`) || r.changed.claims.includes(mapping.split('/').slice(0, 2).join('/'));
  const assessments: EffectiveAssessment[] = reviews.filter(r => r.status === 'current' && r.record)
    .flatMap(r => r.record!.assessments.filter(a => !outOfEffect(r, a.mapping)).map(a => ({ ...a, review: r.file, reviewSha256: r.sha256 })));
  // Structural validity permits partial reviews, but partial or contested work cannot
  // discharge the dossier's independent examination. Inapplicable items can be examined
  // for applicability and explained in findings; unread items remain visibly owed.
  const results = new Map<string, Set<string>>();
  for (const assessment of assessments) (results.get(assessment.mapping) || results.set(assessment.mapping, new Set()).get(assessment.mapping)!).add(assessment.result);
  const unresolved = [...results.values()].some(values => values.size !== 1 || values.has('inconclusive'));
  const dossierReviewed = !unresolved && reviews.some(r => r.status === 'current' && r.record?.subject.kind === 'dossier' && r.record.coverage.unexamined.length === 0 && !r.changed.claims.length && !r.changed.explanations.length);
  return { reviews, assessments, dossierReviewed };
}
