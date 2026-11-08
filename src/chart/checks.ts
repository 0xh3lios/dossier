// The checks a chart proves about its prose, generated from the IR and run
// on the explored graph. Each check is named by the passage ids it covers.
import { toLabel } from '../prose/expr.ts';
import { changeText, conditionText, evaluateFor, inState, leavesOf, showEvent, showSnapshot } from './machine.ts';
import { pathTo, describePath, serializeState, strayed } from './explore.ts';
import type { Expr } from '../prose/expr.ts';
import type { Ir, IrRefusal, IrTransition, IrWalk, IrWalkStep } from '../prose/ir.ts';
import type { ChartEvent, Machine, Snapshot, XState } from './machine.ts';
import type { ChartPath, Explored } from './explore.ts';

// One check: the passages it covers, what it says, and why it failed. `rests` names the other passages
// a pass rested on, such as the walk that showed a refusal-only event refused, so its cover lapses
// when one of them changes.
export interface ChartCheck { ids: string[]; name: string; status: 'passed' | 'failed'; message: string; rests?: string[] }
// A state and event pair nothing says, under the condition shown.
export interface ChartGap { pair: string; message: string }
export interface ChartChecks {
  checks: ChartCheck[];
  passed: number;
  failed: number;
  outcome: 'pass' | 'fail';
  covers: string[];
  explored: number;
  gaps: ChartGap[];
  refusalIds: string[];
}

const valueOf = (ast: Expr) => (ast.t === 'lit' ? ast.v : ast.t === 'int' || ast.t === 'bool' ? ast.v : null);
const show = showSnapshot;
const eventText = showEvent;
// Whether a passage's condition is true at a snapshot for an event case. One that cannot be
// evaluated throws Unevaluable, which the caller reports.
const trueAt = (cond: Expr | null, s: Snapshot, event: ChartEvent | null, passage: string) => Boolean(evaluateFor(cond!, s, event, passage, conditionText(cond!)));
// Whether a refusal applies to an event case at one leaf of a snapshot: it covers a state the leaf is
// in or under and the event, and its condition, if it has one, is true there.
export const refusalApplies = (r: IrRefusal, leaf: string, event: ChartEvent, s: Snapshot) => {
  const inStates = r.states.some(st => leaf === st || leaf.startsWith(`${st}.`));
  if (!inStates) return false;
  if (r.events !== 'every' && !r.events.includes(event.type!)) return false;
  return r.cond ? trueAt(r.cond, s, event, r.id) : true;
};

// What says what an event case does at one leaf of a snapshot: the moves from the leaf, or from a
// state holding it, whose condition is true there, and the refusals that cover the leaf and the case.
// Check 6 wants exactly one of them at every leaf. The explorer shows them as the passages that
// decide a step.
export function decidersAt(ir: Ir, s: Snapshot, leaf: string, c: ChartEvent): { moves: IrTransition[]; refusals: IrRefusal[] } {
  return { moves: ir.transitions.filter(t => moveApplies(t, s, leaf, c)), refusals: ir.refusals.filter(r => refusalApplies(r, leaf, c, s)) };
}
// Whether a move applies to an event case at one leaf of a snapshot: it leaves the leaf or a state
// holding it on that event, and its condition, if it has one, is true there.
export const moveApplies = (t: IrTransition, s: Snapshot, leaf: string, c: ChartEvent) => t.event === c.type && (leaf === t.from || leaf.startsWith(`${t.from}.`)) && (!t.guard || trueAt(t.guard, s, c, t.id));

// One step of a replayed walk: the walk's step, the event case it sends, the snapshot it was
// attempted at, and the snapshot after it when the machine took it.
export interface WalkStepRun { step: IrWalkStep; event: ChartEvent; at: Snapshot; after: Snapshot | null }
// A walk replayed on the machine: the snapshot it starts at, its steps up to the first that went
// wrong, where it ended, and what went wrong, in the walk check's words.
export interface WalkRun { start: Snapshot | null; steps: WalkStepRun[]; end: Snapshot | null; problems: string[] }

