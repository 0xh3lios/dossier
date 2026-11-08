// Reading one dossier whole: a part's prose and IR, or a composition's prose,
// wiring, members and generated model.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseProse, parseCompositionProse } from '../prose/prose.ts';
import { compileIR } from '../prose/ir.ts';
import { readActors } from './actors.ts';
import { readWiring } from './wiring.ts';
import { isRetired } from './decisions.ts';
import { composeMembers } from '../models/compose.ts';
import { knowledgeFor } from '../knowledge.ts';
import { readMarker, listParts } from './root.ts';
import { sha256 } from '../hash.ts';
import type { PartProse, CompositionProse } from '../prose/prose.ts';
import type { Ir } from '../prose/ir.ts';
import type { ActorsModel } from './actors.ts';
import type { Wiring } from './wiring.ts';
import type { CellCfg, Composed } from '../models/compose.ts';
import type { Knowledge, KnowledgeLookups } from '../knowledge.ts';
import type { ExternalRunner } from './root.ts';

export interface PartLoad { kind: 'part'; id: string; dir: string; text: string; prose: PartProse; ir: Ir; irHash: string; pendingCalls: string[] }
// What is left of a wiring that threw: its error, and nothing to run.
export interface BrokenWiring { errors: string[]; tla: string; cfgs: Record<string, string>; cells: CellCfg[]; module?: undefined; actors?: undefined; parts?: undefined; free?: undefined; outside?: undefined; vars?: undefined }
export interface CompositionLoad {
  kind: 'composition';
  id: string;
  dir: string;
  text: string;
  prose: CompositionProse;
  wiring: Wiring;
  actors: ActorsModel;
  members: Record<string, Ir>;
  memberLoads: Record<string, PartLoad | null>;
  composed: Composed | BrokenWiring;
  extras: string;
  pendingCalls: string[];
}
// When the knowledge base cannot be opened: a stand-in that answers nothing,
// says why, and has no moduleRecords. Its kind is none, as for no knowledge base.
export type KnowledgeStandIn = { kind: 'none'; root: null; error: string } & Omit<KnowledgeLookups, 'moduleRecords'>;
export type LoadedKnowledge = Knowledge | KnowledgeStandIn;

const read = (p: string) => (existsSync(p) ? readFileSync(p, 'utf8') : '');

export function loadPart(root: string, id: string): PartLoad {
  const dir = join(root, 'parts', id);
  const text = read(join(dir, 'prose.md'));
  const prose = parseProse(text);
  const ir = compileIR(prose);
  return { kind: 'part', id, dir, text, prose, ir, irHash: sha256(JSON.stringify(ir)).slice(0, 16), pendingCalls: pending(dir) };
}

export function loadAllParts(root: string): Record<string, PartLoad> {
  const out: Record<string, PartLoad> = {};
  for (const id of listParts(root)) out[id] = loadPart(root, id);
  return out;
}

export function loadComposition(root: string, id: string, { parts }: { parts?: Record<string, PartLoad | null> } = {}): CompositionLoad {
  const dir = join(root, 'compositions', id);
  const text = read(join(dir, 'prose.md'));
  const prose = parseCompositionProse(text);
  const wiring = readWiring(dir);
  const actors = readActors(root);
  const all: Record<string, PartLoad | null> = { ...parts };
  const members: Record<string, Ir> = {};
  // A retired member is absent: it stands in as a part that does not compile, so it is
  // neither read again nor composed, and the wiring names a part it does not have.
  const retiredDir = (cid: string) => isRetired(join(root, 'parts', cid));
  for (const m of wiring.members) {
    if (!all[m.part]) all[m.part] = existsSync(join(root, 'parts', m.part, 'prose.md')) ? loadPart(root, m.part) : null;
    const c = all[m.part];
    if (c && c.ir.ok && retiredDir(m.part)) all[m.part] = { ...c, ir: { ...c.ir, ok: false } };
    if (all[m.part] && all[m.part]!.ir.ok) members[m.part] = all[m.part]!.ir;
  }
  // A sender resolves to an open part; a retired one is named as such.
  const retired = listParts(root).filter(retiredDir);
  let composed: Composed | BrokenWiring | null = null;
  try { composed = composeMembers({ name: id, prose, wiring, members, actors, parts: listParts(root).filter(cid => !retired.includes(cid)), retired }); } catch (e) { composed = { errors: [(e as Error).message], tla: '', cfgs: {}, cells: [] }; }
  const extras = read(join(dir, 'model', 'extras.tla'));
  return { kind: 'composition', id, dir, text, prose, wiring, actors, members, memberLoads: Object.fromEntries(Object.keys(members).map(k => [k, all[k]])), composed, extras, pendingCalls: pending(dir) };
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

// The generated composition module with any extras appended before the end line.
export function compositionModuleText(composition: Pick<CompositionLoad, 'composed' | 'extras'>): string {
  if (!composition.composed || !composition.composed.tla) return '';
  if (!composition.extras.trim()) return composition.composed.tla;
  return composition.composed.tla.replace(/\n=+\n$/, `\n\\* extras.tla, hand-written:\n${composition.extras.trim()}\n${'='.repeat(70)}\n`);
}
