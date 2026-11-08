// TLC through tla2tools.jar, in -tool mode: outcomes come from framed
// messages, never from matching human prose.
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

export interface TlcToolchain { java?: string; jar?: string; error?: string }
// What a run left: the command, its output and how it ended; aborted when it could not start.
export interface TlcRun {
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
}
export interface TlcViolation { kind: 'invariant' | 'action' | 'temporal' | 'deadlock'; name: string | null }
// One state of a counterexample: the action that reached it and the variables' values as TLC prints them.
// A back edge has its next trace position as index, its destination as backTo,
// and, when TLC supplies it, the action that closes the cycle. It has no values.
export interface TlcTraceStep { index: number; stuttering?: boolean; backTo?: number; action?: string; values?: Record<string, string> }
export interface TlcStates { generated?: number; distinct?: number; queued?: number; depth?: number }
export interface TlcCounts { distinct: number; generated: number }
export interface TlcParsed {
  frames: number;
  version: string | null;
  completed: boolean;
  violation: TlcViolation | null;
  trace: TlcTraceStep[];
  states: TlcStates;
  actions: Record<string, TlcCounts>;
  init: { accepted: number; generated: number } | null;
  errors: string[];
  warnings: string[];
}

const FRAME = /@!@!@STARTMSG (\d+):(\d+) @!@!@\n([\s\S]*?)\n@!@!@ENDMSG \1 @!@!@/g;

export function toolchain(env: NodeJS.ProcessEnv = process.env): TlcToolchain {
  const java = env.JAVA || 'java';
  const jar = env.TLA_TOOLS;
  if (!jar) return { error: 'TLA_TOOLS is not set; point it at tla2tools.jar' };
  if (!existsSync(jar)) return { error: `TLA_TOOLS points at ${jar}, which does not exist` };
  return { java, jar };
}

export function run({ tla, cfg, trialDir, timeoutSeconds = 600, workers = '1', env = process.env }: { tla: string; cfg: string; trialDir: string; timeoutSeconds?: number; workers?: string | number; env?: NodeJS.ProcessEnv }): TlcRun {
  const tc = toolchain(env);
  if (tc.error) return { aborted: tc.error };
  const cwd = dirname(tla);
  const states = join(trialDir, 'states');
  const tmp = join(states, 'tmp');
  mkdirSync(tmp, { recursive: true });
  const argv = [tc.java!, '-XX:+UseParallelGC', `-Djava.io.tmpdir=${tmp}`, '-cp', tc.jar!, 'tlc2.TLC', '-tool', '-coverage', '1', '-workers', String(workers), '-cleanup', '-metadir', states, '-config', relative(cwd, cfg) || basename(cfg), basename(tla)];
  const before = new Set(readdirSync(cwd));
  const started = Date.now();
  const r = spawnSync(argv[0], argv.slice(1), { cwd, encoding: 'utf8', timeout: timeoutSeconds * 1000, maxBuffer: 64 * 1024 * 1024, env });
  const seconds = (Date.now() - started) / 1000;
  rmSync(states, { recursive: true, force: true });
  removeTraceSpecs(cwd, before);
  return { argv, cwd, stdout: r.stdout || '', stderr: r.stderr || '', exit: r.status, signal: r.signal, seconds, timedOut: Boolean(r.error && (r.error as NodeJS.ErrnoException).code === 'ETIMEDOUT'), error: r.error && (r.error as NodeJS.ErrnoException).code !== 'ETIMEDOUT' ? r.error.message : null };
}

// TLC from 1.8 writes <Spec>_TTrace_<epoch>.tla and .bin beside the module on a violation, unless
// -noGenerateSpecTE, which 1.7 refuses as an unknown option. The trace is in result.json, so the
// files this run left in the module's folder are removed, and nothing that was there before.
export function removeTraceSpecs(dir: string, before: ReadonlySet<string>): string[] {
  const left = existsSync(dir) ? readdirSync(dir).filter(name => !before.has(name) && /_TTrace_\d+\.(?:tla|bin)$/.test(name)) : [];
  for (const name of left) rmSync(join(dir, name), { force: true });
  return left;
}

