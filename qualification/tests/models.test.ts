// The models: the TLA+ scaffold and the readers of hand-edited modules
// (tla.ts), the Alloy reader (alloy.ts), actors and scenarios, wirings,
// the composed composition module (compose.ts) and the loaders (load.ts).
// Run: node --test qualification/tests/models.test.ts
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { prefixHead } from '../../src/dossiers/integrity.ts';
import { parseProse, parseCompositionProse } from '../../src/prose/prose.ts';
import { compileIR } from '../../src/prose/ir.ts';
import { actorName, domainTla, parseCfg, parseTla, reachValues, scaffoldCfgs, scaffoldTla, statePredicate, targetsOf, typeOf } from '../../src/models/tla.ts';
import { parseAls } from '../../src/models/alloy.ts';
import { composeMembers } from '../../src/models/compose.ts';
import { ACTOR_KINDS, MODES, actorId, findActor, modeOf, readActors, windowOf } from '../../src/dossiers/actors.ts';
import { readWiring } from '../../src/dossiers/wiring.ts';
import { externalsOf, knowledgeOf, loadAllParts, loadPart, loadComposition, compositionModuleText } from '../../src/dossiers/load.ts';
import type { CompositionProse } from '../../src/prose/prose.ts';
import type { Composed } from '../../src/models/compose.ts';
import type { ActorsModel } from '../../src/dossiers/actors.ts';
import type { Wiring } from '../../src/dossiers/wiring.ts';
import type { CompositionLoad } from '../../src/dossiers/load.ts';

const TIMELOCK = `# Timelock
Tier: modeled
Module: gov-timelock

The Timelock holds a plan and executes it after a delay. It holds remaining, a count from 0 to 2. It holds early, a flag. It sends change to the Vault, and notify to Governance.

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
[A3] Always, in structure, every plan names one governance.

## Once
[O1] Once Waiting, eventually Idle, given G1 and G2.

## Within
[N1] Within two ticks of Ready, Idle, given G1.

## Given
[G1] Given that the executor runs a ready plan. If this is false, plans wait forever. Actor: the public, on execute, prompt.
[G2] Given that the chain keeps ticking. If this is false, nothing moves. Actor: the chain.
[G3] Given that Governance is honest. If this is false, plans may be cancelled.

## Walks
[W1] Walk Plan: from Idle, schedule delay 2, execute refused, tick, tick, execute; ends Idle with remaining 0; change sent once; notify not sent.
[W2] Walk Cancel: from Waiting with remaining 1, cancel; ends Idle; notify sent 1 times.

## Words only
[T1] The piece promises nothing eventual.
`;

const ADAPTER = `# Adapter
Tier: modeled
Module: adapter

The Adapter takes credit out of the vault and mints HRD for it. It holds held, a count from 0 to 2. It sends mint to the Token, carrying amount.

## States
[S1] Open: credit may move.
[S2] Halted: nothing moves. Final.

## Events
[E1] exit, from the user: credit leaves the vault. Carries amount, a count from 1 to 2.
[E2] halt, from the Breaker: the adapter is halted.
[E3] tick, from the chain: a block passes.

## Moves
[M1] When Open receives exit and {held + amount <= 2}, it stays Open, held grows by amount, sends mint.
[M2] When Open receives halt, it becomes Halted.
[M3] When Open receives tick and held is above 0, it stays Open, held drops by one.
[R1] In Open, exit is refused when {held + amount > 2}.
[R2] In Open, tick is refused when held is 0.
[R3] In Halted, every event is refused.

## Always
[A1] Always, held is at most 2.

## Given
[G1] Given that the user exits promptly. If this is false, held lingers. Actor: the user, on exit, prompt.

## Walks
[W1] Walk Exit: from Open, exit amount 1, halt, exit amount 1 refused; ends Halted with held 1; mint sent once.

## Words only
[T1] The piece promises nothing eventual.
`;

const TOKEN = `# Token
Tier: modeled
Module: token

The Token keeps the HRD supply. It holds supply, a count from 0 to 4.

## States
[S1] Live: the token answers.

## Events
[E1] mint, from the Adapter: supply grows. Carries amount, a count from 1 to 2.
[E2] burn, from the Adapter: supply shrinks. Carries amount, a count from 1 to 2.

## Moves
[M1] When Live receives mint and {supply + amount <= 4}, it stays Live, supply grows by amount.
[M2] When Live receives burn and supply is at least amount, it stays Live, supply drops by amount.
[R1] In Live, mint is refused when {supply + amount > 4}.
[R2] In Live, burn is refused when supply is below amount.

## Always
[A1] Always, supply is at most 4.

## Words only
[T1] The piece promises nothing eventual.
`;

const ACTORS = `# Actors
\`\`\`yaml
actors:
  - id: governance
    name: Governance
    kind: governance
    modes: [honest, malicious, offline]
  - id: user
    name: the user
    kind: user
  - id: breaker
    name: the Breaker
    kind: multisig
  - id: chain
    name: the chain
    kind: chain
    modes: [honest, offline]
\`\`\`
`;

const SCENARIOS = `# Scenarios
\`\`\`yaml
scenarios:
  - id: user-malicious
    modes: { user: malicious }
    stronger_than: [all-honest]
  - id: breaker-offline
    modes: { breaker: offline }
  - id: user-away
    modes:
      user: { mode: offline, from: 1, until: 3 }
      chain: { mode: offline, from: 2 }
    notes: the user is away for two blocks, and the chain stops after two
  - id: halted-full
    start: { adapter.state: Halted, adapter.held: 2, token.supply: 2 }
\`\`\`
`;
// A start the base adapter cannot hold: every declared scenario's start is read against the members,
// so it joins SCENARIOS only where adapter holds paused and level.
const PAUSED = '  - id: paused\n    start: { adapter.paused: true, adapter.level: High }\n';

const COMPOSITION = `# Wiring
\`\`\`yaml
members:
  - part: adapter
    role: member
    pins: [adapter#contract:adapter]
  - part: token
    role: member
wiring:
  - effect: adapter.mint
    event: token.mint
closure:
  - asset: hrd
    edges: [mints_asset]
scenarios: [all-honest, breaker-offline]
\`\`\`
`;

const SUPPLY = `# Supply
Concern: supply

The HRD supply equals the credit the adapter holds.

## Always
[A1] Always, {token.supply = adapter.held}. Scenarios: all-honest, user-malicious.
[A2] Always, {adapter.Open or adapter.Halted}.

## Once
[O1] Once adapter.Open, eventually adapter.Halted, given G1. Scenarios: all-honest.

## Within
[N1] Within 2 ticks of adapter.Open, {adapter.held = 0}, given G2.

## Given
[G1] Given that the Breaker halts eventually. If this is false, the adapter stays open. Actor: the Breaker.
[G2] Given that the user exits promptly. If this is false, held lingers. Actor: the user, on adapter.exit, prompt.

## Walks
[W1] Walk Exit under all-honest: from adapter.Open, adapter.exit amount 1, adapter.halt, adapter.exit amount 1 refused; ends adapter.Halted.

## Words only
[T1] Nothing more.
`;

const irOf = (text: string) => compileIR(parseProse(text));
const lines = (text: string) => text.split('\n');
const indexOf = (text: string, needle: string) => { const i = text.indexOf(needle); assert.ok(i >= 0, `missing: ${needle}`); return i; };
const block = (text: string, name: string) => { const start = indexOf(text, `\n${name} ==`); const rest = text.slice(start + 1); return rest.slice(0, rest.indexOf('\n\n')); };

let root: string;
before(() => { root = mkdtempSync(join(tmpdir(), 'dossier-models-')); });
after(() => rmSync(root, { recursive: true, force: true }));
const write = (rel: string, text: string) => { const p = join(root, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, text); return p; };
// ACTORS with SCENARIOS and more scenarios after them, read from a root of their own.
const actorsWith = (dir: string, more: string) => { write(`${dir}/actors/actors.md`, ACTORS); write(`${dir}/actors/scenarios.md`, SCENARIOS.replace(/```\n$/, `${more}\`\`\`\n`)); return readActors(join(root, dir)); };

// ---------------------------------------------------------------- tla.ts

