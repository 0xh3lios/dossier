// Reproductions from the two independent reviews of 2026-11-05, of the morning's commits and of the
// release sprint, each kept as the behavior the code must hold. Every mutation happens in a temporary
// directory. Those marked todo are known defects left for the next release: they run and report, and
// they fail nothing until they are fixed.
import { emptyCollection } from './collection-fixture.ts';
import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, cpSync, existsSync, linkSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { openKnowledge } from '../../src/knowledge.ts';
import { parseProse, parseTypePhrase } from '../../src/prose/prose.ts';
import { compileIR } from '../../src/prose/ir.ts';
import { parseCall } from '../../src/trials/calls.ts';
import { planTrial } from '../../src/trials/plan.ts';

const plugin = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const prose = `# Gate
Tier: charted
Module: gate

## States
[S1] Live: operational.
## Events
[E1] tick, from the public: time passes.
## Moves
[M1] When Live receives tick, it stays Live.
## Words only
[T1] This piece promises nothing eventual.
`;
const refusalOnly = `# Gate
Tier: modeled
Module: gate

## States
[S1] Live: operational.
## Events
[E1] forbidden, from the public: an unauthorized operation. Refusal only.
## Moves
[R1] In Live, forbidden is refused.
## Walks
[W1] Walk Denied: from Live, forbidden refused; ends Live.
## Words only
[T1] This piece promises nothing eventual.
`;
const EMPTY_INTEGRITY = '{"schema":1,"evidence":{},"decisionHead":null}\n';

function workspace(t: TestContext): string {
  const work = mkdtempSync(join(tmpdir(), 'dossier-regressions-'));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  return work;
}
function write(path: string, value: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, value);
}
function rootAt(work: string): string {
  const root = join(work, 'dossiers');
  write(join(root, 'dossier.json'), '{"storage":"integrity-v1","plugin":"0.2.0"}\n');
  return root;
}
function command(root: string, ...args: string[]) {
  const r = spawnSync(process.execPath, [join(plugin, 'src/cli.ts'), ...args, '--root', root], { cwd: dirname(root), encoding: 'utf8' });
  assert.ifError(r.error);
  return r;
}

test('an unreadable codebases.md leaves an ambiguous Certora backing unresolved, as an absent one would not', t => {
  const work = workspace(t), mod = join(work, 'modules/gate');
  const path = 'source-cache/github/commit-aaaa-bbbb';
  const shaA = 'aaaa' + '1'.repeat(32) + 'bbbb';
  const shaB = 'aaaa' + '2'.repeat(32) + 'bbbb';
  write(join(mod, path, 'Gate.spec'), 'rule safe() { assert true; }\n');
  const manifest = '```yaml\nrepositories:\n' + [shaA, shaB].map((sha, i) => `  - id: repo${i}\n    ref: ${sha}\n    cache_path: ${path}/`).join('\n') + '\n```\n';
  write(join(mod, 'codebases.md'), manifest);
  const lookup = () => openKnowledge(work).backing({ module: 'gate', kind: 'certora', path: 'Gate.spec', rule: 'safe', commit: 'aaaabbbb' });
  assert.equal(lookup().status, 'unresolved');
  write(join(mod, 'codebases.md'), manifest + '\n```yaml\nnotes: [\n```\n');
  assert.equal(openKnowledge(work).moduleRecords('gate').errors.length, 1);
  assert.equal(lookup().status, 'unresolved', 'an unreadable manifest is not an absent manifest');
});

test('begin refuses a dossier folder that is a symbolic link, and writes nothing through it', t => {
  const work = workspace(t), root = rootAt(work), outside = join(work, 'outside/gate');
  write(join(outside, 'prose.md'), prose);
  mkdirSync(join(root, 'parts'));
  symlinkSync(outside, join(root, 'parts/gate'), 'dir');
  const r = command(root, 'decide', 'gate', 'begin', '--', 'Begin only the dossier in this root.');
  assert.equal(r.status, 2, r.stdout + r.stderr);
  assert.match(r.stderr, /parts\/gate must be a directory, not a symbolic link or special file/);
  assert.deepEqual(readdirSync(outside), ['prose.md']);
  const accept = command(root, 'decide', 'gate', 'accept', 'S1', '--', 'x');
  assert.equal(accept.status, 2, 'nor does any other command act through it');
  assert.deepEqual(readdirSync(outside), ['prose.md']);
});

