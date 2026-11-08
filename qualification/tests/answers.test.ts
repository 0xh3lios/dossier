// One answer per question (spec/evidence.md, Questions and answers): the question key, the
// publishing rules, the basis comparison lapse makes and what verify reads of evidence/. Each rule is
// checked with its refusal or its absence, not only with the write it allows.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sha256 } from '../../src/hash.ts';
import { completed, entryName, entryOf, entryProblem, entryText, evidenceNotes, narrowerReach, questionGone, questionOf, readEvidence, rule } from '../../src/trials/answers.ts';
import { basisMoved, basisNow } from '../../src/verify/lapse.ts';
import type { Entry, Snapshot } from '../../src/trials/answers.ts';
import type { TrialResult } from '../../src/trials/trials.ts';
import type { Ir } from '../../src/prose/ir.ts';

const BUNDLE = 'b'.repeat(64);
// A completed TLC run on a component's O1, with what each case changes. Its input identity holds the
// files it executed.
function result(over: Partial<TrialResult> = {}): TrialResult {
  const r = {
    kind: 'tlc', checker: 'tlc', dossier: 'components/timelock', id: '2026-11-07-1000-tlc-aaaaaa', at: '2026-11-07T10:00:00.000Z',
    versions: { dossier: '0.1.0' }, command: ['tlc'], cwd: '.', exit: 0, seconds: 1,
    property: null, scenario: null, walk: null,
    executed: { 'model/Timelock.tla': '1'.repeat(64), 'model/Timelock_O1.cfg': '2'.repeat(64), 'prose.md': '3'.repeat(64) },
    enabled: ['O1'], expect: { O1: { expect: 'holds' } }, outcomes: { O1: 'holds' },
    snapshot: { passages: { O1: 'o1', G1: 'g1', G2: 'g2', S1: 's1' }, records: {}, backing: {} },
    result: 'as-called', miscalls: [], reach: { text: 'one plan; delay 2', values: { delay: 2 } },
    ...over,
  } as TrialResult;
  return { ...r, inputIdentity: over.inputIdentity ?? { strategy: 'private-copy', files: { ...r.executed }, shared: [], limitation: 'A synthetic result.' } };
}
const entry = (over: Partial<TrialResult> = {}): Entry => entryOf(result(over), { reach: 'one plan; delay 2', because: 'the chain ticks' }, 'kind: tlc\n', BUNDLE);
// The prose as lapse reads it: O1 cites G1 and G2, and S1 is the state Waiting, which an action that
// fires may target.
const prose = {
  givens: (id: string) => (id === 'O1' ? ['G1', 'G2'] : []),
  ir: { states: [{ id: 'S1', key: 'Waiting' }], events: [], transitions: [], refusals: [], invariants: [], onces: [{ id: 'O1', givens: ['G1', 'G2'] }], withins: [], hashes: result().snapshot.passages } as unknown as Ir,
};
// The present as a new trial on the same question would rest on it.
const now = (over: Partial<TrialResult> = {}) => basisNow(entry(over).basis);
const ruling = (current: Entry | null, next: Entry, { moved = [] as string[], forgiven = false, classification = null as string | null } = {}) => rule(current, next, { moved, forgiven, classification });

test('ANSWER-KEY: the question is the kind, files, expectations, cell and walk; the reach is not part of it', () => {
  const base = entryName(questionOf(result()));
  assert.match(base, /^tlc-O1-[0-9a-f]{6}$/);
  assert.equal(entryName(questionOf(result({ reach: { text: 'two plans', values: { delay: 3 } } }))), base, 'a further reach answers the same question');
  assert.equal(entryName(questionOf(result({ executed: { ...result().executed, 'prose.md': '9'.repeat(64) } }))), base, 'prose.md is no part of the question');
  assert.notEqual(entryName(questionOf(result({ executed: { 'model/Timelock.tla': '1'.repeat(64), 'model/Timelock_O1b.cfg': '2'.repeat(64) } }))), base, 'two configurations of one passage are two questions');
  const cell = entryName(questionOf(result({ dossier: 'systems/control', property: 'N1', scenario: 'executor-offline', expect: { N1: { expect: 'violated' } } })));
  assert.match(cell, /^tlc-N1-executor-offline-[0-9a-f]{6}$/);
});

