// One part or one composition, read whole: records, decisions, doubts, chart, models, and the
// answers in evidence/; then covers, marks or cells, tripwires, the summary and the next loop.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileHash, proseHash, sha256, short } from '../hash.ts';
import { parseDecisions, ownerColumn, answeredDoubts, acceptedRisks, forgets, forgottenAnswers, isRetired } from '../dossiers/decisions.ts';
import { readIntegrity } from '../dossiers/integrity.ts';
import { completed, inputFiles, questionGone, readable, readEvidence, readingClassification } from '../trials/answers.ts';
import type { AnswerRead, BackingSnapshot, Present, Readable, Verdict } from '../trials/answers.ts';
import type { IntegrityRead } from '../dossiers/integrity.ts';
import { parseDoubts } from '../dossiers/doubts.ts';
import { parseTla } from '../models/tla.ts';
import { parseAls } from '../models/alloy.ts';
import { coversOf } from './covers.ts';
import { marksOf } from './marks.ts';
import { actorsHash, backingOf, cellsOf, moduleHash, scenarioHash, walksOf } from './cells.ts';
import { partTripwires, compositionTripwires } from './tripwires.ts';
import { routePart, routeComposition } from './route.ts';
import { conclusionsOf, groundOf, supersededAmong } from './superseded.ts';
import { loadPart, loadComposition, compositionModuleText } from '../dossiers/load.ts';
import { readWiring } from '../dossiers/wiring.ts';
import { actorId, findActor } from '../dossiers/actors.ts';
import { listParts } from '../dossiers/root.ts';
import type { Actor, ActorsModel } from '../dossiers/actors.ts';
import type { AcceptedRisk, ChainBreak, DecisionLine, ForgottenAnswer, LatestDecision, OwnerState } from '../dossiers/decisions.ts';
import type { Doubt } from '../dossiers/doubts.ts';
import type { PartLoad, LoadedKnowledge, CompositionLoad } from '../dossiers/load.ts';
import type { Marker } from '../dossiers/root.ts';
import type { Cfg, TlaModule } from '../models/tla.ts';
import type { Als } from '../models/alloy.ts';
import type { Passage, SeamForm } from '../prose/prose.ts';
import type { BackingState, Mark } from './marks.ts';
import type { Cell, WalkMark } from './cells.ts';
import type { Now, PresentState } from './lapse.ts';
import type { Route } from './route.ts';
import type { Note } from './tripwires.ts';