test('render rewrites a ledger whose JSON block has the wrong shape', t => {
  const work = workspace(t), root = rootAt(work), dir = join(root, 'parts/gate');
  emptyCollection(dir);
  write(join(dir, 'prose.md'), prose);
  write(join(dir, 'integrity.json'), EMPTY_INTEGRITY);
  write(join(dir, 'ledger.md'), '\n```json\n{"marks":{},"trials":{}}\n```\n');
  const verified = command(root, 'verify');
  assert.equal(verified.status, 0, verified.stdout + verified.stderr);
  const rendered = command(root, 'render');
  assert.equal(rendered.status, 0, rendered.stdout + rendered.stderr);
  assert.match(readFileSync(join(dir, 'ledger.md'), 'utf8'), /first rebuild/);
});

test('render replaces a ledger that links to a record, and never writes through the link', t => {
  const work = workspace(t), root = rootAt(work), dir = join(root, 'parts/gate');
  emptyCollection(dir);
  write(join(dir, 'prose.md'), prose);
  const begun = command(root, 'decide', 'gate', 'begin', '--', 'Start the reviewed gate.');
  assert.equal(begun.status, 0, begun.stdout + begun.stderr);
  const authority = readFileSync(join(dir, 'integrity.json'), 'utf8');
  const log = readFileSync(join(dir, 'decisions.log'), 'utf8');
  symlinkSync('integrity.json', join(dir, 'ledger.md'));
  linkSync(join(dir, 'decisions.log'), join(root, 'index.md'));
  const rendered = command(root, 'render');
  assert.equal(rendered.status, 0, rendered.stdout + rendered.stderr);
  assert.equal(readFileSync(join(dir, 'integrity.json'), 'utf8'), authority, 'a symbolic link is replaced, not written through');
  assert.equal(readFileSync(join(dir, 'decisions.log'), 'utf8'), log, 'a hard link is replaced, not written through');
  assert.ok(!lstatSync(join(dir, 'ledger.md')).isSymbolicLink() && lstatSync(join(root, 'index.md')).nlink === 1);
  assert.equal(command(root, 'verify').status, 0);
});

test('the scaffold of a piece whose every event is refused has a Next that parses', t => {
  const work = workspace(t), root = rootAt(work), dir = join(root, 'parts/gate');
  emptyCollection(dir);
  write(join(dir, 'prose.md'), refusalOnly);
  write(join(dir, 'integrity.json'), EMPTY_INTEGRITY);
  assert.equal(command(root, 'draw', 'gate').status, 0);
  const scaffold = command(root, 'scaffold', 'gate');
  assert.equal(scaffold.status, 0, scaffold.stdout + scaffold.stderr);
  assert.match(readFileSync(join(dir, 'model/Gate.tla'), 'utf8'), /^Next == FALSE$/m);
});

test('TLC runs the scaffold of a piece whose every event is refused', { skip: !(process.env.TLA_TOOLS && process.env.JAVA) && 'needs TLA_TOOLS and JAVA' }, t => {
  const work = workspace(t), root = rootAt(work), dir = join(root, 'parts/gate');
  emptyCollection(dir);
  write(join(dir, 'prose.md'), refusalOnly);
  write(join(dir, 'integrity.json'), EMPTY_INTEGRITY);
  assert.equal(command(root, 'scaffold', 'gate').status, 0);
  write(join(dir, 'calls/check.md'), 'kind: tlc\nexecutes:\n  - model/Gate.tla\n  - model/Gate.cfg\nreach: one state\nexpect:\n  TypeOK: holds\nbecause: Every input is refused, so the sole state is kept.\n');
  const tried = command(root, 'trial', 'gate', 'check.md');
  assert.equal(tried.status, 0, tried.stdout + tried.stderr);
});

