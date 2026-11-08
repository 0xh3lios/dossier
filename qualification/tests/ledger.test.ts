// The ledger: decisions, doubts, covers and marks, cells, tripwires and
// flags, the router, the rendered ledgers and verify. A trial here is
// synthetic: its bundle is sealed as the runner seals one, and publishAnswer
// publishes its answer to evidence/ by the evidence rules, one entry per
// question. Each case works on a root of its own, a fresh copy of a stage its
// describe builds once, so that no case reads what another left.
// Run: node --test qualification/tests/ledger.test.ts
import { after, before, describe, it } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { GENESIS, VERBS, acceptedRisks, answeredDoubts, appendDecision, chainTip, forgottenAnswers, formatDecision, holdsTip, ownerColumn, parseDecisions } from '../../src/dossiers/decisions.ts';
import { prefixHead, STORAGE } from '../../src/dossiers/integrity.ts';
import { publishAnswer, recoverAnswer } from '../../src/dossiers/publication.ts';
import { completed, entryOf, EVIDENCE, questionGone, readEvidence, RUNNING } from '../../src/trials/answers.ts';
import type { Entry, InputIdentity, Reach, Readable, Snapshot, Verdict } from '../../src/trials/answers.ts';
import { writeGenerated } from '../../src/models/materialize.ts';
import { parseDoubts } from '../../src/dossiers/doubts.ts';
import { coversOf, propertyId } from '../../src/verify/covers.ts';
import { cellsOf, moduleHash, scenarioHash } from '../../src/verify/cells.ts';
import { lapsedParts } from '../../src/verify/lapse.ts';
import { routePart, routeRoot, routeComposition } from '../../src/verify/route.ts';
import { backingText, core, parseMachineForm, renderPartLedger, renderIndex, renderCompositionLedger, summaryLine, verifyLine } from '../../src/verify/render.ts';
import { analyzePart, analyzeComposition, seamsOf } from '../../src/verify/analyze.ts';
import { compositionTripwires } from '../../src/verify/tripwires.ts';
import { knowledgeOf, loadAllParts, loadPart, loadComposition, compositionModuleText } from '../../src/dossiers/load.ts';
import { readActors } from '../../src/dossiers/actors.ts';
import { writeReceipt } from '../../src/trials/receipt.ts';
import { nullKnowledge } from '../../src/knowledge.ts';
import { fileHash, proseHash, sha256, short } from '../../src/hash.ts';
import { parseTla } from '../../src/models/tla.ts';
import { draw } from '../../src/chart/draw.ts';
import { verifyAll } from '../../src/commands/verify.ts';
import { answerContext, compareTlc, snapshotOf } from '../../src/commands/trial.ts';
import type { AcceptedRisk, Decision, NewDecision, OwnerState } from '../../src/dossiers/decisions.ts';
import type { Integrity } from '../../src/dossiers/integrity.ts';
import type { Member } from '../../src/dossiers/wiring.ts';
import type { CompositionLoad } from '../../src/dossiers/load.ts';
import type { Located } from '../../src/dossiers/root.ts';
import type { Backed, BackingSpec, Edge, EdgeFilter, Knowledge, Resolved } from '../../src/knowledge.ts';
import type { ChartCheck, ChartGap } from '../../src/chart/checks.ts';
import type { PartProse, CompositionProperty } from '../../src/prose/prose.ts';
import type { Scenario } from '../../src/dossiers/actors.ts';
import type { Ir } from '../../src/prose/ir.ts';
import type { Call } from '../../src/trials/calls.ts';
import type { Plan } from '../../src/trials/plan.ts';
import type { TlcParsed } from '../../src/trials/checkers/tlc.ts';
import type { TrialResult } from '../../src/trials/trials.ts';
import type { Analysis, AnsweredDoubt, AnswerRow, PartAnalysis, CompositionAnalysis } from '../../src/verify/analyze.ts';
import type { Cell } from '../../src/verify/cells.ts';
import type { PresentState } from '../../src/verify/lapse.ts';
import type { Mark } from '../../src/verify/marks.ts';
import type { PartLedgerForm, CompositionLedgerForm } from '../../src/verify/render.ts';
import type { Note } from '../../src/verify/tripwires.ts';

const TIMELOCK = `# Timelock
Tier: modeled
Module: gov-timelock

The Timelock holds a plan and executes it after a delay. It holds remaining, a count from 0 to 2. It sends change to the Vault.

## States
[S1] Idle: nothing is planned.
[S2] Waiting: the delay has not run out.
[S3] Ready: the delay has run out.

## Events
[E1] schedule, from Governance: a plan is proposed. Carries delay, a count from 1 to 2.
[E2] tick, from the chain: a block passes.
[E3] execute, from the public: the plan is executed.
[E4] cancel, from Governance: the plan is abandoned.

## Moves
[M1] When Idle receives schedule, it becomes Waiting, with remaining delay.
[M2] When Waiting receives tick and remaining is above 1, it stays Waiting, remaining drops by one.
[M3] When Waiting receives tick and remaining is at most 1, it becomes Ready, remaining becomes 0.
[M4] When Ready receives execute, it becomes Idle, sends change.
[M5] When Waiting receives cancel, it becomes Idle, remaining becomes 0.
[M6] When Ready receives cancel, it becomes Idle.
[R1] In Idle, tick, execute and cancel are refused.
[R2] In Waiting and Ready, schedule is refused.
[R3] In Waiting, execute is refused.
[R4] In Ready, tick is refused.
[R5] In Idle, schedule is refused when delay is above 2.

## Always
[A1] Always, remaining is at most 2.
[A2] Always, while Idle, remaining is 0.

## Once
[O1] Once Waiting, eventually Idle, given G1.

## Within
[N1] Within two ticks of Ready, Idle, given G1.

## Given
[G1] Given that the executor runs a ready plan. If this is false, plans wait forever. Actor: the public, on execute, prompt.

## Walks
[W1] Walk Plan: from Idle, schedule delay 1, execute refused, tick, execute; ends Idle with remaining 0; change sent once.

## Seams
[X1] Seam with Vault: change carries the new ceiling.

## Guarantees
[K1] The delay is enforced on chain. Backing: certora certora/Timelock.spec#delayEnforced at 1a2b3c4d.
[K2] Only Governance schedules. Backing: file evidence/governance.md#only-governance.
[K3] The executor is public. Backing: external replay.
[K4] Nothing else. Backing: none.
[K5] The timelock is the deployed one. Backing: record gov-timelock#observation:finalized.

## Words only
[T1] The Timelock knows nothing of the plan's content.
`;

const VAULT = `# Vault
Tier: modeled
Module: vault

It holds ceiling, a count from 0 to 2.

## States
[S1] Open: credit flows.

## Events
[E1] change, from Governance: the ceiling moves. Carries to, a count from 0 to 2.

## Moves
[M1] When Open receives change, it stays Open, ceiling becomes to.

## Seams
[X1] Seam with Timelock: change carries the new ceiling.

## Words only
[T1] The piece promises nothing eventual.
`;

const ADAPTER = `# Adapter
Tier: modeled
Module: adapter

It holds held, a count from 0 to 2. It sends mint to the Token, carrying amount.

## States
[S1] Open: credit may move.
[S2] Halted: nothing moves. Final.

## Events
[E1] exit, from the user: credit leaves. Carries amount, a count from 1 to 2.
[E2] halt, from the Breaker: the adapter is halted.

## Moves
[M1] When Open receives exit and {held + amount <= 2}, it stays Open, held grows by amount, sends mint.
[M2] When Open receives halt, it becomes Halted.
[R1] In Open, exit is refused when {held + amount > 2}.
[R2] In Halted, every event is refused.

## Always
[A1] Always, held is at most 2.

## Words only
[T1] The piece promises nothing eventual.
`;

const TOKEN = `# Token
Tier: modeled
Module: token

It holds supply, a count from 0 to 4.

## States
[S1] Live: the token answers.

## Events
[E1] mint, from the Adapter: supply grows. Carries amount, a count from 1 to 2.

## Moves
[M1] When Live receives mint and {supply + amount <= 4}, it stays Live, supply grows by amount.
[R1] In Live, mint is refused when {supply + amount > 4}.

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
  - id: chain
    name: the chain
    kind: chain
  - id: public
    name: the public
    kind: public
  - id: user
    name: the user
    kind: user
  - id: breaker
    name: the Breaker
    kind: multisig
\`\`\`
`;

// The user, whose exit reaches the Adapter, pins a record; so does Governance, whose events reach no member of Supply.
const PINNED_ACTORS = ACTORS
  .replace('    name: the user\n    kind: user\n', '    name: the user\n    kind: user\n    pins: [adapter#contract:adapter]\n')
  .replace('    name: Governance\n    kind: governance\n', '    name: Governance\n    kind: governance\n    pins: [timelock#actor:governance]\n');

const SCENARIOS = `# Scenarios
\`\`\`yaml
scenarios:
  - id: user-malicious
    modes: { user: malicious }
    stronger_than: [all-honest]
  - id: breaker-offline
    modes: { breaker: offline }
\`\`\`
`;

const COMPOSITION = `# Wiring
\`\`\`yaml
members:
  - part: adapter
    role: member
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

## Words only
[T1] Nothing more.
`;

// A hand-refined module whose definitions the trials below are measured against.
const TIMELOCK_TLA = `---- MODULE Timelock ----
EXTENDS Naturals
VARIABLES state, remaining, sent_change
Init == state = "Idle" /\\ remaining = 0 /\\ sent_change = 0
M1_Schedule == \\E delay \\in 1..2 : state = "Idle" /\\ state' = "Waiting" /\\ remaining' = delay /\\ UNCHANGED sent_change
M2_Tick == state = "Waiting" /\\ remaining > 1 /\\ state' = state /\\ remaining' = remaining - 1 /\\ UNCHANGED sent_change
M3_Tick == state = "Waiting" /\\ remaining <= 1 /\\ state' = "Ready" /\\ remaining' = 0 /\\ UNCHANGED sent_change
M4_Execute == state = "Ready" /\\ state' = "Idle" /\\ sent_change' = sent_change + 1 /\\ UNCHANGED remaining
M5_Cancel == state = "Waiting" /\\ state' = "Idle" /\\ remaining' = 0 /\\ UNCHANGED sent_change
M6_Cancel == state = "Ready" /\\ state' = "Idle" /\\ UNCHANGED <<remaining, sent_change>>
Next == M1_Schedule \\/ M2_Tick \\/ M3_Tick \\/ M4_Execute \\/ M5_Cancel \\/ M6_Cancel
Spec == Init /\\ [][Next]_<<state, remaining, sent_change>>
TypeOK == remaining \\in 0..2
A1 == remaining <= 2
A2 == state = "Idle" => remaining = 0
N1 == TRUE
Inv_A1 == TypeOK /\\ A1
====
`;

const chartCall = 'kind: chart\nexecutes:\n  - prose.md\nreach: the chart\nexpect:\n  checks: pass\nbecause: |\n  every pair is said\n';
const tlcCall = (expect: Record<string, string>) => `kind: tlc\nexecutes:\n  - model/Timelock.tla\n  - model/Timelock.cfg\nreach: delay up to 2\nexpect:\n${Object.keys(expect).map(k => `  ${k}: ${expect[k]}`).join('\n')}\nbecause: |\n  because\n`;
const blunderCall = (prop: string) => `kind: blunder\nblunder: the wrong\nexecutes:\n  - model/blunders/x.tla\n  - model/blunders/x_${prop}.cfg\nreach: delay up to 2\nexpect:\n  ${prop}: violated\nbecause: |\n  it must catch it\n`;
const apalacheCall = (inv: string, mode = 'inductive') => `kind: apalache\nmode: ${mode}\n${mode === 'bounded' ? 'length: 3\n' : ''}inv: ${inv}\nexecutes:\n  - model/Timelock.tla\nreach: ${mode}\nexpect:\n  ${inv}: holds\nbecause: |\n  b\n`;
const externalCall = (ids: string[]) => `kind: external\nrunner: replay\nexecutes:\n  - prose.md\nreach: the stand-in\nexpect:\n${ids.map(i => `  ${i}: pass`).join('\n')}\nbecause: |\n  b\n`;

const stamp = (hhmm: string) => `2026-11-03T${hhmm.slice(0, 2)}:${hhmm.slice(2)}:00.000Z`;
const VERSION = '0.1.0';
// The hash a synthetic result records for a file that is not on disk, as a trial that read another copy would.
const NOT_ON_DISK = '0'.repeat(64);

// A dossier's integrity.json, as publication keeps it beside the records it binds.
const manifestOf = (dir: string): Integrity => existsSync(join(dir, 'integrity.json')) ? JSON.parse(readFileSync(join(dir, 'integrity.json'), 'utf8')) as Integrity : { schema: 1, evidence: {}, decisionHead: null };
const keepManifest = (dir: string, manifest: Integrity) => writeFileSync(join(dir, 'integrity.json'), JSON.stringify(manifest, null, 2) + '\n');
// Commits decisions.log as it stands, as dossier decide does after appending a line.
const commitDecisions = (dir: string) => {
  const log = join(dir, 'decisions.log');
  keepManifest(dir, { ...manifestOf(dir), decisionHead: existsSync(log) ? prefixHead(readFileSync(log, 'utf8')) : null });
};
// An owner's decision, appended and committed.
const decide = (dir: string, decision: NewDecision) => { const line = appendDecision(join(dir, 'decisions.log'), decision); commitDecisions(dir); return line; };
// A dossier's answers as version control holds them once committed: its entries and their readings,
// with their bindings in integrity.json, as they stand now. What it returns puts them back, as a
// checkout of that commit would.
const committed = (dir: string) => {
  const folder = join(dir, EVIDENCE), bindings = { ...manifestOf(dir).evidence };
  const files = existsSync(folder) ? Object.fromEntries(readdirSync(folder).map(name => [name, readFileSync(join(folder, name))])) : {};
  return () => {
    rmSync(folder, { recursive: true, force: true });
    if (Object.keys(files).length) mkdirSync(folder);
    for (const [name, bytes] of Object.entries(files)) writeFileSync(join(folder, name), bytes);
    keepManifest(dir, { ...manifestOf(dir), evidence: bindings });
  };
};
// The first eight hex of the digest integrity.json binds for an entry, as a forget names it.
const boundAt = (dir: string, name: string) => manifestOf(dir).evidence[name].slice(0, 8);

// A result as the suites build it. The trial helper below gives it the input identity the runner
// captures, here the files it executed, unless it names its own.
type Result = Omit<TrialResult, 'inputIdentity'> & { inputIdentity?: InputIdentity };
const identityOf = (executed: Record<string, string>): InputIdentity => ({ strategy: 'private-copy', files: { ...executed }, shared: [], limitation: 'A synthetic trial reads only the files it executes.' });
// An answer as verify reads it, built from such a result under a trial id by the mapping the runner
// publishes with, without a file: what covers and cells are given.
function answerFrom(id: string, result: Result, name = id): Readable {
  const entry = entryOf({ ...result, id, inputIdentity: result.inputIdentity ?? identityOf(result.executed) }, { reach: result.reach?.text ?? '', because: 'b' }, 'kind: tlc\n', '0'.repeat(64));
  return { name, entry, reading: null, problems: [] };
}
// A composition's answer with only what a cell reads: the question's kind, checker and cell, the verdict and
// the outcomes, and the snapshot it rested on, a stub composition's unless it says otherwise.
function compositionAnswer({ trial, kind = 'tlc', checker = 'tlc', mode, result = 'as-called', outcomes, partial = [], snapshot = {}, property = 'A1', scenario = 'all-honest' }: { trial: string; kind?: string; checker?: string; mode?: string; result?: Verdict; outcomes: Record<string, string>; partial?: string[]; snapshot?: Partial<Snapshot>; property?: string; scenario?: string }): Readable {
  const basis = { snapshot: { passages: {}, records: {}, backing: {}, wiring: 'c', module: 'm', scenario: 's', actors: 'x', extras: null, members: {}, ...snapshot }, executed: {}, inputIdentity: identityOf({}) };
  const established = { trial, at: stamp(trial.slice(11, 15)), versions: {}, bundle: '0'.repeat(64) };
  return {
    name: `${kind}-${property}-${scenario}-${trial.slice(-6)}`, reading: null, problems: [],
    entry: { schema: 1, dossier: 'compositions/stub', question: { kind, checker, executes: [], expects: Object.keys(outcomes).sort(), property, scenario, walk: null }, call: { text: '', reach: '', expect: {}, because: '' }, answer: { result, outcomes, enabled: Object.keys(outcomes), partial, ...(mode ? { mode } : {}) }, basis, established, previous: null, narrowed: null, replaced: null },
  };
}
// The present of that stub composition, as its cells compare a basis with it.
const stubPresent = (over: Partial<PresentState> = {}): PresentState => ({ passages: {}, wiring: 'c', module: () => 'm', scenario: () => 's', actors: 'x', extras: null, members: {}, records: {}, configs: {}, inputs: {}, ...over });

