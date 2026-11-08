// dossier trial <dossier> <call.md> [--timeout <seconds>] [--workers <n>] [--limit <states>]
// The only thing that executes a checker. Validates the call against the
// files it names, executes private copies, parses the output, and writes
// the result, the receipt and a snapshot of what the result depends on.
// --limit bounds a chart trial's exploration, as it bounds dossier draw's.
// The run happens in .running/<id> under the dossier. When the receipt is written, its answer is
// published to evidence/ by the evidence rules (STORE-ANSWER), and the bundle moves to the local,
// git-ignored trials/<id>/. The call is consumed once its answer is published or confirmed, so a run
// that stops on the way, or whose answer the rules refuse, leaves the call pending. A recheck runs a
// recorded question again in a private folder and publishes nothing.
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmdirSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { findRoot, stripRootArgs, locate, readMarker } from '../dossiers/root.ts';
import { forgottenAnswers, isRetired, parseDecisions } from '../dossiers/decisions.ts';
import { fileHash, sha256, short } from '../hash.ts';
import { parseCall } from '../trials/calls.ts';
import { executionDependencies, outside, planTrial } from '../trials/plan.ts';
import { placeOutput, writeReceipt } from '../trials/receipt.ts';
import { loadComponent, loadSystem, externalsOf, knowledgeOf, systemModuleText } from '../dossiers/load.ts';
import { actorsHash, backingOf, moduleHash, scenarioHash } from '../verify/cells.ts';
import { writeGenerated } from '../models/materialize.ts';
import { readIntegrity, requireCurrent } from '../dossiers/integrity.ts';
import { currentManifest, publishAnswer } from '../dossiers/publication.ts';
import { evidenceNotes, readEvidence, RUNNING } from '../trials/answers.ts';
import type { AnswerRead, Snapshot, TrialAction, Verdict } from '../trials/answers.ts';
import type { Now } from '../verify/lapse.ts';
import { analyzeComponent, analyzeSystem } from '../verify/analyze.ts';
import { STANDS_IN } from '../verify/superseded.ts';
import type { AnswerContext, Publication } from '../dossiers/publication.ts';
import type { SystemProse } from '../prose/prose.ts';
import { reachValues } from '../models/tla.ts';
import { checkIR, loadRuntime } from '../chart/draw.ts';
import * as tlc from '../trials/checkers/tlc.ts';
import * as apalache from '../trials/checkers/apalache.ts';
import * as alloy from '../trials/checkers/alloy.ts';
import type { CommandContext } from '../cli.ts';
import type { Call } from '../trials/calls.ts';
import type { Plan } from '../trials/plan.ts';
import type { TrialResult } from '../trials/trials.ts';
import type { ComponentLoad, LoadedKnowledge, SystemLoad } from '../dossiers/load.ts';
import type { Located } from '../dossiers/root.ts';
import type { TlcParsed } from '../trials/checkers/tlc.ts';
import type { ApalacheRun } from '../trials/checkers/apalache.ts';
import type { AlloyParsed } from '../trials/checkers/alloy.ts';

// A union whose members can be read through each other's fields; a field of
// the other kind reads as absent.
type Either<A, B> = (A & { [K in Exclude<keyof B, keyof A>]?: undefined }) | (B & { [K in Exclude<keyof A, keyof B>]?: undefined });
// The dossier as loaded: a component or a system, as where.kind says.
export type Loaded = Either<ComponentLoad, SystemLoad>;
// What the checker run left, whichever checker ran; Apalache's runs give lists.
interface Ran {
  aborted?: string;
  argv?: string[] | string[][];
  cwd?: string;
  stdout?: string;
  stderr?: string;
  exit?: number | null | (number | null | undefined)[];
  signal?: NodeJS.Signals | null;
  seconds?: number;
  timedOut?: boolean;
  error?: string | null;
  outDir?: string;
}
// How the run compares with the call.
interface RunResult { result: Verdict; miscalls?: string[]; reason?: string }
// The checker's own fields of result.json, and its version before it moves under versions.
type Extra = Partial<TrialResult> & { tlc?: string | null; apalache?: string | null; alloy?: string; chartVersions?: Record<string, string> };

const OPTIONS = ['--timeout', '--workers', '--limit'];

// The options, each a whole number above zero (or auto, for --workers), and what is wrong with them.
export function trialOptions(args: string[]): { timeoutSeconds: number; workers: string; limit: number; problems: string[] } {
  const problems: string[] = [];
  const value = (name: string): string | null => { const i = args.indexOf(name); if (i < 0) return null; const v = args[i + 1]; return v === undefined || v.startsWith('--') ? '' : v; };
  const whole = (v: string) => /^\d+$/.test(v) && Number(v) > 0;
  const not = (v: string) => (v === '' ? '' : `, not ${JSON.stringify(v)}`);
  const t = value('--timeout'), w = value('--workers'), l = value('--limit');
  if (t !== null && !whole(t)) problems.push(`--timeout takes a whole number of seconds above 0${not(t)}`);
  if (w !== null && !whole(w) && w !== 'auto') problems.push(`--workers takes a whole number above 0, or auto${not(w)}`);
  if (l !== null && !whole(l)) problems.push(`--limit takes a whole number of states above 0${not(l)}`);
  return { timeoutSeconds: t !== null && whole(t) ? Number(t) : 600, workers: w !== null && (whole(w) || w === 'auto') ? w : '1', limit: l !== null && whole(l) ? Number(l) : 20000, problems };
}

