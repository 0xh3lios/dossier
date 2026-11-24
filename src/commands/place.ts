// dossier place <dossier> <component> [--select <behavior>[/C<n>]]... [--parent <group>] [--title <words> --lead <words>]
// dossier place <dossier> <component> --remove
// dossier place --group <id> [--parent <group>] --title <words> --lead <words>
//
// Places a dossier at a component of the map, the block the root's README begins with, or takes it away,
// and creates a missing component or group given its parent, title and lead. It rewrites the block alone,
// as canonical JSON, under the root lock, and leaves the rest of the README byte for byte as it was. The
// map is authored: place writes no evidence and runs no verify, and a placement binds no review.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { findRoot, locate, UsageError } from '../dossiers/root.ts';
import { isRetired } from '../dossiers/decisions.ts';
import { withPublicationLock } from '../dossiers/publication.ts';
import { loadBehaviorCollection, BEHAVIOR_ID } from '../behaviors/records.ts';
import { README, READING, readRootMap, refOf, writeMapBlock } from '../dossiers/map.ts';
import type { CommandContext } from '../cli.ts';
import type { DossierMap, MapComponent, MapEntry, MapGroup } from '../dossiers/map.ts';

const VALUED = ['--select', '--parent', '--title', '--lead', '--group', '--root'];
const FLAGS = ['--remove'];

interface Options { positional: string[]; select: string[]; parent: string | null; title: string | null; lead: string | null; group: string | null; remove: boolean }
function options(args: string[]): Options {
  const o: Options = { positional: [], select: [], parent: null, title: null, lead: null, group: null, remove: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (FLAGS.includes(a)) { o.remove = true; continue; }
    if (VALUED.includes(a)) {
      const v = args[++i];
      if (v === undefined) throw new UsageError(`${a} takes a value`);
      if (a === '--select') o.select.push(v);
      else if (a === '--parent') o.parent = v;
      else if (a === '--title') o.title = v;
      else if (a === '--lead') o.lead = v;
      else if (a === '--group') o.group = v;
      continue;
    }
    if (a.startsWith('--')) throw new UsageError(`unknown option ${a}`);
    o.positional.push(a);
  }
  return o;
}
const id = (x: string, what: string) => { if (!BEHAVIOR_ID.test(x)) throw new UsageError(`${JSON.stringify(x)} is not a ${what} id: use lowercase letters and digits joined by single hyphens, starting with a letter`); return x; };
const words = (x: string | null, what: string) => { if (x !== null && (!x.trim() || /[\r\n]/.test(x))) throw new UsageError(`${what} must be one nonempty line`); return x; };

type Node = { kind: 'group'; node: MapGroup; parent: MapGroup | null } | { kind: 'component'; node: MapComponent; parent: MapGroup | null };
// Every node of the map, by id, with its parent group, or null at the top.
function nodes(map: DossierMap): Map<string, Node> {
  const out = new Map<string, Node>();
  const walk = (holder: { groups?: MapGroup[]; components?: MapComponent[] }, parent: MapGroup | null) => {
    for (const g of holder.groups || []) { out.set(g.id, { kind: 'group', node: g, parent }); walk(g, g); }
    for (const c of holder.components || []) out.set(c.id, { kind: 'component', node: c, parent });
  };
  walk(map, null);
  return out;
}

