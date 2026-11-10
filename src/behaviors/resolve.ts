// Behavior targets read the formal engine's current answers. They create no new evidence.
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { canonical, fileHash, sha256, short } from '../hash.ts';
import { completed, inputFiles, passageOf } from '../trials/answers.ts';
import { coversOf } from '../verify/covers.ts';
import { actorsHash, backingOf, moduleHash, scenarioHash } from '../verify/cells.ts';
import { basisMoved, lapsedParts, movedUnder } from '../verify/lapse.ts';
import type { Analysis, CompositionAnalysis, PartAnalysis } from '../verify/analyze.ts';
import type { AnswerRead, BackingSnapshot, Entry, Reach, Readable } from '../trials/answers.ts';
import type { LoadedKnowledge } from '../dossiers/load.ts';
import type { AcceptedRisk, LatestDecision, OwnerState } from '../dossiers/decisions.ts';
import type { Now, PresentState } from '../verify/lapse.ts';
import type { KnowledgePin, MappingTarget } from './types.ts';

export type Freshness = 'current' | 'stale' | 'missing' | 'invalid';
export type EvidenceKind = 'path-witness' | 'finite-chart' | 'bounded-model' | 'inductive-model' | 'model-observation' | 'external-cases' | 'sensitivity' | 'knowledge-backing';
export interface Dependency { root: 'dossiers' | 'knowledge'; path: string }
export interface OwnerFacet { dossier: string; passage: string; scenario: string | null; state: OwnerState | null; decision: LatestDecision | null; accepted: AcceptedRisk | null; acceptanceLapsed: string[] }
export interface EvidenceItem {
  dossier: string;
  entry: string | null;
  path: string;
  trial: string | null;
  checker: string | null;
  kind: EvidenceKind;
  freshness: Freshness;
  reasons: string[];
  checks: string[];
  outcomes: Record<string, string>;
  reach: Reach | null;
  polarity: 'holds' | 'counterexample' | 'witness' | 'observed' | 'available' | 'unknown';
  admissible: boolean;
  deciding: boolean;
  basis: string | null;
  limitations: string[];
}
export interface FormalTarget {
  dossier: string; passage: string | null; scenario: string | null; side: 'chart' | 'model' | null;
  mark: string; held: string | null; open: string[]; assumptions: string[];
}
export interface TargetResolution {
  target: MappingTarget;
  freshness: Freshness;
  reasons: string[];
  available: boolean;
  formal: FormalTarget | null;
  evidence: EvidenceItem[];
  owner: OwnerFacet[];
  dependencies: Dependency[];
  conflicts: string[];
}
export interface ResolutionContext { analysis: Analysis; analyses: Record<string, Analysis>; knowledge: LoadedKnowledge }

const unique = <T,>(xs: T[]): T[] => [...new Set(xs)];
const modelChecker = (s: string) => ['tlc', 'apalache', 'alloy'].includes(s);
const isNegative = (s: string) => ['violated', 'counterexample', 'fail', 'failed', 'no instance'].includes(s);
const isPositive = (s: string) => ['holds', 'no counterexample', 'pass', 'passed', 'instance', 'covered'].includes(s);
const givens = (a: Analysis, id: string): string[] => a.kind === 'part'
  ? [...a.ir.invariants, ...a.ir.onces, ...a.ir.withins].find(p => p.id === id)?.givens || []
  : a.prose.properties.find(p => p.id === id)?.givens || [];
