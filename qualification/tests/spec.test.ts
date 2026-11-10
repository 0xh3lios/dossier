import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseProse } from '../../src/prose/prose.ts';
import { compileIR } from '../../src/prose/ir.ts';
import { checkIR } from '../../src/chart/draw.ts';
import { scaffoldTla, parseTla } from '../../src/models/tla.ts';
import { fingerprint } from '../conformance/files.ts';
import { verifyAll } from '../../src/commands/verify.ts';
import type { VerifyJson } from '../../src/commands/verify.ts';
import { loadBehaviorCollection } from '../../src/behaviors/records.ts';
import type { ReviewBasisEntry, ReviewRecord, ReviewSubject } from '../../src/behaviors/types.ts';
import { readActors } from '../../src/dossiers/actors.ts';
import { lapsedParts } from '../../src/verify/lapse.ts';
import type { PresentState } from '../../src/verify/lapse.ts';
import type { Snapshot } from '../../src/trials/answers.ts';
import { answerOf, listBundles } from '../conformance/evidence.ts';
import { gradeBudget } from '../conformance/grade-agent.ts';
import { gradeReview } from '../conformance/grade-review.ts';

const plugin = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const text = (path: string) => readFileSync(join(plugin, path), 'utf8');
function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => { const path = join(dir, name); return lstatSync(path).isDirectory() ? files(path) : [path]; });
}
function verify(root: string) {
  const r = spawnSync(join(plugin, 'bin/dossier'), ['verify', '--json', '--root', root], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: { ...process.env, DOSSIER_ROOT: '' } });
  assert.ifError(r.error);
  assert.ok(r.status === 0 || r.status === 1, r.stderr);
  return { status: r.status, result: JSON.parse(r.stdout) as VerifyJson };
}

test('specification and skill routes resolve to portable contract files', () => {
  for (const path of [join(plugin, 'README.md'), ...['spec', 'skills', 'docs'].flatMap(d => files(join(plugin, d)))].filter(p => p.endsWith('.md'))) {
    const content = readFileSync(path, 'utf8');
    assert.ok(!content.includes('skills/keep/references/'), path);
    for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = match[1].split('#')[0];
      if (!target || /^(https?:|mailto:)/.test(target)) continue;
      const full = resolve(dirname(path), target);
      assert.ok(full.startsWith(plugin + '/'), `${path}: nonportable ${target}`);
      assert.ok(existsSync(full), `${path}: missing ${target}`);
      const anchor = match[1].split('#')[1];
      if (anchor && full.endsWith('.md')) {
        const counts = new Map<string, number>();
        const anchors = [...readFileSync(full, 'utf8').matchAll(/^#{1,6}\s+(.+)$/gm)].map(h => {
          const base = h[1].toLowerCase().replace(/[^\p{L}\p{N}_ -]/gu, '').replace(/ /g, '-');
          const n = counts.get(base) || 0; counts.set(base, n + 1);
          return n ? `${base}-${n}` : base;
        });
        assert.ok(anchors.includes(decodeURIComponent(anchor)), `${path}: missing heading ${match[1]}`);
      }
    }
  }
});

test('PROC-PREPARE / ART-VIEWS: composition scaffold removes obsolete configurations and is idempotent', t => {
  const work = mkdtempSync(join(tmpdir(), 'dossier-materialize-'));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  cpSync(join(plugin, 'qualification/fixture'), work, { recursive: true });
  const root = join(work, 'dossiers');
  const obsolete = join(root, 'compositions/control/model/generated/obsolete.cfg');
  writeFileSync(obsolete, 'INVARIANT A1\n');
  const before = fingerprint(work);
  verify(root);
  assert.deepEqual(fingerprint(work), before, 'read-only verification does not clean up generated files');
  const scaffold = () => {
    const r = spawnSync(join(plugin, 'bin/dossier'), ['scaffold', 'compositions/control', '--root', root], { encoding: 'utf8' });
    assert.equal(r.status, 0, r.stdout + r.stderr);
  };
  scaffold();
  assert.equal(existsSync(obsolete), false, 'execution preparation owns removal of obsolete configurations');
  const built = fingerprint(work);
  scaffold();
  assert.deepEqual(fingerprint(work), built, 'unchanged generated files retain their timestamps');
});

