// dossier call <dossier> <name> <kind> [<target>] [options]: write calls/<name>.md.
// The tool writes what identifies the question: the kind, the files the trial executes, the cell or
// the walk, Apalache's mode, invariant and constant initialization, a blunder's base, and the names
// the call must expect an outcome for, read from the configuration, the Alloy command, the
// invariant, the prose's walks or the chart. The agent supplies the prediction, as options or by
// filling in the lines the command leaves empty: reach:, each expect outcome, because:, a blunder's
// wrong, a witness's trace-data:, a bounded run's length: and an external call's runner:.
// The runner still plans the call as it plans any other; this command only writes what code knows.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { findRoot, locate, stripRootArgs } from '../dossiers/root.ts';
import { isRetired } from '../dossiers/decisions.ts';
import { loadComponent, loadSystem, systemModuleText } from '../dossiers/load.ts';
import { parseCfg, parseTla } from '../models/tla.ts';
import { parseAls } from '../models/alloy.ts';
import { constInitOf } from '../models/compose.ts';
import { KINDS, parseOutcome } from '../trials/calls.ts';
import { componentModule } from './scaffold.ts';
import type { Located } from '../dossiers/root.ts';
import type { ComponentLoad, SystemLoad } from '../dossiers/load.ts';
import type { ComposedSystem, WalkCfg } from '../models/compose.ts';

// What the agent asks for: the call's name, kind and target, and the lines it supplies.
export interface CallRequest {
  name: string;
  kind: string;
  // The walk or property of a TLC trial, the property of an Apalache trial, the .als of an Alloy
  // trial, or the copy of a blunder.
  target: string | null;
  scenario?: string | null;
  mode?: string | null;
  inv?: string | null;
  init?: string | null;
  base?: string | null;
  length?: string | null;
  reach?: string | null;
  // "A1: holds", one per line the agent predicts.
  expect?: string[];
  because?: string | null;
  blunder?: string | null;
  traceData?: string | null;
  runner?: string | null;
  force?: boolean;
}
// What composing a call gives: its text and the lines still empty, or the problems that refuse it.
export interface Composed { text: string; empty: string[]; problems: string[] }

// The options the command reads, each with a value, and the flags.
const VALUED = ['--scenario', '--mode', '--inv', '--init', '--base', '--length', '--reach', '--expect', '--because', '--blunder', '--trace-data', '--runner'];
const FLAGS = ['--force'];
const NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SINGLE = ['reach', 'blunder', 'runner', 'trace-data', 'scenario', 'mode', 'inv', 'init', 'base', 'length'];

const usage = 'usage: dossier call <dossier> <name> <kind> [<target>] [--scenario <id>] [--mode bounded|inductive] [--inv <name>] [--init <name>] [--base <module>] [--length <steps>] [--reach <words>] [--expect "<name>: <outcome>"]... [--because <words>] [--blunder <words>] [--trace-data <variables>] [--runner <id>] [--force]';

// The positional words and the options of a command line, with what is wrong with them. Every option
// in valued takes the next word as its value, even an empty one or one that starts with a dash.
export function readOptions(args: string[], valued: string[], flags: string[]): { positional: string[]; values: Record<string, string[]>; flags: Set<string>; problems: string[] } {
  const positional: string[] = [], values: Record<string, string[]> = {}, set = new Set<string>(), problems: string[] = [];
  const rest = stripRootArgs(args);
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (valued.includes(a)) {
      if (i + 1 >= rest.length) { problems.push(`${a} takes a value`); continue; }
      (values[a] ||= []).push(rest[++i]);
    } else if (flags.includes(a)) set.add(a);
    else if (a.startsWith('--')) problems.push(`unknown option ${a}`);
    else positional.push(a);
  }
  return { positional, values, flags: set, problems };
}

