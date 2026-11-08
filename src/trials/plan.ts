// What a call asks the runner to do, checked against the files it names.
// The runner refuses with these problems and writes nothing.
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, isAbsolute, join, posix, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { assignmentsOf, constantsOf, historiesOf, ident, movesOf, namesIn, overridesOf, parseCfg, parseTla, reach, valueOf } from '../models/tla.ts';
import { constInitOf } from '../models/compose.ts';
import { alsParagraphs, parseAls } from '../models/alloy.ts';
import { propertyId } from '../verify/covers.ts';
import type { Call } from './calls.ts';
import type { Cfg, TlaDefinition, TlaModule } from '../models/tla.ts';
import type { Als, AlsCommand, AlsParagraph } from '../models/alloy.ts';
import type { Ir } from '../prose/ir.ts';
import type { PartProse, CompositionProse } from '../prose/prose.ts';
import type { Scenario } from '../dossiers/actors.ts';
import type { ExternalRunner } from '../dossiers/root.ts';

// What the runner will execute, as far as the call has been read: the checker and its files.
export interface Plan {
  checker: 'chart' | 'tlc' | 'apalache' | 'alloy' | 'external' | null;
  enabled: string[];
  blunderFile?: string;
  machineIR?: Ir;
  blunderDiff?: string;
  tla?: string;
  cfg?: string | null;
  cfgParsed?: Cfg;
  tlaParsed?: TlaModule;
  witness?: string;
  inv?: string | null;
  mode?: string | null;
  length?: number | null;
  init?: string | null;
  cinit?: string | null;
  als?: string;
  alsParsed?: Als;
  command?: AlsCommand;
  runner?: (ExternalRunner & { id: string }) | null;
}
export interface PlanInput {
  call: Call;
  dossierDir: string;
  kind: string;
  ir?: Ir | null;
  compositionProse?: CompositionProse | PartProse | null;
  scenarios?: Scenario[] | null;
  externals?: Record<string, ExternalRunner>;
  // For a composition: the generated module, as the call names it (model/generated/<Concern>.tla), and the cells the wiring claims.
  module?: string | null;
  cells?: { property: string; scenario: string }[] | null;
}

