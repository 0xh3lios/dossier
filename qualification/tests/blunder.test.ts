// dossier blunder writes a blunder copy, the configuration that enables its one property, and its
// call, so that the agent chooses only the wrong. Each blunder it writes must pass the runner's
// planning, which compares the copy with its base. Run: node --test qualification/tests/blunder.test.ts
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCall } from '../../src/trials/calls.ts';
import { planTrial } from '../../src/trials/plan.ts';
import { externalsOf, loadPart, loadComposition, compositionModuleText } from '../../src/dossiers/load.ts';
import { onlyProperty } from '../../src/commands/blunder.ts';

const plugin = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const cli = join(plugin, 'src/cli.ts');

describe('dossier blunder', () => {
  let work: string, root: string;
  const run = (...args: string[]) => spawnSync(process.execPath, [cli, args[0], '--root', root, ...args.slice(1)], { cwd: work, env: { ...process.env, DOSSIER_ROOT: '' }, encoding: 'utf8' });
  const text = (path: string) => readFileSync(join(root, path), 'utf8');
  // The runner's planning of a call file: its problems, none when it would run.
  const plan = (ref: string, name: string): string[] => {
    const [kind, id] = ref.split('/');
    const call = parseCall(text(`${ref}/calls/${name}.md`));
    if (call.errors.length) return call.errors;
    const loaded = kind === 'compositions' ? loadComposition(root, id) : loadPart(root, id);
    return planTrial({ call, dossierDir: loaded.dir, kind: loaded.kind, externals: externalsOf(root),
      ...(loaded.kind === 'composition'
        ? { compositionProse: loaded.prose, scenarios: loaded.actors.scenarios, module: `model/generated/${loaded.composed.module}.tla`, cells: loaded.composed.cells }
        : { ir: loaded.ir }) }).problems;
  };
  before(() => {
    work = mkdtempSync(join(tmpdir(), 'dossier-blunder-'));
    cpSync(join(plugin, 'qualification', 'fixture'), work, { recursive: true });
    root = join(work, 'dossiers');
    for (const id of ['supply', 'control', 'upkeep']) assert.equal(run('scaffold', id).status, 0);
  });
  after(() => rmSync(work, { recursive: true, force: true }));

  it("copies a part's module, applies the one replacement, reduces its own configuration to the property and writes the call", () => {
    const fair = '        /\\ WF_vars(Public_Execute)                        \\* from G1\n';
    const r = run('blunder', 'timelock', 'lazy', '--replace', fair, '--with', '', '--property', 'O1', '--wrong', 'the executor is no longer fair', '--reach', 'one plan; delay 2', '--because', 'a scheduled plan may wait forever');
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /^wrote parts\/timelock\/model\/blunders\/lazy\.tla, one replacement$/m);
    assert.match(r.stdout, /^wrote parts\/timelock\/model\/blunders\/lazy_O1\.cfg, enabling O1 alone$/m);
    assert.match(r.stdout, /^wrote parts\/timelock\/calls\/blunder-lazy\.md$/m);
    assert.match(r.stdout, /^every line is filled in$/m);
    const base = text('parts/timelock/model/Timelock.tla');
    assert.equal(text('parts/timelock/model/blunders/lazy.tla'), base.replace('MODULE Timelock ', 'MODULE lazy ').replace(fair, ''));
    // O1 is not in Timelock.cfg; the configuration of the module that enables it is Timelock_O1.cfg.
    assert.equal(text('parts/timelock/model/blunders/lazy_O1.cfg'), text('parts/timelock/model/Timelock_O1.cfg'));
    const call = parseCall(text('parts/timelock/calls/blunder-lazy.md'));
    assert.deepEqual([call.kind, call.executes, call.blunder, call.reach, call.expect, call.base], ['blunder', ['model/blunders/lazy.tla', 'model/blunders/lazy_O1.cfg'], 'the executor is no longer fair', 'one plan; delay 2', { O1: { expect: 'violated' } }, null]);
    assert.deepEqual(plan('parts/timelock', 'blunder-lazy'), []);

    // An invariant: the module's own configuration, with INVARIANTS reduced to the one property.
    const n = run('blunder', 'oracle', 'rushed', '--replace', '  /\\ ~Due_LaneA                      \\* G1\n  /\\ ~Due_LaneB                      \\* G2\n', '--with', '', '--property', 'N1', '--wrong', 'the chain ticks while a post is due', '--all');
    assert.equal(n.status, 0, n.stderr);
    assert.match(n.stdout, /3 replacements/);
    assert.match(n.stdout, /^still empty: reach, because$/m);
    assert.equal(text('parts/oracle/model/blunders/rushed_N1.cfg'), text('parts/oracle/model/Oracle.cfg').replace(/^INVARIANTS .*$/m, 'INVARIANTS N1'));
    assert.deepEqual(plan('parts/oracle', 'blunder-rushed').filter(p => !/because|reach/.test(p)), []);
  });

  it("copies a composition's generated module and the cell's configuration, and names the cell in the call", () => {
    const relay = '/\\ (adapter_state = "Open" /\\ adapter_state\' = "Halted" /\\ adapter_live\' = FALSE /\\ UNCHANGED <<adapter_held, adapter_sent_move, adapter_sent_release, adapter_sent_mint, adapter_sent_burn>>)';
    const unrelayed = '/\\ (adapter_state = "Open" /\\ UNCHANGED <<adapter_state, adapter_held, adapter_live, adapter_sent_move, adapter_sent_release, adapter_sent_mint, adapter_sent_burn>>)';
    const r = run('blunder', 'compositions/control', 'cut', '--replace', relay, '--with', unrelayed, '--property', 'A2', '--scenario', 'all-honest', '--wrong', 'the breaker records a halt the adapter never receives', '--reach', 'amounts up to 2', '--because', 'halted is set while the Adapter stays Open');
    assert.equal(r.status, 0, r.stderr);
    const s = loadComposition(root, 'control');
    assert.equal(text('compositions/control/model/blunders/cut.tla'), compositionModuleText(s).replace('MODULE Control ', 'MODULE cut ').replace(relay, unrelayed));
    assert.equal(text('compositions/control/model/blunders/cut_A2.cfg'), text('compositions/control/model/generated/A2_all_honest.cfg').replace(/^INVARIANTS .*$/m, 'INVARIANTS A2'));
    const call = parseCall(text('compositions/control/calls/blunder-cut.md'));
    assert.deepEqual([call.property, call.scenario, call.executes, call.expect], ['A2', 'all-honest', ['model/blunders/cut.tla', 'model/blunders/cut_A2.cfg'], { A2: { expect: 'violated' } }]);
    assert.deepEqual(plan('compositions/control', 'blunder-cut'), []);

    // A liveness cell keeps its PROPERTIES line and loses nothing else.
    const fair = '        /\\ WF_vars(HonestPublic_timelock_Execute)        \\* from control.G1 timelock.G1\n';
    const o = run('blunder', 'compositions/control', 'idle', '--replace', fair, '--with', '', '--property', 'O1', '--scenario', 'all-honest', '--wrong', 'the executor is no longer fair', '--reach', 'r', '--because', 'b');
    assert.equal(o.status, 0, o.stderr);
    assert.equal(text('compositions/control/model/blunders/idle_O1.cfg'), text('compositions/control/model/generated/O1_all_honest.cfg'));
    assert.deepEqual(plan('compositions/control', 'blunder-idle'), []);
  });

  it("copies an Alloy base named with --base, and its one check is what the blunder must catch", () => {
    const fact = 'fact X1_halt_by_breaker { all h: Halt | h.by in Breaker }  // X1: halt crosses from Breaker to Adapter\n';
    const r = run('blunder', 'breaker', 'loose', '--base', 'Breaker.als', '--replace', fact, '--with', '', '--wrong', 'the seam no longer says halts come from Breakers', '--reach', 'scope 4', '--because', 'an Other may send a halt');
    assert.equal(r.status, 0, r.stderr);
    assert.equal(text('parts/breaker/model/blunders/loose.als'), text('parts/breaker/model/Breaker.als').replace(fact, ''));
    assert.match(text('parts/breaker/calls/blunder-loose.md'), /^ {2}A2_halts_from_governance: counterexample$/m);
    assert.deepEqual(plan('parts/breaker', 'blunder-loose'), []);
  });

  it('refuses text the module lacks, text it holds twice without --all, a composition blunder without its scenario, and an existing copy, and writes nothing then', () => {
    const files = () => ['parts/vault/model/blunders/nowhere.tla', 'parts/vault/model/blunders/nowhere_A1.cfg', 'parts/vault/calls/blunder-nowhere.md'].filter(f => existsSync(join(root, f)));
    const missing = run('blunder', 'vault', 'nowhere', '--replace', 'no such text', '--with', '', '--property', 'A1', '--wrong', 'w');
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /--replace text is not in model\/Vault\.tla/);
    assert.deepEqual(files(), []);
    const twice = run('blunder', 'oracle', 'twice', '--replace', "    /\\ state' = \"Fresh\"\n    /\\ stale' = 0\n", '--with', '', '--property', 'A1', '--wrong', 'w');
    assert.equal(twice.status, 2);
    assert.match(twice.stderr, /--replace text is in model\/Oracle\.tla 2 times; make it unique, or --all replaces each/);
    assert.equal(existsSync(join(root, 'parts/oracle/model/blunders/twice.tla')), false);
    const noScenario = run('blunder', 'compositions/supply', 'drift', '--replace', 'x', '--with', 'y', '--property', 'A3', '--wrong', 'w');
    assert.equal(noScenario.status, 2);
    assert.match(noScenario.stderr, /a composition blunder names the scenario of the cell it must catch: --scenario <id>/);
    const notEnabled = run('blunder', 'vault', 'nowhere', '--replace', 'Init', '--with', 'Init', '--property', 'A1', '--wrong', 'w');
    assert.equal(notEnabled.status, 2);
    assert.match(notEnabled.stderr, /--with is the same text as --replace/);
    const noProperty = run('blunder', 'vault', 'nowhere', '--replace', 'ceiling', '--with', 'ceil', '--all', '--wrong', 'w');
    assert.match(noProperty.stderr, /--property <id>/);
    assert.deepEqual(files(), []);

    const existing = run('blunder', 'vault', 'lostfree', '--replace', "    /\\ ((debt + amount) <= ceiling)\n", '--with', '', '--property', 'A1', '--wrong', 'w');
    assert.equal(existing.status, 2);
    assert.match(existing.stderr, /model\/blunders\/lostfree\.tla exists; --force replaces it/);
    assert.equal(text('parts/vault/model/blunders/lostfree.tla'), readFileSync(join(plugin, 'qualification/fixture/dossiers/parts/vault/model/blunders/lostfree.tla'), 'utf8'), 'a refused blunder leaves the copy as it was');
    const forced = run('blunder', 'vault', 'lostfree', '--replace', "    /\\ ((debt + amount) <= ceiling)\n", '--with', '', '--property', 'A2', '--wrong', 'borrow ignores the ceiling', '--reach', 'r', '--because', 'b', '--force');
    assert.equal(forced.status, 0, forced.stderr);
    assert.equal(existsSync(join(root, 'parts/vault/model/blunders/lostfree_A1.cfg')), false, 'the copy\'s earlier configuration goes with it');
    assert.deepEqual(plan('parts/vault', 'blunder-lostfree'), []);
  });

  it('reduces a configuration to one property in the section that held it', () => {
    const cfg = 'SPECIFICATION Spec\nCONSTANT MaxSent = 4\nINVARIANTS TypeOK A1\n  N1\nPROPERTIES O1\nCHECK_DEADLOCK FALSE\n';
    assert.equal(onlyProperty(cfg, 'N1'), 'SPECIFICATION Spec\nCONSTANT MaxSent = 4\nINVARIANTS N1\nCHECK_DEADLOCK FALSE\n');
    assert.equal(onlyProperty(cfg, 'O1'), 'SPECIFICATION Spec\nCONSTANT MaxSent = 4\nPROPERTIES O1\nCHECK_DEADLOCK FALSE\n');
    assert.equal(onlyProperty(cfg, 'A9'), null);
  });
});
