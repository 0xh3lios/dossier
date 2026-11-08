// One answer per question. A trial asks a question and gets an answer. The record keeps the current
// answer to each question in its entry, <dossier>/evidence/<name>.json, which only the runner writes,
// with the agent's reading beside it as <name>.md. The trial's bundle stays local, in trials/<id>/.
// Here are the entry, its name, what verify reads of evidence/, and the rules of spec/evidence.md
// (ANSWER-SAME to ANSWER-DROP) by which the runner asks what a new answer may write.
import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { canonical, sha256 } from '../hash.ts';
import { propertyId } from '../verify/covers.ts';
import { ENTRY_NAME, forgets } from '../dossiers/decisions.ts';
import type { Call, Outcome } from './calls.ts';
import type { ForgottenAnswer } from '../dossiers/decisions.ts';
import type { TrialResult } from './trials.ts';
import type { ChartCheck, ChartGap } from '../chart/checks.ts';
import type { TlcCounts, TlcStates, TlcTraceStep, TlcViolation } from './checkers/tlc.ts';
import type { ItfTrace } from './checkers/apalache.ts';
import type { TlaAction } from '../models/tla.ts';
import type { Note } from '../verify/tripwires.ts';

export const EVIDENCE = 'evidence';
// Where a trial runs until its answer is published, and the name of the candidate entry beside its bundle.
export const RUNNING = '.running';
export const CANDIDATE = 'entry.json';

// What a call asks: its kind, the files it executes other than prose.md, the names it expects
// outcomes for, and its cell or walk. The reach belongs to the answer.
export interface Question {
  kind: string;
  checker: string;
  executes: string[];
  expects: string[];
  property: string | null;
  scenario: string | null;
  walk: string | null;
}
// The prediction as the call made it, kept apart from the observation.
export interface Prediction { text: string; reach: string; expect: Record<string, Outcome>; because: string }

// How far a trial looked: in the call's words, and in numbers where the checker gives them.
export interface Reach { text: string; values?: Record<string, number | string>; constants?: Record<string, string | null>; scope?: string }
export type Verdict = 'as-called' | 'miscalled' | 'aborted';
// An action as a TLC answer records it: the move it encodes, and how often it fired.
export type TrialAction = Partial<TlaAction> & TlcCounts;
export interface ApalacheRunSummary { label: string; outcome: string; length: number | null; exitcode: number | null; violatedInvariant: { state: number; index: number } | null; errors: string[] }
// The observation (spec/evidence.md, an entry's answer): the verdict, the outcome per passage, the
// reach, and what else the runner parsed from the checker's output. What only the local bundle
// needs, the command line, the working directory, the timing and Alloy's instance files, stays in
// its result.json.
export interface Answer {
  result: Verdict;
  outcomes: Record<string, string>;
  // The properties the run checked, as the model names them.
  enabled: string[];
  miscalls?: string[];
  reason?: string;
  reach?: Reach;
  // The chart, and the passages an external runner says it covered.
  checks?: ChartCheck[];
  counts?: { total: number; passed: number; failed: number };
  covers?: string[];
  explored?: number;
  limitHit?: boolean;
  gaps?: ChartGap[];
  failing?: string[];
  // TLC, and Apalache's trace.
  violation?: TlcViolation | null;
  trace?: TlcTraceStep[] | ItfTrace | null;
  states?: TlcStates;
  actions?: Record<string, TrialAction>;
  init?: { accepted: number; generated: number } | null;
  partial?: string[];
  errors?: string[];
  warnings?: string[];
  properties?: Record<string, string | null>;
  // Apalache.
  mode?: string | null;
  length?: number | null;
  runs?: ApalacheRunSummary[];
  // An external runner.
  runner?: string;
  evidence?: unknown;
}

