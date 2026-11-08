// Superseded answers (spec/evidence.md, ANSWER-SUPERSEDED and ANSWER-DROP): the ground an answer
// answered for, the conclusions compared without it, the order candidates are tried in, the
// counterexample that waits for the owner's forget, and, on a copy of Harbor, that removing a superseded
// entry changes no conclusion.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyAll } from '../../src/commands/verify.ts';
import { completed, holdsCounterexample } from '../../src/trials/answers.ts';
import { conclusionsOf, groundOf, supersededAmong } from '../../src/verify/superseded.ts';
import type { Ir } from '../../src/prose/ir.ts';
import type { AnswerRead } from '../../src/trials/answers.ts';
import type { PartAnalysis } from '../../src/verify/analyze.ts';

const plugin = fileURLToPath(new URL('../../', import.meta.url));
const fixture = join(plugin, 'qualification/fixture');
// An answer as verify reads it, with only what the rules read: `more` adds to the question its checker,
// cell or walk, to the call its expectations, and to the answer what else it observed.
function stub({ id, at, entry, kind = 'external', completed = true, outcomes = {}, previous = null, result = completed ? 'as-called' : 'aborted', more = {} }: { id: string; at?: string; entry: string; kind?: string; completed?: boolean; outcomes?: Record<string, string>; previous?: { answer: { outcomes: Record<string, string> } } | null; result?: string; more?: Record<string, unknown> }): AnswerRead {
  const { checker = kind, property = null, scenario = null, walk = null, expect = {}, ...observed } = more;
  return {
    name: entry, reading: null, problems: [],
    entry: {
      question: { kind, checker, executes: [], expects: Object.keys(expect as object).sort(), property, scenario, walk },
      call: { text: '', reach: '', expect, because: '' },
      answer: { result, outcomes, enabled: [], ...observed },
      basis: { snapshot: { passages: {}, records: {}, backing: {} }, executed: {}, inputIdentity: { strategy: 'private-copy', files: {}, shared: [], limitation: 'A stub reads no input.' } },
      established: { trial: id, at: at || `2026-11-07T${id.slice(11, 13)}:${id.slice(13, 15)}:00.000Z`, versions: {}, bundle: '' },
      previous,
    },
  } as unknown as AnswerRead;
}
// The IR as covers reads it for a chart or an external answer: nothing of it.
const ir = { transitions: [], refusals: [], states: [], events: [] } as unknown as Ir;
const hashes = { S1: 's1', E1: 'e1', A1: 'a1', K1: 'k1', W1: 'w1' };

