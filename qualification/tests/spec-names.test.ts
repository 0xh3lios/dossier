// The tripwires and flags spec/evidence.md names are the ones the code emits, both ways. On
// 2026-11-07 the spec renamed the trial and receipt tripwires to answer ones and every other test
// still passed, so nothing tied the two lists; this does. Names are read from the source text: a
// tripwire is a trip(), fail() or problem name, a flag a flag() name.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const plugin = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const spec = readFileSync(join(plugin, 'spec', 'evidence.md'), 'utf8');
const section = (title: string) => spec.split(/^## /m).find(s => s.startsWith(title)) || '';
const ticked = (text: string) => [...text.matchAll(/`([^`]+)`/g)].map(m => m[1]);

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : name.endsWith('.ts') ? [readFileSync(path, 'utf8')] : [];
  });
}
const code = sources(join(plugin, 'src')).join('\n');
// The records' own problems carry their tripwire's name: integrity.json's as a problem's name, and
// evidence/'s as a note's name or as the first argument of an entry's problem(), never in its detail.
const records = ['src/dossiers/integrity.ts', 'src/trials/answers.ts'].map(path => readFileSync(join(plugin, path), 'utf8')).join('\n');
const all = (pattern: RegExp, text = code) => new Set([...text.matchAll(pattern)].map(m => m[1]));

test('every tripwire spec/evidence.md names is one the code emits, and every one the code emits is named there', () => {
  // The table's first column.
  const named = new Set(section('Tripwires').split('\n').filter(line => line.startsWith('| `')).flatMap(line => ticked(line.split(' | ')[0])));
  const emitted = new Set([
    ...all(/\btrip\('([^']+)'/g), ...all(/\bfail\('([^']+)'/g), ...all(/\bname: '([^']+)'/g, records),
    ...all(/\bproblem\('([^']+)'/g, records),
  ]);
  assert.deepEqual([...named].filter(n => !emitted.has(n)).sort(), [], 'named in the spec, emitted by no code');
  assert.deepEqual([...emitted].filter(n => !named.has(n)).sort(), [], 'emitted by the code, named in no spec row');
});

test('every flag spec/evidence.md names is one the code emits, and every one the code emits is named there', () => {
  const named = new Set(ticked(section('Flags')).filter(name => /^[a-zA-Z_ ]+$/.test(name)));
  const emitted = new Set([...all(/\bflag\('([^']+)'/g), ...all(/'(doubt answer (?:stale|unbound))'/g)]);
  assert.deepEqual([...named].filter(n => !emitted.has(n)).sort(), [], 'named in the spec, emitted by no code');
  assert.deepEqual([...emitted].filter(n => !named.has(n)).sort(), [], 'emitted by the code, named in no spec paragraph');
});