// A guarantee's backing as it stood when the trial ran.
export interface BackingSnapshot { status: 'assumed' | 'external' | 'backed' | 'unresolved'; runner?: string; hash?: string; path?: string; reason?: string }
// A composition member as a snapshot holds it: its prose hashed, and each of its guarantees' backing as
// the backing's hash, or its status when it has none. What the member's IR puts into the composition is in
// the module's hash.
export interface MemberSnapshot { prose: string; backing: Record<string, string> }
// The part of a basis taken from the dossier's text and records, hashed when the trial ran:
// passages, the prose's compilation, records and backing, and for a composition its wiring, the
// module the composer wrote, members, scenario, actors and extras.
export interface Snapshot {
  passages: Record<string, string>;
  records: Record<string, string | null>;
  backing: Record<string, BackingSnapshot>;
  ir?: string;
  wiring?: string;
  module?: string | null;
  members?: Record<string, MemberSnapshot>;
  scenario?: string | null;
  actors?: string;
  extras?: string | null;
}
// The declared files and reachable local model imports a trial read from a private copy, hashed.
// Shared toolchains and libraries remain outside it.
export interface InputIdentity { strategy: 'private-copy'; files: Record<string, string>; shared: string[]; limitation: string }
// What an answer rested on, which lapse compares with the present: the snapshot, and the hashes of
// the files the trial executed and of the inputs it captured.
export interface Basis { snapshot: Snapshot; executed: Record<string, string>; inputIdentity: InputIdentity }
// The trial that first gave this answer on this basis, and the digest of its local bundle.
export interface Established { trial: string; at: string; versions: Record<string, string>; bundle: string }
// The last answer to the question whose verdict or outcomes differed from the current one.
export interface Previous { answer: Answer; basis: Basis; established: Established; classification: string | null }
// The answer this one replaced: its trial, and what had moved under it, empty when the basis had not.
export interface Replaced { trial: string; moved: string[] }
export interface Entry {
  schema: 1;
  dossier: string;
  question: Question;
  call: Prediction;
  answer: Answer;
  basis: Basis;
  established: Established;
  previous: Previous | null;
  narrowed: Reach | null;
  replaced: Replaced | null;
}

// An outcome that shows a counterexample or a failed check. A new answer may not turn one into
// a pass on an unchanged basis without the owner (ANSWER-VIOLATION).
const VIOLATING = new Set(['violated', 'fail', 'counterexample']);
export const violating = (outcomes: Record<string, unknown> | null | undefined): boolean => Object.values(outcomes || {}).some(o => VIOLATING.has(o as string));
// Whether an answer holds a counterexample, in its outcomes or in the previous answer's: such an
// answer is superseded only with the owner's forget (ANSWER-SUPERSEDED), which decide may record for it.
export const holdsCounterexample = (outcomes: Record<string, unknown> | null | undefined, previous: { answer: Pick<Answer, 'outcomes'> } | null | undefined): boolean => violating(outcomes) || violating(previous?.answer.outcomes);
// The passage an expectation names: a model's own name for it, such as Inv_A1 or NotW2, or the
// passage id itself, such as an external replay's W1.
export const passageOf = (name: string): string | null => propertyId(name) || (/^[A-Z]\d+$/.test(name) ? name : null);

export function questionOf(result: Pick<TrialResult, 'kind' | 'checker' | 'executed' | 'expect' | 'property' | 'scenario' | 'walk'>): Question {
  return {
    kind: result.kind,
    checker: result.checker,
    executes: Object.keys(result.executed || {}).filter(path => path !== 'prose.md').sort(),
    expects: Object.keys(result.expect || {}).sort(),
    property: result.property ?? null,
    scenario: result.scenario ?? null,
    walk: result.walk ?? null,
  };
}

// The entry's name: the kind, up to six of the passages the question names, its scenario, and six
// hex of the question's digest, so that two questions never share a file.
export function entryName(q: Question): string {
  const ids: string[] = [];
  const add = (id: string | null) => { if (id && !ids.includes(id)) ids.push(id); };
  add(q.property);
  for (const name of q.expects) add(passageOf(name));
  add(q.walk);
  const digest = sha256(JSON.stringify([q.kind, q.checker, q.executes, q.expects, q.property, q.scenario, q.walk])).slice(0, 6);
  return [q.kind, ...ids.slice(0, 6), ...(q.scenario ? [q.scenario] : []), digest].join('-');
}

