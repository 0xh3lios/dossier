// Derived, disposable reader data. The input records contain no mutable status badge. The report
// names each fact once and refers to the authored files by path: a behavior's explanation, the
// orientation and a review's findings stay in their files, and a review's basis is counted, not
// copied, so a ledger that embeds the report grows with the dossier's claims, not with its reviews.
import { resolveKnowledgePin, resolveTarget } from './resolve.ts';
import { passageOf } from '../trials/answers.ts';
import { REPORT_FORMAT } from './formats.ts';
import type { Freshness, ResolutionContext, TargetResolution } from './resolve.ts';
import type { AssessmentReplacement, AssessmentResult, BehaviorCollection, Claim, EffectiveAssessment, EvaluatedReview, Mapping, ReviewEvaluation, ReviewCoverage, ReviewSubject } from './types.ts';

export interface MappingAssessment {
  state: 'unreviewed' | 'assessed' | 'contested';
  results: AssessmentResult[];
  records: EffectiveAssessment[];
}
export interface MappingReport extends Mapping { key: string; evidence: Omit<TargetResolution, 'dependencies'>; assessment: MappingAssessment }
export type ClaimStanding = 'hypothesis' | 'evidence-available' | 'supported' | 'contradicted' | 'contested';
export interface ClaimReport extends Omit<Claim, 'mappings'> {
  key: string;
  standing: ClaimStanding;
  label: string;
  freshness: Freshness;
  reasons: string[];
  limitations: string[];
  pins: { ref: string; revision: string; freshness: Freshness; reasons: string[] }[];
  mappings: MappingReport[];
}
export interface BehaviorView { id: string; title: string; path: string; claims: ClaimReport[] }
export interface Unassociated { kind: 'passage' | 'cell' | 'walk' | 'scenario'; id: string; scenario: string | null }
// A review as the report gives it: its standing and what it covers, with its findings left in its file.
export interface ReviewView {
  file: string; sha256: string; status: EvaluatedReview['status']; reasons: string[]; changed: EvaluatedReview['changed'];
  record: {
    subject: ReviewSubject; coverage: ReviewCoverage; replaces: AssessmentReplacement[];
    assessments: { mapping: string; result: AssessmentResult }[]; basis: { required: number; additional: number };
  } | null;
}
export interface BehaviorReport {
  format: typeof REPORT_FORMAT;
  dossier: string;
  order: string[];
  behaviors: BehaviorView[];
  issues: { path: string; message: string }[];
  reviews: { reviews: ReviewView[]; dossierReviewed: boolean };
  coverage: { complete: false; unassociated: Unassociated[]; limitation: string };
  summary: { behaviors: number; claims: number; supported: number; hypotheses: number; evidenceAvailable: number; contradicted: number; contested: number; stale: number };
}
export interface ReportInput extends ResolutionContext { collection: BehaviorCollection; reviews: ReviewEvaluation }

const labels: Record<ClaimStanding, string> = {
  hypothesis: 'hypothesis', 'evidence-available': 'evidence available; mapping unreviewed', supported: 'supported within the stated scope',
  contradicted: 'contradicted within the stated scope', contested: 'contested',
};
const unique = <T,>(xs: T[]): T[] => [...new Set(xs)];
const freshnessOf = (values: Freshness[]): Freshness => values.includes('invalid') ? 'invalid' : values.includes('missing') ? 'missing' : values.includes('stale') ? 'stale' : 'current';

