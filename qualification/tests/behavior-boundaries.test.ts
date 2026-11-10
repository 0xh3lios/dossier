import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyAll } from '../../src/commands/verify.ts';
import { rewriteSetupMarker } from '../../src/commands/setup.ts';
import { EARLIEST_ROOT, storageProblem, versionProblem } from '../../src/dossiers/integrity.ts';
import { UsageError } from '../../src/dossiers/root.ts';
import { openKnowledge } from '../../src/knowledge.ts';
import { outside } from '../../src/trials/plan.ts';
import { entryProblem } from '../../src/trials/answers.ts';
import { requiredReviewBasis, retentionInputFingerprint } from '../../src/behaviors/dependencies.ts';
import { parseCollection, reviewCoverageItems } from '../../src/behaviors/records.ts';
import { resolveKnowledgePin, resolveTarget } from '../../src/behaviors/resolve.ts';
import { protectBehaviorAnswers, preservesTarget } from '../../src/behaviors/retention.ts';
import type { Analysis } from '../../src/verify/analyze.ts';
import type { BehaviorRecord, ReviewRecord, ReviewSubject } from '../../src/behaviors/types.ts';

const plugin = fileURLToPath(new URL('../../', import.meta.url));
const document = (record: unknown, body: string) => '```json\n' + JSON.stringify(record, null, 2) + '\n```\n\n' + body + '\n';

function temporary(t: TestContext): string {
  const dir = mkdtempSync(join(tmpdir(), 'dossier-behavior-boundaries-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function harbor(t: TestContext) {
  const work = temporary(t), fixture = join(work, 'fixture');
  // Recorded evidence is copied intact. These tests supply their own synthetic
  // review judgments, so independent Harbor reviews are excluded from this copy.
  cpSync(join(plugin, 'qualification/fixture'), fixture, { recursive: true, filter: path => basename(path) !== 'reviews' });
  return { root: join(fixture, 'dossiers'), knowledge: join(fixture, 'knowledge') };
}

function inspect(root: string) {
  const verified = verifyAll({ root, version: '0.2.0' });
  const all = [...verified.parts, ...verified.compositions];
  const byRef = Object.fromEntries(all.map(a => [a.ref, a]));
  const at = (ref: string): Analysis => {
    assert.ok(byRef[ref], `fixture must contain ${ref}`);
    return byRef[ref];
  };
  return { verified, byRef, at };
}

function reviewed(root: string, ref: string, behavior?: string) {
  const { verified, byRef, at } = inspect(root), analysis = at(ref);
  const collection = analysis.behaviorCollection!;
  assert.deepEqual(collection.issues, []);
  const subject: ReviewSubject = {
    kind: behavior ? 'behavior' : 'dossier', dossier: ref,
    behaviors: behavior ? [behavior] : collection.collection!.record.behaviors,
  };
  const closure = requiredReviewBasis(subject, { root, analysis, analyses: byRef, knowledge: verified.knowledge, collection });
  assert.deepEqual(closure.issues, []);
  const record: ReviewRecord = {
    format: 'dossier-review@0.2.0', subject, basis: closure.files,
    coverage: { examined: reviewCoverageItems(subject), unexamined: [] }, replaces: [],
    assessments: collection.behaviors.filter(b => subject.behaviors.includes(b.record.id)).flatMap(b =>
      b.record.claims.flatMap(c => c.mappings.map(m => ({
        mapping: `${b.record.id}/${c.id}/${m.id}`, result: 'supported' as const,
        rationale: 'Synthetic assessment supplied to test the dependency boundary.', limitations: [],
      })))),
  };
  mkdirSync(join(analysis.dir, 'reviews'), { recursive: true });
  writeFileSync(join(analysis.dir, 'reviews/boundary.md'), document(record, 'This test exercises structural freshness, not an actual independent semantic review.'));
  assert.equal(inspect(root).at(ref).reviews.find(r => r.file === 'reviews/boundary.md')?.status, 'current');
  return { analysis, record };
}

function addMinter(knowledge: string): void {
  const dir = join(knowledge, 'modules/new-minter');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'edges.md'), '# New minting owner\n\n```yaml\nedges:\n  - id: mint\n    type: mints_asset\n    from: contract:new-minter\n    to: token#asset:hrd\n```\n');
}