// The entry a finished trial would publish, before the rules compare it with the recorded one: the one
// mapping from a bundle's result.json to an entry. Its question, prediction, basis and establishing
// trial take their fields out of the result; what remains, but for what only the bundle needs, is
// the answer, in the order the runner wrote it.
export function entryOf(result: TrialResult, call: Pick<Call, 'reach' | 'because'>, callText: string, bundle: string): Entry {
  const { kind, checker, dossier, id, at, versions, command, cwd, exit, seconds, property, scenario, walk, executed, inputIdentity, expect, snapshot, xml, ...answer } = result;
  return {
    schema: 1,
    dossier,
    question: questionOf(result),
    call: { text: callText, reach: call.reach, expect, because: call.because },
    answer,
    basis: { snapshot, executed, inputIdentity },
    established: { trial: id, at, versions, bundle },
    previous: null,
    narrowed: null,
    replaced: null,
  };
}

export const entryText = (entry: Entry): string => JSON.stringify(entry, null, 2) + '\n';

// The files an answer read: the inputs its trial captured, and the files it executed.
export const inputFiles = (basis: Pick<Basis, 'executed' | 'inputIdentity'>): Record<string, string> => ({ ...basis.inputIdentity.files, ...basis.executed });

// What is wrong with an input identity, or null: the private copies' hashes, each one bound to a
// portable path and agreeing with the files executed.
export function inputIdentityProblem(basis: { executed: Record<string, string>; inputIdentity?: InputIdentity | null }): string | null {
  const identity = basis.inputIdentity;
  if (!identity || identity.strategy !== 'private-copy' || !identity.files || typeof identity.files !== 'object' || Array.isArray(identity.files)
    || !Array.isArray(identity.shared) || !identity.shared.every(name => typeof name === 'string') || typeof identity.limitation !== 'string' || !identity.limitation.trim()) return 'invalid private-copy identity';
  for (const [path, hash] of Object.entries(identity.files)) {
    if (!path || path.startsWith('/') || path.includes('\\') || path.split('/').some(part => !part || part === '.' || part === '..') || !/^[0-9a-f]{64}$/.test(hash)) return `invalid input binding: ${path}`;
  }
  for (const [path, hash] of Object.entries(basis.executed || {})) if (identity.files[path] !== hash) return `input identity disagrees with executed file: ${path}`;
  return null;
}

const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(x => typeof x === 'string');
const nullableString = (value: unknown) => value === null || typeof value === 'string';
const VERDICTS = ['as-called', 'miscalled', 'aborted'];
// An answer as an entry must hold it: a verdict, the outcomes and the properties checked.
const answerShaped = (a: unknown) => object(a) && VERDICTS.includes(a.result as string) && object(a.outcomes) && strings(a.enabled);
// A basis as an entry must hold it: the snapshot's passages, records and backing, and a composition's
// wiring, module, scenario, actors, extras and each member's prose and backing, with the files
// executed. Its input identity is checked last, by inputIdentityProblem.
function basisShaped(b: unknown, composition: boolean): boolean {
  if (!object(b) || !object(b.snapshot) || !object(b.executed)) return false;
  const s = b.snapshot;
  if (!object(s.passages) || !object(s.records) || !object(s.backing)) return false;
  return !composition || (typeof s.wiring === 'string' && nullableString(s.module) && nullableString(s.scenario) && typeof s.actors === 'string' && nullableString(s.extras)
    && object(s.members) && Object.values(s.members).every(m => object(m) && typeof m.prose === 'string' && object(m.backing)));
}
const establishedShaped = (e: unknown) => object(e) && typeof e.trial === 'string' && typeof e.at === 'string' && object(e.versions) && typeof e.bundle === 'string' && /^[0-9a-f]{64}$/.test(e.bundle);

