// dossier show <dossier> <entry> [--json]: print an answer as evidence/<entry>.json records it.
// The question in one line, the verdict, the outcomes beside the call's, the reach, and the trace
// as a table of states: each state's index, its action and the values that changed from the state
// before, the first state with all of them. --json prints the entry as it is. show reads only.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findRoot, locate } from '../dossiers/root.ts';
import { ENTRY_NAME } from '../dossiers/decisions.ts';
import { EVIDENCE, listEntries } from '../trials/answers.ts';
import { parseCall } from '../trials/calls.ts';
import { readOptions } from './call.ts';
import type { Entry } from '../trials/answers.ts';
import type { TlcTraceStep } from '../trials/checkers/tlc.ts';
import type { ItfTrace } from '../trials/checkers/apalache.ts';

const usage = 'usage: dossier show <dossier> <entry> [--json]';

export async function main(command: string, args: string[]): Promise<number> {
  const root = findRoot(args);
  if (!root) { console.error('dossier show: no dossiers root here. Run dossier setup.'); return 2; }
  const { positional, flags, problems } = readOptions(args, [], ['--json']);
  if (problems.length) { console.error(`dossier show: ${problems.join('; ')}\n${usage}`); return 2; }
  const [name, given, ...extra] = positional;
  if (!name || !given || extra.length) { console.error(usage); return 2; }
  const where = locate(root, name);
  if (!where) { console.error(`dossier show: no part or composition named ${name} under ${root}`); return 2; }
  const ref = `${where.kind === 'part' ? 'parts' : 'compositions'}/${where.id}`;
  const entry = given.replace(/^evidence\//, '').replace(/\.(json|md)$/, '');
  const path = join(where.dir, EVIDENCE, `${entry}.json`);
  if (!ENTRY_NAME.test(entry) || !existsSync(path)) {
    const names = listEntries(where.dir);
    console.error(`dossier show: no entry ${entry} in ${ref}/${EVIDENCE}/${names.length ? `; it holds ${names.join(', ')}` : ', which holds none'}`);
    return 2;
  }
  const text = readFileSync(path, 'utf8');
  if (flags.has('--json')) { process.stdout.write(text); return 0; }
  let parsed: Entry;
  try { parsed = JSON.parse(text) as Entry; } catch (e) { console.error(`dossier show: ${ref}/${EVIDENCE}/${entry}.json does not parse: ${(e as Error).message}`); return 1; }
  console.log(showEntry(`${ref}/${EVIDENCE}/${entry}`, parsed));
  return 0;
}

// The entry as text for a reader.
export function showEntry(title: string, entry: Entry): string {
  const q = entry.question || ({} as Entry['question']), a = entry.answer || ({} as Entry['answer']), call = entry.call || ({} as Entry['call']);
  const out: string[] = [title];
  const files = q.executes && q.executes.length ? q.executes.join(', ') : 'prose.md';
  const cell = q.walk ? `; walk ${q.walk} under ${q.scenario}` : q.property ? `; ${q.property} × ${q.scenario}` : '';
  out.push(`question: ${q.kind}${q.checker && q.checker !== q.kind ? ` (${q.checker})` : ''} on ${files}${cell}; expects ${(q.expects || []).join(', ')}`);
  out.push(`verdict: ${a.result}${a.reason ? ` (${a.reason})` : ''}`);
  const outcomes = Object.entries(a.outcomes || {}).map(([n, o]) => `${n} ${o}`).join(', ');
  out.push(`outcomes: ${outcomes || 'none'}`);
  const called = Object.entries(call.expect || {}).map(([n, o]) => `${n} ${o.expect}${o.trace ? `; trace: ${o.trace.join(' > ')}` : ''}${o.failing && o.failing.length ? ` ${o.failing.join(' ')}` : ''}`).join(', ');
  if (called) out.push(`called: ${called}`);
  if (a.miscalls && a.miscalls.length) out.push(`miscalls: ${a.miscalls.join('; ')}`);
  if (a.reach) {
    const values = { ...(a.reach.constants ? Object.fromEntries(Object.entries(a.reach.constants).filter(([, v]) => v != null)) : a.reach.values || {}) };
    const extra = Object.entries(values).map(([k, v]) => `${k} ${v}`).join(', ');
    out.push(`reach: ${a.reach.text}${extra ? ` (${extra})` : ''}`);
  }
  if (a.mode) out.push(`mode: ${a.mode}${a.length != null ? `, length ${a.length}` : ''}`);
  if (a.runs && a.runs.length) out.push(`runs: ${a.runs.map(r => `${r.label} ${r.outcome}`).join(', ')}`);
  if (a.runner) out.push(`runner: ${a.runner}`);
  if (a.counts) out.push(`checks: ${a.counts.passed} passed, ${a.counts.failed} failed of ${a.counts.total}`);
  if (a.checks) for (const c of a.checks.filter(c => c.status !== 'passed')) out.push(`  ${c.status}: ${c.name}${c.message ? ` (${c.message})` : ''}`);
  if (a.evidence && typeof a.evidence === 'object') {
    for (const [id, e] of Object.entries(a.evidence as Record<string, unknown>)) out.push(`evidence ${id}: ${evidenceLine(e)}`);
  }
  if (a.warnings && a.warnings.length) out.push(...a.warnings.map(w => `warning: ${w}`));
  if (entry.established) out.push(`established: ${entry.established.at} by trial ${entry.established.trial}`);
  if (entry.previous) out.push(`previous: ${entry.previous.answer.result}, ${Object.entries(entry.previous.answer.outcomes || {}).map(([n, o]) => `${n} ${o}`).join(', ')}${entry.previous.classification ? `, classified ${entry.previous.classification}` : ''}`);
  const traceData = call.text ? parseCall(call.text).traceData : [];
  const table = traceTable(a.trace as TlcTraceStep[] | ItfTrace | null | undefined);
  if (table) {
    const loopNote = Array.isArray(a.trace) ? '' : ' Apalache records no action; state 1 is where the counterexample starts.';
    out.push('', `trace: each state's values that changed from the state before; the first state shows every value.${loopNote}${traceData.length ? ` The call compares ${traceData.join(', ')}.` : ''}`, '', table);
  }
  return out.join('\n');
}

// One line of an external runner's evidence for an expectation: its end values and its problems.
function evidenceLine(e: unknown): string {
  if (!e || typeof e !== 'object') return JSON.stringify(e);
  const { end, problems, ...rest } = e as { end?: Record<string, unknown>; problems?: unknown[] } & Record<string, unknown>;
  const parts: string[] = [];
  if (end && typeof end === 'object') parts.push(`ends ${Object.entries(end).map(([k, v]) => `${k} = ${typeof v === 'string' ? v : JSON.stringify(v)}`).join(', ')}`);
  if (Array.isArray(problems)) parts.push(problems.length ? `problems: ${problems.map(p => (typeof p === 'string' ? p : JSON.stringify(p))).join('; ')}` : 'no problems');
  if (Object.keys(rest).length) parts.push(JSON.stringify(rest));
  return parts.join('; ');
}

// A recorded trace as a Markdown table, or null when the answer holds none. TLC records each state's
// index, action and values, and the loop's closing; Apalache records the ITF states alone.
export function traceTable(trace: TlcTraceStep[] | ItfTrace | null | undefined): string | null {
  type Row = { index: string; action: string; values: Record<string, string> | null };
  let rows: Row[];
  if (Array.isArray(trace)) {
    rows = trace.map(step => ({
      index: String(step.index),
      action: step.values ? step.action || '' : step.stuttering ? 'Stuttering' : step.backTo != null ? `Back to state ${step.backTo}` : step.action || '',
      values: step.values || null,
    }));
  } else if (trace && Array.isArray(trace.states)) {
    const order = trace.vars && trace.vars.length ? trace.vars : null;
    rows = trace.states.map((state, i) => {
      const names = order || Object.keys(state).filter(k => !k.startsWith('#'));
      return { index: String(i + 1), action: '', values: Object.fromEntries(names.filter(n => Object.hasOwn(state, n)).map(n => [n, itfText(state[n])])) };
    });
  } else return null;
  if (!rows.length) return null;
  const cell = (s: string) => s.replace(/\|/g, '\\|');
  const lines = ['| State | Action | Values |', '| --- | --- | --- |'];
  let before: Record<string, string> | null = null;
  for (const row of rows) {
    let shown = '';
    if (row.values) {
      const changed = Object.entries(row.values).filter(([k, v]) => !before || before[k] !== v);
      shown = changed.length ? changed.map(([k, v]) => `${k} = ${v}`).join(', ') : 'no change';
      before = row.values;
    }
    lines.push(`| ${row.index} | ${cell(row.action)} | ${cell(shown)} |`);
  }
  return lines.join('\n');
}

// An ITF value written as TLA+ writes it, so that it reads like TLC's values.
export function itfText(v: unknown): string {
  if (v === true) return 'TRUE';
  if (v === false) return 'FALSE';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return JSON.stringify(v);
  if (Array.isArray(v)) return `<<${v.map(itfText).join(', ')}>>`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if ('#bigint' in o) return String(o['#bigint']);
    if ('#set' in o) return `{${(o['#set'] as unknown[]).map(itfText).join(', ')}}`;
    if ('#tup' in o) return `<<${(o['#tup'] as unknown[]).map(itfText).join(', ')}>>`;
    if ('#map' in o) { const pairs = o['#map'] as [unknown, unknown][]; return pairs.length ? `(${pairs.map(([k, val]) => `${itfText(k)} :> ${itfText(val)}`).join(' @@ ')})` : '<<>>'; }
    if ('#unserializable' in o) return String(o['#unserializable']);
    return `[${Object.entries(o).filter(([k]) => !k.startsWith('#')).map(([k, val]) => `${k} |-> ${itfText(val)}`).join(', ')}]`;
  }
  return String(v);
}