describe('scaffoldTla', () => {
  const ir = irOf(TIMELOCK);
  const tla = scaffoldTla(ir);

  it('names the module and types every variable', () => {
    assert.ok(tla.startsWith('---------------------------- MODULE Timelock ----------------------------\n'));
    assert.ok(tla.includes('\nVARIABLES\n  \\* @type: Str;\n  state,\n  \\* @type: Int;\n  remaining,\n  \\* @type: Bool;\n  early,\n  \\* @type: Int;\n  sent_change,\n  \\* @type: Int;\n  sent_notify,\n  \\* @type: Int;\n  n1_ticks,\n  \\* @type: Int;\n  w1_at,\n  \\* @type: Int;\n  w1_armed_sent_change,\n  \\* @type: Int;\n  w1_armed_sent_notify,\n  \\* @type: Int;\n  w2_at,\n  \\* @type: Int;\n  w2_armed_sent_notify\nvars == <<state, remaining, early, sent_change, sent_notify, n1_ticks, w1_at, w1_armed_sent_change, w1_armed_sent_notify, w2_at, w2_armed_sent_notify>>\n'));
    assert.ok(tla.includes('\nCONSTANTS\n  \\* @type: Int;\n  MaxSent'));
    assert.ok(tla.includes('\nConstInit == MaxSent = 4\n'));
    assert.ok(tla.includes('\nStates == {"Idle", "Waiting", "Ready", "Spent"}   \\* S1 S2 S3 S4\n'));
    assert.ok(tla.endsWith('\n' + '='.repeat(70) + '\n'));
    assert.ok(scaffoldTla(ir, { moduleName: 'PauseX' }).includes(' MODULE PauseX '));
  });

  it('writes Init from the initial state, the data and the counters', () => {
    assert.ok(tla.includes('\nInit ==                                           \\* S1\n  /\\ state = "Idle"\n  /\\ remaining = 0\n  /\\ early = FALSE\n  /\\ sent_change = 0\n  /\\ sent_notify = 0\n  /\\ n1_ticks = 0\n  /\\ w1_at = 0\n  /\\ w1_armed_sent_change = 0\n  /\\ w1_armed_sent_notify = 0\n  /\\ w2_at = 0\n  /\\ w2_armed_sent_notify = 0\n\n'));
  });

  it('writes one action per Move with \\E over the fields, the condition, the changes, the effects and UNCHANGED before the ghost', () => {
    const m1 = block(tla, 'M1_Schedule');
    assert.equal(m1, [
      'M1_Schedule ==                                 \\* M1 on schedule',
      '  \\E delay \\in 1..2 :',
      '    /\\ state = "Idle"',
      '    /\\ state\' = "Waiting"',
      '    /\\ remaining\' = delay',
      '    /\\ UNCHANGED <<early, sent_change, sent_notify>>',
      '    /\\ n1_ticks\' = IF state\' = "Idle" THEN 0 ELSE IF ~(state\' = "Ready") THEN 0 ELSE n1_ticks',
      '    /\\ w1_at\' = IF state = "Idle" /\\ delay = 2 THEN 1 ELSE 0',
      '    /\\ w1_armed_sent_change\' = IF w1_at\' = 1 THEN sent_change ELSE IF w1_at\' = 0 THEN 0 ELSE w1_armed_sent_change',
      '    /\\ w1_armed_sent_notify\' = IF w1_at\' = 1 THEN sent_notify ELSE IF w1_at\' = 0 THEN 0 ELSE w1_armed_sent_notify',
      '    /\\ w2_at\' = 0',
      '    /\\ w2_armed_sent_notify\' = 0',
    ].join('\n'));
    const m4 = block(tla, 'M4_Execute');
    assert.ok(m4.includes('\n  /\\ state = "Ready"\n  /\\ state\' = "Idle"\n  /\\ sent_change\' = sent_change + 1\n  /\\ UNCHANGED <<remaining, early, sent_notify>>\n'));
    const m2 = block(tla, 'M2_Tick');
    assert.ok(m2.includes('\n  /\\ (remaining > 1)\n'));
    assert.ok(m2.includes('\n  /\\ state\' = state\n  /\\ remaining\' = (remaining - 1)\n'));
    for (const name of ['M1_Schedule', 'M2_Tick', 'M3_Tick', 'M4_Execute', 'M5_Cancel', 'M6_Retire', 'M7_Cancel']) assert.ok(tla.includes(`\n${name} ==`), name);
  });

  it('puts the Can_ predicates before Due_ and the actions, and ~Due_ into the tick actions of a prompt Given', () => {
    assert.ok(tla.includes('\nCan_M1_Schedule == \\E delay \\in 1..2 : state = "Idle"\n'));
    assert.ok(tla.includes('\nCan_M2_Tick == state = "Waiting" /\\ (remaining > 1)\n'));
    assert.ok(tla.includes('\nDue_Public == Can_M4_Execute   \\* G1: acts before the next tick\n'));
    assert.ok(indexOf(tla, '\nCan_M1_Schedule ==') < indexOf(tla, '\nDue_Public =='));
    assert.ok(indexOf(tla, '\nDue_Public ==') < indexOf(tla, '\nM1_Schedule =='));
    assert.ok(block(tla, 'M2_Tick').includes('\n  /\\ ~Due_Public                      \\* G1\n'));
    assert.ok(block(tla, 'M3_Tick').includes('~Due_Public'));
    assert.ok(!block(tla, 'M1_Schedule').includes('Due_'));
    assert.ok(!block(tla, 'M4_Execute').includes('Due_'));
  });

  it('counts the Within ghost on ticks and saturates it', () => {
    assert.ok(block(tla, 'M2_Tick').includes('\n  /\\ n1_ticks\' = IF state\' = "Idle" THEN 0 ELSE IF ~(state\' = "Ready") THEN 0 ELSE (IF n1_ticks > 2 THEN n1_ticks ELSE n1_ticks + 1)\n'));
    assert.ok(block(tla, 'M5_Cancel').includes('\n  /\\ n1_ticks\' = IF state\' = "Idle" THEN 0 ELSE IF ~(state\' = "Ready") THEN 0 ELSE n1_ticks\n'), 'a non-tick action keeps the counter');
    const m5 = lines(block(tla, 'M5_Cancel'));
    assert.ok(m5.findIndex(l => l.includes('UNCHANGED')) < m5.findIndex(l => l.includes("n1_ticks'")));
  });

  it('observes each walk: its first step taken from its start arms the observer, the next step with its arguments advances it, anything else resets it', () => {
    assert.ok(block(tla, 'M1_Schedule').includes('\n    /\\ w1_at\' = IF state = "Idle" /\\ delay = 2 THEN 1 ELSE 0\n'), 'W1 arms on a schedule of delay 2 from Idle');
    assert.ok(block(tla, 'M3_Tick').includes('\n  /\\ w1_at\' = IF w1_at = 1 /\\ W1_Refused2 THEN 2 ELSE IF w1_at = 2 THEN 3 ELSE 0\n'), 'the refused execute is checked where W1 refuses it, before the first tick');
    assert.ok(tla.includes('\nDue_Public == Can_M4_Execute   \\* G1: acts before the next tick\nW1_Refused2 == ~(Can_M4_Execute)\n\n'), 'a refused step is a definition of its own, after the enabledness');
    assert.ok(block(tla, 'M4_Execute').includes('\n  /\\ w1_at\' = IF w1_at = 3 THEN 4 ELSE 0\n'));
    assert.ok(block(tla, 'M5_Cancel').includes('\n  /\\ w1_at\' = 0\n'));
    assert.ok(block(tla, 'M5_Cancel').includes('\n  /\\ w2_at\' = IF state = "Waiting" /\\ remaining = 1 THEN 1 ELSE 0\n'), 'W2 arms on a cancel from Waiting with remaining 1');
    assert.ok(block(tla, 'M7_Cancel').includes('\n  /\\ w2_at\' = IF state = "Waiting" /\\ remaining = 1 THEN 1 ELSE 0\n'), 'a cancel from Ready is not one from Waiting');
    assert.ok(block(tla, 'M6_Retire').includes('\n  /\\ w1_at\' = 0\n  /\\ w1_armed_sent_change\' = 0\n  /\\ w1_armed_sent_notify\' = 0\n  /\\ w2_at\' = 0\n  /\\ w2_armed_sent_notify\' = 0'));
    assert.ok(tla.includes('\n  /\\ w1_at \\in 0..4\n  /\\ w1_armed_sent_change \\in Nat\n  /\\ w1_armed_sent_notify \\in Nat\n  /\\ w2_at \\in 0..1\n'), 'a refused step is no step taken');
  });

  it('keeps the count of each effect a walk counts as its observer arms, so the walk\'s end counts the sends since it began, as the chart does', () => {
    assert.ok(block(tla, 'M4_Execute').includes('\n  /\\ w1_armed_sent_change\' = IF w1_at\' = 1 THEN sent_change ELSE IF w1_at\' = 0 THEN 0 ELSE w1_armed_sent_change\n'));
    assert.ok(indexOf(block(tla, 'M4_Execute'), 'w1_at\' =') < indexOf(block(tla, 'M4_Execute'), 'w1_armed_sent_change\' ='), 'the observer is updated before the count reads it');
    assert.ok(tla.includes('\nW1_End == w1_at = 4 /\\ state = "Idle" /\\ remaining = 0 /\\ sent_change - w1_armed_sent_change = 1 /\\ sent_notify - w1_armed_sent_notify = 0\n'));
    assert.ok(tla.includes('\nW2_End == w2_at = 1 /\\ state = "Idle" /\\ sent_notify - w2_armed_sent_notify = 1\n'));
    const none = scaffoldTla(irOf(TIMELOCK.replace('[W1] Walk Plan: from Idle, schedule delay 2, execute refused, tick, tick, execute; ends Idle with remaining 0; change sent once; notify not sent.', '[W1] Walk Plan: from Idle, schedule delay 2, execute refused, tick, tick, execute; ends Idle with remaining 0.')));
    assert.ok(!none.includes('w1_armed'), 'a walk that counts no effect keeps no count');
  });

  it('checks a refused step where the walk refuses it: in the middle, at the end, with its arguments, and in a walk of refused steps alone', () => {
    const walks = scaffoldTla(irOf(TIMELOCK.replace('[W2] Walk Cancel: from Waiting with remaining 1, cancel; ends Idle; notify sent 1 times.', '[W2] Walk Cancel: from Waiting with remaining 1, cancel, execute refused, tick refused; ends Idle; notify sent 1 times.\n[W3] Walk Shut: from Idle, execute refused, schedule delay 1 refused, tick refused; ends Idle; change not sent; notify sent once.')));
    assert.ok(walks.includes('\nW1_Refused2 == ~(Can_M4_Execute)\nW2_Refused2 == ~(Can_M4_Execute)\nW2_Refused3 == ~(Can_M2_Tick \\/ Can_M3_Tick)\nW3_Refused1 == ~(Can_M4_Execute)\nW3_Refused2 == ~((\\E delay \\in 1..2 : delay = 1 /\\ state = "Idle"))\nW3_Refused3 == ~(Can_M2_Tick \\/ Can_M3_Tick)\n'), 'each refused step is defined apart, schedule with its argument inside its own quantifier');
    assert.ok(walks.includes('\nW2_End == w2_at = 1 /\\ W2_Refused2 /\\ W2_Refused3 /\\ state = "Idle" /\\ sent_notify - w2_armed_sent_notify = 1\n'), 'the refused steps after the last step taken are checked at the end');
    assert.ok(walks.includes('\nW3_End == w3_at = 0 /\\ state = "Idle" /\\ W3_Refused1 /\\ W3_Refused2 /\\ W3_Refused3 /\\ state = "Idle" /\\ FALSE\n'), 'a walk of refused steps is read at its start, and it sends nothing');
    assert.ok(walks.includes('\n  /\\ w3_at \\in 0..0\n'));
    assert.ok(!walks.includes('w3_armed'), 'a walk that takes no step keeps no count');
  });

  it('groups actions by actor and writes fairness only for Givens with an actor, scoped to the event of a Given with on', () => {
    assert.ok(tla.includes('\nGovernance == M1_Schedule \\/ M5_Cancel \\/ M6_Retire \\/ M7_Cancel\nChain == M2_Tick \\/ M3_Tick\nPublic == M4_Execute\nPublic_Execute == M4_Execute\nNext == Governance \\/ Chain \\/ Public\n'));
    assert.ok(tla.includes('\nSpec == Init /\\ [][Next]_vars\n        /\\ WF_vars(Public_Execute)                        \\* from G1\n        /\\ WF_vars(Chain)                        \\* from G2\n'));
    assert.equal((tla.match(/WF_vars/g) || []).length, 2, 'G3 names no actor');
  });

  it('writes TypeOK, SentBounded and the properties', () => {
    assert.ok(tla.includes('\nTypeOK ==\n  /\\ state \\in States\n  /\\ remaining \\in 0..2\n  /\\ early \\in BOOLEAN\n  /\\ sent_change \\in Nat\n  /\\ sent_notify \\in Nat\n  /\\ n1_ticks \\in Nat\n  /\\ w1_at \\in 0..4\n  /\\ w1_armed_sent_change \\in Nat\n  /\\ w1_armed_sent_notify \\in Nat\n  /\\ w2_at \\in 0..1\n  /\\ w2_armed_sent_notify \\in Nat\nSentBounded == sent_change <= MaxSent /\\ sent_notify <= MaxSent\n'));
    assert.ok(tla.includes('\nA1 == (remaining <= 2)\n'));
    assert.ok(tla.includes('\nA2 == (state = "Idle") => (remaining = 0)\n'));
    assert.ok(!tla.includes('A3'), 'a structural Always is not encoded');
    assert.ok(tla.includes('\nO1 == (state = "Waiting") ~> (state = "Idle")      \\* given G1 G2\n'));
    assert.ok(tla.includes('\nN1 == n1_ticks <= 2      \\* given G1\n'));
    assert.ok(tla.includes('\nInv_A1 == TypeOK /\\ A1\nInv_A2 == TypeOK /\\ A2\nInv_N1 == TypeOK /\\ N1\n'));
    assert.ok(tla.includes('\nW1_End == w1_at = 4 /\\ state = "Idle" /\\ remaining = 0 /\\ sent_change - w1_armed_sent_change = 1 /\\ sent_notify - w1_armed_sent_notify = 0\nNotW1 == ~W1_End\nW2_End == w2_at = 1 /\\ state = "Idle" /\\ sent_notify - w2_armed_sent_notify = 1\nNotW2 == ~W2_End\n'));
  });

  it('knows the TLA+ type and domain of each datum and the state predicates', () => {
    assert.equal(typeOf({ type: 'flag' }), 'Bool');
    assert.equal(typeOf({ type: 'enum' }), 'Str');
    assert.equal(typeOf({ type: 'amount' }), 'Int');
    assert.equal(domainTla({ type: 'flag' }), 'BOOLEAN');
    assert.equal(domainTla({ type: 'enum', values: ['A', 'B'] }), '{"A", "B"}');
    assert.equal(domainTla({ type: 'count', min: 1, max: 3 }), '1..3');
    assert.equal(statePredicate(ir, 'Idle'), 'state = "Idle"');
    assert.equal(actorName('the public'), 'Public');
    assert.equal(actorName('the keeper lane-a'), 'KeeperLaneA');
    assert.equal(actorName(''), 'Public');
  });

  it('restricts the moves of an only when Given to its condition and writes no fairness for it', () => {
    const only = scaffoldTla(irOf(ADAPTER.replace('\n\n## Walks', '\n[G2] Given that the user exits small amounts. If this is false, A1 is at risk. Actor: the user, on exit, only when amount is at most 1.\n\n## Walks')));
    assert.ok(only.includes('\nCan_M1_Exit == \\E amount \\in 1..2 : state = "Open" /\\ ((held + amount) <= 2) /\\ (amount <= 1)\n'));
    assert.ok(block(only, 'M1_Exit').includes('\n    /\\ ((held + amount) <= 2)\n    /\\ (amount <= 1)   \\* G2: only when\n    /\\ state\' = state\n'));
    assert.ok(!block(only, 'M2_Halt').includes('only when'));
    assert.ok(only.includes('\nDue_User == Can_M1_Exit   \\* G1: acts before the next tick\n'));
    assert.ok(only.includes('\nUser_Exit == M1_Exit\nNext =='));
    assert.ok(only.includes('\n        /\\ WF_vars(User_Exit)                        \\* from G1\n'));
    assert.ok(!only.includes('from G2'));
  });

  it('writes one Due_ per actor over the moves of its prompt events, and one scoped definition per actor and event', () => {
    const two = scaffoldTla(irOf(TIMELOCK.replace('[G3] Given that Governance is honest. If this is false, plans may be cancelled.', '[G3] Given that Governance drops promptly. If this is false, plans linger. Actor: Governance, on cancel, prompt.\n[G4] Given that Governance retires promptly. If this is false, the timelock lingers. Actor: Governance, on retire, prompt.\n[G5] Given that Governance drops eventually. If this is false, plans linger. Actor: Governance, on cancel.')));
    assert.ok(two.includes('\nDue_Governance == Can_M5_Cancel \\/ Can_M6_Retire \\/ Can_M7_Cancel   \\* G3 G4: acts before the next tick\n'));
    assert.ok(block(two, 'M2_Tick').includes('\n  /\\ ~Due_Public                      \\* G1\n  /\\ ~Due_Governance                      \\* G3 G4\n'));
    assert.ok(two.includes('\nPublic_Execute == M4_Execute\nGovernance_Cancel == M5_Cancel \\/ M7_Cancel\nGovernance_Retire == M6_Retire\nNext =='));
    assert.ok(two.includes('\n        /\\ WF_vars(Governance_Cancel)                        \\* from G3\n        /\\ WF_vars(Governance_Retire)                        \\* from G4\n        /\\ WF_vars(Governance_Cancel)                        \\* from G5\n'));
  });

  it('compiles an Always that cites a Given like any Always', () => {
    const ir = irOf(ADAPTER.replace('[A1] Always, held is at most 2.', '[A1] Always, held is at most 2.\n[A2] Always, held is at most 1, given G2.').replace('\n\n## Walks', '\n[G2] Given that the user exits small amounts. If this is false, A1 is at risk. Actor: the user, on exit, only when amount is at most 1.\n\n## Walks'));
    assert.deepEqual(ir.errors, []);
    assert.deepEqual(ir.invariants.find(i => i.id === 'A2')!.givens, ['G2']);
    const cited = scaffoldTla(ir);
    assert.ok(cited.includes('\nA2 == (held <= 1)\n'));
    assert.ok(cited.includes('\nInv_A2 == TypeOK /\\ A2\n'));
  });

  it('refuses a parallel state and asks for a hand-written model', () => {
    const parallel = irOf('# Lamp\n\n## States\n[S1] Off: dark.\n[S2] Running: lit. Within it, it is both Clock and Beam.\n[S3] Running.Clock: a.\n[S4] Running.Beam: b.\n\n## Events\n[E1] on, from the user: x.\n\n## Moves\n[M1] When Off receives on, it becomes Running.\n');
    assert.equal(parallel.ok, true, parallel.errors.join('; '));
    assert.throws(() => scaffoldTla(parallel), /Running has parallel regions, which the TLA\+ scaffold does not write; model it by hand/);
  });
});

describe('scaffoldTla against the root\'s actors and parts', () => {
  // Who sends what: a chain actor that sends block, a keeper that sends an event named tick, and a part.
  const CLOCKED = `# Lamp
Tier: modeled
Module: lamp

It holds n, a count from 0 to 2. It sends price-update to the Vault.

## States
[S1] Off: dark.
[S2] On: lit.

## Events
[E1] block, from the chain: a block passes.
[E2] tick, from the keeper: the keeper's own beat.
[E3] tick-in, from the Vault: the vault forwards a beat.
[E4] post-a, from lane A: a post.

## Moves
[M1] When Off receives post-a, it becomes On, n becomes 1, sends price-update.
[M2] When On receives block, it stays On, n becomes 2.
[M3] When On receives tick, it stays On, n becomes 0.
[M4] When On receives tick-in, it becomes Off.
[R1] In Off, block, tick and tick-in are refused.
[R2] In On, post-a is refused.

## Within
[N1] Within 2 ticks of On, Off, given G1.

## Given
[G1] Given that lane A posts promptly. If this is false, nothing. Actor: lane A, on post-a, prompt.

## Walks
[W1] Walk Light: from Off, post-a, block; ends On; price-update sent once.
`;
  const roster = (actorsMd: string) => { write(`roster/${actorsMd.length}/actors/actors.md`, actorsMd); return readActors(join(root, `roster/${actorsMd.length}`)); };
  const actors = roster('```yaml\nactors:\n  - id: chain\n    name: the chain\n    kind: chain\n  - id: keeper\n    name: the keeper\n    kind: keeper\n  - id: lane-a\n    name: lane A\n    kind: keeper\n```\n');
  const ir = irOf(CLOCKED);

  it('takes an event as the chain\'s tick when its sender is an actor of kind chain, whatever its name, and never a part\'s send', () => {
    assert.deepEqual(ir.errors, []);
    const tla = scaffoldTla(ir, { actors, parts: ['vault'] });
    assert.ok(block(tla, 'M2_Block').includes('\n  /\\ ~Due_LaneA                      \\* G1\n'), 'block from the chain waits on the prompt lane');
    assert.ok(block(tla, 'M2_Block').includes('(IF n1_ticks > 2 THEN n1_ticks ELSE n1_ticks + 1)'), 'and counts as a tick for the Within');
    assert.ok(!block(tla, 'M3_Tick').includes('Due_') && !block(tla, 'M3_Tick').includes('n1_ticks + 1'), 'a keeper\'s event named tick is no tick');
    assert.ok(!block(tla, 'M4_TickIn').includes('Due_'), 'a part\'s send is no tick');
  });

  it('reads an event as the tick by its name only where no actors file resolves its sender', () => {
    const bare = scaffoldTla(ir);
    assert.ok(block(bare, 'M3_Tick').includes('~Due_LaneA') && block(bare, 'M3_Tick').includes('n1_ticks + 1'), 'tick from the keeper, with no actors file');
    assert.ok(!block(bare, 'M2_Block').includes('~Due_LaneA'), 'block, with no actors file');
    const unknown = scaffoldTla(ir, { actors: roster('```yaml\nactors:\n  - id: lane-a\n    name: lane A\n    kind: keeper\n```\n') });
    assert.ok(block(unknown, 'M3_Tick').includes('~Due_LaneA'), 'the keeper is not in actors.md, so the name decides');
  });

  it('writes every identifier built from a name with a hyphen as TLA+ takes it, and names the event in each action\'s comment', () => {
    const tla = scaffoldTla(ir, { actors });
    assert.ok(tla.includes('\n  sent_price_update,\n'));
    assert.ok(block(tla, 'M1_PostA').startsWith('M1_PostA ==                                 \\* M1 on post-a\n'));
    assert.ok(block(tla, 'M1_PostA').includes('\n  /\\ sent_price_update\' = sent_price_update + 1\n'));
    assert.ok(tla.includes('\nW1_End == w1_at = 2 /\\ state = "On" /\\ sent_price_update - w1_armed_sent_price_update = 1\n'));
    assert.ok(tla.includes('\nLaneA_PostA == M1_PostA\n'));
    assert.equal(actorName('Governance\'s deputy'), 'GovernancesDeputy');
    assert.equal(scaffoldTla(irOf(CLOCKED.replace('# Lamp', '# Price Feed'))).split('\n')[0], '---------------------------- MODULE Price_Feed ----------------------------');
  });

  it('reads an action\'s event back through the event names, or the comment the scaffold writes, before the name itself', () => {
    const read = parseTla(scaffoldTla(ir, { actors }));
    assert.equal(read.actions.M1_PostA.event, 'post-a', 'from the comment');
    assert.equal(read.actions.M4_TickIn.event, 'tick-in');
    assert.equal(read.actions.M2_Block.event, 'block');
    const bare = '---- MODULE Lamp ----\nM1_PostA == state = "Off" /\\ state\' = "On"\nM4_TickIn == state = "On" /\\ state\' = "Off"\n====\n';
    assert.equal(parseTla(bare).actions.M1_PostA.event, 'postA', 'with neither, the name with its first letter lowered');
    assert.equal(parseTla(bare, { events: ir.events.map(e => e.name) }).actions.M1_PostA.event, 'post-a', 'through the event names');
    assert.equal(parseTla(bare, { events: ir.events.map(e => e.name) }).actions.M4_TickIn.event, 'tick-in');
    assert.equal(parseTla(bare.replace('M1_PostA == ', 'M1_PostA ==   \\* M1 on schedule\n  '), { events: ['post-a'] }).actions.M1_PostA.event, 'post-a', 'a comment that names another event is not read');
  });
});

