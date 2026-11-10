import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBehaviorCollection, parseBehavior, parseCollection, parseMappingTarget, parseReview, parseUniqueJson, readRecordFile, reviewCoverageItems } from '../../src/behaviors/records.ts';
import type { BehaviorRecord, ReviewRecord, ReviewSubject } from '../../src/behaviors/types.ts';

const doc = (record: unknown, body = '# Explanation\n\nActors, trigger, outcome and limits.\n') => '```json\n' + JSON.stringify(record, null, 2) + '\n```\n\n' + body;
const behavior = (): BehaviorRecord => ({ format: 'dossier-behavior@0.2.0', id: 'cancel-plan', title: 'Cancel a plan', claims: [{ id: 'C1', kind: 'descriptive', statement: 'Governance can cancel the waiting plan along W2.', scope: { level: 'model', description: 'One path in the finite model.', pins: [] }, assumptions: [], mappings: [{ id: 'M1', target: { kind: 'walk', dossier: 'parts/timelock', id: 'W2', scenario: null }, relation: 'supports', rationale: 'The walk names cancellation.', limitations: ['Only this path.'] }] }] });
const review = (): ReviewRecord => {
  const subject: ReviewSubject = { kind: 'behavior', dossier: 'parts/timelock', behaviors: ['cancel-plan'] };
  return { format: 'dossier-review@0.2.0', subject, basis: [], coverage: { examined: [], unexamined: reviewCoverageItems(subject).map(item => ({ item, reason: 'Not examined in this parser test.' })) }, replaces: [], assessments: [{ mapping: 'cancel-plan/C1/M1', result: 'inconclusive', rationale: 'This tests shape only.', limitations: [] }] };
};

test('authored records parse the exact format, preserve complete bytes and accept CRLF', () => {
  const source = doc(behavior()).replace(/\n/g, '\r\n');
  const parsed = parseBehavior(source, 'cancel-plan');
  assert.equal(parsed.record.claims[0].mappings[0].target.kind, 'walk');
  assert.equal(parsed.text, source);
  assert.equal(parsed.sha256.length, 64);
  assert.match(parsed.body, /Actors/);
  assert.deepEqual(parseCollection(doc({ format: 'dossier-collection@0.2.0', behaviors: [] })).record.behaviors, []);
});

test('the first fence is the only record and must start at byte zero', () => {
  for (const prefix of [' ', '\n', '# Title\n', '\ufeff']) assert.throws(() => parseBehavior(prefix + doc(behavior())), /byte zero/);
  assert.throws(() => parseBehavior(doc(behavior()).replace('```json', '```yaml')), /byte zero/);
  assert.throws(() => parseBehavior('```json\n{}\n```'), /Markdown explanation/);
  assert.throws(() => parseBehavior(doc(behavior()).replace('\n', '\r')), /line endings/);
  const text = doc(behavior(), '# Explanation\n\n```json\n{"ignored": true}\n```\n');
  assert.equal(parseBehavior(text).record.id, 'cancel-plan');
});

test('duplicate JSON keys are rejected before JSON.parse can discard them', () => {
  for (const input of ['{"a":1,"a":2}', '{"a":{"x":0,"\\u0078":1}}', '[{"x":1,"x":2}]', '{"__proto__":{},"__proto__":{}}']) assert.throws(() => parseUniqueJson(input), /duplicate JSON key/);
  for (const input of ['{"a":1,}', '[1,]', '{"a":01}', '{"a":true}garbage', '"bad\\xescape"', '"bad\nline"']) assert.throws(() => parseUniqueJson(input));
  assert.deepEqual(JSON.parse(JSON.stringify(parseUniqueJson('{"quote":"\\\"a\\\"","values":[1,true,null,{"x":2}]}'))), { quote: '"a"', values: [1, true, null, { x: 2 }] });
});

