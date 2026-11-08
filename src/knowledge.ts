// The knowledge adapter.
//
// Resolves typed references `<module>#<type>:<id>` against a knowledge root
// laid out as `modules/<module>/**.md` with YAML record blocks, as Harbor's
// knowledge base is; lists edges for closure; resolves the backing of a
// guarantee to a Certora rule at a commit or to a file under the root. Dossier
// reads the knowledge base and never writes it.
//
// Every `path` the adapter returns is relative to the knowledge root, such as
// `modules/vault/state/quantities.md`. Every `text` is hashed with sha256;
// `hash` is the first sixteen hex characters and `sha256` the full digest.

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import type { Dirent } from 'node:fs';
import { join, resolve as resolvePath } from 'node:path';
import { recordsOf, yamlBlocks } from './prose/yaml.ts';
import type { YamlBlock, YamlMap, YamlValue } from './prose/yaml.ts';

// `<module>#<type>:<id>`, and an edge end that may leave out the module.
export interface Ref { module: string; type: string; id: string }
export interface Target { module: string | null; type: string; id: string }
export interface Digest { hash: string; sha256: string }
// A resolved reference: where it was found and its text, hashed. YAML records
// carry the record and its collection; a contract section its heading and line.
export interface Resolved extends Digest {
  ref: string;
  module: string;
  type: string;
  id: string;
  path: string;
  text: string;
  collection?: string;
  record?: YamlMap;
  heading?: string;
  line?: number;
}
export interface Observation extends Digest { module: string; name: string; path: string; text: string }
// Every Markdown file of a module, read as records, and the files that did not read.
export interface ModuleRecords { files: Record<string, YamlMap>; errors: { path: string; message: string }[] }
export interface Edge { module: string; id: string | null; type: YamlValue; from: YamlValue; to: YamlValue; conditions: YamlValue[]; path: string; record: YamlMap }
export interface EdgeFilter { types?: string[] | string; module?: string | null; asset?: string | null }
// What a backing names, with the component's module: a Certora rule at a commit, or a file and rule.
export interface BackingSpec { kind: string; module?: string | null; path?: string; rule?: string | null; commit?: string }
export interface Unresolved { status: 'unresolved'; reason: string }
export interface Backed extends Digest { status: 'backed'; kind: 'certora' | 'file'; module?: string; commit?: string; path: string; rule: string | null; keyword: string; line: number; text: string }
export type BackingResult = Backed | Unresolved;
// A commit cache a module records in codebases.md: its path under the module, the commit it holds,
// and the upstream repository when the path names one (source-cache/github/<repository>/commit-…).
export interface SourcePin { path: string; commit: string; repository: string | null }
// What every adapter answers.
export interface KnowledgeLookups {
  modules(): string[];
  moduleRecords(module: string): ModuleRecords;
  resolve(ref: unknown): Resolved | null;
  edges(filter?: EdgeFilter): Edge[];
  backing(spec: BackingSpec | null | undefined): BackingResult;
  observation(module: string, name: string): Observation | null;
}
// The adapter a dossiers root reads its knowledge base through: an open
// knowledge base, or the adapter for a project without one.
export type Knowledge = ({ kind: 'records'; root: string; sourcePins(module: string): SourcePin[] } & KnowledgeLookups) | ({ kind: 'none'; root: null } & KnowledgeLookups);
interface Section { line: number; level: number; heading: string; text: string }
interface Block { line: number; keyword: string; text: string }

/** Reference types that live in YAML collections, and the collections that hold them. */
export const COLLECTIONS: Readonly<Record<string, string[]>> = Object.freeze({
  actor: ['actors'],
  asset: ['assets'],
  dependency: ['dependencies'],
  edge: ['edges'],
  quantity: ['quantities'],
  read: ['state_reads', 'rates_and_prices', 'internal_accounting_values', 'bridge_or_message_state'],
  accounting: ['accounting'],
  operation: ['operations'],
  property: ['invariants'],
  flow: ['flows'],
  procedure: ['procedures'],
  role: ['binding_roles', 'roles'],
  entrypoint: ['entrypoints'],
  reference: ['references'],
});

/** Every reference type the adapter resolves. */
export const REF_TYPES = Object.freeze([...Object.keys(COLLECTIONS), 'contract', 'observation']);

