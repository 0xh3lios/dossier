// Authored behavior and review records. Parsing establishes shape and identity;
// evidence resolution and independent interpretation remain separate work.
import { lstatSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs';
import { join, resolve, relative, isAbsolute, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { cachedFileHash, canonical } from '../hash.ts';
import { parseRef } from '../knowledge.ts';
import { BEHAVIOR_FORMAT, COLLECTION_FORMAT, REVIEW_FORMAT } from './formats.ts';
import type { Question } from '../trials/answers.ts';
import type {
  AssessmentReplacement, BehaviorCollection, BehaviorParts, BehaviorRecord, Claim, CollectionRecord,
  KnowledgePin, Mapping, MappingTarget, ParsedRecord, ReviewAssessment, ReviewBasisEntry,
  ReviewRecord, ReviewSubject,
} from './types.ts';

export const BEHAVIOR_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
export const DOSSIER_REF = /^(?:parts|compositions)\/[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const CLAIM_ID = /^C[1-9]\d*$/, MAPPING_ID = /^M[1-9]\d*$/;
const QUALIFIED_MAPPING = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*\/C[1-9]\d*\/M[1-9]\d*$/;
const SHA256 = /^[a-f0-9]{64}$/, REVISION = /^sha256:[a-f0-9]{64}$/;
export const recordDigest = (text: string | Uint8Array): string => createHash('sha256').update(text).digest('hex');
function fail(message: string): never { throw new Error(message); }
const object = (x: unknown, at: string): Record<string, unknown> => x && typeof x === 'object' && !Array.isArray(x) ? x as Record<string, unknown> : fail(`${at} must be an object`);
function fields(x: unknown, names: string[], at: string): Record<string, unknown> {
  const value = object(x, at);
  const keys = Object.keys(value);
  if (keys.length !== names.length || keys.some(key => !names.includes(key))) fail(`${at} fields must be exactly ${names.join(', ')}`);
  return value;
}
const string = (x: unknown, at: string): string => typeof x === 'string' && x.trim().length > 0 ? x : fail(`${at} must be a nonempty string`);
function match(x: unknown, pattern: RegExp, at: string): string { const value = string(x, at); return pattern.test(value) ? value : fail(`${at} has an invalid value`); }
function choice<T extends string>(x: unknown, choices: readonly T[], at: string): T { return choices.includes(x as T) ? x as T : fail(`${at} must be ${choices.join(' or ')}`); }
const array = (x: unknown, at: string): unknown[] => Array.isArray(x) ? x : fail(`${at} must be an array`);
function strings(x: unknown, at: string, unique = false): string[] {
  const out = array(x, at).map((v, i) => string(v, `${at}[${i}]`));
  if (unique && new Set(out).size !== out.length) fail(`${at} contains a duplicate`);
  return out;
}
function unique<T>(items: T[], key: (item: T) => string, at: string): void { if (new Set(items.map(key)).size !== items.length) fail(`${at} contains a duplicate`); }
function nullableString(x: unknown, at: string): string | null { return x === null ? null : string(x, at); }
export function safeRelativePath(x: unknown): x is string {
  return typeof x === 'string' && x.length > 0 && !isAbsolute(x) && !/^[A-Za-z]:/.test(x) && !/[\\\u0000-\u001f]/.test(x) && x.split('/').every(s => s !== '' && s !== '.' && s !== '..');
}
function path(x: unknown, at: string): string { return safeRelativePath(x) ? x : fail(`${at} must be a relative path without traversal`); }

// JSON.parse discards duplicate keys, so inspect the token stream before accepting
// any object. String decoding is delegated to JSON.parse, including escape checks.
export function parseUniqueJson(text: string): unknown {
  let at = 0;
  const space = () => { while (at < text.length && /[\t\r\n ]/.test(text[at])) at++; };
  const readString = (): string => {
    const start = at++;
    while (at < text.length) {
      const ch = text[at++];
      if (ch === '\\') { at++; continue; }
      if (ch === '"') return JSON.parse(text.slice(start, at)) as string;
    }
    return fail('unterminated JSON string');
  };
  const value = (depth: number): unknown => {
    if (depth > 128) fail('JSON nesting is too deep');
    space();
    if (text[at] === '"') return readString();
    if (text[at] === '{') {
      at++; space();
      const out: Record<string, unknown> = Object.create(null);
      if (text[at] === '}') { at++; return out; }
      for (;;) {
        if (text[at] !== '"') fail('JSON object key must be a string');
        const key = readString();
        if (Object.hasOwn(out, key)) fail(`duplicate JSON key ${JSON.stringify(key)}`);
        space(); if (text[at++] !== ':') fail('JSON object key needs a colon');
        out[key] = value(depth + 1); space();
        const end = text[at++];
        if (end === '}') return out;
        if (end !== ',') fail('JSON object needs a comma or closing brace');
        space();
      }
    }
    if (text[at] === '[') {
      at++; space(); const out: unknown[] = [];
      if (text[at] === ']') { at++; return out; }
      for (;;) {
        out.push(value(depth + 1)); space(); const end = text[at++];
        if (end === ']') return out;
        if (end !== ',') fail('JSON array needs a comma or closing bracket');
      }
    }
    const token = /^(?:null|true|false|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(at));
    if (!token) return fail(`invalid JSON value at character ${at}`);
    at += token[0].length;
    return JSON.parse(token[0]) as unknown;
  };
  const parsed = value(0); space();
  if (at !== text.length) fail(`unexpected JSON text at character ${at}`);
  return parsed;
}

const HEADER = /^```json\r?\n([\s\S]*?)\r?\n```(?:\r?\n|$)/;
function document<T>(text: string, validate: (value: unknown) => T): ParsedRecord<T> {
  if (text.replace(/\r\n/g, '').includes('\r')) fail('record must use LF or CRLF line endings');
  const header = HEADER.exec(text);
  if (!header) fail('record must begin at byte zero with a fenced json object');
  const body = text.slice(header[0].length);
  if (!body.trim()) fail('record must include a Markdown explanation after its JSON block');
  return { record: validate(parseUniqueJson(header[1])), body, text, sha256: recordDigest(text) };
}

function pin(x: unknown, at: string): KnowledgePin {
  const p = fields(x, ['ref', 'revision'], at);
  const ref = string(p.ref, `${at}.ref`);
  if (ref !== ref.trim() || !parseRef(ref)) fail(`${at}.ref must be a typed knowledge reference`);
  return { ref, revision: match(p.revision, REVISION, `${at}.revision`) };
}
function question(x: unknown, at: string): Question {
  const q = fields(x, ['kind', 'checker', 'executes', 'expects', 'property', 'scenario', 'walk'], at);
  const executes = strings(q.executes, `${at}.executes`, true);
  executes.forEach(p => path(p, `${at}.executes`));
  return { kind: string(q.kind, `${at}.kind`), checker: string(q.checker, `${at}.checker`), executes,
    expects: strings(q.expects, `${at}.expects`, true), property: nullableString(q.property, `${at}.property`),
    scenario: nullableString(q.scenario, `${at}.scenario`), walk: nullableString(q.walk, `${at}.walk`) };
}
export function parseMappingTarget(x: unknown, at = 'target'): MappingTarget {
  const t = object(x, at);
  if (t.kind === 'knowledge') { fields(t, ['kind', 'ref', 'revision'], at); return { kind: 'knowledge', ...pin({ ref: t.ref, revision: t.revision }, at) }; }
  const dossier = match(t.dossier, DOSSIER_REF, `${at}.dossier`);
  if (t.kind === 'passage') {
    fields(t, ['kind', 'dossier', 'id', 'side'], at);
    if (dossier.startsWith('compositions/') && typeof t.id === 'string' && /^[AON][1-9]\d*$/.test(t.id)) fail(`${at}: a composition property requires a cell target`);
    return { kind: 'passage', dossier, id: match(t.id, /^[A-Z][1-9]\d*$/, `${at}.id`), side: choice(t.side, ['chart', 'model'], `${at}.side`) };
  }
  if (t.kind === 'cell') {
    fields(t, ['kind', 'dossier', 'property', 'scenario'], at);
    if (!dossier.startsWith('compositions/')) fail(`${at}: a cell must target a composition`);
    return { kind: 'cell', dossier, property: match(t.property, /^[AON][1-9]\d*$/, `${at}.property`), scenario: string(t.scenario, `${at}.scenario`) };
  }
  if (t.kind === 'walk') {
    fields(t, ['kind', 'dossier', 'id', 'scenario'], at);
    const scenario = nullableString(t.scenario, `${at}.scenario`);
    if (dossier.startsWith('parts/') ? scenario !== null : scenario === null) fail(`${at}: walk scenario must be null for a part and explicit for a composition`);
    return { kind: 'walk', dossier, id: match(t.id, /^W[1-9]\d*$/, `${at}.id`), scenario };
  }
  if (t.kind === 'answer') {
    fields(t, ['kind', 'dossier', 'question', 'check'], at);
    return { kind: 'answer', dossier, question: question(t.question, `${at}.question`), check: string(t.check, `${at}.check`) };
  }
  return fail(`${at}.kind must be passage, cell, walk, answer or knowledge`);
}
function mapping(x: unknown, at: string): Mapping {
  const m = fields(x, ['id', 'target', 'relation', 'rationale', 'limitations'], at);
  return { id: match(m.id, MAPPING_ID, `${at}.id`), target: parseMappingTarget(m.target, `${at}.target`), relation: choice(m.relation, ['supports', 'challenges', 'illustrates'], `${at}.relation`), rationale: string(m.rationale, `${at}.rationale`), limitations: strings(m.limitations, `${at}.limitations`) };
}
function claim(x: unknown, at: string): Claim {
  const c = fields(x, ['id', 'kind', 'statement', 'scope', 'assumptions', 'mappings'], at);
  const s = fields(c.scope, ['level', 'description', 'pins'], `${at}.scope`);
  const level = choice(s.level, ['model', 'source', 'deployment'], `${at}.scope.level`);
  const pins = array(s.pins, `${at}.scope.pins`).map((p, i) => pin(p, `${at}.scope.pins[${i}]`));
  unique(pins, p => p.ref, `${at}.scope.pins`);
  if (level !== 'model' && pins.length === 0) fail(`${at}.scope: ${level} claims require pins`);
  const mappings = array(c.mappings, `${at}.mappings`).map((m, i) => mapping(m, `${at}.mappings[${i}]`));
  unique(mappings, m => m.id, `${at}.mappings`);
  return { id: match(c.id, CLAIM_ID, `${at}.id`), kind: choice(c.kind, ['descriptive', 'requirement'], `${at}.kind`), statement: string(c.statement, `${at}.statement`), scope: { level, description: string(s.description, `${at}.scope.description`), pins }, assumptions: strings(c.assumptions, `${at}.assumptions`), mappings };
}
export function parseCollection(text: string): ParsedRecord<CollectionRecord> {
  return document(text, x => {
    const c = fields(x, ['format', 'behaviors'], 'collection');
    const behaviors = strings(c.behaviors, 'collection.behaviors', true);
    behaviors.forEach(id => match(id, BEHAVIOR_ID, 'collection.behaviors'));
    return { format: choice(c.format, [COLLECTION_FORMAT], 'collection.format'), behaviors };
  });
}
export function parseBehavior(text: string, expectedId?: string): ParsedRecord<BehaviorRecord> {
  return document(text, x => {
    const b = fields(x, ['format', 'id', 'title', 'claims'], 'behavior');
    const id = match(b.id, BEHAVIOR_ID, 'behavior.id');
    if (expectedId !== undefined && id !== expectedId) fail(`behavior id ${id} does not match filename ${expectedId}.md`);
    const claims = array(b.claims, 'behavior.claims').map((c, i) => claim(c, `behavior.claims[${i}]`));
    if (claims.length === 0) fail('behavior.claims must not be empty');
    unique(claims, c => c.id, 'behavior.claims');
    return { format: choice(b.format, [BEHAVIOR_FORMAT], 'behavior.format'), id, title: string(b.title, 'behavior.title'), claims };
  });
}
/** What a review binds of a behavior file, part by part: the digest of each claim's JSON value with its
 * keys sorted, and of the rest of the JSON object followed by a newline and the Markdown after the block. */
export function behaviorParts(text: string): BehaviorParts {
  const parsed = parseBehavior(text);
  const { claims, ...rest } = parseUniqueJson(HEADER.exec(text)![1]) as Record<string, unknown> & { claims: unknown[] };
  return {
    claims: Object.fromEntries(parsed.record.claims.map((claim, i) => [claim.id, recordDigest(canonical(claims[i]))])),
    explanation: recordDigest(`${canonical(rest)}\n${parsed.body}`),
  };
}
// The path of a subject behavior's file under the root, which a review binds part by part.
export const behaviorPath = (dossier: string, id: string): string => `${dossier}/behaviors/${id}.md`;
export function reviewCoverageItems(subject: ReviewSubject): string[] {
  return [...subject.behaviors.flatMap(id => ['claims', 'scope', 'mappings', 'explanation'].map(item => `behavior:${id}:${item}`)),
    ...Array.from({ length: 20 }, (_, i) => `formal:${i + 1}`), ...(subject.kind === 'dossier' ? ['collection:orientation', 'collection:coverage'] : [])];
}
function basis(x: unknown, at: string): ReviewBasisEntry {
  const parted = Object.hasOwn(object(x, at), 'claims') || Object.hasOwn(object(x, at), 'explanation');
  const b = fields(x, ['role', 'root', 'path', 'sha256', ...(parted ? ['claims', 'explanation'] : [])], at);
  const entry: ReviewBasisEntry = { role: choice(b.role, ['required', 'additional'], `${at}.role`), root: choice(b.root, ['dossiers', 'knowledge'], `${at}.root`), path: path(b.path, `${at}.path`), sha256: match(b.sha256, SHA256, `${at}.sha256`) };
  if (!parted) return entry;
  const claims = object(b.claims, `${at}.claims`);
  if (!Object.keys(claims).length) fail(`${at}.claims must not be empty`);
  for (const [id, digest] of Object.entries(claims)) { match(id, CLAIM_ID, `${at}.claims`); match(digest, SHA256, `${at}.claims.${id}`); }
  return { ...entry, claims: { ...claims } as Record<string, string>, explanation: match(b.explanation, SHA256, `${at}.explanation`) };
}
function assessment(x: unknown, at: string): ReviewAssessment {
  const a = fields(x, ['mapping', 'result', 'rationale', 'limitations'], at);
  return { mapping: match(a.mapping, QUALIFIED_MAPPING, `${at}.mapping`), result: choice(a.result, ['supported', 'too-broad', 'contradicted', 'inconclusive'], `${at}.result`), rationale: string(a.rationale, `${at}.rationale`), limitations: strings(a.limitations, `${at}.limitations`) };
}
function replacement(x: unknown, at: string): AssessmentReplacement {
  const r = fields(x, ['review', 'sha256', 'mappings', 'reason'], at), review = path(r.review, `${at}.review`);
  if (!review.startsWith('reviews/') || !review.endsWith('.md')) fail(`${at}.review must name a Markdown file under reviews/`);
  const mappings = strings(r.mappings, `${at}.mappings`, true);
  if (!mappings.length) fail(`${at}.mappings must not be empty`);
  mappings.forEach(m => match(m, QUALIFIED_MAPPING, `${at}.mappings`));
  return { review, sha256: match(r.sha256, SHA256, `${at}.sha256`), mappings, reason: string(r.reason, `${at}.reason`) };
}
export function parseReview(text: string): ParsedRecord<ReviewRecord> {
  return document(text, x => {
    const r = fields(x, ['format', 'subject', 'basis', 'coverage', 'replaces', 'assessments'], 'review');
    const s = fields(r.subject, ['kind', 'dossier', 'behaviors'], 'review.subject');
    const subject: ReviewSubject = { kind: choice(s.kind, ['behavior', 'dossier'], 'review.subject.kind'), dossier: match(s.dossier, DOSSIER_REF, 'review.subject.dossier'), behaviors: strings(s.behaviors, 'review.subject.behaviors', true) };
    subject.behaviors.forEach(id => match(id, BEHAVIOR_ID, 'review.subject.behaviors'));
    if (subject.kind === 'behavior' && subject.behaviors.length !== 1) fail('a behavior review must name exactly one behavior');
    const items = array(r.basis, 'review.basis').map((b, i) => basis(b, `review.basis[${i}]`));
    unique(items, b => `${b.root}:${b.path}`, 'review.basis');
    // The entry for each of the subject's behavior files binds its claims and its explanation; no other does.
    const behaviorFiles = new Set(subject.behaviors.map(id => behaviorPath(subject.dossier, id)));
    items.forEach((b, i) => {
      const own = b.root === 'dossiers' && behaviorFiles.has(b.path);
      if (own && !b.claims) fail(`review.basis[${i}] binds a subject behavior file and must bind its claims and explanation`);
      if (!own && b.claims) fail(`review.basis[${i}] binds claims and an explanation, which only the entry for a subject behavior file does`);
    });
    const c = fields(r.coverage, ['examined', 'unexamined'], 'review.coverage');
    const examined = strings(c.examined, 'review.coverage.examined', true);
    const unexamined = array(c.unexamined, 'review.coverage.unexamined').map((x, i) => { const u = fields(x, ['item', 'reason'], `review.coverage.unexamined[${i}]`); return { item: string(u.item, 'coverage item'), reason: string(u.reason, 'coverage reason') }; });
    const keys = [...examined, ...unexamined.map(u => u.item)];
    if (new Set(keys).size !== keys.length) fail('review.coverage contains a duplicate or both examined and unexamined item');
    const requiredKeys = reviewCoverageItems(subject);
    if (keys.length !== requiredKeys.length || keys.some(key => !requiredKeys.includes(key))) fail('review.coverage must account for exactly the subject behavior, formal and collection items');
    const assessments = array(r.assessments, 'review.assessments').map((a, i) => assessment(a, `review.assessments[${i}]`));
    unique(assessments, a => a.mapping, 'review.assessments');
    for (const a of assessments) if (!subject.behaviors.includes(a.mapping.split('/')[0])) fail(`assessment ${a.mapping} is outside the review subject`);
    const replaces = array(r.replaces, 'review.replaces').map((a, i) => replacement(a, `review.replaces[${i}]`));
    const replaced = replaces.flatMap(r => r.mappings.map(m => `${r.review}#${m}`));
    if (new Set(replaced).size !== replaced.length) fail('review.replaces contains a duplicate prior assessment');
    for (const r of replaces) for (const m of r.mappings) if (!assessments.some(a => a.mapping === m)) fail(`replacement ${m} has no assessment in this review`);
    return { format: choice(r.format, [REVIEW_FORMAT], 'review.format'), subject, basis: items, coverage: { examined, unexamined }, replaces, assessments };
  });
}

/** The digest of a UTF-8 regular file's bytes, with the checks readRecordFile makes. */
export function recordFileDigest(root: string, file: string, allowInternalSymlinks = false): string {
  return cachedFileHash(checkedRecordPath(root, file, allowInternalSymlinks), bytes => { new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); });
}
/** Read a UTF-8 regular file, refusing symbolic links on every path component. */
export function readRecordFile(root: string, file: string, allowInternalSymlinks = false): string {
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(readFileSync(checkedRecordPath(root, file, allowInternalSymlinks)));
}
function checkedRecordPath(root: string, file: string, allowInternalSymlinks: boolean): string {
  path(file, 'file');
  const base = resolve(root), target = resolve(base, file);
  const rel = relative(base, target);
  if (rel.startsWith(`..${sep}`) || isAbsolute(rel)) fail(`file escapes root: ${file}`);
  let current = base;
  if (lstatSync(base).isSymbolicLink() && !allowInternalSymlinks) fail(`symbolic link is not allowed: ${base}`);
  for (const segment of file.split('/')) {
    current = join(current, segment);
    if (lstatSync(current).isSymbolicLink() && !allowInternalSymlinks) fail(`symbolic link is not allowed: ${file}`);
  }
  const resolvedBase = realpathSync(base), resolvedTarget = realpathSync(target);
  const resolvedRelative = relative(resolvedBase, resolvedTarget);
  if (resolvedRelative === '..' || resolvedRelative.startsWith(`..${sep}`) || isAbsolute(resolvedRelative)) fail(`symbolic link escapes root: ${file}`);
  if (!statSync(target).isFile()) fail(`not a regular file: ${file}`);
  return target;
}
export function loadBehaviorCollection(dossierDir: string): BehaviorCollection {
  const out: BehaviorCollection = { collection: null, behaviors: [], issues: [] };
  try { out.collection = parseCollection(readRecordFile(dossierDir, 'README.md')); }
  catch (error) { out.issues.push({ path: 'README.md', message: (error as Error).message }); }
  const found = new Map<string, ParsedRecord<BehaviorRecord>>();
  try {
    const dir = join(dossierDir, 'behaviors');
    if (lstatSync(dir).isSymbolicLink() || !lstatSync(dir).isDirectory()) fail('behaviors must be a directory, not a symbolic link');
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = `behaviors/${entry.name}`;
      try {
        if (entry.isSymbolicLink()) fail('symbolic links are not allowed');
        if (entry.name === '.gitkeep' && entry.isFile()) continue;
        if (!entry.isFile() || !entry.name.endsWith('.md') || !BEHAVIOR_ID.test(entry.name.slice(0, -3))) fail('behavior files must be named <behavior-id>.md');
        const id = entry.name.slice(0, -3);
        found.set(id, parseBehavior(readRecordFile(dossierDir, file), id));
        if (out.collection && !out.collection.record.behaviors.includes(id)) fail(`behavior ${id} is not listed in README.md`);
      } catch (error) { out.issues.push({ path: file, message: (error as Error).message }); }
    }
  } catch (error) { out.issues.push({ path: 'behaviors', message: (error as Error).message }); }
  for (const id of out.collection?.record.behaviors || []) {
    const behavior = found.get(id);
    if (behavior) out.behaviors.push(behavior);
    else out.issues.push({ path: `behaviors/${id}.md`, message: `listed behavior ${id} is missing or invalid` });
  }
  return out;
}
