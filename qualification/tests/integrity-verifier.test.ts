import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { verifyAll } from '../../src/commands/verify.ts';
import type { Verified } from '../../src/commands/verify.ts';
import { readIntegrity } from '../../src/dossiers/integrity.ts';
import { formatDecision, isRetired } from '../../src/dossiers/decisions.ts';
import { publishDecisionLocked, recoverDecisions, withPublicationLock } from '../../src/dossiers/publication.ts';
import type { Entry } from '../../src/trials/answers.ts';
import { sha256 } from '../../src/hash.ts';
import { fingerprint } from '../conformance/files.ts';
import { answerOf } from '../conformance/evidence.ts';

const plugin = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
function fixture(t: TestContext) {
  const work = mkdtempSync(join(tmpdir(), 'dossier-integrity-verify-'));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  cpSync(join(plugin, 'qualification/fixture'), work, { recursive: true, preserveTimestamps: true });
  const root = join(work, 'dossiers');
  const verify = (write = false) => verifyAll({ root, version: '0.2.0', ...(write ? { write } : {}) });
  return { work, root, verify };
}

// Compare protected conclusions; display rows and timestamps are intentionally
// absent. These expectations do not use expected-marks.json.
function conclusions(result: Verified, compareReviewFreshness = true) {
  const flags = (a: Verified['parts'][number] | Verified['compositions'][number]) => a.flags.filter(f => compareReviewFreshness || f.name !== 'review stale');
  return {
    root: { route: result.route, tripwires: result.tripwires },
    parts: result.parts.map(a => ({ ref: a.ref, tier: a.tier, marks: a.marks, owner: a.owner, backing: a.backing, doubts: a.doubts, route: a.route, summary: a.summary, tripwires: a.tripwires, flags: flags(a) })),
    compositions: result.compositions.map(a => ({ ref: a.ref, cells: a.cells, walks: a.walks, owner: a.owner, propertyHeld: a.propertyHeld, route: a.route, summary: a.summary, tripwires: a.tripwires, flags: flags(a) })),
  };
}
// The records a view may not touch: answers, readings, reviews, manifests and decisions.
const records = (tree: Record<string, string>) => Object.fromEntries(Object.entries(tree).filter(([name]) => name.includes('/evidence/') || name.includes('/reviews/') || name.endsWith('/integrity.json') || name.endsWith('/decisions.log')));
// A dossier's entries by name; an entry removed with its reading, as a hand outside the tools would
// remove it; and both restored from the shipped fixture, as version control would restore them.
const entries = (dir: string) => readdirSync(join(dir, 'evidence')).filter(name => name.endsWith('.json')).map(name => name.slice(0, -5)).sort();
const remove = (dir: string, name: string) => { for (const file of [`${name}.json`, `${name}.md`]) rmSync(join(dir, 'evidence', file)); };
const restore = (dir: string, ref: string, name: string) => { for (const file of [`${name}.json`, `${name}.md`]) cpSync(join(plugin, 'qualification/fixture/dossiers', ref, 'evidence', file), join(dir, 'evidence', file), { preserveTimestamps: true }); };
const reviewInventory = (result: Verified) => [...result.parts, ...result.compositions].map(a => [a.ref, a.reviews.map(r => r.file)]);
const control = (result: Verified) => result.compositions.find(a => a.id === 'control')!;
const timelock = (result: Verified) => result.parts.find(a => a.id === 'timelock')!;
const appendCandidate = (dir: string, decision: Parameters<typeof formatDecision>[0]) => {
  const path = join(dir, 'decisions.log'), text = readFileSync(path, 'utf8');
  const suffix = formatDecision(decision, text.trimEnd().split('\n').at(-1)) + '\n';
  writeFileSync(path, text + suffix);
  return suffix;
};

