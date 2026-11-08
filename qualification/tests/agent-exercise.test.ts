import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { gradeExercise } from '../conformance/grade-exercise.ts';
import { gradeBudget } from '../conformance/grade-agent.ts';
import { parseProse } from '../../src/prose/prose.ts';
import { compileIR } from '../../src/prose/ir.ts';
import { answerOf, listBundles } from '../conformance/evidence.ts';
import { proseHash } from '../../src/hash.ts';
import { verifyAll } from '../../src/commands/verify.ts';

const plugin = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

test('frozen grading keeps its evaluator and production semantics when the working checkout changes', async t => {
  const work = mkdtempSync(join(tmpdir(), 'dossier-evaluator-'));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  const checkout = join(work, 'checkout'), evaluation = join(work, 'evaluation');
  mkdirSync(checkout);
  for (const name of ['src', 'bin', 'skills', 'spec', 'docs', 'plugin.json', '.claude-plugin', 'README.md', 'package.json', 'package-lock.json', 'qualification/conformance', 'qualification/fixture']) {
    mkdirSync(dirname(join(checkout, name)), { recursive: true });
    cpSync(join(plugin, name), join(checkout, name), { recursive: true, preserveTimestamps: true });
  }
  symlinkSync(join(plugin, 'node_modules'), join(checkout, 'node_modules'), 'dir');
  const prepared = spawnSync(process.execPath, [join(checkout, 'qualification/conformance/prepare-agent.ts'), 'review', evaluation], { encoding: 'utf8' });
  assert.equal(prepared.status, 0, prepared.stdout + prepared.stderr);
  const manifest = JSON.parse(readFileSync(join(evaluation, 'manifest.json'), 'utf8'));
  const report = join(manifest.workspace, 'dossiers/compositions/control/reviews/exercise.md');
  mkdirSync(dirname(report), { recursive: true });
  const cells = [
    ['A1', 'all-honest', 'proved'], ['A1', 'governance-captured', 'checked'], ['A1', 'executor-offline', 'checked'],
    ['A2', 'all-honest', 'checked'], ['A2', 'governance-captured', 'checked'], ['O1', 'all-honest', 'checked'],
    ['N1', 'all-honest', 'checked'], ['N1', 'governance-captured', 'checked'], ['N1', 'executor-offline', 'violated'],
  ].map(([property, scenario, mark]) => ({ property, scenario, mark, accepted: mark === 'violated', proof: mark === 'proved' }));
  // The review names the prose it read on its first line (REVIEW-OWED): Control's hash in this workspace.
  const hash = proseHash(verifyAll({ root: join(manifest.workspace, 'dossiers'), version: '0.1.0' }).compositions.find(s => s.id === 'control')!.hashes);
  writeFileSync(report, `prose@${hash}\n\n# Synthetic report\n\n\`\`\`json\n` + JSON.stringify({ summarySupported: false, cells, limitations: ['This tests the evaluator, not an agent.'] }) + '\n```\n');
  const grade = async () => {
    const result = spawnSync(process.execPath, [join(checkout, 'qualification/conformance/grade-exercise.ts'), evaluation], { encoding: 'utf8' });
    assert.equal(result.status, 0, result.stdout + result.stderr);
    return JSON.parse(result.stdout);
  };
  const before = await grade();
  assert.equal(before.outcome, 'pass');
  assert.equal(before.evaluatorHash, manifest.evaluatorHash);
  assert.equal(before.node, process.version, 'grading records its actual runtime');
  assert.equal(before.preparedNode, manifest.node);
  // Both changes would invalidate grading if it imported the current checkout.
  writeFileSync(join(checkout, 'src/commands/verify.ts'), 'throw new Error("later verifier must not run");\n');
  writeFileSync(join(checkout, 'qualification/conformance/grade-review.ts'), 'throw new Error("later evaluator must not run");\n');
  assert.deepEqual(await grade(), before);
  writeFileSync(join(manifest.evaluator, 'qualification/conformance/grade-review.ts'), 'throw new Error("tampered frozen evaluator");\n');
  await assert.rejects(gradeExercise(evaluation), /frozen evaluator changed/);
});