// What is wrong with a path a call names, or null: it is written relative to the dossier, as
// path.normalize writes it, with no "..", and leads to nothing outside the dossier, through a
// symbolic link either.
export function outside(dossierDir: string, rel: string, key = 'executes'): string | null {
  if (!rel) return `${key} names an empty path`;
  if (rel.includes('\\')) return `${key} names ${rel}; use / as the path separator`;
  if (isAbsolute(rel) || rel.split(/[\\/]+/).includes('..')) return `${key} names ${rel}, which is outside the dossier`;
  const normal = posix.normalize(rel);
  if (normal !== rel) return `${key} names ${rel}; write it ${normal}`;
  const full = resolve(dossierDir, rel);
  // Missing leaves can still sit below a symlink, including a dangling one.
  // Resolve the nearest existing ancestor before permitting a generated file.
  let ancestor = full;
  for (;;) {
    try { lstatSync(ancestor); break; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') return `${key} names ${rel}, which cannot be read`; }
    if (ancestor === resolve(dossierDir)) return null;
    ancestor = dirname(ancestor);
  }
  let real: string;
  try { real = realpathSync(ancestor); } catch { return `${key} names ${rel}, which leads through an unreadable symbolic link`; }
  const home = realpathSync(dossierDir);
  if (real !== home && !real.startsWith(home + sep)) return `${key} names ${rel}, which leads outside the dossier`;
  return null;
}

export function planTrial({ call, dossierDir, kind, ir, compositionProse, scenarios, externals = {}, module = null, cells = null }: PlanInput): { plan: Plan; problems: string[] } {
  const problems: string[] = [];
  const plan: Plan = { checker: null, enabled: [] };
  // Nothing is read until every path the call names is inside the dossier.
  const escapes = [...call.executes.map(rel => outside(dossierDir, rel)), ...(call.base ? [outside(dossierDir, call.base, 'base')] : [])].filter((x): x is string => Boolean(x));
  if (escapes.length) return { plan, problems: escapes };
  const tlaFiles = call.executes.filter(x => x.endsWith('.tla')), cfgFiles = call.executes.filter(x => x.endsWith('.cfg')), alsFiles = call.executes.filter(x => x.endsWith('.als')), jsonFiles = call.executes.filter(x => x.endsWith('.json'));
  const isComposition = kind === 'composition';
  const modelHome = isComposition ? 'model/generated/' : 'model/';
  const composition = isComposition ? compositionProse as CompositionProse | null | undefined : null;
  // A walk runs under the scenario it names, all-honest when it names none; its configuration is written for that one.
  const walk = call.walk && composition ? (composition.walks || []).find(w => w.id === call.walk) : undefined;
  const walkScenario = walk ? walk.scenario || 'all-honest' : call.scenario;

  const knownProperty = Boolean(call.property && composition && composition.properties.some(p => p.id === call.property));
  const knownScenario = Boolean(call.scenario && scenarios && scenarios.some(s => s.id === call.scenario));
  // A composition cell, as opposed to a witness or a blunder: the property and the scenario both read.
  const cell = isComposition && knownProperty && knownScenario && call.kind !== 'blunder';

  // A composition trial names its cell, property: and scenario:, or a tlc trial its witness, walk: and scenario:.
  if (call.property || call.scenario || call.walk) {
    if (!isComposition) {
      if (call.property || call.scenario) problems.push('property: and scenario: belong to a composition trial');
      if (call.walk) problems.push('walk: belongs to a composition trial');
    } else {
      if (call.property && !knownProperty) problems.push(`property ${call.property} is not a passage of this composition`);
      if (call.walk && !walk) problems.push(`walk ${call.walk} is not a walk of this composition`);
      else if (walk && call.scenario && walkScenario !== call.scenario) problems.push(`walk ${call.walk} runs under ${walkScenario}, not ${call.scenario}`);
      if (!knownScenario) problems.push(`scenario ${call.scenario} is not declared in actors/scenarios.md`);
      if (call.walk && call.kind === 'blunder') problems.push('a composition blunder names the property it must catch under property:, not a walk');
      else if (call.walk && call.kind !== 'tlc') problems.push('a composition witness is a tlc trial');
      // A configuration for a scenario the property no longer claims is not a cell.
      if (cell && cells && !cells.some(c => c.property === call.property && c.scenario === call.scenario)) problems.push(`${call.property} × ${call.scenario} is not a cell of this composition: ${call.property} does not claim ${call.scenario}`);
    }
  } else if (isComposition && call.kind === 'tlc') problems.push('a composition trial names its cell, property: and scenario:, or its witness, walk: and scenario:');
  else if (isComposition && ['apalache', 'blunder'].includes(call.kind!)) problems.push('a composition trial names its cell: property: and scenario:');
  // A composition cell or witness runs the module the composer wrote, never a copy beside it.
  const runsGenerated = isComposition && (call.kind === 'tlc' || call.kind === 'apalache');
  const generatedProblem = (tla: string) => (runsGenerated && (module ? tla !== module : !tla.startsWith('model/generated/')) ? [`a composition trial executes the generated module${module ? `, ${module}` : ' under model/generated/'}`] : []);

  if (call.kind === 'chart' || (call.kind === 'blunder' && jsonFiles.length)) {
    plan.checker = 'chart';
    if (isComposition) problems.push('a chart trial belongs to a part');
    if (call.kind === 'chart' && !call.executes.includes('prose.md')) problems.push('a chart trial executes prose.md');
    if (call.kind === 'blunder') {
      if (jsonFiles.length !== 1 || !jsonFiles[0].startsWith('chart/blunders/')) problems.push('a chart blunder executes exactly one machine under chart/blunders/');
      else plan.blunderFile = join(dossierDir, jsonFiles[0]);
    }
    const expect = call.expect.checks;
    if (!expect || !['pass', 'fail'].includes(expect.expect)) problems.push('a chart call expects "checks: pass" or "checks: fail <ids>"');
    else if (call.kind === 'blunder' && (expect.expect !== 'fail' || !expect.failing!.length)) problems.push('a chart blunder expects "checks: fail <the ids it must break>"');
    if (Object.keys(call.expect).some(k => k !== 'checks')) problems.push('a chart call expects only checks:');
    if (!ir || !ir.ok) problems.push('prose.md does not compile; run dossier draw first');
    plan.enabled = ['checks'];
    if (plan.blunderFile && existsSync(plan.blunderFile)) {
      try { plan.machineIR = JSON.parse(readFileSync(plan.blunderFile, 'utf8')) as Ir; } catch (e) { problems.push(`${jsonFiles[0]} unreadable: ${(e as Error).message}`); }
      if (plan.machineIR && ir && JSON.stringify(plan.machineIR.transitions) === JSON.stringify(ir.transitions) && JSON.stringify(plan.machineIR.states) === JSON.stringify(ir.states)) problems.push(`${jsonFiles[0]} does not differ from the prose's machine`);
      if (plan.machineIR && ir) plan.blunderDiff = describeMachineDiff(ir, plan.machineIR);
    } else if (plan.blunderFile) problems.push(`${jsonFiles[0]} does not exist`);
    return { plan, problems };
  }

  if (call.kind === 'tlc' || (call.kind === 'blunder' && tlaFiles.length && call.mode !== 'bounded' && call.mode !== 'inductive')) {
    if (tlaFiles.length !== 1 || cfgFiles.length !== 1) { problems.push('a TLC trial executes exactly one .tla and one .cfg'); return { plan, problems }; }
    plan.checker = 'tlc'; plan.tla = join(dossierDir, tlaFiles[0]); plan.cfg = join(dossierDir, cfgFiles[0]);
    if (!existsSync(plan.tla) || !existsSync(plan.cfg)) { problems.push('the module or configuration does not exist'); return { plan, problems }; }
    plan.cfgParsed = parseCfg(readFileSync(plan.cfg, 'utf8'));
    plan.tlaParsed = parseTla(readFileSync(plan.tla, 'utf8'));
    problems.push(...generatedProblem(tlaFiles[0]));
    const enabled = plan.enabled = plan.cfgParsed.enabled;
    if (enabled.length === 0) problems.push('the configuration enables no invariant or property');
    for (const n of enabled) if (!call.expect[n]) problems.push(`${n} is enabled but the call expects nothing of it`);
    for (const n of Object.keys(call.expect)) if (!enabled.includes(n)) problems.push(`the call expects something of ${n}, which the configuration does not enable`);
    for (const [n, o] of Object.entries(call.expect)) if (!['holds', 'violated'].includes(o.expect)) problems.push(`${n}: a TLC call expects holds or violated, not "${o.expect}"`);
    for (const n of enabled) if (!plan.tlaParsed.definitions[n]) problems.push(`${n} is enabled but ${tlaFiles[0]} does not define it`);
    const temporal = plan.cfgParsed.properties.filter(n => /^O\d+$/.test(n));
    if (temporal.length > 1) problems.push(`one liveness property per configuration: ${temporal.join(', ')}`);
    const nots = enabled.filter(n => /^NotW\d+$/.test(n));
    if (nots.length) {
      plan.witness = nots[0];
      if (nots.length !== 1 || enabled.some(n => !/^(TypeOK|NotW\d+)$/.test(n))) problems.push('a witness configuration enables TypeOK and exactly one NotW<n>, nothing else');
      else if (!call.expect[nots[0]] || call.expect[nots[0]].expect !== 'violated') problems.push(`${nots[0]} is expected "violated[; trace: ...]"`);
    }
    // The values a witness's trace compares are variables of the module, never a name that would read as empty.
    const undeclared = call.traceData.filter(v => !plan.tlaParsed!.variables.includes(v));
    if (undeclared.length) problems.push(`trace-data names ${undeclared.join(', ')}, which ${tlaFiles[0]} does not declare as ${undeclared.length === 1 ? 'a variable' : 'variables'}`);
    if (isComposition && plan.witness && call.expect[plan.witness] && call.expect[plan.witness].trace && !call.traceData.length) problems.push('a composition witness that expects a trace names the variables of each step under trace-data:');
    if (call.kind === 'blunder') {
      if (!tlaFiles[0].startsWith('model/blunders/')) problems.push('a blunder module lives under model/blunders/');
      if (enabled.length !== 1) problems.push('a blunder configuration enables exactly one property, the one it must catch');
      else if (/^NotW\d+$/.test(enabled[0])) problems.push(`a blunder enables the property it must catch, not ${enabled[0]}, a walk's witness`);
      else if (call.expect[enabled[0]] && call.expect[enabled[0]].expect !== 'violated') problems.push(`a blunder expects ${enabled[0]} violated`);
      const base = blunderBase(call, dossierDir, modelHome, '.tla', tlaFiles[0], plan, problems);
      if (base && enabled.length === 1 && !/^NotW\d+$/.test(enabled[0]) && Object.hasOwn(plan.tlaParsed.definitions, enabled[0])) problems.push(...sameQuestion(dossierDir, tlaFiles[0], base, { property: enabled[0], cfg: { ...configuration(dossierDir, cfgFiles[0]), home: modelHome } }));
    } else if (tlaFiles[0].startsWith('model/blunders/')) problems.push('only a blunder trial executes a module under model/blunders/');
    // A composition witness runs the walk's own configuration, which the composer writes under the walk's scenario;
    // a cell runs its own, <Property>_<scenario>.cfg, and no other scenario's.
    const witnessCfg = isComposition && call.kind === 'tlc' && call.walk && walkScenario ? `model/generated/${call.walk}_${ident(walkScenario)}.cfg` : null;
    const cellCfg = cell && call.kind === 'tlc' ? `model/generated/${call.property}_${ident(call.scenario!)}.cfg` : null;
    if (witnessCfg && cfgFiles[0] !== witnessCfg) problems.push(`a composition witness executes ${witnessCfg}`);
    else if (cellCfg && cfgFiles[0] !== cellCfg) problems.push(`the cell ${call.property} × ${call.scenario} executes ${cellCfg}`);
    else if (isComposition && call.kind === 'tlc' && !cfgFiles[0].startsWith('model/generated/')) problems.push('a composition TLC trial executes a configuration under model/generated/');
    if (isComposition && call.property && !enabled.some(n => propertyId(n) === call.property)) problems.push(`the configuration does not enable ${call.property}`);
    if (isComposition && call.kind === 'tlc' && call.walk && !enabled.includes(`Not${call.walk}`)) problems.push(`the configuration does not enable Not${call.walk}`);
    return { plan, problems };
  }

  if (call.kind === 'apalache' || (call.kind === 'blunder' && tlaFiles.length)) {
    if (tlaFiles.length !== 1) { problems.push('an Apalache trial executes exactly one .tla'); return { plan, problems }; }
    plan.checker = 'apalache'; plan.tla = join(dossierDir, tlaFiles[0]); plan.cfg = cfgFiles[0] ? join(dossierDir, cfgFiles[0]) : null;
    if (!existsSync(plan.tla)) { problems.push(`${tlaFiles[0]} does not exist`); return { plan, problems }; }
    plan.tlaParsed = parseTla(readFileSync(plan.tla, 'utf8'));
    problems.push(...generatedProblem(tlaFiles[0]));
    // A composition's scenario reaches Apalache through cinit: alone; a configuration's constants could say otherwise.
    if (isComposition && cfgFiles.length) problems.push('a composition Apalache trial executes its module alone: the scenario comes from cinit:');
    const names = Object.keys(call.expect);
    const inv = call.inv || (names.length === 1 ? names[0] : null);
    if (!inv) problems.push('an Apalache call names its invariant under inv: or as the single expect line');
    // A walk is witnessed when its NotW<n> is violated, which only a TLC witness configuration reads.
    if (inv && /^NotW\d+$/.test(inv)) problems.push(`${inv} is a walk's witness, which a tlc trial checks`);
    if (inv && !call.expect[inv]) problems.push(`the call expects nothing of ${inv}`);
    for (const n of names) if (n !== inv) problems.push(`the call expects something of ${n}, which this trial does not check`);
    if (inv && !plan.tlaParsed.definitions[inv]) problems.push(`${tlaFiles[0]} does not define ${inv}`);
    if (call.init && !plan.tlaParsed.definitions[call.init]) problems.push(`${tlaFiles[0]} does not define ${call.init}`);
    if (call.cinit && !plan.tlaParsed.definitions[call.cinit]) problems.push(`${tlaFiles[0]} does not define ${call.cinit}`);
    for (const [n, o] of Object.entries(call.expect)) if (!['holds', 'violated'].includes(o.expect)) problems.push(`${n}: an Apalache call expects holds or violated, not "${o.expect}"`);
    plan.inv = inv; plan.mode = call.mode; plan.length = call.length; plan.init = call.init; plan.cinit = call.cinit; plan.enabled = inv ? [inv] : [];
    if (isComposition && call.property && inv && propertyId(inv) !== call.property) problems.push(`${inv} is not the cell's property ${call.property}`);
    if (call.kind === 'blunder') {
      if (!tlaFiles[0].startsWith('model/blunders/')) problems.push('a blunder module lives under model/blunders/');
      if (inv && call.expect[inv] && call.expect[inv].expect !== 'violated') problems.push(`a blunder expects ${inv} violated`);
      const base = blunderBase(call, dossierDir, modelHome, '.tla', tlaFiles[0], plan, problems);
      // An inductive step starts from init:, when the call names one: part of what is proved.
      const start = call.mode === 'inductive' && call.init && call.init !== inv && Object.hasOwn(plan.tlaParsed.definitions, call.init) ? call.init : null;
      const configured = cfgFiles[0] && plan.cfg && existsSync(plan.cfg) ? configuration(dossierDir, cfgFiles[0]) : null;
      if (base && inv && !/^NotW\d+$/.test(inv) && Object.hasOwn(plan.tlaParsed.definitions, inv)) problems.push(...sameQuestion(dossierDir, tlaFiles[0], base, { property: inv, start, cinit: call.cinit && Object.hasOwn(plan.tlaParsed.definitions, call.cinit) ? call.cinit : null, configured }));
    } else if (tlaFiles[0].startsWith('model/blunders/')) problems.push('only a blunder trial executes a module under model/blunders/');
    // The scenario's constants are ConstInit_<scenario>, exactly: another scenario's would run another cell.
    if (isComposition && knownScenario) {
      const cinit = constInitOf(call.scenario!);
      if (!call.cinit) problems.push(`a composition Apalache trial names cinit: ${cinit}, the constants of scenario ${call.scenario}`);
      else if (call.cinit !== cinit) problems.push(`cinit ${call.cinit} does not match scenario ${call.scenario}: name ${cinit}`);
    }
    return { plan, problems };
  }

  if (call.kind === 'alloy' || (call.kind === 'blunder' && alsFiles.length)) {
    if (alsFiles.length !== 1) { problems.push('an Alloy trial executes exactly one .als'); return { plan, problems }; }
    plan.checker = 'alloy'; plan.als = join(dossierDir, alsFiles[0]);
    if (!existsSync(plan.als)) { problems.push(`${alsFiles[0]} does not exist`); return { plan, problems }; }
    plan.alsParsed = parseAls(readFileSync(plan.als, 'utf8'));
    const names = Object.keys(call.expect);
    if (names.length !== 1) { problems.push('an Alloy call expects exactly one command, named under expect:'); return { plan, problems }; }
    const cmd = plan.alsParsed.commands.find(c => c.name === names[0]);
    if (!cmd) { problems.push(`${alsFiles[0]} has no check or run named ${names[0]}`); return { plan, problems }; }
    plan.command = cmd; plan.enabled = [cmd.name];
    const expect = call.expect[cmd.name].expect;
    const ok = cmd.kind === 'check' ? ['no counterexample', 'counterexample'] : ['instance', 'no instance'];
    if (!ok.includes(expect)) problems.push(`${cmd.name} is a ${cmd.kind}: its call expects ${ok.join(' or ')}, not "${expect}"`);
    if (call.kind === 'blunder') {
      if (!alsFiles[0].startsWith('model/blunders/')) problems.push('a blunder module lives under model/blunders/');
      if (expect !== (cmd.kind === 'check' ? 'counterexample' : 'no instance')) problems.push('a blunder expects the counterexample it must find');
      const base = blunderBase(call, dossierDir, 'model/', '.als', alsFiles[0], plan, problems, false);
      if (base) problems.push(...sameAssertion(dossierDir, alsFiles[0], base, cmd));
    } else if (alsFiles[0].startsWith('model/blunders/')) problems.push('only a blunder trial executes a module under model/blunders/');
    return { plan, problems };
  }

  if (call.kind === 'external') {
    plan.checker = 'external';
    const runner = externals[call.runner!];
    if (!runner) problems.push(`runner "${call.runner}" is not declared under external in dossier.json`);
    else if (!Array.isArray(runner.command) || !runner.command.length) problems.push(`runner "${call.runner}" has no command`);
    plan.runner = runner ? { id: call.runner!, ...runner } : null;
    for (const f of call.executes) if (!existsSync(join(dossierDir, f))) problems.push(`executes names ${f}, which does not exist`);
    for (const [n, o] of Object.entries(call.expect)) if (!['pass', 'fail'].includes(o.expect)) problems.push(`${n}: an external call expects pass or fail, not "${o.expect}"`);
    plan.enabled = Object.keys(call.expect);
    return { plan, problems };
  }

  problems.push(`a ${call.kind} trial executes a .tla and .cfg, a .tla for apalache, an .als, prose.md for the chart, or names a runner`);
  return { plan, problems };
}

// A deliberately bounded import resolver, not a second model checker parser.
// It captures local files used by the supported static import forms. Anything
// beyond that boundary is refused, rather than recorded as a complete closure.
const TLA_SHARED = new Set(['Naturals', 'Integers', 'Reals', 'Sequences', 'FiniteSets', 'Bags', 'TLC', 'Randomization', 'Json', 'IOUtils', 'TLCExt', 'Toolbox', 'Apalache', 'Variants', 'Folds']);
export function executionDependencies(dir: string, call: Call, plan: Plan): { files: string[]; shared: string[] } {
  const files = new Set(call.executes), shared = new Set<string>(), visited = new Set<string>();
  const read = (path: string) => readFileSync(join(dir, path), 'utf8');
  const local = (path: string): boolean => {
    const problem = outside(dir, path, 'import');
    if (problem) throw new Error(problem);
    if (!existsSync(join(dir, path))) return false;
    const stat = lstatSync(join(dir, path));
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`local import must be a regular file: ${path}`);
    files.add(path);
    return true;
  };
  if (plan.checker === 'tlc' || plan.checker === 'apalache') {
    const entry = relative(dir, plan.tla!);
    const home = posix.dirname(entry);
    const visitName = (name: string): void => {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) throw new Error(`unsupported TLA+ import: ${name}`);
      const path = posix.join(home, `${name}.tla`);
      if (local(path)) visit(path);
      else if (TLA_SHARED.has(name)) shared.add(`tla:${name}`);
      else throw new Error(`TLA+ import ${name} is not a local module beside ${entry} or a supported shared module`);
    };
    const visit = (path: string): void => {
      if (visited.has(path)) return;
      visited.add(path);
      const tokens = modelCode(read(path), 'tla').match(/[A-Za-z_][A-Za-z0-9_]*|[^\s]/g) || [];
      if (tokens.filter(token => token === 'MODULE').length > 1) throw new Error(`nested TLA+ modules are not supported for input capture: ${path}`);
      for (let i = 0; i < tokens.length; i++) {
        if (tokens[i] === 'INSTANCE') visitName(tokens[++i] || '');
        else if (tokens[i] === 'EXTENDS') {
          do { visitName(tokens[++i] || ''); } while (tokens[i + 1] === ',' && ++i);
          if (['/', '\\', '.', '"'].includes(tokens[i + 1])) throw new Error(`unsupported TLA+ import syntax in ${path}`);
        }
      }
    };
    visit(entry);
    if (plan.cfg) {
      const cfg = modelCode(readFileSync(plan.cfg, 'utf8'), 'tla');
      for (const match of cfg.matchAll(/<-\s*\[\s*([^\]]+)\s*\]/g)) visitName(match[1].trim());
    }
  } else if (plan.checker === 'alloy') {
    const entry = relative(dir, plan.als!);
    const declaration = modelCode(read(entry), 'alloy').match(/\bmodule\s+([A-Za-z_][A-Za-z0-9_]*(?:\/[A-Za-z_][A-Za-z0-9_]*)*)/);
    const segments = declaration ? declaration[1].split('/') : [];
    let home = posix.dirname(entry);
    for (let i = 1; i < segments.length; i++) home = posix.dirname(home);
    const visit = (path: string): void => {
      if (visited.has(path)) return;
      visited.add(path);
      const code = modelCode(read(path), 'alloy');
      for (const occurrence of code.matchAll(/\bopen\b/g)) {
        const match = code.slice(occurrence.index! + 4).match(/^\s+([A-Za-z_][A-Za-z0-9_]*(?:\/[A-Za-z_][A-Za-z0-9_]*)*)(?=\s|\[|$)/);
        if (!match) throw new Error(`unsupported Alloy open syntax in ${path}`);
        const name = match[1], imported = posix.join(home, `${name}.als`);
        if (local(imported)) visit(imported);
        else if (name.startsWith('util/')) shared.add(`alloy:${name}`);
        else throw new Error(`Alloy import ${name} is not a local module under ${home} or a shared util module`);
      }
    };
    visit(entry);
  }
  return { files: [...files].sort(), shared: [...shared].sort() };
}