test('Harbor keeps a proof, bounded checks and an accepted violation distinct, and verify reads it without writing', t => {
  const w = fixture(t);
  const before = fingerprint(w.work);
  const c = control(w.verify());
  assert.deepEqual(c.tripwires, []);
  assert.equal(c.cells.filter(cell => cell.mark === 'proved').length, 1);
  assert.equal(c.cells.filter(cell => cell.mark === 'checked').length, 7);
  const accepted = c.cells.find(cell => cell.property === 'N1' && cell.scenario === 'executor-offline')!;
  assert.equal(accepted.mark, 'violated', 'accepting the risk leaves the property violated'); assert.ok(accepted.accepted);
  assert.deepEqual(fingerprint(w.work), before);
});

test('current views preserve formal conclusions and history; deleting a review-pinned view stales that review', t => {
  const w = fixture(t);
  const original = w.verify(), baseline = conclusions(original);
  const formal = conclusions(original, false);
  const pinned = [...original.parts, ...original.compositions].flatMap(a => a.reviews.filter(r => r.record?.basis.some(b => b.root === 'dossiers' && /\/(model\/generated\/|chart\/(machine\.json|grid\.md)$)/.test(b.path))).map(r => `${a.ref}/${r.file}`));
  assert.ok(pinned.length > 0, 'the fixture includes reviews that explicitly inspected generated views');
  const before = records(fingerprint(w.work));
  writeFileSync(join(w.root, 'index.md'), 'An arbitrary, non-authoritative report.\n');
  for (const a of [...w.verify().parts, ...w.verify().compositions]) writeFileSync(join(a.dir, 'ledger.md'), 'A disposable view with no machine-form history.\n');
  assert.deepEqual(conclusions(w.verify()), baseline);
  rmSync(join(w.root, 'index.md'));
  for (const a of w.verify().parts) {
    rmSync(join(a.dir, 'ledger.md'));
    for (const name of ['machine.json', 'grid.md']) rmSync(join(a.dir, 'chart', name), { force: true });
  }
  for (const a of w.verify().compositions) { rmSync(join(a.dir, 'ledger.md')); rmSync(join(a.dir, 'model/generated'), { recursive: true, force: true }); }
  const deleted = fingerprint(w.work);
  const after = w.verify();
  assert.deepEqual(conclusions(after, false), formal);
  assert.deepEqual(reviewInventory(after), reviewInventory(original), 'every original review remains reported');
  for (const a of [...after.parts, ...after.compositions]) for (const review of a.reviews) {
    const bound = pinned.includes(`${a.ref}/${review.file}`);
    assert.equal(review.status, bound ? 'stale' : 'current', `${a.ref}/${review.file}`);
    if (bound) assert.ok(review.reasons.some(reason => /cannot read dossiers:.*\/(model\/generated\/|chart\/(machine\.json|grid\.md))/.test(reason)), review.reasons.join('; '));
  }
  assert.deepEqual(fingerprint(w.work), deleted, 'default verification is read-only');
  w.verify(true);
  assert.ok(existsSync(join(w.root, 'index.md')));
  for (const a of w.verify().compositions) assert.equal(existsSync(join(a.dir, 'model/generated')), false, 'render is not execution preparation');
  assert.deepEqual(conclusions(w.verify()), conclusions(after), 'render does not refresh reviews or recreate execution preparation');
  assert.deepEqual(records(fingerprint(w.work)), before);
});

test('read-only default preserves bytes and mtimes on success and corruption, without ledger fallback', t => {
  const w = fixture(t);
  const check = () => {
    const before = fingerprint(w.work);
    const result = w.verify();
    const cli = spawnSync(join(plugin, 'bin/dossier'), ['verify', '--brief', '--root', w.root], { encoding: 'utf8', env: { ...process.env, DOSSIER_ROOT: '' } });
    assert.ifError(cli.error);
    assert.ok(cli.status === 0 || cli.status === 1, cli.stdout + cli.stderr);
    assert.deepEqual(fingerprint(w.work), before);
    return result;
  };
  assert.deepEqual(check().tripwires, []);
  const dir = join(w.root, 'parts/timelock');
  rmSync(join(dir, 'integrity.json'));
  for (let repeat = 0; repeat < 2; repeat++) {
    const a = timelock(check());
    assert.ok(a.tripwires.some(problem => problem.name === 'integrity missing'));
    assert.equal(a.completed.length, 0, 'old ledger rows cannot publish evidence');
    assert.equal(a.decisions.length, 0, 'raw decision log cannot grant owner authority');
    assert.ok(Object.values(a.marks).every(mark => mark.trials.length === 0 && mark.mark !== 'proved'), 'no execution-based marks survive; matched seams may still be checked from authored inputs');
  }
  writeFileSync(join(dir, 'integrity.json'), '{"schema":999}\n');
  assert.ok(timelock(check()).tripwires.some(problem => problem.name === 'integrity malformed'));
});

