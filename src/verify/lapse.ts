// Lapse (spec/evidence.md, the marks and the cells): what moved under an answer since it was
// established, read from its basis against the present. The one comparison serves verify, which
// lapses a passage's side, a cell or a walk when something moved under the answer that decides it;
// the publication rules, which compare a recorded answer's basis with a new answer's before the new
// one may replace it, since a basis is unchanged exactly when its answer has not lapsed
// (ANSWER-VIOLATION); and recheck, which asks again only the answers that have not lapsed.
import { entryName, inputFiles, passageOf } from '../trials/answers.ts';
import { coversOf } from './covers.ts';
import type { Basis, Entry, Snapshot } from '../trials/answers.ts';
import type { Ir } from '../prose/ir.ts';

// The present, as lapse compares a basis with it: the snapshot a trial would take now, and each file's
// hash now, null when it is gone.
export interface Now { snapshot: Snapshot; file: (path: string) => string | null }
// The present a new answer rests on, as its basis holds it.
export function basisNow(basis: Basis): Now {
  const files = inputFiles(basis);
  return { snapshot: basis.snapshot, file: path => files[path] ?? null };
}

// What moved under a part's answer on the passages given: each one's words and those of the
// Givens it cites; the other passages its covers leaned on, gone or reworded, such as the walk that
// showed a refusal-only event refused; for an answer that is not the chart's, the records the
// part pins and its guarantees' backing, an external backing being external whatever its runs;
// and every file the answer executed or captured, prose.md aside, whose passages are compared one by one.
export function movedUnder(answer: { checker: string; basis: Basis }, ids: readonly string[], leaned: readonly string[], now: Now, givens: (id: string) => readonly string[]): string[] {
  const then = answer.basis.snapshot, present = now.snapshot.passages;
  const moved: string[] = [];
  for (const id of [...ids, ...ids.flatMap(id => givens(id))]) if (then.passages[id] !== present[id]) moved.push(`passage ${id}`);
  for (const id of leaned) {
    if (!Object.hasOwn(present, id)) moved.push(`passage ${id} gone`);
    else if (then.passages[id] !== present[id]) moved.push(`passage ${id}`);
  }
  if (answer.checker !== 'chart') {
    for (const [ref, h] of Object.entries(now.snapshot.records)) if (Object.hasOwn(then.records, ref) && then.records[ref] !== h) moved.push(`record ${ref}`);
    for (const [k, b] of Object.entries(now.snapshot.backing)) {
      const was = then.backing[k];
      if (was && (was.status !== b.status || (was.hash ?? null) !== (b.hash ?? null))) moved.push(`backing ${k}`);
    }
  }
  for (const [path, h] of Object.entries(inputFiles(answer.basis))) {
    if (path === 'prose.md') continue;
    const hash = now.file(path);
    if (hash === null) moved.push(`executed ${path} gone`);
    else if (hash !== h) moved.push(`executed ${path}`);
  }
  return [...new Set(moved)];
}

// The present of a composition, hashed the way a trial's snapshot was: a cell or a walk lapses where they differ.
export interface PresentState {
  passages: Record<string, string>;
  wiring: string;
  // The module the composer writes now, without extras.tla, as one scenario's cells rest on it
  // (moduleHash); null while it does not compose.
  module: (sid: string) => string | null;
  scenario: (sid: string) => string | null;
  actors: string;
  extras: string | null;
  members: Record<string, { prose: string; backing: Record<string, string> }>;
  records: Record<string, string | null>;
  // The configurations the composer writes now, by their path in the dossier, hashed as files are.
  configs: Record<string, string>;
  // The other files a trial captured, hashed now; null where one is gone. Generated views resolve in memory.
  inputs: Record<string, string | null>;
}

