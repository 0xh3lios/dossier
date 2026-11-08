import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getShortestPaths } from '@xstate/graph';
import { assign, createActor, setup } from 'xstate';
import { cellsOf } from '../../src/verify/cells.ts';
import { acceptedRisks, forgottenAnswers, formatDecision, parseDecisions } from '../../src/dossiers/decisions.ts';
import { parseSystemProse } from '../../src/prose/prose.ts';
import { sha256 } from '../../src/hash.ts';
import { byEstablished, completed as answered, entryName, entryOf, entryText, holdsCounterexample, rule } from '../../src/trials/answers.ts';
import { basisMoved, basisNow } from '../../src/verify/lapse.ts';
import { groundOf, supersededAmong } from '../../src/verify/superseded.ts';
import type { AnswerRead, Entry, Snapshot } from '../../src/trials/answers.ts';
import type { ActorsModel } from '../../src/dossiers/actors.ts';
import type { Composition } from '../../src/dossiers/composition.ts';
import type { TrialResult } from '../../src/trials/trials.ts';
import type { PresentState } from '../../src/verify/lapse.ts';

// The oracle: one cell, A1 under all-honest, as spec/evidence.md and spec/composition.md state its
// evidence, written from the contract and not from the code. Three questions answer the cell: the TLC
// call that CHECK, VIOLATE, PARTIAL, ABORT and REACH run, a second TLC call with a configuration of
// its own that OTHER runs, and the inductive Apalache call that PROVE runs. HEAD keeps one answer per
// question (ANSWER-KEY). Events are observations handed to the runner, decisions, and edits:
// - CHECK, VIOLATE, PARTIAL and ABORT run the TLC call at its usual reach. PARTIAL stops at a TypeOK
//   violation with A1 holding only as far as it looked. REACH runs it at a reach no trial used before
//   and finds A1 violated. OTHER runs the second configuration, which finds A1 violated.
// - EDIT rewords the property and SHIFT changes the scenario under the same name: every answer's
//   basis moves. ACCEPT records the owner's risk on the cell while it is violated, naming the trial
//   that established its answer. FORGET is the owner's forget of the first TLC entry while it holds
//   a counterexample, in its answer or in its previous one. READ and RENDER change nothing.
// Every publication that is not refused also removes the superseded answers (ANSWER-DROP): on
// this one cell, any answer that does not decide the cell, as long as nothing verify concludes rests
// on it, it holds no counterexample the owner has not forgotten, and it is not the answer of the
// question that ran, which its own publication never removes.
// Which answer decides (spec/evidence.md, MARK-DECIDING): among the answers that have not lapsed the
// strongest, and the latest among equals: a violation, then a proof, then a check; a violation the
// owner forgot decides only when no other answer does, and a partial run decides nothing while another
// answer does. When every answer has lapsed, the latest shows the lapse.
type TlcAnswer = 'none' | 'aborted' | 'holds' | 'violated' | 'partial';
type Question = 'tlc' | 'other' | 'proof';
interface CellEvidence {
  tlc: TlcAnswer;
  // A REACH answer looked at a reach of its own, which no later run repeats.
  ownReach: boolean;
  tlcUnlapsed: boolean;
  // The TLC entry's previous answer holds a counterexample: with its own, what the owner's forget lets go of.
  tlcRemembers: boolean;
  // The second configuration's answer, which is only ever a violation of A1.
  other: boolean;
  otherUnlapsed: boolean;
  proof: boolean;
  proofUnlapsed: boolean;
  // The entries that exist, in the order their answers were established: among equals the later one
  // decides, and the earlier one is superseded.
  order: Question[];
  // Whose trial the latest risk decision names: the answer the owner was shown, until a new answer to
  // that question replaces it or its entry goes. A rerun that publishes nothing keeps it.
  riskNames: 'none' | 'tlc' | 'other';
  // The owner's forget names the first TLC entry as it stands.
  forgotten: boolean;
}
const initial: CellEvidence = { tlc: 'none', ownReach: false, tlcUnlapsed: false, tlcRemembers: false, other: false, otherUnlapsed: false, proof: false, proofUnlapsed: false, order: [], riskNames: 'none', forgotten: false };
// Which outcomes of an answer show a counterexample: A1 when violated, TypeOK when the trial stopped there.
const violations = (a: TlcAnswer) => (a === 'violated' ? ['A1'] : a === 'partial' ? ['TypeOK'] : []);
const completed = (c: CellEvidence, q: Question) => (q === 'tlc' ? c.tlc !== 'none' && c.tlc !== 'aborted' : q === 'other' ? c.other : c.proof);
const latest = (c: CellEvidence): Question | 'none' => [...c.order].reverse().find(q => completed(c, q)) ?? 'none';
const established = (c: CellEvidence, q: Question): Question[] => [...c.order.filter(x => x !== q), q];
const unlapsed = (c: CellEvidence, q: Question): boolean => (q === 'tlc' ? c.tlcUnlapsed : q === 'other' ? c.otherUnlapsed : c.proofUnlapsed);
// The strength of a completed answer: the second configuration's is always a violation, the proof is
// a proof, and the TLC answer is what it holds, with a forgotten violation below every other answer.
const strength = (c: CellEvidence, q: Question): number => (q === 'other' ? 4 : q === 'proof' ? 3 : c.tlc === 'violated' ? (c.forgotten ? 1 : 4) : c.tlc === 'holds' ? 2 : 0);
// The answer that decides the cell: the strongest that has not lapsed, the latest among equals, or the
// latest of all when every one has lapsed.
const deciding = (c: CellEvidence): Question | 'none' => {
  const standing = c.order.filter(q => completed(c, q) && unlapsed(c, q));
  return standing.length ? standing.reduce((best, q) => (strength(c, q) >= strength(c, best) ? q : best)) : latest(c);
};

