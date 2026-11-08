// dossier show prints an answer from evidence/<entry>.json: the question, the verdict, the outcomes,
// the reach and the trace as a table whose rows hold only the values that changed. It reads only.
// Run: node --test qualification/tests/show.test.ts
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from '../../src/hash.ts';
import { itfText, traceTable } from '../../src/commands/show.ts';
import type { Entry } from '../../src/trials/answers.ts';
import type { TlcTraceStep } from '../../src/trials/checkers/tlc.ts';

const plugin = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const cli = join(plugin, 'src/cli.ts');

// Every file under a folder with its digest, to show that a command wrote nothing.
function tree(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  const walk = (d: string) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) walk(p); else out[relative(dir, p)] = sha256(readFileSync(p)); } };
  walk(dir);
  return out;
}
// The rows of a printed trace table: index, action and the name = value pairs.
function rows(text: string): { index: string; action: string; values: Record<string, string> }[] {
  return text.split('\n').filter(l => /^\| \d+ \|/.test(l)).map(l => {
    const [, index, action, values] = l.split(/(?<!\\)\|/).map(c => c.trim().replace(/\\\|/g, '|'));
    const pairs = values && values !== 'no change' ? values.split(/, (?=[a-z_0-9]+ = )/i).map(p => p.split(' = ')) : [];
    return { index, action, values: Object.fromEntries(pairs) };
  });
}

// An induction counterexample as Apalache records it in an entry: the ITF variables and two states,
// the arbitrary first state and the step's successor, with numbers as #bigint.
const big = (n: number) => ({ '#bigint': String(n) });
const inductionTrace = {
  vars: ['timelock_state', 'timelock_early', 'vault_debt', 'vault_free', 'vault_issued', 'breaker_halted'],
  states: [
    { timelock_state: 'Scheduled', timelock_early: false, vault_debt: big(0), vault_free: big(3), vault_issued: big(0), breaker_halted: false },
    { timelock_state: 'Scheduled', timelock_early: false, vault_debt: big(1), vault_free: big(4), vault_issued: big(0), breaker_halted: false },
  ],
};

