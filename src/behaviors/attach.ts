// Join authored explanations to formal analysis. This layer does not run checkers or write records.
import { loadBehaviorCollection } from './records.ts';
import { evaluateReviews } from './reviews.ts';
import { buildBehaviorReport } from './report.ts';
import { requiredReviewBasis } from './dependencies.ts';
import { routePart, routeComposition } from '../verify/route.ts';
import type { Analysis } from '../verify/analyze.ts';
import type { LoadedKnowledge } from '../dossiers/load.ts';

export function attachBehaviors<T extends Analysis>(root: string, analysis: T, analyses: Record<string, Analysis>, knowledge: LoadedKnowledge): T {
  const collection = loadBehaviorCollection(analysis.dir);
  analysis.behaviorCollection = collection;
  const context = { root, analysis, analyses, knowledge, collection };
  const reviews = evaluateReviews({ root, dossier: analysis.ref, collection, knowledgeRoot: knowledge.root ?? undefined, requiredBasis: subject => requiredReviewBasis(subject, context) });
  analysis.reviews = reviews.reviews;
  analysis.behaviors = buildBehaviorReport({ analysis, analyses, collection, reviews, knowledge });
  analysis.flags = analysis.flags.filter(f => f.name !== 'review owed');
  for (const issue of collection.issues) analysis.tripwires.push({ name: 'invalid behavior collection', where: `${issue.path}: ${issue.message}` });
  for (const review of reviews.reviews) {
    if (review.status === 'invalid') analysis.tripwires.push({ name: 'invalid review', where: `${review.file}: ${review.reasons.join('; ')}` });
    else if (review.status === 'stale') analysis.flags.push({ name: 'review stale', where: `${review.file}: ${review.reasons.join('; ')}` });
  }
  const judged = analysis.kind === 'part'
    ? Object.values(analysis.marks).some(m => ['checked', 'proved', 'backed', 'miscalled'].includes(m.mark))
    : analysis.cells.some(c => ['checked', 'proved', 'violated', 'implied'].includes(c.mark));
  // A review examined the composition's closure as it was. While the knowledge base names an owner of a
  // closure edge that is not a member, no review clears what the composition owes.
  const open = analysis.kind === 'composition' ? analysis.closureMissing : [];
  analysis.reviewOwed = !judged ? null : !reviews.dossierReviewed ? 'no current dossier review with complete scoped basis and coverage' : open.length ? `the closure is open, which no review clears: ${open.join('; ')}` : null;
  if (analysis.reviewOwed) analysis.flags.push({ name: 'review owed', where: analysis.reviewOwed });
  analysis.route = analysis.kind === 'part' ? routePart(analysis) : routeComposition(analysis);
  return analysis;
}
