// dossier scaffold <part|composition>: write a part's TLA+ scaffold and
// configurations (once; later runs write <Id>.scaffold.tla beside the hand-refined
// module), or regenerate a composition's module and cfgs under model/generated/.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { findRoot, listParts, stripRootArgs, locate } from '../dossiers/root.ts';
import { loadActors, loadPart, loadComposition, compositionModuleText } from '../dossiers/load.ts';
import { isRetired } from '../dossiers/decisions.ts';
import { cap, scaffoldTla, scaffoldCfgs } from '../models/tla.ts';
import { writeGenerated } from '../models/materialize.ts';

// A part's module name, from its id as a composition's is from its: each hyphenated segment
// capitalized and the segments joined, so pas-finite-key is PasFiniteKey. scaffold names the module
// by it, and dossier call and dossier blunder find the module by it.
export const partModule = (id: string): string => cap(id);

export async function main(command: string, args: string[]): Promise<number> {
  const root = findRoot(args);
  if (!root) { console.error('dossier scaffold: no dossiers root here. Run dossier setup.'); return 2; }
  const name = stripRootArgs(args).filter(a => !a.startsWith('--'))[0];
  if (!name) { console.error('usage: dossier scaffold <part|composition>'); return 2; }
  const where = locate(root, name);
  if (!where) { console.error(`dossier scaffold: no part or composition named ${name} under ${root}`); return 2; }
  const ref = `${where.kind === 'part' ? 'parts' : 'compositions'}/${where.id}`;
  if (isRetired(where.dir)) { console.error(`dossier scaffold: ${ref} is retired; dossier decide ${ref} begin reopens it`); return 2; }
  const written: string[] = [];
  if (where.kind === 'part') {
    const c = loadPart(root, where.id);
    if (!c.ir.ok) { console.error(`dossier scaffold: ${where.id} does not compile:\n  ${c.ir.errors.join('\n  ')}`); return 1; }
    // A prose that compiles may still say no state yet, as a fresh dossier's does.
    if (!c.ir.initial) { console.error(`dossier scaffold: ${where.id} has no State passage for the module to start in`); return 1; }
    const moduleName = partModule(where.id);
    let text: string, cfgs: Record<string, string>;
    // The parts and actors.md decide which events are the chain's ticks, as for a composition.
    try {
      text = scaffoldTla(c.ir, { moduleName, actors: loadActors(root), parts: listParts(root) });
      cfgs = scaffoldCfgs(c.ir, { moduleName });
    } catch (e) { console.error(`dossier scaffold: ${(e as Error).message}`); return 1; }
    // model/ is made only once everything it will hold is known.
    const modelDir = join(c.dir, 'model');
    mkdirSync(modelDir, { recursive: true });
    const main = join(modelDir, `${moduleName}.tla`);
    const target = existsSync(main) ? join(modelDir, `${moduleName}.scaffold.tla`) : main;
    writeFileSync(target, text); written.push(target);
    for (const [n, t] of Object.entries(cfgs)) {
      const p = join(modelDir, n);
      if (!existsSync(p)) { writeFileSync(p, t); written.push(p); }
    }
    if (target !== main) console.log(`${moduleName}.tla exists and was kept; the fresh scaffold is ${moduleName}.scaffold.tla for diffing`);
  } else {
    const s = loadComposition(root, where.id);
    // A passage that does not read is left out of the wiring, so its module would lack it.
    const unread = [...s.prose.errors, ...s.prose.misnamed];
    if (unread.length) { console.error(`dossier scaffold: ${where.id} does not compile:\n  ${unread.join('\n  ')}`); return 1; }
    if (s.composed.errors.length) { console.error(`dossier scaffold: ${where.id} does not compose:\n  ${s.composed.errors.join('\n  ')}`); return 1; }
    const gen = join(s.dir, 'model', 'generated');
    const materialized = writeGenerated(s.dir, s.composed, compositionModuleText(s));
    written.push(...materialized.written.map(name => join(gen, name)));
    for (const name of materialized.removed) console.log(`removed compositions/${where.id}/model/generated/${name}`);
    console.log(`cells: ${s.composed.cells.map(c => `${c.property}×${c.scenario}`).join(' ')}`);
  }
  for (const w of written) console.log(`wrote ${w.replace(root + '/', '')}`);
  return 0;
}
