// dossier setup [--knowledge <path>] [--install] [--root <path> | --dir <path>]: prepare
// dossiers/ under the working directory, the folder --root names, or dossiers/ under
// --dir. Idempotent: existing files are kept; only dossier.json is rewritten, with every
// field it held. An invalid marker is refused before persistent content changes. A root
// that is not dossiers/ beside the project folder is named in the project's .dossier-root,
// where the dossier command finds it. The smoke test verifies the plugin's fixture, which writes nothing.
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { main as doctor } from './doctor.ts';
import { main as verify, verifyAll } from './verify.ts';
import { briefLines, verifyLine } from '../verify/render.ts';
import { POINTER, readMarker, UsageError } from '../dossiers/root.ts';
import { findModule } from '../chart/draw.ts';
import { STORAGE } from '../dossiers/integrity.ts';
import { dossierPathExists } from '../dossiers/initialize.ts';
import { durableWrite, withPublicationLock } from '../dossiers/publication.ts';
import type { PublicationOptions } from '../dossiers/publication.ts';
import type { CommandContext } from '../cli.ts';

const ACTORS = '# Actors\n\nWho sends events, and the modes each may take under a scenario.\n\n```yaml\nactors:\n  - id: chain\n    name: the chain\n    kind: chain\n    modes: [honest, offline]\n  - id: public\n    name: the public\n    kind: public\n    modes: [honest, malicious, offline]\n```\n';
const SCENARIOS = '# Scenarios\n\nA mode for every actor; all-honest always exists.\n\n```yaml\nscenarios:\n  - id: all-honest\n    modes: {}\n```\n';
const README = '# Dossiers\n\nOne dossier per part and per composition: prose the owners settle, and the charts, models, answers and ledgers the tool writes. Start a part with `dossier decide <id> begin`, and a composition with `dossier decide <id> begin composition`. For where everything stands, run `dossier render` and read `index.md`. Git ignores the index, since render rebuilds it from the dossiers.\n';
// The chart's libraries, which draw and chart trials load at run time.
const PACKAGE = JSON.stringify({ name: 'dossiers', private: true, type: 'module', dependencies: { xstate: '^5.33.3', '@xstate/graph': '^3.0.4' } }, null, 2) + '\n';
// Kept out of git: index.md, which dossier render rebuilds and which, as a view of every dossier,
// would otherwise change, and conflict, whenever any dossier did; the local workspace; the libraries;
// and each trial's bundle, which stays on the machine that ran it while its answer goes to evidence/.
const GITIGNORE = '# Written by dossier setup. dossier render rebuilds index.md from the dossiers,\n# _scratch/ is a local workspace, node_modules/ holds the chart\'s libraries, and trials/\n# and .running/ hold each trial\'s bundle on the machine that ran it.\n/index.md\n/_scratch/\n/node_modules/\n/parts/*/trials/\n/compositions/*/trials/\n/parts/*/.running/\n/compositions/*/.running/\n';

// Read only after acquiring the root lock, which a new dossier's begin or import also takes.
// Keep all fields not updated by setup. A marker naming another storage does not read (readMarker
// says so), and one naming none while dossiers exist under it belongs to records this plugin does
// not read: setup claims neither. With no dossier yet there is nothing to protect, and setup
// names integrity-v1.
export function rewriteSetupMarker(dossiers: string, version: string, today: string, knowledgeRoot?: string, options: PublicationOptions = {}): { marker: Record<string, unknown>; created: boolean } {
  return withPublicationLock(dossiers, () => {
    options.boundary?.('root-marker:locked');
    const path = join(dossiers, 'dossier.json');
    let previous: Record<string, unknown> | null = null;
    if (dossierPathExists(path)) {
      const stat = lstatSync(path);
      if (stat.isSymbolicLink() || !stat.isFile()) throw new UsageError('dossier.json must be a regular file, not a symbolic link or special file');
      const parsed = readMarker(dossiers);
      if (parsed.error) throw new UsageError(`${parsed.error} (${path}); correct it before running setup`);
      previous = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
    }
    if (!previous && ['parts', 'compositions'].some(kind => dossierPathExists(join(dossiers, kind)))) {
      throw new UsageError('existing dossier directories have no root marker; restore dossier.json from version control before setup');
    }
    const holdsDossiers = ['parts', 'compositions'].some(kind => dossierPathExists(join(dossiers, kind)) && readdirSync(join(dossiers, kind)).some(entry => !entry.startsWith('.')));
    if (previous && previous.storage === undefined && holdsDossiers) {
      throw new UsageError(`dossier.json names no storage while dossiers exist under it; this plugin keeps ${STORAGE} roots only, and setup does not convert another format`);
    }
    const marker: Record<string, unknown> = { ...previous, storage: STORAGE, plugin: version, setup: (previous && typeof previous.setup === 'string' && previous.setup) || today, updated: today };
    if (knowledgeRoot !== undefined) {
      const kept = previous?.knowledge as Record<string, unknown> | undefined;
      marker.knowledge = { ...kept, root: knowledgeRoot };
    }
    durableWrite(path, JSON.stringify(marker, null, 2) + '\n', options, 'root-marker');
    return { marker, created: previous === null };
  });
}