// A dossiers root in a fresh temporary directory, in integrity-v1 storage, with its actors and
// scenarios, and the helpers rootAt gives it.
function makeRoot(prefix: string) {
  const r = rootAt(mkdtempSync(join(tmpdir(), prefix)));
  r.write('dossier.json', JSON.stringify({ plugin: VERSION, storage: STORAGE }) + '\n');
  r.write('actors/actors.md', ACTORS);
  r.write('actors/scenarios.md', SCENARIOS);
  return r;
}
// A stage, built once by its describe: a copy of an earlier stage, with what `build` adds to it.
function stageFrom(from: string, build: (root: string) => unknown): string {
  const root = mkdtempSync(join(tmpdir(), 'dossier-stage-'));
  cpSync(from, root, { recursive: true });
  build(root);
  return root;
}
// A case's own root: a fresh copy of a stage its describe built once, removed after the case. No case
// reads what another left, and the stage stays as it was built.
function copyStage(t: TestContext, stage: string): string {
  const root = mkdtempSync(join(tmpdir(), 'dossier-case-'));
  cpSync(stage, root, { recursive: true });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
// The helpers of the dossiers root at `root`. Writing a dossier's file gives the dossier its
// integrity.json; a decisions.log written whole is committed as it stands. A trial is synthetic: its
// bundle is sealed in .running/<id>/ as the runner seals one, the result naming its trial and
// dossier; publishAnswer then publishes its answer to its question's entry in evidence/ by the
// evidence rules, and shelves the bundle in trials/<id>/, which verify never reads.
function rootAt(root: string) {
  const write = (rel: string, text: string) => {
    const p = join(root, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, text);
    const dossier = rel.match(/^((?:parts|compositions)\/[^/]+)\//);
    if (dossier && !rel.endsWith('/integrity.json')) {
      const dir = join(root, dossier[1]);
      if (!existsSync(join(dir, 'integrity.json'))) keepManifest(dir, manifestOf(dir));
      if (rel.endsWith('/decisions.log')) commitDecisions(dir);
    }
    return p;
  };
  // What became of a trial's answer: published to its entry, or kept, the recorded answer standing. A
  // refused one throws: no test here expects the runner to refuse.
  const trial = (dir: string, id: string, { call, result, output = 'out\n' }: { call: string; result: Result; output?: string }) => {
    const ref = `${basename(dirname(dir))}/${basename(dir)}`;
    const staging = join(dir, RUNNING, id);
    mkdirSync(staging, { recursive: true });
    writeFileSync(join(staging, 'call.md'), call);
    writeFileSync(join(staging, 'result.json'), JSON.stringify({ ...result, id, dossier: ref, inputIdentity: result.inputIdentity ?? identityOf(result.executed) }, null, 2) + '\n');
    writeFileSync(join(staging, 'output.txt'), output);
    writeReceipt(staging, { runner: `dossier@${VERSION}`, at: result.at, executed: result.executed, output: { hash: short(output, 64), size: output.length, stored: 'trial' } });
    const where: Located = { kind: ref.startsWith('compositions/') ? 'composition' : 'part', id: basename(dir), dir };
    const loaded = where.kind === 'part' ? loadPart(root, where.id) : loadComposition(root, where.id);
    const context = answerContext(where, loaded, dir);
    const publication = publishAnswer(dir, id, context);
    // The runner leaves no empty .running/ behind.
    try { rmdirSync(join(dir, RUNNING)); } catch { /* Another trial's bundle is in it. */ }
    if (publication.action === 'refused') throw new Error(`the runner refused ${id}: ${publication.reason}`);
    const entry = join(dir, EVIDENCE, `${publication.name}.json`);
    // A trial executes files that exist: an answer to a question already gone would cover nothing, unseen.
    const gone = questionGone((JSON.parse(readFileSync(entry, 'utf8')) as Entry).question, context.present);
    if (gone) throw new Error(`${id} answers a question that is gone (${gone}); write the files it executes`);
    return { id, action: publication.action, name: publication.name, entry, reading: join(dir, EVIDENCE, `${publication.name}.md`), bundle: join(dir, 'trials', id) };
  };
  return { root, write, trial };
}

// What results.tlc builds a TLC or blunder result from, beside its time.
interface TlcOptions { kind?: string; enabled: string[]; outcomes: Record<string, string>; expect?: string | Record<string, string>; result?: Verdict; values?: Reach['values']; properties?: Record<string, string | null> | null; miscalls?: string[]; executed?: Record<string, string> | null; partial?: string[] | null }

// Results shaped as src/commands/trial.ts writes them, for a part, with the snapshot taken
// against the knowledge base the analysis reads, as the runner's is.
function partResults(root: string, id: string, knowledge: Knowledge = nullKnowledge()) {
  const loaded = () => loadPart(root, id);
  const snapshot = () => snapshotOf({ where: { kind: 'part', id } as Located, loaded: loaded(), knowledge, call: {} as Call });
  const base = (kind: string, checker: string, at: string) => ({ kind, checker, dossier: `parts/${id}`, id: 'x', at, versions: { dossier: VERSION }, command: [], cwd: '.', exit: 0, seconds: 1, property: null, scenario: null, snapshot: snapshot() });
  const actions = {
    M1_Schedule: { move: 'M1', event: 'schedule', targets: ['Waiting'], stays: false, distinct: 2, generated: 4 },
    M2_Tick: { move: 'M2', event: 'tick', targets: [], stays: true, distinct: 1, generated: 1 },
    M3_Tick: { move: 'M3', event: 'tick', targets: ['Ready'], stays: false, distinct: 1, generated: 2 },
    M4_Execute: { move: 'M4', event: 'execute', targets: ['Idle'], stays: false, distinct: 1, generated: 1 },
    M5_Cancel: { move: 'M5', event: 'cancel', targets: ['Idle'], stays: false, distinct: 1, generated: 2 },
    M6_Cancel: { move: 'M6', event: 'cancel', targets: ['Idle'], stays: false, distinct: 1, generated: 1 },
  };
  const definitions = parseTla(TIMELOCK_TLA).definitions;
  const hashOf = (name: string) => (definitions[name] ? definitions[name].hash : null);
  // The files a trial executes, hashed as they are on disk when the result is built, as the runner hashes them.
  const onDisk = (...rels: string[]) => Object.fromEntries(rels.map(rel => { const p = join(root, 'parts', id, rel); return [rel, existsSync(p) ? fileHash(p) : NOT_ON_DISK]; }));
  return {
    chart: (at: string, { gaps = [], failing = [] }: { gaps?: ChartGap[]; failing?: string[] } = {}): Result => {
      const ids = Object.keys(loaded().ir.hashes);
      const checked = ids.filter(i => /^[SEMRW]/.test(i) || i === 'A1' || i === 'A2');
      const outcome = failing.length ? 'fail' : 'pass';
      return {
        ...base('chart', 'chart', at), executed: { 'prose.md': short(TIMELOCK, 64) }, enabled: ['checks'], expect: { checks: { expect: 'pass' } }, outcomes: { checks: outcome },
        checks: [...checked.map((i): ChartCheck => ({ ids: [i], name: `${i}: as said`, status: failing.includes(i) ? 'failed' : 'passed', message: '' })), { ids: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'], name: 'determinism', status: 'passed', message: '' }],
        counts: { total: checked.length + 1, passed: checked.length + 1 - failing.length, failed: failing.length }, covers: checked.filter(i => !failing.includes(i)), explored: 12, limitHit: false, gaps, failing,
        reach: { text: 'the chart over remaining 0..2', values: { explored: 12 } }, result: failing.length ? 'miscalled' : 'as-called', miscalls: failing.length ? [`checks: expected pass, got fail ${failing.join(' ')}`] : [],
      };
    },
    // A blunder executes the copy its call names: blunderCall's, under model/blunders/, unless executed says otherwise.
    tlc: (at: string, { kind = 'tlc', enabled, outcomes, expect = 'holds', result = 'as-called', values = { MaxSent: 4 }, properties = null, miscalls = [], executed = null, partial = null }: TlcOptions): Result => ({
      ...base(kind, 'tlc', at), executed: executed || (kind === 'blunder' ? onDisk('model/blunders/x.tla', `model/blunders/x_${enabled[0]}.cfg`) : onDisk('model/Timelock.tla', 'model/Timelock.cfg')), enabled, expect: Object.fromEntries(enabled.map(e => [e, { expect: typeof expect === 'string' ? expect : expect[e] }])), outcomes,
      violation: null, trace: [], states: { generated: 9, distinct: 6 }, actions, init: { accepted: 1, generated: 1 }, partial: partial || [], errors: [], warnings: [],
      properties: properties || Object.fromEntries(enabled.map(e => [e, hashOf(e)])), reach: { text: 'delay up to 2', constants: { MaxSent: '4' }, values }, result, miscalls,
    }),
    // An inductive answer keeps its base and step runs of Apalache, which the runner requires of inductive evidence.
    apalache: (at: string, { inv, mode = 'inductive', outcome = 'holds' }: { inv: string; mode?: string; outcome?: string }): Result => ({
      ...base('apalache', 'apalache', at), executed: onDisk('model/Timelock.tla'), enabled: [inv], expect: { [inv]: { expect: 'holds' } }, outcomes: { [inv]: outcome }, mode, length: mode === 'bounded' ? 3 : null, trace: null,
      runs: mode === 'inductive' ? ['base', 'step'].map(label => ({ label, outcome: outcome === 'holds' ? 'NoError' : 'Error', length: 0, exitcode: outcome === 'holds' ? 0 : 12, violatedInvariant: null, errors: [] })) : [],
      properties: { [inv]: hashOf(inv) }, reach: { text: mode === 'inductive' ? 'unbounded; inductive' : '3 steps', values: mode === 'inductive' ? { inductive: 1 } : { length: 3 } }, result: outcome === 'holds' ? 'as-called' : 'miscalled', miscalls: [],
    }),
    external: (at: string, covers: string[]): Result => ({
      ...base('external', 'external', at), executed: { 'prose.md': short(TIMELOCK, 64) }, enabled: covers, expect: Object.fromEntries(covers.map(i => [i, { expect: 'pass' }])), outcomes: Object.fromEntries(covers.map(i => [i, 'pass'])),
      runner: 'replay', covers, evidence: null, reach: { text: 'the stand-in deployment', values: {} }, result: 'as-called', miscalls: [],
    }),
    aborted: (at: string, enabled: string[] = ['TypeOK', 'A1']): Result => ({ ...base('tlc', 'tlc', at), executed: { 'model/Timelock.tla': '1'.repeat(64), 'model/Timelock.cfg': '2'.repeat(64) }, enabled, expect: Object.fromEntries(enabled.map(e => [e, { expect: 'holds' }])), outcomes: {}, result: 'aborted', reason: 'timed out after 1 seconds' }),
  };
}
type Results = ReturnType<typeof partResults>;

// One cell's TLC trial of the Supply composition, shaped as the runner writes it, with its call.
// The generated files a composition trial executes, hashed as the composer writes them now, as the runner hashes them.
function generatedHashes(loaded: CompositionLoad, ...cfgs: string[]): Record<string, string> {
  return { [`model/generated/${loaded.composed.module}.tla`]: sha256(compositionModuleText(loaded)), ...Object.fromEntries(cfgs.map(c => [c, loaded.composed.cfgs[c.replace('model/generated/', '')] !== undefined ? sha256(loaded.composed.cfgs[c.replace('model/generated/', '')]) : NOT_ON_DISK])) };
}

function supplyCellTrial(root: string, property: string, scenario: string, at: string, knowledge: Knowledge = nullKnowledge()) {
  const cfg = `model/generated/${property}_${scenario.replace(/-/g, '_')}.cfg`;
  const call = `kind: tlc\nproperty: ${property}\nscenario: ${scenario}\nexecutes:\n  - model/generated/Supply.tla\n  - ${cfg}\nreach: amounts up to 2\nexpect:\n  TypeOK: holds\n  ${property}: holds\nbecause: |\n  b\n`;
  const loaded = loadComposition(root, 'supply');
  const result: Result = {
    kind: 'tlc', checker: 'tlc', dossier: 'compositions/supply', id: 'x', at, versions: {}, command: [], cwd: '.', exit: 0, seconds: 1, property, scenario, walk: null,
    executed: generatedHashes(loaded, cfg), enabled: ['TypeOK', property], expect: { TypeOK: { expect: 'holds' }, [property]: { expect: 'holds' } }, outcomes: { TypeOK: 'holds', [property]: 'holds' },
    reach: { text: 'amounts up to 2', values: { MaxSent: 4 } }, snapshot: snapshotOf({ where: { kind: 'composition', id: 'supply' } as Located, loaded, knowledge, call: { scenario } as Call }), result: 'as-called', miscalls: [],
  };
  return { call, result };
}

const marksOf = (a: PartAnalysis) => Object.fromEntries(Object.entries(a.marks).map(([k, m]) => [k, m.mark]));
const flagNames = (a: Analysis) => a.flags.map(f => f.name);
const tripNames = (a: Analysis) => a.tripwires.map(t => t.name);

// ---------------------------------------------------------------- decisions

describe('decisions', () => {
  it('formats a line chained to the previous one and parses it back', () => {
    const first = formatDecision({ time: '2026-11-03T10:00:00Z', verb: 'accept', args: ['S1@7316754e', 'A1@bad4a0d5'], words: 'the ledger as deployed' });
    assert.equal(first, '2026-11-03T10:00:00Z accept S1@7316754e A1@bad4a0d5 "the ledger as deployed" 00000000');
    const second = formatDecision({ time: '2026-11-03T10:01:00Z', verb: 'reject', args: ['M6@51afc10d'], words: 'say "no" here' }, first);
    assert.equal(second, `2026-11-03T10:01:00Z reject M6@51afc10d "say \\"no\\" here" ${short(first)}`);
    const { decisions, broken } = parseDecisions(`${first}\n${second}\n`);
    assert.equal(broken, null);
    assert.deepEqual(decisions[0], { line: 1, time: '2026-11-03T10:00:00Z', verb: 'accept', args: ['S1@7316754e', 'A1@bad4a0d5'], ids: [{ id: 'S1', hash: '7316754e' }, { id: 'A1', hash: 'bad4a0d5' }], words: 'the ledger as deployed', chain: GENESIS, raw: first });
    assert.equal((decisions[1] as Decision).words, 'say "no" here');
    assert.deepEqual((decisions[1] as Decision).ids, [{ id: 'M6', hash: '51afc10d' }]);
    assert.deepEqual(VERBS, ['begin', 'accept', 'reject', 'answer', 'risk', 'retire', 'forget']);
    // A forget names an entry and the first eight hex of the digest integrity.json binds, never a trial;
    // the latest forget on an entry is the one that counts.
    const lines = [first, second];
    for (const [time, args, words] of [
      ['10:02', ['tlc-A1-3fa2c1@0123abcd'], 'the entry was lost in a rebase'],
      ['10:03', ['2026-11-03-0900-tlc-a1a1a1'], 'a trial, which names no entry'],
      ['10:04', ['tlc-N1-executor-offline-9b1e04@89abcdef'], 'first'],
      ['10:05', ['tlc-N1-executor-offline-9b1e04@fedcba98'], 'again, on the digest bound now'],
    ] as [string, string[], string][]) lines.push(formatDecision({ time: `2026-11-03T${time}:00Z`, verb: 'forget', args, words }, lines.at(-1)));
    const parsed = parseDecisions(lines.join('\n') + '\n');
    assert.equal(parsed.broken, null);
    assert.deepEqual(forgottenAnswers(parsed.decisions), {
      'tlc-A1-3fa2c1': { digest: '0123abcd', time: '2026-11-03T10:02:00Z', words: 'the entry was lost in a rebase' },
      'tlc-N1-executor-offline-9b1e04': { digest: 'fedcba98', time: '2026-11-03T10:05:00Z', words: 'again, on the digest bound now' },
    });
  });

  it('appends to a file with the chain and reports a broken or malformed chain', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dossier-decisions-'));
    try {
      const path = join(dir, 'decisions.log');
      const l1 = appendDecision(path, { time: '2026-11-03T10:00:00Z', verb: 'begin', args: ['modeled'], words: 'start' });
      const l2 = appendDecision(path, { time: '2026-11-03T10:01:00Z', verb: 'retire', args: [], words: 'end' });
      assert.equal(readFileSync(path, 'utf8'), `${l1}\n${l2}\n`);
      assert.equal(l2.endsWith(` ${short(l1)}`), true);
      assert.equal(parseDecisions(readFileSync(path, 'utf8')).broken, null);
      const tampered = `${l1.replace('"start"', '"started"')}\n${l2}\n`;
      assert.deepEqual(parseDecisions(tampered).broken, { line: 2, reason: 'chain ' + short(l1) + ' does not continue line 1' });
      const malformed = parseDecisions(`${l1}\nnot a decision\n${l2}\n`);
      assert.deepEqual(malformed.broken, { line: 2, reason: 'malformed line' });
      assert.equal(malformed.decisions[1].malformed, true);
      assert.equal(malformed.decisions.length, 3);
      assert.deepEqual(readdirSync(dir), ['decisions.log'], 'the log is written beside itself and renamed, leaving nothing else');
      writeFileSync(path, `${l1}\n${l2}`);
      const l3 = appendDecision(path, { time: '2026-11-03T10:02:00Z', verb: 'begin', args: [], words: 'again' });
      assert.equal(readFileSync(path, 'utf8'), `${l1}\n${l2}\n${l3}\n`, 'a log without its last newline gets one before the new line');
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it('keeps the tip of the chain: the log holds it while lines are only appended, and not once its last line is removed or rewritten', () => {
    const l1 = formatDecision({ time: 't1', verb: 'begin', args: ['modeled'], words: 'start' });
    const l2 = formatDecision({ time: 't2', verb: 'risk', args: ['N1@aaaaaaaa', 'lanes-offline', '2026-11-03-2040-tlc-ea0018'], words: 'an incident' }, l1);
    const tip = chainTip(parseDecisions(`${l1}\n${l2}\n`).decisions)!;
    assert.equal(tip, short(l2));
    assert.equal(chainTip([]), null);
    const l3 = formatDecision({ time: 't3', verb: 'answer', args: ['D1', 'a'], words: 'a' }, l2);
    assert.equal(holdsTip(parseDecisions(`${l1}\n${l2}\n${l3}\n`).decisions, tip), true, 'a line appended after it is fine');
    assert.equal(holdsTip(parseDecisions(`${l1}\n`).decisions, tip), false, 'the last line removed: the chain of what is left is whole, the tip is gone');
    assert.equal(parseDecisions(`${l1}\n`).broken, null);
    assert.equal(holdsTip(parseDecisions(`${l1}\n${l2.replace('an incident', 'no incident')}\n`).decisions, tip), false, 'the last line rewritten');
  });

  it('settles, rejects or leaves unsettled each id at its hash, the latest decision winning', () => {
    const lines = [
      formatDecision({ time: 't1', verb: 'accept', args: ['S1@aaaaaaaa', 'S2@bbbbbbbb', 'S3@cccccccc'], words: 'ok' }),
    ];
    lines.push(formatDecision({ time: 't2', verb: 'reject', args: ['S2@bbbbbbbb'], words: 'no' }, lines[0]));
    lines.push(formatDecision({ time: 't3', verb: 'accept', args: ['S4@dddddddd'], words: 'late' }, lines[1]));
    const { decisions } = parseDecisions(lines.join('\n') + '\n');
    const { column, latest } = ownerColumn(decisions, { S1: 'aaaaaaaa', S2: 'bbbbbbbb', S3: 'ffffffff', S4: 'dddddddd', S5: 'eeeeeeee' });
    assert.deepEqual(column, { S1: 'settled', S2: 'rejected', S3: 'unsettled', S4: 'settled', S5: 'unsettled' });
    assert.equal(latest.S2.verb, 'reject');
    assert.equal(latest.S3.hash, 'cccccccc');
  });

  it('leaves a property settled when a risk is accepted on one of its cells: only accept and reject decide the owner\'s column', () => {
    const lines = [formatDecision({ time: 't1', verb: 'accept', args: ['A1@aaaaaaaa'], words: 'as deployed' })];
    lines.push(formatDecision({ time: 't2', verb: 'risk', args: ['A1@aaaaaaaa', 'governance-captured', '2026-11-03-2040-tlc-ea0018'], words: 'a captured governance is an incident' }, lines[0]));
    const { column, latest } = ownerColumn(parseDecisions(lines.join('\n') + '\n').decisions, { A1: 'aaaaaaaa' });
    assert.deepEqual(column, { A1: 'settled' });
    assert.equal(latest.A1.verb, 'accept');
  });

  it('reads the latest risk decision on each cell with the trial it was given on, and answers bound to the alternatives as they stand', () => {
    const lines = [formatDecision({ time: 't1', verb: 'risk', args: ['N1@aaaaaaaa', 'lanes-offline', '2026-11-03-2040-tlc-ea0018'], words: 'an incident, not a flaw' })];
    lines.push(formatDecision({ time: 't2', verb: 'risk', args: ['A1@bbbbbbbb', 'governance-captured', '2026-11-03-2041-tlc-ea0019'], words: 'first' }, lines[0]));
    lines.push(formatDecision({ time: 't3', verb: 'risk', args: ['A1@ffffffff', 'governance-captured', '2026-11-03-2042-tlc-ea0020'], words: 'again, on the new words' }, lines[1]));
    lines.push(formatDecision({ time: 't4', verb: 'risk', args: ['A2@cccccccc'], words: 'no scenario' }, lines[2]));
    lines.push(formatDecision({ time: 't5', verb: 'risk', args: ['A3@eeeeeeee', 'all-honest'], words: 'no trial' }, lines[3]));
    lines.push(formatDecision({ time: 't6', verb: 'answer', args: ['D1@dddddddd', 'b'], words: 'b it is' }, lines[4]));
    lines.push(formatDecision({ time: 't7', verb: 'answer', args: ['D2', 'a'], words: 'a, unbound' }, lines[5]));
    const { decisions, broken } = parseDecisions(lines.join('\n') + '\n');
    assert.equal(broken, null);
    assert.deepEqual(acceptedRisks(decisions), {
      'N1|lanes-offline': { time: 't1', words: 'an incident, not a flaw', hash: 'aaaaaaaa', trial: '2026-11-03-2040-tlc-ea0018' },
      'A1|governance-captured': { time: 't3', words: 'again, on the new words', hash: 'ffffffff', trial: '2026-11-03-2042-tlc-ea0020' },
      'A3|all-honest': { time: 't5', words: 'no trial', hash: 'eeeeeeee', trial: null },
    }, 'the latest decision on each cell; whether it still holds is the cell\'s to say');
    assert.deepEqual(answeredDoubts(decisions, { D1: 'dddddddd', D2: 'eeeeeeee' }), { D1: 'b', D2: null }, 'an answer with no hash answers nothing');
    assert.deepEqual(answeredDoubts(decisions, { D1: 'ffffffff', D2: 'eeeeeeee' }), { D1: null, D2: null }, 'changed alternatives reopen the doubt');
  });
});

// ---------------------------------------------------------------- doubts

describe('doubts', () => {
  it('parses an entry with its walks; it is open until a decision answers it', () => {
    const [d1, d2] = parseDoubts('## D1\non: M1 M2, W3\nassumed: a\nWhether the plan survives a tick.\nWalk a: from Idle, schedule; ends Waiting.\nWalk b: from Idle, schedule; ends Idle.\n\n## D2\non: A1\nstatus: answered b\nassumed: a\nWalk a: x\nWalk b: y\n');
    assert.deepEqual(d1, { id: 'D1', hash: 'b6b7ad72', on: ['M1', 'M2', 'W3'], status: 'open', answer: null, assumed: 'a', walks: { a: 'from Idle, schedule; ends Waiting.', b: 'from Idle, schedule; ends Idle.' }, text: 'Whether the plan survives a tick.', malformed: [] });
    assert.deepEqual(d2.malformed, ["status: is not written by hand; the owner's answer decision closes a doubt"], 'a status: line is refused, not ignored');
    assert.equal(d2.status, 'open');
    assert.deepEqual(parseDoubts(''), []);
  });

  it('names what a malformed entry lacks', () => {
    const [d1, d2] = parseDoubts('## D1 on: M1\nstatus: maybe\nassumed: c\nWalk a: x\n\n## D2\n');
    assert.equal(d1.id, 'D1');
    assert.deepEqual(d1.malformed, [
      'the header is "## D<n>" alone; on: and assumed: follow on their own lines',
      "status: is not written by hand; the owner's answer decision closes a doubt",
      'assumed: is a or b',
      'needs "on: <passage ids>"',
      'needs "assumed: a" or "assumed: b"',
      'needs a "Walk a:" line and a "Walk b:" line',
    ]);
    assert.equal(d2.malformed.length, 3);
  });
});

// ---------------------------------------------------------------- the marks ladder

// What the analyze helpers below may override.
type PartOptions = Parameters<typeof analyzePart>[0];
type CompositionOptions = Parameters<typeof analyzeComposition>[0];

describe('the marks of a part', () => {
  const stubKnowledge = (): Knowledge => ({
    ...nullKnowledge(),
    resolve: (ref) => (ref === 'gov-timelock#observation:finalized' ? { ref, hash: 'feedfacefeedface', path: 'modules/gov-timelock/observations/finalized.json' } as Resolved : null),
    backing: (spec: BackingSpec) => (spec.kind === 'certora' && spec.module === 'gov-timelock' ? { status: 'backed', hash: 'cafe', path: 'modules/gov-timelock/source-cache/x' } as Backed : { status: 'unresolved', reason: 'no such file' }),
  });
  // A case on the root at `root`: its Timelock, and what the case reads and writes it with.
  const caseOf = (root: string) => {
    const { write, trial } = rootAt(root);
    const analyze = (extra: Partial<PartOptions> = {}) => analyzePart({ root, id: 'timelock', knowledge: stubKnowledge(), pluginVersion: VERSION, marker: { plugin: VERSION }, actors: readActors(root), others: [], usedBy: [], ...extra });
    // The entry that holds the answer a trial established.
    const entryOfTrial = (id: string) => analyze().answerRows.find(t => t.trial === id)!.entry;
    return { root, write, trial, dir: join(root, 'parts', 'timelock'), results: partResults(root, 'timelock', stubKnowledge()), hashes: loadPart(root, 'timelock').ir.hashes, analyze, entryOfTrial };
  };
  type Case = ReturnType<typeof caseOf>;
  // The trials the stages are built from, each as a case runs it on its own root.
  const chart = (c: Case) => c.trial(c.dir, '2026-11-03-0900-chart-a1a1a1', { call: chartCall, result: c.results.chart(stamp('0900')) });
  const tlc = (c: Case) => c.trial(c.dir, '2026-11-03-0910-tlc-b2b2b2', { call: tlcCall({ TypeOK: 'holds', A1: 'holds', A2: 'holds', N1: 'holds' }), result: c.results.tlc(stamp('0910'), { enabled: ['TypeOK', 'A1', 'A2', 'N1'], outcomes: { TypeOK: 'holds', A1: 'holds', A2: 'holds', N1: 'holds' } }) });
  // An inductive proof of Inv_A1, and a blunder on A1 that catches it.
  const proof = (c: Case) => [
    c.trial(c.dir, '2026-11-03-0920-apalache-c3c3c3', { call: apalacheCall('Inv_A1'), result: c.results.apalache(stamp('0920'), { inv: 'Inv_A1' }) }),
    c.trial(c.dir, '2026-11-03-0930-blunder-d4d4d4', { call: blunderCall('A1'), result: c.results.tlc(stamp('0930'), { kind: 'blunder', enabled: ['A1'], outcomes: { A1: 'violated' }, expect: 'violated' }) }),
  ];
  // A blunder on A2 that A2 survives, a miscall, and its reading's classification.
  const uncaught = (c: Case) => c.trial(c.dir, '2026-11-03-0940-blunder-e5e5e5', { call: blunderCall('A2'), result: c.results.tlc(stamp('0940'), { kind: 'blunder', enabled: ['A2'], outcomes: { A2: 'holds' }, expect: 'violated', result: 'miscalled', miscalls: ['A2: expected violated, got holds'] }) });
  const classify = (d: ReturnType<Case['trial']>) => writeFileSync(d.reading, 'retelling: the wrong leaves A2 standing.\nclassification: model misread prose, action\n');
  // The replay runner's answer on W1 and K3.
  const grounding = (c: Case) => c.trial(c.dir, '2026-11-03-0950-external-f6f6f6', { call: externalCall(['W1', 'K3']), result: c.results.external(stamp('0950'), ['W1', 'K3']) });

  // The stages, each the one before it with one step more: no answer yet, then the chart's, a TLC
  // answer, the proof of A1 with its blunder, the blunder A2 survives, and the replay runner's answer.
  const stages = { blank: '', drawn: '', checked: '', proved: '', hollow: '', grounded: '' };
  const fresh = (t: TestContext, stage: keyof typeof stages) => caseOf(copyStage(t, stages[stage]));
  before(async () => {
    const { root, write } = makeRoot('dossier-marks-');
    write('parts/timelock/prose.md', TIMELOCK);
    write('parts/vault/prose.md', VAULT);
    write('parts/timelock/model/Timelock.tla', TIMELOCK_TLA);
    write('parts/timelock/model/Timelock.cfg', 'SPECIFICATION Spec\nINVARIANTS TypeOK A1 A2 N1\n');
    // The blunders' copies, which their questions execute.
    write('parts/timelock/model/blunders/x.tla', TIMELOCK_TLA.replace('MODULE Timelock', 'MODULE x'));
    for (const prop of ['A1', 'A2']) write(`parts/timelock/model/blunders/x_${prop}.cfg`, `SPECIFICATION Spec\nINVARIANTS ${prop}\n`);
    const drawn = await draw({ root, part: 'timelock' });
    assert.equal(drawn.outcome, 'pass', drawn.error || (drawn.errors || []).join('; '));
    stages.blank = root;
    stages.drawn = stageFrom(stages.blank, root => chart(caseOf(root)));
    stages.checked = stageFrom(stages.drawn, root => tlc(caseOf(root)));
    stages.proved = stageFrom(stages.checked, root => proof(caseOf(root)));
    stages.hollow = stageFrom(stages.proved, root => classify(uncaught(caseOf(root))));
    stages.grounded = stageFrom(stages.hollow, root => grounding(caseOf(root)));
  });
  after(() => { for (const root of Object.values(stages)) if (root) rmSync(root, { recursive: true, force: true }); });

  it('starts pending, with K, X, G and T marked from their own rules', t => {
    const a = fresh(t, 'blank').analyze();
    const m = marksOf(a);
    for (const id of ['S1', 'E1', 'M1', 'R1', 'R5', 'A1', 'O1', 'N1', 'W1']) assert.equal(m[id], 'pending', id);
    assert.equal(m.G1, 'given');
    assert.equal(m.T1, 'text');
    assert.equal(m.X1, 'owed');
    assert.deepEqual([m.K1, m.K2, m.K3, m.K4, m.K5], ['backed', 'unresolved', 'unresolved', 'assumed', 'backed']);
    assert.deepEqual(a.backing.K1, { status: 'backed', hash: 'cafe', path: 'modules/gov-timelock/source-cache/x' });
    assert.deepEqual(a.backing.K2, { status: 'unresolved', reason: 'no such file' });
    assert.equal(a.backing.K3.reason, 'no external answer covers it yet');
    assert.deepEqual(a.backing.K5, { status: 'backed', hash: 'feedfacefeedface', path: 'modules/gov-timelock/observations/finalized.json' });
    assert.ok(flagNames(a).includes('backing unresolved'));
    assert.deepEqual(a.tripwires, []);
    assert.equal(a.summary.pending, 23);
    assert.equal(a.summary.text, 1);
  });

  it('is drawn after a chart trial, except a conditional refusal, which the chart alone checks', t => {
    const c = fresh(t, 'blank');
    chart(c);
    const a = c.analyze();
    const m = marksOf(a);
    for (const id of ['S1', 'S2', 'S3', 'E1', 'E4', 'M1', 'M6', 'R1', 'R4', 'W1', 'A1', 'A2']) assert.equal(m[id], 'drawn', id);
    assert.equal(m.R5, 'checked');
    assert.equal(m.O1, 'pending');
    assert.equal(m.N1, 'pending');
    assert.deepEqual(a.marks.S1.trials, ['2026-11-03-0900-chart-a1a1a1']);
    assert.equal(a.marks.S1.chartCovered, true);
    assert.equal(a.marks.S1.modelCovered, false);
    assert.equal(a.marks.S1.reach, 'the chart over remaining 0..2');
    assert.equal(a.summary.drawn, 20);
  });

  it('is checked after a TLC trial, with Always and Within held, and the walk drawn: the cover of its refused step is no witness', t => {
    const c = fresh(t, 'drawn');
    tlc(c);
    const a = c.analyze();
    const m = marksOf(a);
    for (const id of ['S1', 'S2', 'S3', 'E1', 'E2', 'E3', 'E4', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'R1', 'R2', 'R3', 'R4', 'R5']) assert.equal(m[id], 'checked', id);
    assert.deepEqual([m.A1, m.A2, m.N1, m.O1], ['held', 'held', 'held', 'pending']);
    assert.equal(m.W1, 'drawn', 'R3 covers execute refused at Waiting, not the walk\'s path');
    assert.deepEqual(a.marks.W1.trials, ['2026-11-03-0900-chart-a1a1a1']);
    assert.equal(a.marks.W1.modelCovered, false);
    assert.equal(a.marks.R5.modelCovered, false);
    assert.equal(a.marks.A1.reach, 'delay up to 2');
    assert.deepEqual(a.flags.filter(f => f.name === 'blunder owed').map(f => f.where), ['A1', 'A2', 'N1']);
    assert.ok(!flagNames(a).includes('reworded'));
    assert.deepEqual(a.tripwires, []);
    assert.equal(a.route.pass, 'Encode');
    assert.ok(a.route.why.includes('held, blunder owed: A1 A2 N1'));
  });

  it('is proved by an inductive Apalache trial with a catching blunder, and checked by a bounded one', t => {
    const c = fresh(t, 'checked');
    const [inductive] = proof(c);
    let a = c.analyze();
    assert.equal(a.marks.A1.mark, 'proved');
    assert.deepEqual(a.marks.A1.trials, ['2026-11-03-0920-apalache-c3c3c3', '2026-11-03-0930-blunder-d4d4d4']);
    assert.equal(a.marks.A1.reach, 'unbounded; inductive');
    assert.equal(a.marks.A2.mark, 'held');
    // The mode is the answer's, not the question's: a bounded trial of the same files asks the inductive
    // trial's question again, and its answer replaces the proof.
    const bounded = c.trial(c.dir, '2026-11-03-0935-apalache-c5c5c5', { call: apalacheCall('Inv_A1', 'bounded'), result: c.results.apalache(stamp('0935'), { inv: 'Inv_A1', mode: 'bounded' }) });
    assert.deepEqual([bounded.action, bounded.name], ['published', inductive.name]);
    a = c.analyze();
    assert.equal(a.marks.A1.mark, 'checked', 'the latest model cover is bounded');
    assert.equal(a.marks.A1.reach, '3 steps');
  });

  it('keeps a passage proved when a bounded check of another question runs after the proof: the strongest current cover decides', t => {
    const c = fresh(t, 'blank');
    c.trial(c.dir, '2026-11-03-1100-apalache-aa1100', { call: apalacheCall('Inv_A1'), result: c.results.apalache(stamp('1100'), { inv: 'Inv_A1' }) });
    c.trial(c.dir, '2026-11-03-1101-blunder-aa1101', { call: blunderCall('A1'), result: c.results.tlc(stamp('1101'), { kind: 'blunder', enabled: ['A1'], outcomes: { A1: 'violated' }, expect: 'violated' }) });
    c.trial(c.dir, '2026-11-03-1102-tlc-aa1102', { call: tlcCall({ TypeOK: 'holds', A1: 'holds' }), result: c.results.tlc(stamp('1102'), { enabled: ['TypeOK', 'A1'], outcomes: { TypeOK: 'holds', A1: 'holds' } }) });
    const a = c.analyze();
    assert.equal(a.marks.A1.mark, 'proved', 'the later bounded check does not demote the proof');
    assert.deepEqual(a.marks.A1.trials, ['2026-11-03-1100-apalache-aa1100', '2026-11-03-1101-blunder-aa1101']);
    assert.equal(a.marks.A1.reach, 'unbounded; inductive');
    assert.equal(a.marks.M1.modelCovered, true, 'the check still covers the passages only it touched');
    assert.deepEqual(a.supersededRemovable, [], 'so the check stays, and the proof is not superseded');
  });

  it('keeps a passage miscalled while a miscall that found it violated is current, whatever another question checked after it', t => {
    // A counterexample never hides under a later cover: the second read found this, 2026-11-07.
    const c = fresh(t, 'blank');
    const v = c.trial(c.dir, '2026-11-03-1110-tlc-aa1110', { call: tlcCall({ TypeOK: 'holds', A1: 'holds' }), result: c.results.tlc(stamp('1110'), { enabled: ['TypeOK', 'A1'], outcomes: { TypeOK: 'holds', A1: 'violated' }, result: 'miscalled', miscalls: ['A1: expected holds, got violated'] }) });
    writeFileSync(v.reading, 'retelling: a schedule of 3 slipped in.\nclassification: model misread prose, action\n');
    let a = c.analyze();
    assert.deepEqual([a.marks.A1.mark, a.marks.A1.trials], ['miscalled', ['2026-11-03-1110-tlc-aa1110']]);
    const check = c.trial(c.dir, '2026-11-03-1111-apalache-aa1111', { call: apalacheCall('Inv_A1', 'bounded'), result: c.results.apalache(stamp('1111'), { inv: 'Inv_A1', mode: 'bounded' }) });
    a = c.analyze();
    assert.deepEqual([a.marks.A1.mark, a.marks.A1.trials], ['miscalled', ['2026-11-03-1110-tlc-aa1110']], 'the later bounded check of another question does not hide the counterexample');
    assert.ok(!a.supersededRemovable.includes(v.name) && check.name, 'the miscall, holding a counterexample, is not superseded');
    assert.notEqual(a.route.pass, 'Report', 'the dossier still owes work');
    // The same with a proof after it: the counterexample still stands until the miscall is classified
    // and its question asked again.
    c.trial(c.dir, '2026-11-03-1112-apalache-aa1112', { call: apalacheCall('Inv_A1'), result: c.results.apalache(stamp('1112'), { inv: 'Inv_A1' }) });
    a = c.analyze();
    assert.equal(a.marks.A1.mark, 'miscalled');
  });

  // MARK-DECIDING: a forgotten counterexample decides only when no other answer does. Marks did not read
  // forget at all, 2026-11-07: a forgotten violation still marked the passage miscalled.
  it('lets a counterexample the owner forgot decide a passage only while no other answer does', t => {
    const c = fresh(t, 'blank');
    const v = c.trial(c.dir, '2026-11-03-1140-tlc-ab1140', { call: tlcCall({ TypeOK: 'holds', A1: 'holds' }), result: c.results.tlc(stamp('1140'), { enabled: ['TypeOK', 'A1'], outcomes: { TypeOK: 'holds', A1: 'violated' }, result: 'miscalled', miscalls: ['A1: expected holds, got violated'] }) });
    writeFileSync(v.reading, 'retelling: a schedule of 3 slipped in.\nclassification: model misread prose, action\n');
    decide(c.dir, { time: '2026-11-03T11:41:00Z', verb: 'forget', args: [`${v.name}@${boundAt(c.dir, v.name)}`], words: 'the model misread the prose; let this counterexample go' });
    let a = c.analyze();
    assert.deepEqual([a.marks.A1.mark, a.marks.A1.entries], ['miscalled', [v.name]], 'with no other answer on A1, the forgotten counterexample still decides');
    const check = c.trial(c.dir, '2026-11-03-1142-apalache-ab1142', { call: apalacheCall('Inv_A1', 'bounded'), result: c.results.apalache(stamp('1142'), { inv: 'Inv_A1', mode: 'bounded' }) });
    a = c.analyze();
    assert.deepEqual([a.marks.A1.mark, a.marks.A1.entries], ['held', [check.name]], 'another question\'s answer decides once the owner forgot the counterexample');
  });

  // MARK-DECIDING, rule 7: a miscall is the latest word only while it is current. A miscall whose basis
  // moved still decided, 2026-11-07, over a current cover from another question.
  it('lets only a current miscall decide a passage: once its basis moved, a current cover from another question decides', t => {
    const c = fresh(t, 'blank');
    const cfg = join(c.dir, 'model', 'Timelock.cfg'), was = readFileSync(cfg, 'utf8');
    const cover = c.trial(c.dir, '2026-11-03-1150-apalache-ab1150', { call: apalacheCall('Inv_A1', 'bounded'), result: c.results.apalache(stamp('1150'), { inv: 'Inv_A1', mode: 'bounded' }) });
    // The call predicted A1 violated, and TLC found it holding: a miscall on A1 that is no counterexample.
    const miss = c.trial(c.dir, '2026-11-03-1151-tlc-ab1151', { call: tlcCall({ TypeOK: 'holds', A1: 'violated' }), result: c.results.tlc(stamp('1151'), { enabled: ['TypeOK', 'A1'], outcomes: { TypeOK: 'holds', A1: 'holds' }, expect: { TypeOK: 'holds', A1: 'violated' }, result: 'miscalled', miscalls: ['A1: expected violated, got holds'] }) });
    writeFileSync(miss.reading, 'retelling: A1 held.\nclassification: call was wrong\n');
    let a = c.analyze();
    assert.deepEqual([a.marks.A1.mark, a.marks.A1.entries], ['miscalled', [miss.name]], 'the current miscall is the latest word');
    // The configuration only the miscall's trial executed changes: its basis moved, and the cover's did not.
    writeFileSync(cfg, `${was}\\* a comment the miscall's trial did not read\n`);
    a = c.analyze();
    assert.deepEqual([a.marks.A1.mark, a.marks.A1.entries], ['held', [cover.name]], 'a miscall whose basis moved decides nothing while a current cover stands');
  });

  it('writes a new answer when a passage the answer touched was reworded, so the lapse clears: the rule compares what lapse compares', t => {
    // The audit of 2026-11-07 found the rule comparing only the passages a question names: a reworded
    // event that a model trial covered through its actions lapsed for good, since asking again wrote nothing.
    const c = fresh(t, 'blank');
    const tlcResult = (at: string) => c.results.tlc(stamp(at), { enabled: ['TypeOK', 'A1'], outcomes: { TypeOK: 'holds', A1: 'holds' } });
    c.trial(c.dir, '2026-11-03-1130-chart-ab1130', { call: chartCall, result: c.results.chart(stamp('1130')) });
    c.trial(c.dir, '2026-11-03-1131-tlc-ab1131', { call: tlcCall({ TypeOK: 'holds', A1: 'holds' }), result: tlcResult('1131') });
    assert.notEqual(c.analyze().marks.E1.mark, 'lapsed');
    c.write('parts/timelock/prose.md', TIMELOCK.replace('[E1] schedule, from Governance: a plan is proposed.', '[E1] schedule, from Governance: a plan is put forward.'));
    let a = c.analyze();
    assert.deepEqual([a.marks.E1.mark, a.marks.E1.lapsed], ['lapsed', ['passage E1']], 'the reworded event lapses both covers');
    // The same outcomes, asked again: the basis moved under the answer, so it is written, not kept.
    const again = c.trial(c.dir, '2026-11-03-1132-tlc-ab1132', { call: tlcCall({ TypeOK: 'holds', A1: 'holds' }), result: tlcResult('1132') });
    assert.equal(again.action, 'published', 'a passage the TLC answer touched through its actions moved');
    assert.equal(c.trial(c.dir, '2026-11-03-1133-chart-ab1133', { call: chartCall, result: c.results.chart(stamp('1133')) }).action, 'published');
    a = c.analyze();
    assert.notEqual(a.marks.E1.mark, 'lapsed', 'the lapse clears once both questions are asked again');
    assert.equal(a.marks.E1.lapsed, undefined);
  });

  it('counts only the entries the manifest binds when a recovery asks which answers are superseded', t => {
    // The second read found this, 2026-11-07: an unbound entry stood in for a bound one, and recovery
    // deleted the bound one.
    const c = fresh(t, 'blank'), { dir, root } = c;
    const z = c.trial(dir, '2026-11-03-1120-apalache-aa1120', { call: apalacheCall('Inv_A1', 'bounded'), result: c.results.apalache(stamp('1120'), { inv: 'Inv_A1', mode: 'bounded' }) });
    const yCall = apalacheCall('Inv_A1').replace('  - model/Timelock.tla\n', '  - model/Timelock.tla\n  - model/Timelock.cfg\n');
    const yRes = { ...c.results.apalache(stamp('1121'), { inv: 'Inv_A1' }) };
    yRes.executed = { ...yRes.executed, 'model/Timelock.cfg': fileHash(join(dir, 'model/Timelock.cfg')) };
    const y = c.trial(dir, '2026-11-03-1121-apalache-aa1121', { call: yCall, result: yRes });
    // Y loses its binding: to verify it is unbound, and it covers nothing.
    const m = JSON.parse(readFileSync(join(dir, 'integrity.json'), 'utf8'));
    delete m.evidence[y.name];
    keepManifest(dir, m);
    let a = c.analyze();
    assert.deepEqual([a.marks.A1.mark, a.marks.A1.trials, a.supersededRemovable], ['held', [z.id], []]);
    assert.ok(a.tripwires.some(t => t.name === 'answer unbound'));
    // A trial's bundle staged and its publication interrupted; the owner recovers it.
    const id = '2026-11-03-1122-tlc-aa1122';
    const staging = join(dir, RUNNING, id);
    mkdirSync(staging, { recursive: true });
    const r = c.results.tlc(stamp('1122'), { enabled: ['TypeOK', 'A2'], outcomes: { TypeOK: 'holds', A2: 'holds' } });
    writeFileSync(join(staging, 'call.md'), tlcCall({ TypeOK: 'holds', A2: 'holds' }));
    writeFileSync(join(staging, 'result.json'), JSON.stringify({ ...r, id, dossier: 'parts/timelock', inputIdentity: identityOf(r.executed) }, null, 2) + '\n');
    writeFileSync(join(staging, 'output.txt'), 'out\n');
    writeReceipt(staging, { runner: `dossier@${VERSION}`, at: r.at, executed: r.executed, output: { hash: short('out\n', 64), size: 4, stored: 'trial' } });
    const where: Located = { kind: 'part', id: 'timelock', dir };
    const pub = recoverAnswer(dir, id, answerContext(where, loadPart(root, 'timelock'), dir, { root, knowledge: knowledgeOf(root) }));
    assert.deepEqual([pub.action, pub.superseded], ['published', []], 'the unbound proof stands in for nothing');
    const m2 = JSON.parse(readFileSync(join(dir, 'integrity.json'), 'utf8'));
    assert.ok(existsSync(z.entry) && m2.evidence[z.name] && !m2.evidence[y.name], 'the bound check keeps its file and its line');
    a = c.analyze();
    assert.deepEqual([a.marks.A1.mark, a.marks.A1.trials], ['held', [z.id]]);
  });

  it('is hollow when the latest blunder on it is not caught', t => {
    const c = fresh(t, 'proved');
    const d = uncaught(c);
    let a = c.analyze();
    assert.equal(a.marks.A2.mark, 'hollow');
    assert.deepEqual(a.marks.A2.trials, ['2026-11-03-0940-blunder-e5e5e5']);
    assert.ok(tripNames(a).includes('miscall unclassified'));
    classify(d);
    a = c.analyze();
    assert.deepEqual(a.tripwires, []);
    assert.equal(a.route.pass, 'Encode');
    assert.ok(a.route.why.includes('hollow, a real blunder owed: A2'));
    assert.equal(a.summary.hollow, 1);
  });

  it('checks a walk once a witness matched it on the model side', t => {
    const c = fresh(t, 'hollow');
    c.trial(c.dir, '2026-11-03-0945-tlc-e9e9e9', { call: tlcCall({ TypeOK: 'holds', NotW1: 'violated' }), result: c.results.tlc(stamp('0945'), { enabled: ['TypeOK', 'NotW1'], outcomes: { TypeOK: 'holds', NotW1: 'violated' }, expect: { TypeOK: 'holds', NotW1: 'violated' } }) });
    const a = c.analyze();
    assert.equal(a.marks.W1.mark, 'checked');
    assert.deepEqual(a.marks.W1.trials, ['2026-11-03-0900-chart-a1a1a1', '2026-11-03-0945-tlc-e9e9e9']);
    assert.equal(a.marks.W1.modelCovered, true);
  });

  it('is grounded by an external answer, which also backs an external guarantee', t => {
    const c = fresh(t, 'hollow');
    const external = grounding(c);
    assert.match(external.name, /^external-K3-W1-[0-9a-f]{6}$/, 'the entry is named for the passages the trial expects outcomes for');
    const a = c.analyze();
    assert.equal(a.marks.W1.grounded, true);
    assert.equal(a.marks.W1.groundedBy, '2026-11-03-0950-external-f6f6f6');
    assert.equal(a.marks.W1.mark, 'drawn', 'grounded, and still owed a witness on the model side');
    assert.equal(a.marks.M1.grounded, false);
    assert.equal(a.marks.K3.mark, 'backed');
    assert.deepEqual(a.backing.K3, { status: 'backed', path: `evidence/${external.name}.json` }, 'backed by the entry that holds the external answer');
  });

  it('backs an external guarantee from the latest external answer on it alone: as called, and at its current words', t => {
    const c = fresh(t, 'grounded');
    const external = c.entryOfTrial('2026-11-03-0950-external-f6f6f6');
    const miss = c.trial(c.dir, '2026-11-03-0955-external-a9a9a9', { call: externalCall(['K3']), result: { ...c.results.external(stamp('0955'), ['K3']), outcomes: { K3: 'fail' }, covers: [], result: 'miscalled', miscalls: ['K3: expected pass, got fail'] } });
    assert.notEqual(miss.name, external, 'an external trial on K3 alone asks another question than the one on W1 and K3');
    writeFileSync(miss.reading, 'classification: call was wrong\n');
    const a = c.analyze();
    assert.deepEqual(a.backing.K3, { status: 'unresolved', reason: `evidence/${miss.name}.json, the latest external answer on it, did not cover it as called` });
    assert.equal(a.marks.K3.mark, 'unresolved');
    assert.ok(a.flags.some(f => f.name === 'backing unresolved' && f.where.startsWith(`K3: evidence/${miss.name}.json`)));
    // At its current words: a copy of its own, where the replay runner's answer is still the latest.
    const w = fresh(t, 'grounded');
    w.write('parts/timelock/prose.md', TIMELOCK.replace('[K3] The executor is public.', '[K3] The executor is open to anyone.'));
    assert.deepEqual(w.analyze().backing.K3, { status: 'unresolved', reason: `K3 changed since evidence/${external}.json` });
    w.write('parts/timelock/prose.md', TIMELOCK);
    assert.equal(w.analyze().backing.K3.status, 'backed');
  });

  it('checks a seam only when the counterpart states the same seam', t => {
    const c = fresh(t, 'grounded');
    assert.equal(c.analyze().marks.X1.mark, 'owed');
    const others = seamsOf({ vault: loadPart(c.root, 'vault') });
    assert.equal(c.analyze({ others }).marks.X1.mark, 'checked');
    c.write('parts/vault/prose.md', VAULT.replace('change carries the new ceiling.', 'change carries the old line.'));
    assert.equal(c.analyze({ others: seamsOf({ vault: loadPart(c.root, 'vault') }) }).marks.X1.mark, 'owed');
  });

  it('seals a settled passage whose mark is checked, proved, text, given or backed, and no open doubt', t => {
    const c = fresh(t, 'grounded'), { hashes } = c;
    decide(c.dir, { time: '2026-11-03T10:00:00Z', verb: 'accept', args: [`S1@${hashes.S1}`, `A1@${hashes.A1}`, `A2@${hashes.A2}`, `T1@${hashes.T1}`, `G1@${hashes.G1}`, `K1@${hashes.K1}`, `O1@${hashes.O1}`, `M2@${hashes.M2}`], words: 'as deployed' });
    decide(c.dir, { time: '2026-11-03T10:01:00Z', verb: 'reject', args: [`M6@${hashes.M6}`], words: 'cancel from Ready is wrong' });
    c.write('parts/timelock/doubts.md', '## D1\non: M2\nassumed: a\nWhether the tick counts down or waits.\nWalk a: from Waiting, tick; ends Waiting.\nWalk b: from Waiting, tick; ends Ready.\n');
    const a = c.analyze();
    assert.deepEqual([a.owner.S1, a.owner.M6, a.owner.M1], ['settled', 'rejected', 'unsettled']);
    assert.deepEqual(['S1', 'A1', 'T1', 'G1', 'K1'].map(id => a.marks[id].confirmed), [true, true, true, true, true]);
    assert.equal(a.marks.A2.confirmed, false, 'hollow is not confirmed');
    assert.equal(a.marks.O1.confirmed, false, 'pending is not confirmed');
    assert.equal(a.marks.M2.confirmed, false, 'an open doubt keeps it unconfirmed');
    assert.deepEqual(a.marks.M2.doubt, ['D1']);
    assert.equal(a.marks.M3.confirmed, false, 'unsettled');
    assert.equal(a.summary.confirmed, 5);
    assert.equal(a.summary.settled, 8);
    assert.equal(a.summary.rejected, 1);
    assert.ok(flagNames(a).includes('doubt open'));
    assert.equal(a.route.pass, 'Write');
    assert.deepEqual(a.route.why, ['rejected: M6']);
  });

  it('marks miscalled only the mismatched property of a miscalled answer, while the passages it covered stay checked', t => {
    const c = fresh(t, 'grounded');
    const d = c.trial(c.dir, '2026-11-03-1010-tlc-a7a7a7', { call: tlcCall({ TypeOK: 'holds', A1: 'holds', A2: 'holds' }), result: c.results.tlc(stamp('1010'), { enabled: ['TypeOK', 'A1', 'A2'], outcomes: { TypeOK: 'holds', A1: 'violated', A2: 'holds' }, result: 'miscalled', miscalls: ['A1: expected holds, got violated'] }) });
    writeFileSync(d.reading, 'retelling: a schedule of 3 slipped in.\nclassification: model misread prose, action\n');
    const a = c.analyze();
    assert.equal(a.marks.A1.mark, 'miscalled');
    assert.deepEqual(a.marks.A1.trials, ['2026-11-03-1010-tlc-a7a7a7']);
    assert.equal(a.marks.A2.mark, 'hollow', 'a later ordinary trial covers A2 again, and its latest blunder still held');
    assert.deepEqual(a.marks.A2.trials, ['2026-11-03-0940-blunder-e5e5e5']);
    for (const id of ['S1', 'S2', 'E1', 'M1', 'M3', 'R1']) assert.equal(a.marks[id].mark, 'checked', id);
    assert.equal(a.summary.miscalled, 1);
    assert.deepEqual(a.tripwires, []);
    const why = a.route.why.find(w => w.startsWith('miscalled, model misread the prose: '));
    assert.ok(why && why.includes(`evidence/${d.name}.json`), a.route.why.join('; '));
  });

  it('lapses a passage whose words changed since its answers, and only that one', t => {
    const c = fresh(t, 'grounded');
    c.write('parts/timelock/prose.md', TIMELOCK.replace('[A2] Always, while Idle, remaining is 0.', '[A2] Always, while Idle, remaining is at most 0.'));
    const a = c.analyze();
    assert.equal(a.marks.A2.mark, 'lapsed');
    assert.equal(a.marks.A1.mark, 'proved');
    assert.equal(a.marks.S1.mark, 'checked');
    assert.equal(a.route.pass, 'Refresh');
    assert.deepEqual(a.route.why, ['lapsed: A2']);
    c.write('parts/timelock/prose.md', TIMELOCK);
    assert.equal(c.analyze().marks.A2.mark, 'hollow', 'back to its latest touch, the hollow blunder');
  });

  it('counts a blunder only at the words it caught: a reworded Always is held until a blunder catches it again', t => {
    const c = fresh(t, 'grounded');
    c.write('parts/timelock/prose.md', TIMELOCK.replace('[A1] Always, remaining is at most 2.', '[A1] Always, remaining is below 3.'));
    assert.equal(c.analyze().marks.A1.mark, 'lapsed');
    // Each trial asks a question already answered, on a basis that moved: each answer replaces the entry.
    for (const [id, call, result] of [
      ['2026-11-03-1015-chart-b0b0b0', chartCall, c.results.chart(stamp('1015'))],
      ['2026-11-03-1020-apalache-b1b1b1', apalacheCall('Inv_A1'), c.results.apalache(stamp('1020'), { inv: 'Inv_A1' })],
    ] as [string, string, TrialResult][]) assert.equal(c.trial(c.dir, id, { call, result }).action, 'published', id);
    let a = c.analyze();
    assert.equal(a.marks.A1.mark, 'held', 'the blunder that caught A1 caught the earlier words');
    assert.ok(a.flags.some(f => f.name === 'blunder owed' && f.where === 'A1'));
    assert.equal(c.trial(c.dir, '2026-11-03-1030-blunder-b2b2b2', { call: blunderCall('A1'), result: c.results.tlc(stamp('1030'), { kind: 'blunder', enabled: ['A1'], outcomes: { A1: 'violated' }, expect: 'violated' }) }).action, 'published');
    a = c.analyze();
    assert.equal(a.marks.A1.mark, 'proved');
    assert.deepEqual(a.marks.A1.trials, ['2026-11-03-1020-apalache-b1b1b1', '2026-11-03-1030-blunder-b2b2b2']);
    assert.equal(caseOf(stages.grounded).analyze().marks.A1.mark, 'proved', 'the stage the case copied is as it was built');
  });

  it('lapses what a model answer covered when a file it executed moved since, and names the file; once the file is gone, its question is', t => {
    const c = fresh(t, 'grounded');
    const cfg = join(c.dir, 'model', 'Timelock.cfg');
    const was = readFileSync(cfg, 'utf8');
    const chartEntry = c.entryOfTrial('2026-11-03-0900-chart-a1a1a1'), tlcEntry = c.entryOfTrial('2026-11-03-0910-tlc-b2b2b2');
    writeFileSync(cfg, was + '\\* a comment\n');
    const a = c.analyze();
    assert.equal(a.marks.M1.mark, 'lapsed');
    assert.deepEqual(a.marks.M1.lapsed, ['executed model/Timelock.cfg']);
    assert.equal(a.marks.N1.mark, 'lapsed');
    assert.equal(a.marks.A1.mark, 'proved', 'its model cover is the Apalache trial, which executed Timelock.tla alone');
    assert.equal(a.marks.T1.mark, 'text');
    assert.equal(a.route.pass, 'Refresh');
    assert.deepEqual(a.route.why, ['lapsed: S1 S2 S3 E1 E2 E3 E4 M1 M2 M3 M4 M5 M6 R1 R2 R3 R4 A2 N1 (executed model/Timelock.cfg)']);
    assert.ok(renderPartLedger(a, { version: VERSION, now: 't', previous: null }).includes(`\n| M1 | Move | When Idle receives schedule, it becomes Waiting, with remaining delay. | unsettled | lapsed, moved: executed model/Timelock.cfg | [chart-a1a1a1](evidence/${chartEntry}.json), [tlc-b2b2b2](evidence/${tlcEntry}.json) | delay up to 2 |\n`), 'each trial id links to the entry that holds its answer');
    // A question whose executed file is gone no longer exists: it covers nothing until the next
    // publication removes it, and verify flags it.
    rmSync(cfg);
    const gone = c.analyze();
    assert.deepEqual(gone.flags.filter(f => f.name === 'question gone'), [{ name: 'question gone', entry: tlcEntry, where: `evidence/${tlcEntry}.json: model/Timelock.cfg is gone; the next publication removes it` }]);
    assert.deepEqual([gone.marks.M1.mark, gone.marks.M1.trials], ['drawn', ['2026-11-03-0900-chart-a1a1a1']], 'the chart\'s cover alone stands');
    assert.equal(gone.marks.N1.mark, 'pending', 'no answer covers it');
    assert.deepEqual(gone.tripwires, [], 'a flag, never a tripwire');
    writeFileSync(cfg, was);
    assert.equal(c.analyze().marks.M1.mark, 'checked');
  });

  it('covers nothing with a property a TLC answer reports only as holding so far, having stopped at another\'s violation', t => {
    const { root, results, hashes } = fresh(t, 'blank');
    const ir = loadPart(root, 'timelock').ir;
    const stopped = (partial: string[], kind = 'tlc') => answerFrom('2026-11-03-1100-tlc-c1c1c1', results.tlc(stamp('1100'), { kind, enabled: ['TypeOK', 'A1', 'A2'], outcomes: { TypeOK: 'holds', A1: 'violated', A2: 'holds' }, partial }));
    const cut = coversOf({ completed: [stopped(['TypeOK', 'A2'])], ir, hashes });
    assert.equal(cut.covers.A2, undefined, 'A2 held only up to the state where A1 failed');
    assert.ok(cut.touches.A2);
    assert.ok(coversOf({ completed: [stopped([])], ir, hashes }).covers.A2, 'a trial that completed covers it');
    const blunder = stopped(['A2'], 'blunder');
    assert.deepEqual([coversOf({ completed: [blunder], ir, hashes }).hollow.A2, coversOf({ completed: [blunder], ir, hashes }).caught.A1], [undefined, [blunder.name]], 'nor shows it hollow');
  });

  it('counts a walk only through a TLC witness: an Apalache NotW holding, or a blunder reaching the walk, says nothing of it', t => {
    const { root, results, hashes } = fresh(t, 'blank');
    const ir = loadPart(root, 'timelock').ir;
    const apalache = (outcome: string) => answerFrom('2026-11-03-1110-apalache-d1d1d1', { ...results.apalache(stamp('1110'), { inv: 'NotW1', outcome }), result: 'as-called' });
    for (const outcome of ['holds', 'violated']) {
      const read = coversOf({ completed: [apalache(outcome)], ir, hashes });
      assert.deepEqual([read.covers.W1, read.touches.W1, read.caught.W1, read.hollow.W1], [undefined, undefined, undefined, undefined], `an Apalache NotW1 that ${outcome}`);
    }
    const blunder = answerFrom('2026-11-03-1120-blunder-d2d2d2', results.tlc(stamp('1120'), { kind: 'blunder', enabled: ['NotW1'], outcomes: { NotW1: 'violated' } }));
    const read = coversOf({ completed: [blunder], ir, hashes });
    assert.deepEqual([read.touches.W1, read.caught.W1, read.hollow.W1], [undefined, undefined, undefined]);
  });

  it('reads each entry in evidence/ as the answer its trial established, in the order they were established', t => {
    const { root, dir, hashes } = fresh(t, 'grounded');
    const read = readEvidence(dir, manifestOf(dir).evidence, {}, 'parts/timelock');
    assert.deepEqual([read.removed, read.stray, read.notes], [[], [], []]);
    assert.deepEqual(read.answers.map(a => a.entry?.established.trial), ['2026-11-03-0900-chart-a1a1a1', '2026-11-03-0910-tlc-b2b2b2', '2026-11-03-0920-apalache-c3c3c3', '2026-11-03-0930-blunder-d4d4d4', '2026-11-03-0940-blunder-e5e5e5', '2026-11-03-0950-external-f6f6f6']);
    const a = read.answers.find(x => x.entry?.established.trial === '2026-11-03-0910-tlc-b2b2b2')!;
    assert.ok(completed(a), 'it reads, nothing is wrong with it, and its trial completed');
    assert.equal(a.entry.question.kind, 'tlc');
    assert.match(a.name, /^tlc-A1-A2-N1-[0-9a-f]{6}$/, 'the entry is named for its question: the kind, the passages it expects, six hex of its digest');
    assert.deepEqual(a.problems, []);
    const { covers, touches, caught, hollow } = coversOf({ completed: [a], ir: loadPart(root, 'timelock').ir, hashes });
    assert.deepEqual(Object.keys(covers).sort(), ['A1', 'A2', 'E1', 'E2', 'E3', 'E4', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'N1', 'R1', 'R2', 'R3', 'R4', 'S1', 'S2', 'S3']);
    assert.ok(touches.R5 && !covers.R5, 'a conditional refusal is touched, not covered, by absence');
    assert.deepEqual([caught, hollow], [{}, {}]);
    assert.equal(covers.A1[0].hash, hashes.A1);
  });
});

// One TLC trial of a Timelock that pins a record, with a guarantee backed by a Certora rule, K5
// backed by a record, and O1 and N1 citing G1; the knowledge base answers as each test sets it.
describe('what a part mark rests on', () => {
  const PIN = 'gov-timelock#observation:deployed', RECORD = 'gov-timelock#observation:finalized';
  const PINNED = TIMELOCK.replace('Module: gov-timelock\n', `Module: gov-timelock\nPins: ${PIN}\n`);
  const at = ({ pin = '1111111111111111', record = '2222222222222222', certora = 'aaaa' } = {}): Knowledge => ({
    ...nullKnowledge(),
    resolve: (ref) => (ref === PIN || ref === RECORD ? { ref, hash: ref === PIN ? pin : record, path: `modules/gov-timelock/observations/${ref.split(':')[1]}.json` } as Resolved : null),
    backing: (spec: BackingSpec) => (spec.kind === 'certora' ? { status: 'backed', hash: certora, path: 'modules/gov-timelock/source-cache/x' } as Backed : { status: 'unresolved', reason: 'no such file' }),
  });
  // The stage, built once: the Timelock and its one TLC answer. Each case works on a copy of it.
  let tried = '';
  const fresh = (t: TestContext) => {
    const root = copyStage(t, tried);
    return { root, write: rootAt(root).write, analyze: (knowledge: Knowledge) => analyzePart({ root, id: 'timelock', knowledge, pluginVersion: VERSION, marker: { plugin: VERSION }, actors: readActors(root) }) };
  };

  before(() => {
    const { root, write, trial } = makeRoot('dossier-rests-');
    write('parts/timelock/prose.md', PINNED);
    write('parts/timelock/model/Timelock.tla', TIMELOCK_TLA);
    write('parts/timelock/model/Timelock.cfg', 'SPECIFICATION Spec\nINVARIANTS TypeOK A1 N1\n');
    const results = partResults(root, 'timelock', at());
    trial(join(root, 'parts', 'timelock'), '2026-11-03-0900-tlc-a1a1a1', { call: tlcCall({ TypeOK: 'holds', A1: 'holds', N1: 'holds' }), result: results.tlc(stamp('0900'), { enabled: ['TypeOK', 'A1', 'N1'], outcomes: { TypeOK: 'holds', A1: 'holds', N1: 'holds' } }) });
    tried = root;
  });
  after(() => rmSync(tried, { recursive: true, force: true }));

  it('holds while the records, the backing and the Givens stand as the trial found them', t => {
    const a = fresh(t).analyze(at());
    assert.deepEqual([a.marks.A1.mark, a.marks.N1.mark, a.marks.O1.mark], ['held', 'held', 'pending']);
    assert.deepEqual(a.pins, { [PIN]: '1111111111111111' });
    assert.deepEqual(a.tripwires, []);
  });

  it('lapses what a model answer covered when a record the part pins moved', t => {
    const a = fresh(t).analyze(at({ pin: '3333333333333333' }));
    assert.deepEqual([a.marks.A1.mark, a.marks.N1.mark, a.marks.M1.mark], ['lapsed', 'lapsed', 'lapsed']);
    assert.deepEqual(a.marks.A1.lapsed, [`record ${PIN}`]);
    assert.deepEqual([a.marks.G1.mark, a.marks.T1.mark], ['given', 'text'], 'a Given and a Words-only passage have no trial to lapse');
    assert.equal(a.route.pass, 'Refresh');
    assert.match(a.route.why[0], new RegExp(`^lapsed: S1 .* \\(record ${PIN}\\)$`));
  });

  it('lapses it when a guarantee\'s backing moved: a Certora rule\'s hash, or a backing record\'s', t => {
    const { analyze } = fresh(t);
    assert.deepEqual([analyze(at({ certora: 'bbbb' })).marks.A1.mark, analyze(at({ certora: 'bbbb' })).marks.A1.lapsed], ['lapsed', ['backing K1']]);
    assert.deepEqual(analyze(at({ record: '4444444444444444' })).marks.A1.lapsed, ['backing K5']);
    assert.equal(analyze({ ...at(), backing: () => ({ status: 'unresolved', reason: 'the spec is gone' }) }).marks.A1.mark, 'lapsed', 'a backing that no longer resolves moved too');
  });

  it('lapses an Always, Once or Within whose cited Given moved since its cover, and only those', t => {
    const { write, analyze } = fresh(t);
    write('parts/timelock/prose.md', PINNED.replace('If this is false, plans wait forever.', 'If this is false, plans may wait forever.'));
    const a = analyze(at());
    assert.equal(a.marks.N1.mark, 'lapsed', 'N1 cites G1');
    assert.deepEqual(a.marks.N1.lapsed, ['passage G1']);
    assert.equal(a.marks.A1.mark, 'held', 'A1 cites no Given');
    assert.equal(a.marks.O1.mark, 'pending', 'O1 cites G1 but no trial covered it');
    assert.deepEqual(a.route.why, ['lapsed: N1 (passage G1)']);
  });

  it('leaves an Always that cites a Given untried in a charted piece, and keeps it out of the chart\'s debts', async t => {
    const { root, write, analyze } = fresh(t);
    write('parts/timelock/prose.md', PINNED.replace('Tier: modeled', 'Tier: charted').replace('[A2] Always, while Idle, remaining is 0.', '[A2] Always, while Idle, remaining is 0, given G1.'));
    assert.equal((await draw({ root, part: 'timelock' })).ok, true);
    const a = analyze(at());
    assert.deepEqual(a.tripwires, []);
    assert.deepEqual([a.marks.A2.mark, a.marks.O1.mark, a.marks.N1.mark], ['untried', 'untried', 'untried']);
    assert.equal(a.route.pass, 'Draw');
    const owed = a.route.why.find(w => w.startsWith('no chart answer covers: '))!;
    assert.ok(owed.split(': ')[1].split(' ').includes('A1') && !owed.split(': ')[1].split(' ').includes('A2'), owed);
  });
});

// ---------------------------------------------------------------- cells

// What sysResult builds a composition trial's result from, beside its time.
interface CompositionResultOptions { kind?: string; checker?: string; property: string; scenario: string; outcome?: string; expected?: string; mode?: string | null; result?: Verdict; outcomes?: Record<string, string> | null; values?: Reach['values'] }

describe('the cells of a composition', () => {
  // A case on the root at `root`, which reads the knowledge base `knowledge` answers for: Supply there,
  // the results of its trials, and what the case reads and writes it with.
  const caseOf = (root: string, knowledge: Knowledge = nullKnowledge()) => {
    const { write, trial } = rootAt(root);
    // expected is what the call predicted for the cell's property; outcome what came back.
    const sysResult = (at: string, { kind = 'tlc', checker = 'tlc', property, scenario, outcome = 'holds', expected = outcome, mode = null, result = 'as-called', outcomes = null, values = { MaxSent: 4 } }: CompositionResultOptions): Result => {
      const loaded = loadComposition(root, 'supply');
      return {
        kind, checker, dossier: 'compositions/supply', id: 'x', at, versions: {}, command: [], cwd: '.', exit: 0, seconds: 1, property, scenario,
        executed: checker === 'apalache' ? generatedHashes(loaded) : generatedHashes(loaded, `model/generated/${property}_${scenario.replace(/-/g, '_')}.cfg`),
        enabled: checker === 'apalache' ? [`Inv_${property}`] : ['TypeOK', property],
        expect: checker === 'apalache' ? { [`Inv_${property}`]: { expect: expected } } : { TypeOK: { expect: 'holds' }, [property]: { expect: expected } },
        outcomes: outcomes || (checker === 'apalache' ? { [`Inv_${property}`]: outcome } : { TypeOK: 'holds', [property]: outcome }),
        mode, length: mode === 'bounded' ? 4 : null, trace: outcome === 'violated' ? [{ index: 1, action: 'Initial predicate', values: {} }] : null, actions: {}, init: {} as TrialResult['init'], properties: {},
        runs: checker === 'apalache' && mode === 'inductive' ? ['base', 'step'].map(label => ({ label, outcome: 'NoError', length: 0, exitcode: 0, violatedInvariant: null, errors: [] })) : [],
        reach: { text: 'amounts up to 2', values }, snapshot: snapshotOf({ where: { kind: 'composition', id: 'supply' } as Located, loaded, knowledge, call: { scenario } as Call }), result, miscalls: [],
      };
    };
    const analyze = (extra: Partial<CompositionOptions> = {}) => analyzeComposition({ root, id: 'supply', parts: loadAllParts(root), knowledge, pluginVersion: VERSION, marker: { plugin: VERSION }, ...extra });
    return { root, write, trial, sdir: join(root, 'compositions', 'supply'), sysResult, analyze };
  };
  type Case = ReturnType<typeof caseOf>;
  // A cell's call: TLC on its configuration, a blunder there, which expects the property violated, or inductive Apalache.
  const sysCall = (property: string, scenario: string, kind = 'tlc', expected = 'holds') => (kind === 'tlc' || kind === 'blunder'
    ? `kind: ${kind}\n${kind === 'blunder' ? 'blunder: the wrong\n' : ''}property: ${property}\nscenario: ${scenario}\nexecutes:\n  - model/generated/Supply.tla\n  - model/generated/${property}_${scenario.replace(/-/g, '_')}.cfg\nreach: amounts up to 2\nexpect:\n  TypeOK: holds\n  ${property}: ${kind === 'blunder' ? 'violated' : expected}\nbecause: |\n  b\n`
    : `kind: ${kind}\nmode: inductive\nproperty: ${property}\nscenario: ${scenario}\nexecutes:\n  - model/generated/Supply.tla\nreach: amounts up to 2\nexpect:\n  Inv_${property}: ${expected}\nbecause: |\n  b\n`);
  const cellMarks = (a: CompositionAnalysis) => Object.fromEntries(a.cells.map(c => [`${c.property}|${c.scenario}`, c.mark]));
  // Four trials on Supply's cells: A1 proved under user-malicious, A2 checked under all-honest, a
  // blunder that catches A2 and one A1 survives, whose miscall the reading classifies.
  const tryCells = (c: Case) => {
    c.trial(c.sdir, '2026-11-03-0900-apalache-a1a1a1', { call: sysCall('A1', 'user-malicious', 'apalache'), result: c.sysResult(stamp('0900'), { kind: 'apalache', checker: 'apalache', property: 'A1', scenario: 'user-malicious', mode: 'inductive' }) });
    c.trial(c.sdir, '2026-11-03-0910-tlc-b2b2b2', { call: sysCall('A2', 'all-honest'), result: c.sysResult(stamp('0910'), { property: 'A2', scenario: 'all-honest' }) });
    c.trial(c.sdir, '2026-11-03-0920-blunder-c3c3c3', { call: sysCall('A2', 'all-honest', 'blunder'), result: c.sysResult(stamp('0920'), { kind: 'blunder', property: 'A2', scenario: 'all-honest', outcome: 'violated' }) });
    const d = c.trial(c.sdir, '2026-11-03-0930-blunder-d4d4d4', { call: sysCall('A1', 'all-honest', 'blunder'), result: c.sysResult(stamp('0930'), { kind: 'blunder', property: 'A1', scenario: 'all-honest', outcome: 'holds', expected: 'violated', result: 'miscalled' }) });
    writeFileSync(d.reading, 'classification: model misread prose, property\n');
  };

  // The stages: Supply over the Adapter and the Token with no answer yet, and with the four trials.
  const stages = { blank: '', tried: '' };
  const fresh = (t: TestContext, stage: keyof typeof stages, knowledge?: Knowledge) => caseOf(copyStage(t, stages[stage]), knowledge);
  before(() => {
    const { root, write } = makeRoot('dossier-cells-');
    write('parts/adapter/prose.md', ADAPTER);
    write('parts/token/prose.md', TOKEN);
    write('compositions/supply/wiring.md', COMPOSITION);
    write('compositions/supply/prose.md', SUPPLY);
    stages.blank = root;
    stages.tried = stageFrom(stages.blank, root => tryCells(caseOf(root)));
  });
  after(() => { for (const root of Object.values(stages)) if (root) rmSync(root, { recursive: true, force: true }); });

  it('claims one cell per property and scenario, pending at first, with every property held', t => {
    const a = fresh(t, 'blank').analyze();
    assert.deepEqual(a.composed.errors, []);
    assert.deepEqual(cellMarks(a), { 'A1|all-honest': 'pending', 'A1|user-malicious': 'pending', 'A2|all-honest': 'pending', 'A2|breaker-offline': 'pending' });
    assert.deepEqual(a.propertyHeld, { A1: 'held', A2: 'held' });
    assert.equal(a.route.pass, 'Try');
    assert.ok(a.route.why[0].startsWith('cells pending: A1×all-honest'));
    assert.deepEqual(flagNames(a), ['blunder owed', 'blunder owed']);
    assert.deepEqual(a.tripwires, []);
  });

  it('is checked by TLC, proved by inductive Apalache, implied under a weaker scenario, and held or hollow per property', t => {
    const c = fresh(t, 'blank');
    tryCells(c);
    const a = c.analyze();
    assert.deepEqual(cellMarks(a), { 'A1|all-honest': 'implied', 'A1|user-malicious': 'proved', 'A2|all-honest': 'checked', 'A2|breaker-offline': 'pending' });
    const implied = a.cells.find(c => c.property === 'A1' && c.scenario === 'all-honest')!;
    assert.equal(implied.impliedBy, 'user-malicious');
    assert.equal(implied.trial, '2026-11-03-0900-apalache-a1a1a1');
    const proved = a.cells.find(c => c.scenario === 'user-malicious')!;
    assert.equal(proved.trial, '2026-11-03-0900-apalache-a1a1a1');
    assert.deepEqual(proved.reach, { text: 'amounts up to 2', values: { MaxSent: 4 } });
    assert.deepEqual(proved.lapsed, []);
    assert.deepEqual(a.propertyHeld, { A1: 'hollow', A2: 'caught' });
    assert.deepEqual(flagNames(a), ['hollow', 'review owed']);
    assert.equal(a.route.pass, 'Try');
    assert.deepEqual(a.route.why, ['cells pending: A2×breaker-offline', 'blunders owed: A1 (hollow)']);
    assert.equal(a.summary.proved, 1);
    assert.equal(a.summary.implied, 1);
    assert.equal(a.summary.hollow, 1);
  });

  it('marks a violated cell accepted while its entry names the trial the owner was shown, and owes a decision, naming what moved, once a new answer replaces it', t => {
    const c = fresh(t, 'tried'), { sdir } = c;
    const call = sysCall('A2', 'breaker-offline', 'apalache', 'violated').replace('mode: inductive', 'mode: bounded\nlength: 4');
    const violation = (id: string, hhmm: string, values: Reach['values'] = { MaxSent: 4 }) => c.trial(sdir, id, { call, result: c.sysResult(stamp(hhmm), { kind: 'apalache', checker: 'apalache', property: 'A2', scenario: 'breaker-offline', mode: 'bounded', outcome: 'violated', values }) });
    const cell = () => c.analyze().cells.find(x => x.property === 'A2' && x.scenario === 'breaker-offline')!;
    violation('2026-11-03-0940-apalache-e5e5e5', '0940');
    let a = c.analyze();
    assert.equal(cell().mark, 'violated');
    assert.equal(cell().accepted, null);
    assert.deepEqual(cell().trace, [{ index: 1, action: 'Initial predicate', values: {} }]);
    assert.ok(a.route.why.includes('violated, a decision owed: A2×breaker-offline'));
    const accepted = { time: '2026-11-03T10:00:00Z', words: 'the breaker being offline is an incident', hash: a.hashes.A2, trial: '2026-11-03-0940-apalache-e5e5e5' };
    decide(sdir, { time: accepted.time, verb: 'risk', args: [`A2@${a.hashes.A2}`, 'breaker-offline', accepted.trial], words: accepted.words });
    a = c.analyze();
    assert.equal(cell().mark, 'violated');
    assert.deepEqual(cell().accepted, accepted);
    assert.equal(cell().acceptanceLapsed, undefined);
    assert.equal(a.summary.accepted, 1);
    assert.ok(!a.route.why.some(w => w.startsWith('violated') || w.startsWith('acceptance')));
    // A trial that gives the same answer again on an unchanged basis writes nothing: the entry still
    // names the trial the owner was shown, and the acceptance holds.
    assert.equal(violation('2026-11-03-0942-apalache-e5e5e7', '0942').action, 'kept');
    assert.equal(cell().trial, '2026-11-03-0940-apalache-e5e5e5');
    assert.deepEqual(cell().accepted, accepted);
    const shown = committed(sdir);
    // Any new answer to the cell replaces it, a new reach on an unchanged basis too: its violation owes a
    // new decision, and the lapse says nothing moved under the answer the owner accepted.
    const sameBasis = ['a new answer on an unchanged basis'];
    assert.equal(violation('2026-11-03-0943-apalache-e5e5e8', '0943', { MaxSent: 5 }).action, 'published');
    a = c.analyze();
    assert.deepEqual([cell().mark, cell().trial, cell().accepted, cell().acceptanceLapsed], ['violated', '2026-11-03-0943-apalache-e5e5e8', null, sameBasis]);
    assert.equal(a.summary.accepted, 0);
    assert.ok(a.route.why.includes('violated, a decision owed: A2×breaker-offline'));
    assert.ok(a.route.why.includes(`acceptance lapsed: A2×breaker-offline (${sameBasis[0]})`));
    shown();
    assert.deepEqual(cell().accepted, accepted, 'the entry restored from version control names the trial the owner was shown again');
    // The same scenario name over a malicious Breaker: the answer lapses, and the violation a new trial
    // shows under it carries no acceptance; the lapse names what moved under the accepted answer.
    const moved = ['generated module', 'scenario breaker-offline'];
    c.write('actors/scenarios.md', SCENARIOS.replace('modes: { breaker: offline }', 'modes: { breaker: malicious }'));
    assert.deepEqual([cell().mark, cell().lapsed], ['lapsed', moved]);
    assert.equal(cell().accepted, null);
    assert.equal(violation('2026-11-03-0941-apalache-e5e5e6', '0941').action, 'published', 'the basis moved, so the same violation replaces the entry');
    a = c.analyze();
    assert.equal(cell().mark, 'violated');
    assert.equal(cell().accepted, null, 'the owner accepted an offline Breaker, not a malicious one');
    assert.deepEqual(cell().acceptanceLapsed, moved);
    assert.equal(a.summary.accepted, 0);
    assert.ok(a.route.why.includes('violated, a decision owed: A2×breaker-offline'));
    assert.ok(a.route.why.includes(`acceptance lapsed: A2×breaker-offline (${moved.join(', ')})`));
    c.write('actors/scenarios.md', SCENARIOS);
    shown();
    assert.deepEqual(cell().accepted, accepted, 'back on the basis the owner was shown, with the entry that names its trial, the acceptance holds');
    assert.equal(caseOf(stages.tried).analyze().cells.find(x => x.property === 'A2' && x.scenario === 'breaker-offline')!.mark, 'pending', 'the stage the case copied is as it was built');
  });

  it('names what moved under the accepted answer while the entry keeps it as its previous answer', t => {
    const c = fresh(t, 'tried'), { sdir } = c;
    // The cell asked by TLC, once with TypeOK expected to hold and then with it expected violated: one
    // question, whose outcomes differ, so the first answer becomes the entry's previous one.
    const ask = (id: string, hhmm: string, typeOK: string) => c.trial(sdir, id, {
      call: sysCall('A2', 'breaker-offline', 'tlc', 'violated').replace('TypeOK: holds', `TypeOK: ${typeOK}`),
      result: { ...c.sysResult(stamp(hhmm), { property: 'A2', scenario: 'breaker-offline', outcome: 'violated' }), expect: { TypeOK: { expect: typeOK }, A2: { expect: 'violated' } }, outcomes: { TypeOK: typeOK, A2: 'violated' } },
    });
    const cell = () => c.analyze().cells.find(x => x.property === 'A2' && x.scenario === 'breaker-offline')!;
    // A TLC cell rests on its scenario's configuration as well as on the module and the scenario.
    const moved = ['generated module', 'scenario breaker-offline', 'executed model/generated/A2_breaker_offline.cfg'];
    ask('2026-11-03-1000-tlc-aaaa01', '1000', 'holds');
    decide(sdir, { time: '2026-11-03T10:01:00Z', verb: 'risk', args: [`A2@${c.analyze().hashes.A2}`, 'breaker-offline', '2026-11-03-1000-tlc-aaaa01'], words: 'an offline breaker is an incident' });
    assert.ok(cell().accepted);
    c.write('actors/scenarios.md', SCENARIOS.replace('modes: { breaker: offline }', 'modes: { breaker: malicious }'));
    assert.deepEqual([cell().mark, cell().lapsed], ['lapsed', moved], 'the accepted answer lapses on what moved under it');
    assert.equal(ask('2026-11-03-1010-tlc-aaaa02', '1010', 'violated').action, 'published');
    assert.deepEqual([cell().mark, cell().acceptanceLapsed], ['violated', moved], 'the new answer replaced the accepted one, and says what had moved under it');
    c.write('actors/scenarios.md', SCENARIOS);
    // Back on the accepted answer's basis, the same violation again replaces the one in between: the
    // accepted answer is still the entry's previous one, and nothing moved under it since.
    assert.equal(ask('2026-11-03-1020-tlc-aaaa03', '1020', 'violated').action, 'published');
    assert.deepEqual([cell().mark, cell().trial, cell().accepted, cell().acceptanceLapsed], ['violated', '2026-11-03-1020-tlc-aaaa03', null, ['a new answer on an unchanged basis']]);
    assert.equal(caseOf(stages.tried).analyze().cells.find(x => x.property === 'A2' && x.scenario === 'breaker-offline')!.mark, 'pending', 'the stage the case copied is as it was built');
  });

  it('marks a TLC cell violated by the outcome of its own property, not of TypeOK', t => {
    const c = fresh(t, 'tried');
    const d = c.trial(c.sdir, '2026-11-03-0945-tlc-e6e6e6', { call: sysCall('A2', 'breaker-offline', 'tlc', 'violated'), result: c.sysResult(stamp('0945'), { property: 'A2', scenario: 'breaker-offline', outcome: 'violated' }) });
    const a = c.analyze();
    const cell = a.cells.find(x => x.property === 'A2' && x.scenario === 'breaker-offline')!;
    assert.deepEqual([cell.trial, cell.entry], ['2026-11-03-0945-tlc-e6e6e6', d.name], 'the cell names its deciding answer by its trial and by its entry');
    assert.deepEqual(a.completed.find(x => x.name === cell.entry)!.entry.answer.outcomes, { TypeOK: 'holds', A2: 'violated' });
    assert.equal(cell.mark, 'violated');
  });

  it('lapses every cell whose member moved, and names what moved', t => {
    const c = fresh(t, 'tried');
    c.write('parts/token/prose.md', TOKEN.replace('a count from 0 to 4', 'a count from 0 to 3').replace('supply is at most 4', 'supply is at most 3').replace('<= 4', '<= 3').replace('> 4', '> 3'));
    const a = c.analyze();
    assert.deepEqual(cellMarks(a), { 'A1|all-honest': 'pending', 'A1|user-malicious': 'lapsed', 'A2|all-honest': 'lapsed', 'A2|breaker-offline': 'pending' });
    assert.deepEqual(a.cells.find(x => x.scenario === 'user-malicious')!.lapsed, ['generated module', 'member token'], 'the member\'s words, and the module composed from them');
    assert.equal(a.route.pass, 'Refresh');
    c.write('parts/token/prose.md', TOKEN);
    assert.equal(c.analyze().cells.find(x => x.scenario === 'user-malicious')!.mark, 'proved');
  });

  it('lapses on the passage, the wiring, the module, the scenario, the actors, extras, a record or the configuration it ran', () => {
    const then: Snapshot = { passages: { A1: 'a' }, wiring: 'c', module: 'm', scenario: 's', actors: 'x', extras: null, members: { adapter: { prose: 'p', backing: {} } }, records: { 'adapter#contract:adapter': 'r' }, backing: {} };
    const now = stubPresent({ passages: { A1: 'a' }, members: { adapter: { prose: 'p', backing: {} } }, records: { 'adapter#contract:adapter': 'r' }, configs: { 'model/generated/A1_all_honest.cfg': 'k' } });
    const ran = { 'model/generated/Supply.tla': 'whole', 'model/generated/A1_all_honest.cfg': 'k' };
    const basis = (snapshot: Snapshot, executed: Record<string, string> = {}) => ({ snapshot, executed, inputIdentity: identityOf({}) });
    assert.deepEqual(lapsedParts(basis(then, ran), now, 'A1', 'all-honest'), []);
    assert.deepEqual(lapsedParts(basis({ ...then, passages: { A1: 'b' }, wiring: 'd', extras: 'e' }), now, 'A1', 'all-honest'), ['passage A1', 'wiring', 'extras.tla']);
    assert.deepEqual(lapsedParts(basis(then), { ...now, scenario: () => 't', actors: 'y', members: {}, records: { 'adapter#contract:adapter': 'q' } }, 'A1', 'all-honest'), ['scenario all-honest', 'actors', 'member adapter gone', 'record adapter#contract:adapter']);
    assert.deepEqual(lapsedParts(basis(then), { ...now, module: () => 'n', members: { adapter: { prose: 'q', backing: {} } } }, 'A1', 'all-honest'), ['generated module', 'member adapter']);
    assert.deepEqual(lapsedParts(basis(then), { ...now, module: () => null }, 'A1', 'all-honest'), ['generated module'], 'a module that no longer composes moves every cell that rests on it');
    assert.deepEqual(lapsedParts(basis(then, ran), { ...now, configs: { 'model/generated/A1_all_honest.cfg': 'l' } }, 'A1', 'all-honest'), ['executed model/generated/A1_all_honest.cfg']);
    assert.deepEqual(lapsedParts(basis(then, ran), { ...now, configs: {} }, 'A1', 'all-honest'), ['executed model/generated/A1_all_honest.cfg gone']);
  });

  it('lapses every cell when the composed module moved, as an only when that no property cites moves it', t => {
    const c = fresh(t, 'tried');
    const given = (k: number) => SUPPLY.replace('## Words only', `## Given\n[G1] Given that a user exits one unit at a time. If this is false, the supply moves in larger steps. Actor: the user, on adapter.exit, only when {amount <= ${k}}.\n\n## Words only`);
    c.write('compositions/supply/prose.md', given(1));
    c.trial(c.sdir, '2026-11-03-0958-tlc-d9d9d9', { call: sysCall('A2', 'breaker-offline'), result: c.sysResult(stamp('0958'), { property: 'A2', scenario: 'breaker-offline' }) });
    const cell = (a: CompositionAnalysis) => a.cells.find(x => x.property === 'A2' && x.scenario === 'breaker-offline')!;
    const a = c.analyze();
    assert.deepEqual(a.composed.errors, []);
    assert.ok(a.generated.includes('(amount <= 1)'), 'the condition is in the module');
    assert.equal(cell(a).mark, 'checked');
    c.write('compositions/supply/prose.md', given(2));
    assert.deepEqual([cell(c.analyze()).mark, cell(c.analyze()).lapsed], ['lapsed', ['generated module']], 'G1 is cited by no property; the module it changed is');
  });

  it('lapses only the cells of the scenario whose constants moved: each scenario rests on its own ConstInit line of the module', t => {
    const { write, analyze } = fresh(t, 'tried');
    const before = analyze();
    const proved = before.cells.find(c => c.property === 'A1' && c.scenario === 'user-malicious')!;
    assert.equal(proved.mark, 'proved', 'an Apalache cell, which reads its scenario\'s ConstInit line');
    write('actors/scenarios.md', SCENARIOS.replace('modes: { breaker: offline }', 'modes: { breaker: malicious }'));
    const other = analyze();
    assert.notEqual(other.generated, before.generated, 'the module carries every claimed scenario\'s constants');
    assert.deepEqual(cellMarks(other), cellMarks(before), 'another scenario\'s constants move no cell');
    write('actors/scenarios.md', SCENARIOS.replace('modes: { user: malicious }', 'modes: { user: malicious, breaker: malicious }'));
    const own = analyze();
    assert.deepEqual(own.cells.find(c => c.property === 'A1' && c.scenario === 'user-malicious')!.lapsed, ['generated module', 'scenario user-malicious'], 'its own constants, and its scenario');
    assert.deepEqual(own.cells.filter(c => c.mark === 'lapsed').map(c => `${c.property}|${c.scenario}`), ['A1|user-malicious']);
    write('actors/scenarios.md', SCENARIOS);
    assert.deepEqual(cellMarks(analyze()), cellMarks(before));
  });

  it('compares the generated module through the scenario it rests on, never as a captured file', () => {
    const tla = (until: number, a1 = 'TRUE') => `---- MODULE S ----\nCONSTANTS K\nConstInit_all_honest == K = 0\nConstInit_lanes_down_two == K = ${until}\nA1 == ${a1}\n====\n`;
    assert.equal(moduleHash(tla(2), 'all-honest'), moduleHash(tla(6), 'all-honest'), 'another scenario\'s line moves nothing');
    assert.notEqual(moduleHash(tla(2), 'lanes-down-two'), moduleHash(tla(6), 'lanes-down-two'), 'its own line moves it');
    assert.notEqual(moduleHash(tla(2), 'all-honest'), moduleHash(tla(2, 'FALSE'), 'all-honest'), 'the rest of the module moves it');
    const strong = 'Strong == ConstInit_lanes_down_two /\\ A1';
    assert.notEqual(moduleHash(tla(2), 'all-honest', strong), moduleHash(tla(6), 'all-honest', strong), 'a line extras.tla reads stays, since an invariant may rest on it');
    assert.notEqual(moduleHash(tla(2).replace('====', `${strong}\n====`), 'all-honest'), moduleHash(tla(6).replace('====', `${strong}\n====`), 'all-honest'), 'and so does one the module reads elsewhere');
    assert.equal(moduleHash(tla(2), 'all-honest', ''), moduleHash(tla(2), 'all-honest'), 'no extras.tla reads as none');
    assert.equal(moduleHash(null, 'all-honest'), null);
    const then: Snapshot = { passages: { A1: 'a' }, wiring: 'c', module: moduleHash(tla(2), 'all-honest'), scenario: 's', actors: 'x', extras: null, members: {}, records: {}, backing: {} };
    const now = stubPresent({ passages: { A1: 'a' }, module: sid => moduleHash(tla(6), sid), inputs: { 'model/generated/S.tla': 'the file as it is now' } });
    assert.deepEqual(lapsedParts({ snapshot: then, executed: {}, inputIdentity: { ...identityOf({}), files: { 'model/generated/S.tla': 'the file as it ran' } } }, now, 'A1', 'all-honest'), []);
  });

  it('hashes a scenario as the cells rest on it: the modes and windows of the actors the composition uses and its members\' starts, without notes or stronger_than', () => {
    const sc = (over: Partial<Scenario> = {}): Scenario => ({ id: 'user-malicious', modes: { user: 'malicious' }, windows: {}, start: {}, strongerThan: ['all-honest'], notes: null, ...over });
    const used = ['breaker', 'user'], members = ['adapter', 'token'];
    const base = scenarioHash(sc(), used, members);
    assert.equal(scenarioHash(sc({ notes: 'a note', strongerThan: [] }), used, members), base);
    assert.equal(scenarioHash(sc({ modes: { user: 'malicious', governance: 'offline' } }), used, members), base, 'Governance sends nothing Supply hears');
    assert.equal(scenarioHash(sc({ modes: { user: 'malicious', breaker: 'honest' } }), used, members), base, 'honest said aloud is honest');
    assert.equal(scenarioHash(sc({ start: { 'vault.debt': 1 } }), used, members), base, 'a start of another composition\'s member');
    assert.notEqual(scenarioHash(sc({ modes: { user: 'offline' } }), used, members), base);
    assert.notEqual(scenarioHash(sc({ windows: { user: { from: 1, until: null } } }), used, members), base);
    assert.notEqual(scenarioHash(sc({ start: { 'adapter.held': 1 } }), used, members), base);
    assert.equal(scenarioHash(undefined, used, members), null);
  });

  it('counts a composition blunder only at the property\'s current words, the latest blunder there deciding', () => {
    const blunder = (at: string, outcome: string, passage: string) => compositionAnswer({ trial: `2026-11-03-${at}-blunder-a1a1a1`, kind: 'blunder', result: outcome === 'violated' ? 'as-called' : 'miscalled', outcomes: { A1: outcome }, snapshot: { passages: { A1: passage } } });
    const composition = { prose: { properties: [{ id: 'A1', scenarios: null }] }, wiring: { scenarios: [] }, actors: { scenarioById: { 'all-honest': { id: 'all-honest', strongerThan: [] } } } } as unknown as Pick<CompositionLoad, 'prose' | 'wiring' | 'actors'>;
    const held = (completed: Readable[]) => cellsOf({ composition, completed, snapshotNow: stubPresent({ passages: { A1: 'now' } }), risks: {} }).propertyHeld.A1;
    assert.equal(held([blunder('0900', 'violated', 'then')]), 'held', 'a catch of the earlier words is no catch of these');
    assert.equal(held([blunder('0900', 'violated', 'now')]), 'caught');
    assert.equal(held([blunder('0900', 'violated', 'now'), blunder('0910', 'holds', 'now')]), 'hollow', 'the latest blunder at these words held');
    assert.equal(held([blunder('0900', 'holds', 'now'), blunder('0910', 'violated', 'now')]), 'caught');
    assert.equal(held([blunder('0900', 'holds', 'now'), blunder('0910', 'violated', 'then')]), 'hollow');
  });

  it('marks a cell pending, not checked, when its property only held as far as a trial that stopped at another violation', () => {
    const composition = { prose: { properties: [{ id: 'A1', scenarios: null, givens: [] }] }, wiring: { scenarios: [] }, actors: { scenarioById: { 'all-honest': { id: 'all-honest', strongerThan: [] } } } } as unknown as Pick<CompositionLoad, 'prose' | 'wiring' | 'actors'>;
    const run = (partial: string[]) => compositionAnswer({ trial: '2026-11-03-0900-tlc-a1a1a1', outcomes: { TypeOK: 'violated', A1: 'holds' }, partial });
    const mark = (partial: string[]) => cellsOf({ composition, completed: [run(partial)], snapshotNow: stubPresent(), risks: {} }).cells[0].mark;
    assert.equal(mark(['A1']), 'pending');
    assert.equal(mark([]), 'checked');
  });

  // MARK-DECIDING on a cell, as on a passage's side: a counterexample never hides under another
  // question's answer. A miscall that found A1 violated was left out of the ranking, 2026-11-07, so a
  // later proof from another question showed the cell proved.
  it('lets no later proof from another question hide a current miscall that found the property violated', () => {
    const composition = { prose: { properties: [{ id: 'A1', scenarios: null, givens: [] }] }, wiring: { scenarios: [] }, actors: { scenarioById: { 'all-honest': { id: 'all-honest', strongerThan: [] } } } } as unknown as Pick<CompositionLoad, 'prose' | 'wiring' | 'actors'>;
    const miscall = compositionAnswer({ trial: '2026-11-03-0900-tlc-a1a1a1', result: 'miscalled', outcomes: { TypeOK: 'holds', A1: 'violated' } });
    const proof = compositionAnswer({ trial: '2026-11-03-0910-apalache-b2b2b2', kind: 'apalache', checker: 'apalache', mode: 'inductive', outcomes: { Inv_A1: 'holds' } });
    const cell = (completed: Readable[], { forgotten = () => false, now = stubPresent() }: { forgotten?: (name: string) => boolean; now?: PresentState } = {}) => cellsOf({ composition, completed, snapshotNow: now, risks: {}, forgotten }).cells[0];
    assert.deepEqual([cell([proof]).mark, cell([proof]).entry], ['proved', proof.name]);
    assert.deepEqual([cell([miscall, proof]).mark, cell([miscall, proof]).entry], ['miscalled', miscall.name], 'the counterexample decides, though the proof came later');
    assert.equal(cell([miscall, proof], { forgotten: name => name === miscall.name }).mark, 'proved', 'once the owner forgot it, the proof decides');
    const asCalled = compositionAnswer({ trial: '2026-11-03-0900-tlc-c3c3c3', outcomes: { TypeOK: 'holds', A1: 'violated' } });
    assert.equal(cell([asCalled, proof]).mark, 'violated', 'as an answer that found it violated as called does');
    const lapsedMiscall = compositionAnswer({ trial: '2026-11-03-0900-tlc-a1a1a1', result: 'miscalled', outcomes: { TypeOK: 'holds', A1: 'violated' }, snapshot: { wiring: 'an earlier wiring' } });
    assert.equal(cell([lapsedMiscall, proof]).mark, 'proved', 'a miscall whose basis moved decides nothing while the proof is current');
  });

  it('lapses a cell when a record pinned by an actor the composition hears from moved since the trial', t => {
    const pinnedAt = (hash: string): Knowledge => ({ ...nullKnowledge(), resolve: (ref) => (ref === 'adapter#contract:adapter' ? { ref, hash, path: 'modules/adapter/contracts/contracts.md' } as Resolved : null) });
    const c = fresh(t, 'tried', pinnedAt('1111111111111111'));
    c.write('actors/actors.md', PINNED_ACTORS);
    c.trial(c.sdir, '2026-11-03-0950-tlc-f7f7f7', { call: sysCall('A2', 'breaker-offline'), result: c.sysResult(stamp('0950'), { property: 'A2', scenario: 'breaker-offline' }) });
    const cell = (a: CompositionAnalysis) => a.cells.find(x => x.property === 'A2' && x.scenario === 'breaker-offline')!;
    const same = cell(c.analyze());
    assert.deepEqual(same.dependencies!.records, { 'adapter#contract:adapter': '1111111111111111' }, 'the trial hashed the user\'s pin, and not Governance\'s');
    assert.equal(same.mark, 'checked');
    const moved = cell(c.analyze({ knowledge: pinnedAt('2222222222222222') }));
    assert.equal(moved.mark, 'lapsed');
    assert.deepEqual(moved.lapsed, ['record adapter#contract:adapter']);
  });

  it('lapses a cell whose property cites a Given that moved since the trial, and names the Given', () => {
    const t = compositionAnswer({ trial: '2026-11-03-0900-tlc-a1a1a1', outcomes: { TypeOK: 'holds', A1: 'holds' }, snapshot: { passages: { A1: 'a', G1: 'g' } } });
    const now = stubPresent({ passages: { A1: 'a', G1: 'h' } });
    assert.deepEqual(lapsedParts(t.entry.basis, now, 'A1', 'all-honest', ['G1']), ['passage G1']);
    assert.deepEqual(lapsedParts(t.entry.basis, now, 'A1', 'all-honest'), [], 'a Given the property does not cite moves nothing');
    const composition = { prose: { properties: [{ id: 'A1', scenarios: null, givens: ['G1'] }] }, wiring: { scenarios: [] }, actors: { scenarioById: { 'all-honest': { id: 'all-honest', strongerThan: [] } } } } as unknown as Pick<CompositionLoad, 'prose' | 'wiring' | 'actors'>;
    const [cell] = cellsOf({ composition, completed: [t], snapshotNow: now, risks: {} }).cells;
    assert.deepEqual([cell.mark, cell.lapsed], ['lapsed', ['passage G1']]);
  });

  it('lapses a cell when a member guarantee\'s backing moved since the trial, and names the member\'s backing', t => {
    const backedAt = (hash: string): Knowledge => ({ ...nullKnowledge(), resolve: (ref) => (ref === 'token#property:mint-only' ? { ref, hash, path: 'modules/token/properties.md' } as Resolved : null) });
    const c = fresh(t, 'tried', backedAt('1111111111111111'));
    c.write('parts/token/prose.md', TOKEN.replace('## Words only', '## Guarantees\n[K1] Only the adapter mints. Backing: record token#property:mint-only.\n\n## Words only'));
    c.trial(c.sdir, '2026-11-03-0955-tlc-a8a8a8', { call: sysCall('A2', 'breaker-offline'), result: c.sysResult(stamp('0955'), { property: 'A2', scenario: 'breaker-offline' }) });
    const cell = (a: CompositionAnalysis) => a.cells.find(x => x.property === 'A2' && x.scenario === 'breaker-offline')!;
    const same = cell(c.analyze());
    assert.deepEqual(same.dependencies!.members!.token.backing, { K1: '1111111111111111' }, 'the trial hashed the member\'s backing');
    assert.equal(same.mark, 'checked');
    const moved = cell(c.analyze({ knowledge: backedAt('2222222222222222') }));
    assert.equal(moved.mark, 'lapsed');
    assert.deepEqual(moved.lapsed, ['member token backing']);
    assert.deepEqual(cell(c.analyze({ knowledge: nullKnowledge() })).lapsed, ['member token backing'], 'a backing that no longer resolves moved too');
  });

  it('lapses on the actors the composition hears from, not on a note or on an actor whose events reach no member', t => {
    const { write, analyze } = fresh(t, 'tried');
    const before = cellMarks(analyze());
    assert.deepEqual(analyze().composed.actors, ['breaker', 'user']);
    write('actors/actors.md', ACTORS.replace('    name: the user\n    kind: user\n', '    name: the user\n    kind: user\n    notes: any address that holds credit\n'));
    assert.deepEqual(cellMarks(analyze()), before, 'a note moves no cell');
    write('actors/actors.md', ACTORS.replace('  - id: breaker\n', '  - id: keeper\n    name: the keeper\n    kind: keeper\n  - id: breaker\n').replace('    name: Governance\n    kind: governance\n', '    name: Governance\n    kind: multisig\n'));
    assert.deepEqual(cellMarks(analyze()), before, 'neither does an actor Supply does not hear from');
    write('actors/actors.md', ACTORS.replace('    name: the Breaker\n    kind: multisig\n', '    name: the Breaker\n    kind: multisig\n    modes: [honest, offline]\n'));
    const a = analyze();
    assert.deepEqual(a.cells.filter(c => c.trial && c.mark === 'lapsed').map(c => [`${c.property}×${c.scenario}`, c.lapsed]), [['A1×user-malicious', ['actors']], ['A2×all-honest', ['actors']]]);
  });

  it('flags a cell narrowed when a new answer reaches less than the one it replaced, until an answer looks as far again', t => {
    const c = fresh(t, 'tried');
    const at = (id: string, hhmm: string, MaxSent: number) => c.trial(c.sdir, id, { call: sysCall('A2', 'all-honest'), result: c.sysResult(stamp(hhmm), { property: 'A2', scenario: 'all-honest', values: { MaxSent } }) });
    const d = at('2026-11-03-0957-tlc-c9c9c9', '0957', 2);
    assert.equal(d.action, 'published', 'the cell\'s question, answered again at a smaller reach');
    const a = c.analyze();
    assert.deepEqual(a.flags.filter(f => f.name === 'narrowed'), [{ name: 'narrowed', entry: d.name, where: `evidence/${d.name}.json reaches less than an answer it replaced (MaxSent 4→2)` }]);
    assert.deepEqual(a.tripwires, [], 'a flag, never a tripwire');
    assert.equal(at('2026-11-03-0958-tlc-c9c9ca', '0958', 2).action, 'kept', 'the same answer again writes nothing');
    assert.ok(flagNames(c.analyze()).includes('narrowed'), 'and the entry still keeps the further reach');
    assert.equal(at('2026-11-03-0959-tlc-c9c9cb', '0959', 4).action, 'published');
    assert.ok(!flagNames(c.analyze()).includes('narrowed'), 'an answer that looks as far again clears it');
    assert.ok(!flagNames(caseOf(stages.tried).analyze()).includes('narrowed'), 'the stage the case copied is as it was built');
  });

  it('flags a cell narrowed when an answer to another of its questions reaches less than the one before it', t => {
    const c = fresh(t, 'tried');
    // The cell asked without TypeOK: another question on the same cell, beside the one 0910 answered.
    const other = c.trial(c.sdir, '2026-11-03-0957-tlc-c9c9cc', { call: sysCall('A2', 'all-honest').replace('  TypeOK: holds\n', ''), result: { ...c.sysResult(stamp('0957'), { property: 'A2', scenario: 'all-honest', values: { MaxSent: 2 } }), enabled: ['A2'], expect: { A2: { expect: 'holds' } }, outcomes: { A2: 'holds' } } });
    const a = c.analyze();
    const before = a.answerRows.find(row => row.trial === '2026-11-03-0910-tlc-b2b2b2')!.entry;
    assert.notEqual(other.name, before);
    assert.deepEqual(a.flags.filter(f => f.name === 'narrowed'), [{ name: 'narrowed', where: `A2×all-honest: evidence/${other.name}.json reaches less than evidence/${before}.json (MaxSent 4→2)` }]);
    assert.ok(!flagNames(caseOf(stages.tried).analyze()).includes('narrowed'), 'the stage the case copied is as it was built');
  });

  it('opens every cell while the closure is missing, from the edges the knowledge base lists', t => {
    const { analyze } = fresh(t, 'tried');
    const edges = ({ types, asset }: EdgeFilter) => (types!.includes('mints_asset') && asset === 'hrd' ? [{ module: 'vault', id: 'e1', type: 'mints_asset', from: 'contract:vault', to: 'asset:hrd' }, { module: 'adapter', id: 'e2', type: 'mints_asset', from: 'contract:adapter', to: 'asset:hrd' }] as Edge[] : []);
    const a = analyze({ knowledge: { ...nullKnowledge(), edges } });
    assert.deepEqual(a.closureMissing, ['vault owns an edge on hrd (mints_asset) but is not a member']);
    assert.ok(a.cells.every(c => c.open === true));
    assert.equal(a.cells.find(c => c.scenario === 'user-malicious')!.mark, 'proved', 'the mark itself stands');
    assert.ok(flagNames(a).includes('closure open'));
    assert.equal(a.route.pass, 'Compose');
    assert.deepEqual(a.route.why, ['closure open: vault owns an edge on hrd (mints_asset) but is not a member']);
    assert.equal(a.summary.open, 1);
    assert.equal(analyze().route.pass, 'Try');
  });

  it('computes cells from a hand-built composition too, marking an undeclared scenario open', () => {
    const composition = { prose: { properties: [{ id: 'A1', scenarios: ['all-honest', 'ghost'] }] }, wiring: { scenarios: [] }, actors: { scenarioById: { 'all-honest': { id: 'all-honest', strongerThan: [] } } } } as unknown as Pick<CompositionLoad, 'prose' | 'wiring' | 'actors'>;
    const { cells, propertyHeld } = cellsOf({ composition, completed: [], snapshotNow: stubPresent(), risks: {} });
    assert.deepEqual(cells.map(c => [c.scenario, c.mark]), [['all-honest', 'pending'], ['ghost', 'open']]);
    assert.equal(cells[1].problem, 'scenario ghost is not declared');
    assert.deepEqual(propertyHeld, { A1: 'held' });
  });
});

// ---------------------------------------------------------------- walks

describe('the walks of a composition', () => {
  const WALKED = SUPPLY.replace('## Words only', '## Walks\n[W1] Walk Exit: from adapter.Open, adapter.exit amount 1; ends adapter.Open.\n\n## Words only');
  const witnessCall = 'kind: tlc\nwalk: W1\nscenario: all-honest\nexecutes:\n  - model/generated/Supply.tla\n  - model/generated/W1_all_honest.cfg\nreach: amounts up to 2\nexpect:\n  TypeOK: holds\n  NotW1: violated; trace: 0 > 1\ntrace-data: token_supply\nbecause: |\n  one exit mints one\n';
  // A case on the root at `root`: Supply there with its walk, a witness's result, and what the case
  // reads and writes it with.
  const caseOf = (root: string) => {
    const { write, trial } = rootAt(root);
    // A composition witness's result as the runner writes it: the walk beside its scenario, TypeOK and NotW1 enabled.
    const witness = (at: string, result: Verdict = 'as-called'): Result => ({
      kind: 'tlc', checker: 'tlc', dossier: 'compositions/supply', id: 'x', at, versions: {}, command: [], cwd: '.', exit: 12, seconds: 1,
      property: null, scenario: 'all-honest', walk: 'W1',
      executed: generatedHashes(loadComposition(root, 'supply'), 'model/generated/W1_all_honest.cfg'),
      enabled: ['TypeOK', 'NotW1'], expect: { TypeOK: { expect: 'holds' }, NotW1: { expect: 'violated', trace: ['0', '1'] } }, outcomes: { TypeOK: 'holds', NotW1: 'violated' },
      trace: [], properties: {}, reach: { text: 'amounts up to 2', values: { MaxSent: 4 } },
      snapshot: snapshotOf({ where: { kind: 'composition', id: 'supply' } as Located, loaded: loadComposition(root, 'supply'), knowledge: nullKnowledge(), call: { scenario: 'all-honest' } as Call }),
      result, miscalls: result === 'miscalled' ? ['NotW1: expected the trace 0 > 1, got 0 > 2'] : [],
    });
    const analyze = () => analyzeComposition({ root, id: 'supply', parts: loadAllParts(root), knowledge: nullKnowledge(), pluginVersion: VERSION, marker: { plugin: VERSION } });
    return { root, write, trial, sdir: join(root, 'compositions', 'supply'), witness, analyze };
  };
  type Case = ReturnType<typeof caseOf>;
  // The witness that finds W1's path as called.
  const witnessed = (c: Case) => c.trial(c.sdir, '2026-11-03-0900-tlc-a1a1a1', { call: witnessCall, result: c.witness(stamp('0900')) });

  // The stages: Supply with its walk and no answer yet, and with the witness's answer.
  const stages = { blank: '', witnessed: '' };
  const fresh = (t: TestContext, stage: keyof typeof stages) => caseOf(copyStage(t, stages[stage]));
  before(() => {
    const { root, write } = makeRoot('dossier-walks-');
    write('parts/adapter/prose.md', ADAPTER);
    write('parts/token/prose.md', TOKEN);
    write('compositions/supply/wiring.md', COMPOSITION);
    write('compositions/supply/prose.md', WALKED);
    stages.blank = root;
    stages.witnessed = stageFrom(stages.blank, root => witnessed(caseOf(root)));
  });
  after(() => { for (const root of Object.values(stages)) if (root) rmSync(root, { recursive: true, force: true }); });

  it('marks each walk pending under its scenario until a witness completes, and owes the Composition loop for it', t => {
    const a = fresh(t, 'blank').analyze();
    assert.deepEqual(a.composed.errors, []);
    assert.deepEqual(a.tripwires, []);
    assert.deepEqual(a.walks, [{ id: 'W1', scenario: 'all-honest', mark: 'pending', trial: null, entry: null, lapsed: [] }]);
    assert.equal(a.route.pass, 'Try');
    assert.ok(a.route.why.includes('walks pending: W1'), a.route.why.join('; '));
  });

  it('checks a walk whose witness found its path as called, in the walks table and the machine form, with the summary as it was', t => {
    const c = fresh(t, 'blank'), { analyze } = c;
    const pending = renderCompositionLedger(analyze(), { version: VERSION, now: stamp('0850'), previous: null });
    assert.ok(pending.includes('\n| walk | scenario | mark | trial |\n| --- | --- | --- | --- |\n| W1 | all-honest | pending |  |\n'));
    const witness = witnessed(c);
    assert.match(witness.name, /^tlc-W1-all-honest-[0-9a-f]{6}$/, 'the witness\'s entry is named for its walk and scenario');
    const a = analyze();
    assert.deepEqual(a.walks.map(w => [w.id, w.scenario, w.mark, w.trial, w.entry]), [['W1', 'all-honest', 'checked', '2026-11-03-0900-tlc-a1a1a1', witness.name]]);
    assert.deepEqual(a.cells.map(x => x.mark), ['pending', 'pending', 'pending', 'pending'], 'a witness settles no cell');
    assert.ok(!a.route.why.some(w => w.startsWith('walks pending')), a.route.why.join('; '));
    const ledger = renderCompositionLedger(a, { version: VERSION, now: stamp('0900'), previous: pending });
    assert.ok(ledger.includes(`\n| walk | scenario | mark | trial |\n| --- | --- | --- | --- |\n| W1 | all-honest | checked | [tlc-a1a1a1](evidence/${witness.name}.json) |\n`));
    assert.ok(ledger.includes('\nSince last rebuild: W1×all-honest pending→checked; answers new 2026-11-03-0900-tlc-a1a1a1\n'));
    assert.deepEqual((parseMachineForm(ledger) as CompositionLedgerForm).walks, [{ id: 'W1', scenario: 'all-honest', mark: 'checked', trial: '2026-11-03-0900-tlc-a1a1a1', entry: witness.name }]);
    assert.ok(summaryLine(a).startsWith('Supply: 2 properties × 3 scenarios · 4 cells · '), 'the summary counts cells, not walks');
    assert.deepEqual((parseMachineForm(renderCompositionLedger({ ...a, walks: [] }, { version: VERSION, now: stamp('0900'), previous: null })) as CompositionLedgerForm).walks, [], 'a composition without walks keeps an empty list');
  });

  it('marks a walk miscalled when its latest witness missed, and lapsed when the walk moved since', t => {
    // The same witness asked again: its miss replaces the answer that found the path.
    const c = fresh(t, 'witnessed');
    const d = c.trial(c.sdir, '2026-11-03-0910-tlc-b2b2b2', { call: witnessCall, result: c.witness(stamp('0910'), 'miscalled') });
    assert.equal(d.action, 'published');
    writeFileSync(d.reading, 'retelling: the exit minted two.\nclassification: call was wrong\n');
    assert.deepEqual(c.analyze().walks.map(w => [w.mark, w.trial]), [['miscalled', '2026-11-03-0910-tlc-b2b2b2']]);
    // The walk moved since the witness found its path: a copy of its own, where that answer stands.
    const w = fresh(t, 'witnessed');
    w.write('compositions/supply/prose.md', WALKED.replace('adapter.exit amount 1', 'adapter.exit amount 2'));
    const a = w.analyze();
    assert.deepEqual(a.walks.map(x => [x.mark, x.lapsed]), [['lapsed', ['passage W1', 'generated module']]], 'the walk\'s observer is in the module');
    assert.deepEqual(a.route, { pass: 'Refresh', why: ['lapsed: W1×all-honest'], read: 'spec/process.md' });
    w.write('compositions/supply/prose.md', WALKED);
    assert.equal(w.analyze().walks[0].mark, 'checked');
  });

  it('compares a composition witness\'s trace by its trace-data values alone, and a part\'s by its state first', () => {
    const plan = { checker: 'tlc', enabled: ['TypeOK', 'NotW1'], witness: 'NotW1' } as Plan;
    const call = (trace: string[], traceData: string[]) => ({ expect: { TypeOK: { expect: 'holds' }, NotW1: { expect: 'violated', trace } }, traceData }) as unknown as Call;
    const parsed = { trace: [{ index: 1, values: { adapter_state: '"Open"', token_supply: '0', w1_at: '0' } }, { index: 2, action: 'Exit', values: { adapter_state: '"Open"', token_supply: '1', w1_at: '1' } }] } as unknown as TlcParsed;
    const outcomes = { TypeOK: 'holds', NotW1: 'violated' };
    assert.deepEqual(compareTlc(call(['Open/0', 'Open/1'], ['adapter_state', 'token_supply']), plan, parsed, outcomes, true), { result: 'as-called', miscalls: [] });
    assert.deepEqual(compareTlc(call(['Open/0', 'Open/2'], ['adapter_state', 'token_supply']), plan, parsed, outcomes, true), { result: 'miscalled', miscalls: ['NotW1: expected the trace Open/0 > Open/2, got Open/0 > Open/1'] });
    const part = { trace: [{ index: 1, values: { state: '"Idle"', remaining: '0' } }, { index: 2, values: { state: '"Waiting"', remaining: '1' } }] } as unknown as TlcParsed;
    assert.deepEqual(compareTlc(call(['Idle/0', 'Waiting/1'], ['remaining']), plan, part, outcomes, false).result, 'as-called');
  });

  it('trips wiring does not compose on a walk that steps on a wired event, or names a scenario that is not declared', t => {
    const { write, analyze } = fresh(t, 'blank');
    write('compositions/supply/prose.md', WALKED.replace('adapter.exit amount 1', 'token.mint amount 1'));
    const wired = analyze().tripwires;
    assert.equal(wired.length, 1, JSON.stringify(wired));
    assert.equal(wired[0].name, 'wiring does not compose');
    assert.match(wired[0].where, /^W1 steps on token\.mint.*, which is reached through wiring$/);
    write('compositions/supply/prose.md', WALKED.replace('Walk Exit:', 'Walk Exit under nobody:'));
    // The composer names the tripwire each of its problems trips.
    assert.deepEqual(analyze().tripwires, [{ name: 'property claims unknown scenario', where: 'W1 names scenario "nobody", which scenarios.md does not declare' }]);
  });
});

// ---------------------------------------------------------------- tripwires and flags

describe('tripwires and flags of a part', () => {
  const sorted = (list: string[]) => [...list].sort();
  // A case's own root, new for it: the Timelock's prose, and the actors and scenarios every root has.
  const fresh = (t: TestContext) => {
    const { root, write, trial } = makeRoot('dossier-trips-');
    t.after(() => rmSync(root, { recursive: true, force: true }));
    write('parts/timelock/prose.md', TIMELOCK);
    const analyze = (extra: Partial<PartOptions> = {}) => analyzePart({ root, id: 'timelock', knowledge: nullKnowledge(), pluginVersion: VERSION, marker: { plugin: VERSION }, actors: readActors(root), ...extra });
    return { root, write, trial, dir: join(root, 'parts', 'timelock'), results: partResults(root, 'timelock'), analyze };
  };

  it('trips on a malformed passage and a name no passage declares, flags an unsaid pair, and a pair said twice', t => {
    const { write, analyze } = fresh(t);
    write('parts/timelock/prose.md', TIMELOCK.replace('[S3] Ready: the delay has run out.', '[S3] Ready the delay has run out.').replace('[R4] In Ready, tick is refused.', '[R4] In Waiting, tick is refused.'));
    const a = analyze();
    assert.ok(a.tripwires.some(t => t.name === 'malformed passage' && t.where.startsWith('S3: does not follow the State form')));
    assert.ok(a.tripwires.some(t => t.name === 'misnamed' && t.where === 'M3 names state Ready, which no State passage declares'), 'a name the prose misuses is misnamed, not malformed');
    assert.ok(!a.tripwires.some(t => t.name === 'malformed passage' && t.where.startsWith('M3 ')));
    assert.deepEqual(a.marks, {}, 'no marks for a prose that does not compile');
    assert.equal(a.route.pass, 'Fix');
    assert.ok(a.flags.some(f => f.name === 'said twice' && f.where === 'Waiting × tick: M2 and M3 and R4'));
    write('parts/timelock/prose.md', TIMELOCK.replace('[R4] In Ready, tick is refused.\n', ''));
    const unsaid = analyze();
    assert.deepEqual(unsaid.tripwires, []);
    assert.ok(unsaid.flags.some(f => f.name === 'unsaid' && f.where === 'Ready × tick'));
    assert.equal(unsaid.route.pass, 'Write');
    assert.deepEqual(unsaid.route.why, ['unsaid pairs: Ready × tick']);
  });

  it('trips on stray files and a malformed doubt, and reads nothing from an edited ledger', t => {
    const { write, analyze } = fresh(t);
    write('parts/timelock/notes.txt', 'x');
    write('parts/timelock/scratch/x.md', 'x');
    write('parts/timelock/doubts.md', '## D1\nstatus: open\nassumed: a\nWalk a: x\nWalk b: y\n');
    write('parts/timelock/ledger.md', '# Ledger\nanything at all\n');
    const a = analyze();
    assert.deepEqual(a.tripwires, [
      { name: 'malformed doubt', where: "D1: status: is not written by hand; the owner's answer decision closes a doubt" },
      { name: 'malformed doubt', where: 'D1: needs "on: <passage ids>"' },
      { name: 'stray files', where: 'notes.txt' },
      { name: 'stray files', where: 'scratch' },
    ], 'the ledger is a view: what it says trips nothing');
    assert.equal(a.route.pass, 'Fix');
    assert.deepEqual(a.route.why, ["malformed doubt (D1: status: is not written by hand; the owner's answer decision closes a doubt)", 'malformed doubt (D1: needs "on: <passage ids>")', 'stray files (notes.txt)', 'stray files (scratch)']);
  });

  it('trips on an edited answer, an unbound entry, an entry that holds another question than its name says, and stray files in evidence/, and on nothing in a trial\'s bundle', t => {
    const { write, trial, dir, results, analyze } = fresh(t);
    // The files the TLC trials execute, without which their questions would be gone.
    write('parts/timelock/model/Timelock.tla', TIMELOCK_TLA);
    write('parts/timelock/model/Timelock.cfg', 'SPECIFICATION Spec\nINVARIANTS TypeOK A1\n');
    const edited = trial(dir, '2026-11-03-0900-chart-a1a1a1', { call: chartCall, result: results.chart(stamp('0900')) });
    writeFileSync(edited.entry, readFileSync(edited.entry, 'utf8').replace('"result": "as-called"', '"result": "miscalled"'));
    const unbound = trial(dir, '2026-11-03-0910-tlc-b2b2b2', { call: tlcCall({ TypeOK: 'holds' }), result: results.tlc(stamp('0910'), { enabled: ['TypeOK'], outcomes: { TypeOK: 'holds' } }) });
    const manifest = manifestOf(dir);
    delete manifest.evidence[unbound.name];
    keepManifest(dir, manifest);
    // An entry moved to another name, and bound there, still holds the question of the name it left.
    const moved = trial(dir, '2026-11-03-0920-tlc-c3c3c3', { call: tlcCall({ TypeOK: 'holds', A1: 'holds' }), result: results.tlc(stamp('0920'), { enabled: ['TypeOK', 'A1'], outcomes: { TypeOK: 'holds', A1: 'holds' } }) });
    const renamed = 'tlc-A1-000000';
    renameSync(moved.entry, join(dir, EVIDENCE, `${renamed}.json`));
    const rebound = manifestOf(dir);
    rebound.evidence[renamed] = rebound.evidence[moved.name];
    delete rebound.evidence[moved.name];
    keepManifest(dir, rebound);
    writeFileSync(join(dir, EVIDENCE, 'notes.txt'), 'x');
    writeFileSync(join(dir, EVIDENCE, 'tlc-N1-000000.md'), 'a reading with no entry\n');
    // The bundles the runner shelved in trials/ are the machine's own, not records.
    writeFileSync(join(edited.bundle, 'call.md'), chartCall + 'because: edited later\n');
    rmSync(join(unbound.bundle, 'receipt.json'));
    writeFileSync(join(moved.bundle, 'result.json'), '{}\n');
    writeFileSync(join(moved.bundle, 'extra.txt'), 'x');
    const a = analyze();
    // integrity.json binds each entry's bytes under its name; an entry's name is its question's.
    assert.deepEqual(sorted(a.tripwires.map(t => `${t.name}: ${t.where}`)), sorted([
      `answer edited: evidence/${edited.name}.json: answer edited: its bytes no longer match the digest integrity.json binds`,
      `answer unbound: evidence/${unbound.name}.json: answer unbound: integrity.json does not bind it`,
      `answer malformed: evidence/${renamed}.json: answer malformed: entry ${renamed} holds the question of ${moved.name}`,
      'stray files: evidence/: notes.txt, tlc-N1-000000.md',
    ]));
    assert.deepEqual(a.answerRows.map(t => t.entry).sort(), [edited.name, unbound.name].sort(), 'an entry that does not read as its question has no row');
    assert.ok(a.answerRows.every(t => t.void && !t.completed));
    assert.deepEqual(a.answers.find(x => x.name === renamed)!.entry, null, 'it is an answer read with no entry, and its problems');
    assert.equal(a.marks.S1.mark, 'pending', 'a void answer covers nothing');
    // Verify never reads trials/: without the bundles, every conclusion stands.
    rmSync(join(dir, 'trials'), { recursive: true });
    const without = analyze();
    assert.deepEqual([without.tripwires, without.flags, without.marks, without.route], [a.tripwires, a.flags, a.marks, a.route]);
  });

  it('trips on a miscalled answer without a classification, on one outside the five, and accepts one of the five', t => {
    const { trial, dir, results, analyze } = fresh(t);
    const d = trial(dir, '2026-11-03-0900-chart-a1a1a1', { call: chartCall, result: results.chart(stamp('0900'), { failing: ['W1'] }) });
    let a = analyze();
    assert.deepEqual(a.tripwires, [{ name: 'miscall unclassified', where: `evidence/${d.name}.json` }]);
    assert.equal(a.marks.W1.mark, 'miscalled');
    assert.equal(a.marks.S1.mark, 'drawn');
    // A rephrased classification would route silently by its first word; it trips instead.
    writeFileSync(d.reading, 'retelling: the walk ends in Ready.\nclassification: prose says Idle, the chart says Ready\n');
    a = analyze();
    assert.deepEqual(a.tripwires, [{ name: 'classification unknown', where: `evidence/${d.name}.md: "prose says Idle, the chart says Ready" is none of "model misread prose, action", "model misread prose, property", "chart differs from prose", "prose at fault", "call was wrong"` }]);
    assert.equal(a.route.pass, 'Fix');
    writeFileSync(d.reading, 'retelling: the walk ends in Ready.\nclassification: prose at fault\nThe prose says Idle, the chart says Ready.\n');
    a = analyze();
    assert.deepEqual(a.tripwires, []);
    assert.equal(a.answerRows[0].classification, 'prose at fault');
    assert.equal(a.route.pass, 'Report');
    assert.deepEqual(a.route.why, [`evidence/${d.name}.json miscalled, prose at fault: waits for the author`]);
  });

  it('trips on a model whose actions, properties, fairness or facts do not cite passages, and flags a move without action', t => {
    const { write, dir, analyze } = fresh(t);
    const spec = 'Spec == Init /\\ [][Next]_<<state, remaining, sent_change>>';
    write('parts/timelock/model/Timelock.tla', TIMELOCK_TLA.replace('M6_Cancel ==', 'M9_Cancel ==').replace('N1 == TRUE', 'N1 == TRUE\nA9 == TRUE\nInv_O7 == TRUE').replace(spec, `${spec} /\\ WF_vars(M1_Schedule) /\\ SF_vars(M2_Tick)`));
    write('parts/timelock/model/Timelock.als', 'sig P {}\nfact nameless { some P }\nfact A1_fine { some P }\nassert Z9_x { some P }\ncheck Z9_x for 3\npred helper {}\n');
    const a = analyze();
    assert.deepEqual(a.tripwires.map(t => `${t.name}: ${t.where}`), [
      'action without Move: Timelock.tla: M9_Cancel encodes M9, which is not a passage',
      'misnamed: Timelock.tla: A9 names A9, which is not a passage',
      'misnamed: Timelock.tla: Inv_O7 names O7, which is not a passage',
      'fairness without Given: Timelock.tla line 12: WF_vars(M1_Schedule) carries no "\\* from G<n>"',
      'fairness without Given: Timelock.tla line 12: SF_vars(M2_Tick) carries no "\\* from G<n>"',
      'fact without passage: Timelock.als: fact nameless',
      'fact without passage: Timelock.als: assert Z9_x',
      'fact without passage: Timelock.als: check Z9_x',
    ]);
    assert.ok(a.flags.some(f => f.name === 'Move without action' && f.where === 'M6'));
    assert.deepEqual([...a.modelCited].sort(), ['A1', 'A2', 'E1', 'E2', 'E3', 'E4', 'M1', 'M2', 'M3', 'M4', 'M5', 'N1', 'S1', 'S2', 'S3']);
    write('parts/timelock/model/Timelock.tla', TIMELOCK_TLA.replace(spec, `${spec} /\\ WF_vars(M4_Execute)        \\* from G9`));
    rmSync(join(dir, 'model', 'Timelock.als'));
    const cited = analyze();
    assert.deepEqual(cited.tripwires, [{ name: 'fairness without Given', where: 'Timelock.tla line 12: cites G9, which is not a passage' }]);
    assert.ok(!cited.flags.some(f => f.name === 'Move without action'));
    assert.ok(cited.modelCited.has('R1') && cited.modelCited.has('W1') === false, 'refusals are cited once every move has its action');
  });

  it('trips on a sender that is not declared, in an Event or a Given', t => {
    const { write, analyze } = fresh(t);
    write('actors/actors.md', ACTORS.replace('  - id: chain\n    name: the chain\n    kind: chain\n', '').replace('  - id: public\n    name: the public\n    kind: public\n', ''));
    const a = analyze();
    assert.deepEqual(a.tripwires, [
      { name: 'sender is not declared', where: 'G1 names "the public", which is neither an actor in actors.md nor a part' },
      { name: 'sender is not declared', where: 'E2: "the chain" is neither an actor in actors.md nor a part' },
      { name: 'sender is not declared', where: 'E3: "the public" is neither an actor in actors.md nor a part' },
    ]);
    assert.equal(a.route.pass, 'Fix');
    write('actors/actors.md', ACTORS);
    assert.deepEqual(analyze().tripwires, []);
    assert.deepEqual(analyze({ actors: null }).tripwires, [], 'without actors nothing is checked');
  });

  it('trips on a Given that names a part, even where an actor has the same id', t => {
    const { write, analyze } = fresh(t);
    write('parts/adapter/prose.md', ADAPTER);
    write('parts/timelock/prose.md', TIMELOCK.replace('Actor: the public, on execute, prompt.', 'Actor: the Adapter.'));
    const named = [{ name: 'Given names a part', where: 'G1 names "the Adapter", which is a part; a rely on a part is a Guarantee or a wiring' }];
    assert.deepEqual(analyze().tripwires, named);
    write('actors/actors.md', ACTORS.replace('actors:\n', 'actors:\n  - id: adapter\n    name: the Adapter\n    kind: external\n'));
    assert.deepEqual(analyze().tripwires, named, 'the part is read first; the actor is shadowed');
  });

  it('reports the actors files when no composition does, and checks no sender while they do not read', t => {
    const { write, analyze } = fresh(t);
    write('actors/actors.md', '# Actors\n```yaml\nactors:\n  - id: [governance\n```\n');
    assert.deepEqual(analyze().tripwires, [], 'a composition reports the actors files; no sender is checked against a file that does not read');
    const a = analyze({ reportActors: true });
    assert.deepEqual(tripNames(a), ['malformed actors', 'scenario names unknown actor', 'scenario names unknown actor']);
    assert.ok(a.tripwires[0].where.startsWith('actors.md: '), a.tripwires[0].where);
    assert.deepEqual(a.tripwires.slice(1).map(t => t.where), ['scenarios.md: user-malicious names actor "user", which actors.md does not declare', 'scenarios.md: breaker-offline names actor "breaker", which actors.md does not declare']);
    assert.equal(a.route.pass, 'Fix');
    write('actors/actors.md', ACTORS);
    write('actors/scenarios.md', SCENARIOS.replace('    modes: { breaker: offline }\n', '    modes: { breaker: offline }\n    stronger_than: [all-honest]\n'));
    assert.deepEqual(analyze({ reportActors: true }).tripwires, [{ name: 'stronger_than unsound', where: 'scenarios.md: breaker-offline is declared stronger than all-honest, which its modes do not support: breaker is offline in breaker-offline and honest in all-honest' }]);
    write('actors/scenarios.md', SCENARIOS);
    assert.deepEqual(analyze({ reportActors: true }).tripwires, []);
  });

  it('flags an actor that shadows a part', t => {
    const { root, write } = fresh(t);
    write('parts/adapter/prose.md', ADAPTER);
    write('actors/actors.md', ACTORS.replace('actors:\n', 'actors:\n  - id: adapter\n    name: the Adapter\n    kind: external\n'));
    const a = analyzePart({ root, id: 'adapter', knowledge: nullKnowledge(), pluginVersion: VERSION, marker: { plugin: VERSION }, actors: readActors(root) });
    assert.ok(a.flags.some(f => f.name === 'actor shadows part' && f.where === 'actor adapter is shadowed by part adapter; remove it from actors.md'));
  });

  it('flags a pin that does not resolve in the knowledge base', t => {
    const { write, analyze } = fresh(t);
    write('parts/timelock/prose.md', TIMELOCK.replace('Module: gov-timelock\n', 'Module: gov-timelock\nPins: gov-timelock#observation:finalized\n'));
    const a = analyze();
    assert.deepEqual(a.pins, { 'gov-timelock#observation:finalized': null });
    assert.deepEqual(a.flags.filter(f => f.name === 'pin unresolved'), [{ name: 'pin unresolved', where: 'gov-timelock#observation:finalized does not resolve in the knowledge base' }]);
    assert.deepEqual(a.tripwires, [], 'a flag, never a tripwire');
    const found = analyze({ knowledge: { ...nullKnowledge(), resolve: (ref) => (ref === 'gov-timelock#observation:finalized' ? { ref, hash: 'feedfacefeedface', path: 'modules/gov-timelock/observations/finalized.json' } as Resolved : null) } });
    assert.deepEqual(found.pins, { 'gov-timelock#observation:finalized': 'feedfacefeedface' });
    assert.ok(!flagNames(found).includes('pin unresolved'));
  });

  it('flags a reworded definition, a narrowed reach, an unrun aborted answer and an updated plugin, and nothing from an edited chart view', async t => {
    const { root, write, trial, dir, results, analyze } = fresh(t);
    write('parts/timelock/model/Timelock.tla', TIMELOCK_TLA);
    write('parts/timelock/model/Timelock.cfg', 'SPECIFICATION Spec\nINVARIANTS TypeOK A1\n');
    await draw({ root, part: 'timelock' });
    const ordinary = (id: string, hhmm: string, more: Partial<TlcOptions> = {}) => trial(dir, id, { call: tlcCall({ TypeOK: 'holds', A1: 'holds' }), result: results.tlc(stamp(hhmm), { enabled: ['TypeOK', 'A1'], outcomes: { TypeOK: 'holds', A1: 'holds' }, ...more }) });
    trial(dir, '2026-11-03-0900-chart-a1a1a1', { call: chartCall, result: results.chart(stamp('0900')) });
    const tlc = ordinary('2026-11-03-0910-tlc-b2b2b2', '0910', { values: { MaxSent: 4 } });
    // The same question answered again, at a smaller reach and from a definition that differs from A1's now.
    assert.equal(ordinary('2026-11-03-0920-tlc-c3c3c3', '0920', { values: { MaxSent: 2 }, properties: { TypeOK: 'deadbeef', A1: 'deadbeef' } }).action, 'published');
    // An aborted trial's answer is published for a question with no answer yet, and never replaces a completed one.
    const aborted = trial(dir, '2026-11-03-0930-tlc-d4d4d4', { call: tlcCall({ TypeOK: 'holds', A2: 'holds' }), result: results.aborted(stamp('0930'), ['TypeOK', 'A2']) });
    assert.equal(aborted.action, 'published');
    assert.equal(trial(dir, '2026-11-03-0935-tlc-d4d4d5', { call: tlcCall({ TypeOK: 'holds', A1: 'holds' }), result: results.aborted(stamp('0935')) }).action, 'kept');
    trial(dir, '2026-11-03-0905-external-e5e5e5', { call: externalCall(['W1']), result: results.external(stamp('0905'), ['W1']) });
    let a = analyze({ marker: { plugin: '0.0.1' } });
    assert.deepEqual(a.tripwires, []);
    const flags = Object.fromEntries(a.flags.map(f => [f.name, f.where]));
    const reworded = `A1 differs from the definition evidence/${tlc.name}.json ran, while A1 is unchanged`;
    assert.equal(flags.reworded, reworded, 'named by the entry that holds the answer the definition gave');
    assert.deepEqual(a.flags.filter(f => f.name === 'narrowed'), [{ name: 'narrowed', entry: tlc.name, where: `evidence/${tlc.name}.json reaches less than an answer it replaced (MaxSent 4→2)` }]);
    assert.deepEqual(a.flags.filter(f => f.name === 'unrun'), [{ name: 'unrun', entry: aborted.name, where: `evidence/${aborted.name}.json: timed out after 1 seconds` }]);
    assert.equal(flags['plugin updated'], 'set up with dossier 0.0.1, this is 0.1.0: run dossier setup');
    assert.ok(a.route.why.includes(reworded));
    assert.deepEqual(a.changedModelFiles, [], 'the files are as the trials ran them');
    write('parts/timelock/chart/machine.json', '{}\n');
    const covered = Object.fromEntries(Object.entries(analyze().marks).map(([id, m]) => [id, m.mark]));
    assert.equal(ordinary('2026-11-03-0940-tlc-e5e5e6', '0940', { values: { MaxSent: 2 }, properties: { TypeOK: 'deadbeef', A1: 'deadbeef' } }).action, 'kept', 'the same answer again writes nothing');
    a = analyze();
    assert.ok(flagNames(a).includes('narrowed') && flagNames(a).includes('reworded'), 'so the entry keeps the further reach and the definition it ran');
    assert.equal(trial(dir, '2026-11-03-0950-tlc-f6f6f6', { call: tlcCall({ TypeOK: 'holds', A2: 'holds' }), result: results.tlc(stamp('0950'), { enabled: ['TypeOK', 'A2'], outcomes: { TypeOK: 'holds', A2: 'holds' } }) }).action, 'published');
    assert.equal(ordinary('2026-11-03-0955-tlc-f6f6f7', '0955', { values: { MaxSent: 4 } }).action, 'published');
    a = analyze();
    assert.ok(!flagNames(a).includes('unrun'), 'a completed answer to its question replaces the aborted one');
    assert.ok(!flagNames(a).includes('reworded'), 'an answer from the definitions as they stand replaces the reworded one');
    assert.ok(!flagNames(a).includes('narrowed'), 'and it looks as far as the answer the entry kept the reach of');
    assert.ok(!flagNames(a).includes('plugin updated'));
    assert.deepEqual(a.tripwires, [], 'an edited chart view trips nothing');
    assert.equal(covered.S1, 'checked', 'and moves no mark: the chart is drawn from the prose, not read from machine.json');
  });

  it('lapses what an answer covered once a model file it executed moved, routes to Refresh, and owes a call for the file', t => {
    const { write, trial, dir, results, analyze } = fresh(t);
    write('parts/timelock/model/Timelock.tla', TIMELOCK_TLA);
    write('parts/timelock/model/Timelock.cfg', 'SPECIFICATION Spec\nINVARIANTS TypeOK A1\n');
    // The module as it was when the trial executed it: a hash no file now has.
    const d = trial(dir, '2026-11-03-0910-tlc-b2b2b2', { call: tlcCall({ TypeOK: 'holds', A1: 'holds' }), result: results.tlc(stamp('0910'), { enabled: ['TypeOK', 'A1'], outcomes: { TypeOK: 'holds', A1: 'holds' }, executed: { 'model/Timelock.tla': 'e'.repeat(64), 'model/Timelock.cfg': fileHash(join(dir, 'model', 'Timelock.cfg')) } }) });
    const a = analyze();
    assert.equal(a.marks.A1.mark, 'lapsed');
    assert.deepEqual(a.marks.A1.lapsed, ['executed model/Timelock.tla']);
    assert.equal(a.route.pass, 'Refresh');
    assert.deepEqual(a.route.why, ['lapsed: S1 S2 S3 E1 E2 E3 E4 M1 M2 M3 M4 M5 M6 R1 R2 R3 R4 A1 (executed model/Timelock.tla)']);
    assert.deepEqual(a.changedModelFiles, [{ file: 'model/Timelock.tla', entry: d.name }]);
  });

  it('names a retired part as such when an Event or a Given names it as its sender', t => {
    const { write, analyze } = fresh(t);
    write('parts/adapter/prose.md', ADAPTER);
    write('parts/adapter/decisions.log', formatDecision({ time: '2026-11-03T10:00:00Z', verb: 'retire', args: [], words: 'replaced' }) + '\n');
    write('parts/timelock/prose.md', TIMELOCK.replace('[E4] cancel, from Governance:', '[E4] cancel, from the Adapter:').replace('Actor: the public, on execute, prompt.', 'Actor: the Adapter.'));
    assert.deepEqual(analyze().tripwires, [
      { name: 'sender is not declared', where: 'G1 names "the Adapter", which is a retired part' },
      { name: 'sender is not declared', where: 'E4: "the Adapter" is a retired part' },
    ]);
    assert.deepEqual(analyze({ parts: ['timelock'], retired: ['adapter'] }).tripwires.map(trip => trip.where), ['G1 names "the Adapter", which is a retired part', 'E4: "the Adapter" is a retired part'], 'as verify passes them');
  });

  it('flags a dossier.json that names no plugin version without saying undefined', t => {
    assert.equal(fresh(t).analyze({ marker: {} }).flags.find(f => f.name === 'plugin updated')!.where, 'dossier.json names no plugin version, this is 0.1.0: run dossier setup');
  });

  it('skips the dot files a file browser leaves in evidence/', t => {
    const { trial, dir, results, analyze } = fresh(t);
    trial(dir, '2026-11-03-0900-chart-a1a1a1', { call: chartCall, result: results.chart(stamp('0900')) });
    writeFileSync(join(dir, EVIDENCE, '.DS_Store'), 'x');
    assert.deepEqual(readEvidence(dir, manifestOf(dir).evidence, {}, 'parts/timelock').stray, []);
    assert.deepEqual(analyze().tripwires, []);
  });

  it('flags a Given without use and no eventual promise, and trips on a passage under the wrong section', t => {
    const { write, analyze } = fresh(t);
    write('parts/timelock/prose.md', TIMELOCK.replace('## Once\n[O1] Once Waiting, eventually Idle, given G1.\n\n## Within\n[N1] Within two ticks of Ready, Idle, given G1.\n\n', '').replace(' Actor: the public, on execute, prompt.', ''));
    let a = analyze();
    assert.deepEqual(a.tripwires, []);
    assert.ok(a.flags.some(f => f.name === 'no eventual promise stated'));
    assert.ok(a.flags.some(f => f.name === 'Given without use' && f.where === 'G1'));
    write('parts/timelock/prose.md', TIMELOCK.replace('## Seams\n', '[G9] Given that x. If this is false, y.\n\n## Seams\n'));
    a = analyze();
    assert.deepEqual(a.tripwires, [{ name: 'malformed passage', where: 'G9 sits under "## Walks", which holds Walk passages' }]);
    assert.ok(!a.flags.some(f => f.name === 'no eventual promise stated'), 'flags of the chart side wait for a prose that compiles');
  });

  it('flags the gaps of the chart\'s current answer while its basis matches the prose', t => {
    const { write, trial, dir, results, analyze } = fresh(t);
    trial(dir, '2026-11-03-0900-chart-a1a1a1', { call: chartCall, result: results.chart(stamp('0900'), { gaps: [{ pair: 'Waiting × cancel', message: 'nothing says what cancel does at Waiting {"remaining":1}' }] }) });
    let a = analyze();
    assert.deepEqual(a.chart.gaps, ['nothing says what cancel does at Waiting {"remaining":1}']);
    assert.ok(a.flags.some(f => f.name === 'unsaid under condition' && f.where === 'nothing says what cancel does at Waiting {"remaining":1}'));
    assert.equal(a.route.pass, 'Write');
    assert.deepEqual(a.route.why, ['unsaid under condition: nothing says what cancel does at Waiting {"remaining":1}']);
    write('parts/timelock/prose.md', TIMELOCK.replace('[T1] The Timelock knows', '[T1] The Timelock still knows'));
    a = analyze();
    assert.deepEqual(a.chart.gaps, [], 'a gap of an earlier prose is not this prose\'s gap');
    assert.ok(!a.flags.some(f => f.name === 'unsaid under condition'));
  });
});

describe('tripwires of a composition', () => {
  // A case's own root, new for it: Supply over the Adapter and the Token, with the actors and
  // scenarios every root has.
  const fresh = (t: TestContext) => {
    const { root, write } = makeRoot('dossier-systrips-');
    t.after(() => rmSync(root, { recursive: true, force: true }));
    write('parts/adapter/prose.md', ADAPTER);
    write('parts/token/prose.md', TOKEN);
    write('compositions/supply/wiring.md', COMPOSITION);
    write('compositions/supply/prose.md', SUPPLY);
    return { root, write, analyze: () => analyzeComposition({ root, id: 'supply', parts: loadAllParts(root), knowledge: nullKnowledge(), pluginVersion: VERSION, marker: { plugin: VERSION } }) };
  };

  it('trips when the wiring cites an unknown part', t => {
    const { write, analyze } = fresh(t);
    write('compositions/supply/wiring.md', COMPOSITION.replace('  - part: token\n    role: member\n', '  - part: token\n    role: member\n  - part: ghost\n    role: member\n'));
    const a = analyze();
    assert.deepEqual(a.tripwires, [{ name: 'wiring names unknown part', where: 'wiring names part ghost, which has no dossier or does not compile' }]);
    assert.equal(a.route.pass, 'Fix');
    write('parts/token/prose.md', TOKEN.replace('[S1] Live: the token answers.', '[S1] Live the token answers.'));
    // The composer names a member that does not compile once, not again in every wire and condition that reaches it.
    assert.deepEqual(analyze().tripwires, [{ name: 'wiring names unknown part', where: 'wiring names part token, which has no dossier or does not compile' }, { name: 'wiring names unknown part', where: 'wiring names part ghost, which has no dossier or does not compile' }]);
  });

  it('trips when the wiring names an unknown effect or event', t => {
    const { write, analyze } = fresh(t);
    write('compositions/supply/wiring.md', COMPOSITION.replace('event: token.mint', 'event: token.nothing'));
    assert.deepEqual(analyze().tripwires, [
      { name: 'wiring names unknown effect or event', where: 'wiring names event token.nothing, which token does not receive' },
      { name: 'wiring does not compose', where: 'token has no Move for nothing, wired from adapter.mint' },
    ]);
    write('compositions/supply/wiring.md', COMPOSITION.replace('effect: adapter.mint', 'effect: adapter.nothing'));
    assert.deepEqual(analyze().tripwires, [{ name: 'wiring names unknown effect or event', where: 'wiring names effect adapter.nothing, which adapter does not send' }]);
  });

  it('trips when a member\'s sender is not declared, when a scenario names an unknown actor, and when a property claims an unknown scenario', t => {
    const { write, analyze } = fresh(t);
    write('actors/actors.md', ACTORS.replace('  - id: breaker\n    name: the Breaker\n    kind: multisig\n', ''));
    const a = analyze();
    assert.deepEqual(a.tripwires, [
      { name: 'scenario names unknown actor', where: 'scenarios.md: breaker-offline names actor "breaker", which actors.md does not declare' },
      { name: 'sender is not declared', where: 'adapter: event halt comes from "the Breaker", which is neither an actor in actors.md nor a part' },
    ]);
    write('actors/actors.md', ACTORS.replace('    kind: chain\n', '    kind: weather\n'));
    assert.deepEqual(analyze().tripwires, [{ name: 'malformed actors', where: 'actors.md: chain has kind "weather", not one of governance, multisig, keeper, user, public, chain, market, external' }], 'any other error in the actors files is malformed actors');
    write('actors/actors.md', ACTORS);
    write('compositions/supply/prose.md', SUPPLY.replace('Scenarios: all-honest, user-malicious.', 'Scenarios: all-honest, nobody.'));
    assert.deepEqual(analyze().tripwires, [{ name: 'property claims unknown scenario', where: 'A1 claims scenario "nobody", which scenarios.md does not declare' }]);
  });

  it('trips on a stronger_than its modes do not support', t => {
    const { write, analyze } = fresh(t);
    write('actors/scenarios.md', SCENARIOS.replace('    modes: { breaker: offline }\n', '    modes: { breaker: offline }\n    stronger_than: [all-honest]\n'));
    assert.deepEqual(analyze().tripwires, [{ name: 'stronger_than unsound', where: 'scenarios.md: breaker-offline is declared stronger than all-honest, which its modes do not support: breaker is offline in breaker-offline and honest in all-honest' }]);
  });

  it('routes a start: error of the wiring to malformed actors', t => {
    const { write, analyze } = fresh(t);
    write('actors/scenarios.md', SCENARIOS.replace('    modes: { breaker: offline }\n', '    modes: { breaker: offline }\n    start: { token.price: 1 }\n'));
    assert.deepEqual(analyze().tripwires, [{ name: 'malformed actors', where: 'start: breaker-offline starts token.price, which token does not hold' }]);
    const a = analyze();
    assert.deepEqual(compositionTripwires(a).tripwires, a.tripwires);
  });

  it('flags a pin of a member, of the wiring on a member, or of an actor whose events reach a member, that does not resolve', t => {
    const { write, analyze } = fresh(t);
    write('actors/actors.md', PINNED_ACTORS);
    write('parts/adapter/prose.md', ADAPTER.replace('Module: adapter\n', 'Module: adapter\nPins: adapter#observation:deployed\n'));
    write('compositions/supply/wiring.md', COMPOSITION.replace('  - part: adapter\n    role: member\n', '  - part: adapter\n    role: member\n    pins: [adapter#observation:checkpoint]\n'));
    const a = analyze();
    assert.deepEqual(a.tripwires, [], 'a flag, never a tripwire');
    assert.deepEqual(a.pins, { 'adapter#observation:deployed': null, 'adapter#observation:checkpoint': null, 'adapter#contract:adapter': null }, 'Governance\'s events reach no member, so its pin is not Supply\'s');
    assert.deepEqual(a.flags.filter(f => f.name === 'pin unresolved'), [
      { name: 'pin unresolved', where: 'adapter#observation:deployed does not resolve in the knowledge base' },
      { name: 'pin unresolved', where: 'adapter#observation:checkpoint does not resolve in the knowledge base' },
      { name: 'pin unresolved', where: 'adapter#contract:adapter does not resolve in the knowledge base' },
    ]);
  });

  it('flags a member\'s send left free, prints it, and drops the flag once it is listed under free:', t => {
    const { write, analyze } = fresh(t);
    const unwired = COMPOSITION.replace('wiring:\n  - effect: adapter.mint\n    event: token.mint\n', 'wiring: []\n');
    write('compositions/supply/wiring.md', unwired);
    let a = analyze();
    assert.deepEqual(a.tripwires, []);
    assert.ok(a.flags.some(f => f.name === 'left free' && f.where === 'token.mint from adapter; wire it or list it under free:'));
    assert.ok(renderCompositionLedger(a, { version: VERSION, now: stamp('0900'), previous: null }).includes('\nFree: token.mint from adapter\n'));
    write('compositions/supply/wiring.md', unwired.replace('wiring: []\n', 'wiring: []\nfree: [token.mint]\n'));
    a = analyze();
    assert.ok(!flagNames(a).includes('left free'));
    assert.ok(renderCompositionLedger(a, { version: VERSION, now: stamp('0900'), previous: null }).includes('\nFree: token.mint from adapter\n'));
  });

  it('names a part outside the wiring whose sends reach a member, without a flag', t => {
    const { write, analyze } = fresh(t);
    write('compositions/supply/wiring.md', COMPOSITION.replace('  - part: adapter\n    role: member\n', '').replace('wiring:\n  - effect: adapter.mint\n    event: token.mint\n', 'wiring: []\n'));
    write('compositions/supply/prose.md', SUPPLY.replace('{token.supply = adapter.held}', '{token.supply <= 4}').replace('[A2] Always, {adapter.Open or adapter.Halted}.\n', ''));
    const a = analyze();
    assert.deepEqual(a.tripwires, []);
    assert.ok(!flagNames(a).includes('left free'));
    assert.ok(renderCompositionLedger(a, { version: VERSION, now: stamp('0900'), previous: null }).includes('\nOutside: adapter sends token.mint\n'));
  });

  it('routes a malformed free: entry to malformed wiring', t => {
    const { write, analyze } = fresh(t);
    const unwired = COMPOSITION.replace('wiring:\n  - effect: adapter.mint\n    event: token.mint\n', 'wiring: []\n');
    write('compositions/supply/wiring.md', unwired.replace('wiring: []\n', 'wiring: []\nfree: [token.nothing, adapter.exit]\n'));
    assert.deepEqual(analyze().tripwires.filter(trip => trip.where.startsWith('free:')), [
      { name: 'malformed wiring', where: 'free: names token.nothing, which no member receives' },
      { name: 'malformed wiring', where: 'free: names adapter.exit, which no member sends' },
    ]);
    write('compositions/supply/wiring.md', COMPOSITION.replace('wiring:\n', 'free: [token.mint]\nwiring:\n'));
    assert.deepEqual(analyze().tripwires, [{ name: 'malformed wiring', where: 'free: names token.mint, which is wired' }]);
  });

  it('trips on its own prose, a malformed wiring and stray files', t => {
    const { root, write, analyze } = fresh(t);
    write('compositions/supply/prose.md', SUPPLY + '\n## Once\n[O1] Once adapter.Open, eventually adapter.Halted, given G9.\n\n## Moves\n[M1] When x receives y, it becomes z.\n');
    assert.deepEqual(analyze().tripwires, [{ name: 'malformed passage', where: 'M1: a composition holds only A, O, N, G, W and T passages' }, { name: 'misnamed', where: 'O1 cites G9, which does not exist' }]);
    write('compositions/supply/prose.md', SUPPLY);
    write('compositions/supply/wiring.md', COMPOSITION.replace('role: member\n  - part: token', 'role: bystander\n  - part: token'));
    assert.deepEqual(analyze().tripwires, [{ name: 'malformed wiring', where: 'wiring.md: adapter has role "bystander", not member or surroundings' }]);
    write('compositions/supply/wiring.md', COMPOSITION);
    write('compositions/supply/stray.txt', 'x');
    assert.deepEqual(analyze().tripwires, [{ name: 'stray files', where: 'stray.txt' }]);
    rmSync(join(root, 'compositions', 'supply', 'stray.txt'));
    assert.deepEqual(analyze().tripwires, []);
  });
});

// ---------------------------------------------------------------- route

// The parts of a part analysis routePart reads, as a test sets them.
interface RouteOver {
  marks?: Record<string, Partial<Mark>>;
  owner?: Record<string, OwnerState>;
  unsaid?: string[];
  saidTwice?: string[];
  gaps?: string[];
  pendingCalls?: string[];
  tripwires?: Note[];
  tier?: string;
  modules?: string[];
  cited?: string[];
  answerRows?: Partial<AnswerRow>[];
  flags?: Note[];
  changedModelFiles?: PartAnalysis['changedModelFiles'];
  doubts?: Partial<AnsweredDoubt>[];
  ir?: Partial<Ir>;
}

describe('routePart', () => {
  const ids = ['S1', 'E1', 'M1', 'R1', 'A1', 'W1', 'O1'];
  const state = ({ marks = {}, owner = {}, unsaid = [], saidTwice = [], gaps = [], pendingCalls = [], tripwires = [], tier = 'modeled', modules = ['Timelock.tla'], cited = ids, answerRows = [], flags = [], changedModelFiles = [], doubts = [], ir = {} }: RouteOver = {}) => ({
    tripwires, ir, prose: { passages: ids.map(id => ({ id, kind: id[0], retired: false })), unsaid, saidTwice },
    marks: Object.fromEntries(ids.map(id => [id, { mark: id === 'O1' ? 'held' : 'checked', chartCovered: true, modelCovered: true, ...(marks[id] || {}) }])),
    owner, doubts, chart: { gaps }, answerRows, pendingCalls, tier, models: { modules }, modelCited: new Set(cited), flags, changedModelFiles,
  }) as PartAnalysis;
  const route = (over?: RouteOver) => routePart(state(over));
  // A row is an answer, one per question: here the chart's, a miscall, by its entry and the trial that
  // established it, with the passages as that trial found them.
  const chartMiss: Partial<AnswerRow> = { entry: 'chart-0a1b2c', trial: 't1', kind: 'chart', at: '1', checker: 'chart', result: 'miscalled', classification: null, prose: proseHash({}) };

  it('reports nothing owed when everything is checked', () => {
    const r = route({ marks: { O1: { mark: 'checked' } } });
    assert.deepEqual(r, { pass: 'Report', why: ['nothing owed'], read: 'spec/evidence.md' });
  });

  it('fixes tripwires before anything else', () => {
    assert.deepEqual(route({ tripwires: [{ name: 'stray files', where: 'x.txt' }], unsaid: ['Idle × tick'] }), { pass: 'Fix', why: ['stray files (x.txt)'], read: 'spec/evidence.md' });
  });

  it('writes for rejected passages, unsaid pairs, pairs said twice and gaps; an answered doubt owes nothing', () => {
    assert.deepEqual(route({ owner: { S1: 'rejected' } }).why, ['rejected: S1']);
    assert.equal(route({ owner: { S1: 'rejected' } }).pass, 'Write');
    assert.deepEqual(route({ unsaid: ['Idle × tick'] }).why, ['unsaid pairs: Idle × tick']);
    assert.deepEqual(route({ saidTwice: ['Idle × tick: M1 and R1'] }).why, ['said twice: Idle × tick: M1 and R1']);
    assert.deepEqual(route({ gaps: ['nothing says what cancel does at Waiting'] }).why, ['unsaid under condition: nothing says what cancel does at Waiting']);
    assert.equal(route({ doubts: [{ id: 'D1', status: 'closed', answered: 'a' }], marks: { O1: { mark: 'checked' } } }).pass, 'Report');
    assert.deepEqual(routePart({ ...state(), prose: { passages: [], unsaid: [], saidTwice: [] } as unknown as PartProse }).why, ['no prose yet']);
  });

  it('refreshes lapsed passages, then encodes pending calls', () => {
    assert.deepEqual(route({ marks: { S1: { mark: 'lapsed' } }, pendingCalls: ['x.md'] }), { pass: 'Refresh', why: ['lapsed: S1'], read: 'spec/process.md' });
    const lapsed: RouteOver['marks'] = { S1: { mark: 'lapsed', lapsed: ['passage S1'] }, M1: { mark: 'lapsed', lapsed: ['executed model/Timelock.tla'] }, A1: { mark: 'lapsed', lapsed: ['passage A1', 'executed model/Timelock.tla'] }, O1: { mark: 'lapsed', lapsed: ['passage G1'] } };
    assert.deepEqual(route({ marks: lapsed }).why, ['lapsed: S1; M1 A1 (executed model/Timelock.tla); O1 (passage G1)'], 'grouped by what moved beyond their own words');
    assert.deepEqual(route({ pendingCalls: ['chart.md', 'ordinary.md'] }), { pass: 'Encode', why: ['calls pending: chart.md ordinary.md'], read: 'spec/models.md' });
  });

  it('draws when no chart answer covers a passage or the chart\'s current answer is a miscall', () => {
    assert.deepEqual(route({ marks: { S1: { mark: 'pending', chartCovered: false } } }), { pass: 'Draw', why: ['no chart answer covers: S1'], read: 'spec/chart.md' });
    assert.deepEqual(route({ answerRows: [{ ...chartMiss, classification: 'chart differs from prose' }] }).why, ['chart answer miscalled: evidence/chart-0a1b2c.json']);
    // Asked again and answered as called, the chart's question holds that answer: the miscall moved into its previous.
    assert.equal(route({ answerRows: [{ ...chartMiss, trial: 't2', at: '2', result: 'as-called', classification: null }], marks: { O1: { mark: 'checked' } } }).pass, 'Report');
  });

  it('draws nothing for an Always the chart skips: one that cites a Given, or a structural one', () => {
    const marks: RouteOver['marks'] = { O1: { mark: 'checked' }, A1: { mark: 'pending', chartCovered: false, modelCovered: false } };
    assert.deepEqual(route({ marks }), { pass: 'Draw', why: ['no chart answer covers: A1'], read: 'spec/chart.md' });
    const encode = { pass: 'Encode', why: ['not tried on the model side: A1'], read: 'spec/models.md' };
    assert.deepEqual(route({ marks, ir: { invariants: [{ id: 'A1', while: null, cond: null, givens: ['G1'] }] } }), encode);
    assert.deepEqual(route({ marks, ir: { invariants: [], structural: [{ id: 'A1', text: 'every vault has one owner' }] } }), encode);
    assert.deepEqual(route({ marks, ir: { invariants: [{ id: 'A1', while: null, cond: null, givens: [] }] } }).why, ['no chart answer covers: A1'], 'an Always with no Given is the chart\'s');
  });

  it('encodes a modeled piece without a model, with uncited or held or hollow passages, or changed model files', () => {
    assert.deepEqual(route({ modules: [], marks: { O1: { mark: 'checked' } } }).why, ['no model: run dossier scaffold']);
    assert.deepEqual(route({ cited: ['S1', 'E1', 'M1', 'R1', 'A1', 'O1'], marks: { O1: { mark: 'checked' } } }).why, ['not encoded: W1']);
    assert.deepEqual(route(), { pass: 'Encode', why: ['held, blunder owed: O1'], read: 'spec/models.md' });
    assert.deepEqual(route({ marks: { O1: { mark: 'hollow' } } }).why, ['hollow, a real blunder owed: O1']);
    assert.deepEqual(route({ marks: { O1: { mark: 'checked' } }, flags: [{ name: 'reworded', where: 'A1 differs' }] }).why, ['A1 differs']);
    assert.deepEqual(route({ marks: { O1: { mark: 'pending', modelCovered: false } } }).why, ['not tried on the model side: O1']);
    assert.deepEqual(route({ marks: { O1: { mark: 'checked' } }, changedModelFiles: [{ file: 'model/Timelock.tla', entry: 'tlc-O1-0a1b2c' }] }).why, ['changed since their trials, calls owed: model/Timelock.tla (evidence/tlc-O1-0a1b2c.json)']);
    assert.deepEqual(route({ marks: { O1: { mark: 'checked' } }, answerRows: [{ entry: 'tlc-O1-0a1b2c', trial: 't1', at: '1', checker: 'tlc', result: 'miscalled', classification: 'model misread prose, action' }] }).why, ['miscalled, model misread the prose: evidence/tlc-O1-0a1b2c.json']);
    // Each row is one question's current answer: another question's later answer, from the same checker,
    // leaves this miscall standing. The audit of 2026-11-07 found a leftover clause that cleared it.
    assert.deepEqual(route({ marks: { O1: { mark: 'checked' } }, answerRows: [
      { entry: 'tlc-O1-0a1b2c', trial: 't1', at: '1', checker: 'tlc', result: 'miscalled', classification: 'model misread prose, action' },
      { entry: 'tlc-W1-0a1b2d', trial: 't2', at: '2', checker: 'tlc', result: 'as-called', classification: null },
    ] }), { pass: 'Encode', why: ['miscalled, model misread the prose: evidence/tlc-O1-0a1b2c.json'], read: 'spec/models.md' });
  });

  it('reports a miscall the prose is at fault for, and encodes a charted piece only for a held Always', () => {
    assert.deepEqual(route({ answerRows: [{ ...chartMiss, classification: 'prose at fault' }] }).why, ['evidence/chart-0a1b2c.json miscalled, prose at fault: waits for the author']);
    assert.deepEqual(route({ tier: 'charted', modules: [], marks: { O1: { mark: 'untried' }, A1: { mark: 'held' } } }), { pass: 'Encode', why: ['held, a chart blunder owed: A1'], read: 'spec/models.md' });
    assert.equal(route({ tier: 'charted', modules: [], marks: { O1: { mark: 'untried' } } }).pass, 'Report');
  });

  it('waits on a prose-at-fault miscall while it is its question\'s current answer and the prose stands as the trial found it', () => {
    const miss: Partial<AnswerRow> = { ...chartMiss, classification: 'prose at fault' };
    const waits = ['evidence/chart-0a1b2c.json miscalled, prose at fault: waits for the author'];
    const marks: RouteOver['marks'] = { O1: { mark: 'checked' } };
    assert.deepEqual(route({ answerRows: [miss], marks }).why, waits);
    assert.deepEqual(route({ answerRows: [{ ...miss, prose: 'abcdef' }], marks }).why, ['nothing owed'], 'the author edited the prose since');
    assert.deepEqual(route({ answerRows: [{ ...miss, trial: 't2', at: '2', result: 'as-called', classification: null }], marks }).why, ['nothing owed'], 'asked again, its question came back as called');
    assert.deepEqual(route({ answerRows: [miss, { entry: 'tlc-A1-0d1e2f', trial: 't2', kind: 'tlc', at: '2', checker: 'tlc', result: 'as-called' }], marks }).why, waits, 'an answer of another checker settles nothing of it');
    assert.deepEqual(route({ answerRows: [{ ...miss, gone: true }], marks }).why, ['nothing owed'], 'an answer whose question is gone waits for no one');
  });

  // spec/evidence.md, The next step: rule 3 reports "while a current answer is a miscall classified prose
  // at fault and the prose has not changed since it was established", and under rule 6 "a chart miscall
  // stands while the chart's current answer is a miscall classified `chart differs from prose`". An
  // answer to another question, such as a chart blunder's, is no answer to the chart's question.
  it('waits on a miscall that is its question\'s current answer, whatever another question of its checker answered since', () => {
    const marks: RouteOver['marks'] = { O1: { mark: 'checked' } };
    const blunder: Partial<AnswerRow> = { entry: 'blunder-A1-1d2e3f', trial: 't2', kind: 'blunder', at: '2', checker: 'chart', result: 'as-called', prose: proseHash({}) };
    assert.deepEqual(route({ answerRows: [{ ...chartMiss, classification: 'prose at fault' }, blunder], marks }).why, ['evidence/chart-0a1b2c.json miscalled, prose at fault: waits for the author'], 'rule 3');
    assert.deepEqual(route({ answerRows: [{ ...chartMiss, classification: 'chart differs from prose' }, blunder], marks }).why, ['chart answer miscalled: evidence/chart-0a1b2c.json'], 'rule 6');
  });
});

// The parts of a composition analysis routeComposition reads, as a test sets them.
interface CompositionOver {
  tripwires?: Note[];
  members?: Partial<Member>[];
  closureMissing?: string[];
  answerRows?: Partial<AnswerRow>[];
  cells?: Partial<Cell>[];
  pendingCalls?: string[];
  properties?: Partial<CompositionProperty>[];
  propertyHeld?: Record<string, string>;
}

describe('routeComposition and routeRoot', () => {
  const composition = ({ tripwires = [], members = [{ part: 'adapter' }], closureMissing = [], answerRows = [], cells = [], pendingCalls = [], properties = [{ id: 'A1' }], propertyHeld = { A1: 'caught' } }: CompositionOver = {}) => ({ tripwires, wiring: { members }, closureMissing, answerRows, cells, pendingCalls, prose: { properties }, propertyHeld }) as CompositionAnalysis;

  it('routes a composition through Fix, Compose, Report, Refresh, Encode and Composition', () => {
    assert.equal(routeComposition(composition({ tripwires: [{ name: 'x', where: 'y' }] })).pass, 'Fix');
    assert.deepEqual(routeComposition(composition({ members: [] })), { pass: 'Compose', why: ['no members'], read: 'spec/composition.md' });
    assert.deepEqual(routeComposition(composition({ closureMissing: ['vault owns an edge'] })).why, ['closure open: vault owns an edge']);
    const cellMiss: Partial<AnswerRow> = { entry: 'tlc-A1-all-honest-0a1b2c', trial: 't1', kind: 'tlc', at: '1', checker: 'tlc', result: 'miscalled', classification: 'prose at fault', prose: proseHash({}) };
    assert.deepEqual(routeComposition(composition({ answerRows: [cellMiss] })).why, ['evidence/tlc-A1-all-honest-0a1b2c.json miscalled, prose at fault: waits for the owner']);
    assert.deepEqual(routeComposition(composition({ answerRows: [{ ...cellMiss, prose: 'abcdef' }] })).why, ['nothing owed'], 'the owner edited the prose since');
    assert.deepEqual(routeComposition(composition({ answerRows: [{ ...cellMiss, trial: 't2', at: '2', result: 'as-called', classification: null }] })).why, ['nothing owed'], 'asked again, the cell came back as called');
    assert.deepEqual(routeComposition(composition({ answerRows: [{ ...cellMiss, gone: true }] })).why, ['nothing owed'], 'an answer whose question is gone waits for no one');
    assert.deepEqual(routeComposition(composition({ cells: [{ property: 'A1', scenario: 'all-honest', mark: 'lapsed' }] })), { pass: 'Refresh', why: ['lapsed: A1×all-honest'], read: 'spec/process.md' });
    assert.deepEqual(routeComposition(composition({ pendingCalls: ['a.md'] })).why, ['calls pending: a.md']);
    assert.deepEqual(routeComposition(composition({ cells: [{ property: 'A1', scenario: 'all-honest', mark: 'pending' }], propertyHeld: { A1: 'held' } })), { pass: 'Try', why: ['cells pending: A1×all-honest', 'blunders owed: A1 (held)'], read: 'spec/process.md' });
    assert.deepEqual(routeComposition(composition({ cells: [{ property: 'A1', scenario: 'all-honest', mark: 'violated', accepted: null }] })).why, ['violated, a decision owed: A1×all-honest']);
    assert.deepEqual(routeComposition(composition({ properties: [] })).why, ['no properties']);
    assert.deepEqual(routeComposition(composition({ cells: [{ property: 'A1', scenario: 'all-honest', mark: 'violated', accepted: { words: 'ok' } as AcceptedRisk }] })), { pass: 'Report', why: ['nothing owed'], read: 'spec/evidence.md' });
  });

  // spec/evidence.md, The next step, per composition: "3. Report on prose at fault." Another cell's answer says
  // nothing of this cell's prose.
  it('waits on a cell\'s prose-at-fault miscall, whatever another cell answered since', () => {
    const cellMiss: Partial<AnswerRow> = { entry: 'tlc-A1-all-honest-0a1b2c', trial: 't1', kind: 'tlc', at: '1', checker: 'tlc', result: 'miscalled', classification: 'prose at fault', prose: proseHash({}) };
    const other: Partial<AnswerRow> = { entry: 'tlc-A2-all-honest-0d1e2f', trial: 't2', kind: 'tlc', at: '2', checker: 'tlc', result: 'as-called' };
    assert.deepEqual(routeComposition(composition({ answerRows: [cellMiss, other] })).why, ['evidence/tlc-A1-all-honest-0a1b2c.json miscalled, prose at fault: waits for the owner']);
  });

  it('orders the root: Fix, then Refresh, Encode, Compose, Composition, then Write or Draw of a part, then Report', () => {
    const a = (title: string, kind: Analysis['kind'], pass: string, why = ['w'], tripwires: Note[] = []) => ({ title, kind, ref: `${kind}s/${title.toLowerCase()}`, tripwires, route: { pass, why } }) as Analysis;
    const comps = [a('Timelock', 'part', 'Draw', ['no chart answer covers: S1']), a('Vault', 'part', 'Encode', ['held'])];
    const compositions = [a('Supply', 'composition', 'Try', ['cells pending'])];
    assert.deepEqual(routeRoot(comps, compositions), { pass: 'Encode', why: ['Vault: held'], read: 'spec/models.md', target: 'parts/vault' });
    assert.deepEqual(routeRoot([a('Timelock', 'part', 'Draw', ['no chart answer covers: S1'])], compositions), { pass: 'Try', why: ['Supply: cells pending'], read: 'spec/process.md', target: 'compositions/supply' });
    assert.deepEqual(routeRoot([a('Timelock', 'part', 'Write', ['unsaid pairs: x']), a('Vault', 'part', 'Draw', ['no chart answer covers: S1'])], []), { pass: 'Write', why: ['Timelock: unsaid pairs: x', 'Vault: no chart answer covers: S1'], read: 'spec/language.md', target: 'parts/timelock' });
    assert.deepEqual(routeRoot([a('Timelock', 'part', 'Report', ['nothing owed'], [{ name: 'stray files', where: 'x' }])], compositions), { pass: 'Fix', why: ['Timelock: stray files (x)'], read: 'spec/evidence.md', target: 'parts/timelock' });
    assert.deepEqual(routeRoot([a('Timelock', 'part', 'Refresh', ['lapsed: S1'])], [a('Supply', 'composition', 'Compose', ['closure open'])]).pass, 'Refresh');
    assert.deepEqual(routeRoot([a('Timelock', 'part', 'Report', ['nothing owed'])], [a('Supply', 'composition', 'Report', ['nothing owed'])]), { pass: 'Report', why: ['nothing owed'], read: 'spec/evidence.md', target: null });
  });

  it('writes and draws the parts before it composes a composition that has no members yet', () => {
    const a = (title: string, kind: Analysis['kind'], pass: string, why: string[], members?: Partial<Member>[]) => ({ title, kind, ref: `${kind}s/${title.toLowerCase()}`, tripwires: [], route: { pass, why }, ...(members ? { wiring: { members } } : {}) }) as unknown as Analysis;
    const empty = a('Net', 'composition', 'Compose', ['no members'], []);
    assert.deepEqual(routeRoot([a('Gate', 'part', 'Write', ['no prose yet'])], [empty]), { pass: 'Write', why: ['Gate: no prose yet'], read: 'spec/language.md', target: 'parts/gate' });
    assert.deepEqual(routeRoot([a('Gate', 'part', 'Draw', ['no chart answer covers: S1'])], [empty]).pass, 'Draw');
    assert.deepEqual(routeRoot([a('Gate', 'part', 'Report', ['nothing owed'])], [empty]), { pass: 'Compose', why: ['Net: no members'], read: 'spec/composition.md', target: 'compositions/net' });
    assert.deepEqual(routeRoot([a('Gate', 'part', 'Encode', ['held'])], [empty]).pass, 'Encode', 'what a part owes beyond its prose and chart still comes first');
    const open = a('Net', 'composition', 'Compose', ['closure open: vault owns an edge'], [{ part: 'gate' }]);
    assert.deepEqual(routeRoot([a('Gate', 'part', 'Write', ['no prose yet'])], [open]).pass, 'Compose', 'a composition with members composes before a part writes');
  });
});

// ---------------------------------------------------------------- render and verify

describe('render and verify', () => {
  // The stage, built once: three drawn parts, Supply over two of them, and the Timelock's chart
  // answer, with no view rendered yet. Each case works on a copy of it.
  let base = '', chart = '';
  const fresh = (t: TestContext) => {
    const root = copyStage(t, base);
    return { ...rootAt(root), verify: () => verifyAll({ root, version: VERSION, write: true }) };
  };

  before(async () => {
    const { root, write, trial } = makeRoot('dossier-verify-');
    write('parts/timelock/prose.md', TIMELOCK);
    write('parts/adapter/prose.md', ADAPTER);
    write('parts/token/prose.md', TOKEN);
    write('compositions/supply/wiring.md', COMPOSITION);
    write('compositions/supply/prose.md', SUPPLY);
    write('compositions/supply/model/extras.tla', 'Helper == TRUE\n');
    for (const id of ['timelock', 'adapter', 'token']) assert.equal((await draw({ root, part: id })).outcome, 'pass', id);
    const results = partResults(root, 'timelock');
    chart = trial(join(root, 'parts', 'timelock'), '2026-11-03-0900-chart-a1a1a1', { call: chartCall, result: results.chart(stamp('0900')) }).name;
    base = root;
  });
  after(() => rmSync(base, { recursive: true, force: true }));

  it('writes ledgers and the index as views, and no generated composition module', t => {
    const { root, verify } = fresh(t);
    const r = verify();
    assert.deepEqual(r.parts.map(c => c.id), ['adapter', 'timelock', 'token']);
    assert.deepEqual(r.compositions.map(s => s.id), ['supply']);
    for (const a of [...r.parts, ...r.compositions]) assert.deepEqual(a.tripwires, [], a.id);
    const ledger = readFileSync(join(root, 'parts', 'timelock', 'ledger.md'), 'utf8');
    assert.ok(ledger.endsWith('\n```\n') && !ledger.includes('ledger-hash'), 'a view ends with its JSON block and carries no hash of its own');
    assert.ok(ledger.startsWith('# Ledger: Timelock   rebuilt '));
    assert.equal(ledger.split('\n')[1], 'Written by dossier render from the records. The JSON block at the end says the same for tools.');
    assert.ok(ledger.includes('\nverify: ok · Timelock · dossier 0.1.0 · 0 tripwires\n'));
    assert.ok(ledger.includes('\n| id | kind | passage | owner | machine | answers | reach |\n'), 'each passage\'s words sit beside its id, with the answers behind its mark');
    assert.ok(ledger.includes(`\n| S1 | State | Idle: nothing is planned. | unsettled | drawn | [chart-a1a1a1](evidence/${chart}.json) | the chart over remaining 0..2 |\n`), 'an answer is named by the trial that established it, linked to its entry in evidence/');
    assert.ok(ledger.includes(`\n| R5 | Refusal | In Idle, schedule is refused when delay is above 2. | unsettled | checked | [chart-a1a1a1](evidence/${chart}.json) | the chart over remaining 0..2 |\n`));
    assert.ok(ledger.includes('\n| O1 | Once | Once Waiting, eventually Idle, given G1. | unsettled | pending, given G1 |  |  |\n'), 'the Givens a property rests on are printed beside its mark');
    assert.ok(ledger.includes('\n| K1 | certora certora/Timelock.spec#delayEnforced at 1a2b3c4d | unresolved (no knowledge base) |\n'));
    assert.ok(ledger.includes('\n| K4 | none | assumed |\n'));
    assert.ok(ledger.includes('\nUsed by: no composition yet\n'));
    assert.ok(ledger.includes('\nSince last rebuild: first rebuild\n'));
    assert.ok(readFileSync(join(root, 'parts', 'adapter', 'ledger.md'), 'utf8').includes('\nUsed by: supply\n'));
    assert.ok(!existsSync(join(root, 'compositions', 'supply', 'model', 'generated')), 'render writes views only; scaffold and trial write the generated module');
    const composed = r.compositions[0];
    assert.ok(compositionModuleText(composed).includes('\n\\* extras.tla, hand-written:\nHelper == TRUE\n'), 'verify composes the module in memory');
    assert.ok(Object.hasOwn(composed.composed.cfgs, 'A1_user_malicious.cfg'));
    const index = readFileSync(join(root, 'index.md'), 'utf8');
    const supply = readFileSync(join(root, 'compositions', 'supply', 'ledger.md'), 'utf8');
    assert.ok(supply.includes('\n| A1 · Always, {token.supply = adapter.held}. · held | unsettled | pending | pending |  |\n'), 'a property\'s sentence sits beside its id, without the Scenarios sentence the columns show');
    assert.ok(supply.includes('\n| A2 · Always, {adapter.Open or adapter.Halted}. · held | unsettled | pending |  | pending |\n'));
    const again = verify();
    assert.deepEqual([...again.parts, ...again.compositions].flatMap(a => a.tripwires), [], 'rendering again trips nothing');
    assert.equal(readFileSync(join(root, 'parts', 'timelock', 'ledger.md'), 'utf8'), ledger, 'a rebuild that moves nothing rewrites nothing');
    assert.equal(readFileSync(join(root, 'compositions', 'supply', 'ledger.md'), 'utf8'), supply);
    assert.equal(readFileSync(join(root, 'index.md'), 'utf8'), index);
  });

  it('round-trips the machine form and diffs it on the next rebuild', t => {
    const { root, trial, verify } = fresh(t);
    // The first rebuild writes the views this one reads.
    verify();
    const ledger = readFileSync(join(root, 'parts', 'timelock', 'ledger.md'), 'utf8');
    const form = parseMachineForm(ledger) as PartLedgerForm;
    assert.equal(form.kind, 'part');
    assert.equal(form.id, 'timelock');
    assert.equal(form.title, 'Timelock');
    assert.equal(form.tier, 'modeled');
    assert.equal(form.module, 'gov-timelock');
    assert.equal(form.plugin, VERSION);
    assert.equal(form.marks.S1.mark, 'drawn');
    assert.equal(form.marks.R5.mark, 'checked');
    assert.deepEqual(form.answers.map(row => [row.entry, row.trial]), [[chart, '2026-11-03-0900-chart-a1a1a1']], 'one row per answer: its entry, and the trial that established it');
    assert.equal(form.route.pass, 'Encode');
    assert.equal(form.summary.drawn, 20);
    assert.equal(parseMachineForm('no form here'), null);
    assert.equal(parseMachineForm(ledger.replace('"kind": "part"', '"kind": broken')), null);
    const compositionForm = parseMachineForm(readFileSync(join(root, 'compositions', 'supply', 'ledger.md'), 'utf8')) as CompositionLedgerForm;
    assert.equal(compositionForm.kind, 'composition');
    assert.deepEqual(compositionForm.cells.map(c => `${c.property}|${c.scenario}|${c.mark}`), ['A1|all-honest|pending', 'A1|user-malicious|pending', 'A2|all-honest|pending', 'A2|breaker-offline|pending']);
    assert.deepEqual(compositionForm.propertyHeld, { A1: 'held', A2: 'held' });
    const results = partResults(root, 'timelock');
    trial(join(root, 'parts', 'timelock'), '2026-11-03-0910-external-b2b2b2', { call: externalCall(['W1']), result: results.external(stamp('0910'), ['W1']) });
    verify();
    const next = readFileSync(join(root, 'parts', 'timelock', 'ledger.md'), 'utf8');
    assert.ok(next.includes('\nSince last rebuild: answers new 2026-11-03-0910-external-b2b2b2\n'));
    assert.ok(next.includes(`\n| W1 | Walk | Walk Plan: from Idle, schedule delay 1, execute refused, tick, execute; ends Idle with remaining 0; change sent once. | unsettled | drawn, grounded | [chart-a1a1a1](evidence/${chart}.json) | the chart over remaining 0..2 |\n`));
    verify();
    assert.equal(readFileSync(join(root, 'parts', 'timelock', 'ledger.md'), 'utf8'), next, 'the line and the stamp stay until the next change');
  });

  it('writes index.md with the parts by compositions table and every summary', t => {
    const { root, verify } = fresh(t);
    const r = verify();
    const index = readFileSync(join(root, 'index.md'), 'utf8');
    assert.ok(index.startsWith('# Dossiers   rebuilt '));
    assert.ok(index.includes('\nverify: ok · 3 parts, 1 composition · dossier 0.1.0 · 0 tripwires\n'));
    assert.ok(index.includes('\n| part | module | tier | supply |\n| --- | --- | --- | --- |\n| adapter | adapter | modeled | member |\n| timelock | gov-timelock | modeled |  |\n| token | token | modeled | member |\n'));
    assert.ok(index.includes(`\n- ${summaryLine(r.parts.find(c => c.id === 'timelock')!)}\n`));
    assert.match(index, /\n- Supply: 2 properties × 3 scenarios · 4 cells · pending 4 · held 2 · prose@[0-9a-f]{6}\n/, 'a summary prints only the counts above zero, then the prose hash');
    assert.match(index, /\nNext: Encode on parts\/timelock — Timelock: /);
    assert.equal(index.split('\n')[1], 'Written by dossier render: parts by compositions, and every composition at a glance.');
    assert.ok(index.endsWith('\n```\n') && !index.includes('ledger-hash'));
    assert.deepEqual(r.route.target, 'parts/timelock');
    assert.equal(r.route.pass, 'Encode');
  });

  it('counts one property, scenario, cell or passage in the singular', () => {
    const composition = (n: number, cells: number) => ({ kind: 'composition', title: 'Net', summary: { properties: n, scenarios: n, cells, proved: 0, checked: 0, implied: 0, violated: 0, accepted: 0, lapsed: 0, pending: cells, miscalled: 0, held: n, hollow: 0, open: 0, doubtsOpen: 0 } }) as unknown as Analysis;
    // A stub with no passages hashes to the hash of nothing; the line ends with it either way.
    assert.equal(summaryLine(composition(1, 1)), 'Net: 1 property × 1 scenario · 1 cell · pending 1 · held 1 · prose@44136f');
    assert.equal(summaryLine(composition(2, 4)), 'Net: 2 properties × 2 scenarios · 4 cells · pending 4 · held 2 · prose@44136f');
    const part = (passages: number) => ({ kind: 'part', title: 'Gate', summary: { passages, settled: 0, confirmed: 0, unsettled: passages, checked: 0 } }) as unknown as Analysis;
    assert.equal(summaryLine(part(1)), 'Gate: 1 passage · unsettled 1 · prose@44136f');
    assert.equal(summaryLine(part(0)), 'Gate: 0 passages · prose@44136f', 'a count of zero is left out, and the passages are always counted');
  });

  it('writes verify lines, ok or FAIL', t => {
    const { root, verify } = fresh(t);
    // The first rebuild writes the ledger edited below.
    verify();
    assert.equal(verifyLine([{ kind: 'part', title: 'Timelock', tripwires: [] }] as unknown as Analysis[], VERSION), 'verify: ok · Timelock · dossier 0.1.0 · 0 tripwires');
    assert.equal(verifyLine([{ kind: 'part', title: 'Timelock', tripwires: [] }, { kind: 'composition', title: 'Supply', tripwires: [] }] as unknown as Analysis[], VERSION), 'verify: ok · 1 part, 1 composition · dossier 0.1.0 · 0 tripwires');
    assert.equal(verifyLine([{ kind: 'part', title: 'Timelock', tripwires: [{ name: 'stray files', where: 'x.txt' }] }, { kind: 'composition', title: 'Supply', tripwires: [{ name: 'misnamed', where: 'O1 cites G9' }] }] as Analysis[], VERSION), 'verify: FAIL · 1 part, 1 composition · dossier 0.1.0 · 2 tripwires: stray files (Timelock: x.txt); misnamed (Supply: O1 cites G9)');
    const path = join(root, 'parts', 'adapter', 'ledger.md');
    const original = readFileSync(path, 'utf8');
    writeFileSync(path, original + 'an edit\n');
    const r = verify();
    assert.equal(verifyLine([...r.parts, ...r.compositions], VERSION), 'verify: ok · 3 parts, 1 composition · dossier 0.1.0 · 0 tripwires', 'a ledger is a view: editing it fails nothing');
    assert.equal(core(readFileSync(path, 'utf8')), core(original), 'render writes the view back from the records');
  });

  it('selects the wanted dossiers and can run without writing', t => {
    const { root, verify } = fresh(t);
    // The first rebuild writes the index that a verify which writes nothing leaves as it is.
    verify();
    const before = readFileSync(join(root, 'index.md'), 'utf8');
    const r = verifyAll({ root, version: VERSION, wanted: ['timelock', 'compositions/supply'], write: false });
    assert.deepEqual(r.selected.map(a => a.id), ['timelock', 'supply']);
    assert.equal(readFileSync(join(root, 'index.md'), 'utf8'), before);
    const ledger = renderPartLedger(r.parts.find(c => c.id === 'timelock')!, { version: VERSION, now: 'now', previous: null });
    assert.ok(ledger.startsWith('# Ledger: Timelock   rebuilt now   prose@'));
    const index = renderIndex({ parts: r.parts, compositions: r.compositions, version: VERSION, now: 'now', route: r.route });
    assert.ok(index.startsWith('# Dossiers   rebuilt now   dossier 0.1.0\n'));
  });

  it('keeps the text on disk when only the stamp would move, and says when the words moved but no mark did', t => {
    const r = verifyAll({ root: fresh(t).root, version: VERSION, write: false });
    const timelock = r.parts.find(c => c.id === 'timelock')!;
    const first = renderPartLedger(timelock, { version: VERSION, now: 't1', previous: null });
    assert.ok(first.includes('\nSince last rebuild: first rebuild\n'));
    assert.equal(renderPartLedger(timelock, { version: VERSION, now: 't2', previous: first }), first, 'the same content keeps the old stamp');
    const moved = renderPartLedger(timelock, { version: '0.2.1', now: 't3', previous: first });
    assert.notEqual(moved, first);
    assert.ok(moved.startsWith('# Ledger: Timelock   rebuilt t3   '));
    assert.ok(moved.includes('\nSince last rebuild: no mark moved\n'));
    assert.equal(core(first), core(renderPartLedger(timelock, { version: VERSION, now: 't4', previous: null })));
    assert.notEqual(core(first), core(moved));
    assert.ok(!core(first).includes('ledger-hash') && !core(first).includes('t1'));
    const supply = r.compositions.find(s => s.id === 'supply')!;
    const composition = renderCompositionLedger(supply, { version: VERSION, now: 't1', previous: null });
    assert.equal(renderCompositionLedger(supply, { version: VERSION, now: 't2', previous: composition }), composition);
    assert.ok(renderCompositionLedger(supply, { version: '0.2.1', now: 't3', previous: composition }).includes('\nSince last rebuild: no mark moved\n'));
    const index = renderIndex({ parts: r.parts, compositions: r.compositions, version: VERSION, now: 't1', route: r.route, previous: null });
    assert.equal(renderIndex({ parts: r.parts, compositions: r.compositions, version: VERSION, now: 't2', route: r.route, previous: index }), index);
    assert.notEqual(renderIndex({ parts: r.parts, compositions: r.compositions, version: '0.2.1', now: 't2', route: r.route, previous: index }), index);
  });

  // A ledger rendered before its rows were called answers lists them under trials, each by its trial's
  // id, below a header that counts trials. It reads once, for the "Since last rebuild" line.
  it('reads a ledger rendered before its rows were called answers once, for what moved since it', t => {
    const r = verifyAll({ root: fresh(t).root, version: VERSION, write: false });
    const timelock = r.parts.find(c => c.id === 'timelock')!;
    assert.ok(timelock.answerRows.length > 0, 'the part holds answers');
    const current = renderPartLedger(timelock, { version: VERSION, now: 't1', previous: null });
    const { answers, ...rest } = parseMachineForm(current) as PartLedgerForm;
    const rows = answers.map(({ entry, trial, ...row }) => ({ id: trial, entry, ...row }));
    // The ledger with another machine form, the header counting trials as the plugin wrote it before.
    const ledgerWith = (form: object) => current.replace(/   answers (\d+)   /, '   trials $1   ').replace(/\n```json\n[\s\S]*\n```\n$/, () => `\n\`\`\`json\n${JSON.stringify(form, null, 2)}\n\`\`\`\n`);
    const before = ledgerWith({ ...rest, trials: rows });
    const read = parseMachineForm(before) as { trials?: unknown[]; answers?: unknown };
    assert.ok(read.trials?.length === rows.length && read.answers === undefined && /   trials \d+   /.test(before.split('\n')[0]), 'the ledger as the plugin wrote it before');
    const again = renderPartLedger(timelock, { version: VERSION, now: 't2', previous: before });
    assert.ok(again.includes('\nSince last rebuild: no mark moved\n'), 'no answer reads as new: the old rows are read by their trial ids');
    assert.ok(/   answers \d+   /.test(again.split('\n')[0]) && again.includes('\n  "answers": [\n'), 'and the ledger is written in the new form');
    const unread = ledgerWith({ ...rest, unread: rows });
    assert.match(renderPartLedger(timelock, { version: VERSION, now: 't3', previous: unread }), /\nSince last rebuild: answers new /, 'unread, every answer would read as new');
  });

  it('removes a generated configuration the composer no longer writes, and leaves the rest', t => {
    const { root } = fresh(t);
    const gen = join(root, 'compositions', 'supply', 'model', 'generated');
    mkdirSync(gen, { recursive: true });
    writeFileSync(join(gen, 'A1_breaker_offline.cfg'), 'SPECIFICATION Spec\nINVARIANTS TypeOK A1\n');
    writeFileSync(join(gen, '.keep'), '');
    const supply = verifyAll({ root, version: VERSION }).compositions[0];
    writeGenerated(supply.dir, supply.composed, compositionModuleText(supply));
    assert.ok(!existsSync(join(gen, 'A1_breaker_offline.cfg')), 'A1 claims all-honest and user-malicious: no cell runs A1 under breaker-offline');
    assert.ok(existsSync(join(gen, '.keep')) && existsSync(join(gen, 'A1_user_malicious.cfg')) && existsSync(join(gen, 'Supply.tla')));
  });

  it('prints each cell\'s members at the prose the trial found them in', t => {
    const { root, trial } = fresh(t);
    const d = trial(join(root, 'compositions', 'supply'), '2026-11-03-0950-tlc-c5c5c5', supplyCellTrial(root, 'A2', 'all-honest', stamp('0950')));
    const supply = verifyAll({ root, version: VERSION, write: false }).compositions[0];
    const join6 = short(readFileSync(join(root, 'parts', 'adapter', 'prose.md'), 'utf8'), 16).slice(0, 6), token6 = short(readFileSync(join(root, 'parts', 'token', 'prose.md'), 'utf8'), 16).slice(0, 6);
    assert.ok(renderCompositionLedger(supply, { version: VERSION, now: 't', previous: null }).includes(`\n- A2 × all-honest: checked, reach amounts up to 2, [2026-11-03-0950-tlc-c5c5c5](evidence/${d.name}.json), members adapter@${join6}, token@${token6}\n`));
  });

  it('hashes into a composition trial\'s snapshot the pins of the actors whose events reach a member, and leaves a part trial\'s alone', t => {
    const { root, write } = fresh(t);
    write('actors/actors.md', PINNED_ACTORS);
    const composition = snapshotOf({ where: { kind: 'composition', id: 'supply' } as Located, loaded: loadComposition(root, 'supply'), knowledge: nullKnowledge(), call: { scenario: 'all-honest' } as Call });
    assert.ok('adapter#contract:adapter' in composition.records, 'the user\'s exit reaches the Adapter');
    assert.deepEqual(Object.keys(composition.records), ['adapter#contract:adapter'], 'Governance\'s events reach no member of Supply');
    const part = snapshotOf({ where: { kind: 'part', id: 'adapter' } as Located, loaded: loadPart(root, 'adapter'), knowledge: nullKnowledge(), call: {} as Call });
    assert.deepEqual(part.records, {}, 'a part trial rests on its own pins alone');
  });
});

describe('a removed answer', () => {
  it('trips answer removed, for a part and a composition, on every rebuild until the entry is back or a forget decision lets it go', () => {
    const { root, write, trial } = makeRoot('dossier-removed-');
    try {
      write('parts/timelock/prose.md', TIMELOCK);
      write('parts/adapter/prose.md', ADAPTER);
      write('parts/token/prose.md', TOKEN);
      write('compositions/supply/wiring.md', COMPOSITION);
      write('compositions/supply/prose.md', SUPPLY);
      const cdir = join(root, 'parts', 'timelock'), sdir = join(root, 'compositions', 'supply');
      const part = trial(cdir, '2026-11-03-0900-chart-a1a1a1', { call: chartCall, result: partResults(root, 'timelock').chart(stamp('0900')) });
      const composition = trial(sdir, '2026-11-03-0910-tlc-b2b2b2', supplyCellTrial(root, 'A2', 'all-honest', stamp('0910')));
      const verify = () => verifyAll({ root, version: VERSION, write: true });
      const trips = (r: ReturnType<typeof verify>) => [...r.parts, ...r.compositions].flatMap(a => a.tripwires.map(t => `${a.id}: ${t.name}: ${t.where}`));
      const ledger = (rel: string) => readFileSync(join(root, rel, 'ledger.md'), 'utf8');
      assert.deepEqual(trips(verify()), []);
      const kept = join(root, '_scratch', 'kept');
      mkdirSync(kept, { recursive: true });
      renameSync(part.entry, join(kept, 'part.json'));
      rmSync(composition.entry);
      // The tripwire names the decision that lets the answer go: the entry and the digest integrity.json binds.
      const forget = (dir: string, name: string) => `${name}@${boundAt(dir, name)}`;
      const lost = `evidence/${part.name}.json; restore it, or the owner forgets ${forget(cdir, part.name)}`;
      const removed = [`timelock: answer removed: ${lost}`, `supply: answer removed: evidence/${composition.name}.json; restore it, or the owner forgets ${forget(sdir, composition.name)}`];
      let r = verify();
      assert.deepEqual(trips(r), removed);
      assert.equal(r.route.pass, 'Fix');
      assert.ok(ledger('parts/timelock').includes(`\nverify: FAIL · Timelock · dossier 0.1.0 · 1 tripwire: answer removed (Timelock: ${lost})\n`), 'the ledger records it');
      assert.deepEqual((parseMachineForm(ledger('parts/timelock')) as PartLedgerForm).removed, [part.name], 'and shows it in its machine form');
      assert.ok(ledger('parts/timelock').includes('\nSince last rebuild: S1 drawn→pending'), ledger('parts/timelock'));
      assert.ok(ledger('parts/timelock').includes(`; answers removed ${part.name}\n`), ledger('parts/timelock'));
      assert.deepEqual(trips(verify()), removed, 'a render does not forget it: integrity.json still binds the entry');
      assert.deepEqual(trips(verify()), removed, 'nor the one after');
      renameSync(join(kept, 'part.json'), part.entry);
      r = verify();
      assert.deepEqual(trips(r), [removed[1]], 'the entry restored, the part is whole again');
      assert.deepEqual((parseMachineForm(ledger('parts/timelock')) as PartLedgerForm).removed, []);
      decide(sdir, { time: '2026-11-03T11:00:00Z', verb: 'forget', args: [forget(sdir, composition.name)], words: 'lost with the old laptop' });
      r = verify();
      assert.deepEqual(trips(r), [], 'the owner let it go');
      const supply = r.compositions[0];
      assert.deepEqual(supply.removed, []);
      assert.ok(!supply.answerRows.some(t => t.entry === composition.name), 'a forgotten removed answer is no answer: it covers nothing');
      assert.equal(supply.cells.find(c => c.property === 'A2' && c.scenario === 'all-honest')!.mark, 'pending');
      const forgotten = `\nForgotten: evidence/${composition.name}.json (2026-11-03T11:00:00Z: "lost with the old laptop")\n`;
      assert.ok(ledger('compositions/supply').includes(forgotten));
      assert.deepEqual(trips(verify()), [], 'and it stays let go');
      assert.ok(ledger('compositions/supply').includes(forgotten) && manifestOf(sdir).evidence[composition.name], 'its manifest line stays, and the ledger says it was forgotten');
      // A new answer to its question takes the manifest line, and the forget has nothing left to let go.
      const again = trial(sdir, '2026-11-03-1200-tlc-b2b2c3', supplyCellTrial(root, 'A2', 'all-honest', stamp('1200')));
      assert.deepEqual([again.action, again.name], ['published', composition.name]);
      r = verify();
      assert.deepEqual(trips(r), []);
      assert.ok(!ledger('compositions/supply').includes('\nForgotten: '));
      assert.equal(r.compositions[0].cells.find(c => c.property === 'A2' && c.scenario === 'all-honest')!.mark, 'checked');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('lets an entry still there go only as far as a new answer replaces it: until then it covers, and its violation is not rerun away', () => {
    const { root, write, trial } = makeRoot('dossier-forgotten-');
    try {
      write('parts/timelock/prose.md', TIMELOCK);
      const dir = join(root, 'parts', 'timelock'), results = partResults(root, 'timelock');
      const failed = trial(dir, '2026-11-03-0900-chart-a1a1a1', { call: chartCall, result: results.chart(stamp('0900'), { failing: ['W1'] }) });
      writeFileSync(failed.reading, 'retelling: the walk ends in Ready.\nclassification: call was wrong\n');
      const analyze = () => analyzePart({ root, id: 'timelock', knowledge: nullKnowledge(), pluginVersion: VERSION, marker: { plugin: VERSION }, actors: readActors(root) });
      let a = analyze();
      assert.deepEqual(a.tripwires, []);
      assert.deepEqual([a.marks.S1.mark, a.marks.W1.mark], ['drawn', 'miscalled']);
      // On an unchanged basis the runner refuses to let a pass replace the failed check, and names the owner's decision.
      assert.throws(() => trial(dir, '2026-11-03-0910-chart-b2b2b2', { call: chartCall, result: results.chart(stamp('0910')) }), new RegExp(`forget ${failed.name}@${boundAt(dir, failed.name)}`));
      decide(dir, { time: '2026-11-03T11:00:00Z', verb: 'forget', args: [`${failed.name}@${boundAt(dir, failed.name)}`], words: 'the check ran against a draft' });
      a = analyze();
      assert.deepEqual(a.tripwires, []);
      assert.deepEqual([a.marks.S1.mark, a.marks.W1.mark], ['drawn', 'miscalled'], 'a forget deletes no surviving entry: it covers what it covered');
      assert.deepEqual(a.answerRows.map(t => [t.trial, t.entry]), [['2026-11-03-0900-chart-a1a1a1', failed.name]]);
      const replaced = trial(dir, '2026-11-03-0920-chart-c3c3c3', { call: chartCall, result: results.chart(stamp('0920')) });
      assert.deepEqual([replaced.action, replaced.name], ['published', failed.name], 'with the forget, the new answer replaces it');
      a = analyze();
      assert.deepEqual([a.marks.S1.mark, a.marks.W1.mark], ['drawn', 'drawn']);
      assert.deepEqual(a.answerRows.map(t => [t.trial, t.entry]), [['2026-11-03-0920-chart-c3c3c3', failed.name]]);
      assert.equal(existsSync(failed.reading), false, 'the replaced answer\'s reading goes with it');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});

describe('the committed decisions', () => {
  it('trips decisions chain broken once the log loses a committed line, on every verify, and grants nothing to a line appended without its commit', () => {
    const { root, write } = makeRoot('dossier-tip-');
    try {
      write('parts/timelock/prose.md', TIMELOCK);
      const dir = join(root, 'parts', 'timelock'), log = join(dir, 'decisions.log');
      const hashes = loadPart(root, 'timelock').ir.hashes;
      decide(dir, { time: '2026-11-03T10:00:00Z', verb: 'begin', args: ['modeled'], words: 'start' });
      decide(dir, { time: '2026-11-03T10:01:00Z', verb: 'accept', args: [`S1@${hashes.S1}`], words: 'as deployed' });
      const verify = () => verifyAll({ root, version: VERSION, write: true }).parts[0];
      assert.deepEqual(verify().tripwires, []);
      assert.ok(readFileSync(join(dir, 'ledger.md'), 'utf8').split('\n')[0].endsWith('   answers 0   decisions 2'), 'decisions counts the lines of the log, and answers the entries that read');
      decide(dir, { time: '2026-11-03T10:02:00Z', verb: 'answer', args: ['D1', 'a'], words: 'a' });
      assert.deepEqual(verify().tripwires, [], 'a line appended and committed after them is fine');
      const kept = readFileSync(log, 'utf8');
      writeFileSync(log, kept.split('\n').slice(0, 2).join('\n') + '\n');
      const lost = { name: 'decisions chain broken', where: 'committed decision prefix was truncated' };
      assert.deepEqual(verify().tripwires, [lost], 'its last line removed: what is left chains whole, and still the record lost a decision');
      assert.deepEqual(verify().tripwires, [lost], 'on the next verify too: integrity.json keeps the committed prefix');
      assert.equal(verify().owner.S1, 'unsettled', 'a broken record applies none of its decisions');
      writeFileSync(log, kept);
      assert.deepEqual(verify().tripwires, [], 'the line restored');
      assert.equal(verify().owner.S1, 'settled');
      appendDecision(log, { time: '2026-11-03T10:03:00Z', verb: 'reject', args: [`S1@${hashes.S1}`], words: 'never committed' });
      const pending = verify();
      assert.deepEqual(pending.tripwires.map(t => t.name), ['decision publication incomplete']);
      assert.equal(pending.owner.S1, 'settled', 'an uncommitted line grants no owner decision');
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});

describe('the root\'s own tripwires', () => {
  it('trips malformed marker on a dossier.json that does not parse, once, at the root, and flags no plugin update from it', () => {
    const { root, write } = makeRoot('dossier-marker-');
    try {
      write('parts/timelock/prose.md', TIMELOCK);
      write('dossier.json', '{ "plugin": "0.1.0", }\n');
      const r = verifyAll({ root, version: VERSION, write: true });
      assert.equal(r.tripwires.length, 1);
      assert.equal(r.tripwires[0].name, 'malformed marker');
      assert.match(r.tripwires[0].where, /^dossier\.json does not parse: /);
      assert.deepEqual(r.parts[0].tripwires, [{ name: 'integrity unavailable', where: 'dossier.json does not read' }], 'an unreadable root cannot select an evidence authority');
      assert.ok(!flagNames(r.parts[0]).includes('plugin updated'), 'no version read is no version that moved');
      assert.deepEqual([r.route.pass, r.route.target, r.route.why], ['Fix', null, [`malformed marker (${r.tripwires[0].where})`, 'Timelock: integrity unavailable (dossier.json does not read)']]);
      const line = verifyLine([...r.parts, ...r.compositions], VERSION, r.tripwires);
      assert.equal(line, `verify: FAIL · Timelock · dossier 0.1.0 · 2 tripwires: malformed marker (${r.tripwires[0].where}); integrity unavailable (Timelock: dossier.json does not read)`);
      assert.ok(readFileSync(join(root, 'index.md'), 'utf8').includes(`\n${line}\n`), 'the index says so');
      assert.equal(verifyLine([], VERSION), 'verify: ok · no dossiers · dossier 0.1.0 · 0 tripwires');
      write('dossier.json', JSON.stringify({ plugin: VERSION }) + '\n');
      const unnamed = 'dossier.json names no storage; this plugin reads integrity-v1 only';
      assert.deepEqual(verifyAll({ root, version: VERSION }).tripwires, [{ name: 'integrity unavailable', where: unnamed }], 'a root that names no storage is read as no format at all');
      write('dossier.json', JSON.stringify({ plugin: VERSION, storage: 'integrity-v2' }) + '\n');
      const other = verifyAll({ root, version: VERSION });
      assert.deepEqual(other.tripwires, [{ name: 'malformed marker', where: 'dossier.json: unsupported storage format' }]);
      assert.deepEqual(other.parts[0].tripwires, [{ name: 'integrity unavailable', where: 'dossier.json names storage "integrity-v2"; this plugin reads integrity-v1 only' }]);
      write('dossier.json', JSON.stringify({ plugin: VERSION, storage: STORAGE }) + '\n');
      assert.deepEqual(verifyAll({ root, version: VERSION, write: true }).tripwires, []);
    } finally { rmSync(root, { recursive: true, force: true }); }
  });

  it('reads nothing from an edited index: verify passes, and render writes it back from the records', () => {
    const { root, write } = makeRoot('dossier-index-');
    try {
      write('parts/timelock/prose.md', TIMELOCK);
      assert.deepEqual(verifyAll({ root, version: VERSION, write: true }).tripwires, []);
      const index = join(root, 'index.md');
      const original = readFileSync(index, 'utf8');
      writeFileSync(index, original.replace('| timelock |', '| paused |'));
      assert.deepEqual(verifyAll({ root, version: VERSION }).tripwires, [], 'the index is a view, not a record');
      verifyAll({ root, version: VERSION, write: true });
      assert.equal(core(readFileSync(index, 'utf8')), core(original));
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});

describe('backingText', () => {
  it('prints every backing as its passage names it, a record included', () => {
  assert.equal(backingText({ kind: 'certora', path: 'certora/Vault.spec', rule: 'debtEqualsCredit', commit: '1a2b9f8e' }), 'certora certora/Vault.spec#debtEqualsCredit at 1a2b9f8e');
  assert.equal(backingText({ kind: 'record', ref: 'adapter#property:held-equals-supply' }), 'record adapter#property:held-equals-supply');
  assert.equal(backingText({ kind: 'file', path: 'modules/vault/limits.md', rule: 'Line' }), 'file modules/vault/limits.md#Line');
  assert.equal(backingText({ kind: 'external', runner: 'replay' }), 'external replay');
  assert.equal(backingText({ kind: 'none' }), 'none');
  assert.equal(backingText(null), 'none');
});
});

describe('propertyId', () => {
  it('reads the passage behind every model-side name, a suffixed invariant included', () => {
    assert.equal(propertyId('A1'), 'A1');
    assert.equal(propertyId('Inv_A1'), 'A1');
    assert.equal(propertyId('Inv_A1_lemma'), 'A1');
    assert.equal(propertyId('N2'), 'N2');
    assert.equal(propertyId('NotW2'), 'W2');
    assert.equal(propertyId('W1_End'), 'W1');
    assert.equal(propertyId('TypeOK'), null);
    assert.equal(propertyId('SentBounded'), null);
  });
});

// ---------------------------------------------------------------- blunders

// A blunder counts only for the property it targets: the ids a chart blunder's call says must fail,
// the one property a model blunder enables, or the property a composition blunder names under property:.
// Each sequence runs whole, and again for each property with the blunders aimed elsewhere left out.
// The property's caught, held or hollow state is the same both ways. A catch counts only at the
// property's current words.
describe('a blunder counts only for the property it targets', () => {
  // The stage, built once: a charted Timelock and a modeled one, with no answer yet. Each sequence
  // runs on a copy of its own.
  let blank = '';
  const caseOf = (root: string) => ({ ...rootAt(root), results: { charted: partResults(root, 'charted'), modeled: partResults(root, 'modeled') } as Record<string, Results> });
  type Case = ReturnType<typeof caseOf>;
  const IDS = ['A1', 'A2'];
  const blunderOf = (step: string) => {
    const m = step.match(/^(chart|tlc|apalache|alloy) blunder on (A\d), (caught|not caught)( at earlier words)?$/);
    return m ? { checker: m[1], on: m[2], caught: m[3] === 'caught', earlier: Boolean(m[4]) } : null;
  };
  const pad = (i: number) => String(i).padStart(2, '0');

  // A step of a part's sequence as the runner writes its trial: an ordinary chart or TLC trial,
  // or a blunder on one property, caught or not, at the property's current words or earlier ones. A
  // blunder is a wrong of its own, a copy written for its step, so each blunder asks its own question;
  // asking one blunder's question again follows the evidence rules (answers.test.ts).
  const stepOf = ({ root, write, results }: Case, step: string, tier: string, at: string, index: number): { kind: string; call: string; result: Result } => {
    const r = results[tier];
    if (step === 'chart') return { kind: 'chart', call: chartCall, result: r.chart(at) };
    if (step === 'chart with A1 failing') return { kind: 'chart', call: chartCall, result: r.chart(at, { failing: ['A1'] }) };
    if (step === 'tlc') return { kind: 'tlc', call: tlcCall({ TypeOK: 'holds', A1: 'holds', A2: 'holds' }), result: r.tlc(at, { enabled: ['TypeOK', 'A1', 'A2'], outcomes: { TypeOK: 'holds', A1: 'holds', A2: 'holds' } }) };
    const b = blunderOf(step);
    if (!b) throw new Error(`no step reads "${step}"`);
    const verdict = (miss: string): { result: Verdict; miscalls: string[] } => (b.caught ? { result: 'as-called', miscalls: [] } : { result: 'miscalled', miscalls: [miss] });
    const call = (executes: string[], expect: string) => `kind: blunder\nblunder: the wrong\nexecutes:\n${executes.map(path => `  - ${path}\n`).join('')}reach: the same\nexpect:\n  ${expect}\nbecause: |\n  it must catch it\n`;
    // The step's copy, written into the part and hashed as the runner hashes what it executes.
    const copy = (path: string, text: string) => { write(`parts/${tier}/${path}`, text); return { [path]: fileHash(join(root, 'parts', tier, path)) }; };
    let result: Result, text: string;
    if (b.checker === 'chart') {
      const machine = `chart/blunders/${b.on}-${index}.json`;
      result = { ...r.chart(at, { failing: b.caught ? [b.on] : [] }), kind: 'blunder', executed: copy(machine, '{}\n'), expect: { checks: { expect: 'fail', failing: [b.on] } }, ...verdict(`checks: expected fail ${b.on}, got pass`) };
      text = call([machine], `checks: fail ${b.on}`);
    } else if (b.checker === 'tlc') {
      const module = `model/blunders/x${index}.tla`, cfg = `model/blunders/x${index}_${b.on}.cfg`;
      const executed = { ...copy(module, TIMELOCK_TLA.replace('MODULE Timelock', `MODULE x${index}`)), ...copy(cfg, `SPECIFICATION Spec\nINVARIANTS ${b.on}\n`) };
      result = r.tlc(at, { kind: 'blunder', enabled: [b.on], outcomes: { [b.on]: b.caught ? 'violated' : 'holds' }, expect: 'violated', executed, ...verdict(`${b.on}: expected violated, got holds`) });
      text = call([module, cfg], `${b.on}: violated`);
    } else if (b.checker === 'apalache') {
      const inv = `Inv_${b.on}`, module = `model/blunders/x${index}.tla`;
      result = { ...r.apalache(at, { inv, mode: 'bounded', outcome: b.caught ? 'violated' : 'holds' }), kind: 'blunder', executed: copy(module, TIMELOCK_TLA.replace('MODULE Timelock', `MODULE x${index}`)), expect: { [inv]: { expect: 'violated' } }, ...verdict(`${inv}: expected violated, got holds`) };
      text = call([module], `${inv}: violated`).replace('\nexecutes:', '\nmode: bounded\nlength: 3\nexecutes:');
    } else {
      const cmd = `${b.on}_holds`, module = `model/blunders/x${index}.als`;
      result = {
        kind: 'blunder', checker: 'alloy', dossier: 'x', id: 'x', at, versions: { dossier: VERSION }, command: null, cwd: '.', exit: 0, seconds: 1, property: null, scenario: null,
        executed: copy(module, `sig P {}\nassert ${cmd} { some P }\ncheck ${cmd} for 3\n`), enabled: [cmd], expect: { [cmd]: { expect: 'counterexample' } }, outcomes: { [cmd]: b.caught ? 'counterexample' : 'no counterexample' },
        reach: { text: 'for 3', scope: 'for 3', values: { scope: 3 } }, snapshot: r.chart(at).snapshot, ...verdict(`${cmd}: expected counterexample, got no counterexample`),
      };
      text = call([module], `${cmd}: counterexample`);
    }
    if (b.earlier) result.snapshot = { ...result.snapshot, passages: { ...result.snapshot.passages, [b.on]: 'earlier' } };
    return { kind: 'blunder', call: text, result };
  };

  // A step's trial, as the runner leaves it, on the case's root: the i-th step of a sequence.
  const runStep = (c: Case, step: string, tier: string, i: number) => {
    const { kind, call, result } = stepOf(c, step, tier, stamp(`09${pad(i)}`), i);
    return c.trial(join(c.root, 'parts', tier), `2026-11-03-09${pad(i)}-${kind}-${(i + 1).toString(16).padStart(6, '0')}`, { call, result });
  };
  // A1 and A2 once the steps ran in order, in the part of that tier on a copy of the stage of
  // its own, as verify marks them.
  const marksAfter = (t: TestContext, tier: string, steps: string[]): Record<string, string> => {
    const c = caseOf(copyStage(t, blank));
    steps.forEach((step, i) => assert.equal(runStep(c, step, tier, i).action, 'published', `${step}: each step asks a question of its own`));
    const a = analyzePart({ root: c.root, id: tier, knowledge: nullKnowledge(), pluginVersion: VERSION, marker: { plugin: VERSION }, actors: readActors(c.root) });
    return Object.fromEntries(IDS.map(id => [id, a.marks[id].mark]));
  };

  // A1 and A2 of a composition once its blunders ran in order, each naming its property under property:.
  const composition = { prose: { properties: IDS.map(id => ({ id, scenarios: null })) }, wiring: { scenarios: [] }, actors: { scenarioById: { 'all-honest': { id: 'all-honest', strongerThan: [] } } } } as unknown as Pick<CompositionLoad, 'prose' | 'wiring' | 'actors'>;
  const heldAfter = (steps: string[]): Record<string, string> => cellsOf({
    composition, risks: {}, snapshotNow: stubPresent({ passages: { A1: 'now', A2: 'now' } }),
    completed: steps.map((step, i) => {
      const b = blunderOf(step);
      if (!b) throw new Error(`a composition step is a blunder, not "${step}"`);
      const name = b.checker === 'apalache' ? `Inv_${b.on}` : b.on;
      return compositionAnswer({ trial: `2026-11-03-09${pad(i)}-blunder-a1a1a1`, kind: 'blunder', checker: b.checker, property: b.on, result: b.caught ? 'as-called' : 'miscalled', outcomes: { [name]: b.caught ? 'violated' : 'holds' }, snapshot: { passages: { A1: 'now', A2: 'now', [b.on]: b.earlier ? 'then' : 'now' } } });
    }),
  }).propertyHeld;
  const stateAfter = (t: TestContext, where: string, steps: string[]) => (where === 'composition' ? heldAfter(steps) : marksAfter(t, where, steps));

  before(() => {
    const { root, write } = makeRoot('dossier-blunders-');
    write('parts/charted/prose.md', TIMELOCK.replace('Tier: modeled', 'Tier: charted'));
    write('parts/modeled/prose.md', TIMELOCK);
    write('parts/modeled/model/Timelock.tla', TIMELOCK_TLA);
    write('parts/modeled/model/Timelock.cfg', 'SPECIFICATION Spec\nINVARIANTS TypeOK A1 A2\n');
    blank = root;
  });
  after(() => rmSync(blank, { recursive: true, force: true }));

  const rows: [string, string[], Record<string, string>][] = [
    ['charted', ['chart', 'chart blunder on A1, caught'], { A1: 'checked', A2: 'held' }],
    ['charted', ['chart', 'chart blunder on A1, caught', 'chart blunder on A2, caught'], { A1: 'checked', A2: 'checked' }],
    ['charted', ['chart', 'chart blunder on A1, caught', 'chart blunder on A2, not caught'], { A1: 'checked', A2: 'hollow' }],
    ['charted', ['chart', 'chart blunder on A2, not caught', 'chart blunder on A1, caught'], { A1: 'checked', A2: 'hollow' }],
    ['charted', ['chart', 'chart blunder on A1, not caught', 'chart blunder on A1, caught', 'chart blunder on A2, not caught'], { A1: 'checked', A2: 'hollow' }],
    ['charted', ['chart', 'chart blunder on A1, caught', 'chart blunder on A1, not caught', 'chart blunder on A2, caught'], { A1: 'hollow', A2: 'checked' }],
    ['charted', ['chart', 'chart blunder on A1, caught at earlier words', 'chart blunder on A2, caught'], { A1: 'held', A2: 'checked' }],
    ['charted', ['chart', 'chart blunder on A1, caught', 'chart blunder on A1, not caught at earlier words'], { A1: 'checked', A2: 'held' }],
    ['charted', ['chart with A1 failing', 'chart blunder on A2, caught'], { A1: 'miscalled', A2: 'checked' }],
    ['modeled', ['chart', 'tlc', 'tlc blunder on A1, caught'], { A1: 'checked', A2: 'held' }],
    // In a modeled piece only the model's blunder counts, so a chart blunder leaves A2 held.
    ['modeled', ['chart', 'tlc', 'tlc blunder on A1, caught', 'chart blunder on A2, caught'], { A1: 'checked', A2: 'held' }],
    // A chart blunder that misses there is a call that did not come back as called, not a hollow model.
    ['modeled', ['chart', 'tlc', 'chart blunder on A2, not caught'], { A1: 'held', A2: 'miscalled' }],
    ['modeled', ['chart', 'tlc', 'tlc blunder on A1, caught', 'tlc blunder on A2, not caught'], { A1: 'checked', A2: 'hollow' }],
    ['modeled', ['chart', 'tlc', 'tlc blunder on A2, not caught', 'tlc blunder on A1, caught'], { A1: 'checked', A2: 'hollow' }],
    ['modeled', ['chart', 'tlc', 'apalache blunder on A1, caught', 'alloy blunder on A2, not caught'], { A1: 'checked', A2: 'hollow' }],
    ['modeled', ['chart', 'tlc', 'alloy blunder on A1, not caught', 'apalache blunder on A2, caught'], { A1: 'hollow', A2: 'checked' }],
    ['modeled', ['chart', 'tlc', 'tlc blunder on A1, caught at earlier words', 'tlc blunder on A2, caught'], { A1: 'held', A2: 'checked' }],
    ['composition', ['tlc blunder on A1, caught'], { A1: 'caught', A2: 'held' }],
    ['composition', ['tlc blunder on A1, caught', 'tlc blunder on A2, not caught'], { A1: 'caught', A2: 'hollow' }],
    ['composition', ['tlc blunder on A2, not caught', 'apalache blunder on A1, caught'], { A1: 'caught', A2: 'hollow' }],
    ['composition', ['tlc blunder on A1, caught', 'tlc blunder on A1, not caught', 'apalache blunder on A2, caught'], { A1: 'hollow', A2: 'caught' }],
    ['composition', ['tlc blunder on A1, caught at earlier words', 'tlc blunder on A2, caught'], { A1: 'held', A2: 'caught' }],
  ];
  for (const [where, steps, expected] of rows) {
    it(`${where}: ${steps.join(' > ')}`, t => {
      const whole = stateAfter(t, where, steps);
      assert.deepEqual(Object.fromEntries(Object.keys(expected).map(id => [id, whole[id]])), expected);
      for (const id of IDS) {
        const own = steps.filter(step => { const b = blunderOf(step); return !b || b.on === id; });
        if (own.length < steps.length) assert.equal(stateAfter(t, where, own)[id], whole[id], `${id} moved with a blunder aimed at another property`);
      }
    });
  }

  // A chart blunder's machine is authored, like a model blunder's copy: once it is gone, so is its
  // question, and a catch it showed counts no more.
  it('counts no catch from a chart blunder whose machine is gone', t => {
    const c = caseOf(copyStage(t, blank)), machine = join(c.root, 'parts', 'charted', 'chart', 'blunders', 'A1-1.json');
    const analyze = (root: string) => analyzePart({ root, id: 'charted', knowledge: nullKnowledge(), pluginVersion: VERSION, marker: { plugin: VERSION }, actors: readActors(root) });
    const published = ['chart', 'chart blunder on A1, caught'].map((step, i) => runStep(c, step, 'charted', i));
    assert.equal(analyze(c.root).marks.A1.mark, 'checked');
    rmSync(machine);
    const a = analyze(c.root);
    assert.equal(a.marks.A1.mark, 'held', 'the catch went with the machine');
    assert.deepEqual(a.flags.filter(f => f.name === 'question gone'), [{ name: 'question gone', entry: published[1].name, where: `evidence/${published[1].name}.json: chart/blunders/A1-1.json is gone; the next publication removes it` }]);
    assert.deepEqual(analyze(blank).answerRows, [], 'the stage the case copied is as it was built');
  });
});
