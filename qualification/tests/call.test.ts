// dossier call writes what identifies a question, and the prediction the agent gives it. Every
// question Harbor answers is asked again through the command, from the entry's own question and
// prediction, and the written call must carry the same identifying lines and pass the runner's
// planning. The refusals and the report of empty lines are checked beside them.
// Run: node --test qualification/tests/call.test.ts
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCall } from '../../src/trials/calls.ts';
import { planTrial } from '../../src/trials/plan.ts';
import { externalsOf, loadPart, loadComposition } from '../../src/dossiers/load.ts';
import { propertyId } from '../../src/verify/covers.ts';
import { main as callMain } from '../../src/commands/call.ts';
import type { Call } from '../../src/trials/calls.ts';
import type { Entry } from '../../src/trials/answers.ts';

const plugin = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const cli = join(plugin, 'src/cli.ts');

// A copy of Harbor, with each composition's generated module regenerated with its extras, as a trial does.
function harbor() {
  const work = mkdtempSync(join(tmpdir(), 'dossier-call-'));
  cpSync(join(plugin, 'qualification', 'fixture'), work, { recursive: true });
  const root = join(work, 'dossiers');
  const run = (...args: string[]) => spawnSync(process.execPath, [cli, args[0], '--root', root, ...args.slice(1)], { cwd: work, env: { ...process.env, DOSSIER_ROOT: '' }, encoding: 'utf8' });
  for (const id of ['supply', 'control', 'upkeep']) assert.equal(run('scaffold', id).status, 0);
  return { work, root, run };
}

// What the runner's planning says of a call file in a dossier: its problems, none when it would run.
function plan(root: string, ref: string, file: string): { call: Call; problems: string[] } {
  const [kind, id] = ref.split('/');
  const call = parseCall(readFileSync(file, 'utf8'));
  if (call.errors.length) return { call, problems: call.errors };
  const loaded = kind === 'compositions' ? loadComposition(root, id) : loadPart(root, id);
  const { problems } = planTrial({ call, dossierDir: loaded.dir, kind: loaded.kind, externals: externalsOf(root),
    ...(loaded.kind === 'composition'
      ? { compositionProse: loaded.prose, scenarios: loaded.actors.scenarios, module: `model/generated/${loaded.composed.module}.tla`, cells: loaded.composed.cells }
      : { ir: loaded.ir }) });
  return { call, problems };
}

// The command run in this process, as the CLI runs it, with what it prints: the Harbor-wide case
// asks some seventy questions, and a process for each would take most of a minute.
async function inProcess(args: string[]): Promise<{ status: number; stdout: string; stderr: string }> {
  const out: string[] = [], err: string[] = [];
  const log = console.log, error = console.error;
  console.log = (...a: unknown[]) => { out.push(a.join(' ')); };
  console.error = (...a: unknown[]) => { err.push(a.join(' ')); };
  try { return { status: await callMain(args[0], args.slice(1)), stdout: out.join('\n') + '\n', stderr: err.join('\n') }; }
  finally { console.log = log; console.error = error; }
}

// Every answer Harbor holds, with the dossier it belongs to.
function entries(root: string): { ref: string; name: string; entry: Entry }[] {
  const out: { ref: string; name: string; entry: Entry }[] = [];
  for (const kind of ['parts', 'compositions']) for (const id of readdirSync(join(root, kind)).sort()) {
    const folder = join(root, kind, id, 'evidence');
    if (!existsSync(folder)) continue;
    for (const f of readdirSync(folder).filter(f => f.endsWith('.json')).sort()) out.push({ ref: `${kind}/${id}`, name: f.slice(0, -5), entry: JSON.parse(readFileSync(join(folder, f), 'utf8')) });
  }
  return out;
}

