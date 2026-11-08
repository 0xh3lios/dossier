// The intermediate form: a component's prose as one machine with citations,
// the single source for the chart, its grid, the explorer and the model scaffold.
import { resolveIds } from './expr.ts';
import { EVENT_CASES, passageHashes, valuesIn } from './prose.ts';
import type { Expr, Value } from './expr.ts';
import type { BoundaryEffect, Children, ComponentProse, Datum, Field, GuaranteeForm, SeamForm, TableCell, Trigger, WordsForm } from './prose.ts';

// Any type phrase, read field by field: min and max for a count or an amount, values for an enum.
export interface Domain { type: 'count' | 'flag' | 'amount' | 'enum'; min?: number; max?: number; values?: string[]; unit?: string }
export type IrField = { name: string } & Domain;
export type IrDatum = { name: string; initial: Value } & Domain;
export interface IrState { id: string; name: string | null; path: string[]; key: string; parent?: string | null; text: string; final: boolean; initial: boolean; children: Children | null; passages: string[] }
export interface IrEvent { id: string; name: string | null; sender: string | null; fields: IrField[]; refusalOnly?: true }
// One event with a value for each of its fields: {type, field: value, ...}.
export type EventCase = { type: string | null; [field: string]: Value | null };
export interface IrTransition {
  id: string;
  from: string | null;
  event: string | null;
  stays: boolean;
  target: string | null;
  guard: Expr | null;
  assigns: { name: string; expr: Expr | null }[];
  effects: string[];
}
export interface IrRefusal { id: string; states: string[]; events: string[] | 'every'; effects: string[]; cond: Expr | null }
// An Always, with the step Givens it cites; one that cites any is the solvers' alone, and the chart skips it.
export interface IrInvariant { id: string; while: string | null; cond: Expr | null; givens: string[] }
export interface IrStructural { id: string; text?: string }
export interface IrSide { state?: string; cond?: Expr | null }
export interface IrOnce { id: string; trigger: IrSide | null; goal: IrSide | null; givens: string[] }
export interface IrWithin { id: string; k: number | null | undefined; trigger: IrSide | null; goal: IrSide | null; givens: string[] }
// A Given, with its "only when" condition resolved against the event's fields and the data.
export interface IrGiven { id: string; assumption?: string; otherwise?: string; actor: string | null; event: string | null; promptness: string; when: Expr | null }
export interface IrWalkStep { event: string; args: Record<string, Expr | null>; refused: boolean }
export interface IrWalk {
  id: string;
  name: string | null;
  scenario?: string | null;
  from: string | null;
  with: Record<string, Expr | null>;
  ends: string | null;
  steps: IrWalkStep[];
  endData: Record<string, Expr | null>;
  sent: Record<string, number | undefined>;
  notSent: string[];
}
export interface Ir {
  ok: boolean;
  errors: string[];
  name: string | null;
  tier: string;
  module: string | null;
  pins: string[];
  boundary: string;
  context: IrDatum[];
  effects: BoundaryEffect[];
  states: IrState[];
  initial: string | null;
  root: string[];
  events: IrEvent[];
  eventCases: EventCase[];
  transitions: IrTransition[];
  refusals: IrRefusal[];
  invariants: IrInvariant[];
  structural: IrStructural[];
  onces: IrOnce[];
  withins: IrWithin[];
  givens: IrGiven[];
  walks: IrWalk[];
  seams: SeamForm[];
  guarantees: GuaranteeForm[];
  wordsOnly: WordsForm[];
  table: TableCell[];
  unsaid: string[];
  saidTwice: string[];
  hashes: Record<string, string>;
}
// The event an expression is read against: its name and fields.
type Scope = { name: string | null; fields: { name: string }[] };

// Every value of a field's range. The prose refuses a range or an event too wide to list.
function domainOf(type: Domain): Value[] {
  if (type.type === 'flag') return [false, true];
  if (type.type === 'enum') return [...type.values!];
  const out: number[] = [];
  for (let v = type.min!; v <= type.max!; v++) out.push(v);
  return out;
}