test('same-question replacement refuses null or empty reach while identical reach remains admissible', t => {
  const { root } = harbor(t), analysis = inspect(root).at('parts/timelock');
  const old = analysis.completed.find(a => a.entry.question.checker === 'tlc' && a.entry.question.expects.includes('N1'))!;
  assert.ok(old);
  assert.equal(old.entry.answer.reach?.values?.MaxSent, 4);
  const unchanged = protectBehaviorAnswers(root, analysis.ref, analysis.answers, structuredClone(old.entry), old.name, [], []);
  assert.equal(unchanged.refusal, null);
  for (const reach of [null, { text: 'Scope was omitted.', values: {} }]) {
    const next = structuredClone(old.entry);
    // Entry validation permits absent/null reach at runtime. The retention guard
    // must not equate that lack of information with equal or stronger coverage.
    Object.assign(next.answer, { reach });
    assert.equal(entryProblem(next, old.name, analysis.ref), null);
    const result = protectBehaviorAnswers(root, analysis.ref, analysis.answers, next, old.name, [], []);
    assert.match(result.refusal || '', /answer replacement would remove behavior support/, JSON.stringify(reach));
  }
});

test('same-question replacement cannot trade a smaller scope dimension for a larger one', t => {
  const { root } = harbor(t), analysis = inspect(root).at('parts/timelock');
  const retained = analysis.completed.find(a => a.entry.question.checker === 'tlc' && a.entry.question.expects.includes('N1'))!;
  assert.ok(retained);
  // Explicit already-validated boundary inputs isolate the scope ordering. No
  // synthetic solver observation is written into Harbor or the temporary root.
  const old = structuredClone(retained);
  old.entry.answer.reach = { text: 'Four effects and four ticks.', values: { effects: 4, ticks: 4 } };
  const answers = analysis.answers.map(a => a.name === old.name ? old : a);
  const next = structuredClone(old.entry);
  next.answer.reach = { text: 'Eight effects but only two ticks.', values: { effects: 8, ticks: 2 } };
  const result = protectBehaviorAnswers(root, analysis.ref, answers, next, old.name, [], []);
  assert.match(result.refusal || '', /answer replacement would remove behavior support/);
});

test('a new knowledge owner opens closure, and a current dossier review no longer clears the composition', t => {
  const { root, knowledge } = harbor(t);
  reviewed(root, 'compositions/supply');
  const before = inspect(root).at('compositions/supply');
  assert.equal(before.kind, 'composition');
  if (before.kind !== 'composition') return;
  assert.deepEqual(before.closureMissing, []);
  addMinter(knowledge);
  const after = inspect(root).at('compositions/supply');
  assert.equal(after.kind, 'composition');
  if (after.kind !== 'composition') return;
  assert.ok(after.closureMissing.some(reason => reason.includes('new-minter')));
  assert.equal(after.reviews.find(r => r.file === 'reviews/boundary.md')?.status, 'current', 'the review binds no knowledge it does not resolve');
  assert.match(after.reviewOwed || '', /^the closure is open, which no review clears: new-minter owns an edge/, 'the old closed-world review cannot discharge the changed closure');
  assert.ok(after.cells.every(c => c.open), 'and every cell is open, so no claim keeps the support of one');
});

test('a knowledge inventory addition invalidates a retention decision before publication', t => {
  const { root, knowledge } = harbor(t), analysis = inspect(root).at('compositions/supply');
  const old = analysis.completed.find(a => a.entry.question.property === 'A1' && a.entry.question.scenario === 'all-honest' && a.entry.question.kind !== 'blunder')!;
  assert.ok(old);
  const decision = protectBehaviorAnswers(root, analysis.ref, analysis.answers, structuredClone(old.entry), old.name, [], []);
  assert.equal(decision.refusal, null);
  assert.doesNotThrow(() => decision.assertStable());
  addMinter(knowledge);
  assert.throws(() => decision.assertStable(), /(?:knowledge|behavior) dependencies changed/);
});

