// The grammar: prose.md for a part or a composition, read into passages with
// ids and hashes, declarations, and the forms each kind must follow.
import { normalize, short } from '../hash.ts';
import { parseCondition, parseClauses, parseValue, splitTop, NUMBER_WORDS } from './expr.ts';
import type { Assignment, Effect, Expr, Value } from './expr.ts';

// The key a sender's name resolves by: lower case, "the" dropped, anything else to hyphens.
// "the Adapter" and "adapter" are the same sender, the part adapter or the actor adapter.
export const senderId = (name: unknown): string => String(name ?? '').toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export type PassageKind = 'S' | 'E' | 'M' | 'R' | 'A' | 'O' | 'N' | 'G' | 'W' | 'X' | 'K' | 'T';
// One numbered paragraph. Its hash covers the text after the id, whitespace collapsed.
export interface Passage { id: string; kind: PassageKind; n: number; section: string | null; text: string; hash: string; retired: boolean; line: number }

// A type phrase: "a count from 0 to 2", "a flag", "an amount of HRD up to 3", "one of A, B or C".
export type DataType =
  | { type: 'count'; min: number; max: number; initial?: number }
  | { type: 'flag'; initial?: boolean }
  | { type: 'amount'; unit: string; min: number; max: number; initial?: number }
  | { type: 'enum'; values: string[]; initial?: string };
// A boundary datum: its name, its type and where it starts.
export type Datum = { name: string; initial: Value } & (
  | { type: 'count'; min: number; max: number }
  | { type: 'flag' }
  | { type: 'amount'; unit: string; min: number; max: number }
  | { type: 'enum'; values: string[] });
// A field an event carries.
export type Field = { name: string } & DataType;
// "It sends <effect> to <Receiver>[, carrying <fields>]."
export interface BoundaryEffect { name: string; to: string; fields: string[] }
export interface Boundary { text: string; data: Datum[]; effects: BoundaryEffect[] }

// What the passages before the first section say, and the passages themselves.
export interface SplitProse {
  title: string | null;
  header: Record<string, string>;
  lead: string[];
  passages: Passage[];
  byId: Record<string, Passage>;
  sections: string[];
  errors: string[];
}

export type Children = { kind: 'compound'; names: string[]; initial: string } | { kind: 'parallel'; names: string[] };
export interface StateForm { id: string; name: string | null; path: string[]; parent?: string | null; text: string; final: boolean; initial: boolean; children: Children | null }
// refusalOnly: the Event ends with the sentence "Refusal only.", an input that must never succeed.
export interface EventForm { id: string; name: string | null; sender: string | null; text?: string; fields: Field[]; refusalOnly?: true }
export interface MoveForm { id: string; state: string | null; event: string | null; guard: Expr | null; assigns: Assignment[]; effects: Effect[]; to: string | null; stays: boolean }
export interface RefusalForm { id: string; states: string[]; events: string[] | 'every'; effects: Effect[]; cond: Expr | null }
// An Always may cite the step Givens it rests on; the chart then skips it and the solvers check it.
export interface AlwaysForm { id: string; while: string | null; cond: Expr | null; givens: string[]; structural?: boolean; text?: string }
// A Once or Within names a state, or a condition, on each side.
export interface Trigger { state?: string; cond?: Expr | null }
export interface OnceForm { id: string; trigger: Trigger | null; goal: Trigger | null; givens: string[] }
export interface WithinForm { id: string; k: number | null | undefined; trigger: Trigger | null; goal: Trigger | null; givens: string[] }
// A Given: its actor, the event it is about (bare in a part, <part>.<event> in a
// composition), whether it is prompt ('prompt', else 'eventual'), and the step condition of an
// "only when" clause.
export interface GivenForm { id: string; text?: string; assumption?: string; otherwise?: string; actor: string | null; event: string | null; promptness: string; when: Expr | null }
export interface Step { event: string; args: Record<string, Expr>; refused: boolean; malformed?: boolean }
export interface WalkForm {
  id: string;
  name: string | null;
  scenario?: string | null;
  from: string | null;
  with: Record<string, Expr>;
  steps: Step[];
  ends: string | null;
  endData: Record<string, Expr>;
  sent: Record<string, number | undefined>;
  notSent: string[];
}
export interface SeamForm { id: string; piece: string | null; body: string | null }
export type Backing =
  | { kind: 'certora'; path: string; rule: string; commit: string }
  | { kind: 'file'; path: string; rule: string }
  | { kind: 'external'; runner: string }
  | { kind: 'record'; ref: string }
  | { kind: 'none' };
export interface GuaranteeForm { id: string; claim: string; backing: Backing | null }
export interface WordsForm { id: string; text: string }
// One state by event pair: the moves and refusals that say it.
export interface TableCell { state: string; event: string; moves: string[]; refusals: string[]; unconditional: string[] }

export interface PartProse extends SplitProse {
  tier: string;
  module: string | null;
  pins: string[];
  boundary: Boundary;
  states: StateForm[];
  events: EventForm[];
  moves: MoveForm[];
  refusals: RefusalForm[];
  always: AlwaysForm[];
  onces: OnceForm[];
  withins: WithinForm[];
  givens: GivenForm[];
  walks: WalkForm[];
  seams: SeamForm[];
  guarantees: GuaranteeForm[];
  wordsOnly: WordsForm[];
  statesNothingEventual: boolean;
  misnamed: string[];
  table: TableCell[];
  unsaid: string[];
  saidTwice: string[];
}