const addDependency = (r: TargetResolution, root: Dependency['root'], path: string) => {
  if (!r.dependencies.some(x => x.root === root && x.path === path)) r.dependencies.push({ root, path });
};
function partNow(a: PartAnalysis): Now {
  const backing: Record<string, BackingSnapshot> = Object.fromEntries(a.ir.guarantees.map(k => [k.id, k.backing?.kind === 'external' ? { status: 'external' as const } : a.backing[k.id] || { status: 'unresolved' as const }]));
  return { snapshot: { passages: a.hashes, ir: a.irHash, records: a.pins, backing }, file: path => a.files[path] ?? null };
}
function compositionNow(a: CompositionAnalysis, knowledge: LoadedKnowledge): PresentState {
  const used = a.composed.actors || [], members = a.wiring.members.map(m => m.part);
  const configs = Object.fromEntries(Object.entries(a.composed.cfgs || {}).map(([name, text]) => [`model/generated/${name}`, sha256(text)]));
  const inputs: Record<string, string | null> = {};
  for (const read of a.completed) for (const path of Object.keys(inputFiles(read.entry.basis))) {
    const full = join(a.dir, path);
    inputs[path] = path.startsWith('model/generated/') ? configs[path] ?? null : existsSync(full) && statSync(full).isFile() ? fileHash(full) : null;
  }
  return {
    passages: a.hashes, wiring: short(a.wiring.text, 16), module: sid => moduleHash(a.composed.tla, sid, a.extras),
    scenario: sid => scenarioHash(a.actors.scenarioById[sid], used, members), actors: actorsHash(a.actors, used),
    extras: a.extras ? short(a.extras, 16) : null,
    members: Object.fromEntries(Object.entries(a.memberLoads).filter(([, m]) => m).map(([id, m]) => [id, { prose: short(m!.text, 16), backing: backingOf(m!.ir, knowledge) }])),
    records: a.pins, configs, inputs,
  };
}

/** The same passage-specific lapse rules as marks/cells, without rerunning analysis. */
export function answerFreshness(a: Analysis, read: AnswerRead, knowledge: LoadedKnowledge, id?: string | null, scenario?: string | null): { freshness: Freshness; reasons: string[] } {
  if (!read.entry || read.problems.length || a.integrity.mode !== 'current') return { freshness: 'invalid', reasons: [...read.problems.map(p => `${p.name}: ${p.where}`), ...a.integrity.problems.map(p => `${p.name}: ${p.where}`), ...(!read.entry ? ['answer is unreadable'] : [])] };
  if (a.gone[read.name]) return { freshness: 'missing', reasons: [a.gone[read.name]] };
  if (!completed(read)) return { freshness: 'invalid', reasons: ['answer did not complete'] };
  const entry = read.entry;
  // Formal sensitivity obligations bind the property's current words. A blunder's
  // deliberately mutated model is not compared with the ordinary model.
  if (entry.question.kind === 'blunder' && id) {
    const changed = entry.basis.snapshot.passages[id] !== a.hashes[id];
    return { freshness: changed ? 'stale' : 'current', reasons: changed ? [`passage ${id}`] : [] };
  }
  let moved: string[];
  if (a.kind === 'part') {
    const now = partNow(a);
    if (id) {
      const touch = (coversOf({ completed: [read], ir: a.ir, hashes: a.hashes }).touches[id] || [])[0];
      moved = movedUnder({ checker: entry.question.checker, basis: entry.basis }, [id], touch?.leaned || [], now, pid => givens(a, pid));
      if (entry.question.checker === 'chart' && entry.basis.snapshot.ir !== a.irHash) moved.unshift('prose compilation');
    } else moved = basisMoved(entry, now, { givens: pid => givens(a, pid), ir: a.ir });
  } else {
    const own = id || entry.question.property || entry.question.walk || entry.question.expects.map(passageOf).find(Boolean) || '';
    moved = lapsedParts(entry.basis, compositionNow(a, knowledge), own, scenario || entry.question.scenario || 'all-honest', givens(a, own));
  }
  return { freshness: moved.length ? 'stale' : 'current', reasons: unique(moved) };
}

export function resolveKnowledgePin(pin: KnowledgePin, knowledge: LoadedKnowledge): { freshness: Freshness; reasons: string[]; dependency: Dependency | null; text: string | null } {
  const record = knowledge.resolve(pin.ref);
  if (!record) return { freshness: 'missing', reasons: [`knowledge reference ${pin.ref} does not resolve`], dependency: null, text: null };
  const dependency: Dependency = { root: 'knowledge', path: record.path };
  if (`sha256:${record.sha256}` !== pin.revision) return { freshness: 'stale', reasons: [`knowledge reference ${pin.ref} no longer matches ${pin.revision}`], dependency, text: null };
  return { freshness: 'current', reasons: [], dependency, text: record.text };
}

