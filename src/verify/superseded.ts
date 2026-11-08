// Superseded answers (spec/evidence.md, ANSWER-SUPERSEDED): an answer that the answers that decide
// stand in for. Its ground, the passages it touched, the targets of a blunder, the cell or the walk
// it answered, lies within the ground of completed answers to other questions, and the dossier's
// conclusions are the same without it. The candidates are tried in the order they were established,
// each against the answers that would remain, so that removing them all changes nothing either, and
// so that among equals the earlier one goes. One that holds a counterexample waits for the owner's
// forget before a publication drops it (ANSWER-DROP).
import { canonical } from '../hash.ts';
import { byEstablished, completed, holdsCounterexample, passageOf } from '../trials/answers.ts';
import { coversOf } from './covers.ts';
import type { Ir } from '../prose/ir.ts';
import type { AnswerRead } from '../trials/answers.ts';
import type { ComponentAnalysis, SystemAnalysis } from './analyze.ts';
import type { Note } from './tripwires.ts';

// What an answer answered for. A component's completed answer: each passage it touched, as covers
// reads it, and a blunder's targets apart; a chart's exploration besides. A system's: its cell or
// its walk under its scenario, and a blunder's property. An aborted answer answered nothing, so its
// ground is what its question asked about.
export function groundOf(a: AnswerRead, kind: 'component' | 'system', ir: Ir | null, hashes: Record<string, string>): string[] {
  if (!a.entry) return [];
  const q = a.entry.question;
  const ground = new Set<string>();
  const blunder = q.kind === 'blunder';
  if (kind === 'system') {
    if (blunder) { if (q.property) ground.add(`blunder:${q.property}`); }
    else {
      if (q.property) ground.add(`cell:${q.property}|${q.scenario ?? ''}`);
      if (q.walk) ground.add(`walk:${q.walk}|${q.scenario || 'all-honest'}`);
    }
    return [...ground];
  }
  if (q.kind === 'chart') ground.add('chart');
  if (completed(a) && ir) {
    const { touches } = coversOf({ completed: [a], ir, hashes });
    for (const id of Object.keys(touches)) ground.add(`${blunder ? 'blunder' : 'passage'}:${id}`);
    return [...ground];
  }
  const expect = a.entry.call.expect;
  for (const name of Object.keys(expect)) {
    if (name === 'checks') for (const id of expect.checks?.failing || []) ground.add(`blunder:${id}`);
    else { const id = passageOf(name); if (id && hashes[id]) ground.add(`${blunder ? 'blunder' : 'passage'}:${id}`); }
  }
  return [...ground];
}

// The findings that are an entry's own, and go with it: its abort, its own narrowed reach, its gone
// question, and its being superseded. Verify names the entry on each (Note.entry), so no message's
// wording decides it. Every other flag is compared.
const own = (flag: Note) => Boolean(flag.entry);

// What verify concludes from a dossier, as one string: the marks, the backing, the chart's gaps and
// the changed model files of a component; the cells, the walks and the blunders' standing of a
// system; and the tripwires, the flags and the next step of either.
export function conclusionsOf(a: ComponentAnalysis | SystemAnalysis): string {
  const flags = a.flags.filter(f => !own(f));
  return canonical(a.kind === 'component'
    ? { marks: a.marks, backing: a.backing, gaps: a.chart.gaps, changed: a.changedModelFiles, tripwires: a.tripwires, flags, route: a.route }
    : { cells: a.cells, walks: a.walks, held: a.propertyHeld, tripwires: a.tripwires, flags, route: a.route });
}

export interface SupersededRead {
  // Each superseded entry, with why it stays or goes.
  superseded: Record<string, string>;
  // The ones the next publication removes.
  removable: string[];
}

export const STANDS_IN = 'the answers that decide stand in its place';

// The superseded entries among a dossier's answers. `conclusions` concludes the dossier from a list of
// answers, `forgiven` says whether the owner's forget names an entry as it stands, and `bound` gives
// the digest the manifest binds for it.
export function supersededAmong({ answers, gone, ground, conclusions, forgiven, bound }: {
  answers: AnswerRead[];
  gone: Record<string, string>;
  ground: (a: AnswerRead) => string[];
  conclusions: (answers: AnswerRead[]) => string;
  forgiven: (name: string) => boolean;
  bound: (name: string) => string | undefined;
}): SupersededRead {
  const out: SupersededRead = { superseded: {}, removable: [] };
  const order = [...answers].sort(byEstablished);
  const grounds = new Map(order.map(a => [a, ground(a)]));
  let working = order;
  let baseline: string | null = null;
  for (const a of order) {
    if (!a.entry || a.problems.length || gone[a.name]) continue;
    const mine = grounds.get(a) || [];
    if (!mine.length) continue;
    const others = working.filter(u => u !== a && completed(u) && !gone[u.name]);
    const covered = new Set(others.flatMap(u => grounds.get(u) || []));
    if (!mine.every(g => covered.has(g))) continue;
    baseline ??= conclusions(working);
    const without = working.filter(u => u !== a);
    if (conclusions(without) !== baseline) continue;
    const name = a.name;
    if (holdsCounterexample(a.entry.answer.outcomes, a.entry.previous)) {
      if (!forgiven(name)) { out.superseded[name] = `${STANDS_IN}; it holds a counterexample, so it stays until the owner forgets ${name}@${(bound(name) || '').slice(0, 8)}`; continue; }
      out.superseded[name] = `${STANDS_IN}, and the owner forgot it; the next publication removes it`;
    } else out.superseded[name] = `${STANDS_IN}; the next publication removes it`;
    out.removable.push(name);
    working = without;
  }
  return out;
}
