// Reading one dossier whole: a component's prose and IR, or a system's prose,
// composition, members and generated model.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseProse, parseSystemProse } from '../prose/prose.ts';
import { compileIR } from '../prose/ir.ts';
import { readActors } from './actors.ts';
import { readComposition } from './composition.ts';
import { isRetired } from './decisions.ts';
import { composeSystem } from '../models/compose.ts';
import { knowledgeFor } from '../knowledge.ts';
import { readMarker, listComponents } from './root.ts';
import { sha256 } from '../hash.ts';
import type { ComponentProse, SystemProse } from '../prose/prose.ts';
import type { Ir } from '../prose/ir.ts';
import type { ActorsModel } from './actors.ts';
import type { Composition } from './composition.ts';
import type { CellCfg, ComposedSystem } from '../models/compose.ts';
import type { Knowledge, KnowledgeLookups } from '../knowledge.ts';
import type { ExternalRunner } from './root.ts';

export interface ComponentLoad { kind: 'component'; id: string; dir: string; text: string; prose: ComponentProse; ir: Ir; irHash: string; pendingCalls: string[] }
// What is left of a composition that threw: its error, and nothing to run.
export interface BrokenComposition { errors: string[]; tla: string; cfgs: Record<string, string>; cells: CellCfg[]; module?: undefined; actors?: undefined; components?: undefined; free?: undefined; outside?: undefined; vars?: undefined }
export interface SystemLoad {
  kind: 'system';
  id: string;
  dir: string;
  text: string;
  prose: SystemProse;
  composition: Composition;
  actors: ActorsModel;
  members: Record<string, Ir>;
  memberLoads: Record<string, ComponentLoad | null>;
  composed: ComposedSystem | BrokenComposition;
  extras: string;
  pendingCalls: string[];
}
// When the knowledge base cannot be opened: a stand-in that answers nothing,
// says why, and has no moduleRecords. Its kind is none, as for no knowledge base.
export type KnowledgeStandIn = { kind: 'none'; root: null; error: string } & Omit<KnowledgeLookups, 'moduleRecords'>;
export type LoadedKnowledge = Knowledge | KnowledgeStandIn;

const read = (p: string) => (existsSync(p) ? readFileSync(p, 'utf8') : '');

export function loadComponent(root: string, id: string): ComponentLoad {
  const dir = join(root, 'components', id);
  const text = read(join(dir, 'prose.md'));
  const prose = parseProse(text);
  const ir = compileIR(prose);
  return { kind: 'component', id, dir, text, prose, ir, irHash: sha256(JSON.stringify(ir)).slice(0, 16), pendingCalls: pending(dir) };
}

export function loadAllComponents(root: string): Record<string, ComponentLoad> {
  const out: Record<string, ComponentLoad> = {};
  for (const id of listComponents(root)) out[id] = loadComponent(root, id);
  return out;
}

export function loadSystem(root: string, id: string, { components }: { components?: Record<string, ComponentLoad | null> } = {}): SystemLoad {
  const dir = join(root, 'systems', id);
  const text = read(join(dir, 'prose.md'));
  const prose = parseSystemProse(text);
  const composition = readComposition(dir);
  const actors = readActors(root);
  const all: Record<string, ComponentLoad | null> = { ...components };
  const members: Record<string, Ir> = {};
  // A retired member is absent: it stands in as a component that does not compile, so it is
  // neither read again nor composed, and the composition names a component it does not have.
  const retiredDir = (cid: string) => isRetired(join(root, 'components', cid));
  for (const m of composition.members) {
    if (!all[m.component]) all[m.component] = existsSync(join(root, 'components', m.component, 'prose.md')) ? loadComponent(root, m.component) : null;
    const c = all[m.component];
    if (c && c.ir.ok && retiredDir(m.component)) all[m.component] = { ...c, ir: { ...c.ir, ok: false } };
    if (all[m.component] && all[m.component]!.ir.ok) members[m.component] = all[m.component]!.ir;
  }
  // A sender resolves to an open component; a retired one is named as such.
  const retired = listComponents(root).filter(retiredDir);
  let composed: ComposedSystem | BrokenComposition | null = null;
  try { composed = composeSystem({ name: id, prose, composition, members, actors, components: listComponents(root).filter(cid => !retired.includes(cid)), retired }); } catch (e) { composed = { errors: [(e as Error).message], tla: '', cfgs: {}, cells: [] }; }
  const extras = read(join(dir, 'model', 'extras.tla'));
  return { kind: 'system', id, dir, text, prose, composition, actors, members, memberLoads: Object.fromEntries(Object.keys(members).map(k => [k, all[k]])), composed, extras, pendingCalls: pending(dir) };
}

export function loadActors(root: string): ActorsModel { return readActors(root); }

export function externalsOf(root: string): Record<string, ExternalRunner> {
  const marker = readMarker(root);
  return marker.external && typeof marker.external === 'object' ? marker.external : {};
}

export function knowledgeOf(root: string): LoadedKnowledge {
  try { return knowledgeFor(root); } catch (e) { return { kind: 'none', root: null, error: (e as Error).message, resolve: () => null, edges: () => [], backing: () => ({ status: 'unresolved', reason: (e as Error).message }), observation: () => null, modules: () => [] }; }
}

function pending(dir: string): string[] {
  const calls = join(dir, 'calls');
  return existsSync(calls) ? readdirSync(calls).filter(x => x.endsWith('.md')).sort() : [];
}

// The generated system module with any extras appended before the end line.
export function systemModuleText(system: Pick<SystemLoad, 'composed' | 'extras'>): string {
  if (!system.composed || !system.composed.tla) return '';
  if (!system.extras.trim()) return system.composed.tla;
  return system.composed.tla.replace(/\n=+\n$/, `\n\\* extras.tla, hand-written:\n${system.extras.trim()}\n${'='.repeat(70)}\n`);
}
