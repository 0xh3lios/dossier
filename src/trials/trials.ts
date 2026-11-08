// A trial's bundle, local to the machine that ran it: the call as captured, the checker's output,
// result.json, the receipt and the files its kind adds, in .running/<id>/ while the trial runs and
// publishes, then in trials/<id>/. The runner reads a sealed bundle and checks its receipt before it
// publishes the answer. Nothing else reads a bundle: verify reads entries.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCall } from './calls.ts';
import { inputIdentityProblem } from './answers.ts';
import { sealedArtifactName, sealedFileHashes } from './receipt.ts';
import type { Call, Outcome } from './calls.ts';
import type { Receipt } from './receipt.ts';
import type { AlloyCommandReceipt } from './checkers/alloy.ts';
import type { Answer, InputIdentity, Snapshot } from './answers.ts';

// result.json: the trial's answer, beside what its entry keeps apart from the answer, which are the
// question, the call's expectations, the basis and the establishing trial, and what only the bundle needs.
export interface TrialResult extends Answer {
  kind: string;
  checker: string;
  dossier: string;
  id: string;
  at: string;
  versions: Record<string, string>;
  // The checker's argv; for Alloy, the Analyzer's receipt of the command.
  command: string[] | string[][] | AlloyCommandReceipt | null;
  cwd: string | null;
  // Apalache runs twice for an inductive trial, and records both exit codes.
  exit: number | (number | null)[] | null;
  seconds: number | null;
  property: string | null;
  scenario: string | null;
  // The composition Walk a witness trial ran, beside its scenario; null for any other trial.
  walk?: string | null;
  executed: Record<string, string>;
  inputIdentity: InputIdentity;
  expect: Record<string, Outcome>;
  snapshot: Snapshot;
  // Alloy's instance files, under the bundle's alloy/.
  xml?: string[];
}
// A bundle as read: its call, result and receipt, the files that are none of its own, and what is
// wrong with it. A bundle with a problem or a stray file is not published.
export interface Bundle { id: string; dir: string; kind: string; call: Call | null; result: TrialResult | null; receipt: Receipt | null; problems: string[]; stray: string[] }

export const TRIAL_ID = /^(\d{4}-\d{2}-\d{2})-(\d{4})-(chart|blunder|tlc|apalache|alloy|external)-([0-9a-f]{6})$/;
// The bundle's files, and the Analyzer's receipt and instances under alloy/. TLC's states/ and
// Apalache's work folder are removed by the runner; either left behind is stray, and so is a reading,
// whose place is beside its entry in evidence/.
export const ALLOWED = new Set(['call.md', 'output.txt', 'result.json', 'receipt.json', 'blunder.diff', 'alloy']);
const EDITED: Record<string, string> = { 'call.md': 'call edited after execution', 'result.json': 'result edited', 'output.txt': 'output edited' };

export function readBundle(folder: string, id: string): Bundle {
  const b: Bundle = { id, dir: folder, kind: id.match(TRIAL_ID)?.[3] || '', call: null, result: null, receipt: null, problems: [], stray: [] };
  let files: Record<string, string>;
  try { files = sealedFileHashes(folder); }
  catch (error) { b.problems.push(`receipt artifacts unreadable: ${(error as Error).message}`); return b; }
  const has = (f: string) => existsSync(join(folder, f));
  // A dot entry, such as the .DS_Store a file browser leaves, is no one's record, as in a dossier folder.
  for (const entry of readdirSync(folder).sort()) if (!entry.startsWith('.') && !ALLOWED.has(entry)) b.stray.push(entry);
  if (has('call.md')) { try { b.call = parseCall(readFileSync(join(folder, 'call.md'), 'utf8')); } catch (e) { b.problems.push(`call.md unreadable: ${(e as Error).message}`); } }
  else b.problems.push('call.md missing');
  if (has('result.json')) { try { b.result = JSON.parse(readFileSync(join(folder, 'result.json'), 'utf8')) as TrialResult; } catch (e) { b.problems.push(`result.json unreadable: ${(e as Error).message}`); } }
  if (b.result) {
    const problem = inputIdentityProblem(b.result);
    if (problem) b.problems.push(`input identity malformed: ${problem}`);
  }
  if (!has('receipt.json')) { b.problems.push('trial without receipt'); return b; }
  try { b.receipt = JSON.parse(readFileSync(join(folder, 'receipt.json'), 'utf8')) as Receipt; } catch (e) { b.problems.push(`receipt unreadable: ${(e as Error).message}`); return b; }
  if (!b.receipt || typeof b.receipt.files !== 'object' || b.receipt.files === null || Array.isArray(b.receipt.files)) {
    b.problems.push('receipt unreadable: files must be a path-to-digest map'); return b;
  }
  for (const [file, label] of Object.entries(EDITED)) {
    if (!has(file)) { b.problems.push(`${file} missing`); continue; }
    const expected = b.receipt.files[file];
    if (!expected || files[file] !== expected) b.problems.push(label);
  }
  // A receipt may list only the primary three files; the bundle digest in the answer's entry covers the rest.
  for (const [file, expected] of Object.entries(b.receipt.files)) {
    if (!sealedArtifactName(file) || typeof expected !== 'string' || !/^[0-9a-f]{64}$/.test(expected)) { b.problems.push(`receipt artifact invalid: ${file}`); continue; }
    if (Object.hasOwn(EDITED, file)) continue;
    if (!Object.hasOwn(files, file)) b.problems.push(`receipt artifact missing: ${file}`);
    else if (files[file] !== expected) b.problems.push(`receipt artifact edited: ${file}`);
  }
  return b;
}
