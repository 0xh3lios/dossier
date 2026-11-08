import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generate, minimize } from '../differential/generate.ts';
import { compareComponent, parseDump, parseValue } from '../differential/component.ts';
import { compareWiring, wiringInputs } from '../differential/composition.ts';
import { compileIR } from '../../src/prose/ir.ts';
import { parseProse } from '../../src/prose/prose.ts';

const plugin = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
test('differential generator: 200 reproducible finite inputs exercise fields, refusals and non-initial walk starts', () => {
  const families = new Set<string>(), bodies = new Set<string>();
  for (let seed = 0; seed < 200; seed++) {
    const generated = generate(seed);
    assert.deepEqual(generate(seed), generated);
    const ir = compileIR(parseProse(generated.prose));
    assert.deepEqual(ir.errors, []);
    assert.ok(ir.states.length >= 2 && ir.states.length <= 3);
    assert.equal(ir.events.length, 3);
    assert.ok(ir.eventCases.length >= 4);
    assert.equal(ir.walks.length, 3);
    assert.equal(ir.walks[1].from, 'Closed');
    assert.ok(ir.walks[0].steps[0].refused);
    families.add(generated.family); bodies.add(generated.prose.replace(/^# Seed\d+/, '# Seed'));
    for (const kind of ['tick-data', 'event-field'] as const) for (const prose of Object.values(wiringInputs(seed, kind).members)) assert.deepEqual(compileIR(parseProse(prose)).errors, []);
  }
  assert.equal(families.size, 2);
  assert.ok(bodies.size >= 100, `at least 100 distinct cases apart from title: ${bodies.size}`);
});

test('differential dump reader accepts wrapped tuples and refuses unknown value syntax', () => {
  assert.deepEqual(parseValue('<<"Ready", 1, <<TRUE, FALSE>>>>'), ['Ready', 1, [true, false]]);
  assert.deepEqual(parseDump('State 1:\n/\\ state = "Ready"\n/\\ diff_previous = <<"Ready",\n  2, 3>>\n/\\ ready = FALSE\n'), [{ state: 'Ready', diff_previous: ['Ready', 2, 3], ready: false }]);
  assert.throws(() => parseValue('[a |-> 1]'), /unsupported/);
});

test('differential minimizer retains only passages needed to reproduce the same valid failure', async () => {
  const input = '# Case\n[S1] Ready: ready.\n[A1] Always, {TRUE}.\n[A2] Always, {FALSE}.\n';
  const result = await minimize(input, async candidate => candidate.includes('[S1]') && candidate.includes('[A2]'));
  assert.ok(result.includes('[S1]')); assert.ok(result.includes('[A2]')); assert.ok(!result.includes('[A1]'));
});

test('real TLC differential checks states, edges, enabledness, witnesses and wired ticks/fields; mutations fail', { skip: process.env.TLA_TOOLS ? false : 'TLA_TOOLS is not set: deterministic generator tests ran; solver differential execution requires the toolchain' }, async t => {
  const work = mkdtempSync(join(tmpdir(), 'dossier-differential-test-'));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  for (const seed of [0, 1, 16]) {
    const actual = await compareComponent(generate(seed).prose, join(work, `component-${seed}`), plugin);
    assert.deepEqual(actual.witnesses, { W1: true, W2: true, W3: false });
  }
  for (const kind of ['tick-data', 'event-field'] as const) await compareWiring(16, kind, join(work, kind), plugin);
  await assert.rejects(compareComponent(generate(0).prose, join(work, 'bad-guard'), plugin, text => text.replace(/(Can_M1_Pay ==)[^\n]+/, '$1 FALSE')), /DiffAgreement/);
  await assert.rejects(compareWiring(16, 'tick-data', join(work, 'bad-wire'), plugin, text => text.replaceAll("sink_total' = (sink_total + source_amount)", "sink_total' = sink_total")), /DiffAgreement|simultaneous/);
});