export async function main(command: string, args: string[]): Promise<number> {
  const root = findRoot(args);
  if (!root) { console.error('dossier call: no dossiers root here. Run dossier setup.'); return 2; }
  const { positional, values, flags, problems } = readOptions(args, VALUED, FLAGS);
  if (problems.length) { console.error(`dossier call: ${problems.join('; ')}\n${usage}`); return 2; }
  const [name, callName, kind, target, ...extra] = positional;
  if (!name || !callName || !kind || extra.length) { console.error(usage); return 2; }
  const one = (key: string): string | null => (values[key] ? values[key][values[key].length - 1] : null);
  const repeated = Object.entries(values).filter(([k, v]) => k !== '--expect' && v.length > 1).map(([k]) => k);
  if (repeated.length) { console.error(`dossier call: ${repeated.join(', ')} given more than once`); return 2; }
  const where = locate(root, name);
  if (!where) { console.error(`dossier call: no component or system named ${name} under ${root}`); return 2; }
  const request: CallRequest = {
    name: callName, kind, target: target ?? null,
    scenario: one('--scenario'), mode: one('--mode'), inv: one('--inv'), init: one('--init'), base: one('--base'), length: one('--length'),
    reach: one('--reach'), expect: values['--expect'] || [], because: one('--because'), blunder: one('--blunder'), traceData: one('--trace-data'), runner: one('--runner'),
    force: flags.has('--force'),
  };
  return writeCall(root, where, request, 'call');
}

// Compose the call and write it to calls/<name>.md, or say why not. Returns the exit code.
export function writeCall(root: string, where: Located, request: CallRequest, command = 'call'): number {
  const ref = `${where.kind === 'component' ? 'components' : 'systems'}/${where.id}`;
  if (isRetired(where.dir)) { console.error(`dossier ${command}: ${ref} is retired; dossier decide ${ref} begin reopens it`); return 2; }
  const callName = request.name.replace(/\.md$/, '');
  if (!NAME.test(callName)) { console.error(`dossier ${command}: refused\n  a call's name is letters, digits, dots, hyphens and underscores, not "${request.name}"`); return 2; }
  const path = join(where.dir, 'calls', `${callName}.md`);
  if (existsSync(path) && !request.force) { console.error(`dossier ${command}: refused\n  ${ref}/calls/${callName}.md exists; --force replaces it`); return 2; }
  const composed = composeCall(root, where, request);
  if (composed.problems.length) { console.error(`dossier ${command}: refused\n  ${composed.problems.join('\n  ')}`); return 2; }
  mkdirSync(join(where.dir, 'calls'), { recursive: true });
  writeFileSync(path, composed.text);
  console.log(`wrote ${ref}/calls/${callName}.md`);
  console.log(composed.empty.length ? `still empty: ${composed.empty.join(', ')}` : 'every line is filled in');
  return 0;
}