// What the TLC entry holds after a trial, by the rules in their order, and whether the publication went through.
function tlcRun(c: CellEvidence, answer: TlcAnswer, ownReach: boolean): { c: CellEvidence; refused: boolean } {
  // ANSWER-ABORTED: published only for a question with no entry, and it covers nothing.
  if (answer === 'aborted') return { c: c.tlc === 'none' ? { ...c, tlc: 'aborted', ownReach, tlcUnlapsed: true, order: established(c, 'tlc') } : c, refused: false };
  if (c.tlc !== 'none' && c.tlc !== 'aborted') {
    // ANSWER-SAME: the same verdict, outcomes and reach on an unchanged basis writes nothing.
    if (c.tlcUnlapsed && c.tlc === answer && !c.ownReach && !ownReach) return { c, refused: false };
    // ANSWER-VIOLATION: on an unchanged basis, a counterexample is not dropped without the owner's forget.
    if (c.tlcUnlapsed && !c.forgotten && violations(c.tlc).some(v => !violations(answer).includes(v))) return { c, refused: true };
  }
  // ANSWER-REPLACE: a new answer to the cell. The acceptance and the forget named answers it replaces,
  // and a replaced answer that differed becomes previous, with its counterexample if it had one.
  const differs = c.tlc !== 'none' && c.tlc !== 'aborted' && c.tlc !== answer;
  const remembers = differs ? violations(c.tlc).length > 0 : c.tlc === 'none' || c.tlc === 'aborted' ? false : c.tlcRemembers;
  return { c: { ...c, tlc: answer, ownReach, tlcUnlapsed: true, tlcRemembers: remembers, order: established(c, 'tlc'), riskNames: c.riskNames === 'tlc' ? 'none' : c.riskNames, forgotten: false }, refused: false };
}

function expectation(c: CellEvidence): { mark: string; accepted: boolean } {
  const d = deciding(c);
  const stands = d !== 'none' && unlapsed(c, d);
  const mark = d === 'none' ? 'pending' : !stands ? 'lapsed' : d === 'proof' ? 'proved' : d === 'other' ? 'violated'
    : c.tlc === 'holds' ? 'checked' : c.tlc === 'violated' ? 'violated' : 'pending';
  // A risk holds while the cell is violated and its entry still names the trial the owner was shown.
  return { mark, accepted: mark === 'violated' && c.riskNames === d };
}

