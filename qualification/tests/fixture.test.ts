// Harbor against expected-marks.json, the reviewed golden, verified without a
// toolchain. rebuild-fixture.mjs regenerates the dossiers in an isolated --out and
// installs them only when their marks equal the golden; nothing regenerates the
// golden from current code.
//   node --test qualification/tests/fixture.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
const join_ = join;
import { fileURLToPath } from 'node:url';
import { listParts, listCompositions } from '../../src/dossiers/root.ts';
import { completed, readEvidence, readingClassification } from '../../src/trials/answers.ts';
import { forgottenAnswers, parseDecisions } from '../../src/dossiers/decisions.ts';
import { readIntegrity } from '../../src/dossiers/integrity.ts';
import { fingerprints } from '../../src/commands/trial.ts';
import type { Entry } from '../../src/trials/answers.ts';
import type { VerifyJson } from '../../src/commands/verify.ts';
import type { CellMark } from '../../src/verify/cells.ts';
import type { BackingState, Mark } from '../../src/verify/marks.ts';

// The reviewed expectations for Harbor.
interface ExpectedMarks {
  parts: Record<string, { tier: string; marks: Record<string, Pick<Mark, 'mark' | 'owner' | 'grounded'>>; backing: Record<string, BackingState['status']>; route: string; flags: string[] }>;
  compositions: Record<string, { cells: Record<string, { mark: CellMark; accepted: boolean }>; walks: Record<string, string>; propertyHeld: Record<string, string>; route: string; flags: string[] }>;
}

const pluginRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const bin = join(pluginRoot, 'bin', 'dossier');
const root = join(pluginRoot, 'qualification', 'fixture', 'dossiers');
const expectedPath = join(pluginRoot, 'qualification', 'fixture', 'expected-marks.json');
assert.ok(existsSync(expectedPath), 'fixture/expected-marks.json is missing; restore it from version control instead of regenerating it from a rebuild');