test('a member-only behavior review binds the subject composition prose and wiring', t => {
  const { root } = harbor(t), dir = join(root, 'compositions/control');
  const path = join(dir, 'README.md'), collection = parseCollection(readFileSync(path, 'utf8'));
  collection.record.behaviors.push('member-cancellation');
  writeFileSync(path, document(collection.record, collection.body));
  const behavior: BehaviorRecord = {
    format: 'dossier-behavior@0.2.0', id: 'member-cancellation', title: 'Cancellation by the member',
    claims: [{
      id: 'C1', kind: 'descriptive', statement: 'The Timelock member witnesses cancellation.',
      scope: { level: 'model', description: 'The declared Timelock member and W2 path.', pins: [] }, assumptions: [],
      mappings: [{ id: 'M1', target: { kind: 'walk', dossier: 'parts/timelock', id: 'W2', scenario: null }, relation: 'supports', rationale: 'The declared member supplies this path.', limitations: ['One path only.'] }],
    }],
  };
  writeFileSync(join(dir, 'behaviors/member-cancellation.md'), document(behavior, 'The subject composition delegates cancellation to its declared member.'));
  const { record } = reviewed(root, 'compositions/control', 'member-cancellation');
  for (const file of ['prose.md', 'wiring.md']) assert.ok(record.basis.some(b => b.role === 'required' && b.root === 'dossiers' && b.path === `compositions/control/${file}`), `${file} determines the subject abstraction or member relationship`);
  writeFileSync(join(dir, 'wiring.md'), readFileSync(join(dir, 'wiring.md'), 'utf8') + '\nThe subject relationship was reexamined.\n');
  assert.equal(inspect(root).at('compositions/control').reviews.find(r => r.file === 'reviews/boundary.md')?.status, 'stale');
});

for (const location of ['same-file', 'different-files'] as const) test(`duplicate typed knowledge identities are unresolved (${location})`, t => {
  const root = temporary(t), dir = join(root, 'modules/demo');
  mkdirSync(dir, { recursive: true });
  const source = '# Invariants\n\n```yaml\ninvariants:\n  - id: same\n    statement: First assertion.\n```\n';
  writeFileSync(join(dir, 'a.md'), source);
  const initial = openKnowledge(root).resolve('demo#property:same');
  assert.ok(initial);
  const duplicate = '# Invariants\n\n```yaml\ninvariants:\n  - id: same\n    statement: Conflicting assertion.\n```\n';
  if (location === 'same-file') writeFileSync(join(dir, 'a.md'), source + '\n' + duplicate);
  else writeFileSync(join(dir, 'b.md'), duplicate);
  const knowledge = openKnowledge(root);
  assert.equal(knowledge.resolve('demo#property:same'), null);
  assert.equal(resolveKnowledgePin({ ref: 'demo#property:same', revision: `sha256:${initial.sha256}` }, knowledge).freshness, 'missing');
});

test('two observation representations cannot choose one pinned identity by extension order', t => {
  const root = temporary(t), dir = join(root, 'modules/demo/observations');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'checkpoint.json'), '{"checkpoint":"first"}\n');
  const initial = openKnowledge(root).resolve('demo#observation:checkpoint');
  assert.ok(initial);
  writeFileSync(join(dir, 'checkpoint.md'), '# A different checkpoint\n');
  const knowledge = openKnowledge(root);
  assert.equal(knowledge.resolve('demo#observation:checkpoint'), null);
  assert.equal(resolveKnowledgePin({ ref: 'demo#observation:checkpoint', revision: `sha256:${initial.sha256}` }, knowledge).freshness, 'missing');
});