describe('the scaffold command', () => {
  const bin = join(dirname(dirname(dirname(fileURLToPath(import.meta.url)))), 'bin', 'dossier');
  const run = (...args: string[]) => { const r = spawnSync(bin, [args[0], '--root', join(root, 'cli'), ...args.slice(1)], { encoding: 'utf8' }); return { status: r.status, stdout: r.stdout, stderr: r.stderr }; };
  // A begin and a retire, committed in integrity.json as dossier decide would commit them.
  const retire = (dir: string) => {
    const begun = '2026-11-01T00:00:00Z begin modeled "x" 00000000';
    const log = `${begun}\n2026-11-02T00:00:00Z retire "done" ${createHash('sha256').update(begun).digest('hex').slice(0, 8)}\n`;
    writeFileSync(join(root, 'cli', dir, 'decisions.log'), log);
    writeFileSync(join(root, 'cli', dir, 'integrity.json'), JSON.stringify({ schema: 1, evidence: {}, decisionHead: prefixHead(log) }) + '\n');
  };
  before(() => {
    write('cli/dossier.json', '{"plugin":"0.1.0","storage":"integrity-v1"}\n');
    write('cli/actors/actors.md', '```yaml\nactors:\n  - id: chain\n    name: the chain\n    kind: chain\n  - id: lane-a\n    name: lane A\n    kind: keeper\n  - id: user\n    name: the user\n    kind: user\n```\n');
    write('cli/parts/lamp/prose.md', '# Lamp\n\nIt holds n, a count from 0 to 1.\n\n## States\n[S1] Off: dark.\n[S2] On: lit.\n\n## Events\n[E1] block, from the chain: a block passes.\n[E2] post-a, from lane A: a post.\n\n## Moves\n[M1] When Off receives post-a, it becomes On.\n[M2] When On receives block, it becomes Off.\n[R1] In Off, block is refused.\n[R2] In On, post-a is refused.\n\n## Given\n[G1] Given that lane A posts promptly. If this is false, nothing. Actor: lane A, on post-a, prompt.\n');
    write('cli/parts/old/prose.md', ADAPTER);
    write('cli/compositions/gone/wiring.md', COMPOSITION);
    write('cli/compositions/gone/prose.md', SUPPLY);
    retire('parts/old');
    retire('compositions/gone');
  });

  it('decides the chain\'s ticks from actors.md, as a composition does', () => {
    const r = run('scaffold', 'lamp');
    assert.equal(r.status, 0, r.stderr);
    const tla = readFileSync(join(root, 'cli', 'parts', 'lamp', 'model', 'Lamp.tla'), 'utf8');
    assert.ok(block(tla, 'M2_Block').includes('~Due_LaneA'), 'block from the chain is the tick');
  });

  it('refuses a retired part or composition, and says which begin reopens it', () => {
    const c = run('scaffold', 'old');
    assert.equal(c.status, 2);
    assert.equal(c.stderr, 'dossier scaffold: parts/old is retired; dossier decide parts/old begin reopens it\n');
    assert.equal(existsSync(join(root, 'cli', 'parts', 'old', 'model')), false);
    const s = run('scaffold', 'compositions/gone');
    assert.equal(s.status, 2);
    assert.equal(s.stderr, 'dossier scaffold: compositions/gone is retired; dossier decide compositions/gone begin reopens it\n');
  });
});

describe('scaffoldCfgs', () => {
  it('writes one configuration for the invariants and one per Once and per Walk', () => {
    const cfgs = scaffoldCfgs(irOf(TIMELOCK));
    assert.deepEqual(Object.keys(cfgs), ['Timelock.cfg', 'Timelock_O1.cfg', 'Timelock_W1.cfg', 'Timelock_W2.cfg']);
    assert.equal(cfgs['Timelock.cfg'], 'SPECIFICATION Spec\nCONSTANT MaxSent = 4\nCONSTRAINT SentBounded\nCHECK_DEADLOCK FALSE\nINVARIANTS TypeOK A1 A2 N1\n');
    assert.equal(cfgs['Timelock_O1.cfg'], 'SPECIFICATION Spec\nCONSTANT MaxSent = 4\nCONSTRAINT SentBounded\nCHECK_DEADLOCK FALSE\nPROPERTIES O1\n');
    assert.equal(cfgs['Timelock_W1.cfg'], 'SPECIFICATION Spec\nCONSTANT MaxSent = 4\nCONSTRAINT SentBounded\nCHECK_DEADLOCK FALSE\nINVARIANTS TypeOK NotW1\n');
    assert.deepEqual(Object.keys(scaffoldCfgs(irOf(TIMELOCK), { moduleName: 'P' })), ['P.cfg', 'P_O1.cfg', 'P_W1.cfg', 'P_W2.cfg']);
  });
});

const MODULE = `---- MODULE Timelock ----
\\* hand-refined
EXTENDS Naturals

CONSTANTS
  \\* @type: Int;
  MaxSent
VARIABLES
  \\* @type: Str;
  state,
  \\* @type: Int;
  remaining
vars == <<state, remaining>>

Init == state = "Idle" /\\ remaining = 0

M1_Schedule ==                                 \\* M1
  \\E delay \\in 1..2 :
    /\\ state = "Idle"
    /\\ state' = "Waiting"   (* enters Waiting *)
    /\\ remaining' = delay

M2_Tick == state = "Waiting" /\\ state' = state /\\ remaining' = remaining - 1
M3_Tick == state = "Waiting" /\\ state' = "Ready" /\\ remaining' = 0
M4_Execute == state = "Ready" /\\ state' = "Idle" /\\ UNCHANGED remaining
M5_Cancel ==
  \\/ state = "Waiting" /\\ state' = "Idle" /\\ remaining' = 0
  \\/ state = "Ready" /\\ state' = "Idle" /\\ remaining' = 0
Helper(x) == x + 1

Governance == M1_Schedule \\/ M5_Cancel
Chain == M2_Tick \\/ M3_Tick
Next == Governance \\/ Chain \\/ M4_Execute
Spec == Init /\\ [][Next]_vars
        /\\ WF_vars(Chain)        \\* from G2
        /\\ SF_vars(M4_Execute)

TypeOK == remaining \\in 0..2
A1 == remaining <= 2
Inv_A1 == TypeOK /\\ A1
O1 == (state = "Waiting") ~> (state = "Idle")
N1 == TRUE
R1 == state = "Idle" => ~ENABLED M4_Execute
W1_End == state = "Idle" /\\ remaining = 0
NotW1 == ~W1_End
====
Ignored == TRUE
`;

describe('parseTla', () => {
  const m = parseTla(MODULE);

  it('reads the module name, the variables and the states', () => {
    assert.equal(m.module, 'Timelock');
    assert.deepEqual(m.variables, ['state', 'remaining']);
    assert.deepEqual(m.states, ['Idle', 'Waiting', 'Ready']);
  });

  it('reads the actions: move, event, targets and stays', () => {
    assert.deepEqual(m.actions, {
      M1_Schedule: { move: 'M1', event: 'schedule', targets: ['Waiting'], stays: false },
      M2_Tick: { move: 'M2', event: 'tick', targets: [], stays: true },
      M3_Tick: { move: 'M3', event: 'tick', targets: ['Ready'], stays: false },
      M4_Execute: { move: 'M4', event: 'execute', targets: ['Idle'], stays: false },
      M5_Cancel: { move: 'M5', event: 'cancel', targets: ['Idle'], stays: false },
    });
  });

  it('reads targets from state\' conjuncts only, never from a ghost or an observer', () => {
    const scaffold = parseTla(scaffoldTla(irOf(TIMELOCK)));
    assert.deepEqual(scaffold.actions.M1_Schedule.targets, ['Waiting']);
    assert.deepEqual(scaffold.actions.M2_Tick.targets, []);
    assert.equal(scaffold.actions.M2_Tick.stays, true);
    assert.deepEqual(scaffold.actions.M3_Tick.targets, ['Ready']);
    assert.deepEqual(targetsOf('  /\\ state\' = "Waiting"\n  /\\ n1_ticks\' = IF state\' = "Idle" THEN 0 ELSE IF ~(state\' = "Ready") THEN 0 ELSE n1_ticks'), ['Waiting']);
    assert.deepEqual(targetsOf('adapter_Tick == \\/ (adapter_state = "Open" /\\ adapter_state\' = "Halted") \\/ (adapter_state\' = adapter_state)'), ['Halted']);
    assert.deepEqual(targetsOf('(state\' = "A") /\\ (state\' = "B")'), ['A', 'B']);
  });

  it('reads the properties and the fairness with the Given it cites', () => {
    assert.deepEqual(m.properties, ['TypeOK', 'A1', 'Inv_A1', 'O1', 'N1', 'R1', 'W1_End', 'NotW1']);
    assert.deepEqual(m.fairness, [{ kind: 'WF', action: 'Chain', given: 'G2', line: 35 }, { kind: 'SF', action: 'M4_Execute', given: null, line: 36 }]);
  });

  it('keeps every definition up to the end line, hashed without comments', () => {
    assert.ok('Helper' in m.definitions && 'Spec' in m.definitions && 'Init' in m.definitions);
    assert.equal('Ignored' in m.definitions, false, 'nothing after ==== counts');
    assert.equal(m.definitions.M5_Cancel.text.split('\n').length, 3);
    assert.match(m.definitions.A1.hash, /^[0-9a-f]{8}$/);
    const stripped = parseTla(MODULE.replace('   (* enters Waiting *)', '').replace('                                 \\* M1', ''));
    assert.equal(stripped.definitions.M1_Schedule.hash, m.definitions.M1_Schedule.hash);
    assert.notEqual(parseTla(MODULE.replace('A1 == remaining <= 2', 'A1 == remaining <= 3')).definitions.A1.hash, m.definitions.A1.hash);
  });
});

describe('parseCfg and reachValues', () => {
  it('reads every section, with constants and their values', () => {
    const cfg = parseCfg('\\* a comment\nSPECIFICATION Spec\nCONSTANT MaxSent = 4\nCONSTANTS Mode_governance = "honest"\n  Set <- {a, b,\n  c}\n  Bare\nCONSTRAINT SentBounded\nCHECK_DEADLOCK FALSE\nINVARIANTS TypeOK A1\nINVARIANT N1\nPROPERTIES O1\n');
    assert.equal(cfg.specification, 'Spec');
    assert.deepEqual(cfg.invariants, ['TypeOK', 'A1', 'N1']);
    assert.deepEqual(cfg.properties, ['O1']);
    assert.deepEqual(cfg.enabled, ['TypeOK', 'A1', 'N1', 'O1']);
    assert.deepEqual(cfg.constants, { MaxSent: '4', Mode_governance: '"honest"', Set: '{a, b, c}', Bare: null });
    assert.deepEqual(cfg.constraints, ['SentBounded']);
    assert.equal(cfg.checkDeadlock, false);
    assert.deepEqual(cfg.unknown, []);
    const init = parseCfg('stray INIT Init NEXT Next CHECK_DEADLOCK TRUE');
    assert.equal(init.init, 'Init');
    assert.equal(init.next, 'Next');
    assert.equal(init.checkDeadlock, true);
    assert.deepEqual(init.unknown, ['stray']);
    assert.deepEqual(init.enabled, []);
  });

  it('turns constants into reach values: numbers, set sizes and strings', () => {
    assert.deepEqual(reachValues({ MaxSent: '4', Neg: '-1', Set: '{a, b, c}', Mode: '"honest"', Bare: null, Odd: 'Nat' }), { MaxSent: 4, Neg: -1, Set: 3, Mode: 'honest' });
    assert.deepEqual(reachValues(undefined), {});
  });
});

describe('parseAls', () => {
  it('reads facts, asserts, predicates, functions and commands with their passage ids and scope', () => {
    const als = parseAls('sig Plan {}\n// check Z9 in a comment\nfact S1_idle { some Plan } -- note\nassert A1_bound { all p: Plan | p in Plan }\n/* run Z8 */\ncheck A1_bound for 4 but 2 int\nrun W1_plan for 3\npred helper {}\nfun f: Plan { Plan }\ncheck Nameless\nassert K1 { no Plan }\n');
    assert.deepEqual(als.items, [
      { kind: 'fact', name: 'S1_idle', passage: 'S1' },
      { kind: 'assert', name: 'A1_bound', passage: 'A1' },
      { kind: 'pred', name: 'helper', passage: null },
      { kind: 'fun', name: 'f', passage: null },
      { kind: 'assert', name: 'K1', passage: 'K1' },
    ]);
    assert.deepEqual(als.commands, [
      { kind: 'check', name: 'A1_bound', scope: 'for 4 but 2 int', overall: 4, passage: 'A1' },
      { kind: 'run', name: 'W1_plan', scope: 'for 3', overall: 3, passage: 'W1' },
      { kind: 'check', name: 'Nameless', scope: '', overall: null, passage: null },
    ]);
  });
});

// ---------------------------------------------------------------- actors.ts