test('a refusal-only event lapses when the refused walk it relied on is removed', t => {
  const work = workspace(t), root = rootAt(work), dir = join(root, 'parts/gate');
  const input = prose.replace('## Moves', '[E2] forbidden, from the public: an unauthorized operation. Refusal only.\n## Moves')
    .replace('## Words only', '[R1] In Live, forbidden is refused.\n## Walks\n[W1] Walk Denied: from Live, forbidden refused; ends Live.\n## Words only');
  emptyCollection(dir);
  write(join(dir, 'prose.md'), input);
  write(join(dir, 'integrity.json'), EMPTY_INTEGRITY);
  write(join(dir, 'calls/chart.md'), 'kind: chart\nexecutes:\n  - prose.md\nreach: one state\nexpect:\n  checks: pass\nbecause: The denied input is always refused and has a witness.\n');
  assert.equal(command(root, 'trial', 'gate', 'chart.md').status, 0);
  assert.equal(command(root, 'decide', 'gate', 'accept', 'E2', '--', 'This operation must never succeed.').status, 0);
  emptyCollection(dir);
  write(join(dir, 'prose.md'), input.replace('[W1] Walk Denied: from Live, forbidden refused; ends Live.\n', ''));
  const report = JSON.parse(command(root, 'verify', '--json').stdout);
  assert.equal(report.parts[0].marks.E2.mark, 'lapsed');
  assert.deepEqual(report.parts[0].marks.E2.lapsed, ['passage W1 gone'], 'the lapse names the walk it leaned on');
  assert.equal(report.parts[0].marks.R1.mark, 'checked', 'the refusal stands on its own check');
});

test('an interrupted fixture install leaves the old or the new fixture in place', { todo: 'next release: the install swaps with two renames (maintainer only)' }, () => {
  const work = mkdtempSync(join(tmpdir(), 'dossier-regressions-')), copy = join(work, 'plugin');
  try {
    const script = join(copy, 'qualification/rebuild-fixture.mjs');
    mkdirSync(dirname(script), { recursive: true });
    cpSync(join(plugin, 'qualification/rebuild-fixture.mjs'), script);
    const fixture = join(copy, 'qualification/fixture'), target = join(fixture, 'dossiers');
    write(join(target, 'old-record'), 'old evidence');
    const observed = { parts: {}, compositions: {} };
    write(join(fixture, 'expected-marks.json'), JSON.stringify(observed));
    const output = join(work, 'build');
    write(join(output, 'dossiers/new-record'), 'new evidence');
    const childCode = `
      import fs from 'node:fs';
      import { syncBuiltinESMExports } from 'node:module';
      const original = fs.renameSync;
      fs.renameSync = function(from, to) {
        original(from, to);
        if (String(to).includes('/.dossiers-replaced-')) process.kill(process.pid, 'SIGKILL');
      };
      syncBuiltinESMExports();
      const { installFixture } = await import(${JSON.stringify(pathToFileURL(script).href)});
      installFixture(${JSON.stringify({ output, verified: 0, observed })});
    `;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', childCode], { encoding: 'utf8' });
    assert.equal(child.signal, 'SIGKILL', child.stderr);
    assert.equal(existsSync(target), true, `the fixture is gone; left: ${readdirSync(fixture)}`);
  } finally { rmSync(work, { recursive: true, force: true }); }
});

// From the review of the sprint.

test('a number word is only the table\'s own entry, and digits only a whole number the chart can count past', () => {
  const inherited = parseProse(prose.replace('Module: gate\n', 'Module: gate\nIt holds x, a count from 0 to 2, starting at constructor.\n'));
  assert.ok(inherited.errors.length);
  assert.equal(compileIR(inherited).ok, false);
  const huge = parseTypePhrase('a count from 9007199254740992 to 9007199254740992');
  assert.ok(huge && 'problem' in huge, 'a bound past the safe integers would never let the chart advance');
});