// A doubt, with a doubt's answer, the owner's decision that closes it.
export type AnsweredDoubt = Doubt & { answered?: string | null };
// One answer as the ledger's machine form and verify --json list it: its entry, the trial that
// established it, when, its question's kind, checker and cell, its verdict, the tripwires its entry
// trips, its reading's classification, and the dossier's passages as its trial found them, hashed as
// the ledger's header hashes them now.
export interface AnswerRow {
  entry: string;
  trial: string;
  at: string;
  kind: string;
  checker: string;
  completed: boolean;
  void: boolean;
  result: Verdict;
  property: string | null;
  scenario: string | null;
  problems: string[];
  classification: string | null;
  prose: string;
  // The question no longer exists: the entry covers nothing until the next publication removes it.
  gone?: true;
  // The answers that decide stand in for the entry (ANSWER-SUPERSEDED).
  superseded?: true;
}
// A part's seams, read by the parts that state the other side.
export interface SeamSet { id: string; title: string; seams: SeamForm[] }
// A review under reviews/, by file name, with the prose hash its first line names, `prose@<hash>`, as
// the review skill writes it from the verify summary line (spec/review.md, REVIEW-OWED). A hash quoted
// further down, in a copied verify line or a finding, names nothing.
export interface ReviewRead { file: string; prose: string | null }
function reviewsOf(dir: string): ReviewRead[] {
  const folder = join(dir, 'reviews');
  if (!existsSync(folder)) return [];
  return readdirSync(folder).filter(n => n.endsWith('.md') && !n.startsWith('.')).sort().map(file => {
    const m = readFileSync(join(folder, file), 'utf8').split('\n')[0].trim().match(/^prose@([0-9a-f]{6})$/);
    return { file, prose: m ? m[1] : null };
  });
}
// Whether a second read is owed (spec/review.md): the dossier holds marks a reviewer judges, and no
// review names its current prose. Why, for the flag and the next step, or null.
export function reviewOwedWhy(reviews: ReviewRead[], hashes: Record<string, string>, judged: boolean): string | null {
  if (!judged) return null;
  const now = proseHash(hashes);
  if (reviews.some(r => r.prose === now)) return null;
  const latest = reviews.at(-1);
  return latest ? `reviews/${latest.file} read prose@${latest.prose || 'none named'}; now prose@${now}` : `no review at prose@${now}`;
}
// What both analyses add to the dossier as loaded.
interface Analyzed {
  ref: string;
  title: string;
  pluginVersion?: string;
  marker?: Marker;
  integrity: IntegrityRead;
  decisions: DecisionLine[];
  broken: ChainBreak | null;
  // The answers the owner let go of, by entry; the entries integrity.json binds whose file is gone; and
  // the entries whose question no longer exists.
  forgotten: Record<string, ForgottenAnswer>;
  removed: string[];
  gone: Record<string, string>;
  // The entries that the answers that decide stand in for, with why each stays or goes, and the ones
  // among them that the next publication removes (ANSWER-SUPERSEDED, ANSWER-DROP).
  superseded: Record<string, string>;
  supersededRemovable: string[];
  // The reviews under reviews/, and why a second read is owed, or null (spec/review.md).
  reviews: ReviewRead[];
  reviewOwed: string | null;
  // What readEvidence found wrong in evidence/ outside any one entry (EvidenceRead.notes).
  evidenceNotes: Note[];
  hashes: Record<string, string>;
  owner: Record<string, OwnerState>;
  latestDecision: Record<string, LatestDecision>;
  doubts: AnsweredDoubt[];
  // Each doubt's answer, by doubt.
  doubtAnswers: Record<string, string | null>;
  // Every answer in evidence/, in the order established; the completed ones whose question stands,
  // which the covers, the marks and the cells read; and the rows of those that read.
  answers: AnswerRead[];
  completed: Readable[];
  answerRows: AnswerRow[];
  tripwires: Note[];
  flags: Note[];
  summary: Record<string, number>;
  route: Route;
}
export interface PartAnalysis extends PartLoad, Analyzed {
  actors: ActorsModel | null;
  actorOf: (sender: string | null) => Actor | null;
  parts: string[];
  partOf: (sender: string | null) => string | null;
  // The retired parts: a sender among them is named as such.
  retired: string[];
  retiredOf: (sender: string | null) => string | null;
  tier: string;
  openDoubtOn: Record<string, string[]>;
  chart: { gaps: string[]; blunders?: string[] };
  modules: Record<string, TlaModule>;
  cfgs: Record<string, Cfg>;
  als: Record<string, Als>;
  modelFiles: string[];
  modelCited: Set<string>;
  definitions: Record<string, string>;
  models: { modules: string[]; als: string[]; cited: string[] };
  currentModelHashes: Record<string, string>;
  // Every file a completed answer's trial executed or captured, hashed now; null where it is gone.
  files: Record<string, string | null>;
  counterpart: Record<string, boolean>;
  // The model files that changed since the latest completed answer's trial executed them, with its entry.
  changedModelFiles: { file: string; entry: string }[];
  backing: Record<string, BackingState>;
  pins: Record<string, string | null>;
  marks: Record<string, Mark>;
  usedBy: string[];
  // Set when no composition reports the actors files: the first open part's tripwires then do.
  reportActors: boolean;
}
export interface CompositionAnalysis extends CompositionLoad, Analyzed {
  risks: Record<string, AcceptedRisk>;
  generated: string;
  closureMissing: string[];
  cells: Cell[];
  propertyHeld: Record<string, string>;
  // Each Walk passage under its scenario, marked from its witness answers.
  walks: WalkMark[];
  // The records the members and the actors the composition uses pin, hashed now; null where one does not resolve.
  pins: Record<string, string | null>;
}
export type Analysis = PartAnalysis | CompositionAnalysis;

const read = (p: string) => (existsSync(p) ? readFileSync(p, 'utf8') : '');

// The doubts in doubts.md, each open until a doubt's answer, a decision bound to its alternatives, closes it.
function doubtsOf(dir: string, decisions: DecisionLine[]): { doubts: AnsweredDoubt[]; doubtAnswers: Record<string, string | null> } {
  const parsed = parseDoubts(read(join(dir, 'doubts.md')));
  const doubtAnswers = answeredDoubts(decisions, Object.fromEntries(parsed.filter(d => !d.malformed.length).map(d => [d.id, d.hash])));
  const doubts = parsed.map((d): AnsweredDoubt => ({ ...d, status: doubtAnswers[d.id] ? 'closed' : 'open', answer: doubtAnswers[d.id] || null, answered: doubtAnswers[d.id] || null }));
  return { doubts, doubtAnswers };
}

