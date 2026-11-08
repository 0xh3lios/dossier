// Every command end to end, each test in its own temporary repository:
// setup and doctor, decide, draw, scaffold, trial (chart trials need no Java),
// recheck (on a copy of Harbor; the solver-backed cases skip without the toolchain),
// verify, where and import.
//   node --test qualification/tests/commands.test.ts
import { after, afterEach, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseProse } from '../../src/prose/prose.ts';
import { TRIAL_ID } from '../../src/trials/trials.ts';
import { bundleDigest } from '../../src/trials/receipt.ts';
import { answerOf, trialBundle } from '../conformance/evidence.ts';
import { fingerprint } from '../conformance/files.ts';
import type { BinaryLike } from 'node:crypto';
import type { DrawResult } from '../../src/chart/draw.ts';
import type { Marker } from '../../src/dossiers/root.ts';
import type { Ir } from '../../src/prose/ir.ts';
import type { Receipt } from '../../src/trials/receipt.ts';
import type { Entry } from '../../src/trials/answers.ts';
import type { Integrity } from '../../src/dossiers/integrity.ts';
import type { TrialResult } from '../../src/trials/trials.ts';
import type { VerifyJson } from '../../src/commands/verify.ts';
import type { Note } from '../../src/verify/tripwires.ts';

const pluginRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const bin = join(pluginRoot, 'bin', 'dossier');
const knowledge = join(pluginRoot, 'qualification', 'fixture', 'knowledge');
const version = (JSON.parse(readFileSync(join(pluginRoot, 'package.json'), 'utf8')) as { version: string }).version;
const today = new Date().toISOString().slice(0, 10);
const sha256 = (data: BinaryLike) => createHash('sha256').update(data).digest('hex');
const short = (data: BinaryLike, n = 8) => sha256(data).slice(0, n);
const read = (path: string) => readFileSync(path, 'utf8');
const lines = (text: string) => text.split('\n').filter(l => l.length > 0);

// The caller's environment, without a root set from outside; and without the toolchain.
const baseEnv = { ...process.env };
delete baseEnv.DOSSIER_ROOT;
const without = (...names: string[]) => { const env = { ...baseEnv }; for (const n of names) delete env[n]; return env; };
const NO_TOOLCHAIN = without('JAVA', 'TLA_TOOLS', 'ALLOY_JAR', 'APALACHE');

// Where a command runs, with which environment, and which bin runs it.
interface RunOptions { cwd?: string; env?: NodeJS.ProcessEnv; bin?: string }

function dossier(args: string[], { cwd, env = baseEnv, bin: command = bin }: RunOptions = {}) {
  const r = spawnSync(command, args, { cwd, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw r.error;
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '', out: `${r.stdout || ''}${r.stderr || ''}` };
}
// A command against a dossiers root, run from the repository above it.
const at = (root: string) => (args: string[], opts: RunOptions = {}) => dossier([args[0], '--root', root, ...args.slice(1)], { cwd: dirname(root), ...opts });
type Run = ReturnType<typeof at>;

const ACTORS = '# Actors\n\n```yaml\nactors:\n  - id: chain\n    name: the chain\n    kind: chain\n    modes: [honest, offline]\n  - id: public\n    name: the public\n    kind: public\n    modes: [honest, malicious, offline]\n```\n';
const SCENARIOS = '# Scenarios\n\n```yaml\nscenarios:\n  - id: all-honest\n    modes: {}\n  - id: public-malicious\n    modes: { public: malicious }\n    stronger_than: [all-honest]\n```\n';

// A repository with a dossiers root written by hand, as dossier setup would leave it.
function makeRepo({ withKnowledge = true } = {}) {
  const repo = mkdtempSync(join(tmpdir(), 'dossier-commands-'));
  const root = join(repo, 'dossiers');
  for (const d of ['actors', 'components', 'systems']) mkdirSync(join(root, d), { recursive: true });
  const marker: Marker = { plugin: version, setup: today, updated: today, storage: 'integrity-v1' };
  if (withKnowledge) marker.knowledge = { root: knowledge };
  writeFileSync(join(root, 'dossier.json'), JSON.stringify(marker, null, 2) + '\n');
  writeFileSync(join(root, 'actors', 'actors.md'), ACTORS);
  writeFileSync(join(root, 'actors', 'scenarios.md'), SCENARIOS);
  return { repo, root, run: at(root) };
}
type Repo = ReturnType<typeof makeRepo>;
const removeRepo = (r: Repo | undefined) => { if (r) rmSync(r.repo, { recursive: true, force: true }); };

// A small component that compiles: two states, three events, three moves,
// three refusals (one conditional), an Always, a Walk and a Words-only passage.
const gate = ({ title = 'Gate', tier = 'charted', module = 'gate', pins = null, ends = 'Shut' }: { title?: string; tier?: string; module?: string; pins?: string | null; ends?: string } = {}) => `# ${title}

Tier: ${tier}
Module: ${module}
${pins ? `Pins: ${pins}\n` : ''}
The ${title} opens and closes unless it is locked. It holds locked, a flag. It sends ring to the Bell.

## States
[S1] Shut: the gate is closed.
[S2] Open: the gate is open.

## Events
[E1] open, from the public: someone opens the gate.
[E2] close, from the public: someone closes the gate.
[E3] lock, from the public: someone locks the shut gate.

## Moves
[M1] When Shut receives open and locked is clear, it becomes Open, sends ring.
[M2] When Open receives close, it becomes Shut.
[M3] When Shut receives lock, it stays Shut, locked is set.
[R1] In Shut, close is refused.
[R2] In Open, open and lock are refused.
[R3] In Shut, open is refused when locked is set.

## Always
[A1] Always, while Open, locked is clear.

## Walks
[W1] Walk Swing: from Shut, open, close, lock, open refused; ends ${ends}; ring sent once.

## Words only
[T1] This piece promises nothing eventual.

## Retired
`;
const PASSAGES = ['S1', 'S2', 'E1', 'E2', 'E3', 'M1', 'M2', 'M3', 'R1', 'R2', 'R3', 'A1', 'W1', 'T1'];
const BROKEN = '# Gate\n\nTier: charted\nModule: gate\n\nIt holds locked, a flag.\n\n## States\n[S1] Shut: the gate is closed.\n\n## Moves\n[M1] nonsense that follows no form.\n';

const componentDir = (root: string, id: string) => join(root, 'components', id);
function initializeEmptyDossier(root: string, dir: string) {
  // Fixture initialization only: never re-anchor an existing record or corruption.
  const existed = existsSync(dir);
  mkdirSync(dir, { recursive: true });
  if (!existed && JSON.parse(read(join(root, 'dossier.json'))).storage === 'integrity-v1') {
    writeFileSync(join(dir, 'integrity.json'), JSON.stringify({ schema: 1, evidence: {}, decisionHead: null }) + '\n');
  }
}
function writeComponent(root: string, id: string, text: string) {
  initializeEmptyDossier(root, componentDir(root, id));
  writeFileSync(join(componentDir(root, id), 'prose.md'), text);
}
// A system over the gate: one Always claiming the composition's default scenarios.
function writeSystem(root: string, id: string, { members = ['gate'], scenarios = ['all-honest'] } = {}) {
  const dir = join(root, 'systems', id);
  initializeEmptyDossier(root, dir);
  writeFileSync(join(dir, 'composition.md'), `# Composition\n\n\`\`\`yaml\nmembers:\n${members.map(m => `  - component: ${m}\n    role: member\n`).join('')}wiring: []\nclosure: []\nscenarios: [${scenarios.join(', ')}]\n\`\`\`\n`);
  const title = id[0].toUpperCase() + id.slice(1);
  writeFileSync(join(dir, 'prose.md'), `# ${title}\n\nConcern: ${id}\n\nThe gate alone.\n\n## Always\n[A1] Always, {not gate.locked or gate.Shut}.\n\n## Words only\n[T1] Nothing else is claimed.\n`);
  return dir;
}

const CHART_CALL = 'kind: chart\nexecutes:\n  - prose.md\nreach: the chart over locked\nexpect:\n  checks: pass\nbecause: |\n  Every state is reached and every move, refusal and walk replays as said.\n';
const blunderCall = (ids: string) => `kind: blunder\nexecutes:\n  - chart/blunders/x.json\nreach: the chart over locked\nblunder: M1 no longer checks the lock\nexpect:\n  checks: fail ${ids}\nbecause: |\n  Without the guard a locked gate opens.\n`;
const MISCALL = 'kind: chart\nexecutes:\n  - prose.md\nreach: the chart over locked\nexpect:\n  checks: fail Z9\nbecause: |\n  Wrongly expected to fail.\n';
const MALFORMED = 'kind: chart\nexecutes:\n  - prose.md\nexpect:\n  checks: pass\n';
const TLC_CALL = 'kind: tlc\nexecutes:\n  - model/Gate.tla\n  - model/Gate.cfg\nreach: the lock alone\nexpect:\n  TypeOK: holds\n  A1: holds\nbecause: |\n  Both hold on the scaffold.\n';
function writeCall(root: string, id: string, name: string, text: string) {
  mkdirSync(join(componentDir(root, id), 'calls'), { recursive: true });
  writeFileSync(join(componentDir(root, id), 'calls', name), text);
}
// A chart blunder: the prose's machine with M1's guard dropped.
function writeBlunder(root: string, id: string) {
  const machine = JSON.parse(read(join(componentDir(root, id), 'chart', 'machine.json'))) as Ir;
  machine.transitions.find(t => t.id === 'M1')!.guard = null;
  mkdirSync(join(componentDir(root, id), 'chart', 'blunders'), { recursive: true });
  writeFileSync(join(componentDir(root, id), 'chart', 'blunders', 'x.json'), JSON.stringify(machine, null, 2) + '\n');
}
// The bundles a dossier's trials left in the local trials/, which stay on this machine and are no record.
const bundlesOf = (dir: string) => (existsSync(join(dir, 'trials')) ? readdirSync(join(dir, 'trials')).sort() : []);
const trialId = (stdout: string) => { const m = stdout.match(/^trial: (\S+) · (\S+)/m); assert.ok(m, `a trial line in: ${stdout}`); return { id: m[1], result: m[2] }; };
// What publication did with a trial's answer: the line `answer: evidence/<name>.json · <what>`, where
// <what> is published, replaced the recorded answer, kept: <why> or refused: <why>.
function answered(stdout: string) {
  const m = stdout.match(/^answer: evidence\/(\S+)\.json · (published|replaced the recorded answer|kept|refused)(?:: (.+))?$/m);
  assert.ok(m, `an answer line in: ${stdout}`);
  return { name: m[1], action: m[2], reason: m[3] || null };
}
// The published record of a dossier: its answers in evidence/ and the manifest that binds them.
const evidenceFiles = (dir: string) => (existsSync(join(dir, 'evidence')) ? readdirSync(join(dir, 'evidence')).sort() : []);
const entryAt = (dir: string, name: string) => JSON.parse(read(join(dir, 'evidence', `${name}.json`))) as Entry;
const manifestOf = (dir: string) => JSON.parse(read(join(dir, 'integrity.json'))) as Integrity;
// What publication may write in a dossier, with every byte, mode and modification time: the entries
// and readings in evidence/, integrity.json and decisions.log. The local bundles in trials/ are no record.
const recordOf = (dir: string) => Object.fromEntries(Object.entries(fingerprint(dir)).filter(([path]) => ['evidence', 'integrity.json', 'decisions.log'].includes(path) || path.startsWith('evidence/')));
// A view as render writes it: it ends with its JSON block and carries no hash of its own.
const isView = (text: string) => text.endsWith('\n```\n') && !text.includes('ledger-hash');
function verifyJson(run: Run) {
  const r = run(['verify', '--json']);
  assert.ok([0, 1].includes(r.status!), r.stderr);
  return JSON.parse(r.stdout) as VerifyJson;
}
const componentOf = (json: VerifyJson, id: string) => json.components.find(c => c.id === id)!;
const marksOf = (json: VerifyJson, id: string) => Object.fromEntries(Object.entries(componentOf(json, id).marks).map(([k, m]) => [k, m.mark]));
const flagNames = (a: { flags: Note[] }) => a.flags.map(f => f.name);

// decisions.log: every line chained from the previous one, the first from genesis.
function assertChained(text: string) {
  const ls = lines(text);
  ls.forEach((line, i) => {
    assert.match(line, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z (begin|accept|reject|answer|risk|retire|forget)(?: \S+)* "(?:[^"\\]|\\.)*" [0-9a-f]{8}$/, `line ${i + 1} has the form`);
    assert.equal(line.slice(-8), i === 0 ? '00000000' : short(ls[i - 1]), `line ${i + 1} chains from line ${i}`);
  });
  return ls;
}