test('ANSWER-SAME: the same answer on an unchanged basis writes nothing; a different trace or state count is the same answer', () => {
  const current = entry();
  assert.equal(ruling(current, entry({ id: '2026-11-07-1100-tlc-bbbbbb', states: { distinct: 9, generated: 99, depth: 3 } as never })).action, 'keep');
});

test('ANSWER-REPLACE: a changed basis replaces the entry; the last different answer and a further reach are kept', () => {
  const current = entry();
  const same = ruling(current, entry({ id: '2026-11-07-1100-tlc-bbbbbb' }), { moved: ['passage O1'] });
  assert.equal(same.action, 'write');
  assert.equal(same.action === 'write' && same.entry.previous, null, 'the same verdict and outcomes leave previous as it was');
  assert.equal(same.action === 'write' && same.entry.established.trial, '2026-11-07-1100-tlc-bbbbbb');
  const violated = entry({ id: '2026-11-07-1200-tlc-cccccc', outcomes: { O1: 'violated' }, result: 'miscalled' });
  const flipped = ruling(current, violated, { moved: ['passage O1'] });
  assert.ok(flipped.action === 'write' && flipped.entry.previous && flipped.entry.previous.established.trial === current.established.trial, 'the replaced answer differed, so it becomes previous');
  const smaller = ruling(current, entry({ id: '2026-11-07-1300-tlc-dddddd', reach: { text: 'one plan; delay 1', values: { delay: 1 } } }), { moved: ['passage O1'] });
  assert.ok(smaller.action === 'write' && smaller.entry.narrowed && smaller.entry.narrowed.values!.delay === 2, 'a smaller reach keeps the further one as narrowed');
  const back = ruling(smaller.action === 'write' ? smaller.entry : current, entry({ id: '2026-11-07-1400-tlc-eeeeee' }), { moved: ['passage O1'] });
  assert.ok(back.action === 'write' && back.entry.narrowed === null, 'an answer that looks as far again clears narrowed');
  assert.equal(narrowerReach({ text: '', values: { delay: 1, plans: 1 } }, { text: '', values: { delay: 2, plans: 1 } }), 'delay 2→1, plans 1→1');
  assert.equal(narrowerReach({ text: '', values: { delay: 3 } }, { text: '', values: { delay: 2 } }), null);
});

test('ANSWER-VIOLATION: on an unchanged basis a violation is not replaced by a pass without the owner, whatever changed the run', () => {
  const violated = entry({ outcomes: { O1: 'violated' }, expect: { O1: { expect: 'violated' } } });
  for (const [why, over] of [['a smaller reach', { reach: { text: 'delay 1', values: { delay: 1 } } }], ['a changed toolchain', { versions: { dossier: '0.1.0', tlc: 'new' } }], ['a hand-made result', {}]] as const) {
    const next = entry({ ...over, id: '2026-11-07-1100-tlc-bbbbbb', outcomes: { O1: 'holds' }, expect: { O1: { expect: 'violated' } }, result: 'miscalled' });
    const refused = ruling(violated, next);
    assert.equal(refused.action, 'refuse', why);
    assert.match(refused.action === 'refuse' ? refused.reason : '', /forget/);
    assert.equal(ruling(violated, next, { forgiven: true }).action, 'write', `${why}, with the owner's forget`);
    assert.equal(ruling(violated, next, { moved: ['executed model/Timelock.tla'] }).action, 'write', `${why}, after a change that moved the basis`);
  }
  const fails = entry({ checker: 'chart', kind: 'chart', outcomes: { checks: 'fail' }, expect: { checks: { expect: 'fail' } } });
  assert.equal(ruling(fails, entry({ checker: 'chart', kind: 'chart', outcomes: { checks: 'pass' }, expect: { checks: { expect: 'fail' } }, result: 'miscalled' })).action, 'refuse', 'a failed chart check counts as a counterexample');
  const counter = entry({ checker: 'alloy', kind: 'alloy', outcomes: { A2: 'counterexample' }, expect: { A2: { expect: 'counterexample' } } });
  assert.equal(ruling(counter, entry({ checker: 'alloy', kind: 'alloy', outcomes: { A2: 'no counterexample' }, expect: { A2: { expect: 'counterexample' } }, result: 'miscalled' })).action, 'refuse', 'so does an Alloy counterexample');
  assert.equal(ruling(entry(), violated).action, 'write', 'a pass may become a violation on an unchanged basis');
});

