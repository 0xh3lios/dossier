// Verification derives conclusions without writes. Explicit render writes the
// ledgers and the index, which are views. Retired records keep their integrity
// obligations even when omitted from views.
import { existsSync, lstatSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { dossierDirProblem, findRoot, listComponents, listSystems, readMarker, stripRootArgs } from '../dossiers/root.ts';
import { loadActors, loadComponent, knowledgeOf } from '../dossiers/load.ts';
import { readComposition } from '../dossiers/composition.ts';
import { analyzeComponent, analyzeSystem, seamsOf } from '../verify/analyze.ts';
import { forgottenAnswers, isRetired, parseDecisions } from '../dossiers/decisions.ts';
import { readIntegrity, storageProblem } from '../dossiers/integrity.ts';
import { evidenceNotes, readEvidence } from '../trials/answers.ts';
import { routeRoot } from '../verify/route.ts';
import { briefLines, renderComponentLedger, renderIndex, renderSystemLedger, rootLines, verifyLine } from '../verify/render.ts';
import type { CommandContext } from '../cli.ts';
import type { ActorsModel } from '../dossiers/actors.ts';
import type { ComponentLoad, LoadedKnowledge } from '../dossiers/load.ts';
import type { Analysis, AnswerRow, ComponentAnalysis, SystemAnalysis } from '../verify/analyze.ts';
import type { Route } from '../verify/route.ts';
import type { Note } from '../verify/tripwires.ts';

// Every dossier under a root, analyzed; the root's next loop; the ones asked for; and the
// tripwires of the root itself.
export interface Verified { components: ComponentAnalysis[]; systems: SystemAnalysis[]; route: Route; selected: Analysis[]; knowledge: LoadedKnowledge; actors: ActorsModel; tripwires: Note[] }
// What `dossier verify --json` prints: the verify line, the root's next loop, the root's tripwires, and
// each dossier's standing, with one row for each answer in its evidence/ that reads.
export interface VerifyJson {
  verify: string;
  route: Route;
  tripwires: Note[];
  components: (Pick<ComponentAnalysis, 'id' | 'title' | 'tier' | 'summary' | 'marks' | 'backing' | 'tripwires' | 'flags' | 'route'> & { answers: AnswerRow[] })[];
  systems: (Pick<SystemAnalysis, 'id' | 'title' | 'summary' | 'cells' | 'walks' | 'propertyHeld' | 'closureMissing' | 'tripwires' | 'flags' | 'route'> & { answers: AnswerRow[] })[];
}

// The earlier view, read only from a regular file of its own: a link or anything else reads as none.
const previous = (path: string): string | null => { try { return lstatSync(path).isFile() ? readFileSync(path, 'utf8') : null; } catch { return null; } };
// A view is a file of its own. A symbolic or hard link standing where one belongs is removed and the view
// written in its place, so render never writes through it into a record.
const keep = (path: string, text: string) => {
  let stat = null;
  try { stat = lstatSync(path); } catch { /* No view yet. */ }
  if (stat && (stat.isSymbolicLink() || stat.nlink > 1)) unlinkSync(path);
  else if (previous(path) === text) return false;
  writeFileSync(path, text);
  return true;
};

export function verifyAll({ root, version, wanted = [], write = false }: { root: string; version: string; wanted?: string[]; write?: boolean }): Verified {
  const marker = readMarker(root);
  // The root's own tripwires: dossier.json that does not read, or names a storage format other than integrity-v1.
  const tripwires: Note[] = [];
  const trip = (name: string, where: string) => tripwires.push({ name, where });
  const storage = storageProblem(root);
  if (marker.error) trip('malformed marker', marker.error);
  else if (storage) trip('integrity unavailable', storage);
  const indexPath = join(root, 'index.md');
  const knowledge = knowledgeOf(root);
  const actors = loadActors(root);
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  // A retired dossier is not analyzed, indexed or routed; a system that names one lacks that member,
  // and a component whose sender is one is told so.
  const allComponents = listComponents(root);
  const retiredIds = allComponents.filter(id => isRetired(join(root, 'components', id)));
  const componentIds = allComponents.filter(id => !retiredIds.includes(id));
  const systemIds = listSystems(root).filter(id => !isRetired(join(root, 'systems', id)));
  // A missing authored file cannot make a record disappear from integrity checking. No root
  // inventory is persisted: visible dossier folders define this boundary, including retired
  // and otherwise un-loadable records.
  for (const kind of ['components', 'systems'] as const) {
    const parent = join(root, kind);
    if (!existsSync(parent)) continue;
    for (const id of readdirSync(parent).filter(name => !name.startsWith('.') && !name.startsWith('_') && statSync(join(parent, name)).isDirectory()).sort()) {
      const ref = `${kind}/${id}`, dir = join(parent, id);
      const required = kind === 'components' ? ['prose.md'] : ['prose.md', 'composition.md'];
      const missing = required.filter(name => !existsSync(join(dir, name)));
      for (const name of missing) trip('authored input missing', `${ref}/${name}`);
      const analyzed = kind === 'components' ? componentIds.includes(id) : systemIds.includes(id);
      if (analyzed) continue;
      const record = readIntegrity(dir, root);
      for (const problem of record.problems) trip(problem.name, `${ref}: ${problem.where}`);
      const evidence = readEvidence(dir, record.manifest ? record.manifest.evidence : null, forgottenAnswers(parseDecisions(record.decisions).decisions), ref);
      for (const note of evidenceNotes(evidence)) trip(note.name, `${ref}/${note.where}`);
    }
  }
  // Without the version it was set up with, nothing says the plugin was updated.
  const setUp = marker.error && !marker.plugin ? undefined : marker;
  const loaded: Record<string, ComponentLoad> = {};
  for (const id of componentIds) loaded[id] = loadComponent(root, id);
  const usedBy: Record<string, string[]> = Object.fromEntries(componentIds.map(id => [id, []]));
  for (const sid of systemIds) for (const m of readComposition(join(root, 'systems', sid)).members) if (usedBy[m.component]) usedBy[m.component].push(sid);
  const others = seamsOf(loaded);
  // With no system to report actors.md and scenarios.md, the first open component reports them.
  const reportActors = systemIds.length === 0;
  const components = componentIds.map(id => analyzeComponent({ root, id, loaded: loaded[id], knowledge, pluginVersion: version, marker: setUp, actors, others: others.filter(o => o.id !== id), usedBy: usedBy[id], components: componentIds, retired: retiredIds, reportActors }));
  const systems = systemIds.map(id => analyzeSystem({ root, id, components: loaded, knowledge, pluginVersion: version, marker: setUp }));
  const route = routeRoot(components, systems, tripwires);
  // render writes the views and nothing else: no evidence, no decision, no generated model.
  if (write) {
    // A dossier folder that is a link to one elsewhere gets no ledger: render writes only inside the root.
    const outside = (dir: string) => { const problem = dossierDirProblem(root, dir); if (problem) console.error(`dossier render: ${problem}; its ledger is not written`); return Boolean(problem); };
    for (const a of components) { const path = join(a.dir, 'ledger.md'); if (!outside(a.dir)) keep(path, renderComponentLedger(a, { version, now, previous: previous(path) })); }
    for (const a of systems) { const path = join(a.dir, 'ledger.md'); if (!outside(a.dir)) keep(path, renderSystemLedger(a, { version, now, previous: previous(path) })); }
    keep(indexPath, renderIndex({ components, systems, version, now, route, previous: previous(indexPath), rootTrips: tripwires }));
  }
  const selected = [...components, ...systems].filter(a => wanted.length === 0 || wanted.includes(a.id) || wanted.includes(a.ref));
  return { components, systems, route, selected, knowledge, actors, tripwires };
}

export async function main(command: string, args: string[], { root: pluginRoot, version }: CommandContext): Promise<number> {
  const brief = args.includes('--brief');
  const json = args.includes('--json');
  const root = findRoot(args);
  if (!root) { console.error('dossier: no dossiers root here (a folder holding dossier.json, or dossiers/dossier.json above the working directory). Run dossier setup.'); return 2; }
  const wanted = stripRootArgs(args).filter(a => !a.startsWith('--'));
  const r = verifyAll({ root, version, wanted, write: command === 'render' });
  const all = [...r.components, ...r.systems];
  const failed = r.tripwires.length > 0 || all.some(a => a.tripwires.length);
  if (json) { console.log(JSON.stringify({ verify: verifyLine(all, version, r.tripwires), route: r.route, tripwires: r.tripwires, components: r.components.map(a => ({ id: a.id, title: a.title, tier: a.tier, summary: a.summary, marks: a.marks, backing: a.backing, tripwires: a.tripwires, flags: a.flags, route: a.route, answers: a.answerRows })), systems: r.systems.map(a => ({ id: a.id, title: a.title, summary: a.summary, cells: a.cells, walks: a.walks, propertyHeld: a.propertyHeld, closureMissing: a.closureMissing, tripwires: a.tripwires, flags: a.flags, route: a.route, answers: a.answerRows })) } satisfies VerifyJson, null, 2)); return failed ? 1 : 0; }
  console.log(verifyLine(all, version, r.tripwires));
  if (all.length === 0 && !failed) return 0;
  // In a prompt, --brief names only the dossiers that owe something; a dossier asked for by name is always shown.
  const shown = brief && wanted.length === 0 ? r.selected.filter(a => a.route.pass !== 'Report') : r.selected;
  for (const a of shown) for (const line of briefLines(a)) console.log(line);
  for (const line of rootLines(r.route, pluginRoot)) console.log(line);
  if (!brief) {
    console.log(`index: ${join(root, 'index.md')}`);
    for (const t of r.tripwires) console.log(`tripwire: ${t.name}: ${t.where}`);
    for (const a of all) for (const t of a.tripwires) console.log(`tripwire: ${a.title}: ${t.name}: ${t.where}`);
  }
  return failed ? 1 : 0;
}