export async function main(command: string, args: string[], { root: pluginRoot, version }: CommandContext): Promise<number> {
  const refuse = (...lines: string[]) => { console.error(`dossier trial: refused\n  ${lines.join('\n  ')}`); return 2; };
  // Nothing is read, and the call does not move, until every option reads.
  const { timeoutSeconds, workers, limit, problems: optionProblems } = trialOptions(args);
  if (optionProblems.length) return refuse(...optionProblems);
  const root = findRoot(args);
  if (!root) { console.error('dossier trial: no dossiers root here. Run dossier setup.'); return 2; }
  const positional = stripRootArgs(args).filter((a, i, all) => !a.startsWith('--') && !OPTIONS.includes(all[i - 1]));
  const [name, callArg] = positional;
  if (!name || !callArg) { console.error('usage: dossier trial <component|system> <call.md>'); return 2; }
  const where = locate(root, name);
  if (!where) { console.error(`dossier trial: no component or system named ${name} under ${root}`); return 2; }
  return execute({ root, where, name, callArg, timeoutSeconds, workers, limit, pluginRoot, version });
}

// What execute leaves for its caller: the result a recheck compares, and what publication did.
export interface Executed { result?: TrialResult; publication?: Publication }
export interface ExecuteOptions { root: string; where: Located; name: string; callArg?: string; callText?: string; recheck?: boolean; timeoutSeconds: number; workers: string; limit: number; pluginRoot: string; version: string }

