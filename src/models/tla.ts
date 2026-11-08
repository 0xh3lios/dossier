// TLA+ for a part: the scaffold generated from the IR, and the reader of
// the module as it stands after hand refinement.
import { normalize, short } from '../hash.ts';
import { toTla } from '../prose/expr.ts';
import { actorId, findActor } from '../dossiers/actors.ts';
import type { Expr, Value } from '../prose/expr.ts';
import type { Domain, Ir, IrEvent, IrGiven, IrSide, IrTransition, IrWalk, IrWalkStep, IrWithin } from '../prose/ir.ts';
import type { Children } from '../prose/prose.ts';
import type { ActorsModel } from '../dossiers/actors.ts';

// One definition of a module: its text and the hash of that text without comments.
export interface TlaDefinition { text: string; hash: string }
// A WF_ or SF_ clause, with the Given its comment cites.
export interface TlaFairness { kind: string; action: string; given: string | null; line: number }
// An action named M<n>_<Event>: the move it encodes, its event and the states it writes.
export interface TlaAction { move: string; event: string; targets: string[]; stays: boolean }
export interface TlaModule {
  module: string | null;
  definitions: Record<string, TlaDefinition>;
  fairness: TlaFairness[];
  actions: Record<string, TlaAction>;
  properties: string[];
  states: string[];
  variables: string[];
}
// A TLC configuration: what it specifies, checks and binds.
export interface Cfg {
  specification: string | null;
  init: string | null;
  next: string | null;
  invariants: string[];
  properties: string[];
  constants: Record<string, string | null>;
  constraints: string[];
  checkDeadlock: boolean | null;
  unknown: string[];
  enabled: string[];
}

// A TLA+ identifier from an id or a name: a hyphen, or anything else TLA+ does not take, becomes an underscore.
export const ident = (s: unknown): string => String(s).replace(/[^A-Za-z0-9_]/g, '_');
export const actorName = (sender: unknown): string => {
  const words = String(sender).replace(/^the\s+/i, '').split(/[\s-]+/).filter(Boolean);
  return words.map(w => w[0].toUpperCase() + w.slice(1)).join('').replace(/[^A-Za-z0-9_]/g, '') || 'Public';
};
// An event's name as it ends an action's name: post-a is M4_PostA.
export const cap = (s: string): string => ident(s[0].toUpperCase() + s.slice(1).replace(/-(\w)/g, (_, c) => c.toUpperCase()));
const str = (v: Value) => (typeof v === 'string' ? `"${v}"` : typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : String(v));
// The counter of an effect's sends.
const sentOf = (effect: string) => `sent_${ident(effect)}`;
// A walk as its observer reads it: the steps taken, each with the refused steps the walk
// names just before it, and the refused steps after the last step taken.
export interface WalkPlan<S> { taken: { step: S; refusedBefore: S[] }[]; refusedAfter: S[] }
export function walkPlan<S extends { refused: boolean }>(steps: S[]): WalkPlan<S> {
  const taken: WalkPlan<S>['taken'] = [];
  let pending: S[] = [];
  for (const s of steps) { if (s.refused) pending.push(s); else { taken.push({ step: s, refusedBefore: pending }); pending = []; } }
  return { taken, refusedAfter: pending };
}
// Whether an event is the chain's tick. A sender resolves to a part by its id first, as a
// composition resolves it, and a part's send is never the tick; then to an actor in actors.md,
// and the event is the tick when that actor is of kind chain. Only a sender neither resolves to
// is read by the event's name, tick.
export function isChainTick(ev: Pick<IrEvent, 'name' | 'sender'>, { actors, parts = [] }: { actors?: Pick<ActorsModel, 'actors' | 'byId'> | null; parts?: string[] } = {}): boolean {
  if (parts.includes(actorId(ev.sender))) return false;
  const a = actors ? findActor(actors, ev.sender) : null;
  return a ? a.kind === 'chain' : ev.name === 'tick';
}

function leavesUnder(ir: Pick<Ir, 'states'>, key: string | null | undefined): string[] {
  const direct = ir.states.filter(s => s.key === key || s.key.startsWith(`${key}.`)).filter(s => !s.children);
  return direct.map(s => s.key);
}
function entryLeaf(ir: Pick<Ir, 'states'>, key: string | null): string {
  let s = ir.states.find(x => x.key === key);
  while (s && s.children) {
    if (s.children.kind === 'parallel') throw new Error(`${s.key} has parallel regions, which the TLA+ scaffold does not write; model it by hand`);
    s = ir.states.find(x => x.key === `${s!.key}.${(s!.children as Extract<Children, { kind: 'compound' }>).initial}`);
  }
  return s!.key;
}

