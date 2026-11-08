// decisions.log: one line per decision, in the author's words, chained by the
// hash of the previous line. Only dossier decide writes it.
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { short } from '../hash.ts';
import { readIntegrity } from './integrity.ts';

// One well-formed line: when, the verb, its arguments (passage ids as id@hash among them), the words, the chain.
export interface Decision {
  line: number;
  time: string;
  verb: string;
  args: string[];
  ids: { id: string; hash: string }[];
  words: string;
  chain: string;
  raw: string;
  malformed?: false;
}
export interface MalformedDecision { line: number; raw: string; malformed: true }
export type DecisionLine = Decision | MalformedDecision;
// Where the chain first breaks, and why.
export interface ChainBreak { line: number; reason: string }
// What dossier decide appends.
export interface NewDecision { time: string; verb: string; args?: string[]; words?: string }
export type OwnerState = 'settled' | 'rejected' | 'unsettled';
export interface LatestDecision { verb: string; hash: string; time: string; words: string }
// An owner's acceptance of a cell's violation: the words, the property's hash, and the trial whose
// violation the owner was shown. It holds while the cell's deciding answer is the one that trial
// established and nothing moved under it; any new answer to the cell lapses it (cellsOf).
export interface AcceptedRisk { time: string; words: string; hash: string; trial: string | null }

// An answer the owner let go of, named by its entry and the first eight hex of the digest
// integrity.json bound when the owner forgot it.
export interface ForgottenAnswer { digest: string; time: string; words: string }
// An entry's name, as evidence/<name>.json, integrity.json and a forget give it.
export const ENTRY_NAME = /^[A-Za-z0-9][A-Za-z0-9-]*$/;
// forget <name>@<first eight hex of the entry's digest>
export const FORGET = new RegExp(`^(${ENTRY_NAME.source.slice(1, -1)})@([0-9a-f]{8})$`);
// Whether a forget names an entry as it stands: by the first eight hex of the digest integrity.json
// binds for it now.
export const forgets = (forget: { digest: string } | null | undefined, bound: string | null | undefined): boolean => Boolean(forget && bound && bound.startsWith(forget.digest));

export const GENESIS = '00000000';
export const VERBS = ['begin', 'accept', 'reject', 'answer', 'risk', 'retire', 'forget'];
const LINE = /^(\S+) (begin|accept|reject|answer|risk|retire|forget)((?: \S+)*) "((?:[^"\\]|\\.)*)" ([0-9a-f]{8})$/;
export const FILE = 'decisions.log';

export function parseDecisions(text: string): { decisions: DecisionLine[]; broken: ChainBreak | null } {
  const lines = text.split(/\r?\n/).filter(l => l.length > 0);
  const decisions: DecisionLine[] = [];
  let previous: string | null = null, broken: ChainBreak | null = null;
  lines.forEach((line, i) => {
    const m = line.match(LINE);
    if (!m) {
      if (!broken) broken = { line: i + 1, reason: 'malformed line' };
      decisions.push({ line: i + 1, raw: line, malformed: true });
      previous = line;
      return;
    }
    const expected = previous === null ? GENESIS : short(previous);
    if (m[5] !== expected && !broken) broken = { line: i + 1, reason: `chain ${m[5]} does not continue line ${i}` };
    const args = m[3].trim() ? m[3].trim().split(' ') : [];
    const ids = args.filter(a => /^[A-Z]\d+@[0-9a-f]{8}$/.test(a)).map(a => { const [id, hash] = a.split('@'); return { id, hash }; });
    decisions.push({ line: i + 1, time: m[1], verb: m[2], args, ids, words: JSON.parse(`"${m[4]}"`) as string, chain: m[5], raw: line });
    previous = line;
  });
  return { decisions, broken };
}

export function formatDecision({ time, verb, args = [], words = '' }: NewDecision, previousLine?: string | null): string {
  const chain = previousLine == null ? GENESIS : short(previousLine);
  return `${time} ${verb}${args.length ? ' ' + args.join(' ') : ''} ${JSON.stringify(words)} ${chain}`;
}

// The log is written whole beside itself and renamed over the old one, so a crash
// mid-write leaves the old log or the new one, never half a line.
export function appendDecision(path: string, decision: NewDecision): string {
  const existing = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const lines = existing.split(/\r?\n/).filter(l => l.length > 0);
  const line = formatDecision(decision, lines.length ? lines[lines.length - 1] : null);
  const head = existing && !existing.endsWith('\n') ? existing + '\n' : existing;
  const temporary = join(dirname(path), `.${basename(path)}.${process.pid}.tmp`);
  try {
    writeFileSync(temporary, head + line + '\n');
    renameSync(temporary, path);
  } finally { rmSync(temporary, { force: true }); }
  return line;
}

