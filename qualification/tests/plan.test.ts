// Calls and their validation against the files they name: calls.ts and
// plan.ts. Run: node --test qualification/tests/plan.test.ts
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { KINDS, parseCall, parseOutcome } from '../../src/trials/calls.ts';
import { describeMachineDiff, outside, planTrial } from '../../src/trials/plan.ts';
import { historiesOf, movesOf, parseTla } from '../../src/models/tla.ts';
import { parseProse } from '../../src/prose/prose.ts';
import { compileIR } from '../../src/prose/ir.ts';
import type { PlanInput } from '../../src/trials/plan.ts';
import type { CompositionProse } from '../../src/prose/prose.ts';
import type { Ir, IrState } from '../../src/prose/ir.ts';
import type { Scenario } from '../../src/dossiers/actors.ts';

const PROSE = `# Timelock
Tier: modeled
Module: gov-timelock

It holds remaining, a count from 0 to 2. It sends change to the Vault.

## States
[S1] Idle: nothing is planned.
[S2] Waiting: the delay has not run out.
[S3] Ready: the delay has run out.

## Events
[E1] schedule, from Governance: a plan is proposed. Carries delay, a count from 1 to 2.
[E2] tick, from the chain: a block passes.
[E3] execute, from the public: the plan is executed.

## Moves
[M1] When Idle receives schedule, it becomes Waiting, with remaining delay.
[M2] When Waiting receives tick and remaining is above 1, it stays Waiting, remaining drops by one.
[M3] When Waiting receives tick and remaining is at most 1, it becomes Ready, remaining becomes 0.
[M4] When Ready receives execute, it becomes Idle, sends change.
[R1] In Idle, tick and execute are refused.
[R2] In Waiting and Ready, schedule is refused.
[R3] In Waiting, execute is refused.
[R4] In Ready, tick is refused.

## Always
[A1] Always, remaining is at most 2.

## Walks
[W1] Walk Plan: from Idle, schedule delay 2, tick, tick, execute; ends Idle; change sent once.

## Words only
[T1] The piece promises nothing eventual.
`;

const MODULE = (name: string, remaining = 1) => `---- MODULE ${name} ----
EXTENDS Naturals
VARIABLES state, remaining
Init == state = "Idle" /\\ remaining = 0
M1_Schedule == state = "Idle" /\\ state' = "Waiting" /\\ remaining' = ${remaining}
Next == M1_Schedule
Spec == Init /\\ [][Next]_<<state, remaining>>
TypeOK == remaining \\in 0..2
A1 == remaining <= 2
Inv_A1 == TypeOK /\\ A1
O1 == (state = "Waiting") ~> (state = "Idle")
W1_End == state = "Idle"
NotW1 == ~W1_End
ConstInit == TRUE
====
`;

const call = (text: string) => parseCall(text);
const chart = (extra = '') => `kind: chart\nexecutes:\n  - prose.md\nreach: the chart\nexpect:\n  checks: pass\nbecause: |\n  every pair is said\n${extra}`;
const tlc = (files: string[], expect: Record<string, string>, extra = '') => `kind: tlc\nexecutes:\n${files.map(f => `  - ${f}`).join('\n')}\nreach: delay up to 2\n${extra}expect:\n${Object.entries(expect).map(([k, v]) => `  ${k}: ${v}`).join('\n')}\nbecause: |\n  because\n`;
const blunder = (files: string[], expect: Record<string, string>, extra = '') => `kind: blunder\nblunder: the wrong\n${extra}executes:\n${files.map(f => `  - ${f}`).join('\n')}\nreach: r\nexpect:\n${Object.entries(expect).map(([k, v]) => `  ${k}: ${v}`).join('\n')}\nbecause: |\n  it must catch it\n`;
const apalache = (lines: string[], expect: Record<string, string>) => `kind: apalache\n${lines.join('\n')}\nexecutes:\n  - model/Timelock.tla\nreach: r\nexpect:\n${Object.entries(expect).map(([k, v]) => `  ${k}: ${v}`).join('\n')}\nbecause: |\n  b\n`;
const alloy = (file: string, expect: Record<string, string>) => `kind: alloy\nexecutes:\n  - ${file}\nreach: scope 4\nexpect:\n${Object.entries(expect).map(([k, v]) => `  ${k}: ${v}`).join('\n')}\nbecause: |\n  b\n`;
const external = (files: string[], expect: Record<string, string>, runner = 'replay') => `kind: external\nrunner: ${runner}\nexecutes:\n${files.map(f => `  - ${f}`).join('\n')}\nreach: the stand-in\nexpect:\n${Object.entries(expect).map(([k, v]) => `  ${k}: ${v}`).join('\n')}\nbecause: |\n  b\n`;

describe('parseCall', () => {
  it('reads every kind and key', () => {
    const c = call('kind: apalache\nmode: bounded\nlength: 3\ninv: Inv_A1\ninit: Inv_A1\ncinit: ConstInit\nproperty: A1\nscenario: all-honest\nblunder: the wrong\nbase: model/Timelock.tla\ntrace-data: debt, free\nrunner: replay\nexecutes: prose.md, model/Timelock.tla\n  - model/Timelock.cfg\nreach: amounts up to 2\nexpect:\n  TypeOK: holds\n  A1: violated; trace: Idle/0 > Waiting/2\n  checks: fail M2 W1\nbecause: |\n  the first line\n\n  the second, after a blank\n');
    assert.deepEqual(c.errors, []);
    assert.equal(c.kind, 'apalache');
    assert.equal(c.mode, 'bounded');
    assert.equal(c.length, 3);
    assert.equal(c.inv, 'Inv_A1');
    assert.equal(c.init, 'Inv_A1');
    assert.equal(c.cinit, 'ConstInit');
    assert.equal(c.property, 'A1');
    assert.equal(c.scenario, 'all-honest');
    assert.equal(c.blunder, 'the wrong');
    assert.equal(c.base, 'model/Timelock.tla');
    assert.deepEqual(c.traceData, ['debt', 'free']);
    assert.equal(c.runner, 'replay');
    assert.deepEqual(c.executes, ['prose.md', 'model/Timelock.tla', 'model/Timelock.cfg']);
    assert.equal(c.reach, 'amounts up to 2');
    assert.deepEqual(c.expect, { TypeOK: { expect: 'holds' }, A1: { expect: 'violated', trace: ['Idle/0', 'Waiting/2'] }, checks: { expect: 'fail', failing: ['M2', 'W1'] } });
    assert.equal(c.because, 'the first line\n\nthe second, after a blank');
    assert.deepEqual(KINDS, ['chart', 'blunder', 'tlc', 'apalache', 'alloy', 'external']);
  });

  it('reads a composition witness: walk: and scenario: in place of property:', () => {
    const c = call('kind: tlc\nwalk: W1\nscenario: governance-captured\ntrace-data: timelock_state, timelock_left\nexecutes:\n  - model/generated/Control.tla\n  - model/generated/W1_governance_captured.cfg\nreach: r\nexpect:\n  TypeOK: holds\n  NotW1: violated; trace: Idle/0 > Scheduled/2\nbecause: b\n');
    assert.deepEqual(c.errors, []);
    assert.equal(c.walk, 'W1');
    assert.equal(c.scenario, 'governance-captured');
    assert.equal(c.property, null);
    assert.deepEqual(c.traceData, ['timelock_state', 'timelock_left']);
    assert.equal(call(chart()).walk, null);
  });

  it('reads because on one line and the minimal chart call', () => {
    const c = call('kind: chart\nexecutes:\n  - prose.md\nreach: r\nexpect:\n  checks: pass\nbecause: said in one line\n');
    assert.deepEqual(c.errors, []);
    assert.equal(c.because, 'said in one line');
    assert.deepEqual(c.expect, { checks: { expect: 'pass' } });
  });

  it('reports what a call lacks', () => {
    assert.deepEqual(call('').errors, ['kind must be one of chart, blunder, tlc, apalache, alloy, external', 'executes: lists nothing', 'expect: lists nothing', 'because: is empty']);
    assert.deepEqual(call('kind: tlc\nexecutes:\n  - a.tla\nexpect:\n  A1: holds\nbecause: |\n  b\n').errors, []);
    assert.ok(call('kind: tlc\nexecutes:\n  - a.tla\nexpect:\n  A1: holds\n').errors.includes('because: is empty'));
    assert.ok(call('kind: tlc\nexpect:\n  A1: holds\nbecause: b\n').errors.includes('executes: lists nothing'));
    assert.ok(call('kind: tlc\nexecutes:\n  - a.tla\nbecause: b\n').errors.includes('expect: lists nothing'));
    assert.ok(call('kind: blunder\nexecutes:\n  - a.tla\nexpect:\n  A1: violated\nbecause: b\n').errors.includes('a blunder call names its wrong under blunder:'));
    assert.ok(call('kind: apalache\nexecutes:\n  - a.tla\nexpect:\n  A1: holds\nbecause: b\n').errors.includes('an apalache call sets mode: bounded or mode: inductive'));
    assert.ok(call('kind: external\nexecutes:\n  - a\nexpect:\n  W1: pass\nbecause: b\n').errors.includes('an external call names its runner under runner:'));
    assert.ok(call('kind: tlc\nproperty: A1\nexecutes:\n  - a.tla\nexpect:\n  A1: holds\nbecause: b\n').errors.includes('a cell names both property: and scenario:'));
    assert.ok(call('kind: tlc\nscenario: x\nexecutes:\n  - a.tla\nexpect:\n  A1: holds\nbecause: b\n').errors.includes('scenario: goes with property: for a cell or walk: for a witness'));
    assert.ok(call('kind: tlc\nwalk: W1\nexecutes:\n  - a.tla\nexpect:\n  NotW1: violated\nbecause: b\n').errors.includes('a witness names both walk: and scenario:'));
    assert.ok(call('kind: tlc\nproperty: A1\nwalk: W1\nscenario: x\nexecutes:\n  - a.tla\nexpect:\n  A1: holds\nbecause: b\n').errors.includes('a call names property: or walk:, not both'));
    assert.ok(call('kind: tlc\nexecutes:\n  - a.tla\nexpect:\n  A1: maybe\nbecause: b\n').errors.includes('A1: unknown outcome "maybe"'));
    assert.ok(call('kind: tlc\ncolor: red\nexecutes:\n  - a.tla\nexpect:\n  A1: holds\nbecause: b\n').errors.includes('unknown key: color'));
    assert.ok(call('kind: tlc\n??\nexecutes:\n  - a.tla\nexpect:\n  A1: holds\nbecause: b\n').errors.includes('unrecognized line: ??'));
    assert.ok(call('kind: tlc\nexecutes:\n  - a.tla\nexpect:\n  A1 holds\nbecause: b\n').errors.includes('bad expect line: A1 holds'));
  });

  it('requires a length of a bounded apalache call, a whole number, never an empty one read as 0', () => {
    assert.deepEqual(call('kind: apalache\nmode: bounded\nlength: 0\nexecutes:\n  - a.tla\nexpect:\n  A1: holds\nbecause: b\n').errors, []);
    assert.deepEqual(call('kind: apalache\nmode: bounded\nexecutes:\n  - a.tla\nexpect:\n  A1: holds\nbecause: b\n').errors, ['a bounded apalache call sets length: <steps>']);
    assert.deepEqual(call('kind: apalache\nmode: bounded\nlength: many\nexecutes:\n  - a.tla\nexpect:\n  A1: holds\nbecause: b\n').errors, ['length: is a whole number of steps, not "many"']);
    const empty = call('kind: apalache\nmode: bounded\nlength:\nexecutes:\n  - a.tla\nexpect:\n  A1: holds\nbecause: b\n');
    assert.deepEqual([empty.errors, empty.length], [['length: is a whole number of steps, not ""'], null]);
  });
});

