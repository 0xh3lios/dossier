// The command line: version, usage, unknown commands, the modules the usage
// block names, and how the commands find the dossiers root.
//   node --test qualification/tests/cli.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Command } from '../../src/cli.ts';

const pluginRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const bin = join(pluginRoot, 'bin', 'dossier');
const version = (JSON.parse(readFileSync(join(pluginRoot, 'package.json'), 'utf8')) as { version: string }).version;

// The caller's environment, without a root set from outside.
const baseEnv = { ...process.env };
delete baseEnv.DOSSIER_ROOT;

// Where a command runs, and with which environment.
interface RunOptions { cwd?: string; env?: NodeJS.ProcessEnv }

function dossier(args: string[], { cwd = pluginRoot, env = baseEnv }: RunOptions = {}) {
  const r = spawnSync(bin, args, { cwd, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw r.error;
  return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

// The command names of a usage block: the first word of each indented line.
const usageCommands = (text: string) => [...new Set(text.split('\n').map(l => (l.match(/^  ([a-z]+(?:-[a-z]+)*)\b/) || [])[1]).filter(Boolean))];

function withTempDir(fn: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'dossier-cli-'));
  try { return fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('version prints the toolkit version from package.json', () => {
  assert.match(version, /^\d+\.\d+\.\d+/);
  const r = dossier(['version']);
  assert.equal(r.status, 0);
  assert.equal(r.stdout.trim(), version);
  assert.equal(r.stderr, '');
});

test('no command prints the usage and exits 2', () => {
  const r = dossier([]);
  assert.equal(r.status, 2);
  assert.match(r.stdout, /^usage: dossier <command> \[args\]/);
});

test('help and --help print the usage and exit 0', () => {
  for (const arg of ['help', '--help']) {
    const r = dossier([arg]);
    assert.equal(r.status, 0, arg);
    assert.match(r.stdout, /^usage: dossier <command> \[args\]/, arg);
    assert.ok(usageCommands(r.stdout).length >= 10, `${arg} lists the commands`);
  }
});

test('an unknown command exits 2 and names it', () => {
  const r = dossier(['frobnicate']);
  assert.equal(r.status, 2);
  assert.match(r.stderr, /^dossier: unknown command "frobnicate"/);
  assert.match(r.stderr, /usage: dossier <command>/);
  assert.equal(r.stdout, '');
});

test('every command in the usage block is dispatched to a real module under src/commands/ that exports main', async () => {
  const printed = usageCommands(dossier(['help']).stdout);
  const source = readFileSync(join(pluginRoot, 'src', 'cli.ts'), 'utf8');
  const fromSource = usageCommands(source.match(/const usage = `([\s\S]*?)`;/)![1]);
  assert.deepEqual(printed, fromSource, 'help prints the usage block of src/cli.ts');
  const expected = ['verify', 'render', 'recover', 'draw', 'scaffold', 'call', 'blunder', 'show', 'trial', 'recheck', 'decide', 'review-basis', 'where', 'import', 'explore', 'doctor', 'setup', 'version'];
  assert.deepEqual([...printed].sort(), [...expected].sort());

  const table = source.match(/const modules = \{([^}]*)\}/)![1];
  const dispatched = [...table.matchAll(/(?:'([a-z-]+)'|([a-z]+)):\s*'([a-z-]+)'/g)].map(m => ({ command: m[1] || m[2], file: m[3] }));
  assert.ok(dispatched.length >= 9, 'the dispatch table is readable');
  for (const name of printed.filter(n => n !== 'version')) {
    const entry = dispatched.find(d => d.command === name);
    assert.ok(entry, `${name} is in the dispatch table of src/cli.ts`);
    const file = join(pluginRoot, 'src', 'commands', `${entry.file}.ts`);
    assert.ok(existsSync(file), `${file} exists`);
    const mod = await import(pathToFileURL(file).href) as { main: Command };
    assert.equal(typeof mod.main, 'function', `${entry.file}.ts exports main`);
  }
  for (const d of dispatched) assert.ok(printed.includes(d.command), `${d.command} is in the usage block`);
});

test('commands that need a dossiers root exit 2 without one', () => withTempDir(dir => {
  for (const command of ['verify', 'render', 'recover', 'draw', 'scaffold', 'trial', 'recheck', 'decide', 'review-basis', 'where', 'import']) {
    const r = dossier([command, 'x', 'y'], { cwd: dir });
    assert.equal(r.status, 2, `${command}: ${r.stderr}`);
    assert.match(r.stderr, /no dossiers root here/, command);
  }
}));

test('a root that --root or DOSSIER_ROOT names without dossier.json is one line on stderr and exit 2', () => withTempDir(dir => {
  const cases: [string, string[], NodeJS.ProcessEnv][] = [
    ['verify by --root', ['verify', '--root', dir], baseEnv],
    ['where by --root', ['where', 'gate', '--root', dir], baseEnv],
    ['recheck by --root', ['recheck', 'gate', '--root', dir], baseEnv],
    ['verify by DOSSIER_ROOT', ['verify'], { ...baseEnv, DOSSIER_ROOT: dir }],
    ['decide by DOSSIER_ROOT', ['decide', 'gate', 'retire', '--', 'x'], { ...baseEnv, DOSSIER_ROOT: dir }],
  ];
  for (const [how, args, env] of cases) {
    const r = dossier(args, { cwd: dir, env });
    assert.equal(r.status, 2, `${how}: ${r.stderr}`);
    assert.equal(r.stderr, `dossier: no dossier.json in ${dir}\n`, how);
    assert.equal(r.stdout, '', how);
  }
  // doctor reports it among its rows, and setup prepares the folder --root names.
  const doctor = dossier(['doctor', '--root', dir], { cwd: dir });
  assert.match(doctor.stdout, new RegExp(`^missing\\s+dossiers root: no dossier\\.json in ${dir.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}\\. Fix: `, 'm'));
  assert.doesNotMatch(doctor.stderr, /\n\s+at /, 'no stack trace');
}));

test('the root is found above the working directory, below it, by --root and by DOSSIER_ROOT', () => withTempDir(dir => {
  const dossiers = join(dir, 'project', 'dossiers');
  // _scratch/ is the root's own ignored working folder: nothing in it is a dossier.
  mkdirSync(join(dossiers, '_scratch', 'deep'), { recursive: true });
  writeFileSync(join(dossiers, 'dossier.json'), JSON.stringify({ plugin: version, storage: 'integrity-v1' }) + '\n');
  const okLine = new RegExp(`^verify: ok · no dossiers · dossier ${version.replace(/\./g, '\\.')} · 0 tripwires`);
  const cases: [string, string[], RunOptions][] = [
    ['from a folder inside the root', ['verify'], { cwd: join(dossiers, '_scratch', 'deep') }],
    ['from the repository above dossiers/', ['verify'], { cwd: join(dir, 'project') }],
    ['by --root', ['verify', '--root', dossiers], { cwd: dir }],
    ['by --root before the command', ['--root', dossiers, 'verify'], { cwd: dir }],
    ['by DOSSIER_ROOT', ['verify'], { cwd: dir, env: { ...baseEnv, DOSSIER_ROOT: dossiers } }],
  ];
  for (const [how, args, opts] of cases) {
    const r = dossier(args, opts);
    assert.equal(r.status, 0, `${how}: ${r.stderr}`);
    assert.match(r.stdout, okLine, how);
  }
}));