// The text of a call, from what the tool knows of the dossier and what the request supplies.
export function composeCall(root: string, where: Located, request: CallRequest): Composed {
  const problems: string[] = [];
  const refuse = (...p: string[]): Composed => ({ text: '', empty: [], problems: p });
  const { kind, target } = request;
  if (!KINDS.includes(kind)) return refuse(`kind is one of ${KINDS.join(', ')}, not "${kind}"`);
  const supplied: Record<string, string | null | undefined> = { reach: request.reach, blunder: request.blunder, runner: request.runner, 'trace-data': request.traceData, scenario: request.scenario, mode: request.mode, inv: request.inv, init: request.init, base: request.base, length: request.length };
  for (const key of SINGLE) if (supplied[key] != null && /[\r\n]/.test(supplied[key]!)) problems.push(`--${key} is one line`);
  if (problems.length) return refuse(...problems);

  const isSystem = where.kind === 'system';
  let component: ComponentLoad | null = null, system: SystemLoad | null = null;
  // The module the trial runs, as the dossier names it, and its text as the runner will read it.
  let moduleName: string, moduleRel: string, moduleText: () => string;
  if (isSystem) {
    system = loadSystem(root, where.id);
    const unread = [...system.prose.errors, ...system.prose.misnamed, ...system.composed.errors];
    if (unread.length) return refuse(`systems/${where.id} does not compose:`, ...unread.map(e => `  ${e}`));
    moduleName = system.composed.module!;
    moduleRel = `model/generated/${moduleName}.tla`;
    const text = systemModuleText(system);
    moduleText = () => text;
  } else {
    component = loadComponent(root, where.id);
    if (!component.ir.ok) return refuse(`components/${where.id} does not compile; run dossier draw ${where.id}`);
    moduleName = componentModule(component.ir);
    moduleRel = `model/${moduleName}.tla`;
    moduleText = () => readFileSync(join(where.dir, moduleRel), 'utf8');
  }
  const home = isSystem ? 'model/generated/' : 'model/';
  const hasModule = () => isSystem || existsSync(join(where.dir, moduleRel));
  const noModule = `${moduleRel} does not exist; run dossier scaffold ${where.id}`;

  // The call's lines in the order the runner's examples write them.
  const head: [string, string][] = [['kind', kind]];
  let executes: string[] = [];
  // The names the call must expect an outcome for, with an outcome the tool already knows.
  let keys: string[] = [];
  const known: Record<string, string> = {};
  let traceData = false;

  // A system's cell or witness: the property or the walk, and the scenario it runs under.
  const cellOf = (property: string, scenario: string | null | undefined) => {
    if (!scenario) { problems.push(`a system trial names its scenario: --scenario <id>`); return null; }
    if (!system!.actors.scenarios.some(s => s.id === scenario)) { problems.push(`scenario ${scenario} is not declared in actors/scenarios.md`); return null; }
    if (!system!.prose.properties.some(p => p.id === property)) { problems.push(`property ${property} is not a passage of systems/${where.id}`); return null; }
    const cell = system!.composed.cells.find(c => c.property === property && c.scenario === scenario);
    if (!cell) problems.push(`${property} × ${scenario} is not a cell of systems/${where.id}: ${property} does not claim ${scenario}`);
    return cell ?? null;
  };

  if (kind === 'chart') {
    if (isSystem) return refuse('a chart trial belongs to a component');
    if (target) return refuse(`a chart call takes no target, not "${target}"`);
    executes = ['prose.md'];
    keys = ['checks'];
  } else if (kind === 'tlc') {
    if (!target && isSystem) return refuse('a system TLC call names its property or its walk: dossier call <system> <name> tlc <property|walk> --scenario <id>');
    if (isSystem) {
      const walk = system!.prose.walks.find(w => w.id === target!);
      if (walk) {
        const scenario = request.scenario || walk.scenario || 'all-honest';
        const config = ((system!.composed as ComposedSystem).walks || []).find((w: WalkCfg) => w.id === target && w.scenario === scenario);
        if (!config) return refuse(`walk ${target} runs under ${walk.scenario || 'all-honest'}, not ${scenario}`);
        head.push(['walk', target!], ['scenario', scenario]);
        executes = [moduleRel, `${home}${config.cfg}`];
        keys = parseCfg(system!.composed.cfgs[config.cfg] || '').enabled;
        traceData = true;
      } else {
        const cell = cellOf(target!, request.scenario);
        if (!cell) return refuse(...problems);
        head.push(['property', target!], ['scenario', cell.scenario]);
        executes = [moduleRel, `${home}${cell.cfg}`];
        keys = parseCfg(system!.composed.cfgs[cell.cfg] || '').enabled;
      }
    } else {
      if (!hasModule()) return refuse(noModule);
      const cfg = componentCfg(where.dir, moduleName, target, component!.ir.walks.map(w => w.id), problems);
      if (!cfg) return refuse(...problems);
      executes = [moduleRel, `model/${cfg}`];
      keys = parseCfg(readFileSync(join(where.dir, 'model', cfg), 'utf8')).enabled;
      traceData = keys.some(k => /^NotW\d+$/.test(k));
    }
    if (!keys.length) return refuse(`${executes[1]} enables no invariant or property`);
  } else if (kind === 'apalache') {
    const mode = request.mode || 'inductive';
    if (!['bounded', 'inductive'].includes(mode)) return refuse(`--mode is bounded or inductive, not "${mode}"`);
    if (request.length != null && mode !== 'bounded') return refuse('--length goes with --mode bounded');
    if (!target && !request.inv) return refuse('an Apalache call names its property, or its invariant with --inv');
    const inv = request.inv || `Inv_${target}`;
    if (isSystem) {
      if (!target) return refuse('a system Apalache call names its property: dossier call <system> <name> apalache <property> --scenario <id>');
      const cell = cellOf(target, request.scenario);
      if (!cell) return refuse(...problems);
      head.push(['property', target], ['scenario', cell.scenario]);
    } else if (!hasModule()) return refuse(noModule);
    head.push(['mode', mode]);
    if (mode === 'bounded') head.push(['length', request.length ?? '']);
    head.push(['inv', inv]);
    if (request.init) head.push(['init', request.init]);
    const cinit = isSystem ? constInitOf(request.scenario!) : 'ConstInit';
    head.push(['cinit', cinit]);
    const definitions = parseTla(moduleText()).definitions;
    for (const n of [inv, cinit, ...(request.init ? [request.init] : [])]) if (!Object.hasOwn(definitions, n)) problems.push(`${moduleRel} does not define ${n}${isSystem ? ' (with extras.tla)' : ''}`);
    executes = [moduleRel];
    keys = [inv];
  } else if (kind === 'alloy') {
    if (isSystem) return refuse('an Alloy trial belongs to a component');
    const als = alloyFile(where.dir, 'model', target, problems);
    if (!als) return refuse(...problems);
    executes = [`model/${als}`];
    const commands = parseAls(readFileSync(join(where.dir, 'model', als), 'utf8')).commands;
    if (!commands.length) return refuse(`model/${als} has no check or run`);
    keys = commands.map(c => c.name);
    // With several commands the agent chooses one by its --expect line.
    if (commands.length > 1) {
      const chosen = (request.expect || []).map(e => e.split(':')[0].trim()).filter(n => keys.includes(n));
      if (chosen.length !== 1) return refuse(`model/${als} has ${keys.join(', ')}: an Alloy call expects exactly one; name it with --expect "<command>: <outcome>"`);
      keys = chosen;
    }
  } else if (kind === 'external') {
    if (target) return refuse(`an external call takes no target; name its runner with --runner, not "${target}"`);
    head.push(['runner', request.runner ?? '']);
    executes = ['prose.md'];
    keys = (isSystem ? system!.prose.walks : component!.ir.walks).map(w => w.id);
    if (!keys.length) return refuse(`${isSystem ? 'systems' : 'components'}/${where.id} has no walks for an external runner to replay`);
  } else if (kind === 'blunder') {
    if (!target) return refuse('a blunder call names its copy: dossier call <dossier> <name> blunder <copy>');
    const dir = join(where.dir, 'model', 'blunders');
    const tla = existsSync(join(dir, `${target}.tla`)), als = existsSync(join(dir, `${target}.als`));
    if (tla && als) return refuse(`model/blunders/ holds both ${target}.tla and ${target}.als; name the copies apart`);
    if (!tla && !als) return refuse(`model/blunders/${target}.tla does not exist; dossier blunder writes the copy`);
    if (request.mode) return refuse('a blunder call runs TLC or the Alloy Analyzer; --mode is for apalache');
    const ext = tla ? '.tla' : '.als';
    if (tla) {
      const cfgs = blunderCfgs(dir, target);
      if (cfgs.length !== 1) return refuse(cfgs.length ? `model/blunders/ holds ${cfgs.join(', ')} beside ${target}.tla; a blunder runs one configuration` : `model/blunders/ holds no configuration for ${target}.tla; dossier blunder writes it`);
      executes = [`model/blunders/${target}.tla`, `model/blunders/${cfgs[0]}`];
      keys = parseCfg(readFileSync(join(dir, cfgs[0]), 'utf8')).enabled;
      if (keys.length !== 1) return refuse(`model/blunders/${cfgs[0]} enables ${keys.join(', ') || 'nothing'}; a blunder configuration enables exactly the one property it must catch`);
      known[keys[0]] = 'violated';
      if (isSystem) {
        const cell = cellOf(keys[0].replace(/^Inv_/, ''), request.scenario);
        if (!cell) return refuse(...problems);
        head.push(['property', cell.property], ['scenario', cell.scenario]);
      }
    } else {
      if (isSystem) return refuse('an Alloy blunder belongs to a component');
      executes = [`model/blunders/${target}.als`];
      const commands = parseAls(readFileSync(join(dir, `${target}.als`), 'utf8')).commands;
      if (commands.length !== 1) return refuse(`model/blunders/${target}.als has ${commands.map(c => c.name).join(', ') || 'no command'}; an Alloy blunder has exactly one`);
      keys = [commands[0].name];
      known[keys[0]] = commands[0].kind === 'check' ? 'counterexample' : 'no instance';
    }
    // base: names the module copied, when the model's folder holds more than one.
    const modules = existsSync(join(where.dir, home)) ? readdirSync(join(where.dir, home)).filter(f => f.endsWith(ext) && !f.endsWith(`.scaffold${ext}`)).sort() : [];
    const own = ext === '.tla' ? `${moduleName}.tla` : null;
    if (request.base) {
      const base = request.base.includes('/') ? request.base : `${home}${request.base.endsWith(ext) ? request.base : request.base + ext}`;
      if (!existsSync(join(where.dir, base)) && !(isSystem && base === moduleRel)) return refuse(`--base names ${base}, which does not exist`);
      head.push(['base', base]);
    } else if (modules.length > 1) {
      if (!own || !modules.includes(own)) return refuse(`${home} holds ${modules.join(', ')}: name the module the blunder is a copy of with --base`);
      head.push(['base', `${home}${own}`]);
    }
    head.push(['blunder', request.blunder ?? '']);
  }

  if (request.traceData != null && !traceData) problems.push('--trace-data belongs to a witness, whose configuration enables a NotW<n>');
  if (request.runner != null && kind !== 'external') problems.push('--runner belongs to an external call');
  if (request.blunder != null && kind !== 'blunder') problems.push('--blunder belongs to a blunder call');
  if (request.scenario != null && !isSystem) problems.push('--scenario belongs to a system trial');
  if ((request.inv != null || request.init != null) && kind !== 'apalache') problems.push('--inv and --init belong to an apalache call');
  if (request.mode != null && kind !== 'apalache') problems.push('--mode belongs to an apalache call');
  if (request.base != null && kind !== 'blunder') problems.push('--base belongs to a blunder call');

  // The agent's outcomes, each for a name the call must expect, and each one the runner reads.
  const outcomes: Record<string, string> = { ...known };
  for (const line of request.expect || []) {
    const m = line.match(/^\s*([A-Za-z_]\w*)\s*:\s*(.*?)\s*$/);
    if (!m) { problems.push(`--expect takes "<name>: <outcome>", not "${line}"`); continue; }
    const [, key, outcome] = m;
    if (!keys.includes(key)) { problems.push(`--expect names ${key}, which ${expectSource(kind, executes)} does not enable; it expects ${keys.join(', ')}`); continue; }
    if (outcome && parseOutcome(outcome).unknown) { problems.push(`${key}: unknown outcome "${outcome}"`); continue; }
    if (Object.hasOwn(outcomes, key) && !Object.hasOwn(known, key)) { problems.push(`--expect names ${key} twice`); continue; }
    if (outcome) outcomes[key] = outcome;
  }
  if (problems.length) return refuse(...problems);

  const empty: string[] = [];
  const lines = head.map(([k, v]) => { if (!v) empty.push(k); return `${k}: ${v}`.trimEnd(); });
  lines.push('executes:', ...executes.map(f => `  - ${f}`));
  if (!request.reach) empty.push('reach');
  lines.push(`reach: ${request.reach ?? ''}`.trimEnd());
  if (request.traceData) lines.push(`trace-data: ${request.traceData}`);
  lines.push('expect:');
  for (const k of keys) {
    if (!outcomes[k]) empty.push(`expect ${k}`);
    // An outcome left out is written "  <name>: ", which the runner refuses until it is filled in.
    lines.push(`  ${k}: ${outcomes[k] ?? ''}`);
  }
  const because = (request.because ?? '').trim();
  if (!because) empty.push('because');
  lines.push('because: |', ...(because ? because.split(/\r?\n/).map(l => (l.trim() ? `  ${l}` : '')) : []));
  return { text: lines.join('\n').replace(/\n*$/, '\n'), empty, problems: [] };
}