export function statePredicate(ir: Pick<Ir, 'states'>, key: string | null | undefined): string {
  const leaves = leavesUnder(ir, key);
  return leaves.length === 1 ? `state = "${leaves[0]}"` : `state \\in {${leaves.map(l => `"${l}"`).join(', ')}}`;
}
export function sideTla(ir: Pick<Ir, 'states'>, side: IrSide | null): string {
  return side!.state ? statePredicate(ir, side!.state) : toTla(side!.cond!);
}

export function typeOf(d: Domain): string {
  if (d.type === 'flag') return 'Bool';
  if (d.type === 'enum') return 'Str';
  return 'Int';
}
export function domainTla(d: Domain): string {
  if (d.type === 'flag') return 'BOOLEAN';
  if (d.type === 'enum') return `{${d.values!.map(v => `"${v}"`).join(', ')}}`;
  return `${d.min}..${d.max}`;
}

// actors and parts: what the root declares, so that its senders resolve as a composition
// resolves them; without them an event is the chain's tick when it is named tick.
export function scaffoldTla(ir: Ir, { moduleName, actors, parts }: { moduleName?: string; actors?: Pick<ActorsModel, 'actors' | 'byId'> | null; parts?: string[] } = {}): string {
  const name = moduleName || cap(ir.name!);
  const data = ir.context.map(d => d.name);
  const sentVars = ir.effects.map(e => sentOf(e.name));
  const ghosts = ir.withins.map(n => `${n.id.toLowerCase()}_ticks`);
  const walkVar = (w: IrWalk) => `${w.id.toLowerCase()}_at`;
  const plans = new Map(ir.walks.map(w => [w.id, walkPlan(w.steps.map((s, i) => ({ ...s, at: i + 1 })))]));
  // A walk that counts an effect keeps the effect's count when its observer armed, so the end
  // compares the sends since the walk began, as the chart does. A walk that takes no step arms nothing.
  const counted = (w: IrWalk) => (plans.get(w.id)!.taken.length ? [...new Set([...Object.keys(w.sent), ...w.notSent])] : []);
  const armedVar = (w: IrWalk, e: string) => `${w.id.toLowerCase()}_armed_${sentOf(e)}`;
  const walkVars = ir.walks.flatMap(w => [walkVar(w), ...counted(w).map(e => armedVar(w, e))]);
  const vars = ['state', ...data, ...sentVars, ...ghosts, ...walkVars];
  const L: string[] = [];
  const line = (s = '') => L.push(s);
  const stateLeaves = ir.states.filter(s => !s.children).map(s => s.key);
  const eventOf = (t: IrTransition) => ir.events.find(e => e.name === t.event)!;
  const tickEvents = new Set(ir.events.filter(e => isChainTick(e, { actors, parts })).map(e => e.name));
  const isTickEvent = (ev: string | null) => tickEvents.has(ev);

  line(`${'-'.repeat(28)} MODULE ${name} ${'-'.repeat(28)}`);
  line(`\\* Scaffolded by dossier from the prose of ${ir.name}. Every action and property`);
  line(`\\* names the passage it encodes; refusals are the absent actions.`);
  line('EXTENDS Naturals');
  line('');
  line('CONSTANTS');
  line('  \\* @type: Int;');
  line('  MaxSent                                        \\* bounds the effect counters');
  line('ConstInit == MaxSent = 4');
  line('');
  line('VARIABLES');
  vars.forEach((v, i) => {
    const d = ir.context.find(x => x.name === v);
    const type = v === 'state' ? 'Str' : d ? typeOf(d) : 'Int';
    line(`  \\* @type: ${type};`);
    line(`  ${v}${i < vars.length - 1 ? ',' : ''}`);
  });
  line(`vars == <<${vars.join(', ')}>>`);
  line('');
  line(`States == {${stateLeaves.map(l => `"${l}"`).join(', ')}}${ir.states.length ? `   \\* ${ir.states.map(s => s.id).join(' ')}` : ''}`);
  for (const s of ir.states.filter(s => s.children)) line(`In${cap(s.key.replace(/\./g, '_'))} == ${statePredicate(ir, s.key)}`);
  line('');
  const init = ir.states.find(s => s.key === ir.initial);
  line(`Init ==                                           \\* ${init ? init.id : ''}`);
  line(`  /\\ state = "${entryLeaf(ir, ir.initial)}"`);
  for (const d of ir.context) line(`  /\\ ${d.name} = ${str(d.initial)}`);
  for (const v of [...sentVars, ...ghosts, ...walkVars]) line(`  /\\ ${v} = 0`);
  line('');

  // Ghost tick counters for Within passages.
  const ghostUpdate = (n: IrWithin, eventName: string | null) => {
    const g = `${n.id.toLowerCase()}_ticks`;
    const trig = sideTla(ir, n.trigger).replace(/\b(state|[a-z_]\w*)\b/g, (m) => (vars.includes(m) ? `${m}'` : m));
    const goal = sideTla(ir, n.goal).replace(/\b(state|[a-z_]\w*)\b/g, (m) => (vars.includes(m) ? `${m}'` : m));
    if (isTickEvent(eventName)) return `${g}' = IF ${goal} THEN 0 ELSE IF ~(${trig}) THEN 0 ELSE (IF ${g} > ${n.k} THEN ${g} ELSE ${g} + 1)`;
    return `${g}' = IF ${goal} THEN 0 ELSE IF ~(${trig}) THEN 0 ELSE ${g}`;
  };

  const actionName = (t: IrTransition) => `${t.id}_${cap(t.event!)}`;
  const byActor: Record<string, string[]> = {};
  const chainSenders = new Set(ir.events.filter(e => isTickEvent(e.name)).map(e => actorName(e.sender)));
  const senderOf = (t: IrTransition) => actorName(eventOf(t).sender);
  const sends = (a: string) => ir.events.some(e => actorName(e.sender) === a);
  // Givens with an actor: fairness when they have no "only when" or are prompt; prompt keeps the
  // chain from ticking while a move of its event is enabled; "only when" restricts the moves.
  const actorGivens = ir.givens.filter(g => g.actor);
  const fair = (g: IrGiven) => !g.when || g.promptness === 'prompt';
  const whensOf = (t: IrTransition) => actorGivens.filter(g => g.when && g.event === t.event && actorName(g.actor) === senderOf(t));
  const dueActors: { actor: string; ids: string[]; events: (string | null)[] }[] = [];
  for (const g of actorGivens.filter(g => g.promptness === 'prompt')) {
    const a = actorName(g.actor);
    if (chainSenders.has(a) || !sends(a)) continue;
    let d = dueActors.find(x => x.actor === a);
    if (!d) dueActors.push(d = { actor: a, ids: [], events: [] });
    d.ids.push(g.id);
    d.events.push(g.event);
  }
  // A move's enabledness: its state, its condition and the only when of its event's Givens,
  // over the event's fields, with any the caller fixes conjoined inside the quantifier.
  const canOf = (t: IrTransition, fixed: string[] = []) => {
    const fields = eventOf(t).fields;
    const body = [...fixed, statePredicate(ir, t.from), ...(t.guard ? [toTla(t.guard)] : []), ...whensOf(t).map(g => toTla(g.when!))].join(' /\\ ');
    return fields.length ? `\\E ${fields.map(f => `${f.name} \\in ${domainTla(f)}`).join(', ')} : ${body}` : body;
  };
  // Enabledness as state predicates first, so Due_, the actions and the walks can refer to them.
  for (const t of ir.transitions) line(`Can_${actionName(t)} == ${canOf(t)}`);
  for (const d of dueActors) {
    const moves = ir.transitions.filter(x => senderOf(x) === d.actor && d.events.some(e => e === null || e === x.event));
    line(`Due_${d.actor} == ${moves.map(x => `Can_${actionName(x)}`).join(' \\/ ') || 'FALSE'}   \\* ${d.ids.join(' ')}: acts before the next tick`);
  }
  // A step a walk refuses, as a definition of its own, W<n>_Refused<k> for the walk's k-th step:
  // no move of its event is enabled, with the step's arguments. Defined apart from the actions,
  // its quantifier binds no field an action binds. An event no move takes needs none.
  const argsOf = (s: IrWalkStep) => Object.entries(s.args).map(([k, a]) => `${k} = ${toTla(a!)}`);
  const refusedName = new Map<string, string>();
  for (const w of ir.walks) w.steps.forEach((s, i) => {
    const moves = ir.transitions.filter(t => t.event === s.event);
    if (!s.refused || !moves.length) return;
    const args = argsOf(s);
    refusedName.set(`${w.id}.${i + 1}`, `${w.id}_Refused${i + 1}`);
    line(`${w.id}_Refused${i + 1} == ~(${moves.map(t => (args.length ? `(${canOf(t, args)})` : `Can_${actionName(t)}`)).join(' \\/ ')})`);
  });
  line('');

  // A walk's observer. It arms when the walk's first step is taken from the walk's start, and
  // advances on each next step taken with its arguments; any other step resets it. A refused
  // step is checked where the walk refuses it, before the next step taken, or at the end after the last.
  const refusedOf = (w: IrWalk) => (s: { at: number }) => { const n = refusedName.get(`${w.id}.${s.at}`); return n ? [n] : []; };
  const startOf = (w: IrWalk) => [statePredicate(ir, w.from), ...Object.entries(w.with).map(([k, v]) => `${k} = ${toTla(v!)}`)];
  const stepWhen = (w: IrWalk, k: number) => {
    const { step, refusedBefore } = plans.get(w.id)!.taken[k];
    return [...(k === 0 ? startOf(w) : []), ...refusedBefore.flatMap(refusedOf(w)), ...argsOf(step)];
  };
  const walkUpdate = (w: IrWalk, t: IrTransition) => {
    const v = walkVar(w), { taken } = plans.get(w.id)!;
    const next = taken.map((s, k) => ({ s, k })).filter(({ s, k }) => k > 0 && s.step.event === t.event);
    const arms = taken.length > 0 && taken[0].step.event === t.event;
    if (!next.length && !arms) return [`${v}' = 0`, ...counted(w).map(e => `${armedVar(w, e)}' = 0`)];
    const update = `${v}' = ${next.map(({ k }) => `IF ${[`${v} = ${k}`, ...stepWhen(w, k)].join(' /\\ ')} THEN ${k + 1} ELSE `).join('')}${arms ? `IF ${stepWhen(w, 0).join(' /\\ ')} THEN 1 ELSE 0` : '0'}`;
    return [update, ...counted(w).map(e => `${armedVar(w, e)}' = IF ${v}' = 1 THEN ${sentOf(e)} ELSE IF ${v}' = 0 THEN 0 ELSE ${armedVar(w, e)}`)];
  };

  for (const t of ir.transitions) {
    const ev = eventOf(t);
    const an = actionName(t);
    (byActor[actorName(ev.sender)] ||= []).push(an);
    const fields = ev.fields;
    const changed = new Set(['state', ...t.assigns.map(a => a.name), ...t.effects.map(sentOf), ...ghosts, ...walkVars]);
    line(`${an} ==                                 \\* ${t.id} on ${t.event}`);
    const pad = fields.length ? '    ' : '  ';
    if (fields.length) line(`  \\E ${fields.map(f => `${f.name} \\in ${domainTla(f)}`).join(', ')} :`);
    line(`${pad}/\\ ${statePredicate(ir, t.from)}`);
    if (t.guard) line(`${pad}/\\ ${toTla(t.guard)}`);
    for (const g of whensOf(t)) line(`${pad}/\\ ${toTla(g.when!)}   \\* ${g.id}: only when`);
    if (isTickEvent(t.event)) for (const d of dueActors) line(`${pad}/\\ ~Due_${d.actor}                      \\* ${d.ids.join(' ')}`);
    line(`${pad}/\\ state' = ${t.stays ? 'state' : `"${entryLeaf(ir, t.target)}"`}`);
    for (const a of t.assigns) line(`${pad}/\\ ${a.name}' = ${toTla(a.expr!)}`);
    for (const e of t.effects) line(`${pad}/\\ ${sentOf(e)}' = ${sentOf(e)} + 1`);
    const unchanged = vars.filter(v => !changed.has(v));
    if (unchanged.length) line(`${pad}/\\ UNCHANGED <<${unchanged.join(', ')}>>`);
    for (const n of ir.withins) line(`${pad}/\\ ${ghostUpdate(n, t.event)}`);
    for (const w of ir.walks) for (const u of walkUpdate(w, t)) line(`${pad}/\\ ${u}`);
    line('');
  }
  const actorsInOrder = Object.keys(byActor);
  for (const a of actorsInOrder) line(`${a} == ${byActor[a].join(' \\/ ')}`);
  // The moves of one actor on one event, for the fairness of a Given with "on".
  const scoped = (g: IrGiven) => `${actorName(g.actor)}_${cap(g.event!)}`;
  const written = new Set<string>();
  for (const g of actorGivens) {
    const a = actorName(g.actor);
    if (!g.event || !fair(g) || !actorsInOrder.includes(a) || written.has(scoped(g))) continue;
    written.add(scoped(g));
    const moves = ir.transitions.filter(t => t.event === g.event && senderOf(t) === a).map(actionName);
    line(`${scoped(g)} == ${moves.join(' \\/ ') || 'FALSE'}`);
  }
  // A piece whose every event is refused has no move: its Next is FALSE, and TLC's deadlock check is off.
  line(`Next == ${actorsInOrder.join(' \\/ ') || 'FALSE'}`);
  line('');
  line('Spec == Init /\\ [][Next]_vars');
  for (const g of actorGivens) {
    if (!fair(g) || !actorsInOrder.includes(actorName(g.actor))) continue;
    line(`        /\\ WF_vars(${g.event ? scoped(g) : actorName(g.actor)})                        \\* from ${g.id}`);
  }
  line('');
  line('TypeOK ==');
  line('  /\\ state \\in States');
  for (const d of ir.context) line(`  /\\ ${d.name} \\in ${domainTla(d)}`);
  for (const v of [...sentVars, ...ghosts]) line(`  /\\ ${v} \\in Nat`);
  for (const w of ir.walks) {
    line(`  /\\ ${walkVar(w)} \\in 0..${plans.get(w.id)!.taken.length}`);
    for (const e of counted(w)) line(`  /\\ ${armedVar(w, e)} \\in Nat`);
  }
  line(`SentBounded == ${sentVars.length ? sentVars.map(v => `${v} <= MaxSent`).join(' /\\ ') : 'TRUE'}`);
  line('');
  for (const inv of ir.invariants) {
    const body = toTla(inv.cond!);
    line(`${inv.id} == ${inv.while ? `(${statePredicate(ir, inv.while)}) => ${body}` : body}`);
  }
  for (const o of ir.onces) line(`${o.id} == (${sideTla(ir, o.trigger)}) ~> (${sideTla(ir, o.goal)})      \\* given ${o.givens.join(' ')}`);
  for (const n of ir.withins) line(`${n.id} == ${n.id.toLowerCase()}_ticks <= ${n.k}      \\* given ${n.givens.join(' ')}`);
  for (const inv of [...ir.invariants, ...ir.withins]) line(`Inv_${inv.id} == TypeOK /\\ ${inv.id}`);
  // A walk ends once its observer has seen every step taken, in the state and with the data it
  // names, with the refused steps after the last step taken refused there and the effects sent
  // since the walk began counted. A walk that takes no step is read in one state, its start.
  for (const w of ir.walks) {
    const { taken, refusedAfter } = plans.get(w.id)!;
    const sends: [string, number | undefined][] = [...Object.entries(w.sent), ...w.notSent.map((e): [string, number] => [e, 0])];
    const parts = [
      `${walkVar(w)} = ${taken.length}`,
      ...(taken.length ? [] : startOf(w)),
      ...refusedAfter.flatMap(refusedOf(w)),
      statePredicate(ir, w.ends),
      ...Object.entries(w.endData).map(([k, v]) => `${k} = ${toTla(v!)}`),
      ...(taken.length ? sends.map(([e, n]) => `${sentOf(e)} - ${armedVar(w, e)} = ${n}`) : sends.some(([, n]) => n !== 0) ? ['FALSE'] : []),
    ];
    line(`${w.id}_End == ${parts.join(' /\\ ')}`);
    line(`Not${w.id} == ~${w.id}_End`);
  }
  line(`${'='.repeat(70)}`);
  return L.join('\n') + '\n';
}

