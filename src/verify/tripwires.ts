// Tripwires (verify fails until fixed) and flags (shown, never blocking).
import { existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { isRetired } from '../dossiers/decisions.ts';
import { listSystems } from '../dossiers/root.ts';
import { CLASSIFICATIONS, completed, evidenceNotes, narrowerReach, readingClassification } from '../trials/answers.ts';
import { propertyId } from './covers.ts';
import type { AnswerRead, Readable } from '../trials/answers.ts';
import type { ActorsModel } from '../dossiers/actors.ts';
import type { ComponentAnalysis, SystemAnalysis } from './analyze.ts';

// A tripwire or a flag: its name, and where it was found. `entry` names the evidence entry a flag
// belongs to, when the flag is that entry's own and goes with it: its abort, its own narrowed reach,
// its gone question, its being superseded.
export interface Note { name: string; where: string; entry?: string }
type Report = (name: string, where: string, entry?: string) => unknown;

const COMPONENT_FILES = new Set(['prose.md', 'ledger.md', 'decisions.log', 'doubts.md', 'margin.md', 'README.md', 'integrity.json']);
// trials/ holds local bundles, which verify never reads; evidence/ holds the answers.
const COMPONENT_DIRS = new Set(['chart', 'model', 'evidence', 'trials', 'calls', 'reviews', 'node_modules']);
const SYSTEM_FILES = new Set(['prose.md', 'composition.md', 'ledger.md', 'decisions.log', 'doubts.md', 'margin.md', 'README.md', 'integrity.json']);
const SYSTEM_DIRS = new Set(['model', 'evidence', 'trials', 'calls', 'reviews']);
const MODEL_CHECKERS = ['tlc', 'apalache', 'alloy'];

function shared(f: ComponentAnalysis | SystemAnalysis, trip: Report, flag: Report): void {
  for (const problem of f.integrity?.problems || []) trip(problem.name, problem.where);
  if (f.broken) trip('decisions chain broken', `decisions.log line ${f.broken.line}: ${f.broken.reason}`);
  for (const d of f.doubts) for (const m of d.malformed) trip('malformed doubt', `${d.id}: ${m}`);
  for (const doubt of f.doubts) {
    const latest = [...f.decisions].reverse().find(d => !d.malformed && d.verb === 'answer' && (d.args[0] || '').split('@')[0] === doubt.id);
    if (latest && !latest.malformed && !f.doubtAnswers[doubt.id]) flag(latest.args[0].includes('@') ? 'doubt answer stale' : 'doubt answer unbound', `${doubt.id}: the recorded answer does not identify the current alternatives; obtain the owner's answer to ${doubt.id}@${doubt.hash}`);
  }
  for (const d of f.doubts) if (d.status === 'open' && !f.doubtAnswers[d.id]) flag('doubt open', `${d.id} on ${d.on.join(' ')}, assumed ${d.assumed}`);
  // What evidence/ holds that no answer may rest on: each entry's problems, a candidate no publication
  // finished, stray files and removed entries, as readEvidence found them.
  for (const n of evidenceNotes({ answers: f.answers, notes: f.evidenceNotes })) trip(n.name, n.where);
  const gone = (a: AnswerRead) => Boolean(f.gone[a.name]);
  for (const a of f.answers) {
    if (!completed(a) || gone(a)) continue;
    const classification = readingClassification(a.reading);
    if (a.entry.answer.result === 'miscalled' && !classification) trip('miscall unclassified', `evidence/${a.name}.json`);
    // A classification is one of the five words the model contract names, so that a misspelt or a
    // rephrased one cannot route the dossier silently.
    if (classification && !CLASSIFICATIONS.includes(classification)) trip('classification unknown', `evidence/${a.name}.md: "${classification}" is none of ${CLASSIFICATIONS.map(c => `"${c}"`).join(', ')}`);
  }
  // A second read is owed (spec/review.md): marks a reviewer judges, and no review at the current prose.
  if (f.reviewOwed) flag('review owed', f.reviewOwed);
  for (const [name, why] of Object.entries(f.gone || {})) flag('question gone', `evidence/${name}.json: ${why}; the next publication removes it`, name);
  // An entry the answers that decide stand in for (ANSWER-SUPERSEDED), with why it stays or goes (ANSWER-DROP).
  for (const [name, why] of Object.entries(f.superseded || {})) flag('answer superseded', `evidence/${name}.json: ${why}`, name);
  for (const a of f.answers) if (a.entry && !a.problems.length && a.entry.answer.result === 'aborted' && !gone(a)) flag('unrun', `evidence/${a.name}.json: ${a.entry.answer.reason || 'aborted'}`, a.name);
  // An answer that looks less far than one it replaced keeps that reach as narrowed (ANSWER-REPLACE).
  for (const a of f.answers) {
    const how = completed(a) && !gone(a) && a.entry.narrowed ? narrowerReach(a.entry.answer.reach, a.entry.narrowed) : null;
    if (how) flag('narrowed', `evidence/${a.name}.json reaches less than an answer it replaced (${how})`, a.name);
  }
}

// A pinned record the knowledge base does not hold: nothing can tell when it moves.
function unresolvedPins(pins: Record<string, string | null>, flag: Report): void {
  for (const [ref, hash] of Object.entries(pins)) if (hash === null) flag('pin unresolved', `${ref} does not resolve in the knowledge base`);
}

// What actors.md and scenarios.md get wrong: a scenario naming an actor actors.md does not
// declare, any other error, and a stronger_than its modes do not support.
function actorsFiles(actors: Pick<ActorsModel, 'errors' | 'unsound'>, trip: Report): void {
  for (const e of actors.errors) {
    if (/names actor/.test(e)) trip('scenario names unknown actor', e);
    else trip('malformed actors', e);
  }
  for (const e of actors.unsound || []) trip('stronger_than unsound', e);
}
// The actors files belong to the root, so one dossier reports them, once: the first open system
// as verify lists them, or the first open component while there is no system.
const reportsActorsFiles = {
  component: (f: ComponentAnalysis): boolean => f.reportActors && f.components[0] === f.id,
  system: (f: SystemAnalysis): boolean => {
    const root = dirname(dirname(f.dir));
    return listSystems(root).find(id => !isRetired(join(root, 'systems', id))) === f.id;
  },
};

// The later of two answers on one property or cell, to two questions, reaches less than the earlier
// one: every numeric reach value they share is no larger, and one is smaller.
function narrowing(last: Readable, prev: Readable): string | null {
  const how = narrowerReach(last.entry.answer.reach, prev.entry.answer.reach);
  return how ? `evidence/${last.name}.json reaches less than evidence/${prev.name}.json (${how})` : null;
}

function strays(dir: string, files: Set<string>, dirs: Set<string>, trip: Report): void {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir).sort()) {
    if (entry.startsWith('.')) continue;
    const isDir = statSync(join(dir, entry)).isDirectory();
    if (isDir ? !dirs.has(entry) : !files.has(entry)) trip('stray files', entry);
  }
}

