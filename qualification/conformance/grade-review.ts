// Artifact and claim checks for agents/review-request.md. A human still reads
// every finding and trace retelling; this script does not judge free text.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { fingerprint } from './files.ts';
import { parseReview } from '../../src/behaviors/records.ts';
import { verifyAll } from '../../src/commands/verify.ts';

export function gradeReview(workspace: string, before: Record<string, string>, reportPath: string) {
  const report = relative(workspace, resolve(workspace, reportPath));
  assert.match(report, /^dossiers\/compositions\/control\/reviews\/[^/]+\.md$/, 'one review file under the selected dossier');
  const after = fingerprint(workspace);
  for (const [name, signature] of Object.entries(before)) {
    // Adding the sole report changes its existing ancestor directory mtimes.
    if (signature.endsWith(':directory') && (name === '.' || report.startsWith(name + '/'))) {
      assert.ok(after[name]?.endsWith(':directory'));
      assert.equal(after[name].split(':')[0], signature.split(':')[0], `directory permissions changed: ${name}`);
    } else assert.equal(after[name], signature, `existing artifact changed: ${name}`);
  }
  const added = Object.keys(after).filter(name => !Object.hasOwn(before, name));
  for (const name of added) assert.ok(name === report || (after[name].endsWith(':directory') && report.startsWith(name + '/')), `unexpected write: ${name}`);
  assert.ok(added.includes(report), 'the review is a new report');
  const body = readFileSync(join(workspace, report), 'utf8');
  const blocks = [...body.matchAll(/```json\s*\n([\s\S]*?)\n```/g)];
  assert.equal(blocks.length, 2, 'a scoped review header and one exercise observation block');
  const review = parseReview(body).record;
  assert.equal(review.subject.kind, 'dossier');
  const answer = JSON.parse(blocks[1][1]);
  assert.equal(answer.summarySupported, false, 'the proposed summary overclaims proof and erases an accepted violation');
  assert.ok(Array.isArray(answer.limitations) && answer.limitations.length > 0);
  const verified = verifyAll({ root: join(workspace, 'dossiers'), version: '0.2.0', write: false });
  const composition = verified.compositions.find(s => s.id === 'control');
  assert.ok(composition);
  assert.deepEqual(composition.tripwires, []);
  assert.ok(composition.reviews.some(r => r.file === relative(join(workspace,'dossiers',composition.ref),join(workspace,report)) && r.status === 'current'), 'the complete scoped review is current');
  assert.deepEqual(composition.flags.filter(f => f.name === 'review owed'), [], 'the review clears the flag');
  const expected = composition.cells.map(c => ({ property: c.property, scenario: c.scenario, mark: c.mark, accepted: Boolean(c.accepted), proof: c.mark === 'proved' }));
  const key = (c: { property: string; scenario: string }) => `${c.property}|${c.scenario}`;
  const order = (a: { property: string; scenario: string }, b: { property: string; scenario: string }) => key(a).localeCompare(key(b));
  assert.deepEqual(answer.cells.sort(order), expected.sort(order), 'each claim matches its current evidence');
  assert.equal(expected.filter(c => c.proof).length, 1, 'the exercise retains a genuine inductive result');
  assert.equal(expected.filter(c => c.mark === 'checked').length, 7, 'bounded results remain distinct');
  assert.ok(expected.some(c => c.property === 'N1' && c.scenario === 'executor-offline' && c.mark === 'violated' && c.accepted));
  assert.deepEqual(fingerprint(workspace), after, 'grading is read-only');
  return { outcome: 'pass', report, cells: expected.length, addedFiles: 1, manual: ['Check every finding and trace retelling against the cited artifacts.'] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [workspace, snapshot, report] = process.argv.slice(2);
  if (!workspace || !snapshot || !report) { console.error('usage: node qualification/conformance/grade-review.ts <workspace> <before.json> <report-relative-path>'); process.exitCode = 2; }
  else try { console.log(JSON.stringify(gradeReview(resolve(workspace), JSON.parse(readFileSync(snapshot, 'utf8')), report), null, 2)); }
  catch (error) { console.error(JSON.stringify({ outcome: 'fail', reason: (error as Error).message }, null, 2)); process.exitCode = 1; }
}