// A composition's properties carry the scenarios they claim, or null for the wiring's defaults.
export interface CompositionAlwaysForm { id: string; cond: Expr | null; givens: string[]; scenarios: string[] | null }
export interface CompositionOnceForm extends OnceForm { scenarios: string[] | null }
export interface CompositionWithinForm extends WithinForm { scenarios: string[] | null }
export type CompositionProperty = CompositionAlwaysForm | CompositionOnceForm | CompositionWithinForm;
export interface CompositionStep { part: string; event: string; args: Record<string, Expr>; refused: boolean }
export interface CompositionWalkForm { id: string; name: string | null; scenario?: string | null; from?: string; steps: CompositionStep[]; ends?: string; rest?: string }
export interface CompositionProse extends SplitProse {
  concern: string | null;
  description: string;
  always: CompositionAlwaysForm[];
  onces: CompositionOnceForm[];
  withins: CompositionWithinForm[];
  givens: GivenForm[];
  walks: CompositionWalkForm[];
  wordsOnly: WordsForm[];
  properties: CompositionProperty[];
  misnamed: string[];
}

interface Current { id: string; kind: PassageKind; n: number; lines: string[]; line: number }

export const KINDS: Record<string, string> = { S: 'State', E: 'Event', M: 'Move', R: 'Refusal', A: 'Always', O: 'Once', N: 'Within', G: 'Given', W: 'Walk', X: 'Seam', K: 'Guarantee', T: 'Words only' };
export const COMPOSITION_KINDS = new Set(['A', 'O', 'N', 'G', 'W', 'T']);
const SECTION_KINDS: Record<string, string> = { States: 'S', Events: 'E', Moves: 'MR', Always: 'A', Once: 'O', Within: 'N', Given: 'G', Walks: 'W', Seams: 'X', Guarantees: 'K', 'Words only': 'T', Retired: '*' };
const ID = /^\[([SEMRAONGWXKT])(\d+)\]\s*(.*)$/;
const NAME = '[A-Z][\\w-]*';
const PATH = '[A-Z][\\w-]*(?:\\.[A-Z][\\w-]*)*';
const EVENT = '[a-z][\\w-]*';
// A data or field name: lower case letters, digits and underscores.
const DATA = '[a-z_][a-z0-9_]*';
const isDataName = (name: string) => new RegExp(`^${DATA}$`).test(name);

// Digits read as a whole number the chart can count past, and a word only as the table's own entry, never an inherited one.
const number = (text: string): number | undefined => /^\d+$/.test(text) ? (Number.isSafeInteger(Number(text) + 1) ? Number(text) : undefined) : Object.hasOwn(NUMBER_WORDS, text) ? NUMBER_WORDS[text] : undefined;

// The chart tries every value of a declared range and every combination of an event's field
// values, so a count or an amount spans at most RANGE_SPAN (from 0 to 1000 at the widest) and
// an event's fields take at most EVENT_CASES combinations together.
export const RANGE_SPAN = 1000;
export const EVENT_CASES = 10000;
// How many values a range holds, counted without listing them; a bound that did not read leaves it empty.
export const valuesIn = (d: { type: string; min?: number; max?: number; values?: string[] }): number => {
  if (d.type === 'flag') return 2;
  if (d.type === 'enum') return (d.values || []).length;
  const span = (d.max as number) - (d.min as number);
  return Number.isFinite(span) && span >= 0 ? span + 1 : 0;
};
// Why a declared range is too wide for the chart, or null.
function tooWide(name: string, type: DataType): string | null {
  if (type.type !== 'count' && type.type !== 'amount') return null;
  return valuesIn(type) > RANGE_SPAN + 1 ? `"${name}" is declared from ${type.min} to ${type.max}; a declared range spans at most ${RANGE_SPAN}, as from 0 to ${RANGE_SPAN}, so that the chart can try every value` : null;
}

// "a count from 0 to 2", "a flag", "an amount of HRD up to 3", "one of A, B or C",
// each optionally followed by ", starting at <value>" / ", starting set". A phrase of one of
// these shapes with a bound or a starting value the type cannot hold is a problem. It is
// returned, never thrown, and the caller reports it on the passage that holds the phrase.
// Anything else is null.
export function parseTypePhrase(text: string): DataType | { problem: string } | null {
  let t = text.trim().replace(/\.$/, '');
  let initial: string | null = null;
  const start = t.match(/^(.*?),\s*starting (?:at )?(\S+)$/);
  if (start) { t = start[1]; initial = start[2]; }
  let m: RegExpMatchArray | null;
  const withInitial = (type: DataType): DataType | { problem: string } => {
    if (initial === null) return type;
    if (type.type === 'flag') return initial === 'set' || initial === 'clear' ? { ...type, initial: initial === 'set' } : { problem: `starting value "${initial}" is not set or clear` };
    if (type.type === 'enum') return type.values.includes(initial) ? { ...type, initial } : { problem: `starting value "${initial}" is not one of ${type.values.join(', ')}` };
    const n = number(initial);
    if (n === undefined) return { problem: `starting value "${initial}" is not a whole number` };
    if (n < type.min || n > type.max) return { problem: `starting value ${n} is outside the range from ${type.min} to ${type.max}` };
    return { ...type, initial: n };
  };
  // A bound is digits or a number word, and a range runs from its smaller bound up.
  const range = (low: string, high: string): { min: number; max: number } | { problem: string } => {
    const min = number(low), max = number(high);
    if (min === undefined || max === undefined) return { problem: `bound "${min === undefined ? low : high}" is not a whole number` };
    return min > max ? { problem: `the range from ${min} to ${max} holds no value` } : { min, max };
  };
  if ((m = t.match(/^a count from (\S+) to (\S+)$/))) { const r = range(m[1], m[2]); return 'problem' in r ? r : withInitial({ type: 'count', ...r }); }
  if (/^a flag$/.test(t)) return withInitial({ type: 'flag' });
  if ((m = t.match(/^an amount of (\S+) up to (\S+)$/))) { const r = range('0', m[2]); return 'problem' in r ? r : withInitial({ type: 'amount', unit: m[1], ...r }); }
  if ((m = t.match(/^one of (.+)$/))) return withInitial({ type: 'enum', values: m[1].split(/,\s*|\s+or\s+/).map(s => s.trim()).filter(Boolean) });
  return null;
}

