// call.md: what the agent says a trial will return, written before it runs.
//   kind: chart | blunder | tlc | apalache | alloy | external
//   executes: the files, as "- path" lines (relative to the dossier folder)
//   reach: words
//   expect: one line per enabled property, the one Alloy command, or "checks: pass | fail <ids>"
//   because: why, as a block
//   property, scenario: the cell, for a system trial
//   walk, scenario: the witness, for a system tlc trial, in place of property:
//   mode, length, inv, init, cinit: for apalache
//   blunder, base: for a blunder;  trace-data: for a witness;  runner: for external
export const KINDS: string[] = ['chart', 'blunder', 'tlc', 'apalache', 'alloy', 'external'];

// One expect line: holds, violated (optionally with the trace it takes), pass or fail with the failing checks, and so on.
export interface Outcome { expect: string; trace?: string[]; failing?: string[]; unknown?: boolean }

// A parsed call.md. kind is as written; errors say what is wrong with it.
export interface Call {
  kind: string | null;
  executes: string[];
  reach: string;
  expect: Record<string, Outcome>;
  because: string;
  blunder: string | null;
  base: string | null;
  traceData: string[];
  property: string | null;
  scenario: string | null;
  walk: string | null;
  mode: string | null;
  length: number | null;
  inv: string | null;
  init: string | null;
  cinit: string | null;
  runner: string | null;
  errors: string[];
}

export function parseCall(text: string): Call {
  const call: Call = { kind: null, executes: [], reach: '', expect: {}, because: '', blunder: null, base: null, traceData: [], property: null, scenario: null, walk: null, mode: null, length: null, inv: null, init: null, cinit: null, runner: null, errors: [] };
  let mode: string | null = null, lengthWritten = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+$/, '');
    if (mode === 'executes' && /^\s*-\s/.test(line)) { call.executes.push(line.replace(/^\s*-\s*/, '').trim()); continue; }
    if (mode === 'expect' && /^\s+\S/.test(line)) {
      const m = line.match(/^\s+([A-Za-z_]\w*):\s*(.+)$/);
      if (m) call.expect[m[1]] = parseOutcome(m[2]); else call.errors.push(`bad expect line: ${line.trim()}`);
      continue;
    }
    if (mode === 'because' && (/^\s+\S/.test(line) || line === '')) { call.because += line.replace(/^\s{2}/, '') + '\n'; continue; }
    if (line.trim() === '') { mode = null; continue; }
    const kv = line.match(/^([a-z-]+):\s*(.*)$/);
    if (!kv) { call.errors.push(`unrecognized line: ${line.trim()}`); mode = null; continue; }
    const [, key, value] = kv;
    mode = null;
    switch (key) {
      case 'kind': call.kind = value.trim(); break;
      case 'executes': mode = 'executes'; if (value.trim()) call.executes.push(...value.split(/\s*,\s*/).filter(Boolean)); break;
      case 'reach': call.reach = value.trim(); break;
      case 'expect': mode = 'expect'; break;
      case 'because': mode = 'because'; if (value.trim() && value.trim() !== '|') call.because = value.trim() + '\n'; break;
      case 'blunder': call.blunder = value.trim(); break;
      case 'base': call.base = value.trim(); break;
      case 'trace-data': call.traceData = value.split(/[\s,]+/).filter(Boolean); break;
      case 'property': call.property = value.trim(); break;
      case 'scenario': call.scenario = value.trim(); break;
      case 'walk': call.walk = value.trim(); break;
      case 'mode': call.mode = value.trim(); break;
      // A whole number of steps; anything else, an empty value among them, is refused, never read as 0.
      case 'length':
        lengthWritten = true;
        if (/^\d+$/.test(value.trim())) call.length = Number(value.trim());
        else call.errors.push(`length: is a whole number of steps, not "${value.trim()}"`);
        break;
      case 'inv': call.inv = value.trim(); break;
      case 'init': call.init = value.trim(); break;
      case 'cinit': call.cinit = value.trim(); break;
      case 'runner': call.runner = value.trim(); break;
      default: call.errors.push(`unknown key: ${key}`);
    }
  }
  call.because = call.because.trim();
  if (!KINDS.includes(call.kind!)) call.errors.push(`kind must be one of ${KINDS.join(', ')}`);
  if (call.executes.length === 0) call.errors.push('executes: lists nothing');
  if (Object.keys(call.expect).length === 0) call.errors.push('expect: lists nothing');
  if (!call.because) call.errors.push('because: is empty');
  if (call.kind === 'blunder' && !call.blunder) call.errors.push('a blunder call names its wrong under blunder:');
  if (call.kind === 'apalache' && !['bounded', 'inductive'].includes(call.mode || '')) call.errors.push('an apalache call sets mode: bounded or mode: inductive');
  if (call.kind === 'apalache' && call.mode === 'bounded' && call.length === null && !lengthWritten) call.errors.push('a bounded apalache call sets length: <steps>');
  if (call.kind === 'external' && !call.runner) call.errors.push('an external call names its runner under runner:');
  // A system trial names its cell, property: and scenario:, or its witness, walk: and scenario:.
  if (call.property && call.walk) call.errors.push('a call names property: or walk:, not both');
  else if (call.property && !call.scenario) call.errors.push('a cell names both property: and scenario:');
  else if (call.walk && !call.scenario) call.errors.push('a witness names both walk: and scenario:');
  else if (call.scenario && !call.property && !call.walk) call.errors.push('scenario: goes with property: for a cell or walk: for a witness');
  for (const [name, o] of Object.entries(call.expect)) if (o.unknown) call.errors.push(`${name}: unknown outcome "${o.expect}"`);
  return call;
}

export function parseOutcome(text: string): Outcome {
  const t = text.trim();
  const traced = t.match(/^violated\s*;\s*trace:\s*(.+)$/);
  if (traced) return { expect: 'violated', trace: traced[1].split(/\s*>\s*/).map(s => s.trim()).filter(Boolean) };
  if (/^(holds|violated|counterexample|no counterexample|instance|no instance)$/.test(t)) return { expect: t };
  if (/^(all pass|pass)$/.test(t)) return { expect: 'pass' };
  const fail = t.match(/^fail(?:\s+(.+))?$/);
  if (fail) return { expect: 'fail', failing: fail[1] ? fail[1].split(/[\s,]+/).filter(Boolean) : [] };
  return { expect: t, unknown: true };
}
