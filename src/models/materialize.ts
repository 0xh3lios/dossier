import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const keep = (path: string, text: string) => { if (existsSync(path) && readFileSync(path, 'utf8') === text) return false; writeFileSync(path, text); return true; };

// A composition's generated module and configurations, each written where it moved, and every other
// file under model/generated/ removed: a configuration for a scenario no property claims any more
// is no cell, and would stay callable while it lay there. Trial uses this only
// inside its private execution copy; scaffold writes the reviewable view.
export function writeGenerated(dir: string, composed: { module?: string; cfgs: Record<string, string> }, moduleText: string): { written: string[]; removed: string[] } {
  const gen = join(dir, 'model', 'generated');
  const files: Record<string, string> = { [`${composed.module}.tla`]: moduleText, ...composed.cfgs };
  // Validate every path before changing any file. A symlink at an ancestor,
  // destination or stale entry must never redirect a write or a deletion.
  for (const path of [dir, join(dir, 'model'), gen]) {
    let stat;
    try { stat = lstatSync(path); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) throw new Error(`generated model path must be a directory, not a symbolic link or special file: ${path}`);
  }
  for (const name of Object.keys(files)) if (!name || basename(name) !== name || name.includes('\\') || name.startsWith('.')) throw new Error(`invalid generated filename: ${name}`);
  const entries = existsSync(gen) ? readdirSync(gen).sort() : [];
  for (const entry of entries) {
    const stat = lstatSync(join(gen, entry));
    if (stat.isSymbolicLink()) throw new Error(`generated model entry must not be a symbolic link: ${entry}`);
    if (Object.hasOwn(files, entry) && !stat.isFile()) throw new Error(`generated model destination must be a regular file: ${entry}`);
  }
  mkdirSync(gen, { recursive: true });
  const written: string[] = [], removed: string[] = [];
  for (const [name, text] of Object.entries(files)) if (keep(join(gen, name), text)) written.push(name);
  for (const entry of entries) {
    if (entry.startsWith('.') || Object.hasOwn(files, entry) || !lstatSync(join(gen, entry)).isFile()) continue;
    rmSync(join(gen, entry));
    removed.push(entry);
  }
  return { written, removed };
}