export function scaffoldCfgs(ir: Ir, { moduleName }: { moduleName?: string } = {}): Record<string, string> {
  const name = moduleName || cap(ir.name!);
  const base = ['SPECIFICATION Spec', 'CONSTANT MaxSent = 4', 'CONSTRAINT SentBounded', 'CHECK_DEADLOCK FALSE'];
  const cfgs: Record<string, string> = {};
  const invariants = ['TypeOK', ...ir.invariants.map(i => i.id), ...ir.withins.map(n => n.id)];
  cfgs[`${name}.cfg`] = [...base, `INVARIANTS ${invariants.join(' ')}`].join('\n') + '\n';
  for (const o of ir.onces) cfgs[`${name}_${o.id}.cfg`] = [...base, `PROPERTIES ${o.id}`].join('\n') + '\n';
  for (const w of ir.walks) cfgs[`${name}_${w.id}.cfg`] = [...base, `INVARIANTS TypeOK Not${w.id}`].join('\n') + '\n';
  return cfgs;
}

// Reading a module as it stands: definitions, actions, properties, fairness.
const stripComments = (text: string) => text.replace(/\(\*[\s\S]*?\*\)/g, '').replace(/\\\*.*$/gm, '');

// The states an action writes: conjuncts whose left side is state'. A ghost
// counter or a walk observer mentions state' inside an IF; that is no target.
export function targetsOf(text: unknown): string[] {
  const out = new Set<string>();
  for (const piece of String(text).split(/\/\\|\\\/|\n|==/)) {
    const m = piece.match(/^[\s(]*(?:\w+_)?state'\s*=\s*"([A-Za-z][\w.-]*)"/);
    if (m) out.add(m[1]);
  }
  return [...out];
}

// events: the part's event names, when the caller has its prose. An action's event is the
// one whose name ends the action's name as the scaffold writes it (post-a ends M4_PostA); without
// the names, it is the event the scaffold's comment on the action names, "\* M4 on post-a", and
// failing both, the end of the action's name with its first letter lowered.
// local: read a LOCAL definition as a definition too, for a reader that follows what a definition
// reaches; without it, as for every reader of the module's own operators, LOCAL ones are left out.
export function parseTla(text: string, { events = [], local = false }: { events?: (string | null)[]; local?: boolean } = {}): TlaModule {
  const lines = text.split(/\r?\n/);
  const defs: { name: string; lines: string[] }[] = [];
  let cur: { name: string; lines: string[] } | null = null;
  const START = local ? /^(?:LOCAL\s+)?([A-Za-z_]\w*)(\([^)]*\))?\s*==/ : /^([A-Za-z_]\w*)(\([^)]*\))?\s*==/;
  for (const line of lines) {
    if (/^={4,}\s*$/.test(line)) { if (cur) defs.push(cur); cur = null; break; }
    const m = line.match(START);
    if (m) { if (cur) defs.push(cur); cur = { name: m[1], lines: [line] }; continue; }
    if (!cur) continue;
    if (/^(VARIABLES?|CONSTANTS?|EXTENDS|INSTANCE|LOCAL|RECURSIVE|ASSUME|THEOREM)\b/.test(line)) { defs.push(cur); cur = null; continue; }
    cur.lines.push(line);
  }
  if (cur) defs.push(cur);
  const definitions: Record<string, TlaDefinition> = {};
  for (const d of defs) {
    const body = d.lines.join('\n');
    definitions[d.name] = { text: body, hash: short(normalize(stripComments(body))) };
  }
  const fairness: TlaFairness[] = [];
  lines.forEach((line, i) => {
    for (const f of line.matchAll(/\b(WF|SF)_(\w+)\(([^)]+)\)/g)) fairness.push({ kind: f[1], action: f[3].trim(), given: (line.match(/\\\*\s*from\s+(G\d+)/) || [])[1] || null, line: i + 1 });
  });
  const actions: Record<string, TlaAction> = {};
  for (const [name, d] of Object.entries(definitions)) {
    const a = name.match(/^M(\d+)_(\w+)$/);
    if (!a) continue;
    const said = (d.text.split('\n')[0].match(/\\\*\s*M\d+\s+on\s+([a-z][\w-]*)/) || [])[1];
    const commented = said && cap(said) === a[2] ? said : null;
    const named = events.filter((e): e is string => Boolean(e) && cap(e!) === a[2]);
    actions[name] = {
      move: `M${a[1]}`,
      event: (commented && (!named.length || named.includes(commented)) ? commented : named[0]) || commented || a[2].charAt(0).toLowerCase() + a[2].slice(1),
      targets: targetsOf(d.text),
      stays: /state'\s*=\s*state\b/.test(d.text),
    };
  }
  const properties = Object.keys(definitions).filter(n => /^(A\d+|O\d+|N\d+|R\d+|TypeOK|Inv_\w+|W\d+_End|NotW\d+)$/.test(n));
  const module = (text.match(/MODULE\s+(\w+)/) || [])[1] || null;
  const states = [...new Set([...stripComments(text).matchAll(/state'?\s*=\s*"([A-Za-z][\w.-]*)"/g)].map(x => x[1]))];
  const variables = (text.match(/VARIABLES?\s+([\s\S]*?)(?=\n\w)/) || [, ''])[1]!.replace(/\\\*[^\n]*/g, '').split(/[\s,]+/).filter(Boolean);
  return { module, definitions, fairness, actions, properties, states, variables };
}

// What a blunder must leave as its base has it is read with the helpers below: the definitions a
// property reaches, the constants a module declares, how an operator such as ConstInit sets them,
// and how a module moves one variable.

// A module's text with its comments blanked, and the inside of its strings too when strings is
// true: what is left keeps its lines and columns. Block comments nest, as TLA+ reads them.
function blank(text: string, strings = false): string {
  let out = '', depth = 0, quoted = false, line = false;
  const hide = (s: string) => s.replace(/[^\n]/g, ' ');
  for (let i = 0; i < text.length; i++) {
    const c = text[i], pair = text.slice(i, i + 2);
    if (line) { line = c !== '\n'; out += line ? ' ' : '\n'; continue; }
    if (depth) {
      if (pair === '(*' || pair === '*)') { depth += pair === '(*' ? 1 : -1; out += '  '; i++; }
      else out += hide(c);
      continue;
    }
    if (quoted) {
      if (c === '"') { quoted = false; out += c; }
      else { const s = c === '\\' ? pair : c; out += strings ? hide(s) : s; i += s.length - 1; }
      continue;
    }
    if (pair === '(*') { depth = 1; out += '  '; i++; }
    else if (pair === '\\*') { line = true; out += '  '; i++; }
    else { quoted = c === '"'; out += c; }
  }
  return out;
}

// The names a text reads: its identifiers, outside comments and strings.
export function namesIn(text: string): string[] {
  return [...new Set(blank(text, true).match(/[A-Za-z_][A-Za-z0-9_]*/g) || [])];
}

// The definitions the named ones reach by the names they read, transitively, the named ones among them.
export function reach(definitions: Record<string, TlaDefinition>, names: string[]): string[] {
  const seen = new Set<string>(), todo = [...names];
  while (todo.length) {
    const name = todo.pop()!;
    if (seen.has(name) || !Object.hasOwn(definitions, name)) continue;
    seen.add(name);
    todo.push(...namesIn(definitions[name].text));
  }
  return [...seen];
}

// The constants a module declares under CONSTANT or CONSTANTS, an operator's arity left off.
export function constantsOf(text: string): string[] {
  const lines = blank(text).split('\n'), out = new Set<string>();
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^CONSTANTS?\b(.*)$/);
    if (!m) continue;
    let declared = m[1];
    while (i + 1 < lines.length && !/^\S/.test(lines[i + 1])) declared += `\n${lines[++i]}`;
    for (const name of declared.replace(/\([^)]*\)/g, ' ').match(/[A-Za-z_]\w*/g) || []) out.add(name);
  }
  return [...out];
}

