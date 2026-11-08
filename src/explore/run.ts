// A component's chart as the explorer shows it: the chart's checks as draw runs them, the explored
// snapshots and the steps between them, the passages that decide each step, every walk and each
// doubt's two walks replayed, and what each event case does at a chosen snapshot. Everything comes
// from the chart's own code: the machine, the exploration, moveApplies, refusalApplies and
// replayWalk. The explorer evaluates no condition and no change itself.
import { checkIR, loadRuntime } from '../chart/draw.ts';
import { buildMachine, inState, leavesOf } from '../chart/machine.ts';
import { explore, pathTo, serializeState } from '../chart/explore.ts';
import { moveApplies, refusalApplies, replayWalk } from '../chart/checks.ts';
import { toLabel } from '../prose/expr.ts';
import { parseProse } from '../prose/prose.ts';
import { compileIR } from '../prose/ir.ts';
import type { Expr, Value } from '../prose/expr.ts';
import type { Ir, IrWalk } from '../prose/ir.ts';
import type { ChartCheck, ChartGap } from '../chart/checks.ts';
import type { ChartContext, ChartEvent, Machine, Snapshot, XState } from '../chart/machine.ts';
import type { Explored } from '../chart/explore.ts';
import type { ComponentAnalysis } from '../verify/analyze.ts';

// The limit on explored states, as draw and the chart trial take it by default.
export const LIMIT = 20000;

// One step of a replayed walk, as the players read it: the snapshot it leaves the walk at, the event,
// its fields, whether the walk says it is refused, the passages that decide it or why they cannot be
// told, and what went wrong.
export interface WalkStepView { at: number | null; step: number | null; event?: string | null; args?: Record<string, Value | null>; refused?: boolean; by?: string[]; byError?: string | null; error?: string }
export interface WalkView { steps: WalkStepView[]; ends?: string | null; problems: string[]; error?: string }
export interface RunView {
  outcome?: string;
  passed?: number;
  failed?: number;
  checks: ChartCheck[];
  gaps: ChartGap[];
  explored: number;
  limit: number;
  limitHit: boolean;
  error: string | null;
  initial: number;
  snapshots: { leaves: string[]; context: ChartContext }[];
  edges: { from: number; to: number | null; event: ChartEvent; by: string[]; byError: string | null }[];
  walks: ({ id: string; name: string | null } & WalkView)[];
  doubts: { id: string; walks: Record<string, { text: string } & Partial<WalkView>> }[];
}
// A run with what explaining a snapshot needs.
export interface Run { view: RunView; ir: Ir; explored: Explored | null; keys: string[]; index: Map<string, number> }

// The passages that decide an event case at a snapshot, over all its leaves, by the predicates
// decidersAt and check 6 use: one move or one refusal at each leaf when the chart passes check 6, none
// where nothing says, and more where two say. Each passage is asked on its own, so a condition that
// cannot be evaluated is named in `failed`, by its passage, and every other passage still answers.
export function decidedBy(ir: Ir, s: Snapshot, c: ChartEvent): { by: string[]; error: string | null; failed: Record<string, string> } {
  const ids = new Set<string>(), failed: Record<string, string> = {};
  const ask = (id: string, applies: () => boolean) => { try { if (applies()) ids.add(id); } catch (e) { failed[id] ||= (e as Error).message; } };
  for (const leaf of leavesOf(s.value)) {
    for (const t of ir.transitions) ask(t.id, () => moveApplies(t, s, leaf, c));
    for (const r of ir.refusals) ask(r.id, () => refusalApplies(r, leaf, c, s));
  }
  return { by: [...ids], error: Object.values(failed)[0] ?? null, failed };
}

const fieldsOf = (event: ChartEvent) => Object.fromEntries(Object.entries(event).filter(([k]) => k !== 'type'));