function recordedChecks(entry: Entry, id: string | null, exact?: string): { checks: string[]; outcomes: Record<string, string> } {
  const r = entry.answer;
  if (exact) {
    if (Object.hasOwn(r.outcomes, exact)) return { checks: [exact], outcomes: { [exact]: r.outcomes[exact] } };
    if ((r.covers || []).includes(exact)) return { checks: [exact], outcomes: { [exact]: 'covered' } };
    const checks = (r.checks || []).filter(c => c.name === exact || c.ids.includes(exact));
    return { checks: checks.map(c => c.name), outcomes: Object.fromEntries(checks.map(c => [c.name, c.status])) };
  }
  const outcomes = Object.fromEntries(Object.entries(r.outcomes).filter(([name]) => id === null || passageOf(name) === id || name === id));
  const chart = (r.checks || []).filter(c => id !== null && c.ids.includes(id));
  for (const c of chart) outcomes[c.name] = c.status;
  if (id && (r.covers || []).includes(id)) outcomes[id] = 'covered';
  return { checks: Object.keys(outcomes), outcomes };
}
function evidenceItem(a: Analysis, read: Readable, knowledge: LoadedKnowledge, id: string | null, scenario: string | null, deciding: boolean, exact?: string): EvidenceItem {
  const entry = read.entry, q = entry.question, r = entry.answer;
  const fresh = answerFreshness(a, read, knowledge, id, scenario);
  const observed = recordedChecks(entry, id, exact);
  const walk = Boolean(id && /^W[1-9]\d*$/.test(id));
  const sensitivity = q.kind === 'blunder';
  // A state, event, move or refusal is observed on the model side (a refusal by absence), not checked.
  let kind: EvidenceKind = sensitivity ? 'sensitivity' : q.checker === 'external' ? 'external-cases' : walk ? 'path-witness' : q.checker === 'chart' ? 'finite-chart' : q.checker === 'apalache' && r.mode === 'inductive' ? 'inductive-model' : id && /^[SEMR]\d+$/.test(id) ? 'model-observation' : 'bounded-model';
  const vals = Object.values(observed.outcomes);
  let polarity: EvidenceItem['polarity'] = vals.some(isNegative) ? 'counterexample' : vals.some(isPositive) ? 'holds' : 'unknown';
  const witnessed = walk && q.kind !== 'blunder' && r.result === 'as-called' && (r.outcomes[`Not${id}`] === 'violated' || observed.outcomes[id!] === 'covered' || (q.checker === 'chart' && vals.length > 0 && vals.every(isPositive)));
  if (witnessed) polarity = 'witness';
  if (kind === 'model-observation' && a.kind === 'part') {
    const covered = (coversOf({ completed: [read], ir: a.ir, hashes: a.hashes }).covers[id!] || []).length > 0;
    if (covered) polarity = 'observed';
  }
  if (sensitivity) polarity = 'unknown';
  const partial = observed.checks.some(name => (r.partial || []).includes(name));
  const covered = polarity === 'counterexample'
    ? true
    : q.checker === 'external' ? r.result === 'as-called'
    : a.kind === 'part' && id
      ? (coversOf({ completed: [read], ir: a.ir, hashes: a.hashes }).covers[id] || []).length > 0
      : r.result === 'as-called';
  const limitations = [
    ...(kind === 'path-witness' ? ['One recorded path, not every execution.'] : []),
    ...(kind === 'external-cases' ? ['Only the cases identified by the retained external answer. Its runner may use source, a simulator or a stand-in; the checker name establishes no source correspondence.'] : []),
    ...(kind === 'model-observation' ? [id && id.startsWith('R') ? 'A refusal covered by absence: no model action takes the event in that state.' : 'Observed model activity does not establish every execution of the passage.'] : []),
    ...(kind === 'sensitivity' ? ['Tests sensitivity to a fault; supplies no positive production evidence.'] : []),
    ...(kind === 'finite-chart' ? ['Finite chart check; does not establish source or deployment behavior.'] : []),
    ...(kind === 'bounded-model' ? ['Bounded model evidence; does not establish source or deployment behavior.'] : []),
    ...(kind === 'inductive-model' ? ['Induction removes the step bound, within the declared model ranges and assumptions.'] : []),
    ...(partial ? ['The selected check is partial.'] : []),
    ...(r.limitHit ? ['The exploration limit was reached.'] : []),
  ];
  return {
    dossier: a.ref, entry: read.name, path: `${a.ref}/evidence/${read.name}.json`, trial: entry.established.trial,
    checker: q.checker, kind, ...fresh, ...observed, reach: r.reach || null, polarity,
    admissible: fresh.freshness === 'current' && !sensitivity && !partial && covered && (!r.limitHit || ['counterexample', 'witness'].includes(polarity)) && polarity !== 'unknown',
    deciding, basis: sha256(canonical(entry.basis)), limitations,
  };
}