test('PROC-PREPARE: the complete budget example compiles, checks, and preserves passage identities through scaffolding', async () => {
  const prose = parseProse(text('qualification/conformance/fixtures/budget.md'));
  const ir = compileIR(prose);
  assert.deepEqual(ir.errors, []);
  const run = await checkIR({ root: plugin, ir });
  assert.equal(run.outcome, 'pass', JSON.stringify(run));
  assert.ok(run.covers!.includes('W1'));
  const model = parseTla(scaffoldTla(ir));
  assert.deepEqual(Object.values(model.actions).map(a => a.move), ['M1']);
  assert.ok(model.properties.includes('A1'));
  // Semantic mutation: one limit stops guarding payment. The independently
  // specified refused step and range check must detect it.
  const bad = compileIR(parseProse(text('qualification/conformance/fixtures/budget.md').replace('capacity > 0 and balance > 0', 'balance > 0')));
  const broken = await checkIR({ root: plugin, ir, machineIR: bad });
  assert.equal(broken.outcome, 'fail');
  assert.ok(broken.checks!.some(c => c.status === 'failed' && (c.ids.includes('R1') || c.ids.includes('W1') || c.ids.includes('TypeOK'))));
});

test('ART-EVIDENCE: CLI read-only verification preserves all bytes and mtimes on success and failure', t => {
  const work = mkdtempSync(join(tmpdir(), 'dossier-readonly-'));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  cpSync(join(plugin, 'qualification/fixture'), work, { recursive: true });
  const root = join(work, 'dossiers');
  const before = fingerprint(work);
  const first = verify(root);
  assert.equal(first.status, 0);
  assert.deepEqual(fingerprint(work), before);
  for (const a of [...first.result.parts, ...first.result.compositions]) assert.ok(existsSync(join(plugin, a.route.read)), a.route.read);
  const index = join(root, 'index.md');
  writeFileSync(index, readFileSync(index, 'utf8') + 'edited\n');
  assert.deepEqual(verify(root), first, 'an edited view changes no conclusion');
  rmSync(join(root, 'parts/timelock/integrity.json'));
  const changed = fingerprint(work);
  const failed = verify(root);
  assert.equal(failed.status, 1);
  assert.ok(failed.result.parts.find(c => c.id === 'timelock')!.tripwires.some(x => x.name === 'integrity missing'));
  assert.deepEqual(fingerprint(work), changed);
  assert.deepEqual(verify(root), failed);
  assert.deepEqual(fingerprint(work), changed);
});

test('ART-HISTORY: repeated read-only verification cannot forget a removed entry or decision truncation, with or without the views', t => {
  const work = mkdtempSync(join(tmpdir(), 'dossier-history-'));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  cpSync(join(plugin, 'qualification/fixture'), work, { recursive: true });
  const root = join(work, 'dossiers');
  const part = join(root, 'parts/timelock');
  // An answer leaves HEAD: its entry and its reading are gone, and integrity.json still binds it.
  const entry = readdirSync(join(part, 'evidence')).find(n => n.endsWith('.json'))!.slice(0, -'.json'.length);
  rmSync(join(part, 'evidence', `${entry}.json`));
  rmSync(join(part, 'evidence', `${entry}.md`), { force: true });
  const decisionPath = join(part, 'decisions.log');
  const lines = readFileSync(decisionPath, 'utf8').trimEnd().split('\n');
  assert.ok(lines.length > 0);
  writeFileSync(decisionPath, lines.slice(0, -1).join('\n') + '\n');
  const findings = (r: ReturnType<typeof verify>) => {
    assert.equal(r.status, 1);
    const trips = r.result.parts.find(c => c.id === 'timelock')!.tripwires;
    assert.ok(trips.some(x => x.name === 'answer removed' && x.where.startsWith(`evidence/${entry}.json`)), JSON.stringify(trips));
    assert.ok(trips.some(x => x.name === 'decisions chain broken'));
    return trips;
  };
  let before = fingerprint(work);
  const first = findings(verify(root));
  assert.deepEqual(fingerprint(work), before);
  // The views go too. Nothing reads them as a record, so the findings stay, verify after verify.
  rmSync(join(part, 'ledger.md'));
  rmSync(join(root, 'index.md'));
  before = fingerprint(work);
  for (let i = 0; i < 3; i++) {
    assert.deepEqual(findings(verify(root)), first);
    assert.deepEqual(fingerprint(work), before);
  }
});

test('ART-SCOPE: a retired actor kind needs an explicit choice, and an old snapshot does not silently gain current evidence', t => {
  const work = mkdtempSync(join(tmpdir(), 'dossier-scope-spec-'));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  mkdirSync(join(work, 'actors'));
  writeFileSync(join(work, 'actors/actors.md'), text('qualification/conformance/fixtures/retired-actor-kind.md'));
  const retired = readActors(work);
  assert.ok(retired.errors.some(x => x.includes('kind "contract"')));
  // Explicitly choosing an unmodeled external actor resolves the syntax only.
  writeFileSync(join(work, 'actors/actors.md'), text('qualification/conformance/fixtures/retired-actor-kind.md').replace('kind: contract', 'kind: external'));
  assert.deepEqual(readActors(work).errors, []);
  const then = JSON.parse(text('qualification/conformance/fixtures/snapshot-without-module.json')) as Snapshot;
  const basis = { snapshot: then, executed: {}, inputIdentity: { strategy: 'private-copy' as const, files: {}, shared: [], limitation: 'An older snapshot.' } };
  const now: PresentState = { passages: then.passages, wiring: then.wiring!, module: () => 'current-module', scenario: () => then.scenario!, actors: then.actors!, extras: null, members: {}, records: {}, configs: {}, inputs: {} };
  assert.deepEqual(lapsedParts(basis, now, 'A1', 'all-honest'), ['generated module']);
  assert.deepEqual(lapsedParts(basis, now, 'A1', 'all-honest'), ['generated module'], 'reading the old snapshot cannot refresh it');
});

