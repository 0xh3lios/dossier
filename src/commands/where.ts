// dossier where <ref>: what a part, composition, property, scenario, actor or
// knowledge record touches, read from the dossiers as they stand. A retired
// dossier touches nothing: where says a retired part or composition is retired.
import { join } from 'node:path';
import { findRoot, stripRootArgs, listParts, listCompositions } from '../dossiers/root.ts';
import { loadPart, loadActors, loadComposition } from '../dossiers/load.ts';
import { isRetired } from '../dossiers/decisions.ts';
import { actorId } from '../dossiers/actors.ts';
import { parseRef } from '../knowledge.ts';
import type { CompositionLoad } from '../dossiers/load.ts';
import type { CellCfg } from '../models/compose.ts';

export async function main(command: string, args: string[]): Promise<number> {
  const root = findRoot(args);
  if (!root) { console.error('dossier where: no dossiers root here. Run dossier setup.'); return 2; }
  const given = stripRootArgs(args).filter(a => !a.startsWith('--'))[0];
  if (!given) { console.error('usage: dossier where <part|composition|property|scenario|actor|module#type:id>'); return 2; }
  // A dossier may be named by its path under the root, `parts/<id>` or `compositions/<id>`, as the other
  // commands print it; then only that kind of dossier answers.
  const path = given.match(/^(parts|compositions)\/([^/#]+)$/);
  const ref = path ? path[2] : given, only = path ? path[1] : null;
  const retired = (kind: 'parts' | 'compositions', id: string) => isRetired(join(root, kind, id));
  const partIds = listParts(root), compositionIds = listCompositions(root);
  // A retired dossier is named as such and touches nothing; whatever else shares its id still answers.
  const lines: string[] = [];
  if (only !== 'compositions' && partIds.includes(ref) && retired('parts', ref)) lines.push(`part ${ref}: retired`);
  if (only !== 'parts' && compositionIds.includes(ref) && retired('compositions', ref)) lines.push(`composition ${ref}: retired`);
  const parts = Object.fromEntries(partIds.filter(id => !retired('parts', id)).map(id => [id, loadPart(root, id)]));
  const compositions = compositionIds.filter(id => !retired('compositions', id)).map(id => loadComposition(root, id, { parts }));
  const actors = loadActors(root);
  const cellsOf = (s: CompositionLoad, pred: (c: CellCfg) => boolean) => s.composed.cells.filter(pred).map(c => `${c.property}×${c.scenario}`);

  if (only !== 'compositions' && parts[ref]) {
    const c = parts[ref];
    lines.push(`part ${ref}: module ${c.ir.module || '?'}, tier ${c.ir.tier}, ${c.ir.hashes ? Object.keys(c.ir.hashes).length : 0} passages`);
    for (const s of compositions) {
      const m = s.wiring.members.find(x => x.part === ref);
      if (m) lines.push(`  in ${s.id} as ${m.role}: cells ${cellsOf(s, () => true).join(' ') || 'none'}`);
    }
    const wired = compositions.flatMap(s => s.wiring.wiring.filter(w => w.effect.part === ref || w.event.part === ref).map(w => `${s.id}: ${w.effect.part}.${w.effect.name} → ${w.event.part}.${w.event.name}`));
    if (wired.length) lines.push(`  wiring: ${wired.join(' · ')}`);
    for (const other of Object.values(parts)) if (other.id !== ref) for (const ev of other.ir.events || []) if (actorId(ev.sender) === ref) lines.push(`  sends ${ev.name} to ${other.id} (${ev.id})`);
    for (const s of compositions) {
      const events = (s.composed.free || []).filter(x => x.from === ref).map(x => x.event);
      if (events.length) lines.push(`  free in ${s.id}: ${events.join(', ')}`);
    }
    const seams = Object.values(parts).filter(o => o.id !== ref && o.ir.seams.some(x => x.piece === ref || x.piece === c.ir.name)).map(o => o.id);
    if (seams.length) lines.push(`  seams named by: ${seams.join(', ')}`);
  }
  const composition = only === 'parts' ? undefined : compositions.find(s => s.id === ref);
  if (composition) {
    // A composition: its members and their roles, its properties and scenarios, and the cells they make.
    lines.push(`composition ${ref}: members ${composition.wiring.members.map(m => `${m.part} as ${m.role}`).join(', ') || 'none'}`);
    lines.push(`  properties ${composition.prose.properties.map(p => p.id).join(' ') || 'none'}; scenarios ${composition.wiring.scenarios.join(' ') || 'all-honest'}`);
    lines.push(`  cells ${cellsOf(composition, () => true).join(' ') || 'none'}`);
    const wired = composition.wiring.wiring.map(w => `${w.effect.part}.${w.effect.name} → ${w.event.part}.${w.event.name}`);
    if (wired.length) lines.push(`  wiring: ${wired.join(' · ')}`);
    const free = (composition.composed.free || []).map(x => `${x.event} from ${x.from}`);
    if (free.length) lines.push(`  free: ${free.join(', ')}`);
  }
  // A dossier's path names that dossier and nothing else.
  if (only) {
    if (!lines.length) { console.log(`nothing under ${root} names ${given}`); return 1; }
    for (const l of lines) console.log(l);
    return 0;
  }
  const [sysPart, propPart] = ref.includes('#') && !parseRef(ref) ? ref.split('#') : [null, null];
  for (const s of compositions) {
    const props = s.prose.properties.filter(p => p.id === ref || (sysPart === s.id && p.id === propPart));
    for (const p of props) lines.push(`property ${s.id}#${p.id}: cells ${cellsOf(s, c => c.property === p.id).join(' ') || 'none'}; members ${s.wiring.members.map(m => m.part).join(', ')}`);
  }
  if (actors.scenarioById[ref]) {
    const sc = actors.scenarioById[ref];
    // A mode with a window holds from one tick until another, or from one tick on.
    const modeText = (a: string, m: string) => { const w = sc.windows[a]; return w ? `${a} ${m} from ${w.from}${w.until === null ? '' : ` until ${w.until}`}` : `${a} ${m}`; };
    const starts = Object.entries(sc.start).map(([name, value]) => `${name} ${value}`).join(', ');
    lines.push(`scenario ${ref}: ${Object.entries(sc.modes).map(([a, m]) => modeText(a, m)).join(', ') || 'every actor honest'}${starts ? `; starts ${starts}` : ''}${sc.strongerThan.length ? `; stronger than ${sc.strongerThan.join(', ')}` : ''}`);
    for (const s of compositions) { const cells = cellsOf(s, c => c.scenario === ref); if (cells.length) lines.push(`  in ${s.id}: ${cells.join(' ')}`); }
  }
  if (actors.byId[ref]) {
    const a = actors.byId[ref];
    lines.push(`actor ${ref} (${a.kind}, modes ${a.modes.join('/')})`);
    if (a.pins.length) lines.push(`  pins: ${a.pins.join(', ')}`);
    for (const c of Object.values(parts)) for (const ev of c.ir.events || []) if (actorId(ev.sender) === ref) lines.push(`  sends ${ev.name} to ${c.id} (${ev.id})`);
    for (const sc of actors.scenarios) {
      if (!sc.modes[ref]) continue;
      const w = sc.windows && sc.windows[ref];
      lines.push(`  ${sc.modes[ref]}${w ? ` from ${w.from}${w.until === null ? '' : ` until ${w.until}`}` : ''} in ${sc.id}`);
    }
  }
  const kr = parseRef(ref);
  if (kr) {
    for (const a of actors.actors) if (a.pins.includes(ref)) lines.push(`pinned by actor ${a.id}`);
    for (const s of compositions) for (const m of s.wiring.members) if (m.pins.includes(ref)) lines.push(`pinned by member ${m.part} of composition ${s.id}`);
    for (const c of Object.values(parts)) {
      if ((c.ir.pins || []).includes(ref)) lines.push(`pinned by part ${c.id}`);
      // A record backing names the reference itself; a certora or file backing names a path within it.
      for (const k of c.ir.guarantees || []) {
        const b = k.backing;
        if (b && ((b.kind === 'record' && b.ref === ref) || ((b.kind === 'certora' || b.kind === 'file') && ref.includes(b.path)))) lines.push(`backs ${c.id} ${k.id}`);
      }
    }
    for (const c of Object.values(parts)) if (c.ir.module === kr.module) {
      lines.push(`module ${kr.module} is abstracted by part ${c.id}`);
      for (const s of compositions) if (s.wiring.members.some(m => m.part === c.id)) lines.push(`  which is in ${s.id}: cells ${cellsOf(s, () => true).join(' ') || 'none'}`);
    }
  }
  if (!lines.length) { console.log(`nothing under ${root} names ${given}`); return 1; }
  for (const l of lines) console.log(l);
  return 0;
}
