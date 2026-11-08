// dossier recover <dossier> trial <id> | decisions | lock [--dry-run], and recover --root-lock:
// finish an interrupted publication of an answer or a decision explicitly (STORE-RECOVER), or remove
// a demonstrably dead local writer's lock.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sha256 } from '../hash.ts';
import { findRoot, locate, stripRootArgs, UsageError } from '../dossiers/root.ts';
import { readIntegrity, requireCurrent } from '../dossiers/integrity.ts';
import { currentManifest, inspectPublicationLock, recoverAnswer, recoverDecisions, recoverPublicationLock, validateBundle } from '../dossiers/publication.ts';
import { knowledgeOf, loadComponent, loadSystem } from '../dossiers/load.ts';
import { CANDIDATE, entryName, RUNNING } from '../trials/answers.ts';
import { STANDS_IN } from '../verify/superseded.ts';
import { answerContext } from './trial.ts';
import type { CommandContext } from '../cli.ts';

export async function main(_command: string, args: string[], _context: CommandContext): Promise<number> {
  const root = findRoot(args);
  if (!root) throw new UsageError('no dossiers root here');
  const rest = stripRootArgs(args), dryRun = rest.includes('--dry-run');
  if (rest[0] === '--root-lock') {
    if (rest.some(a => !['--root-lock', '--dry-run'].includes(a))) throw new UsageError('usage: dossier recover --root-lock [--dry-run]');
    return recoverLock(root, dryRun);
  }
  const [name, kind, value, ...tail] = rest.filter(a => a !== '--dry-run');
  const where = name && locate(root, name);
  if (!where) throw new UsageError('name an existing dossier to recover');
  if (kind === 'lock') {
    if (value || tail.length) throw new UsageError('usage: dossier recover <dossier> lock [--dry-run]');
    return recoverLock(where.dir, dryRun);
  }
  requireCurrent(root);
  if (kind === 'trial') {
    if (!value || tail.length) throw new UsageError('usage: dossier recover <dossier> trial <id> [--dry-run]');
    const staging = join(where.dir, RUNNING, value);
    if (!existsSync(staging)) throw new UsageError(`no run ${value} waits in ${RUNNING}/`);
    const candidate = join(staging, CANDIDATE);
    if (dryRun) {
      if (existsSync(candidate)) {
        const text = readFileSync(candidate, 'utf8');
        const name = entryName(JSON.parse(text).question);
        const bound = currentManifest(where.dir).evidence[name] === sha256(text);
        console.log(bound ? `would place evidence/${name}.json, which integrity.json already binds` : `would discard the unbound candidate for evidence/${name}.json and publish the run's answer under the evidence rules`);
      } else console.log(`would publish the answer of ${value} under the evidence rules · bundle ${validateBundle(where.dir, value).digest}`);
      return 0;
    }
    const loaded = where.kind === 'component' ? loadComponent(root, where.id) : loadSystem(root, where.id);
    const publication = recoverAnswer(where.dir, value, answerContext(where, loaded, where.dir, { root, knowledge: knowledgeOf(root) }));
    console.log(`${publication.action}: evidence/${publication.name}.json${publication.reason ? ` · ${publication.reason}` : ''}`);
    for (const gone of publication.gone) console.log(`removed evidence/${gone}.json: its question no longer exists`);
    for (const superseded of publication.superseded) console.log(`removed evidence/${superseded}.json: ${STANDS_IN}`);
    console.log('Pending call files are preserved; compare their contents before removing a consumed draft.');
    return publication.action === 'refused' ? 2 : 0;
  }
  if (kind === 'decisions') {
    if (value && (value !== '--confirm' || tail.length !== 1)) throw new UsageError('usage: dossier recover <dossier> decisions [--dry-run | --confirm <suffix-sha256>]');
    const record = readIntegrity(where.dir);
    const faults = record.problems.filter(p => p.name !== 'decision publication incomplete');
    if (faults.length) throw new UsageError(faults.map(p => `${p.name}: ${p.where}`).join('; '));
    if (!record.pendingDecisions.trim()) { console.log('no pending decision suffix'); return 0; }
    console.log(record.pendingDecisions.trimEnd());
    const digest = sha256(record.pendingDecisions);
    console.log(`pending suffix sha256: ${digest}`);
    if (!dryRun) {
      if (value !== '--confirm') throw new UsageError('inspect the exact pending words, then recover with --confirm <suffix-sha256>');
      recoverDecisions(where.dir, tail[0]);
      console.log('published the exact pending decision; no owner words changed');
    }
    return 0;
  }
  throw new UsageError('usage: dossier recover <dossier> trial <id> | decisions | lock');
}

function recoverLock(dir: string, dryRun: boolean): number {
  const inspection = inspectPublicationLock(dir);
  console.log(`${inspection.state}: ${inspection.reason}`);
  if (!['absent', 'dead-local'].includes(inspection.state)) throw new UsageError(inspection.reason);
  if (!dryRun && inspection.state === 'dead-local') {
    recoverPublicationLock(dir);
    console.log('publication lock recovered');
  } else if (dryRun && inspection.state === 'dead-local') console.log('would recover this demonstrably dead local lock');
  return 0;
}