for (const pluginVersion of ['0.1.1', '0.3.0', undefined]) test(`setup refuses ${pluginVersion ?? 'absent'} existing plugin version without rewriting its marker`, t => {
  const root = temporary(t), path = join(root, 'dossier.json');
  mkdirSync(join(root, 'parts/demo'), { recursive: true });
  const before = JSON.stringify({ plugin: pluginVersion, storage: 'integrity-v1' }) + '\n';
  writeFileSync(path, before);
  assert.ok(storageProblem(root));
  assert.throws(() => rewriteSetupMarker(root, '0.2.0', '2026-11-09'), (error: unknown) => error instanceof UsageError && error.message.includes('0.2.0'));
  assert.equal(readFileSync(path, 'utf8'), before);
});

test('setup still maintains an existing exact-current root', t => {
  const root = temporary(t), path = join(root, 'dossier.json');
  writeFileSync(path, JSON.stringify({ plugin: '0.2.0', storage: 'integrity-v1', setup: '2026-11-01' }));
  const result = rewriteSetupMarker(root, '0.2.0', '2026-11-09');
  assert.equal(result.marker.plugin, '0.2.0');
  assert.equal(result.marker.setup, '2026-11-01');
  assert.equal(storageProblem(root), null);
});

// A review binds what its subject rests on, not the root's configuration or unrelated records.
test('the required basis leaves out dossier.json, the orientation of a focused review, a part\'s scenarios and unrelated modules', t => {
  const { root } = harbor(t);
  const { verified, byRef } = inspect(root);
  const basisOf = (ref: string, behavior?: string) => {
    const analysis = byRef[ref], collection = analysis.behaviorCollection!;
    const subject: ReviewSubject = { kind: behavior ? 'behavior' : 'dossier', dossier: ref, behaviors: behavior ? [behavior] : collection.collection!.record.behaviors };
    const closure = requiredReviewBasis(subject, { root, analysis, analyses: byRef, knowledge: verified.knowledge, collection });
    assert.deepEqual(closure.issues, [], ref);
    return closure.files.map(b => `${b.root}:${b.path}`);
  };
  const focused = basisOf('parts/timelock', 'cancel-plan'), whole = basisOf('parts/timelock');
  assert.ok(!focused.includes('dossiers:dossier.json') && !whole.includes('dossiers:dossier.json'), 'dossier.json resolves nothing a judgment rests on');
  assert.ok(!focused.includes('dossiers:parts/timelock/README.md'), 'a focused review leaves the orientation out');
  assert.ok(whole.includes('dossiers:parts/timelock/README.md'), 'a dossier review examines it');
  assert.ok(!whole.includes('dossiers:actors/scenarios.md') && whole.includes('dossiers:actors/actors.md'), 'scenarios belong to compositions');
  const control = basisOf('compositions/control'), supply = basisOf('compositions/supply');
  assert.ok(control.includes('dossiers:actors/scenarios.md'));
  const modulesIn = (basis: string[]) => new Set(basis.filter(k => k.startsWith('knowledge:modules/')).map(k => k.split('/')[1]));
  assert.deepEqual([...modulesIn(control)].sort(), ['adapter', 'breaker', 'timelock', 'vault'], 'control binds its members\' modules, not the oracle\'s or the token\'s');
  const owners = new Set(verified.knowledge.edges({ types: ['mints_asset', 'burns_asset', 'accounts_for_asset'], asset: 'hrd' }).map(e => e.module));
  assert.ok(owners.size > 0);
  for (const m of owners) assert.ok(modulesIn(supply).has(m), `supply binds ${m}, which owns an edge its closure rule names`);
});