// What is wrong with an entry's shape, or null. The runner writes entries; a hand-made one shows here.
export function entryProblem(value: unknown, name: string, ref: string): string | null {
  if (!object(value) || value.schema !== 1) return 'unsupported entry schema; expected 1';
  const keys = ['schema', 'dossier', 'question', 'call', 'answer', 'basis', 'established', 'previous', 'narrowed', 'replaced'];
  if (Object.keys(value).sort().join('|') !== [...keys].sort().join('|')) return `entry fields must be ${keys.join(', ')}`;
  const q = value.question, c = value.call, b = value.basis, p = value.previous, composition = ref.startsWith('compositions/');
  if (!object(q) || typeof q.kind !== 'string' || typeof q.checker !== 'string' || !strings(q.executes) || !strings(q.expects) || !nullableString(q.property) || !nullableString(q.scenario) || !nullableString(q.walk)) return 'malformed question';
  if (!object(c) || typeof c.text !== 'string' || typeof c.reach !== 'string' || !object(c.expect) || typeof c.because !== 'string') return 'malformed call';
  if (!answerShaped(value.answer)) return 'malformed answer';
  if (!basisShaped(b, composition)) return 'malformed basis';
  if (!establishedShaped(value.established)) return 'malformed establishing trial';
  if (p !== null && (!object(p) || !answerShaped(p.answer) || !basisShaped(p.basis, composition) || !establishedShaped(p.established) || !nullableString(p.classification))) return 'malformed previous answer';
  if (value.narrowed !== null && !object(value.narrowed)) return 'malformed narrowed reach';
  if (value.replaced !== null && (!object(value.replaced) || typeof value.replaced.trial !== 'string' || !strings(value.replaced.moved))) return 'malformed replaced answer';
  if (value.dossier !== ref) return `entry names ${String(value.dossier)}, not ${ref}`;
  if (entryName(q as unknown as Question) !== name) return `entry ${name} holds the question of ${entryName(q as unknown as Question)}`;
  for (const basis of [b, ...(p ? [p.basis] : [])] as Basis[]) {
    const identity = inputIdentityProblem(basis);
    if (identity) return `input identity malformed: ${identity}`;
  }
  return null;
}

// The digests of the candidate entries waiting in .running/<id>/entry.json, by digest.
export function candidateDigests(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const running = join(dir, RUNNING);
  if (!existsSync(running)) return out;
  for (const id of readdirSync(running)) {
    const path = join(running, id, CANDIDATE);
    try { if (lstatSync(path).isFile()) out[sha256(readFileSync(path))] = id; } catch { /* No candidate there. */ }
  }
  return out;
}

// The files in evidence/, dot files aside, sorted: each entry, <name>.json, with its reading,
// <name>.md, beside it, and whatever else lies there. Throws when evidence/ is a symbolic link or no
// directory, so that nothing is read through one.
function evidenceFiles(dir: string): string[] {
  const folder = join(dir, EVIDENCE);
  if (!existsSync(folder)) return [];
  const stat = lstatSync(folder);
  if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`${EVIDENCE}/ must be a directory, not a symbolic link or special file`);
  return readdirSync(folder).filter(n => !n.startsWith('.')).sort();
}
// The names of the entries in evidence/. An evidence/ that is no directory holds none; readEvidence
// says what is wrong with it.
export function listEntries(dir: string): string[] {
  try { return evidenceFiles(dir).filter(file => file.endsWith('.json')).map(file => file.slice(0, -5)); } catch { return []; }
}

// An answer as verify reads it: the name of its entry, the entry, null when it does not read, the
// reading beside it, and what is wrong with it. An answer with a problem is void: it covers nothing.
export interface AnswerRead { name: string; entry: Entry | null; reading: string | null; problems: Note[] }
// An answer whose entry reads.
export type Readable = AnswerRead & { entry: Entry };
export const readable = (a: AnswerRead): a is Readable => a.entry !== null;
// Whether an answer counts: its entry reads, nothing is wrong with it, and its trial completed.
export const completed = (a: AnswerRead): a is Readable => a.entry !== null && a.problems.length === 0 && a.entry.answer.result !== 'aborted';