export async function main(_command: string, args: string[], _context: CommandContext): Promise<number> {
  const root = findRoot(args);
  if (!root) throw new UsageError('no dossiers root here. Run dossier setup.');
  const o = options(args);
  words(o.title, '--title'); words(o.lead, '--lead');
  if (o.parent !== null) id(o.parent, 'group');
  if (!existsSync(join(root, README))) throw new UsageError(`no ${README} at the root, which holds the map; dossier setup writes one with an empty map`);

  return withPublicationLock(root, () => {
    const read = readRootMap(root);
    if (read.error || !read.map) { console.error(`dossier place: the map does not read, so it is not rewritten: ${read.error}; fix the block ${README} begins with`); return 1; }
    const map = read.map;
    const all = nodes(map);
    // What the command did, said once the block is written.
    const said: string[] = [];
    // A README that would not read once rewritten is left as it is, and the reason said, as for a malformed map.
    const finish = () => {
      try { writeMapBlock(root, map); } catch (e) { console.error(`dossier place: ${(e as Error).message}`); return 1; }
      for (const line of said) console.log(line);
      return 0;
    };
    // A node named for creation either exists as given, so the same command can run twice, or is created.
    const ensure = (kind: 'group' | 'component', nodeId: string): Node | null => {
      const found = all.get(nodeId);
      if (found) {
        if (found.kind !== kind) throw new UsageError(`${nodeId} is a ${found.kind} in the map, not a ${kind}${kind === 'component' ? '; a dossier is placed at a component' : ''}`);
        if (o.title !== null && o.title !== found.node.title) throw new UsageError(`${kind} ${nodeId} exists with the title ${JSON.stringify(found.node.title)}; edit the map to rename it`);
        if (o.lead !== null && o.lead !== found.node.lead) throw new UsageError(`${kind} ${nodeId} exists with another lead; edit the map to change it`);
        if (o.parent !== null && found.parent?.id !== o.parent) throw new UsageError(`${kind} ${nodeId} exists ${found.parent ? `under ${found.parent.id}` : 'at the top'}, not under ${o.parent}`);
        return found;
      }
      if (o.title === null || o.lead === null) throw new UsageError(`no ${kind} ${nodeId} in the map; give --title and --lead, and --parent unless it goes at the top, to create it`);
      let holder: { groups?: MapGroup[]; components?: MapComponent[] } = map;
      if (o.parent !== null) {
        const parent = all.get(o.parent);
        if (!parent) throw new UsageError(`no group ${o.parent} in the map to hold ${nodeId}`);
        if (parent.kind !== 'group') throw new UsageError(`${o.parent} is a component, and a component holds no node`);
        holder = parent.node;
      }
      if (kind === 'group') {
        const node: MapGroup = { id: nodeId, title: o.title, lead: o.lead };
        (holder.groups ||= []).push(node);
        said.push(`created group ${nodeId} ${o.parent ? `under ${o.parent}` : 'at the top'}`);
        return null;
      }
      const node: MapComponent = { id: nodeId, title: o.title, lead: o.lead, dossiers: [] };
      (holder.components ||= []).push(node);
      said.push(`created component ${nodeId} ${o.parent ? `under ${o.parent}` : 'at the top'}`);
      return { kind: 'component', node, parent: null };
    };

    if (o.group !== null) {
      if (o.positional.length || o.select.length || o.remove) throw new UsageError('--group creates a group and takes no dossier, component, --select or --remove');
      id(o.group, 'group');
      if (ensure('group', o.group)) said.push(`kept group ${o.group}`);
      return finish();
    }

    if (o.positional.length !== 2) throw new UsageError('place takes a dossier and a component: dossier place <dossier> <component>');
    const [name, componentId] = o.positional;
    id(componentId, 'component');
    const where = locate(root, name);
    // A dossier no longer under the root can still be taken away, by the ref the map names it with.
    const ref = where ? `${where.kind}s/${where.id}` : /^(?:parts|compositions)\//.test(name) ? name : null;
    if (o.remove) {
      if (o.select.length || o.title !== null || o.lead !== null || o.parent !== null) throw new UsageError('--remove takes no --select, --title, --lead or --parent');
      const found = all.get(componentId);
      if (!found || found.kind !== 'component') throw new UsageError(`no component ${componentId} in the map`);
      const at = ref ? found.node.dossiers.findIndex(e => refOf(e) === ref) : -1;
      if (at < 0) throw new UsageError(`${ref || name} is not at ${componentId}`);
      found.node.dossiers.splice(at, 1);
      said.push(`removed ${ref} from ${componentId}`);
      return finish();
    }
    if (!where) throw new UsageError(`no part or composition named ${name} under ${root}`);
    if (isRetired(where.dir)) throw new UsageError(`${ref} is retired; dossier decide ${ref} begin reopens it`);
    // Each selected behavior or claim is one the dossier's collection holds.
    const unique = new Set(o.select);
    if (unique.size !== o.select.length) throw new UsageError('--select names one behavior or claim twice');
    if (o.select.length) {
      const collection = loadBehaviorCollection(where.dir);
      for (const s of o.select) {
        if (!READING.test(s)) throw new UsageError(`--select ${s}: name a behavior, or a claim as <behavior>/C<n>`);
        const [behavior, claim] = s.split('/');
        const b = collection.behaviors.find(x => x.record.id === behavior);
        if (!b) throw new UsageError(`--select ${s}: ${ref} has no behavior ${behavior}`);
        if (claim && !b.record.claims.some(c => c.id === claim)) throw new UsageError(`--select ${s}: ${ref}#${behavior} has no claim ${claim}`);
      }
    }
    const component = ensure('component', componentId)!.node as MapComponent;
    const entry: MapEntry = o.select.length ? { ref: ref!, select: o.select } : ref!;
    const at = component.dossiers.findIndex(e => refOf(e) === ref);
    const same = at >= 0 && JSON.stringify(component.dossiers[at]) === JSON.stringify(entry);
    if (at >= 0) component.dossiers[at] = entry; else component.dossiers.push(entry);
    said.push(`${same ? 'kept' : 'placed'} ${ref}${o.select.length ? ` (${o.select.join(', ')})` : ''} in ${componentId}`);
    return finish();
  });
}