test('scenario notes preserve formal evidence and acceptance, stale the compositions\' byte-bound reviews and no part\'s; relevant edits lapse the evidence', t => {
  const w = fixture(t);
  const original = w.verify(), baseline = conclusions(original, false);
  assert.ok([...original.parts, ...original.compositions].every(a => a.reviews.length > 0 && a.reviews.every(r => r.status === 'current')));
  const scenarios = join(w.root, 'actors/scenarios.md');
  writeFileSync(scenarios, readFileSync(scenarios, 'utf8') + '\nReader note: this does not change any scenario.\n');
  const notes = w.verify();
  assert.deepEqual(conclusions(notes, false), baseline);
  assert.deepEqual(reviewInventory(notes), reviewInventory(original), 'every original review remains reported');
  // Scenarios belong to compositions: a part's review does not bind scenarios.md.
  for (const a of notes.compositions) for (const review of a.reviews) {
    assert.equal(review.status, 'stale');
    assert.ok(review.reasons.some(reason => reason.includes('changed dossiers:actors/scenarios.md')));
  }
  for (const a of notes.parts) for (const review of a.reviews) assert.equal(review.status, 'current', `${a.ref} ${review.file}`);
  const path = join(w.root, 'compositions/control/prose.md');
  writeFileSync(path, readFileSync(path, 'utf8').replace('[N1] Within 3 ticks', '[N1] Within 2 ticks'));
  const c = control(w.verify());
  assert.ok(c.cells.every(cell => cell.mark === 'lapsed'));
  assert.ok(c.cells.every(cell => !cell.accepted));
  const before = fingerprint(w.work);
  assert.deepEqual(control(w.verify()).cells, c.cells);
  assert.deepEqual(fingerprint(w.work), before);
});

test('a removed entry and truncated decisions remain failures across view deletion and repeated rendering, until the owner forgets the answer', t => {
  const w = fixture(t);
  const pauseDir = join(w.root, 'parts/timelock'), controlDir = join(w.root, 'compositions/control');
  const missing = entries(pauseDir)[0], digest = readIntegrity(pauseDir).manifest!.evidence[missing];
  const trial = (JSON.parse(readFileSync(join(pauseDir, 'evidence', `${missing}.json`), 'utf8')) as Entry).established.trial;
  remove(pauseDir, missing);
  writeFileSync(join(controlDir, 'decisions.log'), '');
  for (let repeat = 0; repeat < 3; repeat++) {
    for (const dir of [pauseDir, controlDir]) rmSync(join(dir, 'ledger.md'), { force: true });
    rmSync(join(w.root, 'index.md'), { force: true });
    const r = w.verify();
    assert.ok(timelock(r).tripwires.some(problem => problem.name === 'answer removed' && problem.where.includes(`evidence/${missing}.json`)));
    assert.ok(!timelock(r).completed.some(a => a.entry.established.trial === trial), 'a removed answer covers nothing');
    const c = control(r);
    assert.ok(c.tripwires.some(problem => problem.name === 'decisions chain broken'));
    assert.equal(c.decisions.length, 0);
    assert.equal(c.cells.find(cell => cell.property === 'N1' && cell.scenario === 'executor-offline')?.accepted, null);
    w.verify(true);
  }
  withPublicationLock(pauseDir, () => publishDecisionLocked(pauseDir, { time: '2026-11-05T13:00:00Z', verb: 'forget', args: [`${missing}@${digest.slice(0, 8)}`], words: 'This synthetic removed answer is deliberately forgotten for this test.' }));
  const forgotten = timelock(w.verify());
  assert.ok(!forgotten.tripwires.some(problem => problem.name === 'answer removed'), 'the owner\'s forget of the bound digest answers the tripwire');
  assert.ok(!forgotten.completed.some(a => a.entry.established.trial === trial), 'a forgotten answer covers nothing');
  assert.equal(readIntegrity(pauseDir).manifest!.evidence[missing], digest, 'the forgotten answer keeps its manifest line until a new answer to its question replaces it');
});