// Answers in the order they were established: by time, then by trial id. An entry that does not read
// has no time, and comes first, by name.
export function byEstablished(x: AnswerRead, y: AnswerRead): number {
  if (!x.entry || !y.entry) return x.entry ? 1 : y.entry ? -1 : x.name < y.name ? -1 : x.name > y.name ? 1 : 0;
  const a = x.entry.established, b = y.entry.established;
  return a.at < b.at ? -1 : a.at > b.at ? 1 : a.trial < b.trial ? -1 : a.trial > b.trial ? 1 : 0;
}

// What verify reads of a dossier's evidence: each entry's answer, in the order established; the
// entries integrity.json binds whose file is gone, unless the owner forgot them; the files in
// evidence/ that are no entry's; and the notes on what is wrong outside any one entry: evidence/
// that is no directory, a candidate integrity.json does not bind, the stray files and the removed
// entries.
export interface EvidenceRead { answers: AnswerRead[]; removed: string[]; stray: string[]; notes: Note[] }
// Every tripwire of a dossier's evidence, each entry's first: the one mapping from what readEvidence
// found to what verify, the runner's preflight and the audit of a retired dossier report.
export const evidenceNotes = ({ answers, notes }: Pick<EvidenceRead, 'answers' | 'notes'>): Note[] => [...answers.flatMap(a => a.problems), ...notes];

// With `present`, an unbound entry whose question is gone is no problem: it covers nothing, and the next
// publication removes it (ANSWER-GONE, ANSWER-DROP). Without it, every unbound entry is reported.
export function readEvidence(dir: string, bindings: Record<string, string> | null, forgotten: Record<string, ForgottenAnswer>, ref: string, present?: Present): EvidenceRead {
  const out: EvidenceRead = { answers: [], removed: [], stray: [], notes: [] };
  let files: string[];
  try { files = evidenceFiles(dir); } catch (error) { out.notes.push({ name: 'answer malformed', where: (error as Error).message }); return out; }
  const folder = join(dir, EVIDENCE);
  const candidates = candidateDigests(dir);
  // A run still waiting in .running/ with no candidate beside it: its publication was interrupted
  // after its entry was placed, before the superseded entries were deleted, and recover finishes it.
  const waiting = existsSync(join(dir, RUNNING)) ? readdirSync(join(dir, RUNNING)).filter(id => !Object.values(candidates).includes(id) && lstatSync(join(dir, RUNNING, id)).isDirectory()).sort() : [];
  const unboundHint = waiting.length ? `; a run waits in ${RUNNING}/${waiting[0]}/, and dossier recover ${ref} trial ${waiting[0]} finishes its publication` : '';
  const entries = new Set(files.filter(n => n.endsWith('.json')).map(n => n.slice(0, -5)));
  for (const file of files) {
    const path = join(folder, file);
    const stat = lstatSync(path);
    if (file.endsWith('.md') && entries.has(file.slice(0, -3)) && stat.isFile() && !stat.isSymbolicLink()) continue;
    if (!file.endsWith('.json') || !ENTRY_NAME.test(file.slice(0, -5)) || !stat.isFile() || stat.isSymbolicLink()) { out.stray.push(file); continue; }
    const name = file.slice(0, -5);
    // A tripwire on this entry, named, with where it was found and why.
    const problems: Note[] = [];
    const problem = (tripwire: string, why?: string) => problems.push({ name: tripwire, where: `${EVIDENCE}/${file}: ${why ? `${tripwire}: ${why}` : tripwire}` });
    const bytes = readFileSync(path);
    let entry: Entry | null = null;
    try {
      const parsed = JSON.parse(bytes.toString('utf8'));
      const shape = entryProblem(parsed, name, ref);
      if (!shape) entry = parsed as Entry;
      else if (shape.startsWith('input identity malformed: ')) problem('input identity malformed', shape.slice('input identity malformed: '.length));
      else problem('answer malformed', shape);
    } catch (error) { problem('answer malformed', (error as Error).message); }
    const bound = bindings ? bindings[name] : undefined;
    if (!bindings) problem('integrity unavailable');
    else if (bound === undefined) { if (!(entry && present && questionGone(entry.question, present))) problem('answer unbound', `integrity.json does not bind it${unboundHint}`); }
    else if (bound !== sha256(bytes)) {
      if (candidates[bound]) problem('answer publication incomplete', `the candidate in ${RUNNING}/${candidates[bound]}/ is bound and not yet in place`);
      else problem('answer edited', 'its bytes no longer match the digest integrity.json binds');
    }
    // A reading is read only from a regular file: a link or a special file in its place is a stray file,
    // and verify neither follows the one nor waits on the other.
    const readingPath = join(folder, `${name}.md`);
    const readingStat = lstatSync(readingPath, { throwIfNoEntry: false });
    out.answers.push({ name, entry, reading: readingStat && readingStat.isFile() ? readFileSync(readingPath, 'utf8') : null, problems });
  }
  // A candidate no binding names: a publication interrupted before integrity.json bound it.
  const boundDigests = new Set(Object.values(bindings || {}));
  for (const [digest, id] of Object.entries(candidates)) if (bindings && !boundDigests.has(digest)) out.notes.push({ name: 'answer publication incomplete', where: `${RUNNING}/${id}/${CANDIDATE}: a candidate integrity.json does not bind; finish it with dossier recover ${ref} trial ${id}` });
  for (const [name, digest] of Object.entries(bindings || {})) {
    if (entries.has(name)) continue;
    if (candidates[digest]) out.notes.push({ name: 'answer publication incomplete', where: `${EVIDENCE}/${name}.json: the candidate in ${RUNNING}/${candidates[digest]}/ is bound and not yet in place` });
    else if (!forgets(forgotten[name], digest)) out.removed.push(name);
  }
  if (out.stray.length) out.notes.push({ name: 'stray files', where: `${EVIDENCE}/: ${out.stray.join(', ')}` });
  // An entry integrity.json binds whose file is gone: the record lost it. It stays lost, verify after
  // verify, until the file is back or the owner forgets it.
  for (const name of out.removed) out.notes.push({ name: 'answer removed', where: `${EVIDENCE}/${name}.json; restore it, or the owner forgets ${name}@${bindings![name].slice(0, 8)}` });
  out.answers.sort(byEstablished);
  return out;
}

