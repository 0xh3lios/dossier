import assert from 'node:assert/strict';
import { readFileSync, readdirSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { fingerprint } from './files.ts';

export async function gradeExercise(evaluation: string) {
  evaluation = resolve(evaluation);
  const manifest = JSON.parse(readFileSync(join(evaluation, 'manifest.json'), 'utf8'));
  assert.equal(manifest.schema, 1, `manifest schema ${manifest.schema} is not one this grader reads`);
  // An evaluation whose manifest does not identify its frozen evaluator cannot be regraded as frozen.
  assert.ok(manifest.evaluator && manifest.evaluatorBefore, 'this evaluation does not identify a frozen evaluator; retain its result and prepare a new exercise instead of regrading it');
  assert.equal(createHash('sha256').update(readFileSync(join(evaluation, 'request.md'))).digest('hex'), manifest.requestHash);
  assert.deepEqual(fingerprint(manifest.plugin), manifest.pluginBefore, 'the frozen plugin changed');
  assert.deepEqual(fingerprint(manifest.evaluator), manifest.evaluatorBefore, 'the frozen evaluator changed');
  const frozenEntry = realpathSync(join(manifest.evaluator, 'qualification/conformance/grade-exercise.ts'));
  // The working-tree file is only a launcher. Both the grading rules and the
  // production semantics run from the snapshots frozen before dispatch.
  if (fileURLToPath(import.meta.url) !== frozenEntry) {
    const frozen = await import(pathToFileURL(frozenEntry).href);
    return frozen.gradeExercise(evaluation);
  }
  let result;
  if (manifest.exercise === 'budget') {
    const { gradeBudget } = await import('./grade-agent.ts');
    result = await gradeBudget(manifest.workspace);
  }
  else if (manifest.exercise === 'review') {
    const { gradeReview } = await import('./grade-review.ts');
    const dir = 'dossiers/compositions/control/reviews';
    const reports = readdirSync(join(manifest.workspace, dir)).filter(n => n.endsWith('.md') && !Object.hasOwn(manifest.workspaceBefore, `${dir}/${n}`));
    assert.equal(reports.length, 1, 'the exercise adds exactly one review beyond its frozen starting inventory');
    result = gradeReview(manifest.workspace, manifest.workspaceBefore, `${dir}/${reports[0]}`);
  } else {
    assert.ok(['compose-probe', 'refresh-decision'].includes(manifest.exercise), 'known exercise');
    const { gradeWorkflow } = await import('./grade-workflows.ts');
    assert.ok(manifest.toolchain?.java?.available && manifest.toolchain?.tlc?.available, 'workflow preparation must identify the supplied solver toolchain');
    result = gradeWorkflow(manifest.exercise, manifest.workspace, manifest.workspaceBefore, manifest.initialTexts);
  }
  return { ...result, pluginHash: manifest.pluginHash, specHash: manifest.specHash, evaluatorHash: manifest.evaluatorHash, node: process.version, gradingRuntime: { node: process.version, executable: realpathSync(process.execPath), sha256: createHash('sha256').update(readFileSync(process.execPath)).digest('hex') }, preparedNode: manifest.node, preparedRuntime: manifest.runtime, toolchain: manifest.toolchain, dependencies: manifest.dependencies };
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const evaluation = process.argv[2];
  if (!evaluation) { console.error('usage: node qualification/conformance/grade-exercise.ts <evaluation-directory>'); process.exitCode = 2; }
  else try { console.log(JSON.stringify(await gradeExercise(evaluation), null, 2)); }
  catch (error) { console.error(JSON.stringify({ outcome: 'fail', reason: (error as Error).message }, null, 2)); process.exitCode = 1; }
}
