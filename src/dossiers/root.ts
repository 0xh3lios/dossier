// The dossiers root: a directory holding dossier.json, with parts/ and compositions/.
import { existsSync, lstatSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// A runner declared under "external" in dossier.json.
export interface ExternalRunner { command: string[]; cwd?: string }
// dossier.json, as dossier setup writes it. error says why the file does not read, does not
// parse, or holds a known field in the wrong shape; the fields that did read stay beside it.
export interface Marker {
  storage?: 'integrity-v1';
  plugin?: string;
  setup?: string;
  updated?: string;
  knowledge?: { root: string };
  external?: Record<string, ExternalRunner>;
  note?: string;
  error?: string;
}
// A part or composition dossier found under the root.
export interface Located { kind: 'part' | 'composition'; id: string; dir: string }

// A refusal the person fixes by naming something else: the command line prints it as
// `dossier <command>: <message>` and exits 2, as for any other usage error.
export class UsageError extends Error {
  name = 'UsageError';
}

// The file a project keeps when its dossiers root is not dossiers/ beside it: one line, the
// root's path relative to the file's folder. dossier setup writes it; findRoot reads it.
export const POINTER = '.dossier-root';

// A dossier id: lowercase letters and digits joined by single hyphens, starting with a letter,
// such as the knowledge base's module id price-feed.
export const DOSSIER_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

// The one refusal for a name that is not a dossier id, or null for one that is.
export function idProblem(id: string): string | null {
  return DOSSIER_ID.test(id) ? null : `${JSON.stringify(id)} is not a dossier id: use lowercase letters and digits joined by single hyphens, starting with a letter, such as price-feed`;
}

// "parts/<id>", "compositions/<id>", or a bare id, split into the kind it names and the id.
export function dossierName(name: string): { kind: 'parts' | 'compositions' | null; id: string } {
  const m = String(name).match(/^(parts|compositions)\/([^/]*)\/?$/);
  return m ? { kind: m[1] as 'parts' | 'compositions', id: m[2] } : { kind: null, id: String(name) };
}

// --root, then DOSSIER_ROOT, then the nearest folder at or above cwd that is a root, holds
// dossiers/dossier.json, or keeps a .dossier-root naming one. A root named by --root,
// DOSSIER_ROOT or .dossier-root that holds no dossier.json is a refusal.
export function findRoot(args: string[] = [], cwd: string = process.cwd()): string | null {
  const flag = args.indexOf('--root');
  if (flag >= 0 && args[flag + 1]) return check(resolve(cwd, args[flag + 1]));
  if (process.env.DOSSIER_ROOT) return check(resolve(cwd, process.env.DOSSIER_ROOT));
  let dir = resolve(cwd);
  for (;;) {
    if (existsSync(join(dir, 'dossier.json'))) return dir;
    if (existsSync(join(dir, 'dossiers', 'dossier.json'))) return join(dir, 'dossiers');
    const pointer = join(dir, POINTER);
    if (existsSync(pointer)) return check(pointedRoot(pointer), pointer);
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
  function check(dir: string, pointer?: string): string {
    if (!existsSync(join(dir, 'dossier.json'))) throw new UsageError(pointer ? `no dossier.json in ${dir}, which ${pointer} names` : `no dossier.json in ${dir}`);
    return dir;
  }
}

// The folder a .dossier-root names: its first line, relative to the folder that keeps it.
function pointedRoot(pointer: string): string {
  let named = '';
  try { named = readFileSync(pointer, 'utf8').split(/\r?\n/).map(l => l.trim()).find(Boolean) || ''; } catch { /* An unreadable pointer names nothing. */ }
  if (!named) throw new UsageError(`${pointer} names no folder`);
  return resolve(dirname(pointer), named);
}

export function stripRootArgs(args: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--root') { i++; continue; }
    out.push(args[i]);
  }
  return out;
}

// dossier.json as read. A file that does not read or parse, or is not an object, gives error
// alone; a known field in the wrong shape gives error beside the fields. No file gives {}.
export function readMarker(root: string): Marker {
  const path = join(root, 'dossier.json');
  if (!existsSync(path)) return {};
  let text: string;
  try { text = readFileSync(path, 'utf8'); } catch (e) { return { error: `dossier.json cannot be read: ${(e as Error).message}` }; }
  let value: unknown;
  try { value = JSON.parse(text); } catch (e) { return { error: `dossier.json does not parse: ${(e as Error).message}` }; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { error: `dossier.json holds ${Array.isArray(value) ? 'an array' : value === null ? 'null' : `a ${typeof value}`}, not an object` };
  // A field of the file named error is the file's own, not this reader's.
  const { error: _own, ...fields } = value as Marker & Record<string, unknown>;
  const problem = markerProblem(fields);
  return problem ? { ...fields, error: problem } : fields;
}

// The first known field of dossier.json in the wrong shape, or null.
function markerProblem(marker: Record<string, unknown>): string | null {
  if (marker.storage !== undefined && marker.storage !== 'integrity-v1') return 'dossier.json: unsupported storage format';
  const k = marker.knowledge;
  if (k !== undefined && (!k || typeof k !== 'object' || Array.isArray(k) || typeof (k as { root?: unknown }).root !== 'string' || !(k as { root: string }).root.trim())) return 'dossier.json: knowledge is not { "root": "<path>" }';
  const ext = marker.external;
  if (ext === undefined) return null;
  if (!ext || typeof ext !== 'object' || Array.isArray(ext)) return 'dossier.json: external is not an object of runners';
  for (const [name, runner] of Object.entries(ext as Record<string, unknown>)) {
    const r = runner as { command?: unknown; cwd?: unknown } | null;
    const command = r && typeof r === 'object' ? r.command : undefined;
    if (!Array.isArray(command) || !command.length || !command.every(part => typeof part === 'string') || (r!.cwd !== undefined && typeof r!.cwd !== 'string')) {
      return `dossier.json: external.${name} is not { "command": ["<program>", ...], "cwd": "<path>" }`;
    }
  }
  return null;
}

const folders = (root: string, kind: 'parts' | 'compositions'): string[] => {
  const dir = join(root, kind);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(n => !n.startsWith('.') && !n.startsWith('_') && statSync(join(dir, n)).isDirectory() && existsSync(join(dir, n, kind === 'parts' ? 'prose.md' : 'wiring.md'))).sort();
};
export const listParts = (root: string) => folders(root, 'parts');
export const listCompositions = (root: string) => folders(root, 'compositions');

// "parts/timelock", "compositions/control", or a bare id looked up in both: a part is a
// folder with prose.md, a composition one with wiring.md. A name that is not a dossier id is
// refused with the one message idProblem gives.
// A dossier folder, and the parts/ or compositions/ folder above it, are directories of the root's own.
// The commands write in them, so a link to a folder elsewhere would put records outside the root.
export function dossierDirProblem(root: string, dir: string): string | null {
  for (const path of [dirname(dir), dir]) {
    let stat;
    try { stat = lstatSync(path); } catch { return null; }
    if (stat.isSymbolicLink() || !stat.isDirectory()) return `${path.slice(root.length + 1)} must be a directory, not a symbolic link or special file`;
  }
  return null;
}

export function locate(root: string, name: string): Located | null {
  const { kind, id } = dossierName(name);
  const problem = idProblem(id);
  if (problem) throw new UsageError(problem);
  const part: Located = { kind: 'part', id, dir: join(root, 'parts', id) };
  const composition: Located = { kind: 'composition', id, dir: join(root, 'compositions', id) };
  const isPart = existsSync(join(part.dir, 'prose.md'));
  const isComposition = existsSync(join(composition.dir, 'wiring.md'));
  const found = kind === 'parts' ? (isPart ? part : null)
    : kind === 'compositions' ? (isComposition ? composition : null)
    : isPart ? part : isComposition ? composition : null;
  const aliased = found && dossierDirProblem(root, found.dir);
  if (aliased) throw new UsageError(aliased);
  return found;
}