test('a review stays current through an edit to dossier.json, and a focused one through an edit to the orientation', t => {
  const { root } = harbor(t);
  reviewed(root, 'parts/timelock', 'cancel-plan');
  const focused = readFileSync(join(root, 'parts/timelock/reviews/boundary.md'), 'utf8');
  rmSync(join(root, 'parts/timelock/reviews/boundary.md'));
  reviewed(root, 'parts/timelock');
  writeFileSync(join(root, 'parts/timelock/reviews/focused.md'), focused);
  const status = () => Object.fromEntries(inspect(root).at('parts/timelock').reviews.map(r => [r.file, r.status]));
  assert.deepEqual(status(), { 'reviews/boundary.md': 'current', 'reviews/focused.md': 'current' });
  const marker = JSON.parse(readFileSync(join(root, 'dossier.json'), 'utf8'));
  writeFileSync(join(root, 'dossier.json'), JSON.stringify({ ...marker, updated: '2026-12-01' }, null, 2) + '\n');
  assert.deepEqual(status(), { 'reviews/boundary.md': 'current', 'reviews/focused.md': 'current' }, 'setup rewriting its date stales nothing');
  writeFileSync(join(root, 'parts/timelock/README.md'), readFileSync(join(root, 'parts/timelock/README.md'), 'utf8') + '\nOne more sentence of orientation.\n');
  assert.deepEqual(status(), { 'reviews/boundary.md': 'stale', 'reviews/focused.md': 'current' }, 'the orientation is the dossier review\'s to examine');
});

// The version is one constant, so a release that keeps the formats reads the roots before it.
test('a later plugin reads a root set up by an earlier one in the same formats, flags it, and setup moves the marker on', t => {
  const root = temporary(t), path = join(root, 'dossier.json');
  mkdirSync(join(root, 'parts/demo'), { recursive: true });
  writeFileSync(path, JSON.stringify({ plugin: '0.2.0', storage: 'integrity-v1', setup: '2026-11-01' }));
  assert.equal(versionProblem('0.2.0', '0.2.1'), null);
  assert.equal(storageProblem(root, '0.2.1'), null, 'a 0.2.1 plugin reads a 0.2.0 root');
  assert.match(storageProblem(root, '0.1.9') || '', /later than this dossier 0\.1\.9/, 'and an earlier plugin refuses a later root');
  assert.equal(rewriteSetupMarker(root, '0.2.1', '2026-11-10').marker.plugin, '0.2.1');
  assert.throws(() => rewriteSetupMarker(root, '0.2.0', '2026-11-10'), /later than this dossier 0\.2\.0/, 'setup never moves a marker back');
  const empty = temporary(t);
  writeFileSync(join(empty, 'dossier.json'), JSON.stringify({ plugin: '0.1.1', storage: 'integrity-v1' }));
  assert.equal(rewriteSetupMarker(empty, '0.2.0', '2026-11-10').marker.plugin, '0.2.0', 'with no dossier under it there is nothing to protect');
  assert.equal(EARLIEST_ROOT, '0.2.0');
  for (const [file, pattern] of [['src/commands/setup.ts', /'0\.2\.0'/], ['src/verify/render.ts', /'0\.2\.0'/], ['src/dossiers/integrity.ts', /'0\.2\.0'(?!;\n\/\/|;$)/m]] as const) {
    const text = readFileSync(join(plugin, file), 'utf8').replace(/export const EARLIEST_ROOT = '0\.2\.0';/, '');
    assert.doesNotMatch(text, pattern, `${file} names the version through EARLIEST_ROOT`);
  }
});

test('the plugin updated flag names a root set up by an earlier version of the same formats', t => {
  const { root } = harbor(t);
  const v = verifyAll({ root, version: '0.2.1' });
  const timelock = v.parts.find(p => p.id === 'timelock')!;
  assert.deepEqual(v.tripwires, []);
  assert.ok(timelock.flags.some(f => f.name === 'plugin updated' && f.where === 'set up with dossier 0.2.0, this is 0.2.1: run dossier setup'));
  assert.ok(!verifyAll({ root, version: '0.2.0' }).parts[0].flags.some(f => f.name === 'plugin updated'));
});

