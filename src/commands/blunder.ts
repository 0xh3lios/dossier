// dossier blunder <dossier> <copy> --replace <text> --with <text> --wrong "<words>" [--property P]
//   [--scenario S] [--base Module] [--all] [--reach <words>] [--because <words>] [--force]
// Writes a blunder: a copy of the base module under model/blunders/<copy>.tla with its MODULE line
// renamed and the one replacement applied, the configuration beside it that enables exactly the one
// property, and the call calls/blunder-<copy>.md through the same code as dossier call. A
// part's configuration is the base's own that enables the property; a composition's is the cell's
// generated one. An Alloy base, --base <Module>.als, is copied to model/blunders/<copy>.als and its
// one check is the property. The agent chooses the wrong; the tool writes the files.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { findRoot, locate } from '../dossiers/root.ts';
import { isRetired } from '../dossiers/decisions.ts';
import { loadPart, loadComposition, compositionModuleText } from '../dossiers/load.ts';
import { parseCfg } from '../models/tla.ts';
import { parseAls } from '../models/alloy.ts';
import { blunderCfgs, composeCall, readOptions, writeCall } from './call.ts';
import { partModule } from './scaffold.ts';

const VALUED = ['--replace', '--with', '--wrong', '--property', '--scenario', '--base', '--reach', '--because'];
const FLAGS = ['--all', '--force'];
const usage = 'usage: dossier blunder <dossier> <copy> --replace <text> --with <text> --wrong "<words>" [--property <id>] [--scenario <id>] [--base <module>] [--all] [--reach <words>] [--because <words>] [--force]';
const COPY = /^[A-Za-z_][A-Za-z0-9_]*$/;

