// dossier where <ref>: what a component, system, property, scenario, actor or
// knowledge record touches, read from the dossiers as they stand. A retired
// dossier touches nothing: where says a retired component or system is retired.
import { join } from 'node:path';
import { findRoot, stripRootArgs, listComponents, listSystems } from '../dossiers/root.ts';
import { loadComponent, loadActors, loadSystem } from '../dossiers/load.ts';
import { isRetired } from '../dossiers/decisions.ts';
import { actorId } from '../dossiers/actors.ts';
import { parseRef } from '../knowledge.ts';
import type { SystemLoad } from '../dossiers/load.ts';
import type { CellCfg } from '../models/compose.ts';

export async function main(command: string, args: string[]): Promise<number> {
  const root = findRoot(args);
  if (!root) { console.error('dossier where: no dossiers root here. Run dossier setup.'); return 2; }
  const given = stripRootArgs(args).filter(a => !a.startsWith('--'))[0];
  if (!given) { console.error('usage: dossier where <component|system|property|scenario|actor|module#type:id>'); return 2; }
  // A dossier may be named by its path under the root, `components/<id>` or `systems/<id>`, as the other
  // commands print it; then only that kind of dossier answers.
  const path = given.match(/^(components|systems)\/([^/#]+)$/);
  const ref = path ? path[2] : given, only = path ? path[1] : null;
  const retired = (kind: 'components' | 'systems', id: string) => isRetired(join(root, kind, id));
  const componentIds = listComponents(root), systemIds = listSystems(root);
  // A retired dossier is named as such and touches nothing; whatever else shares its id still answers.
  const lines: string[] = [];
  if (only !== 'systems' && componentIds.includes(ref) && retired('components', ref)) lines.push(`component ${ref}: retired`);
  if (only !== 'components' && systemIds.includes(ref) && retired('systems', ref)) lines.push(`system ${ref}: retired`);
  const components = Object.fromEntries(componentIds.filter(id => !retired('components', id)).map(id => [id, loadComponent(root, id)]));
  const systems = systemIds.filter(id => !retired('systems', id)).map(id => loadSystem(root, id, { components }));
  const actors = loadActors(root);
  const cellsOf = (s: SystemLoad, pred: (c: CellCfg) => boolean) => s.composed.cells.filter(pred).map(c => `${c.property}×${c.scenario}`);

  if (only !== 'systems' && components[ref]) {
    const c = components[ref];
    lines.push(`component ${ref}: module ${c.ir.module || '?'}, tier ${c.ir.tier}, ${c.ir.hashes ? Object.keys(c.ir.hashes).length : 0} passages`);
    for (const s of systems) {
      const m = s.composition.members.find(x => x.component === ref);
      if (m) lines.push(`  in ${s.id} as ${m.role}: cells ${cellsOf(s, () => true).join(' ') || 'none'}`);
    }
    const wired = systems.flatMap(s => s.composition.wiring.filter(w => w.effect.component === ref || w.event.component === ref).map(w => `${s.id}: ${w.effect.component}.${w.effect.name} → ${w.event.component}.${w.event.name}`));
    if (wired.length) lines.push(`  wiring: ${wired.join(' · ')}`);
    for (const other of Object.values(components)) if (other.id !== ref) for (const ev of other.ir.events || []) if (actorId(ev.sender) === ref) lines.push(`  sends ${ev.name} to ${other.id} (${ev.id})`);
    for (const s of systems) {
      const events = (s.composed.free || []).filter(x => x.from === ref).map(x => x.event);
      if (events.length) lines.push(`  free in ${s.id}: ${events.join(', ')}`);
    }
    const seams = Object.values(components).filter(o => o.id !== ref && o.ir.seams.some(x => x.piece === ref || x.piece === c.ir.name)).map(o => o.id);
    if (seams.length) lines.push(`  seams named by: ${seams.join(', ')}`);
  }
  const system = only === 'components' ? undefined : systems.find(s => s.id === ref);
  if (system) {
    // A system: its members and their roles, its properties and scenarios, and the cells they make.
    lines.push(`system ${ref}: members ${system.composition.members.map(m => `${m.component} as ${m.role}`).join(', ') || 'none'}`);
    lines.push(`  properties ${system.prose.properties.map(p => p.id).join(' ') || 'none'}; scenarios ${system.composition.scenarios.join(' ') || 'all-honest'}`);
    lines.push(`  cells ${cellsOf(system, () => true).join(' ') || 'none'}`);
    const wired = system.composition.wiring.map(w => `${w.effect.component}.${w.effect.name} → ${w.event.component}.${w.event.name}`);
    if (wired.length) lines.push(`  wiring: ${wired.join(' · ')}`);
    const free = (system.composed.free || []).map(x => `${x.event} from ${x.from}`);
    if (free.length) lines.push(`  free: ${free.join(', ')}`);
  }
  // A dossier's path names that dossier and nothing else.
  if (only) {
    if (!lines.length) { console.log(`nothing under ${root} names ${given}`); return 1; }
    for (const l of lines) console.log(l);
    return 0;
  }
  const [sysPart, propPart] = ref.includes('#') && !parseRef(ref) ? ref.split('#') : [null, null];
  for (const s of systems) {
    const props = s.prose.properties.filter(p => p.id === ref || (sysPart === s.id && p.id === propPart));
    for (const p of props) lines.push(`property ${s.id}#${p.id}: cells ${cellsOf(s, c => c.property === p.id).join(' ') || 'none'}; members ${s.composition.members.map(m => m.component).join(', ')}`);
  }
  if (actors.scenarioById[ref]) {
    const sc = actors.scenarioById[ref];
    // A mode with a window holds from one tick until another, or from one tick on.
    const modeText = (a: string, m: string) => { const w = sc.windows[a]; return w ? `${a} ${m} from ${w.from}${w.until === null ? '' : ` until ${w.until}`}` : `${a} ${m}`; };
    const starts = Object.entries(sc.start).map(([name, value]) => `${name} ${value}`).join(', ');
    lines.push(`scenario ${ref}: ${Object.entries(sc.modes).map(([a, m]) => modeText(a, m)).join(', ') || 'every actor honest'}${starts ? `; starts ${starts}` : ''}${sc.strongerThan.length ? `; stronger than ${sc.strongerThan.join(', ')}` : ''}`);
    for (const s of systems) { const cells = cellsOf(s, c => c.scenario === ref); if (cells.length) lines.push(`  in ${s.id}: ${cells.join(' ')}`); }
  }
  if (actors.byId[ref]) {
    const a = actors.byId[ref];
    lines.push(`actor ${ref} (${a.kind}, modes ${a.modes.join('/')})`);
    if (a.pins.length) lines.push(`  pins: ${a.pins.join(', ')}`);
    for (const c of Object.values(components)) for (const ev of c.ir.events || []) if (actorId(ev.sender) === ref) lines.push(`  sends ${ev.name} to ${c.id} (${ev.id})`);
    for (const sc of actors.scenarios) {
      if (!sc.modes[ref]) continue;
      const w = sc.windows && sc.windows[ref];
      lines.push(`  ${sc.modes[ref]}${w ? ` from ${w.from}${w.until === null ? '' : ` until ${w.until}`}` : ''} in ${sc.id}`);
    }
  }
  const kr = parseRef(ref);
  if (kr) {
    for (const a of actors.actors) if (a.pins.includes(ref)) lines.push(`pinned by actor ${a.id}`);
    for (const s of systems) for (const m of s.composition.members) if (m.pins.includes(ref)) lines.push(`pinned by member ${m.component} of system ${s.id}`);
    for (const c of Object.values(components)) {
      if ((c.ir.pins || []).includes(ref)) lines.push(`pinned by component ${c.id}`);
      // A record backing names the reference itself; a certora or file backing names a path within it.
      for (const k of c.ir.guarantees || []) {
        const b = k.backing;
        if (b && ((b.kind === 'record' && b.ref === ref) || ((b.kind === 'certora' || b.kind === 'file') && ref.includes(b.path)))) lines.push(`backs ${c.id} ${k.id}`);
      }
    }
    for (const c of Object.values(components)) if (c.ir.module === kr.module) {
      lines.push(`module ${kr.module} is abstracted by component ${c.id}`);
      for (const s of systems) if (s.composition.members.some(m => m.component === c.id)) lines.push(`  which is in ${s.id}: cells ${cellsOf(s, () => true).join(' ') || 'none'}`);
    }
  }
  if (!lines.length) { console.log(`nothing under ${root} names ${given}`); return 1; }
  for (const l of lines) console.log(l);
  return 0;
}