test('ANSWER-MISCALL: an unclassified miscall is never replaced; a classified one moves into previous with its classification', () => {
  const miscall = entry({ outcomes: { O1: 'violated' }, result: 'miscalled', miscalls: ['O1: expected holds, got violated'] });
  const next = entry({ id: '2026-11-07-1100-tlc-bbbbbb', outcomes: { O1: 'violated' }, expect: { O1: { expect: 'violated' } } });
  assert.equal(ruling(miscall, next, { moved: ['passage O1'] }).action, 'refuse', 'even after a change that moved the basis');
  const done = ruling(miscall, next, { moved: ['passage O1'], classification: 'call was wrong' });
  assert.ok(done.action === 'write' && done.entry.previous?.classification === 'call was wrong');
});

test('ANSWER-MISCALL: a classified miscall replaced by an equal answer on a moved basis does not become previous; its classification goes with the reading', () => {
  // A first answer that held, then a miscall on a moved basis, which keeps it as previous.
  const first = entry();
  const missed = ruling(first, entry({ id: '2026-11-07-1100-tlc-bbbbbb', outcomes: { O1: 'violated' }, result: 'miscalled', miscalls: ['O1: expected holds, got violated'] }), { moved: ['passage O1'] });
  assert.ok(missed.action === 'write' && missed.entry.previous?.established.trial === first.established.trial);
  const miscall = missed.entry;
  // The same miscall again once the basis moved, the recorded one classified: the entry is written, and
  // its previous answer is still the last one that differed, with no classification of the miscall's.
  const again = ruling(miscall, entry({ id: '2026-11-07-1200-tlc-cccccc', outcomes: { O1: 'violated' }, result: 'miscalled', miscalls: ['O1: expected holds, got violated'] }), { moved: ['executed model/Timelock.tla'], classification: 'model misread prose, action' });
  assert.ok(again.action === 'write', 'written, not kept: the basis moved');
  assert.deepEqual(again.entry.previous, miscall.previous, 'the equal answer leaves previous as it was');
  assert.deepEqual(again.entry.replaced, { trial: '2026-11-07-1100-tlc-bbbbbb', moved: ['executed model/Timelock.tla'] });
  assert.equal(again.entry.answer.result, 'miscalled', 'a new miscall, which needs a classification of its own');
  assert.ok(!entryText(again.entry).includes('model misread prose'), 'the replaced miscall\'s classification is nowhere in the entry');
});

test('ANSWER-ABORTED: an aborted trial\'s answer is written only for a question with no entry, and never becomes previous', () => {
  const aborted = entry({ result: 'aborted', outcomes: {}, reason: 'timed out after 600 seconds' });
  assert.equal(ruling(null, aborted).action, 'write');
  assert.equal(ruling(entry(), aborted).action, 'keep');
  const replaced = ruling(aborted, entry({ id: '2026-11-07-1100-tlc-bbbbbb' }));
  assert.ok(replaced.action === 'write' && replaced.entry.previous === null);
});