// Run one call: the trial's own, or a recorded question's call again for a recheck, which runs in a
// private folder, publishes nothing and consumes nothing.
export async function execute({ root, where, name, callArg = '', callText: givenText, recheck = false, timeoutSeconds, workers, limit, pluginRoot, version }: ExecuteOptions, out: Executed = {}): Promise<number> {
  const refuse = (...lines: string[]) => { console.error(`dossier ${recheck ? 'recheck' : 'trial'}: refused\n  ${lines.join('\n  ')}`); return 2; };
  const ref = `${where.kind}s/${where.id}`;
  if (isRetired(where.dir)) { console.error(`dossier trial: ${ref} is retired; dossier decide ${ref} begin reopens it`); return 2; }
  // dossier.json names the knowledge base and the external runners; a trial needs both as written.
  const marker = readMarker(root);
  if (marker.error) return refuse(marker.error);
  requireCurrent(root);
  const dir = where.dir;
  currentManifest(dir);
  let callPath: string | null = null, callText: string;
  if (givenText !== undefined) callText = givenText;
  else {
    const candidates = [join(dir, 'calls', callArg), resolve(process.cwd(), callArg), join(dir, callArg)];
    callPath = candidates.find(p => existsSync(p) && statSync(p).isFile()) || null;
    if (!callPath) {
      if (candidates.some(p => existsSync(p))) console.error(`dossier trial: ${callArg} is a folder, not a call file`);
      else console.error(`dossier trial: no call file ${callArg} (looked in ${name}/calls/, the working directory and ${name}/)`);
      return 2;
    }
    callText = readFileSync(callPath, 'utf8');
  }
  const call = parseCall(callText);
  if (call.errors.length) return refuse(...call.errors);

  // The dossier, whole.
  const knowledge = knowledgeOf(root);
  // A system without its retired members, as verify reads it: naming one does not compose.
  const loaded: Loaded = where.kind === 'component' ? loadComponent(root, where.id) : loadSystem(root, where.id);
  if (where.kind === 'system' && loaded.composed!.errors.length) return refuse(...loaded.composed!.errors.map(e => `composition: ${e}`));
  const relevant = [dir, ...(loaded.composition?.members || []).map(m => join(root, 'components', m.component))];
  try { for (const path of relevant) integrityPreflight(path); }
  catch (error) { return refuse((error as Error).message); }
  const escapes = [...call.executes, ...(call.base ? [call.base] : [])].map(path => outside(dir, path)).filter((problem): problem is string => Boolean(problem));
  if (escapes.length) return refuse(...escapes);

  // Planning and execution read the same private copies. Generating a system
  // here never changes its disposable review files, including on refusal.
  const inputDir = mkdtempSync(join(tmpdir(), 'dossier-trial-inputs-'));
  try {
  try { copyInputs(dir, inputDir, loaded, call); }
  catch (error) { return refuse((error as Error).message); }
  const { plan, problems } = planTrial({ call, dossierDir: inputDir, kind: where.kind, ir: loaded.ir, systemProse: loaded.prose, scenarios: loaded.actors ? loaded.actors.scenarios : null, externals: externalsOf(root), module: where.kind === 'system' ? `model/generated/${loaded.composed!.module}.tla` : null, cells: where.kind === 'system' ? loaded.composed!.cells : null });
  if (problems.length) return refuse(...problems);
  // Every path is inside the dossier now; each must be a file there.
  const executed: Record<string, string> = {};
  for (const rel of call.executes) {
    const full = join(inputDir, rel);
    if (!existsSync(full) || !statSync(full).isFile()) return refuse(`executes names ${rel}, which is not a file under ${ref}/`);
    executed[rel] = fileHash(full);
  }
  let dependencies: ReturnType<typeof executionDependencies>;
  try { dependencies = executionDependencies(inputDir, call, plan); }
  catch (error) { return refuse((error as Error).message); }
  const inputIdentity = {
    strategy: 'private-copy' as const,
    files: Object.fromEntries(dependencies.files.map(path => [path, fileHash(join(inputDir, path))])),
    shared: dependencies.shared,
    limitation: 'Hashes identify private copies of declared files and supported local model imports. Toolchains, shared libraries, chart runtime, external runner commands/root/cwd, and undeclared tool-specific dynamic reads are not frozen. External runners must use the supplied files map for declared inputs. This is not a hermetic execution.',
  };
  // The loaded prose/IR/composition and these cited-record hashes describe the
  // inputs before execution, never a mixture with records reread after a run.
  const snapshot = snapshotOf({ where, loaded, knowledge, call });
  if (plan.checker === 'tlc' && tlc.toolchain().error) return refuse(tlc.toolchain().error!);
  if (plan.checker === 'alloy' && alloy.toolchain().error) return refuse(alloy.toolchain().error!);
  if (plan.checker === 'apalache' && apalache.toolchain().error) return refuse(apalache.toolchain().error!);
  if (plan.checker === 'chart') { const rt = await loadRuntime(root); if (rt.error) return refuse(rt.error); }

  const stamp = new Date().toISOString();
  const kind = call.kind;
  const id = `${stamp.slice(0, 10)}-${stamp.slice(11, 13)}${stamp.slice(14, 16)}-${kind}-${short(JSON.stringify(inputIdentity.files) + JSON.stringify(snapshot) + callText, 6)}`;
  const finalDir = join(dir, 'trials', id);
  // The run's folder: invisible to verify until its answer is published. A recheck's is private.
  const scratch = recheck ? mkdtempSync(join(tmpdir(), 'dossier-recheck-')) : null;
  const trialDir = scratch ? join(scratch, id) : join(dir, RUNNING, id);
  if (!scratch && existsSync(finalDir)) return refuse(`trials/${id} already exists: the same call ran on the same files this minute`);
  try {
    if (!scratch) {
      directory(join(dir, 'trials'), false);
      directory(join(dir, RUNNING), true);
    }
    // Only the parent may be created idempotently. mkdir of this leaf is the
    // atomic reservation; no process can share an existing execution folder.
    mkdirSync(trialDir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') return refuse(`${RUNNING}/${id} holds a run of the same call on the same files this minute; wait for it, or explicitly recover it after confirming no trial is running`);
    return refuse((error as Error).message);
  }
  let landed = false;
  try {
  if (!scratch && existsSync(finalDir)) return refuse(`trials/${id} already exists: the same call ran on the same files this minute`);
  writeFileSync(join(trialDir, 'call.md'), callText);
  if (plan.blunderDiff) writeFileSync(join(trialDir, 'blunder.diff'), plan.blunderDiff);

  let ran: Ran = {}, result: RunResult = { result: 'aborted' }, outcomes: Record<string, string> = {}, extra: Extra = {}, rawOutput = '';
  const requested: Extra = plan.checker === 'apalache' ? { mode: plan.mode, length: plan.length } : plan.checker === 'external' ? { runner: plan.runner!.id } : {};
  const redactAll = (v: unknown[]) => redact(v, { trialDir, root, pluginRoot, inputDir });
  try {
  if (plan.checker === 'chart') {
    const started = Date.now();
    const r = await checkIR({ root, ir: loaded.ir!, machineIR: plan.machineIR || loaded.ir, limit });
    ran = { argv: ['dossier', 'draw', where.id], cwd: '.', exit: r.error || r.exceeded ? 1 : 0, seconds: (Date.now() - started) / 1000 };
    if (r.error) result = { result: 'aborted', reason: r.error };
    else if (r.exceeded) {
      // An exploration the limit cut short ran no check: aborted, as an incomplete TLC run is, with the reason in its output.
      extra = { explored: r.explored, limitHit: true, reach: { text: call.reach, values: { explored: r.explored! } }, chartVersions: r.versions };
      result = { result: 'aborted', reason: r.exceeded };
      rawOutput = `${r.exceeded}\n`;
    } else {
      const failing = [...new Set(r.checks!.filter(c => c.status === 'failed').flatMap(c => c.ids))];
      outcomes = { checks: r.outcome! };
      extra = { checks: r.checks, counts: { total: r.checks!.length, passed: r.passed!, failed: r.failed! }, covers: r.covers, explored: r.explored, limitHit: r.limitHit, gaps: r.gaps, failing, reach: { text: call.reach, values: { explored: r.explored! } }, chartVersions: r.versions };
      const expect = call.expect.checks;
      let ok = expect.expect === r.outcome;
      const missing = expect.expect === 'fail' ? (expect.failing || []).filter(x => !failing.includes(x)) : [];
      if (expect.expect === 'fail' && missing.length) ok = false;
      result = ok ? { result: 'as-called', miscalls: [] } : { result: 'miscalled', miscalls: [`checks: expected ${expect.expect}${expect.failing && expect.failing.length ? ' ' + expect.failing.join(' ') : ''}, got ${r.outcome}${failing.length ? ' ' + failing.join(' ') : ''}`] };
      rawOutput = r.checks!.map(c => `${c.status} ${c.name}${c.message ? ` · ${c.message}` : ''}`).join('\n') + '\n';
    }
  } else if (plan.checker === 'tlc') {
    ran = tlc.run({ tla: plan.tla!, cfg: plan.cfg!, trialDir, timeoutSeconds, workers });
    if (!ran.aborted) {
      const parsed = tlc.parse(ran.stdout + '\n' + ran.stderr);
      const o = tlc.outcomes(parsed, plan.enabled);
      outcomes = o.outcomes;
      const actions: Record<string, TrialAction> = {};
      for (const [n, counts] of Object.entries(parsed.actions)) actions[n] = { ...(plan.tlaParsed!.actions[n] || {}), ...counts };
      for (const [n, act] of Object.entries(plan.tlaParsed!.actions)) if (!actions[n]) actions[n] = { ...act, generated: 0, distinct: 0 };
      extra = { tlc: parsed.version, violation: parsed.violation, trace: parsed.trace, states: parsed.states, actions, init: parsed.init, partial: o.partial, errors: parsed.errors, warnings: parsed.warnings, properties: Object.fromEntries(plan.enabled.map(n => [n, plan.tlaParsed!.definitions[n] ? plan.tlaParsed!.definitions[n].hash : null])), reach: { text: call.reach, constants: plan.cfgParsed!.constants, values: reachValues(plan.cfgParsed!.constants) } };
      result = compareTlc(call, plan, parsed, outcomes, where.kind === 'system');
      if (!parsed.completed && !parsed.violation) result = { result: 'aborted', reason: parsed.errors[0] || `TLC exited ${ran.exit} without completing` };
      rawOutput = (ran.stdout || '') + ((ran.stderr || '').trim() ? `\n--- stderr ---\n${ran.stderr}` : '');
    }
  } else if (plan.checker === 'apalache') {
    const runs: (ApalacheRun & { label: string })[] = [];
    const common = { tla: plan.tla!, cfg: plan.cfg, trialDir, timeoutSeconds };
    const work = (label: string) => join(trialDir, 'apalache', label);
    if (plan.mode === 'inductive') {
      runs.push({ label: 'step', ...apalache.run({ ...common, outDir: work('step'), inv: plan.inv, init: plan.init || plan.inv, next: null, length: 1, cinit: plan.cinit }) });
      runs.push({ label: 'base', ...apalache.run({ ...common, outDir: work('base'), inv: plan.inv, init: null, length: 0, cinit: plan.cinit }) });
    } else runs.push({ label: 'bounded', ...apalache.run({ ...common, outDir: work('bounded'), inv: plan.inv, init: plan.init, length: plan.length, cinit: plan.cinit }) });
    const aborted = runs.find(r => r.aborted);
    if (aborted) ran = { aborted: aborted.aborted };
    else {
      const parsedRuns = runs.map(r => ({ label: r.label, parsed: apalache.parse(r.stdout, r.outDir), exit: r.exit, argv: r.argv, seconds: r.seconds, timedOut: r.timedOut, error: r.error }));
      ran = { argv: parsedRuns.map(r => r.argv!), cwd: runs[0].cwd, exit: parsedRuns.map(r => r.exit), seconds: parsedRuns.reduce((a, r) => a + (r.seconds || 0), 0), timedOut: parsedRuns.some(r => r.timedOut), error: parsedRuns.map(r => r.error).find(Boolean) || null };
      // Only a counterexample violates the invariant; a deadlock or a runtime error establishes nothing.
      const verdict = apalache.verdict(parsedRuns, plan.inv!);
      const bad = parsedRuns.find(r => r.parsed.outcome === 'Error');
      outcomes = { [plan.inv!]: verdict.outcome };
      extra = { apalache: parsedRuns[0].parsed.version, mode: plan.mode, length: plan.length, runs: parsedRuns.map(r => ({ label: r.label, outcome: r.parsed.outcome, length: r.parsed.length, exitcode: r.parsed.exitcode, violatedInvariant: r.parsed.violatedInvariant, errors: r.parsed.errors })), trace: bad && bad.parsed.trace ? bad.parsed.trace : null, properties: { [plan.inv!]: plan.tlaParsed!.definitions[plan.inv!] ? plan.tlaParsed!.definitions[plan.inv!].hash : null }, reach: { text: call.reach, values: plan.mode === 'inductive' ? { inductive: 1 } : { length: plan.length! } } };
      const expect = call.expect[plan.inv!].expect;
      result = verdict.reason ? { result: 'aborted', reason: verdict.reason } : outcomes[plan.inv!] === expect ? { result: 'as-called', miscalls: [] } : { result: 'miscalled', miscalls: [`${plan.inv}: expected ${expect}, got ${outcomes[plan.inv!]}`] };
      rawOutput = runs.map(r => `--- ${r.label} ---\n${r.stdout || ''}${(r.stderr || '').trim() ? `\n--- stderr ---\n${r.stderr}` : ''}`).join('\n');
    }
  } else if (plan.checker === 'alloy') {
    ran = alloy.run({ als: plan.als!, command: plan.command!.name, trialDir, timeoutSeconds });
    if (!ran.aborted) {
      const parsed: AlloyParsed = ran.exit === 0 ? alloy.parse(ran.outDir!, plan.command!.name) : { error: `the Analyzer exited ${ran.exit}` };
      if (!parsed.error) {
        outcomes = { [plan.command!.name]: parsed.outcome! };
        extra = { alloy: basename(process.env.ALLOY_JAR || ''), command: parsed.receipt, xml: parsed.xml, reach: { text: call.reach, scope: plan.command!.scope, values: plan.command!.overall == null ? {} : { scope: plan.command!.overall } } };
        const expect = call.expect[plan.command!.name].expect;
        result = expect === parsed.outcome ? { result: 'as-called', miscalls: [] } : { result: 'miscalled', miscalls: [`${plan.command!.name}: expected ${expect}, got ${parsed.outcome}`] };
      } else result = { result: 'aborted', reason: parsed.error };
      rawOutput = (ran.stdout || '') + ((ran.stderr || '').trim() ? `\n--- stderr ---\n${ran.stderr}` : '');
    }
  } else if (plan.checker === 'external') {
    const input = JSON.stringify({ dossier: where, call: { kind, executes: call.executes, expect: call.expect, reach: call.reach }, ir: loaded.ir || null, root, files: Object.fromEntries(call.executes.map(f => [f, join(inputDir, f)])) });
    const cwd = plan.runner!.cwd ? resolve(root, plan.runner!.cwd) : root;
    const started = Date.now();
    const r = spawnSync(plan.runner!.command[0], plan.runner!.command.slice(1), { cwd, input, encoding: 'utf8', timeout: timeoutSeconds * 1000, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, DOSSIER_ROOT: root } });
    ran = { argv: plan.runner!.command, cwd, stdout: r.stdout || '', stderr: r.stderr || '', exit: r.status, signal: r.signal, seconds: (Date.now() - started) / 1000, timedOut: Boolean(r.error && (r.error as NodeJS.ErrnoException).code === 'ETIMEDOUT'), error: r.error && (r.error as NodeJS.ErrnoException).code !== 'ETIMEDOUT' ? r.error.message : null };
    // The runner's verdict: its last line of output, as JSON.
    let verdict: { outcomes?: Record<string, string>; covers?: unknown; evidence?: unknown; reach?: Record<string, number | string> } | null = null;
    try { verdict = JSON.parse((r.stdout || '').trim().split('\n').filter(Boolean).pop() || 'null'); } catch { verdict = null; }
    if (!verdict || typeof verdict.outcomes !== 'object') result = { result: 'aborted', reason: `the runner printed no JSON verdict with outcomes (exit ${r.status})` };
    else {
      outcomes = verdict.outcomes;
      extra = { runner: plan.runner!.id, covers: Array.isArray(verdict.covers) ? verdict.covers : [], evidence: verdict.evidence || null, reach: { text: call.reach, values: verdict.reach || {} } };
      const miscalls: string[] = [];
      for (const [n, o] of Object.entries(call.expect)) if (outcomes[n] !== o.expect) miscalls.push(`${n}: expected ${o.expect}, got ${outcomes[n] || 'nothing'}`);
      result = miscalls.length ? { result: 'miscalled', miscalls } : { result: 'as-called', miscalls: [] };
    }
    rawOutput = (ran.stdout || '') + ((ran.stderr || '').trim() ? `\n--- stderr ---\n${ran.stderr}` : '');
  }
  } catch (err) { ran = { ...ran, error: (err as Error).message }; result = { result: 'aborted', reason: (err as Error).message }; rawOutput = rawOutput || `${(err as Error).stack || (err as Error).message}\n`; }
  // Apalache's work folders go once the run is parsed: the trace is copied into result.json and the
  // log into output.txt, and the folders' own files name this machine's paths, which no bundle keeps.
  rmSync(join(trialDir, 'apalache'), { recursive: true, force: true });
  if (ran.aborted) result = { result: 'aborted', reason: ran.aborted };
  else if (ran.timedOut) result = { result: 'aborted', reason: `timed out after ${timeoutSeconds} seconds` };
  else if (ran.error) result = { result: 'aborted', reason: ran.error };

  // A checker must not rewrite its own inputs. The copy prevents concurrent
  // edits of authored files from changing the bytes the checker reads; this
  // comparison catches persistent mutation by the checker itself, not hostile
  // same-user writes that are restored before it exits.
  if (Object.entries(inputIdentity.files).some(([path, hash]) => !existsSync(join(inputDir, path)) || fileHash(join(inputDir, path)) !== hash)) {
    console.error('dossier trial: execution input copies changed; publication refused and the call remains pending');
    return 3;
  }

  if (ran.argv) ran.argv = Array.isArray(ran.argv[0]) ? (ran.argv as string[][]).map(redactAll) : redactAll(ran.argv);
  const output = placeOutput(trialDir, redactAll([rawOutput])[0]);
  const full = {
    kind, checker: plan.checker, dossier: `${where.kind}s/${where.id}`, id, at: stamp,
    versions: { dossier: version, node: process.versions.node, ...(extra.tlc ? { tlc: extra.tlc } : {}), ...(extra.apalache ? { apalache: extra.apalache } : {}), ...(extra.alloy ? { alloy: extra.alloy } : {}), ...(extra.chartVersions || {}) },
    command: ran.argv || null, cwd: ran.cwd ? (ran.cwd.startsWith(inputDir + '/') || ran.cwd === inputDir ? `$INPUTS/${relative(inputDir, ran.cwd) || '.'}` : relative(dir, ran.cwd) || '.') : null, exit: ran.exit ?? null, seconds: ran.seconds ?? null,
    property: call.property, scenario: call.scenario, walk: call.walk || null,
    executed, inputIdentity, enabled: plan.enabled, expect: call.expect, outcomes, ...extra, ...requested, snapshot, ...result,
  };
  delete full.tlc; delete full.alloy; delete full.apalache; delete full.chartVersions;
  writeFileSync(join(trialDir, 'result.json'), JSON.stringify(full, null, 2) + '\n');
  writeReceipt(trialDir, { runner: `dossier@${version}`, at: full.at, executed, output });
  if (scratch) { out.result = full as unknown as TrialResult; return result.result === 'aborted' ? 3 : 0; }

  // The answer joins the record by the evidence rules, and only then is the call consumed. A run
  // that could not publish stays where it ran, said so, and its call stays pending.
  landed = true;
  let publication: Publication;
  try { for (const path of relevant) integrityPreflight(path); publication = publishAnswer(dir, id, answerContext(where, loaded, dir, { root, knowledge })); } catch (e) { console.error(`dossier trial: execution is retained for explicit recovery; publication did not finish: ${(e as Error).message}`); return 3; }
  out.publication = publication;
  const consumed = publication.action === 'published' || (publication.action === 'kept' && result.result !== 'aborted');
  if (consumed && callPath && existsSync(callPath) && existsSync(join(dir, 'calls')) && realpathSync(resolve(callPath, '..')) === realpathSync(join(dir, 'calls')) && readFileSync(callPath, 'utf8') === callText) unlinkSync(callPath);

  console.log(`trial: ${id} · ${result.result}${result.reason ? ` · ${result.reason}` : ''}`);
  for (const [n, o] of Object.entries(outcomes)) console.log(`  ${n}: expected ${call.expect[n] ? call.expect[n].expect : '?'}, got ${o}`);
  if (result.miscalls && result.miscalls.length) console.log(`  miscalls: ${result.miscalls.join('; ')}`);
  if (extra.states && extra.states.distinct != null) console.log(`  states: ${extra.states.distinct} distinct, ${extra.states.generated} generated${extra.states.depth != null ? `, depth ${extra.states.depth}` : ''}`);
  if (extra.counts) console.log(`  checks: ${extra.counts.passed} of ${extra.counts.total} passed, ${extra.explored} states explored${extra.failing && extra.failing.length ? `, failing ${extra.failing.join(' ')}` : ''}`);
  if (extra.runs) for (const r of extra.runs) console.log(`  ${r.label}: ${r.outcome}${r.length != null ? ` (length ${r.length})` : ''}`);
  const entry = `evidence/${publication.name}.json`;
  if (publication.action === 'published') console.log(`answer: ${entry} · ${publication.replaced ? 'replaced the recorded answer' : 'published'}`);
  else console.log(`answer: ${entry} · ${publication.action === 'kept' ? 'kept' : 'refused'}: ${publication.reason}`);
  for (const gone of publication.gone) console.log(`  removed evidence/${gone}.json: its question no longer exists`);
  for (const superseded of publication.superseded) console.log(`  removed evidence/${superseded}.json: ${STANDS_IN}`);
  if (publication.action === 'refused') { console.log(`  the bundle stays in trials/${id}/, and the call stays pending`); return 2; }
  if (publication.action === 'published') console.log(`  next: write evidence/${publication.name}.md${result.result === 'miscalled' ? ' with the retelling and a classification' : ''}, then dossier verify`);
  return result.result === 'as-called' ? 0 : result.result === 'miscalled' ? 1 : 3;
  } finally {
    if (scratch) rmSync(scratch, { recursive: true, force: true });
    else {
      // A run that did not land leaves nothing behind, and its call stays pending.
      if (!landed) rmSync(trialDir, { recursive: true, force: true });
      try { if (readdirSync(join(dir, RUNNING)).length === 0) rmdirSync(join(dir, RUNNING)); } catch { /* Another run holds it, or it is gone. */ }
    }
  }
  } finally { rmSync(inputDir, { recursive: true, force: true }); }
}