// ANSWER-SUPERSEDED and ANSWER-DROP, after a publication: a completed answer that does not decide the cell goes, unless
// the cell is violated and the owner's risk names its trial, which the lapsed acceptance would then say
// differently without it, or it holds a counterexample the owner has not forgotten, or it is the answer
// of the question that ran, which its own publication leaves. The second configuration's answer is
// always a counterexample, and the owner never forgets it here.
function supersede(c: CellEvidence, written: Question | null): CellEvidence {
  const d = deciding(c), violated = expectation(c).mark === 'violated';
  const shadowed = (q: Question) => completed(c, q) && q !== d && q !== written;
  const inert = (q: Question) => !(violated && c.riskNames === q);
  let out = c;
  if (shadowed('tlc') && inert('tlc') && (!(violations(c.tlc).length || c.tlcRemembers) || c.forgotten)) out = { ...out, tlc: 'none', ownReach: false, tlcUnlapsed: false, tlcRemembers: false, forgotten: false, order: out.order.filter(q => q !== 'tlc'), riskNames: out.riskNames === 'tlc' ? 'none' : out.riskNames };
  if (shadowed('proof') && inert('proof')) out = { ...out, proof: false, proofUnlapsed: false, order: out.order.filter(q => q !== 'proof') };
  return out;
}
const run = (c: CellEvidence, answer: TlcAnswer, ownReach: boolean): CellEvidence => { const r = tlcRun(c, answer, ownReach); return r.refused ? r.c : supersede(r.c, 'tlc'); };

const step: Record<string, (c: CellEvidence) => CellEvidence> = {
  CHECK: c => run(c, 'holds', false),
  VIOLATE: c => run(c, 'violated', false),
  PARTIAL: c => run(c, 'partial', false),
  ABORT: c => run(c, 'aborted', false),
  REACH: c => run(c, 'violated', true),
  // ANSWER-SAME keeps an unchanged answer on an unchanged basis, and any other answer is a new one.
  OTHER: c => supersede(c.other && c.otherUnlapsed ? c : { ...c, other: true, otherUnlapsed: true, order: established(c, 'other'), riskNames: c.riskNames === 'other' ? 'none' : c.riskNames }, 'other'),
  PROVE: c => supersede(c.proof && c.proofUnlapsed ? c : { ...c, proof: true, proofUnlapsed: true, order: established(c, 'proof') }, 'proof'),
  EDIT: c => ({ ...c, tlcUnlapsed: false, otherUnlapsed: false, proofUnlapsed: false }),
  SHIFT: c => ({ ...c, tlcUnlapsed: false, otherUnlapsed: false, proofUnlapsed: false }),
  // The risk names the trial whose answer the cell holds: the one that decides it.
  ACCEPT: c => (expectation(c).mark === 'violated' ? { ...c, riskNames: deciding(c) as 'tlc' | 'other' } : c),
  FORGET: c => (c.tlc !== 'none' && (violations(c.tlc).length || c.tlcRemembers) ? { ...c, forgotten: true } : c),
  READ: c => c,
  RENDER: c => c,
};
const lifecycleEvents = Object.keys(step).map(type => ({ type }));
const lifecycle = setup({ types: { context: {} as CellEvidence, events: {} as { type: string } } }).createMachine({
  id: 'cell',
  context: initial,
  on: {
    CHECK: { actions: assign(({ context }) => step.CHECK(context)) },
    VIOLATE: { actions: assign(({ context }) => step.VIOLATE(context)) },
    PARTIAL: { actions: assign(({ context }) => step.PARTIAL(context)) },
    ABORT: { actions: assign(({ context }) => step.ABORT(context)) },
    REACH: { actions: assign(({ context }) => step.REACH(context)) },
    OTHER: { actions: assign(({ context }) => step.OTHER(context)) },
    PROVE: { actions: assign(({ context }) => step.PROVE(context)) },
    EDIT: { actions: assign(({ context }) => step.EDIT(context)) },
    SHIFT: { actions: assign(({ context }) => step.SHIFT(context)) },
    ACCEPT: { actions: assign(({ context }) => step.ACCEPT(context)) },
    FORGET: { actions: assign(({ context }) => step.FORGET(context)) },
    READ: {},
    RENDER: {},
  },
});