describe('readActors', () => {
  it('reads actors and scenarios, with all-honest always first', () => {
    write('good/actors/actors.md', ACTORS);
    write('good/actors/scenarios.md', SCENARIOS);
    const a = readActors(join(root, 'good'));
    assert.deepEqual(a.errors, []);
    assert.deepEqual(a.actors.map(x => x.id), ['governance', 'user', 'breaker', 'chain']);
    assert.deepEqual(a.byId.user, { id: 'user', name: 'the user', kind: 'user', modes: ['honest', 'malicious', 'offline'], pins: [], notes: null });
    assert.deepEqual(a.byId.chain.modes, ['honest', 'offline']);
    assert.deepEqual(a.scenarios.map(s => s.id), ['all-honest', 'user-malicious', 'breaker-offline', 'user-away', 'halted-full']);
    assert.deepEqual(a.scenarioById['all-honest'], { id: 'all-honest', modes: {}, windows: {}, start: {}, strongerThan: [], notes: 'every actor honest' });
    assert.deepEqual(a.scenarioById['user-malicious'], { id: 'user-malicious', modes: { user: 'malicious' }, windows: {}, start: {}, strongerThan: ['all-honest'], notes: null });
    assert.deepEqual(a.unsound, []);
    assert.deepEqual(MODES, ['honest', 'malicious', 'offline']);
    assert.ok(ACTOR_KINDS.includes('chain') && ACTOR_KINDS.includes('public'));
  });

  it('keeps a declared all-honest and answers an empty root with all-honest alone', () => {
    write('declared/actors/scenarios.md', '```yaml\nscenarios:\n  - id: all-honest\n    notes: declared here\n```\n');
    const a = readActors(join(root, 'declared'));
    assert.deepEqual(a.scenarios.map(s => s.id), ['all-honest']);
    assert.equal(a.scenarios[0].notes, 'declared here');
    const empty = readActors(join(root, 'nowhere'));
    assert.deepEqual(empty.actors, []);
    assert.deepEqual(empty.scenarios.map(s => s.id), ['all-honest']);
    assert.deepEqual(empty.errors, []);
  });

  it('reports an unknown kind, an unknown mode, a scenario naming an unknown actor or mode, and stronger_than an unknown scenario', () => {
    write('bad/actors/actors.md', '```yaml\nactors:\n  - id: governance\n    kind: king\n  - id: chain\n    kind: chain\n    modes: [honest, sleepy]\n  - name: nameless\n    kind: user\n```\n');
    write('bad/actors/scenarios.md', '```yaml\nscenarios:\n  - id: ghost\n    modes: { nobody: malicious }\n  - id: wrong-mode\n    modes: { governance: asleep, chain: malicious }\n    stronger_than: [never]\n```\n');
    const a = readActors(join(root, 'bad'));
    assert.deepEqual(a.errors, [
      'actors.md: governance has kind "king", not one of governance, multisig, keeper, user, public, chain, market, external',
      'actors.md: chain lists mode "sleepy", not one of honest, malicious, offline',
      'actors.md: an actor has no id',
      'scenarios.md: ghost names actor "nobody", which actors.md does not declare',
      'scenarios.md: wrong-mode gives governance mode "asleep", not one of honest, malicious, offline',
      'scenarios.md: wrong-mode gives chain mode "malicious", which that actor does not allow',
      'scenarios.md: wrong-mode is stronger than "never", which is not a scenario',
    ]);
  });

  it('reads a mode with a window into modes and windows, from 0 by default and no end without until', () => {
    const a = readActors(join(root, 'good'));
    assert.deepEqual(a.scenarioById['user-away'], {
      id: 'user-away', modes: { user: 'offline', chain: 'offline' }, windows: { user: { from: 1, until: 3 }, chain: { from: 2, until: null } }, start: {}, strongerThan: [],
      notes: 'the user is away for two blocks, and the chain stops after two',
    });
    assert.deepEqual(windowOf(a.scenarioById['user-away'], 'user'), { from: 1, until: 3 });
    assert.deepEqual(windowOf(a.scenarioById['user-away'], 'chain'), { from: 2, until: null });
    assert.equal(windowOf(a.scenarioById['user-away'], 'breaker'), null);
    assert.equal(windowOf(a.scenarioById['user-malicious'], 'user'), null, 'a plain mode has no window');
    assert.equal(windowOf(null, 'user'), null);
    assert.equal(modeOf(a.scenarioById['user-away'], 'user'), 'offline');
    write('window-from/actors/actors.md', ACTORS);
    write('window-from/actors/scenarios.md', '```yaml\nscenarios:\n  - id: user-gone\n    modes:\n      user: { mode: offline, until: 2 }\n```\n');
    assert.deepEqual(readActors(join(root, 'window-from')).scenarioById['user-gone'].windows, { user: { from: 0, until: 2 } });
  });

  it('reads a start as written: numbers and booleans as they are, anything else as text', () => {
    const a = actorsWith('start-read', PAUSED);
    assert.deepEqual(a.scenarioById['halted-full'].start, { 'adapter.state': 'Halted', 'adapter.held': 2, 'token.supply': 2 });
    assert.deepEqual(a.scenarioById.paused.start, { 'adapter.paused': true, 'adapter.level': 'High' });
    assert.deepEqual(a.scenarioById['halted-full'].modes, {});
  });

  it('reports a window with no mode, a bound that is not a whole number of ticks, an empty window and a start that is not a map', () => {
    write('windows-bad/actors/actors.md', '```yaml\nactors:\n  - id: lane\n    kind: keeper\n    modes: [honest, offline]\n```\n');
    write('windows-bad/actors/scenarios.md', '```yaml\nscenarios:\n  - id: no-mode\n    modes: { lane: { from: 1, until: 2 } }\n  - id: bad-from\n    modes: { lane: { mode: offline, from: -1 } }\n  - id: bad-until\n    modes: { lane: { mode: offline, until: 1.5 } }\n  - id: soon\n    modes: { lane: { mode: offline, from: soon } }\n  - id: empty\n    modes: { lane: { mode: offline, from: 2, until: 2 } }\n  - id: bad-mode\n    modes: { lane: { mode: malicious, until: 2 } }\n  - id: no-actor\n    modes: { nobody: { mode: offline, until: 2 } }\n  - id: loose-start\n    start: oracle.stale\n```\n');
    const a = readActors(join(root, 'windows-bad'));
    assert.deepEqual(a.errors, [
      'scenarios.md: no-mode gives lane a window with no mode',
      'scenarios.md: bad-from gives lane a window with from "-1", not a whole number of ticks',
      'scenarios.md: bad-until gives lane a window with until "1.5", not a whole number of ticks',
      'scenarios.md: soon gives lane a window with from "soon", not a whole number of ticks',
      'scenarios.md: empty gives lane a window from 2 until 2, which is empty',
      'scenarios.md: bad-mode gives lane mode "malicious", which that actor does not allow',
      'scenarios.md: no-actor names actor "nobody", which actors.md does not declare',
      'scenarios.md: loose-start has start "oracle.stale", not a map of <part>.<datum> to values',
    ]);
    assert.deepEqual(a.scenarioById['no-mode'].modes, {}, 'a window with no mode gives none');
  });

  it('finds a stronger_than unsound unless the actor has the same mode in the same window in both scenarios, or is malicious throughout in the stronger one', () => {
    write('windows-order/actors/actors.md', '```yaml\nactors:\n  - id: lane\n    kind: keeper\n```\n');
    write('windows-order/actors/scenarios.md', '```yaml\nscenarios:\n  - id: lane-offline\n    modes: { lane: offline }\n  - id: lane-down\n    modes: { lane: { mode: offline, until: 2 } }\n    stronger_than: [lane-offline]\n  - id: lane-down-too\n    modes: { lane: { mode: offline, from: 0, until: 2 } }\n    stronger_than: [lane-down]\n  - id: lane-late\n    modes: { lane: { mode: offline, from: 3 } }\n    stronger_than: [lane-down]\n  - id: lane-out\n    modes: { lane: offline }\n    stronger_than: [lane-down]\n  - id: lane-captured\n    modes: { lane: malicious }\n    stronger_than: [lane-down, lane-late, lane-offline]\n  - id: lane-captured-late\n    modes: { lane: { mode: malicious, from: 1 } }\n    stronger_than: [lane-down]\n```\n');
    const a = readActors(join(root, 'windows-order'));
    assert.deepEqual(a.errors, []);
    assert.deepEqual(a.unsound, [
      'scenarios.md: lane-down is declared stronger than lane-offline, which its modes do not support: lane is offline from 0 until 2 in lane-down and offline in lane-offline',
      'scenarios.md: lane-late is declared stronger than lane-down, which its modes do not support: lane is offline from 3 in lane-late and offline from 0 until 2 in lane-down',
      'scenarios.md: lane-out is declared stronger than lane-down, which its modes do not support: lane is offline in lane-out and offline from 0 until 2 in lane-down',
      'scenarios.md: lane-captured-late is declared stronger than lane-down, which its modes do not support: lane is malicious from 1 in lane-captured-late and offline from 0 until 2 in lane-down',
    ], 'malicious for the whole run sits above every mode in every window; malicious in a window does not');
  });

  it('finds a stronger_than unsound when the two scenarios start from different values, after the actors that differ', () => {
    write('starts-order/actors/actors.md', '```yaml\nactors:\n  - id: lane\n    kind: keeper\n```\n');
    write('starts-order/actors/scenarios.md', '```yaml\nscenarios:\n  - id: stale\n    start: { oracle.stale: 3 }\n    stronger_than: [all-honest]\n  - id: staler\n    start: { oracle.stale: 4 }\n    stronger_than: [stale]\n  - id: stale-too\n    start: { oracle.stale: "3" }\n    stronger_than: [stale]\n  - id: stale-captured\n    modes: { lane: malicious }\n    start: { oracle.stale: 3 }\n    stronger_than: [stale]\n  - id: stale-lane-down\n    modes: { lane: offline }\n    start: { oracle.stale: 3, oracle.state: Stale }\n    stronger_than: [stale]\n```\n');
    const a = readActors(join(root, 'starts-order'));
    assert.deepEqual(a.errors, []);
    assert.deepEqual(a.unsound, [
      'scenarios.md: stale is declared stronger than all-honest, which its modes do not support: they start from different values',
      'scenarios.md: staler is declared stronger than stale, which its modes do not support: they start from different values',
      'scenarios.md: stale-lane-down is declared stronger than stale, which its modes do not support: lane is offline in stale-lane-down and honest in stale',
      'scenarios.md: stale-lane-down is declared stronger than stale, which its modes do not support: they start from different values',
    ], 'a start differs by a key or a value; the same start, written as a number or as text, and malicious modes over it are sound');
  });

  it('refuses a window on the chain\'s offline mode that ends, since the clock counts the chain\'s ticks', () => {
    write('chain-window/actors/actors.md', '```yaml\nactors:\n  - id: chain\n    kind: chain\n    modes: [honest, offline]\n  - id: lane\n    kind: keeper\n```\n');
    write('chain-window/actors/scenarios.md', '```yaml\nscenarios:\n  - id: chain-halts\n    modes: { chain: { mode: offline, from: 2 } }\n  - id: chain-pauses\n    modes: { chain: { mode: offline, from: 2, until: 4 }, lane: { mode: offline, until: 4 } }\n```\n');
    const a = readActors(join(root, 'chain-window'));
    assert.deepEqual(a.errors, ['scenarios.md: chain-pauses gives chain an offline window until 4, which cannot end: the clock counts the chain\'s ticks']);
    assert.deepEqual(a.scenarioById['chain-halts'].windows, { chain: { from: 2, until: null } });
  });

  it('reports an actor or a scenario declared more than once, and a scenario with no id, and reads the first declaration', () => {
    write('twice/actors/actors.md', '```yaml\nactors:\n  - id: governance\n    kind: governance\n  - id: governance\n    kind: user\n  - id: governance\n    kind: keeper\n```\n');
    write('twice/actors/scenarios.md', '```yaml\nscenarios:\n  - id: quiet\n    modes: { governance: offline }\n  - id: quiet\n    modes: { governance: malicious }\n  - notes: nameless\n```\n');
    const a = readActors(join(root, 'twice'));
    assert.deepEqual(a.errors, ['actors.md: governance is declared more than once; the first is read', 'scenarios.md: a scenario has no id', 'scenarios.md: quiet is declared more than once; the first is read']);
    assert.deepEqual(a.actors.map(x => [x.id, x.kind]), [['governance', 'governance']]);
    assert.deepEqual(a.scenarios.filter(x => x.id === 'quiet').map(x => x.modes), [{ governance: 'offline' }]);
  });

  it('refuses an honest window, which changes nothing: a window holds malicious or offline', () => {
    write('honest-window/actors/actors.md', '```yaml\nactors:\n  - id: lane\n    kind: keeper\n```\n');
    write('honest-window/actors/scenarios.md', '```yaml\nscenarios:\n  - id: lane-fine\n    modes: { lane: { mode: honest, from: 1, until: 3 } }\n```\n');
    const a = readActors(join(root, 'honest-window'));
    assert.deepEqual(a.errors, ['scenarios.md: lane-fine gives lane an honest window, which changes nothing: a window holds malicious or offline']);
    assert.deepEqual(a.scenarioById['lane-fine'].windows, {}, 'and keeps no window for it');
  });

  it('reports unreadable yaml with the file name', () => {
    write('yaml/actors/actors.md', '```yaml\nactors:\n  - id: governance\n   kind: king\n```\n');
    const a = readActors(join(root, 'yaml'));
    assert.equal(a.errors.length, 1);
    assert.match(a.errors[0], /^actors\.md: yaml line/);
  });

  it('finds an actor by id or by name, and reads the mode of a scenario', () => {
    const a = readActors(join(root, 'good'));
    assert.equal(findActor(a, 'governance')!.id, 'governance');
    assert.equal(findActor(a, 'Governance')!.id, 'governance');
    assert.equal(findActor(a, 'The governance')!.id, 'governance');
    assert.equal(findActor(a, 'the Adapter'), null, 'a part is no actor');
    assert.equal(actorId('the Adapter'), 'adapter');
    assert.equal(findActor(a, 'nobody'), null);
    assert.equal(findActor(a, ''), null);
    assert.equal(actorId('the Keeper Lane A'), 'keeper-lane-a');
    assert.equal(modeOf(a.scenarioById['user-malicious'], 'user'), 'malicious');
    assert.equal(modeOf(a.scenarioById['user-malicious'], 'governance'), 'honest');
    assert.equal(modeOf(null, 'governance'), 'honest');
  });
});

// ---------------------------------------------------------------- wiring.ts

describe('readWiring', () => {
  it('reads members, wiring, closure and default scenarios', () => {
    write('sys/supply/wiring.md', COMPOSITION);
    const c = readWiring(join(root, 'sys', 'supply'));
    assert.deepEqual(c.errors, []);
    assert.deepEqual(c.members, [{ part: 'adapter', role: 'member', pins: ['adapter#contract:adapter'] }, { part: 'token', role: 'member', pins: [] }]);
    assert.deepEqual(c.wiring, [{ effect: { part: 'adapter', name: 'mint' }, event: { part: 'token', name: 'mint' } }]);
    assert.deepEqual(c.closure, [{ asset: 'hrd', edges: ['mints_asset'], modules: [] }]);
    assert.deepEqual(c.scenarios, ['all-honest', 'breaker-offline']);
    assert.equal(c.text, COMPOSITION);
  });

  it('reports a missing file, a member without a part, a bad role and malformed wiring', () => {
    assert.deepEqual(readWiring(join(root, 'sys', 'nowhere')), { members: [], wiring: [], free: [], closure: [], scenarios: [], errors: ['wiring.md is missing'], text: '' });
    write('sys/bad/wiring.md', '```yaml\nmembers:\n  - role: member\n  - part: vault\n    role: bystander\nwiring:\n  - effect: adapter.mint\n    event: token\nclosure:\n  - asset: hrd\n    modules: [vault]\n```\n');
    const c = readWiring(join(root, 'sys', 'bad'));
    assert.deepEqual(c.errors, ['wiring.md: a member names no part', 'wiring.md: vault has role "bystander", not member or surroundings', 'wiring.md: wiring needs effect: <part>.<effect> and event: <part>.<event>']);
    assert.deepEqual(c.closure, [{ asset: 'hrd', edges: [], modules: ['vault'] }]);
    assert.deepEqual(c.scenarios, []);
    write('sys/free/wiring.md', '```yaml\nmembers:\n  - part: token\nfree: [token.mint, mint]\n```\n');
    const free = readWiring(join(root, 'sys', 'free'));
    assert.deepEqual(free.free, ['token.mint', 'mint']);
    assert.deepEqual(free.errors, ['wiring.md: free names "mint", not <part>.<event>']);
    write('sys/twice/wiring.md', '```yaml\nmembers:\n  - part: adapter\n  - part: token\n  - part: adapter\n    role: surroundings\n  - part: adapter\nscenarios: [all-honest, quiet, all-honest]\n```\n');
    const twice = readWiring(join(root, 'sys', 'twice'));
    assert.deepEqual(twice.errors, ['wiring.md: adapter is listed as a member more than once; the first is read', 'wiring.md: scenarios lists all-honest more than once']);
    assert.deepEqual(twice.members.map(m => [m.part, m.role]), [['adapter', 'member'], ['token', 'member']]);
    assert.deepEqual(twice.scenarios, ['all-honest', 'quiet']);
    write('sys/yaml/wiring.md', '```yaml\nmembers: [\n```\n');
    assert.match(readWiring(join(root, 'sys', 'yaml')).errors[0], /^wiring\.md: yaml line/);
  });
});

// ---------------------------------------------------------------- compose.ts