describe('setup', () => {
  // setup's smoke test verifies the plugin's own fixture in place, so these
  // tests run a copy of the plugin and leave the real fixture alone.
  let copy: string, copyBin: string, repo: string;
  before(() => {
    copy = mkdtempSync(join(tmpdir(), 'dossier-plugin-'));
    for (const d of ['bin', 'src', 'package.json', 'qualification/fixture']) cpSync(join(pluginRoot, d), join(copy, d), { recursive: true });
    symlinkSync(join(pluginRoot, 'node_modules'), join(copy, 'node_modules'), 'dir');
    copyBin = join(copy, 'bin', 'dossier');
    chmodSync(copyBin, 0o755);
  });
  after(() => rmSync(copy, { recursive: true, force: true }));
  beforeEach(() => { repo = realpathSync(mkdtempSync(join(tmpdir(), 'dossier-setup-'))); });
  afterEach(() => rmSync(repo, { recursive: true, force: true }));
  const setup = (args: string[], env = baseEnv) => dossier(['setup', ...args], { cwd: repo, env, bin: copyBin });
  const dossiers = () => join(repo, 'dossiers');
  const marker = () => JSON.parse(read(join(dossiers(), 'dossier.json'))) as Marker;

  it('creates dossiers/ with the marker, the records and the folders, then runs doctor and the smoke test', () => {
    const r = setup(['--knowledge', knowledge]);
    for (const f of ['dossier.json', 'README.md', 'package.json', '.gitignore', 'actors/actors.md', 'actors/scenarios.md', 'components', 'systems']) assert.ok(existsSync(join(dossiers(), f)), `${f} exists`);
    const m = marker();
    assert.equal(m.plugin, version);
    assert.equal(m.setup, today);
    assert.equal(m.updated, today);
    assert.equal(m.knowledge!.root, knowledge, 'a knowledge base outside the repository is kept absolute');
    assert.ok(r.stdout.includes(`knowledge: ${knowledge} is outside the repository, so dossier.json keeps its absolute path, which is machine-specific\n`), r.stdout);
    assert.match(read(join(dossiers(), 'actors', 'actors.md')), /id: public/);
    assert.match(read(join(dossiers(), 'actors', 'scenarios.md')), /id: all-honest/);
    assert.equal((JSON.parse(read(join(dossiers(), 'package.json'))) as { name: string }).name, 'dossiers');
    assert.deepEqual(read(join(dossiers(), '.gitignore')).split('\n').filter(line => line && !line.startsWith('#')), ['/index.md', '/_scratch/', '/node_modules/', '/components/*/trials/', '/systems/*/trials/', '/components/*/.running/', '/systems/*/.running/']);
    assert.ok(!/^ignore: /m.test(r.stdout), 'setup writes the ignore file rather than asking for lines in one');
    for (const line of ['created dossiers/', 'created dossiers/dossier.json', 'created dossiers/README.md', 'created dossiers/package.json', 'created dossiers/.gitignore', 'created dossiers/actors/actors.md', 'created dossiers/actors/scenarios.md', `knowledge ${knowledge}`]) assert.ok(r.stdout.includes(`${line}\n`), line);
    for (const what of ['node', 'java', 'TLA_TOOLS', 'ALLOY_JAR', 'APALACHE', 'dossiers root', 'knowledge']) assert.match(r.stdout, new RegExp(`^(ok|missing|info)\\s+${what}: `, 'm'), `doctor row ${what}`);
    assert.ok(r.stdout.includes(`dossiers root: ${dossiers()}\n`), 'doctor names this root');
    const out = r.stdout.split('\n');
    const smokeAt = out.findIndex(l => l.startsWith('--- smoke test'));
    assert.ok(smokeAt >= 0, 'the smoke test section is printed');
    const smoke = out[smokeAt + 1];
    assert.match(smoke, /^verify: (ok|FAIL) · /, 'the smoke test prints a verify line');
    const hereAt = out.findIndex(l => l.startsWith('--- this repository'));
    assert.ok(hereAt > smokeAt, 'this repository is verified after the smoke test');
    assert.match(out[hereAt + 1], /^verify: ok · no dossiers · dossier /);
    assert.equal(r.status, smoke.startsWith('verify: FAIL') ? 1 : 0, 'the exit code follows the smoke test');
  });

  it('is idempotent: the files are kept and only dossier.json is rewritten', () => {
    assert.ok([0, 1].includes(setup(['--knowledge', knowledge]).status!));
    writeFileSync(join(dossiers(), 'README.md'), '# Mine\n');
    writeFileSync(join(dossiers(), '.gitignore'), '/_scratch/\n');
    writeFileSync(join(dossiers(), 'dossier.json'), JSON.stringify({ ...marker(), setup: '2020-01-01', plugin: '0.0.1' }, null, 2) + '\n');
    const r = setup([]);
    for (const line of ['kept dossiers/', 'rewrote dossiers/dossier.json', 'kept dossiers/README.md', 'kept dossiers/package.json', 'kept dossiers/.gitignore', 'kept dossiers/actors/actors.md', 'kept dossiers/actors/scenarios.md']) assert.ok(r.stdout.includes(`${line}\n`), line);
    assert.ok(!r.stdout.includes('created dossiers/'), 'nothing is created twice');
    assert.equal(read(join(dossiers(), 'README.md')), '# Mine\n');
    assert.equal(read(join(dossiers(), '.gitignore')), '/_scratch/\n', "a team's own ignore file is kept as it is, with no line put back");
    const m = marker();
    assert.equal(m.plugin, version, 'the plugin version is refreshed');
    assert.equal(m.setup, '2020-01-01', 'the setup date is kept');
    assert.equal(m.updated, today);
    assert.equal(resolve(dossiers(), m.knowledge!.root), knowledge, 'the knowledge root survives a run without --knowledge');
    assert.ok(r.stdout.includes(`knowledge ${knowledge}\n`));
  });

  it('keeps a knowledge base inside the repository relative, and prepares the folder --root names', () => {
    cpSync(knowledge, join(repo, 'records'), { recursive: true });
    const r = setup(['--root', 'ledgers', '--knowledge', 'records']);
    const root = join(repo, 'ledgers');
    for (const f of ['dossier.json', 'README.md', 'package.json', '.gitignore', 'actors/actors.md', 'actors/scenarios.md', 'components', 'systems']) assert.ok(existsSync(join(root, f)), `${f} exists`);
    assert.ok(!existsSync(dossiers()), 'nothing is written under dossiers/');
    for (const line of ['created ledgers/', 'created ledgers/dossier.json', `knowledge ${join(repo, 'records')}`]) assert.ok(r.stdout.includes(`${line}\n`), line);
    const m = JSON.parse(read(join(root, 'dossier.json'))) as Marker;
    assert.equal(m.knowledge!.root, join('..', 'records'), 'relative to the dossiers folder, so it travels with the repository');
    assert.ok(!r.stdout.includes('machine-specific'));
    assert.ok(r.stdout.includes(`dossiers root: ${root}\n`), 'doctor reads the folder --root names');
    const out = r.stdout.split('\n');
    assert.match(out[out.findIndex(l => l.startsWith('--- this repository')) + 1], /^verify: ok · no dossiers · /);
    assert.ok([0, 1].includes(setup(['--dir', 'sub']).status!));
    assert.ok(existsSync(join(repo, 'sub', 'dossiers', 'dossier.json')), '--dir still names the folder that holds dossiers/');
  });

  it('keeps the index, the workspace, the libraries and the trials\' bundles out of git, and nothing else', t => {
    // Hermetic: no global or system git configuration, so no ignore rule but setup's applies.
    const git = (...args: string[]) => spawnSync('git', args, { cwd: repo, encoding: 'utf8', env: { ...process.env, GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' } });
    if (git('--version').error) { t.skip('git is not installed'); return; }
    assert.equal(git('init', '-q').status, 0);
    assert.ok([0, 1].includes(setup([]).status!));
    const ignored = ['dossiers/index.md', 'dossiers/_scratch/notes.md', 'dossiers/node_modules/xstate/package.json', 'dossiers/components/vault/trials/2026-11-07-1000-tlc-aaaaaa/output.txt', 'dossiers/systems/control/trials/2026-11-07-1000-tlc-aaaaaa/receipt.json', 'dossiers/components/vault/.running/2026-11-07-1000-tlc-aaaaaa/entry.json', 'dossiers/systems/control/.running/2026-11-07-1000-tlc-aaaaaa/result.json'];
    const committed = ['dossiers/README.md', 'dossiers/.gitignore', 'dossiers/dossier.json', 'dossiers/package.json', 'dossiers/components/vault/ledger.md', 'dossiers/components/vault/index.md', 'dossiers/components/vault/evidence/tlc-A1-3fa2c1.json', 'dossiers/components/vault/evidence/tlc-A1-3fa2c1.md', 'dossiers/systems/control/evidence/tlc-N1-executor-offline-9b1e04.json', 'dossiers/components/vault/integrity.json'];
    const r = git('check-ignore', ...ignored, ...committed);
    assert.deepEqual(r.stdout.split('\n').filter(Boolean), ignored, 'the root index, _scratch/, node_modules/ and the trial bundles only; the answers in evidence/ and a folder\'s own index.md stay in git');
  });

  it('says knowledge is not configured without --knowledge', () => {
    const r = setup([]);
    assert.ok(r.stdout.includes('knowledge: none configured; pass --knowledge'), r.stdout);
    assert.equal(marker().knowledge, undefined);
    assert.match(r.stdout, /^info\s+knowledge: none configured/m);
  });
});

describe('doctor', () => {
  let r: Repo;
  beforeEach(() => { r = makeRepo(); });
  afterEach(() => removeRepo(r));
  const TOOLS = ['TLA_TOOLS', 'ALLOY_JAR', 'APALACHE'];

  it('names node, java, the toolchain, the root and the knowledge, and exits 1 only when something is missing', () => {
    const d = r.run(['doctor']);
    for (const what of ['node', 'java', ...TOOLS, 'dossiers root', 'knowledge', 'xstate', '@xstate/graph', 'dossier.json', 'external runners', 'plugin']) assert.match(d.stdout, new RegExp(`^(ok|missing|info)\\s+${what.replace(/[/@.]/g, '\\$&')}: `, 'm'), `row ${what}`);
    assert.match(d.stdout, /^ok\s+node: node \d+\.\d+/m);
    assert.ok(d.stdout.includes(`dossiers root: ${r.root}\n`));
    assert.match(d.stdout, /^ok\s+knowledge: .*\(modules\/ present\)$/m);
    assert.match(d.stdout, new RegExp(`^ok\\s+dossier\\.json: set up with dossier ${version.replace(/\\./g, '\\\\.')}$`, 'm'));
    assert.equal(d.status, /^missing/m.test(d.stdout) ? 1 : 0, 'exit 1 exactly when a row is missing');
    assert.equal(d.stderr, '');
  });

  it('reports each unset or dangling toolchain variable as missing, with the fix', () => {
    const unset = r.run(['doctor'], { env: without(...TOOLS) });
    assert.equal(unset.status, 1);
    for (const name of TOOLS) assert.match(unset.stdout, new RegExp(`^missing\\s+${name}: not set\\. Fix: export ${name}=`, 'm'), name);
    const dangling = r.run(['doctor'], { env: { ...baseEnv, TLA_TOOLS: join(r.repo, 'no.jar'), ALLOY_JAR: join(r.repo, 'no-alloy.jar'), APALACHE: join(r.repo, 'no-apalache') } });
    assert.equal(dangling.status, 1);
    for (const name of TOOLS) assert.match(dangling.stdout, new RegExp(`^missing\\s+${name}: \\S+ does not exist\\. Fix: `, 'm'), name);
  });

  it('says when no knowledge base is configured and when there is no root', () => {
    const bare = makeRepo({ withKnowledge: false });
    try {
      assert.match(bare.run(['doctor']).stdout, /^info\s+knowledge: none configured; references resolve to nothing$/m);
    } finally { removeRepo(bare); }
    const elsewhere = mkdtempSync(join(tmpdir(), 'dossier-nowhere-'));
    try {
      const d = dossier(['doctor'], { cwd: elsewhere });
      assert.match(d.stdout, /^info\s+dossiers\/: none under .*; run dossier setup to create one$/m);
      assert.ok(!/dossiers root:/.test(d.stdout));
    } finally { rmSync(elsewhere, { recursive: true, force: true }); }
  });
});

describe('decide', () => {
  let r: Repo;
  beforeEach(() => { r = makeRepo(); });
  afterEach(() => removeRepo(r));
  const log = (kind: string, id: string) => read(join(r.root, kind, id, 'decisions.log'));

  it('begin creates the component skeleton and a begin line chained from genesis', () => {
    const d = r.run(['decide', 'gate', 'begin', 'charted']);
    assert.equal(d.status, 0, d.stderr);
    assert.match(d.stdout.trim(), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z begin charted "" 00000000$/);
    const prose = read(join(componentDir(r.root, 'gate'), 'prose.md'));
    assert.match(prose, /^# Gate\n/);
    assert.match(prose, /^Tier: charted$/m);
    assert.match(prose, /^Module: gate$/m);
    for (const s of ['States', 'Events', 'Moves', 'Always', 'Once', 'Within', 'Given', 'Walks', 'Seams', 'Guarantees', 'Words only', 'Retired']) assert.ok(prose.includes(`## ${s}\n`), `section ${s}`);
    assert.equal(log('components', 'gate'), d.stdout);
    assert.deepEqual(parseProse(prose).errors, [], 'the skeleton compiles');

    const modeled = r.run(['decide', 'beta', 'begin']);
    assert.equal(modeled.status, 0);
    assert.match(modeled.stdout, /begin modeled "" 00000000$/m, 'the tier defaults to modeled');
    assert.match(read(join(componentDir(r.root, 'beta'), 'prose.md')), /^Tier: modeled$/m);

    writeComponent(r.root, 'kept', gate({ title: 'Kept', module: 'kept' }));
    assert.equal(r.run(['decide', 'kept', 'begin', 'charted']).status, 0);
    assert.equal(read(join(componentDir(r.root, 'kept'), 'prose.md')), gate({ title: 'Kept', module: 'kept' }), 'begin never overwrites a prose');
  });

  it('begin system creates composition.md and prose.md', () => {
    const d = r.run(['decide', 'net', 'begin', 'system']);
    assert.equal(d.status, 0, d.stderr);
    assert.match(d.stdout.trim(), /^\S+ begin system "" 00000000$/);
    const dir = join(r.root, 'systems', 'net');
    const composition = read(join(dir, 'composition.md'));
    assert.match(composition, /^members: \[\]$/m);
    assert.match(composition, /^scenarios: \[all-honest\]$/m);
    const prose = read(join(dir, 'prose.md'));
    assert.match(prose, /^# Net\n/);
    assert.match(prose, /^Concern: net$/m);
    for (const s of ['Always', 'Once', 'Within', 'Given', 'Walks', 'Words only', 'Retired']) assert.ok(prose.includes(`## ${s}\n`), `section ${s}`);
    assert.equal(log('systems', 'net'), d.stdout);
    assert.ok(!existsSync(componentDir(r.root, 'net')), 'no component folder is created');
    assert.equal(r.run(['decide', 'systems/other', 'begin']).status, 0, 'the systems/ prefix also begins a system');
    assert.ok(existsSync(join(r.root, 'systems', 'other', 'composition.md')));
    assert.equal(r.run(['verify']).status, 0, 'the skeletons verify clean');
  });

  it('accept appends id@hash arguments with the words quoted, and verify shows the passages settled', () => {
    writeComponent(r.root, 'gate', gate());
    assert.equal(r.run(['decide', 'gate', 'begin', 'charted']).status, 0);
    const d = r.run(['decide', 'gate', 'accept', 'S1', 'E1', '--', 'the gate as built']);
    assert.equal(d.status, 0, d.stderr);
    const hashes = parseProse(gate()).byId;
    assert.match(d.stdout.trim(), new RegExp(`^\\S+ accept S1@${hashes.S1.hash} E1@${hashes.E1.hash} "the gate as built" [0-9a-f]{8}$`));
    const ls = assertChained(log('components', 'gate'));
    assert.equal(ls.length, 2);
    assert.equal(ls[1], d.stdout.trim());
    const json = verifyJson(r.run);
    const marks = componentOf(json, 'gate').marks;
    assert.equal(marks.S1.owner, 'settled');
    assert.equal(marks.E1.owner, 'settled');
    assert.equal(marks.S2.owner, 'unsettled');
    assert.equal(componentOf(json, 'gate').summary.settled, 2);
    assert.equal(r.run(['render']).status, 0);
    assert.match(read(join(componentDir(r.root, 'gate'), 'ledger.md')), /^\| S1 \| State \| [^|]+ \| settled \|/m);

    const quoted = r.run(['decide', 'gate', 'accept', 'S2', '--', 'said "so", with a \\ backslash']);
    assert.equal(quoted.status, 0, quoted.stderr);
    assert.equal(assertChained(log('components', 'gate')).length, 3, 'words with quotes are escaped, not broken');
    assert.equal(r.run(['decide', 'gate', 'accept', 'S1']).status, 2, 'accept needs words');
    assert.equal(r.run(['decide', 'gate', 'accept', '--', 'x']).status, 2, 'accept needs an id');
    const unknown = r.run(['decide', 'gate', 'accept', 'Z9', '--', 'x']);
    assert.equal(unknown.status, 2);
    assert.match(unknown.stderr, /Z9 is not a passage of gate/);
    assert.equal(assertChained(log('components', 'gate')).length, 3, 'refused decisions write nothing');
  });

  it('reject requires exactly one id and the reason', () => {
    writeComponent(r.root, 'gate', gate());
    for (const args of [['reject'], ['reject', 'S1', 'S2']]) {
      const d = r.run(['decide', 'gate', ...args, '--', 'x']);
      assert.equal(d.status, 2, args.join(' '));
      assert.match(d.stderr, /reject names exactly one passage id/);
    }
    const mute = r.run(['decide', 'gate', 'reject', 'S1']);
    assert.equal(mute.status, 2);
    assert.match(mute.stderr, /reject carries the owner's reason/);
    assert.ok(!existsSync(join(componentDir(r.root, 'gate'), 'decisions.log')));
    const d = r.run(['decide', 'gate', 'reject', 'S1', '--', 'say what shut means']);
    assert.equal(d.status, 0, d.stderr);
    assert.match(d.stdout.trim(), new RegExp(`^\\S+ reject S1@${parseProse(gate()).byId.S1.hash} "say what shut means" 00000000$`));
    assertChained(log('components', 'gate'));
    const c = componentOf(verifyJson(r.run), 'gate');
    assert.equal(c.marks.S1.owner, 'rejected');
    assert.equal(c.summary.rejected, 1);
    assert.equal(c.route.pass, 'Write');
    assert.ok(c.route.why.some(w => /rejected: S1/.test(w)), c.route.why.join('; '));
  });

  it('answer fails when doubts.md lacks the doubt and succeeds after it is written', () => {
    writeComponent(r.root, 'gate', gate());
    const missing = r.run(['decide', 'gate', 'answer', 'D1', 'a', '--', 'two swings']);
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /D1 is not in doubts\.md/);
    writeFileSync(join(componentDir(r.root, 'gate'), 'doubts.md'), '## D1\non: M1\nassumed: a\nWhether opening twice is one swing or two.\nWalk a: from Shut, open, close, open; ends Open.\nWalk b: from Shut, open, close, open refused; ends Shut.\n');
    const authoredDoubt = read(join(componentDir(r.root, 'gate'), 'doubts.md'));
    assert.ok(flagNames(componentOf(verifyJson(r.run), 'gate')).includes('doubt open'), 'an unanswered doubt is flagged');
    assert.equal(r.run(['decide', 'gate', 'answer', 'D1', 'c', '--', 'x']).status, 2, 'a reading is a or b');
    const d = r.run(['decide', 'gate', 'answer', 'D1', 'a', '--', 'two swings']);
    assert.equal(d.status, 0, d.stderr);
    // SHA-256 prefix of this authored entry after whitespace normalization.
    assert.match(d.stdout.trim(), /^\S+ answer D1@618eb690 a "two swings" 00000000$/);
    assertChained(log('components', 'gate'));
    const c = componentOf(verifyJson(r.run), 'gate');
    assert.ok(!flagNames(c).includes('doubt open'), 'the answered doubt is no longer flagged');
    assert.equal(c.summary.doubtsOpen, 0, 'the committed answer closes the doubt without copying current state');
    assert.ok(!c.route.why.some(w => /answered doubts to close/.test(w)));
    assert.equal(read(join(componentDir(r.root, 'gate'), 'doubts.md')), authoredDoubt, 'the authored alternatives stay unchanged');
    const committed = log('components', 'gate');
    writeFileSync(join(componentDir(r.root, 'gate'), 'doubts.md'), authoredDoubt.replace('assumed: a', 'status: closed\nassumed: a'));
    assert.ok(componentOf(verifyJson(r.run), 'gate').tripwires.some(t => t.name === 'malformed doubt' && t.where.includes('status: is not written by hand')), 'a written status is a second owner of the answer, and is refused');
    writeFileSync(join(componentDir(r.root, 'gate'), 'doubts.md'), authoredDoubt.replace('Walk a: from Shut, open, close, open; ends Open.', 'Walk a: from Shut, open, close; ends Shut.'));
    const changed = componentOf(verifyJson(r.run), 'gate');
    assert.equal(changed.summary.doubtsOpen, 1, 'an answer to old alternatives cannot close changed meaning');
    assert.ok(flagNames(changed).includes('doubt open'));
    assert.equal(log('components', 'gate'), committed, 'the old answer remains unchanged history');
  });

  // Accepting a violation a trial has shown, with the line that names that trial, runs on Harbor's
  // shipped violation in command-lifecycle.test.ts; here are the refusals, which need no trial.
  it('risk is refused on a component, on a cell no trial has violated, and on a pair that is no cell', () => {
    writeComponent(r.root, 'gate', gate());
    writeSystem(r.root, 'net');
    const logOf = () => existsSync(join(r.root, 'systems', 'net', 'decisions.log')) ? log('systems', 'net') : '';
    const before = logOf();
    const onComponent = r.run(['decide', 'gate', 'risk', 'A1', 'all-honest', '--', 'x']);
    assert.equal(onComponent.status, 2);
    assert.match(onComponent.stderr, /risk is accepted on a system cell/);
    const pending = r.run(['decide', 'systems/net', 'risk', 'A1', 'all-honest', '--', 'accepted: the gate is ours']);
    assert.equal(pending.status, 2, pending.out);
    assert.match(pending.stderr, /^dossier decide: A1 × all-honest is pending, not violated: a risk accepts the violation a trial has shown$/m);
    const bare = r.run(['decide', 'net', 'risk', 'A1', 'all-honest', '--', 'again']);
    assert.match(bare.stderr, /A1 × all-honest is pending, not violated/, 'a bare system id also locates the system and its cell');
    const noCell = r.run(['decide', 'systems/net', 'risk', 'A1', 'nosuch', '--', 'x']);
    assert.equal(noCell.status, 2);
    assert.match(noCell.stderr, /A1 × nosuch is not a cell of net/);
    assert.equal(logOf(), before, 'the refused risks write nothing');
  });

  it('is refused while verify has a tripwire, and nothing is written', () => {
    writeComponent(r.root, 'gate', gate());
    writeFileSync(join(componentDir(r.root, 'gate'), 'stray.txt'), 'not a dossier file\n');
    const d = r.run(['decide', 'gate', 'accept', 'S1', '--', 'x']);
    assert.equal(d.status, 1);
    assert.match(d.stderr, /^verify: FAIL · Gate · .* 1 tripwire: stray files \(Gate: stray\.txt\)/m);
    assert.match(d.stderr, /dossier decide: refused until the tripwires are fixed/);
    assert.ok(!existsSync(join(componentDir(r.root, 'gate'), 'decisions.log')));
    rmSync(join(componentDir(r.root, 'gate'), 'stray.txt'));
    assert.equal(r.run(['decide', 'gate', 'accept', 'S1', '--', 'x']).status, 0, 'accepted once the tripwire is gone');
  });

  it('holds back every owner reading while the actors files are malformed, though one dossier reports them', () => {
    writeComponent(r.root, 'gate', gate());
    writeSystem(r.root, 'net');
    writeSystem(r.root, 'web');
    writeFileSync(join(r.root, 'actors', 'actors.md'), ACTORS.replace('    kind: chain\n', '    kind: weather\n'));
    for (const argv of [['decide', 'systems/web', 'risk', 'A1', 'all-honest', '--', 'x'], ['decide', 'gate', 'accept', 'S1', '--', 'x']]) {
      const d = r.run(argv);
      assert.equal(d.status, 1, d.out);
      assert.match(d.stderr, /tripwire: malformed actors \(Net: actors\.md: chain has kind "weather"/);
      assert.match(d.stderr, /dossier decide: refused until the tripwires are fixed/);
    }
    assert.ok(!existsSync(join(r.root, 'systems', 'web', 'decisions.log')) || !read(join(r.root, 'systems', 'web', 'decisions.log')).includes(' risk '), 'nothing is written');
    writeFileSync(join(r.root, 'actors', 'actors.md'), ACTORS);
    assert.equal(r.run(['decide', 'gate', 'accept', 'S1', '--', 'x']).status, 0, 'accepted once the actors files read');
  });

  it('checks the tripwires of the named dossier, not of the first one', () => {
    writeComponent(r.root, 'alpha', gate({ title: 'Alpha', module: 'alpha' }));
    writeComponent(r.root, 'gate', gate());
    writeFileSync(join(componentDir(r.root, 'gate'), 'stray.txt'), 'x\n');
    const tripped = r.run(['decide', 'gate', 'accept', 'S1', '--', 'x']);
    assert.equal(tripped.status, 1, `gate has a tripwire, so its decision is refused: ${tripped.out}`);
    assert.ok(!existsSync(join(componentDir(r.root, 'gate'), 'decisions.log')));
    rmSync(join(componentDir(r.root, 'gate'), 'stray.txt'));
    writeFileSync(join(componentDir(r.root, 'alpha'), 'stray.txt'), 'x\n');
    const clean = r.run(['decide', 'gate', 'accept', 'S1', '--', 'x']);
    assert.equal(clean.status, 0, `alpha's tripwire is not gate's: ${clean.out}`);
  });

  it('needs a known dossier and a verb', () => {
    writeComponent(r.root, 'gate', gate());
    const unknown = r.run(['decide', 'nosuch', 'accept', 'S1', '--', 'x']);
    assert.equal(unknown.status, 2);
    assert.match(unknown.stderr, /no component or system named nosuch/);
    const verb = r.run(['decide', 'gate', 'frob', '--', 'x']);
    assert.equal(verb.status, 2);
    assert.match(verb.stderr, /usage: dossier decide/);
  });

  it('begins a dossier once: a second begin appends nothing', () => {
    writeComponent(r.root, 'gate', gate());
    assert.equal(r.run(['decide', 'gate', 'begin', 'charted']).status, 0);
    assert.equal(r.run(['decide', 'gate', 'accept', 'S1', '--', 'shut is shut']).status, 0);
    const again = r.run(['decide', 'gate', 'begin', 'charted']);
    assert.equal(again.status, 0, again.out);
    assert.equal(again.stdout, 'components/gate has begun already; nothing appended\n');
    writeSystem(r.root, 'net');
    assert.equal(r.run(['decide', 'net', 'begin', 'system']).status, 0, 'a system with no decision yet begins');
    assert.equal(r.run(['decide', 'net', 'begin', 'system']).stdout, 'systems/net has begun already; nothing appended\n');
    assert.deepEqual(assertChained(log('components', 'gate')).map(l => l.split(' ')[1]), ['begin', 'accept']);
    assert.equal(assertChained(log('systems', 'net')).length, 1);
  });

  it('retire takes a component out of verify, the index, the router, where and its systems until begin reopens it', () => {
    writeComponent(r.root, 'gate', gate());
    writeSystem(r.root, 'net');
    assert.equal(r.run(['decide', 'gate', 'begin', 'charted']).status, 0);
    const retire = r.run(['decide', 'gate', 'retire', '--', 'folded into the vault']);
    assert.equal(retire.status, 0, retire.out);
    assert.match(retire.stdout.trim(), /^\S+ retire "folded into the vault" [0-9a-f]{8}$/);
    const json = verifyJson(r.run);
    assert.deepEqual(json.components, [], 'a retired component is not analyzed');
    assert.deepEqual(json.systems[0].tripwires, [{ name: 'composition cites unknown component', where: 'composition names component gate, which is retired' }], 'its system lacks the member');
    assert.equal(json.route.target, 'systems/net', 'the router names the system, not the retired component');
    assert.equal(r.run(['render']).status, 1, 'render reports the missing retired member');
    const index = read(join(r.root, 'index.md'));
    assert.ok(!/^\| gate \|/m.test(index) && !/^- Gate: /m.test(index), 'nor is it in the index');
    assert.ok(!existsSync(join(componentDir(r.root, 'gate'), 'ledger.md')), 'nor is its ledger written');
    const where = r.run(['where', 'gate']);
    assert.equal(where.status, 0, where.out);
    assert.equal(where.stdout, 'component gate: retired\n');
    const refused = r.run(['decide', 'gate', 'accept', 'S1', '--', 'x']);
    assert.equal(refused.status, 2);
    assert.equal(refused.stderr, 'dossier decide: components/gate is retired; dossier decide components/gate begin reopens it\n');
    assert.equal(assertChained(log('components', 'gate')).length, 2, 'the refused decision writes nothing');
    const reopened = r.run(['decide', 'gate', 'begin', 'charted']);
    assert.match(reopened.stdout.trim(), /^\S+ begin charted "" [0-9a-f]{8}$/, 'a begin after a retire reopens it');
    assert.deepEqual(assertChained(log('components', 'gate')).map(l => l.split(' ')[1]), ['begin', 'retire', 'begin']);
    const back = verifyJson(r.run);
    assert.deepEqual(back.components.map(c => c.id), ['gate']);
    assert.deepEqual(back.systems[0].tripwires, []);
    assert.match(r.run(['where', 'gate']).stdout, /^component gate: module gate, tier charted, \d+ passages\n  in net as member: /);
    // A retired system: its own ledger is no longer written, and the suggested begin reopens the system.
    assert.equal(r.run(['decide', 'net', 'retire', '--', 'merged into another concern']).status, 0);
    const system = r.run(['decide', 'net', 'risk', 'A1', 'all-honest', '--', 'x']);
    assert.equal(system.stderr, 'dossier decide: systems/net is retired; dossier decide systems/net begin reopens it\n');
    assert.deepEqual(verifyJson(r.run).systems, []);
    assert.equal(r.run(['decide', 'systems/net', 'begin']).status, 0);
    assert.ok(!existsSync(componentDir(r.root, 'net')), 'the suggested begin reopened the system, and began no component');
    assert.deepEqual(verifyJson(r.run).systems.map(s => s.id), ['net']);
  });
});

describe('draw', () => {
  let r: Repo;
  beforeEach(() => { r = makeRepo(); });
  afterEach(() => removeRepo(r));
  const chart = (name: string) => join(componentDir(r.root, 'gate'), 'chart', name);

  it('draws a compiling component: a draw: line, the two chart files, exit 0', () => {
    writeComponent(r.root, 'gate', gate());
    const d = r.run(['draw', 'gate'], { env: NO_TOOLCHAIN });
    assert.equal(d.status, 0, d.out);
    assert.match(lines(d.stdout)[0], /^draw: gate · pass · (\d+) of \1 checks · \d+ states explored$/);
    for (const f of ['machine.json', 'grid.md']) {
      assert.ok(existsSync(chart(f)), `${f} written`);
      assert.ok(d.stdout.includes(`  wrote components/gate/chart/${f}\n`), `${f} printed`);
    }
    assert.deepEqual(readdirSync(join(componentDir(r.root, 'gate'), 'chart')).sort(), ['grid.md', 'machine.json'], 'no Mermaid picture is written');
    assert.doesNotMatch(d.stdout, /removed/);
    const machine = JSON.parse(read(chart('machine.json'))) as Ir;
    assert.equal(machine.ok, true);
    assert.equal(machine.name, 'Gate');
    assert.deepEqual(machine.transitions.map(t => t.id), ['M1', 'M2', 'M3']);
    assert.match(read(chart('grid.md')), /^\| state \\ event \| open \| close \| lock \|\n/);

    const j = r.run(['draw', 'gate', '--json']);
    assert.equal(j.status, 0);
    const result = JSON.parse(j.stdout) as DrawResult;
    assert.equal(result.ok, true);
    assert.equal(result.outcome, 'pass');
    assert.deepEqual(result.files, ['components/gate/chart/machine.json', 'components/gate/chart/grid.md']);
    assert.deepEqual(result.removed, []);
    assert.ok(Array.isArray(result.checks) && result.checks.length >= 12);
    for (const c of result.checks) {
      assert.ok(Array.isArray(c.ids) && c.ids.length > 0, 'every check names passages');
      assert.equal(typeof c.name, 'string');
      assert.equal(c.status, 'passed');
    }
    assert.equal(result.passed, result.checks.length);
    assert.equal(result.failed, 0);
    assert.ok(result.explored! > 0);
    assert.deepEqual([...result.covers!].sort(), PASSAGES.filter(p => p !== 'T1').sort(), 'every checkable passage is covered');
    assert.ok(result.ir === undefined, 'the JSON carries the result, not the IR');
  });

  it('removes the Mermaid pictures an earlier draw left, says so, and keeps the blunders', () => {
    writeComponent(r.root, 'gate', gate());
    assert.equal(r.run(['draw', 'gate', '--brief']).status, 0);
    // The chart folder as an earlier draw left it: two Mermaid pictures beside the machine and the grid, and an authored blunder.
    writeFileSync(chart('chart.mmd'), 'stateDiagram-v2\n  [*] --> Shut\n');
    writeFileSync(chart('walks.mmd'), '%% W1 Swing\nsequenceDiagram\n');
    writeBlunder(r.root, 'gate');
    const blunder = read(chart('blunders/x.json'));
    const d = r.run(['draw', 'gate'], { env: NO_TOOLCHAIN });
    assert.equal(d.status, 0, d.out);
    assert.ok(d.stdout.endsWith('  wrote components/gate/chart/grid.md\n  removed components/gate/chart/chart.mmd\n  removed components/gate/chart/walks.mmd\n'), d.stdout);
    assert.deepEqual(readdirSync(join(componentDir(r.root, 'gate'), 'chart')).sort(), ['blunders', 'grid.md', 'machine.json']);
    assert.equal(read(chart('blunders/x.json')), blunder, 'an authored blunder stays as it was');
    const again = JSON.parse(r.run(['draw', 'gate', '--json']).stdout) as DrawResult;
    assert.deepEqual(again.removed, [], 'once removed, nothing is left to remove');
  });

  it('exits 1 when a check fails', () => {
    writeComponent(r.root, 'gate', gate({ ends: 'Open' }));
    const d = r.run(['draw', 'gate']);
    assert.equal(d.status, 1);
    assert.match(lines(d.stdout)[0], /^draw: gate · fail · \d+ of \d+ checks · \d+ states explored$/);
    assert.match(d.stdout, /^  fail W1: walk Swing replays · ends in Shut, not Open$/m);
    assert.ok(existsSync(chart('machine.json')), 'the chart files are still written');
    const result = JSON.parse(r.run(['draw', 'gate', '--json']).stdout) as DrawResult;
    assert.equal(result.outcome, 'fail');
    assert.deepEqual(result.checks!.filter(c => c.status === 'failed').map(c => c.ids), [['W1']]);
  });

  it('exits 1 when the prose does not compile, and writes no chart', () => {
    writeComponent(r.root, 'gate', BROKEN);
    const d = r.run(['draw', 'gate']);
    assert.equal(d.status, 1);
    assert.match(lines(d.stdout)[0], /^draw: gate · does not compile$/);
    assert.match(d.stdout, /^  M1: does not follow the Move form/m);
    assert.ok(!existsSync(join(componentDir(r.root, 'gate'), 'chart')));
    const result = JSON.parse(r.run(['draw', 'gate', '--json']).stdout) as DrawResult;
    assert.equal(result.ok, false);
    assert.ok(result.errors!.length > 0);
    assert.deepEqual(result.files, []);
  });

  it('--brief prints the summary\'s first line alone', () => {
    writeComponent(r.root, 'gate', gate());
    const brief = r.run(['draw', 'gate', '--brief']);
    assert.equal(brief.status, 0, brief.out);
    assert.match(brief.stdout, /^draw: gate · pass · (\d+) of \1 checks · \d+ states explored\n$/);
    writeComponent(r.root, 'gate', gate({ ends: 'Open' }));
    const failing = r.run(['draw', 'gate', '--brief']);
    assert.equal(failing.status, 1);
    assert.match(failing.stdout, /^draw: gate · fail · \d+ of \d+ checks · \d+ states explored\n$/, 'the failing checks are the full summary\'s to list');
    assert.equal(r.run(['draw', 'gate', '--brief', '--limit', '2']).stdout, 'draw: gate · fail · exploration exceeded 2 states: narrow the declared ranges or raise --limit\n');
  });

  it('exits 2 for an unknown component', () => {
    const d = r.run(['draw', 'nosuch']);
    assert.equal(d.status, 2);
    assert.match(d.stderr, /no component named nosuch/);
    assert.equal(r.run(['draw']).status, 2);
  });
});

describe('scaffold', () => {
  let r: Repo;
  beforeEach(() => { r = makeRepo(); });
  afterEach(() => removeRepo(r));

  it('writes the component module and cfgs once, then a .scaffold.tla beside the kept module', () => {
    writeComponent(r.root, 'gate', gate());
    const model = join(componentDir(r.root, 'gate'), 'model');
    const first = r.run(['scaffold', 'gate']);
    assert.equal(first.status, 0, first.out);
    assert.deepEqual(readdirSync(model).sort(), ['Gate.cfg', 'Gate.tla', 'Gate_W1.cfg']);
    for (const f of ['Gate.tla', 'Gate.cfg', 'Gate_W1.cfg']) assert.ok(first.stdout.includes(`wrote components/gate/model/${f}\n`), f);
    const scaffold = read(join(model, 'Gate.tla'));
    assert.match(scaffold, /MODULE Gate/);
    assert.match(scaffold, /^A1 ==/m);
    assert.match(read(join(model, 'Gate.cfg')), /^INVARIANTS TypeOK A1$/m);
    assert.match(read(join(model, 'Gate_W1.cfg')), /NotW1/);

    writeFileSync(join(model, 'Gate.tla'), scaffold + '\\* refined by hand\n');
    const second = r.run(['scaffold', 'gate']);
    assert.equal(second.status, 0, second.out);
    assert.match(second.stdout, /^Gate\.tla exists and was kept; the fresh scaffold is Gate\.scaffold\.tla for diffing$/m);
    assert.ok(second.stdout.includes('wrote components/gate/model/Gate.scaffold.tla\n'));
    assert.deepEqual(readdirSync(model).sort(), ['Gate.cfg', 'Gate.scaffold.tla', 'Gate.tla', 'Gate_W1.cfg']);
    assert.equal(read(join(model, 'Gate.tla')), scaffold + '\\* refined by hand\n', 'the hand-refined module is kept');
    assert.equal(read(join(model, 'Gate.scaffold.tla')), scaffold, 'the fresh scaffold is the same text');
  });

  it('writes a system module under model/generated/ with one cfg per cell, and prints the cells', () => {
    writeComponent(r.root, 'gate', gate());
    const dir = writeSystem(r.root, 'net', { scenarios: ['all-honest', 'public-malicious'] });
    const d = r.run(['scaffold', 'net']);
    assert.equal(d.status, 0, d.out);
    assert.match(d.stdout, /^cells: A1×all-honest A1×public-malicious$/m);
    const gen = join(dir, 'model', 'generated');
    assert.deepEqual(readdirSync(gen).sort(), ['A1_all_honest.cfg', 'A1_public_malicious.cfg', 'Net.tla']);
    for (const f of ['Net.tla', 'A1_all_honest.cfg', 'A1_public_malicious.cfg']) assert.ok(d.stdout.includes(`wrote systems/net/model/generated/${f}\n`), f);
    const tla = read(join(gen, 'Net.tla'));
    assert.match(tla, /MODULE Net/);
    assert.match(tla, /^A1 == /m);
    assert.match(tla, /Mode_public/);
    assert.match(read(join(gen, 'A1_public_malicious.cfg')), /^CONSTANT Mode_public = "malicious"$/m);
    assert.match(read(join(gen, 'A1_all_honest.cfg')), /^INVARIANTS TypeOK A1$/m);
  });

  it('refuses a component that does not compile and an unknown dossier', () => {
    writeComponent(r.root, 'gate', BROKEN);
    const d = r.run(['scaffold', 'gate']);
    assert.equal(d.status, 1);
    assert.match(d.stderr, /gate does not compile/);
    assert.ok(!existsSync(join(componentDir(r.root, 'gate'), 'model')));
    assert.equal(r.run(['scaffold', 'nosuch']).status, 2);
  });
});

describe('trial', () => {
  let r: Repo, dir: string;
  beforeEach(() => { r = makeRepo(); writeComponent(r.root, 'gate', gate()); dir = componentDir(r.root, 'gate'); });
  afterEach(() => removeRepo(r));
  const trial = (name: string, env = NO_TOOLCHAIN) => r.run(['trial', 'gate', name], { env });

  it('runs a chart call without Java: the call is consumed, its answer is published to evidence/ and bound, and the receipted bundle stays in trials/', () => {
    writeCall(r.root, 'gate', 'chart.md', CHART_CALL);
    const t = trial('chart.md');
    assert.equal(t.status, 0, t.out);
    const { id, result } = trialId(t.stdout);
    assert.equal(result, 'as-called');
    assert.match(id, TRIAL_ID);
    assert.equal(id.match(TRIAL_ID)![3], 'chart');
    assert.match(t.stdout, /^  checks: expected pass, got pass$/m);
    assert.match(t.stdout, /^  checks: (\d+) of \1 passed, \d+ states explored$/m);
    const { name, action } = answered(t.stdout);
    assert.equal(action, 'published', 'the first answer to its question');
    assert.match(name, /^chart-[0-9a-f]{6}$/, 'a chart question names no passage: the kind and six hex of the question');
    assert.match(t.stdout, new RegExp(`^  next: write evidence/${name}\\.md, then dossier verify$`, 'm'));
    assert.ok(!existsSync(join(dir, 'calls', 'chart.md')), 'the pending call is consumed');
    assert.deepEqual(bundlesOf(dir), [id]);
    const folder = join(dir, 'trials', id);
    assert.deepEqual(readdirSync(folder).sort(), ['call.md', 'output.txt', 'receipt.json', 'result.json'], 'the bundle stays local, whole');
    assert.equal(read(join(folder, 'call.md')), CHART_CALL);

    const res = JSON.parse(read(join(folder, 'result.json'))) as TrialResult;
    assert.equal(res.result, 'as-called');
    assert.equal(res.kind, 'chart');
    assert.equal(res.checker, 'chart');
    assert.equal(res.dossier, 'components/gate');
    assert.equal(res.id, id);
    assert.deepEqual(res.miscalls, []);
    assert.deepEqual(res.outcomes, { checks: 'pass' });
    assert.deepEqual(res.enabled, ['checks']);
    assert.deepEqual([...res.covers!].sort(), PASSAGES.filter(p => p !== 'T1').sort());
    const hashes = parseProse(gate()).byId;
    assert.deepEqual(res.snapshot.passages, Object.fromEntries(PASSAGES.map(p => [p, hashes[p].hash])), 'the snapshot hashes every passage');
    assert.deepEqual(res.executed, { 'prose.md': sha256(readFileSync(join(dir, 'prose.md'))) });
    assert.equal(res.versions.dossier, version);
    assert.match(res.versions.xstate, /^\d+\./);

    const receipt = JSON.parse(read(join(folder, 'receipt.json'))) as Receipt;
    assert.equal(receipt.runner, `dossier@${version}`);
    assert.equal(receipt.at, res.at);
    for (const f of ['call.md', 'result.json', 'output.txt']) assert.equal(receipt.files[f], sha256(readFileSync(join(folder, f))), `${f} hash`);
    assert.deepEqual(receipt.executed, res.executed);
    assert.equal(receipt.output.hash, sha256(readFileSync(join(folder, 'output.txt'))));
    assert.equal(receipt.output.stored, 'trial');
    assert.match(read(join(folder, 'output.txt')), /^passed S1: Shut is reachable$/m);
    const t2 = trialBundle(dir, id);
    assert.deepEqual(t2.problems, [], 'the receipt checks the local bundle\'s own files');
    assert.deepEqual(t2.stray, [], 'and the bundle holds nothing else');
    assert.equal(t2.result?.result, 'as-called');

    // The answer, at HEAD: one entry for the question, bound by its digest, with no reading yet.
    assert.deepEqual(evidenceFiles(dir), [`${name}.json`]);
    const text = read(join(dir, 'evidence', `${name}.json`));
    assert.deepEqual(manifestOf(dir).evidence, { [name]: sha256(text) }, 'integrity.json binds the entry\'s exact bytes');
    const entry = JSON.parse(text) as Entry;
    assert.equal(entry.schema, 1);
    assert.equal(entry.dossier, 'components/gate');
    assert.deepEqual(entry.question, { kind: 'chart', checker: 'chart', executes: [], expects: ['checks'], property: null, scenario: null, walk: null }, 'the question: the kind, the files other than prose.md, the expectations, no cell and no walk');
    assert.deepEqual(entry.call, { text: CHART_CALL, reach: 'the chart over locked', expect: { checks: { expect: 'pass' } }, because: 'Every state is reached and every move, refusal and walk replays as said.' }, 'the prediction, kept apart from the observation');
    assert.equal(entry.answer.result, 'as-called');
    assert.deepEqual(entry.answer.outcomes, res.outcomes);
    assert.deepEqual(entry.answer.reach, res.reach);
    assert.deepEqual([...entry.answer.covers!].sort(), [...res.covers!].sort());
    for (const local of ['command', 'cwd', 'seconds', 'exit']) assert.ok(!(local in entry.answer), `the entry leaves ${local} to the local bundle`);
    assert.deepEqual(entry.basis.snapshot, res.snapshot, 'the basis: what the answer rested on');
    assert.deepEqual(entry.basis.executed, res.executed);
    assert.deepEqual(entry.established, { trial: id, at: res.at, versions: res.versions, bundle: bundleDigest(folder) }, 'the trial that established it, and the digest of its local bundle');
    assert.equal(entry.previous, null);
    assert.equal(entry.narrowed, null);
    assert.equal(entry.replaced, null, 'the first answer to its question replaced none');
    assert.equal(answerOf(dir, id)?.name, name, 'the trial id finds the entry it established');
    const listed = componentOf(verifyJson(r.run), 'gate').answers;
    assert.deepEqual(listed.map(x => [x.entry, x.trial]), [[name, id]], 'verify lists the answer by its entry and the trial that established it');
  });

  it('runs a chart blunder, records blunder.diff, publishes its answer beside the chart\'s, and the Always it catches is checked', () => {
    assert.equal(r.run(['draw', 'gate', '--brief']).status, 0);
    writeCall(r.root, 'gate', 'chart.md', CHART_CALL);
    const chart = trial('chart.md');
    assert.equal(chart.status, 0, chart.out);
    writeBlunder(r.root, 'gate');
    writeCall(r.root, 'gate', 'blunder.md', blunderCall('R3 A1'));
    const t = trial('blunder.md');
    assert.equal(t.status, 0, t.out);
    const { id, result } = trialId(t.stdout);
    assert.equal(result, 'as-called');
    assert.equal(id.match(TRIAL_ID)![3], 'blunder');
    assert.match(t.stdout, /^  checks: expected fail, got fail$/m);
    const folder = join(dir, 'trials', id);
    assert.deepEqual(readdirSync(folder).sort(), ['blunder.diff', 'call.md', 'output.txt', 'receipt.json', 'result.json']);
    assert.match(read(join(folder, 'blunder.diff')), /^~ M1\.guard: .* -> null$/m);
    const res = JSON.parse(read(join(folder, 'result.json'))) as TrialResult;
    assert.equal(res.kind, 'blunder');
    assert.equal(res.checker, 'chart');
    assert.deepEqual(res.outcomes, { checks: 'fail' });
    for (const p of ['R3', 'A1']) assert.ok(res.failing!.includes(p), `${p} fails with the guard gone`);
    assert.deepEqual(res.executed, { 'chart/blunders/x.json': sha256(readFileSync(join(dir, 'chart', 'blunders', 'x.json'))) });
    assert.deepEqual(trialBundle(dir, id).problems, []);
    // Another question, so another entry: the blunder's answer does not replace the chart's.
    const { name, action } = answered(t.stdout);
    assert.equal(action, 'published');
    assert.match(name, /^blunder-[0-9a-f]{6}$/);
    assert.notEqual(name, answered(chart.stdout).name);
    assert.deepEqual(evidenceFiles(dir), [`${answered(chart.stdout).name}.json`, `${name}.json`].sort());
    const entry = entryAt(dir, name);
    assert.deepEqual(entry.question.executes, ['chart/blunders/x.json']);
    assert.deepEqual(entry.answer.failing, res.failing, 'what the blunder broke is in the answer');
    assert.equal(entry.established.trial, id);
    assert.equal(manifestOf(dir).evidence[name], sha256(read(join(dir, 'evidence', `${name}.json`))));
    const marks = marksOf(verifyJson(r.run), 'gate');
    assert.equal(marks.A1, 'checked', 'a chart trial plus a caught chart blunder checks the Always of a charted piece');
    assert.ok(!flagNames(componentOf(verifyJson(r.run), 'gate')).includes('blunder owed'), 'the blunder is no longer owed');
    assert.equal(marks.M1, 'checked');
  });

  it('reports a miscall with exit 1, and verify trips until the answer\'s reading classifies it', () => {
    writeCall(r.root, 'gate', 'miscall.md', MISCALL);
    const t = trial('miscall.md');
    assert.equal(t.status, 1, t.out);
    const { id, result } = trialId(t.stdout);
    assert.equal(result, 'miscalled');
    assert.match(t.stdout, /^  miscalls: checks: expected fail Z9, got pass$/m);
    const { name, action } = answered(t.stdout);
    assert.equal(action, 'published', 'a miscall is published as any answer is');
    assert.match(t.stdout, new RegExp(`^  next: write evidence/${name}\\.md with the retelling and a classification, then dossier verify$`, 'm'));
    const folder = join(dir, 'trials', id);
    const res = JSON.parse(read(join(folder, 'result.json'))) as TrialResult;
    assert.equal(res.result, 'miscalled');
    assert.deepEqual(res.miscalls, ['checks: expected fail Z9, got pass']);
    assert.ok(existsSync(join(folder, 'receipt.json')), 'a miscall is receipted too');
    assert.equal(entryAt(dir, name).answer.result, 'miscalled');
    assert.deepEqual(entryAt(dir, name).answer.miscalls, ['checks: expected fail Z9, got pass']);
    const v = r.run(['verify', '--brief']);
    assert.equal(v.status, 1);
    assert.match(v.stdout, new RegExp(`miscall unclassified \\(Gate: evidence/${name}\\.json\\)`));
    writeFileSync(join(folder, 'reading.md'), 'retelling: every check passed.\nclassification: call was wrong\n');
    assert.equal(r.run(['verify', '--brief']).status, 1, 'a reading left in the local bundle is no reading of the answer');
    rmSync(join(folder, 'reading.md'));
    writeFileSync(join(dir, 'evidence', `${name}.md`), 'retelling: every check passed; the call expected Z9 to fail, which is no passage.\nclassification: call was wrong\n');
    assert.equal(r.run(['verify', '--brief']).status, 0, 'a classified miscall no longer trips');
  });

  it('writes nothing for a rerun that gives the recorded answer: the call is consumed, the bundle stays local, and evidence/ and integrity.json stay as they were', () => {
    writeCall(r.root, 'gate', 'chart.md', CHART_CALL);
    const first = trial('chart.md');
    assert.equal(first.status, 0, first.out);
    const { id } = trialId(first.stdout);
    const { name } = answered(first.stdout);
    writeFileSync(join(dir, 'evidence', `${name}.md`), 'Every check passed over the declared ranges.\n');
    const record = recordOf(dir);
    const ids = [id];
    for (const n of [1, 2]) {
      // A call worded otherwise, at the same reach: the same question, asked again.
      writeCall(r.root, 'gate', 'chart.md', CHART_CALL.replace('Every state is reached', `Asked again (${n}): every state is reached`));
      const again = trial('chart.md');
      assert.equal(again.status, 0, again.out);
      ids.push(trialId(again.stdout).id);
      const kept = answered(again.stdout);
      assert.deepEqual([kept.name, kept.action], [name, 'kept']);
      assert.match(kept.reason!, /same answer on an unchanged basis/);
      assert.doesNotMatch(again.stdout, /next: write/, 'the recorded reading stands');
      assert.ok(!existsSync(join(dir, 'calls', 'chart.md')), 'a confirmed answer consumes its call');
    }
    assert.deepEqual(bundlesOf(dir), [...ids].sort(), 'each trial\'s bundle stays local');
    assert.deepEqual(recordOf(dir), record, 'the entry, its reading and integrity.json are unchanged, bytes and modification times alike');
    assert.equal(entryAt(dir, name).established.trial, id, 'the answer still stands for the trial that established it');
  });

  it('replaces the answer once its basis moved, though the verdict is the same, and records the trial it replaced and what had moved', () => {
    writeCall(r.root, 'gate', 'chart.md', CHART_CALL);
    const first = trial('chart.md');
    assert.equal(first.status, 0, first.out);
    const { id } = trialId(first.stdout);
    const { name } = answered(first.stdout);
    writeFileSync(join(dir, 'evidence', `${name}.md`), 'Every check passed over the declared ranges.\n');
    // S1's words change, and the chart passes as before: the same answer on a basis that moved.
    writeComponent(r.root, 'gate', gate().replace('[S1] Shut: the gate is closed.', '[S1] Shut: the gate is closed and still.'));
    writeCall(r.root, 'gate', 'chart.md', CHART_CALL.replace('Every state is reached', 'After the edit: every state is reached'));
    const again = trial('chart.md');
    assert.equal(again.status, 0, again.out);
    assert.deepEqual(answered(again.stdout), { name, action: 'replaced the recorded answer', reason: null });
    const entry = entryAt(dir, name);
    assert.equal(entry.established.trial, trialId(again.stdout).id);
    assert.deepEqual(entry.replaced, { trial: id, moved: ['prose'] }, 'the trial whose answer it replaced, and what had moved under that answer');
    assert.equal(entry.previous, null, 'the verdict and the outcomes are the same, so there is no previous answer to keep');
    assert.deepEqual(evidenceFiles(dir), [`${name}.json`], 'the replaced answer\'s reading goes with it');
  });

  it('refuses to replace an unclassified miscall, with exit 2 and the call pending; once classified, the new answer replaces it and keeps it as previous', () => {
    writeCall(r.root, 'gate', 'miscall.md', MISCALL);
    const first = trial('miscall.md');
    assert.equal(first.status, 1, first.out);
    const { id: miscalled } = trialId(first.stdout);
    const { name } = answered(first.stdout);
    const record = recordOf(dir);
    writeCall(r.root, 'gate', 'chart.md', CHART_CALL);
    const refused = trial('chart.md');
    assert.equal(refused.status, 2, refused.out);
    const { id } = trialId(refused.stdout);
    assert.equal(trialId(refused.stdout).result, 'as-called', 'the trial itself completed');
    const refusal = answered(refused.stdout);
    assert.deepEqual([refusal.name, refusal.action], [name, 'refused']);
    assert.match(refusal.reason!, /miscall whose reading has no classification/);
    assert.match(refused.stdout, new RegExp(`^  the bundle stays in trials/${id}/, and the call stays pending$`, 'm'));
    assert.ok(existsSync(join(dir, 'calls', 'chart.md')), 'a refused answer consumes nothing');
    assert.deepEqual(bundlesOf(dir), [id, miscalled].sort(), 'its bundle is kept locally all the same');
    assert.deepEqual(recordOf(dir), record, 'evidence/ and integrity.json are untouched, byte for byte');
    assert.ok(!existsSync(join(dir, '.running')), 'nothing waits for publication');

    writeFileSync(join(dir, 'evidence', `${name}.md`), 'retelling: every check passed; the call expected Z9 to fail.\nclassification: call was wrong\n');
    writeCall(r.root, 'gate', 'chart.md', CHART_CALL.replace('Every state is reached', 'Classified, so asked again: every state is reached'));
    const replaced = trial('chart.md');
    assert.equal(replaced.status, 0, replaced.out);
    assert.deepEqual(answered(replaced.stdout), { name, action: 'replaced the recorded answer', reason: null });
    assert.ok(!existsSync(join(dir, 'calls', 'chart.md')), 'a published answer consumes its call');
    const entry = entryAt(dir, name);
    assert.equal(entry.answer.result, 'as-called');
    assert.equal(entry.established.trial, trialId(replaced.stdout).id);
    assert.equal(entry.previous?.answer.result, 'miscalled', 'the last answer that differed');
    assert.equal(entry.previous?.established.trial, miscalled);
    assert.equal(entry.previous?.classification, 'call was wrong', 'its classification moves with it');
    assert.deepEqual(entry.replaced, { trial: miscalled, moved: [] }, 'it replaced the miscall on a basis that had not moved');
    assert.deepEqual(evidenceFiles(dir), [`${name}.json`], 'the replaced answer\'s reading goes with it');
    const v = r.run(['verify', '--brief']);
    assert.equal(v.status, 0, v.out);
  });

  it('aborts a chart trial whose exploration passes --limit, keeps the reason in its output, writes its answer only for a question with no entry, and verify flags that answer unrun', () => {
    writeCall(r.root, 'gate', 'chart.md', CHART_CALL);
    const t = r.run(['trial', 'gate', 'chart.md', '--limit', '2'], { env: NO_TOOLCHAIN });
    assert.equal(t.status, 3, t.out);
    const { id, result } = trialId(t.stdout);
    assert.equal(result, 'aborted');
    const reason = 'exploration exceeded 2 states: narrow the declared ranges or raise --limit';
    assert.ok(t.stdout.startsWith(`trial: ${id} · aborted · ${reason}\n`), t.stdout);
    const { name, action } = answered(t.stdout);
    assert.equal(action, 'published', 'the question has no answer yet');
    assert.ok(!existsSync(join(dir, 'calls', 'chart.md')), 'a published answer consumes its call, aborted or not');
    const folder = join(dir, 'trials', id);
    assert.equal(read(join(folder, 'output.txt')), `${reason}\n`);
    const res = JSON.parse(read(join(folder, 'result.json'))) as TrialResult;
    assert.deepEqual([res.result, res.reason, res.limitHit, res.checks], ['aborted', reason, true, undefined]);
    assert.deepEqual(trialBundle(dir, id).problems, [], 'receipted as any trial is');
    assert.deepEqual([entryAt(dir, name).answer.result, entryAt(dir, name).answer.reason], ['aborted', reason]);
    let c = componentOf(verifyJson(r.run), 'gate');
    assert.deepEqual(c.tripwires, [], 'an exploration cut short is no miscall to classify');
    assert.ok(c.flags.some(f => f.name === 'unrun' && f.where === `evidence/${name}.json: ${reason}`), JSON.stringify(c.flags));
    assert.equal(c.marks.S1.mark, 'pending', 'it covers nothing');
    writeCall(r.root, 'gate', 'chart.md', CHART_CALL.replace('reach: the chart over locked', 'reach: the chart over locked, whole'));
    const whole = r.run(['trial', 'gate', 'chart.md'], { env: NO_TOOLCHAIN });
    assert.equal(whole.status, 0, 'the default limit is wide enough');
    assert.deepEqual(answered(whole.stdout), { name, action: 'replaced the recorded answer', reason: null }, 'the same question, now answered');
    assert.equal(entryAt(dir, name).previous, null, 'an aborted answer never becomes previous');
    assert.deepEqual(entryAt(dir, name).replaced, { trial: id, moved: [] }, 'though the entry records the trial it replaced');
    c = componentOf(verifyJson(r.run), 'gate');
    assert.ok(!flagNames(c).includes('unrun'), 'a completed answer replaces it');
    assert.equal(c.marks.S1.mark, 'checked');

    // An aborted trial never replaces a completed answer, and a call it could not answer stays pending.
    const record = recordOf(dir);
    writeCall(r.root, 'gate', 'chart.md', CHART_CALL.replace('Every state is reached', 'Cut short again: every state is reached'));
    const again = r.run(['trial', 'gate', 'chart.md', '--limit', '2'], { env: NO_TOOLCHAIN });
    assert.equal(again.status, 3, again.out);
    const kept = answered(again.stdout);
    assert.deepEqual([kept.name, kept.action], [name, 'kept']);
    assert.match(kept.reason!, /aborted trial never replaces a recorded answer/);
    assert.ok(existsSync(join(dir, 'calls', 'chart.md')), 'the call stays pending');
    assert.ok(existsSync(join(dir, 'trials', trialId(again.stdout).id)), 'its bundle stays local');
    assert.deepEqual(recordOf(dir), record, 'evidence/ and integrity.json are untouched');
  });

  it('refuses a malformed call with exit 2 and leaves no bundle and no answer', () => {
    writeCall(r.root, 'gate', 'bad.md', MALFORMED);
    const record = recordOf(dir);
    const t = trial('bad.md');
    assert.equal(t.status, 2);
    assert.match(t.stderr, /^dossier trial: refused\n  because: is empty/);
    assert.equal(t.stdout, '');
    assert.ok(!existsSync(join(dir, 'trials')), 'nothing is written');
    assert.ok(!existsSync(join(dir, 'evidence')), 'no answer is published');
    assert.deepEqual(recordOf(dir), record, 'integrity.json is untouched');
    assert.ok(existsSync(join(dir, 'calls', 'bad.md')), 'the call stays pending');
    const absent = trial('nosuch.md');
    assert.equal(absent.status, 2);
    assert.match(absent.stderr, /no call file nosuch\.md/);
    assert.equal(r.run(['trial', 'nosuch', 'chart.md']).status, 2);
  });

  it('refuses a tlc call when TLA_TOOLS is unset or dangling', () => {
    assert.equal(r.run(['scaffold', 'gate']).status, 0);
    writeCall(r.root, 'gate', 'tlc.md', TLC_CALL);
    const unset = trial('tlc.md', without('TLA_TOOLS'));
    assert.equal(unset.status, 2, unset.out);
    assert.match(unset.stderr, /^dossier trial: refused\n  TLA_TOOLS is not set; point it at tla2tools\.jar/);
    const dangling = trial('tlc.md', { ...baseEnv, TLA_TOOLS: join(r.repo, 'no.jar') });
    assert.equal(dangling.status, 2, dangling.out);
    assert.match(dangling.stderr, /TLA_TOOLS points at .*no\.jar, which does not exist/);
    assert.ok(!existsSync(join(dir, 'trials')), 'nothing is written');
    assert.ok(!existsSync(join(dir, 'evidence')), 'no answer is published');
    assert.ok(existsSync(join(dir, 'calls', 'tlc.md')), 'the call stays pending');
  });

  it('refuses an option that is not a whole number before the call moves', () => {
    writeCall(r.root, 'gate', 'chart.md', CHART_CALL);
    for (const [args, message] of [
      [['--timeout', 'abc'], '--timeout takes a whole number of seconds above 0, not "abc"'],
      [['--timeout', '0'], '--timeout takes a whole number of seconds above 0, not "0"'],
      [['--workers', 'many'], '--workers takes a whole number above 0, or auto, not "many"'],
      [['--limit', '-5'], '--limit takes a whole number of states above 0, not "-5"'],
      [['--limit'], '--limit takes a whole number of states above 0'],
    ] as [string[], string][]) {
      const t = r.run(['trial', 'gate', 'chart.md', ...args], { env: NO_TOOLCHAIN });
      assert.equal(t.status, 2, t.out);
      assert.equal(t.stderr, `dossier trial: refused\n  ${message}\n`);
    }
    assert.ok(!existsSync(join(dir, 'trials')), 'nothing is written');
    assert.ok(!existsSync(join(dir, 'evidence')), 'no answer is published');
    assert.ok(existsSync(join(dir, 'calls', 'chart.md')), 'the call stays pending');
  });

  it('refuses a folder named as the call', () => {
    mkdirSync(join(dir, 'calls', 'chart.md'), { recursive: true });
    const t = trial('chart.md');
    assert.equal(t.status, 2, t.out);
    assert.equal(t.stderr, 'dossier trial: chart.md is a folder, not a call file\n');
  });

  it('refuses a retired dossier, and runs again once begin reopens it', () => {
    writeCall(r.root, 'gate', 'chart.md', CHART_CALL);
    assert.equal(r.run(['decide', 'gate', 'retire', '--', 'replaced by the new gate']).status, 0);
    const t = trial('chart.md');
    assert.equal(t.status, 2, t.out);
    assert.equal(t.stderr, 'dossier trial: components/gate is retired; dossier decide components/gate begin reopens it\n');
    assert.ok(existsSync(join(dir, 'calls', 'chart.md')), 'the call stays pending');
    const retired = read(join(dir, 'decisions.log')).trim();
    assert.equal(r.run(['decide', 'gate', 'begin', 'charted', '--', 'back']).status, 0);
    assert.ok(read(join(dir, 'decisions.log')).startsWith(retired + '\n'), 'reopening preserves the committed retirement');
    assert.equal(trial('chart.md').status, 0);
  });

  it('refuses a dossier.json that does not parse', () => {
    writeCall(r.root, 'gate', 'chart.md', CHART_CALL);
    writeFileSync(join(r.root, 'dossier.json'), '{ "plugin": ');
    const t = trial('chart.md');
    assert.equal(t.status, 2, t.out);
    assert.match(t.stderr, /^dossier trial: refused\n  dossier\.json does not parse: /);
    assert.ok(existsSync(join(dir, 'calls', 'chart.md')), 'the call stays pending');
  });

  it('refuses a path that leaves the dossier, and reads nothing there', () => {
    writeComponent(r.root, 'other', gate({ title: 'Other', module: 'other' }));
    writeCall(r.root, 'gate', 'escape.md', CHART_CALL.replace('  - prose.md', '  - prose.md\n  - ../other/prose.md'));
    const t = trial('escape.md');
    assert.equal(t.status, 2, t.out);
    assert.equal(t.stderr, 'dossier trial: refused\n  executes names ../other/prose.md, which is outside the dossier\n');
  });

  it('runs in a folder verify does not read, lands in trials/ whole with nothing left behind, and verify never reads the bundle there', () => {
    writeCall(r.root, 'gate', 'chart.md', CHART_CALL);
    const t = trial('chart.md');
    assert.equal(t.status, 0, t.out);
    const { id } = trialId(t.stdout);
    assert.deepEqual(readdirSync(join(dir, 'trials', id)).sort(), ['call.md', 'output.txt', 'receipt.json', 'result.json']);
    assert.ok(!existsSync(join(dir, '.running')), 'the trial\'s staging folder is gone once its answer is published');
    // A run in progress, as a concurrent verify finds it: invisible.
    mkdirSync(join(dir, '.running', `${id.slice(0, 15)}-tlc-abcdef`), { recursive: true });
    writeFileSync(join(dir, '.running', `${id.slice(0, 15)}-tlc-abcdef`, 'call.md'), TLC_CALL);
    const v = r.run(['verify', '--brief']);
    assert.equal(v.status, 0, v.out);
    rmSync(join(dir, '.running'), { recursive: true });
    // The bundle is no record: an edited or a deleted bundle changes no conclusion.
    const before = verifyJson(r.run);
    writeFileSync(join(dir, 'trials', id, 'result.json'), '{ "result": "edited" }\n');
    assert.deepEqual(verifyJson(r.run), before, 'an edited bundle changes nothing verify says');
    rmSync(join(dir, 'trials'), { recursive: true });
    assert.deepEqual(verifyJson(r.run), before, 'nor does a deleted one');
  });

  it('writes output.txt without the paths of the machine, a root reached through a symbolic link among them, or what TLC\'s banner says of the machine', () => {
    assert.equal(r.run(['scaffold', 'gate']).status, 0);
    writeCall(r.root, 'gate', 'tlc.md', TLC_CALL);
    // A stand-in for TLC that prints the paths it was given and the real one, and TLC's banner.
    const java = join(r.repo, 'java');
    writeFileSync(java, ['#!/bin/sh', 'echo "args $*"', 'echo "Parsing file $(pwd -P)/Gate.tla"', 'echo "Running breadth-first search Model-Checking with fp 87 and seed 1 with 1 worker on 10 cores with 3641MB heap and 64MB offheap memory [pid: 37753] (Mac OS X 26.7.2 aarch64, Eclipse Adoptium 21.0.13 x86_64, MSBDiskFPSet, DiskStateQueue)."'].join('\n') + '\n');
    chmodSync(java, 0o755);
    const link = join(tmpdir(), `dossier-link-${process.pid}-${Date.now()}`);
    symlinkSync(r.repo, link);
    try {
      const t = dossier(['trial', '--root', join(link, 'dossiers'), 'gate', 'tlc.md'], { cwd: link, env: { ...NO_TOOLCHAIN, JAVA: java, TLA_TOOLS: join(pluginRoot, 'qualification', 'tests', 'recorded', 'versions.txt') } });
      assert.equal(t.status, 3, t.out);
      const { id } = trialId(t.stdout);
      const output = read(join(dir, 'trials', id, 'output.txt'));
      assert.ok(output.includes('Parsing file $INPUTS/model/Gate.tla\n'), output);
      assert.ok(output.includes(' -metadir $TRIAL/states '), output);
      assert.ok(output.includes('with 1 worker on $CORES cores with $HEAP heap and 64MB offheap memory [pid: $PID] ($OS, $JDK_VENDOR 21.0.13 $JDK_ARCH, MSBDiskFPSet, DiskStateQueue).'), output);
      for (const path of [r.repo, realpathSync(r.repo), link]) assert.ok(!output.includes(path), `output.txt names ${path}`);
      const result = JSON.parse(read(join(dir, 'trials', id, 'result.json'))) as TrialResult;
      assert.ok((result.command as string[]).every(a => !a.includes(r.repo) && !a.includes(link) && !a.includes(realpathSync(r.repo))), JSON.stringify(result.command));
      // The run aborted, so its answer was published only because the question had none. The entry,
      // which version control keeps, holds no command line, working directory or machine path at all.
      const { name, action } = answered(t.stdout);
      assert.equal(action, 'published');
      const entry = read(join(dir, 'evidence', `${name}.json`));
      for (const local of ['command', 'cwd', 'seconds']) assert.ok(!(local in (JSON.parse(entry) as Entry).answer), `the entry leaves ${local} to the local bundle`);
      // The temporary folder holds the repository, the link and the trial's private copies of its inputs.
      for (const path of [r.repo, realpathSync(r.repo), link, tmpdir(), realpathSync(tmpdir()), pluginRoot]) assert.ok(!entry.includes(path), `the entry names ${path}`);
    } finally { unlinkSync(link); }
  });
});

// A copy of Harbor as a clone has it: the dossiers, with the knowledge base, the stand-in deployment
// and the replay runner beside them, and no local bundles.
function copyHarbor() {
  const work = mkdtempSync(join(tmpdir(), 'dossier-harbor-'));
  cpSync(join(pluginRoot, 'qualification', 'fixture'), work, { recursive: true });
  const root = join(work, 'dossiers');
  return { work, root, run: at(root) };
}
// A stand-in for a checker's executable, such as the JVM, written into a folder of the copy.
function standIn(dir: string, name: string, body: string) {
  const path = join(dir, name);
  writeFileSync(path, `#!/bin/sh\n${body}\n`);
  chmodSync(path, 0o755);
  return path;
}
// Any file serves as TLC's jar when a stand-in plays the JVM.
const ANY_JAR = join(pluginRoot, 'qualification', 'tests', 'recorded', 'versions.txt');
const recordedTlc = (name: string) => join(pluginRoot, 'qualification', 'tests', 'recorded', 'tlc', name);
// The names of a dossier's entries in evidence/.
const answersIn = (dir: string) => readdirSync(join(dir, 'evidence')).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5)).sort();

// ANSWER-RECHECK: recheck asks the question of every current entry again, privately, compares the
// verdict, the outcomes and the reach, and writes nothing. Each test runs on its own copy of Harbor.
// Token's four answers are a chart, a TLC run, a TLC blunder and the replay runner's.
describe('recheck', () => {
  let work: string, root: string, run: Run;
  beforeEach(() => { ({ work, root, run } = copyHarbor()); });
  afterEach(() => rmSync(work, { recursive: true, force: true }));
  const solver = { skip: !(process.env.TLA_TOOLS && existsSync(process.env.TLA_TOOLS)) && 'TLA_TOOLS is not set: recheck asks TLC again; the cases that need no solver still run' };
  const jar = ANY_JAR;
  const token = () => join(root, 'components', 'token');
  const answers = answersIn;
  const answerNamed = (kind: string) => { const name = answers(token()).find(n => n.startsWith(`${kind}-`)); assert.ok(name, `token has a ${kind} answer`); return name; };
  // The line recheck prints for an entry: same, different or not run, and what follows.
  const said = (stdout: string, name: string, ref = 'components/token') => {
    const m = stdout.match(new RegExp(`^(same|different|not run): ${ref}/evidence/${name}\\.json · (.*)$`, 'm'));
    assert.ok(m, `a line for ${ref}/evidence/${name}.json in: ${stdout}`);
    return { verdict: m[1], rest: m[2] };
  };
  const summary = (stdout: string) => lines(stdout).at(-1);
  // Every entry of a dossier came back the same, its line restating the recorded verdict and outcomes.
  function allSame(stdout: string, ref: string) {
    const dir = join(root, ref), names = answers(dir);
    for (const name of names) {
      const line = said(stdout, name, ref), recorded = entryAt(dir, name).answer;
      assert.equal(line.verdict, 'same', `${ref}/${name}: ${line.rest}`);
      assert.ok(line.rest.startsWith(`${recorded.result}, `), `${name} restates the recorded verdict: ${line.rest}`);
      for (const [passage, outcome] of Object.entries(recorded.outcomes)) assert.ok(line.rest.includes(`${passage} ${outcome}`), `${name}: ${passage} ${outcome}`);
    }
    return names;
  }

  it('asks every current answer\'s question again and finds each the same: exit 0, no call consumed, and the copy unchanged to the byte and the modification time', solver, () => {
    const names = answers(token());
    assert.deepEqual([...new Set(names.map(n => n.split('-')[0]))].sort(), ['blunder', 'chart', 'external', 'tlc']);
    // A pending call in the very words of a recorded question: recheck asks it, and consumes nothing.
    const tlc = answerNamed('tlc');
    mkdirSync(join(token(), 'calls'), { recursive: true });
    writeFileSync(join(token(), 'calls', 'tlc.md'), entryAt(token(), tlc).call.text);
    const before = fingerprint(work);
    const c = run(['recheck', 'token']);
    assert.equal(c.status, 0, c.out);
    allSame(c.stdout, 'components/token');
    assert.equal(summary(c.stdout), `recheck: ${names.length} same, 0 different, 0 not run`);
    assert.deepEqual(fingerprint(work), before, 'recheck writes nothing');
  });

  it('asks every current answer of a system again, the cells\' TLC answers, an Apalache answer and the blunders\', and finds each the same: exit 0, and the copy unchanged', { skip: !(process.env.TLA_TOOLS && existsSync(process.env.TLA_TOOLS) && process.env.APALACHE && existsSync(process.env.APALACHE)) && 'TLA_TOOLS or APALACHE is not set: a recheck of upkeep asks TLC and Apalache again' }, () => {
    const names = answersIn(join(root, 'systems', 'upkeep'));
    assert.deepEqual([...new Set(names.map(n => n.split('-')[0]))].sort(), ['apalache', 'blunder', 'tlc']);
    assert.ok(names.some(n => /-(lanes-offline|lane-a-captured|lanes-down-two)-/.test(n)), 'among them cells that are violated');
    const before = fingerprint(work);
    const c = run(['recheck', 'upkeep']);
    assert.equal(c.status, 0, c.out);
    allSame(c.stdout, 'systems/upkeep');
    assert.equal(summary(c.stdout), `recheck: ${names.length} same, 0 different, 0 not run`);
    assert.deepEqual(fingerprint(work), before, 'recheck writes nothing');
  });

  it('asks Alloy\'s answers again with the rest of a component, a check and a blunder among them, and finds each the same: exit 0, and the copy unchanged', { skip: !(process.env.TLA_TOOLS && existsSync(process.env.TLA_TOOLS) && process.env.ALLOY_JAR && existsSync(process.env.ALLOY_JAR)) && 'TLA_TOOLS or ALLOY_JAR is not set: a recheck of breaker asks TLC and Alloy again' }, () => {
    const breaker = join(root, 'components', 'breaker');
    const names = answersIn(breaker);
    const questions = names.map(n => `${entryAt(breaker, n).question.kind} by ${entryAt(breaker, n).question.checker}`);
    for (const question of ['alloy by alloy', 'blunder by alloy', 'chart by chart', 'tlc by tlc', 'blunder by tlc']) assert.ok(questions.includes(question), `breaker asks a ${question}: ${questions.join(', ')}`);
    const before = fingerprint(work);
    const c = run(['recheck', 'breaker']);
    assert.equal(c.status, 0, c.out);
    allSame(c.stdout, 'components/breaker');
    assert.equal(summary(c.stdout), `recheck: ${names.length} same, 0 different, 0 not run`);
    assert.deepEqual(fingerprint(work), before, 'recheck writes nothing, Alloy\'s instances included');
  });

  it('reports an answer the checker no longer gives as different, with exit 1, while the entry stays bound and current, and writes nothing', () => {
    // The replay runner tries token's walk against the stand-in deployment, which no answer's basis
    // holds. Here burn leaves one HRD behind, so W1 no longer ends with the supply at 0.
    const deployment = join(work, 'protocol', 'harbor.mjs');
    const burn = "case 'token.burn': if (a > t.supply) revert('insufficient supply'); t.supply -= a; return;";
    assert.ok(read(deployment).includes(burn), 'the stand-in deployment burns as Harbor\'s walks expect');
    writeFileSync(deployment, read(deployment).replace(burn, burn.replace('t.supply -= a;', 't.supply -= a - 1;')));
    const external = answerNamed('external');
    const before = fingerprint(work);
    const c = run(['recheck', 'token'], { env: NO_TOOLCHAIN });
    assert.equal(c.status, 1, c.out);
    const line = said(c.stdout, external);
    assert.equal(line.verdict, 'different');
    assert.match(line.rest, /^recorded as-called, W1 pass\b.*; now miscalled, W1 fail\b/);
    assert.match(summary(c.stdout)!, /^recheck: \d+ same, 1 different, \d+ not run$/);
    assert.deepEqual(fingerprint(work), before, 'recheck writes nothing, even on a difference');
    const json = verifyJson(run);
    assert.deepEqual(componentOf(json, 'token').tripwires, [], 'the entry is still bound: the difference is the checker\'s, not a damaged record\'s');
    assert.ok(componentOf(json, 'token').answers.some(t => t.entry === external && t.result === 'as-called'), 'and verify still reads the recorded answer');
  });

  it('reports as different a hand-made answer the runner published, once TLC asks the question again', solver, () => {
    // A stand-in that prints a recorded TLC violation: the runner publishes what the checker says, and
    // on an unchanged basis the new answer replaces the recorded one, since it drops no violation.
    const java = standIn(work, 'java', `cat '${recordedTlc('loose-A1.txt')}'`);
    const tlc = answerNamed('tlc');
    const recordedTrial = entryAt(token(), tlc).established.trial;
    mkdirSync(join(token(), 'calls'), { recursive: true });
    writeFileSync(join(token(), 'calls', 'tlc.md'), entryAt(token(), tlc).call.text);
    const t = run(['trial', 'token', 'tlc.md'], { env: { ...baseEnv, JAVA: java } });
    assert.equal(t.status, 1, t.out);
    assert.deepEqual(answered(t.stdout), { name: tlc, action: 'replaced the recorded answer', reason: null });
    assert.deepEqual([entryAt(token(), tlc).answer.result, entryAt(token(), tlc).answer.outcomes.A1], ['miscalled', 'violated']);
    assert.deepEqual(entryAt(token(), tlc).replaced, { trial: recordedTrial, moved: [] }, 'on a basis that had not moved');
    const before = fingerprint(work);
    const c = run(['recheck', 'token']);
    assert.equal(c.status, 1, c.out);
    const line = said(c.stdout, tlc);
    assert.equal(line.verdict, 'different');
    assert.match(line.rest, /^recorded miscalled, .*\bA1 violated\b.*; now as-called, .*\bA1 holds\b/);
    assert.match(summary(c.stdout)!, /^recheck: 3 same, 1 different, 0 not run$/);
    assert.deepEqual(fingerprint(work), before, 'recheck writes nothing');
  });

  it('lists a lapsed answer as not run, never as different, exits 0 and writes nothing', () => {
    // The module the TLC question executes changes after its answer was published.
    const module = join(token(), 'model', 'Token.tla');
    writeFileSync(module, `${read(module)}\\* edited after the answer was published\n`);
    const tlc = answerNamed('tlc');
    const before = fingerprint(work);
    const c = run(['recheck', 'token'], { env: NO_TOOLCHAIN });
    assert.equal(c.status, 0, c.out);
    const line = said(c.stdout, tlc);
    assert.equal(line.verdict, 'not run');
    assert.match(line.rest, /^lapsed\b/);
    assert.match(summary(c.stdout)!, /^recheck: \d+ same, 0 different, \d+ not run$/);
    assert.deepEqual(fingerprint(work), before, 'recheck writes nothing');
  });

  // Recheck asks again every entry whose answer has not lapsed, and runs none whose answer has: an
  // answer has lapsed when its own basis moved (ANSWER-RECHECK, ANSWER-VIOLATION). The next two tests
  // hold that decision to each entry's basis, not to the marks it shares with other answers.
  it('asks again an answer whose own basis is unchanged, though passages it covers lapsed under another answer', () => {
    // The module only the TLC question executes changes. The chart's answer rests on the prose alone.
    const module = join(token(), 'model', 'Token.tla');
    writeFileSync(module, `${read(module)}\\* edited after the answer was published\n`);
    const chart = answerNamed('chart');
    assert.deepEqual(Object.keys(entryAt(token(), chart).basis.executed), ['prose.md'], 'the chart executes no model file');
    const c = run(['recheck', 'token'], { env: NO_TOOLCHAIN });
    assert.equal(c.status, 0, c.out);
    assert.equal(said(c.stdout, answerNamed('tlc')).verdict, 'not run');
    const line = said(c.stdout, chart);
    assert.equal(line.verdict, 'same', `the chart's answer has not lapsed, so recheck asks it again: ${line.rest}`);
  });

  it('lists a lapsed answer without running its checker', () => {
    // A stand-in for the JVM that logs every start: a checker recheck runs leaves a line.
    const log = join(work, 'java.log');
    const java = standIn(work, 'java', `echo "$*" >> '${log}'`);
    // A1's words change, and the chart, the TLC question on A1 and the blunder aimed at A1 all rest on them.
    const prose = join(token(), 'prose.md');
    assert.ok(read(prose).includes('[A1] Always, {supply <= 4}.'));
    writeFileSync(prose, read(prose).replace('[A1] Always, {supply <= 4}.', '[A1] Always, {supply < 5}.'));
    const lapsed = ['chart', 'tlc', 'blunder'].map(answerNamed);
    const c = run(['recheck', 'token'], { env: { ...NO_TOOLCHAIN, JAVA: java, TLA_TOOLS: jar } });
    assert.equal(c.status, 0, c.out);
    for (const name of lapsed) {
      const line = said(c.stdout, name);
      assert.deepEqual([line.verdict, line.rest.split(/[;:]/)[0]], ['not run', 'lapsed'], `${name}: ${line.rest}`);
    }
    assert.equal(said(c.stdout, answerNamed('external')).verdict, 'same');
    assert.ok(!existsSync(log), `ANSWER-RECHECK lists lapsed entries without running them, yet a checker ran: ${existsSync(log) ? read(log) : ''}`);
  });

  it('lists as not run, never as different, an aborted answer, a question gone, a runner the marker does not configure and a checker this machine lacks', () => {
    const tlc = answerNamed('tlc'), blunder = answerNamed('blunder'), external = answerNamed('external'), chart = answerNamed('chart');
    // An aborted answer, published because its question had none: a second configuration that a
    // silent stand-in for the JVM never answered.
    const silent = standIn(work, 'java', 'exit 0');
    cpSync(join(token(), 'model', 'Token.cfg'), join(token(), 'model', 'Token_more.cfg'));
    mkdirSync(join(token(), 'calls'), { recursive: true });
    writeFileSync(join(token(), 'calls', 'more.md'), 'kind: tlc\nexecutes:\n  - model/Token.tla\n  - model/Token_more.cfg\nreach: amounts up to 2; supply up to 4\nexpect:\n  TypeOK: holds\n  A1: holds\nbecause: |\n  A second configuration, the same bounds.\n');
    const t = run(['trial', 'token', 'more.md'], { env: { ...NO_TOOLCHAIN, JAVA: silent, TLA_TOOLS: jar } });
    assert.equal(t.status, 3, t.out);
    const aborted = answered(t.stdout);
    assert.equal(aborted.action, 'published');
    assert.ok(![tlc, blunder, external, chart].includes(aborted.name), 'another question');
    // A question gone: the configuration the blunder executes is removed.
    rmSync(join(token(), 'model', 'blunders', 'uncapped_A1.cfg'));
    // The marker no longer configures the replay runner.
    const marker = join(root, 'dossier.json');
    const configured = JSON.parse(read(marker)) as Marker;
    assert.ok(configured.external?.replay, 'Harbor configures the replay runner');
    delete configured.external;
    writeFileSync(marker, JSON.stringify(configured, null, 2) + '\n');
    const before = fingerprint(work);
    const c = run(['recheck', 'token'], { env: NO_TOOLCHAIN });
    assert.equal(c.status, 0, c.out);
    assert.deepEqual(said(c.stdout, aborted.name), { verdict: 'not run', rest: 'aborted' });
    assert.equal(said(c.stdout, blunder).verdict, 'not run');
    assert.match(said(c.stdout, blunder).rest, /^question gone: model\/blunders\/uncapped_A1\.cfg is gone$/);
    assert.equal(said(c.stdout, external).verdict, 'not run', 'a runner the marker does not configure is skipped');
    assert.match(c.stderr, /runner "replay" is not declared under external in dossier\.json/);
    assert.equal(said(c.stdout, tlc).verdict, 'not run', 'it needs the toolchain the answer came from');
    assert.match(c.stderr, /TLA_TOOLS is not set/);
    assert.equal(said(c.stdout, chart).verdict, 'same', 'the chart needs no toolchain');
    assert.equal(summary(c.stdout), 'recheck: 1 same, 0 different, 4 not run');
    assert.deepEqual(fingerprint(work), before, 'recheck writes nothing');
  });

  it('names once, and asks nothing of, a dossier whose records do not verify, and still asks the other dossiers named', () => {
    // An entry edited by hand: token's replay answer now claims W1 failed, and its bytes no longer
    // match the digest integrity.json binds.
    const external = answerNamed('external'), path = join(token(), 'evidence', `${external}.json`);
    const edited = JSON.parse(read(path)) as Entry;
    edited.answer.outcomes.W1 = 'fail';
    writeFileSync(path, JSON.stringify(edited, null, 2) + '\n');
    // The replay runner, as copied, logs each dossier it is asked about.
    const log = join(work, 'replay.log'), replay = join(work, 'tools', 'replay.mjs');
    const asked = 'const component = input.dossier.id;';
    assert.ok(read(replay).includes(asked));
    writeFileSync(replay, `import { appendFileSync } from 'node:fs';\n${read(replay).replace(asked, `${asked}\nappendFileSync(${JSON.stringify(log)}, component + '\\n');`)}`);
    const adapter = join(root, 'components', 'adapter');
    const before = fingerprint(root);
    const c = run(['recheck', 'token', 'adapter'], { env: NO_TOOLCHAIN });
    assert.equal(c.status, 0, c.out);
    const named = lines(c.stdout).filter(l => l.includes('components/token'));
    assert.equal(named.length, 1, `one line for the dossier, none for its entries: ${named.join('\n')}`);
    assert.match(named[0], new RegExp(`^not run: components/token · its records do not verify: .*evidence/${external}\\.json: answer edited\\b`));
    assert.equal(said(c.stdout, answersIn(adapter).find(n => n.startsWith('chart-'))!, 'components/adapter').verdict, 'same', 'adapter is still asked');
    assert.equal(said(c.stdout, answersIn(adapter).find(n => n.startsWith('external-'))!, 'components/adapter').verdict, 'same');
    assert.deepEqual(lines(read(log)), ['adapter'], 'the replay runner was asked about adapter, never about token');
    // Token's entries count as not run, and so do adapter's TLC ones, with no TLC on this machine.
    const tlcRuns = answersIn(adapter).filter(n => /^(tlc|blunder)-/.test(n)).length;
    assert.equal(summary(c.stdout), `recheck: 2 same, 0 different, ${answersIn(token()).length + tlcRuns} not run`);
    assert.deepEqual(fingerprint(root), before, 'recheck writes nothing');
  });

  it('refuses an unknown dossier or an option that is not a whole number, with exit 2, before asking anything', () => {
    const before = fingerprint(work);
    const unknown = run(['recheck', 'nosuch']);
    assert.equal(unknown.status, 2, unknown.out);
    assert.match(unknown.stderr, /^dossier recheck: no component or system named nosuch under /);
    const option = run(['recheck', 'token', '--timeout', '0']);
    assert.equal(option.status, 2, option.out);
    assert.equal(option.stderr, 'dossier recheck: --timeout takes a whole number of seconds above 0, not "0"\n');
    assert.equal(unknown.stdout + option.stdout, '', 'nothing is asked');
    assert.deepEqual(fingerprint(work), before);
  });
});

// forget through the commands, each test on its own copy of Harbor (spec/evidence.md, the owner's
// column). The owner names an entry and the first eight hex of the digest integrity.json binds for it;
// an entry still there must hold a counterexample, in its answer or in previous; and the dossier may
// have no tripwire other than answer removed.
describe('decide forget', () => {
  let work: string, root: string, run: Run;
  beforeEach(() => { ({ work, root, run } = copyHarbor()); });
  afterEach(() => rmSync(work, { recursive: true, force: true }));
  const control = 'systems/control', token = 'components/token';
  // A dossier's entry by the start of its name, and the argument forget takes for it as integrity.json binds it now.
  const entryNamed = (ref: string, prefix: string) => { const name = answersIn(join(root, ref)).find(n => n.startsWith(prefix)); assert.ok(name, `${ref} holds an answer named ${prefix}…`); return name; };
  const argumentFor = (ref: string, name: string) => `${name}@${manifestOf(join(root, ref)).evidence[name].slice(0, 8)}`;
  const forget = (ref: string, argument: string, words = 'the owner lets this answer go') => run(['decide', ref, 'forget', argument, '--', words]);
  // An entry gone from evidence/, with its reading or without it, as a lost checkout leaves it; integrity.json still binds it.
  const lose = (ref: string, name: string, files = ['json', 'md']) => { for (const ext of files) rmSync(join(root, ref, 'evidence', `${name}.${ext}`)); };

  // ANSWER-VIOLATION: Control's cell N1 × executor-offline holds a violation the owner accepted as a
  // risk. A stand-in for TLC answers the same question with a pass, as a hand-made result would, on an
  // unchanged basis: that answer waits for the owner's forget.
  it('refuses a pass over a recorded violation on an unchanged basis and names the owner\'s command; once the owner forgets that answer, the same trial replaces it and keeps the violation as previous', () => {
    const control = join(root, 'systems', 'control');
    const answers = answersIn(control);
    const name = answers.find(n => n.startsWith('tlc-N1-executor-offline-'));
    assert.ok(name, 'control holds an answer to N1 × executor-offline');
    const recorded = entryAt(control, name);
    assert.deepEqual([recorded.answer.result, recorded.answer.outcomes], ['as-called', { TypeOK: 'holds', N1: 'violated' }]);
    const bound = manifestOf(control).evidence[name];
    // The same question, now predicted to pass, and a stand-in for TLC that reports a completed run.
    mkdirSync(join(control, 'calls'), { recursive: true });
    writeFileSync(join(control, 'calls', 'n1.md'), recorded.call.text.replace('  N1: violated', '  N1: holds').replace(/because: \|\n[\s\S]*$/, 'because: |\n  A hand-made prediction that the cell passes.\n'));
    const env = { ...NO_TOOLCHAIN, JAVA: standIn(work, 'java', `cat '${recordedTlc('parcel.txt')}'`), TLA_TOOLS: ANY_JAR };
    const record = recordOf(control);
    const refused = run(['trial', 'control', 'n1.md'], { env });
    assert.equal(refused.status, 2, refused.out);
    const { id, result } = trialId(refused.stdout);
    assert.equal(result, 'as-called', 'the trial came back as its call predicted');
    const refusal = answered(refused.stdout);
    assert.deepEqual([refusal.name, refusal.action], [name, 'refused']);
    assert.match(refusal.reason!, /\bon an unchanged basis this answer would turn N1 from a counterexample into a pass\b/);
    assert.ok(refusal.reason!.endsWith(`: dossier decide systems/control forget ${name}@${bound.slice(0, 8)} -- "<the owner's words>"`), `the refusal ends with the owner's command: ${refusal.reason}`);
    assert.match(refused.stdout, new RegExp(`^  the bundle stays in trials/${id}/, and the call stays pending$`, 'm'));
    assert.ok(existsSync(join(control, 'calls', 'n1.md')), 'the call stays pending');
    assert.deepEqual(recordOf(control), record, 'nothing is written: evidence/, integrity.json and decisions.log are as they were');

    const words = 'the recorded violation came from a trial the owner withdraws';
    const forget = run(['decide', 'systems/control', 'forget', `${name}@${bound.slice(0, 8)}`, '--', words]);
    assert.equal(forget.status, 0, forget.out);
    assert.match(forget.stdout.trim(), new RegExp(`^\\S+ forget ${name}@${bound.slice(0, 8)} "${words}" [0-9a-f]{8}$`));
    assert.equal(assertChained(read(join(control, 'decisions.log'))).at(-1), forget.stdout.trim());
    // The refused trial's bundle is local and no record. Removing it lets the same call run again within
    // the same minute, where the runner refuses a second trial of one call on the same files.
    rmSync(join(control, 'trials', id), { recursive: true });
    const replaced = run(['trial', 'control', 'n1.md'], { env });
    assert.equal(replaced.status, 0, replaced.out);
    assert.deepEqual(answered(replaced.stdout), { name, action: 'replaced the recorded answer', reason: null });
    assert.ok(!existsSync(join(control, 'calls', 'n1.md')), 'the published answer consumes its call');
    const entry = entryAt(control, name);
    assert.deepEqual([entry.answer.result, entry.answer.outcomes], ['as-called', { TypeOK: 'holds', N1: 'holds' }]);
    assert.equal(entry.established.trial, trialId(replaced.stdout).id);
    assert.deepEqual(entry.previous?.answer.outcomes, recorded.answer.outcomes, 'the violation the owner let go is kept as previous');
    assert.deepEqual(entry.previous?.established, recorded.established);
    assert.deepEqual(entry.previous?.basis, recorded.basis);
    assert.deepEqual(entry.replaced, { trial: recorded.established.trial, moved: [] }, 'it replaced the forgotten answer on a basis that had not moved');
    assert.deepEqual(answersIn(control), answers, 'one answer per question: the entry was replaced, not added to');
    assert.ok(!existsSync(join(control, 'evidence', `${name}.md`)), 'the replaced answer\'s reading goes with it');
    const v = run(['verify']);
    assert.equal(v.status, 0, v.out);
    assert.match(lines(v.stdout)[0], /^verify: ok · .* · 0 tripwires$/);
    const cell = verifyJson(run).systems.find(s => s.id === 'control')!.cells.find(c => c.property === 'N1' && c.scenario === 'executor-offline')!;
    assert.equal(cell.mark, 'checked', 'the cell reads the answer now recorded');
  });

  // Each refusal, with what it is shown first. Control's N1 × executor-offline is a violation, its O1 ×
  // all-honest holds, and Token's TLC answer is the one an owner loses.
  const violation = () => entryNamed(control, 'tlc-N1-executor-offline-'), holding = () => entryNamed(control, 'tlc-O1-all-honest-'), lost = () => entryNamed(token, 'tlc-');
  const refusals: [string, () => { ref: string; argument: string; status: number; says: string | RegExp }][] = [
    ['an argument that is not an entry and eight hex of its digest', () => {
      const argument = argumentFor(control, violation()).slice(0, -2);
      return { ref: control, argument, status: 2, says: `dossier decide: forget names an entry and the first eight hex of its digest, such as tlc-N1-executor-offline-9b1e04@3fa2c1d0, not ${argument}\n` };
    }],
    ['an entry integrity.json does not bind', () => ({ ref: control, argument: 'tlc-N1-nowhere-000000@00000000', status: 2, says: 'dossier decide: evidence/tlc-N1-nowhere-000000.json at 00000000 is not an answer integrity.json binds in systems/control\n' })],
    ['a digest other than the one integrity.json binds', () => {
      const name = violation(), other = argumentFor(control, name).endsWith('@00000000') ? '11111111' : '00000000';
      return { ref: control, argument: `${name}@${other}`, status: 2, says: `dossier decide: evidence/${name}.json at ${other} is not an answer integrity.json binds in systems/control\n` };
    }],
    ['an entry edited since integrity.json bound it', () => {
      const name = violation(), argument = argumentFor(control, name), path = join(root, control, 'evidence', `${name}.json`), text = read(path);
      writeFileSync(path, text.replace('"N1": "violated"', '"N1": "holds"'));
      assert.notEqual(read(path), text, 'the violation edited into a pass');
      return { ref: control, argument, status: 2, says: `dossier decide: evidence/${name}.json does not match integrity.json; restore it first\n` };
    }],
    ['an entry that holds no counterexample, in its answer or in previous', () => {
      const name = holding();
      assert.deepEqual([entryAt(join(root, control), name).answer.outcomes, entryAt(join(root, control), name).previous], [{ O1: 'holds' }, null]);
      return { ref: control, argument: argumentFor(control, name), status: 2, says: `dossier decide: evidence/${name}.json holds no counterexample, in its answer or its previous one; forget lets go of a removed answer or of a violation\n` };
    }],
    ['an entry neither present nor removed: a removed answer the owner forgot already', () => {
      const name = lost(), argument = argumentFor(token, name);
      lose(token, name);
      assert.equal(forget(token, argument).status, 0, 'the first forget lets the removed answer go');
      return { ref: token, argument, status: 2, says: `dossier decide: evidence/${name}.json is not a removed answer of components/token; verify names each one as answer removed\n` };
    }],
    ['a violation while another tripwire stands: a stray file', () => {
      writeFileSync(join(root, control, 'notes.txt'), 'a note left in the dossier\n');
      return { ref: control, argument: argumentFor(control, violation()), status: 1, says: /^verify: FAIL · Control · dossier \S+ · 1 tripwire: stray files \(Control: notes\.txt\)\ndossier decide: refused until the tripwires are fixed\n$/ };
    }],
    ['a removed answer while another tripwire stands: its reading, left with no entry', () => {
      const name = lost(), argument = argumentFor(token, name);
      lose(token, name, ['json']);
      return { ref: token, argument, status: 1, says: new RegExp(`^verify: FAIL · Token · dossier \\S+ · 2 tripwires: stray files \\(Token: evidence/: ${name}\\.md\\); answer removed \\(Token: evidence/${name}\\.json; restore it, or the owner forgets ${argument}\\)\\ndossier decide: refused until the tripwires are fixed\\n$`) };
    }],
  ];
  for (const [what, shown] of refusals) it(`refuses to forget ${what}, and writes nothing`, () => {
    const { ref, argument, status, says } = shown();
    const dir = join(root, ref), record = recordOf(dir);
    const r = forget(ref, argument);
    assert.equal(r.status, status, r.out);
    if (typeof says === 'string') assert.equal(r.stderr, says); else assert.match(r.stderr, says);
    assert.equal(r.stdout, '', 'no decision is printed');
    assert.deepEqual(recordOf(dir), record, 'evidence/, integrity.json and decisions.log are as they were');
  });

  it('lets go of an entry still there whose counterexample is only in its previous answer', () => {
    const vault = 'components/vault', name = entryNamed(vault, 'apalache-A2-'), entry = entryAt(join(root, vault), name);
    assert.deepEqual([entry.answer.outcomes, entry.previous?.answer.outcomes, entry.previous?.classification], [{ Inv_A2: 'holds' }, { Inv_A2: 'violated' }, 'call was wrong'], 'the strengthened invariant\'s proof keeps the miscall before it as previous');
    const r = forget(vault, argumentFor(vault, name), 'the miscall before the lemma is no longer of interest');
    assert.equal(r.status, 0, r.out);
    assert.equal(assertChained(read(join(root, vault, 'decisions.log'))).at(-1), r.stdout.trim());
    assert.match(lines(run(['verify']).stdout)[0], /^verify: ok · .* · 0 tripwires$/);
  });

  it('forgets a removed answer through the command: verify passes, and the manifest line stays until a new answer to its question is written', () => {
    const dir = join(root, token), name = lost(), argument = argumentFor(token, name), bound = manifestOf(dir).evidence[name], call = entryAt(dir, name).call.text;
    lose(token, name);
    const removed = run(['verify']);
    assert.equal(removed.status, 1, removed.out);
    assert.ok(lines(removed.stdout)[0].includes(`answer removed (Token: evidence/${name}.json; restore it, or the owner forgets ${argument})`), lines(removed.stdout)[0]);
    const words = 'the entry went with a lost checkout';
    const r = forget(token, argument, words);
    assert.equal(r.status, 0, r.out);
    assert.match(r.stdout.trim(), new RegExp(`^\\S+ forget ${argument} "${words}" [0-9a-f]{8}$`));
    assert.equal(assertChained(read(join(dir, 'decisions.log'))).at(-1), r.stdout.trim());
    const v = run(['verify']);
    assert.equal(v.status, 0, v.out);
    assert.match(lines(v.stdout)[0], /^verify: ok · .* · 0 tripwires$/);
    assert.ok(!componentOf(verifyJson(run), 'token').answers.some(a => a.entry === name), 'a forgotten removed answer is no answer: it covers nothing');
    assert.equal(manifestOf(dir).evidence[name], bound, 'its manifest line stays');
    // The question asked again, of a stand-in for TLC that reports a completed run: its answer takes the line.
    mkdirSync(join(dir, 'calls'), { recursive: true });
    writeFileSync(join(dir, 'calls', 'tlc.md'), call);
    const t = run(['trial', 'token', 'tlc.md'], { env: { ...NO_TOOLCHAIN, JAVA: standIn(work, 'java', `cat '${recordedTlc('parcel.txt')}'`), TLA_TOOLS: ANY_JAR } });
    assert.equal(t.status, 0, t.out);
    assert.deepEqual(answered(t.stdout), { name, action: 'published', reason: null });
    assert.equal(manifestOf(dir).evidence[name], sha256(readFileSync(join(dir, 'evidence', `${name}.json`))), 'the new entry is bound under the name');
    assert.match(lines(run(['verify']).stdout)[0], /^verify: ok · .* · 0 tripwires$/);
  });
});

describe('verify', () => {
  let r: Repo;
  beforeEach(() => { r = makeRepo(); });
  afterEach(() => removeRepo(r));
  const ledger = (kind: string, id: string) => read(join(r.root, kind, id, 'ledger.md'));

  it('verify reports without writing; render explicitly writes the ledgers and the index as views', () => {
    writeComponent(r.root, 'gate', gate());
    writeSystem(r.root, 'net');
    assert.equal(r.run(['draw', 'gate', '--brief']).status, 0);
    const observed = r.run(['verify'], { env: NO_TOOLCHAIN });
    assert.equal(observed.status, 0, observed.out);
    assert.equal(existsSync(join(r.root, 'index.md')), false);
    assert.equal(existsSync(join(componentDir(r.root, 'gate'), 'ledger.md')), false);
    const v = r.run(['render'], { env: NO_TOOLCHAIN });
    assert.equal(v.status, 0, v.out);
    const out = lines(v.stdout);
    assert.equal(out[0], `verify: ok · 1 component, 1 system · dossier ${version} · 0 tripwires`);
    assert.match(v.stdout, /^Gate: \d+ passages · unsettled \d+ · /m);
    assert.match(v.stdout, /^  next: Draw — no chart answer covers: S1 S2 /m);
    assert.match(v.stdout, /^Net: 1 property × 1 scenario · 1 cell · /m);
    assert.match(v.stdout, /^next: System on systems\/net — Net: cells pending: A1×all-honest/m);
    assert.ok(v.stdout.includes(`\nread: ${pluginRoot}/spec/process.md\n`), 'read: names the page');
    assert.ok(v.stdout.includes(`\nindex: ${join(r.root, 'index.md')}\n`));
    for (const [kind, id] of [['components', 'gate'], ['systems', 'net']]) {
      const text = ledger(kind, id);
      assert.ok(isView(text), `${kind}/${id}/ledger.md is a view`);
      assert.match(text, /^# Ledger: /);
      assert.match(text, /^verify: ok · /m);
    }
    assert.match(ledger('components', 'gate'), /^\| S1 \| State \| [^|]+ \| unsettled \| pending \| /m);
    assert.match(ledger('components', 'gate'), /^Used by: net$/m);
    assert.match(ledger('systems', 'net'), /^\| gate \| member \| gate \| /m);
    const index = read(join(r.root, 'index.md'));
    assert.ok(isView(index), 'index.md is a view');
    assert.match(index, /^\| gate \| gate \| charted \| member \|$/m);
    const brief = r.run(['verify', '--brief']);
    assert.ok(!/^index: /m.test(brief.stdout), '--brief leaves out the index line');
    assert.match(brief.stdout, /^read: /m);
  });

  it('--json is valid JSON with components and systems', () => {
    writeComponent(r.root, 'gate', gate());
    writeSystem(r.root, 'net');
    const json = verifyJson(r.run);
    assert.match(json.verify, /^verify: ok · 1 component, 1 system · /);
    assert.equal(json.route.pass, 'System');
    assert.equal(json.route.target, 'systems/net');
    assert.equal(json.components.length, 1);
    const c = json.components[0];
    assert.equal(c.id, 'gate');
    assert.equal(c.title, 'Gate');
    assert.equal(c.tier, 'charted');
    assert.deepEqual(Object.keys(c.marks), PASSAGES);
    assert.equal(c.marks.S1.mark, 'pending');
    assert.equal(c.marks.T1.mark, 'text');
    assert.equal(c.marks.S1.owner, 'unsettled');
    assert.deepEqual(c.tripwires, []);
    assert.equal(c.route.pass, 'Draw');
    assert.deepEqual(c.answers, []);
    assert.equal(json.systems.length, 1);
    const s = json.systems[0];
    assert.equal(s.id, 'net');
    assert.deepEqual(s.cells.map(x => [x.property, x.scenario, x.mark]), [['A1', 'all-honest', 'pending']]);
    assert.deepEqual(s.propertyHeld, { A1: 'held' });
    assert.deepEqual(s.closureMissing, []);
    assert.equal(s.route.pass, 'System');
    assert.deepEqual(flagNames(s), ['blunder owed']);
  });

  it('exits 1 and prints verify: FAIL after a stray file', () => {
    writeComponent(r.root, 'gate', gate());
    writeFileSync(join(componentDir(r.root, 'gate'), 'stray.txt'), 'x\n');
    const v = r.run(['verify']);
    assert.equal(v.status, 1);
    assert.equal(lines(v.stdout)[0], `verify: FAIL · Gate · dossier ${version} · 1 tripwire: stray files (Gate: stray.txt)`);
    assert.match(v.stdout, /^  fix: stray files \(stray\.txt\)$/m);
    assert.match(v.stdout, /^fix: Gate: stray files \(stray\.txt\)$/m);
    assert.match(v.stdout, /^tripwire: Gate: stray files: stray\.txt$/m);
    const json = verifyJson(r.run);
    assert.deepEqual(json.components[0].tripwires, [{ name: 'stray files', where: 'stray.txt' }]);
    assert.equal(json.components[0].route.pass, 'Fix');
    rmSync(join(componentDir(r.root, 'gate'), 'stray.txt'));
    assert.equal(r.run(['verify', '--brief']).status, 0);
  });

  it('an edited ledger or index is a view: verify fails nothing, and render writes it back from the records', () => {
    writeComponent(r.root, 'gate', gate());
    assert.equal(r.run(['render', '--brief']).status, 0);
    const ledgerPath = join(componentDir(r.root, 'gate'), 'ledger.md'), indexPath = join(r.root, 'index.md');
    const ledgerText = read(ledgerPath), indexText = read(indexPath);
    writeFileSync(ledgerPath, ledgerText.replace('unsettled', 'settled'));
    writeFileSync(indexPath, indexText.replace('| gate | gate | charted |', '| gate | gate | modeled |'));
    const v = r.run(['verify', '--brief']);
    assert.equal(v.status, 0, v.out);
    assert.match(lines(v.stdout)[0], /^verify: ok · Gate · /);
    assert.equal(r.run(['render', '--brief']).status, 0);
    assert.match(read(ledgerPath), /^\| S1 \| State \| [^|]+ \| unsettled \| /m, 'the owner column comes from the decisions, not from the view');
    assert.match(read(indexPath), /^\| gate \| gate \| charted \|/m, 'the tier comes from the prose, not from the view');
  });

  it('after a chart trial the S, E and M passages are drawn in a modeled component and checked in a charted one', () => {
    writeComponent(r.root, 'gate', gate());
    writeComponent(r.root, 'gatem', gate({ title: 'Gatem', tier: 'modeled', module: 'gatem' }));
    for (const id of ['gate', 'gatem']) {
      assert.equal(r.run(['draw', id, '--brief']).status, 0);
      writeCall(r.root, id, 'chart.md', CHART_CALL);
      const t = r.run(['trial', id, 'chart.md'], { env: NO_TOOLCHAIN });
      assert.equal(t.status, 0, t.out);
    }
    const json = verifyJson(r.run);
    const charted = marksOf(json, 'gate'), modeled = marksOf(json, 'gatem');
    for (const p of ['S1', 'S2', 'E1', 'E2', 'E3', 'M1', 'M2', 'M3', 'R1', 'R2', 'W1']) {
      assert.equal(charted[p], 'checked', `charted ${p}`);
      assert.equal(modeled[p], 'drawn', `modeled ${p}`);
    }
    assert.equal(charted.R3, 'checked');
    assert.equal(modeled.R3, 'checked', 'a conditional refusal needs no model');
    assert.equal(charted.A1, 'held', 'the chart holds an Always of a charted piece until a blunder catches it');
    assert.equal(modeled.A1, 'drawn');
    assert.equal(componentOf(json, 'gate').route.pass, 'Encode');
    assert.equal(componentOf(json, 'gatem').route.pass, 'Encode');
    assert.ok(componentOf(json, 'gatem').route.why.some(w => /no model: run dossier scaffold/.test(w)));
    assert.ok(componentOf(json, 'gate').marks.S1.chartCovered);
    assert.equal(componentOf(json, 'gate').marks.S1.trials.length, 1);
  });

  it('reports a malformed actors file through the components while there is no system, and through the systems once there is one', () => {
    writeComponent(r.root, 'gate', gate());
    writeFileSync(join(r.root, 'actors', 'actors.md'), ACTORS.replace('    kind: chain\n', '    kind: weather\n'));
    const malformed = 'actors.md: chain has kind "weather", not one of governance, multisig, keeper, user, public, chain, market, external';
    const alone = r.run(['verify']);
    assert.equal(alone.status, 1, alone.out);
    assert.ok(alone.stdout.includes(`\ntripwire: Gate: malformed actors: ${malformed}\n`), alone.stdout);
    writeSystem(r.root, 'net');
    const json = verifyJson(r.run);
    assert.deepEqual(componentOf(json, 'gate').tripwires, [], 'the system reports the actors files');
    assert.deepEqual(json.systems[0].tripwires, [{ name: 'malformed actors', where: malformed }]);
  });

  it('says no dossiers in an empty root', () => {
    const v = r.run(['verify']);
    assert.equal(v.status, 0);
    assert.equal(v.stdout.trim(), `verify: ok · no dossiers · dossier ${version} · 0 tripwires`);
  });

  it('--brief names only the dossiers that owe something, and a dossier asked for by name', () => {
    writeComponent(r.root, 'gate', gate());
    writeComponent(r.root, 'bell', '# Bell\n\nTier: charted\nModule: bell\n\nThe Bell answers a ring and holds nothing.\n\n## States\n[S1] Quiet: the bell is still.\n\n## Events\n[E1] ring, from the public: someone rings the bell.\n\n## Moves\n[M1] When Quiet receives ring, it stays Quiet.\n\n## Words only\n[T1] This piece promises nothing eventual.\n');
    assert.equal(r.run(['draw', 'bell', '--brief']).status, 0);
    writeCall(r.root, 'bell', 'chart.md', CHART_CALL);
    assert.equal(r.run(['trial', 'bell', 'chart.md'], { env: NO_TOOLCHAIN }).status, 0);
    // With its passages checked, the Bell owes a second read until a review names its prose.
    assert.equal(componentOf(verifyJson(r.run), 'bell').route.pass, 'Review');
    const hash = r.run(['verify', 'bell']).stdout.match(/^Bell: .* · prose@([0-9a-f]{6})$/m)![1];
    mkdirSync(join(r.root, 'components', 'bell', 'reviews'), { recursive: true });
    writeFileSync(join(r.root, 'components', 'bell', 'reviews', '2026-11-07-review.md'), `prose@${hash}\n\nNo findings.\n`);
    assert.equal(componentOf(verifyJson(r.run), 'bell').route.pass, 'Report');
    const brief = r.run(['verify', '--brief']);
    assert.equal(brief.status, 0, brief.out);
    assert.match(brief.stdout, /^Gate: /m);
    assert.doesNotMatch(brief.stdout, /^Bell: /m, 'nothing owed, nothing said');
    assert.match(r.run(['verify', '--brief', 'bell']).stdout, /^Bell: .*\n  next: Report — nothing owed$/m);
    assert.match(r.run(['verify']).stdout, /^Bell: /m, 'the full verify names every dossier');
  });

  it('trips malformed marker on a dossier.json that does not parse, at the root', () => {
    writeComponent(r.root, 'gate', gate());
    writeFileSync(join(r.root, 'dossier.json'), '{ "plugin": "0.1.0", }\n');
    const v = r.run(['verify']);
    assert.equal(v.status, 1, v.out);
    const first = lines(v.stdout)[0];
    assert.match(first, /^verify: FAIL · Gate · dossier \S+ · 2 tripwires: malformed marker \(dossier\.json does not parse: .+\); integrity unavailable \(Gate: dossier\.json does not read\)$/);
    assert.match(v.stdout, /^fix: malformed marker \(dossier\.json does not parse: .+\); Gate: integrity unavailable/m);
    assert.match(v.stdout, /^tripwire: malformed marker: dossier\.json does not parse: /m);
    assert.doesNotMatch(v.stdout, /plugin updated/, 'no version read, no version moved');
    const json = verifyJson(r.run);
    assert.equal(json.tripwires[0].name, 'malformed marker');
    assert.deepEqual(json.components[0].tripwires, [{ name: 'integrity unavailable', where: 'dossier.json does not read' }]);
  });
});

describe('where', () => {
  let r: Repo;
  beforeEach(() => {
    r = makeRepo();
    writeComponent(r.root, 'gate', gate({ module: 'vault', pins: 'vault#observation:checkpoint-2026-11-01' }));
    writeSystem(r.root, 'net');
  });
  afterEach(() => removeRepo(r));
  const where = (ref: string) => r.run(['where', ref]);

  it('lists the systems a component is in', () => {
    const w = where('gate');
    assert.equal(w.status, 0, w.out);
    assert.match(lines(w.stdout)[0], /^component gate: module vault, tier charted, \d+ passages$/);
    assert.ok(w.stdout.includes('\n  in net as member: cells A1×all-honest\n'));
  });

  it('answers a system: its members, properties, scenarios and cells', () => {
    // The review skill locates the dossier it reads with where, a system among them (the review exercise
    // of 2026-11-07 found where answered nothing for one).
    const w = where('net');
    assert.equal(w.status, 0, w.out);
    assert.deepEqual(lines(w.stdout).slice(0, 3), ['system net: members gate as member', '  properties A1; scenarios all-honest', '  cells A1×all-honest']);
    // A dossier may be named by its path, as the other commands print it, and then only that kind answers.
    assert.equal(where('systems/net').stdout, w.stdout);
    assert.match(where('components/gate').stdout, /^component gate: module vault, tier charted, \d+ passages$/m);
    const wrongKind = where('systems/gate');
    assert.equal(wrongKind.status, 1);
    assert.equal(wrongKind.stdout.trim(), `nothing under ${r.root} names systems/gate`);
  });

  it('answers a scenario, an actor, a property and a knowledge ref', () => {
    const scenario = where('all-honest');
    assert.equal(scenario.status, 0);
    assert.equal(lines(scenario.stdout)[0], 'scenario all-honest: every actor honest');
    assert.ok(scenario.stdout.includes('\n  in net: A1×all-honest\n'));
    assert.match(where('public-malicious').stdout, /^scenario public-malicious: public malicious; stronger than all-honest$/m);
    const actor = where('public');
    assert.equal(actor.status, 0);
    assert.equal(lines(actor.stdout)[0], 'actor public (public, modes honest/malicious/offline)');
    for (const line of ['  sends open to gate (E1)', '  sends close to gate (E2)', '  sends lock to gate (E3)', '  malicious in public-malicious']) assert.ok(actor.stdout.includes(`${line}\n`), line);
    const property = where('net#A1');
    assert.equal(property.status, 0);
    assert.match(property.stdout, /^property net#A1: cells A1×all-honest; members gate$/m);
    const quantity = where('vault#quantity:debt');
    assert.equal(quantity.status, 0, quantity.out);
    assert.match(quantity.stdout, /^module vault is abstracted by component gate$/m);
    assert.ok(quantity.stdout.includes('\n  which is in net: cells A1×all-honest\n'));
    const pin = where('vault#observation:checkpoint-2026-11-01');
    assert.equal(pin.status, 0);
    assert.match(pin.stdout, /^pinned by component gate$/m);
  });

  it('names who pins a record, a member pin of a composition among them, and the guarantee a record backs', () => {
    writeComponent(r.root, 'gate', gate({ module: 'vault', pins: 'vault#observation:checkpoint-2026-11-01' }).replace('## Words only', '## Guarantees\n[K1] The debt is tracked. Backing: record vault#quantity:debt.\n\n## Words only'));
    writeFileSync(join(r.root, 'systems', 'net', 'composition.md'), '# Composition\n\n```yaml\nmembers:\n  - component: gate\n    role: member\n    pins: [vault#quantity:debt]\nwiring: []\nclosure: []\nscenarios: [all-honest]\n```\n');
    writeFileSync(join(r.root, 'actors', 'actors.md'), ACTORS.replace('    kind: public\n', '    kind: public\n    pins: [vault#quantity:debt]\n'));
    const w = where('vault#quantity:debt');
    assert.equal(w.status, 0, w.out);
    assert.deepEqual(lines(w.stdout), ['pinned by actor public', 'pinned by member gate of system net', 'backs gate K1', 'module vault is abstracted by component gate', '  which is in net: cells A1×all-honest']);
    assert.ok(!where('vault#observation:checkpoint-2026-11-01').stdout.includes('backs '), 'a record no guarantee names backs nothing');
  });

  it('prints an actor\'s pins after its line, before what it sends', () => {
    writeFileSync(join(r.root, 'actors', 'actors.md'), ACTORS.replace('    kind: public\n', '    kind: public\n    pins: [timelock#actor:executor]\n'));
    const actor = where('public');
    assert.equal(actor.status, 0, actor.out);
    assert.deepEqual(lines(actor.stdout).slice(0, 3), ['actor public (public, modes honest/malicious/offline)', '  pins: timelock#actor:executor', '  sends open to gate (E1)']);
    assert.ok(!where('chain').stdout.includes('pins:'), 'an actor without pins prints none');
  });

  it('prints a scenario\'s windows, and the values its cells start from', () => {
    writeFileSync(join(r.root, 'actors', 'scenarios.md'), '# Scenarios\n\n```yaml\nscenarios:\n  - id: all-honest\n    modes: {}\n  - id: chain-down\n    modes:\n      chain: { mode: offline, from: 0, until: 2 }\n      public: { mode: malicious, from: 1 }\n    start: { gate.state: Open, gate.locked: true }\n  - id: gate-open\n    start: { gate.state: Open }\n```\n');
    const windowed = where('chain-down');
    assert.equal(windowed.status, 0, windowed.out);
    assert.deepEqual(lines(windowed.stdout), ['scenario chain-down: chain offline from 0 until 2, public malicious from 1; starts gate.state Open, gate.locked true']);
    assert.deepEqual(lines(where('gate-open').stdout), ['scenario gate-open: every actor honest; starts gate.state Open']);
  });

  it('exits 1 for an unknown ref', () => {
    for (const ref of ['nosuch', 'nosuch#quantity:debt', 'net#Z9']) {
      const w = where(ref);
      assert.equal(w.status, 1, ref);
      assert.equal(w.stdout.trim(), `nothing under ${r.root} names ${ref}`);
    }
    assert.equal(r.run(['where']).status, 2);
  });
});

describe('import', () => {
  let r: Repo;
  beforeEach(() => { r = makeRepo(); });
  afterEach(() => removeRepo(r));

  it('writes a compiling prose and a margin from the knowledge base', () => {
    const i = r.run(['import', 'vault']);
    assert.equal(i.status, 0, i.out);
    assert.match(i.stdout, /^wrote components\/vault\/prose\.md \(\d+ events, \d+ guarantees, \d+ data placeholders\) and margin\.md$/m);
    assert.match(i.stdout, /^the draft compiles; replace the placeholders/m);
    const dir = componentDir(r.root, 'vault');
    const prose = read(join(dir, 'prose.md'));
    assert.match(prose, /^# Vault\n/);
    assert.match(prose, /^Tier: modeled$/m);
    assert.match(prose, /^Module: vault$/m);
    assert.match(prose, /^Pins: vault#observation:checkpoint-2026-11-01$/m);
    assert.match(prose, /^\[E1\] borrow, from the Credit user: Borrow an amount of credit/m, 'the record\'s name as written');
    assert.match(i.stdout, /^declare these senders in actors\/actors\.md unless they already are, or start a component for each contract among them: the Credit user$/m);
    assert.match(prose, /^\[M1\] When Live receives borrow, it stays Live\.$/m);
    assert.match(prose, /^\[K\d+\] The cached specification declares debtEqualsCredit\. Backing: certora certora\/Vault\.spec#debtEqualsCredit at 1a2b0000000000000000000000000000000f9f8e\.$/m, 'at the full revision codebases.md records');
    assert.match(prose, /^\[K\d+\] debt equals free plus issued\. Backing: none\.$/m);
    assert.deepEqual(parseProse(prose).errors, []);
    const margin = read(join(dir, 'margin.md'));
    for (const heading of ['## Actors', '## Operations', '## Invariants recorded', '## Quantities', '## Edges', '## Certora']) assert.ok(margin.includes(`${heading}\n`), heading);
    for (const line of ['- user (public_caller): Any address may borrow credit', '- adapter (contract): the only caller of move and release', '- borrow: Borrow an amount of credit against the ceiling', '- invariant debtEqualsCredit in certora/Vault.spec at 1a2b0000000000000000000000000000000f9f8e', '- rule borrowIncreasesDebt in certora/Vault.spec at 1a2b0000000000000000000000000000000f9f8e', '- debt: Total debt borrowed against the vault']) assert.ok(margin.includes(line), line);

    const d = r.run(['draw', 'vault']);
    assert.equal(d.status, 0, d.out);
    assert.match(lines(d.stdout)[0], /^draw: vault · pass · /);
    assert.ok(!d.stdout.includes('does not compile'));
    const c = componentOf(verifyJson(r.run), 'vault');
    assert.equal(c.backing.K1.status, 'backed', 'the Certora rule is found in the source cache');
    assert.ok(Object.values(c.backing).some(b => b.status === 'assumed'), 'the recorded invariants are assumed');
    assert.ok(c.tripwires.some(t => t.name === 'sender is not declared'), 'until actors.md declares the sender');
    writeFileSync(join(r.root, 'actors', 'actors.md'), ACTORS.replace('actors:\n', 'actors:\n  - id: user\n    name: Credit user\n    kind: user\n'));
    const declared = componentOf(verifyJson(r.run), 'vault');
    assert.ok(!declared.tripwires.some(t => t.name === 'sender is not declared'), `the sender names the actor declared under the record's name: ${JSON.stringify(declared.tripwires)}`);
  });

  it('lists the rules of a repository-qualified cache in the margin for review, and resolves one an author cites', () => {
    const records = join(r.repo, 'records');
    cpSync(knowledge, records, { recursive: true });
    const marker = join(r.root, 'dossier.json');
    writeFileSync(marker, JSON.stringify({ ...JSON.parse(read(marker)), knowledge: { root: records } }));
    const base = join(records, 'modules/vault');
    const path = 'source-cache/github/permission-lib/commit-dbb6-eec3';
    const sha = 'dbb6104ce834628e473d2173bbc9d47f81a9eec3';
    mkdirSync(join(base, path, 'certora/specs'), { recursive: true });
    writeFileSync(join(base, path, 'certora/specs/AccessControl.spec'), 'rule revokeRoleEffect() { assert true; }\n');
    const manifest = join(base, 'codebases.md');
    writeFileSync(manifest, read(manifest).replace('source_files:', `  - id: permission-lib\n    ref: ${sha}\n    cache_path: ${path}/\nsource_files:`));
    const res = r.run(['import', 'vault']);
    assert.equal(res.status, 0, res.out);
    const dir = componentDir(r.root, 'vault');
    assert.ok(read(join(dir, 'margin.md')).includes(`revokeRoleEffect in certora/specs/AccessControl.spec at ${sha} (repository: permission-lib; review applicability)`));
    const prose = read(join(dir, 'prose.md'));
    assert.ok(!prose.includes('revokeRoleEffect'), 'a dependency\'s rule alone supplies no guarantee of the module');
    writeFileSync(join(dir, 'prose.md'), prose.replace('## Guarantees', `## Guarantees\n[K999] The role library declares a revocation rule. Backing: certora certora/specs/AccessControl.spec#revokeRoleEffect at ${sha}.`));
    const cited = componentOf(verifyJson(r.run), 'vault').backing.K999;
    assert.equal(cited.status, 'backed');
    assert.equal(cited.path, `modules/vault/${path}/certora/specs/AccessControl.spec`);
  });

  it('--as names the component', () => {
    const i = r.run(['import', 'vault', '--as', 'ledger']);
    assert.equal(i.status, 0, i.out);
    const prose = read(join(componentDir(r.root, 'ledger'), 'prose.md'));
    assert.match(prose, /^# Ledger\n/);
    assert.match(prose, /^Module: vault$/m);
    assert.ok(!existsSync(componentDir(r.root, 'vault')));
  });

  it('refuses when prose.md exists', () => {
    writeComponent(r.root, 'vault', gate({ title: 'Vault', module: 'vault' }));
    const i = r.run(['import', 'vault']);
    assert.equal(i.status, 1);
    assert.match(i.stderr, /components\/vault\/prose\.md exists; import writes only a fresh dossier/);
    assert.equal(read(join(componentDir(r.root, 'vault'), 'prose.md')), gate({ title: 'Vault', module: 'vault' }));
    assert.ok(!existsSync(join(componentDir(r.root, 'vault'), 'margin.md')));
  });

  it('exits 2 for an unknown module and without a knowledge base', () => {
    const unknown = r.run(['import', 'nosuch']);
    assert.equal(unknown.status, 2);
    assert.match(unknown.stderr, /the knowledge base has no module nosuch \(it has adapter, breaker, oracle, timelock, token, vault\)/);
    assert.ok(!existsSync(componentDir(r.root, 'nosuch')));
    const bare = makeRepo({ withKnowledge: false });
    try {
      const i = bare.run(['import', 'vault']);
      assert.equal(i.status, 2);
      assert.match(i.stderr, /no knowledge base is configured in dossier\.json/);
    } finally { removeRepo(bare); }
    assert.equal(r.run(['import']).status, 2);
  });
});