test('the ground of an answer: the passages it touched, a blunder\'s targets, a cell, a walk, and a question\'s names for an aborted one', () => {
  const chart = stub({ id: '2026-11-07-1000-chart-aaaaaa', entry: 'chart-aaaaaa', kind: 'chart', more: { checks: [{ ids: ['S1', 'E1'], status: 'passed' }, { ids: ['A1'], status: 'failed' }] } });
  assert.deepEqual(groundOf(chart, 'part', ir, hashes).sort(), ['chart', 'passage:A1', 'passage:E1', 'passage:S1'], 'a chart touches every passage it checked, passed or not, and explores');
  const external = stub({ id: '2026-11-07-1001-external-bbbbbb', entry: 'external-A1-bbbbbb', more: { covers: ['A1', 'K1', 'Z9'] } });
  assert.deepEqual(groundOf(external, 'part', ir, hashes).sort(), ['passage:A1', 'passage:K1'], 'an external answer touches what it covers, among the passages that exist');
  const blunder = stub({ id: '2026-11-07-1002-blunder-cccccc', entry: 'blunder-A1-cccccc', kind: 'blunder', more: { checker: 'chart', checks: [{ ids: ['A1'], status: 'failed' }], failing: ['A1'], expect: { checks: { expect: 'fail', failing: ['A1'] } } } });
  assert.deepEqual(groundOf(blunder, 'part', ir, hashes), ['blunder:A1'], 'a blunder\'s ground is its targets, apart from the passages');
  const aborted = stub({ id: '2026-11-07-1003-external-dddddd', entry: 'external-A1-dddddd', completed: false, more: { expect: { A1: { expect: 'pass' }, check: { expect: 'pass' } } } });
  assert.deepEqual(groundOf(aborted, 'part', ir, hashes), ['passage:A1'], 'an aborted answer answered nothing: its ground is what its question asked about');
  const abortedBlunder = stub({ id: '2026-11-07-1004-blunder-eeeeee', entry: 'blunder-A1-eeeeee', kind: 'blunder', completed: false, more: { expect: { checks: { expect: 'fail', failing: ['A1'] } } } });
  assert.deepEqual(groundOf(abortedBlunder, 'part', ir, hashes), ['blunder:A1']);
  const cell = stub({ id: '2026-11-07-1005-tlc-ffffff', entry: 'tlc-A1-all-honest-ffffff', kind: 'tlc', more: { property: 'A1', scenario: 'all-honest' } });
  assert.deepEqual(groundOf(cell, 'composition', null, hashes), ['cell:A1|all-honest']);
  const walk = stub({ id: '2026-11-07-1006-tlc-111111', entry: 'tlc-W1-111111', kind: 'tlc', more: { walk: 'W1' } });
  assert.deepEqual(groundOf(walk, 'composition', null, hashes), ['walk:W1|all-honest'], 'a walk under no scenario is under all-honest');
  const compositionBlunder = stub({ id: '2026-11-07-1007-blunder-222222', entry: 'blunder-A1-all-honest-222222', kind: 'blunder', more: { property: 'A1', scenario: 'all-honest' } });
  assert.deepEqual(groundOf(compositionBlunder, 'composition', null, hashes), ['blunder:A1'], 'a composition blunder\'s ground is its property, apart from the cells');
  assert.deepEqual(groundOf({ ...cell, entry: null }, 'composition', null, hashes), [], 'an entry that does not read has no ground');
});

// What the dossier concludes from a list of answers, for the rules: on each side, the answer that
// decides each ground key, the strongest and the latest among equals, so that a chart answer never
// stands in for a model answer, and a check never for a proof.
const ground = (a: AnswerRead) => (a as unknown as { ground: string[] }).ground;
const strengthOf = (a: AnswerRead) => (a as unknown as { strength?: number }).strength ?? 1;
const decidesBy = (list: AnswerRead[]) => JSON.stringify(Object.fromEntries(['model', 'chart'].map(side => [side, Object.fromEntries(['a', 'b'].map(key => [key, list.filter(a => completed(a) && ground(a).includes(key) && (a as unknown as { side: string }).side === side).reduce((best, a) => (!best || strengthOf(a) >= strengthOf(best) ? a : best), null as AnswerRead | null)?.name ?? null]))])));
const on = (a: AnswerRead, g: string[], side = 'model', strength = 1) => Object.assign(a, { ground: g, side, strength });
const settings = { gone: {}, ground, conclusions: decidesBy, forgiven: () => false, bound: () => 'f'.repeat(64) };

