// Every trial id and decision line the pages quote from Harbor is in Harbor: a trial id in one of its
// answers, a decision line in one of its logs. A rebuild mints new ids and timestamps, so a page that
// quotes the last rebuild fails here instead of drifting.
// spec/ quotes nothing from Harbor: its examples are illustrative and spec-examples checks them.
//   node --test qualification/tests/quotes.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const plugin = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const harbor = join(plugin, 'qualification', 'fixture', 'dossiers');
const pages = (dir: string): string[] => readdirSync(dir).flatMap(name => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? pages(path) : name.endsWith('.md') ? [path] : [];
});
const quoting = [join(plugin, 'README.md'), join(plugin, 'qualification', 'README.md'), ...['docs', 'skills'].flatMap(dir => pages(join(plugin, dir)))];
const dossiers = ['parts', 'compositions'].flatMap(kind => readdirSync(join(harbor, kind)).map(id => join(harbor, kind, id)));
const TRIAL = /\b\d{4}-\d{2}-\d{2}-\d{4}-(?:chart|blunder|tlc|apalache|alloy|external)-[0-9a-f]{6}\b/g;
const DECISION = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z (?:begin|accept|reject|answer|risk|forget|retire)\b.* [0-9a-f]{8}$/gm;

// Harbor keeps no bundles, only its answers: each entry in evidence/ names the trial that
// established its answer, and the one that established the previous answer it keeps.
const entries = dossiers.flatMap(dir => existsSync(join(dir, 'evidence')) ? readdirSync(join(dir, 'evidence')).filter(name => name.endsWith('.json')).map(name => JSON.parse(readFileSync(join(dir, 'evidence', name), 'utf8'))) : []);

test('every trial id the pages quote is a trial in Harbor', () => {
  const trials = new Set(entries.flatMap(entry => [entry.established.trial, ...(entry.previous ? [entry.previous.established.trial] : [])]));
  assert.ok(trials.size > 0, 'Harbor holds answers, each naming its trial');
  for (const page of quoting) for (const id of readFileSync(page, 'utf8').match(TRIAL) || []) {
    assert.ok(trials.has(id), `${relative(plugin, page)} quotes ${id}, which Harbor does not hold`);
  }
});

test('every decision line the pages quote is a line of a Harbor decisions.log', () => {
  const lines = new Set(dossiers.flatMap(dir => existsSync(join(dir, 'decisions.log')) ? readFileSync(join(dir, 'decisions.log'), 'utf8').split('\n') : []));
  for (const page of quoting) for (const line of readFileSync(page, 'utf8').match(DECISION) || []) {
    assert.ok(lines.has(line), `${relative(plugin, page)} quotes a decision Harbor does not hold:\n${line}`);
  }
});
