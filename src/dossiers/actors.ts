// actors/actors.md and actors/scenarios.md: who sends events and how they
// behave under each scenario. all-honest always exists.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { recordsOf } from '../prose/yaml.ts';
import { senderId } from '../prose/prose.ts';

export type Mode = 'honest' | 'malicious' | 'offline';
// pins: records in the knowledge base that fix who the actor is, such as a signer set; their
// hashes enter every system snapshot, so a rotation lapses the cells that rest on the actor.
export interface Actor { id: string; name?: string; kind: string; modes: string[]; pins: string[]; notes: string | null }
// A mode for each actor that differs from honest; strongerThan lists the scenarios a proof here implies.
// windows: for an actor whose mode holds only from one tick until another, honest outside it.
// start: values a cell begins from, keyed <component>.<datum> or <component>.state.
export interface ScenarioWindow { from: number; until: number | null }
export interface Scenario { id: string; modes: Record<string, string>; windows: Record<string, ScenarioWindow>; start: Record<string, string | number | boolean>; strongerThan: string[]; notes: string | null }
export interface ActorsModel {
  actors: Actor[];
  scenarios: Scenario[];
  errors: string[];
  // Declared stronger_than relations the modes do not support: a proof under one would imply nothing.
  unsound: string[];
  byId: Record<string, Actor>;
  scenarioById: Record<string, Scenario>;
}
// The records as written, before they are normalized. A mode is the mode, or a window:
// { mode, from, until }, the mode holding while from <= clock < until.
interface RawActor { id?: string; name?: string; kind?: string; modes?: string[]; pins?: string[]; notes?: string | null }
type RawMode = string | { mode?: string; from?: unknown; until?: unknown };
interface RawScenario { id?: string; modes?: Record<string, RawMode>; start?: unknown; stronger_than?: string[]; notes?: string | null }

export const MODES: string[] = ['honest', 'malicious', 'offline'];
// An actor is a part of the surroundings that sends events and fails as a unit. A contract with
// a dossier is a component, never an actor; external is a contract or protocol with no dossier here.
export const ACTOR_KINDS: string[] = ['governance', 'multisig', 'keeper', 'user', 'public', 'chain', 'market', 'external'];

export const actorId = senderId;

const isMap = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
// A window bound as written: a whole number of ticks, the default when absent, undefined when it is neither.
const ticksOf = (v: unknown, absent: number | null): number | null | undefined =>
  (v === undefined || v === null ? absent : (typeof v === 'number' || typeof v === 'string') && /^\d+$/.test(String(v)) ? Number(v) : undefined);

