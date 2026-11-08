// The solver installer's pure parts: the table of pinned artifacts, the hash refusal and the env.sh
// it writes. Nothing here touches the network. The downloads themselves, and a recheck of Harbor
// with what they install, run in the hosted workflow's recheck-harbor job.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const plugin = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const { ARTIFACTS, ENV_HEADER, envText, hashProblem, sha256Of } = await import(pathToFileURL(join(plugin, 'qualification/install-toolchain.mjs')).href);

type Artifact = { name: string; version: string; file: string; url: string; sha256: string; unpacked?: { dir: string; launcher: string; jar: string; jarSha256: string } };
const artifacts = ARTIFACTS as Artifact[];
const byName = (name: string) => artifacts.find(a => a.name === name)!;

test('the table pins TLC, Apalache and Alloy from their GitHub releases', () => {
  assert.deepEqual(artifacts.map(a => a.name), ['tla2tools', 'apalache', 'alloy']);
  for (const a of artifacts) {
    assert.match(a.sha256, /^[0-9a-f]{64}$/, `${a.name} has no SHA-256`);
    assert.match(a.url, /^https:\/\/github\.com\/[^/]+\/[^/]+\/releases\/download\/v[0-9.]+\//, `${a.name} is not a GitHub release download`);
    assert.ok(a.url.includes(`/v${a.version}/`), `${a.name}'s URL names another version than ${a.version}`);
    assert.ok(a.file.includes(a.version), `${a.name}'s file name does not carry its version`);
  }
  assert.equal(byName('tla2tools').url, 'https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar');
  assert.equal(byName('apalache').url, 'https://github.com/apalache-mc/apalache/releases/download/v0.62.4/apalache-0.62.4.tgz');
  assert.equal(byName('alloy').url, 'https://github.com/AlloyTools/org.alloytools.alloy/releases/download/v6.2.0/org.alloytools.alloy.dist.jar');
  const apalache = byName('apalache').unpacked!;
  assert.equal(apalache.dir, 'apalache-0.62.4');
  assert.match(apalache.jarSha256, /^[0-9a-f]{64}$/);
});

test('the pinned versions are the ones Harbor records', () => {
  // Harbor's entries record apalache 0.62.4 and TLC from tla2tools 1.7.4 (rev 5a47802), and its
  // Alloy entries name org.alloytools.alloy.dist-6.2.0.jar.
  assert.equal(byName('tla2tools').version, '1.7.4');
  assert.equal(byName('apalache').version, '0.62.4');
  assert.equal(byName('alloy').version, '6.2.0');
  assert.equal(byName('alloy').file, 'org.alloytools.alloy.dist-6.2.0.jar');
});

test('a hash check accepts the expected bytes and names both hashes when they differ', () => {
  const bytes = Buffer.from('tla2tools stand-in\n');
  const digest = sha256Of(bytes);
  assert.equal(sha256Of(Buffer.from('')), 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  assert.equal(sha256Of(Buffer.from('abc')), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  const artifact = { ...byName('tla2tools'), sha256: digest };
  assert.equal(hashProblem(artifact, sha256Of(bytes)), null);
  const tampered = sha256Of(Buffer.from('tla2tools stand-in, altered\n'));
  const problem = hashProblem(artifact, tampered);
  assert.ok(problem, 'a different hash is refused');
  assert.ok(problem.includes(`expected ${digest}`), problem);
  assert.ok(problem.includes(`SHA-256 ${tampered}`), problem);
  assert.ok(problem.includes('deleted'), problem);
});

test('env.sh exports the solvers at the folder and leaves JAVA to the machine', () => {
  const dir = '/opt/dossier toolchain';
  const text: string = envText(dir);
  assert.ok(text.startsWith(ENV_HEADER + '\n'));
  assert.ok(text.includes(`export TLA_TOOLS='/opt/dossier toolchain/tla2tools-1.7.4.jar'\n`), text);
  assert.ok(text.includes(`export APALACHE='/opt/dossier toolchain/apalache-0.62.4/bin/apalache-mc'\n`), text);
  assert.ok(text.includes(`export ALLOY_JAR='/opt/dossier toolchain/org.alloytools.alloy.dist-6.2.0.jar'\n`), text);
  assert.ok(text.includes('export JAVA\n'), text);
  assert.ok(!/export JAVA=/.test(text), 'JAVA is not pinned to a path');
  assert.ok(text.endsWith('\n'));
});

test('env.sh keeps a JAVA that is set and otherwise finds java on the PATH', () => {
  const work = mkdtempSync(join(tmpdir(), 'install-toolchain-'));
  try {
    const sourced = (env: Record<string, string>) => spawnSync('/bin/sh', ['-c', `. "$1" && printf '%s|%s' "$JAVA" "$TLA_TOOLS"`, 'sh', join(work, 'env.sh')], { encoding: 'utf8', env: { PATH: env.PATH ?? '/nonexistent', ...env } });
    writeFileSync(join(work, 'env.sh'), envText(work));
    assert.equal(sourced({ JAVA: '/custom/java' }).stdout, `/custom/java|${join(work, 'tla2tools-1.7.4.jar')}`);
    const bin = join(work, 'bin');
    mkdirSync(bin);
    writeFileSync(join(bin, 'java'), '#!/bin/sh\n');
    chmodSync(join(bin, 'java'), 0o755);
    assert.equal(sourced({ PATH: bin }).stdout, `${join(bin, 'java')}|${join(work, 'tla2tools-1.7.4.jar')}`);
    assert.equal(sourced({ PATH: join(work, 'empty') }).stdout, `|${join(work, 'tla2tools-1.7.4.jar')}`);
  } finally { rmSync(work, { recursive: true, force: true }); }
});

test('a path with a single quote survives in env.sh', () => {
  const text: string = envText("/tmp/it's here");
  assert.ok(text.includes(`export TLA_TOOLS='/tmp/it'\\''s here/tla2tools-1.7.4.jar'`), text);
});