export async function main(command: string, args: string[]): Promise<number> {
  const root = findRoot(args);
  if (!root) { console.error('dossier blunder: no dossiers root here. Run dossier setup.'); return 2; }
  const { positional, values, flags, problems: optionProblems } = readOptions(args, VALUED, FLAGS);
  if (optionProblems.length) { console.error(`dossier blunder: ${optionProblems.join('; ')}\n${usage}`); return 2; }
  const [name, copy, ...extra] = positional;
  if (!name || !copy || extra.length) { console.error(usage); return 2; }
  const repeated = Object.entries(values).filter(([, v]) => v.length > 1).map(([k]) => k);
  if (repeated.length) { console.error(`dossier blunder: ${repeated.join(', ')} given more than once; a blunder is one replacement`); return 2; }
  const one = (key: string): string | null => (values[key] ? values[key][0] : null);
  const where = locate(root, name);
  if (!where) { console.error(`dossier blunder: no part or composition named ${name} under ${root}`); return 2; }
  const ref = `${where.kind === 'part' ? 'parts' : 'compositions'}/${where.id}`;
  const refuse = (...lines: string[]) => { console.error(`dossier blunder: refused\n  ${lines.join('\n  ')}`); return 2; };
  if (isRetired(where.dir)) { console.error(`dossier blunder: ${ref} is retired; dossier decide ${ref} begin reopens it`); return 2; }
  if (!COPY.test(copy)) return refuse(`a blunder copy is named as a TLA+ module is, letters, digits and underscores, not "${copy}"`);
  const replace = one('--replace'), replacement = one('--with'), wrong = one('--wrong');
  const missing = [replace == null && '--replace', replacement == null && '--with', !wrong && '--wrong'].filter(Boolean);
  if (missing.length) return refuse(`a blunder needs ${missing.join(', ')}`);
  if (!replace) return refuse('--replace names text in the module, not an empty string');
  if (/[\r\n]/.test(wrong!)) return refuse('--wrong is one line');
  if (replace === replacement) return refuse('--with is the same text as --replace; a blunder changes the model');
  const force = flags.has('--force');
  const isComposition = where.kind === 'composition';
  const callName = `blunder-${copy}`;
  if (existsSync(join(where.dir, 'calls', `${callName}.md`)) && !force) return refuse(`${ref}/calls/${callName}.md exists; --force replaces it`);

  // The base: the part's module, the one --base names, or the composition's generated module.
  const property = one('--property'), scenario = one('--scenario'), baseOption = one('--base');
  let baseRel: string, baseName: string, baseText: string, alloy = false;
  if (isComposition) {
    const s = loadComposition(root, where.id);
    const unread = [...s.prose.errors, ...s.prose.misnamed, ...s.composed.errors];
    if (unread.length) return refuse(`${ref} does not compose:`, ...unread.map(e => `  ${e}`));
    baseName = s.composed.module!;
    baseRel = `model/generated/${baseName}.tla`;
    if (baseOption && ![baseName, `${baseName}.tla`, baseRel].includes(baseOption)) return refuse(`a composition blunder copies its generated module, ${baseRel}, not ${baseOption}`);
    baseText = compositionModuleText(s);
  } else {
    const c = loadPart(root, where.id);
    if (!c.ir.ok) return refuse(`${ref} does not compile; run dossier draw ${where.id}`);
    const file = baseOption ? (baseOption.includes('/') ? baseOption.replace(/^model\//, '') : /\.(tla|als)$/.test(baseOption) ? baseOption : `${baseOption}.tla`) : `${partModule(where.id)}.tla`;
    if (file.includes('/') || !/\.(tla|als)$/.test(file)) return refuse(`--base names a module under model/, not ${baseOption}`);
    alloy = file.endsWith('.als');
    baseRel = `model/${file}`;
    baseName = file.replace(/\.(tla|als)$/, '');
    if (!existsSync(join(where.dir, baseRel))) return refuse(`${baseRel} does not exist${baseOption ? '' : `; run dossier scaffold ${where.id}`}`);
    baseText = readFileSync(join(where.dir, baseRel), 'utf8');
  }
  if (alloy && scenario) return refuse('--scenario belongs to a composition blunder');
  if (!isComposition && scenario) return refuse('--scenario belongs to a composition blunder');
  if (isComposition && !scenario) return refuse('a composition blunder names the scenario of the cell it must catch: --scenario <id>');

  // The copy: the base renamed, with the one replacement.
  let text = baseText;
  if (!alloy) {
    const line = /^(-{4,}\s*MODULE\s+)([A-Za-z_][A-Za-z0-9_]*)(\s)/m;
    if (!line.test(text)) return refuse(`${baseRel} has no MODULE line to rename`);
    text = text.replace(line, (_, a: string, _n: string, b: string) => `${a}${copy}${b}`);
  }
  const count = text.split(replace).length - 1;
  if (count === 0) return refuse(`--replace text is not in ${baseRel}`);
  if (count > 1 && !flags.has('--all')) return refuse(`--replace text is in ${baseRel} ${count} times; make it unique, or --all replaces each`);
  text = text.split(replace).join(replacement!);

  // The property the blunder must catch, and the configuration that enables it alone.
  let cfgName: string | null = null, cfgText: string | null = null, caught: string;
  if (alloy) {
    const commands = parseAls(text).commands;
    if (commands.length !== 1) return refuse(`the copy of ${baseRel} has ${commands.map(c => c.name).join(', ') || 'no command'}; an Alloy blunder has exactly one check`);
    caught = commands[0].name;
    if (property && property !== caught && !caught.startsWith(`${property}_`)) return refuse(`the copy checks ${caught}, not ${property}`);
  } else {
    if (!property) return refuse('a blunder names the property it must catch: --property <id>');
    caught = property;
    let source: string | null = null;
    if (isComposition) {
      const s = loadComposition(root, where.id);
      if (!s.actors.scenarios.some(x => x.id === scenario)) return refuse(`scenario ${scenario} is not declared in actors/scenarios.md`);
      const cell = s.composed.cells.find(c => c.property === property && c.scenario === scenario);
      if (!cell) return refuse(`${property} × ${scenario} is not a cell of ${ref}`);
      source = s.composed.cfgs[cell.cfg];
    } else {
      // The base's own configuration when it enables the property, else the first beside it that does.
      const model = join(where.dir, 'model');
      const all = readdirSync(model).filter(f => f.endsWith('.cfg') && !f.endsWith('.scaffold.cfg')).sort();
      const order = [`${baseName}.cfg`, `${baseName}_${property}.cfg`, ...all.filter(f => f.startsWith(`${baseName}`))].filter((f, i, a) => a.indexOf(f) === i && existsSync(join(model, f)));
      const found = order.find(f => parseCfg(readFileSync(join(model, f), 'utf8')).enabled.includes(property));
      if (!found) return refuse(`no configuration of ${baseName} under model/ enables ${property}`);
      source = readFileSync(join(model, found), 'utf8');
    }
    const reduced = onlyProperty(source!, property);
    if (!reduced) return refuse(`the configuration enables no ${property}`);
    cfgName = `${copy}_${property}.cfg`;
    cfgText = reduced;
  }

  // Write the copy and its configuration, then the call; a call refused takes the files back.
  const dir = join(where.dir, 'model', 'blunders');
  const copyFile = join(dir, `${copy}${alloy ? '.als' : '.tla'}`);
  const other = join(dir, `${copy}${alloy ? '.tla' : '.als'}`);
  if (existsSync(other)) return refuse(`model/blunders/${copy}${alloy ? '.tla' : '.als'} exists; name the copy apart`);
  const stale = blunderCfgs(dir, copy).filter(f => f !== cfgName);
  if ((existsSync(copyFile) || stale.length) && !force) return refuse(`model/blunders/${copy}${alloy ? '.als' : '.tla'} exists; --force replaces it`);
  const before = new Map<string, string | null>();
  for (const f of [copyFile, ...(cfgName ? [join(dir, cfgName)] : []), ...stale.map(f => join(dir, f))]) before.set(f, existsSync(f) ? readFileSync(f, 'utf8') : null);
  mkdirSync(dir, { recursive: true });
  for (const f of stale) rmSync(join(dir, f));
  writeFileSync(copyFile, text);
  if (cfgName) writeFileSync(join(dir, cfgName), cfgText!);
  const modules = readdirSync(join(where.dir, isComposition ? 'model/generated' : 'model')).filter(f => f.endsWith(alloy ? '.als' : '.tla') && !f.endsWith(alloy ? '.scaffold.als' : '.scaffold.tla'));
  const request = {
    name: callName, kind: 'blunder', target: copy, scenario, reach: one('--reach'), because: one('--because'), blunder: wrong,
    base: !isComposition && modules.length > 1 ? baseRel : null, force: true,
  };
  const composed = composeCall(root, where, request);
  if (composed.problems.length) {
    for (const [f, t] of before) { if (t == null) rmSync(f, { force: true }); else writeFileSync(f, t); }
    return refuse(...composed.problems);
  }
  console.log(`wrote ${ref}/model/blunders/${copy}${alloy ? '.als' : '.tla'}, ${count === 1 ? 'one replacement' : `${count} replacements`}`);
  if (cfgName) console.log(`wrote ${ref}/model/blunders/${cfgName}, enabling ${caught} alone`);
  return writeCall(root, where, request, 'blunder');
}

// A configuration with its INVARIANT and PROPERTY sections reduced to the one property, in the
// section that held it, or null when neither held it.
export function onlyProperty(text: string, property: string): string | null {
  const parsed = parseCfg(text);
  const section = parsed.invariants.includes(property) ? 'INVARIANTS' : parsed.properties.includes(property) ? 'PROPERTIES' : null;
  if (!section) return null;
  const KEYWORDS = /^(SPECIFICATION|INIT|NEXT|INVARIANTS?|PROPERTY|PROPERTIES|CONSTANTS?|CONSTRAINTS?|CHECK_DEADLOCK|SYMMETRY|VIEW|ACTION_CONSTRAINTS?|ALIAS|POSTCONDITION)\b/;
  const out: string[] = [];
  let dropping = false, placed = false;
  for (const line of text.split('\n')) {
    const keyword = line.match(KEYWORDS);
    if (keyword) dropping = /^(INVARIANTS?|PROPERTY|PROPERTIES)$/.test(keyword[1]);
    if (dropping && (keyword || (line.trim() && !line.trim().startsWith('\\*')))) {
      if (keyword && !placed) { out.push(`${section} ${property}`); placed = true; }
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}