test('the agent grader checks the published answer and rejects proof promotion, an edited entry and invented acceptance, while a local bundle is no record', async t => {
  const work = mkdtempSync(join(tmpdir(), 'dossier-grader-'));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  const root = join(work, 'dossiers');
  mkdirSync(join(root, 'actors'), { recursive: true });
  mkdirSync(join(root, 'parts'));
  mkdirSync(join(root, 'compositions'));
  writeFileSync(join(root, 'dossier.json'), JSON.stringify({ plugin: '0.2.0', storage: 'integrity-v1' }));
  writeFileSync(join(root, 'actors/actors.md'), '# Actors\n```yaml\nactors:\n  - id: operator\n    kind: user\n```\n');
  const run = (...args: string[]) => {
    const r = spawnSync(join(plugin, 'bin/dossier'), [...args, '--root', root], { encoding: 'utf8', env: { ...process.env, DOSSIER_ROOT: '' } });
    assert.equal(r.status, 0, r.stdout + r.stderr);
  };
  run('decide', 'budget', 'begin', 'charted');
  const part = join(root, 'parts/budget');
  writeFileSync(join(part, 'prose.md'), text('qualification/conformance/fixtures/budget.md'));
  run('draw', 'budget');
  mkdirSync(join(part, 'calls'));
  writeFileSync(join(part, 'calls/chart.md'), 'kind: chart\nexecutes:\n  - prose.md\nreach: capacity 0..2 and inventory 0..3\nexpect:\n  checks: pass\nbecause: Two payments consume capacity and the third is refused.\n');
  run('trial', 'budget', 'chart.md');
  const trial = listBundles(part)[0];
  const published = answerOf(part, trial);
  assert.ok(published, 'the trial established the chart question\'s entry');
  writeFileSync(join(part, 'evidence', `${published.name}.md`), 'The published answer supports the finite chart; it gives no inductive or implementation proof.\n');
  const answer = { part: 'budget', trial, checker: 'chart', proof: false, thirdPaymentAllowed: false, remainingCapacity: 0, remainingInventory: 1, limitations: ['Finite abstraction; owner review remains.'] };
  const answerPath = join(work, 'answer.json');
  writeFileSync(answerPath, JSON.stringify(answer));
  writeFileSync(join(work, 'answer.md'), 'Two payments consume the capacity. The third is refused within this finite abstraction.\n');
  assert.equal((await gradeBudget(work)).outcome, 'pass');
  writeFileSync(answerPath, JSON.stringify({ ...answer, proof: true }));
  await assert.rejects(gradeBudget(work), /inductive proof/);
  writeFileSync(answerPath, JSON.stringify(answer));
  // STORE-BUNDLE: the trial's bundle stays local and is no record. Altering it, or deleting it, changes
  // no conclusion and no grade.
  const conclusions = verify(root);
  const bundle = join(part, 'trials', trial);
  writeFileSync(join(bundle, 'output.txt'), readFileSync(join(bundle, 'output.txt'), 'utf8') + 'altered observation\n');
  assert.equal((await gradeBudget(work)).outcome, 'pass');
  rmSync(bundle, { recursive: true });
  assert.deepEqual(verify(root), conclusions);
  assert.equal((await gradeBudget(work)).outcome, 'pass');
  // ART-EVIDENCE: the entry is the record. One edited by hand, here to claim a wider reach, is refused.
  const entry = join(part, 'evidence', `${published.name}.json`);
  const original = readFileSync(entry, 'utf8');
  assert.ok(original.includes('capacity 0..2'));
  writeFileSync(entry, original.replaceAll('capacity 0..2', 'capacity 0..9'));
  await assert.rejects(gradeBudget(work), /answer edited/);
  writeFileSync(entry, original);
  assert.equal((await gradeBudget(work)).outcome, 'pass');
  // ANSWER-SAME: a confirming rerun writes nothing, so its trial id names no answer to cite.
  writeFileSync(join(part, 'calls/chart.md'), 'kind: chart\nexecutes:\n  - prose.md\nreach: capacity 0..2 and inventory 0..3\nexpect:\n  checks: pass\nbecause: Again, two payments consume capacity and the third is refused.\n');
  run('trial', 'budget', 'chart.md');
  assert.equal(readFileSync(entry, 'utf8'), original);
  const rerun = listBundles(part).find(id => id !== trial)!;
  writeFileSync(answerPath, JSON.stringify({ ...answer, trial: rerun }));
  await assert.rejects(gradeBudget(work), /cite the trial that established a published answer/);
  writeFileSync(answerPath, JSON.stringify(answer));
  run('decide', 'budget', 'accept', 'S1', '--', 'Synthetic unauthorized acceptance for this negative test.');
  await assert.rejects(gradeBudget(work), /owner decisions/);
});