test('an exercise whose manifest names no frozen evaluator cannot be regraded', async t => {
  const work = mkdtempSync(join(tmpdir(), 'dossier-old-evaluation-'));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  writeFileSync(join(work, 'manifest.json'), JSON.stringify({ schema: 1 }));
  await assert.rejects(gradeExercise(work), /does not identify a frozen evaluator/);
});

test('a real successful blunder cannot replace the positive chart trial in an agent answer', async t => {
  const work = mkdtempSync(join(tmpdir(), 'dossier-budget-citation-'));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  const root = join(work, 'dossiers');
  for (const name of ['actors', 'parts', 'compositions']) mkdirSync(join(root, name), { recursive: true });
  writeFileSync(join(root, 'dossier.json'), JSON.stringify({ plugin: '0.1.0', storage: 'integrity-v1' }));
  writeFileSync(join(root, 'actors/actors.md'), '# Actors\n```yaml\nactors:\n  - id: operator\n    kind: user\n```\n');
  const run = (...args: string[]) => {
    const result = spawnSync(join(plugin, 'bin/dossier'), [...args, '--root', root], { encoding: 'utf8', env: { ...process.env, DOSSIER_ROOT: '' } });
    assert.equal(result.status, 0, result.stdout + result.stderr);
  };
  run('decide', 'budget', 'begin', 'charted');
  const part = join(root, 'parts/budget');
  const prose = readFileSync(join(plugin, 'qualification/conformance/fixtures/budget.md'), 'utf8');
  writeFileSync(join(part, 'prose.md'), prose);
  run('draw', 'budget');
  mkdirSync(join(part, 'calls'));
  writeFileSync(join(part, 'calls/chart.md'), 'kind: chart\nexecutes:\n  - prose.md\nreach: capacity 0..2 and inventory 0..3\nexpect:\n  checks: pass\nbecause: Two payments consume capacity and the third is refused.\n');
  run('trial', 'budget', 'chart.md');
  const chart = listBundles(part)[0];
  // Each answer's reading sits beside the entry its trial established in evidence/.
  const reading = (trial: string, text: string) => {
    const published = answerOf(part, trial);
    assert.ok(published, `${trial} established an answer`);
    writeFileSync(join(part, 'evidence', `${published.name}.md`), text);
    return published;
  };
  reading(chart, 'The chart establishes the finite three-payment refusal, not an inductive proof.\n');
  mkdirSync(join(part, 'chart/blunders'), { recursive: true });
  writeFileSync(join(part, 'chart/blunders/missing-limit.json'), JSON.stringify(compileIR(parseProse(prose.replace('capacity > 0 and balance > 0', 'balance > 0')))));
  writeFileSync(join(part, 'calls/blunder.md'), 'kind: blunder\nexecutes:\n  - chart/blunders/missing-limit.json\nreach: same finite capacity and balance ranges\nblunder: Remove the capacity guard.\nexpect:\n  checks: fail R1 W1\nbecause: A third payment is wrongly enabled and contradicts the refusal and walk.\n');
  run('trial', 'budget', 'blunder.md');
  const blunder = listBundles(part).find(id => id.includes('-blunder-'))!;
  // A blunder asks its own question, so its answer has its own entry beside the chart's.
  const observation = reading(blunder, 'The omitted guard enables the forbidden third payment, so the negative check failed as expected.\n');
  assert.equal(observation.entry.answer.result, 'as-called');
  assert.equal(observation.entry.answer.outcomes.checks, 'fail');
  assert.notEqual(observation.name, answerOf(part, chart)!.name);
  const answer = { part: 'budget', trial: chart, checker: 'chart', proof: false, thirdPaymentAllowed: false, remainingCapacity: 0, remainingInventory: 1, limitations: ['Finite abstraction; owner review remains.'] };
  writeFileSync(join(work, 'answer.json'), JSON.stringify(answer));
  writeFileSync(join(work, 'answer.md'), 'Two payments exhaust capacity; the third is refused within this finite abstraction.\n');
  assert.equal((await gradeBudget(work)).outcome, 'pass');
  writeFileSync(join(work, 'answer.json'), JSON.stringify({ ...answer, trial: blunder }));
  await assert.rejects(gradeBudget(work), /ordinary chart trial/);
});