// verify reads the answers: it needs none of the checkers, so none is in its environment.
const env = { ...process.env };
for (const name of ['JAVA', 'TLA_TOOLS', 'ALLOY_JAR', 'APALACHE', 'DOSSIER_ROOT']) delete env[name];
function verify(args: string[]) {
  const r = spawnSync(bin, ['verify', ...args, '--root', root], { cwd: pluginRoot, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw r.error;
  return r;
}
const dossierDirs = () => [
  ...listParts(root).map(id => ({ kind: 'parts', id, dir: join(root, 'parts', id) })),
  ...listCompositions(root).map(id => ({ kind: 'compositions', id, dir: join(root, 'compositions', id) })),
];
// Each dossier's entries in evidence/, by name, as the runner published them.
const entriesOf = (dir: string): [string, Entry][] => {
  const folder = join(dir, 'evidence');
  return existsSync(folder) ? readdirSync(folder).filter(n => n.endsWith('.json')).sort().map(n => [n.slice(0, -5), JSON.parse(readFileSync(join(folder, n), 'utf8')) as Entry]) : [];
};

// A version change without a rebuild would leave Harbor naming a plugin that no longer exists.
test('Harbor was set up and its answers established by the plugin version this checkout is', () => {
  const version = JSON.parse(readFileSync(join(pluginRoot, 'package.json'), 'utf8')).version;
  assert.equal(JSON.parse(readFileSync(join(root, 'dossier.json'), 'utf8')).plugin, version, 'dossier.json');
  let count = 0;
  for (const { kind, id, dir } of dossierDirs()) for (const [name, entry] of entriesOf(dir)) {
    count += 1;
    assert.equal(entry.established.versions.dossier, version, `${kind}/${id}/evidence/${name}.json`);
    if (entry.previous) assert.equal(entry.previous.established.versions.dossier, version, `${kind}/${id}/evidence/${name}.json, its previous answer`);
  }
  assert.ok(count > 0, 'the fixture holds answers');
});

test('Harbor is stored in integrity-v1, every dossier has its integrity.json, and the views carry no hash of their own', () => {
  assert.equal(JSON.parse(readFileSync(join(root, 'dossier.json'), 'utf8')).storage, 'integrity-v1');
  const dirs = dossierDirs();
  assert.ok(dirs.length > 0, 'the fixture holds dossiers');
  for (const d of dirs) assert.ok(existsSync(join(d.dir, 'integrity.json')), `${d.kind}/${d.id}/integrity.json`);
  for (const file of [join(root, 'index.md'), ...dirs.map(d => join(d.dir, 'ledger.md'))]) {
    const text = readFileSync(file, 'utf8');
    assert.ok(text.endsWith('\n```\n') && !text.includes('ledger-hash'), `${file} is a view`);
  }
});

// A reader follows a trial id in a ledger to the answer it established, which Harbor keeps in git.
test('every trial id a ledger links leads to the entry in evidence/ that holds its answer', () => {
  let links = 0;
  for (const d of dossierDirs()) {
    const ledger = readFileSync(join(d.dir, 'ledger.md'), 'utf8');
    for (const [, text, target] of ledger.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)) {
      links += 1;
      const name = (target.match(/^evidence\/([A-Za-z0-9][A-Za-z0-9-]*)\.json$/) || [])[1];
      assert.ok(name && existsSync(join(d.dir, 'evidence', `${name}.json`)), `${d.kind}/${d.id}/ledger.md links ${target}, which is no entry there`);
      const trial = (JSON.parse(readFileSync(join(d.dir, 'evidence', `${name}.json`), 'utf8')) as Entry).established.trial;
      assert.ok(trial === text || trial.endsWith(`-${text}`), `${d.kind}/${d.id}/ledger.md links ${text} to ${target}, whose answer ${trial} established`);
    }
  }
  assert.ok(links > 0, 'the ledgers link their trials');
});

// Harbor commits its answers and leaves its trials' bundles with the rebuild, as a team's repository does.
test('every answer is bound by integrity.json and reads as the runner wrote it, every miscall carries its classification, and no bundle is kept', () => {
  let count = 0;
  for (const { kind, id, dir } of dossierDirs()) {
    for (const local of ['trials', '.running']) assert.equal(existsSync(join(dir, local)), false, `${kind}/${id}/${local}/ holds bundles, which are no part of the record`);
    const record = readIntegrity(dir, root);
    assert.deepEqual(record.problems, [], `${kind}/${id}/integrity.json`);
    const read = readEvidence(dir, record.manifest!.evidence, forgottenAnswers(parseDecisions(record.decisions).decisions), `${kind}/${id}`);
    assert.deepEqual([read.notes, read.removed, read.stray], [[], [], []], `${kind}/${id}/evidence/ holds the entries integrity.json binds, each with its reading, and nothing else`);
    assert.deepEqual(read.answers.map(a => a.name).sort(), Object.keys(record.manifest!.evidence).sort(), `${kind}/${id}: one entry for each binding`);
    for (const a of read.answers) {
      count += 1;
      const label = `${kind}/${id}/evidence/${a.name}.json`;
      assert.deepEqual(a.problems, [], `${label} has no problems`);
      assert.ok(a.entry && a.entry.answer.result !== 'aborted', `${label} reads and completed (${a.entry ? a.entry.answer.result : 'no entry'})`);
      assert.ok(completed(a), label);
      if (a.entry.answer.result === 'miscalled') assert.ok(readingClassification(a.reading), `${label} is miscalled, so its reading classifies it`);
      // A replaced miscall keeps its classification in the entry, where it moved with it.
      if (a.entry.previous && a.entry.previous.answer.result === 'miscalled') assert.ok(a.entry.previous.classification, `${label} replaced a miscall, so its previous answer keeps the classification`);
    }
  }
  assert.ok(count > 0, 'the fixture holds answers');
});

test('verify needs no toolchain, exits 0, and every mark matches expected-marks.json', () => {
  const expected = JSON.parse(readFileSync(expectedPath, 'utf8')) as ExpectedMarks;
  const r = verify(['--json']);
  assert.equal(r.status, 0, r.stderr || r.stdout.slice(0, 500));
  const json = JSON.parse(r.stdout) as VerifyJson;
  assert.match(json.verify, /^verify: ok · /);
  assert.deepEqual(json.parts.map(c => c.id).sort(), Object.keys(expected.parts).sort(), 'the same parts');
  assert.deepEqual(json.compositions.map(s => s.id).sort(), Object.keys(expected.compositions).sort(), 'the same compositions');

  for (const [id, exp] of Object.entries(expected.parts)) {
    const c = json.parts.find(x => x.id === id)!;
    assert.equal(c.tier, exp.tier, `${id} tier`);
    assert.deepEqual(c.tripwires, [], `${id} tripwires`);
    assert.deepEqual(Object.keys(c.marks).sort(), Object.keys(exp.marks).sort(), `${id} passages`);
    for (const [pid, m] of Object.entries(exp.marks)) {
      assert.equal(c.marks[pid].mark, m.mark, `${id} ${pid} mark`);
      assert.equal(c.marks[pid].owner, m.owner, `${id} ${pid} owner`);
      assert.equal(Boolean(c.marks[pid].grounded), Boolean(m.grounded), `${id} ${pid} grounded`);
    }
    assert.deepEqual(Object.fromEntries(Object.entries(c.backing).map(([k, b]) => [k, b.status])), exp.backing, `${id} backing`);
    assert.equal(c.route.pass, exp.route, `${id} route`);
    assert.deepEqual(c.flags.map(f => f.name).sort(), exp.flags, `${id} flags`);
  }
  for (const [id, exp] of Object.entries(expected.compositions)) {
    const s = json.compositions.find(x => x.id === id)!;
    assert.deepEqual(s.tripwires, [], `${id} tripwires`);
    const cells = Object.fromEntries(s.cells.map(c => [`${c.property}|${c.scenario}`, { mark: c.mark, accepted: Boolean(c.accepted) }]));
    assert.deepEqual(cells, exp.cells, `${id} cells`);
    assert.deepEqual(Object.fromEntries(s.walks.map(w => [`${w.id}|${w.scenario}`, w.mark])), exp.walks, `${id} walks`);
    assert.deepEqual(s.propertyHeld, exp.propertyHeld, `${id} propertyHeld`);
    assert.equal(s.route.pass, exp.route, `${id} route`);
    assert.deepEqual(s.flags.map(f => f.name).sort(), exp.flags, `${id} flags`);
  }

  const brief = verify(['--brief']);
  assert.equal(brief.status, 0, brief.stdout);
  assert.match(brief.stdout, /^verify: ok · \d+ parts?, \d+ compositions? · dossier /);
});

// The fixture and the recorded outputs are published: none names a machine's paths or the machine.
test('no fixture file and no recorded output names a machine path or the machine', () => {
  // A path from the file composition's root: a home, a temporary or a mounted folder, or any other such as /repo/.
  // The runner writes the paths it knows as names ($PLUGIN, $DOSSIERS, $TRIAL, $INPUTS). A path counts where
  // it starts, not inside one such as $TRIAL/states/tmp/, and a URL's //host/ is not one.
  const MACHINE = /\/Users\/|\/home\/[a-z]|\/var\/folders\/|\/private\/(?:var|tmp)\/|[A-Z]:\\Users\\|(?<![\w.$/-])\/[A-Za-z][\w.-]*\//;
  // TLC's banner names the machine's cores and heap, the process id, the composition, and the JVM's vendor and
  // architecture. A published file reads as the runner records it, and every banner carries the runner's
  // placeholders, whatever the vendor's name.
  const BANNER = /\b\d+ cores with\b|\b\d+MB heap\b|\[pid: (?!\$PID\] \(\$OS, \$JDK_VENDOR [\w.+-]+ \$JDK_ARCH, )/;
  const offenders: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) { if (entry.name !== 'node_modules') walk(path); continue; }
      const text = readFileSync(path, 'utf8');
      if (MACHINE.test(text) || BANNER.test(text) || fingerprints(text) !== text) offenders.push(path.slice(pluginRoot.length + 1));
    }
  };
  walk(join(pluginRoot, 'qualification', 'fixture'));
  walk(join(pluginRoot, 'qualification', 'tests', 'recorded'));
  assert.deepEqual(offenders, []);
});

test('a guarantee row names the backing its passage names', () => {
  const adapter = readFileSync(join_(root, 'parts', 'adapter', 'ledger.md'), 'utf8');
  assert.ok(adapter.includes('\n| K1 | record adapter#property:held-equals-supply | backed |\n'), 'the adapter\'s record backing is printed as a record');
  for (const d of dossierDirs()) {
    const ledger = readFileSync(join_(d.dir, 'ledger.md'), 'utf8');
    assert.ok(!/\n\| K\d+ \| none \| backed \|/.test(ledger), `${d.id}: no guarantee reads none and backed at once`);
  }
});
