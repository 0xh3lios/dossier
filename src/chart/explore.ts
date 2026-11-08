// Bounded exploration over the declared ranges with @xstate/graph. A snapshot
// that leaves a declared range is kept, so the range check can point at it,
// and not expanded, so a wrong that drives a count past its bound stays finite.
import { unevaluableIn } from './machine.ts';
import type { Ir } from '../prose/ir.ts';
import type { ChartEvent, Machine, Snapshot } from './machine.ts';

// A path to a snapshot: the snapshot it reaches and the steps that reach it, each the snapshot an event was sent at.
export interface ChartPath { state: Snapshot; steps: { state: Snapshot; event: ChartEvent }[] }
interface GraphOptions { events: ChartEvent[]; serializeState: (s: Snapshot) => string; stopWhen: (s: Snapshot) => boolean }
// One explored snapshot and where each event case takes it.
export interface Adjacency { state: Snapshot; transitions: Record<string, { event: ChartEvent; state: Snapshot }> }
// The parts of @xstate/graph the chart uses.
export interface XStateGraph {
  getAdjacencyMap(machine: Machine, options: GraphOptions): Record<string, Adjacency>;
}
// The explored snapshots, keyed as serializeState writes them, or, when the exploration stopped
// short, why: past the limit on distinct states (limitHit, with the remedy in error), or at an
// expression the machine could not evaluate (unevaluable, naming the passage and the snapshot).
// count is the number of distinct snapshots explored, up to where it stopped.
export interface Explored { adjacency: Record<string, Adjacency>; states: Snapshot[]; count: number; limit: number; limitHit: boolean; error?: string; unevaluable?: { passage: string; message: string } }

export const serializeState = (s: Pick<Snapshot, 'value' | 'context'>) => JSON.stringify([s.value, s.context]);

// The data of a context outside their declared ranges, tested against the bounds.
export function strayed(ir: Pick<Ir, 'context'>): (context: Record<string, unknown>) => string[] {
  const inRange = ir.context.map(d => [d.name, d.type === 'flag' ? (v: unknown) => typeof v === 'boolean'
    : d.type === 'enum' ? (v: unknown) => d.values!.includes(v as string)
    : (v: unknown) => typeof v === 'number' && Number.isInteger(v) && v >= d.min! && v <= d.max!] as const);
  return (context) => inRange.filter(([name, ok]) => !ok(context[name])).map(([name]) => name);
}

// What @xstate/graph throws when its own traversal limit is set and passed.
const LIBRARY_LIMIT = 'Traversal limit exceeded';

export function explore(machine: Machine, ir: Ir, graph: XStateGraph, { limit = 20000 }: { limit?: number } = {}): Explored {
  const strays = strayed(ir);
  // The library calls stopWhen once for each distinct snapshot it keeps, so that is where they are counted.
  let count = 0;
  const passed = { limit };
  const stopWhen = (s: Snapshot) => {
    if (++count > limit) throw passed;
    return strays(s.context).length > 0;
  };
  let adjacency: Record<string, Adjacency>;
  try { adjacency = graph.getAdjacencyMap(machine, { events: ir.eventCases, serializeState, stopWhen }); }
  catch (err) {
    if (err === passed || (err instanceof Error && err.message === LIBRARY_LIMIT)) return { adjacency: {}, states: [], count, limit, limitHit: true, error: `exploration exceeded ${limit} states: narrow the declared ranges or raise --limit` };
    const failure = unevaluableIn(machine);
    if (failure) return { adjacency: {}, states: [], count, limit, limitHit: false, unevaluable: { passage: failure.passage, message: failure.message } };
    throw err;
  }
  // A map the exploration returns holds every reachable snapshot.
  const states = Object.values(adjacency).map(x => x.state);
  return { adjacency, states, count: states.length, limit, limitHit: false };
}

// The shortest path from the initial snapshot to one the predicate holds at, over the explored
// map: breadth first, so no snapshot is reached twice and nothing is explored again.
export function pathTo(explored: Pick<Explored, 'adjacency'>, initial: Snapshot, predicate: (s: Snapshot) => boolean): ChartPath | null {
  const start = serializeState(initial);
  if (!explored.adjacency[start]) return null;
  const from = new Map<string, { key: string; event: ChartEvent } | null>([[start, null]]);
  const queue = [start];
  for (let i = 0; i < queue.length; i++) {
    const key = queue[i], here = explored.adjacency[key];
    if (predicate(here.state)) {
      const steps: ChartPath['steps'] = [];
      for (let at = key, back = from.get(at); back; at = back.key, back = from.get(at)) steps.unshift({ state: explored.adjacency[back.key].state, event: back.event });
      return { state: here.state, steps };
    }
    for (const t of Object.values(here.transitions)) {
      const next = serializeState(t.state);
      if (from.has(next) || !explored.adjacency[next]) continue;
      from.set(next, { key, event: t.event });
      queue.push(next);
    }
  }
  return null;
}

export function describePath(path: ChartPath): string {
  return path.steps.filter(step => step.event.type !== 'xstate.init').map(step => step.event.type + Object.entries(step.event).filter(([k]) => k !== 'type').map(([k, v]) => ` ${k} ${v}`).join('')).join(', ');
}
