// Draw one part: compile the prose, build the machine, explore, check,
// and write the intermediate form and the grid. Unrecorded; the chart trial records the same run.
import { existsSync, lstatSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { parseProse } from '../prose/prose.ts';
import { compileIR } from '../prose/ir.ts';
import { Unevaluable, buildMachine, unevaluableIn } from './machine.ts';
import { explore } from './explore.ts';
import { runChecks } from './checks.ts';
import { gridMarkdown } from './picture.ts';
import type { PartProse } from '../prose/prose.ts';
import type { Ir } from '../prose/ir.ts';
import type { XState } from './machine.ts';
import type { XStateGraph } from './explore.ts';
import type { ChartChecks } from './checks.ts';

// A package found on disk, and its version.
export interface FoundModule { dir: string; version: string }
// xstate and @xstate/graph as loaded, with their versions; error when either is missing.
export interface Runtime { error?: string; xstate?: XState; graph?: XStateGraph; versions?: Record<string, string> }
// The chart's checks as run, or why they could not run. exceeded says the exploration passed its
// limit on distinct states, with the remedy; the run then fails, limitHit is set and no check runs.
// unevaluable names a condition or a change that cannot be evaluated at an explored snapshot; the
// run then fails with that one failed check, named by its passage.
export interface ChartRun extends Partial<ChartChecks> { error?: string; exceeded?: string; limitHit?: boolean; unevaluable?: string; versions?: Record<string, string> }
// What draw reports for one part: files are the chart's files it wrote, and removed the
// retired pictures it found and removed.
export interface DrawResult extends ChartRun { part: string; ok?: boolean; errors?: string[]; files?: string[]; removed?: string[]; ir?: Ir }

const pluginRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

// The Mermaid pictures an earlier draw wrote beside the grid. Nothing reads them, so draw removes
// them, and a chart folder drawn before keeps no stale picture.
const RETIRED_PICTURES = ['chart.mmd', 'walks.mmd'];

// The project's xstate first, the plugin's own as a fallback.
export function findModule(from: string, name: string): FoundModule | null {
  let dir = from;
  for (;;) {
    const pkg = join(dir, 'node_modules', ...name.split('/'), 'package.json');
    if (existsSync(pkg)) return { dir: dirname(pkg), version: JSON.parse(readFileSync(pkg, 'utf8')).version };
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  const own = join(pluginRoot, 'node_modules', ...name.split('/'), 'package.json');
  if (existsSync(own)) return { dir: dirname(own), version: JSON.parse(readFileSync(own, 'utf8')).version };
  return null;
}

export async function loadRuntime(root: string): Promise<Runtime> {
  const x = findModule(root, 'xstate'), g = findModule(root, '@xstate/graph');
  if (!x || !g) return { error: 'xstate and @xstate/graph are not installed under the dossiers root; run dossier setup --install' };
  const xstate = await import(pathToFileURL(join(x.dir, JSON.parse(readFileSync(join(x.dir, 'package.json'), 'utf8')).module || 'dist/xstate.esm.js')).href).catch(() => import(pathToFileURL(x.dir).href));
  const graph = await import(pathToFileURL(join(g.dir, JSON.parse(readFileSync(join(g.dir, 'package.json'), 'utf8')).module || 'dist/xstate-graph.esm.js')).href).catch(() => import(pathToFileURL(g.dir).href));
  return { xstate, graph, versions: { xstate: x.version, '@xstate/graph': g.version } };
}

export function compilePart(prosePath: string): { prose: PartProse; ir: Ir } {
  const prose = parseProse(readFileSync(prosePath, 'utf8'));
  return { prose, ir: compileIR(prose) };
}

// Run the chart checks for an IR (optionally against a mutated machine IR).
export async function checkIR({ root, ir, machineIR = ir, limit = 20000 }: { root: string; ir: Ir; machineIR?: Ir; limit?: number }): Promise<ChartRun> {
  const rt = await loadRuntime(root);
  if (rt.error) return { error: rt.error };
  const machine = buildMachine(machineIR, rt.xstate!);
  const explored = explore(machine, ir, rt.graph!, { limit });
  // An exploration the limit cut short has not seen every state, so it fails and no check runs on part of it.
  if (explored.limitHit) return { outcome: 'fail', checks: [], passed: 0, failed: 0, covers: [], gaps: [], refusalIds: [], explored: explored.count, limitHit: true, exceeded: explored.error, versions: rt.versions };
  // An expression that cannot be evaluated stops the run where it was met, as one failed check.
  const stopped = (passage: string, message: string): ChartRun => ({ outcome: 'fail', checks: [{ ids: [passage], name: `${passage}: can be evaluated`, status: 'failed', message }], passed: 0, failed: 1, covers: [], gaps: [], refusalIds: [], explored: explored.count, unevaluable: message, versions: rt.versions });
  if (explored.unevaluable) return stopped(explored.unevaluable.passage, explored.unevaluable.message);
  try { return { ...runChecks({ ir, machine, xstate: rt.xstate!, explored }), versions: rt.versions }; }
  catch (e) {
    const failure = e instanceof Unevaluable ? e : unevaluableIn(machine);
    if (failure) return stopped(failure.passage, failure.message);
    throw e;
  }
}

export async function draw({ root, part, limit = 20000, write = true }: { root: string; part: string; limit?: number; write?: boolean }): Promise<DrawResult> {
  const dir = join(root, 'parts', part);
  const prosePath = join(dir, 'prose.md');
  if (!existsSync(prosePath)) return { part, error: `no prose.md under parts/${part}/` };
  const { ir } = compilePart(prosePath);
  const out = { part, ok: ir.ok, errors: ir.errors, files: [] as string[], removed: [] as string[] };
  if (!ir.ok) return out;
  const chartDir = join(dir, 'chart');
  if (write) {
    mkdirSync(chartDir, { recursive: true });
    const files = { 'machine.json': JSON.stringify(ir, null, 2) + '\n', 'grid.md': gridMarkdown(ir) };
    for (const [name, text] of Object.entries(files)) { writeFileSync(join(chartDir, name), text); out.files.push(`parts/${part}/chart/${name}`); }
    // Only a regular file, as draw wrote it: a link or a folder under a retired name is left alone.
    for (const name of RETIRED_PICTURES) {
      const path = join(chartDir, name);
      if (lstatSync(path, { throwIfNoEntry: false })?.isFile()) { unlinkSync(path); out.removed.push(`parts/${part}/chart/${name}`); }
    }
  }
  const result = await checkIR({ root, ir, limit });
  if (result.error) return { ...out, error: result.error };
  return { ...out, ...result, ir };
}

export function summarize(result: DrawResult): string {
  if (result.error) return `draw: ${result.part || ''} · error · ${result.error}`;
  if (!result.ok) return [`draw: ${result.part} · does not compile`, ...result.errors!.map(e => `  ${e}`)].join('\n');
  const stop = result.exceeded || result.unevaluable;
  const lines = [stop ? `draw: ${result.part} · fail · ${stop}` : `draw: ${result.part} · ${result.outcome} · ${result.passed} of ${result.checks!.length} checks · ${result.explored} ${result.explored === 1 ? 'state' : 'states'} explored`];
  if (!stop) for (const c of result.checks!.filter(c => c.status === 'failed')) lines.push(`  fail ${c.name}${c.message ? ` · ${c.message}` : ''}`);
  for (const g of result.gaps!.slice(0, 5)) lines.push(`  unsaid under condition: ${g.message}`);
  if (result.gaps!.length > 5) lines.push(`  ... ${result.gaps!.length - 5} more gaps`);
  for (const f of result.files!) lines.push(`  wrote ${f}`);
  for (const f of result.removed ?? []) lines.push(`  removed ${f}`);
  return lines.join('\n');
}
