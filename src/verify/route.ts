// The next loop, decided from the analysis alone. An ask from the author beats it.
import { proseHash } from '../hash.ts';
import { CALL_WAS_WRONG, MODEL_MISREAD, PROSE_AT_FAULT } from '../trials/answers.ts';
import type { Passage } from '../prose/prose.ts';
import type { Analysis, AnswerRow, ComponentAnalysis, SystemAnalysis } from './analyze.ts';
import type { Note } from './tripwires.ts';

// The next loop, why, and the page of the method that says how; target names the dossier at the root.
export interface Route { pass: string; why: string[]; read: string; target?: string | null }

const PAGE: Record<string, string> = { Fix: 'evidence.md', Write: 'language.md', Draw: 'chart.md', Encode: 'models.md', Compose: 'composition.md', System: 'process.md', Refresh: 'process.md', Review: 'review.md', Report: 'evidence.md' };
const pick = (pass: string, why: string[]): Route => ({ pass, why, read: `spec/${PAGE[pass]}` });

// The current answers that wait on the prose: a miscall classified prose at fault while the passages are
// as its trial found them. Each row is one question's current answer, so no answer to another question
// clears it; a new answer to the same question replaces the row.
function waitingOnProse(rows: AnswerRow[], hashes: Record<string, string> | undefined): AnswerRow[] {
  const now = proseHash(hashes);
  return rows.filter(t => !t.gone && t.result === 'miscalled' && t.classification === PROSE_AT_FAULT && t.prose === now);
}
// Answers as a route names them: by their entries.
const named = (rows: AnswerRow[]) => rows.map(t => `evidence/${t.entry}.json`).join(' ');

// The lapsed passages, grouped by what moved under them beyond their own words: A2; A1 M1 (executed model/Timelock.tla).
function lapsedWhy(ids: string[], marks: ComponentAnalysis['marks']): string {
  const groups = new Map<string, string[]>();
  for (const id of ids) {
    const parts = ((marks[id] && marks[id].lapsed) || []).filter(x => x !== `passage ${id}`);
    const key = parts.join(', ');
    (groups.get(key) || groups.set(key, []).get(key)!).push(id);
  }
  return `lapsed: ${[...groups].map(([key, list]) => `${list.join(' ')}${key ? ` (${key})` : ''}`).join('; ')}`;
}