// Whether a question no longer exists: a passage or a walk it names, its scenario, or an authored
// file it executes is gone. Generated views (chart/ but its blunders, model/generated/) are the
// tools' to rewrite.
export interface Present { passages: Record<string, string>; scenarios: Set<string> | null; walks: Set<string> | null; fileExists: (path: string) => boolean }
export function questionGone(q: Question, present: Present): string | null {
  for (const id of [q.property, q.walk, ...q.expects.map(n => passageOf(n))]) if (id && !Object.hasOwn(present.passages, id)) return `${id} is gone`;
  if (q.scenario && present.scenarios && !present.scenarios.has(q.scenario)) return `scenario ${q.scenario} is gone`;
  if (q.walk && present.walks && !present.walks.has(q.walk)) return `${q.walk} is gone`;
  for (const path of q.executes) if (!/^(chart\/(?!blunders\/)|model\/generated\/)/.test(path) && !present.fileExists(path)) return `${path} is gone`;
  return null;
}

// The reading's classification of a miscall: its `classification:` line, or null.
export function readingClassification(text: string | null | undefined): string | null {
  const m = text && text.match(/^classification:\s*(.+)$/m);
  return m ? m[1].trim() : null;
}
// The five classifications of a miscall (spec/models.md, classifying a miscall), the only words a
// `classification:` line may carry: the route reads them whole, and verify trips on any other.
export const MODEL_MISREAD = ['model misread prose, action', 'model misread prose, property'] as const;
export const CHART_DIFFERS = 'chart differs from prose';
export const PROSE_AT_FAULT = 'prose at fault';
export const CALL_WAS_WRONG = 'call was wrong';
export const CLASSIFICATIONS: readonly string[] = [...MODEL_MISREAD, CHART_DIFFERS, PROSE_AT_FAULT, CALL_WAS_WRONG];