const NAME = '[A-Za-z0-9][A-Za-z0-9_.-]*';
const LOCAL = '[A-Za-z0-9_][A-Za-z0-9_.-]*';
const REF = new RegExp(`^(${NAME})#([a-z][a-z_]*):(${LOCAL})$`);
const TARGET = new RegExp(`^(?:(${NAME})#)?([a-z][a-z_]*):(${LOCAL})$`);
const LOCAL_ONLY = new RegExp(`^${LOCAL}$`);

// Directories under a module that hold no records.
const SKIPPED = new Set(['source-cache', 'observations', 'node_modules']);

// Column-0 keywords that end a CVL rule or invariant block.
const CVL_TOP = /^(rule|invariant|definition|ghost|hook|methods)\b/;
// Declaration keywords used to find a named block in a file that is not CVL.
const DECL = '(?:function|def|fn|test|it|property|lemma|theorem|rule|invariant|contract|module|let|op)';

/**
 * Parse `<module>#<type>:<id>` (the observation form is `<module>#observation:<name>`).
 * Returns `{ module, type, id }` or null when the string has another shape.
 */
export function parseRef(ref: unknown): Ref | null {
  if (typeof ref !== 'string') return null;
  const match = REF.exec(ref.trim());
  return match ? { module: match[1], type: match[2], id: match[3] } : null;
}

/**
 * Parse an edge endpoint or any typed target: `<type>:<id>` or `<module>#<type>:<id>`.
 * Returns `{ module, type, id }` with `module` null when unqualified, or null.
 */
export function parseTarget(target: unknown): Target | null {
  if (typeof target !== 'string') return null;
  const match = TARGET.exec(target.trim());
  return match ? { module: match[1] || null, type: match[2], id: match[3] } : null;
}

/** JSON with object keys sorted at every level, so equal records hash equally. */
export function stableJson(value: unknown): string {
  return JSON.stringify(sortKeys(value), null, 2);
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) out[key] = sortKeys((value as Record<string, unknown>)[key]);
    return out;
  }
  return value;
}

function digest(text: string): Digest {
  const sha256 = createHash('sha256').update(text, 'utf8').digest('hex');
  return { hash: sha256.slice(0, 16), sha256 };
}

const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

function readText(path: string): string {
  return readFileSync(path, 'utf8').replace(/\r\n/g, '\n');
}

// A path given by a record or a call: relative, with no empty or parent segments.
function safeRelative(path: unknown): path is string {
  return typeof path === 'string' && path !== '' && !path.startsWith('/') && !path.includes('\\')
    && !path.includes('\0') && path.split('/').every((segment) => segment !== '' && segment !== '..');
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// The first and last four hex characters of a commit, from a full 40-hex hash,
// an 8-character `aaaabbbb` abbreviation, or the `aaaa-bbbb` cache form.
function commitHalves(commit: unknown): [string, string] | null {
  if (typeof commit !== 'string') return null;
  const text = commit.trim().toLowerCase().replace(/^commit-/, '');
  let match: RegExpExecArray | null;
  if ((match = /^([0-9a-f]{4})[0-9a-f]{32}([0-9a-f]{4})$/.exec(text))) return [match[1], match[2]];
  if ((match = /^([0-9a-f]{4})-?([0-9a-f]{4})$/.exec(text))) return [match[1], match[2]];
  return null;
}

// Markdown files under a directory, as sorted `/`-separated relative paths.
function listMarkdown(dir: string, prefix: string, out: string[]): string[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (!SKIPPED.has(entry.name)) listMarkdown(join(dir, entry.name), rel, out);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      out.push(rel);
    }
  }
  return out;
}

/**
 * Markdown sections: every heading outside a code fence, with the text from the
 * heading line to the next heading of the same or a higher level.
 */