test('the review grader rejects promoted cells and writes to existing evidence', t => {
  const fixture = () => {
    const work = mkdtempSync(join(tmpdir(), 'dossier-review-grader-'));
    t.after(() => rmSync(work, { recursive: true, force: true }));
    // This negative grader fixture supplies its own synthetic assessments; it
    // must not contradict the independent judgments retained by real Harbor.
    cpSync(join(plugin, 'qualification/fixture'), work, { recursive: true, filter: path => basename(path) !== 'reviews' });
    return { work, before: fingerprint(work) };
  };
  const report = 'dossiers/compositions/control/reviews/exercise.md';
  const cells = [
    ['A1', 'all-honest', 'proved'], ['A1', 'governance-captured', 'checked'], ['A1', 'executor-offline', 'checked'],
    ['A2', 'all-honest', 'checked'], ['A2', 'governance-captured', 'checked'], ['O1', 'all-honest', 'checked'],
    ['N1', 'all-honest', 'checked'], ['N1', 'governance-captured', 'checked'], ['N1', 'executor-offline', 'violated'],
  ].map(([property, scenario, mark]) => ({ property, scenario, mark, accepted: mark === 'violated', proof: mark === 'proved' }));
  const answer = { summarySupported: false, cells, limitations: ['Synthetic grader input, not an agent review.'] };
  // The synthetic review exercises the persisted scope and observation format;
  // its synthetic assessments make no claim of a live independent review.
  const writeReport = (work: string, scoped = true) => {
    const root = join(work, 'dossiers');
    const result = spawnSync(join(plugin, 'bin/dossier'), ['review-basis', 'compositions/control', '--json', '--root', root], { encoding: 'utf8', env: { ...process.env, DOSSIER_ROOT: '' } });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    const input = JSON.parse(result.stdout) as { subject: ReviewSubject; basis: ReviewBasisEntry[]; coverageItems: string[]; issues: string[] };
    assert.deepEqual(input.issues, []);
    const collection = loadBehaviorCollection(join(root, 'compositions/control'));
    const record: ReviewRecord = {
      format: 'dossier-review@0.2.0', subject: input.subject, basis: input.basis,
      coverage: { examined: input.coverageItems, unexamined: [] }, replaces: [],
      assessments: collection.behaviors.flatMap(b => b.record.claims.flatMap(c => c.mappings.map(m => ({
        mapping: `${b.record.id}/${c.id}/${m.id}`, result: 'too-broad' as const,
        rationale: 'Synthetic scope objection for the grader fixture; this assessment exercises the format and contributes no positive support.',
        limitations: ['Synthetic grader input, not an agent review.'],
      })))),
    };
    mkdirSync(dirname(join(work, report)), { recursive: true });
    const header = scoped ? `\`\`\`json\n${JSON.stringify(record)}\n\`\`\`\n\n` : '';
    writeFileSync(join(work, report), `${header}# Review\n\n\`\`\`json\n${JSON.stringify(answer)}\n\`\`\`\n`);
  };
  const { work, before } = fixture();
  writeReport(work, false);
  assert.throws(() => gradeReview(work, before, report), /scoped review header/);
  writeReport(work);
  assert.equal(gradeReview(work, before, report).outcome, 'pass');
  const checked = cells.find(c => c.mark === 'checked')!;
  checked.mark = 'proved';
  writeReport(work);
  assert.throws(() => gradeReview(work, before, report), /current evidence/);
  checked.mark = 'checked';
  const log = join(work, 'dossiers/compositions/control/decisions.log');
  writeFileSync(log, readFileSync(log, 'utf8') + '\n');
  assert.throws(() => gradeReview(work, before, report), /existing artifact changed/);
  // A reading beside a published answer is existing evidence too. A fresh copy keeps this case apart.
  const other = fixture();
  writeReport(other.work);
  const reading = readdirSync(join(other.work, 'dossiers/compositions/control/evidence')).find(n => n.endsWith('.md'))!;
  writeFileSync(join(other.work, 'dossiers/compositions/control/evidence', reading), 'A reviewer\'s retelling written over the keeper\'s.\n');
  assert.throws(() => gradeReview(other.work, other.before, report), /existing artifact changed: dossiers\/compositions\/control\/evidence\//);
});
