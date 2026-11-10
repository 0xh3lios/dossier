// Publication may remove an answer only while every incoming behavior target retains its support.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { canonical, sha256 } from '../hash.ts';
import { listParts, listCompositions, UsageError } from '../dossiers/root.ts';
import { isRetired } from '../dossiers/decisions.ts';
import { knowledgeOf, loadActors } from '../dossiers/load.ts';
import { analyzePart, analyzeComposition } from '../verify/analyze.ts';
import { loadBehaviorCollection } from './records.ts';
import { resolveTarget } from './resolve.ts';
import { retentionInputFingerprint, knowledgeInputFingerprint } from './dependencies.ts';
import type { Analysis } from '../verify/analyze.ts';
import type { AnswerRead, Entry } from '../trials/answers.ts';
import type { MappingTarget } from './types.ts';
import type { EvidenceItem, TargetResolution } from './resolve.ts';

export interface RetentionDecision { gone: string[]; superseded: string[]; retained: { entry: string; reason: string }[]; refusal: string | null; assertStable(): void }
const signature = (e: EvidenceItem) => canonical({ kind: e.kind, checks: e.checks, outcomes: e.outcomes, reach: e.reach, polarity: e.polarity, basis: e.basis, limitations: e.limitations });
// When equivalence across different evidence scopes cannot be established mechanically, retain it.
// IDs and timestamps are not part of this comparison: a new run at the same basis can stand in.
export function preservesTarget(before: TargetResolution, after: TargetResolution): boolean {
  if (before.freshness === 'current' && after.freshness !== 'current') return false;
  if (before.available && !after.available) return false;
  if (canonical(before.formal) !== canonical(after.formal) || canonical(before.owner) !== canonical(after.owner) || canonical(before.conflicts) !== canonical(after.conflicts)) return false;
  const left = after.evidence.filter(e => e.admissible && e.freshness === 'current').map(signature);
  // Passage/cell targets follow their deciding answers. A superseded answer with
  // the same conclusion adds context, not another selected scope. Exact answer
  // targets mark their selected entry deciding and therefore retain it. Conflicting
  // evidence remains protected above; existing violation/forget rules still apply.
  const deciding = before.evidence.filter(e => e.deciding && e.admissible && e.freshness === 'current');
  const protectedEvidence = before.evidence.filter(e => e.admissible && e.freshness === 'current' && (e.deciding || !deciding.some(d => d.kind === e.kind && d.polarity === e.polarity && canonical(d.outcomes) === canonical(e.outcomes))));
  return protectedEvidence.every(e => left.includes(signature(e)));
}

export function protectBehaviorAnswers(root: string, ref: string, answers: AnswerRead[], next: Entry | null, name: string, gone: string[], superseded: string[]): RetentionDecision {
  const stamp = retentionInputFingerprint(root), knowledge = knowledgeOf(root), actors = loadActors(root);
  const knowledgeStamp = knowledgeInputFingerprint(knowledge.root);
  const analyses: Record<string, Analysis> = {};
  const read = (path: string, list?: AnswerRead[]): Analysis => {
    const [kind, id] = path.split('/');
    return kind === 'parts' ? analyzePart({ root, id, knowledge, actors, answers: list, includeBehaviors: false }) : analyzeComposition({ root, id, knowledge, answers: list, includeBehaviors: false });
  };
  const targets: { subject: string; key: string; target: MappingTarget }[] = [];
  const malformed: string[] = [];
  for (const [kind, ids] of [['parts', listParts(root)], ['compositions', listCompositions(root)]] as const) for (const id of ids) {
    const path = `${kind}/${id}`, dir = join(root, path);
    if (isRetired(dir)) continue;
    const collection = loadBehaviorCollection(dir);
    if (collection.issues.length) malformed.push(path);
    for (const b of collection.behaviors) for (const c of b.record.claims) for (const m of c.mappings) {
      if (m.target.kind !== 'knowledge' && m.target.dossier === ref) targets.push({ subject: path, key: `${path}#${b.record.id}/${c.id}/${m.id}`, target: m.target });
    }
  }
  const knowledgeFiles = new Map<string, string>();
  const assertStable = (): void => {
    if (knowledgeInputFingerprint(knowledge.root) !== knowledgeStamp) throw new UsageError('knowledge dependencies changed during publication; retry against the current records');
    if (retentionInputFingerprint(root) !== stamp) throw new UsageError('behavior dependencies changed during publication; retry against the current root');
    for (const [path, hash] of knowledgeFiles) if (!existsSync(path) || sha256(readFileSync(path)) !== hash) throw new UsageError('knowledge dependencies changed during publication; retry against the current records');
  };
  const out: RetentionDecision = { gone: [], superseded: [], retained: [], refusal: null, assertStable };
  if (!next && !gone.length && !superseded.length) return out;
  if (malformed.length) {
    if (next && answers.some(a => a.name === name)) out.refusal = `cannot establish incoming behavior dependencies while collections are invalid: ${malformed.join(', ')}`;
    out.retained = [...gone, ...superseded].map(entry => ({ entry, reason: `behavior dependency scan incomplete: ${malformed.join(', ')}` }));
    return out;
  }
  if (!targets.length) { out.gone = gone; out.superseded = superseded; return out; }
  analyses[ref] = read(ref, answers);
  for (const t of targets) if (!analyses[t.subject]) analyses[t.subject] = read(t.subject);
  const resolveAll = (list: AnswerRead[]) => {
    const targetAnalysis = read(ref, list), all = { ...analyses, [ref]: targetAnalysis };
    return targets.map(t => {
      const subject = t.subject === ref ? targetAnalysis : all[t.subject];
      const resolution = resolveTarget(t.target, { analysis: subject, analyses: all, knowledge });
      for (const dep of resolution.dependencies) if (dep.root === 'knowledge' && knowledge.root) {
        const path = join(knowledge.root, dep.path);
        if (existsSync(path) && !knowledgeFiles.has(path)) knowledgeFiles.set(path, sha256(readFileSync(path)));
      }
      return resolution;
    });
  };
  let current = [...answers], before = resolveAll(current);
  if (next) {
    const replaced = current.filter(a => a.name !== name);
    replaced.push({ name, entry: next, reading: null, problems: [] });
    const after = resolveAll(replaced);
    // New observations may refute a claim. Preserve current scope when replacing a
    // positive answer; the ordinary answer rules retain changed verdicts and protect violations.
    const kept = (i: number, old: EvidenceItem) => after[i].evidence.some(fresh => fresh.entry === name && fresh.admissible && fresh.freshness === 'current' && (fresh.polarity === 'counterexample' || fresh.kind === old.kind && canonical(fresh.reach) === canonical(old.reach)));
    const lost = targets.filter((_, i) => before[i].evidence.some(old => old.entry === name && old.admissible && old.freshness === 'current' && !kept(i, old)));
    if (lost.length) { out.refusal = `answer replacement would remove behavior support: ${lost.map(t => t.key).join(', ')}`; return out; }
    current = replaced; before = after;
  }
  for (const entry of [...gone, ...superseded]) {
    const reduced = current.filter(a => a.name !== entry), after = resolveAll(reduced);
    const lost = targets.filter((_, i) => !preservesTarget(before[i], after[i]));
    if (lost.length) out.retained.push({ entry, reason: `needed by ${lost.map(t => t.key).join(', ')}` });
    else { (gone.includes(entry) ? out.gone : out.superseded).push(entry); current = reduced; before = after; }
  }
  assertStable();
  return out;
}