// A cell selects its deciding question; a direct answer mapping selects the exact
// question. Same-conclusion context must not accidentally become that second scope.
test('retention distinguishes superseded cell context from an exact selected answer', t => {
  const { root } = harbor(t), { verified, byRef, at } = inspect(root);
  const analysis = at('compositions/upkeep');
  const after = resolveTarget({kind:'cell',dossier:analysis.ref,property:'N1',scenario:'lanes-offline'}, {analysis,analyses:byRef,knowledge:verified.knowledge});
  const deciding = after.evidence.find(e=>e.deciding && e.admissible)!;
  assert.ok(deciding);
  const old = {...structuredClone(deciding),entry:'older-question',path:'compositions/upkeep/evidence/older-question.json',deciding:false,reach:{text:'Another exploration of the same violated cell.',values:{MaxSent:4}}};
  const before = {...after,evidence:[old,...after.evidence]};
  assert.equal(preservesTarget(before,after),true,'unchanged deciding answer and owner preserve the cell');
  old.deciding=true;
  assert.equal(preservesTarget(before,after),false,'an explicitly selected scope cannot disappear');
  old.deciding=false;
  assert.equal(preservesTarget({...before,conflicts:['a current counterexample conflicts with positive support']},after),false,'a conflict cannot disappear as same-conclusion context');
});

test('an incoming member exact-answer mapping alone prevents removal and binds concurrent authorship', t => {
  const { root } = harbor(t), initial = inspect(root);
  const part = initial.at('parts/timelock');
  const selected = part.completed.find(a => a.entry.question.expects.includes('NotW2'))!;
  assert.ok(selected);
  const ownPath = join(part.dir,'behaviors/cancel-plan.md');
  const text = readFileSync(ownPath,'utf8'), close = text.indexOf('\n```',8);
  const own = JSON.parse(text.slice(8,close)) as BehaviorRecord;
  for (const claim of own.claims) claim.mappings = [];
  writeFileSync(ownPath,document(own,text.slice(close+4)));
  const subject = join(root,'compositions/control'), readme = join(subject,'README.md');
  const collection = parseCollection(readFileSync(readme,'utf8'));
  collection.record.behaviors.push('exact-member-answer');
  writeFileSync(readme,document(collection.record,collection.body));
  const incoming: BehaviorRecord = {format:'dossier-behavior@0.2.0',id:'exact-member-answer',title:'The selected cancellation answer',claims:[{id:'C1',kind:'descriptive',statement:'The selected member question supplies a cancellation witness.',scope:{level:'model',description:'Only the selected Timelock W2 question.',pins:[]},assumptions:[],mappings:[{id:'M1',target:{kind:'answer',dossier:part.ref,question:selected.entry.question,check:'NotW2'},relation:'supports',rationale:'The exact question records this path.',limitations:['An existential model path.']}]}]};
  const behaviorPath = join(subject,'behaviors/exact-member-answer.md');
  writeFileSync(behaviorPath,document(incoming,'Only this composition supplies the incoming dependency.'));
  const guarded = protectBehaviorAnswers(root,part.ref,part.answers,null,'unused',[],[selected.name]);
  assert.deepEqual(guarded.superseded,[]);
  assert.ok(guarded.retained.some(r=>r.entry===selected.name && r.reason.includes('compositions/control#exact-member-answer/C1/M1')));
  writeFileSync(behaviorPath,readFileSync(behaviorPath,'utf8')+'\nChanged interpretation.\n');
  assert.throws(()=>guarded.assertStable(),/behavior dependencies changed/);
  incoming.claims[0].mappings=[];
  writeFileSync(behaviorPath,document(incoming,'No current mapping selects the exact answer.'));
  const unguarded = protectBehaviorAnswers(root,part.ref,part.answers,null,'unused',[],[selected.name]);
  assert.deepEqual(unguarded.superseded,[selected.name]);
});