// Mask comments and strings while retaining token boundaries and newlines.
// TLA+ permits nested block comments; import-looking text there is not a read.
function modelCode(text: string, kind: 'tla' | 'alloy'): string {
  let out = '', block = 0, quoted = false, line = false;
  for (let i = 0; i < text.length; i++) {
    const pair = text.slice(i, i + 2), char = text[i];
    if (line) { out += char === '\n' ? '\n' : ' '; if (char === '\n') line = false; continue; }
    if (quoted) {
      out += char === '\n' ? '\n' : ' ';
      if (char === '\\' && i + 1 < text.length) { out += ' '; i++; }
      else if (char === '"') quoted = false;
      continue;
    }
    const start = kind === 'tla' ? '(*' : '/*', end = kind === 'tla' ? '*)' : '*/';
    if (pair === start) { block++; out += '  '; i++; continue; }
    if (block && pair === end) { block--; out += '  '; i++; continue; }
    if (block) { out += char === '\n' ? '\n' : ' '; continue; }
    if (pair === (kind === 'tla' ? '\\*' : '//') || (kind === 'alloy' && pair === '--')) { line = true; out += '  '; i++; continue; }
    if (char === '"') { quoted = true; out += ' '; continue; }
    out += char;
  }
  if (block || quoted) throw new Error('unterminated comment or string in execution input');
  return out;
}

