// ledger.md for a component or a system, index.md for the root, and the verify lines. The ledgers
// and the index are views: render writes them, nothing reads them as a record, and deleting one
// changes no conclusion.
import { proseHash } from '../hash.ts';
import { KINDS } from '../prose/prose.ts';
import { forgets } from '../dossiers/decisions.ts';
import type { Backing } from '../prose/prose.ts';
import type { Snapshot } from '../trials/answers.ts';
import type { OwnerState } from '../dossiers/decisions.ts';
import type { Member, Wire } from '../dossiers/composition.ts';
import type { FreeSend, OutsideSender } from '../models/compose.ts';
import type { Analysis, AnswerRow, ComponentAnalysis, SystemAnalysis } from './analyze.ts';
import type { CellMark, WalkMarkName } from './cells.ts';
import type { BackingState, Mark } from './marks.ts';
import type { Route } from './route.ts';
import type { Note } from './tripwires.ts';

// The machine form a component's ledger ends with, as written.
export interface ComponentLedgerForm {
  kind: 'component';
  id: string;
  title: string;
  tier: string;
  module: string | null;
  rebuilt: string;
  plugin: string;
  summary: Record<string, number>;
  marks: Record<string, Mark>;
  owner: Record<string, OwnerState>;
  backing: Record<string, BackingState>;
  pins: Record<string, string | null>;
  usedBy: string[];
  answers: AnswerRow[];
  removed: string[];
  tripwires: Note[];
  flags: Note[];
  route: Route;
}
// One cell as a system's machine form keeps it.
// A cell as verify's lines name it: its mark, and for a violation whether the owner accepted it or
// the acceptance lapsed.
export const cellWords = (c: { mark: string; accepted?: unknown; acceptanceLapsed?: string[] }): string => c.mark + (c.mark !== 'violated' ? '' : c.accepted ? ', accepted' : c.acceptanceLapsed && c.acceptanceLapsed.length ? ', acceptance lapsed' : '');
export interface CellForm { property: string; scenario: string; mark: CellMark; trial: string | null; entry: string | null; reach: string | null; lapsed: string[]; accepted: boolean; acceptanceLapsed: string[]; open: boolean; impliedBy: string | null; held: string }
// One Walk under its scenario as a system's machine form keeps it.
export interface WalkForm { id: string; scenario: string; mark: WalkMarkName; trial: string | null; entry: string | null }
// The machine form a system's ledger ends with, as written.
export interface SystemLedgerForm {
  kind: 'system';
  id: string;
  title: string;
  concern: string | null;
  rebuilt: string;
  plugin: string;
  summary: Record<string, number>;
  members: Member[];
  wiring: Wire[];
  free: FreeSend[];
  outside: OutsideSender[];
  closureMissing: string[];
  cells: CellForm[];
  walks: WalkForm[];
  owner: Record<string, OwnerState>;
  propertyHeld: Record<string, string>;
  answers: AnswerRow[];
  removed: string[];
  tripwires: Note[];
  flags: Note[];
  route: Route;
}
// The earlier view's machine form, as far as the "Since last rebuild" line reads it. Only that
// line reads it: it says what moved between two views and decides nothing. A ledger rendered before
// its rows were called answers lists them under trials, each by its trial's id.
interface LedgerForm {
  marks?: Record<string, { mark: string; owner: string | null }>;
  cells?: { property: string; scenario: string; mark: string }[];
  walks?: { id: string; scenario: string; mark: string }[];
  owner?: Record<string, string>;
  propertyHeld?: Record<string, string>;
  usedBy?: string[];
  flags?: Note[];
  answers?: { trial: string }[];
  trials?: { id: string }[];
  removed?: string[];
  closureMissing?: string[];
}
export function parseMachineForm(text: string | null | undefined): LedgerForm | null {
  const m = text && text.match(/\n```json\n([\s\S]*?)\n```\n$/);
  if (!m) return null;
  let form: unknown;
  try { form = JSON.parse(m[1]); } catch { return null; }
  return formShaped(form) ? form : null;
}
// The earlier view feeds only the "Since last rebuild" line. A view is disposable, so one whose block
// has any field of the wrong shape reads as no earlier view at all.
const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const isText = (v: unknown) => typeof v === 'string';
const listOf = (ok: (v: unknown) => boolean) => (v: unknown) => Array.isArray(v) && v.every(ok);
const mapOf = (ok: (v: unknown) => boolean) => (v: unknown) => isObject(v) && Object.values(v).every(ok);
const shaped = (fields: Record<string, (v: unknown) => boolean>) => (v: unknown) => isObject(v) && Object.entries(fields).every(([k, ok]) => ok(v[k]));
const FORM: Record<string, (v: unknown) => boolean> = {
  marks: mapOf(shaped({ mark: isText, owner: v => v === null || v === undefined || isText(v) })),
  cells: listOf(shaped({ property: isText, scenario: isText, mark: isText })),
  walks: listOf(shaped({ id: isText, scenario: isText, mark: isText })),
  owner: mapOf(isText),
  propertyHeld: mapOf(isText),
  usedBy: listOf(isText),
  flags: listOf(shaped({ name: isText, where: isText })),
  answers: listOf(shaped({ trial: isText })),
  trials: listOf(shaped({ id: isText })),
  removed: listOf(isText),
  closureMissing: listOf(isText),
};
function formShaped(form: unknown): form is LedgerForm {
  return isObject(form) && Object.entries(FORM).every(([k, ok]) => form[k] === undefined || ok(form[k]));
}
interface RenderOptions { version: string; now: string; previous: string | null | undefined }