// Replays a walk as check 5 does: from the initial snapshot, or the nearest explored one in its
// starting state with its starting data, stepping the machine itself. A condition or a change that
// cannot be evaluated throws, as the checks need, unless `tolerate` is set: then the replay stops at
// that step and says why, which a doubt's walk, no passage of the prose, needs.
export function replayWalk(w: IrWalk, initial: Snapshot, next: (s: Snapshot, e: ChartEvent) => Snapshot, pathFor: (predicate: (s: Snapshot) => boolean) => ChartPath | null, tolerate = false): WalkRun {
  const startMatches = (s: Snapshot) => inState(s, w.from) && Object.entries(w.with).every(([k, v]) => s.context[k] === valueOf(v!));
  let current: Snapshot | null = startMatches(initial) ? initial : null;
  if (!current) {
    const p = pathFor(startMatches);
    current = p ? p.state : null;
  }
  if (!current) return { start: null, steps: [], end: null, problems: [`no explored path reaches ${w.from}${Object.keys(w.with).length ? ' with ' + JSON.stringify(Object.fromEntries(Object.entries(w.with).map(([k, v]) => [k, valueOf(v!)]))) : ''}`] };
  const start = current;
  const startSent = { ...current.context.sent };
  const problems: string[] = [];
  const steps: WalkStepRun[] = [];
  for (const [i, step] of w.steps.entries()) {
    const event = { type: step.event, ...Object.fromEntries(Object.entries(step.args).map(([k, v]) => [k, valueOf(v!)])) } as ChartEvent;
    const stopped = (e: unknown) => { if (!tolerate) throw e; steps.push({ step, event, at: current!, after: null }); problems.push(`step ${i + 1} ${eventText(event)}: ${(e as Error).message}`); };
    let can: boolean;
    try { can = current.can(event); } catch (e) { stopped(e); break; }
    if (step.refused) {
      steps.push({ step, event, at: current, after: null });
      if (can) { problems.push(`step ${i + 1} ${eventText(event)} was accepted at ${show(current)} but the walk says refused`); break; }
      continue;
    }
    if (!can) { steps.push({ step, event, at: current, after: null }); problems.push(`step ${i + 1} ${eventText(event)} is refused at ${show(current)}`); break; }
    let after: Snapshot;
    try { after = next(current, event); } catch (e) { stopped(e); break; }
    steps.push({ step, event, at: current, after });
    current = after;
  }
  if (!problems.length) {
    if (!inState(current, w.ends)) problems.push(`ends in ${leavesOf(current.value).join('+')}, not ${w.ends}`);
    for (const [k, v] of Object.entries(w.endData)) if (current.context[k] !== valueOf(v!)) problems.push(`${k} is ${current.context[k]}, expected ${valueOf(v!)}`);
    for (const [e, n] of Object.entries(w.sent)) { const got = (current.context.sent[e] || 0) - (startSent[e] || 0); if (got !== n) problems.push(`${e} sent ${got} times, expected ${n}`); }
    for (const e of w.notSent) { const got = (current.context.sent[e] || 0) - (startSent[e] || 0); if (got !== 0) problems.push(`${e} sent ${got} times, expected none`); }
  }
  return { start, steps, end: current, problems };
}

