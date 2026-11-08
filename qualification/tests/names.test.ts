// The vocabulary cannot drift between the reference, the reader docs and the code. The tripwires and
// flags are read from spec/evidence.md itself, which spec-names.test.ts ties to the code both ways: here
// the reader docs must name each. The marks and cells are listed here, since those sections of the
// reference tick paths and examples beside them, and each list is held to the reference, the reader
// docs and the code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const reference = read('spec/evidence.md');
const readingDoc = read('docs/reference/marks.md');
// A section of the reference by its heading, and the names it ticks.
const section = (title: string) => reference.split(/^## /m).find(s => s.startsWith(title)) || '';
const ticked = (text: string) => [...text.matchAll(/`([^`]+)`/g)].map(m => m[1]);

const MARKS = ['text', 'given', 'backed', 'assumed', 'unresolved', 'untried', 'owed', 'checked', 'lapsed', 'hollow', 'miscalled', 'proved', 'held', 'drawn', 'pending'];
const CELLS = ['pending', 'checked', 'proved', 'violated', 'lapsed', 'implied', 'open', 'miscalled'];
// The first column of the Tripwires table, and the names the Flags section ticks.
const TRIPWIRES = [...new Set(section('Tripwires').split('\n').filter(line => line.startsWith('| `')).flatMap(line => ticked(line.split(' | ')[0])))];
const FLAGS = [...new Set(ticked(section('Flags')).filter(name => /^[a-zA-Z_ ]+$/.test(name)))];

test('the ledger reference names every mark and cell, and its tripwire table and flag list read as names', () => {
  for (const name of [...MARKS, ...CELLS]) assert.ok(reference.includes(`\`${name}\``), `spec/evidence.md does not name ${name}`);
  // Read from the reference, the lists must not come back empty or half-parsed, or every check below would hold of nothing.
  for (const [what, names] of [['tripwire', TRIPWIRES], ['flag', FLAGS]] as const) {
    assert.ok(names.length > 0, `spec/evidence.md names no ${what}`);
    for (const name of names) assert.match(name, /^[A-Za-z_][A-Za-z_ ]*$/, `the ${what} "${name}" does not read as a name`);
  }
});

test('the reader docs name every mark, cell, tripwire and flag', () => {
  for (const name of [...MARKS, ...CELLS, ...TRIPWIRES, ...FLAGS]) assert.ok(readingDoc.includes(`\`${name}\``), `docs/reference/marks.md does not name ${name}`);
});

test('the tool emits every mark the reference names', () => {
  const marks = read('src/verify/marks.ts') + read('src/verify/analyze.ts');
  for (const name of MARKS) assert.ok(marks.includes(`'${name}'`), `the tool never emits ${name}`);
});

test('the tool emits every cell mark the reference names', () => {
  const cells = read('src/verify/cells.ts');
  for (const name of CELLS) assert.ok(cells.includes(`'${name}'`), `cells.ts never emits ${name}`);
});
