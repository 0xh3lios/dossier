// Alloy 6 through its exec command: one command per trial; the outcome is
// read from the receipt the Analyzer writes and the presence of a solution.
import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';

export interface AlloyToolchain { java?: string; jar?: string; error?: string }
// What a run left, and the folder the Analyzer wrote; aborted when it could not start.
export interface AlloyRun {
  aborted?: string;
  argv?: string[];
  cwd?: string;
  stdout?: string;
  stderr?: string;
  exit?: number | null;
  signal?: NodeJS.Signals | null;
  seconds?: number;
  timedOut?: boolean;
  error?: string | null;
  outDir?: string;
}
// The Analyzer's own receipt.json, as far as it is read.
interface AnalyzerReceipt { commands?: Record<string, { name: string; type: string; overall: number; source: string; solution?: unknown[] }> }
// The one command, as result.json keeps it.
export interface AlloyCommandReceipt { name: string; type: string; overall: number; source: string; solutions: number }
export interface AlloyParsed {
  error?: string;
  type?: string;
  overall?: number;
  source?: string;
  sat?: boolean;
  xml?: string[];
  outcome?: string;
  receipt?: AlloyCommandReceipt;
}

export function toolchain(env: NodeJS.ProcessEnv = process.env): AlloyToolchain {
  const java = env.JAVA || 'java';
  const jar = env.ALLOY_JAR;
  if (!jar) return { error: 'ALLOY_JAR is not set; point it at the Alloy 6 distribution jar' };
  if (!existsSync(jar)) return { error: `ALLOY_JAR points at ${jar}, which does not exist` };
  return { java, jar };
}

export function run({ als, command, trialDir, timeoutSeconds = 600, env = process.env }: { als: string; command: string; trialDir: string; timeoutSeconds?: number; env?: NodeJS.ProcessEnv }): AlloyRun {
  const tc = toolchain(env);
  if (tc.error) return { aborted: tc.error };
  const cwd = dirname(als);
  const out = join(trialDir, 'alloy');
  const tmp = join(out, 'tmp');
  mkdirSync(tmp, { recursive: true });
  const argv = [tc.java!, `-Djava.io.tmpdir=${tmp}`, '-Djava.awt.headless=true', '-jar', tc.jar!, 'exec', '-q', '-c', command, '-t', 'xml', '-s', 'sat4j', '-r', '1', '-u', '-1', '-f', '-o', out, basename(als)];
  const started = Date.now();
  const r = spawnSync(argv[0], argv.slice(1), { cwd, encoding: 'utf8', timeout: timeoutSeconds * 1000, maxBuffer: 64 * 1024 * 1024, env });
  const seconds = (Date.now() - started) / 1000;
  return { argv, cwd, stdout: r.stdout || '', stderr: r.stderr || '', exit: r.status, signal: r.signal, seconds, timedOut: Boolean(r.error && (r.error as NodeJS.ErrnoException).code === 'ETIMEDOUT'), error: r.error && (r.error as NodeJS.ErrnoException).code !== 'ETIMEDOUT' ? r.error.message : null, outDir: out };
}

export function parse(outDir: string, command: string): AlloyParsed {
  const receiptPath = join(outDir, 'receipt.json');
  if (!existsSync(receiptPath)) return { error: 'the Analyzer wrote no receipt.json' };
  let receipt: AnalyzerReceipt;
  try { receipt = JSON.parse(readFileSync(receiptPath, 'utf8')); } catch (e) { return { error: `receipt.json unreadable: ${(e as Error).message}` }; }
  const entry = receipt.commands && receipt.commands[command];
  if (!entry) return { error: `receipt.json has no entry for command ${command}` };
  const xml = readdirSync(outDir).filter(f => f.endsWith('.xml'));
  const sat = Array.isArray(entry.solution) && entry.solution.length > 0 && xml.length > 0;
  const outcome = entry.type === 'check' ? (sat ? 'counterexample' : 'no counterexample') : (sat ? 'instance' : 'no instance');
  return { type: entry.type, overall: entry.overall, source: entry.source, sat, xml, outcome, receipt: { name: entry.name, type: entry.type, overall: entry.overall, source: entry.source, solutions: sat ? entry.solution!.length : 0 } };
}
