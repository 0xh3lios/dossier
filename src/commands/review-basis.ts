// Prepare the mechanical input inventory for an independent review. No assessment is authored here.
import { findRoot, locate, stripRootArgs, UsageError } from '../dossiers/root.ts';
import { requireCurrent } from '../dossiers/integrity.ts';
import { verifyAll } from './verify.ts';
import { loadBehaviorCollection, reviewCoverageItems } from '../behaviors/records.ts';
import { requiredReviewBasis } from '../behaviors/dependencies.ts';
import type { ReviewSubject } from '../behaviors/types.ts';
import type { CommandContext } from '../cli.ts';

export async function main(_command: string, args: string[], { version }: CommandContext): Promise<number> {
  const root = findRoot(args);
  if (!root) throw new UsageError('no dossiers root here');
  requireCurrent(root);
  const rest = stripRootArgs(args).filter(a => a !== '--json'), name = rest.shift();
  const behavior = rest.length === 2 && rest[0] === '--behavior' ? rest[1] : null;
  if (!name || rest.length && !behavior) throw new UsageError('usage: dossier review-basis <dossier> [--behavior <id>] [--json]');
  const where = locate(root, name);
  if (!where) throw new UsageError('name an existing dossier');
  const verified = verifyAll({ root, version, wanted: [name] });
  const all = [...verified.parts, ...verified.compositions], analysis = all.find(a => a.dir === where.dir);
  if (!analysis) throw new UsageError('a retired dossier cannot receive a current review');
  const collection = analysis.behaviorCollection || loadBehaviorCollection(analysis.dir);
  const ids = collection.collection?.record.behaviors || [];
  if (behavior && !ids.includes(behavior)) throw new UsageError(`behavior ${behavior} is not in the collection`);
  const subject: ReviewSubject = { kind: behavior ? 'behavior' : 'dossier', dossier: analysis.ref, behaviors: behavior ? [behavior] : ids };
  const basis = requiredReviewBasis(subject, { root, analysis, analyses: Object.fromEntries(all.map(a => [a.ref, a])), knowledge: verified.knowledge, collection });
  console.log(JSON.stringify({ subject, basis: basis.files, coverageItems: reviewCoverageItems(subject), issues: basis.issues }, null, 2));
  return basis.issues.length ? 1 : 0;
}