// The command line that asks an entry's question again: the kind and the target the tool resolves,
// and the prediction the entry's call made.
function askAgain(ref: string, callName: string, entry: Entry): string[] {
  const call = parseCall(entry.call.text);
  const q = entry.question;
  const file = (path: string) => basename(path).replace(/\.(tla|als|cfg)$/, '');
  let target: string | null = null;
  const options: string[] = [];
  if (q.kind === 'tlc') {
    if (ref.startsWith('compositions/')) target = call.walk || call.property;
    else {
      const module = file(call.executes[0]), cfg = file(call.executes[1]);
      target = cfg === module ? null : cfg.slice(module.length + 1);
    }
  } else if (q.kind === 'apalache') {
    target = call.property || propertyId(call.inv);
    if (call.inv !== `Inv_${target}`) options.push('--inv', call.inv!);
    if (call.mode !== 'inductive') options.push('--mode', call.mode!);
    if (call.length != null) options.push('--length', String(call.length));
  } else if (q.kind === 'blunder') target = file(call.executes[0]);
  if (call.scenario) options.push('--scenario', call.scenario);
  if (call.runner) options.push('--runner', call.runner);
  if (call.blunder) options.push('--blunder', call.blunder);
  if (call.traceData.length) options.push('--trace-data', call.traceData.join(' '));
  options.push('--reach', call.reach, '--because', call.because);
  if (q.kind !== 'blunder') for (const [name, o] of Object.entries(call.expect)) options.push('--expect', `${name}: ${o.expect}${o.trace ? `; trace: ${o.trace.join(' > ')}` : ''}${o.failing && o.failing.length ? ` ${o.failing.join(' ')}` : ''}`);
  return ['call', ref, callName, q.kind, ...(target ? [target] : []), ...options];
}

// The lines the tool computes, as the runner reads them.
const identity = (c: Call) => ({ kind: c.kind, executes: c.executes, property: c.property, scenario: c.scenario, walk: c.walk, mode: c.mode, inv: c.inv, init: c.init, cinit: c.cinit, base: c.base, runner: c.runner, expect: c.expect, traceData: c.traceData, blunder: c.blunder, length: c.length });