test('orphan retirement grants nothing; committed retirement still audits evidence and missing authored files', t => {
  const w = fixture(t);
  const dir = join(w.root, 'compositions/control');
  const suffix = appendCandidate(dir, { time: '2026-11-05T13:00:00Z', verb: 'retire', words: 'Retire this synthetic composition.' });
  assert.equal(isRetired(dir), false);
  assert.ok(control(w.verify()).tripwires.some(problem => problem.name === 'decision publication incomplete'));
  w.verify(true);
  assert.equal(isRetired(dir), false);
  recoverDecisions(dir, sha256(suffix));
  assert.equal(isRetired(dir), true);
  assert.ok(!w.verify().compositions.some(a => a.id === 'control'));
  const missing = entries(dir)[0];
  remove(dir, missing);
  const r = w.verify();
  assert.ok(r.tripwires.some(problem => problem.name === 'answer removed' && problem.where.includes(`compositions/control/evidence/${missing}.json`)));
  rmSync(join(dir, 'wiring.md'));
  assert.ok(w.verify().tripwires.some(problem => problem.name === 'authored input missing' && problem.where === 'compositions/control/wiring.md'));
  assert.ok(w.verify().tripwires.some(problem => problem.name === 'answer removed' && problem.where.includes(`compositions/control/evidence/${missing}.json`)));
});

test('a removed entry stays removed until it is restored, and a root in another storage format grants no authority', t => {
  const w = fixture(t), dir = join(w.root, 'parts/timelock');
  const missing = entries(dir)[0];
  remove(dir, missing);
  assert.ok(timelock(w.verify()).tripwires.some(problem => problem.name === 'answer removed'));
  assert.ok(timelock(w.verify()).tripwires.some(problem => problem.name === 'answer removed'), 'and on the next verify');
  restore(dir, 'parts/timelock', missing);
  assert.deepEqual(timelock(w.verify()).tripwires, [], 'the entry restored, its binding matches again');
  const markerPath = join(w.root, 'dossier.json'), marker = JSON.parse(readFileSync(markerPath, 'utf8'));
  for (const storage of ['integrity-future', undefined]) {
    writeFileSync(markerPath, JSON.stringify({ ...marker, storage }));
    const invalid = w.verify();
    assert.ok(invalid.tripwires.some(problem => ['integrity unavailable', 'malformed marker'].includes(problem.name)), String(storage));
    assert.ok([...invalid.parts, ...invalid.compositions].every(a => a.completed.length === 0 && a.decisions.length === 0), 'no evidence or decision is read from a root in another format');
  }
});