function defaultInitial(type: DataType): Value {
  if (type.initial !== undefined && type.initial !== null) return type.initial;
  if (type.type === 'flag') return false;
  if (type.type === 'enum') return type.values[0];
  return type.min;
}

// Boundary declarations: "It holds <name>, <type phrase>." and "It sends <effect> to <Receiver>".
export function parseBoundary(text: string): { data: Datum[]; effects: BoundaryEffect[]; errors: string[] } {
  const data: Datum[] = [], effects: BoundaryEffect[] = [], errors: string[] = [];
  const sentences = text.split(/(?<=\.)\s+/);
  for (const s of sentences) {
    let m: RegExpMatchArray | null;
    if ((m = s.match(/^It holds (\w+), (.+)\.$/))) {
      const type = parseTypePhrase(m[2]);
      if (!type) { errors.push(`"${m[1]}" has no readable type: "${m[2]}"`); continue; }
      if ('problem' in type) { errors.push(`"${m[1]}" has no readable type: ${type.problem}`); continue; }
      if (!isDataName(m[1])) { errors.push(`data name "${m[1]}" must be lower case letters, digits and underscores`); continue; }
      const wide = tooWide(m[1], type);
      if (wide) errors.push(wide);
      data.push({ name: m[1], ...type, initial: defaultInitial(type) });
    } else if ((m = s.match(/^It sends (.+)\.$/))) {
      const carrying = m[1].match(/^(.+?), carrying (.+)$/);
      const list = carrying ? [carrying[1]] : m[1].split(/,\s*and\s+|,\s*|\s+and\s+/);
      const fields = carrying ? carrying[2].split(/,\s*and\s+|,\s*|\s+and\s+/).map(f => f.trim()).filter(Boolean) : [];
      for (const part of list) {
        const e = part.trim().match(/^([a-z][\w-]*) to (.+)$/);
        if (!e) { errors.push(`effect declaration not readable: "${part.trim()}"`); continue; }
        effects.push({ name: e[1], to: e[2].trim(), fields });
      }
    }
  }
  return { data, effects, errors };
}

function splitPassages(text: string, { composition = false } = {}): SplitProse {
  const lines = text.split(/\r?\n/);
  const out: SplitProse = { title: null, header: {}, lead: [], passages: [], byId: {}, sections: [], errors: [] };
  let section: string | null = null, current: Current | null = null, beforeFirst = true;
  const finish = () => {
    if (!current) return;
    const body = normalize(current.lines.join(' '));
    const p: Passage = { id: current.id, kind: current.kind, n: current.n, section, text: body, hash: short(body), retired: section === 'Retired', line: current.line };
    if (out.byId[p.id]) out.errors.push(`${p.id} appears twice`);
    out.passages.push(p);
    out.byId[p.id] = p;
    current = null;
  };
  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (out.title === null && /^#\s+/.test(line)) { out.title = line.replace(/^#\s+/, '').trim(); return; }
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      finish();
      section = heading[1].replace(/\s+[A-Z](,\s*(?:and\s+)?[A-Z])*$/, '').trim();
      out.sections.push(section);
      if (!(section in SECTION_KINDS)) out.errors.push(`unknown section "## ${section}"`);
      beforeFirst = false;
      return;
    }
    if (beforeFirst) {
      const kv = line.match(/^(Tier|Module|Pins|Concern|Scenarios):\s*(.*)$/);
      if (kv) { out.header[kv[1].toLowerCase()] = kv[2].trim(); return; }
      if (line.trim()) out.lead.push(line.trim());
      return;
    }
    const start = line.match(ID);
    if (start) {
      finish();
      const kind = start[1] as PassageKind;
      const expected = SECTION_KINDS[section!];
      if (expected && expected !== '*' && !expected.includes(kind)) out.errors.push(`${kind}${start[2]} sits under "## ${section}", which holds ${expected.split('').map(k => KINDS[k]).join(' and ')} passages`);
      if (composition && !COMPOSITION_KINDS.has(kind)) out.errors.push(`${kind}${start[2]}: a composition holds only A, O, N, G, W and T passages`);
      current = { id: `${kind}${start[2]}`, kind, n: Number(start[2]), lines: [start[3]], line: i + 1 };
      return;
    }
    if (line.trim() === '') { finish(); return; }
    if (current) current.lines.push(line.trim());
    else if (line.trim() && !/^<!--/.test(line)) out.errors.push(`line ${i + 1} is outside any passage`);
  });
  finish();
  return out;
}