// The present a recorded question's answer is compared with before a recheck runs it, as the runner
// would take it now: the snapshot, and each file's hash as the runner's private copy would hold it,
// prose.md and the generated system files among them; null for a file that is gone.
export function presentNow(where: Located, loaded: Loaded, knowledge: LoadedKnowledge, call: Call): Now {
  const generated: Record<string, string> = loaded.kind === 'system'
    ? { [`model/generated/${loaded.composed!.module}.tla`]: systemModuleText(loaded), ...Object.fromEntries(Object.entries(loaded.composed!.cfgs || {}).map(([name, text]) => [`model/generated/${name}`, text])) }
    : {};
  const file = (path: string): string | null => {
    if (path === 'prose.md') return sha256(loaded.text);
    if (Object.hasOwn(generated, path)) return sha256(generated[path]);
    const full = join(where.dir, path);
    return existsSync(full) && statSync(full).isFile() ? fileHash(full) : null;
  };
  return { snapshot: snapshotOf({ where, loaded, knowledge, call }), file };
}

// Relevant record corruption blocks execution, even when its manifest still
// parses. Unrelated dossiers do not block this call. A forgotten removed answer
// is an acknowledged gap; forgetting never excuses altered surviving bytes.
export function integrityPreflight(dir: string): void {
  const record = readIntegrity(dir);
  if (record.problems.length) throw new Error(`${dir}: ${record.problems.map(p => `${p.name}: ${p.where}`).join('; ')}`);
  if (record.mode !== 'current' || !record.manifest) throw new Error(`${dir}: current integrity manifest unavailable`);
  const root = dirname(dirname(dir)), ref = relative(root, dir), kind = basename(dirname(dir)), id = basename(dir);
  // What exists now, so that an unbound entry whose question is gone, which the next publication
  // removes, does not block that publication.
  const where: Located = { kind: kind === 'systems' ? 'system' : 'component', id, dir };
  const present = answerContext(where, (kind === 'systems' ? loadSystem(root, id) : loadComponent(root, id)) as Loaded, dir).present;
  const evidence = readEvidence(dir, record.manifest.evidence, forgottenAnswers(parseDecisions(record.decisions).decisions), ref, present);
  const faults = evidenceNotes(evidence).map(n => `${n.name}: ${n.where}`);
  if (faults.length) throw new Error(`${ref}: ${faults.join('; ')}`);
}