test('unknown fields, old formats, file mismatches and duplicate local ids are invalid', () => {
  assert.throws(() => parseBehavior(doc({ ...behavior(), verified: true })), /fields/);
  assert.throws(() => parseBehavior(doc({ ...behavior(), format: 'dossier-behavior@0.1.1' })), /format/);
  assert.throws(() => parseBehavior(doc(behavior()), 'other'), /filename/);
  const b = behavior(); b.claims.push(structuredClone(b.claims[0]));
  assert.throws(() => parseBehavior(doc(b)), /duplicate/);
  const c = behavior(); c.claims[0].mappings.push(structuredClone(c.claims[0].mappings[0]));
  assert.throws(() => parseBehavior(doc(c)), /duplicate/);
  assert.throws(() => parseCollection(doc({ format: 'dossier-collection@0.2.0', behaviors: ['a', 'a'] })), /duplicate/);
  assert.throws(() => parseCollection(doc({ format: 'dossier-collection@0.2.0', behaviors: ['../a'] })), /invalid/);
});

test('scope pins need typed references and full record revisions, while hypotheses may lack mappings', () => {
  const b = behavior(); b.claims[0].mappings = [];
  assert.equal(parseBehavior(doc(b)).record.claims[0].mappings.length, 0);
  b.claims[0].scope.level = 'source';
  assert.throws(() => parseBehavior(doc(b)), /require pins/);
  b.claims[0].scope.pins = [{ ref: 'timelock#contract:Timelock', revision: 'sha256:' + 'a'.repeat(64) }];
  assert.equal(parseBehavior(doc(b)).record.claims[0].scope.level, 'source');
  for (const revision of ['main', 'a'.repeat(40), 'sha256:abc', 'sha256:' + 'A'.repeat(64)]) { b.claims[0].scope.pins[0].revision = revision; assert.throws(() => parseBehavior(doc(b)), /revision/); }
  b.claims[0].scope.pins[0] = { ref: 'Timelock', revision: 'sha256:' + 'a'.repeat(64) };
  assert.throws(() => parseBehavior(doc(b)), /typed knowledge/);
});

test('targets require exact objects, local dossier paths and explicit composition scenarios', () => {
  for (const dossier of ['timelock', '../parts/timelock', '/parts/timelock', 'parts/../timelock']) assert.throws(() => parseMappingTarget({ kind: 'walk', dossier, id: 'W2', scenario: null }));
  assert.throws(() => parseMappingTarget({ kind: 'walk', dossier: 'compositions/control', id: 'W2', scenario: null }), /explicit/);
  assert.throws(() => parseMappingTarget({ kind: 'walk', dossier: 'parts/timelock', id: 'W2', scenario: 'all-honest' }), /null/);
  assert.throws(() => parseMappingTarget({ kind: 'cell', dossier: 'parts/timelock', property: 'A1', scenario: 'all-honest' }), /composition/);
  assert.throws(() => parseMappingTarget({ kind: 'passage', dossier: 'compositions/control', id: 'A1', side: 'model' }), /cell target/);
  assert.throws(() => parseMappingTarget({ kind: 'walk', dossier: 'parts/timelock', id: 'W2', scenario: null, trial: 'old' }), /fields/);
});

test('answer targets carry the exact closed question object, not a trial alias', () => {
  const target = { kind: 'answer', dossier: 'parts/timelock', check: 'NotW2', question: { kind: 'tlc', checker: 'tlc', executes: ['model/Timelock.tla'], expects: ['NotW2'], property: null, scenario: null, walk: 'W2' } };
  assert.equal(parseMappingTarget(target).kind, 'answer');
  assert.throws(() => parseMappingTarget({ ...target, question: { ...target.question, trial: 'old' } }), /fields/);
  assert.throws(() => parseMappingTarget({ ...target, question: { ...target.question, executes: ['../outside.tla'] } }), /relative path/);
  assert.throws(() => parseMappingTarget({ ...target, question: { ...target.question, expects: ['NotW2', 'NotW2'] } }), /duplicate/);
});

test('review records reject abbreviated headers, missing coverage and duplicate or unrelated keys', () => {
  assert.throws(() => parseReview('prose@abcdef\n\nReviewed.'), /byte zero/);
  assert.equal(parseReview(doc(review())).record.assessments[0].result, 'inconclusive');
  const r = review(); r.coverage.unexamined.pop();
  assert.throws(() => parseReview(doc(r)), /coverage/);
  const duplicate = review(); duplicate.coverage.examined = ['formal:1'];
  assert.throws(() => parseReview(doc(duplicate)), /duplicate/);
  const unrelated = review(); unrelated.coverage.unexamined[0].item = 'behavior:other:claims';
  assert.throws(() => parseReview(doc(unrelated)), /coverage/);
  const joined = review(); joined.coverage.unexamined = [{ item: reviewCoverageItems(joined.subject).sort().join('|'), reason: 'An attempted combined key.' }];
  assert.throws(() => parseReview(doc(joined)), /coverage/);
});