describe('composeMembers', () => {
  const members = { adapter: irOf(ADAPTER), token: irOf(TOKEN) };
  let actors: ActorsModel, wiring: Wiring, prose: CompositionProse, composed: Composed;
  before(() => {
    write('compose/actors/actors.md', ACTORS);
    write('compose/actors/scenarios.md', SCENARIOS);
    write('compose/compositions/supply/wiring.md', COMPOSITION);
    actors = readActors(join(root, 'compose'));
    wiring = readWiring(join(root, 'compose', 'compositions', 'supply'));
    prose = parseCompositionProse(SUPPLY);
    assert.deepEqual(prose.errors, []);
    composed = composeMembers({ name: 'supply', prose, wiring, members, actors });
  });

  it('composes without errors and names the module, the actors and the prefixed variables', () => {
    assert.deepEqual(composed.errors, []);
    assert.equal(composed.module, 'Supply');
    assert.deepEqual(composed.actors, ['breaker', 'chain', 'user']);
    assert.deepEqual(composed.parts, ['adapter']);
    assert.deepEqual(composed.free, [{ event: 'token.burn', from: 'adapter', declared: false }]);
    assert.deepEqual(composed.outside, []);
    assert.deepEqual(composed.vars, ['adapter_state', 'adapter_held', 'adapter_sent_mint', 'token_state', 'token_supply', 'n1_ticks', 'w1_at']);
    assert.ok(composed.tla.startsWith('-------------------------- MODULE Supply --------------------------\n'));
    assert.ok(composed.tla.includes('\nVARIABLES\n  \\* @type: Str;\n  adapter_state,\n  \\* @type: Int;\n  adapter_held,\n  \\* @type: Int;\n  adapter_sent_mint,\n  \\* @type: Str;\n  token_state,\n  \\* @type: Int;\n  token_supply,\n  \\* @type: Int;\n  n1_ticks,\n  \\* @type: Int;\n  w1_at\nvars == <<adapter_state, adapter_held, adapter_sent_mint, token_state, token_supply, n1_ticks, w1_at>>\n'));
    assert.ok(composed.tla.includes('\nInit ==\n  /\\ adapter_state = "Open"\n  /\\ adapter_held = 0\n  /\\ adapter_sent_mint = 0\n  /\\ token_state = "Live"\n  /\\ token_supply = 0\n  /\\ n1_ticks = 0\n  /\\ w1_at = 0\n\n'));
  });

  it('declares the modes as annotated constants with one ConstInit per claimed scenario', () => {
    assert.ok(composed.tla.includes('\nCONSTANTS\n  \\* @type: Int;\n  MaxSent,\n  \\* @type: Str;\n  Mode_breaker,\n  \\* @type: Str;\n  Mode_chain,\n  \\* @type: Str;\n  Mode_user\n'));
    assert.ok(composed.tla.includes('\nConstInit_all_honest == MaxSent = 4 /\\ Mode_breaker = "honest" /\\ Mode_chain = "honest" /\\ Mode_user = "honest"\n'));
    assert.ok(composed.tla.includes('\nConstInit_user_malicious == MaxSent = 4 /\\ Mode_breaker = "honest" /\\ Mode_chain = "honest" /\\ Mode_user = "malicious"\n'));
    assert.ok(composed.tla.includes('\nConstInit_breaker_offline == MaxSent = 4 /\\ Mode_breaker = "offline" /\\ Mode_chain = "honest" /\\ Mode_user = "honest"\n'));
    assert.deepEqual(composed.tla.match(/^ConstInit_\w+/gm), ['ConstInit_all_honest', 'ConstInit_user_malicious', 'ConstInit_breaker_offline'], 'none for user-away, halted-full or paused, which no cell claims');
  });

  it('puts the wired target\'s conjuncts inside the source action and leaves the target no free-standing action', () => {
    const exit = block(composed.tla, 'adapter_M1_Exit');
    assert.equal(exit, [
      'adapter_M1_Exit ==                                   \\* adapter M1',
      '  \\E amount \\in 1..2 :',
      '    /\\ adapter_state = "Open"',
      '    /\\ ((adapter_held + amount) <= 2)',
      '    /\\ adapter_state\' = adapter_state',
      '    /\\ adapter_held\' = (adapter_held + amount)',
      '    /\\ adapter_sent_mint\' = adapter_sent_mint + 1',
      '    /\\ (token_state = "Live" /\\ ((token_supply + amount) <= 4) /\\ token_state\' = token_state /\\ token_supply\' = (token_supply + amount))',
      '    /\\ n1_ticks\' = IF (adapter_held\' = 0) THEN 0 ELSE IF ~(((adapter_state\' = "Open"))) THEN 0 ELSE n1_ticks',
      '    /\\ w1_at\' = IF (adapter_state = "Open") /\\ amount = 1 THEN 1 ELSE 0',
    ].join('\n'));
    assert.ok(composed.tla.includes('\nCan_token_M1_Mint == \\E amount \\in 1..2 : token_state = "Live" /\\ ((token_supply + amount) <= 4)\n'));
    assert.ok(composed.tla.includes('\n\\* token_M1_Mint is reached through wiring only\n'));
    assert.ok(!composed.tla.includes('\ntoken_M1_Mint =='));
    assert.ok(composed.tla.includes('\nCan_adapter_M1_Exit == \\E amount \\in 1..2 : adapter_state = "Open" /\\ ((adapter_held + amount) <= 2) /\\ ((token_state = "Live" /\\ ((token_supply + amount) <= 4)))\n'), 'the carried field is bound once');
    const burn = block(composed.tla, 'token_M2_Burn');
    assert.ok(burn.includes('\n    /\\ token_supply\' = (token_supply - amount)\n    /\\ UNCHANGED <<adapter_state, adapter_held, adapter_sent_mint>>\n'));
    const halt = block(composed.tla, 'adapter_M2_Halt');
    assert.ok(halt.includes('\n  /\\ adapter_state\' = "Halted"\n  /\\ UNCHANGED <<adapter_held, adapter_sent_mint, token_state, token_supply>>\n'));
  });

  it('writes the chain\'s tick for every member at once, standing still for a member without a tick', () => {
    assert.ok(composed.tla.includes('\nadapter_Tick == \\/ (adapter_state = "Open" /\\ (adapter_held > 0) /\\ adapter_state\' = adapter_state /\\ adapter_held\' = (adapter_held - 1) /\\ UNCHANGED <<adapter_sent_mint>>)\n            \\/ (~(Can_adapter_M3_Tick) /\\ UNCHANGED <<adapter_state, adapter_held, adapter_sent_mint>>)\n'));
    assert.ok(composed.tla.includes('\nTick == adapter_Tick /\\ UNCHANGED <<token_state, token_supply>> /\\ (n1_ticks\' = IF (adapter_held\' = 0) THEN 0 ELSE IF ~(((adapter_state\' = "Open"))) THEN 0 ELSE (IF n1_ticks > 2 THEN n1_ticks ELSE n1_ticks + 1)) /\\ (w1_at\' = 0)\n'), 'W1 takes no tick, so the tick resets its observer');
    assert.ok(composed.tla.includes('\nTickStep == (Mode_chain /= "offline") /\\ Tick /\\ ~Due_user\n'));
    assert.ok(composed.tla.includes('\nDue_user == (Mode_user = "honest") /\\ (Can_adapter_M1_Exit)   \\* supply.G2 adapter.G1: acts before the next tick\n'));
    assert.ok(indexOf(composed.tla, '\nHonestUser_adapter_Exit ==') < indexOf(composed.tla, '\nDue_user =='));
  });

  it('gates every actor by its mode, leaves a part sender without one, and writes fairness for the honest actors of the Givens', () => {
    assert.ok(composed.tla.includes('\nBreaker == (Mode_breaker /= "offline") /\\ (adapter_M2_Halt)\nHonestBreaker == (Mode_breaker = "honest") /\\ Breaker\nUser == (Mode_user /= "offline") /\\ (adapter_M1_Exit)\nHonestUser == (Mode_user = "honest") /\\ User\nHonestUser_adapter_Exit == (Mode_user = "honest") /\\ (adapter_M1_Exit)   \\* on adapter.exit\n'));
    assert.ok(composed.tla.includes('\nAdapter == token_M2_Burn   \\* sends left free\n'));
    assert.ok(!composed.tla.includes('Mode_adapter'));
    assert.ok(composed.tla.includes('\nNext == TickStep \\/ Breaker \\/ User \\/ Adapter\n'));
    assert.ok(composed.tla.includes('\nSpec == Init /\\ [][Next]_vars\n        /\\ WF_vars(HonestBreaker)        \\* from supply.G1\n        /\\ WF_vars(HonestUser_adapter_Exit)        \\* from supply.G2 adapter.G1\n\n'));
  });

  it('translates the properties through mapRef: data to prefixed variables, states to predicates', () => {
    assert.ok(composed.tla.includes('\nTypeOK ==\n  /\\ adapter_state \\in {"Open", "Halted"}\n  /\\ adapter_held \\in 0..2\n  /\\ adapter_sent_mint \\in Nat\n  /\\ token_state \\in {"Live"}\n  /\\ token_supply \\in 0..4\n  /\\ n1_ticks \\in Nat\n  /\\ w1_at \\in 0..2\nSentBounded == adapter_sent_mint <= MaxSent\n'));
    assert.ok(composed.tla.includes('\nA1 == (token_supply = adapter_held)\n'));
    assert.ok(composed.tla.includes('\nA2 == ((adapter_state = "Open") \\/ (adapter_state = "Halted"))\n'));
    assert.ok(composed.tla.includes('\nO1 == ((adapter_state = "Open")) ~> ((adapter_state = "Halted"))      \\* given G1\n'));
    assert.ok(composed.tla.includes('\nN1 == n1_ticks <= 2      \\* given G2\n'));
    assert.ok(composed.tla.includes('\nInv_A1 == TypeOK /\\ A1\nInv_A2 == TypeOK /\\ A2\nInv_N1 == TypeOK /\\ N1\nW1_End == w1_at = 2 /\\ W1_Refused3 /\\ (adapter_state = "Halted")\nNotW1 == ~W1_End\n' + '='.repeat(70) + '\n'), 'the refused exit after the last step taken is checked at the end');
    assert.ok(composed.tla.includes('\nW1_Refused3 == ~((\\E amount \\in 1..2 : amount = 1 /\\ adapter_state = "Open" /\\ ((adapter_held + amount) <= 2) /\\ ((token_state = "Live" /\\ ((token_supply + amount) <= 4)))))\n'), 'with its argument, and its wired target, inside its own quantifier');
  });

  it('writes one cfg per claimed cell with INVARIANTS or PROPERTIES', () => {
    assert.deepEqual(composed.cells.map(c => `${c.property}|${c.scenario}|${c.cfg}|${c.kind}|${c.cinit}`), [
      'A1|all-honest|A1_all_honest.cfg|invariant|ConstInit_all_honest',
      'A1|user-malicious|A1_user_malicious.cfg|invariant|ConstInit_user_malicious',
      'A2|all-honest|A2_all_honest.cfg|invariant|ConstInit_all_honest',
      'A2|breaker-offline|A2_breaker_offline.cfg|invariant|ConstInit_breaker_offline',
      'O1|all-honest|O1_all_honest.cfg|property|ConstInit_all_honest',
      'N1|all-honest|N1_all_honest.cfg|invariant|ConstInit_all_honest',
      'N1|breaker-offline|N1_breaker_offline.cfg|invariant|ConstInit_breaker_offline',
    ]);
    assert.equal(composed.cfgs['A1_user_malicious.cfg'], 'SPECIFICATION Spec\nCONSTANT MaxSent = 4\nCONSTANT Mode_breaker = "honest"\nCONSTANT Mode_chain = "honest"\nCONSTANT Mode_user = "malicious"\nCONSTRAINT SentBounded\nCHECK_DEADLOCK FALSE\nINVARIANTS TypeOK A1\n');
    assert.equal(composed.cfgs['O1_all_honest.cfg'], 'SPECIFICATION Spec\nCONSTANT MaxSent = 4\nCONSTANT Mode_breaker = "honest"\nCONSTANT Mode_chain = "honest"\nCONSTANT Mode_user = "honest"\nCONSTRAINT SentBounded\nCHECK_DEADLOCK FALSE\nPROPERTIES O1\n');
    assert.ok(composed.cfgs['A2_breaker_offline.cfg'].includes('CONSTANT Mode_breaker = "offline"\n'));
  });

  it('reports an unknown member, unknown wiring, an undeclared sender and an unknown scenario', () => {
    const ghost = composeMembers({ name: 'supply', prose, wiring: { ...wiring, members: [...wiring.members, { part: 'ghost', role: 'member', pins: [] }] }, members, actors });
    assert.ok(ghost.errors.includes('wiring names part ghost, which has no dossier or does not compile'));
    const badWiring = composeMembers({ name: 'supply', prose, wiring: { ...wiring, wiring: [{ effect: { part: 'adapter', name: 'nothing' }, event: { part: 'token', name: 'nobody' } }, { effect: { part: 'vault', name: 'x' }, event: { part: 'token', name: 'mint' } }] }, members, actors });
    assert.ok(badWiring.errors.includes('wiring names effect adapter.nothing, which adapter does not send'));
    assert.ok(badWiring.errors.includes('wiring names event token.nobody, which token does not receive'));
    assert.ok(badWiring.errors.includes('wiring names vault, which is not a member'));
    const sender = composeMembers({ name: 'supply', prose, wiring, members: { ...members, token: irOf(TOKEN.replaceAll('from the Adapter', 'from the Ghost')) }, actors });
    assert.ok(sender.errors.includes('token: event mint comes from "the Ghost", which is neither an actor in actors.md nor a part'));
    assert.ok(sender.errors.includes('token: event burn comes from "the Ghost", which is neither an actor in actors.md nor a part'));
    const retired = composeMembers({ name: 'supply', prose, wiring, members: { ...members, token: irOf(TOKEN.replaceAll('from the Adapter', 'from the Ghost')) }, actors, retired: ['ghost'] });
    assert.ok(retired.errors.includes('token: event mint comes from "the Ghost", which is a retired part'));
    const scenario = composeMembers({ name: 'supply', prose: parseCompositionProse(SUPPLY.replace('Scenarios: all-honest, user-malicious.', 'Scenarios: all-honest, nope.')), wiring, members, actors });
    assert.ok(scenario.errors.includes('A1 claims scenario "nope", which scenarios.md does not declare'));
    assert.equal(scenario.cells.some(c => c.scenario === 'nope'), false);
    const unknownRef = composeMembers({ name: 'supply', prose: parseCompositionProse(SUPPLY.replace('{token.supply = adapter.held}', '{token.supply = vault.debt + adapter.nothing}')), wiring, members, actors });
    assert.ok(unknownRef.errors.includes('"vault.debt" names vault, which is not a member'));
    assert.ok(unknownRef.errors.includes('"adapter.nothing": adapter holds no data or state named nothing'));
    const given = composeMembers({ name: 'supply', prose: parseCompositionProse(SUPPLY.replace('Actor: the Breaker.', 'Actor: the Pope.')), wiring, members, actors });
    assert.ok(given.errors.includes('supply G1: actor "the Pope" is not declared in actors.md'));
  });

  it('reports a member that does not compile once, and nothing that names it, while a part that is no member is still reported', () => {
    const p = parseCompositionProse(SUPPLY
      .replace('[A2] Always, {adapter.Open or adapter.Halted}.', '[A2] Always, {adapter.Open or adapter.Halted or ghost.level = 0 or vault.debt = 0}.')
      .replace('Actor: the Breaker.', 'Actor: the Breaker, on ghost.stop.')
      .replace('adapter.halt, adapter.exit amount 1 refused', 'adapter.halt, ghost.post, adapter.exit amount 1 refused'));
    assert.deepEqual(p.errors, []);
    const ghostly = composeMembers({
      name: 'supply', prose: p, members, actors,
      wiring: {
        ...wiring,
        members: [...wiring.members, { part: 'ghost', role: 'member', pins: [] }],
        wiring: [...wiring.wiring, { effect: { part: 'ghost', name: 'out' }, event: { part: 'token', name: 'burn' } }, { effect: { part: 'adapter', name: 'mint' }, event: { part: 'ghost', name: 'mint' } }],
        free: ['ghost.post', 'token.burn'],
      },
    });
    assert.deepEqual(ghostly.errors, ['wiring names part ghost, which has no dossier or does not compile', '"vault.debt" names vault, which is not a member'], 'no wiring, free:, condition, Given or walk error about ghost');
  });

  it('acknowledges a free send declared under free:', () => {
    const declared = composeMembers({ name: 'supply', prose, wiring: { ...wiring, free: ['token.burn'] }, members, actors });
    assert.deepEqual(declared.errors, []);
    assert.deepEqual(declared.free, [{ event: 'token.burn', from: 'adapter', declared: true }]);
  });

  it('reports a free: entry that names an unknown event, a wired event or an event no member sends', () => {
    const bad = composeMembers({ name: 'supply', prose, wiring: { ...wiring, free: ['token.nothing', 'token.mint', 'adapter.exit'] }, members, actors });
    assert.ok(bad.errors.includes('free: names token.nothing, which no member receives'));
    assert.ok(bad.errors.includes('free: names token.mint, which is wired'));
    assert.ok(bad.errors.includes('free: names adapter.exit, which no member sends'));
  });

  it('names a part outside the wiring and leaves its sends free', () => {
    const alone = composeMembers({ name: 'supply', prose: parseCompositionProse('# Supply\nConcern: supply\n\nThe token alone.\n\n## Always\n[A1] Always, {token.supply <= 4}.\n\n## Words only\n[T1] Nothing more.\n'), wiring: { ...wiring, members: [{ part: 'token', role: 'member', pins: [] }], wiring: [] }, members, actors, parts: ['adapter', 'token'] });
    assert.deepEqual(alone.errors, []);
    assert.deepEqual(alone.outside, [{ from: 'adapter', events: ['token.mint', 'token.burn'] }]);
    assert.deepEqual(alone.free, []);
    assert.ok(alone.tla.includes('\nAdapter == token_M1_Mint \\/ token_M2_Burn   \\* outside the wiring\n'));
  });

  it('reports a composition Given naming an event its actor does not send, and a Given naming a part', () => {
    const notSent = composeMembers({ name: 'supply', prose: parseCompositionProse(SUPPLY.replace('Actor: the Breaker.', 'Actor: the Breaker, on adapter.exit, prompt.')), wiring, members, actors });
    assert.ok(notSent.errors.includes('supply G1 names event adapter.exit, which the Breaker does not send'));
    const unknown = composeMembers({ name: 'supply', prose: parseCompositionProse(SUPPLY.replace('Actor: the Breaker.', 'Actor: the Breaker, on adapter.nothing.')), wiring, members, actors });
    assert.ok(unknown.errors.includes('supply G1 names event adapter.nothing, which no member receives'));
    const part = composeMembers({ name: 'supply', prose: parseCompositionProse(SUPPLY.replace('Actor: the Breaker.', 'Actor: the Adapter.')), wiring, members, actors });
    assert.ok(part.errors.includes('supply G1: names "the Adapter", which is a part; a rely on a part is a Guarantee or a wiring'));
  });

  it('restricts an actor\'s moves by a composition Given\'s only when, while the actor is honest, and adds no fairness for it', () => {
    const text = SUPPLY.replace('\n\n## Walks', '\n[G3] Given that the user exits small amounts. If this is false, A1 is at risk. Actor: the user, on adapter.exit, only when {amount <= 1}.\n\n## Walks');
    const p = parseCompositionProse(text);
    assert.deepEqual(p.errors, []);
    const restricted = composeMembers({ name: 'supply', prose: p, wiring, members, actors });
    assert.deepEqual(restricted.errors, []);
    const exit = block(restricted.tla, 'adapter_M1_Exit');
    assert.ok(exit.includes('\n    /\\ ((adapter_held + amount) <= 2)\n    /\\ (Mode_user /= "honest" \\/ (amount <= 1))   \\* supply.G3\n    /\\ adapter_state\' = adapter_state\n'));
    assert.ok(restricted.tla.includes('\nCan_adapter_M1_Exit == \\E amount \\in 1..2 : adapter_state = "Open" /\\ ((adapter_held + amount) <= 2) /\\ ((token_state = "Live" /\\ ((token_supply + amount) <= 4))) /\\ (Mode_user /= "honest" \\/ (amount <= 1))\n'));
    assert.ok(restricted.tla.includes('\n        /\\ WF_vars(HonestUser_adapter_Exit)        \\* from supply.G2 adapter.G1\n'), 'only when adds no fairness');
  });

  it('claims the wiring\'s default scenarios for a property without a Scenarios sentence, and all-honest when none are declared', () => {
    const none = composeMembers({ name: 'supply', prose, wiring: { ...wiring, scenarios: [] }, members, actors });
    assert.deepEqual(none.cells.filter(c => c.property === 'A2').map(c => c.scenario), ['all-honest']);
  });

  it('writes a ConstInit for all-honest even when no cell or walk claims it, and none for a scenario none claims', () => {
    const only = composeMembers({ name: 'supply', prose: parseCompositionProse(SUPPLY.replace('Scenarios: all-honest, user-malicious.', 'Scenarios: breaker-offline.').replace('Scenarios: all-honest.', 'Scenarios: breaker-offline.').replace('Walk Exit under all-honest', 'Walk Exit under breaker-offline')), wiring: { ...wiring, scenarios: ['breaker-offline'] }, members, actors });
    assert.deepEqual(only.errors, []);
    assert.deepEqual(only.tla.match(/^ConstInit_\w+/gm), ['ConstInit_all_honest', 'ConstInit_breaker_offline']);
    assert.deepEqual([...new Set(only.cells.map(c => c.scenario))], ['breaker-offline']);
  });

  it('adds no clock, no window constants and no starts for windows and starts no cell claims', () => {
    for (const name of ['clock', 'From_', 'Until_', 'ModeNow_', 'Start_']) assert.ok(!composed.tla.includes(name), name);
    assert.ok(composed.tla.includes('\nEXTENDS Naturals\n'));
    assert.ok(!Object.values(composed.cfgs).some(cfg => /From_|Until_|Start_/.test(cfg)));
  });

  describe('with a window in a claimed scenario', () => {
    // user-away: the user offline from tick 1 until tick 3, the chain offline from tick 2 on.
    let w: Composed;
    before(() => {
      const p = parseCompositionProse(SUPPLY.replace('Scenarios: all-honest, user-malicious.', 'Scenarios: all-honest, user-away.').replace('\n\n## Walks', '\n[G3] Given that the chain keeps ticking. If this is false, nothing moves. Actor: the chain.\n[G4] Given that the user exits small amounts. If this is false, A1 is at risk. Actor: the user, on adapter.exit, only when {amount <= 1}.\n\n## Walks'));
      assert.deepEqual(p.errors, []);
      w = composeMembers({ name: 'supply', prose: p, wiring, members, actors });
      assert.deepEqual(w.errors, []);
    });

    it('declares From_ and Until_ after the modes for each actor with a window, and keeps Naturals, with 0 for no end', () => {
      assert.ok(w.tla.includes('\nEXTENDS Naturals\n'));
      assert.ok(w.tla.includes('\nCONSTANTS\n  \\* @type: Int;\n  MaxSent,\n  \\* @type: Str;\n  Mode_breaker,\n  \\* @type: Str;\n  Mode_chain,\n  \\* @type: Str;\n  Mode_user,\n  \\* @type: Int;\n  From_chain,\n  \\* @type: Int;\n  Until_chain,\n  \\* @type: Int;\n  From_user,\n  \\* @type: Int;\n  Until_user\n'));
      assert.ok(!w.tla.includes('From_breaker'), 'an actor without a window has no window constants');
    });

    it('sets each window in the ConstInit of every claimed scenario and all-honest: from 0 and until 0, no end, where the scenario gives none', () => {
      assert.ok(w.tla.includes('\n  Until_user\n'
        + 'ConstInit_all_honest == MaxSent = 4 /\\ Mode_breaker = "honest" /\\ Mode_chain = "honest" /\\ Mode_user = "honest" /\\ From_chain = 0 /\\ Until_chain = 0 /\\ From_user = 0 /\\ Until_user = 0\n'
        + 'ConstInit_breaker_offline == MaxSent = 4 /\\ Mode_breaker = "offline" /\\ Mode_chain = "honest" /\\ Mode_user = "honest" /\\ From_chain = 0 /\\ Until_chain = 0 /\\ From_user = 0 /\\ Until_user = 0\n'
        + 'ConstInit_user_away == MaxSent = 4 /\\ Mode_breaker = "honest" /\\ Mode_chain = "offline" /\\ Mode_user = "offline" /\\ From_chain = 2 /\\ Until_chain = 0 /\\ From_user = 1 /\\ Until_user = 3\n\nVARIABLES\n'));
    });

    it('adds the clock as the last variable, after the walk observers, from 0, within 0..MaxClock, and leaves it unchanged in every action but the tick', () => {
      assert.deepEqual(w.vars, ['adapter_state', 'adapter_held', 'adapter_sent_mint', 'token_state', 'token_supply', 'n1_ticks', 'w1_at', 'clock']);
      assert.ok(w.tla.includes('\n  \\* @type: Int;\n  n1_ticks,\n  \\* @type: Int;\n  w1_at,\n  \\* @type: Int;\n  clock\nvars == <<adapter_state, adapter_held, adapter_sent_mint, token_state, token_supply, n1_ticks, w1_at, clock>>\n'));
      assert.ok(w.tla.includes('\n  /\\ n1_ticks = 0\n  /\\ w1_at = 0\n  /\\ clock = 0\n\n'));
      assert.ok(w.tla.includes('\n  /\\ n1_ticks \\in Nat\n  /\\ w1_at \\in 0..2\n  /\\ clock \\in 0..3\nSentBounded == '));
      assert.ok(block(w.tla, 'adapter_M1_Exit').includes('\n    /\\ UNCHANGED <<clock>>\n    /\\ n1_ticks\' = '));
      assert.ok(block(w.tla, 'adapter_M2_Halt').includes('\n  /\\ UNCHANGED <<adapter_held, adapter_sent_mint, token_state, token_supply, clock>>\n'));
      assert.ok(block(w.tla, 'token_M2_Burn').includes('\n    /\\ UNCHANGED <<adapter_state, adapter_held, adapter_sent_mint, clock>>\n'));
    });

    it('advances the clock at the end of Tick, after the ghosts and the walk observers, and holds it at MaxClock, the last bound a claimed window names', () => {
      assert.ok(w.tla.includes('\nTick == adapter_Tick /\\ UNCHANGED <<token_state, token_supply>> /\\ (n1_ticks\' = IF (adapter_held\' = 0) THEN 0 ELSE IF ~(((adapter_state\' = "Open"))) THEN 0 ELSE (IF n1_ticks > 2 THEN n1_ticks ELSE n1_ticks + 1)) /\\ (w1_at\' = 0) /\\ (clock\' = IF clock < 3 THEN clock + 1 ELSE clock)\n'));
      assert.ok(!w.tla.split('\n').some(l => (l.startsWith('Can_') || l.startsWith('adapter_Tick')) && l.includes('clock')), 'Can_ and the member ticks do not mention the clock');
      assert.ok(block(w.tla, 'adapter_M1_Exit').includes('(token_state = "Live" /\\ ((token_supply + amount) <= 4) /\\ token_state\' = token_state /\\ token_supply\' = (token_supply + amount))\n'), 'nor does a wired target');
    });

    it('writes ModeNow_ for each actor with a window and tests its mode through it everywhere', () => {
      assert.ok(w.tla.includes('\nvars == <<adapter_state, adapter_held, adapter_sent_mint, token_state, token_supply, n1_ticks, w1_at, clock>>\n\n\\* The mode of an actor with a window, honest outside it.\n'
        + 'ModeNow_chain == IF clock >= From_chain /\\ (Until_chain = 0 \\/ clock < Until_chain) THEN Mode_chain ELSE "honest"\n'
        + 'ModeNow_user == IF clock >= From_user /\\ (Until_user = 0 \\/ clock < Until_user) THEN Mode_user ELSE "honest"\n\nInit ==\n'));
      assert.ok(w.tla.includes('\nBreaker == (Mode_breaker /= "offline") /\\ (adapter_M2_Halt)\nHonestBreaker == (Mode_breaker = "honest") /\\ Breaker\n'
        + 'User == (ModeNow_user /= "offline") /\\ (adapter_M1_Exit)\nHonestUser == (ModeNow_user = "honest") /\\ User\nHonestUser_adapter_Exit == (ModeNow_user = "honest") /\\ (adapter_M1_Exit)   \\* on adapter.exit\n'
        + 'Due_user == (ModeNow_user = "honest") /\\ (Can_adapter_M1_Exit)   \\* supply.G2 adapter.G1: acts before the next tick\n'));
      assert.ok(w.tla.includes('\nTickStep == (ModeNow_chain /= "offline") /\\ Tick /\\ ~Due_user\n'));
      assert.ok(w.tla.includes('\n        /\\ WF_vars((ModeNow_chain = "honest") /\\ TickStep)        \\* from supply.G3\n'));
      assert.ok(block(w.tla, 'adapter_M1_Exit').includes('\n    /\\ (ModeNow_user /= "honest" \\/ (amount <= 1))   \\* supply.G4\n'));
      assert.ok(w.tla.includes('\nCan_adapter_M1_Exit == \\E amount \\in 1..2 : adapter_state = "Open" /\\ ((adapter_held + amount) <= 2) /\\ ((token_state = "Live" /\\ ((token_supply + amount) <= 4))) /\\ (ModeNow_user /= "honest" \\/ (amount <= 1))\n'));
      assert.ok(!w.tla.includes('ModeNow_breaker'), 'an actor without a window keeps Mode_');
    });

    it('sets From_ and Until_ after the modes in each cell\'s cfg', () => {
      assert.equal(w.cfgs['A1_user_away.cfg'], 'SPECIFICATION Spec\nCONSTANT MaxSent = 4\nCONSTANT Mode_breaker = "honest"\nCONSTANT Mode_chain = "offline"\nCONSTANT Mode_user = "offline"\nCONSTANT From_chain = 2\nCONSTANT Until_chain = 0\nCONSTANT From_user = 1\nCONSTANT Until_user = 3\nCONSTRAINT SentBounded\nCHECK_DEADLOCK FALSE\nINVARIANTS TypeOK A1\n');
      assert.ok(w.cfgs['A2_all_honest.cfg'].includes('\nCONSTANT Mode_user = "honest"\nCONSTANT From_chain = 0\nCONSTANT Until_chain = 0\nCONSTANT From_user = 0\nCONSTANT Until_user = 0\nCONSTRAINT SentBounded\n'));
      assert.deepEqual(reachValues(parseCfg(w.cfgs['A1_user_away.cfg']).constants), { MaxSent: 4, Mode_chain: 'offline', Mode_breaker: 'honest', Mode_user: 'offline', From_chain: 2, Until_chain: 0, From_user: 1, Until_user: 3 });
    });
  });

  describe('with a start in a claimed scenario', () => {
    // halted-full starts adapter.state, adapter.held and token.supply; paused starts adapter.paused and adapter.level.
    const JOIN_DATA = ADAPTER.replace('It holds held, a count from 0 to 2.', 'It holds held, a count from 0 to 2. It holds paused, a flag. It holds level, one of Low, Mid or High.');
    const started = { ...members, adapter: irOf(JOIN_DATA) };
    let s: Composed;
    before(() => {
      s = composeMembers({ name: 'supply', prose: parseCompositionProse(SUPPLY.replace('Scenarios: all-honest, user-malicious.', 'Scenarios: all-honest, halted-full, paused.')), wiring, members: started, actors: actorsWith('start-claimed', PAUSED) });
      assert.deepEqual(s.errors, []);
    });

    it('declares a Start_ constant after the modes for each state or datum a claimed scenario starts, typed by the datum, in the order of the variables', () => {
      assert.ok(s.tla.includes('\n  Mode_user,\n  \\* @type: Str;\n  Start_adapter_state,\n  \\* @type: Int;\n  Start_adapter_held,\n  \\* @type: Bool;\n  Start_adapter_paused,\n  \\* @type: Str;\n  Start_adapter_level,\n  \\* @type: Int;\n  Start_token_supply\nConstInit_all_honest == '));
      assert.ok(!s.tla.includes('Start_token_state') && !s.tla.includes('Start_adapter_sent_mint'), 'nothing for what no scenario starts');
      assert.ok(s.tla.includes('\nEXTENDS Naturals\n'), 'a start needs no clock');
    });

    it('begins Init from the Start_ constants, and from the boundary\'s values for the rest', () => {
      assert.ok(s.tla.includes('\nInit ==\n  /\\ adapter_state = Start_adapter_state\n  /\\ adapter_held = Start_adapter_held\n  /\\ adapter_paused = Start_adapter_paused\n  /\\ adapter_level = Start_adapter_level\n  /\\ adapter_sent_mint = 0\n  /\\ token_state = "Live"\n  /\\ token_supply = Start_token_supply\n  /\\ n1_ticks = 0\n  /\\ w1_at = 0\n\n'));
    });

    it('sets every Start_ in each ConstInit: the scenario\'s value, or the boundary\'s starting value where the scenario has none', () => {
      assert.ok(s.tla.includes('\nConstInit_all_honest == MaxSent = 4 /\\ Mode_breaker = "honest" /\\ Mode_chain = "honest" /\\ Mode_user = "honest" /\\ Start_adapter_state = "Open" /\\ Start_adapter_held = 0 /\\ Start_adapter_paused = FALSE /\\ Start_adapter_level = "Low" /\\ Start_token_supply = 0\n'));
      assert.ok(s.tla.includes('\nConstInit_halted_full == MaxSent = 4 /\\ Mode_breaker = "honest" /\\ Mode_chain = "honest" /\\ Mode_user = "honest" /\\ Start_adapter_state = "Halted" /\\ Start_adapter_held = 2 /\\ Start_adapter_paused = FALSE /\\ Start_adapter_level = "Low" /\\ Start_token_supply = 2\n'));
      assert.ok(s.tla.includes('\nConstInit_paused == MaxSent = 4 /\\ Mode_breaker = "honest" /\\ Mode_chain = "honest" /\\ Mode_user = "honest" /\\ Start_adapter_state = "Open" /\\ Start_adapter_held = 0 /\\ Start_adapter_paused = TRUE /\\ Start_adapter_level = "High" /\\ Start_token_supply = 0\n'));
      assert.deepEqual(s.tla.match(/^ConstInit_\w+/gm), ['ConstInit_all_honest', 'ConstInit_breaker_offline', 'ConstInit_halted_full', 'ConstInit_paused']);
    });

    it('sets the Start_ constants in each cell\'s cfg as TLA+ literals', () => {
      assert.equal(s.cfgs['A1_halted_full.cfg'], 'SPECIFICATION Spec\nCONSTANT MaxSent = 4\nCONSTANT Mode_breaker = "honest"\nCONSTANT Mode_chain = "honest"\nCONSTANT Mode_user = "honest"\nCONSTANT Start_adapter_state = "Halted"\nCONSTANT Start_adapter_held = 2\nCONSTANT Start_adapter_paused = FALSE\nCONSTANT Start_adapter_level = "Low"\nCONSTANT Start_token_supply = 2\nCONSTRAINT SentBounded\nCHECK_DEADLOCK FALSE\nINVARIANTS TypeOK A1\n');
      assert.ok(s.cfgs['A1_paused.cfg'].includes('\nCONSTANT Start_adapter_state = "Open"\nCONSTANT Start_adapter_held = 0\nCONSTANT Start_adapter_paused = TRUE\nCONSTANT Start_adapter_level = "High"\nCONSTANT Start_token_supply = 0\nCONSTRAINT SentBounded\n'));
    });

    it('reports a start naming no part, a datum the member does not hold or a value outside its range, ignores another composition\'s part, and sets nothing it cannot read', () => {
      const bad = composeMembers({
        name: 'supply', prose: parseCompositionProse(SUPPLY.replace('Scenarios: all-honest, user-malicious.', 'Scenarios: all-honest, bad-start.')), wiring, members: started, parts: ['adapter', 'token', 'vault'],
        actors: actorsWith('start-errors', '  - id: bad-start\n    start: { ghost.level: 1, vault.debt: 1, adapter.nothing: 1, adapter.sent_mint: 1, adapter.held: 3, adapter.paused: maybe, adapter.level: Top, adapter.state: Closed }\n'),
      });
      assert.deepEqual(bad.errors, [
        'start: bad-start starts ghost.level, which names no part',
        'start: bad-start starts adapter.nothing, which adapter does not hold',
        'start: bad-start starts adapter.sent_mint, which adapter does not hold',
        'start: bad-start starts adapter.held at 3, outside 0..2',
        'start: bad-start starts adapter.paused at maybe, not a flag value',
        'start: bad-start starts adapter.level at Top, not one of Low, Mid or High',
        'start: bad-start starts adapter.state at Closed, not a state of adapter',
      ]);
      assert.ok(!bad.tla.includes('Start_'));
    });

    it('reads the start of every declared scenario against the members, claimed or not, and makes constants only of a claimed one\'s', () => {
      const unclaimed = composeMembers({
        name: 'supply', prose: parseCompositionProse(SUPPLY), wiring, members, parts: ['adapter', 'token', 'vault'],
        actors: actorsWith('start-unclaimed', `${PAUSED}  - id: bad-start\n    start: { ghost.level: 1, vault.debt: 1, adapter.held: 3, token.supply: 4 }\n`),
      });
      assert.deepEqual(unclaimed.errors, [
        'start: paused starts adapter.paused, which adapter does not hold',
        'start: paused starts adapter.level, which adapter does not hold',
        'start: bad-start starts ghost.level, which names no part',
        'start: bad-start starts adapter.held at 3, outside 0..2',
      ], 'halted-full reads; vault is another composition\'s');
      assert.ok(!unclaimed.tla.includes('Start_'), 'no cell or walk claims halted-full, paused or bad-start');
      assert.deepEqual(unclaimed.tla.match(/^ConstInit_\w+/gm), ['ConstInit_all_honest', 'ConstInit_user_malicious', 'ConstInit_breaker_offline']);
    });
  });

  describe('with walks', () => {
    // W1 exits, takes a tick and is halted, under a scenario no cell claims; W2 is a free send, under all-honest.
    const WALKS = SUPPLY.replace('[W1] Walk Exit under all-honest: from adapter.Open, adapter.exit amount 1, adapter.halt, adapter.exit amount 1 refused; ends adapter.Halted.',
      '[W1] Walk Drain under user-greedy: from adapter.Open, adapter.exit amount 2, adapter.tick, adapter.exit amount 2 refused, adapter.halt; ends adapter.Halted.\n[W2] Walk Burn: from token.Live, token.burn amount {adapter.held}; ends token.Live.');
    let w: Composed;
    before(() => {
      const p = parseCompositionProse(WALKS);
      assert.deepEqual(p.errors, []);
      w = composeMembers({ name: 'supply', prose: p, wiring, members, actors: actorsWith('walks', '  - id: user-greedy\n    modes: { user: malicious }\n') });
      assert.deepEqual(w.errors, []);
    });

    it('observes each walk in a variable after the ghosts, from 0, up to the number of steps not refused', () => {
      assert.deepEqual(w.vars, ['adapter_state', 'adapter_held', 'adapter_sent_mint', 'token_state', 'token_supply', 'n1_ticks', 'w1_at', 'w2_at']);
      assert.ok(w.tla.includes('\n  \\* @type: Int;\n  w1_at,\n  \\* @type: Int;\n  w2_at\nvars == '));
      assert.ok(w.tla.includes('\n  /\\ n1_ticks = 0\n  /\\ w1_at = 0\n  /\\ w2_at = 0\n\n'));
      assert.ok(w.tla.includes('\n  /\\ n1_ticks \\in Nat\n  /\\ w1_at \\in 0..3\n  /\\ w2_at \\in 0..1\nSentBounded == '), 'the refused exit is not a step the observer counts');
    });

    it('arms an observer on its first step taken from the walk\'s start, advances it in the free-standing action of its next step, with the step\'s arguments, and resets it in every other action', () => {
      assert.deepEqual(lines(block(w.tla, 'adapter_M1_Exit')).slice(-3), [
        '    /\\ n1_ticks\' = IF (adapter_held\' = 0) THEN 0 ELSE IF ~(((adapter_state\' = "Open"))) THEN 0 ELSE n1_ticks',
        '    /\\ w1_at\' = IF (adapter_state = "Open") /\\ amount = 2 THEN 1 ELSE 0',
        '    /\\ w2_at\' = 0',
      ]);
      assert.ok(block(w.tla, 'adapter_M2_Halt').includes('\n  /\\ UNCHANGED <<adapter_held, adapter_sent_mint, token_state, token_supply>>\n  /\\ n1_ticks\' = IF (adapter_held\' = 0) THEN 0 ELSE IF ~(((adapter_state\' = "Open"))) THEN 0 ELSE n1_ticks\n  /\\ w1_at\' = IF w1_at = 2 /\\ W1_Refused3 THEN 3 ELSE 0\n  /\\ w2_at\' = 0'), 'the refused exit is checked where the walk refuses it, before the halt; the observers are their own conjuncts after the ghost, never UNCHANGED');
      assert.ok(block(w.tla, 'token_M2_Burn').endsWith('\n    /\\ w1_at\' = 0\n    /\\ w2_at\' = IF (token_state = "Live") /\\ amount = adapter_held THEN 1 ELSE 0'), 'an argument may name member data');
    });

    it('takes a step on the chain\'s tick in Tick, when the member takes a move of it', () => {
      assert.ok(w.tla.includes('\nTick == adapter_Tick /\\ UNCHANGED <<token_state, token_supply>> /\\ (n1_ticks\' = IF (adapter_held\' = 0) THEN 0 ELSE IF ~(((adapter_state\' = "Open"))) THEN 0 ELSE (IF n1_ticks > 2 THEN n1_ticks ELSE n1_ticks + 1)) /\\ (w1_at\' = IF w1_at = 1 /\\ (Can_adapter_M3_Tick) THEN 2 ELSE 0) /\\ (w2_at\' = 0)\n'));
      assert.ok(indexOf(w.tla, '\nCan_adapter_M3_Tick ==') < indexOf(w.tla, '\nTick =='));
    });

    it('ends a walk once its observer has seen every step and the member is in the state it names, and negates the end for the witness', () => {
      assert.ok(w.tla.includes('\nW1_End == w1_at = 3 /\\ (adapter_state = "Halted")\nNotW1 == ~W1_End\nW2_End == w2_at = 1 /\\ (token_state = "Live")\nNotW2 == ~W2_End\n' + '='.repeat(70) + '\n'));
      assert.deepEqual(parseTla(w.tla).properties.filter(n => /W\d/.test(n)), ['W1_End', 'NotW1', 'W2_End', 'NotW2']);
    });

    it('writes one witness configuration per walk under its scenario, all-honest when it names none, with a ConstInit for a scenario only a walk claims', () => {
      assert.deepEqual(w.walks, [{ id: 'W1', scenario: 'user-greedy', cfg: 'W1_user_greedy.cfg' }, { id: 'W2', scenario: 'all-honest', cfg: 'W2_all_honest.cfg' }]);
      assert.equal(w.cfgs['W1_user_greedy.cfg'], 'SPECIFICATION Spec\nCONSTANT MaxSent = 4\nCONSTANT Mode_breaker = "honest"\nCONSTANT Mode_chain = "honest"\nCONSTANT Mode_user = "malicious"\nCONSTRAINT SentBounded\nCHECK_DEADLOCK FALSE\nINVARIANTS TypeOK NotW1\n');
      assert.equal(w.cfgs['W2_all_honest.cfg'], 'SPECIFICATION Spec\nCONSTANT MaxSent = 4\nCONSTANT Mode_breaker = "honest"\nCONSTANT Mode_chain = "honest"\nCONSTANT Mode_user = "honest"\nCONSTRAINT SentBounded\nCHECK_DEADLOCK FALSE\nINVARIANTS TypeOK NotW2\n');
      assert.deepEqual(parseCfg(w.cfgs['W1_user_greedy.cfg']).enabled, ['TypeOK', 'NotW1']);
      assert.deepEqual(w.tla.match(/^ConstInit_\w+/gm), ['ConstInit_all_honest', 'ConstInit_user_malicious', 'ConstInit_breaker_offline', 'ConstInit_user_greedy']);
      assert.ok(w.tla.includes('\nConstInit_user_greedy == MaxSent = 4 /\\ Mode_breaker = "honest" /\\ Mode_chain = "honest" /\\ Mode_user = "malicious"\n'));
      assert.ok(!w.cells.some(c => c.scenario === 'user-greedy'), 'a walk claims no cell');
    });

    it('runs a walk under its scenario\'s window and start', () => {
      const p = parseCompositionProse(SUPPLY.replace('Walk Exit under all-honest', 'Walk Exit under user-away').replace('\n\n## Walks', '\n\n## Walks\n[W2] Walk Full under halted-full: from adapter.Halted, token.burn amount 1; ends token.Live.'));
      const run = composeMembers({ name: 'supply', prose: p, wiring, members, actors });
      assert.deepEqual(run.errors, []);
      assert.ok(run.tla.includes('\nModeNow_user == '), 'user-away\'s window, claimed by W1 alone, gives the user a clock');
      assert.ok(run.cfgs['W1_user_away.cfg'].includes('\nCONSTANT Mode_user = "offline"\nCONSTANT From_chain = 2\nCONSTANT Until_chain = 0\nCONSTANT From_user = 1\nCONSTANT Until_user = 3\n'));
      assert.ok(run.cfgs['W2_halted_full.cfg'].includes('\nCONSTANT Start_adapter_state = "Halted"\nCONSTANT Start_adapter_held = 2\nCONSTANT Start_token_supply = 2\n'));
    });

    it('reports a step on an event reached through wiring, on an event its member does not receive, on a part that is no member, a field or value the event does not carry, and an undeclared scenario', () => {
      const bad = composeMembers({ name: 'supply', prose: parseCompositionProse(SUPPLY.replace('[W1] Walk Exit under all-honest: from adapter.Open, adapter.exit amount 1, adapter.halt, adapter.exit amount 1 refused; ends adapter.Halted.', '[W1] Walk Wrong under nope: from adapter.Open, token.mint amount 1, adapter.nothing, vault.change, adapter.exit speed 2, adapter.exit amount lots; ends adapter.Halted.')), wiring, members, actors });
      assert.deepEqual(bad.errors, [
        'W1 steps on token.mint, which is reached through wiring',
        'W1 steps on adapter.nothing, which adapter does not receive',
        'W1 steps on vault.change, but vault is not a member',
        'W1: adapter.exit carries no field "speed"',
        'W1: "lots" in the step adapter.exit is neither member data nor a value of amount',
        'W1 names scenario "nope", which scenarios.md does not declare',
      ]);
      assert.deepEqual(bad.walks, []);
      assert.ok(!Object.keys(bad.cfgs).some(n => n.startsWith('W1')));
    });
  });

  describe('with the chain\'s tick wired', () => {
    // The clock's tick sends beat, which the meter takes in the same step.
    const CLOCK = '# Clock\n\nIt holds n, a count from 0 to 2. It sends beat to the Meter.\n\n## States\n[S1] Run: running.\n\n## Events\n[E1] tick, from the chain: a block passes.\n\n## Moves\n[M1] When Run receives tick and n is below 2, it stays Run, n grows by one, sends beat.\n[M2] When Run receives tick and n is 2, it stays Run.\n';
    const METER = '# Meter\n\nIt holds count, a count from 0 to 3.\n\n## States\n[S1] Live: counting.\n\n## Events\n[E1] beat, from the Clock: one beat.\n\n## Moves\n[M1] When Live receives beat and count is below 3, it stays Live, count grows by one.\n';
    const BEATS = '# Beats\nConcern: beats\n\nThe meter counts the clock.\n\n## Always\n[A1] Always, {meter.count <= 3}.\n';
    const wiredTick = { members: [{ part: 'clock', role: 'member', pins: [] }, { part: 'meter', role: 'member', pins: [] }], wiring: [{ effect: { part: 'clock', name: 'beat' }, event: { part: 'meter', name: 'beat' } }], free: [], closure: [], scenarios: [], errors: [], text: '' };

    it('conjoins the wired target\'s move in the tick, keeps unchanged what a tick move does not reach, and leaves no member the tick reaches to stand still in Tick', () => {
      const c = composeMembers({ name: 'beats', prose: parseCompositionProse(BEATS), wiring: wiredTick, members: { clock: irOf(CLOCK), meter: irOf(METER) }, actors, parts: ['adapter', 'token'] });
      assert.deepEqual(c.errors, []);
      assert.ok(c.tla.includes('\nclock_Tick == \\/ (clock_state = "Run" /\\ (clock_n < 2) /\\ clock_state\' = clock_state /\\ clock_n\' = (clock_n + 1) /\\ clock_sent_beat\' = clock_sent_beat + 1 /\\ (meter_state = "Live" /\\ (meter_count < 3) /\\ meter_state\' = meter_state /\\ meter_count\' = (meter_count + 1)))\n'
        + '            \\/ (clock_state = "Run" /\\ (clock_n = 2) /\\ clock_state\' = clock_state /\\ UNCHANGED <<clock_n, clock_sent_beat, meter_state, meter_count>>)\n'
        + '            \\/ (~(Can_clock_M1_Tick \\/ Can_clock_M2_Tick) /\\ UNCHANGED <<clock_state, clock_n, clock_sent_beat, meter_state, meter_count>>)\n'));
      assert.ok(c.tla.includes('\nTick == clock_Tick\n'), 'the meter is the clock\'s tick\'s to move or keep');
      assert.ok(c.tla.includes('\nCan_clock_M1_Tick == clock_state = "Run" /\\ (clock_n < 2) /\\ ((meter_state = "Live" /\\ (meter_count < 3)))\n'));
      assert.ok(c.tla.includes('\n\\* meter_M1_Beat is reached through wiring only\n'));
    });

    it('refuses a tick that would move one member twice in a step', () => {
      const both = composeMembers({ name: 'beats', prose: parseCompositionProse(BEATS), wiring: wiredTick, members: { clock: irOf(CLOCK), meter: irOf(METER.replace('[E1] beat, from the Clock: one beat.', '[E1] beat, from the Clock: one beat.\n[E2] tick, from the chain: a block passes.').replace('count grows by one.', 'count grows by one.\n[M2] When Live receives tick, it stays Live, count becomes 0.')) }, actors, parts: ['adapter', 'token'] });
      assert.deepEqual(both.problems, [{ name: 'wiring does not compose', message: 'the chain\'s tick reaches meter through clock and meter; a member takes one move in a step' }]);
    });
  });

  it('binds what a wired effect carries from the source\'s data in Can_, as the action does', () => {
    const VAULT = '# Vault\n\nIt holds amount, a count from 0 to 2. It sends push to the Sink, carrying amount.\n\n## States\n[S1] Open: open.\n\n## Events\n[E1] go, from the user: go.\n\n## Moves\n[M1] When Open receives go, it stays Open, sends push.\n';
    const SINK = '# Sink\n\nIt holds total, a count from 0 to 2.\n\n## States\n[S1] Live: live.\n\n## Events\n[E1] push, from the Vault: pushed. Carries amount, a count from 0 to 2.\n\n## Moves\n[M1] When Live receives push and {total + amount <= 2}, it stays Live, total grows by amount.\n';
    const c = composeMembers({ name: 'push', prose: parseCompositionProse('# Push\nConcern: push\n\n## Always\n[A1] Always, {sink.total <= 2}.\n'), wiring: { members: [{ part: 'vault', role: 'member', pins: [] }, { part: 'sink', role: 'member', pins: [] }], wiring: [{ effect: { part: 'vault', name: 'push' }, event: { part: 'sink', name: 'push' } }], free: [], closure: [], scenarios: [], errors: [], text: '' }, members: { vault: irOf(VAULT), sink: irOf(SINK) }, actors, parts: ['adapter', 'token'] });
    assert.deepEqual(c.errors, []);
    assert.ok(c.tla.includes('\nCan_vault_M1_Go == vault_state = "Open" /\\ ((sink_state = "Live" /\\ ((sink_total + vault_amount) <= 2)))\n'), 'no fresh \\E over amount');
    assert.ok(block(c.tla, 'vault_M1_Go').includes('(sink_state = "Live" /\\ ((sink_total + vault_amount) <= 2) /\\ sink_state\' = sink_state /\\ sink_total\' = (sink_total + vault_amount))'));
  });

  it('restricts the chain\'s tick by an only when on it, in the tick as in its Can_', () => {
    const p = parseCompositionProse(SUPPLY.replace('\n\n## Walks', '\n[G3] Given that the chain ticks only while the adapter holds more than one. If this is false, nothing. Actor: the chain, on adapter.tick, only when {adapter.held > 1}.\n\n## Walks'));
    const c = composeMembers({ name: 'supply', prose: p, wiring, members, actors });
    assert.deepEqual(c.errors, []);
    assert.ok(c.tla.includes('\nadapter_Tick == \\/ (adapter_state = "Open" /\\ (adapter_held > 0) /\\ (Mode_chain /= "honest" \\/ (adapter_held > 1)) /\\ adapter_state\' = adapter_state /\\ adapter_held\' = (adapter_held - 1) /\\ UNCHANGED <<adapter_sent_mint>>)\n'));
    assert.ok(c.tla.includes('\nCan_adapter_M3_Tick == adapter_state = "Open" /\\ (adapter_held > 0) /\\ (Mode_chain /= "honest" \\/ (adapter_held > 1))\n'));
  });

  it('refuses a window in a claimed scenario when no member takes the chain\'s tick, since the clock that opens and closes it never moves', () => {
    const alone = composeMembers({ name: 'supply', prose: parseCompositionProse('# Supply\nConcern: supply\n\nThe token alone.\n\n## Always\n[A1] Always, {token.supply <= 4}. Scenarios: all-honest, user-away.\n'), wiring: { ...wiring, members: [{ part: 'token', role: 'member', pins: [] }], wiring: [] }, members: { token: irOf(TOKEN.replaceAll('from the Adapter', 'from the user')) }, actors, parts: ['adapter', 'token'] });
    assert.deepEqual(alone.problems, [{ name: 'wiring does not compose', message: 'user-away gives user a window, but no member of supply takes the chain\'s tick, so the clock that opens and closes the window never moves' }]);
  });

  it('reads a composition Given naming a part as a rely on the part, even where an actor has the same id', () => {
    const shadow = actorsWith('shadow', '');
    shadow.actors.push({ id: 'adapter', name: 'the Adapter', kind: 'user', modes: ['honest'], pins: [], notes: null });
    shadow.byId.join = shadow.actors[shadow.actors.length - 1];
    const c = composeMembers({ name: 'supply', prose: parseCompositionProse(SUPPLY.replace('Actor: the Breaker.', 'Actor: the Adapter.')), wiring, members, actors: shadow });
    assert.deepEqual(c.problems.filter(x => x.message.startsWith('supply G1')), [{ name: 'Given names a part', message: 'supply G1: names "the Adapter", which is a part; a rely on a part is a Guarantee or a wiring' }]);
  });

  it('says a member is retired where it is, and composes no cell twice for a scenario claimed twice', () => {
    const gone = composeMembers({ name: 'supply', prose, wiring: { ...wiring, members: [...wiring.members, { part: 'ghost', role: 'member', pins: [] }] }, members, actors, retired: ['ghost'] });
    assert.deepEqual(gone.problems, [{ name: 'wiring names unknown part', message: 'wiring names part ghost, which is retired' }]);
    const twice = parseCompositionProse(SUPPLY.replace('Scenarios: all-honest, user-malicious.', 'Scenarios: all-honest, user-malicious, user-malicious.'));
    assert.deepEqual(twice.errors, ['A1: claims scenario user-malicious twice']);
    const c = composeMembers({ name: 'supply', prose: twice, wiring, members, actors });
    assert.deepEqual(c.cells.filter(x => x.property === 'A1').map(x => x.scenario), ['all-honest', 'user-malicious']);
  });

  it('leaves out of the module a property the prose could not read, so nothing is written from it', () => {
    const p = parseCompositionProse(SUPPLY.replace('[N1] Within 2 ticks of adapter.Open', '[N1] Within many ticks of adapter.Open').replace('[A2] Always, {adapter.Open or adapter.Halted}.', '[A2] Always, {adapter.Open or}.'));
    assert.deepEqual(p.errors, ['A2: unexpected end of {adapter.Open or}', 'N1: "many" is not a number of ticks']);
    const c = composeMembers({ name: 'supply', prose: p, wiring, members, actors });
    assert.deepEqual(c.errors, []);
    assert.ok(!c.tla.includes('undefined') && !c.tla.includes('n1_ticks') && !/^A2 ==/m.test(c.tla));
    assert.deepEqual([...new Set(c.cells.map(x => x.property))], ['A1', 'O1']);
  });

  it('names each problem by the tripwire it trips', () => {
    const problems = [
      composeMembers({ name: 'supply', prose: parseCompositionProse(SUPPLY.replace('{token.supply = adapter.held}', '{token.supply = vault.debt + adapter.nothing + held}').replace('Actor: the Breaker.', 'Actor: the Pope.').replace('[W1] Walk Exit under all-honest: from adapter.Open, adapter.exit amount 1, adapter.halt, adapter.exit amount 1 refused; ends adapter.Halted.', '[W1] Walk Wrong under nope: from adapter.Open, token.mint amount 1, adapter.nothing, vault.change, adapter.exit speed 2, adapter.exit amount lots; ends adapter.Halted.').replace('Scenarios: all-honest.', 'Scenarios: nope.')), wiring: { ...wiring, members: [...wiring.members, { part: 'ghost', role: 'member', pins: [] }], wiring: [...wiring.wiring, { effect: { part: 'adapter', name: 'nothing' }, event: { part: 'token', name: 'nobody' } }, { effect: { part: 'vault', name: 'x' }, event: { part: 'token', name: 'mint' } }], free: ['token.nothing', 'token.mint'] }, members: { ...members, token: irOf(TOKEN.replace('[E1] mint, from the Adapter', '[E1] mint, from the Phantom')) }, actors: actorsWith('names', '  - id: bad-start\n    start: { phantom.level: 1 }\n') }).problems,
      composeMembers({ name: 'supply', prose: parseCompositionProse(SUPPLY.replace('Actor: the Breaker.', 'Actor: the Adapter.').replace('Actor: the user, on adapter.exit, prompt.', 'Actor: the Breaker, on adapter.exit, prompt.')), wiring, members: { ...members, token: irOf(TOKEN.replace('[E2] burn, from the Adapter', '[E2] burn, from the Ghost')) }, actors, retired: ['ghost'] }).problems,
    ].flat();
    assert.deepEqual(problems.map(p => `${p.name} | ${p.message}`), [
      'wiring names unknown part | wiring names part ghost, which has no dossier or does not compile',
      'sender is not declared | token: event mint comes from "the Phantom", which is neither an actor in actors.md nor a part',
      'malformed actors | start: bad-start starts phantom.level, which names no part',
      'wiring names unknown effect or event | wiring names effect adapter.nothing, which adapter does not send',
      'wiring names unknown effect or event | wiring names event token.nobody, which token does not receive',
      'wiring names unknown part | wiring names vault, which is not a member',
      'malformed wiring | free: names token.nothing, which no member receives',
      'malformed wiring | free: names token.mint, which is wired',
      'sender is not declared | supply G1: actor "the Pope" is not declared in actors.md',
      'wiring does not compose | W1 steps on token.mint, which is reached through wiring',
      'misnamed | W1 steps on adapter.nothing, which adapter does not receive',
      'wiring names unknown part | W1 steps on vault.change, but vault is not a member',
      'misnamed | W1: adapter.exit carries no field "speed"',
      'misnamed | W1: "lots" in the step adapter.exit is neither member data nor a value of amount',
      'wiring names unknown part | "vault.debt" names vault, which is not a member',
      'misnamed | "adapter.nothing": adapter holds no data or state named nothing',
      'misnamed | "held" must read <part>.<data> or <part>.<State>',
      'property claims unknown scenario | O1 claims scenario "nope", which scenarios.md does not declare',
      'property claims unknown scenario | W1 names scenario "nope", which scenarios.md does not declare',
      'sender is not declared | token: event burn comes from "the Ghost", which is a retired part',
      'Given names a part | supply G1: names "the Adapter", which is a part; a rely on a part is a Guarantee or a wiring',
      'misnamed | supply G2 names event adapter.exit, which the Breaker does not send',
    ]);
    const loop = composeMembers({ name: 'supply', prose, wiring: { ...wiring, wiring: [...wiring.wiring, { effect: { part: 'adapter', name: 'mint' }, event: { part: 'token', name: 'burn' } }] }, members, actors });
    assert.deepEqual(loop.problems, [{ name: 'wiring does not compose', message: 'wiring delivers adapter.mint to token twice; a member takes one move in a step' }]);
  });

  describe('with ids that have hyphens', () => {
    // price-feed and lane-a, with a scenario whose id has hyphens too.
    const FEED = '# Price Feed\nTier: modeled\nModule: price-feed\n\nIt holds price, a count from 0 to 4. It sends price-update to the Vault.\n\n## States\n[S1] Fresh: posted.\n[S2] Stale: not posted.\n\n## Events\n[E1] tick, from the chain: a block passes.\n[E2] post-a, from lane A: a price. Carries value, a count from 0 to 4.\n\n## Moves\n[M1] When Fresh receives tick, it becomes Stale.\n[M2] When Stale receives tick, it stays Stale.\n[M3] When Stale receives post-a, it becomes Fresh, price becomes value, sends price-update.\n[R1] In Fresh, post-a is refused.\n';
    const FEEDS = '# Feeds\nConcern: feeds\n\nThe feed.\n\n## Always\n[A1] Always, {price-feed.price <= 4 and price-feed.sent_price_update <= 4}. Scenarios: all-honest, lane-a-down.\n\n## Within\n[N1] Within 1 tick of price-feed.Stale, price-feed.Fresh, given G1. Scenarios: all-honest.\n\n## Given\n[G1] Given that lane A posts promptly. If this is false, nothing. Actor: lane A, on price-feed.post-a, prompt.\n\n## Walks\n[W1] Walk Post: from price-feed.Fresh, price-feed.post-a value 2; ends price-feed.Fresh.\n[W2] Walk Late: from price-feed.Fresh, price-feed.tick, price-feed.post-a value 2, price-feed.post-a value 3 refused; ends price-feed.Fresh.\n';
    let c: Composed;
    before(() => {
      write('hyphens/actors/actors.md', '```yaml\nactors:\n  - id: chain\n    name: the chain\n    kind: chain\n  - id: lane-a\n    name: lane A\n    kind: keeper\n```\n');
      write('hyphens/actors/scenarios.md', '```yaml\nscenarios:\n  - id: lane-a-down\n    modes: { lane-a: { mode: offline, until: 2 } }\n```\n');
      const ir = irOf(FEED);
      assert.deepEqual(ir.errors, []);
      c = composeMembers({ name: 'price-feeds', prose: parseCompositionProse(FEEDS), wiring: { members: [{ part: 'price-feed', role: 'member', pins: [] }], wiring: [], free: [], closure: [], scenarios: [], errors: [], text: '' }, members: { 'price-feed': ir }, actors: readActors(join(root, 'hyphens')) });
    });

    it('composes with every identifier built from an id or a name as TLA+ takes it', () => {
      assert.deepEqual(c.errors, []);
      assert.equal(c.module, 'PriceFeeds');
      assert.deepEqual(c.vars, ['price_feed_state', 'price_feed_price', 'price_feed_sent_price_update', 'n1_ticks', 'w1_at', 'w2_at', 'clock']);
      for (const name of ['\nCan_price_feed_M3_PostA ==', '\nprice_feed_M3_PostA ==', '\nprice_feed_Tick ==', '\nModeNow_lane_a == IF clock >= From_lane_a /\\ (Until_lane_a = 0 \\/ clock < Until_lane_a) THEN Mode_lane_a ELSE "honest"\n', '\nDue_lane_a ==', '\nHonestLane_a_price_feed_PostA ==', '\nConstInit_lane_a_down ==', '\nA1 == ((price_feed_price <= 4) /\\ (price_feed_sent_price_update <= 4))\n', '\n    /\\ price_feed_sent_price_update\' = price_feed_sent_price_update + 1\n']) assert.ok(c.tla.includes(name), name);
      assert.deepEqual(Object.keys(c.cfgs).sort(), ['A1_all_honest.cfg', 'A1_lane_a_down.cfg', 'N1_all_honest.cfg', 'W1_all_honest.cfg', 'W2_all_honest.cfg']);
      assert.ok(c.cfgs['A1_lane_a_down.cfg'].includes('\nCONSTANT Mode_lane_a = "offline"\nCONSTANT From_lane_a = 0\nCONSTANT Until_lane_a = 2\n'));
    });

    it('arms a walk\'s observer only on its first step taken from its start, so a step its start refuses arms nothing', () => {
      assert.ok(block(c.tla, 'price_feed_M3_PostA').includes('\n    /\\ w1_at\' = IF (price_feed_state = "Fresh") /\\ value = 2 THEN 1 ELSE 0\n'), 'post-a is taken only in Stale, so W1 never arms');
      assert.ok(block(c.tla, 'price_feed_M3_PostA').includes('\n    /\\ w2_at\' = IF w2_at = 1 /\\ value = 2 THEN 2 ELSE 0'));
      assert.ok(c.tla.includes('\nW2_Refused3 == ~((\\E value \\in 0..4 : value = 3 /\\ price_feed_state = "Stale"))\n'));
      assert.ok(c.tla.includes('\nW2_End == w2_at = 2 /\\ W2_Refused3 /\\ (price_feed_state = "Fresh")\n'), 'the refused post after the last step taken is checked at the end');
      assert.ok(c.tla.includes(' /\\ (w2_at\' = IF (price_feed_state = "Fresh") /\\ (Can_price_feed_M1_Tick \\/ Can_price_feed_M2_Tick) THEN 1 ELSE 0) '), 'a walk whose first step is the tick arms in Tick, from its start');
    });
  });
});