test('focused and dossier reviews bind authored chart blunders while generated views remain disposable', t => {
  const work = temporary(t), root = join(work, 'dossiers'), dir = join(root, 'parts/budget');
  mkdirSync(join(root, 'actors'), { recursive: true });
  writeFileSync(join(root, 'dossier.json'), JSON.stringify({ plugin: '0.2.0', storage: 'integrity-v1' }));
  writeFileSync(join(root, 'actors/actors.md'), '# Actors\n\n```yaml\nactors:\n  - id: operator\n    kind: user\n```\n');
  const run = (...args: string[]) => {
    const result = spawnSync(process.execPath, [join(plugin, 'src/cli.ts'), ...args, '--root', root], { encoding: 'utf8', env: { ...process.env, DOSSIER_ROOT: '' } });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  };
  run('decide', 'budget', 'begin', 'charted');
  writeFileSync(join(dir, 'prose.md'), readFileSync(join(plugin, 'qualification/conformance/fixtures/budget.md'), 'utf8'));
  const behavior: BehaviorRecord = { format: 'dossier-behavior@0.2.0', id: 'pay', title: 'Pay a fixed lot', claims: [{
    id: 'C1', kind: 'descriptive', statement: 'Paid lots and remaining inventory sum to three.',
    scope: { level: 'model', description: 'The finite Budget chart.', pins: [] }, assumptions: [],
    mappings: [{ id: 'M1', target: { kind: 'passage', dossier: 'parts/budget', id: 'A1', side: 'chart' }, relation: 'supports', rationale: 'A1 checks the conservation relationship.', limitations: ['Finite chart only.'] }],
  }] };
  writeFileSync(join(dir, 'README.md'), document({ format: 'dossier-collection@0.2.0', behaviors: ['pay'] }, '# Budget\n\nRead the finite accounting claim.'));
  writeFileSync(join(dir, 'behaviors/pay.md'), document(behavior, '# Pay a fixed lot\n\nEach permitted payment exchanges remaining inventory for a paid lot.'));
  run('draw', 'budget');
  mkdirSync(join(dir, 'calls'));
  writeFileSync(join(dir, 'calls/chart.md'), 'kind: chart\nexecutes:\n  - prose.md\nreach: capacity 0..2, inventory 0..3 and paid 0..3\nexpect:\n  checks: pass\nbecause: A payment preserves the total of paid lots and inventory.\n');
  run('trial', 'budget', 'chart.md');
  const machinePath = join(dir, 'chart/machine.json'), machine = JSON.parse(readFileSync(machinePath, 'utf8'));
  const move = machine.transitions.find((m: { id: string }) => m.id === 'M1');
  assert.ok(move.assigns.some((a: { name: string }) => a.name === 'paid'));
  move.assigns = move.assigns.filter((a: { name: string }) => a.name !== 'paid');
  const blunder = 'chart/blunders/omit-paid.json', path = join(dir, blunder);
  mkdirSync(join(dir, 'chart/blunders'), { recursive: true });
  writeFileSync(path, JSON.stringify(machine) + '\n');
  writeFileSync(join(dir, 'calls/fault.md'), `kind: blunder\nexecutes:\n  - prose.md\n  - ${blunder}\nreach: capacity 0..2, inventory 0..3 and paid 0..3\nblunder: Omit the paid increment while preserving both decrements.\nexpect:\n  checks: fail A1\nbecause: A1 must catch the lost paid lot after the first payment.\n`);
  run('trial', 'budget', 'fault.md');
  const original = readFileSync(path, 'utf8');
  for (const focus of ['pay', undefined]) {
    const { record } = reviewed(root, 'parts/budget', focus);
    assert.ok(record.basis.some(b => b.role === 'required' && b.root === 'dossiers' && b.path === `parts/budget/${blunder}`), `${focus || 'dossier'} binds the authored fault`);
    assert.ok(!record.basis.some(b => b.path === 'parts/budget/chart/machine.json'), 'the ordinary chart remains a generated view');
    writeFileSync(join(dir, `reviews/${focus || 'dossier'}.md`), document(record, 'Synthetic dependency-boundary assessment, not a live independent review.'));
  }
  rmSync(join(dir, 'reviews/boundary.md'));
  const analysis = inspect(root).at('parts/budget');
  assert.ok(analysis.reviews.every(r => r.status === 'current'));
  const chart = analysis.completed.find(a => a.entry.question.kind === 'chart')!;
  assert.ok(chart);
  const guarded = protectBehaviorAnswers(root, analysis.ref, analysis.answers, structuredClone(chart.entry), chart.name, [], []);
  assert.equal(guarded.refusal, null);
  // The generated view can be regenerated or removed without changing authority.
  rmSync(machinePath);
  assert.doesNotThrow(() => guarded.assertStable());
  writeFileSync(path, original + '\n');
  assert.throws(() => guarded.assertStable(), /behavior dependencies changed/);
  let after = inspect(root).at('parts/budget');
  assert.ok(after.reviews.every(r => r.status === 'stale' && r.reasons.some(reason => reason.includes(blunder))));
  writeFileSync(path, original);
  assert.ok(inspect(root).at('parts/budget').reviews.every(r => r.status === 'current'));
  // A regular executed leaf can sit under a linked ancestor accepted by the
  // runner. Retention must refuse that tree instead of asserting stable bytes.
  renameSync(join(dir, 'chart/blunders'), join(dir, 'calls/faults'));
  symlinkSync('../calls/faults', join(dir, 'chart/blunders'));
  assert.equal(outside(dir, blunder), null);
  assert.throws(() => guarded.assertStable(), (error: unknown) => error instanceof UsageError && /authored chart blunders.*symbolic link/.test(error.message));
  unlinkSync(join(dir, 'chart/blunders'));
  renameSync(join(dir, 'calls/faults'), join(dir, 'chart/blunders'));
  rmSync(path);
  after = inspect(root).at('parts/budget');
  assert.ok(after.reviews.every(r => r.status === 'stale' && r.reasons.some(reason => reason.includes(blunder))));
  assert.ok(after.reviewOwed, 'removing the authored fault cannot leave the independent review discharged');
});


