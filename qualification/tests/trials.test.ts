// The runner's own pieces, apart from any checker: the receipt's output, the
// options of dossier trial, and what is redacted from what a trial keeps.
// Run: node --test qualification/tests/trials.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { headBytes, placeOutput } from '../../src/trials/receipt.ts';
import { fingerprints, redact, trialOptions } from '../../src/commands/trial.ts';

describe('placeOutput', () => {
  it('truncates by bytes, never past the limit and never inside a character', () => {
    const dir = mkdtempSync(join(tmpdir(), 'dossier-output-'));
    try {
      const text = 'é'.repeat(10);
      const placed = placeOutput(dir, text, { limit: 7, store: '' });
      assert.equal(placed.stored, 'truncated');
      assert.equal(placed.size, 20);
      const written = readFileSync(join(dir, 'output.txt'));
      const head = written.subarray(0, written.indexOf('\n--- truncated'));
      assert.equal(head.toString('utf8'), 'ééé', 'three whole characters, six bytes, within seven');
      assert.ok(!written.toString('utf8').includes('�'));
      assert.equal(headBytes('abc', 2).toString(), 'ab');
      assert.equal(headBytes('a€', 2).toString(), 'a', 'the euro sign takes three bytes');
      assert.equal(headBytes('a€', 4).toString(), 'a€');
      assert.equal(placeOutput(dir, 'é'.repeat(3), { limit: 6, store: '' }).stored, 'trial', 'six bytes fit a limit of six');
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

describe('trialOptions', () => {
  it('reads whole numbers above zero, auto for workers, and refuses the rest', () => {
    assert.deepEqual(trialOptions(['gate', 'chart.md']), { timeoutSeconds: 600, workers: '1', limit: 20000, problems: [] });
    assert.deepEqual(trialOptions(['gate', 'chart.md', '--timeout', '30', '--workers', 'auto', '--limit', '500']), { timeoutSeconds: 30, workers: 'auto', limit: 500, problems: [] });
    assert.deepEqual(trialOptions(['--timeout', 'abc', '--workers', '1.5', '--limit', '0']).problems, ['--timeout takes a whole number of seconds above 0, not "abc"', '--workers takes a whole number above 0, or auto, not "1.5"', '--limit takes a whole number of states above 0, not "0"']);
    assert.deepEqual(trialOptions(['gate', 'chart.md', '--timeout']).problems, ['--timeout takes a whole number of seconds above 0']);
    assert.deepEqual(trialOptions(['--timeout', '--limit', '5']).problems, ['--timeout takes a whole number of seconds above 0'], 'an option is no value');
  });
});

describe('redact', () => {
  it('names a root reached through a symbolic link as the root, the trial before its root, and never a path inside a longer one', () => {
    const base = mkdtempSync(join(tmpdir(), 'dossier-redact-'));
    try {
      const real = join(realpathSync(base), 'repo');
      mkdirSync(join(real, 'dossiers', 'parts', 'gate', '.running', 'x'), { recursive: true });
      const link = join(base, 'link');
      symlinkSync(real, link);
      const root = join(link, 'dossiers');
      const trialDir = join(root, 'parts', 'gate', '.running', 'x');
      const [given, resolved, longer] = redact([`-metadir ${trialDir}/states`, `Parsing file ${join(real, 'dossiers', 'parts', 'gate', 'model', 'Gate.tla')}`, `${root}-old/prose.md`], { trialDir, root, pluginRoot: '/nowhere/plugin', env: {} });
      assert.equal(given, '-metadir $TRIAL/states');
      assert.equal(resolved, 'Parsing file $DOSSIERS/parts/gate/model/Gate.tla', 'the path as the file composition resolves it');
      assert.equal(longer, `${root}-old/prose.md`, 'another folder that only begins like the root');
      assert.deepEqual(redact(['java -version'], { trialDir, root, pluginRoot: '/nowhere/plugin', env: { JAVA: 'java' } }), ['java -version'], 'a bare command is no path');
    } finally { rmSync(base, { recursive: true, force: true }); }
  });

  it('takes out of TLC\'s banner the cores, the heap, the process, the composition and the JVM\'s vendor and architecture, and keeps its version', () => {
    const banner = 'Running breadth-first search Model-Checking with fp 87 and seed 8830817409892069689 with 1 worker on 10 cores with 3641MB heap and 64MB offheap memory [pid: 37753] (Mac OS X 26.7.2 aarch64, Eclipse Adoptium 21.0.13 x86_64, MSBDiskFPSet, DiskStateQueue).';
    assert.equal(fingerprints(banner), 'Running breadth-first search Model-Checking with fp 87 and seed 8830817409892069689 with 1 worker on $CORES cores with $HEAP heap and 64MB offheap memory [pid: $PID] ($OS, $JDK_VENDOR 21.0.13 $JDK_ARCH, MSBDiskFPSet, DiskStateQueue).');
    const linux = 'with 4 workers on 16 cores with 7282MB heap and 64MB offheap memory [pid: 12] (Linux 6.8.0-45-generic amd64, Oracle Corporation 21.0.2 amd64, MSBDiskFPSet, DiskStateQueue).';
    assert.equal(fingerprints(linux), 'with 4 workers on $CORES cores with $HEAP heap and 64MB offheap memory [pid: $PID] ($OS, $JDK_VENDOR 21.0.2 $JDK_ARCH, MSBDiskFPSet, DiskStateQueue).');
    for (const vendor of ['Azul Compositions, Inc.', 'Red Hat, Inc.']) {
      const banner = `with 1 worker on 8 cores with 2048MB heap and 64MB offheap memory [pid: 4242] (Linux 6.8.0-45-generic amd64, ${vendor} 17.0.12 amd64, OffHeapDiskFPSet, DiskStateQueue).`;
      assert.equal(fingerprints(banner), 'with 1 worker on $CORES cores with $HEAP heap and 64MB offheap memory [pid: $PID] ($OS, $JDK_VENDOR 17.0.12 $JDK_ARCH, OffHeapDiskFPSet, DiskStateQueue).', vendor);
    }
    assert.equal(fingerprints('nothing of the machine here'), 'nothing of the machine here');
  });
});