describe('parseOutcome', () => {
  it('reads every outcome word and the traced form', () => {
    for (const w of ['holds', 'violated', 'counterexample', 'no counterexample', 'instance', 'no instance']) assert.deepEqual(parseOutcome(w), { expect: w });
    assert.deepEqual(parseOutcome('pass'), { expect: 'pass' });
    assert.deepEqual(parseOutcome('all pass'), { expect: 'pass' });
    assert.deepEqual(parseOutcome('fail'), { expect: 'fail', failing: [] });
    assert.deepEqual(parseOutcome('fail M2, W1 A1'), { expect: 'fail', failing: ['M2', 'W1', 'A1'] });
    assert.deepEqual(parseOutcome('violated; trace: a > b'), { expect: 'violated', trace: ['a', 'b'] });
    assert.deepEqual(parseOutcome('violated ; trace: Open/0/0>Open/2/2 > Open/1/1'), { expect: 'violated', trace: ['Open/0/0', 'Open/2/2', 'Open/1/1'] });
    assert.deepEqual(parseOutcome('weird'), { expect: 'weird', unknown: true });
  });
});

describe('planTrial', () => {
  let root: string, dir: string, sdir: string, ir: Ir;
  const write = (rel: string, text: string) => { const p = join(root, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text); return p; };
  const plan = (text: string, extra: Partial<PlanInput> = {}) => { const c = call(text); assert.deepEqual(c.errors, [], c.errors.join('; ')); return planTrial({ call: c, dossierDir: dir, kind: 'part', ir, ...extra }); };
  const splan = (text: string) => { const c = call(text); assert.deepEqual(c.errors, []); return planTrial({ call: c, dossierDir: sdir, kind: 'composition', ir: null, compositionProse: { properties: [{ id: 'A1' }], walks: [{ id: 'W1', scenario: null }, { id: 'W2', scenario: 'user-malicious' }] } as CompositionProse, scenarios: [{ id: 'all-honest' }, { id: 'user-malicious' }] as Scenario[] }); };

  before(() => {
    root = mkdtempSync(join(tmpdir(), 'dossier-plan-'));
    dir = join(root, 'parts', 'timelock');
    sdir = join(root, 'compositions', 'supply');
    ir = compileIR(parseProse(PROSE));
    assert.equal(ir.ok, true);
    write('parts/timelock/prose.md', PROSE);
    write('parts/timelock/model/Timelock.tla', MODULE('Timelock'));
    write('parts/timelock/model/Timelock.cfg', 'SPECIFICATION Spec\nINVARIANTS TypeOK A1\n');
    write('parts/timelock/model/Timelock_W1.cfg', 'SPECIFICATION Spec\nINVARIANTS TypeOK NotW1\n');
    write('parts/timelock/model/Timelock_W1x.cfg', 'SPECIFICATION Spec\nINVARIANTS TypeOK NotW1 A1\n');
    write('parts/timelock/model/Timelock_O1.cfg', 'SPECIFICATION Spec\nPROPERTIES O1\n');
    write('parts/timelock/model/Timelock_O2.cfg', 'SPECIFICATION Spec\nPROPERTIES O1 O2\n');
    write('parts/timelock/model/blunders/loose.tla', MODULE('loose', 3));
    write('parts/timelock/model/blunders/loose_A1.cfg', 'SPECIFICATION Spec\nINVARIANTS A1\n');
    write('parts/timelock/model/blunders/loose_two.cfg', 'SPECIFICATION Spec\nINVARIANTS TypeOK A1\n');
    write('parts/timelock/model/blunders/same.tla', MODULE('Timelock'));
    write('parts/timelock/model/Timelock.als', 'sig Plan {}\nfact S1_idle { some Plan }\nassert A1_bound { all p: Plan | p in Plan }\ncheck A1_bound for 4\nrun W1_plan for 3\n');
    write('parts/timelock/model/blunders/rogue.als', 'sig Plan {}\nassert A1_bound { all p: Plan | p in Plan }\ncheck A1_bound for 4\n');
    const mutated = JSON.parse(JSON.stringify(ir)) as Ir;
    mutated.transitions.find(t => t.id === 'M3')!.guard = null;
    write('parts/timelock/chart/blunders/loose.json', JSON.stringify(mutated));
    write('parts/timelock/chart/blunders/same.json', JSON.stringify(ir));
    write('parts/timelock/chart/elsewhere.json', JSON.stringify(mutated));
    write('compositions/supply/model/generated/Supply.tla', `---- MODULE Supply ----\nEXTENDS Naturals\nVARIABLES x, adapter_state, adapter_held\nInit == x = 0\nNext == x' = x\nSpec == Init /\\ [][Next]_x\nTypeOK == x \\in 0..1\nA1 == x = 0\nInv_A1 == TypeOK /\\ A1\nW1_End == x = 1\nNotW1 == ~W1_End\nW2_End == x = 0\nNotW2 == ~W2_End\nConstInit_all_honest == TRUE\nConstInit_user_malicious == TRUE\n====\n`);
    write('compositions/supply/model/generated/A1_all_honest.cfg', 'SPECIFICATION Spec\nINVARIANTS TypeOK A1\n');
    write('compositions/supply/model/generated/A1_user_malicious.cfg', 'SPECIFICATION Spec\nINVARIANTS TypeOK A1\n');
    write('compositions/supply/model/generated/Copy.tla', `---- MODULE Copy ----\nVARIABLES x\nTypeOK == x \\in 0..1\nA1 == x = 0\n====\n`);
    write('compositions/supply/model/generated/W1_all_honest.cfg', 'SPECIFICATION Spec\nINVARIANTS TypeOK NotW1\n');
    write('compositions/supply/model/generated/W2_user_malicious.cfg', 'SPECIFICATION Spec\nINVARIANTS TypeOK NotW2\n');
    write('compositions/supply/model/A1_elsewhere.cfg', 'SPECIFICATION Spec\nINVARIANTS TypeOK A1\n');
  });
  after(() => rmSync(root, { recursive: true, force: true }));

  describe('chart', () => {
    it('accepts a chart call that executes prose.md and expects checks', () => {
      const { plan: p, problems } = plan(chart());
      assert.deepEqual(problems, []);
      assert.equal(p.checker, 'chart');
      assert.deepEqual(p.enabled, ['checks']);
      assert.equal(p.machineIR, undefined);
    });

    it('refuses a chart call that does not execute prose.md, expects other things, or whose prose does not compile', () => {
      assert.deepEqual(plan(chart().replace('  - prose.md', '  - model/Timelock.tla')).problems, ['a chart trial executes prose.md']);
      assert.deepEqual(plan(chart().replace('  checks: pass', '  checks: pass\n  A1: holds')).problems, ['a chart call expects only checks:']);
      assert.deepEqual(plan(chart().replace('  checks: pass', '  A1: holds')).problems, ['a chart call expects "checks: pass" or "checks: fail <ids>"', 'a chart call expects only checks:']);
      assert.deepEqual(plan(chart(), { ir: { ok: false } as Ir }).problems, ['prose.md does not compile; run dossier draw first']);
      assert.deepEqual(planTrial({ call: call(chart()), dossierDir: sdir, kind: 'composition', ir }).problems, ['a chart trial belongs to a part']);
    });

    it('accepts a chart blunder under chart/blunders that differs from the prose and expects the ids it breaks', () => {
      const { plan: p, problems } = plan(blunder(['chart/blunders/loose.json'], { checks: 'fail M2 M3' }));
      assert.deepEqual(problems, []);
      assert.equal(p.checker, 'chart');
      assert.equal(p.blunderFile, join(dir, 'chart', 'blunders', 'loose.json'));
      assert.equal(p.machineIR!.transitions.find(t => t.id === 'M3')!.guard, null);
      assert.equal(p.blunderDiff, '~ M3.guard: {"t":"bin","op":"<=","l":{"t":"ref","name":"remaining"},"r":{"t":"int","v":1}} -> null\n');
    });

    it('refuses a chart blunder outside chart/blunders, identical to the prose machine, missing, or expecting a pass', () => {
      assert.deepEqual(plan(blunder(['chart/elsewhere.json'], { checks: 'fail M2' })).problems, ['a chart blunder executes exactly one machine under chart/blunders/']);
      assert.deepEqual(plan(blunder(['chart/blunders/same.json'], { checks: 'fail M2' })).problems, ["chart/blunders/same.json does not differ from the prose's machine"]);
      assert.deepEqual(plan(blunder(['chart/blunders/missing.json'], { checks: 'fail M2' })).problems, ['chart/blunders/missing.json does not exist']);
      assert.deepEqual(plan(blunder(['chart/blunders/loose.json'], { checks: 'pass' })).problems, ['a chart blunder expects "checks: fail <the ids it must break>"']);
      assert.deepEqual(plan(blunder(['chart/blunders/loose.json'], { checks: 'fail' })).problems, ['a chart blunder expects "checks: fail <the ids it must break>"']);
    });
  });

  describe('tlc', () => {
    it('accepts a module and configuration whose enabled properties are all expected', () => {
      const { plan: p, problems } = plan(tlc(['model/Timelock.tla', 'model/Timelock.cfg'], { TypeOK: 'holds', A1: 'holds' }));
      assert.deepEqual(problems, []);
      assert.equal(p.checker, 'tlc');
      assert.equal(p.tla, join(dir, 'model', 'Timelock.tla'));
      assert.equal(p.cfg, join(dir, 'model', 'Timelock.cfg'));
      assert.deepEqual(p.enabled, ['TypeOK', 'A1']);
      assert.equal(p.tlaParsed!.module, 'Timelock');
      assert.deepEqual(p.cfgParsed!.invariants, ['TypeOK', 'A1']);
      assert.equal(p.witness, undefined);
    });

    it('refuses the wrong file counts and missing files', () => {
      assert.deepEqual(plan(tlc(['model/Timelock.tla'], { TypeOK: 'holds' })).problems, ['a TLC trial executes exactly one .tla and one .cfg']);
      assert.deepEqual(plan(tlc(['model/Timelock.tla', 'model/Timelock.cfg', 'model/Timelock_O1.cfg'], { TypeOK: 'holds' })).problems, ['a TLC trial executes exactly one .tla and one .cfg']);
      assert.deepEqual(plan(tlc(['model/Nope.tla', 'model/Timelock.cfg'], { TypeOK: 'holds' })).problems, ['the module or configuration does not exist']);
    });

    it('refuses an expectation for a property the configuration does not enable, and an enabled property without expectation', () => {
      assert.deepEqual(plan(tlc(['model/Timelock.tla', 'model/Timelock.cfg'], { TypeOK: 'holds', A1: 'holds', O1: 'holds' })).problems, ['the call expects something of O1, which the configuration does not enable']);
      assert.deepEqual(plan(tlc(['model/Timelock.tla', 'model/Timelock.cfg'], { TypeOK: 'holds' })).problems, ['A1 is enabled but the call expects nothing of it']);
      assert.deepEqual(plan(tlc(['model/Timelock.tla', 'model/Timelock.cfg'], { TypeOK: 'holds', A1: 'pass' })).problems, ['A1: a TLC call expects holds or violated, not "pass"']);
      assert.deepEqual(plan(tlc(['model/Timelock.tla', 'model/Timelock_O2.cfg'], { O1: 'holds', O2: 'holds' })).problems, ['O2 is enabled but model/Timelock.tla does not define it', 'one liveness property per configuration: O1, O2']);
    });

    it('accepts a witness configuration expecting NotW violated and refuses extra invariants or holds', () => {
      const good = plan(tlc(['model/Timelock.tla', 'model/Timelock_W1.cfg'], { TypeOK: 'holds', NotW1: 'violated; trace: Idle > Waiting' }));
      assert.deepEqual(good.problems, []);
      assert.equal(good.plan.witness, 'NotW1');
      assert.deepEqual(plan(tlc(['model/Timelock.tla', 'model/Timelock_W1x.cfg'], { TypeOK: 'holds', NotW1: 'violated', A1: 'holds' })).problems, ['a witness configuration enables TypeOK and exactly one NotW<n>, nothing else']);
      assert.deepEqual(plan(tlc(['model/Timelock.tla', 'model/Timelock_W1.cfg'], { TypeOK: 'holds', NotW1: 'holds' })).problems, ['NotW1 is expected "violated[; trace: ...]"']);
    });

    it('accepts a blunder under model/blunders enabling the one property it must catch, with a diff against the main module', () => {
      const { plan: p, problems } = plan(blunder(['model/blunders/loose.tla', 'model/blunders/loose_A1.cfg'], { A1: 'violated' }));
      assert.deepEqual(problems, []);
      assert.equal(p.checker, 'tlc');
      assert.deepEqual(p.enabled, ['A1']);
      assert.match(p.blunderDiff!, /^--- model\/Timelock\.tla/m);
      assert.match(p.blunderDiff!, /^\+\+\+ model\/blunders\/loose\.tla/m);
      assert.match(p.blunderDiff!, /^-M1_Schedule == .*remaining' = 1$/m);
      assert.match(p.blunderDiff!, /^\+M1_Schedule == .*remaining' = 3$/m);
      const based = plan(blunder(['model/blunders/loose.tla', 'model/blunders/loose_A1.cfg'], { A1: 'violated' }, 'base: model/Timelock.tla\n'));
      assert.deepEqual(based.problems, []);
      assert.ok(plan(blunder(['model/blunders/loose.tla', 'model/blunders/loose_A1.cfg'], { A1: 'violated' }, 'base: model/blunders/same.tla\n')).problems.includes('base names model/blunders/same.tla, which must be a module under model/ and not under model/blunders/'));
    });

    it('refuses a blunder outside model/blunders, with two enabled properties, expecting holds, or identical to the main module', () => {
      assert.ok(plan(blunder(['model/Timelock.tla', 'model/blunders/loose_A1.cfg'], { A1: 'violated' })).problems.includes('a blunder module lives under model/blunders/'));
      assert.deepEqual(plan(blunder(['model/blunders/loose.tla', 'model/blunders/loose_two.cfg'], { TypeOK: 'holds', A1: 'violated' })).problems, ['a blunder configuration enables exactly one property, the one it must catch']);
      assert.deepEqual(plan(blunder(['model/blunders/loose.tla', 'model/blunders/loose_A1.cfg'], { A1: 'holds' })).problems, ['a blunder expects A1 violated']);
      assert.deepEqual(plan(blunder(['model/blunders/same.tla', 'model/blunders/loose_A1.cfg'], { A1: 'violated' })).problems, ['model/blunders/same.tla does not differ from model/Timelock.tla']);
      assert.deepEqual(plan(tlc(['model/blunders/loose.tla', 'model/blunders/loose_A1.cfg'], { A1: 'holds' })).problems, ['only a blunder trial executes a module under model/blunders/']);
    });

    it('refuses a cell on a part trial', () => {
      assert.deepEqual(plan(tlc(['model/Timelock.tla', 'model/Timelock.cfg'], { TypeOK: 'holds', A1: 'holds' }, 'property: A1\nscenario: all-honest\n')).problems, ['property: and scenario: belong to a composition trial']);
    });
  });

  describe('composition', () => {
    it('needs a cell, a generated configuration, a declared property and scenario', () => {
      const good = splan(tlc(['model/generated/Supply.tla', 'model/generated/A1_all_honest.cfg'], { TypeOK: 'holds', A1: 'holds' }, 'property: A1\nscenario: all-honest\n'));
      assert.deepEqual(good.problems, []);
      assert.equal(good.plan.checker, 'tlc');
      assert.deepEqual(splan(tlc(['model/generated/Supply.tla', 'model/generated/A1_all_honest.cfg'], { TypeOK: 'holds', A1: 'holds' })).problems, ['a composition trial names its cell, property: and scenario:, or its witness, walk: and scenario:']);
      assert.deepEqual(splan(tlc(['model/generated/Supply.tla', 'model/A1_elsewhere.cfg'], { TypeOK: 'holds', A1: 'holds' }, 'property: A1\nscenario: all-honest\n')).problems, ['the cell A1 × all-honest executes model/generated/A1_all_honest.cfg']);
      assert.deepEqual(splan(tlc(['model/generated/Supply.tla', 'model/generated/A1_all_honest.cfg'], { TypeOK: 'holds', A1: 'holds' }, 'property: A9\nscenario: nope\n')).problems, ['property A9 is not a passage of this composition', 'scenario nope is not declared in actors/scenarios.md', 'the configuration does not enable A9']);
    });

    it('pins a cell to its own configuration and to the generated module, and to a cell the composition claims', () => {
      // A1 × user-malicious running the all-honest configuration would run another cell.
      assert.deepEqual(splan(tlc(['model/generated/Supply.tla', 'model/generated/A1_all_honest.cfg'], { TypeOK: 'holds', A1: 'holds' }, 'property: A1\nscenario: user-malicious\n')).problems, ['the cell A1 × user-malicious executes model/generated/A1_user_malicious.cfg']);
      const generated = (text: string, extra: Partial<PlanInput> = {}) => { const c = call(text); assert.deepEqual(c.errors, []); return planTrial({ call: c, dossierDir: sdir, kind: 'composition', ir: null, compositionProse: { properties: [{ id: 'A1' }], walks: [] } as unknown as CompositionProse, scenarios: [{ id: 'all-honest' }, { id: 'user-malicious' }] as Scenario[], module: 'model/generated/Supply.tla', cells: [{ property: 'A1', scenario: 'all-honest' }], ...extra }).problems; };
      assert.deepEqual(generated(tlc(['model/generated/Supply.tla', 'model/generated/A1_all_honest.cfg'], { TypeOK: 'holds', A1: 'holds' }, 'property: A1\nscenario: all-honest\n')), []);
      assert.deepEqual(generated(tlc(['model/generated/Copy.tla', 'model/generated/A1_all_honest.cfg'], { TypeOK: 'holds', A1: 'holds' }, 'property: A1\nscenario: all-honest\n')), ['a composition trial executes the generated module, model/generated/Supply.tla']);
      assert.deepEqual(generated(tlc(['model/generated/Supply.tla', 'model/generated/A1_user_malicious.cfg'], { TypeOK: 'holds', A1: 'holds' }, 'property: A1\nscenario: user-malicious\n')), ['A1 × user-malicious is not a cell of this composition: A1 does not claim user-malicious']);
    });

    it('accepts a witness: walk: and scenario:, the walk\'s generated configuration under that scenario, and NotW expected violated as a part\'s witness is', () => {
      const good = splan(tlc(['model/generated/Supply.tla', 'model/generated/W1_all_honest.cfg'], { TypeOK: 'holds', NotW1: 'violated; trace: Open/0 > Halted/1' }, 'walk: W1\nscenario: all-honest\ntrace-data: adapter_state, adapter_held\n'));
      assert.deepEqual(good.problems, []);
      assert.equal(good.plan.checker, 'tlc');
      assert.equal(good.plan.witness, 'NotW1');
      assert.deepEqual(good.plan.enabled, ['TypeOK', 'NotW1']);
      assert.deepEqual(splan(tlc(['model/generated/Supply.tla', 'model/generated/W2_user_malicious.cfg'], { TypeOK: 'holds', NotW2: 'violated' }, 'walk: W2\nscenario: user-malicious\n')).problems, [], 'the walk\'s own scenario; the trace is the caller\'s to give');
    });

    it('refuses a witness under another scenario than its walk\'s, on another configuration, expecting NotW to hold, naming no walk of the composition, or not a tlc trial; and a composition blunder without its property', () => {
      const witness = 'walk: W1\nscenario: all-honest\n';
      assert.deepEqual(splan(tlc(['model/generated/Supply.tla', 'model/generated/A1_all_honest.cfg'], { TypeOK: 'holds', A1: 'holds' }, witness)).problems, ['a composition witness executes model/generated/W1_all_honest.cfg', 'the configuration does not enable NotW1']);
      assert.deepEqual(splan(tlc(['model/generated/Supply.tla', 'model/generated/W1_all_honest.cfg'], { TypeOK: 'holds', NotW1: 'violated' }, 'walk: W1\nscenario: user-malicious\n')).problems, ['walk W1 runs under all-honest, not user-malicious']);
      assert.deepEqual(splan(tlc(['model/generated/Supply.tla', 'model/generated/W1_all_honest.cfg'], { TypeOK: 'holds', NotW1: 'violated' }, 'walk: W2\nscenario: user-malicious\n')).problems, ['a composition witness executes model/generated/W2_user_malicious.cfg', 'the configuration does not enable NotW2'], 'another walk\'s witness configuration');
      assert.deepEqual(splan(tlc(['model/generated/Supply.tla', 'model/generated/W1_all_honest.cfg'], { TypeOK: 'holds', NotW1: 'holds' }, witness)).problems, ['NotW1 is expected "violated[; trace: ...]"']);
      assert.deepEqual(splan(tlc(['model/generated/Supply.tla', 'model/generated/W1_all_honest.cfg'], { TypeOK: 'holds', NotW1: 'violated' }, 'walk: W9\nscenario: all-honest\n')).problems, ['walk W9 is not a walk of this composition', 'a composition witness executes model/generated/W9_all_honest.cfg', 'the configuration does not enable NotW9']);
      assert.deepEqual(splan(apalache(['mode: inductive', 'walk: W1', 'scenario: all-honest', 'inv: Inv_A1', 'cinit: ConstInit_all_honest'], { Inv_A1: 'holds' }).replace('  - model/Timelock.tla', '  - model/generated/Supply.tla')).problems, ['a composition witness is a tlc trial']);
      assert.ok(splan(blunder(['model/blunders/x.tla', 'model/blunders/x_A1.cfg'], { A1: 'violated' }, witness)).problems.includes('a composition blunder names the property it must catch under property:, not a walk'));
      assert.ok(splan(blunder(['model/blunders/x.tla', 'model/blunders/x_A1.cfg'], { A1: 'violated' })).problems.includes('a composition trial names its cell: property: and scenario:'));
      assert.deepEqual(plan(tlc(['model/Timelock.tla', 'model/Timelock_W1.cfg'], { TypeOK: 'holds', NotW1: 'violated' }, witness)).problems, ['property: and scenario: belong to a composition trial', 'walk: belongs to a composition trial']);
    });

    it('matches an Apalache cinit to the scenario exactly, and runs the module alone', () => {
      const mismatch = splan(apalache(['mode: inductive', 'property: A1', 'scenario: all-honest', 'inv: Inv_A1', 'cinit: ConstInit_user_malicious'], { Inv_A1: 'holds' }).replace('  - model/Timelock.tla', '  - model/generated/Supply.tla'));
      assert.deepEqual(mismatch.problems, ['cinit ConstInit_user_malicious does not match scenario all-honest: name ConstInit_all_honest']);
      const suffixed = splan(apalache(['mode: inductive', 'property: A1', 'scenario: all-honest', 'inv: Inv_A1', 'cinit: ConstInit_user_malicious_all_honest'], { Inv_A1: 'holds' }).replace('  - model/Timelock.tla', '  - model/generated/Supply.tla'));
      assert.ok(suffixed.problems.includes('cinit ConstInit_user_malicious_all_honest does not match scenario all-honest: name ConstInit_all_honest'), 'the scenario\'s name at the end is not enough');
      assert.deepEqual(splan(apalache(['mode: inductive', 'property: A1', 'scenario: all-honest', 'inv: Inv_A1'], { Inv_A1: 'holds' }).replace('  - model/Timelock.tla', '  - model/generated/Supply.tla')).problems, ['a composition Apalache trial names cinit: ConstInit_all_honest, the constants of scenario all-honest']);
      assert.deepEqual(splan(apalache(['mode: inductive', 'property: A1', 'scenario: all-honest', 'inv: Inv_A1', 'cinit: ConstInit_all_honest'], { Inv_A1: 'holds' }).replace('  - model/Timelock.tla', '  - model/generated/Supply.tla\n  - model/generated/A1_all_honest.cfg')).problems, ['a composition Apalache trial executes its module alone: the scenario comes from cinit:']);
      const good = splan(apalache(['mode: inductive', 'property: A1', 'scenario: all-honest', 'inv: Inv_A1', 'cinit: ConstInit_all_honest'], { Inv_A1: 'holds' }).replace('  - model/Timelock.tla', '  - model/generated/Supply.tla'));
      assert.deepEqual(good.problems, []);
      assert.equal(good.plan.cinit, 'ConstInit_all_honest');
      const other = splan(apalache(['mode: inductive', 'property: A1', 'scenario: all-honest', 'inv: TypeOK', 'cinit: ConstInit_all_honest'], { TypeOK: 'holds' }).replace('  - model/Timelock.tla', '  - model/generated/Supply.tla'));
      assert.deepEqual(other.problems, ['TypeOK is not the cell\'s property A1']);
    });
  });

  describe('apalache', () => {
    it('accepts an inductive call naming its invariant and cinit, and a bounded one with the single expect line as the invariant', () => {
      const inductive = plan(apalache(['mode: inductive', 'inv: Inv_A1', 'cinit: ConstInit', 'init: Inv_A1'], { Inv_A1: 'holds' }));
      assert.deepEqual(inductive.problems, []);
      assert.deepEqual([inductive.plan.checker, inductive.plan.inv, inductive.plan.mode, inductive.plan.init, inductive.plan.cinit, inductive.plan.enabled, inductive.plan.cfg], ['apalache', 'Inv_A1', 'inductive', 'Inv_A1', 'ConstInit', ['Inv_A1'], null]);
      const bounded = plan(apalache(['mode: bounded', 'length: 3'], { Inv_A1: 'holds' }));
      assert.deepEqual(bounded.problems, []);
      assert.equal(bounded.plan.inv, 'Inv_A1');
      assert.equal(bounded.plan.length, 3);
    });

    it('refuses a call without an invariant, with one the module does not define, with a cinit it lacks, or expecting the wrong word', () => {
      assert.deepEqual(plan(apalache(['mode: bounded', 'length: 3'], { Inv_A1: 'holds', TypeOK: 'holds' })).problems, ['an Apalache call names its invariant under inv: or as the single expect line', 'the call expects something of Inv_A1, which this trial does not check', 'the call expects something of TypeOK, which this trial does not check']);
      assert.deepEqual(plan(apalache(['mode: inductive', 'inv: Inv_A9'], { Inv_A9: 'holds' })).problems, ['model/Timelock.tla does not define Inv_A9']);
      assert.deepEqual(plan(apalache(['mode: inductive', 'inv: Inv_A1', 'cinit: ConstInit_x'], { Inv_A1: 'holds' })).problems, ['model/Timelock.tla does not define ConstInit_x']);
      assert.deepEqual(plan(apalache(['mode: inductive', 'inv: Inv_A1'], { Inv_A1: 'pass' })).problems, ['Inv_A1: an Apalache call expects holds or violated, not "pass"']);
      assert.deepEqual(plan(apalache(['mode: inductive', 'inv: Inv_A1'], { A1: 'holds' })).problems, ['the call expects nothing of Inv_A1', 'the call expects something of A1, which this trial does not check']);
      assert.deepEqual(plan(apalache(['mode: inductive', 'inv: Inv_A1'], { Inv_A1: 'holds' }).replace('  - model/Timelock.tla', '  - model/Nope.tla')).problems, ['model/Nope.tla does not exist']);
    });

    it('refuses a walk\'s witness as the invariant, and a blunder of either checker enabling one', () => {
      assert.deepEqual(plan(apalache(['mode: bounded', 'length: 3', 'inv: NotW1'], { NotW1: 'holds' })).problems, ['NotW1 is a walk\'s witness, which a tlc trial checks']);
      assert.deepEqual(plan(blunder(['model/blunders/loose.tla'], { NotW1: 'violated' }, 'mode: bounded\nlength: 3\ninv: NotW1\n')).problems, ['NotW1 is a walk\'s witness, which a tlc trial checks']);
      write('parts/timelock/model/blunders/loose_W1.cfg', 'SPECIFICATION Spec\nINVARIANTS NotW1\n');
      assert.deepEqual(plan(blunder(['model/blunders/loose.tla', 'model/blunders/loose_W1.cfg'], { NotW1: 'violated' })).problems, ['a blunder enables the property it must catch, not NotW1, a walk\'s witness']);
    });

    it('accepts an Apalache blunder expecting its invariant violated', () => {
      const { plan: p, problems } = plan(blunder(['model/blunders/loose.tla'], { Inv_A1: 'violated' }, 'mode: inductive\ninv: Inv_A1\n'));
      assert.deepEqual(problems, []);
      assert.equal(p.checker, 'apalache');
      assert.match(p.blunderDiff!, /remaining' = 3/);
      assert.deepEqual(plan(blunder(['model/blunders/loose.tla'], { Inv_A1: 'holds' }, 'mode: inductive\ninv: Inv_A1\n')).problems, ['a blunder expects Inv_A1 violated']);
    });
  });

  describe('alloy', () => {
    it('accepts a check expecting no counterexample and a run expecting an instance', () => {
      const check = plan(alloy('model/Timelock.als', { A1_bound: 'no counterexample' }));
      assert.deepEqual(check.problems, []);
      assert.equal(check.plan.checker, 'alloy');
      assert.deepEqual(check.plan.command, { kind: 'check', name: 'A1_bound', scope: 'for 4', overall: 4, passage: 'A1' });
      assert.deepEqual(check.plan.enabled, ['A1_bound']);
      assert.deepEqual(plan(alloy('model/Timelock.als', { W1_plan: 'instance' })).problems, []);
    });

    it('refuses a missing command, the wrong outcome word, two commands or a missing file', () => {
      assert.deepEqual(plan(alloy('model/Timelock.als', { Nope: 'no counterexample' })).problems, ['model/Timelock.als has no check or run named Nope']);
      assert.deepEqual(plan(alloy('model/Timelock.als', { A1_bound: 'holds' })).problems, ['A1_bound is a check: its call expects no counterexample or counterexample, not "holds"']);
      assert.deepEqual(plan(alloy('model/Timelock.als', { A1_bound: 'instance' })).problems, ['A1_bound is a check: its call expects no counterexample or counterexample, not "instance"']);
      assert.deepEqual(plan(alloy('model/Timelock.als', { W1_plan: 'counterexample' })).problems, ['W1_plan is a run: its call expects instance or no instance, not "counterexample"']);
      assert.deepEqual(plan(alloy('model/Timelock.als', { A1_bound: 'no counterexample', W1_plan: 'instance' })).problems, ['an Alloy call expects exactly one command, named under expect:']);
      assert.deepEqual(plan(alloy('model/Nope.als', { A1_bound: 'no counterexample' })).problems, ['model/Nope.als does not exist']);
    });

    it('accepts an Alloy blunder expecting the counterexample it must find', () => {
      const { plan: p, problems } = plan(blunder(['model/blunders/rogue.als'], { A1_bound: 'counterexample' }));
      assert.deepEqual(problems, []);
      assert.equal(p.checker, 'alloy');
      assert.match(p.blunderDiff!, /^-fact S1_idle/m);
      assert.deepEqual(plan(blunder(['model/blunders/rogue.als'], { A1_bound: 'no counterexample' })).problems, ['a blunder expects the counterexample it must find']);
      assert.deepEqual(plan(alloy('model/blunders/rogue.als', { A1_bound: 'counterexample' })).problems, ['only a blunder trial executes a module under model/blunders/']);
    });
  });

  describe('what a blunder leaves alone', () => {
    // A Within N1 counted in n1_ticks, updated as a bullet (M1, M2) and inline in parentheses (M3),
    // as a composition's Tick does; A1 reads the helper Safe, which reads the constant Cap.
    const COUNT = `---- MODULE Count ----
EXTENDS Naturals
CONSTANTS
  \\* @type: Int;
  Cap,
  \\* @type: Int;
  MaxSent
ConstInit == Cap = 2 /\\ MaxSent = 4
VARIABLES state, remaining, n1_ticks
vars == <<state, remaining, n1_ticks>>
Init ==
  /\\ state = "Idle"
  /\\ remaining = 0
  /\\ n1_ticks = 0
M1_Schedule ==                                 \\* M1 on schedule
  /\\ state = "Idle"
  /\\ state' = "Waiting"
  /\\ remaining' = 2
  /\\ n1_ticks' = IF state' = "Ready" THEN 0 ELSE IF ~(state' = "Waiting") THEN 0 ELSE n1_ticks
M2_Tick ==                                 \\* M2 on tick
  /\\ state = "Waiting"
  /\\ remaining > 1
  /\\ state' = state
  /\\ remaining' = remaining - 1
  /\\ n1_ticks' = IF state' = "Ready" THEN 0 ELSE IF ~(state' = "Waiting") THEN 0 ELSE (IF n1_ticks > 2 THEN n1_ticks ELSE n1_ticks + 1)
M3_Tick == state = "Waiting" /\\ remaining <= 1 /\\ state' = "Ready" /\\ remaining' = 0 /\\ (n1_ticks' = IF state' = "Ready" THEN 0 ELSE IF ~(state' = "Waiting") THEN 0 ELSE (IF n1_ticks > 2 THEN n1_ticks ELSE n1_ticks + 1))
Next == M1_Schedule \\/ M2_Tick \\/ M3_Tick
Spec == Init /\\ [][Next]_vars
TypeOK == state \\in {"Idle", "Waiting", "Ready"} /\\ remaining \\in 0..2 /\\ n1_ticks \\in Nat
SentBounded == MaxSent >= 0
Safe == remaining <= Cap
A1 == Safe
N1 == n1_ticks <= 2      \\* given G1
Inv_A1 == TypeOK /\\ A1
Inv_N1 == TypeOK /\\ N1
====
`;
    const ALS = 'sig Plan { next: lone Plan }\nfact S1_acyclic { no p: Plan | p in p.^next }\npred settled[p: Plan] { p not in p.^next }\nassert A1_bound { all p: Plan | settled[p] }   // A1\ncheck A1_bound for 4\n';
    const NEVER = 'a blunder changes the model, never the property';
    const cfg = (cap: number, maxSent: number, enables: string) => `SPECIFICATION Spec\nCONSTANT Cap = ${cap}\nCONSTANT MaxSent = ${maxSent}\nINVARIANTS ${enables}\n`;
    // A guard loosened: a legitimate blunder for A1 and N1 alike.
    const LOOSE = COUNT.replace('  /\\ remaining > 1\n', '  /\\ remaining > 0\n');
    let cdir: string;
    const cplan = (text: string) => { const c = call(text); assert.deepEqual(c.errors, [], c.errors.join('; ')); return planTrial({ call: c, dossierDir: cdir, kind: 'part', ir }).problems; };

    before(() => {
      cdir = join(root, 'parts', 'count');
      write('parts/count/model/Count.tla', COUNT);
      write('parts/count/model/Count.cfg', cfg(2, 4, 'TypeOK A1 N1'));
      write('parts/count/model/Count.als', ALS);
      write('parts/count/model/blunders/A1.cfg', cfg(2, 4, 'A1'));
      write('parts/count/model/blunders/N1.cfg', cfg(2, 4, 'N1'));
      write('parts/count/model/blunders/cap_A1.cfg', cfg(1, 4, 'A1'));
      write('parts/count/model/blunders/maxsent_A1.cfg', cfg(2, 1, 'A1'));
      write('parts/count/model/blunders/loose.tla', LOOSE);
      write('parts/count/model/blunders/tight.tla', COUNT.replace('A1 == Safe\n', 'A1 == Safe /\\ remaining <= 1\n'));
      write('parts/count/model/blunders/safe.tla', COUNT.replace('Safe == remaining <= Cap', 'Safe == remaining < Cap'));
      write('parts/count/model/blunders/count.tla', COUNT.replace('ELSE n1_ticks + 1))\nNext', 'ELSE n1_ticks + 2))\nNext'));
      write('parts/count/model/blunders/start.tla', COUNT.replace('  /\\ n1_ticks = 0', '  /\\ n1_ticks = 1'));
      write('parts/count/model/blunders/kept.tla', COUNT.replace(/( {2}\/\\ remaining' = 2\n {2}\/\\ )n1_ticks' = [^\n]*/, '$1UNCHANGED n1_ticks'));
      write('parts/count/model/blunders/dropped.tla', COUNT.replace(/^M3_Tick == [^\n]*\n/m, '').replace('Next == M1_Schedule \\/ M2_Tick \\/ M3_Tick', 'Next == M1_Schedule \\/ M2_Tick'));
      write('parts/count/model/blunders/capped.tla', LOOSE.replace('ConstInit == Cap = 2', 'ConstInit == Cap = 1'));
      write('parts/count/model/blunders/maxed.tla', LOOSE.replace('MaxSent = 4\nVARIABLES', 'MaxSent = 1\nVARIABLES'));
      write('parts/count/model/blunders/wider.tla', COUNT.replace('N1 == n1_ticks <= 2', 'N1 == n1_ticks <= 3'));
      write('parts/count/model/blunders/strict.als', ALS.replace('settled[p] }', 'settled[p] and no p.next }'));
      write('parts/count/model/blunders/unsettled.als', ALS.replace('pred settled[p: Plan] { p not in p.^next }', 'pred settled[p: Plan] { p not in p.*next }'));
      write('parts/count/model/blunders/factless.als', ALS.replace(/^fact [^\n]*\n/m, ''));
      write('compositions/supply/model/blunders/tight.tla', `---- MODULE Supply ----\nEXTENDS Naturals\nVARIABLES x, adapter_state, adapter_held\nInit == x = 0\nNext == x' = x\nSpec == Init /\\ [][Next]_x\nTypeOK == x \\in 0..1\nA1 == x = 0 /\\ x > 0\nInv_A1 == TypeOK /\\ A1\nW1_End == x = 1\nNotW1 == ~W1_End\nW2_End == x = 0\nNotW2 == ~W2_End\nConstInit_all_honest == TRUE\nConstInit_user_malicious == TRUE\n====\n`);
      write('compositions/supply/model/blunders/tight_A1.cfg', 'SPECIFICATION Spec\nINVARIANTS A1\n');
    });

    it('refuses a copy that only tightens the property, as a part\'s or a composition\'s', () => {
      assert.deepEqual(cplan(blunder(['model/blunders/tight.tla', 'model/blunders/A1.cfg'], { A1: 'violated' })), [`model/blunders/tight.tla changes A1 itself: A1 differs from model/Count.tla; ${NEVER}`]);
      assert.deepEqual(splan(blunder(['model/blunders/tight.tla', 'model/blunders/tight_A1.cfg'], { A1: 'violated' }, 'base: model/generated/Supply.tla\nproperty: A1\nscenario: all-honest\n')).problems, [`model/blunders/tight.tla changes A1 itself: A1 differs from model/generated/Supply.tla; ${NEVER}`]);
    });

    it('refuses a copy that changes a definition the property reaches', () => {
      assert.deepEqual(cplan(blunder(['model/blunders/safe.tla', 'model/blunders/A1.cfg'], { A1: 'violated' })), [`model/blunders/safe.tla changes what A1 reads: Safe differs from model/Count.tla; ${NEVER}`]);
    });

    it('refuses a copy that changes how a Within counts: an update, inline or kept UNCHANGED, or where the counter starts', () => {
      assert.deepEqual(cplan(blunder(['model/blunders/count.tla', 'model/blunders/N1.cfg'], { N1: 'violated' })), [`model/blunders/count.tla changes N1's tick counter: M3_Tick updates n1_ticks as model/Count.tla never does; ${NEVER}`]);
      assert.deepEqual(cplan(blunder(['model/blunders/kept.tla', 'model/blunders/N1.cfg'], { N1: 'violated' })), [`model/blunders/kept.tla changes N1's tick counter: M1_Schedule updates n1_ticks as model/Count.tla never does; ${NEVER}`]);
      assert.deepEqual(cplan(blunder(['model/blunders/start.tla', 'model/blunders/N1.cfg'], { N1: 'violated' })), [`model/blunders/start.tla changes N1's tick counter: n1_ticks starts otherwise than in model/Count.tla; ${NEVER}`]);
    });

    it('accepts a copy that drops an action together with its tick update, and one that loosens a guard', () => {
      assert.deepEqual(cplan(blunder(['model/blunders/dropped.tla', 'model/blunders/N1.cfg'], { N1: 'violated' })), []);
      assert.deepEqual(cplan(blunder(['model/blunders/loose.tla', 'model/blunders/N1.cfg'], { N1: 'violated' })), []);
      assert.deepEqual(cplan(blunder(['model/blunders/loose.tla', 'model/blunders/A1.cfg'], { A1: 'violated' })), []);
    });

    it('refuses a TLC configuration that sets a constant the property reads as no base configuration does, and accepts one that changes another', () => {
      assert.deepEqual(cplan(blunder(['model/blunders/loose.tla', 'model/blunders/cap_A1.cfg'], { A1: 'violated' })), [`model/blunders/cap_A1.cfg changes the constants A1 reads: no configuration under model/ that enables A1 sets Cap so; ${NEVER}`]);
      assert.deepEqual(cplan(blunder(['model/blunders/loose.tla', 'model/blunders/maxsent_A1.cfg'], { A1: 'violated' })), []);
    });

    it('refuses an Apalache blunder whose cinit sets a constant the invariant reads otherwise, and accepts one that changes another', () => {
      const inductive = 'mode: inductive\ninv: Inv_A1\ncinit: ConstInit\n';
      assert.deepEqual(cplan(blunder(['model/blunders/capped.tla'], { Inv_A1: 'violated' }, inductive)), [`model/blunders/capped.tla changes the constants Inv_A1 reads: its ConstInit sets Cap otherwise than model/Count.tla's; ${NEVER}`]);
      assert.deepEqual(cplan(blunder(['model/blunders/maxed.tla'], { Inv_A1: 'violated' }, inductive)), []);
      // Inv_A1 reaches TypeOK, A1 and Safe; Inv_N1 reaches N1, and so N1's counter.
      assert.deepEqual(cplan(blunder(['model/blunders/safe.tla'], { Inv_A1: 'violated' }, inductive)), [`model/blunders/safe.tla changes what Inv_A1 reads: Safe differs from model/Count.tla; ${NEVER}`]);
      assert.deepEqual(cplan(blunder(['model/blunders/start.tla'], { Inv_N1: 'violated' }, 'mode: inductive\ninv: Inv_N1\ncinit: ConstInit\n')), [`model/blunders/start.tla changes N1's tick counter: n1_ticks starts otherwise than in model/Count.tla; ${NEVER}`]);
      // The counter of a Within the question does not reach is the model's, though TypeOK types it.
      assert.deepEqual(cplan(blunder(['model/blunders/kept.tla'], { Inv_A1: 'violated' }, inductive)), []);
      // An inductive step that starts from init: asks what init: reaches as well.
      assert.deepEqual(cplan(blunder(['model/blunders/wider.tla'], { Inv_A1: 'violated' }, 'mode: inductive\ninv: Inv_A1\ninit: Inv_N1\ncinit: ConstInit\n')), [`model/blunders/wider.tla changes where the step of Inv_A1 starts: N1 differs from model/Count.tla; ${NEVER}`]);
      assert.deepEqual(cplan(blunder(['model/blunders/wider.tla'], { Inv_A1: 'violated' }, inductive)), []);
    });

    it('refuses an Apalache blunder whose configuration sets a constant the invariant reads otherwise than the base\'s cinit:, and accepts one that sets another', () => {
      const inductive = 'mode: inductive\ninv: Inv_A1\ncinit: ConstInit\n';
      assert.deepEqual(cplan(blunder(['model/blunders/loose.tla', 'model/blunders/cap_A1.cfg'], { Inv_A1: 'violated' }, inductive)), [`model/blunders/cap_A1.cfg sets Cap, which Inv_A1 reads, otherwise than ConstInit in model/Count.tla; ${NEVER}`]);
      // Without cinit:, nothing in the base sets the constant for Apalache.
      assert.deepEqual(cplan(blunder(['model/blunders/loose.tla', 'model/blunders/cap_A1.cfg'], { Inv_A1: 'violated' }, 'mode: inductive\ninv: Inv_A1\n')), [`model/blunders/cap_A1.cfg sets Cap, which Inv_A1 reads: an Apalache blunder takes them from cinit:, as model/Count.tla does; ${NEVER}`]);
      write('parts/count/model/blunders/maxsent_only.cfg', 'CONSTANT MaxSent = 1\n');
      assert.deepEqual(cplan(blunder(['model/blunders/loose.tla', 'model/blunders/maxsent_only.cfg'], { Inv_A1: 'violated' }, inductive)), []);
    });

    it('holds a history variable to its base as it holds a tick counter, whichever line its comment marks', () => {
      // A1 speaks of the past: paid at the cut is kept in atcut, a history variable.
      const HISTORY = `---- MODULE History ----
EXTENDS Naturals
VARIABLES
  state,
  paid,
  \\* history for A1
  atcut
vars == <<state, paid, atcut>>
Init ==
  /\\ state = "Live"
  /\\ paid = 0
  /\\ atcut = 0
M1_Pay ==                                  \\* M1 on pay
  /\\ state = "Live"
  /\\ paid < 2
  /\\ paid' = paid + 1
  /\\ UNCHANGED <<state, atcut>>
M2_Cut ==                                  \\* M2 on cut
  /\\ state = "Live"
  /\\ state' = "Cut"
  /\\ atcut' = paid
  /\\ UNCHANGED paid
M3_Pay ==                                  \\* M3 on pay
  /\\ state = "Cut"
  /\\ paid < 2
  /\\ paid' = paid + 1
  /\\ UNCHANGED <<state, atcut>>
Next == M1_Pay \\/ M2_Cut \\/ M3_Pay
Spec == Init /\\ [][Next]_vars
TypeOK == state \\in {"Live", "Cut"} /\\ paid \\in 0..2 /\\ atcut \\in 0..2
A1 == state = "Cut" => paid = atcut
====
`;
      const hdir = join(root, 'parts', 'history');
      write('parts/history/model/History.tla', HISTORY);
      write('parts/history/model/History.cfg', 'SPECIFICATION Spec\nINVARIANTS TypeOK A1\n');
      write('parts/history/model/blunders/A1.cfg', 'SPECIFICATION Spec\nINVARIANTS A1\n');
      write('parts/history/model/blunders/later.tla', HISTORY.replace("  /\\ atcut' = paid\n", "  /\\ atcut' = paid + 1\n"));
      write('parts/history/model/blunders/unmarked.tla', HISTORY.replace('  \\* history for A1\n', '').replace("  /\\ atcut' = paid\n", "  /\\ atcut' = paid + 1\n"));
      write('parts/history/model/blunders/early.tla', HISTORY.replace('  /\\ atcut = 0\n', '  /\\ atcut = 1\n'));
      write('parts/history/model/blunders/unguarded.tla', HISTORY.replace('  /\\ state = "Cut"\n  /\\ paid < 2\n', '  /\\ state = "Cut"\n'));
      const hplan = (text: string) => { const c = call(text); assert.deepEqual(c.errors, [], c.errors.join('; ')); return planTrial({ call: c, dossierDir: hdir, kind: 'part', ir }).problems; };
      assert.deepEqual(hplan(blunder(['model/blunders/later.tla', 'model/blunders/A1.cfg'], { A1: 'violated' })), [`model/blunders/later.tla changes A1's history: M2_Cut updates atcut as model/History.tla never does; ${NEVER}`]);
      assert.deepEqual(hplan(blunder(['model/blunders/unmarked.tla', 'model/blunders/A1.cfg'], { A1: 'violated' })), [`model/blunders/unmarked.tla changes A1's history: M2_Cut updates atcut as model/History.tla never does; ${NEVER}`], 'the base\'s comment counts, whatever the copy says');
      assert.deepEqual(hplan(blunder(['model/blunders/early.tla', 'model/blunders/A1.cfg'], { A1: 'violated' })), [`model/blunders/early.tla changes A1's history: atcut starts otherwise than in model/History.tla; ${NEVER}`]);
      assert.deepEqual(hplan(blunder(['model/blunders/unguarded.tla', 'model/blunders/A1.cfg'], { A1: 'violated' })), [], 'a guard loosened after the cut is the model\'s');
      // The comment on the variable's own line, or alone on the line above it.
      assert.deepEqual(historiesOf(HISTORY, ['state', 'paid', 'atcut']), { A1: ['atcut'] });
      assert.deepEqual(historiesOf('VARIABLES state, atcut \\* history for A2\n', ['state', 'atcut']), { A2: ['atcut', 'state'] }, 'every variable the commented line declares');
      assert.deepEqual(historiesOf('VARIABLES\n  atcut,   \\* history for A3\n  state\n', ['state', 'atcut']), { A3: ['atcut'] });
    });

    it('refuses an Alloy blunder that changes the assertion it checks or a pred it reads, and accepts one that removes a fact', () => {
      assert.deepEqual(cplan(blunder(['model/blunders/strict.als'], { A1_bound: 'counterexample' })), [`model/blunders/strict.als changes A1_bound itself: A1_bound differs from model/Count.als; ${NEVER}`]);
      assert.deepEqual(cplan(blunder(['model/blunders/unsettled.als'], { A1_bound: 'counterexample' })), [`model/blunders/unsettled.als changes what A1_bound reads: settled differs from model/Count.als; ${NEVER}`]);
      assert.deepEqual(cplan(blunder(['model/blunders/factless.als'], { A1_bound: 'counterexample' })), []);
    });

    // What the question reaches further: a counter's helpers, a constant's definition, an imported
    // or LOCAL definition, every overload of a pred. And where an update ends, as TLA+ reads it.
    const plans = (part: string) => (text: string) => { const c = call(text); assert.deepEqual(c.errors, [], c.errors.join('; ')); return planTrial({ call: c, dossierDir: join(root, 'parts', part), kind: 'part', ir }).problems; };

    it('holds the definitions and constants a counter\'s start and updates reach to the base', () => {
      const BUMP = `---- MODULE Bump ----\nEXTENDS Naturals\nCONSTANT Limit\nVARIABLES x, n1_ticks\nInitial == 0\nBump(t) == IF t < Limit THEN t + 1 ELSE t\nInit == x = 0 /\\ n1_ticks = Initial\nMove == x < 1 /\\ x' = x + 1 /\\ n1_ticks' = Bump(n1_ticks)\nNext == Move\nSpec == Init /\\ [][Next]_<<x, n1_ticks>>\nN1 == n1_ticks <= 1\n====\n`;
      const limit = (n: number) => `SPECIFICATION Spec\nCONSTANT Limit = ${n}\nINVARIANT N1\n`;
      write('parts/bump/model/Bump.tla', BUMP);
      write('parts/bump/model/Bump.cfg', limit(1));
      write('parts/bump/model/blunders/N1.cfg', limit(1));
      write('parts/bump/model/blunders/limit_N1.cfg', limit(2));
      write('parts/bump/model/blunders/bump.tla', BUMP.replace('THEN t + 1', 'THEN t + 2'));
      write('parts/bump/model/blunders/initial.tla', BUMP.replace('Initial == 0', 'Initial == 2'));
      write('parts/bump/model/blunders/loose.tla', BUMP.replace('x < 1', 'x < 2'));
      const bplan = plans('bump');
      assert.deepEqual(bplan(blunder(['model/blunders/bump.tla', 'model/blunders/N1.cfg'], { N1: 'violated' })), [`model/blunders/bump.tla changes N1's tick counter: Bump differs from model/Bump.tla; ${NEVER}`], 'n1_ticks\' = Bump(n1_ticks) reads as before, and Bump counts otherwise');
      assert.deepEqual(bplan(blunder(['model/blunders/initial.tla', 'model/blunders/N1.cfg'], { N1: 'violated' })), [`model/blunders/initial.tla changes N1's tick counter: Initial differs from model/Bump.tla; ${NEVER}`], 'n1_ticks = Initial reads as before, and Initial starts it elsewhere');
      assert.deepEqual(bplan(blunder(['model/blunders/loose.tla', 'model/blunders/limit_N1.cfg'], { N1: 'violated' })), [`model/blunders/limit_N1.cfg changes the constants N1 reads: no configuration under model/ that enables N1 sets Limit so; ${NEVER}`], 'Bump reads Limit');
      assert.deepEqual(bplan(blunder(['model/blunders/loose.tla', 'model/blunders/N1.cfg'], { N1: 'violated' })), []);
    });

    it('holds what a cinit: right-hand side reaches, and the definition a TLC configuration binds with <-, to the base', () => {
      const ALIAS = `---- MODULE Alias ----\nEXTENDS Naturals\nCONSTANTS\n  \\* @type: Int;\n  Cap,\n  \\* @type: Int;\n  Seed\nVARIABLES\n  \\* @type: Int;\n  x\nBound == 1\nConstInit == Cap = Bound /\\ Seed = 0\nConstInit_seed == Seed = 0\nInit == x = 0\nNext == x < 1 /\\ x' = x + 1\nSpec == Init /\\ [][Next]_x\nA1 == x <= Cap\n====\n`;
      const bound = (cap: string) => `SPECIFICATION Spec\nCONSTANT Cap ${cap}\nCONSTANT Seed = 0\nINVARIANT A1\n`;
      write('parts/alias/model/Alias.tla', ALIAS);
      write('parts/alias/model/Alias.cfg', bound('<- Bound'));
      write('parts/alias/model/blunders/A1.cfg', bound('<- Bound'));
      write('parts/alias/model/blunders/model_value_A1.cfg', bound('= Bound'));
      write('parts/alias/model/blunders/bound.tla', ALIAS.replace('Bound == 1', 'Bound == 0'));
      write('parts/alias/model/blunders/loose.tla', ALIAS.replace('x < 1', 'x < 2'));
      const aplan = plans('alias'), bounded = 'mode: bounded\nlength: 1\ninv: A1\ncinit: ConstInit\n';
      assert.deepEqual(aplan(blunder(['model/blunders/bound.tla'], { A1: 'violated' }, bounded)), [`model/blunders/bound.tla changes the constants A1 reads: its ConstInit sets Cap otherwise than model/Alias.tla's; ${NEVER}`], 'Cap = Bound reads as before, and Bound is another value');
      assert.deepEqual(aplan(blunder(['model/blunders/loose.tla'], { A1: 'violated' }, bounded)), []);
      assert.deepEqual(aplan(blunder(['model/blunders/bound.tla', 'model/blunders/A1.cfg'], { A1: 'violated' })), [`model/blunders/bound.tla changes the constants A1 reads: Bound differs from model/Alias.tla; ${NEVER}`], 'Cap <- Bound reads as before, and Bound is another value');
      assert.deepEqual(aplan(blunder(['model/blunders/loose.tla', 'model/blunders/A1.cfg'], { A1: 'violated' })), []);
      assert.deepEqual(aplan(blunder(['model/blunders/loose.tla', 'model/blunders/model_value_A1.cfg'], { A1: 'violated' })), [`model/blunders/model_value_A1.cfg changes the constants A1 reads: no configuration under model/ that enables A1 sets Cap so; ${NEVER}`], 'Cap = Bound is a model value, not the definition');
    });

    it('accepts an Apalache configuration that sets a constant as the base\'s cinit: does, through a definition too, and refuses one that cinit: leaves unset', () => {
      write('parts/count/model/blunders/cap2_only.cfg', 'CONSTANT Cap = 2\n');
      assert.deepEqual(cplan(blunder(['model/blunders/loose.tla', 'model/blunders/cap2_only.cfg'], { Inv_A1: 'violated' }, 'mode: inductive\ninv: Inv_A1\ncinit: ConstInit\n')), []);
      write('parts/alias/model/blunders/cap1.cfg', 'CONSTANT Cap = 1\nCONSTANT Seed = 0\n');
      write('parts/alias/model/blunders/cap0.cfg', 'CONSTANT Cap = 0\nCONSTANT Seed = 0\n');
      const aplan = plans('alias'), bounded = (cinit: string) => `mode: bounded\nlength: 1\ninv: A1\ncinit: ${cinit}\n`;
      assert.deepEqual(aplan(blunder(['model/blunders/loose.tla', 'model/blunders/cap1.cfg'], { A1: 'violated' }, bounded('ConstInit'))), [], 'ConstInit sets Cap = Bound, and Bound == 1');
      assert.deepEqual(aplan(blunder(['model/blunders/loose.tla', 'model/blunders/cap0.cfg'], { A1: 'violated' }, bounded('ConstInit'))), [`model/blunders/cap0.cfg sets Cap, which A1 reads, otherwise than ConstInit in model/Alias.tla; ${NEVER}`]);
      assert.deepEqual(aplan(blunder(['model/blunders/loose.tla', 'model/blunders/cap1.cfg'], { A1: 'violated' }, bounded('ConstInit_seed'))), [`model/blunders/cap1.cfg sets Cap, which A1 reads, otherwise than ConstInit_seed in model/Alias.tla; ${NEVER}`], 'ConstInit_seed leaves Cap unset');
    });

    it('holds a definition the property reaches in a local module it imports to the base, found beside each module', () => {
      const IMPORTS = `---- MODULE Imports ----\nEXTENDS Naturals, Question\nVARIABLE x\nInit == x = 1\nNext == x < 2 /\\ x' = x + 1\nSpec == Init /\\ [][Next]_x\nA1 == Safe(x)\n====\n`;
      const QUESTION = (n: number) => `---- MODULE Question ----\nSafe(x) == x <= ${n}\n====\n`;
      for (const [part, copied] of [['imported', 0], ['imported-alike', 1]] as const) {
        write(`parts/${part}/model/Imports.tla`, IMPORTS);
        write(`parts/${part}/model/Question.tla`, QUESTION(1));
        write(`parts/${part}/model/blunders/copy.tla`, IMPORTS.replace('x < 2', 'x < 3'));
        write(`parts/${part}/model/blunders/Question.tla`, QUESTION(copied));
        write(`parts/${part}/model/blunders/A1.cfg`, 'SPECIFICATION Spec\nINVARIANT A1\n');
      }
      const call = blunder(['model/blunders/copy.tla', 'model/blunders/A1.cfg'], { A1: 'violated' }, 'base: model/Imports.tla\n');
      assert.deepEqual(plans('imported')(call), [`model/blunders/copy.tla changes what A1 reads: Safe differs from model/Question.tla; ${NEVER}`]);
      assert.deepEqual(plans('imported-alike')(call), []);
    });

    it('holds a LOCAL definition the property reaches to the base, while parseTla\'s readers still leave LOCAL ones out', () => {
      const LOCAL = (n: number, guard = 1) => `---- MODULE Local ----\nEXTENDS Naturals\nVARIABLE x\nLOCAL Safe == x <= ${n}\nInit == x = 0\nNext == x < ${guard} /\\ x' = x + 1\nSpec == Init /\\ [][Next]_x\nA1 == Safe\n====\n`;
      write('parts/local/model/Local.tla', LOCAL(1));
      write('parts/local/model/blunders/A1.cfg', 'SPECIFICATION Spec\nINVARIANT A1\n');
      write('parts/local/model/blunders/local.tla', LOCAL(0));
      write('parts/local/model/blunders/loose.tla', LOCAL(1, 2));
      assert.deepEqual(plans('local')(blunder(['model/blunders/local.tla', 'model/blunders/A1.cfg'], { A1: 'violated' })), [`model/blunders/local.tla changes what A1 reads: Safe differs from model/Local.tla; ${NEVER}`]);
      assert.deepEqual(plans('local')(blunder(['model/blunders/loose.tla', 'model/blunders/A1.cfg'], { A1: 'violated' })), []);
      assert.equal(parseTla(LOCAL(1)).definitions.Safe, undefined);
      assert.match(parseTla(LOCAL(1), { local: true }).definitions.Safe.text, /^LOCAL Safe == x <= 1/);
    });

    it('holds every overload of a pred the assertion reaches to the base', () => {
      const OVERLOAD = (second: string) => `sig A {}\nsig B {}\nfact S1_some { some A }\npred okay[b: B] { b = b }\npred okay[a: A] { ${second} }\nassert A1_safe { all a: A | okay[a] }\ncheck A1_safe for 3\n`;
      write('parts/overload/model/Overload.als', OVERLOAD('a = a'));
      write('parts/overload/model/blunders/overload.als', OVERLOAD('no a'));
      write('parts/overload/model/blunders/factless.als', OVERLOAD('a = a').replace(/^fact [^\n]*\n/m, ''));
      assert.deepEqual(plans('overload')(blunder(['model/blunders/overload.als'], { A1_safe: 'counterexample' })), [`model/blunders/overload.als changes what A1_safe reads: okay differs from model/Overload.als; ${NEVER}`], 'the second okay, not the first');
      assert.deepEqual(plans('overload')(blunder(['model/blunders/factless.als'], { A1_safe: 'counterexample' })), []);
    });

    it('ends a counter\'s update where TLA+ ends it: before a guard on its line, and after the last branch of an IF', () => {
      const BULLET = (bound: number) => `---- MODULE Bullet ----\nEXTENDS Naturals\nVARIABLE n1_ticks\nInit == n1_ticks = 0\nNext ==\n  /\\ n1_ticks' = n1_ticks + 1 /\\ n1_ticks < ${bound}\nSpec == Init /\\ [][Next]_n1_ticks\nN1 == n1_ticks <= 1\n====\n`;
      const BRANCH = (bound: number) => `---- MODULE Branch ----\nEXTENDS Naturals\nVARIABLE n1_ticks\nInit == n1_ticks = 0\nNext == n1_ticks' = IF n1_ticks > 5 THEN 0 ELSE n1_ticks + 1 /\\ n1_ticks < ${bound}\nSpec == Init /\\ [][Next]_n1_ticks\nN1 == n1_ticks <= 1\n====\n`;
      const N1 = 'SPECIFICATION Spec\nINVARIANT N1\nCHECK_DEADLOCK FALSE\n';
      write('parts/bullet/model/Bullet.tla', BULLET(1));
      write('parts/bullet/model/blunders/guard.tla', BULLET(2));
      write('parts/bullet/model/blunders/N1.cfg', N1);
      write('parts/branch/model/Branch.tla', BRANCH(1));
      write('parts/branch/model/blunders/guard.tla', BRANCH(2));
      write('parts/branch/model/blunders/N1.cfg', N1);
      const guard = blunder(['model/blunders/guard.tla', 'model/blunders/N1.cfg'], { N1: 'violated' });
      assert.deepEqual(plans('bullet')(guard), [], '= binds tighter than /\\: the guard is a conjunct of its own');
      assert.deepEqual(plans('branch')(guard), [`model/blunders/guard.tla changes N1's tick counter: Next updates n1_ticks as model/Branch.tla never does; ${NEVER}`], 'the ELSE branch runs to the end of the definition');
      const updates = (body: string) => movesOf(parseTla(`---- MODULE U ----\nVARIABLE n1_ticks\n${body}\n====\n`).definitions, 'n1_ticks').updates.map(u => u.expr);
      assert.deepEqual(updates('Next ==\n  /\\ n1_ticks\' = IF n1_ticks > 5 THEN 0 ELSE n1_ticks + 1 /\\ n1_ticks < 1\n  /\\ TRUE'), ['= IF n1_ticks > 5 THEN 0 ELSE n1_ticks + 1 /\\ n1_ticks < 1']);
      assert.deepEqual(updates('Next == n1_ticks\' = n1_ticks + 1 \\/ n1_ticks\' = 0'), ['= n1_ticks + 1', '= 0']);
      assert.deepEqual(updates('Next == (n1_ticks\' = CHOOSE t \\in 0..2 : t > n1_ticks /\\ t < 3) /\\ TRUE'), ['= CHOOSE t \\in 0..2 : t > n1_ticks /\\ t < 3']);
      assert.deepEqual(updates('Next ==\n  /\\ n1_ticks\' = n1_ticks\n                 + 1\n  /\\ TRUE'), ['= n1_ticks + 1']);
      // The item is the bullet's, though the update follows another conjunct on its line.
      assert.deepEqual(updates('Next ==\n  /\\ TRUE /\\ n1_ticks\' = IF n1_ticks > 5 THEN 0 ELSE n1_ticks + 1\n  /\\ n1_ticks < 1'), ['= IF n1_ticks > 5 THEN 0 ELSE n1_ticks + 1']);
    });
  });

  describe('external', () => {
    it('needs a declared runner with a command, existing files and pass or fail expectations', () => {
      const externals = { replay: { command: ['node', 'replay.mjs'], cwd: 'tools' } };
      const good = plan(external(['prose.md'], { W1: 'pass', K1: 'fail' }), { externals });
      assert.deepEqual(good.problems, []);
      assert.equal(good.plan.checker, 'external');
      assert.deepEqual(good.plan.runner, { id: 'replay', command: ['node', 'replay.mjs'], cwd: 'tools' });
      assert.deepEqual(good.plan.enabled, ['W1', 'K1']);
      assert.deepEqual(plan(external(['prose.md'], { W1: 'pass' })).problems, ['runner "replay" is not declared under external in dossier.json']);
      assert.deepEqual(plan(external(['prose.md'], { W1: 'pass' }), { externals: { replay: { command: [] } } }).problems, ['runner "replay" has no command']);
      assert.deepEqual(plan(external(['nope.md'], { W1: 'holds' }), { externals }).problems, ['executes names nope.md, which does not exist', 'W1: an external call expects pass or fail, not "holds"']);
    });
  });

  describe('paths', () => {
    it('refuses a path outside the dossier, written another way, or leading out through a link, before reading anything', () => {
      write('parts/two/model/Two.tla', MODULE('Two'));
      symlinkSync(join(root, 'parts', 'two', 'model', 'Two.tla'), join(dir, 'model', 'Linked.tla'));
      assert.deepEqual(plan(tlc(['../two/model/Two.tla', 'model/Timelock.cfg'], { TypeOK: 'holds', A1: 'holds' })).problems, ['executes names ../two/model/Two.tla, which is outside the dossier']);
      assert.deepEqual(plan(blunder(['model/blunders/../Timelock.tla', 'model/blunders/loose_A1.cfg'], { A1: 'violated' })).problems, ['executes names model/blunders/../Timelock.tla, which is outside the dossier']);
      assert.deepEqual(plan(tlc([join(dir, 'model', 'Timelock.tla'), 'model/Timelock.cfg'], { TypeOK: 'holds', A1: 'holds' })).problems, [`executes names ${join(dir, 'model', 'Timelock.tla')}, which is outside the dossier`]);
      assert.deepEqual(plan(tlc(['./model/Timelock.tla', 'model/Timelock.cfg'], { TypeOK: 'holds', A1: 'holds' })).problems, ['executes names ./model/Timelock.tla; write it model/Timelock.tla']);
      assert.deepEqual(plan(tlc(['model/Linked.tla', 'model/Timelock.cfg'], { TypeOK: 'holds', A1: 'holds' })).problems, ['executes names model/Linked.tla, which leads outside the dossier']);
      assert.deepEqual(plan(blunder(['model/blunders/loose.tla', 'model/blunders/loose_A1.cfg'], { A1: 'violated' }, 'base: ../two/model/Two.tla\n')).problems, ['base names ../two/model/Two.tla, which is outside the dossier']);
      assert.equal(outside(dir, 'model/Timelock.tla'), null);
      assert.equal(outside(dir, 'model/Nope.tla'), null, 'a file that does not exist is the plan\'s to report');
      rmSync(join(dir, 'model', 'Linked.tla'));
    });

    it('compares a blunder with the one module under the model\'s folder, in order, and asks for base: when there are several', () => {
      const twin = join(root, 'parts', 'twin');
      write('parts/twin/model/Twin.tla', MODULE('Twin'));
      write('parts/twin/model/Aux.tla', MODULE('Aux'));
      write('parts/twin/model/blunders/loose.tla', MODULE('loose', 3));
      write('parts/twin/model/blunders/loose_A1.cfg', 'SPECIFICATION Spec\nINVARIANTS A1\n');
      const many = planTrial({ call: call(blunder(['model/blunders/loose.tla', 'model/blunders/loose_A1.cfg'], { A1: 'violated' })), dossierDir: twin, kind: 'part', ir });
      assert.deepEqual(many.problems, ['model/ holds Aux.tla, Twin.tla: name the module the blunder is a copy of under base:']);
      const based = planTrial({ call: call(blunder(['model/blunders/loose.tla', 'model/blunders/loose_A1.cfg'], { A1: 'violated' }, 'base: model/Twin.tla\n')), dossierDir: twin, kind: 'part', ir });
      assert.deepEqual(based.problems, []);
      assert.match(based.plan.blunderDiff!, /^--- model\/Twin\.tla/m);
    });

    it('refuses trace-data that names no variable of the module, and a composition witness expecting a trace without trace-data', () => {
      assert.deepEqual(plan(tlc(['model/Timelock.tla', 'model/Timelock_W1.cfg'], { TypeOK: 'holds', NotW1: 'violated; trace: Idle/0 > Waiting/1' }, 'trace-data: remaining\n')).problems, []);
      assert.deepEqual(plan(tlc(['model/Timelock.tla', 'model/Timelock_W1.cfg'], { TypeOK: 'holds', NotW1: 'violated; trace: Idle/0 > Waiting/1' }, 'trace-data: remainng\n')).problems, ['trace-data names remainng, which model/Timelock.tla does not declare as a variable']);
      assert.deepEqual(splan(tlc(['model/generated/Supply.tla', 'model/generated/W1_all_honest.cfg'], { TypeOK: 'holds', NotW1: 'violated; trace: Open/0 > Halted/1' }, 'walk: W1\nscenario: all-honest\n')).problems, ['a composition witness that expects a trace names the variables of each step under trace-data:']);
    });
  });

  it('refuses a call whose files fit no checker', () => {
    const { plan: p, problems } = plan(blunder(['notes.md', 'other.md'], { A1: 'violated' }));
    assert.equal(p.checker, null);
    assert.deepEqual(problems, ['a blunder trial executes a .tla and .cfg, a .tla for apalache, an .als, prose.md for the chart, or names a runner']);
    assert.deepEqual(plan(tlc(['notes.md', 'other.md'], { A1: 'holds' })).problems, ['a TLC trial executes exactly one .tla and one .cfg']);
  });
});

describe('describeMachineDiff', () => {
  const ir = compileIR(parseProse(PROSE));

  it('lists changed, added and removed transitions and states, and a changed context', () => {
    const mutated = JSON.parse(JSON.stringify(ir)) as Ir;
    mutated.transitions.find(t => t.id === 'M4')!.target = 'Waiting';
    mutated.transitions.find(t => t.id === 'M2')!.guard = null;
    mutated.transitions = mutated.transitions.filter(t => t.id !== 'M3');
    mutated.transitions.push({ id: 'M9', from: 'Idle', event: 'execute', stays: true, target: 'Idle', guard: null, assigns: [], effects: [] });
    mutated.states.push({ id: 'S9', key: 'Lost' } as IrState);
    mutated.states.find(s => s.id === 'S1')!.final = true;
    mutated.context[0].max = 3;
    const diff = describeMachineDiff(ir, mutated);
    assert.ok(diff.includes('~ M4.target: "Idle" -> "Waiting"\n'));
    assert.ok(diff.includes('~ M2.guard: {"t":"bin","op":">","l":{"t":"ref","name":"remaining"},"r":{"t":"int","v":1}} -> null\n'));
    assert.ok(diff.includes('- M3: removed\n'));
    assert.ok(diff.includes('+ M9: added {"id":"M9","from":"Idle","event":"execute","stays":true,"target":"Idle","guard":null,"assigns":[],"effects":[]}\n'));
    assert.ok(diff.includes('+ S9: added state {"id":"S9","key":"Lost"}\n'));
    assert.match(diff, /^~ S1: .*"final":false.* -> .*"final":true/m);
    assert.match(diff, /^~ context: .*"max":2.* -> .*"max":3/m);
    assert.ok(diff.endsWith('\n'));
  });

  it('says nothing for an identical machine', () => {
    assert.equal(describeMachineDiff(ir, JSON.parse(JSON.stringify(ir))), '');
  });
});