function assessmentOf(key: string, reviews: ReviewEvaluation): MappingAssessment {
  const records = reviews.assessments.filter(a => a.mapping === key);
  const results = unique(records.map(a => a.result));
  return { state: results.length > 1 ? 'contested' : results.length ? 'assessed' : 'unreviewed', results, records };
}
// An assessment counts as support only from a current review that examined the whole behavior.
function reviewedSupport(m: MappingReport, behavior: string, reviews: ReviewEvaluation): boolean {
  if (m.assessment.state !== 'assessed' || m.assessment.results[0] !== 'supported') return false;
  return m.assessment.records.some(a => {
    const review = reviews.reviews.find(r => r.file === a.review && r.status === 'current');
    return review?.record && ['claims', 'scope', 'mappings', 'explanation'].every(k => review.record!.coverage.examined.includes(`behavior:${behavior}:${k}`));
  });
}
function claimReport(behavior: string, claim: Claim, input: ReportInput): ClaimReport {
  const key = `${behavior}/${claim.id}`;
  const pins = claim.scope.pins.map(pin => ({ ...pin, ...resolveKnowledgePin(pin, input.knowledge) })).map(({ ref, revision, freshness, reasons }) => ({ ref, revision, freshness, reasons }));
  const mappings = claim.mappings.map((mapping): MappingReport => {
    const mappingKey = `${key}/${mapping.id}`;
    const { dependencies: _, ...evidence } = resolveTarget(mapping.target, input);
    return { ...mapping, key: mappingKey, evidence, assessment: assessmentOf(mappingKey, input.reviews) };
  });
  const fresh = freshnessOf([...pins.map(p => p.freshness), ...mappings.map(m => m.evidence.freshness), ...(input.collection.issues.length ? ['invalid' as const] : [])]);
  const reasons = unique([
    ...pins.flatMap(p => p.reasons), ...mappings.flatMap(m => m.evidence.reasons),
    ...mappings.flatMap(m => m.evidence.conflicts),
    ...input.collection.issues.map(i => `${i.path}: ${i.message}`),
  ]);
  // What limits this claim. What a review left unexamined is the review's, in its coverage.
  const limitations = unique([
    ...claim.assumptions,
    ...mappings.flatMap(m => [...m.limitations, ...m.evidence.evidence.flatMap(e => e.limitations), ...m.assessment.records.flatMap(a => a.limitations)]),
    ...mappings.flatMap(m => [
      ...(m.evidence.formal?.held ? [`Formal sensitivity: ${m.evidence.formal.held}.`] : []),
      ...(m.evidence.formal?.open || []),
      ...(m.evidence.formal?.assumptions || []).map(g => `Formal assumption: ${m.evidence.formal!.dossier}#${g}.`),
    ]),
  ]);
  const contested = mappings.some(m => m.assessment.state === 'contested' || m.evidence.conflicts.length > 0);
  const contradicted = mappings.some(m => m.assessment.results.includes('contradicted') || m.relation === 'challenges' && reviewedSupport(m, behavior, input.reviews) && m.evidence.available && m.evidence.freshness === 'current');
  const adequate = mappings.filter(m => m.relation === 'supports' && reviewedSupport(m, behavior, input.reviews) && m.evidence.available && m.evidence.freshness === 'current');
  // Model-only evidence cannot acquire source/deployment reach through a review label.
  const applicable = adequate.filter(m => claim.scope.level === 'model' || m.evidence.evidence.some(e => e.admissible && e.kind === 'knowledge-backing'));
  if (adequate.length && !applicable.length && claim.scope.level !== 'model') limitations.push('Model or external-runner evidence alone does not establish source or deployment correspondence; independently reviewed knowledge backing is required.');
  const evidenceAvailable = mappings.some(m => m.relation === 'supports' && m.evidence.available && m.evidence.freshness === 'current' && m.assessment.state === 'unreviewed');
  const standing: ClaimStanding = contested ? 'contested' : contradicted ? 'contradicted' : fresh === 'current' && applicable.length ? 'supported' : evidenceAvailable ? 'evidence-available' : 'hypothesis';
  return { ...claim, key, standing, label: labels[standing], freshness: fresh, reasons, limitations, pins, mappings };
}