// A walk replayed as check 5 replays it, with each snapshot as its index among the explored ones. A
// doubt's walk is no passage, so no check has replayed it: a step that cannot be evaluated ends it there.
function walkView(w: IrWalk, ir: Ir, initial: Snapshot, next: (s: Snapshot, e: ChartEvent) => Snapshot, explored: Explored, index: Map<string, number>): WalkView {
  const run = replayWalk(w, initial, next, predicate => pathTo(explored, initial, predicate), true);
  if (!run.start) return { steps: [], ends: w.ends, problems: run.problems, error: run.problems[0] };
  const at = (s: Snapshot) => index.get(serializeState(s)) ?? null;
  const steps: WalkStepView[] = [{ at: at(run.start), step: null }];
  run.steps.forEach((s, i) => {
    const decided = decidedBy(ir, s.at, s.event);
    const view: WalkStepView = { at: at(s.after ?? s.at), step: i, event: s.event.type, args: fieldsOf(s.event), refused: s.step.refused, by: decided.by, byError: decided.error };
    // The replay stops at the first step that goes wrong, and its problem names that step; a problem
    // with the walk's end names no step.
    if (i === run.steps.length - 1 && run.problems[0]?.startsWith(`step ${i + 1} `)) view.error = run.problems[0];
    steps.push(view);
  });
  return { steps, ends: w.ends, problems: run.problems };
}