// ---------------------------------------------------------------- load.ts

describe('loadPart, loadComposition and compositionModuleText', () => {
  before(() => {
    write('load/dossier.json', JSON.stringify({ plugin: '0.1.0', storage: 'integrity-v1', external: { replay: { command: ['node', 'replay.mjs'] } } }) + '\n');
    write('load/actors/actors.md', ACTORS);
    write('load/actors/scenarios.md', SCENARIOS);
    write('load/parts/adapter/prose.md', ADAPTER);
    write('load/parts/token/prose.md', TOKEN);
    write('load/parts/adapter/calls/ordinary.md', 'kind: tlc\n');
    write('load/parts/adapter/calls/notes.txt', 'ignored');
    write('load/parts/broken/prose.md', '# Broken\n\n## States\n[S1] bad\n');
    write('load/compositions/supply/wiring.md', COMPOSITION);
    write('load/compositions/supply/prose.md', SUPPLY);
    write('load/compositions/supply/model/extras.tla', 'Helper == TRUE\n');
    write('load/compositions/bare/wiring.md', COMPOSITION.replace('part: token', 'part: ghost'));
    write('load/compositions/bare/prose.md', SUPPLY);
  });

  it('loads a part with its prose, IR, hash and pending calls', () => {
    const c = loadPart(join(root, 'load'), 'adapter');
    assert.equal(c.kind, 'part');
    assert.equal(c.id, 'adapter');
    assert.equal(c.dir, join(root, 'load', 'parts', 'adapter'));
    assert.equal(c.text, ADAPTER);
    assert.equal(c.ir.ok, true);
    assert.match(c.irHash, /^[0-9a-f]{16}$/);
    assert.equal(c.irHash, loadPart(join(root, 'load'), 'adapter').irHash);
    assert.deepEqual(c.pendingCalls, ['ordinary.md']);
    assert.deepEqual(loadPart(join(root, 'load'), 'token').pendingCalls, []);
    assert.equal(loadPart(join(root, 'load'), 'broken').ir.ok, false);
    assert.equal(loadPart(join(root, 'load'), 'nowhere').prose.title, null);
    assert.deepEqual(Object.keys(loadAllParts(join(root, 'load'))).sort(), ['adapter', 'broken', 'token']);
  });

  it('loads a composition with its members, wiring, actors and composed module', () => {
    const s = loadComposition(join(root, 'load'), 'supply');
    assert.equal(s.kind, 'composition');
    assert.equal(s.prose.concern, 'supply');
    assert.deepEqual(Object.keys(s.members), ['adapter', 'token']);
    assert.equal(s.memberLoads.adapter!.irHash, loadPart(join(root, 'load'), 'adapter').irHash);
    assert.deepEqual(s.composed.errors, []);
    assert.equal(s.composed.module, 'Supply');
    assert.equal(s.extras, 'Helper == TRUE\n');
    assert.deepEqual(s.pendingCalls, []);
    assert.deepEqual(s.wiring.scenarios, ['all-honest', 'breaker-offline']);
    assert.equal(s.actors.byId.breaker.kind, 'multisig');
    const shared = loadComposition(join(root, 'load'), 'supply', { parts: loadAllParts(join(root, 'load')) });
    assert.equal(shared.composed.tla, s.composed.tla);
  });

  it('appends extras before the end line of the composed module', () => {
    const s = loadComposition(join(root, 'load'), 'supply');
    const text = compositionModuleText(s);
    assert.ok(text.endsWith('\nNotW1 == ~W1_End\n\\* extras.tla, hand-written:\nHelper == TRUE\n' + '='.repeat(70) + '\n'));
    assert.equal(text.slice(0, -1).split('\n').filter(l => /^=+$/.test(l)).length, 1);
    assert.equal(compositionModuleText({ ...s, extras: '' }), s.composed.tla);
    assert.equal(compositionModuleText({ ...s, extras: '  \n' }), s.composed.tla);
    assert.equal(compositionModuleText({ composed: null } as unknown as CompositionLoad), '');
  });

  it('keeps a composition whose wiring fails, with the errors on composed', () => {
    const s = loadComposition(join(root, 'load'), 'bare');
    assert.deepEqual(Object.keys(s.members), ['adapter']);
    assert.ok(s.composed.errors.includes('wiring names part ghost, which has no dossier or does not compile'));
    assert.ok(s.composed.errors.includes('wiring names token, which is not a member'));
  });

  it('reads the external runners and a knowledge adapter from the marker', () => {
    assert.deepEqual(externalsOf(join(root, 'load')), { replay: { command: ['node', 'replay.mjs'] } });
    assert.deepEqual(externalsOf(join(root, 'nowhere')), {});
    const k = knowledgeOf(join(root, 'load'));
    assert.equal(k.kind, 'none');
    assert.equal(k.resolve('adapter#contract:adapter'), null);
    assert.deepEqual(k.edges({ types: ['mints_asset'] }), []);
    assert.equal(k.backing({ kind: 'file', path: 'x' }).status, 'unresolved');
  });
});
