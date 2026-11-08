// A composition's cells: one property under one scenario, each with the answer that decides it, what it
// rested on, and whether it lapsed; and the composition's walks, each under its scenario.
import { short } from '../hash.ts';
import { propertyId } from './covers.ts';
import { lapsedParts } from './lapse.ts';
import { modeOf, windowOf } from '../dossiers/actors.ts';
import { constInitOf } from '../models/compose.ts';
import type { CompositionProse } from '../prose/prose.ts';
import type { Ir } from '../prose/ir.ts';
import type { Wiring } from '../dossiers/wiring.ts';
import type { ActorsModel, Scenario } from '../dossiers/actors.ts';
import type { AcceptedRisk } from '../dossiers/decisions.ts';
import type { LoadedKnowledge } from '../dossiers/load.ts';
import type { Answer, Reach, Readable, Snapshot } from '../trials/answers.ts';
import type { PresentState } from './lapse.ts';

export type CellMark = 'pending' | 'open' | 'lapsed' | 'miscalled' | 'proved' | 'checked' | 'violated' | 'implied';
// One property under one scenario: its mark, the answer that decides it, by the trial that
// established it and by its entry, and what that answer rested on.
export interface Cell {
  property: string;
  scenario: string;
  mark: CellMark;
  trial: string | null;
  entry: string | null;
  reach: Reach | null;
  trace: Answer['trace'] | null;
  lapsed: string[];
  dependencies: Snapshot | null;
  held: string;
  // The owner's acceptance of this violation, while the answer it was given on still decides the cell.
  accepted: AcceptedRisk | null;
  // For a violated cell whose latest risk decision no longer holds: what moved since the answer it was given on.
  acceptanceLapsed?: string[];
  problem?: string;
  open?: boolean;
  impliedBy?: string;
}
export type WalkMarkName = 'pending' | 'checked' | 'miscalled' | 'lapsed';
// A composition Walk under its scenario: its mark, and the latest witness answer behind it, by its trial and its entry.
export interface WalkMark { id: string; scenario: string; mark: WalkMarkName; trial: string | null; entry: string | null; lapsed: string[] }

const latest = <T,>(list: T[]) => (list.length ? list[list.length - 1] : null);

// The actors a composed composition uses, hashed without their notes: a note, or an actor whose
// events reach no member, moves no cell. The runner's snapshot and the present use this alike.
export function actorsHash(actors: Pick<ActorsModel, 'byId'>, used: readonly string[] = []): string {
  return short(JSON.stringify(used.filter(id => actors.byId[id]).map(id => ({ ...actors.byId[id], notes: undefined }))), 16);
}

// A scenario as the cells of one composition rest on it: the mode and the window of each actor the composition
// uses, and the start of each member, without its notes, its stronger_than, or what it says of
// actors and parts the composition does not hear from. The runner's snapshot and the present use this alike.
export function scenarioHash(sc: Scenario | null | undefined, used: readonly string[] = [], members: readonly string[] = []): string | null {
  if (!sc) return null;
  const actors = [...new Set(used)].sort();
  const modes = Object.fromEntries(actors.map(a => [a, modeOf(sc, a)]));
  const windows = Object.fromEntries(actors.filter(a => windowOf(sc, a)).map(a => [a, windowOf(sc, a)]));
  const start = Object.fromEntries(Object.keys(sc.start || {}).filter(k => members.includes(k.split('.')[0])).sort().map(k => [k, sc.start[k]]));
  return short(JSON.stringify({ modes, windows, start }), 16);
}

// The generated module as the cells and walks of one scenario rest on it: the composer's text
// without the other scenarios' ConstInit_<scenario> lines, which only an Apalache cell reads, and
// only the one its cinit names. A line that the module or extras.tla reads elsewhere stays, since
// a property may then rest on it. An edit to one scenario then moves its own cells and no others,
// unless it changes what the scenarios share: the clock's bound, or the constants of a window or
// a start no other scenario has. The runner's snapshot and the present use this alike.
export function moduleHash(tla: string | null | undefined, scenarioId: string, extras: string | null = null): string | null {
  if (!tla) return null;
  const own = constInitOf(scenarioId);
  const lines = tla.split('\n'), all = `${tla}\n${extras || ''}`;
  const read = (name: string) => (all.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length > 1;
  return short(lines.filter(line => { const name = (line.match(/^(ConstInit_\w+) ==/) || [])[1]; return !name || name === own || read(name); }).join('\n'), 16);
}

// A member's guarantees as a composition snapshot holds them: each backing's hash, or its status
// when it has none (assumed, external or unresolved).
export function backingOf(ir: Pick<Ir, 'guarantees' | 'module'>, knowledge: LoadedKnowledge): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of ir.guarantees || []) {
    const b = k.backing;
    if (!b || b.kind === 'none') out[k.id] = 'assumed';
    else if (b.kind === 'external') out[k.id] = 'external';
    else if (b.kind === 'record') { const r = knowledge.resolve(b.ref); out[k.id] = r ? r.hash : 'unresolved'; }
    else { const found = knowledge.backing({ module: ir.module, ...b }); out[k.id] = found.status === 'backed' ? found.hash : 'unresolved'; }
  }
  return out;
}

