import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseProse } from '../../src/prose/prose.ts';
import { compileIR } from '../../src/prose/ir.ts';
import { loadRuntime } from '../../src/chart/draw.ts';
import { buildMachine, leavesOf } from '../../src/chart/machine.ts';
import type { Snapshot } from '../../src/chart/machine.ts';
import { explore } from '../../src/chart/explore.ts';
import { runChecks } from '../../src/chart/checks.ts';
import { cap, parseTla, scaffoldTla } from '../../src/models/tla.ts';

export interface Comparison { states: number; edges: number; eventCases: number; witnesses: Record<string, boolean>; seconds: number }
const literal = (value: unknown): string => typeof value === 'boolean' ? String(value).toUpperCase() : JSON.stringify(value);
const tuple = (values: unknown[]) => `<<${values.map(literal).join(', ')}>>`;
const key = (value: unknown) => JSON.stringify(value);

export function parseValue(text: string): unknown {
  const value = text.trim();
  if (value === 'TRUE' || value === 'FALSE') return value === 'TRUE';
  if (/^-?\d+$/.test(value)) return Number(value);
  if (value.startsWith('"')) return JSON.parse(value);
  if (value.startsWith('<<') && value.endsWith('>>')) {
    const inner = value.slice(2, -2), parts: string[] = [];
    let start = 0, depth = 0, quoted = false, escaped = false;
    for (let i = 0; i < inner.length; i++) {
      const c = inner[i];
      if (quoted) { if (escaped) escaped = false; else if (c === '\\') escaped = true; else if (c === '"') quoted = false; continue; }
      if (c === '"') quoted = true;
      else if (inner.slice(i, i + 2) === '<<') { depth++; i++; }
      else if (inner.slice(i, i + 2) === '>>') { depth--; i++; }
      else if (c === ',' && depth === 0) { parts.push(inner.slice(start, i)); start = i + 1; }
    }
    if (inner.trim()) parts.push(inner.slice(start));
    return parts.map(parseValue);
  }
  throw new Error(`unsupported dump value: ${value}`);
}

export function parseDump(text: string): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [];
  for (const block of text.split(/^State \d+:[^\n]*\n/m).slice(1)) {
    const state: Record<string, unknown> = {};
    let name = '', value = '';
    const flush = () => { if (name) state[name] = parseValue(value); };
    for (const line of block.split('\n')) {
      const match = line.match(/^\/\\ (\w+) = (.*)$/);
      if (match) { flush(); name = match[1]; value = match[2]; }
      else if (line.trim()) value += ' ' + line.trim();
    }
    flush();
    assert.ok(Object.keys(state).length, 'a dumped state has variables');
    result.push(state);
  }
  assert.ok(result.length, 'TLC emitted a nonempty state dump');
  return result;
}

export function runTlc(directory: string, module: string, configuration: string) {
  const java = process.env.JAVA || 'java', jar = process.env.TLA_TOOLS;
  if (!jar) throw new Error('TLA_TOOLS is required for differential TLC execution');
  const result = spawnSync(java, ['-XX:+UseParallelGC', '-Xmx512m', '-cp', jar, 'tlc2.TLC', '-deadlock', '-workers', '1', '-metadir', join(directory, 'metadata'), '-dump', join(directory, 'states'), '-config', configuration, module], { cwd: directory, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 30000 });
  if (result.error) throw result.error;
  writeFileSync(join(directory, 'output.txt'), result.stdout + result.stderr);
  assert.equal(result.status, 0, `TLC failed (${result.status}): ${(result.stdout + result.stderr).slice(-7000)}`);
  assert.match(result.stdout, /Model checking completed\. No error has been found/);
  return parseDump(readFileSync(join(directory, 'states.dump'), 'utf8'));
}

