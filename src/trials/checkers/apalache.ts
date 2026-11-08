// Apalache through its apalache-mc launcher, on the modules TLC checks: a
// bounded check of an invariant, or the inductive step when --init names the
// invariant itself. The outcome is read from the checker's own outcome line
// and its final EXITCODE line, never from prose; a counterexample is read
// from the ITF trace it leaves in the work folder its output names.
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, delimiter, dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

export interface ApalacheToolchain { java?: string; bin?: string; error?: string }
export interface ApalacheRunOptions {
  tla: string;
  cfg?: string | null;
  inv?: string | null;
  init?: string | null;
  next?: string | null;
  length?: number | null;
  cinit?: string | null;
  trialDir: string;
  outDir?: string | null;
  timeoutSeconds?: number;
  env?: NodeJS.ProcessEnv;
}
// What a run left, and the folder Apalache wrote under; aborted when it could not start.
export interface ApalacheRun {
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
// A counterexample as the ITF file records it: the variable order, one object per state.
export interface ItfTrace { vars: string[]; states: Record<string, unknown>[] }
export interface ApalacheParsed {
  version: string | null;
  build: string | null;
  outcome: string;
  length: number | null;
  exitcode: number | null;
  violatedInvariant: { state: number; index: number } | null;
  errors: string[];
  trace: ItfTrace | null;
  runDir: string | null;
}

export function toolchain(env: NodeJS.ProcessEnv = process.env): ApalacheToolchain {
  const java = env.JAVA || 'java';
  const bin = env.APALACHE;
  if (!bin) return { error: 'APALACHE is not set; point it at the apalache-mc launcher script' };
  if (!existsSync(bin)) return { error: `APALACHE points at ${bin}, which does not exist` };
  return { java, bin };
}

// The launcher execs whatever `java` comes first on PATH, so a configured JAVA
// leads PATH and JAVA_HOME names the runtime two levels above it.
export function environment(env: NodeJS.ProcessEnv = process.env, extra: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  const out = { ...env, ...extra };
  if (env.JAVA) {
    const bin = dirname(resolve(env.JAVA));
    out.PATH = env.PATH ? `${bin}${delimiter}${env.PATH}` : bin;
    out.JAVA_HOME = dirname(bin);
  }
  return out;
}

export function run({ tla, cfg, inv, init, next, length, cinit, trialDir, outDir: given = null, timeoutSeconds = 600, env = process.env }: ApalacheRunOptions): ApalacheRun {
  const tc = toolchain(env);
  if (tc.error) return { aborted: tc.error };
  const cwd = dirname(tla);
  const outDir = given ? resolve(given) : resolve(trialDir, 'apalache');
  // The launcher makes a SANY scratch directory under TMPDIR, or under the
  // working directory when TMPDIR is unset: it goes under the trial, and away
  // after the run. The run directory itself stays for parse; the runner
  // removes it once the trace is in result.json.
  const tmp = join(outDir, 'tmp');
  mkdirSync(tmp, { recursive: true });
  // A deadlock is not a property: the TLC configurations say CHECK_DEADLOCK FALSE, and Apalache is
  // told the same, so a state with no successor is not reported in place of the invariant's answer.
  const argv = [tc.bin!, 'check', ...(inv ? [`--inv=${inv}`] : []), ...(length == null ? [] : [`--length=${length}`]), ...(init ? [`--init=${init}`] : []), ...(next ? [`--next=${next}`] : []),
    ...(cinit ? [`--cinit=${cinit}`] : []), ...(cfg ? [`--config=${relative(cwd, cfg) || basename(cfg)}`] : []), '--no-deadlock', `--out-dir=${outDir}`, basename(tla)];
  const started = Date.now();
  const r = spawnSync(argv[0], argv.slice(1), { cwd, encoding: 'utf8', timeout: timeoutSeconds * 1000, maxBuffer: 64 * 1024 * 1024, env: environment(env, { TMPDIR: tmp }) });
  const seconds = (Date.now() - started) / 1000;
  rmSync(tmp, { recursive: true, force: true });
  return { argv, cwd, stdout: r.stdout || '', stderr: r.stderr || '', exit: r.status, signal: r.signal, seconds, timedOut: Boolean(r.error && (r.error as NodeJS.ErrnoException).code === 'ETIMEDOUT'), error: r.error && (r.error as NodeJS.ErrnoException).code !== 'ETIMEDOUT' ? r.error.message : null, outDir };
}

// Every line Apalache logs ends in a severity letter and a time of day.
const STAMP = /\s+([IWE])@\d\d:\d\d:\d\d\.\d{3}\s*$/;
// Lines that announce the outcome rather than report an error.
const TALLY = /^(?:Found \d+ error\(s\)|Checker has found an error)$/;

export function parse(stdout: string | null | undefined, outDir?: string | null): ApalacheParsed {
  const out: ApalacheParsed = { version: null, build: null, outcome: 'aborted', length: null, exitcode: null, violatedInvariant: null, errors: [], trace: null, runDir: null };
  let beforeOutcome = true;
  for (const raw of String(stdout || '').split(/\r?\n/)) {
    const m = raw.match(STAMP);
    const severity = m ? m[1] : null;
    const text = (m ? raw.slice(0, m.index) : raw).trim();
    let r: RegExpMatchArray | null;
    if ((r = text.match(/^# APALACHE version: (\S+)(?: \| build: (\S+))?/))) { out.version = r[1]; out.build = r[2] || null; continue; }
    if ((r = text.match(/^The outcome is: (\w+)$/))) { out.outcome = r[1]; beforeOutcome = false; continue; }
    if ((r = text.match(/^Checker reports no error up to computation length (\d+)$/))) { out.length = Number(r[1]); continue; }
    if ((r = text.match(/^EXITCODE: (?:OK|ERROR \((\d+)\))$/))) { out.exitcode = r[1] == null ? 0 : Number(r[1]); beforeOutcome = false; continue; }
    if ((r = text.match(/^State (\d+): (?:state|action) invariant (\d+) violated\.$/))) { out.violatedInvariant = { state: Number(r[1]), index: Number(r[2]) }; continue; }
    if (beforeOutcome && text && (severity === 'E' || /error/i.test(text)) && !TALLY.test(text)) out.errors.push(text);
  }
  const t = trace(outDir, namedRun(stdout, outDir));
  out.runDir = t.runDir;
  out.trace = t.trace;
  if (t.error) out.errors.push(t.error);
  return out;
}

// Apalache writes <outDir>/<Spec>.tla/<timestamp>_<id>/ per run and prints
// "Output directory: <that folder>". The folder it names, found again under
// outDir, is this run's own: the two runs of an inductive trial may share an
// output directory, and the newer one is the base, not the step.
export function namedRun(stdout: string | null | undefined, outDir: string | null | undefined): string | null {
  if (!outDir) return null;
  for (const raw of String(stdout || '').split(/\r?\n/)) {
    const m = raw.replace(STAMP, '').trim().match(/^Output directory: (.+)$/);
    if (!m) continue;
    const parts = m[1].split(/[\\/]+/).filter(Boolean);
    if (parts.length < 2) return null;
    const dir = join(outDir, parts[parts.length - 2], parts[parts.length - 1]);
    return existsSync(dir) ? dir : null;
  }
  return null;
}

// Without a named folder, the newest run in outDir.
function newestRun(outDir: string | null | undefined): string | null {
  if (!outDir || !existsSync(outDir)) return null;
  const runs: string[] = [];
  for (const spec of readdirSync(outDir, { withFileTypes: true })) {
    if (!spec.isDirectory() || !spec.name.endsWith('.tla')) continue;
    for (const run of readdirSync(join(outDir, spec.name), { withFileTypes: true })) if (run.isDirectory()) runs.push(join(outDir, spec.name, run.name));
  }
  runs.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs || basename(b).localeCompare(basename(a)));
  return runs[0] || null;
}

// The counterexample as the ITF file records it: the variable order and one
// plain object per state, without the "#meta" entry. Values keep the ITF
// encoding; plain() turns one into a JavaScript value.
export function trace(outDir: string | null | undefined, named: string | null = null): { runDir: string | null; trace: ItfTrace | null; error?: string } {
  const runDir = named || newestRun(outDir);
  const file = runDir && join(runDir, 'violation1.itf.json');
  if (!file || !existsSync(file)) return { runDir, trace: null };
  let itf: { vars?: string[]; states?: Record<string, unknown>[] };
  try { itf = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { return { runDir, trace: null, error: `violation1.itf.json unreadable: ${(e as Error).message}` }; }
  const states = (itf.states || []).map(s => { const { '#meta': meta, ...rest } = s; return rest; });
  return { runDir, trace: { vars: itf.vars || [], states } };
}

export function plain(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(plain);
  if (v && typeof v === 'object') {
    if ('#bigint' in v) { const n = Number(v['#bigint']); return Number.isSafeInteger(n) ? n : v['#bigint']; }
    if ('#set' in v) return (v['#set'] as unknown[]).map(plain);
    if ('#tup' in v) return (v['#tup'] as unknown[]).map(plain);
    if ('#map' in v) return (v['#map'] as [unknown, unknown][]).map(([k, val]) => [plain(k), plain(val)]);
    if ('#unserializable' in v) return v['#unserializable'];
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) out[k] = plain(val);
    return out;
  }
  return v;
}

// What the run establishes for the invariant it was asked about, and no more.
export function outcomes(parsed: Pick<ApalacheParsed, 'outcome'>, inv: string): Record<string, string> {
  const o = parsed.outcome === 'NoError' ? 'holds' : parsed.outcome === 'Error' ? 'violated' : 'unknown';
  return { [inv]: o };
}

// What a trial's runs establish together for its invariant: holds when every run found no error,
// violated when one found a counterexample, and nothing when one stopped otherwise. A deadlock or a
// runtime error is not the invariant failing, so it is no violation, and the reason says what it was.
export function verdict(runs: { label: string; parsed: Pick<ApalacheParsed, 'outcome' | 'errors'> }[], inv: string): { outcome: 'holds' | 'violated' | 'unknown'; reason: string | null } {
  const aborted = runs.find(r => r.parsed.outcome === 'aborted');
  if (aborted) return { outcome: 'unknown', reason: aborted.parsed.errors[0] || 'Apalache did not complete' };
  const other = runs.find(r => r.parsed.outcome !== 'NoError' && r.parsed.outcome !== 'Error');
  if (other) return { outcome: 'unknown', reason: `the ${other.label} run ended in ${other.parsed.outcome}, which neither holds nor violates ${inv}` };
  return { outcome: runs.every(r => r.parsed.outcome === 'NoError') ? 'holds' : 'violated', reason: null };
}

export function version(env: NodeJS.ProcessEnv = process.env): string | null {
  const tc = toolchain(env);
  if (tc.error) return null;
  const tmp = mkdtempSync(join(tmpdir(), 'apalache-version-'));
  try {
    const r = spawnSync(tc.bin!, ['version'], { encoding: 'utf8', timeout: 60 * 1000, maxBuffer: 1024 * 1024, env: environment(env, { TMPDIR: tmp }) });
    const text = (r.stdout || '').trim();
    return r.status === 0 && text ? text : null;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}