test('all nested authored chart-blunder inputs enter the concurrent retention fingerprint', t => {
  const root = temporary(t), dir = join(root, 'parts/budget');
  for (const relative of ['generated/fault.json', 'calls/fault.json', 'trials/fault.json', '.faults/fault.json', 'node_modules/fault.json', 'nested/chart/fault.json', 'nested/ledger.md', 'nested/index.md']) {
    const path = join(dir, 'chart/blunders', relative);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, 'authored fault before\n');
    const before = retentionInputFingerprint(root);
    writeFileSync(path, 'authored fault after\n');
    assert.notEqual(retentionInputFingerprint(root), before, relative);
    writeFileSync(path, 'authored fault before\n');
    assert.equal(retentionInputFingerprint(root), before, `${relative}: restoring exact bytes`);
    rmSync(path);
    assert.notEqual(retentionInputFingerprint(root), before, `${relative}: removal`);
  }
  for (const relative of ['chart/machine.json', 'chart/grid.md', 'model/generated/Budget.tla']) {
    const path = join(dir, relative);
    mkdirSync(dirname(path), { recursive: true });
    const before = retentionInputFingerprint(root);
    writeFileSync(path, 'disposable generated view\n');
    assert.equal(retentionInputFingerprint(root), before, relative);
    rmSync(path);
    assert.equal(retentionInputFingerprint(root), before, `${relative}: removal`);
  }
});


test('authored chart-blunder ancestor links are conservatively refused before retention', t => {
  for (const linked of ['chart', 'chart/blunders', 'chart/blunders/nested']) {
    const root = temporary(t), dir = join(root, 'parts/budget'), target = join(dir, 'calls/faults');
    const tail = linked === 'chart' ? 'blunders/omit.json' : 'omit.json';
    mkdirSync(dirname(join(target, tail)), { recursive: true });
    writeFileSync(join(target, tail), 'authored fault\n');
    mkdirSync(dirname(join(dir, linked)), { recursive: true });
    symlinkSync(target, join(dir, linked));
    assert.equal(outside(dir, `${linked}/${tail}`), null, 'the executed leaf is still inside the dossier');
    assert.throws(() => retentionInputFingerprint(root), (error: unknown) => error instanceof UsageError && /authored chart blunders.*symbolic link/.test(error.message), linked);
    writeFileSync(join(target, tail), 'changed fault\n');
    assert.throws(() => retentionInputFingerprint(root), /authored chart blunders/, `${linked}: changed target remains refused`);
  }
});
