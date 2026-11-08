// compositions/<concern>/wiring.md: members, wiring, the sends left free, closure, default scenarios.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { recordsOf } from '../prose/yaml.ts';

export interface Member { part: string; role: string; pins: string[] }
// One member's effect delivered as another member's event, in the same step.
export interface Wire { effect: { part: string; name: string }; event: { part: string; name: string } }
// The modules owning an edge of these kinds on the asset must be members.
export interface ClosureRule { asset: string | null; edges: string[]; modules: string[] }
// free: events a member sends into another member that this concern leaves unwired, as
// <part>.<event> of the receiver, acknowledged so that verify stops flagging them.
export interface Wiring { members: Member[]; wiring: Wire[]; free: string[]; closure: ClosureRule[]; scenarios: string[]; errors: string[]; text: string }
// wiring.md's records as written.
interface RawWiring {
  members?: { part?: string; role?: string; pins?: string[] }[];
  wiring?: { effect?: string; event?: string }[];
  free?: unknown;
  closure?: { asset?: string; edges?: string[]; modules?: string[] }[];
  scenarios?: unknown;
}

export function readWiring(compositionDir: string): Wiring {
  const path = join(compositionDir, 'wiring.md');
  const errors: string[] = [];
  if (!existsSync(path)) return { members: [], wiring: [], free: [], closure: [], scenarios: [], errors: ['wiring.md is missing'], text: '' };
  const text = readFileSync(path, 'utf8');
  let r: RawWiring = {};
  try { r = recordsOf(text) as RawWiring; } catch (e) { errors.push(`wiring.md: ${(e as Error).message}`); }
  // A member listed twice is reported, and its first listing is the one read.
  const members = (r.members || []).map(m => ({ part: String(m.part || ''), role: m.role || 'member', pins: Array.isArray(m.pins) ? m.pins : [] })).filter((m, i, all) => {
    const first = !m.part || all.findIndex(x => x.part === m.part) === i;
    if (!first && all.filter(x => x.part === m.part).indexOf(m) === 1) errors.push(`wiring.md: ${m.part} is listed as a member more than once; the first is read`);
    return first;
  });
  for (const m of members) {
    if (!m.part) errors.push('wiring.md: a member names no part');
    if (!['member', 'surroundings'].includes(m.role)) errors.push(`wiring.md: ${m.part} has role "${m.role}", not member or surroundings`);
  }
  const wiring = (r.wiring || []).map(w => {
    const [sc, se] = String(w.effect || '').split('.');
    const [tc, te] = String(w.event || '').split('.');
    if (!sc || !se || !tc || !te) errors.push(`wiring.md: wiring needs effect: <part>.<effect> and event: <part>.<event>`);
    return { effect: { part: sc, name: se }, event: { part: tc, name: te } };
  });
  const closure = (r.closure || []).map(c => ({ asset: c.asset ? String(c.asset) : null, edges: Array.isArray(c.edges) ? c.edges : [], modules: Array.isArray(c.modules) ? c.modules : [] }));
  const free = Array.isArray(r.free) ? r.free.map(String) : [];
  for (const x of free) if (!/^[a-z][\w-]*\.[a-z][\w-]*$/.test(x)) errors.push(`wiring.md: free names "${x}", not <part>.<event>`);
  const listed = Array.isArray(r.scenarios) ? r.scenarios.map(String) : [];
  for (const x of new Set(listed.filter((s, i) => listed.indexOf(s) !== i))) errors.push(`wiring.md: scenarios lists ${x} more than once`);
  const scenarios = [...new Set(listed)];
  return { members, wiring, free, closure, scenarios, errors, text };
}