export function routeComponent(f: ComponentAnalysis): Route {
  if (f.tripwires.length) return pick('Fix', f.tripwires.map(t => `${t.name} (${t.where})`));
  const { ir, prose, marks } = f;
  const active = prose.passages.filter(p => !p.retired);
  const ids = (pred: (p: Passage) => unknown) => active.filter(pred).map(p => p.id);
  const why: string[] = [];
  if (active.length === 0) why.push('no prose yet');
  const rejected = ids(p => f.owner[p.id] === 'rejected');
  if (rejected.length) why.push(`rejected: ${rejected.join(' ')}`);
  if (prose.unsaid.length) why.push(`unsaid pairs: ${prose.unsaid.join(', ')}`);
  if (prose.saidTwice.length) why.push(`said twice: ${prose.saidTwice.join('; ')}`);
  if (f.chart.gaps && f.chart.gaps.length) why.push(`unsaid under condition: ${f.chart.gaps.slice(0, 3).join('; ')}`);
  if (why.length) return pick('Write', why);
  const proseAtFault = waitingOnProse(f.answerRows, f.hashes);
  if (proseAtFault.length) return pick('Report', [`${proseAtFault.map(t => `evidence/${t.entry}.json`).join(', ')} miscalled, prose at fault: waits for the author`]);
  const lapsed = ids(p => marks[p.id] && marks[p.id].mark === 'lapsed');
  if (lapsed.length) return pick('Refresh', [lapsedWhy(lapsed, marks)]);
  if (f.pendingCalls.length) return pick('Encode', [`calls pending: ${f.pendingCalls.join(' ')}`]);
  // The chart skips an Always that cites a Given, and a structural one: no chart answer covers them.
  const chartSkips = new Set([...((ir && ir.structural) || []).map(s => s.id), ...((ir && ir.invariants) || []).filter(a => a.givens && a.givens.length).map(a => a.id)]);
  const chartSide = ids(p => 'SEMRWA'.includes(p.kind) && !chartSkips.has(p.id) && marks[p.id] && !marks[p.id].chartCovered && marks[p.id].mark !== 'checked' && marks[p.id].mark !== 'proved');
  if (chartSide.length) why.push(`no chart answer covers: ${chartSide.join(' ')}`);
  const rows = f.answerRows.filter(t => !t.gone);
  // A chart miscall stands while a chart question's current answer is a miscall that the model, the
  // prose or the call does not explain, unclassified or `chart differs from prose`; an answer to
  // another question does not clear it.
  const chartMiscalls = rows.filter(t => t.checker === 'chart' && t.result === 'miscalled' && !(MODEL_MISREAD.includes(t.classification as typeof MODEL_MISREAD[number]) || t.classification === PROSE_AT_FAULT || t.classification === CALL_WAS_WRONG));
  if (chartMiscalls.length) why.push(`chart answer miscalled: ${named(chartMiscalls)}`);
  if (why.length) return pick('Draw', why);
  if (f.tier === 'modeled') {
    if (f.models.modules.length === 0) why.push('no model: run dossier scaffold');
    const uncited = ids(p => 'AONMRW'.includes(p.kind) && !f.modelCited.has(p.id));
    if (uncited.length && f.models.modules.length) why.push(`not encoded: ${uncited.join(' ')}`);
    const held = ids(p => marks[p.id] && marks[p.id].mark === 'held');
    if (held.length) why.push(`held, blunder owed: ${held.join(' ')}`);
    const hollow = ids(p => marks[p.id] && marks[p.id].mark === 'hollow');
    if (hollow.length) why.push(`hollow, a real blunder owed: ${hollow.join(' ')}`);
    const reworded = f.flags.filter(x => x.name === 'reworded');
    if (reworded.length) why.push(reworded.map(x => x.where).join('; '));
    const modelSide = ids(p => 'AONMRW'.includes(p.kind) && marks[p.id] && !marks[p.id].modelCovered && !['held', 'hollow', 'miscalled', 'proved', 'checked'].includes(marks[p.id].mark));
    if (modelSide.length) why.push(`not tried on the model side: ${modelSide.join(' ')}`);
    const modelMiscalls = rows.filter(t => t.checker !== 'chart' && t.result === 'miscalled' && MODEL_MISREAD.includes(t.classification as typeof MODEL_MISREAD[number]));
    if (modelMiscalls.length) why.push(`miscalled, model misread the prose: ${named(modelMiscalls)}`);
    if (f.changedModelFiles.length) why.push(`changed since their trials, calls owed: ${f.changedModelFiles.map(c => `${c.file} (evidence/${c.entry}.json)`).join(', ')}`);
    if (why.length) return pick('Encode', why);
  } else {
    const held = ids(p => marks[p.id] && marks[p.id].mark === 'held');
    if (held.length) return pick('Encode', [`held, a chart blunder owed: ${held.join(' ')}`]);
  }
  // The second read, the different judge, before the report (spec/review.md).
  if (f.reviewOwed) return pick('Review', [f.reviewOwed]);
  return pick('Report', ['nothing owed']);
}