function unassociated(input: ReportInput, behaviors: BehaviorView[]): Unassociated[] {
  const a = input.analysis, targets = behaviors.flatMap(b => b.claims.flatMap(c => c.mappings.map(m => m.target)));
  const passages = new Set<string>(), cells = new Set<string>(), walks = new Set<string>(), scenarios = new Set<string>();
  for (const t of targets) {
    if (t.kind === 'knowledge' || t.dossier !== a.ref) continue;
    if (t.kind === 'passage') passages.add(t.id);
    if (t.kind === 'walk') { walks.add(`${t.id}|${t.scenario || ''}`); passages.add(t.id); if (t.scenario) scenarios.add(t.scenario); }
    if (t.kind === 'cell') { cells.add(`${t.property}|${t.scenario}`); passages.add(t.property); scenarios.add(t.scenario); }
    // An exact answer associates the one check it selects, even when that check is missing or
    // stale; the other passages the same answer covers stay unexplained until a mapping names them.
    if (t.kind === 'answer') {
      const id = passageOf(t.check);
      if (!id) continue;
      passages.add(id);
      const scenario = t.question.scenario;
      if (id === t.question.property && scenario) { cells.add(`${id}|${scenario}`); scenarios.add(scenario); }
      if (id === t.question.walk) { walks.add(`${id}|${scenario || ''}`); if (scenario) scenarios.add(scenario); }
    }
  }
  const out: Unassociated[] = [];
  for (const p of a.prose.passages.filter(p => !p.retired)) if (!passages.has(p.id)) out.push({ kind: /^W\d+$/.test(p.id) ? 'walk' : 'passage', id: p.id, scenario: null });
  if (a.kind === 'composition') {
    for (const c of a.cells) if (!cells.has(`${c.property}|${c.scenario}`)) out.push({ kind: 'cell', id: c.property, scenario: c.scenario });
    for (const w of a.walks) if (!walks.has(`${w.id}|${w.scenario}`)) out.push({ kind: 'walk', id: w.id, scenario: w.scenario });
    for (const sid of unique([...a.cells.map(c => c.scenario), ...a.walks.map(w => w.scenario)])) if (!scenarios.has(sid)) out.push({ kind: 'scenario', id: sid, scenario: sid });
  }
  return out;
}

function reviewView(r: EvaluatedReview): ReviewView {
  const record = r.record && {
    subject: r.record.subject, coverage: r.record.coverage, replaces: r.record.replaces,
    assessments: r.record.assessments.map(a => ({ mapping: a.mapping, result: a.result })),
    basis: { required: r.record.basis.filter(b => b.role === 'required').length, additional: r.record.basis.filter(b => b.role === 'additional').length },
  };
  return { file: r.file, sha256: r.sha256, status: r.status, reasons: r.reasons, changed: r.changed, record };
}

export function buildBehaviorReport(input: ReportInput): BehaviorReport {
  const behaviors = input.collection.behaviors.map(({ record }): BehaviorView => ({
    id: record.id, title: record.title, path: `${input.analysis.ref}/behaviors/${record.id}.md`,
    claims: record.claims.map(c => claimReport(record.id, c, input)),
  }));
  const claims = behaviors.flatMap(b => b.claims);
  return {
    format: REPORT_FORMAT, dossier: input.analysis.ref,
    order: input.collection.collection?.record.behaviors || [],
    behaviors, issues: input.collection.issues,
    reviews: { reviews: input.reviews.reviews.map(reviewView), dossierReviewed: input.reviews.dossierReviewed },
    coverage: { complete: false, unassociated: unassociated(input, behaviors), limitation: 'Associations describe the modeled surface. They do not establish exhaustive source coverage; unassociated material is not necessarily unfinished.' },
    summary: { behaviors: behaviors.length, claims: claims.length, supported: claims.filter(c => c.standing === 'supported').length, hypotheses: claims.filter(c => c.standing === 'hypothesis').length, evidenceAvailable: claims.filter(c => c.standing === 'evidence-available').length, contradicted: claims.filter(c => c.standing === 'contradicted').length, contested: claims.filter(c => c.standing === 'contested').length, stale: claims.filter(c => c.freshness !== 'current').length },
  };
}
