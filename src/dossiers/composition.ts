// systems/<concern>/composition.md: members, wiring, the sends left free, closure, default scenarios.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { recordsOf } from '../prose/yaml.ts';

export interface Member { component: string; role: string; pins: string[] }
// One member's effect delivered as another member's event, in the same step.
export interface Wire { effect: { component: string; name: string }; event: { component: string; name: string } }
// The modules owning an edge of these kinds on the asset must be members.
export interface ClosureRule { asset: string | null; edges: string[]; modules: string[] }
// free: events a member sends into another member that this concern leaves unwired, as
// <component>.<event> of the receiver, acknowledged so that verify stops flagging them.
export interface Composition { members: Member[]; wiring: Wire[]; free: string[]; closure: ClosureRule[]; scenarios: string[]; errors: string[]; text: string }
// composition.md's records as written.
interface RawComposition {
  members?: { component?: string; role?: string; pins?: string[] }[];
  wiring?: { effect?: string; event?: string }[];
  free?: unknown;
  closure?: { asset?: string; edges?: string[]; modules?: string[] }[];
  scenarios?: unknown;
}

export function readComposition(systemDir: string): Composition {
  const path = join(systemDir, 'composition.md');
  const errors: string[] = [];
  if (!existsSync(path)) return { members: [], wiring: [], free: [], closure: [], scenarios: [], errors: ['composition.md is missing'], text: '' };
  const text = readFileSync(path, 'utf8');
  let r: RawComposition = {};
  try { r = recordsOf(text) as RawComposition; } catch (e) { errors.push(`composition.md: ${(e as Error).message}`); }
  // A member listed twice is reported, and its first listing is the one read.
  const members = (r.members || []).map(m => ({ component: String(m.component || ''), role: m.role || 'member', pins: Array.isArray(m.pins) ? m.pins : [] })).filter((m, i, all) => {
    const first = !m.component || all.findIndex(x => x.component === m.component) === i;
    if (!first && all.filter(x => x.component === m.component).indexOf(m) === 1) errors.push(`composition.md: ${m.component} is listed as a member more than once; the first is read`);
    return first;
  });
  for (const m of members) {
    if (!m.component) errors.push('composition.md: a member names no component');
    if (!['member', 'surroundings'].includes(m.role)) errors.push(`composition.md: ${m.component} has role "${m.role}", not member or surroundings`);
  }
  const wiring = (r.wiring || []).map(w => {
    const [sc, se] = String(w.effect || '').split('.');
    const [tc, te] = String(w.event || '').split('.');
    if (!sc || !se || !tc || !te) errors.push(`composition.md: wiring needs effect: <component>.<effect> and event: <component>.<event>`);
    return { effect: { component: sc, name: se }, event: { component: tc, name: te } };
  });
  const closure = (r.closure || []).map(c => ({ asset: c.asset ? String(c.asset) : null, edges: Array.isArray(c.edges) ? c.edges : [], modules: Array.isArray(c.modules) ? c.modules : [] }));
  const free = Array.isArray(r.free) ? r.free.map(String) : [];
  for (const x of free) if (!/^[a-z][\w-]*\.[a-z][\w-]*$/.test(x)) errors.push(`composition.md: free names "${x}", not <component>.<event>`);
  const listed = Array.isArray(r.scenarios) ? r.scenarios.map(String) : [];
  for (const x of new Set(listed.filter((s, i) => listed.indexOf(s) !== i))) errors.push(`composition.md: scenarios lists ${x} more than once`);
  const scenarios = [...new Set(listed)];
  return { members, wiring, free, closure, scenarios, errors, text };
}