// The entries among some answers whose question no longer exists, with why: each covers nothing until
// a publication removes it (ANSWER-GONE, ANSWER-DROP).
const goneAmong = (answers: AnswerRead[], present: Present): Record<string, string> => Object.fromEntries(answers.flatMap(a => {
  const why = a.entry && questionGone(a.entry.question, present);
  return why ? [[a.name, why]] : [];
}));
// The dossier's answers: the ones whose question is gone, and the completed ones whose question
// stands, which the covers, the marks and the cells read.
function evidenceOf(f: Analyzed, present: Present, answers: AnswerRead[]): void {
  f.answers = answers;
  f.gone = goneAmong(answers, present);
  f.completed = answers.filter((a): a is Readable => completed(a) && !f.gone[a.name]);
}
// Whether the owner's forget names an entry as it stands: at the digest the manifest binds.
const forgivenBy = (f: Analyzed, name: string): boolean => forgets(f.forgotten[name], f.integrity.manifest?.evidence[name]);
// The answers as the ledger lists them, one row per entry that reads.
function rowsOf(answers: AnswerRead[], gone: Record<string, string>, superseded: Record<string, string>): AnswerRow[] {
  return answers.filter(readable).map(({ name, entry, reading, problems }) => ({
    entry: name, trial: entry.established.trial, at: entry.established.at, kind: entry.question.kind, checker: entry.question.checker,
    completed: problems.length === 0 && entry.answer.result !== 'aborted', void: problems.length > 0, result: entry.answer.result,
    property: entry.question.property, scenario: entry.question.scenario, problems: problems.map(p => p.name),
    classification: readingClassification(reading), prose: proseHash(entry.basis.snapshot.passages),
    ...(gone[name] ? { gone: true as const } : {}), ...(superseded[name] ? { superseded: true as const } : {}),
  }));
}