// The owner's column: the latest accept or reject on each id counts, at the hash it was made at.
// A risk names a property too, but it accepts a cell's violation, not the passage's words.
export function ownerColumn(decisions: DecisionLine[], hashes: Record<string, string>): { column: Record<string, OwnerState>; latest: Record<string, LatestDecision> } {
  const latest: Record<string, LatestDecision> = {};
  for (const dc of decisions) if (!dc.malformed && (dc.verb === 'accept' || dc.verb === 'reject')) for (const { id, hash } of dc.ids) latest[id] = { verb: dc.verb, hash, time: dc.time, words: dc.words };
  const column: Record<string, OwnerState> = {};
  for (const [id, current] of Object.entries(hashes)) {
    const l = latest[id];
    if (l && l.verb === 'accept' && l.hash === current) column[id] = 'settled';
    else if (l && l.verb === 'reject' && l.hash === current) column[id] = 'rejected';
    else column[id] = 'unsettled';
  }
  return { column, latest };
}

// The line that retired a dossier: its latest well-formed decision, when that is a retire.
// A begin after it reopens the dossier.
export function retiredBy(decisions: DecisionLine[]): Decision | null {
  const latest = [...decisions].reverse().find((d): d is Decision => !d.malformed);
  return latest && latest.verb === 'retire' ? latest : null;
}

// Whether the dossier in this folder is retired: verify, where and the compositions leave it out.
export function isRetired(dir: string): boolean {
  return retiredBy(parseDecisions(readIntegrity(dir).decisions).decisions) !== null;
}

// Each doubt's answer: the latest answer decision bound to the doubt's alternatives as they stand. A
// doubt's answer to other alternatives, or one with no hash, answers nothing.
export function answeredDoubts(decisions: DecisionLine[], hashes: Record<string, string>): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const dc of decisions) {
    if (dc.malformed || dc.verb !== 'answer') continue;
    const target = (dc.args[0] || '').match(/^(D\d+)(?:@([0-9a-f]{8}))?$/);
    if (!target) continue;
    out[target[1]] = target[2] && target[2] === hashes[target[1]] && dc.args.length === 2 && /^[ab]$/.test(dc.args[1]) ? dc.args[1] : null;
  }
  return out;
}

// Accepted residual risks, the latest decision on each cell: risk <Property>@<hash> <scenario>
// <trial> "<words>", where the trial is the one whose violation the owner was shown. Whether an
// acceptance still holds is the cell's to say, from its deciding answer.
export function acceptedRisks(decisions: DecisionLine[]): Record<string, AcceptedRisk> {
  const out: Record<string, AcceptedRisk> = {};
  for (const dc of decisions) {
    if (dc.malformed || dc.verb !== 'risk') continue;
    const [prop, scenario, trial] = dc.args;
    if (!prop || !scenario) continue;
    const [id, hash] = prop.split('@');
    if (id && hash) out[`${id}|${scenario}`] = { time: dc.time, words: dc.words, hash, trial: trial || null };
  }
  return out;
}

// The answers the owner let go of, the latest forget on each entry: forget <name>@<digest> "<words>".
// A forgotten removed answer covers nothing, and its missing file no longer trips answer removed. A
// forget that names the recorded entry lets a new answer replace its violation (ANSWER-VIOLATION).
export function forgottenAnswers(decisions: DecisionLine[]): Record<string, ForgottenAnswer> {
  const out: Record<string, ForgottenAnswer> = {};
  for (const dc of decisions) {
    if (dc.malformed || dc.verb !== 'forget') continue;
    const m = (dc.args[0] || '').match(FORGET);
    if (m) out[m[1]] = { digest: m[2], time: dc.time, words: dc.words };
  }
  return out;
}

// The hash a line is chained by, for the last line of the log: the ledger keeps it, so a log
// whose last line was removed or rewritten no longer holds it. Null for an empty log.
export function chainTip(decisions: DecisionLine[]): string | null {
  return decisions.length ? short(decisions[decisions.length - 1].raw) : null;
}

// Whether the log still holds the line a tip names: unchanged, or with lines appended after it.
export function holdsTip(decisions: DecisionLine[], tip: string): boolean {
  return decisions.some(dc => short(dc.raw) === tip);
}
