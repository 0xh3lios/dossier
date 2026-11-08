// IR -> XState v5 machine. Guards and changes are evaluated from the ASTs;
// effects count in context.sent. The xstate module is passed in so the
// project's own installation is used.
import { evaluate, toLabel } from '../prose/expr.ts';
import type { Expr, Value } from '../prose/expr.ts';
import type { EventCase, Ir, IrState, IrTransition } from '../prose/ir.ts';

// A machine's context: each datum's value, and the effect counters under sent.
export interface ChartContext { sent: Record<string, number>; [name: string]: Value | Record<string, number> }
// An event as the machine receives it: its type and a value for each field.
export type ChartEvent = EventCase;
export type StateValue = string | { [region: string]: StateValue };
// Where a machine is, what it holds, and whether it has reached a final state.
export interface Snapshot { value: StateValue; context: ChartContext; status: 'active' | 'done' | 'error' | 'stopped'; can(event: ChartEvent): boolean }
export interface Machine { getInitialSnapshot?(input: unknown): Snapshot }
// The parts of xstate the chart uses. The module is loaded at run time, from the
// project's installation or the plugin's own.
export interface XState {
  createMachine(config: object): Machine;
  assign(update: (args: { context: ChartContext; event: ChartEvent }) => object): unknown;
  createActor(machine: Machine): { getSnapshot(): Snapshot };
  getNextSnapshot(machine: Machine, snapshot: Snapshot, event: ChartEvent): Snapshot;
}
type Guard = (args: { context: ChartContext; event: ChartEvent }) => boolean;
interface TransitionConfig { meta: { passages: string[] }; guard?: Guard; target?: string; actions?: unknown }
interface StateConfig { id: string; meta: { passages: string[] }; type?: 'final' | 'parallel'; on?: Record<string, TransitionConfig[]>; initial?: string; states?: Record<string, StateConfig> }

// Effect counters saturate so the explored space stays finite.
export const SENT_CAP = 8;

export function lookupFor(context: Record<string, unknown>, event: Record<string, unknown> | null | undefined): (name: string) => Value | undefined {
  return (name) => ((name in context ? context[name] : event && name in event ? event[name] : undefined) as Value | undefined);
}

// A snapshot as the chart's messages show it: its leaves and its data, without the effect counters.
export const showSnapshot = (s: Pick<Snapshot, 'value' | 'context'>) => `${leavesOf(s.value).join('+')} ${JSON.stringify(Object.fromEntries(Object.entries(s.context).filter(([k]) => k !== 'sent')))}`;
// An event as the chart's messages show it: its type and each field's value.
export const showEvent = (e: ChartEvent) => e.type + Object.entries(e).filter(([k]) => k !== 'type').map(([k, v]) => ` ${k} ${v}`).join('');

// A condition or a change of a passage that cannot be evaluated at a snapshot, such as a
// division by zero: the passage, and where and why, for the draw to report instead of a stack.
export class Unevaluable extends Error {
  passage: string;
  constructor(passage: string, message: string) { super(message); this.passage = passage; }
}
// A condition and a change as the messages name them.
export const conditionText = (ast: Expr) => `the condition {${toLabel(ast)}}`;
export const changeText = (name: string, ast: Expr) => `the change {${name} := ${toLabel(ast)}}`;
// Evaluates a passage's expression, or throws Unevaluable naming the passage, what it evaluated, the snapshot and the event.
export function evaluateFor(ast: Expr, snapshot: Pick<Snapshot, 'value' | 'context'>, event: ChartEvent | null, passage: string, what: string): Value {
  try { return evaluate(ast, lookupFor(snapshot.context, event)); }
  catch (e) { throw new Unevaluable(passage, `${passage}: ${what} cannot be evaluated at ${showSnapshot(snapshot)}${event ? ` for ${showEvent(event)}` : ''}: ${(e as Error).message}`); }
}
// The first expression a machine could not evaluate. xstate rewraps an error a guard throws, so
// the machine keeps the failure beside it for the exploration to report.
const unevaluable = new WeakMap<Machine, { first: Unevaluable | null }>();
export const unevaluableIn = (machine: Machine): Unevaluable | null => (unevaluable.get(machine) || { first: null }).first;