test('basisMoved compares what lapse compares: the passages the answer touched and its question names, their Givens, records, backing and executed files, not prose.md or unrelated passages', () => {
  const current = entry();
  const reworded = (id: string) => ({ snapshot: { ...result().snapshot, passages: { ...result().snapshot.passages, [id]: 'changed' } } });
  assert.deepEqual(basisMoved(current, now(reworded('S1')), prose), [], 'an unrelated passage moves nothing');
  assert.deepEqual(basisMoved(current, now({ executed: { ...result().executed, 'prose.md': '8'.repeat(64) } }), prose), [], 'prose.md is compared passage by passage, not as a file');
  assert.deepEqual(basisMoved(current, now(reworded('O1')), prose), ['passage O1']);
  assert.deepEqual(basisMoved(current, now(reworded('G2')), prose), ['passage G2'], 'a cited Given moves it');
  assert.deepEqual(basisMoved(current, now({ executed: { ...result().executed, 'model/Timelock.tla': '7'.repeat(64) } }), prose), ['executed model/Timelock.tla']);
  // A passage the answer touched, through an action that fired, moves it too, as it lapses the answer's
  // cover there: the answer's covers, read with the present prose, say which passages those are.
  const acting = entry({ actions: { M1_Schedule: { move: 'M1', event: 'schedule', targets: ['Waiting'], stays: false, distinct: 1, generated: 1 } } });
  assert.deepEqual(basisMoved(acting, now(reworded('S1')), prose), ['passage S1']);
});

test('ANSWER-GONE: a question is gone with a passage, scenario, walk or authored file it names; generated views are not its to lose', () => {
  const present = { passages: { O1: 'o1', N1: 'n1', W1: 'w1' }, scenarios: new Set(['all-honest']), walks: new Set(['W1']), fileExists: (p: string) => p !== 'model/Gone.tla' };
  assert.equal(questionGone(questionOf(result()), present), null);
  assert.match(questionGone(questionOf(result({ expect: { O2: { expect: 'holds' } } })), present) || '', /O2 is gone/);
  assert.match(questionGone(questionOf(result({ property: 'N1', scenario: 'executor-offline' })), present) || '', /scenario executor-offline is gone/);
  assert.match(questionGone(questionOf(result({ executed: { 'model/Gone.tla': '1'.repeat(64) } })), present) || '', /model\/Gone\.tla is gone/);
  assert.equal(questionGone(questionOf(result({ executed: { 'model/generated/Control.tla': '1'.repeat(64), 'chart/machine.json': '1'.repeat(64) } })), { ...present, fileExists: () => false }), null);
});

