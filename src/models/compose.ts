// The composition module: member IRs composed by wiring, actors as mode constants,
// the composition's properties and walks, and one configuration per cell and per walk.
import { toTla } from '../prose/expr.ts';
import { actorId, findActor, modeOf, windowOf } from '../dossiers/actors.ts';
import { cap, ident, walkPlan } from './tla.ts';
import type { Value } from '../prose/expr.ts';
import type { Domain, Ir, IrEvent, IrField, IrGiven, IrTransition } from '../prose/ir.ts';
import type { Children, GivenForm, CompositionProse, CompositionStep, CompositionWalkForm, Trigger } from '../prose/prose.ts';
import type { ActorsModel, Scenario } from '../dossiers/actors.ts';
import type { Wiring } from '../dossiers/wiring.ts';

// The operator that sets a scenario's constants for Apalache, one line of the module each:
// ConstInit_<scenario>, with the scenario's hyphens as underscores.
export const constInitOf = (scenarioId: string): string => `ConstInit_${ident(scenarioId)}`;

// One cell's configuration: the property, the scenario, the cfg file and the ConstInit for Apalache.
export interface CellCfg { property: string; scenario: string; cfg: string; kind: 'property' | 'invariant'; cinit: string }
// One walk's witness configuration: the walk, the scenario it runs under and the cfg file.
export interface WalkCfg { id: string; scenario: string; cfg: string }
// An event a member sends into another member that no wiring reaches: a free action in the module,
// declared when wiring.md lists it under free:.
export interface FreeSend { event: string; from: string; declared: boolean }
// A part outside the wiring whose sends reach a member: free actions, named for the readers.
export interface OutsideSender { from: string; events: string[] }
// The tripwire each problem of a wiring trips, named where the problem is found.
export type ComposerTripwire = 'wiring names unknown part' | 'wiring names unknown effect or event' | 'sender is not declared' | 'Given names a part' | 'misnamed' | 'property claims unknown scenario' | 'malformed wiring' | 'malformed actors' | 'wiring does not compose';
export interface ComposerProblem { name: ComposerTripwire; message: string }
// Who an event comes from: an actor with modes, or a part with none.
type Source = { kind: 'actor' | 'part'; id: string };
// errors: the problems' messages, for everything that reads them alone.
export interface Composed { module: string; tla: string; cfgs: Record<string, string>; cells: CellCfg[]; walks: WalkCfg[]; errors: string[]; problems: ComposerProblem[]; actors: string[]; parts: string[]; free: FreeSend[]; outside: OutsideSender[]; vars: string[] }
// A composite step: its conjuncts, the variables it determines and the fields it quantifies.
interface Step { conj: string[]; changed: Set<string>; quantify: IrField[] }
// A walk step taken, as its observer watches it: the member, the event, whether the chain's
// tick takes it, and the conditions under which the step taken is this one.
interface Watched { c: string; e: string; tick: boolean; when: string[] }
interface WalkWatch { taken: Watched[]; refusedAfter: string[] }
type ReadWalk = CompositionWalkForm & { name: string; from: string; ends: string };
// A constant of the module, with its value under a scenario for the ConstInit and the cfgs.
interface Constant { name: string; type: string; value: (sc: Scenario) => string }

const str = (v: Value) => (typeof v === 'string' ? `"${v}"` : typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : String(v));
const typeOf = (d: Domain) => (d.type === 'flag' ? 'Bool' : d.type === 'enum' ? 'Str' : 'Int');
const domainTla = (d: Domain) => (d.type === 'flag' ? 'BOOLEAN' : d.type === 'enum' ? `{${d.values!.map(v => `"${v}"`).join(', ')}}` : `${d.min}..${d.max}`);
// A member's variables and actions begin with its id, a hyphen read as an underscore.
const pre = (c: string) => ident(c);
const sentOf = (effect: string) => `sent_${ident(effect)}`;
const quantified = (free: IrField[], parts: string[]) => (free.length ? `\\E ${free.map(f => `${f.name} \\in ${domainTla(f)}`).join(', ')} : ${parts.join(' /\\ ')}` : parts.join(' /\\ '));

function leaves(ir: Pick<Ir, 'states'>, key: string | null | undefined): string[] { return ir.states.filter(s => (s.key === key || s.key.startsWith(`${key}.`)) && !s.children).map(s => s.key); }
function entryLeaf(ir: Pick<Ir, 'states'>, key: string | null): string {
  let s = ir.states.find(x => x.key === key);
  while (s && s.children) {
    if (s.children.kind === 'parallel') throw new Error(`${s.key} has parallel regions, which wiring does not write`);
    s = ir.states.find(x => x.key === `${s!.key}.${(s!.children as Extract<Children, { kind: 'compound' }>).initial}`);
  }
  return s!.key;
}
function statePred(ir: Pick<Ir, 'states'>, c: string, key: string | null | undefined): string {
  const l = leaves(ir, key);
  return l.length === 1 ? `${pre(c)}_state = "${l[0]}"` : `${pre(c)}_state \\in {${l.map(x => `"${x}"`).join(', ')}}`;
}
const oneOf = (values: string[]) => (values.length > 1 ? `${values.slice(0, -1).join(', ')} or ${values[values.length - 1]}` : values.join(''));
// A start read against a member's state or its datum n: the value a cell begins from, or why
// the value does not read; null when the member holds no datum n.
function readStart(ir: Ir, c: string, n: string, written: unknown): { value: Value } | { problem: string } | null {
  const text = String(written);
  if (n === 'state') return ir.states.some(s => s.key === text && !s.children) ? { value: text } : { problem: `not a state of ${c}` };
  const d = ir.context.find(x => x.name === n);
  if (!d) return null;
  if (d.type === 'flag') return text === 'true' || text === 'false' ? { value: text === 'true' } : { problem: 'not a flag value' };
  if (d.type === 'enum') return d.values!.includes(text) ? { value: text } : { problem: `not one of ${oneOf(d.values!)}` };
  return /^\d+$/.test(text) && Number(text) >= d.min! && Number(text) <= d.max! ? { value: Number(text) } : { problem: `outside ${d.min}..${d.max}` };
}
// A side of a Once or a Within the prose could read: a state, or a condition that parsed.
const readSide = (s: Trigger | null) => Boolean(s && (s.state || s.cond));

