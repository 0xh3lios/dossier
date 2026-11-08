// The explorer's page is built on the machine that serves it and never committed. Its packages come
// from npm at the versions apps/explorer/package-lock.json pins, and esbuild bundles them.
// `dossier explore --install` makes the build in the dossiers root, in .explorer/, a folder that
// ignores itself. The packages are removed once the bundle is made, so only the page stays, with a
// stamp naming the sources it was built from.
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

export const EXPLORER = '.explorer';
const SKIP = new Set(['node_modules', 'dist']);

// The page's sources in a folder: every file but its packages and a local build.
function sourceFiles(dir: string, base = dir): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(d => {
    if (SKIP.has(d.name)) return [];
    const path = join(dir, d.name);
    return d.isDirectory() ? sourceFiles(path, base) : [relative(base, path).split(sep).join('/')];
  }).sort();
}
export const appDir = (pluginRoot: string) => join(pluginRoot, 'apps', 'explorer');
// A path as the messages show it: from the working directory when it is under it, and whole otherwise.
export const shown = (path: string) => { const r = relative(process.cwd(), path); return r && !r.startsWith('..') ? r : path; };

// One hash over a folder's sources, their paths and their contents.
export function hashDir(dir: string): string {
  const h = createHash('sha256');
  for (const file of sourceFiles(dir)) h.update(file).update('\0').update(readFileSync(join(dir, file))).update('\0');
  return h.digest('hex').slice(0, 16);
}
// The hash of the plugin's page sources, which a current stamp names.
export const sourceHash = (pluginRoot: string) => hashDir(appDir(pluginRoot));

export interface Stamp { source: string; version: string; built: string }
// Where the build is, whether it is current, and why not.
export interface BuildState { dir: string; dist: string; ready: boolean; why: string | null; stamp: Stamp | null }

export function buildState(root: string, pluginRoot: string): BuildState {
  const dir = join(root, EXPLORER), dist = join(dir, 'dist');
  let stamp: Stamp | null = null;
  try { stamp = JSON.parse(readFileSync(join(dir, 'stamp.json'), 'utf8')); } catch { /* Not built. */ }
  if (!stamp || !existsSync(join(dist, 'index.html'))) return { dir, dist, ready: false, why: 'not built: run dossier explore --install, which downloads its packages from npm once', stamp: null };
  if (stamp.source !== sourceHash(pluginRoot)) return { dir, dist, ready: false, why: `built from other sources, by dossier ${stamp.version}: run dossier explore --install`, stamp };
  return { dir, dist, ready: true, why: null, stamp };
}

const sizeOf = (dir: string): number => readdirSync(dir, { withFileTypes: true }).reduce((n, d) => n + (d.isDirectory() ? sizeOf(join(dir, d.name)) : statSync(join(dir, d.name)).size), 0);

// Builds the page into <root>/.explorer/dist: copies the sources, installs the pinned packages
// without running their scripts, bundles, then keeps the bundle and removes the rest. A failed step
// removes what it made and leaves the page as it was.
export function install(root: string, pluginRoot: string, version: string, say: (line: string) => void): number {
  const dir = join(root, EXPLORER), work = join(dir, 'build'), dist = join(dir, 'dist');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, '.gitignore'), '# Written by dossier explore --install: the explorer\'s page, built on this machine.\n*\n');
  rmSync(work, { recursive: true, force: true });
  cpSync(appDir(pluginRoot), work, { recursive: true, filter: src => !SKIP.has(basename(src)) });
  // The stamp names the copy the page is built from, not the plugin's folder, which may change meanwhile.
  const source = hashDir(work);
  const abandon = (message: string, code: number | null) => { rmSync(work, { recursive: true, force: true }); say(message); return code || 1; };
  say(`explore: installing the page's packages from npm into ${shown(work)}`);
  const npm = spawnSync('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: work, stdio: 'inherit' });
  if ((npm.error as NodeJS.ErrnoException | undefined)?.code === 'ENOENT') return abandon('explore: npm is not on the PATH; it comes with Node', 1);
  if (npm.status !== 0) return abandon(`explore: npm ci failed${npm.error ? `: ${npm.error.message}` : ''}; it needs network access to the npm registry`, npm.status);
  const built = spawnSync(process.execPath, ['build.mjs'], { cwd: work, stdio: 'inherit' });
  if (built.status !== 0) return abandon('explore: the bundle failed', built.status);
  rmSync(dist, { recursive: true, force: true });
  renameSync(join(work, 'dist'), dist);
  const stamp: Stamp = { source, version, built: new Date().toISOString() };
  writeFileSync(join(dir, 'stamp.json'), JSON.stringify(stamp, null, 2) + '\n');
  rmSync(work, { recursive: true, force: true });
  say(`explore: built the page in ${shown(dist)} (${(sizeOf(dist) / 1e6).toFixed(1)} MB); the packages are removed`);
  return 0;
}