const shortId = (t: string) => t.replace(/^\d{4}-\d{2}-\d{2}-\d{4}-/, '');
// An answer as a ledger names it: the short id, or the whole id, of the trial that established it,
// linked to its entry in evidence/.
const link = (trial: string, entry: string, whole = false) => `[${whole ? trial : shortId(trial)}](evidence/${entry}.json)`;
// Text inside a table cell, where a bare pipe would end the cell.
const inCell = (text: string) => text.replace(/\|/g, '\\|');
// A count with its noun, one or many.
const counted = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
// The counts a summary line prints: each one above zero, in this order. The machine form keeps them all.
const above = (counts: [string, number][]) => counts.filter(([, n]) => n > 0).map(([name, n]) => `${name} ${n}`);

export function summaryLine(a: Analysis): string {
  const s = a.summary;
  if (a.kind === 'system') {
    const violated = s.violated ? [`violated ${s.violated}${s.accepted ? ` (accepted ${s.accepted})` : ''}`] : [];
    return [`${a.title}: ${counted(s.properties, 'property', 'properties')} × ${counted(s.scenarios, 'scenario', 'scenarios')}`, counted(s.cells, 'cell', 'cells'),
      ...above([['proved', s.proved], ['checked', s.checked], ['implied', s.implied]]), ...violated,
      ...above([['lapsed', s.lapsed], ['pending', s.pending], ['miscalled', s.miscalled], ['held', s.held], ['hollow', s.hollow], ['open', s.open], ['doubts open', s.doubtsOpen]]), `prose@${proseHash(a.hashes)}`].join(' · ');
  }
  return [`${a.title}: ${counted(s.passages, 'passage', 'passages')}`,
    ...above([['settled', s.settled], ['confirmed', s.confirmed], ['unsettled', s.unsettled], ['rejected', s.rejected], ['proved', s.proved], ['checked', s.checked], ['drawn', s.drawn], ['pending', s.pending], ['lapsed', s.lapsed], ['miscalled', s.miscalled], ['hollow', s.hollow], ['held', s.held], ['owed', s.owed], ['backed', s.backed], ['assumed', s.assumed], ['doubts open', s.doubtsOpen], ['text', s.text], ['given', s.given]]), `prose@${proseHash(a.hashes)}`].join(' · ');
}