// The module a blunder is a copy of: the one base: names, or the only module under the model's
// folder. With several there, base: says which; a diff against the wrong one would mislead.
// missing: whether no module to compare with is a problem, as it is for TLA+.
// Returns the base, for the caller to hold the copy to it, or null when there is none to read.
function blunderBase(call: Call, dossierDir: string, home: string, ext: string, copy: string, plan: Plan, problems: string[], missing = true): string | null {
  let main: string | null = null;
  if (call.base) {
    const full = join(dossierDir, call.base);
    if (!call.base.startsWith('model/') || call.base.startsWith('model/blunders/') || !existsSync(full)) { problems.push(`base names ${call.base}, which must be a module under model/ and not under model/blunders/`); return null; }
    main = full;
  } else {
    const dir = join(dossierDir, home);
    const files = existsSync(dir) ? readdirSync(dir).filter(x => x.endsWith(ext) && !x.endsWith(`.scaffold${ext}`)).sort() : [];
    if (files.length > 1) { problems.push(`${home} holds ${files.join(', ')}: name the module the blunder is a copy of under base:`); return null; }
    if (files.length === 1) main = join(dir, files[0]);
  }
  if (main) plan.blunderDiff = diffAgainst(dossierDir, main, copy, problems);
  else if (missing) problems.push(`no module under ${home} to compare the blunder with`);
  return main;
}

