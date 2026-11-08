// The mark of every component passage, taking the first rule that applies.
import { movedUnder } from './lapse.ts';
import type { Ir } from '../prose/ir.ts';
import type { OwnerState } from '../dossiers/decisions.ts';
import type { Covers, Touch } from './covers.ts';
import type { Now } from './lapse.ts';

export type MarkName = 'text' | 'given' | 'backed' | 'assumed' | 'unresolved' | 'untried' | 'checked' | 'owed' | 'lapsed' | 'hollow' | 'miscalled' | 'proved' | 'held' | 'drawn' | 'pending';
// A guarantee's backing as verify resolved it.
export interface BackingState { status: 'assumed' | 'backed' | 'unresolved'; hash?: string; path?: string; reason?: string }
// A passage's mark, the answers behind it, and what else the ledger shows beside it.
export interface Mark {
  mark: MarkName;
  // The answers behind the mark: the trials that established them, and their entries, in the same order.
  trials: string[];
  entries: string[];
  reach: string | null;
  doubt: string[];
  owner: OwnerState | null;
  grounded: boolean;
  groundedBy: string | null;
  chartCovered: boolean;
  modelCovered: boolean;
  confirmed?: boolean;
  // For a lapsed mark, what moved under the answers behind it: passage <id>, record <ref>, backing <K>, executed <path>.
  lapsed?: string[];
}
export interface MarksInput extends Covers {
  ir: Ir;
  tier: string;
  counterpart: Record<string, boolean>;
  backing: Record<string, BackingState>;
  // The present, as lapse compares each answer's basis with it.
  now: Now;
  // Whether the owner's forget names an entry as it stands: a forgotten counterexample decides only
  // when no other answer does.
  forgotten: (entry: string) => boolean;
  openDoubtOn: Record<string, string[]>;
  owner: Record<string, OwnerState>;
}

const MODEL = new Set(['tlc', 'apalache', 'alloy']);
const latestOf = <T,>(list: T[] | null | undefined) => (list && list.length ? list[list.length - 1] : null);

