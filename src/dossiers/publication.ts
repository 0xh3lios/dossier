// Writers of integrity authority. Locks coordinate local processes; they are
// transient and never supply evidence. No timeout-based lock stealing.
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { hostname } from 'node:os';
import { randomUUID } from 'node:crypto';
import { fileHash, sha256 } from '../hash.ts';
import { UsageError } from './root.ts';
import { forgets, forgottenAnswers, formatDecision, parseDecisions } from './decisions.ts';
import type { NewDecision } from './decisions.ts';
import { INTEGRITY, dossierRoot, prefixHead, readIntegrity, requireCurrent, validateIntegrity } from './integrity.ts';
import type { Integrity } from './integrity.ts';
import { readBundle, TRIAL_ID } from '../trials/trials.ts';
import type { Bundle } from '../trials/trials.ts';
import { CANDIDATE, entryName, entryOf, entryProblem, entryText, EVIDENCE, questionGone, readEvidence, readingClassification, rule, RUNNING } from '../trials/answers.ts';
import type { AnswerRead, Entry, Present } from '../trials/answers.ts';
import { basisMoved, basisNow } from '../verify/lapse.ts';
import type { Prose } from '../verify/lapse.ts';
import { bundleDigest } from '../trials/receipt.ts';

export const LOCK = '.publication-lock';
const RECOVERY_LOCK = '.publication-lock-recovery';
interface LockOwner { host: string; pid: number; token: string }
export interface PublicationOptions { boundary?: (name: string) => void }
const boundary = (options: PublicationOptions, name: string) => options.boundary?.(name);
const refuse = (reason: string): never => { throw new UsageError(reason); };

function ownerAt(path: string): LockOwner {
  try {
    const stat = lstatSync(path);
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error();
    const owner = JSON.parse(readFileSync(path, 'utf8'));
    if (typeof owner.host !== 'string' || !Number.isSafeInteger(owner.pid) || owner.pid <= 0 || typeof owner.token !== 'string' || !owner.token) throw new Error();
    return owner;
  } catch { return refuse(`unreadable publication lock at ${path}; inspect it before explicit recovery`); }
}

export interface LockInspection {
  state: 'absent' | 'dead-local' | 'live-local' | 'foreign' | 'unreadable' | 'unknown-local' | 'recovery-in-progress';
  reason: string;
  owner?: LockOwner;
}
function inspectLock(path: string): LockInspection {
  // lstat also observes dangling links; none of the inspection paths writes.
  try { lstatSync(path); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { state: 'absent', reason: 'no publication lock' };
    return { state: 'unreadable', reason: `cannot inspect publication lock: ${(error as Error).message}` };
  }
  let owner: LockOwner;
  try { owner = ownerAt(path); } catch (error) { return { state: 'unreadable', reason: (error as Error).message }; }
  if (owner.host !== hostname()) return { state: 'foreign', owner, reason: 'cannot recover a lock owned by another host' };
  try { process.kill(owner.pid, 0); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') return { state: 'dead-local', owner, reason: `local publication owner ${owner.pid} no longer exists` };
    return { state: 'unknown-local', owner, reason: `cannot establish whether publication owner ${owner.pid} is alive` };
  }
  return { state: 'live-local', owner, reason: `publication owner ${owner.pid} is still alive; refusing lock recovery` };
}

export function inspectPublicationLock(dir: string): LockInspection {
  const guard = inspectLock(join(dir, RECOVERY_LOCK));
  if (guard.state !== 'absent') return { state: 'recovery-in-progress', reason: `publication recovery guard exists (${guard.reason}); inspect it with all writers stopped before manual recovery`, owner: guard.owner };
  return inspectLock(join(dir, LOCK));
}
function ownLock(path: string): { owner: LockOwner; release: () => void } {
  const owner = { host: hostname(), pid: process.pid, token: randomUUID() };
  let fd: number;
  try { fd = openSync(path, 'wx', 0o600); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'EEXIST') return refuse(`publication is locked at ${path}; a live writer must finish, or recover a demonstrably dead local owner explicitly`); throw error; }
  try { writeFileSync(fd, JSON.stringify(owner) + '\n'); fsyncSync(fd); } finally { closeSync(fd); }
  const release = () => {
    if (!existsSync(path) || ownerAt(path).token !== owner.token) return refuse('publication lock ownership changed; refusing to remove another writer\'s lock');
    unlinkSync(path);
  };
  return { owner, release };
}

