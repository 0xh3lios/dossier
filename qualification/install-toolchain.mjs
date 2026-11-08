#!/usr/bin/env node
// node qualification/install-toolchain.mjs [--into <dir>]
// Installs the solver distributions the answers in Harbor came from: tla2tools.jar for TLC, the
// Apalache distribution and the Alloy jar, each from its project's GitHub release, at a pinned
// version and SHA-256. A download whose hash differs is deleted and refused. Apalache is unpacked
// beside its archive. <dir>/env.sh then exports TLA_TOOLS, APALACHE and ALLOY_JAR, and JAVA from
// the machine: $JAVA when it is set, otherwise the `java` on the PATH. A file already present with
// the pinned hash is kept, so a second run downloads nothing. The default <dir> is
// .local/toolchain/ under the working directory. Plain Node, no dependencies; unpacking uses tar.
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// The pinned artifacts. Each hash was computed from the release artifact and matches the file
// the fixture's answers were produced with.
export const ARTIFACTS = [
  {
    name: 'tla2tools',
    version: '1.7.4',
    file: 'tla2tools-1.7.4.jar',
    url: 'https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar',
    sha256: '936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88',
  },
  {
    name: 'apalache',
    version: '0.62.4',
    file: 'apalache-0.62.4.tgz',
    url: 'https://github.com/apalache-mc/apalache/releases/download/v0.62.4/apalache-0.62.4.tgz',
    sha256: 'b781b53bba32fac14ac2e02b0332e1dc2edc64cb7b850c0608d8142cc7aa2ef4',
    // The archive unpacks to this folder. Its jar is checked too, so a damaged unpack is redone.
    unpacked: { dir: 'apalache-0.62.4', launcher: 'bin/apalache-mc', jar: 'lib/apalache.jar', jarSha256: 'e5223915507b65cc5f1638bd037ede60f8a4fc1644aff46355779f9b05df9262' },
  },
  {
    name: 'alloy',
    version: '6.2.0',
    file: 'org.alloytools.alloy.dist-6.2.0.jar',
    url: 'https://github.com/AlloyTools/org.alloytools.alloy/releases/download/v6.2.0/org.alloytools.alloy.dist.jar',
    sha256: '6b8c1cb5bc93bedfc7c61435c4e1ab6e688a242dc702a394628d9a9801edb78d',
  },
];

// The first line of every env.sh this script writes. An env.sh without it was written by someone
// else and is left alone.
export const ENV_HEADER = '# Written by qualification/install-toolchain.mjs. Rerun it rather than editing this file.';

export const sha256Of = (bytes) => createHash('sha256').update(bytes).digest('hex');

// Null when the bytes carry the expected hash, otherwise the refusal to print.
export function hashProblem(artifact, observed) {
  return observed === artifact.sha256 ? null : `${artifact.file} from ${artifact.url} has SHA-256 ${observed}, expected ${artifact.sha256}; the download was deleted`;
}