export function buildMachine(ir: Ir, xstate: XState): Machine {
  const { createMachine, assign } = xstate;
  const byKey = Object.fromEntries(ir.states.map(s => [s.key, s]));
  const initialContext = { ...Object.fromEntries(ir.context.map(d => [d.name, d.initial])), sent: Object.fromEntries(ir.effects.map(e => [e.name, 0])) };
  const failed: { first: Unevaluable | null } = { first: null };
  // Inside a guard or an action the snapshot's value is not at hand; the move's state stands for it.
  const at = (t: IrTransition, context: ChartContext) => ({ value: t.from!, context });
  const record = (e: unknown) => { if (e instanceof Unevaluable) failed.first ||= e; return e; };

  const transitionConfig = (t: IrTransition) => {
    const cfg: TransitionConfig = { meta: { passages: [t.id] } };
    if (t.guard) {
      const what = conditionText(t.guard);
      cfg.guard = ({ context, event }) => { try { return Boolean(evaluateFor(t.guard!, at(t, context), event, t.id, what)); } catch (e) { throw record(e); } };
    }
    if (!t.stays) cfg.target = `#${t.target}`;
    if (!t.assigns.length && !t.effects.length) cfg.actions = assign(() => ({}));
    if (t.assigns.length || t.effects.length) {
      const whats = t.assigns.map(a => changeText(a.name, a.expr!));
      cfg.actions = assign(({ context, event }) => {
        const next: Record<string, Value | Record<string, number>> = {};
        try { t.assigns.forEach((a, i) => { next[a.name] = evaluateFor(a.expr!, at(t, context), event, t.id, whats[i]); }); } catch (e) { throw record(e); }
        if (t.effects.length) {
          const sent = { ...context.sent };
          for (const e of t.effects) sent[e] = Math.min((sent[e] || 0) + 1, SENT_CAP);
          next.sent = sent;
        }
        return next;
      });
    }
    return cfg;
  };

  const stateConfig = (s: IrState): StateConfig => {
    const cfg: StateConfig = { id: s.key, meta: { passages: s.passages } };
    if (s.final) cfg.type = 'final';
    const on: Record<string, TransitionConfig[]> = {};
    for (const t of ir.transitions.filter(t => t.from === s.key)) (on[t.event!] ||= []).push(transitionConfig(t));
    if (Object.keys(on).length) cfg.on = on;
    if (s.children) {
      if (s.children.kind === 'parallel') cfg.type = 'parallel';
      else cfg.initial = s.children.initial;
      cfg.states = Object.fromEntries(s.children.names.map(n => [n, stateConfig(byKey[`${s.key}.${n}`])]));
    }
    return cfg;
  };

  const config = {
    id: ir.name,
    initial: ir.initial,
    context: initialContext,
    states: Object.fromEntries(ir.root.map(k => [k, stateConfig(byKey[k])])),
  };
  const machine = createMachine(config);
  unevaluable.set(machine, failed);
  return machine;
}

// The leaf state keys a snapshot is in. An atomic region of a parallel state
// appears as an empty object and is a leaf itself.
export function leavesOf(value: StateValue | null | undefined, prefix = ''): string[] {
  if (typeof value === 'string') return [prefix ? `${prefix}.${value}` : value];
  const keys = Object.keys(value || {});
  if (!keys.length) return prefix ? [prefix] : [];
  return keys.flatMap(k => leavesOf(value![k], prefix ? `${prefix}.${k}` : k));
}

export function inState(snapshot: Pick<Snapshot, 'value'>, key: string | null | undefined): boolean {
  return leavesOf(snapshot.value).some(leaf => leaf === key || leaf.startsWith(`${key}.`));
}