describe('dossier call', () => {
  let work: string, root: string, run: ReturnType<typeof harbor>['run'];
  before(() => { ({ work, root, run } = harbor()); });
  after(() => rmSync(work, { recursive: true, force: true }));

  it("writes every question Harbor answers with the entry's own identifying lines, and each call passes planning", async () => {
    const all = entries(root);
    const kinds = new Set<string>();
    assert.ok(all.length > 60, `Harbor holds ${all.length} answers`);
    for (const { ref, name, entry } of all) {
      const callName = `again-${name}`;
      const r = await inProcess([...askAgain(ref, callName, entry), '--root', root]);
      assert.equal(r.status, 0, `${ref} ${name}: ${r.stderr}`);
      assert.match(r.stdout, /^every line is filled in$/m, `${ref} ${name}`);
      const file = join(root, ref, 'calls', `${callName}.md`);
      const { call, problems } = plan(root, ref, file);
      assert.deepEqual(problems, [], `${ref} ${name}: ${problems.join('; ')}`);
      const original = parseCall(entry.call.text);
      assert.deepEqual(identity(call), identity(original), `${ref} ${name}`);
      kinds.add(`${ref.split('/')[0]} ${entry.question.kind}${call.walk || call.traceData.length ? ' witness' : ''}`);
      rmSync(file);
    }
    for (const k of ['parts chart', 'parts tlc', 'parts tlc witness', 'parts apalache', 'parts alloy', 'parts blunder', 'parts external', 'compositions tlc', 'compositions tlc witness', 'compositions apalache', 'compositions blunder']) assert.ok(kinds.has(k), `Harbor has ${k}`);
  });

  it('computes the configuration, the module and the invariant from the dossier', () => {
    const cases: [string[], RegExp[]][] = [
      [['call', 'timelock', 'o1', 'tlc', 'O1'], [/^ {2}- model\/Timelock_O1\.cfg$/m, /^ {2}O1: $/m]],
      [['call', 'vault', 'w2', 'tlc', 'W2'], [/^ {2}- model\/Vault_W2\.cfg$/m, /^ {2}TypeOK: $/m, /^ {2}NotW2: $/m]],
      [['call', 'vault', 'ia1', 'apalache', 'A1'], [/^mode: inductive$/m, /^inv: Inv_A1$/m, /^cinit: ConstInit$/m, /^ {2}- model\/Vault\.tla$/m]],
      [['call', 'compositions/control', 'cell', 'tlc', 'N1', '--scenario', 'executor-offline'], [/^property: N1$/m, /^scenario: executor-offline$/m, /^ {2}- model\/generated\/N1_executor_offline\.cfg$/m]],
      [['call', 'compositions/control', 'w1', 'tlc', 'W1'], [/^walk: W1$/m, /^scenario: governance-captured$/m, /^ {2}- model\/generated\/W1_governance_captured\.cfg$/m]],
      [['call', 'compositions/upkeep', 'ap', 'apalache', 'A1', '--scenario', 'lane-a-captured'], [/^cinit: ConstInit_lane_a_captured$/m, /^inv: Inv_A1$/m, /^ {2}- model\/generated\/Upkeep\.tla$/m]],
      [['call', 'vault', 'rp', 'external', '--runner', 'replay'], [/^runner: replay$/m, /^ {2}- prose\.md$/m, /^ {2}W3: $/m]],
      [['call', 'breaker', 'al', 'alloy'], [/^ {2}- model\/Breaker\.als$/m, /^ {2}A2_halts_from_governance: $/m]],
      [['call', 'breaker', 'bl', 'blunder', 'rogue'], [/^ {2}- model\/blunders\/rogue\.als$/m, /^ {2}A2_halts_from_governance: counterexample$/m, /^blunder:$/m]],
      [['call', 'compositions/control', 'bu', 'blunder', 'unfair', '--scenario', 'all-honest'], [/^property: O1$/m, /^ {2}- model\/blunders\/unfair_O1\.cfg$/m, /^ {2}O1: violated$/m]],
      [['call', 'vault', 'ch', 'chart'], [/^ {2}checks: $/m]],
    ];
    for (const [args, patterns] of cases) {
      const r = run(...args);
      assert.equal(r.status, 0, `${args.join(' ')}: ${r.stderr}`);
      const ref = args[1].includes('/') ? args[1] : `parts/${args[1]}`;
      const text = readFileSync(join(root, ref, 'calls', `${args[2]}.md`), 'utf8');
      for (const p of patterns) assert.match(text, p, `${args.join(' ')}\n${text}`);
      rmSync(join(root, ref, 'calls', `${args[2]}.md`));
    }
  });

  it('reports the lines still empty, and the runner refuses the call until they are filled in', () => {
    const r = run('call', 'vault', 'empty', 'tlc', '--expect', 'A1: holds');
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^wrote parts\/vault\/calls\/empty\.md$/m);
    assert.match(r.stdout, /^still empty: reach, expect TypeOK, expect A2, because$/m);
    const file = join(root, 'parts/vault/calls/empty.md');
    const text = readFileSync(file, 'utf8');
    assert.match(text, /^ {2}TypeOK: $/m, 'an outcome left out is written "  <name>: "');
    assert.match(text, /^ {2}A1: holds$/m);
    const { problems } = plan(root, 'parts/vault', file);
    assert.ok(problems.includes('bad expect line: TypeOK:') && problems.includes('because: is empty'), problems.join('; '));
    // Filled in by hand, the same file plans.
    writeFileSync(file, text.replace('reach:', 'reach: amounts up to 2').replace(/^ {2}TypeOK: $/m, '  TypeOK: holds').replace(/^ {2}A2: $/m, '  A2: holds').replace('because: |', 'because: |\n  the ceiling guards borrow'));
    assert.deepEqual(plan(root, 'parts/vault', file).problems, []);
    rmSync(file);
    const bounded = run('call', 'compositions/upkeep', 'bounded', 'apalache', 'N1', '--scenario', 'lanes-offline', '--mode', 'bounded', '--inv', 'N1', '--reach', '4 steps', '--expect', 'N1: violated', '--because', 'three ticks');
    assert.match(bounded.stdout, /^still empty: length$/m);
    assert.ok(plan(root, 'compositions/upkeep', join(root, 'compositions/upkeep/calls/bounded.md')).problems.some(p => p.startsWith('length:')));
    const external = run('call', 'token', 'replay', 'external', '--reach', 'r', '--expect', 'W1: pass', '--because', 'b');
    assert.match(external.stdout, /^still empty: runner$/m);
    assert.ok(plan(root, 'parts/token', join(root, 'parts/token/calls/replay.md')).problems.includes('an external call names its runner under runner:'));
  });

  it('refuses an existing call file unless --force, an expect key the configuration does not enable, and a composition cell without its scenario', () => {
    const args = ['call', 'token', 'ordinary', 'tlc', '--reach', 'r', '--expect', 'A1: holds', '--because', 'b'];
    assert.equal(run(...args).status, 0);
    const file = join(root, 'parts/token/calls/ordinary.md');
    const before = readFileSync(file, 'utf8');
    const again = run(...args.map(a => (a === 'b' ? 'c' : a)));
    assert.equal(again.status, 2);
    assert.match(again.stderr, /parts\/token\/calls\/ordinary\.md exists; --force replaces it/);
    assert.equal(readFileSync(file, 'utf8'), before, 'a refused call changes nothing');
    assert.equal(run(...args.map(a => (a === 'b' ? 'c' : a)), '--force').status, 0);
    assert.match(readFileSync(file, 'utf8'), /^ {2}c$/m);

    const unknown = run('call', 'token', 'other', 'tlc', '--expect', 'A9: holds');
    assert.equal(unknown.status, 2);
    assert.match(unknown.stderr, /--expect names A9, which model\/Token\.cfg does not enable; it expects TypeOK, A1/);
    assert.equal(existsSync(join(root, 'parts/token/calls/other.md')), false);
    const badOutcome = run('call', 'token', 'other', 'tlc', '--expect', 'A1: probably');
    assert.equal(badOutcome.status, 2);
    assert.match(badOutcome.stderr, /A1: unknown outcome "probably"/);

    const noScenario = run('call', 'compositions/control', 'cell', 'tlc', 'A1');
    assert.equal(noScenario.status, 2);
    assert.match(noScenario.stderr, /a composition trial names its scenario: --scenario <id>/);
    const noApalacheScenario = run('call', 'compositions/supply', 'cell', 'apalache', 'A1');
    assert.equal(noApalacheScenario.status, 2);
    assert.match(noApalacheScenario.stderr, /--scenario <id>/);
    const notACell = run('call', 'compositions/control', 'cell', 'tlc', 'O1', '--scenario', 'executor-offline');
    assert.equal(notACell.status, 2);
    assert.match(notACell.stderr, /O1 × executor-offline is not a cell of compositions\/control/);
    const undefinedInv = run('call', 'vault', 'ia', 'apalache', 'A1', '--inv', 'Inv_A1_missing');
    assert.equal(undefinedInv.status, 2);
    assert.match(undefinedInv.stderr, /model\/Vault\.tla does not define Inv_A1_missing/);
    const misplaced = run('call', 'vault', 'x', 'tlc', '--scenario', 'all-honest', '--runner', 'replay');
    assert.equal(misplaced.status, 2);
    assert.match(misplaced.stderr, /--runner belongs to an external call/);
    assert.match(misplaced.stderr, /--scenario belongs to a composition trial/);
    assert.equal(existsSync(join(root, 'compositions/control/calls/cell.md')), false);
  });

  it('writes base: for a blunder when model/ holds more than one module', () => {
    cpSync(join(root, 'parts/vault/model/Vault.tla'), join(root, 'parts/vault/model/Ledger.tla'));
    try {
      const r = run('call', 'vault', 'lost', 'blunder', 'lostfree', '--blunder', 'w', '--reach', 'r', '--because', 'b');
      assert.equal(r.status, 0, r.stderr);
      const file = join(root, 'parts/vault/calls/lost.md');
      assert.match(readFileSync(file, 'utf8'), /^base: model\/Vault\.tla$/m);
      assert.deepEqual(plan(root, 'parts/vault', file).problems, []);
      const named = run('call', 'vault', 'lost2', 'blunder', 'lostfree', '--base', 'Ledger', '--blunder', 'w', '--reach', 'r', '--because', 'b');
      assert.equal(named.status, 0, named.stderr);
      assert.match(readFileSync(join(root, 'parts/vault/calls/lost2.md'), 'utf8'), /^base: model\/Ledger\.tla$/m);
    } finally { rmSync(join(root, 'parts/vault/model/Ledger.tla')); }
  });
});