export function readActors(root: string): ActorsModel {
  const errors: string[] = [];
  const actorsPath = join(root, 'actors', 'actors.md');
  const scenariosPath = join(root, 'actors', 'scenarios.md');
  let actors: Actor[] = [], written: RawScenario[] = [];
  if (existsSync(actorsPath)) {
    try {
      const listed = recordsOf(readFileSync(actorsPath, 'utf8')).actors;
      if (listed === undefined || Array.isArray(listed)) actors = (listed || []) as unknown as Actor[];
      else errors.push('actors.md: actors is not a list of actors');
    } catch (e) { errors.push(`actors.md: ${(e as Error).message}`); }
  }
  if (existsSync(scenariosPath)) {
    try {
      const listed = recordsOf(readFileSync(scenariosPath, 'utf8')).scenarios;
      if (listed === undefined || Array.isArray(listed)) written = (listed || []) as unknown as RawScenario[];
      else errors.push('scenarios.md: scenarios is not a list of scenarios');
    } catch (e) { errors.push(`scenarios.md: ${(e as Error).message}`); }
  }
  actors = actors.map((a: RawActor) => ({ id: String(a.id || ''), name: a.name || a.id, kind: a.kind || 'public', modes: Array.isArray(a.modes) && a.modes.length ? a.modes : ['honest', 'malicious', 'offline'], pins: Array.isArray(a.pins) ? a.pins.map(String) : [], notes: a.notes || null }));
  // An id declared more than once is reported, and its first declaration is the one read.
  const once = <T extends { id: string }>(list: T[], file: string): T[] => {
    const seen = new Set<string>(), told = new Set<string>();
    return list.filter(x => {
      if (!x.id || !seen.has(x.id)) { seen.add(x.id); return true; }
      if (!told.has(x.id)) { told.add(x.id); errors.push(`${file}: ${x.id} is declared more than once; the first is read`); }
      return false;
    });
  };
  for (const a of actors) {
    if (!a.id) errors.push('actors.md: an actor has no id');
    if (!ACTOR_KINDS.includes(a.kind)) errors.push(`actors.md: ${a.id} has kind "${a.kind}", not one of ${ACTOR_KINDS.join(', ')}`);
    for (const m of a.modes) if (!MODES.includes(m)) errors.push(`actors.md: ${a.id} lists mode "${m}", not one of ${MODES.join(', ')}`);
  }
  actors = once(actors, 'actors.md');
  const ids = new Set(actors.map(a => a.id));
  // The modes and the start are read below, beside their checks.
  const raw = new Map<Scenario, RawScenario>();
  const scenarios = once(written.map((s: RawScenario) => {
    const sc: Scenario = { id: String(s.id || ''), modes: {}, windows: {}, start: {}, strongerThan: Array.isArray(s.stronger_than) ? s.stronger_than : [], notes: s.notes || null };
    if (!sc.id) errors.push('scenarios.md: a scenario has no id');
    raw.set(sc, s);
    return sc;
  }), 'scenarios.md');
  if (!scenarios.some(s => s.id === 'all-honest')) scenarios.unshift({ id: 'all-honest', modes: {}, windows: {}, start: {}, strongerThan: [], notes: 'every actor honest' });
  for (const s of scenarios) {
    const r = raw.get(s) || {};
    // modes keeps each actor's mode as written, windows each window whose bounds read; the first problem with an entry is reported.
    const modes: [string, string][] = [], windows: [string, ScenarioWindow][] = [];
    for (const [actor, value] of Object.entries(r.modes && typeof r.modes === 'object' ? r.modes : {})) {
      const win = isMap(value) ? value : null;
      const mode = (win ? win.mode : value) as string;
      const hasMode = !win || (mode !== undefined && mode !== null && mode !== '');
      const from = win ? ticksOf(win.from, 0) : 0, until = win ? ticksOf(win.until, null) : null;
      if (hasMode) modes.push([actor, mode]);
      // Outside its window an actor is honest, so an honest window would change nothing.
      if (win && hasMode && mode !== 'honest' && from !== undefined && until !== undefined) windows.push([actor, { from: from!, until }]);
      if (!ids.has(actor)) errors.push(`scenarios.md: ${s.id} names actor "${actor}", which actors.md does not declare`);
      else if (!hasMode) errors.push(`scenarios.md: ${s.id} gives ${actor} a window with no mode`);
      else if (!MODES.includes(mode)) errors.push(`scenarios.md: ${s.id} gives ${actor} mode "${mode}", not one of ${MODES.join(', ')}`);
      else if (!actors.find(a => a.id === actor)!.modes.includes(mode)) errors.push(`scenarios.md: ${s.id} gives ${actor} mode "${mode}", which that actor does not allow`);
      else if (win && mode === 'honest') errors.push(`scenarios.md: ${s.id} gives ${actor} an honest window, which changes nothing: a window holds malicious or offline`);
      else if (from === undefined) errors.push(`scenarios.md: ${s.id} gives ${actor} a window with from "${win!.from}", not a whole number of ticks`);
      else if (until === undefined) errors.push(`scenarios.md: ${s.id} gives ${actor} a window with until "${win!.until}", not a whole number of ticks`);
      else if (until !== null && until <= from!) errors.push(`scenarios.md: ${s.id} gives ${actor} a window from ${from} until ${until}, which is empty`);
      // The clock counts the chain's ticks, so an offline chain's window never reaches its end.
      else if (until !== null && mode === 'offline' && actors.find(a => a.id === actor)!.kind === 'chain') errors.push(`scenarios.md: ${s.id} gives ${actor} an offline window until ${until}, which cannot end: the clock counts the chain's ticks`);
    }
    s.modes = Object.fromEntries(modes);
    s.windows = Object.fromEntries(windows);
    // The start as read: numbers and booleans as they are, anything else as text; the system checks it against its members.
    if (isMap(r.start)) s.start = Object.fromEntries(Object.entries(r.start).map(([k, v]) => [k, typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string' ? v : JSON.stringify(v)]));
    else if (r.start !== undefined && r.start !== null) errors.push(`scenarios.md: ${s.id} has start "${r.start}", not a map of <component>.<datum> to values`);
    for (const x of s.strongerThan) if (!scenarios.some(o => o.id === x)) errors.push(`scenarios.md: ${s.id} is stronger than "${x}", which is not a scenario`);
  }
  // The modes fix the order: malicious allows more behaviours than honest and than offline, which
  // are incomparable, so a scenario is stronger only where every actor's mode is the same or malicious.
  // A window holds its mode only for a while, so it agrees only with the same mode in the same window.
  // Runs from different starts are different runs, so two scenarios are ordered only when they start alike.
  const shown = (s: Scenario, a: string) => { const w = windowOf(s, a); return w ? `${modeOf(s, a)} from ${w.from}${w.until === null ? '' : ` until ${w.until}`}` : modeOf(s, a); };
  const sameStart = (s: Scenario, t: Scenario) => {
    const keys = Object.keys(s.start);
    return keys.length === Object.keys(t.start).length && keys.every(k => Object.hasOwn(t.start, k) && String(s.start[k]) === String(t.start[k]));
  };
  const unsound: string[] = [];
  for (const s of scenarios) for (const x of s.strongerThan) {
    const weaker = scenarios.find(o => o.id === x);
    if (!weaker) continue;
    for (const a of actors) {
      const ms = modeOf(s, a.id), mt = modeOf(weaker, a.id);
      const ws = windowOf(s, a.id), wt = windowOf(weaker, a.id);
      // Malicious for the whole run allows every behaviour of any mode in any window, so it sits above them all.
      const sameWindow = (ws ? ws.from : null) === (wt ? wt.from : null) && (ws ? ws.until : null) === (wt ? wt.until : null);
      const supported = (ms === mt && sameWindow) || (ms === 'malicious' && !ws);
      if (!supported) unsound.push(`scenarios.md: ${s.id} is declared stronger than ${x}, which its modes do not support: ${a.id} is ${shown(s, a.id)} in ${s.id} and ${shown(weaker, a.id)} in ${x}`);
    }
    if (!sameStart(s, weaker)) unsound.push(`scenarios.md: ${s.id} is declared stronger than ${x}, which its modes do not support: they start from different values`);
  }
  return { actors, scenarios, errors, unsound, byId: Object.fromEntries(actors.map(a => [a.id, a])), scenarioById: Object.fromEntries(scenarios.map(s => [s.id, s])) };
}

// The actor an event's sender names, by id or by name.
export function findActor(actorsModel: Pick<ActorsModel, 'actors' | 'byId'>, sender: string | null | undefined): Actor | null {
  if (!sender) return null;
  const id = actorId(sender);
  return actorsModel.byId[id] || actorsModel.actors.find(a => actorId(a.name) === id) || null;
}

export function modeOf(scenario: Pick<Scenario, 'modes'> | null | undefined, actorIdValue: string): string {
  return (scenario && scenario.modes && scenario.modes[actorIdValue]) || 'honest';
}

// The window an actor's mode holds in under a scenario, or null when it holds for the whole run.
export function windowOf(scenario: Pick<Scenario, 'windows'> | null | undefined, actorIdValue: string): ScenarioWindow | null {
  return scenario && scenario.windows && Object.hasOwn(scenario.windows, actorIdValue) ? scenario.windows[actorIdValue] : null;
}