test('review paths, replacements and assessment identities are closed and constrained', () => {
  const r = review();
  r.basis = [{ role: 'required', root: 'dossiers', path: '../outside', sha256: 'a'.repeat(64) }];
  assert.throws(() => parseReview(doc(r)), /relative path/);
  const bad = review(); bad.assessments[0].mapping = 'other/C1/M1';
  assert.throws(() => parseReview(doc(bad)), /outside/);
  const correction = review(); correction.replaces = [{ review: 'reviews/previous.md', sha256: 'a'.repeat(64), mappings: ['cancel-plan/C1/M2'], reason: 'Correct the scope.' }];
  assert.throws(() => parseReview(doc(correction)), /no assessment/);
  correction.replaces[0].mappings = ['cancel-plan/C1/M1'];
  assert.equal(parseReview(doc(correction)).record.replaces.length, 1);
  correction.replaces[0].review = 'evidence/entry.md';
  assert.throws(() => parseReview(doc(correction)), /under reviews/);
});

test('loader enforces the listed set, order and absence of symbolic links', t => {
  const root = mkdtempSync(join(tmpdir(), 'behavior-records-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'behaviors'));
  writeFileSync(join(root, 'README.md'), doc({ format: 'dossier-collection@0.2.0', behaviors: ['cancel-plan'] }));
  writeFileSync(join(root, 'behaviors/cancel-plan.md'), doc(behavior()));
  assert.equal(loadBehaviorCollection(root).issues.length, 0);
  writeFileSync(join(root, 'behaviors/extra.md'), doc({ ...behavior(), id: 'extra' }));
  assert.match(loadBehaviorCollection(root).issues.map(i => i.message).join(' '), /not listed/);
  rmSync(join(root, 'behaviors/extra.md'));
  symlinkSync(join(root, 'behaviors/cancel-plan.md'), join(root, 'behaviors/extra.md'));
  assert.match(loadBehaviorCollection(root).issues.map(i => i.message).join(' '), /symbolic links/);
  rmSync(join(root, 'behaviors/cancel-plan.md'));
  assert.match(loadBehaviorCollection(root).issues.map(i => i.message).join(' '), /missing or invalid/);
});

test('UTF-8 decoding preserves BOM refusal and rejects invalid bytes and escaping links', t => {
  const root = mkdtempSync(join(tmpdir(), 'behavior-bytes-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, 'bom.md'), '\ufeff' + doc(behavior()));
  assert.throws(() => parseBehavior(readRecordFile(root, 'bom.md')), /byte zero/);
  writeFileSync(join(root, 'invalid.md'), Buffer.from([0xff, 0xfe]));
  assert.throws(() => readRecordFile(root, 'invalid.md'));
  symlinkSync('/etc/hosts', join(root, 'outside.md'));
  assert.throws(() => readRecordFile(root, 'outside.md', true), /escapes root/);
  writeFileSync(join(root, 'inside.md'), 'inside'); symlinkSync(join(root, 'inside.md'), join(root, 'alias.md'));
  assert.equal(readRecordFile(root, 'alias.md', true), 'inside');
  assert.throws(() => readRecordFile(root, 'alias.md'), /symbolic link/);
});

test('published contract examples use the implemented closed parser', () => {
  const root = fileURLToPath(new URL('../conformance/behavior-contract/', import.meta.url));
  assert.equal(parseBehavior(readFileSync(join(root, 'examples/parts/timelock/behaviors/cancel-plan.md'), 'utf8')).record.claims.length, 3);
  assert.equal(parseBehavior(readFileSync(join(root, 'examples/compositions/control/behaviors/resolve-plan.md'), 'utf8')).record.id, 'resolve-plan');
  assert.equal(parseReview(readFileSync(join(root, 'review-incomplete.md'), 'utf8')).record.subject.kind, 'behavior');
});