// Two answers are the same when their verdicts, outcomes and reach are equal (ANSWER-SAME).
export function sameAnswer(x: Pick<Answer, 'result' | 'outcomes' | 'reach'>, y: Pick<Answer, 'result' | 'outcomes' | 'reach'>): boolean {
  return x.result === y.result && canonical(x.outcomes) === canonical(y.outcomes) && canonical(x.reach ?? null) === canonical(y.reach ?? null);
}
const sameVerdict = (x: Answer, y: Answer) => x.result === y.result && canonical(x.outcomes) === canonical(y.outcomes);

// The later reach looks less far than the earlier one: every numeric value they share is no
// larger, and one is smaller. Says how, or null.
export function narrowerReach(now: Reach | null | undefined, before: Reach | null | undefined): string | null {
  const a = (now && now.values) || {}, b = (before && before.values) || {};
  const names = Object.keys(b).filter(n => n in a && typeof a[n] === 'number' && typeof b[n] === 'number');
  if (names.length && names.every(n => (a[n] as number) <= (b[n] as number)) && names.some(n => (a[n] as number) < (b[n] as number))) return names.map(n => `${n} ${b[n]}→${a[n]}`).join(', ');
  return null;
}

// The outcomes a new answer turns from a counterexample or a failed check into anything else.
export function droppedViolations(before: Answer, after: Answer): string[] {
  return Object.entries(before.outcomes || {}).filter(([name, o]) => VIOLATING.has(o) && !VIOLATING.has((after.outcomes || {})[name])).map(([name]) => name);
}

// What a new answer may write, by the evidence rules. `moved` is what moved under the recorded answer
// (basisMoved, in src/verify/lapse.ts), `forgiven` whether the owner's forget names the recorded
// entry, and `classification` the classification line of the recorded answer's reading.
export type Ruling =
  | { action: 'write'; entry: Entry; replaced: boolean }
  | { action: 'keep'; reason: string }
  | { action: 'refuse'; reason: string };
export function rule(current: Entry | null, next: Entry, { moved, forgiven, classification }: { moved: string[]; forgiven: boolean; classification: string | null }): Ruling {
  const aborted = next.answer.result === 'aborted';
  if (!current) return { action: 'write', entry: next, replaced: false };
  if (aborted) return { action: 'keep', reason: 'the trial aborted, and an aborted trial never replaces a recorded answer' };
  const unchanged = moved.length === 0;
  if (current.answer.result !== 'aborted') {
    if (unchanged && sameAnswer(current.answer, next.answer)) return { action: 'keep', reason: 'the same answer on an unchanged basis; nothing is written' };
    if (current.answer.result === 'miscalled' && !classification) return { action: 'refuse', reason: 'the recorded answer is a miscall whose reading has no classification: line; classify it first' };
    const dropped = droppedViolations(current.answer, next.answer);
    if (unchanged && dropped.length && !forgiven) return { action: 'refuse', reason: `on an unchanged basis this answer would turn ${dropped.join(', ')} from a counterexample into a pass; that needs the owner's forget of the recorded answer` };
  }
  const differs = current.answer.result !== 'aborted' && !sameVerdict(current.answer, next.answer);
  const previous = differs ? { answer: current.answer, basis: current.basis, established: current.established, classification } : current.previous;
  // The furthest reach an earlier answer looked, kept while the new one looks less far (ANSWER-REPLACE).
  const earlier = [current.narrowed, current.answer.result === 'aborted' ? null : current.answer.reach ?? null].filter((r): r is Reach => Boolean(r));
  const furthest = earlier.reduce<Reach | null>((best, r) => (!best || narrowerReach(best, r) ? r : best), null);
  const narrowed = furthest && narrowerReach(next.answer.reach, furthest) ? furthest : null;
  return { action: 'write', entry: { ...next, previous, narrowed, replaced: { trial: current.established.trial, moved } }, replaced: true };
}
