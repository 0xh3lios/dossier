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
import { verifyAll } from '../../src/commands/verify.ts';
import { behaviorLines } from '../../src/commands/where.ts';
import { claimsLine } from '../../src/verify/render.ts';

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

// The pages also quote what Harbor's behaviors report: the lines `dossier where` prints for a behavior,
// the `claims:` line of verify's summary, a claim as its file holds it, and the behaviors' titles. A
// review, a reworded claim or a rebuild changes those, so each quote is held to Harbor as it stands.
const version: string = JSON.parse(readFileSync(join(plugin, 'package.json'), 'utf8')).version;
let harborNow: ReturnType<typeof verifyAll> | null = null;
const analyses = () => { harborNow ??= verifyAll({ root: harbor, version }); return [...harborNow.parts, ...harborNow.compositions]; };
const fenced = (text: string): string[] => [...text.matchAll(/^ *```(\w*)\n([\s\S]*?)^ *```/gm)].map(m => m[2]);
const CLAIM_LINE = /^C[1-9]\d*: .+ — .+; (?:model|source|deployment); (?:current|stale|missing|invalid)$/;
const MAPPING_LINE = /^M[1-9]\d* (?:supports|challenges|illustrates) .+; (?:unreviewed|assessed|contested); (?:current|stale|missing|invalid)$/;
const BEHAVIOR_LINE = /^(?:parts|compositions)\/[a-z][a-z0-9-]*#[a-z][a-z0-9-]*: .+$/;

test('every behavior, claim and mapping line the pages quote is a line dossier where prints for Harbor', () => {
  const printed = new Set(analyses().flatMap(a => (a.behaviors?.behaviors || []).flatMap(b => behaviorLines(a.ref, b))).map(line => line.trim()));
  assert.ok(printed.size > 0, 'Harbor reports its behaviors');
  let quoted = 0;
  for (const page of quoting) for (const block of fenced(readFileSync(page, 'utf8'))) for (const line of block.split('\n').map(l => l.trim())) {
    if (!CLAIM_LINE.test(line) && !MAPPING_LINE.test(line) && !BEHAVIOR_LINE.test(line)) continue;
    quoted += 1;
    assert.ok(printed.has(line), `${relative(plugin, page)} quotes a line dossier where does not print for Harbor now:\n${line}`);
  }
  assert.ok(quoted > 0, 'the pages quote Harbor\'s claims');
});

test('every claims line the pages quote is one verify prints for a Harbor dossier', () => {
  const printed = new Set(analyses().map(a => claimsLine(a)?.trim()).filter(Boolean));
  for (const page of quoting) for (const block of fenced(readFileSync(page, 'utf8'))) for (const line of block.split('\n').map(l => l.trim())) {
    if (/^claims: \d+ behaviors?, \d+ claims?\b/.test(line)) assert.ok(printed.has(line), `${relative(plugin, page)} quotes a claims line verify does not print for Harbor now:\n${line}`);
  }
});

test('every claim the pages show as JSON is a claim of a Harbor behavior, as its file holds it', () => {
  const claims = analyses().flatMap(a => (a.behaviorCollection?.behaviors || []).flatMap(b => b.record.claims));
  for (const page of quoting) for (const block of fenced(readFileSync(page, 'utf8'))) {
    let shown: unknown;
    try { shown = JSON.parse(block); } catch { continue; }
    if (!shown || typeof shown !== 'object' || !('statement' in shown) || !('mappings' in shown)) continue;
    assert.ok(claims.some(claim => { try { assert.deepEqual(claim, shown); return true; } catch { return false; } }), `${relative(plugin, page)} shows a claim no Harbor behavior holds:\n${block}`);
  }
});

test('the Harbor reference names every behavior of every dossier by its title, in reading order', () => {
  const rows = new Map([...readFileSync(join(plugin, 'docs', 'reference', 'harbor.md'), 'utf8').split('## Behaviors')[1].split('\n## ')[0].matchAll(/^\| `([a-z-]+)` \| (.+) \|$/gm)].map(m => [m[1], m[2]]));
  for (const a of analyses()) {
    const titles = (a.behaviors?.behaviors || []).map(b => b.title);
    assert.equal(rows.get(a.id), titles.map(t => `${t}.`).join(' '), `docs/reference/harbor.md, the behaviors of ${a.id}`);
  }
  assert.equal(rows.size, analyses().length, 'one row for each Harbor dossier');
});
