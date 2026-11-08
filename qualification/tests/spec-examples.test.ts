import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { parseCall } from '../../src/trials/calls.ts';
import { planTrial } from '../../src/trials/plan.ts';
import { loadPart, loadComposition, externalsOf } from '../../src/dossiers/load.ts';
import { listParts } from '../../src/dossiers/root.ts';
import { readWiring } from '../../src/dossiers/wiring.ts';
import { readActors } from '../../src/dossiers/actors.ts';
import { parseCompositionProse } from '../../src/prose/prose.ts';
import { composeMembers } from '../../src/models/compose.ts';
import { parseDoubts } from '../../src/dossiers/doubts.ts';
import { parseDecisions } from '../../src/dossiers/decisions.ts';
import { fingerprint } from '../conformance/files.ts';

const plugin = fileURLToPath(new URL('../../', import.meta.url));
const root = join(plugin, 'qualification/fixture/dossiers');
interface Example { path: string; ordinal: number; kind: string; id: string; setup: string | null; description: string }
const catalog: Example[] = JSON.parse(readFileSync(join(plugin, 'qualification/conformance/examples.json'), 'utf8'));
const blocks = (text: string) => [...text.matchAll(/^```[^\n]*\n([\s\S]*?)^```\s*$/gm)].map(m => m[1]);

test('every specification fence declares its executable setup or illustrative boundary', () => {
  const files = readdirSync(join(plugin, 'spec'), { recursive: true, encoding: 'utf8' }).filter(n => n.endsWith('.md')).map(n => `spec/${n}`);
  const actual = files.flatMap(path => blocks(readFileSync(join(plugin, path), 'utf8')).map((_, i) => `${path}#${i + 1}`));
  assert.deepEqual(catalog.map(e => `${e.path}#${e.ordinal}`).sort(), actual.sort());
  assert.equal(new Set(catalog.map(e => e.id)).size, catalog.length);
  for (const e of catalog) {
    assert.ok(e.description.trim(), e.id);
    assert.ok(readFileSync(join(plugin, e.path), 'utf8').includes(`Example \`${e.id}\`.`), e.id);
  }
});

for (const example of catalog) test(`specified example: ${example.id}`, t => {
  const input = blocks(readFileSync(join(plugin, example.path), 'utf8'))[example.ordinal - 1];
  const before = fingerprint(root);
  t.after(() => assert.deepEqual(fingerprint(root), before, 'example checks never alter Harbor'));
  const work = mkdtempSync(join(tmpdir(), 'dossier-example-'));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  const fenced = (text: string) => '```yaml\n' + text + '```\n';
  switch (example.kind) {
    case 'template':
      assert.match(input, /<[^>]+>/, 'template placeholders stay visibly illustrative');
      break;
    case 'call': {
      const call = parseCall(input);
      assert.deepEqual(call.errors, []);
      const [kind, id] = example.setup!.split('/');
      const loaded = kind === 'compositions' ? loadComposition(root, id) : loadPart(root, id);
      const planned = planTrial({ call, dossierDir: loaded.dir, kind: loaded.kind,
        ...(loaded.kind === 'composition'
          ? { compositionProse: loaded.prose, scenarios: loaded.actors.scenarios, module: `model/generated/${loaded.composed.module}.tla`, cells: loaded.composed.cells }
          : { ir: loaded.ir }), externals: externalsOf(root) });
      assert.deepEqual(planned.problems, [], example.id);
      assert.ok(planned.plan.checker);
      // A real planner refusal prevents a valid-looking example from silently
      // claiming a property that its configuration never enabled.
      const bad = parseCall(input.replace('expect:\n', 'expect:\n  DoesNotExist: holds\n'));
      const invalid = planTrial({ call: bad, dossierDir: loaded.dir, kind: loaded.kind,
        ...(loaded.kind === 'composition'
          ? { compositionProse: loaded.prose, scenarios: loaded.actors.scenarios, module: `model/generated/${loaded.composed.module}.tla`, cells: loaded.composed.cells }
          : { ir: loaded.ir }), externals: externalsOf(root) });
      if (call.kind !== 'external') assert.ok(invalid.problems.length > 0, 'an extra enabled-property claim must be refused');
      break;
    }
    case 'config-fragment': {
      const config = JSON.parse('{' + input + '}');
      assert.deepEqual(config.external.replay.command, ['node', 'tools/replay.mjs']);
      assert.equal(config.external.replay.cwd, '..');
      break;
    }
    case 'wiring': {
      writeFileSync(join(work, 'wiring.md'), fenced(input));
      const wiring = readWiring(work);
      assert.deepEqual(wiring.errors, []);
      assert.deepEqual(wiring.wiring, [{ effect: { part: 'adapter', name: 'move' }, event: { part: 'vault', name: 'move' } }]);
      break;
    }
    case 'scenarios': {
      mkdirSync(join(work, 'actors'));
      writeFileSync(join(work, 'actors/actors.md'), readFileSync(join(root, 'actors/actors.md')));
      writeFileSync(join(work, 'actors/scenarios.md'), fenced(input));
      const actors = readActors(work);
      assert.deepEqual(actors.errors, []);
      assert.deepEqual(actors.scenarioById['lanes-down-two'].windows['lane-a'], { from: 0, until: 2 });
      assert.deepEqual(actors.scenarioById['stale-start'].start, { 'oracle.state': 'Stale', 'oracle.stale': 3 });
      break;
    }
    case 'composition': {
      const loaded = loadComposition(root, 'control');
      const prose = parseCompositionProse(input);
      assert.deepEqual(prose.errors, []);
      const result = composeMembers({ name: 'control', prose, wiring: loaded.wiring, members: loaded.members, actors: loaded.actors, parts: listParts(root), retired: [] });
      assert.deepEqual(result.errors, []);
      assert.equal(result.cells.length, 9);
      assert.ok(result.cfgs['W1_governance_captured.cfg']);
      break;
    }
    case 'givens': {
      for (const [line, id, passage] of [[input.trim().split('\n')[0], 'timelock', 'G1'], [input.trim().split('\n')[1], 'oracle', 'G3']]) {
        const part = loadPart(root, id);
        assert.deepEqual(part.ir.errors, []);
        assert.equal(line.replace(/^\[G\d+\] /, ''), part.prose.passages.find(p => p.id === passage)?.text);
      }
      break;
    }
    case 'doubt': {
      const doubts = parseDoubts(input);
      assert.equal(doubts.length, 1);
      assert.deepEqual(doubts[0].malformed, []);
      assert.equal(doubts[0].status, 'open');
      assert.notEqual(doubts[0].walks.a, doubts[0].walks.b);
      break;
    }
    case 'decisions': {
      const log = parseDecisions(input);
      assert.equal(log.broken, null);
      assert.ok(log.decisions.every(d => !d.malformed));
      assert.deepEqual(log.decisions.map(d => d.verb), ['accept', 'reject', 'risk']);
      break;
    }
    default: assert.fail(`no executable interpretation for ${example.kind}`);
  }
});