export function acquirePublicationLock(dir: string): () => void {
  const guard = join(dir, RECOVERY_LOCK);
  if (existsSync(guard)) return refuse('publication lock recovery is in progress');
  const lock = ownLock(join(dir, LOCK));
  // A reclaimer may have entered after the first check. All acquirers honor its
  // guard before doing work, so only one reclaimer can remove a dead lock.
  if (existsSync(guard)) { lock.release(); return refuse('publication lock recovery is in progress'); }
  return lock.release;
}

export function recoverPublicationLock(dir: string): void {
  const guard = ownLock(join(dir, RECOVERY_LOCK));
  try {
    const path = join(dir, LOCK);
    const inspected = inspectLock(path);
    if (inspected.state === 'absent') return;
    if (inspected.state !== 'dead-local') return refuse(inspected.reason);
    const owner = inspected.owner!;
    if (ownerAt(path).token !== owner.token) return refuse('publication owner changed during recovery');
    unlinkSync(path);
  } finally { guard.release(); }
}

export function withPublicationLock<T>(dir: string, body: () => T): T {
  const release = acquirePublicationLock(dir);
  try { return body(); } finally { release(); }
}

export function flushDirectory(dir: string): void {
  const fd = openSync(dir, 'r');
  try { fsyncSync(fd); } finally { closeSync(fd); }
}

export function durableWrite(path: string, data: string, options: PublicationOptions = {}, label = 'record'): void {
  const temporary = join(dirname(path), `.${basename(path)}.${randomUUID()}.tmp`);
  const fd = openSync(temporary, 'wx', 0o600);
  try {
    writeFileSync(fd, data); boundary(options, `${label}:temporary-written`);
    fsyncSync(fd); boundary(options, `${label}:temporary-flushed`);
  } finally { closeSync(fd); }
  renameSync(temporary, path); boundary(options, `${label}:replaced`);
  flushDirectory(dirname(path)); boundary(options, `${label}:directory-flushed`);
}

function flushTree(dir: string): void {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name), stat = lstatSync(path);
    if (stat.isSymbolicLink()) return refuse(`a sealed execution cannot contain a symbolic link: ${name}`);
    if (stat.isDirectory()) flushTree(path);
    else if (stat.isFile()) { const fd = openSync(path, 'r'); try { fsyncSync(fd); } finally { closeSync(fd); } }
    else return refuse(`not a regular execution artifact: ${name}`);
  }
  flushDirectory(dir);
}

export function writeIntegrity(dir: string, value: Integrity, options: PublicationOptions = {}): void {
  validateIntegrity(value);
  durableWrite(join(dir, INTEGRITY), JSON.stringify(value, null, 2) + '\n', options, 'manifest');
}

export function currentManifest(dir: string, allowPendingDecisions = false): Integrity {
  requireCurrent(dossierRoot(dir));
  const record = readIntegrity(dir);
  const problems = record.problems.filter(p => !(allowPendingDecisions && p.name === 'decision publication incomplete'));
  if (!record.manifest || problems.length) return refuse(problems.map(p => `${p.name}: ${p.where}`).join('; ') || 'integrity is unavailable');
  return record.manifest;
}