export function parse(text: string): TlcParsed {
  const out: TlcParsed = { frames: 0, version: null, completed: false, violation: null, trace: [], states: {}, actions: {}, init: null, errors: [], warnings: [] };
  let m: RegExpExecArray | null;
  FRAME.lastIndex = 0;
  while ((m = FRAME.exec(text))) {
    out.frames++;
    const code = Number(m[1]), severity = Number(m[2]), t = m[3];
    let r: RegExpMatchArray | null;
    if ((r = t.match(/^TLC2 Version (.+)$/m))) { out.version = r[0].trim(); continue; }
    if (/^Model checking completed\. No error has been found/.test(t)) { out.completed = true; continue; }
    if ((r = t.match(/^Invariant (\w+) is violated/))) { out.violation = { kind: 'invariant', name: r[1] }; continue; }
    if ((r = t.match(/^Action property (\w+) is violated/))) { out.violation = { kind: 'action', name: r[1] }; continue; }
    if (/^Temporal properties were violated/.test(t)) { out.violation = { kind: 'temporal', name: null }; continue; }
    if (/^Deadlock reached/.test(t)) { out.violation = { kind: 'deadlock', name: null }; continue; }
    if ((r = t.match(/^(\d+): Stuttering/))) { out.trace.push({ index: Number(r[1]), stuttering: true }); continue; }
    if ((r = t.match(/^(\d+): Back to state (\d+)/))) { out.trace.push({ index: Number(r[1]), backTo: Number(r[2]) }); continue; }
    // TLC's -tool frame 2122 puts the destination before the colon, unlike
    // the explicit "N: Back to state M" form above. StatePrinter.printBackToState
    // supplies the cycle-entry stateNumber to MP's "%1%: Back to state: %2%".
    if (code === 2122 && (r = t.match(/^(\d+): Back to state(?:: <([^\n]+?)>)?\s*$/))) {
      out.trace.push({ index: (out.trace.at(-1)?.index ?? 0) + 1, backTo: Number(r[1]), ...(r[2] ? { action: (r[2].match(/^(\w+)/) || [])[1] || r[2] } : {}) });
      continue;
    }
    if ((r = t.match(/^(\d+): <([^\n]+?)>\n?([\s\S]*)$/))) {
      const action = r[2] === 'Initial predicate' ? 'Initial predicate' : (r[2].match(/^(\w+)/) || [])[1] || r[2];
      out.trace.push({ index: Number(r[1]), action, values: values(r[3]) });
      continue;
    }
    if ((r = t.match(/^(\d+) states generated, (\d+) distinct states found, (\d+) states left on queue/))) { out.states = { ...out.states, generated: Number(r[1]), distinct: Number(r[2]), queued: Number(r[3]) }; continue; }
    if ((r = t.match(/^The depth of the complete state graph search is (\d+)/))) { out.states.depth = Number(r[1]); continue; }
    if ((r = t.match(/^<(\w+) line \d+, col \d+ to line \d+, col \d+ of module \w+(?: \([^)]*\))?>: (\d+):(\d+)\s*$/))) {
      if (code === 2773) out.init = { accepted: Number(r[2]), generated: Number(r[3]) };
      else out.actions[r[1]] = { distinct: Number(r[2]), generated: Number(r[3]) };
      continue;
    }
    if (severity === 1 || severity === 2) out.errors.push(t.split('\n')[0].trim());
    else if (severity === 3) out.warnings.push(t.split('\n')[0].trim());
  }
  return out;
}

function values(block: string): Record<string, string> {
  const vals: Record<string, string> = {};
  let name: string | null = null;
  for (const line of block.split('\n')) {
    const m = line.match(/^\/\\ (\w+) = (.*)$/);
    if (m) { name = m[1]; vals[name] = m[2]; }
    else if (name && line.trim()) vals[name] += '\n' + line;
  }
  for (const k of Object.keys(vals)) vals[k] = vals[k].trim();
  return vals;
}

// Outcomes per enabled property: what the frames establish, and no more.
export function outcomes(parsed: Pick<TlcParsed, 'violation' | 'completed'>, enabled: string[]): { outcomes: Record<string, string>; partial: string[] } {
  const out: Record<string, string> = {};
  const partial: string[] = [];
  if (parsed.violation) {
    const v = parsed.violation;
    for (const name of enabled) {
      if (v.kind === 'temporal' && /^O\d+$/.test(name)) out[name] = 'violated';
      else if (v.name === name) out[name] = 'violated';
      else if (v.kind === 'deadlock') out[name] = 'unknown';
      else { out[name] = 'holds'; partial.push(name); }
    }
  } else if (parsed.completed) {
    for (const name of enabled) out[name] = 'holds';
  }
  return { outcomes: out, partial };
}

export const unquote = (s: unknown): string => String(s).replace(/^"(.*)"$/, '$1');