export function marksOf({ ir, tier, covers, touches, caught, hollow, now, forgotten, counterpart, backing, openDoubtOn, owner }: MarksInput): Record<string, Mark> {
  // The Givens an Always, a Once or a Within cites: a cover lapses when one of them moved since its answer.
  const givensOf: Record<string, string[]> = Object.fromEntries([...ir.invariants, ...ir.onces, ...ir.withins].map(x => [x.id, x.givens || []]));
  const givens = (id: string) => givensOf[id] || [];
  // What moved under one answer's word on a passage since the answer was established (src/verify/lapse.ts).
  const movedOn = (e: Touch | null, id: string): string[] => (e ? movedUnder(e, [id], e.leaned || [], now, givens) : []);
  const lapsedOn = (e: Touch, id: string) => movedOn(e, id).length > 0;
  // The answer that decides a passage's side (spec/evidence.md, MARK-DECIDING). On the model side the
  // strongest of the covers that have not lapsed, a proof before a check, and the latest among equals;
  // the latest cover when every one has lapsed, so that the mark lapses. The chart and an external
  // runner have one strength, so their latest cover decides.
  const side = (id: string, which: 'chart' | 'model' | 'external'): Touch | null => {
    const list = (covers[id] || []).filter(e => (which === 'chart' ? e.checker === 'chart' : which === 'model' ? MODEL.has(e.checker) : e.checker === 'external'));
    if (which !== 'model') return latestOf(list);
    const live = list.filter(e => !lapsedOn(e, id));
    return live.length ? live.reduce((best, e) => (!best || Number(Boolean(e.proved)) >= Number(Boolean(best.proved)) ? e : best), null as Touch | null) : latestOf(list);
  };
  const marks: Record<string, Mark> = {};
  const passages = [...ir.states, ...ir.events, ...ir.transitions, ...ir.refusals, ...ir.invariants, ...(ir.structural || []), ...ir.onces, ...ir.withins, ...ir.givens, ...ir.walks, ...ir.seams, ...ir.guarantees, ...ir.wordsOnly];
  for (const p of passages) {
    const id = p.id, k = id[0];
    const hash = ir.hashes[id];
    const conditional = k === 'R' && Boolean((p as { cond?: unknown }).cond);
    const modelNeeded = tier === 'modeled' && 'SEMRW'.includes(k) && !conditional;
    const chartLatest = side(id, 'chart');
    // Each passage on the model side by its own answers alone: a walk by a witness whose trace matched,
    // never by the cover of the refusal its refused step meets.
    const modelLatest = side(id, 'model');
    const external = side(id, 'external');
    const moved = [...new Set([...movedOn(chartLatest, id), ...movedOn(modelLatest, id)])];
    const lapsed = moved.length > 0;
    // A blunder touches only the passages it targets, so the latest blunder here is the latest aimed
    // at this passage. Blunders count at the passage's current words only: the latest one there decides
    // between caught and hollow, and no later ordinary answer undoes what it showed.
    const latestTouch = latestOf((touches[id] || []).filter(e => e.kind !== 'blunder' || e.hash === hash));
    // A miscall is the latest word while it has not lapsed: the latest answer that touched the passage
    // decides when it missed its expectation on it and nothing moved under it since.
    const miscall = latestTouch && latestTouch.miscalled && !lapsedOn(latestTouch, id) ? latestTouch : null;
    // A counterexample never hides under another question's answer (MARK-DECIDING): a miscall that
    // found the property violated and has not lapsed decides, whenever it was established, unless the
    // owner forgot it; a forgotten one decides only when no other answer does.
    const counterexamples = (touches[id] || []).filter(e => e.kind !== 'blunder' && e.miscalled && e.violated && !lapsedOn(e, id));
    const counterexample = latestOf(counterexamples.filter(e => !forgotten(e.entry)));
    const forgottenCounterexample = latestOf(counterexamples.filter(e => forgotten(e.entry)));
    // In a modeled piece the model's blunder is what counts: a chart blunder shows only that the chart's check would fail.
    const blunder = latestOf((touches[id] || []).filter(e => e.kind === 'blunder' && e.hash === hash && !(tier === 'modeled' && e.checker === 'chart')));
    const caughtBy = blunder && (caught[id] || []).includes(blunder.entry) ? blunder : null;
    const hollowBy = blunder && (hollow[id] || []).includes(blunder.entry) ? blunder : null;
    let mark: MarkName, used: Touch[] = [];
    if (k === 'T') mark = 'text';
    else if (k === 'G') mark = 'given';
    else if (k === 'K') mark = backing[id] ? backing[id].status : 'assumed';
    // A charted piece has no model to try a Once, a Within or an Always that cites a Given.
    else if (tier === 'charted' && (k === 'O' || k === 'N' || (k === 'A' && givens(id).length > 0))) mark = 'untried';
    else if (k === 'X') mark = counterpart[id] ? 'checked' : 'owed';
    else if (lapsed) { mark = 'lapsed'; used = [chartLatest, modelLatest].filter(Boolean) as Touch[]; }
    else if ('AON'.includes(k) && hollowBy) { mark = 'hollow'; used = [hollowBy]; }
    else if (miscall) { mark = 'miscalled'; used = [miscall]; }
    else if (counterexample) { mark = 'miscalled'; used = [counterexample]; }
    else if ('AON'.includes(k)) {
      const catching = caughtBy ? [caughtBy] : [];
      if (modelLatest && catching.length) { mark = modelLatest.proved ? 'proved' : 'checked'; used = [modelLatest, ...catching]; }
      else if (modelLatest) { mark = 'held'; used = [modelLatest]; }
      else if (k === 'A' && chartLatest && tier === 'charted' && catching.length) { mark = 'checked'; used = [chartLatest, ...catching]; }
      else if (k === 'A' && chartLatest) { mark = tier === 'charted' ? 'held' : 'drawn'; used = [chartLatest]; }
      else mark = 'pending';
    } else if (chartLatest && (!modelNeeded || modelLatest)) { mark = 'checked'; used = [chartLatest, modelLatest].filter(Boolean) as Touch[]; }
    else if (chartLatest) { mark = 'drawn'; used = [chartLatest]; }
    else mark = 'pending';
    if (mark === 'pending' && forgottenCounterexample) { mark = 'miscalled'; used = [forgottenCounterexample]; }
    const reach = used.filter(t => t && t.kind !== 'blunder').map(t => t.reach && t.reach.text).filter(Boolean).pop() || null;
    marks[id] = {
      mark, trials: used.map(t => t.trial), entries: used.map(t => t.entry), reach, doubt: openDoubtOn[id] || [], owner: owner[id] || null,
      grounded: Boolean(external && external.hash === hash), groundedBy: external ? external.trial : null,
      chartCovered: Boolean(chartLatest && chartLatest.hash === hash), modelCovered: Boolean(modelLatest && modelLatest.hash === hash),
    };
    if (mark === 'lapsed') marks[id].lapsed = moved;
    marks[id].confirmed = owner[id] === 'settled' && ['checked', 'proved', 'text', 'given', 'backed'].includes(mark) && marks[id].doubt.length === 0;
  }
  return marks;
}