export function componentTripwires(f: ComponentAnalysis): { tripwires: Note[]; flags: Note[] } {
  const tripwires: Note[] = [], flags: Note[] = [];
  const trip = (name: string, where: string) => tripwires.push({ name, where });
  const flag = (name: string, where: string, entry?: string) => flags.push({ name, where, ...(entry ? { entry } : {}) });
  const { ir, prose } = f;
  // ir.errors holds the prose's errors, the names it misuses, and what the IR could not resolve.
  const misnamed = new Set(prose.misnamed || []);
  for (const e of ir.errors) {
    if (misnamed.has(e)) trip('misnamed', e);
    else trip('malformed passage', e);
  }
  if (f.actors && reportsActorsFiles.component(f)) actorsFiles(f.actors, trip);
  if (prose.unsaid.length) flag('unsaid', prose.unsaid.join(', '));
  if (prose.saidTwice.length) flag('said twice', prose.saidTwice.join('; '));
  if (ir.ok) {
    if (ir.onces.length === 0 && ir.withins.length === 0 && !prose.statesNothingEventual) flag('no eventual promise stated', 'no Once or Within passage and no Words-only passage saying the piece promises nothing eventual');
    const usedGivens = new Set([...ir.onces, ...ir.withins, ...ir.invariants].flatMap(o => o.givens || []));
    for (const g of ir.givens) if (!usedGivens.has(g.id) && !g.actor) flag('Given without use', g.id);
    // The sender checks read actors.md; while it does not read, they would trip on every sender.
    const actorsRead = Boolean(f.actors) && f.actors!.errors.length === 0;
    for (const g of ir.givens) {
      if (!g.actor) continue;
      // A component first: a Given that names one trips even where an actor has the same id.
      if (f.componentOf(g.actor)) trip('Given names a component', `${g.id} names "${g.actor}", which is a component; a rely on a component is a Guarantee or a wiring`);
      else if (actorsRead && !f.actorOf(g.actor)) trip('sender is not declared', `${g.id} names "${g.actor}", which is ${f.retiredOf(g.actor) ? 'a retired component' : 'neither an actor in actors.md nor a component'}`);
    }
    for (const ev of ir.events) if (actorsRead && f.actors!.actors.length && !f.actorOf(ev.sender) && !f.componentOf(ev.sender)) trip('sender is not declared', `${ev.id}: "${ev.sender}" is ${f.retiredOf(ev.sender) ? 'a retired component' : 'neither an actor in actors.md nor a component'}`);
    for (const k of ir.guarantees) if (f.backing[k.id] && f.backing[k.id].status === 'unresolved') flag('backing unresolved', `${k.id}: ${f.backing[k.id].reason || 'not found'}`);
    for (const g of f.chart.gaps || []) flag('unsaid under condition', g);
  }
  unresolvedPins(f.pins, flag);
  shared(f, trip, flag);
  for (const [file, mod] of Object.entries(f.modules)) {
    for (const [name, action] of Object.entries(mod.actions)) if (!ir.hashes[action.move]) trip('action without Move', `${file}: ${name} encodes ${action.move}, which is not a passage`);
    for (const name of mod.properties) {
      const id = (name.match(/^(?:Inv_)?(A\d+|O\d+|N\d+|R\d+)(?:_\w+)?$/) || [])[1] || (name.match(/^(?:Not)?(W\d+)(?:_End)?$/) || [])[1];
      if (id && !ir.hashes[id]) trip('misnamed', `${file}: ${name} names ${id}, which is not a passage`);
    }
    for (const fr of mod.fairness) {
      if (!fr.given) trip('fairness without Given', `${file} line ${fr.line}: ${fr.kind}_vars(${fr.action}) carries no "\\* from G<n>"`);
      else if (!ir.hashes[fr.given]) trip('fairness without Given', `${file} line ${fr.line}: cites ${fr.given}, which is not a passage`);
    }
  }
  const modules = Object.values(f.modules);
  if (modules.length) for (const mv of ir.transitions) if (!modules.some(m => Object.values(m.actions).some(x => x.move === mv.id))) flag('Move without action', mv.id);
  for (const [file, mod] of Object.entries(f.als)) for (const item of [...mod.items, ...mod.commands]) {
    if (item.kind === 'fun' || item.kind === 'pred') continue;
    if (!item.passage || !ir.hashes[item.passage]) trip('fact without passage', `${file}: ${item.kind} ${item.name}`);
  }
  // Reworded and narrowed, among the ordinary answers of the real model.
  const byProperty: Record<string, Readable[]> = {};
  for (const a of f.completed) if (MODEL_CHECKERS.includes(a.entry.question.checker) && a.entry.question.kind !== 'blunder') for (const name of a.entry.answer.enabled) (byProperty[name] ||= []).push(a);
  for (const [name, list] of Object.entries(byProperty)) {
    const last = list[list.length - 1];
    const id = propertyId(name);
    const ran = last.entry.answer.properties?.[name];
    if (f.definitions[name] && ran && ran !== f.definitions[name] && id && ir.hashes[id] && last.entry.basis.snapshot.passages[id] === ir.hashes[id]) flag('reworded', `${name} differs from the definition evidence/${last.name}.json ran, while ${id} is unchanged`);
    const narrowed = list.length >= 2 ? narrowing(last, list[list.length - 2]) : null;
    if (narrowed) flag('narrowed', `${name}: ${narrowed}`);
  }
  for (const id of Object.keys(f.marks)) if (f.marks[id].mark === 'held') flag('blunder owed', id);
  strays(f.dir, COMPONENT_FILES, COMPONENT_DIRS, trip);
  if (f.marker && f.pluginVersion && f.marker.plugin !== f.pluginVersion) flag('plugin updated', `${f.marker.plugin ? `set up with dossier ${f.marker.plugin}` : 'dossier.json names no plugin version'}, this is ${f.pluginVersion}: run dossier setup`);
  if (f.actors && f.actors.byId[f.id]) flag('actor shadows component', `actor ${f.id} is shadowed by component ${f.id}; remove it from actors.md`);
  return { tripwires, flags };
}