// The second configuration's file, as OTHER's trial executed it and as it stands.
const OTHER_CONFIG = 'c'.repeat(64);
// The adapter hands each observation to the production rules as the runner would, keeps the entries
// they write, and reads them as verify does. It never decides a mark or a publication itself.
function adapter() {
  let revision = 0, shift = 0, serial = 0;
  let log = '';
  const entries: Record<string, Entry> = {};
  const hash = () => revision.toString(16).padStart(8, '0');
  const snapshot = (): Snapshot => ({ passages: { A1: hash() }, records: {}, backing: {}, composition: 'composition', module: 'module', scenario: `scenario-${shift}`, actors: 'actors', extras: null, members: {} });
  const system = {
    prose: parseSystemProse('# System\n\n## Always\n[A1] Always, {budget.paid <= 2}. Scenarios: all-honest.\n'),
    composition: { scenarios: [] } as unknown as Composition,
    actors: { scenarioById: { 'all-honest': { id: 'all-honest', strongerThan: [] } } } as unknown as ActorsModel,
  };
  const decide = (verb: string, args: string[], words: string) => {
    const last = log.trimEnd().split('\n').filter(Boolean).at(-1) ?? null;
    log += formatDecision({ verb, args, words, time: `2026-11-04T00:00:${String(serial).padStart(2, '0')}Z` }, last) + '\n';
  };
  // The first TLC question executes no file of its own; the second executes its configuration.
  const tlcEntry = () => Object.entries(entries).find(([, e]) => e.question.checker === 'tlc' && e.question.executes.length === 0);
  const forgotten = () => forgottenAnswers(parseDecisions(log).decisions);
  // The forget counts while it names the digest the manifest would bind for the entry as it stands.
  const bound = (name: string) => sha256(entryText(entries[name]));
  const forgiven = (name: string) => Boolean(entries[name] && forgotten()[name] && bound(name).startsWith(forgotten()[name].digest));
  // As verify reads evidence/: each entry's answer, in the order established.
  const answers = (): AnswerRead[] => Object.entries(entries).map(([name, e]) => ({ name, entry: e, reading: null, problems: [] })).sort(byEstablished);
  // The present: the property's words and the scenario as they stand, and the second configuration's file unchanged.
  function cellOf(list: AnswerRead[]) {
    const s = snapshot();
    const now: PresentState = { passages: s.passages, composition: s.composition!, module: () => s.module ?? null, scenario: () => s.scenario!, actors: s.actors!, extras: null, members: {}, records: {}, configs: {}, inputs: { 'model/A1_other.cfg': OTHER_CONFIG } };
    return cellsOf({ system, completed: list.filter(answered), snapshotNow: now, risks: acceptedRisks(parseDecisions(log).decisions), forgotten: name => forgiven(name) }).cells[0];
  }
  const current = () => cellOf(answers());
  // As a publication removes the superseded answers (ANSWER-DROP), asking the production rule
  // with what the cell concludes from a list of answers, the forget as the manifest would bind it. The
  // entry of the question that ran stays, written or kept: its own publication never removes it.
  function supersede(written: string) {
    const s = supersededAmong({ answers: answers(), gone: {}, ground: a => groundOf(a, 'system', null, snapshot().passages), conclusions: list => JSON.stringify(cellOf(list)), forgiven, bound });
    for (const name of s.removable) if (name !== written) delete entries[name];
  }
  // Whether the publication went through, a write or a rerun that wrote nothing, and the entry it is of.
  function observe(type: string): { published: boolean; name: string } {
    serial++;
    const prove = type === 'PROVE', reach = type === 'REACH' ? `bounded at ${3 + serial}` : prove ? 'inductive' : 'bounded at 3';
    const violates = ['VIOLATE', 'REACH', 'OTHER'].includes(type);
    const outcomes: Record<string, string> = type === 'ABORT' ? {} : prove ? { A1: 'holds' }
      : { TypeOK: type === 'PARTIAL' ? 'violated' : 'holds', A1: violates ? 'violated' : 'holds' };
    // Every run is called as it comes back: the cell's evidence, not a miscall, is under test. An
    // aborted run made the TLC call's usual prediction, so it asks the same question.
    const expect: TrialResult['expect'] = prove ? { A1: { expect: 'holds' } }
      : { TypeOK: { expect: type === 'PARTIAL' ? 'violated' : 'holds' }, A1: { expect: violates ? 'violated' : 'holds' } };
    const kind = prove ? 'apalache' : 'tlc';
    const executed: Record<string, string> = type === 'OTHER' ? { 'model/A1_other.cfg': OTHER_CONFIG } : {};
    const result: TrialResult = {
      kind, checker: kind, id: `2026-11-04-0000-${kind}-${serial.toString(16).padStart(6, '0')}`, at: new Date(Date.UTC(2026, 10, 4, 0, 0, serial)).toISOString(),
      dossier: 'systems/budget', versions: {}, command: [], cwd: '.', exit: 0, seconds: 0,
      enabled: Object.keys(expect), expect, property: 'A1', scenario: 'all-honest', mode: prove ? 'inductive' : 'bounded',
      result: type === 'ABORT' ? 'aborted' : 'as-called', outcomes, partial: type === 'PARTIAL' ? ['A1'] : [],
      snapshot: snapshot(), executed, inputIdentity: { strategy: 'private-copy', files: { ...executed }, shared: [], limitation: 'The adapter executes nothing.' }, reach: { text: reach },
    };
    const next = entryOf(result, { reach, because: 'The adapter states the observation.' }, `kind: ${kind}\n`, '0'.repeat(64));
    const name = entryName(next.question), recorded = entries[name] ?? null;
    // As the runner publishes: the forget counts while it names the digest integrity.json binds.
    const forgot = forgotten()[name];
    const forgiven = Boolean(recorded && forgot && sha256(entryText(recorded)).startsWith(forgot.digest));
    const ruling = rule(recorded, next, { moved: recorded ? basisMoved(recorded, basisNow(next.basis), { givens: () => [], ir: null }) : [], forgiven, classification: null });
    if (ruling.action === 'write') entries[name] = ruling.entry;
    return { published: ruling.action !== 'refuse', name };
  }
  function send(type: string) {
    if (type === 'EDIT') revision++;
    if (type === 'SHIFT') shift++;
    const before = current();
    // As dossier decide records a risk: the property at its hash, the scenario, and the trial that
    // established the violated cell's answer. It refuses a cell that is not violated now.
    if (type === 'ACCEPT' && before.mark === 'violated') decide('risk', [`A1@${hash()}`, 'all-honest', before.trial!], 'Accept this bounded violation.');
    // As dossier decide records a forget: the entry and the first eight hex of its bound digest. It
    // refuses an entry that holds no counterexample, in its answer or in its previous one.
    const tlc = tlcEntry();
    if (type === 'FORGET' && tlc && holdsCounterexample(tlc[1].answer.outcomes, tlc[1].previous)) decide('forget', [`${tlc[0]}@${sha256(entryText(tlc[1])).slice(0, 8)}`], 'Let the recorded counterexample go.');
    if (['CHECK', 'PROVE', 'VIOLATE', 'PARTIAL', 'ABORT', 'REACH', 'OTHER'].includes(type)) { const o = observe(type); if (o.published) supersede(o.name); }
    return current();
  }
  return { current, send };
}