// With `answers`, the answers are the ones given instead of the ones in evidence/: how a publication
// asks which answers are superseded among the entries it is about to leave.
export function analyzePart({ root, id, loaded, knowledge, pluginVersion, marker, actors, others = [], usedBy = [], parts, retired, reportActors = false, answers: given }: { root: string; id: string; loaded?: PartLoad | null; knowledge: LoadedKnowledge; pluginVersion?: string; marker?: Marker; actors?: ActorsModel | null; others?: SeamSet[]; usedBy?: string[]; parts?: string[]; retired?: string[]; reportActors?: boolean; answers?: AnswerRead[] }): PartAnalysis {
  // Filled in below.
  const f = (loaded || loadPart(root, id)) as PartAnalysis;
  f.kind = 'part'; f.ref = `parts/${id}`; f.title = f.ir.name || id; f.pluginVersion = pluginVersion; f.marker = marker;
  const { dir, ir, prose } = f;
  f.actors = actors || null;
  f.reportActors = reportActors;
  f.actorOf = (sender) => (actors ? findActor(actors, sender) : null);
  // The open parts and the retired ones, as verify lists them; a retired part is no sender.
  const listed = parts && retired ? [] : listParts(root);
  const retiredIds = retired || listed.filter(cid => isRetired(join(root, 'parts', cid)));
  const partIds = parts || listed.filter(cid => !retiredIds.includes(cid));
  f.parts = partIds;
  f.partOf = (sender) => (sender && partIds.includes(actorId(sender)) ? actorId(sender) : null);
  f.retired = retiredIds;
  f.retiredOf = (sender) => (sender && retiredIds.includes(actorId(sender)) ? actorId(sender) : null);
  f.integrity = readIntegrity(dir, root);
  const { decisions, broken } = parseDecisions(f.integrity.decisions);
  f.decisions = decisions; f.broken = broken;
  f.forgotten = forgottenAnswers(decisions);
  f.hashes = ir.hashes;
  ({ column: f.owner, latest: f.latestDecision } = ownerColumn(decisions, f.hashes));
  f.tier = prose.tier;
  ({ doubts: f.doubts, doubtAnswers: f.doubtAnswers } = doubtsOf(dir, decisions));
  f.openDoubtOn = {};
  for (const d of f.doubts) if (d.status !== 'closed') for (const pid of d.on) (f.openDoubtOn[pid] ||= []).push(d.id);

  // The chart is the IR drawn: an answer whose trial executed chart/machine.json is compared with the
  // IR's JSON, so deleting or editing the grid or the machine on disk changes nothing here.
  const expected = JSON.stringify(ir, null, 2) + '\n';
  f.chart = { gaps: [] };
  f.chart.blunders = existsSync(join(dir, 'chart', 'blunders')) ? readdirSync(join(dir, 'chart', 'blunders')).filter(x => x.endsWith('.json')).sort() : [];
  f.reviews = reviewsOf(dir);

  // Models as they stand.
  f.modules = {}; f.cfgs = {}; f.als = {}; f.modelFiles = [];
  const modelDir = join(dir, 'model');
  if (existsSync(modelDir)) for (const entry of readdirSync(modelDir).sort()) {
    const full = join(modelDir, entry);
    if (statSync(full).isDirectory()) { if (entry === 'blunders') for (const b of readdirSync(full).sort()) f.modelFiles.push(`model/blunders/${b}`); continue; }
    f.modelFiles.push(`model/${entry}`);
    if (entry.endsWith('.scaffold.tla')) continue;
    if (entry.endsWith('.tla')) f.modules[entry] = parseTla(readFileSync(full, 'utf8'));
    else if (entry.endsWith('.als')) f.als[entry] = parseAls(readFileSync(full, 'utf8'));
  }
  f.modelCited = new Set(); f.definitions = {};
  for (const mod of Object.values(f.modules)) {
    for (const action of Object.values(mod.actions)) {
      if (f.hashes[action.move]) f.modelCited.add(action.move);
      for (const ev of ir.events) if (ev.name === action.event) f.modelCited.add(ev.id);
      for (const st of ir.states) if (action.targets.includes(st.key)) f.modelCited.add(st.id);
    }
    for (const name of mod.properties) {
      const pid = (name.match(/^(?:Inv_)?(A\d+|O\d+|N\d+|R\d+)(?:_\w+)?$/) || [])[1] || (name.match(/^(?:Not)?(W\d+)(?:_End)?$/) || [])[1];
      if (pid && f.hashes[pid]) f.modelCited.add(pid);
    }
    for (const [name, d] of Object.entries(mod.definitions)) f.definitions[name] = d.hash;
    const init = ir.states.find(s => s.key === ir.initial);
    if (init && mod.definitions.Init) f.modelCited.add(init.id);
  }
  const modules = Object.values(f.modules);
  if (modules.length && ir.transitions.every(mv => modules.some(m => Object.values(m.actions).some(x => x.move === mv.id)))) for (const rf of ir.refusals) f.modelCited.add(rf.id);
  for (const mod of Object.values(f.als)) for (const item of [...mod.items, ...mod.commands]) if (item.passage && f.hashes[item.passage]) f.modelCited.add(item.passage);
  f.models = { modules: Object.keys(f.modules), als: Object.keys(f.als), cited: [...f.modelCited] };
  f.currentModelHashes = {};
  for (const file of f.modelFiles) f.currentModelHashes[file] = fileHash(join(dir, file));

  const present: Present = { passages: f.hashes, scenarios: null, walks: null, fileExists: path => existsSync(join(dir, path)) };
  const evidence = readEvidence(dir, f.integrity.manifest ? f.integrity.manifest.evidence : null, f.forgotten, f.ref, present);
  f.removed = evidence.removed; f.evidenceNotes = evidence.notes;
  f.counterpart = {};
  for (const s of ir.seams) {
    const other = others.find(o => o.id === s.piece || o.title === s.piece);
    f.counterpart[s.id] = Boolean(other && other.seams.some(x => (x.piece === f.title || x.piece === id) && x.body === s.body));
  }
  f.pins = {};
  for (const p of ir.pins) { const r = knowledge.resolve(p); f.pins[p] = r ? r.hash : null; }
  f.usedBy = usedBy;

  // From the answers on: what verify concludes. It runs on a copy of the analysis, without one answer,
  // to tell whether the others stand in for that one (ANSWER-SUPERSEDED), then once on the whole.
  const conclude = (g: PartAnalysis, list: AnswerRead[]): PartAnalysis => {
    evidenceOf(g, present, list);
    g.files = {};
    for (const a of g.completed) for (const path of Object.keys(inputFiles(a.entry.basis))) {
      if (Object.hasOwn(g.files, path)) continue;
      const full = join(dir, path);
      g.files[path] = path === 'chart/machine.json'
        ? sha256(expected)
        : existsSync(full) && statSync(full).isFile() ? fileHash(full) : null;
    }
    // The model files that changed since the latest completed answer's trial executed them: only that
    // trial's files are compared (spec/evidence.md, the next step).
    g.changedModelFiles = [];
    const last = g.completed.at(-1);
    if (last) for (const [file, hash] of Object.entries(inputFiles(last.entry.basis))) if (g.currentModelHashes[file] && g.currentModelHashes[file] !== hash && !g.changedModelFiles.some(c => c.file === file)) g.changedModelFiles.push({ file, entry: last.name });

    // Backing of guarantees, resolved now. An external backing stands on the latest external answer
    // that tried the guarantee: as called, listing it among what it covers, at its current words.
    g.backing = {};
    for (const k of ir.guarantees) {
      if (!k.backing || k.backing.kind === 'none') { g.backing[k.id] = { status: 'assumed' }; continue; }
      if (k.backing.kind === 'external') {
        const runner = k.backing.runner;
        const runs = g.completed.filter(a => a.entry.question.checker === 'external' && (!runner || a.entry.answer.runner === runner) && (Object.hasOwn(a.entry.call.expect, k.id) || (a.entry.answer.covers || []).includes(k.id)));
        const last = runs[runs.length - 1];
        if (!last) g.backing[k.id] = { status: 'unresolved', reason: 'no external answer covers it yet' };
        else if (last.entry.answer.result !== 'as-called' || !(last.entry.answer.covers || []).includes(k.id)) g.backing[k.id] = { status: 'unresolved', reason: `evidence/${last.name}.json, the latest external answer on it, did not cover it as called` };
        else if (last.entry.basis.snapshot.passages[k.id] !== g.hashes[k.id]) g.backing[k.id] = { status: 'unresolved', reason: `${k.id} changed since evidence/${last.name}.json` };
        else g.backing[k.id] = { status: 'backed', path: `evidence/${last.name}.json` };
        continue;
      }
      if (k.backing.kind === 'record') { const r = knowledge.resolve(k.backing.ref); g.backing[k.id] = r ? { status: 'backed', hash: r.hash, path: r.path } : { status: 'unresolved', reason: `${k.backing.ref} does not resolve in the knowledge base` }; continue; }
      const b = knowledge.backing({ module: ir.module, ...k.backing });
      g.backing[k.id] = b.status === 'backed' ? { status: 'backed', hash: b.hash, path: b.path } : { status: 'unresolved', reason: b.reason };
    }

    // The latest chart answer's gaps are this prose's gaps only while the prose compiles as it did then.
    const latestChart = [...g.completed].reverse().find(a => a.entry.question.checker === 'chart' && a.entry.question.kind === 'chart');
    g.chart = { ...g.chart, gaps: latestChart && latestChart.entry.basis.snapshot.ir === g.irHash ? (latestChart.entry.answer.gaps || []).map(x => x.message) : [] };

    // The present as lapse compares each answer's basis with it: the passages, the compilation, the
    // records the part pins and each guarantee's backing as a trial's snapshot would hold them now,
    // an external one as external whatever its runs, and the files hashed now.
    const backingNow: Record<string, BackingSnapshot> = Object.fromEntries(ir.guarantees.map(k => [k.id, k.backing && k.backing.kind === 'external' ? { status: 'external' as const } : g.backing[k.id]]));
    const now: Now = { snapshot: { passages: g.hashes, ir: g.irHash, records: g.pins, backing: backingNow }, file: path => g.files[path] ?? null };
    const cov = coversOf({ completed: g.completed, ir, hashes: g.hashes });
    g.marks = ir.ok ? marksOf({ ir, tier: g.tier, ...cov, now, forgotten: name => forgivenBy(g, name), counterpart: g.counterpart, backing: g.backing, openDoubtOn: g.openDoubtOn, owner: g.owner }) : {};
    g.reviewOwed = reviewOwedWhy(g.reviews, g.hashes, Object.values(g.marks).some(m => ['checked', 'proved', 'backed'].includes(m.mark)));
    ({ tripwires: g.tripwires, flags: g.flags } = partTripwires(g));
    const active = prose.passages.filter(p => !p.retired);
    const count = (pred: (p: Passage) => unknown) => active.filter(pred).length;
    const of = (mark: string) => count(p => g.marks[p.id] && g.marks[p.id].mark === mark);
    g.summary = {
      passages: active.length,
      settled: count(p => g.owner[p.id] === 'settled'), confirmed: count(p => g.marks[p.id] && g.marks[p.id].confirmed),
      unsettled: count(p => g.owner[p.id] === 'unsettled'), rejected: count(p => g.owner[p.id] === 'rejected'),
      proved: of('proved'), checked: of('checked'), drawn: of('drawn'), pending: of('pending'), lapsed: of('lapsed'), miscalled: of('miscalled'), hollow: of('hollow'), held: of('held'), owed: of('owed'),
      backed: of('backed'), assumed: of('assumed'), unresolved: of('unresolved'),
      doubtsOpen: g.doubts.filter(d => d.status !== 'closed').length, text: of('text'), given: of('given'),
    };
    g.answerRows = rowsOf(g.answers, g.gone, g.superseded || {});
    g.route = routePart(g);
    return g;
  };
  const answers = given ?? evidence.answers;
  ({ superseded: f.superseded, removable: f.supersededRemovable } = supersededAmong({
    answers, gone: goneAmong(answers, present), ground: a => groundOf(a, 'part', ir, f.hashes),
    conclusions: list => conclusionsOf(conclude({ ...f }, list)), forgiven: name => forgivenBy(f, name), bound: name => f.integrity.manifest?.evidence[name],
  }));
  return conclude(f, answers);
}