const stepRe = new RegExp(`^(${EVENT})((?:\\s+${DATA}\\s+\\S+)*)(\\s+refused)?$`);
const compositionStepRe = new RegExp(`^([a-z][\\w-]*)\\.(${EVENT})((?:\\s+${DATA}\\s+\\S+)*)(\\s+refused)?$`);
function parseArgs(text: string): Record<string, Expr> {
  const args: Record<string, Expr> = {};
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  for (let i = 0; i + 1 < tokens.length; i += 2) args[tokens[i]] = parseValue(tokens[i + 1]);
  return args;
}
function parseWith(text: string | undefined): Record<string, Expr> {
  const out: Record<string, Expr> = {};
  if (!text) return out;
  for (const part of splitTop(text.trim(), [', ', ' and '])) {
    const m = part.match(new RegExp(`^(${DATA}) (\\S+)$`));
    if (!m) throw new Error(`"${part}" is not "<name> <value>"`);
    out[m[1]] = parseValue(m[2]);
  }
  return out;
}

const givensOf = (text: string) => text.split(/\s+and\s+/).map(s => s.trim());

const GIVEN = /^Given that (.+?)\. If this is false, (.+?)\.(?:\s*Actor: ([^.,]+?)(?:, on ([a-z][\w-]*(?:\.[a-z][\w-]*)?))?(?:, (prompt))?(?:, only when (.+?))?\.)?$/;
const GIVEN_FORM = 'Given that <text>. If this is false, <text>.[ Actor: <Actor>[, on <event>][, prompt][, only when <condition>].]';
// A Given as a part or a composition reads it. Prompt and only when are about one event, so
// each needs "on". A tag the form does not read would otherwise be taken into the text before
// it, so an "Actor:" left there is a Given that does not follow the form.
function readGiven(x: Passage, err: (id: string, msg: string) => void): GivenForm {
  const m = x.text.match(GIVEN);
  if (!m || /\bActor:/.test(m[1]) || /\bActor:/.test(m[2])) { err(x.id, `does not follow the Given form "${GIVEN_FORM}"`); return { id: x.id, text: x.text, actor: null, event: null, promptness: 'eventual', when: null }; }
  let when: Expr | null = null;
  if (m[6]) { try { when = parseCondition(m[6]); } catch (e) { err(x.id, (e as Error).message); } }
  const g: GivenForm = { id: x.id, assumption: m[1], otherwise: m[2], actor: m[3] ? m[3].trim() : null, event: m[4] || null, promptness: m[5] || 'eventual', when };
  if (g.promptness === 'prompt' && !g.event) err(x.id, 'prompt names the event it is prompt on: "Actor: <Actor>, on <event>, prompt."');
  if (m[6] && !g.event) err(x.id, 'only when names the event it restricts: "Actor: <Actor>, on <event>, only when <condition>."');
  return g;
}
// A Given that constrains steps rather than runs: prompt, or only when. Only these may back an Always.
export const constrainsSteps = (g: Pick<GivenForm, 'promptness' | 'when'>): boolean => g.promptness === 'prompt' || Boolean(g.when);