// A blunder changes the model so that a property fails, which shows the property can fail. A copy
// that changes the property instead shows nothing, so what the property asks stays as the base has
// it. For TLA+, that is the property and every definition it reaches by name, and an inductive
// step's init: with what it reaches; the variables the question keeps besides the model's own, a
// Within's tick counter and a history variable, each where it starts and every update, with what
// those reach by name; and the constants all of these read. A module's definitions are its own,
// LOCAL ones among them, and those of the local modules it imports. TLC takes the constants from
// the copy's configuration, which must set them as one configuration of the base that enables the
// property does, when one does; a constant bound with <- reads its definition. Apalache takes them
// from cinit:, which must set them as the base's operator of that name does, with what each
// right-hand side reaches; a configuration the blunder executes beside it may set one of them only
// to the value the base's operator gives it.
const NEVER = 'a blunder changes the model, never the property';
const listed = (names: string[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);
const differ = (names: string[]) => `${listed(names)} ${names.length === 1 ? 'differs' : 'differ'}`;

// A configuration as the blunder check reads it: what it enables, its constants, and those it binds to a
// definition with <-.
interface Configured { path: string; enabled: string[]; constants: Cfg['constants']; overrides: Map<string, string> }
function configuration(dossierDir: string, path: string): Configured {
  const text = readFileSync(join(dossierDir, path), 'utf8'), parsed = parseCfg(text);
  return { path, enabled: parsed.enabled, constants: parsed.constants, overrides: overridesOf(text) };
}

// A module as the blunder check reads it: its definitions, LOCAL ones among them, and those of the local
// modules it imports, each with the file that holds it, its own first.
interface GuardModule { text: string; variables: string[]; texts: string[]; definitions: Record<string, TlaDefinition & { file: string }> }
function guardModule(dossierDir: string, entry: string, imports: string[]): GuardModule {
  const files = [entry, ...imports], texts = files.map(f => readFileSync(join(dossierDir, f), 'utf8'));
  const definitions: GuardModule['definitions'] = {};
  files.forEach((file, i) => {
    for (const [name, d] of Object.entries(parseTla(texts[i], { local: true }).definitions)) if (!Object.hasOwn(definitions, name)) definitions[name] = { ...d, file };
  });
  return { text: texts[0], variables: parseTla(texts[0]).variables, texts, definitions };
}
// The local modules a module imports by EXTENDS and INSTANCE, found as input capture finds them:
// beside the module. It throws where capture would refuse the module.
const localImports = (dossierDir: string, entry: string): string[] =>
  executionDependencies(dossierDir, { executes: [entry] } as Pick<Call, 'executes'> as Call, { checker: 'tlc', enabled: [], tla: join(dossierDir, entry), cfg: null }).files.filter(f => f !== entry);

interface Question {
  property: string;
  // The definition an inductive step starts from, when it is not the property.
  start?: string | null;
  // TLC: the copy's configuration, and the folder that holds the base's.
  cfg?: Configured & { home: string };
  // Apalache: the operator that sets the constants, and a configuration the call executes beside it.
  cinit?: string | null;
  configured?: Configured | null;
}
function sameQuestion(dossierDir: string, copy: string, base: string, { property, start = null, cfg, cinit = null, configured = null }: Question): string[] {
  const problems: string[] = [];
  const was = relative(dossierDir, base);
  // Where input capture would refuse an import, the trial is refused there; here both modules are then read alone.
  let imports: string[][] = [[], []];
  try { imports = [localImports(dossierDir, was), localImports(dossierDir, copy)]; } catch { /* read alone */ }
  const before = guardModule(dossierDir, was, imports[0]), after = guardModule(dossierDir, copy, imports[1]);
  const theirs = before.definitions, ours = after.definitions;
  const own = (defs: GuardModule['definitions'], n: string) => (Object.hasOwn(defs, n) ? defs[n] : null);
  const changed = (n: string) => own(theirs, n)?.hash !== own(ours, n)?.hash;
  // Where the base holds what differs: the module itself, or a module it imports.
  const from = (names: string[]) => listed([...new Set(names.map(n => own(theirs, n)?.file ?? was))].sort());
  // What names reach, in the base or in the copy: a name defined in one and not the other is a change.
  const reached = (names: string[]) => [...new Set([...reach(theirs, names), ...reach(ours, names)])].sort();
  const asked = reached([property]);
  if (changed(property)) problems.push(`${copy} changes ${property} itself: ${property} differs from ${from([property])}; ${NEVER}`);
  const helpers = asked.filter(n => n !== property && changed(n));
  if (helpers.length) problems.push(`${copy} changes what ${property} reads: ${differ(helpers)} from ${from(helpers)}; ${NEVER}`);
  const begun = start ? reached([start]).filter(n => !asked.includes(n) && changed(n)) : [];
  if (begun.length) problems.push(`${copy} changes where the step of ${property} starts: ${differ(begun)} from ${from(begun)}; ${NEVER}`);
  const question = [...new Set([...asked, ...(start ? reached([start]) : [])])].sort();
  // Every definition compared so far, so that none is reported twice.
  const compared = new Set(question);
  // The variables a property's question keeps besides the model's own: a Within N<k> counts ticks
  // in n<k>_ticks, and an Always that speaks of the past reads a history variable commented
  // `\* history for A<k>`. Where each starts and every update belong to the question. A blunder
  // may drop an action, and with it an update, but not count or remember otherwise. What the start
  // and the updates reach by name belongs to them, as a helper belongs to a property.
  const histories = [historiesOf(before.text, before.variables), historiesOf(after.text, after.variables)];
  const kept: { variable: string; whose: string }[] = [];
  for (const n of question.filter(name => /^[AON]\d+$/.test(name))) {
    if (/^N/.test(n)) kept.push({ variable: `${n.toLowerCase()}_ticks`, whose: `${n}'s tick counter` });
    for (const v of [...new Set(histories.flatMap(h => h[n] || []))].sort()) kept.push({ variable: v, whose: `${n}'s history` });
  }
  const counted: string[] = [];
  for (const { variable, whose } of kept) {
    const then = movesOf(theirs, variable), now = movesOf(ours, variable);
    if (then.start.join('\n') !== now.start.join('\n')) problems.push(`${copy} changes ${whose}: ${variable} starts otherwise than in ${was}; ${NEVER}`);
    const known = new Set(then.updates.map(u => u.expr));
    const where = [...new Set(now.updates.filter(u => !known.has(u.expr)).map(u => u.definition))].sort();
    if (where.length) problems.push(`${copy} changes ${whose}: ${listed(where)} ${where.length === 1 ? 'updates' : 'update'} ${variable} as ${was} never does; ${NEVER}`);
    const moves = [...then.start, ...now.start, ...[...then.updates, ...now.updates].map(u => u.expr)];
    const used = reached(moves.flatMap(namesIn)).filter(n => !compared.has(n));
    for (const n of used) compared.add(n);
    const moved = used.filter(changed);
    if (moved.length) problems.push(`${copy} changes ${whose}: ${differ(moved)} from ${from(moved)}; ${NEVER}`);
    counted.push(...moves);
  }
  const declared = new Set([...before.texts, ...after.texts].flatMap(constantsOf));
  const constantsIn = (names: string[]) => names.filter(n => declared.has(n));
  const readBy = (definitions: string[]) => definitions.flatMap(n => [own(theirs, n), own(ours, n)].flatMap(d => (d ? namesIn(d.text) : [])));
  const constants = new Set(constantsIn([...readBy([...compared]), ...counted.flatMap(namesIn)]));
  if (!constants.size) return problems;
  if (cfg) {
    // A constant bound with <- reads its definition: that and what it reaches join the comparison,
    // and the constants they read join these.
    const bound: string[] = [];
    for (const todo = [...constants]; todo.length;) {
      const k = todo.pop()!;
      const used = cfg.overrides.has(k) ? reached([cfg.overrides.get(k)!]).filter(n => !compared.has(n)) : [];
      for (const n of used) { compared.add(n); if (changed(n)) bound.push(n); }
      for (const n of constantsIn(readBy(used))) if (!constants.has(n)) { constants.add(n); todo.push(n); }
    }
    if (bound.length) problems.push(`${copy} changes the constants ${property} reads: ${differ(bound.sort())} from ${from(bound)}; ${NEVER}`);
    const home = join(dossierDir, cfg.home);
    const bases = (existsSync(home) ? readdirSync(home).filter(f => f.endsWith('.cfg') && !f.endsWith('.scaffold.cfg') && lstatSync(join(home, f)).isFile()).sort() : [])
      .map(f => configuration(dossierDir, posix.join(cfg.home, f))).filter(c => c.enabled.includes(property));
    const value = (c: Configured, k: string) => (Object.hasOwn(c.constants, k) && c.constants[k] != null ? `${c.overrides.has(k) ? '<-' : '='}${c.constants[k]!.replace(/\s+/g, '')}` : null);
    const all = [...constants].sort();
    // The copy asks what one of these asks: every constant as that one sets it.
    if (bases.length && !bases.some(b => all.every(k => value(b, k) === value(cfg, k)))) {
      const unmatched = all.filter(k => bases.every(b => value(b, k) !== value(cfg, k)));
      problems.push(`${cfg.path} changes the constants ${property} reads: no configuration under ${cfg.home} that enables ${property} sets ${unmatched.length ? `${listed(unmatched)} so` : `${listed(all)} so together`}; ${NEVER}`);
    }
    return problems;
  }
  const baseInit = cinit ? own(theirs, cinit) : null, copyInit = cinit ? own(ours, cinit) : null;
  const b = baseInit && assignmentsOf(baseInit), a = copyInit && assignmentsOf(copyInit);
  // Read as conjuncts K = v, the operators set each constant by a right-hand side and what it
  // reaches; the constants a right-hand side reads join these.
  const otherwise = new Set<string>();
  if (b && a) for (const todo = [...constants]; todo.length;) {
    const k = todo.pop()!;
    const names = [b.get(k), a.get(k)].flatMap(side => (side ? namesIn(side) : [])), used = reached(names);
    if ((b.get(k) ?? null) !== (a.get(k) ?? null) || used.some(changed)) otherwise.add(k);
    for (const n of constantsIn([...names, ...readBy(used)])) if (!constants.has(n)) { constants.add(n); todo.push(n); }
  }
  // Apalache reads a configuration's constants too. One the question reads takes the value the
  // base's cinit: operator gives it, through the definitions its right-hand side names.
  const here = configured ? [...constants].filter(k => Object.hasOwn(configured.constants, k)).sort() : [];
  if (configured && here.length && !cinit) problems.push(`${configured.path} sets ${listed(here)}, which ${property} reads: an Apalache blunder takes them from cinit:, as ${was} does; ${NEVER}`);
  else if (configured && here.length) {
    const flat = (s: string) => s.replace(/\s+/g, '');
    const set = (k: string) => { const v = configured.constants[k]; return v == null ? null : flat(configured.overrides.has(k) ? valueOf(configured.overrides.get(k)!, ours) : v); };
    const unlike = here.filter(k => !b || !b.has(k) || set(k) !== flat(valueOf(b.get(k)!, theirs)));
    if (unlike.length) problems.push(`${configured.path} sets ${listed(unlike)}, which ${property} reads, otherwise than ${cinit} in ${was}; ${NEVER}`);
  }
  if (b && a) {
    if (otherwise.size) problems.push(`${copy} changes the constants ${property} reads: its ${cinit} sets ${listed([...otherwise].sort())} otherwise than ${was}'s; ${NEVER}`);
  } else if (cinit) {
    // An operator that is not a conjunction of K = v is compared whole, with what it reaches.
    const whole = reached([cinit]).filter(changed);
    if (whole.length) problems.push(`${copy} changes the constants ${property} reads: ${differ(whole)} from ${from(whole)}; ${NEVER}`);
  }
  return problems;
}

// For Alloy: the assertion a check checks, or the predicate a run runs, and every pred and fun it
// reaches by name, with the command's own block when it carries one. Facts and sigs are the model,
// and a blunder may change them.
function sameAssertion(dossierDir: string, copy: string, base: string, command: AlsCommand): string[] {
  const problems: string[] = [];
  const was = relative(dossierDir, base);
  const read = (path: string) => alsParagraphs(readFileSync(path, 'utf8'));
  const theirs = read(base), ours = read(join(dossierDir, copy));
  const target = command.kind === 'check' ? 'assert' : 'pred';
  // Every paragraph of a name: a pred or fun may be overloaded, and a name reaches each overload.
  const every = (ps: AlsParagraph[], kinds: string[], name: string) => ps.filter(p => kinds.includes(p.kind) && p.name === name);
  const hashes = (ps: AlsParagraph[], kinds: string[], name: string) => every(ps, kinds, name).map(p => `${p.kind} ${p.hash}`).sort().join(' ');
  const roots = (ps: AlsParagraph[]) => [...every(ps, [target], command.name), ...every(ps, [command.kind], command.name)];
  // The text is already without comments; Alloy has no strings to speak of.
  const names = (p: AlsParagraph) => p.text.match(/[A-Za-z_]\w*/g) || [];
  const reached = (ps: AlsParagraph[]) => {
    const seen = new Set<string>(), todo = roots(ps).flatMap(names);
    while (todo.length) {
      const name = todo.pop()!;
      const found = every(ps, ['pred', 'fun'], name);
      if (seen.has(name) || !found.length || name === command.name) continue;
      seen.add(name);
      todo.push(...found.flatMap(names));
    }
    return seen;
  };
  const itself = (ps: AlsParagraph[]) => `${hashes(ps, [target], command.name)} / ${hashes(ps, [command.kind], command.name)}`;
  if (itself(theirs) !== itself(ours)) problems.push(`${copy} changes ${command.name} itself: ${command.name} differs from ${was}; ${NEVER}`);
  const helpers = [...new Set([...reached(theirs), ...reached(ours)])].sort().filter(n => hashes(theirs, ['pred', 'fun'], n) !== hashes(ours, ['pred', 'fun'], n));
  if (helpers.length) problems.push(`${copy} changes what ${command.name} reads: ${differ(helpers)} from ${was}; ${NEVER}`);
  return problems;
}

function diffAgainst(dossierDir: string, main: string, copy: string, problems: string[]): string {
  if (resolve(dossierDir, copy) === resolve(main)) return '';   // the blunder is the module itself; already refused above
  const diff = spawnSync('diff', ['-u', relative(dossierDir, main), copy], { cwd: dossierDir, encoding: 'utf8' });
  if (diff.status === 0) problems.push(`${copy} does not differ from ${relative(dossierDir, main)}`);
  return diff.stdout;
}

// A readable account of how a mutated machine differs from the prose's.
export function describeMachineDiff(ir: Ir, mutated: Ir): string {
  const lines: string[] = [];
  const byId = <T extends { id: string }>(list: T[] | null | undefined) => Object.fromEntries((list || []).map(x => [x.id, x]));
  const a = byId(ir.transitions), b = byId(mutated.transitions);
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (!a[id]) lines.push(`+ ${id}: added ${JSON.stringify(b[id])}`);
    else if (!b[id]) lines.push(`- ${id}: removed`);
    else for (const key of ['from', 'event', 'target', 'stays', 'guard', 'assigns', 'effects'] as const) {
      if (JSON.stringify(a[id][key]) !== JSON.stringify(b[id][key])) lines.push(`~ ${id}.${key}: ${JSON.stringify(a[id][key])} -> ${JSON.stringify(b[id][key])}`);
    }
  }
  const sa = byId(ir.states), sb = byId(mutated.states);
  for (const id of new Set([...Object.keys(sa), ...Object.keys(sb)])) {
    if (!sa[id]) lines.push(`+ ${id}: added state ${JSON.stringify(sb[id])}`);
    else if (!sb[id]) lines.push(`- ${id}: removed state`);
    else if (JSON.stringify(sa[id]) !== JSON.stringify(sb[id])) lines.push(`~ ${id}: ${JSON.stringify(sa[id])} -> ${JSON.stringify(sb[id])}`);
  }
  if (JSON.stringify(ir.context) !== JSON.stringify(mutated.context)) lines.push(`~ context: ${JSON.stringify(ir.context)} -> ${JSON.stringify(mutated.context)}`);
  return lines.join('\n') + (lines.length ? '\n' : '');
}
