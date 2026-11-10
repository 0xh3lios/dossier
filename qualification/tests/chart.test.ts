// The chart on the real xstate and @xstate/graph: the machine, the bounded
// exploration, the generated checks, the grid and draw.
// Run: node --test qualification/tests/chart.test.ts
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { prefixHead } from '../../src/dossiers/integrity.ts';
import { parseProse } from '../../src/prose/prose.ts';
import { compileIR } from '../../src/prose/ir.ts';
import { SENT_CAP, buildMachine, inState, leavesOf } from '../../src/chart/machine.ts';
import { describePath, explore, pathTo, strayed } from '../../src/chart/explore.ts';
import { runChecks } from '../../src/chart/checks.ts';
import { gridMarkdown } from '../../src/chart/picture.ts';
import { checkIR, compilePart, draw, findModule, loadRuntime, summarize } from '../../src/chart/draw.ts';
import type { Ir } from '../../src/prose/ir.ts';
import type { ChartEvent, Snapshot } from '../../src/chart/machine.ts';
import type { ChartPath } from '../../src/chart/explore.ts';
import type { ChartRun, Runtime } from '../../src/chart/draw.ts';

const TIMELOCK = `# Timelock
Tier: modeled
Module: gov-timelock

The Timelock holds a plan and executes it after a delay. It holds remaining, a count from 0 to 2. It sends change to the Vault, and notify to Governance.

## States
[S1] Idle: nothing is planned.
[S2] Waiting: the delay has not run out.
[S3] Ready: the delay has run out.
[S4] Spent: the timelock is over. Final.

## Events
[E1] schedule, from Governance: a plan is proposed. Carries delay, a count from 1 to 2.
[E2] tick, from the chain: a block passes.
[E3] execute, from the public: the plan is executed.
[E4] cancel, from Governance: the plan is abandoned.
[E5] retire, from Governance: the timelock is retired.

## Moves
[M1] When Idle receives schedule, it becomes Waiting, with remaining delay.
[M2] When Waiting receives tick and remaining is above 1, it stays Waiting, remaining drops by one.
[M3] When Waiting receives tick and remaining is at most 1, it becomes Ready, remaining becomes 0.
[M4] When Ready receives execute, it becomes Idle, sends change.
[M5] When Waiting receives cancel, it becomes Idle, remaining becomes 0, sends notify.
[M6] When Idle receives retire, it becomes Spent.
[M7] When Ready receives cancel, it becomes Idle, sends notify.
[R1] In Idle, tick, execute and cancel are refused.
[R2] In Waiting and Ready, schedule and retire are refused.
[R3] In Waiting, execute is refused, sends notify.
[R4] In Ready, tick is refused.
[R5] In Spent, every event is refused.

## Always
[A1] Always, remaining is at most 2.
[A2] Always, while Idle, remaining is 0.

## Walks
[W1] Walk Plan: from Idle, schedule delay 2, execute refused, tick, tick, execute; ends Idle with remaining 0; change sent once; notify not sent.
[W2] Walk Cancel: from Waiting with remaining 1, cancel; ends Idle; notify sent 1 times.

## Words only
[T1] The piece promises nothing eventual.
`;

const COMPOUND = `# Lamp
Tier: charted
Module: lamp

It holds n, a count from 0 to 1.

## States
[S1] Off: dark.
[S2] Running: lit. Within it, it is either Dim or Bright; it starts Dim.
[S3] Running.Dim: low.
[S4] Running.Bright: high.

## Events
[E1] on, from the user: switch on.
[E2] off, from the user: switch off.
[E3] more, from the user: brighter.

## Moves
[M1] When Off receives on, it becomes Running.
[M2] When Running receives off, it becomes Off.
[M3] When Running.Dim receives more, it becomes Running.Bright.
[R1] In Off, off and more are refused.
[R2] In Running, on is refused.
[R3] In Running.Bright, more is refused.

## Words only
[T1] The piece promises nothing eventual.
`;

const PARALLEL = `# Lamp
Tier: charted
Module: lamp

It holds n, a count from 0 to 1.

## States
[S1] Off: dark.
[S2] Running: lit. Within it, it is both Clock and Beam.
[S3] Running.Clock: the clock half.
[S4] Running.Beam: the beam half.

## Events
[E1] on, from the user: switch on.
[E2] off, from the user: switch off.

## Moves
[M1] When Off receives on, it becomes Running.
[M2] When Running receives off, it becomes Off.
[R1] In Off, off is refused.
[R2] In Running, on is refused.

## Words only
[T1] The piece promises nothing eventual.
`;

const pluginRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const irOf = (text: string) => compileIR(parseProse(text));
const byName = (result: ChartRun, part: string) => result.checks!.filter(c => c.name.includes(part));
const failed = (result: ChartRun) => result.checks!.filter(c => c.status === 'failed');

let root: string, rt: Runtime;
before(async () => {
  root = mkdtempSync(join(tmpdir(), 'dossier-chart-'));
  writeFileSync(join(root, 'dossier.json'), JSON.stringify({ plugin: '0.2.0', storage: 'integrity-v1' }) + '\n');
  rt = await loadRuntime(root);
  assert.equal(rt.error, undefined, rt.error);
});
after(() => rmSync(root, { recursive: true, force: true }));

const part = (id: string, text: string) => {
  const dir = join(root, 'parts', id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'prose.md'), text);
  return dir;
};
const check = (text: string, options: { machineIR?: Ir; limit?: number } = {}) => checkIR({ root, ir: irOf(text), ...options });

describe('the runtime', () => {
  it('falls back to the plugin\'s own xstate and @xstate/graph and reports their versions', () => {
    assert.equal(findModule(root, 'xstate')!.dir, join(pluginRoot, 'node_modules', 'xstate'));
    assert.equal(findModule(root, 'nothing-of-the-kind'), null);
    assert.equal(typeof rt.xstate!.createMachine, 'function');
    assert.equal(typeof rt.graph!.getAdjacencyMap, 'function');
    assert.match(rt.versions!.xstate, /^5\./);
    assert.match(rt.versions!['@xstate/graph'], /^3\./);
  });
});

