import { test } from 'node:test';
import type { TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, linkSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { fingerprint } from '../conformance/files.ts';

const plugin = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(plugin, 'qualification/rebuild-fixture.mjs');
const fixture = join(plugin, 'qualification/fixture');
const { installFixture, prepareFixture } = await import(pathToFileURL(script).href);
const empty = { schema: 1, evidence: {}, decisionHead: null };
function workspace(t: TestContext) {
  const work = mkdtempSync(join(tmpdir(), 'dossier-fixture-preparation-'));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  return work;
}
function command(root: string, ...args: string[]) {
  const result = spawnSync(join(plugin, 'bin/dossier'), [...args, '--root', root], { encoding: 'utf8', cwd: dirname(root), maxBuffer: 64 * 1024 * 1024 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, `${args.join(' ')}\n${result.stdout}\n${result.stderr}`);
  return result.stdout;
}
function unchangedRefusal(work: string, action: () => unknown, pattern: RegExp) {
  const before = fingerprint(work);
  assert.throws(action, pattern);
  assert.deepEqual(fingerprint(work), before, 'refusal precedes any output write');
}

test('fixture rebuild module is import-safe and the CLI requires explicit output before doing work', t => {
  const work = workspace(t), original = fingerprint(fixture);
  const imported = spawnSync(process.execPath, ['--input-type=module', '-e', `await import(${JSON.stringify(pathToFileURL(script).href)})`, '--', '--out', fixture, '--install'], { cwd: work, encoding: 'utf8' });
  assert.equal(imported.status, 0, imported.stderr);
  assert.equal(imported.stdout, '');
  assert.deepEqual(readdirSync(work), []);
  for (const args of [[], ['--install'], ['--out'], ['--out', join(work, 'new'), '--unknown'], ['--out', join(work, 'new'), '--keep-trials']]) {
    const before = fingerprint(work);
    const result = spawnSync(process.execPath, [script, ...args], { cwd: work, encoding: 'utf8', env: { ...process.env, JAVA: '', TLA_TOOLS: '', APALACHE: '', ALLOY_JAR: '' } });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /explicit --out|usage:/);
    assert.deepEqual(fingerprint(work), before);
  }
  assert.deepEqual(fingerprint(fixture), original);
});

test('preparation rejects plugin paths, ancestor paths and physical aliases before writing', t => {
  const work = workspace(t), original = fingerprint(fixture);
  for (const out of [undefined, plugin, dirname(plugin), fixture, join(fixture, 'new'), join(plugin, 'src'), join(plugin, 'qualification/../src/new')]) {
    unchangedRefusal(work, () => prepareFixture({ out }), /explicit --out|outside the plugin/);
  }
  symlinkSync(plugin, join(work, 'alias'), 'dir');
  for (const out of [join(work, 'alias'), join(work, 'alias/qualification/fixture'), join(work, 'alias/new-output')]) {
    unchangedRefusal(work, () => prepareFixture({ out }), /outside the plugin/);
  }
  const refused = spawnSync(process.execPath, [script, '--out', fixture], { cwd: work, encoding: 'utf8', env: { ...process.env, JAVA: 'unused', TLA_TOOLS: 'unused', APALACHE: 'unused', ALLOY_JAR: 'unused' } });
  assert.equal(refused.status, 2);
  assert.match(refused.stderr, /outside the plugin/);
  assert.deepEqual(fingerprint(fixture), original);
  assert.equal(existsSync(join(plugin, 'new-output')), false);
});

test('fresh preparation copies authored Harbor inputs into integrity-v1 storage without historical authority or golden regeneration', t => {
  const work = workspace(t), out = join(work, 'nested/harbor'), original = fingerprint(fixture);
  const prepared = prepareFixture({ out });
  const root = prepared.root;
  const marker = JSON.parse(readFileSync(join(root, 'dossier.json'), 'utf8'));
  assert.equal(marker.storage, 'integrity-v1');
  assert.equal(marker.knowledge.root, '../knowledge');
  assert.deepEqual(marker.external.replay.command, ['node', 'tools/replay.mjs']);
  let dossiers = 0;
  for (const kind of ['parts', 'compositions']) for (const id of readdirSync(join(root, kind))) {
    dossiers++;
    const dir = join(root, kind, id), source = join(fixture, 'dossiers', kind, id);
    assert.deepEqual(JSON.parse(readFileSync(join(dir, 'integrity.json'), 'utf8')), empty);
    for (const name of ['prose.md', ...(kind === 'compositions' ? ['wiring.md'] : [])]) assert.equal(readFileSync(join(dir, name), 'utf8'), readFileSync(join(source, name), 'utf8'));
    for (const name of ['evidence', 'trials', 'decisions.log', 'ledger.md', 'calls', 'chart', 'model']) assert.equal(existsSync(join(dir, name)), false, `old ${name} must not be copied`);
  }
  assert.equal(dossiers, 9);
  for (const folder of ['knowledge', 'protocol', 'tools', 'dossiers/actors']) {
    // New copies retain content and mode; cpSync may round nanosecond mtimes.
    // Source and later read-only checks still compare the exact full fingerprint.
    const files = (path: string) => Object.fromEntries(Object.entries(fingerprint(path)).filter(([, value]) => !value.endsWith(':directory')).map(([name, value]) => [name, `${value.split(':')[0]}:${value.split(':')[2]}`]));
    assert.deepEqual(files(join(out, folder)), files(join(fixture, folder)), `${folder} copied independently with original bytes and permissions`);
  }
  for (const name of ['expected-marks.json', 'observed-marks.json', 'dossiers/index.md']) assert.equal(existsSync(join(out, name)), false);
  assert.equal(readFileSync(join(root, 'parts/oracle/doubts.md'), 'utf8'), readFileSync(join(fixture, 'dossiers/parts/oracle/doubts.md'), 'utf8'));
  const before = fingerprint(out), report = JSON.parse(command(root, 'verify', '--json'));
  assert.deepEqual(report.tripwires, []);
  assert.ok([...report.parts, ...report.compositions].every(dossier => !dossier.tripwires.length));
  assert.deepEqual(fingerprint(out), before, 'prepared current seed verifies without writing views or authority');
  assert.deepEqual(fingerprint(fixture), original, 'preparation leaves the fixture byte/mtime unchanged');
});

test('an output is a new or an empty folder; an existing output is never reset or rebuilt into', t => {
  const work = workspace(t), out = join(work, 'existing');
  mkdirSync(out);
  prepareFixture({ out });
  // A rebuild asks every question afresh; recheck, not a rebuild, confirms an existing output's answers.
  unchangedRefusal(work, () => prepareFixture({ out }), /new or empty folder; recheck an existing output/);
  writeFileSync(join(work, 'file'), 'preserve');
  unchangedRefusal(work, () => prepareFixture({ out: join(work, 'file') }), /ordinary isolated directory/);
});

test('install refuses a rebuild that failed verify or whose marks differ from the golden, before touching the fixture', t => {
  const work = workspace(t), before = fingerprint(fixture);
  const expected = JSON.parse(readFileSync(join(fixture, 'expected-marks.json'), 'utf8'));
  assert.throws(() => installFixture({ output: work, verified: 1, observed: expected }), /verify exited 1 on the rebuild; the fixture is unchanged/);
  const moved = structuredClone(expected);
  moved.compositions.control.cells['A1|all-honest'].mark = 'checked';
  assert.throws(() => installFixture({ output: work, verified: 0, observed: moved }), /observed marks differ from expected-marks\.json in compositions\/control/);
  assert.deepEqual(fingerprint(fixture), before, 'neither refusal writes to the fixture');
});

test('an output holding a link, a hard link or a publication remnant is refused without touching external files', t => {
  const work = workspace(t), out = join(work, 'harbor');
  mkdirSync(out);
  const outside = join(work, 'outside.txt'); writeFileSync(outside, 'outside');
  for (const kind of ['symlink', 'hardlink', 'publication']) {
    const target = join(out, kind === 'publication' ? '.publication-lock' : 'linked');
    if (kind === 'symlink') symlinkSync(outside, target);
    else if (kind === 'hardlink') linkSync(outside, target);
    else mkdirSync(target);
    unchangedRefusal(work, () => prepareFixture({ out }), /new or empty folder/);
    rmSync(target, { recursive: true });
  }
  assert.equal(readFileSync(outside, 'utf8'), 'outside');
});

test('a prepared seed runs the real commands, verify never reads a bundle, and an edited entry fails verify', t => {
  const work = workspace(t), out = join(work, 'harbor'), original = fingerprint(fixture);
  const { root } = prepareFixture({ out });
  const vault = join(root, 'parts/vault');
  command(root, 'draw', 'vault', '--brief');
  mkdirSync(join(vault, 'calls'));
  writeFileSync(join(vault, 'calls/chart.md'), 'kind: chart\nexecutes:\n  - prose.md\nreach: debt, free and joined 0..4; line 2..4\nexpect:\n  checks: pass\nbecause: The finite moves, refusals and walks preserve the authored chart relations.\n');
  const ran = command(root, 'trial', 'vault', 'chart.md');
  const name = (ran.match(/^answer: evidence\/(\S+)\.json · published$/m) || [])[1];
  assert.ok(name, `the trial publishes its answer:\n${ran}`);
  const entry = join(vault, 'evidence', `${name}.json`), [id] = readdirSync(join(vault, 'trials'));
  writeFileSync(join(vault, 'evidence', `${name}.md`), 'This chart checks finite behavior and stated walks. It is not induction or deployment evidence.\n');
  command(root, 'decide', 'vault', 'accept', 'A1', '--', 'Synthetic fixture owner accepts this conservation statement.');
  const manifest = JSON.parse(readFileSync(join(vault, 'integrity.json'), 'utf8'));
  assert.match(manifest.evidence[name], /^[a-f0-9]{64}$/);
  assert.equal(manifest.decisionHead.algorithm, 'sha256-prefix');
  const verify = () => spawnSync(join(plugin, 'bin/dossier'), ['verify', '--root', root], { encoding: 'utf8', cwd: dirname(root) });
  assert.equal(verify().status, 0);
  // A trial's bundle stays on the machine that ran it and is no record: changing it damages no evidence.
  writeFileSync(join(vault, 'trials', id, 'output.txt'), 'altered execution output');
  assert.equal(verify().status, 0, 'verify never reads trials/');
  writeFileSync(entry, readFileSync(entry, 'utf8').replace('"result": "as-called"', '"result": "miscalled"'));
  const failed = verify();
  assert.equal(failed.status, 1);
  assert.match(failed.stdout, /answer edited/);
  assert.deepEqual(JSON.parse(readFileSync(join(vault, 'integrity.json'), 'utf8')), manifest, 'verify writes nothing');
  assert.deepEqual(fingerprint(fixture), original);
});

test('install replaces the fixture with the rebuild\'s answers, readings and decisions, and leaves the trials\' bundles behind', t => {
  // A copy of the plugin, so that the install writes its own fixture and never Harbor.
  const work = workspace(t), copy = join(work, 'plugin'), copied = join(copy, 'qualification/rebuild-fixture.mjs');
  mkdirSync(dirname(copied), { recursive: true });
  cpSync(script, copied);
  const target = join(copy, 'qualification/fixture'), observed = { parts: {}, compositions: {} };
  mkdirSync(join(target, 'dossiers'), { recursive: true });
  writeFileSync(join(target, 'dossiers', 'old-record'), 'the fixture before');
  writeFileSync(join(target, 'expected-marks.json'), JSON.stringify(observed));
  const output = join(work, 'build');
  const committed = ['dossier.json', 'index.md', 'parts/vault/integrity.json', 'parts/vault/decisions.log', 'parts/vault/ledger.md', 'parts/vault/evidence/chart-64fcc7.json', 'parts/vault/evidence/chart-64fcc7.md', 'compositions/control/evidence/tlc-N1-executor-offline-4dafb3.json'];
  const local = ['parts/vault/trials/2026-11-07-0700-chart-aaaaaa/output.txt', 'parts/vault/.running/2026-11-07-0701-tlc-bbbbbb/result.json', 'compositions/control/trials/2026-11-07-0702-tlc-cccccc/receipt.json'];
  for (const path of [...committed, ...local]) { mkdirSync(dirname(join(output, 'dossiers', path)), { recursive: true }); writeFileSync(join(output, 'dossiers', path), path); }
  const installed = spawnSync(process.execPath, ['--input-type=module', '-e', `const { installFixture } = await import(${JSON.stringify(pathToFileURL(copied).href)}); installFixture(${JSON.stringify({ output, verified: 0, observed })});`], { encoding: 'utf8' });
  assert.equal(installed.status, 0, installed.stderr);
  for (const path of committed) assert.equal(readFileSync(join(target, 'dossiers', path), 'utf8'), path, `${path} is installed`);
  for (const folder of ['parts/vault/trials', 'parts/vault/.running', 'compositions/control/trials']) assert.equal(existsSync(join(target, 'dossiers', folder)), false, `${folder}/ stays with the rebuild`);
  assert.equal(existsSync(join(target, 'dossiers', 'old-record')), false, 'the fixture is replaced whole');
  assert.deepEqual(readdirSync(target).sort(), ['dossiers', 'expected-marks.json'], 'no staging folder is left');
  for (const path of local) assert.equal(readFileSync(join(output, 'dossiers', path), 'utf8'), path, 'the rebuild keeps its bundles');
});