const sorted = (value: object) => JSON.stringify(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
// The dossier a folder holds, as an entry names it: parts/<id> or compositions/<id>.
const refOf = (dir: string) => `${basename(dirname(dir))}/${basename(dir)}`;
// The bundle of a sealed trial waiting in .running/<id>/, checked against its receipt, its call and its
// result before its answer is published, with its digest. Anything else is refused.
export function validateBundle(dir: string, id: string): { bundle: Bundle; digest: string } {
  if (!TRIAL_ID.test(id)) return refuse('invalid trial id');
  const staging = join(dir, RUNNING), folder = join(staging, id);
  const parentStat = lstatSync(staging);
  if (parentStat.isSymbolicLink() || !parentStat.isDirectory()) return refuse(`${RUNNING}/ must be a directory, not a symbolic link or special file`);
  const bundle = readBundle(folder, id);
  const result = bundle.result, receipt = bundle.receipt, call = bundle.call;
  const ref = refOf(dir);
  if (bundle.problems.length || bundle.stray.length || !result || !receipt || !call || call.errors.length) return refuse(`invalid trial candidate ${id}: ${[...bundle.problems, ...bundle.stray, ...(call?.errors || [])].join('; ')}`);
  if (result.id !== id || result.dossier !== ref || result.kind !== bundle.kind || call.kind !== result.kind) return refuse(`trial identity mismatch: ${id}`);
  if (!['as-called', 'miscalled', 'aborted'].includes(result.result) || !result.snapshot?.passages || !result.outcomes || !result.expect || !result.executed || !receipt.executed || !receipt.files) return refuse(`incomplete observation: ${id}`);
  const checker = call.kind === 'blunder'
    ? call.executes.some(p => p.endsWith('.json')) ? 'chart' : call.executes.some(p => p.endsWith('.als')) ? 'alloy' : call.mode ? 'apalache' : 'tlc'
    : call.kind;
  if (result.checker !== checker) return refuse(`call and checker disagree: ${id}`);
  const aborted = result.result === 'aborted';
  if (checker === 'apalache') {
    if ((result.mode !== call.mode && !(aborted && result.mode == null)) || (call.mode === 'bounded' && result.length !== call.length && !(aborted && result.length == null))) return refuse(`call and Apalache mode or length disagree: ${id}`);
    if (!aborted && result.mode === 'inductive' && Object.values(result.outcomes).includes('holds')
      && !['base', 'step'].every(label => result.runs?.some(run => run.label === label && run.outcome === 'NoError' && run.exitcode === 0))) return refuse(`inductive evidence needs successful base and step observations: ${id}`);
  }
  if (checker === 'external' && result.runner !== call.runner && !(aborted && result.runner == null)) return refuse(`call and external runner disagree: ${id}`);
  if (checker === 'chart' && result.limitHit && result.result !== 'aborted') return refuse(`limited chart exploration cannot be successful evidence: ${id}`);
  if (sorted(result.executed) !== sorted(receipt.executed) || sorted(result.expect) !== sorted(call.expect)
    || JSON.stringify(Object.keys(result.executed).sort()) !== JSON.stringify([...call.executes].sort())
    || (result.property || null) !== call.property || (result.scenario || null) !== call.scenario || (result.walk || null) !== call.walk) return refuse(`call, result and receipt disagree: ${id}`);
  for (const [name, digest] of Object.entries(receipt.files)) {
    if (name.startsWith('/') || name.split(/[\\/]/).includes('..')) return refuse(`invalid sealed artifact path: ${name}`);
    const path = join(folder, name);
    if (!existsSync(path) || !lstatSync(path).isFile() || fileHash(path) !== digest) return refuse(`sealed artifact mismatch: ${name}`);
  }
  return { bundle, digest: bundleDigest(folder) };
}

// What a publication did with a trial's answer: wrote it, kept the recorded one, or refused it; the
// entry's name; why; whether it replaced a recorded answer; and the entries it dropped (ANSWER-DROP),
// those of gone questions and those of superseded answers.
export interface Publication { action: 'published' | 'kept' | 'refused'; name: string; reason?: string; replaced?: boolean; gone: string[]; superseded: string[] }
// What the rules need from the dossier as it stands: what lapse reads of its prose, what exists now,
// and, from verify, which of a list of answers are superseded (ANSWER-SUPERSEDED). Without the last, a
// publication drops no superseded answer.
export interface AnswerContext extends Prose { present: Present; superseded?: (answers: AnswerRead[]) => string[] }

// The superseded answers among the entries as a publication leaves them: the new answer in its
// question's place, when one is written, and the gone questions out. Only an entry the manifest binds
// at its digest is an answer here: an unbound or an edited one is void to verify, and stands in for nothing.
function supersededNow(answers: AnswerRead[], name: string, next: Entry | null, gone: string[], context: AnswerContext): string[] {
  if (!context.superseded) return [];
  const left = answers.filter(a => a.entry && !a.problems.length && !gone.includes(a.name) && !(next && a.name === name));
  if (next) left.push({ name, entry: next, reading: null, problems: [] });
  return context.superseded(left).filter(n => n !== name && !gone.includes(n));
}

const removeFile = (path: string) => { if (existsSync(path)) unlinkSync(path); };
// The names a publication drops, recorded beside the bundle from the manifest step to the file step.
// It sits beside the bundle in .running/, not in it, so that the bundle's digest is the same whether
// or not a publication was interrupted: .running/<id>.dropped.json.
const droppedPath = (dir: string, id: string) => join(dir, RUNNING, `${id}.dropped.json`);
// What an earlier, interrupted attempt at a publication had already dropped from the manifest, as it
// recorded them beside the bundle.
function droppedBefore(dir: string, id: string): { gone: string[]; superseded: string[] } {
  const path = droppedPath(dir, id);
  if (!existsSync(path)) return { gone: [], superseded: [] };
  const recorded = JSON.parse(readFileSync(path, 'utf8')) as { gone?: string[]; superseded?: string[] };
  return { gone: recorded.gone || [], superseded: recorded.superseded || [] };
}

// The folders a publication writes into: evidence/ and the local trials/ must be directories of this
// dossier, never a symbolic link or a special file that would carry a write elsewhere.
function ownFolder(dir: string, name: string): string {
  const path = join(dir, name);
  let stat;
  try { stat = lstatSync(path); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  if (stat && (stat.isSymbolicLink() || !stat.isDirectory())) return refuse(`${name}/ must be a directory, not a symbolic link or special file`);
  if (!stat) { mkdirSync(path); flushDirectory(dir); }
  return path;
}

// Move a run's bundle from .running/<id>/ to the local trials/<id>/, where the agent who ran it can read it.
function shelve(dir: string, id: string, staging: string): void {
  flushTree(staging);
  ownFolder(dir, 'trials');
  renameSync(staging, join(dir, 'trials', id));
  flushDirectory(join(dir, 'trials'));
}

// Publish the answer of a sealed trial in .running/<id>/ under the evidence rules (STORE-ANSWER): a
// candidate entry beside the bundle, its digest bound in integrity.json, the candidate renamed into
// evidence/, the replaced answer's reading and the dropped entries removed (ANSWER-DROP), the bundle
// shelved in trials/<id>/.
export function publishAnswer(dir: string, id: string, context: AnswerContext, options: PublicationOptions = {}): Publication {
  return withPublicationLock(dir, () => publishAnswerLocked(dir, id, context, options));
}

function publishAnswerLocked(dir: string, id: string, context: AnswerContext, options: PublicationOptions): Publication {
  const manifest = currentManifest(dir);
  if (existsSync(join(dir, 'trials', id))) return refuse(`trials/${id} already exists; the same call ran on the same files this minute`);
  const staging = join(dir, RUNNING, id), candidate = join(staging, CANDIDATE);
  if (existsSync(candidate)) return refuse(`${RUNNING}/${id}/${CANDIDATE} is an earlier candidate; recover it explicitly`);
  const { bundle, digest } = validateBundle(dir, id);
  const callText = readFileSync(join(staging, 'call.md'), 'utf8');
  const next = entryOf(bundle.result!, bundle.call!, callText, digest);
  const name = entryName(next.question);
  const ref = refOf(dir);
  const folder = join(dir, EVIDENCE), path = join(folder, `${name}.json`), readingPath = join(folder, `${name}.md`);
  const forgotten = forgottenAnswers(parseDecisions(readIntegrity(dir).decisions).decisions);
  const bound = manifest.evidence[name];
  const forgives = forgets(forgotten[name], bound);
  let current: Entry | null = null;
  if (existsSync(path)) {
    const bytes = readFileSync(path);
    if (bound !== sha256(bytes)) return refuse(`${EVIDENCE}/${name}.json does not match integrity.json; restore it from version control before publishing`);
    current = JSON.parse(bytes.toString('utf8')) as Entry;
    const problem = entryProblem(current, name, ref);
    if (problem) return refuse(`${EVIDENCE}/${name}.json: ${problem}`);
  } else if (bound && !forgives) return refuse(`answer removed: ${EVIDENCE}/${name}.json is gone; restore it from version control, or the owner forgets ${name}@${bound.slice(0, 8)}`);
  const classification = current && existsSync(readingPath) ? readingClassification(readFileSync(readingPath, 'utf8')) : null;
  // What moved under the recorded answer, against the basis the new one rests on (src/verify/lapse.ts).
  const moved = current ? basisMoved(current, basisNow(next.basis), context) : [];
  const ruling = rule(current, next, { moved, forgiven: forgives, classification });
  if (ruling.action === 'refuse') {
    // A violation the owner may let go: say exactly what the owner's decision names.
    const reason = bound && /forget/.test(ruling.reason) ? `${ruling.reason}: dossier decide ${ref} forget ${name}@${bound.slice(0, 8)} -- "<the owner's words>"` : ruling.reason;
    shelve(dir, id, staging);
    return { action: 'refused', name, reason, gone: [], superseded: [] };
  }
  // The entries as verify reads them. The publication drops those whose question is gone (ANSWER-GONE),
  // bound or left unbound by an interrupted removal, and the superseded ones (ANSWER-SUPERSEDED), never
  // its own question's (ANSWER-DROP). A malformed entry is no one's to drop here: verify reports it.
  // What an earlier, interrupted attempt at this publication had already dropped from the manifest goes
  // with this attempt whatever has changed since.
  const answers = readEvidence(dir, manifest.evidence, forgotten, ref, context.present).answers;
  const recorded = droppedBefore(dir, id);
  const gone = [...new Set([...answers.filter(a => a.entry && questionGone(a.entry.question, context.present)).map(a => a.name), ...recorded.gone])].filter(n => n !== name);
  const superseded = [...new Set([...supersededNow(answers, name, ruling.action === 'write' ? ruling.entry : null, gone, context), ...recorded.superseded])].filter(n => n !== name && !gone.includes(n));
  const dropped = [...gone, ...superseded];
  const bindings = { ...manifest.evidence };
  for (const g of dropped) delete bindings[g];
  // What this publication drops, recorded beside the bundle before the manifest loses the lines, so
  // that a recovery deletes exactly those files, whatever changed since (STORE-RECOVER).
  if (dropped.length) writeFileSync(droppedPath(dir, id), JSON.stringify({ gone, superseded }));
  ownFolder(dir, EVIDENCE);
  if (lstatSync(join(dir, 'trials'), { throwIfNoEntry: false })?.isSymbolicLink()) return refuse('trials/ must be a directory, not a symbolic link or special file');
  if (ruling.action === 'write') {
    const text = entryText(ruling.entry);
    const fd = openSync(candidate, 'wx', 0o600);
    try { writeFileSync(fd, text); fsyncSync(fd); } finally { closeSync(fd); }
    flushDirectory(staging); boundary(options, 'answer:candidate');
    bindings[name] = sha256(text);
  }
  if (ruling.action === 'write' || dropped.length) writeIntegrity(dir, { ...manifest, evidence: bindings }, options);
  if (ruling.action === 'write') {
    // A new answer has no reading yet: the replaced answer's goes, and so does any stray one there,
    // before the answer is placed, so that no interruption leaves a reading beside the wrong answer.
    removeFile(readingPath);
    renameSync(candidate, path); boundary(options, 'answer:placed');
  }
  for (const g of dropped) { removeFile(join(folder, `${g}.json`)); removeFile(join(folder, `${g}.md`)); }
  flushDirectory(folder); boundary(options, 'answer:directory-flushed');
  removeFile(droppedPath(dir, id));
  shelve(dir, id, staging); boundary(options, 'answer:shelved');
  return ruling.action === 'write'
    ? { action: 'published', name, replaced: ruling.replaced, gone, superseded }
    : { action: 'kept', name, reason: ruling.reason, gone, superseded };
}

// Finish an interrupted publication (STORE-RECOVER): a candidate the manifest already binds is renamed
// into place; one it does not bind is discarded, and the run's answer is published again under the rules.
export function recoverAnswer(dir: string, id: string, context: AnswerContext, options: PublicationOptions = {}): Publication {
  return withPublicationLock(dir, () => {
    const manifest = currentManifest(dir);
    const staging = join(dir, RUNNING, id);
    if (!TRIAL_ID.test(id) || !existsSync(staging)) return refuse(`no run ${id} waits in ${RUNNING}/`);
    const candidate = join(staging, CANDIDATE);
    if (existsSync(candidate)) {
      const text = readFileSync(candidate, 'utf8');
      const entry = JSON.parse(text) as Entry;
      const name = entryName(entry.question);
      if (manifest.evidence[name] === sha256(text)) {
        const folder = ownFolder(dir, EVIDENCE), path = join(folder, `${name}.json`);
        const replaced = existsSync(path);
        removeFile(join(folder, `${name}.md`));
        renameSync(candidate, path);
        // The entries that publication unbound before it was interrupted, as it recorded them beside the
        // bundle: gone questions and superseded answers, whatever has changed since. Their files go.
        const recorded = droppedBefore(dir, id);
        const unbound = (n: string) => n !== name && !Object.hasOwn(manifest.evidence, n);
        const gone = recorded.gone.filter(unbound), superseded = recorded.superseded.filter(unbound);
        for (const g of [...gone, ...superseded]) { removeFile(join(folder, `${g}.json`)); removeFile(join(folder, `${g}.md`)); }
        flushDirectory(folder);
        removeFile(droppedPath(dir, id));
        shelve(dir, id, staging);
        return { action: 'published', name, replaced, gone, superseded };
      }
      unlinkSync(candidate);
      flushDirectory(staging);
    }
    return publishAnswerLocked(dir, id, context, options);
  });
}

// Caller holds the publication lock across command-specific validation too.
export function publishDecisionLocked(dir: string, decision: NewDecision, options: PublicationOptions = {}): string {
  const manifest = currentManifest(dir);
  const record = readIntegrity(dir);
  const lines = record.decisions.split(/\r?\n/).filter(Boolean);
  const line = formatDecision(decision, lines.at(-1));
  const text = record.decisions + (record.decisions && !record.decisions.endsWith('\n') ? '\n' : '') + line + '\n';
  durableWrite(join(dir, 'decisions.log'), text, options, 'decisions');
  writeIntegrity(dir, { ...manifest, decisionHead: prefixHead(text) }, options);
  return line;
}

export function recoverDecisions(dir: string, expectedSuffixDigest: string, options: PublicationOptions = {}): void {
  withPublicationLock(dir, () => {
    const manifest = currentManifest(dir, true);
    const record = readIntegrity(dir);
    if (!record.pendingDecisions.trim()) return;
    if (sha256(record.pendingDecisions) !== expectedSuffixDigest) return refuse('pending decision changed; inspect its exact words and supply its current digest before recovery');
    const text = readFileSync(join(dir, 'decisions.log'), 'utf8');
    const parsed = parseDecisions(text);
    if (parsed.broken || parsed.decisions.some(d => d.malformed)) return refuse('pending decision suffix is malformed or does not continue the committed chain');
    const pending = parseDecisions(record.pendingDecisions).decisions;
    if (pending.length !== 1) return refuse('recovery requires exactly one pending decision from an interrupted publication');
    const fd = openSync(join(dir, 'decisions.log'), 'r');
    try { fsyncSync(fd); } finally { closeSync(fd); }
    flushDirectory(dir);
    // Recovery adopts the exact recorded suffix. It does not fabricate or edit
    // owner words. CLI validation must show that suffix before explicit adoption.
    writeIntegrity(dir, { ...manifest, decisionHead: prefixHead(text) }, options);
  });
}
