// A fresh dossier is private until its authored inputs and authority are durable.
// Callers hold the root publication lock throughout initialization and rename.
import { lstatSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { idProblem, UsageError } from './root.ts';
import { requireCurrent } from './integrity.ts';
import { durableWrite, flushDirectory, publishDecisionLocked, writeIntegrity } from './publication.ts';
import type { PublicationOptions } from './publication.ts';
import type { NewDecision } from './decisions.ts';

export interface InitialInputs { 'prose.md': string; 'composition.md'?: string; 'margin.md'?: string }

// Unlike existsSync, this also observes a dangling link that must not be replaced.
export function dossierPathExists(path: string): boolean {
  try { lstatSync(path); return true; }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; }
}

export function initializeDossierLocked(
  root: string, kind: 'components' | 'systems', id: string, inputs: InitialInputs,
  decision?: NewDecision, options: PublicationOptions = {},
): { dir: string; decision: string | null } {
  requireCurrent(root);
  const problem = idProblem(id);
  if (problem) throw new UsageError(problem);
  if (!inputs['prose.md'] || (kind === 'systems' && !inputs['composition.md'])) throw new UsageError('a fresh dossier needs its authored inputs');
  if (Object.keys(inputs).some(name => !['prose.md', 'composition.md', 'margin.md'].includes(name))) throw new UsageError('unsupported initial dossier input');
  if (decision && decision.verb !== 'begin') throw new UsageError('a fresh dossier can only begin');
  const parent = join(root, kind), dir = join(parent, id);
  if (dossierPathExists(dir)) throw new UsageError(`${kind}/${id} exists; initialization cannot replace its authority`);
  if (!dossierPathExists(parent)) { mkdirSync(parent); flushDirectory(root); }
  const parentStat = lstatSync(parent);
  if (parentStat.isSymbolicLink() || !parentStat.isDirectory()) throw new UsageError(`${kind}/ must be a directory, not a symbolic link or special file`);

  // A hidden sibling preserves dossierRoot()'s root inference while readers
  // ignore it. Interrupted candidates remain hidden; retry never adopts them.
  const staging = join(parent, `.initializing-${id}-${randomUUID()}`);
  mkdirSync(staging, { mode: 0o700 });
  options.boundary?.('initialization:staged');
  for (const [name, text] of Object.entries(inputs)) durableWrite(join(staging, name), text, options, `input:${name}`);
  writeIntegrity(staging, { schema: 1, evidence: {}, decisionHead: null }, options);
  const line = decision ? publishDecisionLocked(staging, decision, options) : null;
  flushDirectory(staging); options.boundary?.('initialization:sealed');
  renameSync(staging, dir); options.boundary?.('initialization:renamed');
  flushDirectory(parent); options.boundary?.('initialization:directory-flushed');
  return { dir, decision: line };
}
