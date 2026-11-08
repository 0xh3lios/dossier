// Rebuilds Harbor from the fixture's authored seed in an isolated output: draws every
// component, scaffolds the models, writes the blunders through dossier blunder and the calls through
// dossier call, so that every call the tool writes is tried by the runner, runs every trial
// through the runner, which publishes each answer to evidence/, writes the readings beside the
// answers and the decisions, renders the views, verifies, and writes observed-marks.json for
// review. With --install, and only when verify passes and the observed marks equal
// qualification/fixture/expected-marks.json, the output's dossiers/ replaces the fixture's, without
// the local trial bundles, which Harbor does not commit. Nothing else ever writes to
// qualification/fixture.
// Needs the toolchain (JAVA, TLA_TOOLS, ALLOY_JAR, APALACHE); see .local/toolchain/env.sh.
//   node qualification/rebuild-fixture.mjs --out /tmp/harbor-current [--install]
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync, readdirSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { randomUUID } from 'node:crypto';
import { basename, join, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const plugin = dirname(dirname(fileURLToPath(import.meta.url)));
const fixture = join(plugin, 'qualification', 'fixture');
const bin = join(plugin, 'bin', 'dossier');
const components = ['vault', 'adapter', 'token', 'timelock', 'breaker', 'oracle'];
const systems = ['supply', 'control', 'upkeep'];
const write = (path, text) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text); };