// parts: every open part id under the root, so a sender outside the wiring still
// resolves to its dossier; retired: the retired ones, named as such where a member or a sender is one.
export function composeMembers({ name, prose, wiring, members, actors, parts = [], retired = [] }: { name: string; prose: CompositionProse; wiring: Wiring; members: Record<string, Ir | null | undefined>; actors: ActorsModel; parts?: string[]; retired?: string[] }): Composed {
  const problems: ComposerProblem[] = [];
  // A problem met on more than one path through the wiring is reported once.
  const fail = (tripwire: ComposerTripwire, message: string) => { if (!problems.some(p => p.message === message)) problems.push({ name: tripwire, message }); };
  const concern = ident(cap(name));
  const memberIds = wiring.members.map(m => m.part);
  for (const id of memberIds) if (!members[id]) fail('wiring names unknown part', `wiring names part ${id}, which ${retired.includes(id) ? 'is retired' : 'has no dossier or does not compile'}`);
  const ids = memberIds.filter(id => members[id]);
  const irs: Record<string, Ir> = Object.fromEntries(ids.map(id => [id, members[id]!]));
  // A member listed but not compiled is reported once, above; nothing that names it is reported again.
  const broken = new Set(memberIds.filter(id => !members[id]));
  const eventOf = (c: string, t: IrTransition) => irs[c].events.find(e => e.name === t.event)!;
  // The properties the prose could read; one it could not is its prose error, and no cell.
  const always = prose.always.filter(a => a.cond);
  const onces = prose.onces.filter(o => readSide(o.trigger) && readSide(o.goal));
  const withins = prose.withins.filter(n => typeof n.k === 'number' && readSide(n.trigger) && readSide(n.goal));
  const properties = [...always, ...onces, ...withins];

  // Variables: the members', the Within ghosts', and each walk's observer, how many of its steps
  // have been taken in order.
  const typed = new Map<string, string>();
  const varsOf = (c: string) => {
    const own: [string, string][] = [[`${pre(c)}_state`, 'Str'], ...irs[c].context.map((d): [string, string] => [`${pre(c)}_${d.name}`, typeOf(d)]), ...irs[c].effects.map((e): [string, string] => [`${pre(c)}_${sentOf(e.name)}`, 'Int'])];
    for (const [v, t] of own) if (!typed.has(v)) typed.set(v, t);
    return own.map(([v]) => v);
  };
  const ghosts = withins.map(n => `${n.id.toLowerCase()}_ticks`);
  const walks = prose.walks.filter((w): w is ReadWalk => Boolean(w.name && w.from && w.ends));
  const walkVar = (w: ReadWalk) => `${w.id.toLowerCase()}_at`;
  const walkVars = walks.map(walkVar);
  const vars = [...ids.flatMap(varsOf), ...ghosts, ...walkVars];
  const sentVars = ids.flatMap(c => irs[c].effects.map(e => `${pre(c)}_${sentOf(e.name)}`));
  const varType = (v: string) => typed.get(v) || 'Int';

  // Senders: a part by its id first, then an actor by id or name. A member that does not
  // compile is still a part.
  const partIds = new Set([...memberIds, ...parts]);
  const sourceOf = (sender: string | null | undefined): Source | null => {
    const key = actorId(sender);
    if (key && partIds.has(key)) return { kind: 'part', id: key };
    const a = findActor(actors, sender);
    return a ? { kind: 'actor', id: a.id } : null;
  };
  const sourceOfEvent: Record<string, Source> = {};
  const usedActors = new Set<string>(), usedParts = new Set<string>();
  for (const c of ids) for (const ev of irs[c].events) {
    const s = sourceOf(ev.sender);
    if (!s) { fail('sender is not declared', `${c}: event ${ev.name} comes from "${ev.sender}", which is ${retired.includes(actorId(ev.sender) || '') ? 'a retired part' : 'neither an actor in actors.md nor a part'}`); continue; }
    sourceOfEvent[`${c}.${ev.name}`] = s;
    (s.kind === 'actor' ? usedActors : usedParts).add(s.id);
  }
  const actorIds = [...usedActors].sort();
  const partSenders = [...usedParts].sort();
  // The actor senders alone: they are the ones with modes and Givens.
  const actorOfEvent: Record<string, string> = {};
  for (const [key, s] of Object.entries(sourceOfEvent)) if (s.kind === 'actor') actorOfEvent[key] = s.id;
  // An event is the chain's tick when its sender is an actor of kind chain; a part's send never is.
  const chainActors = new Set(actors.actors.filter(a => a.kind === 'chain').map(a => a.id));
  const tickOf = (c: string, e: string | null) => { const s = sourceOfEvent[`${c}.${e}`]; return Boolean(s && s.kind === 'actor' && chainActors.has(s.id)); };
  const takesTick = ids.some(c => irs[c].transitions.some(t => tickOf(c, t.event)));

  // The scenarios claimed: each property's own or the wiring's defaults, and each walk's,
  // all-honest when it names none.
  const defaults = wiring.scenarios.length ? wiring.scenarios : ['all-honest'];
  const walkScenario = (w: ReadWalk) => w.scenario || 'all-honest';
  const claimedIds = new Set([...properties.flatMap(p => p.scenarios || defaults), ...walks.map(walkScenario)]);
  const claimed = actors.scenarios.filter(sc => claimedIds.has(sc.id));
  // An actor whose mode holds for a window under a claimed scenario is honest outside it: the
  // clock counts the ticks taken, up to the last bound a window names, and ModeNow_<actor> is the
  // mode in force. modeRef is the mode wherever the module tests one. A window needs the tick:
  // with no member taking it, the clock never moves.
  const windowed = actorIds.filter(a => claimed.some(sc => windowOf(sc, a)));
  if (!takesTick) for (const sc of claimed) for (const a of windowed) if (windowOf(sc, a)) fail('wiring does not compose', `${sc.id} gives ${a} a window, but no member of ${name} takes the chain's tick, so the clock that opens and closes the window never moves`);
  const maxClock = Math.max(0, ...claimed.flatMap(sc => windowed.flatMap(a => { const w = windowOf(sc, a); return w ? [w.from, ...(w.until === null ? [] : [w.until])] : []; })));
  if (windowed.length) vars.push('clock');
  const modeRef = (a: string) => `${windowed.includes(a) ? 'ModeNow' : 'Mode'}_${ident(a)}`;

  // Starts: the values a scenario's cells begin from, keyed <member>.<datum> or <member>.state.
  // Every declared scenario's entries are read against the members, claimed or not. An entry
  // for a part outside the composition is another composition's; one that does not read is reported
  // and left out, so its cells begin from the boundary's values. Only a claimed scenario's
  // starts become constants.
  const startsOf = new Map<string, Map<string, Value>>();
  const startKeys = new Map<string, { c: string; n: string }>();
  for (const sc of actors.scenarios) {
    const own = new Map<string, Value>(), keys = new Map<string, { c: string; n: string }>();
    for (const [key, written] of Object.entries(sc.start || {})) {
      const dot = key.indexOf('.');
      const c = dot < 0 ? key : key.slice(0, dot), n = dot < 0 ? '' : key.slice(dot + 1);
      if (!partIds.has(c)) { fail('malformed actors', `start: ${sc.id} starts ${key}, which names no part`); continue; }
      if (!ids.includes(c)) continue;
      const read = readStart(irs[c], c, n, written);
      if (!read) fail('malformed actors', `start: ${sc.id} starts ${key}, which ${c} does not hold`);
      else if ('problem' in read) fail('malformed actors', `start: ${sc.id} starts ${key} at ${written}, ${read.problem}`);
      else { own.set(`${pre(c)}_${n}`, read.value); keys.set(`${pre(c)}_${n}`, { c, n }); }
    }
    if (!claimedIds.has(sc.id)) continue;
    startsOf.set(sc.id, own);
    for (const [v, k] of keys) startKeys.set(v, k);
  }
  // A constant Start_<variable> for each variable a claimed scenario starts, in the variables' order.
  const starts = vars.filter(v => startKeys.has(v)).map(v => {
    const { c, n } = startKeys.get(v)!;
    const d = irs[c].context.find(x => x.name === n);
    return { v, name: `Start_${ident(v)}`, type: d ? typeOf(d) : 'Str', initial: d ? d.initial : entryLeaf(irs[c], irs[c].initial) };
  });
  // The constants: the modes, each windowed actor's window (from 0 with no end, 0, where a
  // scenario gives it none) and the starts, each with its value under a scenario.
  const constants: Constant[] = [
    { name: 'MaxSent', type: 'Int', value: () => '4' },
    ...actorIds.map(a => ({ name: `Mode_${ident(a)}`, type: 'Str', value: (sc: Scenario) => `"${modeOf(sc, a)}"` })),
    ...windowed.flatMap(a => [
      { name: `From_${ident(a)}`, type: 'Int', value: (sc: Scenario) => String(windowOf(sc, a)?.from ?? 0) },
      { name: `Until_${ident(a)}`, type: 'Int', value: (sc: Scenario) => String(windowOf(sc, a)?.until ?? 0) },
    ]),
    ...starts.map(s => ({ name: s.name, type: s.type, value: (sc: Scenario) => str(startsOf.get(sc.id)?.get(s.v) ?? s.initial) })),
  ];

  // Wiring: an effect of one member is an event of another in the same step. A member takes one
  // move in a step, so an effect delivered to one member twice does not compose.
  const wired: Record<string, { part: string; event: string }[]> = {};
  for (const w of wiring.wiring) {
    const src = irs[w.effect.part], dst = irs[w.event.part];
    if (!src || !dst) {
      const absent = [w.effect.part, w.event.part].find(c => !irs[c] && !broken.has(c));
      if (absent) fail('wiring names unknown part', `wiring names ${absent}, which is not a member`);
      continue;
    }
    if (!src.effects.some(e => e.name === w.effect.name)) fail('wiring names unknown effect or event', `wiring names effect ${w.effect.part}.${w.effect.name}, which ${w.effect.part} does not send`);
    if (!dst.events.some(e => e.name === w.event.name)) fail('wiring names unknown effect or event', `wiring names event ${w.event.part}.${w.event.name}, which ${w.event.part} does not receive`);
    const key = `${w.effect.part}.${w.effect.name}`;
    if ((wired[key] || []).some(x => x.part === w.event.part)) { fail('wiring does not compose', `wiring delivers ${key} to ${w.event.part} twice; a member takes one move in a step`); continue; }
    (wired[key] ||= []).push({ part: w.event.part, event: w.event.name });
  }
  const internal = new Set(Object.values(wired).flat().map(w => `${w.part}.${w.event}`));

  // A member's sends that no wiring reaches are free actions, printed and acknowledged under
  // free:; a part outside the wiring sends freely and is named for the readers.
  const declaredFree = new Set(wiring.free);
  const free: FreeSend[] = [];
  const outsideEvents = new Map<string, string[]>();
  for (const c of ids) for (const ev of irs[c].events) {
    const key = `${c}.${ev.name}`, s = sourceOfEvent[key];
    if (!s || s.kind !== 'part') continue;
    if (!ids.includes(s.id)) { (outsideEvents.get(s.id) || outsideEvents.set(s.id, []).get(s.id)!).push(key); continue; }
    if (!internal.has(key)) free.push({ event: key, from: s.id, declared: declaredFree.has(key) });
  }
  const outside: OutsideSender[] = [...outsideEvents].sort(([a], [b]) => (a < b ? -1 : 1)).map(([from, events]) => ({ from, events }));
  for (const x of wiring.free) {
    const [c, e] = x.split('.');
    const s = sourceOfEvent[x];
    if (broken.has(c) || (s && s.kind === 'part' && broken.has(s.id))) continue;
    if (!irs[c] || !irs[c].events.some(ev => ev.name === e)) fail('malformed wiring', `free: names ${x}, which no member receives`);
    else if (internal.has(x)) fail('malformed wiring', `free: names ${x}, which is wired`);
    else if (!s || s.kind !== 'part' || !ids.includes(s.id)) fail('malformed wiring', `free: names ${x}, which no member sends`);
  }

  // References inside composition conditions: member data or member states.
  const mapRef = (ref: string): string => {
    const m = ref.match(/^([a-z][\w-]*)\.(\w+)$/);
    if (!m) { fail('misnamed', `"${ref}" must read <part>.<data> or <part>.<State>`); return ref; }
    const [, c, n] = m;
    if (!irs[c]) { if (!broken.has(c)) fail('wiring names unknown part', `"${ref}" names ${c}, which is not a member`); return ref; }
    if (irs[c].context.some(d => d.name === n)) return `${pre(c)}_${n}`;
    if (irs[c].effects.some(e => sentOf(e.name) === n)) return `${pre(c)}_${n}`;
    if (irs[c].states.some(s => s.key === n)) return `(${statePred(irs[c], c, n)})`;
    fail('misnamed', `"${ref}": ${c} holds no data or state named ${n}`);
    return ref;
  };
  const sideTla = (side: Trigger | null) => (side!.state ? `(${mapRef(side!.state)})` : toTla(side!.cond!, mapRef));
  const prime = (text: string) => text.replace(/\b([a-z][\w]*_[\w]+|[a-z]\d*_ticks)\b/g, (m) => (vars.includes(m) ? `${m}'` : m));

  // Givens with actors, from the composition and from the members, collected before the actions
  // since "only when" restricts them. While the actor is honest: fairness, scoped to the event
  // when the Given has "on"; prompt holds the tick back; "only when" restricts the event's moves.
  interface EventGivens { ids: string[]; fairIds: string[]; prompt: boolean; whens: { id: string; tla: string }[] }
  interface ActorGivens { ids: string[]; fairAll: string[]; promptIds: string[]; events: Map<string, EventGivens> }
  const givenActors = new Map<string, ActorGivens>();
  const noteGiven = (g: GivenForm | IrGiven, from: string, event: string | null, whenTla: (ev: IrEvent) => string) => {
    if (!g.actor) return;
    // A part first: a Given that names one is a rely on it, even where an actor has the same id.
    if (partIds.has(actorId(g.actor))) { fail('Given names a part', `${from} ${g.id}: names "${g.actor}", which is a part; a rely on a part is a Guarantee or a wiring`); return; }
    const a = findActor(actors, g.actor);
    if (!a) { fail('sender is not declared', `${from} ${g.id}: actor "${g.actor}" is not declared in actors.md`); return; }
    let ev: IrEvent | undefined;
    if (event) {
      const [c, e] = event.split('.');
      if (broken.has(c)) return;
      ev = irs[c] ? irs[c].events.find(x => x.name === e) : undefined;
      if (!ev) { fail('misnamed', `${from} ${g.id} names event ${event}, which no member receives`); return; }
      const s = sourceOfEvent[event];
      if (!s || s.kind !== 'actor' || s.id !== a.id) { fail('misnamed', `${from} ${g.id} names event ${event}, which ${g.actor} does not send`); return; }
    }
    const id = `${from}.${g.id}`;
    const fair = !g.when || g.promptness === 'prompt';
    const cur: ActorGivens = givenActors.get(a.id) || { ids: [], fairAll: [], promptIds: [], events: new Map() };
    cur.ids.push(id);
    if (g.promptness === 'prompt') cur.promptIds.push(id);
    if (!event) { if (fair) cur.fairAll.push(id); }
    else {
      const e: EventGivens = cur.events.get(event) || { ids: [], fairIds: [], prompt: false, whens: [] };
      e.ids.push(id);
      if (fair) e.fairIds.push(id);
      if (g.promptness === 'prompt') e.prompt = true;
      if (g.when && ev) e.whens.push({ id, tla: whenTla(ev) });
      cur.events.set(event, e);
    }
    givenActors.set(a.id, cur);
  };
  for (const g of prose.givens) noteGiven(g, name, g.event, ev => toTla(g.when!, n => (ev.fields.some(f => f.name === n) ? n : mapRef(n))));
  for (const c of ids) for (const g of irs[c].givens) noteGiven(g, c, g.event ? `${c}.${g.event}` : null, () => toTla(g.when!, n => (irs[c].context.some(d => d.name === n) ? `${pre(c)}_${n}` : n)));
  // The "only when" conditions on an actor's event, as conjuncts that bind only while it is honest.
  const whensOn = (event: string) => {
    const a = actorOfEvent[event];
    const e = a ? givenActors.get(a)?.events.get(event) : undefined;
    return e ? e.whens.map(w => ({ id: w.id, conj: `(${modeRef(a)} /= "honest" \\/ ${w.tla})` })) : [];
  };

  // What a wired effect carries to its target's event: each field the effect declares, bound to
  // the source's field or datum of that name, and the source event's other fields by name.
  const carriedOf = (c: string, t: IrTransition, e: string, bound: Map<string, string>) => {
    const carried = new Map<string, string>();
    const effectDecl = irs[c].effects.find(x => x.name === e)!;
    for (const f of effectDecl.fields || []) carried.set(f, bound.has(f) ? bound.get(f)! : irs[c].context.some(d => d.name === f) ? `${pre(c)}_${f}` : f);
    for (const f of eventOf(c, t).fields) if (!carried.has(f.name)) carried.set(f.name, bound.has(f.name) ? bound.get(f.name)! : f.name);
    return carried;
  };
  // One member move, with the fields it needs bound from its source.
  const memberAction = (c: string, t: IrTransition, bound: Map<string, string>) => {
    const ir = irs[c];
    const ref = (n: string) => (bound.has(n) ? bound.get(n)! : ir.context.some(d => d.name === n) ? `${pre(c)}_${n}` : n);
    const conj = [statePred(ir, c, t.from)];
    if (t.guard) conj.push(toTla(t.guard, ref));
    conj.push(`${pre(c)}_state' = ${t.stays ? `${pre(c)}_state` : `"${entryLeaf(ir, t.target)}"`}`);
    const changed = new Set([`${pre(c)}_state`]);
    for (const a of t.assigns) { conj.push(`${pre(c)}_${a.name}' = ${toTla(a.expr!, ref)}`); changed.add(`${pre(c)}_${a.name}`); }
    for (const e of t.effects) { const v = `${pre(c)}_${sentOf(e)}`; conj.push(`${v}' = ${v} + 1`); changed.add(v); }
    return { conj, changed, free: eventOf(c, t).fields.filter(f => !bound.has(f.name)) };
  };
  // A move's enabledness, as its composite step needs it: its state and condition, and for each
  // wired effect, some move of the target enabled with what the effect carries.
  const enabled = (c: string, t: IrTransition, bound: Map<string, string>, seen: Set<string>): { free: IrField[]; parts: string[] } => {
    const ir = irs[c];
    const ref = (n: string) => (bound.has(n) ? bound.get(n)! : ir.context.some(d => d.name === n) ? `${pre(c)}_${n}` : n);
    const parts = [statePred(ir, c, t.from), ...(t.guard ? [toTla(t.guard, ref)] : [])];
    for (const e of t.effects) for (const target of wired[`${c}.${e}`] || []) {
      if (seen.has(target.part)) continue;
      const moves = irs[target.part].transitions.filter(x => x.event === target.event);
      const carried = carriedOf(c, t, e, bound);
      if (moves.length) parts.push(`(${moves.map(tm => { const sub = enabled(target.part, tm, carried, new Set([...seen, target.part])); return `(${quantified(sub.free, sub.parts)})`; }).join(' \\/ ')})`);
    }
    return { free: eventOf(c, t).fields.filter(f => !bound.has(f.name)), parts };
  };

  // A composite step: the source move and, for each wired effect, one move of the target. Each
  // target's moves are one disjunction, and each disjunct keeps unchanged what another may change.
  const compositeConj = (c: string, t: IrTransition, bound: Map<string, string>, seen: Set<string>): Step => {
    const me = memberAction(c, t, bound);
    const conj = [...me.conj];
    const changed = new Set(me.changed);
    for (const e of t.effects) {
      for (const target of wired[`${c}.${e}`] || []) {
        if (seen.has(target.part)) { fail('wiring does not compose', `wiring loops through ${target.part}`); continue; }
        const targetMoves = irs[target.part].transitions.filter(x => x.event === target.event);
        if (!targetMoves.length) { fail('wiring does not compose', `${target.part} has no Move for ${target.event}, wired from ${c}.${e}`); continue; }
        const carried = carriedOf(c, t, e, bound);
        const subs = targetMoves.map(tm => compositeConj(target.part, tm, carried, new Set([...seen, target.part])));
        const reach = new Set([...varsOf(target.part), ...subs.flatMap(sub => [...sub.changed])]);
        const disjuncts = subs.map(sub => {
          const unchanged = vars.filter(v => reach.has(v) && !sub.changed.has(v));
          const parts = [...sub.conj, ...(unchanged.length ? [`UNCHANGED <<${unchanged.join(', ')}>>`] : [])];
          return `${sub.quantify.length ? `\\E ${sub.quantify.map(f => `${f.name} \\in ${domainTla(f)}`).join(', ')} : ` : ''}(${parts.join(' /\\ ')})`;
        });
        conj.push(disjuncts.length === 1 ? disjuncts[0] : `(${disjuncts.join(' \\/ ')})`);
        for (const v of reach) changed.add(v);
      }
    }
    return { conj, changed, quantify: me.free };
  };

  // Each walk's steps, read against the members. The observer arms when the walk's first step
  // is taken from the walk's start, and watches each step taken: a step on the chain's tick is
  // taken in Tick, when its member takes a move of it; any other is its member's free-standing
  // action for the event, with the step's arguments. A refused step is checked where the walk
  // refuses it: no move of its event is enabled there with the step's arguments, before the
  // next step taken, or at the walk's end after the last.
  const actionOf = (c: string, t: IrTransition) => `${pre(c)}_${t.id}_${cap(t.event!)}`;
  const stepValue = (wid: string, step: string, f: IrField) => (n: string): string => {
    if (n.includes('.')) return mapRef(n);
    if (/^[A-Z]/.test(n) || (f.values || []).includes(n)) return `"${n}"`;
    fail('misnamed', `${wid}: "${n}" in the step ${step} is neither member data nor a value of ${f.name}`);
    return n;
  };
  const watchOf = new Map<string, WalkWatch>();
  // Each step a walk refuses, as a definition of its own, W<n>_Refused<k> for the walk's k-th step,
  // written after the enabledness: defined apart from the actions, its quantifier binds no field
  // an action binds. An event no move takes needs none.
  const refusedDefs: [string, string][] = [];
  for (const w of walks) {
    mapRef(w.from);
    const read: (CompositionStep & { args2: [string, string][]; at: number })[] = [];
    for (const [i, st] of w.steps.entries()) {
      const c = st.part, e = st.event, step = `${c}.${e}`;
      if (broken.has(c)) continue;
      if (!irs[c]) { fail('wiring names unknown part', `${w.id} steps on ${step}, but ${c} is not a member`); continue; }
      const ev = irs[c].events.find(x => x.name === e);
      if (!ev) { fail('misnamed', `${w.id} steps on ${step}, which ${c} does not receive`); continue; }
      if (internal.has(step)) { fail('wiring does not compose', `${w.id} steps on ${step}, which is reached through wiring`); continue; }
      const args: [string, string][] = [];
      for (const [k, v] of Object.entries(st.args)) {
        const f = ev.fields.find(x => x.name === k);
        if (!f) fail('misnamed', `${w.id}: ${step} carries no field "${k}"`);
        else args.push([k, toTla(v, stepValue(w.id, step, f))]);
      }
      read.push({ ...st, args2: args, at: i + 1 });
    }
    const plan = walkPlan(read);
    for (const st of read.filter(x => x.refused)) {
      const moves = irs[st.part].transitions.filter(t => t.event === st.event);
      if (!moves.length) continue;
      refusedDefs.push([`${w.id}_Refused${st.at}`, `~(${moves.map(t => {
        if (!st.args2.length) return `Can_${actionOf(st.part, t)}`;
        const { free, parts } = enabled(st.part, t, new Map(), new Set([st.part]));
        return `(${quantified(free, [...st.args2.map(([k, v]) => `${k} = ${v}`), ...parts, ...whensOn(`${st.part}.${t.event}`).map(x => x.conj)])})`;
      }).join(' \\/ ')})`]);
    }
    const refusedOf = (st: { at: number }) => refusedDefs.filter(([n]) => n === `${w.id}_Refused${st.at}`).map(([n]) => n);
    watchOf.set(w.id, {
      taken: plan.taken.map(({ step: st, refusedBefore }, k) => {
        const tick = tickOf(st.part, st.event);
        const took = tick ? [`(${irs[st.part].transitions.filter(t => t.event === st.event).map(t => `Can_${actionOf(st.part, t)}`).join(' \\/ ') || 'FALSE'})`] : [];
        return { c: st.part, e: st.event, tick, when: [...(k === 0 ? [mapRef(w.from)] : []), ...refusedBefore.flatMap(refusedOf), ...took, ...st.args2.map(([key, v]) => `${key} = ${v}`)] };
      }),
      refusedAfter: plan.refusedAfter.flatMap(refusedOf),
    });
  }
  // A walk's observer after a step: the next step it expects advances it, a step that matches its
  // first taken from its start re-arms it, and any other step resets it.
  const walkConj = (match: (o: Watched) => boolean) => walks.map(w => {
    const v = walkVar(w), { taken } = watchOf.get(w.id)!;
    const next = taken.map((s, k) => ({ s, k })).filter(({ s, k }) => k > 0 && match(s));
    const arms = taken.length > 0 && match(taken[0]);
    if (!next.length && !arms) return `${v}' = 0`;
    return `${v}' = ${next.map(({ s, k }) => `IF ${[`${v} = ${k}`, ...s.when].join(' /\\ ')} THEN ${k + 1} ELSE `).join('')}${arms ? `IF ${taken[0].when.join(' /\\ ')} THEN 1 ELSE 0` : '0'}`;
  });

  const L: string[] = [];
  const line = (s = '') => L.push(s);
  // Two names that read alike once a hyphen is an underscore would be one variable declared twice.
  for (const v of new Set(vars.filter((x, i) => vars.indexOf(x) !== i))) fail('wiring does not compose', `the module would declare ${v} twice; a hyphen in a part id reads as an underscore, so rename the part or the datum`);
  line(`${'-'.repeat(26)} MODULE ${concern} ${'-'.repeat(26)}`);
  line(`\\* Composed by dossier from ${ids.join(', ')}: their moves, wired where one's effect is another's event,`);
  line(`\\* with every actor's mode a constant. Properties are the composition's passages.`);
  line('EXTENDS Naturals');
  line('');
  line('CONSTANTS');
  constants.forEach((k, i) => { line(`  \\* @type: ${k.type};`); line(`  ${k.name}${i < constants.length - 1 ? ',' : ''}`); });
  // A ConstInit for each scenario a cell or a walk claims, and for all-honest.
  for (const sc of actors.scenarios) if (claimedIds.has(sc.id) || sc.id === 'all-honest') line(`${constInitOf(sc.id)} == ${constants.map(k => `${k.name} = ${k.value(sc)}`).join(' /\\ ')}`);
  line('');
  line('VARIABLES');
  vars.forEach((v, i) => { line(`  \\* @type: ${varType(v)};`); line(`  ${v}${i < vars.length - 1 ? ',' : ''}`); });
  line(`vars == <<${vars.join(', ')}>>`);
  if (windowed.length) {
    line('');
    line('\\* The mode of an actor with a window, honest outside it.');
    // A window never ends at tick 0, so Until_ 0 is a window with no end; TLC's configuration takes no negative constant.
    for (const a of windowed.map(ident)) line(`ModeNow_${a} == IF clock >= From_${a} /\\ (Until_${a} = 0 \\/ clock < Until_${a}) THEN Mode_${a} ELSE "honest"`);
  }
  line('');
  line('Init ==');
  const startName = new Map(starts.map(s => [s.v, s.name]));
  for (const c of ids) {
    const ir = irs[c];
    line(`  /\\ ${pre(c)}_state = ${startName.get(`${pre(c)}_state`) ?? `"${entryLeaf(ir, ir.initial)}"`}`);
    for (const d of ir.context) line(`  /\\ ${pre(c)}_${d.name} = ${startName.get(`${pre(c)}_${d.name}`) ?? str(d.initial)}`);
    for (const e of ir.effects) line(`  /\\ ${pre(c)}_${sentOf(e.name)} = 0`);
  }
  for (const v of [...ghosts, ...walkVars]) line(`  /\\ ${v} = 0`);
  if (windowed.length) line('  /\\ clock = 0');
  line('');

  // Ghost counters for Within passages, updated by every step.
  const ghostConj = (isTick: boolean) => withins.map(n => {
    const g = `${n.id.toLowerCase()}_ticks`;
    const goal = prime(sideTla(n.goal)), trig = prime(sideTla(n.trigger));
    return `${g}' = IF ${goal} THEN 0 ELSE IF ~(${trig}) THEN 0 ELSE ${isTick ? `(IF ${g} > ${n.k} THEN ${g} ELSE ${g} + 1)` : g}`;
  });

  // Enabledness first, for every member, so that Due_, the actions, the tick and the walks may
  // refer to any member's: the move's own and its wired targets', and the "only when" of its event.
  const sourced = (c: string) => irs[c].transitions.filter(t => sourceOfEvent[`${c}.${t.event}`]);
  for (const c of ids) for (const t of sourced(c)) {
    const { free, parts } = enabled(c, t, new Map(), new Set([c]));
    line(`Can_${actionOf(c, t)} == ${quantified(free, [...parts, ...whensOn(`${c}.${t.event}`).map(w => w.conj)])}`);
  }
  for (const [n, formula] of refusedDefs) line(`${n} == ${formula}`);
  line('');

  const byActor: Record<string, string[]> = Object.fromEntries(actorIds.map(a => [a, []]));
  const byPart: Record<string, string[]> = Object.fromEntries(partSenders.map(c => [c, []]));
  const tickParts: string[] = [];
  // The variables each member's tick determines: its own and those its tick moves reach by wiring.
  const tickReach = new Map<string, Set<string>>();
  // The free-standing actions of each event, for the fairness and the promptness scoped to it.
  const movesOf: Record<string, string[]> = {};
  for (const c of ids) {
    const tickMoves: IrTransition[] = [];
    for (const t of sourced(c)) {
      const source = sourceOfEvent[`${c}.${t.event}`];
      const an = actionOf(c, t);
      if (tickOf(c, t.event)) { tickMoves.push(t); continue; }
      if (internal.has(`${c}.${t.event}`)) { line(`\\* ${an} is reached through wiring only`); line(''); continue; }
      const whens = whensOn(`${c}.${t.event}`);
      const body = compositeConj(c, t, new Map(), new Set([c]));
      body.conj.splice(t.guard ? 2 : 1, 0, ...whens.map(w => `${w.conj}   \\* ${w.id}`));
      const unchanged = vars.filter(v => !body.changed.has(v) && !ghosts.includes(v) && !walkVars.includes(v));
      line(`${an} ==                                   \\* ${c} ${t.id}`);
      const pad = body.quantify.length ? '    ' : '  ';
      if (body.quantify.length) line(`  \\E ${body.quantify.map(f => `${f.name} \\in ${domainTla(f)}`).join(', ')} :`);
      for (const conj of body.conj) line(`${pad}/\\ ${conj}`);
      if (unchanged.length) line(`${pad}/\\ UNCHANGED <<${unchanged.join(', ')}>>`);
      for (const gconj of ghostConj(false)) line(`${pad}/\\ ${gconj}`);
      for (const wconj of walkConj(o => !o.tick && o.c === c && o.e === t.event)) line(`${pad}/\\ ${wconj}`);
      line('');
      (source.kind === 'actor' ? byActor : byPart)[source.id].push(an);
      (movesOf[`${c}.${t.event}`] ||= []).push(an);
    }
    if (tickMoves.length) {
      // The chain's tick reaches every member at once: a member takes one of its tick moves, with
      // what the move's effects reach by wiring and the "only when" of its event, and a member
      // whose tick is not enabled stands still.
      const branches = tickMoves.map(t => {
        const body = compositeConj(c, t, new Map(), new Set([c]));
        body.conj.splice(t.guard ? 2 : 1, 0, ...whensOn(`${c}.${t.event}`).map(w => w.conj));
        return body;
      });
      const reach = new Set([...varsOf(c), ...branches.flatMap(b => [...b.changed])]);
      tickReach.set(c, reach);
      const disj = branches.map(b => {
        const unchanged = vars.filter(v => reach.has(v) && !b.changed.has(v));
        const body = `(${[...b.conj, ...(unchanged.length ? [`UNCHANGED <<${unchanged.join(', ')}>>`] : [])].join(' /\\ ')})`;
        return b.quantify.length ? `(\\E ${b.quantify.map(f => `${f.name} \\in ${domainTla(f)}`).join(', ')} : ${body})` : body;
      });
      line(`${pre(c)}_Tick == \\/ ${disj.join('\n            \\/ ')}`);
      line(`            \\/ (~(${tickMoves.map(t => `Can_${actionOf(c, t)}`).join(' \\/ ')}) /\\ UNCHANGED <<${vars.filter(v => reach.has(v)).join(', ')}>>)`);
      line('');
      tickParts.push(`${pre(c)}_Tick`);
    }
  }
  // A member that two ticks reach, or a ticking member another's tick reaches by wiring, would take two moves in one step.
  const ticking = [...tickReach.keys()];
  for (const m of ids) {
    const via = ticking.filter(c => varsOf(m).some(v => tickReach.get(c)!.has(v)));
    if (via.length > 1) fail('wiring does not compose', `the chain's tick reaches ${m} through ${oneOf(via).replace(' or ', ' and ')}; a member takes one move in a step`);
  }
  const chainActor = actorIds.find(a => chainActors.has(a));
  if (tickParts.length) {
    const reached = new Set([...tickReach.values()].flatMap(r => [...r]));
    const still = ids.flatMap(varsOf).filter(v => !reached.has(v));
    // Each ghost, observer and clock update is parenthesized: an IF on one line would otherwise swallow the conjunct after it.
    line(`Tick == ${tickParts.join(' /\\ ')}${still.length ? ` /\\ UNCHANGED <<${still.join(', ')}>>` : ''}${ghostConj(true).map(g => ` /\\ (${g})`).join('')}${walkConj(o => o.tick).map(w => ` /\\ (${w})`).join('')}${windowed.length ? ` /\\ (clock' = IF clock < ${maxClock} THEN clock + 1 ELSE clock)` : ''}`);
  }

  line('');
  const acting = actorIds.filter(a => !chainActors.has(a) && byActor[a].length);
  for (const a of acting) {
    const id = ident(a);
    line(`${cap(id)} == (${modeRef(a)} /= "offline") /\\ (${byActor[a].join(' \\/ ')})`);
    line(`Honest${cap(id)} == (${modeRef(a)} = "honest") /\\ ${cap(id)}`);
    const g = givenActors.get(a);
    if (!g) continue;
    for (const [event, e] of g.events) {
      if (!e.fairIds.length) continue;
      const [c, ev] = event.split('.');
      line(`Honest${cap(id)}_${ident(c)}_${cap(ev)} == (${modeRef(a)} = "honest") /\\ (${(movesOf[event] || []).join(' \\/ ') || 'FALSE'})   \\* on ${event}`);
    }
    if (g.promptIds.length) {
      const cans = [...new Set([...g.events].filter(([, e]) => e.prompt).flatMap(([event]) => (movesOf[event] || []).map(n => `Can_${n}`)))];
      line(`Due_${id} == (${modeRef(a)} = "honest") /\\ (${cans.join(' \\/ ') || 'FALSE'})   \\* ${g.promptIds.join(' ')}: acts before the next tick`);
    }
  }
  // A part's sends have no mode: a member's free sends, or a part outside the wiring.
  const sending = partSenders.filter(c => byPart[c].length);
  for (const c of sending) line(`${cap(ident(c))} == ${byPart[c].join(' \\/ ')}   \\* ${ids.includes(c) ? 'sends left free' : 'outside the wiring'}`);
  const promptActors = acting.filter(a => givenActors.get(a) && givenActors.get(a)!.promptIds.length);
  if (tickParts.length) {
    line(`TickStep == ${chainActor ? `(${modeRef(chainActor)} /= "offline") /\\ ` : ''}Tick${promptActors.map(a => ` /\\ ~Due_${ident(a)}`).join('')}`);
  }
  const nextParts = [...(tickParts.length ? ['TickStep'] : []), ...acting.map(a => cap(ident(a))), ...sending.map(c => cap(ident(c)))];
  line(`Next == ${nextParts.join(' \\/ ')}`);
  line('');
  line('Spec == Init /\\ [][Next]_vars');
  for (const [a, g] of givenActors) {
    if (chainActors.has(a)) { if (tickParts.length) line(`        /\\ WF_vars((${modeRef(a)} = "honest") /\\ TickStep)        \\* from ${g.ids.join(' ')}`); continue; }
    if (!acting.includes(a)) continue;
    if (g.fairAll.length) line(`        /\\ WF_vars(Honest${cap(ident(a))})        \\* from ${g.fairAll.join(' ')}`);
    for (const [event, e] of g.events) {
      if (!e.fairIds.length) continue;
      const [c, ev] = event.split('.');
      line(`        /\\ WF_vars(Honest${cap(ident(a))}_${ident(c)}_${cap(ev)})        \\* from ${e.fairIds.join(' ')}`);
    }
  }
  line('');
  line('TypeOK ==');
  for (const c of ids) {
    const ir = irs[c];
    line(`  /\\ ${pre(c)}_state \\in {${ir.states.filter(s => !s.children).map(s => `"${s.key}"`).join(', ')}}`);
    for (const d of ir.context) line(`  /\\ ${pre(c)}_${d.name} \\in ${domainTla(d)}`);
    for (const e of ir.effects) line(`  /\\ ${pre(c)}_${sentOf(e.name)} \\in Nat`);
  }
  for (const g of ghosts) line(`  /\\ ${g} \\in Nat`);
  for (const w of walks) line(`  /\\ ${walkVar(w)} \\in 0..${watchOf.get(w.id)!.taken.length}`);
  if (windowed.length) line(`  /\\ clock \\in 0..${maxClock}`);
  line(`SentBounded == ${sentVars.length ? sentVars.map(v => `${v} <= MaxSent`).join(' /\\ ') : 'TRUE'}`);
  line('');
  for (const a of always) line(`${a.id} == ${toTla(a.cond!, mapRef)}`);
  for (const o of onces) line(`${o.id} == ${sideTla(o.trigger)} ~> ${sideTla(o.goal)}      \\* given ${o.givens.join(' ')}`);
  for (const n of withins) line(`${n.id} == ${n.id.toLowerCase()}_ticks <= ${n.k}      \\* given ${n.givens.join(' ')}`);
  for (const p of [...always, ...withins]) line(`Inv_${p.id} == TypeOK /\\ ${p.id}`);
  // A walk ends once its observer has seen every step taken, in the state it names, with the
  // refused steps after the last step taken refused there; the witness configuration checks the
  // negation, so TLC's counterexample is the walk. A walk that takes no step is read in one
  // state, its start. A step on a member that does not compile is left out, with the error.
  for (const w of walks) {
    const { taken, refusedAfter } = watchOf.get(w.id)!;
    line(`${w.id}_End == ${[`${walkVar(w)} = ${taken.length}`, ...(taken.length ? [] : [mapRef(w.from)]), ...refusedAfter, mapRef(w.ends)].join(' /\\ ')}`);
    line(`Not${w.id} == ~${w.id}_End`);
  }
  line(`${'='.repeat(70)}`);
  const tla = L.join('\n') + '\n';

  // One configuration per cell and one per walk, under its scenario, with the same constants.
  const cells: CellCfg[] = [];
  const cfgs: Record<string, string> = {};
  const cfgOf = (sc: Scenario, checks: string) => ['SPECIFICATION Spec', ...constants.map(k => `CONSTANT ${k.name} = ${k.value(sc)}`), 'CONSTRAINT SentBounded', 'CHECK_DEADLOCK FALSE', checks].join('\n') + '\n';
  for (const p of properties) {
    for (const sid of new Set(p.scenarios || defaults)) {
      const sc = actors.scenarioById[sid];
      if (!sc) { fail('property claims unknown scenario', `${p.id} claims scenario "${sid}", which scenarios.md does not declare`); continue; }
      const kind = /^O/.test(p.id) ? 'property' : 'invariant';
      const cfgName = `${p.id}_${ident(sid)}.cfg`;
      cfgs[cfgName] = cfgOf(sc, kind === 'property' ? `PROPERTIES ${p.id}` : `INVARIANTS TypeOK ${p.id}`);
      cells.push({ property: p.id, scenario: sid, cfg: cfgName, kind, cinit: constInitOf(sid) });
    }
  }
  const walkCfgs: WalkCfg[] = [];
  for (const w of walks) {
    const sid = walkScenario(w);
    const sc = actors.scenarioById[sid];
    if (!sc) { fail('property claims unknown scenario', `${w.id} names scenario "${sid}", which scenarios.md does not declare`); continue; }
    const cfgName = `${w.id}_${ident(sid)}.cfg`;
    cfgs[cfgName] = cfgOf(sc, `INVARIANTS TypeOK Not${w.id}`);
    walkCfgs.push({ id: w.id, scenario: sid, cfg: cfgName });
  }
  return { module: concern, tla, cfgs, cells, walks: walkCfgs, errors: problems.map(p => p.message), problems, actors: actorIds, parts: partSenders, free, outside, vars };
}