// STORE-BUNDLE: a trial's bundle stays on the machine that ran it and is no record. Verify reads entries,
// never trials/, and reads .running/ only for a candidate the manifest binds.
test('a local bundle is no record: verify reads none, so running, forging, leaving or deleting one changes no conclusion', t => {
  const w = fixture(t), dir = join(w.root, 'parts/adapter');
  const baseline = conclusions(w.verify());
  const recorded = records(fingerprint(w.work));
  // The chart question asked again: the same answer on the same basis, which leaves a real bundle and writes no record.
  const chart = entries(dir).map(name => JSON.parse(readFileSync(join(dir, 'evidence', `${name}.json`), 'utf8')) as Entry).find(entry => entry.question.checker === 'chart')!;
  mkdirSync(join(dir, 'calls'), { recursive: true });
  writeFileSync(join(dir, 'calls', 'again.md'), chart.call.text);
  const again = spawnSync(process.execPath, [join(plugin, 'src/cli.ts'), 'trial', '--root', w.root, 'adapter', 'again.md'], { encoding: 'utf8', env: { ...process.env, DOSSIER_ROOT: '' } });
  assert.equal(again.status, 0, again.stdout + again.stderr);
  assert.match(again.stdout, /^answer: evidence\/\S+\.json · kept: /m);
  const id = again.stdout.match(/^trial: (\S+)/m)![1], bundle = join(dir, 'trials', id);
  assert.deepEqual(records(fingerprint(w.work)), recorded);
  assert.deepEqual(conclusions(w.verify()), baseline);
  // The bundle edited to say the opposite, a forged bundle with a stray file beside it, and a trial's
  // bundle that waits in .running/ with no candidate.
  const result = JSON.parse(readFileSync(join(bundle, 'result.json'), 'utf8'));
  writeFileSync(join(bundle, 'result.json'), JSON.stringify({ ...result, result: 'miscalled', outcomes: { checks: 'fail' } }));
  writeFileSync(join(bundle, 'output.txt'), 'edited after the trial\n');
  cpSync(bundle, join(dir, 'trials', '2026-11-07-0000-tlc-abcdef'), { recursive: true });
  writeFileSync(join(dir, 'trials', '2026-11-07-0000-tlc-abcdef', 'notes.txt'), 'not a bundle file\n');
  cpSync(bundle, join(dir, '.running', '2026-11-07-0001-chart-abcdef'), { recursive: true });
  assert.deepEqual(conclusions(w.verify()), baseline, 'verify reads no local bundle');
  rmSync(join(dir, 'trials'), { recursive: true });
  rmSync(join(dir, '.running'), { recursive: true });
  assert.deepEqual(conclusions(w.verify()), baseline, 'deleting the bundles changes no conclusion');
  assert.deepEqual(records(fingerprint(w.work)), recorded);
});

test('the tier comes only from prose: a begin decision is lifecycle history, not a second owner', t => {
  const w = fixture(t), dir = join(w.root, 'parts/timelock'), path = join(dir, 'prose.md');
  const text = readFileSync(path, 'utf8');
  withPublicationLock(dir, () => publishDecisionLocked(dir, { time: '2026-11-05T13:00:00Z', verb: 'begin', args: ['charted'], words: 'Synthetic lifecycle history.' }));
  assert.equal(timelock(w.verify()).tier, 'modeled', 'Tier: modeled in prose stands');
  writeFileSync(path, text.replace(/^Tier:.*\n/m, ''));
  assert.equal(timelock(w.verify()).tier, 'modeled', 'the language default belongs to the authored input');
});