// `forgotten` says whether the owner's forget names an entry as it stands: a forgotten violation
// decides a cell only when no other answer does.
export function cellsOf({ composition, completed, snapshotNow, risks, forgotten = () => false }: { composition: { prose: CompositionProse; wiring: Wiring; actors: ActorsModel }; completed: Readable[]; snapshotNow: PresentState; risks: Record<string, AcceptedRisk>; forgotten?: (entry: string) => boolean }): { cells: Cell[]; propertyHeld: Record<string, string> } {
  const { prose, wiring, actors } = composition;
  const defaults = wiring.scenarios.length ? wiring.scenarios : ['all-honest'];
  const cells: Cell[] = [];
  const byProperty: Record<string, Readable[]> = {};
  const blunders: Record<string, Readable[]> = {};
  for (const a of completed) {
    const q = a.entry.question;
    if (!q.property) continue;
    if (q.kind === 'blunder') { (blunders[q.property] ||= []).push(a); continue; }
    (byProperty[`${q.property}|${q.scenario}`] ||= []).push(a);
  }
  // A blunder counts at the property's current words only, and the latest one there decides:
  // caught when its own property was violated, hollow when it was not.
  const propertyHeld: Record<string, string> = {};
  for (const p of prose.properties) {
    const now = snapshotNow.passages[p.id];
    const last = latest((blunders[p.id] || []).filter(a => a.entry.basis.snapshot.passages[p.id] === now));
    const caught = last && Object.entries(last.entry.answer.outcomes).some(([n, o]) => propertyId(n) === p.id && o === 'violated');
    propertyHeld[p.id] = !last ? 'held' : caught ? 'caught' : 'hollow';
  }
  // What moved under an acceptance (spec/evidence.md, risk). It holds while the cell's deciding answer
  // is the one the owner was shown, which the trial the decision names established, and nothing moved
  // under that answer, the property's words included. Any new answer lapses it, even on an unchanged
  // basis: the deciding entry then says what moved, by the answer it replaced or, when the shown answer
  // became its previous one, by that answer's basis against the present.
  const acceptanceMoved = (risk: AcceptedRisk, p: CompositionProse['properties'][number], sid: string, deciding: Readable): string[] => {
    if (!risk.trial) return ['no trial named'];
    const entry = deciding.entry;
    if (entry.established.trial === risk.trial) {
      const moved = lapsedParts(entry.basis, snapshotNow, p.id, sid, p.givens || []);
      if (risk.hash !== snapshotNow.passages[p.id] && !moved.includes(`passage ${p.id}`)) moved.unshift(`passage ${p.id}`);
      return moved;
    }
    const sameBasis = ['a new answer on an unchanged basis'];
    if (entry.replaced && entry.replaced.trial === risk.trial) return entry.replaced.moved.length ? entry.replaced.moved : sameBasis;
    if (entry.previous && entry.previous.established.trial === risk.trial) {
      const moved = lapsedParts(entry.previous.basis, snapshotNow, p.id, sid, p.givens || []);
      return moved.length ? moved : sameBasis;
    }
    if (completed.some(a => a.entry.established.trial === risk.trial)) return [`the cell's answer is now trial ${entry.established.trial}'s, to another question`];
    return [`a new answer replaced trial ${risk.trial}'s`];
  };
  const strongerClosure = (sid: string, seen: Set<string> = new Set()): string[] => {
    const sc = actors.scenarioById[sid];
    if (!sc) return [];
    const out: string[] = [];
    for (const weaker of sc.strongerThan || []) { if (seen.has(weaker)) continue; seen.add(weaker); out.push(weaker, ...strongerClosure(weaker, seen)); }
    return out;
  };
  // Which of a cell's answers decides (spec/evidence.md, MARK-DECIDING), as on a passage's side. A
  // miscall is the latest word: while the latest answer is one and has not lapsed, it decides. A
  // counterexample never hides under another question's answer: the latest answer that found the
  // property violated and has not lapsed, unless the owner forgot it, decides next, and the cell is
  // miscalled when that answer was. Then, among the answers that have not lapsed and are no miscall, the
  // strongest, and the latest among equals: a violation, then a proof, then a check, then a violation
  // the owner forgot, and last a run that looked at nothing, partial or without the property. When every
  // answer that has not lapsed is a miscall, the latest of them decides, and when every answer has
  // lapsed, the latest shows what moved.
  const strength = (r: Answer, checker: string, outcome: string | undefined, partial: boolean, forgiven: boolean): number =>
    outcome === 'violated' ? (forgiven ? 1 : 4) : outcome === 'holds' && !partial ? (checker === 'apalache' && r.mode === 'inductive' ? 3 : 2) : 0;
  for (const p of prose.properties) {
    const claimed = p.scenarios || defaults;
    for (const sid of claimed) {
      const key = `${p.id}|${sid}`;
      const answers = (byProperty[key] || []).filter(a => a.entry.answer.result !== 'aborted');
      const cell: Cell = { property: p.id, scenario: sid, mark: 'pending', trial: null, entry: null, reach: null, trace: null, lapsed: [], dependencies: null, held: propertyHeld[p.id], accepted: null };
      if (!actors.scenarioById[sid]) { cell.mark = 'open'; cell.problem = `scenario ${sid} is not declared`; cells.push(cell); continue; }
      const read = answers.map(a => {
        const r = a.entry.answer, checker = a.entry.question.checker;
        // The cell's own property, not the first outcome: a TLC run also reports TypeOK.
        const own = Object.keys(r.outcomes).find(n => propertyId(n) === p.id);
        const outcome = own ? r.outcomes[own] : undefined;
        // A run that stopped at another violation reports this property as holding so far: partial, no cover.
        const partial = Boolean(own && (r.partial || []).includes(own));
        const moved = lapsedParts(a.entry.basis, snapshotNow, p.id, sid, p.givens || []);
        const forgiven = forgotten(a.name);
        return { a, r, checker, outcome, partial, moved, forgiven, strength: strength(r, checker, outcome, partial, forgiven) };
      });
      const unlapsed = read.filter(x => x.moved.length === 0), last = latest(read);
      const live = unlapsed.filter(x => x.r.result !== 'miscalled');
      const violation = latest(unlapsed.filter(x => x.outcome === 'violated' && !x.forgiven));
      // The answers are in the order established, so among equals the later one wins.
      const pick = last && !last.moved.length && last.r.result === 'miscalled' ? last
        : violation ? violation
        : live.length ? live.reduce((best, x) => (!best || x.strength >= best.strength ? x : best), null as (typeof read)[number] | null)
        : unlapsed.length ? latest(unlapsed) : last;
      if (pick) {
        const { a, r, checker, outcome, partial, moved } = pick;
        cell.trial = a.entry.established.trial;
        cell.entry = a.name;
        cell.reach = r.reach || null;
        cell.dependencies = a.entry.basis.snapshot;
        if (moved.length) { cell.mark = 'lapsed'; cell.lapsed = moved; }
        else if (r.result === 'miscalled') cell.mark = 'miscalled';
        else if (outcome === 'holds' && !partial) cell.mark = checker === 'apalache' && r.mode === 'inductive' ? 'proved' : 'checked';
        else if (outcome === 'violated') { cell.mark = 'violated'; cell.trace = r.trace || null; }
        else cell.mark = 'pending';
        if (cell.mark === 'violated' && risks[key]) {
          const moved = acceptanceMoved(risks[key], p, sid, a);
          if (moved.length) cell.acceptanceLapsed = moved;
          else cell.accepted = risks[key];
        }
      }
      cells.push(cell);
    }
  }
  // A proof under a stronger scenario implies the weaker ones it is declared stronger than.
  for (const cell of cells) {
    if (cell.mark !== 'pending') continue;
    const stronger = cells.filter(c => c.property === cell.property && c.mark === 'proved' && strongerClosure(c.scenario).includes(cell.scenario));
    if (stronger.length) { cell.mark = 'implied'; cell.impliedBy = stronger[0].scenario; cell.trial = stronger[0].trial; cell.entry = stronger[0].entry; }
  }
  return { cells, propertyHeld };
}

