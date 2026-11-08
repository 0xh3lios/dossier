// Every file a package script names exists, and every `npm run` the pages
// mention is a script package.json defines. A removed test or a renamed
// script then fails here instead of in a reader's terminal.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const scripts: Record<string, string> = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts;

function pages(): string[] {
  const found = ['README.md'];
  for (const top of ['docs', 'spec', 'skills', 'qualification']) {
    for (const entry of readdirSync(join(root, top), { recursive: true, encoding: 'utf8' })) {
      if (entry.endsWith('.md') && !entry.split('/').includes('node_modules')) found.push(join(top, entry));
    }
  }
  return found;
}

test('every file a package script names exists', () => {
  for (const [name, command] of Object.entries(scripts)) {
    for (const word of command.split(/\s+/)) {
      const path = word.replace(/^"|"$/g, '');
      if (!/\.(ts|mts|mjs|js|json)$/.test(path) || path.includes('*')) continue;
      assert.ok(existsSync(join(root, path)), `npm run ${name} names ${path}, which does not exist`);
    }
  }
});

test('every npm run the pages mention is a defined script', () => {
  const named = pages();
  assert.ok(named.length > 20, 'the page walk found too few pages to mean anything');
  for (const page of named) {
    for (const match of readFileSync(join(root, page), 'utf8').matchAll(/npm run ([\w:-]+)/g)) {
      assert.ok(match[1] in scripts, `${page} mentions npm run ${match[1]}, which package.json does not define`);
    }
  }
});
