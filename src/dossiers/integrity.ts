// Minimal published authority. Readers never write, repair or adopt candidates.
import { existsSync, lstatSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { sha256 } from '../hash.ts';
import { ENTRY_NAME, parseDecisions } from './decisions.ts';
import { readMarker, UsageError } from './root.ts';

export const INTEGRITY = 'integrity.json';
export const STORAGE = 'integrity-v1';
export interface DecisionHead { algorithm: 'sha256-prefix'; bytes: number; digest: string }
// The per-dossier manifest: the digest of every entry in evidence/, by its name, and the exact
// committed prefix of decisions.log.
export interface Integrity {
  schema: 1;
  evidence: Record<string, string>;
  decisionHead: DecisionHead | null;
}
export interface IntegrityProblem { name: string; where: string }
export interface IntegrityRead {
  mode: 'current' | 'invalid';
  manifest: Integrity | null;
  decisions: string;
  pendingDecisions: string;
  problems: IntegrityProblem[];
}

export const dossierRoot = (dir: string): string => dirname(dirname(dir));
const object = (value: unknown): value is Record<string, unknown> => Boolean(value && typeof value === 'object' && !Array.isArray(value));
const exactKeys = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).sort().join('|') === keys.sort().join('|');
const hash = (value: unknown, length: number) => typeof value === 'string' && new RegExp(`^[0-9a-f]{${length}}$`).test(value);
export function validateIntegrity(value: unknown): Integrity {
  if (!object(value) || value.schema !== 1) throw new Error('unsupported integrity schema; expected 1');
  if (!exactKeys(value, ['schema', 'evidence', 'decisionHead']) || !object(value.evidence)) throw new Error('integrity fields must be schema, evidence and decisionHead');
  for (const [name, digest] of Object.entries(value.evidence)) {
    if (!ENTRY_NAME.test(name) || !hash(digest, 64)) throw new Error(`invalid evidence binding: ${name}`);
  }
  const h = value.decisionHead;
  if (h !== null) {
    if (!object(h)) throw new Error('decisionHead must be null or a supported digest');
    if (h.algorithm !== 'sha256-prefix') throw new Error('unsupported decision digest algorithm');
    if (!exactKeys(h, ['algorithm', 'bytes', 'digest']) || !Number.isSafeInteger(h.bytes) || (h.bytes as number) <= 0 || !hash(h.digest, 64)) throw new Error('invalid committed-prefix digest');
  }
  return value as unknown as Integrity;
}

// What is wrong with a root's storage format, or null when it names integrity-v1. A root marker
// that names another storage, does not read, or names none is never a format this plugin reads.
// (readMarker reports another storage as a malformed marker; this says what it names.)
export function storageProblem(root: string): string | null {
  if (!existsSync(join(root, 'dossier.json'))) return 'dossier.json is missing';
  const marker = readMarker(root);
  const storage = (marker as { storage?: unknown }).storage;
  if (storage !== undefined && storage !== STORAGE) return `dossier.json names storage ${JSON.stringify(storage)}; this plugin reads ${STORAGE} only`;
  if (marker.error) return 'dossier.json does not read';
  return storage === undefined ? `dossier.json names no storage; this plugin reads ${STORAGE} only` : null;
}

export function storageMode(root: string): 'current' | 'invalid' {
  return storageProblem(root) === null ? 'current' : 'invalid';
}

export function requireCurrent(root: string): void {
  const problem = storageProblem(root);
  if (problem) throw new UsageError(`${problem}; no evidence or decision is published to a root in another format`);
}

export function prefixHead(text: string): DecisionHead | null {
  return text ? { algorithm: 'sha256-prefix', bytes: Buffer.byteLength(text), digest: sha256(text) } : null;
}

// A suffix can be malformed without invalidating an intact committed prefix.
// A missing/ambiguous anchor applies no decisions; it never blesses the current tip.
export function committedPrefix(raw: string, head: DecisionHead | null): { text: string; suffix: string; problem: string | null } {
  if (head === null) return { text: '', suffix: raw, problem: null };
  const bytes = Buffer.from(raw);
  if (bytes.length < head.bytes) return { text: '', suffix: raw, problem: 'committed decision prefix was truncated' };
  const prefix = bytes.subarray(0, head.bytes);
  const text = prefix.toString('utf8'), suffix = bytes.subarray(head.bytes).toString('utf8');
  if (!prefix.equals(Buffer.from(text)) || sha256(text) !== head.digest || (suffix && !/\r?\n$/.test(text) && !/^\r?\n/.test(suffix))) {
    return { text: '', suffix: raw, problem: 'committed decision prefix digest does not match' };
  }
  try {
    const parsed = parseDecisions(text);
    if (parsed.broken || parsed.decisions.some(d => d.malformed)) return { text: '', suffix: raw, problem: 'committed decision chain is malformed or broken' };
  } catch { return { text: '', suffix: raw, problem: 'committed decision chain is unreadable' }; }
  return { text, suffix, problem: null };
}

export function readIntegrity(dir: string, root = dossierRoot(dir)): IntegrityRead {
  const storage = storageProblem(root);
  let raw = '';
  try {
    const path = join(dir, 'decisions.log');
    let stat;
    try { stat = lstatSync(path); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    if (stat) {
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('decisions.log must be a regular file');
      raw = readFileSync(path, 'utf8');
    }
  } catch (error) {
    return { mode: 'invalid', manifest: null, decisions: '', pendingDecisions: '', problems: [{ name: 'decisions chain broken', where: `decisions.log unreadable: ${(error as Error).message}` }] };
  }
  const problems: IntegrityProblem[] = [];
  const fail = (name: string, where: string): IntegrityRead => ({ mode: 'invalid', manifest: null, decisions: '', pendingDecisions: raw, problems: [{ name, where }] });
  if (storage) return fail('integrity unavailable', storage);
  if (!existsSync(join(dir, INTEGRITY))) return fail('integrity missing', INTEGRITY);
  let manifest: Integrity;
  try {
    const path = join(dir, INTEGRITY), stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('integrity.json must be a regular file');
    manifest = validateIntegrity(JSON.parse(readFileSync(path, 'utf8')));
  }
  catch (error) { return fail('integrity malformed', (error as Error).message); }
  const prefix = committedPrefix(raw, manifest.decisionHead);
  if (prefix.problem) problems.push({ name: 'decisions chain broken', where: prefix.problem });
  else if (prefix.suffix.trim()) problems.push({ name: 'decision publication incomplete', where: 'decisions.log has an uncommitted suffix; explicit recovery is required' });
  return { mode: 'current', manifest, decisions: prefix.text, pendingDecisions: prefix.suffix, problems };
}