export function routeSystem(f: SystemAnalysis): Route {
  if (f.tripwires.length) return pick('Fix', f.tripwires.map(t => `${t.name} (${t.where})`));
  const why: string[] = [];
  if (f.composition.members.length === 0) why.push('no members');
  if (f.closureMissing.length) why.push(`closure open: ${f.closureMissing.join('; ')}`);
  if (why.length) return pick('Compose', why);
  const proseAtFault = waitingOnProse(f.answerRows, f.hashes);
  if (proseAtFault.length) return pick('Report', [`${proseAtFault.map(t => `evidence/${t.entry}.json`).join(', ')} miscalled, prose at fault: waits for the owner`]);
  const walks = f.walks || [];
  const lapsed = [...f.cells.filter(c => c.mark === 'lapsed').map(c => `${c.property}×${c.scenario}`), ...walks.filter(w => w.mark === 'lapsed').map(w => `${w.id}×${w.scenario}`)];
  if (lapsed.length) return pick('Refresh', [`lapsed: ${lapsed.join(' ')}`]);
  if (f.pendingCalls.length) return pick('Encode', [`calls pending: ${f.pendingCalls.join(' ')}`]);
  if (f.prose.properties.length === 0) why.push('no properties');
  const pending = f.cells.filter(c => c.mark === 'pending');
  if (pending.length) why.push(`cells pending: ${pending.map(c => `${c.property}×${c.scenario}`).join(' ')}`);
  const walksPending = walks.filter(w => w.mark === 'pending');
  if (walksPending.length) why.push(`walks pending: ${walksPending.map(w => w.id).join(' ')}`);
  const held = Object.entries(f.propertyHeld).filter(([, v]) => v !== 'caught').map(([id, v]) => `${id} (${v})`);
  if (held.length) why.push(`blunders owed: ${held.join(' ')}`);
  const violated = f.cells.filter(c => c.mark === 'violated' && !c.accepted);
  if (violated.length) why.push(`violated, a decision owed: ${violated.map(c => `${c.property}×${c.scenario}`).join(' ')}`);
  // An acceptance given on an answer that no longer decides the cell, or whose basis has since moved,
  // covers nothing: the owner decides again.
  const stale = violated.filter(c => c.acceptanceLapsed && c.acceptanceLapsed.length);
  if (stale.length) why.push(`acceptance lapsed: ${stale.map(c => `${c.property}×${c.scenario} (${c.acceptanceLapsed!.join(', ')})`).join(' ')}`);
  if (why.length) return pick('System', why);
  if (f.reviewOwed) return pick('Review', [f.reviewOwed]);
  return pick('Report', ['nothing owed']);
}

// rootTrips: what is wrong at the root itself, dossier.json or index.md; it is fixed first.
export function routeRoot(components: Analysis[], systems: Analysis[], rootTrips: Note[] = []): Route {
  const all = [...components, ...systems];
  const trips = [...rootTrips.map(t => `${t.name} (${t.where})`), ...all.flatMap(a => a.tripwires.map(t => `${a.title}: ${t.name} (${t.where})`))];
  if (trips.length) return { ...pick('Fix', trips), target: rootTrips.length ? null : all.find(a => a.tripwires.length)!.ref };
  const routed = (pass: string, hits: Analysis[]) => ({ ...pick(pass, hits.map(a => `${a.title}: ${a.route.why.join('; ')}`)), target: hits[0].ref });
  // A system with no members waits for its components: their prose and chart come before composing it.
  const empty = (a: Analysis) => a.kind === 'system' && Boolean(a.composition) && a.composition.members.length === 0;
  const by = (pass: string) => all.filter(a => a.route.pass === pass && !(pass === 'Compose' && empty(a)));
  for (const pass of ['Refresh', 'Encode', 'Compose', 'System']) { const hits = by(pass); if (hits.length) return routed(pass, hits); }
  const comp = all.filter(a => a.kind === 'component' && ['Write', 'Draw'].includes(a.route.pass));
  if (comp.length) return routed(comp[0].route.pass, comp);
  const waiting = all.filter(a => a.route.pass === 'Compose' && empty(a));
  if (waiting.length) return routed('Compose', waiting);
  const review = by('Review');
  if (review.length) return routed('Review', review);
  return { ...pick('Report', ['nothing owed']), target: null };
}