function statIfPresent(path) {
  try { return lstatSync(path); } catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
function physicalPath(path) {
  let parent = resolve(path);
  const suffix = [];
  while (!statIfPresent(parent)) { suffix.unshift(basename(parent)); parent = dirname(parent); }
  return join(realpathSync(parent), ...suffix);
}
// The fixture's authored seed: ordinary files and folders only, and no publication left unfinished.
function isolatedTree(path) {
  const stat = lstatSync(path);
  if (stat.isSymbolicLink() || (!stat.isDirectory() && !stat.isFile())) throw new Error(`the seed must contain only ordinary files and directories: ${path}`);
  if (stat.isDirectory()) for (const name of readdirSync(path)) {
    if (['.publication-lock', '.running'].includes(name) || name.startsWith('.initializing-')) throw new Error(`unfinished publication needs explicit recovery before rebuilding: ${join(path, name)}`);
    isolatedTree(join(path, name));
  }
}

// This is fresh authored initialization, never a reconstruction of missing authority. The output
// is a new or empty folder: a rebuild asks every question afresh, and `dossier recheck` is how an
// existing output's answers are confirmed. All path and layout refusals happen before the first write.
export function prepareFixture({ out } = {}) {
  if (typeof out !== 'string' || !out.trim()) throw new Error('an explicit --out <isolated directory> is required');
  const output = physicalPath(out), source = realpathSync(plugin);
  const within = (path, base) => path === base || path.startsWith(base + sep);
  if (within(output, source) || within(source, output)) throw new Error('--out must be outside the plugin tree and cannot be its ancestor or alias');
  const existing = statIfPresent(resolve(out));
  if (existing && (!existing.isDirectory() || existing.isSymbolicLink())) throw new Error('--out must be an ordinary isolated directory, not a file or symlink');
  const root = join(output, 'dossiers');
  if (existing && readdirSync(output).length) throw new Error('--out must be a new or empty folder; recheck an existing output instead of rebuilding into it');

  const seed = ['knowledge', 'protocol', 'tools', 'dossiers/actors', 'dossiers/README.md'];
  for (const [kind, ids] of [['components', components], ['systems', systems]]) for (const id of ids) {
    seed.push(`dossiers/${kind}/${id}/prose.md`);
    if (kind === 'systems') seed.push(`dossiers/${kind}/${id}/composition.md`);
    for (const name of ['doubts.md', 'margin.md']) if (existsSync(join(fixture, 'dossiers', kind, id, name))) seed.push(`dossiers/${kind}/${id}/${name}`);
  }
  for (const path of seed) isolatedTree(join(fixture, path));
  const marker = JSON.parse(readFileSync(join(fixture, 'dossiers/dossier.json'), 'utf8'));
  marker.storage = 'integrity-v1';
  // The marker names the plugin that rebuilt the fixture, as setup would, never the one that built the last.
  marker.plugin = JSON.parse(readFileSync(join(plugin, 'package.json'), 'utf8')).version;
  for (const path of seed) { mkdirSync(dirname(join(output, path)), { recursive: true }); cpSync(join(fixture, path), join(output, path), { recursive: true, preserveTimestamps: true }); }
  for (const [kind, ids] of [['components', components], ['systems', systems]]) for (const id of ids) {
    write(join(root, kind, id, 'integrity.json'), JSON.stringify({ schema: 1, evidence: {}, decisionHead: null }, null, 2) + '\n');
  }
  // Commit the root format last: all visible dossiers start with empty authority.
  write(join(root, 'dossier.json'), JSON.stringify(marker, null, 2) + '\n');
  return { output, root };
}
// Routine readings retain the scope judgment and the mechanism being checked,
// not merely a second copy of the outcome. Unexpected observations, witnesses
// and deliberate faults always need their own authored interpretation.
export function ordinaryReading(result) {
  if (result.result !== 'as-called' || result.kind === 'blunder' || result.walk || result.partial?.length ||
      !Object.values(result.outcomes).every(outcome => ['holds', 'pass'].includes(outcome))) {
    throw new Error('a nonroutine observation needs an authored reading');
  }
  // These are review anchors, not generated goldens. If authored passages
  // change, review the corresponding interpretation before updating its anchor.
  const reviewedPassages = {
    'components/adapter': '1515d02be7a705a745009959d894cac6f1b75e1a697a5c02cb47295e402667b4',
    'components/breaker': '115d0b6a1af821a6d21f372d0ee8aff2225fa288bca0598b76af60b49f011b8f',
    'components/oracle': '2b9e48459a52ea3dd4f35a8dda3588249df0cb2ff0a78434d442c763db1df4fd',
    'components/timelock': 'a1cb53ca57edb14175f0cbf31a7e845aea7f37bbb4cb250d1ba0bc7cf25e6e40',
    'components/token': '23759e76d0cc2569e491a0db2f45fbe522af681c141e6526113f86c930ce0824',
    'components/vault': '99310772fe6973d4edcf3ff7dab4ac6ceca7a7ee2d7f27b4fee83c559ff9bbe5',
    'systems/control': 'a31edd8f28c9685d2c91c7185b0d58c200c925214e4b1fe226ec593a01152d8b',
    'systems/supply': '38e42430bddbbefa9e103e4f7818fe9f8c5f14e58c0530e6f09fc1ee29130c31',
    'systems/upkeep': '57432ec9dea2c2fb3538234cfc23ba5447a80471e374c860768e78cf03a9dbae',
  };
  const identity = createHash('sha256').update(JSON.stringify(Object.entries(result.snapshot.passages).sort())).digest('hex');
  if (identity !== reviewedPassages[result.dossier]) throw new Error('changed passages need a reviewed interpretation');
  const component = result.dossier.replace(/^components\//, '');
  const componentMeaning = {
    vault: 'Borrow and repay change debt and credit together, move and release transfer credit between free and issued, and borrow respects the ceiling. This abstraction omits governance lowering the ceiling; a successful check does not resolve the rejected K4.',
    adapter: 'Halt enters Halted and clears live; entries can continue while exits are refused. The component alone does not establish that its Vault and Token effects are delivered together.',
    token: 'Mint is limited by the cap and burn lowers supply. Transfers leave supply unchanged. The component does not establish that minting is backed by credit in another module.',
    timelock: 'Execution requires remaining = 0 and only execution records early. Deadline and eventual-execution claims additionally depend on the prompt executor and ticking chain; the guard alone establishes neither.',
    breaker: 'The one successful stop moves Armed to Spent and sets halted. A second stop is refused by this abstraction; this result does not reconcile the knowledge record describing an idempotent repeated stop.',
    oracle: 'A post enters Fresh with stale = 0 and records the previous price in last. The price band depends on the lanes\' only-when assumptions, and freshness depends on a prompt lane. Neither assumption is a property of an arbitrary deployed keeper.',
  };
  const systemMeaning = {
    'systems/control': {
      A1: 'The property checks that timelock.early stays false. It does not establish that every possible governance change is delayed; the encoded plan and Vault change are narrower than that claim.',
      A2: 'The property checks that a halted Breaker implies a Halted Adapter. The composed step delivers the wired halt together with stop; runtime transaction coupling still requires grounding.',
      O1: 'The property checks eventual return to Idle after Scheduled under the encoded fairness assumptions. Those assumptions and the modeled free Vault sends require separate justification.',
      N1: 'The property checks the encoded deadline counter under this scenario. A prompt executor prevents a tick while execution is due; this result cannot be transferred to executor-offline or used to prove that the owner\'s intended real-time deadline has the same endpoint.',
    },
    'systems/supply': {
      A1: 'The property is Vault conservation: debt equals free plus issued. Each modeled operation preserves that equation; it says nothing about prices or collateral.',
      A2: 'The property equates Token supply with Vault issued credit. Wiring credits and mints, or releases and burns, in the same modeled step; the proof relies on that transaction abstraction. The strengthened invariant also carries Vault conservation.',
      A3: 'The property equates Adapter held credit with Token supply. Wiring changes the two together. The strengthened invariant also carries Vault conservation; it does not model who holds the tokens.',
    },
    'systems/upkeep': {
      A1: 'The price band follows the honest lanes\' only-when constraints. An arbitrary or captured lane is outside this successful scenario and may post a price outside the band.',
      N1: ({
        'all-honest': 'Both lanes are available and prompt; either can refresh a stale price before the next eligible tick.',
        'lane-a-offline': 'Lane B remains available and prompt while lane A is offline; the result depends on B\'s assumption.',
        'lanes-down-one': 'Both lanes are offline only while the clock is below 1. The first tick ends that window and a prompt lane can refresh before another tick; this does not cover a two-tick outage.',
        'stale-start': 'The price begins three blocks stale with both lanes available. Promptness requires refresh before the next tick; passing the relative deadline does not mean the starting price was fresh.',
      })[result.scenario],
    },
  };
  const meaning = componentMeaning[component] ?? systemMeaning[result.dossier]?.[result.property];
  if (!meaning) throw new Error(`no reviewed interpretation for ${result.dossier} ${result.property ?? result.kind} ${result.scenario ?? ''}`);
  const observed = Object.entries(result.outcomes).map(([id, outcome]) => `${id}: ${outcome}`).join('; ');
  let limit;
  if (result.kind === 'chart') {
    limit = 'The finite chart checks its supported state/event rules and walks. It supplies no induction, temporal/Given proof, transaction replay or deployment evidence.';
  } else if (result.kind === 'tlc') {
    limit = 'TLC checked the recorded finite model and configuration. This is bounded evidence, not an inductive proof or a claim that the deployed contracts implement the abstraction.';
  } else if (result.kind === 'apalache' && result.mode === 'inductive') {
    if (!['base', 'step'].every(label => result.runs?.some(run => run.label === label && run.outcome === 'NoError' && run.exitcode === 0))) {
      throw new Error('an inductive reading requires successful base and step observations');
    }
    limit = 'Both stored base and step checks pass for the named invariant under the recorded constant initialization and TypeOK restrictions. This is induction over that model, not an unbounded claim about every deployment or unrelated property.';
  } else if (result.kind === 'external' && result.dossier === 'components/token') {
    if (result.evidence?.W1?.end?.state !== 'Live' || result.evidence?.W1?.end?.supply !== 0 || result.evidence?.W1?.problems?.length) {
      throw new Error('the Token replay observation no longer matches its reviewed interpretation');
    }
    limit = 'The stored stand-in replay of W1 ends Live with supply 0 and no reported problems. The stand-in is local test code, not an independent replay of a deployed chain; only the recorded walk is grounded against it.';
  } else throw new Error('this checker/mode needs an authored reading');
  const warnings = result.warnings?.length ? `\n\nChecker warnings:\n${result.warnings.map(warning => `- ${warning}`).join('\n')}\n\nIn particular, a state-constrained liveness run must not be generalized to unconstrained behavior.` : '';
  return `Observed: ${observed}.\n\nScope: ${result.reach.text}.${result.scenario ? ` Scenario: ${result.scenario}.` : ''} Recorded values: ${JSON.stringify(result.reach.values ?? {})}.\n\n${meaning}\n\n${limit}${warnings}\n\nThis reading interprets this answer; current freshness, coverage and owner acceptance remain the verifier's separate judgments.\n`;
}

export function recordReading(path, result, output, authored = null) {
  const text = authored === null ? ordinaryReading(result) : typeof authored === 'function' ? authored(result, output) : authored;
  if (!text?.trim()) throw new Error('every completed fixture trial\'s answer needs a nonempty reading');
  write(path, text);
}
// Retell the observation that was actually stored. Solver witnesses are not
// stable across versions, so never keep invented numeric details in a reading.
const controlInductionReading = result => {
  const states = result.trace?.states;
  if (!states || states.length !== 2) throw new Error('control induction needs its two-state counterexample');
  const value = (state, name) => Number(state[name]['#bigint']);
  const columns = ['vault_debt', 'vault_free', 'vault_issued'];
  const rows = states.map((state, i) => `| ${i + 1} | ${columns.map(name => value(state, name)).join(' | ')} |`);
  if (value(states[0], 'vault_debt') === value(states[0], 'vault_free') + value(states[0], 'vault_issued')) throw new Error('the counterexample no longer demonstrates the missing conservation premise');
  return `retelling: The stored induction counterexample has these Vault values:\n\n| State | debt | free | issued |\n| --- | --- | --- | --- |\n${rows.join('\n')}\n\nThe first state satisfies the proposed induction premise but violates the Vault's conservation relation. The step leaves TypeOK. This is an arbitrary induction state, not a reachable execution from Init.\nclassification: call was wrong\nThe call predicted TypeOK and A1 inductive on their own. Inv_A1_lemma in extras.tla adds the Vault's conservation, and the cell is tried again.\n`;
};
export function controlUnfairReading(result, output) {
  if (result.result !== 'as-called' || result.dossier !== 'systems/control' || result.property !== 'O1' || result.outcomes.O1 !== 'violated') throw new Error('control liveness needs its recorded O1 violation');
  const stutters = [...output.matchAll(/^(\d+): Stuttering[ \t]*$/gm)];
  const toolBacks = [...output.matchAll(/^(\d+): Back to state: <[^>\r\n]+>[ \t]*$/gm)];
  const textBacks = [...output.matchAll(/^(\d+): Back to state (\d+)(?:[ \t].*)?$/gm)];
  if (!Array.isArray(result.trace) || stutters.length + toolBacks.length + textBacks.length !== 1) throw new Error('control liveness needs exactly one recorded loop closure');
  const states = result.trace.filter(step => step.values);
  if (!states.length || states.some((step, index) => step.index !== index + 1)) throw new Error('control liveness needs its complete recorded state sequence');
  const final = states.at(-1), marker = result.trace.at(-1);
  let loop, closing, behavior;
  if (stutters.length) {
    closing = stutters[0];
    if (Number(closing[1]) !== final.index + 1 || !marker.stuttering || marker.index !== Number(closing[1])) throw new Error('the stuttering closure does not match the recorded final state');
    loop = [final];
    behavior = `State ${final.index} repeats indefinitely: this is full-state stuttering, with the Timelock scheduled and ready.`;
  } else {
    closing = toolBacks[0] ?? textBacks[0];
    // Tool frames put the target before the colon; plain output puts it after
    // "Back to state". Older stored traces omit the tool-frame marker entirely.
    const target = Number(toolBacks.length ? closing[1] : closing[2]);
    if (!states.some(step => step.index === target) || (textBacks.length && Number(closing[1]) !== final.index + 1)) throw new Error('the loop target is not a recorded state');
    loop = states.filter(step => step.index >= target);
    const different = loop.some(step => Object.keys(final.values).some(name => step.values[name] !== final.values[name]));
    behavior = `The loop returns to state ${target} and keeps the Timelock scheduled and ready.${different ? ' Other recorded values change within the loop; this is not full-state stuttering.' : ''}`;
  }
  if (loop.some(step => step.values.timelock_state !== '"Scheduled"' || step.values.timelock_remaining !== '0')) throw new Error('the liveness counterexample no longer waits with a ready plan');
  const columns = ['timelock_state', 'timelock_remaining', 'vault_free', 'vault_issued'];
  const rows = states.map(step => `| ${step.index} | ${step.action} | ${columns.map(name => step.values[name]).join(' | ')} |`);
  const warnings = result.warnings?.length ? `\nChecker warnings:\n${result.warnings.map(warning => `- ${warning}`).join('\n')}\nA state-constrained liveness run must not be generalized to unconstrained behavior.\n` : '';
  return `retelling: The stored counterexample takes these steps. Action labels are TLC's labels; state 1 is the initial state.\n\n| State | Action | Timelock | Remaining | Vault free | Vault issued |\n| --- | --- | --- | --- | --- | --- |\n${rows.join('\n')}\n\nThe output closes the loop with: ${closing[0]}\n\n${behavior} Removing the executor's fairness lets the plan remain unresolved; O1 fails. The control composition leaves the Vault sends free, so this path is evidence about that abstraction, not a replay of complete transactions.\n${warnings}`;
}

function rebuildFixture(options) {
for (const t of ['JAVA', 'TLA_TOOLS', 'ALLOY_JAR', 'APALACHE']) if (!process.env[t]) throw new Error(`${t} is not set; source .local/toolchain/env.sh`);
const { output, root } = prepareFixture(options);
const comp = id => join(root, 'components', id), sys = id => join(root, 'systems', id);
const run = (args, { ok = [0], quiet = false } = {}) => {
  const r = spawnSync(bin, [...args, '--root', root], { cwd: output, encoding: 'utf8', env: process.env, maxBuffer: 64 * 1024 * 1024 });
  if (!quiet) console.log(`$ dossier ${args.join(' ')}\n${(r.stdout || '').trim()}${(r.stderr || '').trim() ? '\n' + r.stderr.trim() : ''}`);
  if (r.error) throw r.error;
  if (!ok.includes(r.status)) throw new Error(`dossier ${args.join(' ')} exited ${r.status}`);
  return r;
};
const trial = (name, callName, { expectExit = 0, read = null } = {}) => {
  const dossier = name.startsWith('systems/') ? sys(name.split('/')[1]) : comp(name);
  const trials = join(dossier, 'trials');
  const before = new Set(existsSync(trials) ? readdirSync(trials) : []);
  const r = run(['trial', name, `${callName}.md`], { ok: [0, 1, 3] });
  if (r.status !== expectExit) throw new Error(`trial ${name} ${callName} exited ${r.status}, expected ${expectExit}`);
  const added = readdirSync(trials).filter(id => !before.has(id));
  if (added.length !== 1) throw new Error(`trial ${name} ${callName} did not shelve exactly one new bundle`);
  const dir = join(trials, added[0]);
  // The runner says where the answer went; every fixture trial publishes one.
  const published = (r.stdout || '').match(/^answer: (evidence\/[^\s]+)\.json · (?:published|replaced the recorded answer)$/m);
  if (!published) throw new Error(`trial ${name} ${callName} published no answer`);
  const result = JSON.parse(readFileSync(join(dir, 'result.json'), 'utf8'));
  recordReading(join(dossier, `${published[1]}.md`), result, readFileSync(join(dir, 'output.txt'), 'utf8'), read);
  return published[1].slice('evidence/'.length);
};
// The owner's forget of a surviving answer: the entry by name, at the first eight hex of the digest the
// manifest binds. A superseded answer that holds a counterexample waits for it (ANSWER-DROP).
const forget = (name, entry, words) => {
  const dossier = name.startsWith('systems/') ? sys(name.split('/')[1]) : comp(name);
  const bound = JSON.parse(readFileSync(join(dossier, 'integrity.json'), 'utf8')).evidence[entry];
  if (!bound) throw new Error(`${name}/evidence/${entry}.json is not bound`);
  run(['decide', name, 'forget', `${entry}@${bound.slice(0, 8)}`, '--', words]);
};

// Every call and every blunder copy is written by the tool: dossier call writes what identifies the
// question, and the prediction, the reach, the outcomes and the reason, goes in as options. A command
// that leaves a line empty would leave a call the runner refuses, so the rebuild stops there.
const filled = (r, what) => { if (/^still empty: /m.test(r.stdout || '')) throw new Error(`${what} left lines empty:\n${r.stdout}`); };
const ask = (name, callName, kind, target, { expect = {}, ...lines } = {}) => {
  const args = ['call', name, callName, kind, ...(target ? [target] : [])];
  for (const [key, value] of Object.entries(lines)) if (value != null) args.push(`--${key}`, String(value));
  for (const [key, value] of Object.entries(expect)) args.push('--expect', `${key}: ${value}`);
  filled(run([...args, '--force']), `dossier call ${name} ${callName}`);
};
// A blunder: dossier blunder copies the module, applies the one replacement (each place, with all),
// writes the configuration that enables the property alone and the call blunder-<copy>.
const BLUNDER_BECAUSE = 'With the wrong in place the property fails on a short path; the property is not hollow.';
const blunder = (name, copy, from, to, property, reach, wrong, { all = false, scenario = null, base = null, because = BLUNDER_BECAUSE } = {}) => {
  const args = ['blunder', name, copy, '--replace', from, '--with', to, '--wrong', wrong, '--reach', reach, '--because', because];
  if (property) args.push('--property', property);
  if (scenario) args.push('--scenario', scenario);
  if (base) args.push('--base', base);
  if (all) args.push('--all');
  filled(run([...args, '--force']), `dossier blunder ${name} ${copy}`);
};
const CHART_BECAUSE = 'Every state is reachable, every move and refusal replays as said, every walk ends as said, no pair is unsaid.';
const chartCall = (id, reach) => ask(id, 'chart', 'chart', null, { reach, expect: { checks: 'pass' }, because: CHART_BECAUSE });
const tlcCall = (id, name, target, reach, expect, because) => ask(id, name, 'tlc', target, { reach, expect, because });
const witnessCall = (id, walk, reach, data, trace, because) => ask(id, `witness-${walk.toLowerCase()}`, 'tlc', walk, { reach, 'trace-data': data, expect: { TypeOK: 'holds', [`Not${walk}`]: `violated; trace: ${trace}` }, because });
const apalacheCall = (id, name, property, reach, because) => ask(id, name, 'apalache', property, { reach, expect: { [`Inv_${property}`]: 'holds' }, because });
const replayCall = (id, reach, walks, because) => ask(id, 'replay', 'external', null, { runner: 'replay', reach, expect: Object.fromEntries(walks.map(w => [w, 'pass'])), because });

// 2. Draw and scaffold every component.
for (const id of ['vault', 'adapter', 'token', 'timelock', 'breaker', 'oracle']) { run(['draw', id, '--brief']); run(['scaffold', id]); }

// 3. Hand refinements: the Breaker's structure in Alloy.
write(join(comp('breaker'), 'model', 'Breaker.als'), `// Structure of the Breaker's authority. The behavior lives in Breaker.tla.
abstract sig Actor {}
sig Governance extends Actor {}
sig Breaker extends Actor { authority: one Governance }       // K1: a breaker answers to Governance
sig Other extends Actor {}
sig Halt { by: one Actor }                         // a halt the Adapter received
fact X1_halt_by_breaker { all h: Halt | h.by in Breaker }  // X1: halt crosses from Breaker to Adapter
fact K1_breaker_authority { all m: Breaker | m.authority in Governance }
assert A2_halts_from_governance { all h: Halt | h.by in Breaker and h.by.authority in Governance }   // A2
check A2_halts_from_governance for 4                      // reach: 4
`);

// 4. Blunders on the component models, each with its call.
blunder('vault', 'lostfree', "    /\\ free' = (free + amount)\n    /\\ UNCHANGED <<issued, ceiling>>", "    /\\ UNCHANGED <<free, issued, ceiling>>", 'A1', 'amounts up to 2', 'borrow raises debt without crediting free');
blunder('vault', 'noceiling', "    /\\ ((debt + amount) <= ceiling)\n", "", 'A2', 'amounts up to 2', 'borrow ignores the ceiling');
blunder('adapter', 'stilllive', "  /\\ live' = FALSE\n", "  /\\ live' = live\n", 'A1', 'amounts up to 2', 'halt no longer clears live');
blunder('token', 'uncapped', "    /\\ ((supply + amount) <= 4)\n", "", 'A1', 'amounts up to 2', 'mint ignores the cap');
blunder('timelock', 'early', "  /\\ (remaining = 0)\n  /\\ state' = \"Idle\"", "  /\\ state' = \"Idle\"", 'A1', 'one plan; delay 2', 'execute no longer waits for the delay');
blunder('timelock', 'impatient', "  /\\ ~Due_Public                      \\* G1\n", "", 'N1', 'one plan; delay 2', 'the chain ticks even while an execute is due', { all: true });
blunder('breaker', 'unhalted', "  /\\ halted' = TRUE\n", "  /\\ halted' = halted\n", 'A1', 'one breaker', 'stop enters Spent without setting halted');
blunder('timelock', 'unfair', "        /\\ WF_vars(Public_Execute)                        \\* from G1\n", "", 'O1', 'one plan; delay 2', 'the executor is no longer fair');
blunder('oracle', 'unrefreshed', "    /\\ state' = \"Fresh\"\n    /\\ stale' = 0\n", "    /\\ state' = \"Fresh\"\n    /\\ stale' = 1\n", 'A1', 'stale up to 3', 'a post enters Fresh with stale 1', { all: true });
blunder('oracle', 'idlelanes', "  /\\ ~Due_LaneA                      \\* G1\n  /\\ ~Due_LaneB                      \\* G2\n", "", 'N1', 'stale up to 3', 'the chain ticks while a post is due', { all: true });
// The only-when conditions of G3 and G4 become comments, each line where it stood.
blunder('oracle', 'jumpy', "/\\ (((value + 1) >= price) /\\ (value <= (price + 1)))   \\*", "\\*", 'A2', 'stale up to 3; price up to 4', 'a post may post any price', { all: true });
// The Alloy blunder: the seam no longer says who sends halts.
blunder('breaker', 'rogue', "fact X1_halt_by_breaker { all h: Halt | h.by in Breaker }  // X1: halt crosses from Breaker to Adapter\n", "", null, 'scope 4', 'the seam no longer says halts come from Breakers', { base: 'Breaker.als', because: 'An Other may send a halt, and the assert finds it.' });

// 5. Calls and trials, component by component.

// vault
chartCall('vault', 'the chart over debt, free, issued 0..4 and ceiling 2..4');
tlcCall('vault', 'ordinary', null, 'amounts up to 2; debt, free, issued up to 4; ceiling 2..4', { TypeOK: 'holds', A1: 'holds', A2: 'holds' }, 'A1: every move changes free and issued by the same amount debt changes, or moves credit between them. A2: borrow is guarded by the ceiling and change only raises it.');
witnessCall('vault', 'W1', 'amounts up to 2', 'debt free', 'Open/0/0 > Open/2/2 > Open/1/1', 'W1 borrows 2 and repays 1: M1 then M2.');
apalacheCall('vault', 'inductive-a1', 'A1', 'unbounded; TypeOK and A1 inductive', 'Every action adds or removes the same amount on both sides of the equation.');
apalacheCall('vault', 'inductive-a2', 'A2', 'unbounded; TypeOK and A2 inductive', 'borrow is guarded by the ceiling, repay lowers debt, change raises the ceiling.');
replayCall('vault', 'the stand-in deployment, each walk replayed from a fresh Vault', ['W1', 'W2', 'W3'], 'The stand-in applies the same arithmetic the prose states.');
trial('vault', 'chart');
trial('vault', 'inductive-a2', { expectExit: 1, read: 'retelling: Apalache finds a state with free 4 and debt 0 that satisfies TypeOK and A2, from which borrow 1 takes free to 5, outside TypeOK. The state is unreachable: A1 bounds free by debt. The invariant is true but not inductive on its own.\nclassification: call was wrong\nThe call predicted that TypeOK and A2 were inductive; they need A1 as a lemma. Inv_A2 is strengthened to TypeOK, A1 and A2 in the module, keeping its name, and tried again.\n' });
write(join(comp('vault'), 'model', 'Vault.tla'), readFileSync(join(comp('vault'), 'model', 'Vault.tla'), 'utf8').replace('Inv_A2 == TypeOK /\\ A2', 'Inv_A2 == TypeOK /\\ A1 /\\ A2   \\* strengthened: A1 bounds free by debt'));
// Current covers execute the refined module; editing it after a trial lapses that trial's answer.
trial('vault', 'ordinary');
trial('vault', 'witness-w1', { read: 'retelling: Open/0/0 --borrow 2--> Open/2/2 (M1) --repay 1--> Open/1/1 (M2). The trace is W1 step for step.\ncovers: W1 by the matched trace.\n' });
trial('vault', 'inductive-a1', { read: 'Inv_A1 is TypeOK and A1. Apalache shows Init satisfies it and every step preserves it, with amounts unbounded above by the declared ranges only through TypeOK.\n' });
apalacheCall('vault', 'inductive-a2-strengthened', 'A2', 'unbounded; TypeOK, A1 and A2 inductive', 'With A1 in the invariant, free is at most debt, so a borrow keeps free within TypeOK while the ceiling guards debt.');
trial('vault', 'inductive-a2-strengthened', { read: 'Inv_A2 now carries A1 as a lemma. The step and the base both pass; the entry keeps the earlier miscall as its previous answer.\n' });
trial('vault', 'blunder-lostfree', { read: 'blunder: borrow raises debt and leaves free alone. After one borrow of 1, debt is 1 and free plus issued is 0; A1 fails. A1 is not hollow: it is tied to every move that touches debt.\n' });
trial('vault', 'blunder-noceiling', { read: 'blunder: the ceiling no longer guards borrow. Two borrows of 2 reach debt 4 against ceiling 2; A2 fails.\n' });
trial('vault', 'replay', { read: 'grounded: W1, W2 and W3 replayed on the stand-in deployment end where the prose says, with the refused step reverting.\n' });

// adapter
chartCall('adapter', 'the chart over held 0..4');
tlcCall('adapter', 'ordinary', null, 'amounts up to 2; held up to 4', { TypeOK: 'holds', A1: 'holds' }, 'Only halt enters Halted and it clears live; nothing sets live again.');
witnessCall('adapter', 'W1', 'amounts up to 2', 'held', 'Open/0 > Open/2 > Open/0', 'W1 exits 2 and enters 2: M1 then M2, with move, mint and burn sent once each.');
replayCall('adapter', 'the stand-in deployment', ['W1', 'W2'], "The stand-in's adapter calls the vault and the token the way the wiring says.");
trial('adapter', 'chart');
trial('adapter', 'ordinary');
witnessCall('adapter', 'W2', 'amounts up to 2; held up to 4', 'held', 'Open/0 > Open/1 > Halted/1 > Halted/0', 'W2 exits 1, halts, refuses an exit, then enters 1. The refused step changes no state.');
trial('adapter', 'witness-w2', { read: 'retelling: Open/0 --exit 1--> Open/1 (M1) --halt--> Halted/1 (M4) --exit 1 refused (R1)--> Halted/1 --enter 1--> Halted/0 (M3).\ncovers: W2 by its own matched witness; the refusal alone gives no model cover.\n' });
trial('adapter', 'witness-w1', { read: 'retelling: Open/0 --exit 2--> Open/2 (M1) --enter 2--> Open/0 (M2). The trace is W1 step for step.\ncovers: W1 by the matched trace.\n' });
trial('adapter', 'blunder-stilllive', { read: 'blunder: halt leaves live set. In Halted, live is TRUE; A1 fails at once.\n' });
trial('adapter', 'replay', { read: 'grounded: W1 and W2 replay on the stand-in, including the halt from the Breaker and the refused exit.\n' });

// token
chartCall('token', 'the chart over supply 0..4');
tlcCall('token', 'ordinary', null, 'amounts up to 2; supply up to 4', { TypeOK: 'holds', A1: 'holds' }, 'mint is guarded by the cap and burn only lowers the supply.');
replayCall('token', 'the stand-in deployment', ['W1'], 'Mint, transfer and burn leave the supply at zero.');
trial('token', 'chart');
trial('token', 'ordinary');
trial('token', 'blunder-uncapped', { read: 'blunder: no cap on mint. Three mints of 2 reach supply 6; A1 fails.\n' });
trial('token', 'replay');

// timelock
chartCall('timelock', 'the chart over remaining 0..2');
tlcCall('timelock', 'ordinary', null, 'one plan; delay 2; effects up to 4', { TypeOK: 'holds', A1: 'holds', N1: 'holds' }, 'A1: execute is guarded by remaining 0, so early is never set. N1: the executor is prompt and the chain cannot tick while execute is due, so a scheduled plan is executed within two ticks or cancelled.');
tlcCall('timelock', 'liveness-o1', 'O1', 'one plan; delay 2', { O1: 'holds' }, 'The chain keeps ticking (G2) and the executor is prompt (G1), so every scheduled plan reaches Idle.');
witnessCall('timelock', 'W1', 'one plan; delay 2', 'remaining', 'Idle/0 > Scheduled/2 > Scheduled/1 > Scheduled/0 > Idle/0', 'W1 schedules, waits two ticks and executes: M4, M2, M2, M5. The refused execute in between leaves no state.');
apalacheCall('timelock', 'inductive-a1', 'A1', 'unbounded; TypeOK and A1 inductive', 'execute is the only action that writes early, and it writes remaining > 0 while requiring remaining = 0.');
trial('timelock', 'chart');
trial('timelock', 'ordinary');
trial('timelock', 'liveness-o1');
witnessCall('timelock', 'W2', 'one plan; delay 2', 'remaining', 'Idle/0 > Scheduled/2 > Scheduled/1 > Idle/1', 'W2 schedules, ticks once and cancels, then refuses execute in Idle. No change is sent.');
trial('timelock', 'witness-w2', { read: 'retelling: Idle/0 --schedule--> Scheduled/2 (M4) --tick--> Scheduled/1 (M2) --cancel--> Idle/1 (M6), then execute is refused (R1). No change is sent.\ncovers: W2 by its own matched witness.\n' });
trial('timelock', 'witness-w1', { read: 'retelling: Idle/0 --schedule--> Scheduled/2 (M4) --tick--> Scheduled/1 (M2) --tick--> Scheduled/0 (M2) --execute--> Idle/0 (M5), change sent once.\ncovers: W1 by the matched trace.\n' });
trial('timelock', 'inductive-a1');
trial('timelock', 'blunder-early', { read: 'blunder: execute fires with remaining 2 and records early. A1 fails on the second step.\n' });
trial('timelock', 'blunder-impatient', { read: 'blunder: ticks no longer wait for a due execute. Four ticks pass in Scheduled with remaining 0 and the counter exceeds 3; N1 fails. N1 is not hollow: it rests on G1.\n' });
trial('timelock', 'blunder-unfair', { read: 'blunder: without fairness on the executor a scheduled plan can wait forever once its delay is out; O1 fails on a stuttering path. O1 is not hollow: it rests on G1.\n' });

// breaker
chartCall('breaker', 'the chart, two states');
tlcCall('breaker', 'ordinary', null, 'one breaker', { TypeOK: 'holds', A1: 'holds' }, 'stop is the only move and it sets halted as it enters Spent.');
ask('breaker', 'structure-a2', 'alloy', null, { reach: 'scope 4', expect: { A2_halts_from_governance: 'no counterexample' }, because: 'X1 makes every halt come from a Breaker and K1 makes every Breaker answer to Governance, so no halt escapes Governance within scope 4.' });
trial('breaker', 'chart');
trial('breaker', 'ordinary');
witnessCall('breaker', 'W1', 'one breaker', null, 'Armed > Spent', 'W1 stops once and refuses a second stop in Spent. The first stop sends halt once.');
trial('breaker', 'witness-w1', { read: 'retelling: Armed --stop--> Spent (M1), then stop is refused (R1). Halt is sent once.\ncovers: W1 by its own matched witness.\n' });
trial('breaker', 'structure-a2', { read: 'A2 holds within scope 4 because of the two facts named for X1 and K1; the Analyzer found no structure where a halt bypasses Governance.\n' });
trial('breaker', 'blunder-rogue', { read: 'blunder: without X1 an Other halts the Adapter; the Analyzer shows the instance. A2 is not hollow.\n' });
trial('breaker', 'blunder-unhalted', { read: 'blunder: Spent with halted clear; A1 fails at once.\n' });

// oracle
chartCall('oracle', 'the chart over stale 0..3, price and last 0..4');
tlcCall('oracle', 'ordinary', null, 'stale up to 3; price up to 4', { TypeOK: 'holds', A1: 'holds', A2: 'holds', N1: 'holds' }, 'A1: both posts set stale to 0 as they enter Fresh. A2: a post moves the price by at most one step and last follows it, which the only-when Givens enforce in the component model. N1: a prompt lane posts before the next tick.');
witnessCall('oracle', 'W1', 'stale up to 3', 'stale', 'Fresh/0 > Stale/1 > Fresh/0', 'W1 ticks once and lane A posts: M1 then M4.');
trial('oracle', 'chart');
trial('oracle', 'ordinary');
witnessCall('oracle', 'W2', 'stale up to 3; price and last up to 4', 'stale price last', 'Fresh/0/2/2 > Stale/1/2/2 > Fresh/0/3/2', 'W2 ticks, lane B posts 3 from price 2, then lane A is refused in Fresh. The only-when Given permits the one-unit price step.');
trial('oracle', 'witness-w2', { read: 'retelling: Fresh/0/2/2 --tick--> Stale/1/2/2 (M1) --post-b 3--> Fresh/0/3/2 (M5), then post-a 3 is refused (R1).\ncovers: W2 by its own matched witness, including its final price and last.\n' });
trial('oracle', 'witness-w1', { read: 'retelling: Fresh/0 --tick--> Stale/1 (M1) --post-a 2--> Fresh/0 (M4).\ncovers: W1 by the matched trace.\n' });
trial('oracle', 'blunder-unrefreshed', { read: 'blunder: a post leaves stale at 1 while entering Fresh; A1 fails there.\n' });
trial('oracle', 'blunder-idlelanes', { read: 'blunder: ticks no longer wait for a due post; two ticks in Stale take the counter past 1 and N1 fails.\n' });
trial('oracle', 'blunder-jumpy', { read: 'blunder: the only-when Givens no longer bind the posts. A post of 0 after a price of 2 leaves last at 2 and price at 0; A2 fails on the first post. A2 is not hollow: it rests on G3 and G4.\n' });

// 6. Systems: generate, then one trial per cell plus blunders.
write(join(sys('supply'), 'model', 'extras.tla'), `\\* Lemmas for the inductive proofs: A1 bounds free by debt, which TypeOK alone does not.\nInv_A2_lemma == TypeOK /\\ A1 /\\ A2\nInv_A3_lemma == TypeOK /\\ A1 /\\ A3\n`);
for (const id of ['supply', 'control', 'upkeep']) run(['scaffold', id]);
// The reach of a system's TLC cells, in the words of the data that system holds.
const REACH = { Supply: 'amounts up to 2; debt, free, issued, held and supply up to 4; effects up to 4', Control: 'delay 2; amounts up to 2; ceiling 2..4; effects up to 4', Upkeep: 'stale up to 3; price and last up to 4; clock up to 2; effects up to 4' };
// A cell: TLC under its scenario, or Apalache's induction, whose invariant past A1 carries A1 as a lemma.
const systemCall = (id, name, prop, scenario, because, kind = 'tlc') => {
  const module = id[0].toUpperCase() + id.slice(1);
  if (kind === 'tlc') return ask(`systems/${id}`, name, 'tlc', prop, { scenario, reach: REACH[module], expect: { ...(/^O/.test(prop) ? {} : { TypeOK: 'holds' }), [prop]: 'holds' }, because });
  const inv = `Inv_${prop}${prop === 'A1' ? '' : '_lemma'}`;
  return ask(`systems/${id}`, name, 'apalache', prop, { scenario, inv: prop === 'A1' ? null : inv, reach: `unbounded; TypeOK${prop === 'A1' ? '' : ', A1'} and ${prop} inductive`, expect: { [inv]: 'holds' }, because });
};
const violatedCall = (id, name, prop, scenario, because) => ask(`systems/${id}`, name, 'tlc', prop, { scenario, reach: REACH[id[0].toUpperCase() + id.slice(1)], expect: { TypeOK: 'holds', [prop]: 'violated' }, because });
const systemBlunder = (id, copy, from, to, prop, scenario, wrong, { all = false } = {}) => blunder(`systems/${id}`, copy, from, to, prop, 'amounts up to 2', wrong, { scenario, all, because: `With the wrong in place ${prop} fails on a short path under ${scenario}.` });

// supply: proved under all-honest, checked under user-malicious
for (const p of ['A1', 'A2', 'A3']) systemCall('supply', `${p.toLowerCase()}-all-honest`, p, 'all-honest', `${p} is preserved by every wired step: credit moves and HRD mints happen together.`, 'apalache');
for (const p of ['A1', 'A2', 'A3']) systemCall('supply', `${p.toLowerCase()}-user-malicious`, p, 'user-malicious', `A malicious user has no Given to cancel; the wiring alone keeps ${p}.`);
ask('systems/supply', 'witness-w1', 'tlc', 'W1', { scenario: 'all-honest', reach: REACH.Supply, 'trace-data': 'vault_debt, adapter_held, token_supply', expect: { TypeOK: 'holds', NotW1: 'violated; trace: 0/0/0 > 2/0/0 > 2/2/2 > 2/1/1' }, because: 'W1 borrows 2 in the Vault, exits 2 through the Adapter, which takes the credit and mints 2 HRD in one wired step, and enters 1, which releases 1 and burns 1 in one wired step.' });
systemBlunder('supply', 'doublemint', "token_supply' = (token_supply + amount)", "token_supply' = (token_supply + amount + amount)", 'A2', 'all-honest', 'the adapter mints twice the credit it takes');
systemBlunder('supply', 'lostcredit', "    /\\ vault_free' = (vault_free + amount)\n", "    /\\ vault_free' = vault_free\n", 'A1', 'all-honest', 'borrow raises debt without crediting free');
systemBlunder('supply', 'helddrift', "    /\\ adapter_held' = (adapter_held - amount)\n", "    /\\ adapter_held' = adapter_held\n", 'A3', 'all-honest', 'enter burns HRD without releasing held credit', { all: true });
for (const c of ['a1-all-honest', 'a2-all-honest', 'a3-all-honest', 'a1-user-malicious', 'a2-user-malicious', 'a3-user-malicious']) trial('systems/supply', c);
trial('systems/supply', 'blunder-doublemint', { read: 'blunder: mint credits twice the amount moved. After one exit of 1 the supply is 2 against issued 1; A2 fails.\n' });
trial('systems/supply', 'blunder-lostcredit', { read: 'blunder: borrow raises debt alone; A1 fails after one borrow.\n' });
trial('systems/supply', 'blunder-helddrift', { read: 'blunder: enter burns without lowering held; A3 fails after exit then enter.\n' });
trial('systems/supply', 'witness-w1', { read: 'retelling: 0/0/0 --borrow 2--> 2/0/0 --exit 2--> 2/2/2, move and mint in one step --enter 1--> 2/1/1, release and burn in one step. The trace is W1 step for step under all-honest.\ncovers: W1 by the matched trace.\n' });

// control
systemCall('control', 'a1-all-honest', 'A1', 'all-honest', 'execute is guarded by remaining 0 in the Timelock, whoever Governance is.', 'apalache');
systemCall('control', 'a1-governance-captured', 'A1', 'governance-captured', 'Captured Governance schedules and cancels at will but cannot execute early.');
systemCall('control', 'a1-executor-offline', 'A1', 'executor-offline', 'With no executor nothing executes at all.');
systemCall('control', 'a2-all-honest', 'A2', 'all-honest', 'stop sets halted and the wired halt moves the Adapter to Halted in the same step.');
systemCall('control', 'a2-governance-captured', 'A2', 'governance-captured', 'The wiring does not depend on Governance being honest.');
ask('systems/control', 'o1-all-honest', 'tlc', 'O1', { scenario: 'all-honest', reach: 'delay 2; effects up to 4', expect: { O1: 'holds' }, because: 'The chain keeps ticking and a prompt executor runs the plan once its delay is out, or Governance cancels it.' });
systemCall('control', 'n1-all-honest', 'N1', 'all-honest', 'Two ticks exhaust the delay and the prompt executor fires before a third.');
systemCall('control', 'n1-governance-captured', 'N1', 'governance-captured', 'Captured Governance can only cancel sooner.');
violatedCall('control', 'n1-executor-offline', 'N1', 'executor-offline', 'With the executor offline a scheduled plan is never executed and the ticks pass; the counter exceeds 3.');
ask('systems/control', 'witness-w1', 'tlc', 'W1', { scenario: 'governance-captured', reach: REACH.Control, 'trace-data': 'timelock_state, timelock_remaining, vault_ceiling', expect: { TypeOK: 'holds', NotW1: 'violated; trace: Idle/0/2 > Scheduled/2/2 > Scheduled/1/2 > Scheduled/0/2 > Idle/0/3' }, because: "Under captured Governance W1 schedules, is refused an early execute, waits two ticks and executes, and the wired change raises the Vault's ceiling to 3. The refused execute leaves no state." });
systemBlunder('control', 'early', "  /\\ (timelock_remaining = 0)\n  /\\ timelock_state' = \"Idle\"", "  /\\ timelock_state' = \"Idle\"", 'A1', 'all-honest', 'execute no longer waits for the delay');
systemBlunder('control', 'impatient', "TickStep == (Mode_chain /= \"offline\") /\\ Tick /\\ ~Due_public", "TickStep == (Mode_chain /= \"offline\") /\\ Tick", 'N1', 'all-honest', 'the chain ticks while an execute is due');
systemBlunder('control', 'unfair', "        /\\ WF_vars(HonestPublic_timelock_Execute)        \\* from control.G1 timelock.G1\n", "", 'O1', 'all-honest', 'the executor is no longer fair');
systemBlunder('control', 'unrelayed', "/\\ (adapter_state = \"Open\" /\\ adapter_state' = \"Halted\" /\\ adapter_live' = FALSE /\\ UNCHANGED <<adapter_held, adapter_sent_move, adapter_sent_release, adapter_sent_mint, adapter_sent_burn>>)", "/\\ (adapter_state = \"Open\" /\\ UNCHANGED <<adapter_state, adapter_held, adapter_live, adapter_sent_move, adapter_sent_release, adapter_sent_mint, adapter_sent_burn>>)", 'A2', 'all-honest', 'the breaker records a halt the adapter never receives');
const plainA1 = trial('systems/control', 'a1-all-honest', { expectExit: 1, read: controlInductionReading });
// The plain call was wrong. Once the lemma question answers the cell, this answer is superseded, and the
// owner's forget lets its counterexample go with that publication.
forget('systems/control', plainA1, 'the plain inductive call was wrong; the lemma question answers the cell');
write(join(sys('control'), 'model', 'extras.tla'), `\\* Lemma for the inductive proof: the Vault's conservation bounds free by debt, which TypeOK alone does not.\nInv_A1_lemma == TypeOK /\\ (vault_debt = vault_free + vault_issued) /\\ A1\n`);
ask('systems/control', 'a1-all-honest-strengthened', 'apalache', 'A1', { scenario: 'all-honest', inv: 'Inv_A1_lemma', reach: "unbounded; TypeOK, the Vault's conservation and A1 inductive", expect: { Inv_A1_lemma: 'holds' }, because: "execute is guarded by remaining 0 whoever Governance is, and the conservation lemma keeps the Vault's data within TypeOK." });
trial('systems/control', 'a1-all-honest-strengthened', { read: 'Inv_A1_lemma carries the Vault\'s conservation. The step and the base pass. The plain call\'s miscall was classified and the owner forgot it, and the publication of this answer removed it.\n' });
for (const c of ['a1-governance-captured', 'a1-executor-offline', 'a2-all-honest', 'a2-governance-captured', 'o1-all-honest', 'n1-all-honest', 'n1-governance-captured']) trial('systems/control', c);
trial('systems/control', 'n1-executor-offline', { read: 'retelling: schedule, tick, tick, tick, tick: the plan is ready after two ticks and nobody executes it; N1 fails as called. This cell is violated by design of the scenario: the executor is the public, and an offline public is what N1 is conditioned on.\n' });
trial('systems/control', 'blunder-early', { read: 'blunder: execute ignores the delay; early is set on the first execute and A1 fails.\n' });
trial('systems/control', 'blunder-unrelayed', { read: 'blunder: stop no longer reaches the Adapter. halted is set while the Adapter stays Open; A2 fails.\n' });
trial('systems/control', 'blunder-impatient', { read: 'blunder: ticks no longer wait for a due execute; four ticks in Scheduled take the counter past 3 and N1 fails. N1 is not hollow.\n' });
trial('systems/control', 'blunder-unfair', { read: controlUnfairReading });
trial('systems/control', 'witness-w1', { read: 'retelling: Idle/0/2 --schedule--> Scheduled/2/2 --execute, refused-- --tick--> Scheduled/1/2 --tick--> Scheduled/0/2 --execute--> Idle/0/3, change raising the ceiling. The trace is W1 step for step under governance-captured.\ncovers: W1 by the matched trace.\n' });

// upkeep
systemCall('upkeep', 'n1-all-honest', 'N1', 'all-honest', 'Either prompt lane posts before the next block.');
systemCall('upkeep', 'n1-lane-a-offline', 'N1', 'lane-a-offline', 'Lane B alone is prompt enough.');
violatedCall('upkeep', 'n1-lanes-offline', 'N1', 'lanes-offline', 'With both lanes offline the oracle goes stale and stays so; the second tick breaks N1.');
ask('systems/upkeep', 'n1-lanes-offline-bounded', 'apalache', 'N1', { scenario: 'lanes-offline', mode: 'bounded', length: 4, inv: 'N1', reach: '4 steps', expect: { N1: 'violated' }, because: 'Three ticks suffice: the counter reaches 2.' });
systemCall('upkeep', 'n1-lanes-down-one', 'N1', 'lanes-down-one', 'Both lanes are down for the first block only. The tick that makes the price stale ends the window, and a prompt lane posts before the next tick.');
violatedCall('upkeep', 'n1-lanes-down-two', 'N1', 'lanes-down-two', 'Both lanes are down for two blocks. The first tick makes the price stale and the second passes with nobody to post; the counter exceeds 1.');
systemCall('upkeep', 'n1-stale-start', 'N1', 'stale-start', 'The price starts three blocks stale with both lanes live, and a prompt lane posts before the next tick.');
systemCall('upkeep', 'a1-all-honest', 'A1', 'all-honest', 'An honest lane posts a price within one step of the current one, and last follows the price, so the two never differ by more than one.');
violatedCall('upkeep', 'a1-lane-a-captured', 'A1', 'lane-a-captured', 'A captured lane A posts any price. One post of 0 after a price of 2 puts last two steps from price.');
systemBlunder('upkeep', 'idlelanes', "TickStep == (Mode_chain /= \"offline\") /\\ Tick /\\ ~Due_lane_a /\\ ~Due_lane_b", "TickStep == (Mode_chain /= \"offline\") /\\ Tick", 'N1', 'all-honest', 'the chain ticks while a post is due');
// The honest lanes' only-when conditions become comments, each line where it stood.
systemBlunder('upkeep', 'jumpy', "    /\\ (ModeNow_lane_", "    \\* (ModeNow_lane_", 'A1', 'all-honest', 'the lanes may post any price', { all: true });
trial('systems/upkeep', 'n1-all-honest');
trial('systems/upkeep', 'n1-lane-a-offline');
const lanesOffline = trial('systems/upkeep', 'n1-lanes-offline', { read: 'retelling: tick, tick: Stale with the counter at 2 and no lane to post. N1 fails as called; the cell is the point of the scenario.\n' });
trial('systems/upkeep', 'n1-lanes-offline-bounded', { read: 'Apalache finds the same two-tick path symbolically, and its answer stands in for TLC\'s on this cell.\n' });
// Two answers on one cell: Apalache's, established later, stands in for TLC's, which holds a
// counterexample and so waits for the owner's forget. The next publication removes it.
forget('systems/upkeep', lanesOffline, 'Apalache found the same two-tick path symbolically; one answer on this cell is enough');
trial('systems/upkeep', 'n1-lanes-down-one');
trial('systems/upkeep', 'n1-lanes-down-two', { read: 'retelling: tick, tick: the first tick makes the price stale with both lanes still down, the second passes before the window ends, and the counter reaches 2. N1 fails as called; one block of outage is survivable and two are not.\n' });
trial('systems/upkeep', 'n1-stale-start');
trial('systems/upkeep', 'a1-all-honest');
trial('systems/upkeep', 'a1-lane-a-captured', { read: 'retelling: tick, then lane A posts 0 while the price is 2: last becomes 2 and price 0, two steps apart. A1 fails as called; the band holds only while the lanes are honest, which is what G3 and G4 say.\n' });
trial('systems/upkeep', 'blunder-idlelanes', { read: 'blunder: ticks no longer wait for due posts; N1 fails after two ticks under all-honest. N1 is not hollow.\n' });
trial('systems/upkeep', 'blunder-jumpy', { read: 'blunder: the only-when Givens no longer bind the posts under all-honest; one post jumps the price and A1 fails. A1 is not hollow: it rests on G3 and G4.\n' });

// 7. Decisions and a doubt, in the owners' words.
run(['decide', 'vault', 'accept', 'S1', 'E1', 'E2', 'E3', 'E4', 'E5', 'M1', 'M2', 'M3', 'M4', 'A1', 'A2', '--', 'the ledger as deployed: debt, free and issued, and the ceiling as the only limit']);
run(['decide', 'vault', 'reject', 'K4', '--', 'the ceiling is also lowered by a governance plan; say so']);
run(['decide', 'adapter', 'accept', 'S1', 'S2', 'E1', 'E2', 'E3', 'M1', 'M2', 'M3', 'M4', 'R1', 'A1', '--', 'exits stop on a halt, entries never do']);
run(['decide', 'timelock', 'accept', 'S1', 'S2', 'E1', 'E2', 'E3', 'E4', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'A1', 'N1', 'G1', 'G2', '--', 'two blocks of delay, then anyone executes']);
run(['decide', 'token', 'accept', 'S1', 'E1', 'E2', 'E3', 'M1', 'M2', 'M3', 'A1', '--', 'only the adapter mints and burns']);
run(['decide', 'breaker', 'accept', 'S1', 'S2', 'E1', 'M1', 'A1', 'A2', '--', 'a breaker halts and that is all']);
run(['decide', 'systems/supply', 'accept', 'A1', 'A2', 'A3', '--', 'supply equals issued credit equals held credit']);
run(['decide', 'systems/upkeep', 'risk', 'N1', 'lanes-offline', '--', 'both lanes down is an incident, not a design flaw']);
run(['decide', 'systems/upkeep', 'risk', 'N1', 'lanes-down-two', '--', 'two blocks without a lane is the same incident, shorter; one block is what the lanes are sized for']);
run(['decide', 'systems/upkeep', 'risk', 'A1', 'lane-a-captured', '--', 'a captured lane posts any price; the band is what honest lanes promise, not what the Oracle enforces']);
run(['decide', 'systems/control', 'risk', 'N1', 'executor-offline', '--', 'an offline executor is the very thing N1 is conditioned on; governance re-plans']);
write(join(comp('oracle'), 'doubts.md'), `## D1
on: M3
assumed: a
Whether a stale price older than three blocks is still a price at all. The prose caps stale at 3 and keeps counting nothing.
Walk a: from Stale, tick, tick, tick, post-a; ends Fresh with stale 0.
Walk b: from Stale, tick, tick, tick; ends Stale and the price is void until a post.
Assumed a, because the Vault reads the price regardless of its age and the lanes are prompt.
`);

// 8. Render disposable views, then record observations for independent review.
run(['render']);
const r = run(['verify']);
const json = JSON.parse(run(['verify', '--json'], { quiet: true }).stdout);
const observed = { components: {}, systems: {} };
for (const c of json.components) observed.components[c.id] = { tier: c.tier, marks: Object.fromEntries(Object.entries(c.marks).map(([id, m]) => [id, { mark: m.mark, owner: m.owner, grounded: m.grounded }])), backing: Object.fromEntries(Object.entries(c.backing).map(([k, b]) => [k, b.status])), route: c.route.pass, flags: c.flags.map(f => f.name).sort() };
for (const s of json.systems) observed.systems[s.id] = { cells: Object.fromEntries(s.cells.map(c => [`${c.property}|${c.scenario}`, { mark: c.mark, accepted: Boolean(c.accepted) }])), walks: Object.fromEntries(s.walks.map(w => [`${w.id}|${w.scenario}`, w.mark])), propertyHeld: s.propertyHeld, route: s.route.pass, flags: s.flags.map(f => f.name).sort() };
writeFileSync(join(output, 'observed-marks.json'), JSON.stringify(observed, null, 2) + '\n');
console.log(`observed-marks.json written in ${output}; verify exited ${r.status}. These observations are not an approved golden.`);
return { output, verified: r.status, observed };
}

// Replaces the fixture's dossiers/ with a rebuild's, only when the rebuild verifies with no
// tripwire and its observed marks equal expected-marks.json, the reviewed golden. The golden is
// never written here: a rebuild that moves a mark stops, and the move is reviewed by hand. The
// swap goes through hidden siblings, so an interruption leaves the old dossiers/ or the new one.
export function installFixture({ output, verified, observed }) {
  if (verified !== 0) throw new Error(`verify exited ${verified} on the rebuild; the fixture is unchanged`);
  const expected = JSON.parse(readFileSync(join(fixture, 'expected-marks.json'), 'utf8'));
  if (!isDeepStrictEqual(observed, expected)) {
    const moved = [];
    for (const kind of ['components', 'systems']) for (const id of new Set([...Object.keys(expected[kind] || {}), ...Object.keys(observed[kind] || {})])) {
      if (!isDeepStrictEqual(expected[kind]?.[id], observed[kind]?.[id])) moved.push(`${kind}/${id}`);
    }
    throw new Error(`observed marks differ from expected-marks.json in ${moved.join(', ') || 'their shape'}; review the moves and the golden by hand; the fixture is unchanged`);
  }
  const target = join(fixture, 'dossiers'), token = randomUUID();
  const staging = join(fixture, `.dossiers-installing-${token}`), replaced = join(fixture, `.dossiers-replaced-${token}`);
  // The bundles in trials/ and .running/ stay with the rebuild: Harbor commits its answers, not its trials' bundles.
  const local = /[\\/](?:components|systems)[\\/][^\\/]+[\\/](?:trials|\.running)(?:[\\/]|$)/;
  cpSync(join(output, 'dossiers'), staging, { recursive: true, preserveTimestamps: true, filter: source => !local.test(source.slice(join(output, 'dossiers').length)) });
  renameSync(target, replaced);
  renameSync(staging, target);
  rmSync(replaced, { recursive: true, force: true });
  console.log(`installed ${join(output, 'dossiers')} as qualification/fixture/dossiers; its marks equal expected-marks.json`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2), options = { out: null }, usage = 'usage: node qualification/rebuild-fixture.mjs --out <isolated directory> [--install]';
    let install = false;
    for (let index = 0; index < args.length; index++) {
      if (args[index] === '--out' && !options.out && args[index + 1] && !args[index + 1].startsWith('--')) options.out = args[++index];
      else if (args[index] === '--install' && !install) install = true;
      else throw new Error(usage);
    }
    if (!options.out) throw new Error('an explicit --out <isolated directory> is required');
    const built = rebuildFixture(options);
    if (install) installFixture(built);
  } catch (error) { console.error(`rebuild-fixture: ${error.message}`); process.exitCode = 2; }
}