// The superseded answers among some answers, as verify finds them (ANSWER-SUPERSEDED): what a
// publication asks of the entries it is about to leave.
function supersededIn(where: Located, root: string, loaded: Loaded, knowledge: LoadedKnowledge, answers: AnswerRead[]): string[] {
  const a = where.kind === 'component'
    ? analyzeComponent({ root, id: where.id, loaded: { ...(loaded as ComponentLoad) }, knowledge, answers })
    : analyzeSystem({ root, id: where.id, knowledge, answers });
  return a.supersededRemovable;
}

// What the evidence rules need from the dossier as it stands: the Givens each passage cites and a
// component's compiled prose, which lapse reads, and the passages, scenarios and walks that exist and
// whether an authored file is still there, which say whether a question is gone. With the root and
// the knowledge base, also which answers are superseded, so that a publication drops them.
export function answerContext(where: Located, loaded: Loaded, dir: string, analysis?: { root: string; knowledge: LoadedKnowledge }): AnswerContext {
  const fileExists = (path: string) => existsSync(join(dir, path));
  const superseded = analysis ? (answers: AnswerRead[]) => supersededIn(where, analysis.root, loaded, analysis.knowledge, answers) : undefined;
  if (where.kind === 'component') {
    const ir = loaded.ir!;
    const givens: Record<string, string[]> = Object.fromEntries([...ir.invariants, ...ir.onces, ...ir.withins].map(x => [x.id, x.givens || []]));
    return { givens: id => givens[id] || [], ir, present: { passages: ir.hashes || {}, scenarios: null, walks: null, fileExists }, superseded };
  }
  const prose = loaded.prose as SystemProse;
  const givens: Record<string, string[]> = Object.fromEntries(prose.properties.map(p => [p.id, p.givens || []]));
  return {
    givens: id => givens[id] || [],
    ir: null,
    present: { passages: Object.fromEntries(prose.passages.filter(p => !p.retired).map(p => [p.id, p.hash])), scenarios: new Set(Object.keys(loaded.actors!.scenarioById)), walks: new Set((prose.walks || []).map(w => w.id)), fileExists },
    superseded,
  };
}