test('ART-SCOPE / PROC-OWNER: one answer per question, on every reachable path and outgoing event, agrees with real publication and cell derivation', () => {
  // Every reachable state of the oracle, and from each every event: the acceptance, the forget and
  // the freshness of each answer are part of the state, so a path that accepts before a SHIFT, a
  // REACH, another question's answer or a confirming rerun reaches its own state here.
  const paths = getShortestPaths(lifecycle, { events: lifecycleEvents });
  // A change to the oracle changes this count: 97 states, then 359 with one answer per question, then
  // 654 with superseded answers, then 719 with strength deciding and a shadowed answer waiting for
  // the next publication, among them 117 with an acceptance shown.
  assert.equal(paths.length, 719, 'the oracle\'s reachable states');
  assert.equal(paths.filter(p => expectation(p.state.context).accepted).length, 117);
  let comparisons = 0;
  for (const path of paths) for (const last of lifecycleEvents) {
    const model = createActor(lifecycle).start();
    const actual = adapter();
    const events = [...path.steps.map(s => s.event).filter(e => e.type !== 'xstate.init'), last];
    for (const event of events) {
      model.send(event);
      const cell = actual.send(event.type);
      assert.ok(cell, 'the property is parsed and has a cell');
      assert.deepEqual({ mark: cell.mark, accepted: Boolean(cell.accepted) }, expectation(model.getSnapshot().context), events.map(e => e.type).join(' → '));
      comparisons++;
    }
    model.stop();
  }
  assert.ok(comparisons > 1000);
});