// A doubt's walk compiled by the plugin's own parser: added to the prose as one more Walk passage,
// after the highest id, which is what the owner's answer would make of it.
export function compileWalkText(proseText: string, name: string, text: string): { walk: IrWalk } | { error: string } {
  const ids = [...proseText.matchAll(/^\[W(\d+)\]/gm)].map(m => Number(m[1]));
  const id = `W${Math.max(0, ...ids) + 1}`;
  const line = `[${id}] Walk ${name}: ${text}`;
  const lines = proseText.split('\n');
  const at = lines.findIndex(l => /^##\s+Walks\s*$/.test(l));
  if (at >= 0) lines.splice(at + 1, 0, line); else lines.push('', '## Walks', line);
  try {
    const ir = compileIR(parseProse(lines.join('\n')));
    const walk = ir.walks.find(x => x.id === id);
    if (!walk || ir.errors.some(e => e.includes(id))) return { error: (ir.errors.find(e => e.includes(id)) || 'does not read as a walk').replace(id, 'the walk') };
    return { walk };
  } catch (e) { return { error: (e as Error).message }; }
}

export async function chartRun(root: string, a: ComponentAnalysis, limit = LIMIT): Promise<Run> {
  const ir = a.ir;
  const empty = (error: string, extra: Partial<RunView> = {}): Run => ({ view: { checks: [], gaps: [], explored: 0, limit, limitHit: false, error, initial: 0, snapshots: [], edges: [], walks: [], doubts: [], ...extra }, ir, explored: null, keys: [], index: new Map() });
  if (!ir.ok) return empty(`the prose does not compile: ${ir.errors[0] || 'dossier draw names why'}`, { outcome: 'fail' });
  const rt = await loadRuntime(root);
  if (rt.error) return empty(rt.error);
  const result = await checkIR({ root, ir, limit });
  const xstate = rt.xstate as XState;
  const machine: Machine = buildMachine(ir, xstate);
  const ex = explore(machine, ir, rt.graph!, { limit });
  // An exploration cut short by the limit, or stopped by a condition that cannot be evaluated, has not
  // seen every state: the run says so and shows no partial graph, as draw shows no partial checks.
  if (ex.limitHit || ex.unevaluable) {
    return empty(result.error || result.exceeded || result.unevaluable || ex.error || ex.unevaluable?.message || 'the exploration stopped short', { outcome: 'fail', passed: result.passed, failed: result.failed, checks: result.checks || [], explored: ex.count, limitHit: ex.limitHit });
  }
  const keys = Object.keys(ex.adjacency);
  const index = new Map(keys.map((k, i) => [k, i]));
  const snapshots = keys.map(k => { const s = ex.adjacency[k].state; return { leaves: leavesOf(s.value), context: s.context }; });
  const edges: RunView['edges'] = [];
  for (const [k, adj] of Object.entries(ex.adjacency)) for (const t of Object.values(adj.transitions)) {
    const decided = decidedBy(ir, adj.state, t.event);
    edges.push({ from: index.get(k)!, to: index.get(serializeState(t.state)) ?? null, event: t.event, by: decided.by, byError: decided.error });
  }
  const initial = machine.getInitialSnapshot ? machine.getInitialSnapshot({}) : xstate.createActor(machine).getSnapshot();
  const next = (s: Snapshot, e: ChartEvent) => xstate.getNextSnapshot(machine, s, e);
  const walks = ir.walks.map(w => ({ id: w.id, name: w.name, ...walkView(w, ir, initial, next, ex, index) }));
  const doubts = a.doubts.map(d => ({
    id: d.id,
    walks: Object.fromEntries(Object.entries(d.walks).map(([alt, text]) => {
      const c = compileWalkText(a.text, alt, text);
      if ('error' in c) return [alt, { text, error: c.error }];
      return [alt, { text, ...walkView(c.walk, ir, initial, next, ex, index) }];
    })),
  }));
  const view: RunView = {
    outcome: result.outcome, passed: result.passed, failed: result.failed, checks: result.checks || [], gaps: result.gaps || [],
    explored: ex.count, limit, limitHit: false, error: result.error || result.exceeded || result.unevaluable || null,
    initial: index.get(serializeState(initial)) ?? 0, snapshots, edges, walks, doubts,
  };
  return { view, ir, explored: ex, keys, index };
}

// The names an expression reads.
function namesIn(ast: Expr | null, out = new Set<string>()): Set<string> {
  if (!ast) return out;
  if (ast.t === 'id' || ast.t === 'ref' || ast.t === 'field') out.add(ast.name);
  else if (ast.t === 'bin') { namesIn(ast.l, out); namesIn(ast.r, out); }
  else if (ast.t === 'not' || ast.t === 'neg') namesIn(ast.e, out);
  return out;
}
const label = (ast: Expr | null) => (ast ? toLabel(ast) : null);
const differs = (x: unknown, y: unknown) => JSON.stringify(x) !== JSON.stringify(y);

// At one explored snapshot, every event case: each move and refusal that could apply, with its
// condition and the values it reads; which of them decide the case, by the chart's predicates; and what
// the machine does with it, read from the explored step: the snapshot it leads to, the data that
// changed and the effects sent.
export function explainAt(run: Run, at: number) {
  const { ir, explored, keys, index } = run;
  const adj = explored?.adjacency[keys[at]];
  if (!adj) return null;
  const s = adj.state;
  const value = (name: string, c: ChartEvent) => (Object.hasOwn(c, name) && name !== 'type' ? c[name] : s.context[name]);
  const cases = ir.eventCases.map(c => {
    const refs = (ast: Expr | null) => [...namesIn(ast)].map(name => ({ name, value: value(name, c) }));
    const decided = decidedBy(ir, s, c);
    const holds = (id: string) => decided.by.includes(id);
    const candidates = [
      ...ir.transitions.filter(m => m.event === c.type && inState(s, m.from)).map(m => ({ id: m.id, kind: 'move', cond: label(m.guard), holds: holds(m.id), error: decided.failed[m.id] || null, refs: refs(m.guard) })),
      ...ir.refusals.filter(r => (r.events === 'every' || r.events.includes(c.type!)) && r.states.some(st => inState(s, st))).map(r => ({ id: r.id, kind: 'refusal', cond: label(r.cond), holds: holds(r.id), error: decided.failed[r.id] || null, refs: refs(r.cond) })),
    ];
    const taken = Object.values(adj.transitions).find(t => !differs(t.event, c));
    const after = taken?.state;
    const changes = after ? Object.keys(s.context).filter(k => k !== 'sent' && differs(s.context[k], after.context[k])).map(name => ({ name, before: s.context[name], after: after.context[name] })) : [];
    const effects = after ? Object.keys(after.context.sent || {}).filter(e => (after.context.sent[e] || 0) > (s.context.sent[e] || 0)) : [];
    const moved = decided.by.some(id => id.startsWith('M'));
    return { event: c, by: decided.by, error: decided.error, candidates, changes, to: moved && after ? index.get(serializeState(after)) ?? null : null, effects };
  });
  return { at, leaves: leavesOf(s.value), context: s.context, cases };
}