test('only version-bound committed answers close doubts; a written status is refused and changed alternatives reopen', t => {
  const w = fixture(t);
  const dir = join(w.root, 'parts/timelock'), path = join(dir, 'doubts.md');
  const authored = '# Doubts\n\n## D1\non: A1\nassumed: a\nWalk a: schedule then wait before executing.\nWalk b: schedule then execute early.\n';
  writeFileSync(path, authored);
  withPublicationLock(dir, () => publishDecisionLocked(dir, { time: '2026-11-05T12:00:00Z', verb: 'answer', args: ['D1', 'a'], words: 'An answer without a version binding.' }));
  const open = timelock(w.verify());
  assert.equal(open.doubts[0].status, 'open');
  assert.equal(open.doubts[0].answered, null);
  assert.deepEqual(open.openDoubtOn.A1, ['D1']);
  assert.ok(open.flags.some(problem => problem.name === 'doubt answer unbound'));
  const hash = open.doubts[0].hash;
  const words = 'Choose b for this synthetic decision-boundary test.';
  withPublicationLock(dir, () => publishDecisionLocked(dir, { time: '2026-11-05T13:00:00Z', verb: 'answer', args: [`D1@${hash}`, 'b'], words }));
  const closed = timelock(w.verify());
  assert.equal(closed.doubts[0].status, 'closed'); assert.equal(closed.doubts[0].answered, 'b');
  assert.equal(closed.openDoubtOn.A1, undefined);
  assert.ok(!closed.route.why.some(why => why.includes('answered doubts to close')));
  assert.ok(closed.decisions.some(decision => !decision.malformed && decision.args[0] === `D1@${hash}` && decision.words === words));
  assert.equal(readFileSync(path, 'utf8'), authored, 'no copied answer or status edit is required');
  writeFileSync(path, authored.replace('assumed: a\n', 'assumed: a\nstatus: closed\n'));
  const written = timelock(w.verify());
  assert.ok(written.tripwires.some(problem => problem.name === 'malformed doubt' && problem.where.includes('status: is not written by hand')), 'a status: line is a second owner of the answer, and is refused');
  writeFileSync(path, authored);
  appendCandidate(dir, { time: '2026-11-05T13:01:00Z', verb: 'answer', args: [`D1@${hash}`, 'a'], words: 'This suffix is not committed.' });
  const pending = timelock(w.verify());
  assert.equal(pending.doubts[0].answered, 'b');
  assert.ok(pending.tripwires.some(problem => problem.name === 'decision publication incomplete'));
  writeFileSync(path, authored.replace('Walk b: schedule then execute early.', 'Walk b: schedule then cancel the plan.'));
  const changed = timelock(w.verify());
  assert.notEqual(changed.doubts[0].hash, hash);
  assert.equal(changed.doubts[0].answered, null); assert.equal(changed.doubts[0].status, 'open');
  assert.ok(changed.flags.some(problem => problem.name === 'doubt answer stale'));
  writeFileSync(path, authored + authored.slice(authored.indexOf('## D1')));
  const duplicate = timelock(w.verify());
  assert.ok(duplicate.tripwires.some(problem => problem.name === 'malformed doubt' && problem.where.includes('more than once')));
  assert.ok(duplicate.doubts.every(doubt => doubt.answered === null && doubt.status === 'open'), 'an ambiguous identity cannot reuse a bound answer');
});

test('an unbound entry grants no evidence, and removing an active dossier input cannot hide its integrity failures', t => {
  const w = fixture(t);
  const dir = join(w.root, 'compositions/control'), recordPath = join(dir, 'integrity.json');
  const before = control(w.verify());
  const proof = before.cells.find(cell => cell.property === 'A1' && cell.scenario === 'all-honest')!;
  assert.equal(proof.mark, 'proved');
  const { name } = answerOf(dir, proof.trial!)!;
  const manifest = JSON.parse(readFileSync(recordPath, 'utf8'));
  delete manifest.evidence[name];
  writeFileSync(recordPath, JSON.stringify(manifest));
  for (let repeat = 0; repeat < 2; repeat++) {
    const c = control(w.verify());
    assert.ok(c.tripwires.some(problem => problem.name === 'answer unbound' && problem.where.includes(`evidence/${name}.json`)));
    assert.ok(!c.completed.some(a => a.entry.established.trial === proof.trial));
    assert.notEqual(c.cells.find(cell => cell.property === 'A1' && cell.scenario === 'all-honest')?.mark, 'proved');
    w.verify(true);
  }
  const part = join(w.root, 'parts/timelock');
  rmSync(join(part, 'prose.md'));
  const missing = entries(part)[0];
  remove(part, missing);
  const result = w.verify();
  assert.ok(result.tripwires.some(problem => problem.name === 'authored input missing' && problem.where === 'parts/timelock/prose.md'));
  assert.ok(result.tripwires.some(problem => problem.name === 'answer removed' && problem.where.includes(`parts/timelock/evidence/${missing}.json`)));
});