function directory(path: string, create: boolean): void {
  let stat;
  try { stat = lstatSync(path); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  if (!stat && create) { try { mkdirSync(path); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; } stat = lstatSync(path); }
  if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) throw new Error(`execution parent must be a directory, not a symbolic link or special file: ${path}`);
}

function copyInputs(dir: string, target: string, loaded: Loaded, call: Call): void {
  const copy = (path: string): void => {
    const source = join(dir, path), destination = join(target, path);
    const stat = lstatSync(source);
    if (stat.isSymbolicLink()) throw new Error(`execution input must not be a symbolic link: ${path}`);
    if (stat.isDirectory()) {
      mkdirSync(destination, { recursive: true });
      for (const entry of readdirSync(source).sort()) {
        if (loaded.kind === 'system' && path === 'model' && entry === 'generated') continue;
        copy(`${path}/${entry}`);
      }
    } else if (stat.isFile()) {
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, readFileSync(source), { mode: 0o600 | (stat.mode & 0o111) });
    } else throw new Error(`execution input must be a regular file: ${path}`);
  };
  if (existsSync(join(dir, 'model'))) copy('model');
  for (const path of [...call.executes, ...(call.base ? [call.base] : [])]) {
    if (loaded.kind === 'system' && path.startsWith('model/generated/')) continue;
    if (!existsSync(join(target, path))) copy(path);
  }
  // Match chart/external IR to exactly the prose bytes from which it compiled.
  if (call.executes.includes('prose.md')) writeFileSync(join(target, 'prose.md'), loaded.text);
  if (loaded.kind === 'system') writeGenerated(target, loaded.composed, systemModuleText(loaded));
}