// Each Walk of a composition under the scenario it names, all-honest when it names none: checked
// when its latest witness answer found the walk's path (NotW<n> violated, the trace as called),
// miscalled or lapsed as a cell is, and pending until a witness answer completes.
export function walksOf({ prose, completed, snapshotNow }: { prose: Pick<CompositionProse, 'walks'>; completed: Readable[]; snapshotNow: PresentState }): WalkMark[] {
  return (prose.walks || []).map(w => {
    const scenario = w.scenario || 'all-honest';
    const a = latest(completed.filter(x => x.entry.question.kind !== 'blunder' && x.entry.question.walk === w.id && (x.entry.question.scenario || 'all-honest') === scenario && x.entry.answer.result !== 'aborted'));
    const walk: WalkMark = { id: w.id, scenario, mark: 'pending', trial: null, entry: null, lapsed: [] };
    if (!a) return walk;
    const r = a.entry.answer;
    walk.trial = a.entry.established.trial;
    walk.entry = a.name;
    const moved = lapsedParts(a.entry.basis, snapshotNow, w.id, scenario, []);
    if (moved.length) { walk.mark = 'lapsed'; walk.lapsed = moved; }
    else if (r.result === 'miscalled') walk.mark = 'miscalled';
    else if (r.result === 'as-called' && r.outcomes[`Not${w.id}`] === 'violated') walk.mark = 'checked';
    return walk;
  });
}