test('a codebases.md that names repositories, even as a typo or an empty list, governs alone', t => {
  const work = workspace(t), knowledge = join(work, 'knowledge'), mod = join(knowledge, 'modules/gate');
  write(join(mod, 'source-cache/github/commit-aaaa-bbbb/Gate.spec'), 'rule safe() { assert true; }\n');
  const lookup = () => openKnowledge(knowledge).backing({ module: 'gate', kind: 'certora', path: 'Gate.spec', rule: 'safe', commit: 'aaaabbbb' }).status;
  for (const listed of ['typo', '[]']) {
    write(join(mod, 'codebases.md'), `\`\`\`yaml\nrepositories: ${listed}\n\`\`\`\n`);
    assert.equal(lookup(), 'unresolved', `repositories: ${listed}`);
  }
  write(join(mod, 'codebases.md'), '```yaml\nnotes: a manifest that names no repositories\n```\n');
  assert.equal(lookup(), 'backed', 'without the key, the flat caches are still discovered');
});

test('render writes no ledger through a dossier folder that links outside the root', t => {
  const work = workspace(t), root = rootAt(work), outside = join(work, 'outside/gate');
  write(join(outside, 'prose.md'), prose);
  write(join(outside, 'integrity.json'), EMPTY_INTEGRITY);
  mkdirSync(join(root, 'parts'));
  symlinkSync(outside, join(root, 'parts/gate'), 'dir');
  const rendered = command(root, 'render');
  assert.equal(existsSync(join(outside, 'ledger.md')), false, rendered.stdout + rendered.stderr);
  assert.match(rendered.stderr, /parts\/gate must be a directory, not a symbolic link or special file; its ledger is not written/);
});

test('render replaces a ledger that links to a folder instead of reading it', t => {
  const work = workspace(t), root = rootAt(work), dir = join(root, 'parts/gate'), outside = join(work, 'outside');
  emptyCollection(dir);
  write(join(dir, 'prose.md'), prose);
  write(join(dir, 'integrity.json'), EMPTY_INTEGRITY);
  mkdirSync(outside);
  symlinkSync(outside, join(dir, 'ledger.md'), 'dir');
  const rendered = command(root, 'render');
  assert.ok(rendered.status === 0 || rendered.status === 1, `no crash: ${rendered.status} ${rendered.stderr}`);
  assert.doesNotMatch(rendered.stderr, /EISDIR|internal error/);
  assert.ok(lstatSync(join(dir, 'ledger.md')).isFile(), 'the link is replaced by the view');
  assert.equal(command(root, 'verify').status, 0, 'and the root verifies once the view is a file');
});

test('an actors.md whose actors are not a list is a tripwire that holds back owner readings, not a crash', t => {
  for (const value of ['false', '{}']) {
    const work = workspace(t), root = rootAt(work), dir = join(root, 'parts/gate');
    emptyCollection(dir);
  write(join(dir, 'prose.md'), prose);
    write(join(dir, 'integrity.json'), EMPTY_INTEGRITY);
    write(join(root, 'actors/actors.md'), `\`\`\`yaml\nactors: ${value}\n\`\`\`\n`);
    const verified = command(root, 'verify');
    assert.equal(verified.status, 1, verified.stdout + verified.stderr);
    assert.match(verified.stdout, /malformed actors: actors\.md: actors is not a list of actors/);
    const decided = command(root, 'decide', 'gate', 'accept', 'T1', '--', 'Accepted.');
    assert.equal(decided.status, 1, decided.stdout + decided.stderr);
    assert.equal(existsSync(join(dir, 'decisions.log')), false);
  }
});

test('a blunder whose configuration enables another property than its call expects is refused, not thrown', t => {
  const work = workspace(t), dir = join(work, 'gate');
  write(join(dir, 'model/blunders/Bad.tla'), '---- MODULE Bad ----\nA1 == TRUE\nA2 == TRUE\n====\n');
  write(join(dir, 'model/Bad.cfg'), 'INVARIANT A1\n');
  const call = parseCall('kind: blunder\nblunder: the mutant\nexecutes:\n  - model/blunders/Bad.tla\n  - model/Bad.cfg\nreach: one state\nexpect:\n  A2: violated\nbecause: Check A2.\n');
  assert.deepEqual(call.errors, []);
  const result = planTrial({ call, dossierDir: dir, kind: 'part', ir: compileIR(parseProse(prose)) });
  assert.ok(result.problems.some(p => p.includes('A1 is enabled')), result.problems.join('; '));
});