export async function main(command: string, args: string[], { root: pluginRoot, version }: CommandContext): Promise<number> {
  const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : null; };
  // --root names the dossiers folder itself; --dir the project folder that holds dossiers/.
  const project = opt('--dir') ? resolve(process.cwd(), opt('--dir')!) : process.cwd();
  const dossiers = opt('--root') ? resolve(process.cwd(), opt('--root')!) : join(project, 'dossiers');
  const name = basename(dossiers);
  const repository = repositoryOf(dossiers, project);
  const today = new Date().toISOString().slice(0, 10);
  const say = (verb: string, what: string) => console.log(`${verb} ${what}`);

  if (!existsSync(dossiers)) { mkdirSync(dossiers, { recursive: true }); say('created', `${name}/`); } else say('kept', `${name}/`);
  // A knowledge base inside the repository is kept relative to the dossiers folder, so it travels
  // with the repository; one outside it is kept absolute, which holds on this machine only.
  const given = opt('--knowledge') ? resolve(process.cwd(), opt('--knowledge')!) : null;
  const configuredKnowledge = given ? inside(given, repository) ? relative(dossiers, given) || '.' : given : undefined;
  const { marker, created } = rewriteSetupMarker(dossiers, version, today, configuredKnowledge);
  const knowledgeRoot = (marker.knowledge as { root?: unknown } | undefined)?.root;
  const knowledge = typeof knowledgeRoot === 'string' && knowledgeRoot.trim() ? knowledgeRoot : null;
  say(created ? 'created' : 'rewrote', `${name}/dossier.json`);

  // A root that is neither the project folder nor dossiers/ in it is named in .dossier-root.
  const named = relative(project, dossiers);
  if (named && named !== 'dossiers') {
    const pointer = join(project, POINTER);
    const before = existsSync(pointer) ? readFileSync(pointer, 'utf8').trim() : null;
    if (before === named) say('kept', `${POINTER}, naming ${named}`);
    else { writeFileSync(pointer, `${named}\n`); say(before === null ? 'created' : 'rewrote', `${POINTER}, naming ${named} for the dossier command; commit it`); }
  }

  keep(join(dossiers, 'README.md'), README, say, `${name}/README.md`);
  keep(join(dossiers, 'package.json'), PACKAGE, say, `${name}/package.json`);
  keep(join(dossiers, '.gitignore'), GITIGNORE, say, `${name}/.gitignore`);
  mkdirSync(join(dossiers, 'actors'), { recursive: true });
  keep(join(dossiers, 'actors', 'actors.md'), ACTORS, say, `${name}/actors/actors.md`);
  keep(join(dossiers, 'actors', 'scenarios.md'), SCENARIOS, say, `${name}/actors/scenarios.md`);
  for (const d of ['parts', 'compositions']) { mkdirSync(join(dossiers, d), { recursive: true }); }
  if (knowledge) {
    const k = resolve(dossiers, knowledge);
    if (existsSync(join(k, 'modules'))) say('knowledge', k); else console.log(`knowledge: ${k} has no modules/ folder; references will not resolve`);
    if (isAbsolute(knowledge)) console.log(`knowledge: ${k} is outside the repository, so dossier.json keeps its absolute path, which is machine-specific`);
  }
  else console.log('knowledge: none configured; pass --knowledge <path to the records> to resolve references');
  if (args.includes('--install')) {
    const r = spawnSync('npm', ['install', '--no-audit', '--no-fund'], { cwd: dossiers, stdio: 'inherit' });
    if (r.status !== 0) { console.error('setup: npm install failed'); return r.status || 1; }
  } else if (!existsSync(join(dossiers, 'node_modules', 'xstate')) || !existsSync(join(dossiers, 'node_modules', '@xstate', 'graph'))) {
    // Draw looks above the dossiers root, then in the plugin's own node_modules.
    const found = findModule(dossiers, 'xstate');
    if (found && findModule(dossiers, '@xstate/graph')) console.log(`deps: run dossier setup --install to put xstate and @xstate/graph under ${name}/; ${inside(found.dir, pluginRoot) ? "the plugin's own copies" : `the copies in ${dirname(found.dir)}`} serve meanwhile`);
    else console.log('deps: xstate and @xstate/graph are not installed, and draw and chart trials need them: run dossier setup --install');
  }
  console.log('--- doctor ---');
  await doctor('doctor', ['--root', dossiers], { root: pluginRoot, version });
  console.log("--- smoke test: the plugin's fixture, read without writing ---");
  let smoke = 0;
  try {
    const r = verifyAll({ root: join(pluginRoot, 'qualification', 'fixture', 'dossiers'), version, write: false });
    const all = [...r.parts, ...r.compositions];
    console.log(verifyLine(all, version));
    for (const a of all) console.log(briefLines(a)[0]);
    smoke = all.some(a => a.tripwires.length) ? 1 : 0;
  } catch (e) { console.log(`smoke test did not run: ${(e as Error).message}`); smoke = 1; }
  console.log('--- this repository ---');
  const here = await verify('verify', ['--root', dossiers, '--brief'], { root: pluginRoot, version });
  return smoke || here || 0;
}

// The repository a dossiers folder belongs to: the nearest folder above it with .git, else the
// project folder when it holds the dossiers folder, else the folder that does.
function repositoryOf(dossiers: string, project: string): string {
  for (let dir = dossiers; ; dir = dirname(dir)) {
    if (existsSync(join(dir, '.git'))) return dir;
    if (dirname(dir) === dir) break;
  }
  return inside(dossiers, project) ? project : dirname(dossiers);
}

// Whether a path lies in a folder or is the folder itself.
function inside(path: string, folder: string): boolean {
  const rel = relative(folder, path);
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

function keep(path: string, content: string, say: (verb: string, what: string) => void, name: string): void {
  if (existsSync(path)) { say('kept', name); return; }
  writeFileSync(path, content);
  say('created', name);
}