test('the conformance oracle rejects proof promotion, hidden violations, ignored staleness, a violation rerun away and an acceptance carried past the answer it named', () => {
  type Seen = { mark: string; accepted: boolean };
  for (const [events, mutate] of [
    [['CHECK'], (c: Seen) => ({ ...c, mark: 'proved' })],
    [['VIOLATE', 'ACCEPT'], (c: Seen) => ({ ...c, mark: 'checked' })],
    [['PROVE', 'EDIT'], (c: Seen) => ({ ...c, mark: 'proved' })],
    // On an unchanged basis, a check cannot replace a counterexample without the owner's forget.
    [['VIOLATE', 'CHECK'], (c: Seen) => ({ ...c, mark: 'checked' })],
    [['VIOLATE', 'ACCEPT', 'SHIFT', 'VIOLATE'], (c: Seen) => ({ ...c, accepted: true })],
    // A new reach on an unchanged basis is a new answer, and the next violation owes a new decision.
    [['VIOLATE', 'ACCEPT', 'REACH'], (c: Seen) => ({ ...c, accepted: true })],
    [['VIOLATE', 'ACCEPT', 'FORGET', 'CHECK', 'VIOLATE'], (c: Seen) => ({ ...c, accepted: true })],
    // Another question's violation is a new answer to the cell: the owner was not shown it.
    [['VIOLATE', 'ACCEPT', 'OTHER'], (c: Seen) => ({ ...c, accepted: true })],
    [['OTHER', 'ACCEPT', 'VIOLATE'], (c: Seen) => ({ ...c, accepted: true })],
    // A confirming rerun writes nothing, so it keeps the acceptance and does not overtake a later answer.
    [['VIOLATE', 'ACCEPT', 'VIOLATE'], (c: Seen) => ({ ...c, accepted: false })],
    [['OTHER', 'ACCEPT', 'OTHER'], (c: Seen) => ({ ...c, accepted: false })],
    // Strength first: a check run after a proof does not demote it, and the check is the answer that goes.
    [['PROVE', 'CHECK'], (c: Seen) => ({ ...c, mark: 'checked' })],
    [['CHECK', 'PROVE', 'CHECK'], (c: Seen) => ({ ...c, mark: 'checked' })],
    [['PROVE', 'CHECK', 'PROVE'], (c: Seen) => ({ ...c, mark: 'checked' })],
    // A proof that lapsed decides nothing: the check on the new basis does.
    [['PROVE', 'EDIT', 'CHECK'], (c: Seen) => ({ ...c, mark: 'proved' })],
    // A counterexample never hides under a proof: it decides until the owner forgets it, and the check
    // after the proof finds it still recorded, and is refused.
    [['VIOLATE', 'PROVE'], (c: Seen) => ({ ...c, mark: 'proved' })],
    [['VIOLATE', 'PROVE', 'CHECK'], (c: Seen) => ({ ...c, mark: 'checked' })],
    // Forgotten, it decides only when nothing else does, and goes with the next publication.
    [['VIOLATE', 'FORGET', 'PROVE'], (c: Seen) => ({ ...c, mark: 'violated' })],
    [['VIOLATE', 'ACCEPT', 'FORGET', 'PROVE', 'CHECK'], (c: Seen) => ({ ...c, mark: 'checked' })],
  ] as const) {
    const actual = adapter();
    const model = createActor(lifecycle).start();
    for (const type of events) { actual.send(type); model.send({ type }); }
    const c = actual.current();
    const seen = { mark: c.mark, accepted: Boolean(c.accepted) };
    assert.deepEqual(seen, expectation(model.getSnapshot().context), events.join(' → '));
    assert.throws(() => assert.deepEqual(mutate(seen), expectation(model.getSnapshot().context)), events.join(' → '));
    model.stop();
  }
});