function sections(text: string): Section[] {
  const lines = text.split('\n');
  const heads: { line: number; level: number; heading: string }[] = [];
  let fence: string | null = null;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const opened = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (opened) {
      if (!fence) fence = opened[1];
      else if (opened[1][0] === fence[0] && opened[1].length >= fence.length) fence = null;
      continue;
    }
    if (fence) continue;
    const head = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (head) heads.push({ line: i + 1, level: head[1].length, heading: head[2].replace(/\s+#+$/, '').trim() });
  }
  return heads.map((head, k) => {
    let end = lines.length;
    for (let j = k + 1; j < heads.length; j += 1) {
      if (heads[j].level <= head.level) {
        end = heads[j].line - 1;
        break;
      }
    }
    return { ...head, text: lines.slice(head.line - 1, end).join('\n').replace(/\s+$/, '') };
  });
}

// A heading names a contract when it equals the id, contains the id in
// backticks, or has the `Contract: <id>` form some knowledge bases use.
function namesContract(heading: string, id: string): boolean {
  if (heading === id || heading.includes(`\`${id}\``)) return true;
  const match = /^contract:\s*(.+)$/i.exec(heading);
  return Boolean(match) && match![1].trim() === id;
}

function trimBlock(lines: string[], start: number, end: number): string {
  let last = end;
  while (last > start + 1 && lines[last - 1].trim() === '') last -= 1;
  return lines.slice(start, last).join('\n');
}

/**
 * The block of a CVL rule or invariant: from the line `rule <name>` or
 * `invariant <name>` up to the next top-level rule, invariant, definition,
 * ghost, hook or methods keyword, or the end of the file.
 */
function cvlBlock(lines: string[], rule: string): Block | null {
  const start = new RegExp(`^\\s*(rule|invariant)\\s+${escapeRegExp(rule)}\\b`);
  const index = lines.findIndex((line) => start.test(line));
  if (index < 0) return null;
  let end = lines.length;
  for (let j = index + 1; j < lines.length; j += 1) {
    if (CVL_TOP.test(lines[j])) {
      end = j;
      break;
    }
  }
  return { line: index + 1, keyword: start.exec(lines[index])![1], text: trimBlock(lines, index, end) };
}

// A named declaration in another kind of file: from `<keyword> <name>` to the
// next declaration at the same or a shallower indentation.
function declBlock(lines: string[], rule: string): Block | null {
  const start = new RegExp(`^(\\s*)${DECL}\\s+${escapeRegExp(rule)}\\b`);
  const index = lines.findIndex((line) => start.test(line));
  if (index < 0) return null;
  const indent = start.exec(lines[index])![1].length;
  const next = new RegExp(`^(\\s*)${DECL}\\b`);
  let end = lines.length;
  for (let j = index + 1; j < lines.length; j += 1) {
    const match = next.exec(lines[j]);
    if (match && match[1].length <= indent) {
      end = j;
      break;
    }
  }
  return { line: index + 1, keyword: 'declaration', text: trimBlock(lines, index, end) };
}

// A Markdown section whose heading equals the name or contains it as a word.
function headingBlock(text: string, rule: string): Block | null {
  const word = new RegExp(`(^|[^A-Za-z0-9_])${escapeRegExp(rule)}($|[^A-Za-z0-9_])`);
  const section = sections(text).find((s) => s.heading === rule || word.test(s.heading));
  return section ? { line: section.line, keyword: 'section', text: section.text } : null;
}

const unresolved = (reason: string): Unresolved => ({ status: 'unresolved', reason });

/**
 * Open a knowledge base. `root` is the absolute path of the folder that holds
 * `modules/`. Throws when that folder is missing.
 */
export function openKnowledge(root: string): Knowledge {
  if (typeof root !== 'string' || root.trim() === '') throw new Error('openKnowledge needs the knowledge root path');
  const base = resolvePath(root);
  const modulesDir = join(base, 'modules');
  if (!isDirectory(modulesDir)) throw new Error(`knowledge root ${base} has no modules/ directory`);

  let ids: string[] | null = null; // sorted module ids
  const lists = new Map<string, string[]>(); // module -> markdown files
  const texts = new Map<string, string>(); // module/rel -> text
  const blocks = new Map<string, YamlBlock[]>(); // module/rel -> yaml blocks
  const records = new Map<string, ModuleRecords>(); // module -> { files, errors }

  const modulePath = (module: string, rel: string) => `modules/${module}/${rel}`;

  function modules(): string[] {
    if (!ids) {
      ids = readdirSync(modulesDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
        .map((entry) => entry.name)
        .sort(compare);
    }
    return ids.slice();
  }

  const hasModule = (module: unknown): module is string => typeof module === 'string' && modules().includes(module);

  function markdownFiles(module: string): string[] {
    if (!lists.has(module)) lists.set(module, listMarkdown(join(modulesDir, module), '', []).sort(compare));
    return lists.get(module)!;
  }

  function fileText(module: string, rel: string): string {
    const key = `${module}/${rel}`;
    if (!texts.has(key)) texts.set(key, readText(join(modulesDir, module, rel)));
    return texts.get(key)!;
  }

  function fileBlocks(module: string, rel: string): YamlBlock[] {
    const key = `${module}/${rel}`;
    if (!blocks.has(key)) {
      let parsed: YamlBlock[] = [];
      try {
        parsed = yamlBlocks(fileText(module, rel)) || [];
      } catch {
        parsed = [];
      }
      blocks.set(key, parsed);
    }
    return blocks.get(key)!;
  }

  /** `{ files: { <relative path>: recordsOf(file) }, errors: [{ path, message }] }`, cached. */
  function moduleRecords(module: string): ModuleRecords {
    if (records.has(module)) return records.get(module)!;
    const result: ModuleRecords = { files: {}, errors: [] };
    if (hasModule(module)) {
      for (const rel of markdownFiles(module)) {
        try {
          result.files[rel] = recordsOf(fileText(module, rel)) || {};
        } catch (error) {
          result.errors.push({ path: modulePath(module, rel), message: (error as Error).message });
        }
      }
    }
    records.set(module, result);
    return result;
  }

  // The first item with the id in any of the collections, in any file of the module.
  function findRecord(module: string, collections: string[], id: string, accept: (item: YamlMap) => boolean = () => true): { rel: string; collection: string; record: YamlMap } | null {
    const { files } = moduleRecords(module);
    for (const [rel, recs] of Object.entries(files)) {
      for (const collection of collections) {
        const items = recs ? recs[collection] : undefined;
        if (!Array.isArray(items)) continue;
        for (const item of items) {
          if (item && typeof item === 'object' && !Array.isArray(item) && String(item.id) === id && accept(item)) {
            return { rel, collection, record: item };
          }
        }
      }
    }
    return null;
  }

  function contractFiles(module: string): string[] {
    const files = markdownFiles(module).filter((rel) => rel.startsWith('contracts/'));
    const main = 'contracts/contracts.md';
    return files.includes(main) ? [main, ...files.filter((rel) => rel !== main)] : files;
  }

  function resolveContract(module: string, id: string, ref: string): Resolved | null {
    const base = { ref, module, type: 'contract', id };
    const found = findRecord(module, ['contracts'], id);
    if (found) {
      const text = stableJson(found.record);
      return { ...base, path: modulePath(module, found.rel), collection: 'contracts', record: found.record, text, ...digest(text) };
    }
    for (const rel of contractFiles(module)) {
      const section = sections(fileText(module, rel)).find((s) => namesContract(s.heading, id));
      if (section) {
        return { ...base, path: modulePath(module, rel), heading: section.heading, line: section.line, text: section.text, ...digest(section.text) };
      }
    }
    for (const rel of markdownFiles(module)) {
      for (const block of fileBlocks(module, rel)) {
        // The contract record of a block, when its value holds one.
        const record = (block && block.value ? (block.value as YamlMap).contract : undefined) as YamlMap | undefined;
        if (record && typeof record === 'object' && String(record.id) === id) {
          const text = stableJson(record);
          return { ...base, path: modulePath(module, rel), collection: 'contract', record, text, ...digest(text) };
        }
      }
    }
    return null;
  }

  /** `{ path, text, hash, sha256 }` of `observations/<name>.json` or `.md`, or null. */
  function observation(module: string, name: string): Observation | null {
    if (!hasModule(module) || typeof name !== 'string' || !LOCAL_ONLY.test(name)) return null;
    for (const extension of ['.json', '.md']) {
      const rel = `observations/${name}${extension}`;
      const full = join(modulesDir, module, rel);
      if (isFile(full)) {
        const text = readText(full);
        return { module, name, path: modulePath(module, rel), text, ...digest(text) };
      }
    }
    return null;
  }

  /**
   * Resolve a typed reference to `{ ref, module, type, id, path, text, hash, sha256 }`
   * (plus `record` and `collection` for YAML records, `heading` and `line` for a
   * contract section), or null.
   */
  function resolve(ref: unknown): Resolved | null {
    const parsed = parseRef(ref);
    if (!parsed) return null;
    const { module, type, id } = parsed;
    if (!hasModule(module)) return null;
    const canonical = `${module}#${type}:${id}`;
    if (type === 'observation') {
      const found = observation(module, id);
      if (!found) return null;
      return { ref: canonical, module, type, id, path: found.path, text: found.text, hash: found.hash, sha256: found.sha256 };
    }
    if (type === 'contract') return resolveContract(module, id, canonical);
    const collections = COLLECTIONS[type];
    if (!collections) return null;
    let found = findRecord(module, collections, id);
    if (!found && type === 'role') found = findRecord(module, ['actors'], id, (item) => item.role !== undefined);
    if (!found) return null;
    const text = stableJson(found.record);
    return { ref: canonical, module, type, id, path: modulePath(module, found.rel), collection: found.collection, record: found.record, text, ...digest(text) };
  }

  // An edge touches an asset when either end is `asset:<id>` in any module, or
  // a dependency with that local id.
  function touchesAsset(edge: Pick<Edge, 'from' | 'to'>, asset: string): boolean {
    return [edge.from, edge.to].some((end) => {
      const target = parseTarget(end);
      return Boolean(target) && (target!.type === 'asset' || target!.type === 'dependency') && target!.id === asset;
    });
  }

  /**
   * Every edge of every module (or of `module`), as
   * `{ module, id, type, from, to, conditions, path, record }`, optionally kept
   * to the given `types` and to edges touching `asset`.
   */
  function edges(filter: EdgeFilter = {}): Edge[] {
    const { types, module, asset }: EdgeFilter = filter || {};
    const wanted = Array.isArray(types) && types.length > 0 ? new Set(types) : typeof types === 'string' ? new Set([types]) : null;
    const scope = module === undefined || module === null ? modules() : hasModule(module) ? [module] : [];
    const out: Edge[] = [];
    for (const id of scope) {
      const { files } = moduleRecords(id);
      for (const [rel, recs] of Object.entries(files)) {
        const items = recs ? recs.edges : undefined;
        if (!Array.isArray(items)) continue;
        for (const record of items) {
          if (!record || typeof record !== 'object' || Array.isArray(record)) continue;
          const edge = {
            module: id,
            id: record.id === undefined || record.id === null ? null : String(record.id),
            type: record.type === undefined ? null : record.type,
            from: record.from === undefined ? null : record.from,
            to: record.to === undefined ? null : record.to,
            conditions: Array.isArray(record.conditions) ? record.conditions : [],
            path: modulePath(id, rel),
            record,
          };
          if (wanted && !wanted.has(edge.type as string)) continue;
          if (asset && !touchesAsset(edge, asset)) continue;
          out.push(edge);
        }
      }
    }
    return out;
  }

  // The commit caches a module records. codebases.md maps each exact revision to its cache, and a
  // module may cache several upstreams, including two whose short ids collide. Without a manifest,
  // a flat cache folder can stand only for the abbreviation its name spells.
  function sourcePins(module: string): SourcePin[] {
    if (!hasModule(module)) return [];
    const pins: SourcePin[] = [];
    const repos = moduleRecords(module).files['codebases.md']?.repositories;
    if (Array.isArray(repos)) for (const row of repos) {
      if (!row || typeof row !== 'object' || Array.isArray(row) || typeof row.cache_path !== 'string') continue;
      const path = row.cache_path.replace(/\/$/, '');
      const match = /^source-cache\/github\/(?:(?!\.\.?\/)([\w.-]+)\/)?commit-([a-f0-9]{4})-([a-f0-9]{4})$/.exec(path);
      const exported = row.public_export;
      const commit = exported && typeof exported === 'object' && !Array.isArray(exported) ? exported.pinned_commit ?? row.ref : row.ref;
      if (!match || typeof commit !== 'string' || !/^[a-f0-9]{40}$/i.test(commit)) continue;
      const sha = commit.toLowerCase();
      if (sha.slice(0, 4) !== match[2] || sha.slice(-4) !== match[3]) continue;
      pins.push({ path, commit: sha, repository: match[1] || null });
    }
    // Flat caches are discovered only when no manifest says which repositories there are. A manifest that
    // does not parse, or that names repositories at all, even as an empty list or a typo, governs alone.
    const manifest = moduleRecords(module).files['codebases.md'];
    const unread = !manifest && existsSync(join(modulesDir, module, 'codebases.md'));
    if (unread || (manifest && Object.hasOwn(manifest, 'repositories'))) return pins;
    const direct = join(modulesDir, module, 'source-cache/github');
    if (isDirectory(direct)) for (const entry of readdirSync(direct, { withFileTypes: true })) {
      const match = /^commit-([a-f0-9]{4})-([a-f0-9]{4})$/.exec(entry.name);
      const path = `source-cache/github/${entry.name}`;
      if (entry.isDirectory() && match && !pins.some(p => p.path === path)) pins.push({ path, commit: match[1] + match[2], repository: null });
    }
    return pins;
  }

  function certoraBacking(spec: BackingSpec): BackingResult {
    const { module, path, rule, commit } = spec;
    if (!hasModule(module)) return unresolved(`unknown module ${module}`);
    if (!safeRelative(path)) return unresolved(`spec path ${path} is not a relative path inside the source cache`);
    const halves = commitHalves(commit);
    if (!halves) return unresolved(`commit ${commit} is not a 40-hex hash or an 8-character abbreviation`);
    if (typeof rule !== 'string' || rule === '') return unresolved('no rule or invariant named');
    // A full hash selects its cache exactly; an abbreviation must select one cache, and one path
    // never stands for two revisions.
    const exact = String(commit).trim().toLowerCase().replace(/^commit-/, '');
    const pins = sourcePins(module);
    const matches = pins.filter(p => exact.length === 40 ? p.commit === exact : p.commit.startsWith(halves[0]) && p.commit.endsWith(halves[1]));
    if (!matches.length) return unresolved(`no source cache for ${module} at ${commit}`);
    if (matches.length !== 1 || pins.some(p => p.path === matches[0].path && p.commit !== matches[0].commit)) return unresolved(`ambiguous source cache for ${module} at ${commit}`);
    const rel = modulePath(module, `${matches[0].path}/${path}`);
    const full = join(base, rel);
    if (!isFile(full)) return unresolved(`no file ${rel}`);
    const block = cvlBlock(readText(full).split('\n'), rule);
    if (!block) return unresolved(`no rule or invariant ${rule} in ${rel}`);
    return { status: 'backed', kind: 'certora', module, commit, path: rel, rule, keyword: block.keyword, line: block.line, text: block.text, ...digest(block.text) };
  }

  function fileBacking(spec: BackingSpec): BackingResult {
    const { path, rule } = spec;
    if (!safeRelative(path)) return unresolved(`path ${path} is not a relative path under the knowledge root`);
    const full = join(base, path);
    if (!isFile(full)) return unresolved(`no file ${path} under the knowledge root`);
    const text = readText(full);
    if (rule === undefined || rule === null || rule === '') {
      return { status: 'backed', kind: 'file', path, rule: null, keyword: 'file', line: 1, text, ...digest(text) };
    }
    if (typeof rule !== 'string') return unresolved('rule must be a name');
    const lines = text.split('\n');
    const block = cvlBlock(lines, rule) || declBlock(lines, rule) || headingBlock(text, rule);
    if (!block) return unresolved(`no rule ${rule} in ${path}`);
    return { status: 'backed', kind: 'file', path, rule, keyword: block.keyword, line: block.line, text: block.text, ...digest(block.text) };
  }

  /**
   * Resolve a backing spec, `{ module, kind: 'certora', path, rule, commit }` or
   * `{ kind: 'file', path, rule }`, to `{ status: 'backed', path, text, hash, sha256, ... }`
   * or `{ status: 'unresolved', reason }`.
   */
  function backing(spec: BackingSpec | null | undefined): BackingResult {
    if (!spec || typeof spec !== 'object') return unresolved('no backing spec');
    if (spec.kind === 'certora') return certoraBacking(spec);
    if (spec.kind === 'file') return fileBacking(spec);
    return unresolved(`backing kind ${spec.kind} cannot be resolved against a knowledge base`);
  }

  return { kind: 'records', root: base, modules, moduleRecords, sourcePins, resolve, edges, backing, observation };
}

/** An adapter for a project without a knowledge base: every lookup answers nothing. */
export function nullKnowledge(): Knowledge {
  return {
    kind: 'none',
    root: null,
    modules: () => [],
    moduleRecords: () => ({ files: {}, errors: [] }),
    resolve: () => null,
    edges: () => [],
    backing: () => unresolved('no knowledge base'),
    observation: () => null,
  };
}

/**
 * The adapter for a dossiers root: `openKnowledge` of the root that
 * `<dossiersRoot>/dossier.json` names in `knowledge.root` (relative to the
 * dossiers root), or `nullKnowledge()` when the file or the setting is absent.
 */
export function knowledgeFor(dossiersRoot: string): Knowledge {
  const file = join(dossiersRoot, 'dossier.json');
  if (!isFile(file)) return nullKnowledge();
  const config = JSON.parse(readFileSync(file, 'utf8')) as { knowledge?: { root?: unknown } } | null;
  const knowledge = config ? config.knowledge : undefined;
  if (!knowledge || typeof knowledge !== 'object' || typeof knowledge.root !== 'string' || knowledge.root.trim() === '') {
    return nullKnowledge();
  }
  return openKnowledge(resolvePath(dossiersRoot, knowledge.root));
}