function formalOwner(a: Analysis, id: string, scenario: string | null): OwnerFacet {
  const cell = a.kind === 'composition' && scenario ? a.cells.find(c => c.property === id && c.scenario === scenario) : null;
  return { dossier: a.ref, passage: id, scenario, state: a.owner[id] || null, decision: a.latestDecision[id] || null, accepted: cell?.accepted || null, acceptanceLapsed: cell?.acceptanceLapsed || [] };
}
function empty(target: MappingTarget): TargetResolution { return { target, freshness: 'current', reasons: [], available: false, formal: null, evidence: [], owner: [], dependencies: [], conflicts: [] }; }
function unresolved(r: TargetResolution, reason: string, freshness: Freshness = 'missing'): TargetResolution { r.freshness = freshness; r.reasons.push(reason); return r; }

/** Resolve only this dossier and, for a composition, its declared members. */
export function resolveTarget(target: MappingTarget, context: ResolutionContext): TargetResolution {
  const r = empty(target), { analysis: subject, knowledge } = context;
  if (target.kind === 'knowledge') {
    const pin = resolveKnowledgePin(target, knowledge);
    r.freshness = pin.freshness; r.reasons = pin.reasons;
    if (pin.dependency) r.dependencies.push(pin.dependency);
    if (pin.freshness === 'current' && pin.dependency) {
      r.available = true;
      r.evidence.push({ dossier: subject.ref, entry: null, path: pin.dependency.path, trial: null, checker: null, kind: 'knowledge-backing', freshness: 'current', reasons: [], checks: [target.ref], outcomes: { [target.ref]: 'available' }, reach: null, polarity: 'available', admissible: true, deciding: true, basis: target.revision, limitations: ['Record availability and identity only; semantic support requires independent review.'] });
    }
    return r;
  }
  const allowed = target.dossier === subject.ref || subject.kind === 'composition' && subject.wiring.members.some(m => target.dossier === `parts/${m.part}`);
  if (!allowed) return unresolved(r, `${target.dossier} is outside the subject's allowed dossiers`, 'invalid');
  const a = target.dossier === subject.ref ? subject : context.analyses[target.dossier];
  if (!a) return unresolved(r, `${target.dossier} does not resolve`);
  addDependency(r, 'dossiers', `${a.ref}/prose.md`);
  addDependency(r, 'dossiers', `${a.ref}/integrity.json`);
  addDependency(r, 'dossiers', `${a.ref}/decisions.log`);
  let id: string | null = target.kind === 'cell' ? target.property : target.kind === 'answer' ? passageOf(target.check) || target.question.property || target.question.walk : target.id;
  let scenario = target.kind === 'cell' || target.kind === 'walk' ? target.scenario : target.kind === 'answer' ? target.question.scenario : null;
  let candidates: Readable[] = [], deciding: string[] = [], mark = 'pending', held: string | null = null;
  const open = a.kind === 'composition' ? [...a.closureMissing, ...a.composed.errors] : a.ir.ok ? [] : ['formal prose does not compile'];
  if (target.kind === 'passage' || target.kind === 'walk') {
    if (!id || !a.hashes[id]) return unresolved(r, `passage ${id} does not exist in ${a.ref}`);
    if (target.kind === 'passage' && a.kind === 'composition' && a.prose.properties.some(p => p.id === id)) return unresolved(r, 'a composition property requires a cell target', 'invalid');
    if (target.kind === 'walk' && (a.kind === 'part' ? scenario !== null : !scenario)) return unresolved(r, 'walk scenario must be null for a part and explicit for a composition', 'invalid');
    if (a.kind === 'part') {
      const side = target.kind === 'passage' ? target.side : null;
      const cov = coversOf({ completed: a.completed, ir: a.ir, hashes: a.hashes });
      const touches = cov.touches[id] || [];
      const names = new Set(touches.filter(t => t.kind === 'blunder' || !side || side === 'chart' && t.checker === 'chart' || side === 'model' && modelChecker(t.checker)).map(t => t.entry));
      candidates = a.completed.filter(x => names.has(x.name));
      const m = a.marks[id];
      mark = m?.mark || 'pending'; deciding = m?.entries || [];
      held = ['held', 'hollow'].includes(mark) ? mark : null;
      // Knowledge/external-backed K passages have no chart/model cover. The backing remains visible.
      const k = a.ir.guarantees.find(p => p.id === id);
      if (k?.backing?.kind === 'record') {
        const record = knowledge.resolve(k.backing.ref);
        if (record) {
          const backed = resolveTarget({ kind: 'knowledge', ref: k.backing.ref, revision: `sha256:${record.sha256}` }, context);
          r.evidence.push(...backed.evidence); r.dependencies.push(...backed.dependencies);
        }
      } else if (k?.backing?.kind === 'external') {
        candidates.push(...a.completed.filter(x => x.entry.question.checker === 'external' && (x.entry.answer.covers || []).includes(id!)));
      } else if (k?.backing && ['file', 'certora'].includes(k.backing.kind)) {
        const b = knowledge.backing({ module: a.ir.module, ...k.backing });
        if (b.status === 'backed') {
          addDependency(r, 'knowledge', b.path);
          r.evidence.push({ dossier: a.ref, entry: null, path: b.path, trial: null, checker: null, kind: 'knowledge-backing', freshness: 'current', reasons: [], checks: [id], outcomes: { [id]: 'available' }, reach: null, polarity: 'available', admissible: true, deciding: true, basis: `sha256:${b.sha256}`, limitations: ['Backing availability only; semantic support requires independent review.'] });
        }
      }
    } else if (target.kind === 'walk') {
      const w = a.walks.find(w => w.id === id && w.scenario === scenario);
      if (!w) return unresolved(r, `walk ${id} is not declared under ${scenario}`);
      mark = w.mark; deciding = w.entry ? [w.entry] : [];
      candidates = a.completed.filter(x => x.entry.question.walk === id && x.entry.question.scenario === scenario);
    } else return unresolved(r, 'composition passages without a cell or walk supply no mechanical support');
  } else if (target.kind === 'cell') {
    if (a.kind !== 'composition') return unresolved(r, 'a cell target requires a composition', 'invalid');
    const c = a.cells.find(c => c.property === id && c.scenario === scenario);
    if (!c) return unresolved(r, `cell ${id} × ${scenario} does not exist`);
    mark = c.mark; held = c.held; deciding = c.entry ? [c.entry] : [];
    if (c.impliedBy) scenario = c.impliedBy;
    candidates = a.completed.filter(x => x.entry.question.property === id && (x.entry.question.kind === 'blunder' || x.entry.question.scenario === scenario));
  } else {
    const matches = a.answers.filter(x => x.entry && canonical(x.entry.question) === canonical(target.question));
    if (matches.length !== 1) return unresolved(r, matches.length ? 'question resolves ambiguously' : 'question has no published answer');
    const exact = matches[0];
    if (!exact.entry) return unresolved(r, 'answer is unreadable', 'invalid');
    const selected = recordedChecks(exact.entry, id, target.check);
    if (!selected.checks.length) return unresolved(r, `check ${target.check} is absent from the recorded answer`);
    const fresh = answerFreshness(a, exact, knowledge, id, scenario);
    if (!completed(exact) || fresh.freshness !== 'current') {
      r.freshness = fresh.freshness; r.reasons.push(...fresh.reasons);
    }
    candidates = [exact as Readable]; deciding = [exact.name]; mark = exact.entry.answer.result;
    // A selected passing question cannot conceal another current answer's counterexample.
    if (id) {
      if (a.kind === 'part') {
        const cov = coversOf({ completed: a.completed, ir: a.ir, hashes: a.hashes });
        const names = new Set((cov.touches[id] || []).filter(t => t.kind !== 'blunder').map(t => t.entry));
        candidates.push(...a.completed.filter(x => names.has(x.name) && x.name !== exact.name));
        held = ['held', 'hollow'].includes(a.marks[id]?.mark) ? a.marks[id].mark : null;
      } else {
        candidates.push(...a.completed.filter(x => x.name !== exact.name && x.entry.question.kind !== 'blunder' && (x.entry.question.property === id || x.entry.question.walk === id) && x.entry.question.scenario === scenario));
        held = a.cells.find(c => c.property === id && c.scenario === scenario)?.held || null;
      }
    }
  }
  r.formal = { dossier: a.ref, passage: id, scenario: target.kind === 'cell' || target.kind === 'walk' ? target.scenario : scenario, side: target.kind === 'passage' ? target.side : null, mark, held, open, assumptions: id ? givens(a, id) : [] };
  if (id) r.owner.push(formalOwner(a, id, r.formal.scenario));
  const names = new Set<string>();
  for (const read of candidates) {
    if (names.has(read.name)) continue; names.add(read.name);
    const e = evidenceItem(a, read, knowledge, id, scenario, deciding.includes(read.name), target.kind === 'answer' && read.name === deciding[0] ? target.check : undefined);
    r.evidence.push(e);
    addDependency(r, 'dossiers', e.path);
    if (read.reading !== null) addDependency(r, 'dossiers', `${a.ref}/evidence/${read.name}.md`);
    for (const [ref] of Object.entries(read.entry.basis.snapshot.records)) { const record = knowledge.resolve(ref); if (record) addDependency(r, 'knowledge', record.path); }
  }
  const live = r.evidence.filter(e => e.admissible);
  // A witness is positive evidence too: a counterexample on the same walk conflicts with it.
  const positive = live.filter(e => ['holds', 'observed', 'witness'].includes(e.polarity));
  const negative = live.filter(e => e.polarity === 'counterexample');
  if (positive.length && negative.length) r.conflicts = negative.map(e => `current counterexample in ${e.path} conflicts with positive evidence on the same formal target`);
  const selected = target.kind === 'answer' ? r.evidence.filter(e => e.deciding) : r.evidence;
  r.available = selected.some(e => e.admissible) && !open.length && held !== 'hollow';
  if (r.freshness === 'current' && selected.length && !selected.some(e => e.freshness === 'current')) {
    r.freshness = selected.some(e => e.freshness === 'invalid') ? 'invalid' : selected.some(e => e.freshness === 'stale') ? 'stale' : 'missing';
    r.reasons.push(...selected.flatMap(e => e.reasons));
  }
  if (a.integrity.mode !== 'current') { r.freshness = 'invalid'; r.available = false; r.reasons.push(...a.integrity.problems.map(p => `${p.name}: ${p.where}`)); }
  if (open.length) r.reasons.push(...open);
  r.reasons = unique(r.reasons);
  return r;
}