test('verify reads evidence/: unbound, edited and removed entries, a bound candidate not yet in place, a forgotten removal, and stray files', t => {
  const dir = mkdtempSync(join(tmpdir(), 'dossier-answers-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  mkdirSync(join(dir, 'evidence'));
  const one = entry(), name = entryName(one.question), text = entryText(one), digest = sha256(text);
  writeFileSync(join(dir, 'evidence', `${name}.json`), text);
  writeFileSync(join(dir, 'evidence', `${name}.md`), 'reading\n');
  const read = (bindings: Record<string, string>, forgotten = {}) => readEvidence(dir, bindings, forgotten, 'components/timelock');
  let r = read({ [name]: digest });
  assert.deepEqual(r.answers.map(a => [a.name, a.entry?.established.trial, a.reading, a.problems]), [[name, one.established.trial, 'reading\n', []]], 'one answer per entry: its name, the entry, the reading beside it and no problem');
  assert.ok(completed(r.answers[0]));
  assert.deepEqual(read({}).answers[0].problems, [{ name: 'answer unbound', where: `evidence/${name}.json: answer unbound: integrity.json does not bind it` }], 'each problem a tripwire, named, with where it was found');
  assert.deepEqual(read({ [name]: 'f'.repeat(64) }).answers[0].problems.map(p => p.name), ['answer edited']);
  assert.ok(!completed(read({ [name]: 'f'.repeat(64) }).answers[0]), 'an answer with a problem is void: it counts for nothing');
  mkdirSync(join(dir, '.running', 'run'), { recursive: true });
  writeFileSync(join(dir, '.running', 'run', 'entry.json'), 'candidate\n');
  assert.deepEqual(read({ [name]: sha256('candidate\n') }).answers[0].problems.map(p => p.name), ['answer publication incomplete']);
  // An entry that does not read is an answer still, with no entry and its problems.
  writeFileSync(join(dir, 'evidence', 'tlc-O9-000000.json'), '{ not json\n');
  const unread = read({ [name]: digest, 'tlc-O9-000000': sha256('{ not json\n') }).answers.find(a => a.name === 'tlc-O9-000000')!;
  assert.deepEqual([unread.entry, unread.problems.map(p => p.name)], [null, ['answer malformed']]);
  assert.equal(read({ [name]: digest }).answers[0].name, 'tlc-O9-000000', 'and comes first, having no time it was established');
  unlinkSync(join(dir, 'evidence', 'tlc-O9-000000.json'));
  unlinkSync(join(dir, 'evidence', `${name}.json`));
  r = read({ [name]: digest });
  assert.deepEqual(r.removed, [name]);
  assert.deepEqual(r.stray, [`${name}.md`], 'a reading with no entry is a stray file');
  assert.deepEqual(r.notes, [
    { name: 'answer publication incomplete', where: '.running/run/entry.json: a candidate integrity.json does not bind; finish it with dossier recover components/timelock trial run' },
    { name: 'stray files', where: `evidence/: ${name}.md` },
    { name: 'answer removed', where: `evidence/${name}.json; restore it, or the owner forgets ${name}@${digest.slice(0, 8)}` },
  ], 'what is wrong outside any one entry: an unbound candidate, the stray files, the removed entries');
  assert.deepEqual(read({ [name]: digest }, { [name]: { digest: digest.slice(0, 8), time: 't', words: 'w' } }).removed, [], 'a forget naming the bound digest lets the removal go');
  assert.deepEqual(read({ [name]: digest }, { [name]: { digest: '00000000', time: 't', words: 'w' } }).removed, [name], 'a forget of another digest does not');
  assert.match(read({ [name]: sha256('candidate\n') }).notes.map(p => p.name).join(), /answer publication incomplete/);
});

// STORE-FORMAT: a symbolic link or a special file in evidence/ is refused. Verify takes no entry through
// one: it is a stray file, and the answer it would hold counts for nothing. An entry that names another
// dossier than the one it lies in is answer malformed. Each case is planted in a dossier of its own.
test('verify takes no entry through a symbolic link or from a special file in evidence/, and an entry naming another dossier is malformed', t => {
  const one = entry(), name = entryName(one.question), text = entryText(one), digest = sha256(text);
  const folder = () => { const dir = mkdtempSync(join(tmpdir(), 'dossier-answers-')); t.after(() => rmSync(dir, { recursive: true, force: true })); mkdirSync(join(dir, 'evidence')); return dir; };
  const read = (dir: string, bindings: Record<string, string>) => readEvidence(dir, bindings, {}, 'components/timelock');
  const outside = folder();
  // A link in place of the entry, to the very bytes integrity.json binds.
  const linked = folder();
  writeFileSync(join(outside, 'entry.json'), text);
  symlinkSync(join(outside, 'entry.json'), join(linked, 'evidence', `${name}.json`));
  let r = read(linked, { [name]: digest });
  assert.deepEqual([r.answers, r.stray, evidenceNotes(r)], [[], [`${name}.json`], [{ name: 'stray files', where: `evidence/: ${name}.json` }]], 'read through the link it would be a bound entry; it is a stray file, and no answer');
  // A link in place of the entry's reading.
  const reading = folder();
  writeFileSync(join(reading, 'evidence', `${name}.json`), text);
  writeFileSync(join(outside, 'reading.md'), 'classification: call was wrong\n');
  symlinkSync(join(outside, 'reading.md'), join(reading, 'evidence', `${name}.md`));
  r = read(reading, { [name]: digest });
  assert.deepEqual([r.stray, evidenceNotes(r)], [[`${name}.md`], [{ name: 'stray files', where: `evidence/: ${name}.md` }]]);
  assert.equal(r.answers[0].reading, null, 'and verify reads no reading through it, so its classification counts for nothing');
  // A FIFO in place of a reading: verify does not open it, so it neither reads a writer's bytes nor waits.
  if (process.platform !== 'win32') {
    const piped = folder(), fifo = join(piped, 'evidence', `${name}.md`);
    writeFileSync(join(piped, 'evidence', `${name}.json`), text);
    assert.equal(spawnSync('mkfifo', [fifo]).status, 0, 'mkfifo makes the FIFO');
    const writer = spawn('sh', ['-c', `printf 'classification: call was wrong' > '${fifo}'`], { stdio: 'ignore' });
    t.after(() => { writer.kill('SIGKILL'); });
    r = read(piped, { [name]: digest });
    assert.deepEqual([r.answers[0].reading, r.stray], [null, [`${name}.md`]]);
  }
  // A FIFO named as an entry. A writer waits on it, so that a verify which opened it would read the
  // writer's bytes instead of waiting for ever.
  if (process.platform !== 'win32') {
    const special = folder(), fifo = join(special, 'evidence', 'tlc-O9-000000.json');
    writeFileSync(join(special, 'evidence', `${name}.json`), text);
    assert.equal(spawnSync('mkfifo', [fifo]).status, 0, 'mkfifo makes the FIFO');
    const writer = spawn('sh', ['-c', `printf 'not an entry' > '${fifo}'`], { stdio: 'ignore' });
    t.after(() => { writer.kill('SIGKILL'); });
    r = read(special, { [name]: digest });
    assert.deepEqual([r.answers.map(a => [a.name, a.problems]), r.stray, evidenceNotes(r)], [[[name, []]], ['tlc-O9-000000.json'], [{ name: 'stray files', where: 'evidence/: tlc-O9-000000.json' }]]);
  }
  // An entry that names another dossier, bound as it stands.
  const other = folder(), moved = entryText({ ...one, dossier: 'components/vault' });
  writeFileSync(join(other, 'evidence', `${name}.json`), moved);
  r = read(other, { [name]: sha256(moved) });
  assert.deepEqual([r.answers.map(a => [a.name, a.entry]), evidenceNotes(r)], [[[name, null]], [{ name: 'answer malformed', where: `evidence/${name}.json: answer malformed: entry names components/vault, not components/timelock` }]]);
});

test('a replacement records the answer it replaced and what had moved under it; a first answer records none', () => {
  const current = entry();
  assert.equal(entry().replaced, null);
  const moved = ruling(current, entry({ id: '2026-11-07-1100-tlc-bbbbbb' }), { moved: ['passage O1'] });
  assert.ok(moved.action === 'write' && moved.entry.replaced?.trial === current.established.trial && moved.entry.replaced.moved.join() === 'passage O1');
  const reach = ruling(current, entry({ id: '2026-11-07-1200-tlc-cccccc', reach: { text: 'two plans', values: { delay: 3 } } }));
  assert.ok(reach.action === 'write' && reach.entry.replaced?.trial === current.established.trial && reach.entry.replaced.moved.length === 0, 'a new reach on an unchanged basis moved nothing');
});

test('a name carries the passages an expectation names, the model\'s names and bare passage ids alike', () => {
  assert.match(entryName(questionOf(result({ kind: 'external', checker: 'external', expect: { W1: { expect: 'pass' }, W2: { expect: 'pass' } }, executed: { 'model/replay.json': '1'.repeat(64) } }))), /^external-W1-W2-[0-9a-f]{6}$/);
  assert.match(entryName(questionOf(result({ expect: { NotW3: { expect: 'violated' }, TypeOK: { expect: 'holds' } } }))), /^tlc-W3-[0-9a-f]{6}$/);
  assert.match(entryName(questionOf(result({ kind: 'chart', checker: 'chart', expect: { checks: { expect: 'pass' } }, executed: { 'prose.md': '1'.repeat(64) } }))), /^chart-[0-9a-f]{6}$/);
});

test('a chart blunder is authored: its question is gone with its file, while the chart\'s own views are not', () => {
  const present = { passages: { A1: 'a1' }, scenarios: null, walks: null, fileExists: () => false };
  assert.match(questionGone(questionOf(result({ kind: 'blunder', checker: 'chart', expect: { A1: { expect: 'violated' } }, executed: { 'chart/blunders/A1.json': '1'.repeat(64) } })), present) || '', /chart\/blunders\/A1\.json is gone/);
  assert.equal(questionGone(questionOf(result({ kind: 'chart', checker: 'chart', expect: { checks: { expect: 'pass' } }, executed: { 'chart/machine.json': '1'.repeat(64) } })), present), null);
});

test('an entry holds the whole basis lapse compares, its previous answer\'s too: an entry without it is malformed, never read as having nothing', () => {
  const one = entry(), name = entryName(one.question);
  const problem = (edit: (e: Entry) => void, e0 = one, n = name, ref = 'components/timelock') => { const e = structuredClone(e0); edit(e); return entryProblem(e, n, ref); };
  assert.equal(problem(() => {}), null);
  assert.equal(problem(e => { delete (e.basis as Partial<Entry['basis']>).inputIdentity; }), 'input identity malformed: invalid private-copy identity', 'the inputs the trial captured');
  assert.equal(problem(e => { delete (e.basis.snapshot as Partial<Snapshot>).records; }), 'malformed basis', 'the records pinned');
  assert.equal(problem(e => { delete (e.basis.snapshot as Partial<Snapshot>).backing; }), 'malformed basis', 'the guarantees\' backing');
  const replaced = (basis: Entry['basis']): Entry['previous'] => ({ answer: one.answer, basis, established: one.established, classification: null });
  assert.equal(problem(e => { e.previous = replaced(one.basis); }), null);
  assert.equal(problem(e => { e.previous = replaced({ ...one.basis, inputIdentity: undefined as never }); }), 'input identity malformed: invalid private-copy identity', 'and the previous answer\'s basis, which an acceptance may be compared with');
  // A system's snapshot also holds what its cells rest on: an older one without the module's identity
  // (qualification/conformance/fixtures/snapshot-without-module.json) is no entry's.
  const snapshot: Snapshot = { passages: { N1: 'n1' }, records: {}, backing: {}, composition: 'c', module: 'm', scenario: 's', actors: 'a', extras: null, members: { timelock: { prose: 'p', backing: {} } } };
  const cell = entry({ dossier: 'systems/control', property: 'N1', scenario: 'executor-offline', expect: { N1: { expect: 'holds' } }, outcomes: { N1: 'holds' }, snapshot });
  const cellName = entryName(cell.question);
  assert.equal(problem(() => {}, cell, cellName, 'systems/control'), null);
  assert.equal(problem(e => { delete e.basis.snapshot.module; }, cell, cellName, 'systems/control'), 'malformed basis', 'the generated module');
  assert.equal(problem(e => { e.basis.snapshot.members = { timelock: { prose: 'p' } } as unknown as Snapshot['members']; }, cell, cellName, 'systems/control'), 'malformed basis', 'each member\'s backing');
});

test('the rules compare a basis exactly as lapse does: a backing moves by its status or hash, a record by its hash while it is pinned', () => {
  const backed = { status: 'backed' as const, hash: 'h1', path: 'records/k1.md' };
  const snapshot = { ...result().snapshot, records: { 'module#record:r': 'r1' }, backing: { K1: backed } };
  const current = entry({ snapshot });
  const moved = (change: Partial<Snapshot>) => basisMoved(current, now({ snapshot: { ...snapshot, ...change } }), prose);
  assert.deepEqual(moved({}), []);
  assert.deepEqual(moved({ backing: { K1: { ...backed, path: 'records/elsewhere.md' } } }), [], 'the same backing found at another path');
  assert.deepEqual(moved({ backing: { K1: { ...backed, hash: 'h2' } } }), ['backing K1']);
  assert.deepEqual(moved({ backing: { K1: { status: 'unresolved', reason: 'the record is gone' } } }), ['backing K1']);
  assert.deepEqual(moved({ records: { 'module#record:r': 'r2' } }), ['record module#record:r']);
  assert.deepEqual(moved({ records: {} }), [], 'a record the component no longer pins, as lapse reads it');
  // A chart answer rests on no record or backing, only on the prose it compiles.
  const chart = entry({ kind: 'chart', checker: 'chart', expect: { checks: { expect: 'pass' } }, outcomes: { checks: 'pass' }, snapshot: { ...snapshot, ir: 'compiled' } });
  assert.deepEqual(basisMoved(chart, basisNow({ ...chart.basis, snapshot: { ...chart.basis.snapshot, records: { 'module#record:r': 'r2' } } }), prose), []);
  assert.deepEqual(basisMoved(chart, basisNow({ ...chart.basis, snapshot: { ...chart.basis.snapshot, ir: 'recompiled' } }), prose), ['prose']);
});