// A witness's trace is compared step by step: a component's step is its state and then the
// trace-data values; a system has no one state, so its step is the trace-data values alone.
export function compareTlc(call: Call, plan: Plan, parsed: TlcParsed, outcomes: Record<string, string>, system: boolean): RunResult {
  const miscalls: string[] = [];
  for (const name of plan.enabled) {
    const expect = call.expect[name].expect;
    if (outcomes[name] !== expect) miscalls.push(`${name}: expected ${expect}, got ${outcomes[name] || 'nothing'}`);
    if (plan.witness === name && call.expect[name].trace) {
      const expected = call.expect[name].trace!;
      const got = parsed.trace.filter(s => s.values).map(s => [...(system ? [] : [tlc.unquote(s.values!.state ?? '')]), ...call.traceData.map(v => tlc.unquote(s.values![v] ?? ''))].join('/'));
      if (got.join(' > ') !== expected.join(' > ')) miscalls.push(`${name}: expected the trace ${expected.join(' > ')}, got ${got.join(' > ') || 'no trace'}`);
    }
  }
  return miscalls.length ? { result: 'miscalled', miscalls } : { result: 'as-called', miscalls: [] };
}

// Hashes of everything the result rests on: passages, cited records, backing,
// and for a system its members, composition, scenario and actors, with the
// records its members and the actors it uses pin.
export function snapshotOf({ where, loaded, knowledge, call }: { where: Located; loaded: Loaded; knowledge: LoadedKnowledge; call: Call }): Snapshot {
  const snap: Snapshot = { passages: {}, records: {}, backing: {} };
  const refs = new Set<string>();
  if (where.kind === 'component') {
    snap.passages = loaded.ir!.hashes || {};
    snap.ir = loaded.irHash;
    for (const p of loaded.ir!.pins || []) refs.add(p);
    for (const k of loaded.ir!.guarantees || []) {
      if (!k.backing || k.backing.kind === 'none') { snap.backing[k.id] = { status: 'assumed' }; continue; }
      if (k.backing.kind === 'external') { snap.backing[k.id] = { status: 'external', runner: k.backing.runner }; continue; }
      if (k.backing.kind === 'record') { const r = knowledge.resolve(k.backing.ref); snap.backing[k.id] = r ? { status: 'backed', hash: r.hash, path: r.path } : { status: 'unresolved' }; continue; }
      const b = knowledge.backing({ module: loaded.ir!.module, ...k.backing });
      snap.backing[k.id] = b.status === 'backed' ? { status: 'backed', hash: b.hash, path: b.path } : { status: 'unresolved', reason: b.reason };
    }
  } else {
    snap.passages = Object.fromEntries(loaded.prose.passages.filter(p => !p.retired).map(p => [p.id, p.hash]));
    snap.composition = short(loaded.composition!.text, 16);
    // The module as the composer wrote it, extras.tla aside, as the call's scenario rests on it: a
    // change to the composer, or to an only when no property cites, moves it; another scenario's
    // constants do not.
    snap.module = moduleHash(loaded.composed!.tla, call.scenario!, loaded.extras);
    snap.members = {};
    for (const [id, m] of Object.entries(loaded.memberLoads || {})) if (m) { snap.members[id] = { prose: short(m.text, 16), backing: backingOf(m.ir, knowledge) }; for (const p of m.ir.pins || []) refs.add(p); }
    for (const m of loaded.composition!.members) for (const p of m.pins) refs.add(p);
    const used = loaded.composed!.actors || [];
    for (const a of used) for (const p of (loaded.actors!.byId[a] && loaded.actors!.byId[a].pins) || []) refs.add(p);
    // The scenario as this system's cells rest on it: the modes and windows of the actors it hears from and its members' starts.
    snap.scenario = scenarioHash(loaded.actors!.scenarioById[call.scenario!], used, loaded.composition!.members.map(m => m.component));
    // Only the actors the composition hears from, without their notes.
    snap.actors = actorsHash(loaded.actors!, used);
    snap.extras = loaded.extras ? short(loaded.extras, 16) : null;
  }
  for (const ref of refs) {
    const r = knowledge.resolve(ref);
    snap.records[ref] = r ? r.hash : null;
  }
  return snap;
}