const quote = (path) => `'${path.replace(/'/g, `'\\''`)}'`;

export function envText(dir) {
  const at = (relative) => quote(join(dir, relative));
  const apalache = ARTIFACTS.find(a => a.name === 'apalache').unpacked;
  return [
    ENV_HEADER,
    '# JAVA is left to the machine: $JAVA when it is set, otherwise the java on the PATH.',
    'if [ -z "${JAVA:-}" ]; then JAVA=$(command -v java || true); fi',
    'export JAVA',
    `export TLA_TOOLS=${at(ARTIFACTS.find(a => a.name === 'tla2tools').file)}`,
    `export APALACHE=${at(join(apalache.dir, apalache.launcher))}`,
    `export ALLOY_JAR=${at(ARTIFACTS.find(a => a.name === 'alloy').file)}`,
    '',
  ].join('\n');
}

async function hashFile(path) {
  const hash = createHash('sha256');
  await pipeline(createReadStream(path), hash);
  return hash.digest('hex');
}

// Downloads to a .part file, hashing as it writes, and renames it into place only when the hash
// matches.
async function download(artifact, target) {
  const part = `${target}.part`;
  rmSync(part, { force: true });
  const response = await fetch(artifact.url, { redirect: 'follow' });
  if (!response.ok || !response.body) throw new Error(`${artifact.url} answered ${response.status} ${response.statusText}`);
  const hash = createHash('sha256');
  const out = createWriteStream(part);
  try { await pipeline(Readable.fromWeb(response.body), async function* (chunks) { for await (const chunk of chunks) { hash.update(chunk); yield chunk; } }, out); }
  catch (error) { rmSync(part, { force: true }); throw error; }
  const problem = hashProblem(artifact, hash.digest('hex'));
  if (problem) { rmSync(part, { force: true }); throw new Error(problem); }
  renameSync(part, target);
}

async function unpack(artifact, dir) {
  const { unpacked } = artifact;
  const folder = join(dir, unpacked.dir), jar = join(folder, unpacked.jar);
  if (existsSync(jar) && existsSync(join(folder, unpacked.launcher)) && await hashFile(jar) === unpacked.jarSha256) return false;
  const staging = join(dir, `.unpacking-${artifact.name}`);
  rmSync(staging, { recursive: true, force: true });
  mkdirSync(staging, { recursive: true });
  const tar = spawnSync('tar', ['-xzf', join(dir, artifact.file), '-C', staging], { encoding: 'utf8' });
  if (tar.status !== 0) { rmSync(staging, { recursive: true, force: true }); throw new Error(`tar could not unpack ${artifact.file}: ${(tar.stderr || tar.error?.message || '').trim()}`); }
  const observed = existsSync(join(staging, unpacked.dir, unpacked.jar)) ? await hashFile(join(staging, unpacked.dir, unpacked.jar)) : 'missing';
  if (observed !== unpacked.jarSha256) { rmSync(staging, { recursive: true, force: true }); throw new Error(`${artifact.file} unpacked ${unpacked.dir}/${unpacked.jar} with SHA-256 ${observed}, expected ${unpacked.jarSha256}`); }
  rmSync(folder, { recursive: true, force: true });
  renameSync(join(staging, unpacked.dir), folder);
  rmSync(staging, { recursive: true, force: true });
  return true;
}

export async function install(dir, log = console.log) {
  mkdirSync(dir, { recursive: true });
  const envPath = join(dir, 'env.sh');
  if (existsSync(envPath) && !readFileSync(envPath, 'utf8').startsWith(ENV_HEADER)) {
    throw new Error(`${envPath} was not written by this script; choose another --into or move that file`);
  }
  let downloaded = 0;
  for (const artifact of ARTIFACTS) {
    const target = join(dir, artifact.file);
    if (existsSync(target)) {
      const observed = await hashFile(target);
      if (observed === artifact.sha256) { log(`have ${artifact.name} ${artifact.version}`); }
      else { log(`${artifact.file} has SHA-256 ${observed}, expected ${artifact.sha256}; downloading it again`); rmSync(target); }
    }
    if (!existsSync(target)) { log(`downloading ${artifact.name} ${artifact.version} from ${artifact.url}`); await download(artifact, target); downloaded++; }
    if (artifact.unpacked && await unpack(artifact, dir)) log(`unpacked ${artifact.unpacked.dir}`);
  }
  writeFileSync(envPath, envText(dir));
  log(`${downloaded} downloaded; load the toolchain with: . ${envPath}`);
  return { downloaded, envPath };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), usage = 'usage: node qualification/install-toolchain.mjs [--into <dir>]';
  let into = '.local/toolchain';
  try {
    if (args.length === 2 && args[0] === '--into' && args[1] && !args[1].startsWith('--')) into = args[1];
    else if (args.length) throw new Error(usage);
    await install(resolve(into));
  } catch (error) {
    console.error(`install-toolchain: ${error.message}`);
    process.exitCode = 1;
  }
}