test('an answer is superseded when the answers that decide cover its ground and the conclusions are the same without it', () => {
  const e1 = on(stub({ id: '2026-11-07-1000-tlc-aaaaaa', entry: 'tlc-A1-aaaaaa', kind: 'tlc' }), ['a']);
  const e2 = on(stub({ id: '2026-11-07-1001-tlc-bbbbbb', entry: 'tlc-A1-bbbbbb', kind: 'tlc' }), ['a', 'b']);
  const s = supersededAmong({ ...settings, answers: [e2, e1] });
  assert.deepEqual(s.removable, ['tlc-A1-aaaaaa'], 'the earlier one, whatever order the list came in');
  assert.deepEqual(s.superseded, { 'tlc-A1-aaaaaa': 'the answers that decide stand in its place; the next publication removes it' });
  assert.deepEqual(supersededAmong({ ...settings, answers: [e1] }).removable, [], 'nothing later: nothing superseded');
  const elsewhere = on(stub({ id: '2026-11-07-1002-tlc-cccccc', entry: 'tlc-B1-cccccc', kind: 'tlc' }), ['b']);
  assert.deepEqual(supersededAmong({ ...settings, answers: [e2, elsewhere] }).removable, [], 'a later answer on other ground supersedes nothing');
  const chart = on(stub({ id: '2026-11-07-1003-chart-dddddd', entry: 'chart-dddddd', kind: 'chart' }), ['a', 'b'], 'chart');
  assert.deepEqual(supersededAmong({ ...settings, answers: [e2, chart] }).removable, [], 'a later answer that covers the ground but changes the conclusions supersedes nothing');
  assert.deepEqual(supersededAmong({ ...settings, answers: [e1, e2], gone: { 'tlc-A1-bbbbbb': 'A1 is gone' } }).removable, [], 'a gone entry stands in for nothing');
  assert.deepEqual(supersededAmong({ ...settings, answers: [e1, e2], gone: { 'tlc-A1-aaaaaa': 'A1 is gone' } }).removable, [], 'and is not superseded: the gone rule removes it');
  const aborted = on(stub({ id: '2026-11-07-0900-tlc-eeeeee', entry: 'tlc-A1-eeeeee', kind: 'tlc', completed: false }), ['a']);
  assert.deepEqual(supersededAmong({ ...settings, answers: [aborted, e2] }).removable, ['tlc-A1-eeeeee'], 'an aborted answer is superseded on the ground its question names');
  const abortedLater = on(stub({ id: '2026-11-07-1100-tlc-ffffff', entry: 'tlc-A1-ffffff', kind: 'tlc', completed: false }), ['a']);
  assert.deepEqual(supersededAmong({ ...settings, answers: [e1, abortedLater] }).removable, ['tlc-A1-ffffff'], 'and stands in for nothing, since it answered nothing: the earlier answer decides, and the aborted one goes');
});

test('candidates are tried in the order established, each against the answers that would remain, so removing them all changes nothing', () => {
  const e1 = on(stub({ id: '2026-11-07-1000-tlc-aaaaaa', entry: 'tlc-A1-aaaaaa', kind: 'tlc' }), ['a']);
  const e2 = on(stub({ id: '2026-11-07-1001-tlc-bbbbbb', entry: 'tlc-A1-bbbbbb', kind: 'tlc' }), ['a']);
  const e3 = on(stub({ id: '2026-11-07-1002-chart-cccccc', entry: 'chart-cccccc', kind: 'chart' }), ['a'], 'chart');
  // Each of e1 and e2 alone could go, since the other decides the same; both cannot, since e3 is no model answer.
  const s = supersededAmong({ ...settings, answers: [e1, e2, e3] });
  assert.deepEqual(s.removable, ['tlc-A1-aaaaaa']);
  assert.equal(decidesBy([e2, e3]), decidesBy([e1, e2, e3]));
});

test('strength first: the answer that decides stays whenever it was established, and a check run after a proof is the one that goes', () => {
  const proof = on(stub({ id: '2026-11-07-1000-apalache-aaaaaa', entry: 'apalache-A1-aaaaaa', kind: 'apalache' }), ['a'], 'model', 2);
  const check = on(stub({ id: '2026-11-07-1001-tlc-bbbbbb', entry: 'tlc-A1-bbbbbb', kind: 'tlc' }), ['a'], 'model', 1);
  assert.deepEqual(supersededAmong({ ...settings, answers: [proof, check] }).removable, ['tlc-A1-bbbbbb'], 'the later check adds nothing to the proof');
  const earlier = on(stub({ id: '2026-11-07-0900-tlc-cccccc', entry: 'tlc-A1-cccccc', kind: 'tlc' }), ['a'], 'model', 1);
  assert.deepEqual(supersededAmong({ ...settings, answers: [earlier, proof] }).removable, ['tlc-A1-cccccc'], 'and the proof after a check shadows it');
  assert.deepEqual(supersededAmong({ ...settings, answers: [earlier, proof, check] }).removable, ['tlc-A1-cccccc', 'tlc-A1-bbbbbb'], 'both checks go, the proof stays');
});