// A formula's conjuncts: its text split at each /\ outside brackets and strings, spaces normalized.
function conjuncts(text: string): string[] {
  const out: string[] = [];
  let depth = 0, quoted = false, from = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (c === '\\') i++; else if (c === '"') quoted = false; continue; }
    if (c === '"') quoted = true;
    else if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    else if (depth === 0 && text.startsWith('/\\', i)) { out.push(text.slice(from, i)); from = i + 2; i++; }
  }
  out.push(text.slice(from));
  return out.map(normalize).filter(Boolean);
}
const bodyOf = (d: TlaDefinition) => { const text = blank(d.text); return text.slice(text.indexOf('==') + 2); };

// The values an operator such as ConstInit gives the constants: its conjuncts K = v, each value as
// written, spaces normalized. Null when a conjunct has another form.
export function assignmentsOf(definition: TlaDefinition): Map<string, string> | null {
  const out = new Map<string, string>();
  for (const c of conjuncts(bodyOf(definition))) {
    const m = c.match(/^([A-Za-z_]\w*)\s*=(?![=<>])\s*(.+)$/);
    if (!m) return null;
    out.set(m[1], m[2]);
  }
  return out;
}

// What a right-hand side stands for: its text, or, while it names a definition without
// parameters, that definition's body, spaces normalized. A cycle stops at the name it returns to.
export function valueOf(text: string, definitions: Record<string, TlaDefinition>): string {
  let value = normalize(text);
  for (const seen = new Set<string>(); /^[A-Za-z_]\w*$/.test(value) && Object.hasOwn(definitions, value) && !seen.has(value);) {
    seen.add(value);
    const d = definitions[value];
    if (!new RegExp(`^(?:LOCAL\\s+)?${value}\\s*==`).test(d.text)) break;
    value = normalize(bodyOf(d));
  }
  return value;
}