export function compileIR(prose: ComponentProse): Ir {
  const errors = [...prose.errors, ...prose.misnamed];
  const data = prose.boundary.data;
  const dataByName = Object.fromEntries(data.map(d => [d.name, d]));
  const enumLiterals = new Set(data.filter((d): d is Extract<Datum, { type: 'enum' }> => d.type === 'enum').flatMap(d => d.values));
  const eventByName = Object.fromEntries(prose.events.map(e => [e.name!, e]));

  // Names inside an expression: data, the event's fields, or an enum literal.
  const resolver = (id: string, event: Scope | null | undefined, where: string) => (name: string): Expr | null => {
    if (dataByName[name]) return { t: 'ref', name };
    if (event && event.fields.some(f => f.name === name)) return { t: 'field', name };
    if (enumLiterals.has(name)) return { t: 'lit', v: name };
    if (/^[A-Z]/.test(name)) return { t: 'lit', v: name };
    errors.push(`${id}: "${name}" is not data, a field of ${event ? event.name : 'the event'} or an enum value (${where})`);
    return null;
  };
  const resolve = (ast: Expr | null | undefined, id: string, event: Scope | null | undefined, where: string) => (ast ? resolveIds(ast, resolver(id, event, where)) : null);
  const resolveValue = (ast: Expr | null | undefined, id: string, where: string) => (ast ? resolveIds(ast, resolver(id, null, where)) : null);
  const resolveMap = (map: Record<string, Expr>, id: string, where: string) => Object.fromEntries(Object.entries(map).map(([k, v]) => [k, resolveValue(v, id, where)]));

  // States as a tree.
  const byPath: Record<string, IrState> = {};
  const states = prose.states.map((s): IrState => ({ id: s.id, name: s.name, path: s.path, key: s.path.join('.'), parent: s.parent, text: s.text, final: s.final, initial: s.initial, children: s.children ? { ...s.children } : null, passages: [s.id] }));
  for (const s of states) byPath[s.key] = s;
  for (const r of prose.refusals) for (const st of r.states) if (byPath[st]) byPath[st].passages.push(r.id);
  const root = states.filter(s => !s.parent);
  const initial = states.find(s => s.initial);
  if (!initial && states.length) errors.push('no initial state: the first State passage is the initial state');
  for (const s of states) {
    if (s.parent && !byPath[s.parent]) continue;
    if (s.parent && !byPath[s.parent].children) errors.push(`${s.id}: ${s.key} sits under ${s.parent}, which does not say "Within it, it is either ..."`);
  }

  const transitions = prose.moves.map((m): IrTransition => {
    const event = eventByName[m.event!];
    return {
      id: m.id, from: m.state, event: m.event, stays: m.stays, target: m.to,
      guard: resolve(m.guard, m.id, event, 'the condition'),
      assigns: m.assigns.map(a => {
        if (!dataByName[a.name]) errors.push(`${m.id}: changes "${a.name}", which the boundary does not hold`);
        return { name: a.name, expr: resolve(a.expr, m.id, event, `the change to ${a.name}`) };
      }),
      effects: m.effects.map(e => e.name),
    };
  });
  const refusals = prose.refusals.map((r): IrRefusal => {
    const names = r.events === 'every' ? prose.events.map(e => e.name) : r.events;
    const fields = [...new Map(names.flatMap(n => (eventByName[n!] ? eventByName[n!].fields : [])).map((f): [string, Field] => [f.name, f])).values()];
    return { id: r.id, states: r.states, events: r.events, effects: r.effects.map(e => e.name), cond: resolve(r.cond, r.id, { name: names.join('/'), fields }, 'the condition') };
  });
  const invariants = prose.always.filter(a => !a.structural).map((a): IrInvariant => ({ id: a.id, while: a.while, cond: resolve(a.cond, a.id, null, 'the condition'), givens: a.givens }));
  const structural = prose.always.filter(a => a.structural).map((a): IrStructural => ({ id: a.id, text: a.text }));
  const side = (x: Trigger | null, id: string): IrSide | null => (x ? (x.state ? { state: x.state } : { cond: resolve(x.cond, id, null, 'the condition') }) : null);
  const onces = prose.onces.map((o): IrOnce => ({ id: o.id, trigger: side(o.trigger, o.id), goal: side(o.goal, o.id), givens: o.givens }));
  const withins = prose.withins.map((n): IrWithin => ({ id: n.id, k: n.k, trigger: side(n.trigger, n.id), goal: side(n.goal, n.id), givens: n.givens }));
  const walks = prose.walks.map((w): IrWalk => ({
    id: w.id, name: w.name, scenario: w.scenario, from: w.from, with: resolveMap(w.with, w.id, 'the start'), ends: w.ends,
    steps: w.steps.map(st => {
      const event = eventByName[st.event];
      const args: Record<string, Expr | null> = {};
      for (const [k, v] of Object.entries(st.args)) {
        if (!event || !event.fields.some(f => f.name === k)) errors.push(`${w.id}: ${st.event} carries no field "${k}"`);
        args[k] = resolveValue(v, w.id, `the step ${st.event}`);
      }
      return { event: st.event, args, refused: st.refused };
    }),
    endData: resolveMap(w.endData, w.id, 'the end'), sent: w.sent, notSent: w.notSent,
  }));
  // An "only when" without "on" is already a prose error; its condition has no event to read the fields of.
  const givens = prose.givens.map((g): IrGiven => ({ id: g.id, assumption: g.assumption, otherwise: g.otherwise, actor: g.actor, event: g.event, promptness: g.promptness, when: g.when && g.event ? resolve(g.when, g.id, eventByName[g.event], 'the condition') : null }));
  const events = prose.events.map((e): IrEvent => ({ id: e.id, name: e.name, sender: e.sender, fields: e.fields.map((f: IrField) => ({ name: f.name, type: f.type, min: f.min, max: f.max, values: f.values, unit: f.unit })), ...(e.refusalOnly ? { refusalOnly: true as const } : {}) }));

  // Event cases for exploration: every combination of field values. An event whose fields take
  // more combinations than the chart tries has its error from the prose, and no cases here.
  const eventCases: EventCase[] = [];
  for (const e of events) {
    if (e.fields.reduce((n, f) => n * valuesIn(f), 1) > EVENT_CASES) continue;
    let cases: EventCase[] = [{ type: e.name }];
    for (const f of e.fields) {
      const next: EventCase[] = [];
      for (const c of cases) for (const v of domainOf(f)) next.push({ ...c, [f.name]: v });
      cases = next;
    }
    for (const c of cases) eventCases.push(c);
  }

  return {
    ok: errors.length === 0, errors,
    name: prose.title, tier: prose.tier, module: prose.module, pins: prose.pins,
    boundary: prose.boundary.text,
    context: data.map((d: IrDatum) => ({ name: d.name, type: d.type, min: d.min, max: d.max, values: d.values, unit: d.unit, initial: d.initial })),
    effects: prose.boundary.effects,
    states, initial: initial ? initial.key : null, root: root.map(s => s.key),
    events, eventCases, transitions, refusals, invariants, structural, onces, withins, givens, walks,
    seams: prose.seams, guarantees: prose.guarantees, wordsOnly: prose.wordsOnly,
    table: prose.table, unsaid: prose.unsaid, saidTwice: prose.saidTwice,
    hashes: passageHashes(prose),
  };
}