test('an answer that holds a counterexample, in its outcomes or in previous, waits for the owner\'s forget', () => {
  const violated = on(stub({ id: '2026-11-07-1000-tlc-aaaaaa', entry: 'tlc-A1-aaaaaa', kind: 'tlc', outcomes: { A1: 'violated' } }), ['a']);
  const remembers = on(stub({ id: '2026-11-07-1001-tlc-bbbbbb', entry: 'tlc-A1-bbbbbb', kind: 'tlc', outcomes: { A1: 'holds' }, previous: { answer: { outcomes: { A1: 'violated' } } } }), ['a']);
  const later = on(stub({ id: '2026-11-07-1002-tlc-cccccc', entry: 'tlc-A1-cccccc', kind: 'tlc' }), ['a']);
  const s = supersededAmong({ ...settings, answers: [violated, remembers, later], bound: name => (name === 'tlc-A1-aaaaaa' ? '0123456789abcdef' : 'fedcba9876543210') });
  assert.deepEqual(s.removable, []);
  assert.deepEqual(s.superseded, {
    'tlc-A1-aaaaaa': 'the answers that decide stand in its place; it holds a counterexample, so it stays until the owner forgets tlc-A1-aaaaaa@01234567',
    'tlc-A1-bbbbbb': 'the answers that decide stand in its place; it holds a counterexample, so it stays until the owner forgets tlc-A1-bbbbbb@fedcba98',
  });
  const forgiven = supersededAmong({ ...settings, answers: [violated, remembers, later], forgiven: name => name === 'tlc-A1-aaaaaa' });
  assert.deepEqual(forgiven.removable, ['tlc-A1-aaaaaa']);
  assert.equal(forgiven.superseded['tlc-A1-aaaaaa'], 'the answers that decide stand in its place, and the owner forgot it; the next publication removes it');
  assert.ok(holdsCounterexample({ checks: 'fail' }, null) && holdsCounterexample({}, { answer: { outcomes: { A1: 'counterexample' } } }) && !holdsCounterexample({ A1: 'holds' }, { answer: { outcomes: { A1: 'holds' } } }));
});

test('the conclusions compared leave out the findings that are an entry\'s own', () => {
  const flags = [
    { name: 'unrun', where: 'evidence/x.json: aborted', entry: 'x' },
    { name: 'question gone', where: 'evidence/x.json: A1 is gone; the next publication removes it', entry: 'x' },
    { name: 'answer superseded', where: 'evidence/x.json: the answers that decide stand in its place; the next publication removes it', entry: 'x' },
    // Verify names the entry, so the wording decides nothing: a reworded message is still the entry's own.
    { name: 'narrowed', where: 'evidence/x.json looked less far than the answer before it (delay 3→2)', entry: 'x' },
    { name: 'narrowed', where: 'A1: evidence/y.json reaches less than evidence/x.json (delay 3→2)' },
    { name: 'blunder owed', where: 'A1' },
  ];
  const a = { kind: 'part', marks: { A1: { mark: 'held' } }, backing: {}, chart: { gaps: ['g'] }, changedModelFiles: [], tripwires: [], flags, route: { pass: 'Encode', why: [], read: 'spec/models.md' } } as unknown as PartAnalysis;
  const c = JSON.parse(conclusionsOf(a));
  assert.deepEqual(c.flags.map((f: { name: string }) => f.name), ['narrowed', 'blunder owed'], 'a reach narrowed against another question\'s answer is a finding on the pair, and stays');
  assert.deepEqual(Object.keys(c).sort(), ['backing', 'changed', 'flags', 'gaps', 'marks', 'route', 'tripwires']);
});