export async function compareComponent(prose: string, directory: string, plugin: string, mutate?: (tla: string) => string): Promise<Comparison> {
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'prose.md'), prose);
  const ir = compileIR(parseProse(prose));
  assert.deepEqual(ir.errors, [], 'generated input compiles');
  const runtime = await loadRuntime(plugin);
  assert.ok(!runtime.error, runtime.error);
  const machine = buildMachine(ir, runtime.xstate!);
  const graph = explore(machine, ir, runtime.graph!);
  assert.equal(graph.limitHit, false);
  assert.ok(!graph.unevaluable, JSON.stringify(graph.unevaluable));
  const names = ir.context.map(d => d.name);
  const project = (snapshot: Snapshot) => [leavesOf(snapshot.value)[0], ...names.map(n => snapshot.context[n])];
  const states = [...new Set(graph.states.map(s => key(project(s))))].sort();
  const edges = new Set<string>();
  const clauses: string[] = [];
  let tla = scaffoldTla(ir, { moduleName: 'Case' });
  if (mutate) tla = mutate(tla);
  const parsed = parseTla(tla);
  const variants: string[] = [];
  for (const [index, event] of ir.eventCases.entries()) {
    const actions: string[] = [];
    for (const move of ir.transitions.filter(m => m.event === event.type)) {
      const original = `${move.id}_${cap(move.event!)}`;
      let body = parsed.definitions[original].text.replace(new RegExp(`^${original} ==`), `Diff_${index}_${move.id} ==`);
      const fields = Object.entries(event).filter(([name]) => name !== 'type');
      if (fields.length) body = body.replace(/(\\E [^\n]+ :)\n/, `$1\n    /\\ ${fields.map(([name, value]) => `${name} = ${literal(value)}`).join(' /\\ ')}\n`);
      variants.push(body);
      actions.push(`Diff_${index}_${move.id}`);
    }
    variants.push(`DiffEvent${index} == ${actions.join(' \\/ ') || 'FALSE'}`);
    const allowed = graph.states.filter(s => s.can(event));
    const allowedStates = [...new Set(allowed.map(s => tuple(project(s))))];
    clauses.push(`(ENABLED DiffEvent${index}) = (DiffProjection \\in {${allowedStates.join(', ')}})`);
    for (const snapshot of allowed) edges.add(key([project(snapshot), index + 1, project(runtime.xstate!.getNextSnapshot(machine, snapshot, event))]));
  }
  // Can_<move> existentially quantifies fields; compare it independently with
  // the chart's accepted event cases at the move's source state.
  for (const move of ir.transitions) {
    const allowed = graph.states.filter(s => leavesOf(s.value).includes(move.from!) && ir.eventCases.filter(e => e.type === move.event).some(e => s.can(e)));
    clauses.push(`Can_${move.id}_${cap(move.event!)} = (DiffProjection \\in {${[...new Set(allowed.map(s => tuple(project(s))))].join(', ')}})`);
  }
  const checks = runChecks({ ir, machine, xstate: runtime.xstate!, explored: graph });
  const witnesses = Object.fromEntries(ir.walks.map(w => [w.id, checks.checks.find(c => c.ids.includes(w.id) && /walk .* replays$/.test(c.name))!.status === 'passed']));
  const footer = `\nVARIABLES diff_previous, diff_event, diff_walks\nDiffProjection == <<state${names.map(n => `, ${n}`).join('')}>>\n${variants.join('\n')}\nDiffWitnesses == <<${ir.walks.map(w => `${w.id}_End`).join(', ')}>>\nDiffInit == /\\ Init /\\ diff_previous = DiffProjection /\\ diff_event = 0 /\\ diff_walks = DiffWitnesses\nDiffNext ==\n${ir.eventCases.map((_, i) => `  \\/ (/\\ DiffEvent${i} /\\ diff_previous' = DiffProjection /\\ diff_event' = ${i + 1} /\\ diff_walks' = DiffWitnesses')`).join('\n')}\nDiffAgreement ==\n${clauses.map(c => `  /\\ (${c})`).join('\n')}\n`;
  tla = tla.replace(/^={4,}\s*$/m, footer + '======================================================================');
  writeFileSync(join(directory, 'Case.tla'), tla);
  writeFileSync(join(directory, 'Case.cfg'), 'INIT DiffInit\nNEXT DiffNext\nCONSTANT MaxSent = 4\nINVARIANTS TypeOK DiffAgreement\nCHECK_DEADLOCK FALSE\n');
  const started = Date.now();
  const dumped = runTlc(directory, 'Case', 'Case.cfg');
  const actualStates = new Set<string>(), actualEdges = new Set<string>();
  const observedWalks = ir.walks.map(() => false);
  for (const state of dumped) {
    const current = [state.state, ...names.map(n => state[n])];
    actualStates.add(key(current));
    if (state.diff_event !== 0) actualEdges.add(key([state.diff_previous, state.diff_event, current]));
    (state.diff_walks as boolean[]).forEach((hit, i) => { observedWalks[i] ||= hit; });
  }
  assert.deepEqual([...actualStates].sort(), states, 'reachable state/data projection agrees');
  assert.deepEqual([...actualEdges].sort(), [...edges].sort(), 'event- and field-specific transition relation agrees');
  assert.deepEqual(Object.fromEntries(ir.walks.map((w, i) => [w.id, observedWalks[i]])), witnesses, 'witness start/refusal/end semantics agree');
  return { states: states.length, edges: edges.size, eventCases: ir.eventCases.length, witnesses, seconds: (Date.now() - started) / 1000 };
}