// The constants a TLC configuration binds to a definition, CONSTANT K <- D: each with the definition
// it names. parseCfg reads K <- D and K = D alike; TLC substitutes the definition only for <-.
export function overridesOf(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of text.replace(/\\\*.*$/gm, '').matchAll(/([A-Za-z_]\w*)\s*<-\s*([A-Za-z_]\w*)/g)) out.set(m[1], m[2]);
  return out;
}

// The column of the bullet, /\ or \/ first on its line, whose item holds the text at `at`: the one
// that begins the line itself, or the nearest above it that starts further left than every line
// between. -1 when the definition's own line comes first.
function bulletOf(text: string, at: number): number {
  const lines = text.slice(0, at).split('\n');
  let indent = Infinity;
  for (let i = lines.length - 1; i >= 0; i--) {
    const m = lines[i].match(/^([ \t]*)\S/);
    if (!m || m[1].length >= indent) continue;
    if (/^[ \t]*(?:\/\\|\\\/)/.test(lines[i])) return m[1].length;
    if (!m[1].length) return -1;
    indent = m[1].length;
  }
  return -1;
}

// Where an update ends; its v' sits at `at`, and its expression begins at `from`. By TLA+'s
// precedence = binds tighter than /\ and \/, so the update ends at the first /\ or \/ outside
// brackets, unless an IF, CASE, LET, CHOOSE or quantifier began there first: its last branch runs
// to the end of the item. The item ends at a bracket it did not open, at the end of the definition,
// and within a bullet, at the next line no deeper than the bullet.
function conjunctEnd(text: string, at: number, from: number): number {
  const bullet = bulletOf(text, at);
  let depth = 0, open = false, quoted = false;
  for (let i = from; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (c === '\\') i++; else if (c === '"') quoted = false; continue; }
    if (c === '"') quoted = true;
    else if (c === '\n') {
      const next = bullet >= 0 && depth === 0 ? text.slice(i + 1).match(/^(?:[ \t]*\n)*([ \t]*)\S/) : undefined;
      if (next !== undefined && (!next || next[1].length <= bullet)) return i;
    } else if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) { if (depth === 0) return i; depth--; }
    else if (depth === 0 && !open) {
      if (!/\w/.test(text[i - 1] || '') && /^(?:(?:IF|CASE|LET|CHOOSE)(?!\w)|\\[AE]{1,2}(?!\w))/.test(text.slice(i, i + 7))) open = true;
      else if (text.startsWith('/\\', i) || text.startsWith('\\/', i)) return i;
    }
  }
  return text.length;
}