describe('dossier show', () => {
  let work: string, root: string;
  const run = (...args: string[]) => spawnSync(process.execPath, [cli, args[0], '--root', root, ...args.slice(1)], { cwd: work, env: { ...process.env, DOSSIER_ROOT: '' }, encoding: 'utf8' });
  const entryNamed = (ref: string, prefix: string) => readdirSync(join(root, ref, 'evidence')).find(f => f.startsWith(prefix) && f.endsWith('.json'))!.slice(0, -5);
  const read = (ref: string, name: string) => JSON.parse(readFileSync(join(root, ref, 'evidence', `${name}.json`), 'utf8')) as Entry;
  before(() => {
    work = mkdtempSync(join(tmpdir(), 'dossier-show-'));
    cpSync(join(plugin, 'qualification', 'fixture'), work, { recursive: true });
    root = join(work, 'dossiers');
  });
  after(() => rmSync(work, { recursive: true, force: true }));

  it('prints a violated TLC cell with its trace, each row holding only the values that changed', () => {
    const name = entryNamed('systems/control', 'tlc-N1-executor-offline-');
    const entry = read('systems/control', name);
    const before = tree(root);
    const r = run('show', 'systems/control', name);
    assert.equal(r.status, 0, r.stderr);
    assert.deepEqual(tree(root), before, 'show writes nothing');
    assert.match(r.stdout, new RegExp(`^systems/control/evidence/${name}$`, 'm'));
    assert.match(r.stdout, /^question: tlc on model\/generated\/Control\.tla, model\/generated\/N1_executor_offline\.cfg; N1 × executor-offline; expects N1, TypeOK$/m);
    assert.match(r.stdout, /^verdict: as-called$/m);
    assert.match(r.stdout, /^outcomes: .*N1 violated/m);
    assert.match(r.stdout, /^reach: delay 2; amounts up to 2; ceiling 2\.\.4; effects up to 4 \(MaxSent 4, /m);
    assert.match(r.stdout, /^\| State \| Action \| Values \|$/m);
    const trace = entry.answer.trace as TlcTraceStep[];
    const printed = rows(r.stdout);
    assert.equal(printed.length, trace.length);
    let previous: Record<string, string> | null = null;
    trace.forEach((step, i) => {
      assert.equal(printed[i].index, String(step.index));
      assert.equal(printed[i].action, step.action);
      const changed = Object.fromEntries(Object.entries(step.values!).filter(([k, v]) => !previous || previous[k] !== v));
      assert.deepEqual(printed[i].values, changed, `state ${step.index}`);
      previous = step.values!;
    });
    assert.equal(Object.keys(printed[0].values).length, Object.keys(trace[0].values!).length, 'the first state shows every value');
  });

  it('prints a witness with the trace the call predicted and the variables it compares', () => {
    const name = entryNamed('components/vault', 'tlc-W1-');
    const r = run('show', 'vault', `evidence/${name}.json`);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^outcomes: TypeOK holds, NotW1 violated$/m);
    assert.match(r.stdout, /^called: TypeOK holds, NotW1 violated; trace: Open\/0\/0 > Open\/2\/2 > Open\/1\/1$/m);
    assert.match(r.stdout, /The call compares debt, free\./);
    const printed = rows(r.stdout);
    assert.deepEqual(printed.map(p => [p.action, p.values.debt, p.values.free]), [['Initial predicate', '0', '0'], ['M1_Borrow', '2', '2'], ['M2_Repay', '1', '1']]);
    assert.equal(printed[1].values.state, undefined, 'an unchanged value is left out');
  });

  it('closes a liveness trace with its loop and prints the checker warnings', () => {
    const name = entryNamed('systems/control', 'blunder-O1-all-honest-');
    const trace = read('systems/control', name).answer.trace as TlcTraceStep[];
    const r = run('show', 'systems/control', name);
    assert.equal(r.status, 0, r.stderr);
    const last = trace.at(-1)!;
    const closing = last.stuttering ? 'Stuttering' : `Back to state ${last.backTo}`;
    assert.match(r.stdout, new RegExp(`^\\| ${last.index} \\| ${closing} \\|  \\|$`, 'm'));
    assert.match(r.stdout, /^warning: Declaring state or action constraints during liveness checking is dangerous/m);
  });

  it('prints an Apalache induction counterexample from its ITF states, and its runs', () => {
    const name = entryNamed('systems/control', 'apalache-A1-all-honest-');
    const entry = read('systems/control', name);
    const counter = { ...entry, answer: { ...entry.answer, result: 'miscalled', outcomes: { Inv_A1: 'violated' }, miscalls: ['Inv_A1: called holds, got violated'], runs: [{ label: 'step', outcome: 'Error', length: 1, exitcode: 12, violatedInvariant: null, errors: [] }, { label: 'base', outcome: 'NoError', length: 0, exitcode: 0, violatedInvariant: null, errors: [] }], trace: inductionTrace } };
    writeFileSync(join(root, 'systems/control/evidence/apalache-A1-all-honest-000000.json'), JSON.stringify(counter, null, 2) + '\n');
    try {
      const r = run('show', 'systems/control', 'apalache-A1-all-honest-000000');
      assert.equal(r.status, 0, r.stderr);
      assert.match(r.stdout, /^verdict: miscalled$/m);
      assert.match(r.stdout, /^outcomes: Inv_A1 violated$/m);
      assert.match(r.stdout, /^miscalls: Inv_A1: called holds, got violated$/m);
      assert.match(r.stdout, /^mode: inductive$/m);
      assert.match(r.stdout, /^runs: step Error, base NoError$/m);
      assert.match(r.stdout, /Apalache records no action; state 1 is where the counterexample starts\./);
      const printed = rows(r.stdout);
      assert.deepEqual(printed[0].values, { timelock_state: '"Scheduled"', timelock_early: 'FALSE', vault_debt: '0', vault_free: '3', vault_issued: '0', breaker_halted: 'FALSE' });
      assert.deepEqual(printed[1].values, { vault_debt: '1', vault_free: '4' });
      assert.deepEqual(printed.map(p => p.action), ['', '']);
    } finally { rmSync(join(root, 'systems/control/evidence/apalache-A1-all-honest-000000.json')); }
    const proved = run('show', 'systems/control', name);
    assert.match(proved.stdout, /^runs: step NoError, base NoError$/m);
    assert.doesNotMatch(proved.stdout, /\| State \|/, 'an answer with no trace prints no table');
  });

  it('prints the entry as it is with --json, and refuses an entry that is not there', () => {
    const name = entryNamed('components/token', 'external-');
    const r = run('show', 'token', name, '--json');
    assert.equal(r.status, 0, r.stderr);
    assert.equal(r.stdout, readFileSync(join(root, 'components/token/evidence', `${name}.json`), 'utf8'));
    const plain = run('show', 'token', name);
    assert.match(plain.stdout, /^runner: replay$/m);
    assert.match(plain.stdout, /^evidence W1: ends state = Live, supply = 0; no problems$/m);
    const chart = run('show', 'token', entryNamed('components/token', 'chart-'));
    assert.match(chart.stdout, /^checks: \d+ passed, 0 failed of \d+$/m);
    const missing = run('show', 'token', 'tlc-A9-000000');
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /no entry tlc-A9-000000 in components\/token\/evidence\/; it holds /);
  });

  it('writes ITF values as TLA+ writes them', () => {
    assert.equal(itfText({ '#set': [big(1), big(2)] }), '{1, 2}');
    assert.equal(itfText({ '#tup': ['a', true] }), '<<"a", TRUE>>');
    assert.equal(itfText({ '#map': [[big(1), 'x']] }), '(1 :> "x")');
    assert.equal(itfText({ a: big(1), b: false }), '[a |-> 1, b |-> FALSE]');
    assert.equal(traceTable(null), null);
    assert.equal(traceTable([{ index: 1, action: 'Initial predicate', values: { x: 'a|b' } }]), '| State | Action | Values |\n| --- | --- | --- |\n| 1 | Initial predicate | x = a\\|b |');
  });
});