// Harbor as published flags no answer superseded, so on a copy a second blunder on Token's A1, the same
// wrong through another copy, stands in for the first. The first holds a counterexample, so it waits for
// the owner's forget; then the next publication, a confirming rerun of the chart, removes it, and
// nothing verify concludes moves.
test('Harbor keeps no answer the next publication would remove; one planted on a copy is flagged superseded, and its removal changes no conclusion', t => {
  const work = mkdtempSync(join(tmpdir(), 'dossier-superseded-'));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  cpSync(fixture, work, { recursive: true });
  const root = join(work, 'dossiers'), dir = join(root, 'parts', 'token');
  const env = { ...process.env, DOSSIER_ROOT: '' };
  const dossier = (args: string[], extra: NodeJS.ProcessEnv = {}) => {
    const r = spawnSync(join(plugin, 'bin', 'dossier'), [args[0], '--root', root, ...args.slice(1)], { encoding: 'utf8', env: { ...env, ...extra } });
    assert.equal(r.status, 0, `dossier ${args.join(' ')}\n${r.stdout}${r.stderr}`);
    return r.stdout;
  };
  const all = () => { const r = verifyAll({ root, version: '0.1.0' }); return [...r.parts, ...r.compositions]; };
  const token = () => all().find(a => a.ref === 'parts/token')!;
  const published = all();
  assert.deepEqual(published.flatMap(a => a.supersededRemovable.map(name => `${a.ref}/evidence/${name}.json`)), [], 'Harbor is published with the rule in force');
  assert.deepEqual(published.flatMap(a => Object.keys(a.superseded)), [], 'and flags no answer superseded, hence the plant');
  const earlier = token().completed.find(a => a.entry.question.kind === 'blunder')!.name;
  dossier(['blunder', 'token', 'uncapped_again', '--replace', '    /\\ ((supply + amount) <= 4)\n', '--with', '', '--wrong', 'mint ignores the cap, through another copy', '--property', 'A1', '--reach', 'amounts up to 2', '--because', 'With the cap gone a mint takes the supply past 4.']);
  const java = join(work, 'java');
  writeFileSync(java, `#!/bin/sh\ncat '${join(plugin, 'qualification', 'tests', 'recorded', 'tlc', 'loose-A1.txt')}'\n`);
  chmodSync(java, 0o755);
  const later = dossier(['trial', 'token', 'blunder-uncapped_again.md'], { JAVA: java, TLA_TOOLS: join(plugin, 'qualification', 'tests', 'recorded', 'versions.txt') });
  assert.match(later, /^answer: evidence\/blunder-A1-[0-9a-f]{6}\.json · published$/m, 'another question on A1, caught');
  let a = token();
  assert.deepEqual(Object.keys(a.superseded), [earlier], 'the earlier blunder is flagged superseded');
  assert.match(a.superseded[earlier], /; it holds a counterexample, so it stays until the owner forgets /);
  assert.deepEqual(a.supersededRemovable, []);
  const bound = JSON.parse(readFileSync(join(dir, 'integrity.json'), 'utf8')).evidence[earlier] as string;
  dossier(['decide', 'token', 'forget', `${earlier}@${bound.slice(0, 8)}`, '--', 'the second blunder catches the same wrong']);
  const was = token();
  assert.deepEqual(was.supersededRemovable, [earlier], 'once forgotten, the next publication removes it');
  // The next publication: the chart's question asked again, which gives the same answer and writes no entry.
  const chart = was.completed.find(x => x.entry.question.kind === 'chart')!;
  mkdirSync(join(dir, 'calls'), { recursive: true });
  writeFileSync(join(dir, 'calls', 'chart.md'), chart.entry.call.text);
  const rerun = dossier(['trial', 'token', 'chart.md']);
  assert.match(rerun, new RegExp(`^answer: evidence/${chart.name}\\.json · kept: `, 'm'));
  assert.match(rerun, new RegExp(`^  removed evidence/${earlier}\\.json: the answers that decide stand in its place$`, 'm'));
  for (const file of [`${earlier}.json`, `${earlier}.md`]) assert.equal(existsSync(join(dir, 'evidence', file)), false, file);
  const is = token();
  assert.deepEqual(Object.keys(is.superseded), []);
  assert.equal(conclusionsOf(is), conclusionsOf(was), 'removing the superseded answer changes no conclusion');
});