export function analyzeComposition({ root, id, parts, knowledge, pluginVersion, marker, answers: given }: { root: string; id: string; parts?: Record<string, PartLoad | null>; knowledge: LoadedKnowledge; pluginVersion?: string; marker?: Marker; answers?: AnswerRead[] }): CompositionAnalysis {
  // Filled in below.
  const f = loadComposition(root, id, { parts }) as CompositionAnalysis;
  f.kind = 'composition'; f.ref = `compositions/${id}`; f.title = f.prose.title || id; f.pluginVersion = pluginVersion; f.marker = marker;
  const { dir } = f;
  f.reviews = reviewsOf(dir);
  f.integrity = readIntegrity(dir, root);
  const { decisions, broken } = parseDecisions(f.integrity.decisions);
  f.decisions = decisions; f.broken = broken;
  f.forgotten = forgottenAnswers(decisions);
  f.hashes = Object.fromEntries(f.prose.passages.filter(p => !p.retired).map(p => [p.id, p.hash]));
  ({ column: f.owner, latest: f.latestDecision } = ownerColumn(decisions, f.hashes));
  f.risks = acceptedRisks(decisions);
  ({ doubts: f.doubts, doubtAnswers: f.doubtAnswers } = doubtsOf(dir, decisions));
  f.generated = compositionModuleText(f);
  const present: Present = { passages: f.hashes, scenarios: new Set(Object.keys(f.actors.scenarioById)), walks: new Set((f.prose.walks || []).map(w => w.id)), fileExists: path => existsSync(join(dir, path)) };
  const evidence = readEvidence(dir, f.integrity.manifest ? f.integrity.manifest.evidence : null, f.forgotten, f.ref, present);
  f.removed = evidence.removed; f.evidenceNotes = evidence.notes;

  // Closure: every module that owns an edge of a listed type on the asset is a member.
  f.closureMissing = [];
  const memberModules = new Set(f.wiring.members.map(m => (f.members[m.part] && f.members[m.part].module) || m.part));
  for (const rule of f.wiring.closure) {
    const edges = knowledge.edges({ types: rule.edges, asset: rule.asset });
    const owners = new Set(edges.map(e => e.module));
    for (const m of rule.modules || []) owners.add(m);
    for (const m of owners) if (!memberModules.has(m)) f.closureMissing.push(`${m} owns an edge on ${rule.asset || 'the closure'} (${rule.edges.join(', ')}) but is not a member`);
  }

  // The present, hashed as the runner hashes a composition trial's snapshot (snapshotOf, src/commands/trial.ts).
  const used = f.composed.actors || [];
  const memberIds = f.wiring.members.map(m => m.part);
  const records: Record<string, string | null> = {};
  for (const m of Object.values(f.memberLoads)) if (m) for (const p of m.ir.pins || []) { const r = knowledge.resolve(p); records[p] = r ? r.hash : null; }
  // The wiring's own pins on its members fix their instances for this composition in the same way.
  for (const m of f.wiring.members) for (const p of m.pins) { const r = knowledge.resolve(p); records[p] = r ? r.hash : null; }
  for (const a of f.composed.actors || []) for (const p of (f.actors.byId[a] && f.actors.byId[a].pins) || []) { const r = knowledge.resolve(p); records[p] = r ? r.hash : null; }
  f.pins = records;
  const configs = Object.fromEntries(Object.entries(f.composed.cfgs || {}).map(([name, text]) => [`model/generated/${name}`, sha256(text)]));

  // From the answers on: what verify concludes. It runs on a copy of the analysis, without one answer,
  // to tell whether the others stand in for that one (ANSWER-SUPERSEDED), then once on the whole.
  const conclude = (g: CompositionAnalysis, list: AnswerRead[]): CompositionAnalysis => {
    evidenceOf(g, present, list);
    const snapshotNow: PresentState = {
      passages: g.hashes,
      wiring: short(g.wiring.text, 16),
      module: (sid) => moduleHash(g.composed.tla, sid, g.extras),
      scenario: (sid) => scenarioHash(g.actors.scenarioById[sid], used, memberIds),
      actors: actorsHash(g.actors, used),
      extras: g.extras ? short(g.extras, 16) : null,
      members: Object.fromEntries(Object.entries(g.memberLoads).filter(([, m]) => m).map(([k, m]) => [k, { prose: short(m!.text, 16), backing: backingOf(m!.ir, knowledge) }])),
      records,
      configs,
      inputs: {},
    };
    // The generated configurations as files; the generated module is compared by moduleHash instead.
    for (const a of g.completed) for (const path of Object.keys(a.entry.basis.inputIdentity.files)) {
      if (Object.hasOwn(snapshotNow.inputs, path)) continue;
      const full = join(dir, path);
      snapshotNow.inputs[path] = path.startsWith('model/generated/')
        ? configs[path] ?? null
        : existsSync(full) && statSync(full).isFile() ? fileHash(full) : null;
    }
    ({ cells: g.cells, propertyHeld: g.propertyHeld } = cellsOf({ composition: g, completed: g.completed, snapshotNow, risks: g.risks, forgotten: name => forgivenBy(g, name) }));
    if (g.closureMissing.length) for (const c of g.cells) c.open = true;
    g.walks = walksOf({ prose: g.prose, completed: g.completed, snapshotNow });
    g.reviewOwed = reviewOwedWhy(g.reviews, g.hashes, g.cells.some(c => ['checked', 'proved', 'violated', 'implied'].includes(c.mark)));
    ({ tripwires: g.tripwires, flags: g.flags } = compositionTripwires(g));
    const of = (mark: string) => g.cells.filter(c => c.mark === mark).length;
    g.summary = { properties: g.prose.properties.length, scenarios: [...new Set(g.cells.map(c => c.scenario))].length, cells: g.cells.length, proved: of('proved'), checked: of('checked'), implied: of('implied'), violated: of('violated'), accepted: g.cells.filter(c => c.accepted).length, lapsed: of('lapsed'), pending: of('pending'), miscalled: of('miscalled'), held: Object.values(g.propertyHeld).filter(v => v === 'held').length, hollow: Object.values(g.propertyHeld).filter(v => v === 'hollow').length, open: g.closureMissing.length, doubtsOpen: g.doubts.filter(d => d.status !== 'closed').length };
    g.answerRows = rowsOf(g.answers, g.gone, g.superseded || {});
    g.route = routeComposition(g);
    return g;
  };
  const answers = given ?? evidence.answers;
  ({ superseded: f.superseded, removable: f.supersededRemovable } = supersededAmong({
    answers, gone: goneAmong(answers, present), ground: a => groundOf(a, 'composition', null, f.hashes),
    conclusions: list => conclusionsOf(conclude({ ...f }, list)), forgiven: name => forgivenBy(f, name), bound: name => f.integrity.manifest?.evidence[name],
  }));
  return conclude(f, answers);
}

export function seamsOf(parts: Record<string, PartLoad>): SeamSet[] {
  return Object.values(parts).map(c => ({ id: c.id, title: c.ir.name || c.id, seams: c.ir.seams || [] }));
}