// rootTrips: what is wrong at the root, outside every dossier: dossier.json, index.md.
export function verifyLine(analyses: Analysis[], version: string, rootTrips: Note[] = []): string {
  const trips = [...rootTrips.map(t => `${t.name} (${t.where})`), ...analyses.flatMap(a => a.tripwires.map(t => `${t.name} (${a.title}: ${t.where})`))];
  const comps = analyses.filter(a => a.kind === 'component').length, systems = analyses.filter(a => a.kind === 'system').length;
  const scope = analyses.length === 0 ? 'no dossiers' : analyses.length === 1 ? analyses[0].title : `${comps} component${comps === 1 ? '' : 's'}, ${systems} system${systems === 1 ? '' : 's'}`;
  if (trips.length === 0) return `verify: ok · ${scope} · dossier ${version} · 0 tripwires`;
  return `verify: FAIL · ${scope} · dossier ${version} · ${trips.length} tripwire${trips.length === 1 ? '' : 's'}: ${trips.join('; ')}`;
}

export function briefLines(a: Analysis): string[] {
  const lines = [summaryLine(a)];
  if (a.route.pass === 'Fix') lines.push(`  fix: ${a.route.why.join('; ')}`);
  else lines.push(`  next: ${a.route.pass} — ${a.route.why.join('; ')}`);
  if (a.flags.length) lines.push(`  flags: ${a.flags.map(x => `${x.name} (${x.where})`).join(' · ')}`);
  return lines;
}

export function rootLines(route: Route, pluginRoot: string): string[] {
  const lines: string[] = [];
  if (route.pass === 'Fix') lines.push(`fix: ${route.why.join('; ')}`);
  else lines.push(`next: ${route.pass}${route.target ? ` on ${route.target}` : ''} — ${route.why.slice(0, 3).join('; ')}${route.why.length > 3 ? `; and ${route.why.length - 3} more` : ''}`);
  lines.push(`read: ${pluginRoot}/${route.read}`);
  return lines;
}