// The history variables a module keeps for its properties, by property: a declared variable on the
// line commented `\* history for A<n>`, or, when that comment stands alone, the first declared
// variable on the next line, as an `\* @type:` comment stands above its variable.
export function historiesOf(text: string, variables: readonly string[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const lines = text.split('\n');
  const declared = (line: string) => (line.match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).filter(n => variables.includes(n));
  lines.forEach((line, i) => {
    const m = line.match(/\\\*\s*history for ([AON]\d+)\b/);
    if (!m) return;
    let names = declared(blank(line.slice(0, m.index)));
    if (!names.length) {
      const next = lines.slice(i + 1).map(l => blank(l)).find(l => l.trim());
      names = declared(next || '').slice(0, 1);
    }
    (out[m[1]] ||= []).push(...names);
  });
  for (const id of Object.keys(out)) out[id] = [...new Set(out[id])].sort();
  return out;
}

// How a module moves one variable. start: the conjuncts that read it in Init and the definitions
// Init reaches. updates: in each definition, the text after each v' to the end of its conjunct,
// and "= v" where UNCHANGED keeps it, by name or through a tuple such as vars. Comments are left
// out and spaces normalized, so that the same update reads alike in two modules.
export interface VariableMoves { start: string[]; updates: { definition: string; expr: string }[] }
export function movesOf(definitions: Record<string, TlaDefinition>, variable: string): VariableMoves {
  const reads = new RegExp(`(?<!\\w)${variable}(?![\\w'])`);
  const start = reach(definitions, ['Init']).flatMap(name => conjuncts(bodyOf(definitions[name])).filter(c => reads.test(c))).sort();
  const tuple = (name: string) => (Object.hasOwn(definitions, name) ? (bodyOf(definitions[name]).trim().match(/^<<([^>]*)>>$/) || [, ''])[1]!.split(',').map(s => s.trim()) : []);
  const updates: VariableMoves['updates'] = [];
  for (const [name, d] of Object.entries(definitions)) {
    const text = blank(d.text);
    for (const m of text.matchAll(new RegExp(`(?<!\\w)${variable}'`, 'g'))) {
      const from = m.index! + m[0].length;
      updates.push({ definition: name, expr: normalize(text.slice(from, conjunctEnd(text, m.index!, from))) });
    }
    for (const m of text.matchAll(/\bUNCHANGED\s*(?:<<([^>]*)>>|([A-Za-z_]\w*))/g)) {
      const kept = m[1] !== undefined ? m[1].split(',').map(s => s.trim()) : [m[2]];
      if (kept.some(k => k === variable || (k !== name && tuple(k).includes(variable)))) updates.push({ definition: name, expr: `= ${variable}` });
    }
  }
  return { start, updates };
}

export function parseCfg(text: string): Cfg {
  // enabled is added once the sections are read.
  const out = { specification: null, init: null, next: null, invariants: [], properties: [], constants: {}, constraints: [], checkDeadlock: null, unknown: [] } as unknown as Cfg;
  const tokens = text.replace(/\\\*.*$/gm, '').split(/\s+/).filter(Boolean);
  const KEY: Record<string, string> = { SPECIFICATION: 'specification', INIT: 'init', NEXT: 'next', INVARIANT: 'invariants', INVARIANTS: 'invariants', PROPERTY: 'properties', PROPERTIES: 'properties', CONSTANT: 'constants', CONSTANTS: 'constants', CONSTRAINT: 'constraints', CONSTRAINTS: 'constraints', CHECK_DEADLOCK: 'checkDeadlock' };
  let section: string | null = null;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (KEY[t]) { section = KEY[t]; continue; }
    if (!section) { out.unknown.push(t); continue; }
    if (['specification', 'init', 'next'].includes(section)) out[section as 'specification' | 'init' | 'next'] = t;
    else if (section === 'checkDeadlock') out.checkDeadlock = t.toUpperCase() === 'TRUE';
    else if (section === 'constants') {
      const op = tokens[i + 1];
      if (op === '=' || op === '<-') {
        let value = tokens[i + 2] || '';
        let j = i + 2;
        if (value.startsWith('{') && !value.endsWith('}')) { while (j + 1 < tokens.length && !tokens[j].endsWith('}')) { j++; value += ' ' + tokens[j]; } }
        out.constants[t] = value;
        i = j;
      } else out.constants[t] = null;
    } else out[section as 'invariants' | 'properties' | 'constraints'].push(t);
  }
  out.enabled = [...out.invariants, ...out.properties];
  return out;
}

export function reachValues(constants: Record<string, string | null> | null | undefined): Record<string, number | string> {
  const values: Record<string, number | string> = {};
  for (const [name, value] of Object.entries(constants || {})) {
    if (value == null) continue;
    if (/^-?\d+$/.test(value)) values[name] = Number(value);
    else if (/^\{.*\}$/.test(value)) values[name] = value.slice(1, -1).split(',').map(s => s.trim()).filter(Boolean).length;
    else if (/^"[^"]*"$/.test(value)) values[name] = value.slice(1, -1);
  }
  return values;
}