// Machine paths become their names: each absolute path as given and as the file system resolves
// it, so a root reached through a symbolic link (/tmp is /private/tmp on macOS) reads the same, the
// longest first, so a trial's folder is $TRIAL before its root is $DOSSIERS; and only where a
// whole path stands, never inside a longer one. Then TLC's banner loses what names the machine.
export function redact(values: unknown[], { trialDir, root, pluginRoot, inputDir, env = process.env }: { trialDir: string; root: string; pluginRoot: string; inputDir?: string; env?: NodeJS.ProcessEnv }): string[] {
  const named = ([[env.JAVA, '$JAVA'], [env.TLA_TOOLS, '$TLA_TOOLS'], [env.ALLOY_JAR, '$ALLOY_JAR'], [env.APALACHE, '$APALACHE'], [trialDir, '$TRIAL'], [inputDir, '$INPUTS'], [root, '$DOSSIERS'], [pluginRoot, '$PLUGIN']] as [string | undefined, string][]).filter((x): x is [string, string] => Boolean(x[0]) && isAbsolute(x[0]!));
  const subs: [string, string][] = [];
  for (const [path, name] of named) {
    for (const variant of [path.replace(/\/+$/, ''), real(path)]) if (variant && !subs.some(([v]) => v === variant)) subs.push([variant, name]);
  }
  subs.sort((x, y) => y[0].length - x[0].length);
  const patterns = subs.map(([v, name]) => [new RegExp(`(?<![\\w.-])${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w.-])`, 'g'), name] as const);
  return values.map(a => {
    let s = String(a);
    for (const [pattern, name] of patterns) s = s.replace(pattern, () => name);
    return fingerprints(s);
  });
}

const real = (path: string): string | null => { try { return realpathSync(path); } catch { return null; } };

// TLC's banner says how many cores and how much heap the machine has, the process id, the
// system, and the JVM's vendor and architecture; the JVM's version stays.
export function fingerprints(text: string): string {
  return text
    .replace(/ on \d+ cores with \d+MB heap and /g, ' on $CORES cores with $HEAP heap and ')
    // A vendor may hold a comma, as "Azul Systems, Inc." does, so the fingerprint set's class ends it.
    .replace(/\[pid: \d+\] \(([^,()]+), ([^()]+?) (\d[\w.+-]*) ([^,\s()]+), (\w*FPSet)\b/g, (_m, _os, _vendor, jdk, _arch, fpset) => `[pid: $PID] ($OS, $JDK_VENDOR ${jdk} $JDK_ARCH, ${fpset}`)
    .replace(/\[pid: \d+\] \(([^,()]+), ([^,()]+?) (\d[\w.+-]*) ([^,\s()]+), /g, (_m, _os, _vendor, jdk) => `[pid: $PID] ($OS, $JDK_VENDOR ${jdk} $JDK_ARCH, `);
}