describe('draw', () => {
  it('writes the chart files, passes every check and summarizes', async () => {
    part('timelock', TIMELOCK);
    const r = await draw({ root, part: 'timelock' });
    assert.equal(r.ok, true, r.errors && r.errors.join('; '));
    assert.equal(r.outcome, 'pass');
    assert.deepEqual(r.files, ['parts/timelock/chart/machine.json', 'parts/timelock/chart/grid.md']);
    assert.deepEqual(r.removed, []);
    assert.deepEqual(readdirSync(join(root, 'parts', 'timelock', 'chart')).sort(), ['grid.md', 'machine.json'], 'no Mermaid picture is written');
    assert.deepEqual(JSON.parse(readFileSync(join(root, 'parts', 'timelock', 'chart', 'machine.json'), 'utf8')), JSON.parse(JSON.stringify(irOf(TIMELOCK))));
    assert.equal(readFileSync(join(root, 'parts', 'timelock', 'chart', 'grid.md'), 'utf8'), gridMarkdown(r.ir!));
    const summary = summarize(r);
    assert.match(summary, /^draw: timelock · pass · 27 of 27 checks · \d+ states explored\n/);
    assert.match(summary, /\n  wrote parts\/timelock\/chart\/machine\.json\n/);
    assert.doesNotMatch(summary, /fail /);
    assert.equal(r.versions!.xstate, rt.versions!.xstate);
  });

  it('reports a part that does not exist or does not compile', async () => {
    const missing = await draw({ root, part: 'nowhere' });
    assert.match(missing.error!, /no prose\.md under parts\/nowhere\//);
    assert.match(summarize(missing), /^draw: .*· error · no prose\.md under parts\/nowhere\//);
    part('broken', TIMELOCK.replace('[M1] When Idle receives schedule', '[M1] When Lost receives schedule'));
    const broken = await draw({ root, part: 'broken' });
    assert.equal(broken.ok, false);
    assert.ok(broken.errors!.includes('M1 names state Lost, which no State passage declares'));
    assert.match(summarize(broken), /^draw: broken · does not compile\n  M1 names state Lost/);
    assert.equal(existsSync(join(root, 'parts', 'broken', 'chart')), false, 'nothing is written for a prose that does not compile');
  });

  it('can check without writing', async () => {
    part('quiet', TIMELOCK);
    const r = await draw({ root, part: 'quiet', write: false });
    assert.equal(r.outcome, 'pass');
    assert.deepEqual(r.files, []);
    assert.equal(existsSync(join(root, 'parts', 'quiet', 'chart')), false);
    assert.equal(compilePart(join(root, 'parts', 'quiet', 'prose.md')).ir.ok, true);
  });

  it('removes only what an earlier draw wrote under the retired names, and only when it writes', async () => {
    const dir = part('stale', TIMELOCK), chart = join(dir, 'chart');
    mkdirSync(chart, { recursive: true });
    writeFileSync(join(chart, 'chart.mmd'), 'stateDiagram-v2\n');
    const quiet = await draw({ root, part: 'stale', write: false });
    assert.deepEqual(quiet.removed, []);
    assert.ok(existsSync(join(chart, 'chart.mmd')), 'a draw that writes nothing removes nothing');
    assert.deepEqual((await draw({ root, part: 'stale' })).removed, ['parts/stale/chart/chart.mmd']);
    // A folder or a link under a retired name is not a picture draw wrote: it stays, and so does the link's target.
    mkdirSync(join(chart, 'chart.mmd'));
    symlinkSync(join(dir, 'prose.md'), join(chart, 'walks.mmd'));
    const kept = await draw({ root, part: 'stale' });
    assert.equal(kept.outcome, 'pass');
    assert.deepEqual(kept.removed, []);
    assert.doesNotMatch(summarize(kept), /removed/);
    assert.ok(lstatSync(join(chart, 'chart.mmd')).isDirectory());
    assert.ok(lstatSync(join(chart, 'walks.mmd')).isSymbolicLink());
    assert.equal(readFileSync(join(dir, 'prose.md'), 'utf8'), TIMELOCK);
  });
});

describe('the checks on a correct prose', () => {
  let r: ChartRun;
  before(async () => { r = await check(TIMELOCK); });

  it('passes every kind of check, each named by the passages it covers', () => {
    assert.equal(r.outcome, 'pass');
    assert.equal(r.failed, 0);
    assert.equal(r.passed, 27);
    const names = r.checks!.map(c => c.name);
    for (const expected of ['S1: Idle is reachable', 'S4: Spent is reachable', 'E1: schedule is handled', 'E5: retire is handled', 'M1: Idle receives schedule as said', 'M7: Ready receives cancel as said', 'R1: refused as said', 'R5: refused as said', 'W1: walk Plan replays', 'W2: walk Cancel replays', 'M1 M2 M3 M4 M5 M6 M7: at most one move or refusal applies to each state and event', 'A1: always remaining <= 2', 'A2: always while Idle remaining = 0']) {
      assert.ok(names.includes(expected), expected);
    }
    assert.deepEqual(r.covers, ['S1', 'S2', 'S3', 'S4', 'E1', 'E2', 'E3', 'E4', 'E5', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'R1', 'R2', 'R3', 'R4', 'R5', 'W1', 'W2', 'A1', 'A2']);
    assert.deepEqual(r.refusalIds, ['R1', 'R2', 'R3', 'R4', 'R5']);
    assert.deepEqual(r.gaps, []);
    assert.equal(r.limitHit, undefined, 'a run the limit did not cut short says nothing of it');
    assert.ok(r.explored! > 10);
  });
});

describe('the checks on a wrong prose', () => {
  it('fails a walk that ends elsewhere, with the state it ended in', async () => {
    const r = await check(TIMELOCK.replace('execute; ends Idle with remaining 0', 'execute; ends Ready with remaining 0'));
    assert.equal(r.outcome, 'fail');
    const [w] = byName(r, 'W1');
    assert.equal(w.status, 'failed');
    assert.match(w.message, /ends in Idle, not Ready/);
    assert.deepEqual(failed(r).map(c => c.ids), [['W1']]);
    assert.equal(r.covers!.includes('W1'), false);
  });

  it('fails a walk whose step is refused, or accepted where the walk says refused', async () => {
    const refused = await check(TIMELOCK.replace('schedule delay 2, execute refused, tick, tick, execute', 'schedule delay 2, execute, tick, tick, execute'));
    assert.match(byName(refused, 'W1')[0].message, /step 2 execute is refused at Waiting/);
    const accepted = await check(TIMELOCK.replace('schedule delay 2, execute refused, tick, tick, execute', 'schedule delay 2, tick refused, tick, tick, execute'));
    assert.match(byName(accepted, 'W1')[0].message, /step 2 tick was accepted at Waiting .* but the walk says refused/);
    const data = await check(TIMELOCK.replace('ends Idle with remaining 0; change sent once', 'ends Idle with remaining 1; change sent 2 times'));
    assert.match(byName(data, 'W1')[0].message, /remaining is 0, expected 1; change sent 1 times, expected 2/);
  });

  it('fails an unreachable state', async () => {
    const r = await check(TIMELOCK.replace('[S4] Spent: the timelock is over. Final.', '[S4] Spent: the timelock is over. Final.\n[S5] Lost: never entered.').replace('[R5] In Spent, every event is refused.', '[R5] In Spent and Lost, every event is refused.'));
    const [s5] = byName(r, 'S5');
    assert.equal(s5.status, 'failed');
    assert.equal(s5.message, 'no explored path reaches Lost');
    assert.equal(byName(r, 'S4')[0].status, 'passed');
  });

  it('fails an Always that is false, with the snapshot and the path to it', async () => {
    const r = await check(TIMELOCK.replace('[A1] Always, remaining is at most 2.', '[A1] Always, remaining is below 2.'));
    const [a1] = byName(r, 'A1');
    assert.equal(a1.status, 'failed');
    assert.equal(a1.name, 'A1: always remaining < 2');
    assert.match(a1.message, /^fails at Waiting \{"remaining":2\} after schedule delay 2$/);
    assert.equal(byName(r, 'A2')[0].status, 'passed');
    const whileIdle = await check(TIMELOCK.replace('[A2] Always, while Idle, remaining is 0.', '[A2] Always, while Waiting, remaining is 2.'));
    assert.match(byName(whileIdle, 'A2')[0].message, /fails at Waiting \{"remaining":1\} after schedule delay 1/);
  });

  it('skips an Always that cites a Given, which rests on an assumption the chart does not hold', async () => {
    const r = await check(TIMELOCK
      .replace('[A2] Always, while Idle, remaining is 0.', '[A2] Always, while Idle, remaining is 0.\n[A3] Always, remaining is below 2, given G1.')
      .replace('## Walks', '## Given\n[G1] Given that the executor runs a ready plan. If this is false, plans wait forever. Actor: the public, on execute, prompt.\n\n## Walks'));
    assert.equal(r.outcome, 'pass', failed(r).map(c => c.name).join('; '));
    assert.deepEqual(byName(r, 'A3'), [], 'no check is named for it, so nothing covers it');
    assert.equal(byName(r, 'A1')[0].status, 'passed');
  });

  it('reports a gap where no move or refusal applies under a condition', async () => {
    const r = await check(TIMELOCK
      .replace('[M5] When Waiting receives cancel, it becomes Idle, remaining becomes 0, sends notify.', '[M5] When Waiting receives cancel and remaining is above 1, it becomes Idle, remaining becomes 0, sends notify.')
      .replace('from Waiting with remaining 1, cancel', 'from Waiting with remaining 2, cancel'));
    assert.equal(r.outcome, 'pass', failed(r).map(c => c.name).join('; '));
    assert.deepEqual(r.gaps, [{ pair: 'Waiting × cancel', message: 'nothing says what cancel does at Waiting {"remaining":1}' }]);
    assert.match(summarize({ part: 'timelock', ok: true, files: [], ...r }), /\n  unsaid under condition: nothing says what cancel does at Waiting/);
  });

  it('fails determinism when two guards overlap', async () => {
    const r = await check(TIMELOCK.replace('receives tick and remaining is above 1, it stays Waiting', 'receives tick and remaining is above 0, it stays Waiting'));
    const [det] = byName(r, 'at most one move or refusal');
    assert.equal(det.status, 'failed');
    assert.match(det.message, /M2 and M3 both apply at Waiting \{"remaining":1\} for tick/);
    assert.equal(r.outcome, 'fail');
  });

  it('fails determinism when a move and an unconditional refusal both apply', async () => {
    const r = await check(TIMELOCK.replace('[R4] In Ready, tick is refused.', '[R4] In Ready, tick and execute are refused.'));
    const [det] = byName(r, 'at most one move or refusal');
    assert.match(det.message, /M4 and R4 both apply at Ready/);
    const [r4] = byName(r, 'R4');
    assert.equal(r4.status, 'failed');
    assert.match(r4.message, /M4 accepts execute in Ready/);
  });

  it('fails an event no move accepts', async () => {
    const r = await check(TIMELOCK.replace('[M6] When Idle receives retire, it becomes Spent.', '[R6] In Idle, retire is refused.').replace('[R5] In Spent, every event is refused.', '[R5] In Spent, every event is refused.\n[M6] When Waiting receives cancel and remaining is 9, it becomes Spent.'));
    const [e5] = byName(r, 'E5');
    assert.equal(e5.status, 'failed');
    assert.equal(e5.message, 'no Move accepts retire');
    const [m6] = byName(r, 'M6');
    assert.equal(m6.status, 'failed');
    assert.match(m6.message, /no explored snapshot in Waiting satisfies its condition \(remaining = 9\)/);
  });

  it('requires a refusal everywhere and a walk that is refused for an Event marked Refusal only', async () => {
    const prose = `# CollectionGate
Tier: charted
Module: gate

It holds available, a count from 0 to 1.

## States
[S1] Live: the token exists.

## Events
[E1] repay, from the public: sets up a collectable value.
[E2] collect-foreign, from the public: a collection by someone who does not own the token. Carries amount, a count from 0 to 1. Refusal only.

## Moves
[M1] When Live receives repay, it stays Live, with available 1.
[R1] In Live, collect-foreign is refused.

## Walks
[W1] Walk Denied: from Live, repay, collect-foreign amount 1 refused; ends Live with available 1.
`;
    const passing = await check(prose);
    assert.equal(passing.outcome, 'pass', failed(passing).map(c => `${c.name}: ${c.message}`).join('; '));
    assert.equal(byName(passing, 'E2')[0].name, 'E2: collect-foreign is handled by refusal');
    for (const [input, why] of [
      [prose.replace(' Refusal only.', ''), /no Move accepts/],
      [prose.replace('is refused.', 'is refused when available is 1.'), /every explored state/],
      [prose.replace('collect-foreign amount 1 refused', 'repay'), /passing Walk/],
      [prose.replace('ends Live with available 1.', 'ends Live with available 0.'), /passing Walk/],
      [prose.replace('[R1] In Live, collect-foreign is refused.', '[R1] In Live, collect-foreign is refused.\n[M2] When Live receives collect-foreign, it stays Live.'), /Move accepts/],
    ] as const) {
      const result = byName(await check(input), 'E2')[0];
      assert.equal(result.status, 'failed', String(why));
      assert.match(result.message, why);
    }
  });
});

describe('compound and parallel states', () => {
  it('builds a compound state whose children are reachable', async () => {
    const ir = irOf(COMPOUND);
    assert.deepEqual(ir.errors, []);
    const r = await checkIR({ root, ir });
    assert.equal(r.error, undefined, r.error);
    assert.deepEqual(failed(r).map(c => c.name), []);
    assert.ok(r.covers!.includes('S3') && r.covers!.includes('S4'));
  });

  it('builds a parallel state whose regions are reachable', async () => {
    const ir = irOf(PARALLEL);
    assert.deepEqual(ir.errors, []);
    const machine = buildMachine(ir, rt.xstate!);
    const explored = explore(machine, ir, rt.graph!);
    const running = explored.states.find(s => typeof s.value === 'object');
    assert.ok(running, 'the machine enters Running');
    assert.ok(inState(running, 'Running'), `leaves of ${JSON.stringify(running.value)} are ${JSON.stringify(leavesOf(running.value))}`);
    assert.ok(inState(running, 'Running.Clock') && inState(running, 'Running.Beam'));
    const r = runChecks({ ir, machine, xstate: rt.xstate!, explored });
    assert.deepEqual(failed(r).map(c => c.name), []);
  });
});

describe('the machine', () => {
  it('counts effects in context.sent and saturates at SENT_CAP', () => {
    const ir = irOf(TIMELOCK);
    const machine = buildMachine(ir, rt.xstate!);
    const initial = machine.getInitialSnapshot!({});
    assert.deepEqual(initial.context, { remaining: 0, sent: { change: 0, notify: 0 } });
    assert.equal(initial.value, 'Idle');
    const next = (s: Snapshot, e: ChartEvent) => rt.xstate!.getNextSnapshot(machine, s, e);
    const ready = next(next(initial, { type: 'schedule', delay: 1 }), { type: 'tick' });
    assert.equal(ready.value, 'Ready');
    assert.equal(ready.context.remaining, 0);
    const after = next(ready, { type: 'execute' });
    assert.equal(after.value, 'Idle');
    assert.deepEqual(after.context.sent, { change: 1, notify: 0 });
    assert.equal(ready.can({ type: 'tick' }), false);
    assert.equal(ready.can({ type: 'execute' }), true);
    const explored = explore(machine, ir, rt.graph!);
    assert.equal(SENT_CAP, 8);
    assert.equal(Math.max(...explored.states.map(s => s.context.sent.change)), SENT_CAP);
    assert.equal(Math.max(...explored.states.map(s => s.context.sent.notify)), SENT_CAP);
    assert.ok(explored.states.every(s => (s.context.remaining as number) >= 0 && (s.context.remaining as number) <= 2));
  });

  it('treats a final state as done: nothing can be taken there', () => {
    const ir = irOf(TIMELOCK);
    const machine = buildMachine(ir, rt.xstate!);
    const spent = rt.xstate!.getNextSnapshot(machine, machine.getInitialSnapshot!({}), { type: 'retire' });
    assert.equal(spent.value, 'Spent');
    assert.equal(spent.status, 'done');
    for (const c of ir.eventCases) assert.equal(spent.can(c), false, c.type!);
  });

  it('reads the leaves of a state value', () => {
    assert.deepEqual(leavesOf('Idle'), ['Idle']);
    assert.deepEqual(leavesOf({ Scheduled: 'Waiting' }), ['Scheduled.Waiting']);
    assert.deepEqual(leavesOf({ Running: { Clock: 'Tick', Beam: 'Off' } }), ['Running.Clock.Tick', 'Running.Beam.Off']);
    assert.equal(inState({ value: { Scheduled: 'Waiting' } }, 'Scheduled'), true);
    assert.equal(inState({ value: { Scheduled: 'Waiting' } }, 'Scheduled.Ready'), false);
  });
});

describe('explore', () => {
  it('returns limitHit and an error when the limit is tiny, without throwing, having counted one state past it', () => {
    const ir = irOf(TIMELOCK);
    const machine = buildMachine(ir, rt.xstate!);
    const r = explore(machine, ir, rt.graph!, { limit: 3 });
    assert.equal(r.limitHit, true);
    assert.equal(r.count, 4);
    assert.equal(r.limit, 3);
    assert.match(r.error!, /exploration exceeded 3 states/);
    assert.deepEqual(r.states, []);
  });

  it('fails the run when the exploration passes its limit, says so with the remedy, and runs no check', async () => {
    const exceeded = 'exploration exceeded 3 states: narrow the declared ranges or raise --limit';
    const r = await checkIR({ root, ir: irOf(TIMELOCK), limit: 3 });
    assert.deepEqual({ ...r, versions: undefined }, { outcome: 'fail', checks: [], passed: 0, failed: 0, covers: [], gaps: [], refusalIds: [], explored: 4, limitHit: true, exceeded, versions: undefined });
    assert.equal(r.error, undefined, 'the run happened; it failed');
    part('timelock', TIMELOCK);
    const drawn = await draw({ root, part: 'timelock', limit: 3, write: false });
    assert.equal(drawn.ok, true);
    assert.equal(drawn.outcome, 'fail');
    assert.equal(summarize(drawn), `draw: timelock · fail · ${exceeded}`);
    const full = await draw({ root, part: 'timelock', write: false });
    assert.equal(full.limitHit, undefined, 'an exploration the limit does not cut short saw every state');
    assert.doesNotMatch(summarize(full), /limit|sampled/);
  });

  // 251 values of n, and 101 event cases: the traversal takes some 25000 steps over 251 states.
  const WIDE = '# Dial\nTier: charted\nModule: dial\n\nIt holds n, a count from 0 to 250.\n\n## States\n[S1] On: on.\n\n## Events\n[E1] up, from the user: up.\n[E2] post, from the user: a post. Carries v, a count from 0 to 99.\n\n## Moves\n[M1] When On receives up and n is below 250, it stays On, n grows by one.\n[M2] When On receives post and v is 0, it stays On.\n[R1] In On, up is refused when n is 250.\n[R2] In On, post is refused when v is above 0.\n\n## Words only\n[T1] The piece promises nothing eventual.\n';

  it('bounds the distinct states explored, not the traversal\'s steps', async () => {
    const ir = irOf(WIDE);
    assert.deepEqual(ir.errors, []);
    assert.equal(ir.eventCases.length, 101);
    const r = await checkIR({ root, ir });
    assert.equal(r.exceeded, undefined, r.exceeded);
    assert.equal(r.outcome, 'pass', failed(r).map(c => c.name).join('; '));
    assert.equal(r.explored, 251);
    assert.equal((await checkIR({ root, ir, limit: 251 })).outcome, 'pass', 'a limit of exactly the states reached passes');
    const over = await checkIR({ root, ir, limit: 250 });
    assert.equal(over.exceeded, 'exploration exceeded 250 states: narrow the declared ranges or raise --limit');
    assert.equal(over.explored, 251);
  });

  it('finds a shortest path over the explored snapshots without exploring again', () => {
    const ir = irOf(TIMELOCK);
    const machine = buildMachine(ir, rt.xstate!);
    const explored = explore(machine, ir, rt.graph!);
    const initial = machine.getInitialSnapshot!({});
    const p = pathTo(explored, initial, s => s.value === 'Ready');
    assert.equal(describePath(p!), 'schedule delay 1, tick');
    assert.deepEqual(pathTo(explored, initial, s => s.value === 'Idle')!.steps, [], 'the initial snapshot is its own path');
    assert.equal(pathTo(explored, initial, () => false), null);
  });

  it('describes a path by its events and arguments', () => {
    assert.equal(describePath({ steps: [{ event: { type: 'xstate.init' } }, { event: { type: 'schedule', delay: 2 } }, { event: { type: 'tick' } }] } as ChartPath), 'schedule delay 2, tick');
  });

  it('tests a datum against its declared range by its bounds', () => {
    const strays = strayed(irOf(WIDE.replace('It holds n, a count from 0 to 250.', 'It holds n, a count from 0 to 250. It holds f, a flag. It holds lane, one of A or B.')));
    assert.deepEqual(strays({ n: 250, f: true, lane: 'B' }), []);
    assert.deepEqual(strays({ n: 251, f: 1, lane: 'C' }), ['n', 'f', 'lane']);
    assert.deepEqual(strays({ n: -1, f: false, lane: 'A' }), ['n']);
    assert.deepEqual(strays({ n: 1.5, f: false, lane: 'A' }), ['n']);
  });
});

describe('an expression the chart cannot evaluate', () => {
  // d is 0 until the user sets it, so n div d cannot be evaluated where the walk begins.
  const DIV = (move: string, extra = '') => `# Ratio\nTier: charted\nModule: ratio\n\nIt holds n, a count from 0 to 2. It holds d, a count from 0 to 1. It holds limit, a count from 0 to 1.\n\n## States\n[S1] On: on.\n\n## Events\n[E1] go, from the user: go.\n[E2] set, from the user: set.\n\n## Moves\n${move}\n[M2] When On receives set, it stays On, d becomes 1.\n${extra}\n## Words only\n[T1] The piece promises nothing eventual.\n`;

  it('fails the run on a condition that cannot be evaluated, naming the passage, the snapshot and the event, with no stack', async () => {
    const r = await check(DIV('[M1] When On receives go and {limit + n div d = 1}, it stays On, n becomes 1.\n[R1] In On, go is refused when {limit + n div d != 1}.'));
    const message = 'M1: the condition {limit + n div d = 1} cannot be evaluated at On {"n":0,"d":0,"limit":0} for go: division by zero';
    assert.equal(r.exceeded, undefined, 'a message that says limit is not the limit');
    assert.equal(r.unevaluable, message);
    assert.equal(r.outcome, 'fail');
    assert.deepEqual(r.checks, [{ ids: ['M1'], name: 'M1: can be evaluated', status: 'failed', message }]);
    assert.deepEqual(r.covers, []);
    assert.equal(summarize({ part: 'ratio', ok: true, files: [], ...r }), `draw: ratio · fail · ${message}`);
  });

  it('fails the run on a change that cannot be evaluated', async () => {
    const r = await check(DIV('[M1] When On receives go, it stays On, {n := n div d}.'));
    assert.equal(r.unevaluable, 'M1: the change {n := n div d} cannot be evaluated at On {"n":0,"d":0,"limit":0} for go: division by zero');
  });

  it('fails the run on an Always or a refusal the checks cannot evaluate', async () => {
    const always = await check(DIV('[M1] When On receives go, it stays On, n becomes 1.', '\n## Always\n[A1] Always, {n div d <= 2}.\n'));
    assert.equal(always.unevaluable, 'A1: the condition {n div d <= 2} cannot be evaluated at On {"n":0,"d":0,"limit":0}: division by zero');
    assert.deepEqual(always.checks!.map(c => c.ids), [['A1']]);
    const refusal = await check(DIV('[M1] When On receives go and d is 1, it stays On, n becomes 1.\n[R1] In On, go is refused when {n div d = 0}.'));
    assert.equal(refusal.unevaluable, 'R1: the condition {n div d = 0} cannot be evaluated at On {"n":0,"d":0,"limit":0} for go: division by zero');
  });
});

describe('the draw command', () => {
  const bin = join(pluginRoot, 'bin', 'dossier');
  const run = (...args: string[]) => { const r = spawnSync(bin, [args[0], '--root', root, ...args.slice(1)], { encoding: 'utf8' }); return { status: r.status, stdout: r.stdout, stderr: r.stderr }; };

  it('refuses a --limit that is not a whole number of states, before anything runs', () => {
    part('limited', TIMELOCK);
    for (const [args, said] of [[['abc'], ', not "abc"'], [['0'], ', not "0"'], [['-5'], ', not "-5"'], [['2.5'], ', not "2.5"'], [[], '']] as [string[], string][]) {
      const r = run('draw', 'limited', '--limit', ...args);
      assert.equal(r.status, 2, args.join(' '));
      assert.equal(r.stderr, `dossier draw: --limit takes a whole number of states, at least 1${said}\n`);
      assert.equal(r.stdout, '');
    }
    assert.equal(existsSync(join(root, 'parts', 'limited', 'chart')), false, 'nothing was drawn');
  });

  it('refuses a retired part, and says which begin reopens it', () => {
    const dir = part('gone', TIMELOCK);
    writeFileSync(join(dir, 'decisions.log'), '2026-11-01T00:00:00Z begin modeled "x" 00000000\n');
    const begun = readFileSync(join(dir, 'decisions.log'), 'utf8').trim();
    const log = `${begun}\n2026-11-02T00:00:00Z retire "done" ${createHash('sha256').update(begun).digest('hex').slice(0, 8)}\n`;
    writeFileSync(join(dir, 'decisions.log'), log);
    writeFileSync(join(dir, 'integrity.json'), JSON.stringify({ schema: 1, evidence: {}, decisionHead: prefixHead(log) }) + '\n');
    const r = run('draw', 'gone');
    assert.equal(r.status, 2);
    assert.equal(r.stderr, 'dossier draw: parts/gone is retired; dossier decide parts/gone begin reopens it\n');
    assert.equal(existsSync(join(dir, 'chart')), false);
  });

  it('says one state, and more than one states', async () => {
    const one = await check('# One\nTier: charted\nModule: one\n\n## States\n[S1] Only: it.\n\n## Events\n[E1] go, from the user: x.\n\n## Moves\n[M1] When Only receives go, it stays Only.\n\n## Words only\n[T1] The piece promises nothing eventual.\n');
    assert.equal(one.explored, 1);
    assert.match(summarize({ part: 'one', ok: true, files: [], ...one }), /^draw: one · pass · \d+ of \d+ checks · 1 state explored$/);
  });
});


describe('checkIR with a mutated machine', () => {
  it('makes the prose\'s checks fail when a guard is removed from the machine', async () => {
    const ir = irOf(TIMELOCK);
    const mutated = JSON.parse(JSON.stringify(ir)) as Ir;
    // M3 loses its guard and is tried first: tick leaves Waiting at once.
    const m3 = mutated.transitions.find(t => t.id === 'M3')!;
    m3.guard = null;
    mutated.transitions = [m3, ...mutated.transitions.filter(t => t !== m3)];
    const r = await checkIR({ root, ir, machineIR: mutated });
    assert.equal(r.outcome, 'fail');
    const names = failed(r).map(c => c.ids.join(' '));
    assert.ok(names.includes('M2'), names.join('; '));
    assert.ok(names.includes('W1'), names.join('; '));
    assert.match(byName(r, 'M2')[0].message, /ends in Ready, not Waiting; remaining is 0, expected 1/);
    assert.match(byName(r, 'W1')[0].message, /step 4 tick is refused at Ready/);
    assert.equal(byName(r, 'at most one move')[0].status, 'passed', 'determinism is judged on the prose, not the mutated machine');
  });

  it('stops exploring at a snapshot outside a declared range and fails the range check there', async () => {
    const ir = irOf(TIMELOCK);
    const mutated = JSON.parse(JSON.stringify(ir)) as Ir;
    mutated.transitions.find(t => t.id === 'M2')!.guard = null;   // a tick in Waiting always drops remaining, past 0
    const r = await checkIR({ root, ir, machineIR: mutated });
    assert.equal(r.outcome, 'fail');
    assert.equal(r.limitHit, undefined, 'the stray snapshot is not expanded');
    const range = byName(r, 'TypeOK')[0];
    assert.equal(range.status, 'failed');
    assert.match(range.message, /^remaining out of range at Waiting \{"remaining":-1[^}]*\} after schedule delay 1, tick, tick$/);
    assert.ok(!failed(r).some(c => c.ids.includes('A1')), 'no Always says remaining stays at or above 0; the range check is what catches it');
    assert.ok(!r.covers!.includes('TypeOK'), 'covers name passages only');
  });

  it('keeps passing when the mutation does not change behavior', async () => {
    const ir = irOf(TIMELOCK);
    const mutated = JSON.parse(JSON.stringify(ir)) as Ir;
    mutated.transitions.find(t => t.id === 'M3')!.guard = null;
    const r = await checkIR({ root, ir, machineIR: mutated });
    assert.equal(r.outcome, 'pass');
  });
});

describe('the grid', () => {
  const ir = irOf(TIMELOCK);

  it('grids states by events, naming the covering passages or unsaid', () => {
    const grid = gridMarkdown(ir);
    const lines = grid.split('\n');
    assert.equal(lines[0], '| state \\ event | schedule | tick | execute | cancel | retire |');
    assert.equal(lines[1], '| --- | --- | --- | --- | --- | --- |');
    assert.equal(lines[2], '| Idle | M1 | R1 | R1 | R1 | M6 |');
    assert.equal(lines[3], '| Waiting | R2 | M2 M3 | R3 | M5 | R2 |');
    assert.equal(lines[5], '| Spent | R5 | R5 | R5 | R5 | R5 |');
    assert.doesNotMatch(grid, /unsaid/);
    const gappy = gridMarkdown(irOf(TIMELOCK.replace('[R4] In Ready, tick is refused.\n', '')));
    assert.ok(gappy.includes('| Ready | R2 | unsaid | M4 | M7 | R2 |'));
    assert.ok(gappy.endsWith('\nUnsaid: Ready × tick\n'));
  });
});