function readPart(p: null, prose: PartProse): PartProse {
  const err = (id: string, msg: string) => prose.errors.push(`${id}: ${msg}`);
  const active = prose.passages.filter(x => !x.retired);
  const of = (kind: PassageKind) => active.filter(x => x.kind === kind);
  const attempt = <T,>(id: string, fn: () => T, fallback: T): T => { try { return fn(); } catch (e) { err(id, (e as Error).message); return fallback; } };

  prose.states = of('S').map((x, i): StateForm => {
    const m = x.text.match(new RegExp(`^(${PATH}): (.*)$`));
    if (!m) { err(x.id, 'does not follow the State form "Name: what is true while the piece is in it."'); return { id: x.id, name: null, path: [], text: '', final: false, initial: i === 0, children: null }; }
    const path = m[1].split('.');
    let text = m[2];
    const final = /\bFinal\.?(\s|$)/.test(text);
    let children: Children | null = null;
    const compound = text.match(new RegExp(`Within it, it is either (.+?); it starts (${NAME})\\.?$`));
    const parallel = text.match(/Within it, it is both (.+?)\.?$/);
    if (compound) { children = { kind: 'compound', names: compound[1].split(/,\s*|\s+or\s+/).map(s => s.trim()), initial: compound[2] }; text = text.slice(0, compound.index).trim(); }
    else if (parallel) { children = { kind: 'parallel', names: parallel[1].split(/,\s*|\s+and\s+/).map(s => s.trim()) }; text = text.slice(0, parallel.index).trim(); }
    return { id: x.id, name: path[path.length - 1], path, parent: path.length > 1 ? path.slice(0, -1).join('.') : null, text, final, initial: i === 0 && path.length === 1, children };
  });
  prose.events = of('E').map((x): EventForm => {
    const m = x.text.match(new RegExp(`^(${EVENT}), from (.+?): (.*)$`));
    if (!m) { err(x.id, 'does not follow the Event form "name, from <Actor>: what it carries and what it means."'); return { id: x.id, name: null, sender: null, fields: [] }; }
    const fields: Field[] = [];
    // "Refusal only." closes the passage, after any Carries clause.
    const refusalOnly = /(?:^| )Refusal only\.$/.test(m[3]);
    const description = m[3].replace(/(?:^| )Refusal only\.$/, '');
    const carries = description.match(/Carries (.+?)\.?$/);
    if (carries) {
      for (const part of splitTop(carries[1], [', and ', '; '])) {
        const f = part.match(/^(\w+), (.+)$/);
        const type = f && parseTypePhrase(f[2]);
        if (!type) { err(x.id, `carries clause not readable: "${part}"`); continue; }
        if ('problem' in type) { err(x.id, `field "${f![1]}" has no readable type: ${type.problem}`); continue; }
        if (!isDataName(f![1])) { err(x.id, `field name "${f![1]}" must be lower case letters, digits and underscores`); continue; }
        const wide = tooWide(f![1], type);
        if (wide) err(x.id, wide);
        fields.push({ name: f![1], ...type });
      }
    }
    // Each field within its span may still multiply past what the chart tries.
    const cases = fields.reduce((n, f) => n * valuesIn(f), 1);
    if (cases > EVENT_CASES && fields.every(f => !tooWide(f.name, f))) err(x.id, `the fields of ${m[1]} take ${cases} combinations of values together; the chart tries at most ${EVENT_CASES} for an event`);
    return { id: x.id, name: m[1], sender: m[2].trim(), text: description, fields, ...(refusalOnly ? { refusalOnly: true as const } : {}) };
  });
  prose.moves = of('M').map((x): MoveForm => {
    const m = x.text.match(new RegExp(`^When (${PATH}) receives (${EVENT})(?: and (.+?))?, it (becomes|stays) (${PATH})\\b(.*)$`));
    if (!m) { err(x.id, 'does not follow the Move form "When <State> receives <event>[ and <condition>], it becomes|stays <State>[, <changes and effects>]."'); return { id: x.id, state: null, event: null, guard: null, assigns: [], effects: [], to: null, stays: false }; }
    const guard = m[3] ? attempt<Expr | null>(x.id, () => parseCondition(m[3]), null) : null;
    const clauses = attempt(x.id, () => parseClauses(m[6]), { assigns: [], effects: [] });
    return { id: x.id, state: m[1], event: m[2], guard, stays: m[4] === 'stays', to: m[5], assigns: clauses.assigns, effects: clauses.effects };
  });
  prose.refusals = of('R').map((x): RefusalForm => {
    const m = x.text.match(/^In (.+?) (?:is|are) refused\b(.*?)(?: when (.+?))?\.?$/);
    if (!m) { err(x.id, 'does not follow the Refusal form "In <State>, <event> is refused[ when <condition>]."'); return { id: x.id, states: [], events: [], effects: [], cond: null }; }
    const cond = m[3] ? attempt<Expr | null>(x.id, () => parseCondition(m[3]), null) : null;
    const tokens = m[1].split(/,\s*|\s+and\s+/).map(s => s.trim()).filter(Boolean);
    const states = tokens.filter(t => /^[A-Z]/.test(t));
    const rest = tokens.filter(t => !/^[A-Z]/.test(t));
    const events = rest.some(t => /^every event$/i.test(t)) ? 'every' : rest;
    if (states.length === 0 || (events !== 'every' && events.length === 0)) err(x.id, 'names no state or no event before "is refused"');
    const clauses = attempt(x.id, () => parseClauses(m[2]), { assigns: [], effects: [] });
    if (clauses.assigns.length) err(x.id, 'a refusal changes no data');
    return { id: x.id, states, events, effects: clauses.effects, cond };
  });
  prose.always = of('A').map((x): AlwaysForm => {
    const st = x.text.match(/^Always, in structure, (.+?)\.?$/);
    if (st) return { id: x.id, while: null, cond: null, givens: [], structural: true, text: st[1] };
    const m = x.text.match(new RegExp(`^Always(?:, while (${PATH}))?, (.+?)(?:, given (G\\d+(?: and G\\d+)*))?\\.?$`));
    if (!m) { err(x.id, 'does not follow the Always form "Always[, while <State>], <condition>[, given G<n>]."'); return { id: x.id, while: null, cond: null, givens: [] }; }
    return { id: x.id, while: m[1] || null, cond: attempt<Expr | null>(x.id, () => parseCondition(m[2]), null), givens: m[3] ? givensOf(m[3]) : [] };
  });
  const triggerOf = (id: string, text: string): Trigger => (new RegExp(`^${PATH}$`).test(text.trim()) ? { state: text.trim() } : { cond: attempt<Expr | null>(id, () => parseCondition(text), null) });
  prose.onces = of('O').map((x): OnceForm => {
    const m = x.text.match(/^Once (.+?), eventually (.+?), given (G\d+(?: and G\d+)*)\.?$/);
    if (!m) { err(x.id, 'does not follow the Once form "Once <trigger>, eventually <goal>, given G<n>."'); return { id: x.id, trigger: null, goal: null, givens: [] }; }
    return { id: x.id, trigger: triggerOf(x.id, m[1]), goal: triggerOf(x.id, m[2]), givens: givensOf(m[3]) };
  });
  prose.withins = of('N').map((x): WithinForm => {
    const m = x.text.match(/^Within (\S+) ticks? of (.+?), (.+?), given (G\d+(?: and G\d+)*)\.?$/);
    if (!m) { err(x.id, 'does not follow the Within form "Within <k> ticks of <trigger>, <goal>, given G<n>."'); return { id: x.id, k: null, trigger: null, goal: null, givens: [] }; }
    const k = number(m[1]);
    if (k === undefined) err(x.id, `"${m[1]}" is not a number of ticks`);
    return { id: x.id, k, trigger: triggerOf(x.id, m[2]), goal: triggerOf(x.id, m[3]), givens: givensOf(m[4]) };
  });
  prose.givens = of('G').map(x => readGiven(x, err));
  prose.walks = of('W').map((x): WalkForm => {
    const m = x.text.match(new RegExp(`^Walk ([\\w-]+)(?: under ([\\w-]+))?: from (${PATH})(?: with (.+?))?, (.+?); ends (${PATH})\\b(.*)$`));
    if (!m) { err(x.id, 'does not follow the Walk form "Walk <Name>: from <State>, <event>, ...; ends <State>."'); return { id: x.id, name: null, steps: [], from: null, ends: null, with: {}, endData: {}, sent: {}, notSent: [] }; }
    // A scenario is a composition's: a part's walk runs in the part's own model, which has no modes.
    if (m[2]) err(x.id, `a part walk names no scenario: "under ${m[2]}" belongs in a composition's walk`);
    const steps: Step[] = [];
    for (const s of splitTop(m[5], [', '])) {
      const r = s.match(stepRe);
      if (!r) { err(x.id, `step "${s}" is not "<event>[ <field> <value>...][ refused]"`); steps.push({ event: s, args: {}, refused: false, malformed: true }); continue; }
      steps.push({ event: r[1], args: attempt(x.id, () => parseArgs(r[2]), {}), refused: Boolean(r[3]) });
    }
    const endData: Record<string, Expr> = {}, sent: Record<string, number | undefined> = {}, notSent: string[] = [];
    for (const clause of m[7].replace(/\.$/, '').split(/;\s*/).map(c => c.trim()).filter(Boolean)) {
      let c: RegExpMatchArray | null;
      if ((c = clause.match(/^with (.+)$/))) Object.assign(endData, attempt(x.id, () => parseWith(c![1]), {}));
      else if ((c = clause.match(/^([a-z][\w-]*) sent (\S+) times?$/))) {
        const n = number(c[2]);
        if (n === undefined) err(x.id, `end clause "${clause}": "${c[2]}" is not a whole number`);
        else sent[c[1]] = n;
      }
      else if ((c = clause.match(/^([a-z][\w-]*) sent once$/))) sent[c[1]] = 1;
      else if ((c = clause.match(/^([a-z][\w-]*) not sent$/))) notSent.push(c[1]);
      else if ((c = clause.match(/^sends (.+)$/))) for (const e of c[1].split(/,\s*|\s+and\s+/)) sent[e.trim()] = (sent[e.trim()] || 0) + 1;
      else err(x.id, `end clause "${clause}" is not "with ...", "<effect> sent n times", "<effect> not sent" or "sends ..."`);
    }
    return { id: x.id, name: m[1], scenario: null, from: m[3], with: attempt(x.id, () => parseWith(m[4]), {}), steps, ends: m[6], endData, sent, notSent };
  });
  prose.seams = of('X').map((x): SeamForm => {
    const m = x.text.match(/^Seam with ([\w-]+): (.+)$/);
    if (!m) { err(x.id, 'does not follow the Seam form "Seam with <Part>: ..."'); return { id: x.id, piece: null, body: null }; }
    return { id: x.id, piece: m[1], body: normalize(m[2]) };
  });
  prose.guarantees = of('K').map((x): GuaranteeForm => {
    const m = x.text.match(/^(.+?)\.?\s+Backing: (?:certora (\S+)#(\S+?) at ([0-9a-fA-F]+)|file (\S+)#(\S+?)|external (\S+?)|record (\S+?)|(none))\.?$/);
    if (!m) { err(x.id, 'does not follow the Guarantee form "<claim>. Backing: certora <spec>#<rule> at <commit>. | file <path>#<rule>. | record <module#type:id>. | external <runner>. | none."'); return { id: x.id, claim: x.text, backing: null }; }
    const backing: Backing = m[2] ? { kind: 'certora', path: m[2], rule: m[3], commit: m[4].toLowerCase() } : m[5] ? { kind: 'file', path: m[5], rule: m[6] } : m[7] ? { kind: 'external', runner: m[7] } : m[8] ? { kind: 'record', ref: m[8] } : { kind: 'none' };
    return { id: x.id, claim: m[1], backing };
  });
  prose.wordsOnly = of('T').map(x => ({ id: x.id, text: x.text }));
  prose.statesNothingEventual = prose.wordsOnly.some(t => /promises nothing eventual/i.test(t.text));

  // Names: every state, event and data name a passage uses must be declared.
  const stateNames = new Set(prose.states.map(s => s.path.join('.')).filter(Boolean));
  const eventNames = new Set(prose.events.map(e => e.name).filter(Boolean));
  prose.misnamed = [];
  const mis = (id: string, what: string) => prose.misnamed.push(`${id} ${what}`);
  for (const s of prose.states) {
    if (s.parent && !stateNames.has(s.parent)) mis(s.id, `sits under ${s.parent}, which no State passage declares`);
    if (s.children) {
      for (const n of s.children.names) if (!stateNames.has(`${s.path.join('.')}.${n}`)) mis(s.id, `names child ${n}, which no State passage declares as ${s.path.join('.')}.${n}`);
      if (s.children.kind === 'compound' && !s.children.names.includes(s.children.initial)) mis(s.id, `starts at ${s.children.initial}, which is not one of its children`);
    }
  }
  for (const mv of prose.moves) {
    if (mv.state && !stateNames.has(mv.state)) mis(mv.id, `names state ${mv.state}, which no State passage declares`);
    if (mv.to && !stateNames.has(mv.to)) mis(mv.id, `names state ${mv.to}, which no State passage declares`);
    if (mv.event && !eventNames.has(mv.event)) mis(mv.id, `names event ${mv.event}, which no Event passage declares`);
    if (mv.stays && mv.state && mv.to && mv.state !== mv.to) mis(mv.id, `says it stays but names a different state`);
  }
  for (const r of prose.refusals) {
    for (const s of r.states) if (!stateNames.has(s)) mis(r.id, `names state ${s}, which no State passage declares`);
    if (r.events !== 'every') for (const e of r.events) if (!eventNames.has(e)) mis(r.id, `names event ${e}, which no Event passage declares`);
  }
  for (const a of prose.always) if (a.while && !stateNames.has(a.while)) mis(a.id, `names state ${a.while}, which no State passage declares`);
  for (const w of prose.walks) {
    if (w.from && !stateNames.has(w.from)) mis(w.id, `starts at ${w.from}, which no State passage declares`);
    if (w.ends && !stateNames.has(w.ends)) mis(w.id, `ends at ${w.ends}, which no State passage declares`);
    for (const st of w.steps) if (st.malformed || !eventNames.has(st.event)) mis(w.id, `sends ${st.event}, which no Event passage declares`);
  }
  for (const list of [prose.onces, prose.withins]) for (const o of list) {
    for (const g of o.givens) if (!prose.byId[g] || prose.byId[g].retired) mis(o.id, `cites ${g}, which does not exist`);
    for (const side of [o.trigger, o.goal]) if (side && side.state && !stateNames.has(side.state)) mis(o.id, `names state ${side.state}, which no State passage declares`);
  }
  // A Given's event is one of this part's, sent by the Given's actor; an Always cites only a step Given.
  const senderOf = Object.fromEntries(prose.events.filter(e => e.name).map(e => [e.name!, e.sender]));
  for (const g of prose.givens) {
    if (!g.event) continue;
    if (g.event.includes('.')) { mis(g.id, `names event ${g.event}; a part's Given names one of its own events`); continue; }
    if (!eventNames.has(g.event)) { mis(g.id, `names event ${g.event}, which no Event passage declares`); continue; }
    if (g.actor && senderId(senderOf[g.event]) !== senderId(g.actor)) mis(g.id, `names event ${g.event}, which ${g.actor} does not send`);
  }
  for (const a of prose.always) for (const gid of a.givens) {
    if (!prose.byId[gid] || prose.byId[gid].retired) { mis(a.id, `cites ${gid}, which does not exist`); continue; }
    const g = prose.givens.find(x => x.id === gid);
    if (!g || !constrainsSteps(g)) mis(a.id, `cites ${gid}, which has neither prompt nor only when; an Always may cite only a Given that constrains steps`);
  }
  const effectNames = new Set(prose.boundary.effects.map(e => e.name));
  for (const mv of [...prose.moves, ...prose.refusals]) for (const e of mv.effects) if (!effectNames.has(e.name)) mis(mv.id, `sends ${e.name}, which the boundary does not declare`);
  for (const w of prose.walks) for (const e of [...Object.keys(w.sent), ...w.notSent]) if (!effectNames.has(e)) mis(w.id, `names effect ${e}, which the boundary does not declare`);

  // The table of states by events: every pair said once.
  prose.table = [];
  prose.unsaid = [];
  const leaves = prose.states.filter(s => s.name && !s.children);
  for (const s of leaves) {
    const full = s.path.join('.');
    const ancestors = s.path.map((_, i) => s.path.slice(0, i + 1).join('.'));
    for (const e of prose.events) {
      if (!e.name) continue;
      const moves = prose.moves.filter(m => ancestors.includes(m.state!) && m.event === e.name).map(m => m.id);
      const matching = prose.refusals.filter(r => r.states.some(x => ancestors.includes(x)) && (r.events === 'every' || r.events.includes(e.name!)));
      const refusals = matching.map(r => r.id);
      const unconditional = matching.filter(r => !r.cond).map(r => r.id);
      prose.table.push({ state: full, event: e.name, moves, refusals, unconditional });
      if (moves.length === 0 && refusals.length === 0) prose.unsaid.push(`${full} × ${e.name}`);
    }
  }
  prose.saidTwice = prose.table.filter(c => (c.moves.length > 0 && c.unconditional.length > 0) || c.unconditional.length > 1).map(c => `${c.state} × ${c.event}: ${[...c.moves, ...c.unconditional].join(' and ')}`);
  return prose;
}

export function parseProse(text: string): PartProse {
  const split = splitPassages(text);
  // Filled in below and by readPart.
  const prose = { ...split, tier: 'modeled', module: split.header.module || null, pins: split.header.pins ? split.header.pins.split(/,\s*/).filter(Boolean) : [] } as PartProse;
  // The title names the part in words, for its readers; its TLA+ module is named from its id.
  if (split.title === null) prose.errors.push('no title: a "# <Name>" line names the part');
  if (split.header.tier) {
    if (/^(charted|modeled)$/i.test(split.header.tier)) prose.tier = split.header.tier.toLowerCase();
    else prose.errors.push(`Tier must be charted or modeled, not "${split.header.tier}"`);
  }
  const boundaryText = split.lead.join(' ');
  const b = parseBoundary(boundaryText);
  prose.boundary = { text: boundaryText, data: b.data, effects: b.effects };
  prose.errors.push(...b.errors.map(e => `boundary: ${e}`));
  return readPart(null, prose);
}

// A composition's prose: properties over member data, each with its scenarios.
export function parseCompositionProse(text: string): CompositionProse {
  const split = splitPassages(text, { composition: true });
  // Filled in below.
  const prose = { ...split, concern: split.header.concern || null, description: split.lead.join(' ') } as CompositionProse;
  const err = (id: string, msg: string) => prose.errors.push(`${id}: ${msg}`);
  const attempt = <T,>(id: string, fn: () => T, fallback: T): T => { try { return fn(); } catch (e) { err(id, (e as Error).message); return fallback; } };
  const active = prose.passages.filter(x => !x.retired);
  const of = (kind: PassageKind) => active.filter(x => x.kind === kind);
  // A scenario claimed twice would be two cells of one: it is reported and counted once.
  const scenariosOf = (p: Passage) => {
    const m = p.text.match(/\s*Scenarios:\s*(.+?)\.?$/);
    const listed = m ? m[1].split(/,\s*/).map(s => s.trim()).filter(Boolean) : null;
    for (const sc of new Set((listed || []).filter((s, i, all) => all.indexOf(s) !== i))) err(p.id, `claims scenario ${sc} twice`);
    return { body: m ? p.text.slice(0, m.index).trim() : p.text, scenarios: listed ? [...new Set(listed)] : null };
  };
  const triggerOf = (id: string, text: string): Trigger => (/^[a-z][\w-]*\.[A-Z][\w-]*$/.test(text.trim()) ? { state: text.trim() } : { cond: attempt<Expr | null>(id, () => parseCondition(text), null) });
  prose.always = of('A').map((x): CompositionAlwaysForm => {
    const { body, scenarios } = scenariosOf(x);
    const m = body.match(/^Always, (.+?)(?:, given (G\d+(?: and G\d+)*))?\.?$/);
    if (!m) { err(x.id, 'does not follow the Always form "Always, <condition>[, given G<n>]. Scenarios: ..."'); return { id: x.id, cond: null, givens: [], scenarios }; }
    return { id: x.id, cond: attempt<Expr | null>(x.id, () => parseCondition(m[1]), null), givens: m[2] ? givensOf(m[2]) : [], scenarios };
  });
  prose.onces = of('O').map((x): CompositionOnceForm => {
    const { body, scenarios } = scenariosOf(x);
    const m = body.match(/^Once (.+?), eventually (.+?), given (G\d+(?: and G\d+)*)\.?$/);
    if (!m) { err(x.id, 'does not follow the Once form "Once <trigger>, eventually <goal>, given G<n>. Scenarios: ..."'); return { id: x.id, trigger: null, goal: null, givens: [], scenarios }; }
    return { id: x.id, trigger: triggerOf(x.id, m[1]), goal: triggerOf(x.id, m[2]), givens: givensOf(m[3]), scenarios };
  });
  prose.withins = of('N').map((x): CompositionWithinForm => {
    const { body, scenarios } = scenariosOf(x);
    const m = body.match(/^Within (\S+) ticks? of (.+?), (.+?), given (G\d+(?: and G\d+)*)\.?$/);
    if (!m) { err(x.id, 'does not follow the Within form "Within <k> ticks of <trigger>, <goal>, given G<n>. Scenarios: ..."'); return { id: x.id, k: null, trigger: null, goal: null, givens: [], scenarios }; }
    const k = number(m[1]);
    if (k === undefined) err(x.id, `"${m[1]}" is not a number of ticks`);
    return { id: x.id, k, trigger: triggerOf(x.id, m[2]), goal: triggerOf(x.id, m[3]), givens: givensOf(m[4]), scenarios };
  });
  prose.givens = of('G').map(x => readGiven(x, err));
  // A composition's walk ends at a member's state and says nothing more: a clause after it would not be checked.
  prose.walks = of('W').map((x): CompositionWalkForm => {
    const m = x.text.match(/^Walk ([\w-]+)(?: under ([\w-]+))?: from ([a-z][\w-]*\.[A-Z][\w-]*), (.+?); ends ([a-z][\w-]*\.[A-Z][\w-]*)\b(.*)$/);
    if (!m) { err(x.id, 'does not follow the composition Walk form "Walk <Name>[ under <scenario>]: from <part>.<State>, <part>.<event>[ <field> <value>][ refused], ...; ends <part>.<State>."'); return { id: x.id, name: null, steps: [] }; }
    const steps: CompositionStep[] = [];
    for (const s of splitTop(m[4], [', '])) {
      const r = s.match(compositionStepRe);
      if (!r) { err(x.id, `step "${s}" is not "<part>.<event>[ <field> <value>...][ refused]"`); continue; }
      steps.push({ part: r[1], event: r[2], args: attempt(x.id, () => parseArgs(r[3]), {}), refused: Boolean(r[4]) });
    }
    const rest = m[6].trim();
    if (rest && rest !== '.') err(x.id, `a composition walk ends at "ends ${m[5]}"; "${rest.replace(/^[;,]\s*|\.$/g, '')}" after it is not read`);
    return { id: x.id, name: m[1], scenario: m[2] || null, from: m[3], steps, ends: m[5], rest };
  });
  prose.wordsOnly = of('T').map(x => ({ id: x.id, text: x.text }));
  prose.properties = [...prose.always, ...prose.onces, ...prose.withins];
  prose.misnamed = [];
  for (const o of [...prose.onces, ...prose.withins]) for (const g of o.givens) if (!prose.byId[g] || prose.byId[g].retired) prose.misnamed.push(`${o.id} cites ${g}, which does not exist`);
  for (const a of prose.always) for (const gid of a.givens) {
    if (!prose.byId[gid] || prose.byId[gid].retired) { prose.misnamed.push(`${a.id} cites ${gid}, which does not exist`); continue; }
    const g = prose.givens.find(x => x.id === gid);
    if (!g || !constrainsSteps(g)) prose.misnamed.push(`${a.id} cites ${gid}, which has neither prompt nor only when; an Always may cite only a Given that constrains steps`);
  }
  // Whether the event exists and its sender is the actor is the wiring's to check; the form is checked here.
  for (const g of prose.givens) if (g.event && !/^[a-z][\w-]*\.[a-z][\w-]*$/.test(g.event)) prose.misnamed.push(`${g.id} names event ${g.event}; a composition's Given names <part>.<event>`);
  return prose;
}

export function passageHashes(prose: { passages: Passage[] }): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of prose.passages) if (!p.retired) out[p.id] = p.hash;
  return out;
}