// What moved under a composition's answer on one cell or walk: the passage and the Givens it cites, the
// wiring, the generated module as the scenario rests on it, the scenario, the actors,
// extras.tla, each member's prose and its guarantees' backing, the records pinned, the generated
// configuration the trial executed, and the other files it captured.
export function lapsedParts(then: Basis, now: PresentState, propertyId: string, scenarioId: string, givens: readonly string[] = []): string[] {
  const s = then.snapshot;
  const moved: string[] = [];
  for (const id of [propertyId, ...givens]) if (s.passages[id] !== now.passages[id]) moved.push(`passage ${id}`);
  if (s.wiring !== now.wiring) moved.push('wiring');
  if (s.module !== now.module(scenarioId)) moved.push('generated module');
  if (s.scenario !== now.scenario(scenarioId)) moved.push(`scenario ${scenarioId}`);
  if (s.actors !== now.actors) moved.push('actors');
  if (s.extras !== now.extras) moved.push('extras.tla');
  for (const [id, m] of Object.entries(s.members || {})) {
    const cur = now.members[id];
    if (!cur) { moved.push(`member ${id} gone`); continue; }
    if (cur.prose !== m.prose) moved.push(`member ${id}`);
    if (!sameValues(m.backing, cur.backing)) moved.push(`member ${id} backing`);
  }
  for (const [ref, h] of Object.entries(s.records)) if (now.records[ref] !== undefined && now.records[ref] !== h) moved.push(`record ${ref}`);
  // The configuration a cell or a witness ran, against the one the composer writes now.
  for (const [path, h] of Object.entries(then.executed)) {
    if (!/^model\/generated\/[^/]+\.cfg$/.test(path)) continue;
    if (now.configs[path] === undefined) moved.push(`executed ${path} gone`);
    else if (now.configs[path] !== h) moved.push(`executed ${path}`);
  }
  for (const [path, hash] of Object.entries(then.inputIdentity.files)) {
    if (path === 'prose.md') continue; // Passage identities already select relevant prose.
    // The generated module is compared above, as the scenario rests on it, with extras.tla beside it.
    if (/^model\/generated\/[^/]+\.tla$/.test(path)) continue;
    if (now.inputs[path] == null) moved.push(`executed ${path} gone`);
    else if (now.inputs[path] !== hash) moved.push(`executed ${path}`);
  }
  return [...new Set(moved)];
}

const sameValues = (x: Record<string, string>, y: Record<string, string>) => [...new Set([...Object.keys(x), ...Object.keys(y)])].every(k => x[k] === y[k]);

// What lapse reads of the dossier's prose as it stands: the Givens each passage cites, and a
// part's compiled prose, which says which passages an answer touched; null for a composition.
export interface Prose { givens: (id: string) => string[]; ir: Ir | null }

// What moved under a recorded answer since it was established, against the present: what a new trial
// on the same question rests on, for a publication, or the dossier as it stands, for a recheck. Empty
// when the answer has not lapsed. A part's answer is compared on every passage it touched, as
// its covers read it with the present prose, on the passages its question names, and on the passages
// its covers leaned on; a chart's first on the prose's compilation, which its checks and gaps rest on
// whole. A composition's answer is compared on its cell or its walk.
export function basisMoved(entry: Entry, now: Now, prose: Prose): string[] {
  const q = entry.question, then = entry.basis;
  if (entry.dossier.startsWith('compositions/')) {
    const s = now.snapshot;
    const present: PresentState = {
      passages: s.passages, wiring: s.wiring ?? '', module: () => s.module ?? null, scenario: () => s.scenario ?? null,
      actors: s.actors ?? '', extras: s.extras ?? null, members: s.members ?? {}, records: s.records,
      configs: Object.fromEntries(Object.keys(then.executed).flatMap(path => { const h = now.file(path); return h === null ? [] : [[path, h]]; })),
      inputs: Object.fromEntries(Object.keys(then.inputIdentity.files).map(path => [path, now.file(path)])),
    };
    const id = q.property || q.walk || q.expects.map(n => passageOf(n)).find(Boolean) || '';
    return lapsedParts(then, present, id, q.scenario || 'all-honest', id ? prose.givens(id) : []);
  }
  const answer = { checker: q.checker, basis: then };
  if (q.checker === 'chart' && then.snapshot.ir !== now.snapshot.ir) return ['prose', ...movedUnder(answer, [], [], now, prose.givens)];
  const { touches, covers } = prose.ir && entry.answer.result !== 'aborted'
    ? coversOf({ completed: [{ name: entryName(q), entry }], ir: prose.ir, hashes: prose.ir.hashes })
    : { touches: {}, covers: {} };
  const ids = [...new Set([q.property, q.walk, ...q.expects.map(n => passageOf(n)), ...Object.keys(touches)].filter((x): x is string => Boolean(x)))];
  const leaned = [...new Set(Object.values(covers).flat().flatMap(c => c.leaned || []))];
  return movedUnder(answer, ids, leaned, now, prose.givens);
}