// The checks run on an exploration that saw every reachable snapshot. A condition or a change
// that cannot be evaluated at one of them throws Unevaluable, which the caller reports.
export function runChecks({ ir, machine, xstate, explored }: { ir: Ir; machine: Machine; xstate: XState; explored: Explored }): ChartChecks {
  const checks: ChartCheck[] = [];
  const add = (ids: string[], name: string, ok: boolean, message = '', rests: string[] = []) => checks.push({ ids, name: `${ids.join(' ')}: ${name}`, status: ok ? 'passed' : 'failed', message, ...(rests.length ? { rests } : {}) });
  const states = explored.states;
  const initial = machine.getInitialSnapshot ? machine.getInitialSnapshot({}) : xstate.createActor(machine).getSnapshot();
  const next = (snapshot: Snapshot, event: ChartEvent) => xstate.getNextSnapshot(machine, snapshot, event);
  const pathFor = (predicate: (s: Snapshot) => boolean) => pathTo(explored, initial, predicate);
  const casesOf = (eventName: string | null) => ir.eventCases.filter(e => e.type === eventName);

  // 0. Every datum stays within its declared range: the chart's TypeOK.
  {
    const strays = strayed(ir);
    const bad = states.find(s => strays(s.context).length > 0);
    let message = '';
    if (bad) {
      const p = pathFor(x => serializeState(x) === serializeState(bad));
      message = `${strays(bad.context).join(', ')} out of range at ${show(bad)}${p ? ` after ${describePath(p) || 'no event'}` : ''}`;
    }
    add(['TypeOK'], 'every datum stays in its declared range', !bad, message);
  }
  // 1. Every state is reached.
  for (const st of ir.states) {
    const hit = states.some(s => inState(s, st.key));
    add([st.id], `${st.key} is reachable`, hit, hit ? '' : `no explored path reaches ${st.key}`);
  }
  // 2. Every event is handled somewhere and sent on some path. A refusal-only event is checked
  // after the walks, since its evidence is a walk that attempts it.
  for (const ev of ir.events) {
    if (ev.refusalOnly) continue;
    const handled = ir.transitions.some(t => t.event === ev.name);
    const sent = states.some(s => casesOf(ev.name).some(c => s.can(c)));
    add([ev.id], `${ev.name} is handled`, handled && sent, !handled ? `no Move accepts ${ev.name}` : !sent ? `${ev.name} is never accepted on an explored path` : '');
  }
  // 3. Every move replays as its passage says.
  for (const t of ir.transitions) {
    const cases = casesOf(t.event);
    let found: { s: Snapshot; c: ChartEvent } | null = null, failure: string | null = null;
    outer: for (const s of states) {
      if (!inState(s, t.from)) continue;
      for (const c of cases) {
        if (t.guard && !trueAt(t.guard, s, c, t.id)) continue;
        const after = next(s, c);
        const problems: string[] = [];
        if (!inState(after, t.target)) problems.push(`ends in ${leavesOf(after.value).join('+')}, not ${t.target}`);
        for (const a of t.assigns) {
          const expected = evaluateFor(a.expr!, s, c, t.id, changeText(a.name, a.expr!));
          if (after.context[a.name] !== expected) problems.push(`${a.name} is ${after.context[a.name]}, expected ${expected}`);
        }
        for (const e of t.effects) if ((after.context.sent[e] || 0) !== (s.context.sent[e] || 0) + 1) problems.push(`${e} was not sent`);
        found = { s, c };
        if (problems.length) { failure = problems.join('; '); break outer; }
        break outer;
      }
    }
    add([t.id], `${t.from} receives ${t.event} as said`, Boolean(found) && !failure, !found ? `no explored snapshot in ${t.from} satisfies its condition${t.guard ? ` (${toLabel(t.guard)})` : ''}` : failure || '');
  }
  // 4. Every refusal: no move takes the pair, and the machine cannot take the event there.
  for (const r of ir.refusals) {
    const problems: string[] = [];
    for (const st of r.states) {
      const events = r.events === 'every' ? ir.events.map(e => e.name) : r.events;
      for (const ev of events) {
        const clashing = ir.transitions.filter(t => t.event === ev && (t.from === st || st.startsWith(`${t.from}.`)));
        if (clashing.length && !r.cond) problems.push(`${clashing.map(t => t.id).join(' ')} accepts ${ev} in ${st}`);
        for (const s of states) {
          if (!inState(s, st)) continue;
          for (const c of casesOf(ev)) {
            if (r.cond && !trueAt(r.cond, s, c, r.id)) continue;
            if (s.can(c)) { problems.push(`${eventText(c)} is accepted at ${show(s)}`); break; }
          }
        }
      }
    }
    add([r.id], `refused as said`, problems.length === 0, [...new Set(problems)].slice(0, 3).join('; '));
  }
  // 5. Every walk replays.
  for (const w of ir.walks) {
    const run = replayWalk(w, initial, next, pathFor);
    add([w.id], `walk ${w.name} replays`, run.problems.length === 0, run.problems.join('; '));
  }
  // 5b. A refusal-only event needs positive evidence that it is refused: no Move accepts it, exactly
  // one Refusal covers it in every explored leaf state for every argument case, and a passing walk
  // attempts it as refused. A machine that merely has no transition is silence, not a refusal.
  for (const ev of ir.events.filter(e => e.refusalOnly)) {
    const cases = casesOf(ev.name);
    const accepted = ir.transitions.some(t => t.event === ev.name);
    const covered = states.length > 0 && cases.length > 0 && !explored.limitHit &&
      states.every(s => cases.every(c => !s.can(c) && leavesOf(s.value).every(leaf => ir.refusals.filter(r => refusalApplies(r, leaf, c, s)).length === 1)));
    const witnesses = ir.walks.filter(w => w.steps.some(step => step.event === ev.name && step.refused) &&
      checks.some(check => check.ids.includes(w.id) && check.status === 'passed')).map(w => w.id);
    const message = accepted ? 'a Move accepts a refusal-only event'
      : !covered ? 'a unique refusal is required in every explored state and argument case'
      : !witnesses.length ? 'a passing Walk must attempt this event as refused' : '';
    // The pass rests on the walks that showed the event refused and on the refusals that refused it.
    const refusing = message ? [] : [...new Set(states.flatMap(s => cases.flatMap(c => leavesOf(s.value).flatMap(leaf => ir.refusals.filter(r => refusalApplies(r, leaf, c, s)).map(r => r.id)))))].sort();
    add([ev.id], `${ev.name} is handled by refusal`, !message, message, message ? [] : [...witnesses, ...refusing]);
  }
  // 6. Determinism and completeness over the explored domain.
  const gaps = new Map<string, string>(), conflicts = new Map<string, string>();
  for (const s of states) {
    for (const leaf of leavesOf(s.value)) {
      for (const ev of ir.events) {
        for (const c of casesOf(ev.name)) {
          const { moves, refusals } = decidersAt(ir, s, leaf, c);
          const key = `${leaf} × ${ev.name}`;
          if (moves.length > 1) conflicts.set(key, `${moves.map(t => t.id).join(' and ')} both apply at ${show(s)} for ${eventText(c)}`);
          else if (moves.length === 1 && refusals.length) conflicts.set(key, `${moves[0].id} and ${refusals.map(r => r.id).join(' ')} both apply at ${show(s)} for ${eventText(c)}`);
          else if (moves.length === 0 && refusals.length === 0) gaps.set(key, `nothing says what ${eventText(c)} does at ${show(s)}`);
        }
      }
    }
  }
  const moveIds = ir.transitions.map(t => t.id);
  const refusalIds = ir.refusals.map(r => r.id);
  add(moveIds.length ? moveIds : ['M0'], `at most one move or refusal applies to each state and event`, conflicts.size === 0, [...conflicts.values()].slice(0, 3).join('; '));
  // 7. Every Always holds on every explored snapshot. One that cites a Given rests on an
  // assumption the chart does not hold, so it is the solvers' alone and the chart skips it.
  for (const inv of ir.invariants) {
    if (inv.givens && inv.givens.length) continue;
    let bad: Snapshot | null = null;
    for (const s of states) {
      if (inv.while && !inState(s, inv.while)) continue;
      if (!trueAt(inv.cond, s, null, inv.id)) { bad = s; break; }
    }
    let message = '';
    if (bad) {
      const p = pathFor(x => serializeState(x) === serializeState(bad!));
      message = `fails at ${show(bad)}${p ? ` after ${describePath(p) || 'no event'}` : ''}`;
    }
    add([inv.id], `always ${inv.while ? `while ${inv.while} ` : ''}${toLabel(inv.cond!)}`, !bad, message);
  }
  const passed = checks.filter(c => c.status === 'passed').length;
  const covers = [...new Set(checks.filter(c => c.status === 'passed').flatMap(c => c.ids))].filter(id => id in ir.hashes);   // passages only; TypeOK is the chart's own
  return {
    checks, passed, failed: checks.length - passed, outcome: checks.length && passed === checks.length ? 'pass' : 'fail',
    covers, explored: explored.count,
    gaps: [...gaps.entries()].map(([k, v]) => ({ pair: k, message: v })),
    refusalIds,
  };
}