// The parts of a view that only say when it was written: the stamp in the header and in the
// machine form, and the line saying what moved. The rest is the content. A render that leaves
// the content as it was writes nothing, so `rebuilt` is the time of the last change and the
// tree stays clean.
export function core(text: unknown): string {
  return String(text)
    .replace(/^(# (?:Ledger: [^\n]*?|Dossiers)   rebuilt )\S+/, '$1_')
    .replace(/\n  "rebuilt": "[^"\n]*"(,?)\n/, '\n  "rebuilt": "_"$1\n')
    .replace(/\nSince last rebuild: [^\n]*\n/, '\n');
}

function serialize(form: Record<string, unknown>): string {
  const lines = ['{'];
  const keys = Object.keys(form);
  for (const key of keys) {
    const last = key === keys[keys.length - 1] ? '' : ',';
    // The long lists one item a line; walks too once there are any, so a system without them keeps "walks": [].
    if (key === 'marks' || key === 'cells' || key === 'answers' || (key === 'walks' && (form[key] as unknown[]).length)) {
      const isArray = Array.isArray(form[key]);
      lines.push(`  ${JSON.stringify(key)}: ${isArray ? '[' : '{'}`);
      const entries = isArray ? (form[key] as unknown[]).map((v): [string | null, unknown] => [null, v]) : Object.entries(form[key] as object);
      entries.forEach(([k, v], i) => lines.push(`    ${k === null ? '' : `${JSON.stringify(k)}: `}${JSON.stringify(v)}${i === entries.length - 1 ? '' : ','}`));
      lines.push(`  ${isArray ? ']' : '}'}${last}`);
    } else lines.push(`  ${JSON.stringify(key)}: ${JSON.stringify(form[key])}${last}`);
  }
  lines.push('}');
  return lines.join('\n');
}

const joined = (lines: string[]) => lines.join('\n') + '\n';

// `previous` is the text on disk, or null. When the content is the same, the
// text on disk is returned as it is, stamp and all.
const finish = (out: string[], form: Record<string, unknown>, moved: string[], previous: string | null | undefined) => {
  const text = (since: string) => joined([...out, `Since last rebuild: ${since}`, '', '```json', serialize(form), '```']);
  if (previous == null) return text('first rebuild');
  if (core(text('')) === core(previous)) return previous;
  return text(moved.join('; ') || 'no mark moved');
};

// A guarantee's backing as its passage names it.
export function backingText(b: Backing | null | undefined): string {
  if (!b || b.kind === 'none') return 'none';
  if (b.kind === 'certora') return `certora ${b.path}#${b.rule} at ${b.commit}`;
  if (b.kind === 'record') return `record ${b.ref}`;
  if (b.kind === 'file') return `file ${b.path}#${b.rule}`;
  if (b.kind === 'external') return `external ${b.runner}`;
  return (b as { kind: string }).kind;
}

export function renderComponentLedger(a: ComponentAnalysis, { version, now, previous }: RenderOptions): string {
  const out: string[] = [];
  out.push(`# Ledger: ${a.title}   rebuilt ${now}   prose@${proseHash(a.hashes)}   answers ${a.answerRows.length}   decisions ${a.decisions.length}`);
  out.push('Written by dossier render from the records. The JSON block at the end says the same for tools.');
  out.push(verifyLine([a], version));
  out.push('');
  out.push('| id | kind | passage | owner | machine | answers | reach |');
  out.push('| --- | --- | --- | --- | --- | --- | --- |');
  // The Givens a property rests on, printed beside its mark so a reader sees the assumption.
  const givensOf: Record<string, string[]> = Object.fromEntries([...a.ir.invariants, ...a.ir.onces, ...a.ir.withins].map(x => [x.id, x.givens || []]));
  for (const p of a.prose.passages) {
    if (p.retired) continue;
    const m: Partial<Mark> & Pick<Mark, 'mark' | 'trials' | 'entries' | 'doubt' | 'owner'> = a.marks[p.id] || { mark: 'pending', trials: [], entries: [], doubt: [], owner: a.owner[p.id] };
    const machine = m.mark + (m.grounded ? ', grounded' : '') + (m.doubt.length ? `, doubt ${m.doubt.join(' ')}` : '') + ((givensOf[p.id] || []).length ? `, given ${givensOf[p.id].join(' ')}` : '') + (m.lapsed && m.lapsed.length ? `, moved: ${m.lapsed.join(', ')}` : '');
    out.push(`| ${p.id} | ${KINDS[p.kind]} | ${inCell(p.text)} | ${m.owner || a.owner[p.id] || ''} | ${machine} | ${m.trials.map((t, i) => link(t, m.entries[i])).join(', ')} | ${m.reach || ''} |`);
  }
  if (a.ir.guarantees.length) {
    out.push('');
    out.push('| guarantee | backing | status |');
    out.push('| --- | --- | --- |');
    for (const k of a.ir.guarantees) {
      const b: BackingState = a.backing[k.id] || { status: 'assumed' };
      const where = backingText(k.backing);
      out.push(`| ${k.id} | ${where} | ${b.status}${b.reason ? ` (${b.reason})` : ''} |`);
    }
  }
  out.push('');
  out.push(`Used by: ${a.usedBy.length ? a.usedBy.join(', ') : 'no system yet'}`);
  out.push(...forgottenLines(a));
  out.push(`Summary: ${summaryLine(a).replace(/^[^:]+:\s*/, '')}`);
  out.push(`Flags: ${a.flags.length ? a.flags.map(x => `${x.name} (${x.where})`).join(' · ') : 'none'}`);
  if (a.route.pass === 'Fix') out.push(`Fix: ${a.route.why.join('; ')}`); else out.push(`Next: ${a.route.pass} — ${a.route.why.join('; ')}`);
  const form = { kind: 'component', id: a.id, title: a.title, tier: a.tier, module: a.ir.module, rebuilt: now, plugin: version, summary: a.summary, marks: a.marks, owner: a.owner, backing: a.backing, pins: a.pins, usedBy: a.usedBy, answers: a.answerRows, removed: a.removed, tripwires: a.tripwires, flags: a.flags, route: a.route } satisfies ComponentLedgerForm;
  return finish(out, form, diffMarks(a, parseMachineForm(previous)), previous);
}

export function renderSystemLedger(a: SystemAnalysis, { version, now, previous }: RenderOptions): string {
  const out: string[] = [];
  out.push(`# Ledger: ${a.title}   rebuilt ${now}   prose@${proseHash(a.hashes)}   answers ${a.answerRows.length}   decisions ${a.decisions.length}`);
  out.push('Written by dossier render from the records. The JSON block at the end says the same for tools.');
  out.push(verifyLine([a], version));
  out.push('');
  out.push('| member | role | module | pins |');
  out.push('| --- | --- | --- | --- |');
  for (const m of a.composition.members) out.push(`| ${m.component} | ${m.role} | ${(a.members[m.component] && a.members[m.component].module) || ''} | ${m.pins.join(', ')} |`);
  if (a.composition.wiring.length) { out.push(''); out.push(`Wiring: ${a.composition.wiring.map(w => `${w.effect.component}.${w.effect.name} → ${w.event.component}.${w.event.name}`).join(' · ')}`); }
  const free = a.composed.free || [], outside = a.composed.outside || [];
  if ((free.length || outside.length) && !a.composition.wiring.length) out.push('');
  if (free.length) {
    const bySender = new Map<string, string[]>();
    for (const x of free) (bySender.get(x.from) || bySender.set(x.from, []).get(x.from)!).push(x.event);
    out.push(`Free: ${[...bySender].map(([from, events]) => `${events.join(', ')} from ${from}`).join(' · ')}`);
  }
  if (outside.length) out.push(`Outside: ${outside.map(o => `${o.from} sends ${o.events.join(', ')}`).join(' · ')}`);
  if (a.closureMissing.length) out.push(`Closure open: ${a.closureMissing.join('; ')}`);
  const scenarios = [...new Set(a.cells.map(c => c.scenario))];
  out.push('');
  out.push(`| property | owner | ${scenarios.join(' | ')} |`);
  out.push(`| --- | --- | ${scenarios.map(() => '---').join(' | ')} |`);
  for (const p of a.prose.properties) {
    const cells = scenarios.map(sid => {
      const c = a.cells.find(x => x.property === p.id && x.scenario === sid);
      if (!c) return '';
      let text: string = c.mark;
      if (c.mark === 'violated' && c.accepted) text += ', accepted';
      else if (c.mark === 'violated' && c.acceptanceLapsed && c.acceptanceLapsed.length) text += ', acceptance lapsed';
      if (c.mark === 'implied') text += ` by ${c.impliedBy}`;
      if (c.open) text += ', open';
      if (c.trial) text += ` (${link(c.trial, c.entry!)})`;
      return text;
    });
    const held = a.propertyHeld[p.id] === 'caught' ? '' : ` · ${a.propertyHeld[p.id]}`;
    // The property's sentence, Givens and all, without the Scenarios sentence the columns already show.
    const passage = a.prose.passages.find(x => x.id === p.id);
    const sentence = passage ? ` · ${inCell(passage.text.replace(/\s*Scenarios:\s*.+?\.?$/, ''))}` : '';
    out.push(`| ${p.id}${sentence}${held} | ${a.owner[p.id] || ''} | ${cells.join(' | ')} |`);
  }
  out.push('');
  for (const c of a.cells.filter(c => c.trial)) {
    const deps: Partial<Snapshot> = c.dependencies || {};
    // Each member at the prose the answer's trial found it in.
    const members = Object.entries(deps.members || {}).map(([id, m]) => `${id}@${(m.prose || '').slice(0, 6)}`).join(', ');
    out.push(`- ${c.property} × ${c.scenario}: ${c.mark}${c.reach && c.reach.text ? `, reach ${c.reach.text}` : ''}, ${link(c.trial!, c.entry!, true)}${members ? `, members ${members}` : ''}${c.lapsed.length ? `, moved: ${c.lapsed.join(', ')}` : ''}${c.acceptanceLapsed && c.acceptanceLapsed.length ? `, acceptance lapsed: ${c.acceptanceLapsed.join(', ')}` : ''}`);
  }
  const walks = a.walks || [];
  if (walks.length) {
    if (out[out.length - 1] !== '') out.push('');
    out.push('| walk | scenario | mark | trial |');
    out.push('| --- | --- | --- | --- |');
    for (const w of walks) out.push(`| ${w.id} | ${w.scenario} | ${w.mark} | ${w.trial ? link(w.trial, w.entry!) : ''} |`);
  }
  out.push('');
  out.push(...forgottenLines(a));
  out.push(`Summary: ${summaryLine(a).replace(/^[^:]+:\s*/, '')}`);
  out.push(`Flags: ${a.flags.length ? a.flags.map(x => `${x.name} (${x.where})`).join(' · ') : 'none'}`);
  if (a.route.pass === 'Fix') out.push(`Fix: ${a.route.why.join('; ')}`); else out.push(`Next: ${a.route.pass} — ${a.route.why.join('; ')}`);
  const form = { kind: 'system', id: a.id, title: a.title, concern: a.prose.concern, rebuilt: now, plugin: version, summary: a.summary, members: a.composition.members, wiring: a.composition.wiring, free: a.composed.free || [], outside: a.composed.outside || [], closureMissing: a.closureMissing, cells: a.cells.map(c => ({ property: c.property, scenario: c.scenario, mark: c.mark, trial: c.trial, entry: c.entry, reach: c.reach ? c.reach.text : null, lapsed: c.lapsed, accepted: Boolean(c.accepted), acceptanceLapsed: c.acceptanceLapsed || [], open: Boolean(c.open), impliedBy: c.impliedBy || null, held: c.held })), walks: walks.map(w => ({ id: w.id, scenario: w.scenario, mark: w.mark, trial: w.trial, entry: w.entry })), owner: a.owner, propertyHeld: a.propertyHeld, answers: a.answerRows, removed: a.removed, tripwires: a.tripwires, flags: a.flags, route: a.route } satisfies SystemLedgerForm;
  return finish(out, form, diffCells(a, parseMachineForm(previous)), previous);
}

export function renderIndex({ components, systems, version, now, route, previous = null, rootTrips = [] }: { components: ComponentAnalysis[]; systems: SystemAnalysis[]; version: string; now: string; route: Route; previous?: string | null; rootTrips?: Note[] }): string {
  const out: string[] = [];
  out.push(`# Dossiers   rebuilt ${now}   dossier ${version}`);
  out.push('Written by dossier render: components by systems, and every system at a glance.');
  out.push(verifyLine([...components, ...systems], version, rootTrips));
  out.push('');
  const sysIds = systems.map(s => s.id);
  out.push(`| component | module | tier | ${sysIds.join(' | ')}${sysIds.length ? ' |' : ''}`);
  out.push(`| --- | --- | --- |${sysIds.map(() => ' --- |').join('')}`);
  for (const c of components) {
    const cells = systems.map(s => { const m = s.composition.members.find(x => x.component === c.id); return m ? (m.role === 'member' ? 'member' : 'surroundings') : ''; });
    out.push(`| ${c.id} | ${c.ir.module || ''} | ${c.tier} |${cells.map(x => ` ${x} |`).join('')}`);
  }
  out.push('');
  for (const a of [...components, ...systems]) out.push(`- ${summaryLine(a)}`);
  out.push('');
  out.push(route.pass === 'Fix' ? `Fix: ${route.why.join('; ')}` : `Next: ${route.pass}${route.target ? ` on ${route.target}` : ''} — ${route.why.join('; ')}`);
  const form = { rebuilt: now, plugin: version, components: components.map(c => ({ id: c.id, module: c.ir.module, tier: c.tier, summary: c.summary, route: c.route, usedBy: c.usedBy })), systems: systems.map(s => ({ id: s.id, members: s.composition.members.map(m => m.component), summary: s.summary, route: s.route })), route };
  const next = joined([...out, '', '```json', JSON.stringify(form, null, 2), '```']);
  return previous != null && core(next) === core(previous) ? previous : next;
}

// The removed answers the owner let go of, each with the decision's words.
function forgottenLines(a: Analysis): string[] {
  const bound = (a.integrity.manifest && a.integrity.manifest.evidence) || {};
  const forgotten = Object.entries(a.forgotten || {}).filter(([name, f]) => forgets(f, bound[name]) && !a.answerRows.some(t => t.entry === name));
  return forgotten.length ? [`Forgotten: ${forgotten.map(([name, f]) => `evidence/${name}.json (${f.time}: ${JSON.stringify(f.words)})`).join(' · ')}`] : [];
}

// What moved since the ledger last changed: marks and owners, cells, the
// guarantees' standing (as marks), who uses the component, the flags, the
// closure, and the answers that arrived or whose entries went missing.
const diffList = (label: string, before: string[] = [], after: string[] = []) => {
  const b = new Set(before), n = new Set(after), out: string[] = [];
  for (const x of after) if (!b.has(x)) out.push(`${label} +${x}`);
  for (const x of before) if (!n.has(x)) out.push(`${label} -${x}`);
  return out;
};
const flagText = (f: Note) => `${f.name} (${f.where})`;
// The answers that arrived, by the trial that established each, and the entries that went missing.
const diffAnswers = (previous: LedgerForm, after: AnswerRow[], removed: string[]) => {
  const b = new Set(previous.answers ? previous.answers.map(t => t.trial) : (previous.trials || []).map(t => t.id));
  const added = after.filter(t => !b.has(t.trial)).map(t => t.trial);
  const wasRemoved = new Set(previous.removed || []);
  const gone = removed.filter(name => !wasRemoved.has(name));
  return [...(added.length ? [`answers new ${added.join(' ')}`] : []), ...(gone.length ? [`answers removed ${gone.join(' ')}`] : [])];
};

function diffMarks(a: ComponentAnalysis, previous: LedgerForm | null): string[] {
  if (!previous || !previous.marks) return ['first rebuild'];
  const lines: string[] = [];
  for (const [id, m] of Object.entries(a.marks)) {
    const was = previous.marks[id];
    if (!was) { lines.push(`${id} new`); continue; }
    if (was.owner !== m.owner) lines.push(`${id} ${was.owner}→${m.owner}`);
    if (was.mark !== m.mark) lines.push(`${id} ${was.mark}→${m.mark}`);
  }
  for (const id of Object.keys(previous.marks)) if (!a.marks[id]) lines.push(`${id} gone`);
  lines.push(...diffList('used by', previous.usedBy, a.usedBy));
  lines.push(...diffList('flag', (previous.flags || []).map(flagText), a.flags.map(flagText)));
  lines.push(...diffAnswers(previous, a.answerRows, a.removed));
  return lines;
}

function diffCells(a: SystemAnalysis, previous: LedgerForm | null): string[] {
  if (!previous || !previous.cells) return ['first rebuild'];
  const lines: string[] = [];
  const key = (c: { property: string; scenario: string }) => `${c.property}×${c.scenario}`;
  const was = Object.fromEntries(previous.cells.map(c => [key(c), c]));
  // A cell's mark, with the owner's acceptance of a violation as the matrix shows it.
  const shown = cellWords;
  for (const c of a.cells) { const w = was[key(c)]; if (!w) lines.push(`${key(c)} new`); else if (shown(w) !== shown(c)) lines.push(`${key(c)} ${shown(w)}→${shown(c)}`); }
  const now = new Set(a.cells.map(key));
  for (const k of Object.keys(was)) if (!now.has(k)) lines.push(`${k} gone`);
  const walkKey = (w: { id: string; scenario: string }) => `${w.id}×${w.scenario}`;
  const walksWere = Object.fromEntries((previous.walks || []).map(w => [walkKey(w), w]));
  for (const w of a.walks || []) { const p = walksWere[walkKey(w)]; if (!p) lines.push(`${walkKey(w)} new`); else if (p.mark !== w.mark) lines.push(`${walkKey(w)} ${p.mark}→${w.mark}`); }
  for (const k of Object.keys(walksWere)) if (!(a.walks || []).some(w => walkKey(w) === k)) lines.push(`${k} gone`);
  for (const [id, o] of Object.entries(a.owner || {})) { const w = previous.owner && previous.owner[id]; if (w && w !== o) lines.push(`${id} ${w}→${o}`); }
  for (const [id, h] of Object.entries(a.propertyHeld || {})) { const w = previous.propertyHeld && previous.propertyHeld[id]; if (w && w !== h) lines.push(`${id} ${w}→${h}`); }
  lines.push(...diffList('closure open', previous.closureMissing, a.closureMissing));
  lines.push(...diffList('flag', (previous.flags || []).map(flagText), a.flags.map(flagText)));
  lines.push(...diffAnswers(previous, a.answerRows, a.removed));
  return lines;
}