// Where a call's expect names come from, in words for a refusal.
function expectSource(kind: string, executes: string[]): string {
  if (kind === 'chart') return 'the chart';
  if (kind === 'apalache') return 'the invariant';
  if (kind === 'external') return "the prose's walks";
  return executes[executes.length - 1];
}

// The configuration a component's TLC call runs: <Module>.cfg with no target, <Module>_<W>.cfg for a
// walk's witness, the configuration that enables a property, or one named as a file.
function componentCfg(dir: string, module: string, target: string | null, walks: string[], problems: string[]): string | null {
  const model = join(dir, 'model');
  const exists = (f: string) => existsSync(join(model, f));
  if (!target) {
    if (exists(`${module}.cfg`)) return `${module}.cfg`;
    problems.push(`model/${module}.cfg does not exist; run dossier scaffold`);
    return null;
  }
  if (target.endsWith('.cfg')) {
    if (target.includes('/') || !exists(target)) { problems.push(`model/${target} does not exist`); return null; }
    return target;
  }
  if (walks.includes(target)) {
    if (exists(`${module}_${target}.cfg`)) return `${module}_${target}.cfg`;
    problems.push(`model/${module}_${target}.cfg does not exist; run dossier scaffold`);
    return null;
  }
  // A property: the module's own configuration when it enables it, else the one of its own name, else
  // the first beside the module that does.
  const all = readdirSync(model).filter(f => f.endsWith('.cfg') && !f.endsWith('.scaffold.cfg')).sort();
  const order = [`${module}.cfg`, `${module}_${target}.cfg`, ...all].filter((f, i, a) => a.indexOf(f) === i && exists(f));
  const found = order.find(f => parseCfg(readFileSync(join(model, f), 'utf8')).enabled.includes(target));
  if (!found) problems.push(`no configuration under model/ enables ${target}${/^[A-Z]\d+$/.test(target) ? '' : '; the target is a walk, a property or a .cfg file'}`);
  return found ?? null;
}

// The Alloy file a call runs: the one named, or the only .als under the folder.
function alloyFile(dir: string, folder: string, target: string | null, problems: string[]): string | null {
  const home = join(dir, folder);
  const files = existsSync(home) ? readdirSync(home).filter(f => f.endsWith('.als')).sort() : [];
  if (target) {
    const file = target.endsWith('.als') ? target : `${target}.als`;
    if (!files.includes(file)) { problems.push(`${folder}/${file} does not exist`); return null; }
    return file;
  }
  if (files.length === 1) return files[0];
  problems.push(files.length ? `${folder}/ holds ${files.join(', ')}: name the one to run` : `${folder}/ holds no .als`);
  return null;
}

// The configurations beside a blunder copy: <copy>_<Property>.cfg, as dossier blunder writes them, or <copy>.cfg.
export function blunderCfgs(dir: string, copy: string): string[] {
  if (!existsSync(dir)) return [];
  const own = new RegExp(`^${copy.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:_[A-Z]\\w*)?\\.cfg$`);
  return readdirSync(dir).filter(f => own.test(f)).sort();
}