export function systemTripwires(f: SystemAnalysis): { tripwires: Note[]; flags: Note[] } {
  const tripwires: Note[] = [], flags: Note[] = [];
  const trip = (name: string, where: string) => tripwires.push({ name, where });
  const flag = (name: string, where: string, entry?: string) => flags.push({ name, where, ...(entry ? { entry } : {}) });
  for (const e of f.prose.errors) trip('malformed passage', e);
  for (const e of f.prose.misnamed) trip('misnamed', e);
  for (const e of f.composition.errors) trip('malformed composition', e);
  if (reportsActorsFiles.system(f)) actorsFiles(f.actors, trip);
  // The composer names each problem by the tripwire it trips; a composition that threw has its message alone.
  const composerProblems = 'problems' in f.composed && f.composed.problems ? f.composed.problems : (f.composed.errors || []).map(message => ({ name: 'composition does not compose', message }));
  for (const { name, message } of composerProblems) {
    if (name === 'composition cites unknown component') trip('composition cites unknown component', message);
    else if (name === 'wiring names unknown effect or event') trip('wiring names unknown effect or event', message);
    else if (name === 'sender is not declared') trip('sender is not declared', message);
    else if (name === 'Given names a component') trip('Given names a component', message);
    else if (name === 'misnamed') trip('misnamed', message);
    else if (name === 'property claims unknown scenario') trip('property claims unknown scenario', message);
    else if (name === 'malformed composition') trip('malformed composition', message);
    else if (name === 'malformed actors') trip('malformed actors', message);
    else trip('composition does not compose', message);
  }
  const leftFree = new Map<string, string[]>();
  for (const x of f.composed.free || []) if (!x.declared) (leftFree.get(x.from) || leftFree.set(x.from, []).get(x.from)!).push(x.event);
  for (const [from, events] of leftFree) flag('left free', `${events.join(', ')} from ${from}; wire ${events.length === 1 ? 'it' : 'them'} or list ${events.length === 1 ? 'it' : 'them'} under free:`);
  for (const m of f.closureMissing) flag('closure open', m);
  unresolvedPins(f.pins, flag);
  for (const [id, held] of Object.entries(f.propertyHeld)) if (held === 'held') flag('blunder owed', id); else if (held === 'hollow') flag('hollow', id);
  // Narrowed, among the ordinary answers of each cell, as among a component's.
  const byCell: Record<string, Readable[]> = {};
  for (const a of f.completed) { const q = a.entry.question; if (q.property && q.kind !== 'blunder' && MODEL_CHECKERS.includes(q.checker)) (byCell[`${q.property}×${q.scenario}`] ||= []).push(a); }
  for (const [cell, list] of Object.entries(byCell)) {
    const narrowed = list.length >= 2 ? narrowing(list[list.length - 1], list[list.length - 2]) : null;
    if (narrowed) flag('narrowed', `${cell}: ${narrowed}`);
  }
  shared(f, trip, flag);
  strays(f.dir, SYSTEM_FILES, SYSTEM_DIRS, trip);
  return { tripwires, flags };
}
