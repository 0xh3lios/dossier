import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseProse, parseCompositionProse } from '../../src/prose/prose.ts';
import { compileIR } from '../../src/prose/ir.ts';
import { loadRuntime } from '../../src/chart/draw.ts';
import { buildMachine, leavesOf } from '../../src/chart/machine.ts';
import type { ChartEvent, Snapshot } from '../../src/chart/machine.ts';
import { composeMembers } from '../../src/models/compose.ts';
import { parseTla } from '../../src/models/tla.ts';
import { readActors } from '../../src/dossiers/actors.ts';
import { readWiring } from '../../src/dossiers/wiring.ts';
import { runTlc } from './part.ts';

export type CompositionKind = 'tick-data' | 'event-field';
export function compositionInputs(seed: number, kind: CompositionKind) {
  const limit = 1 + seed % 3, bound = 1 + (seed >>> 2) % 5, amount = 1 + (seed >>> 4) % 2;
  const tick = kind === 'tick-data';
  const source = `# Source\n\nIt holds n, a count from 0 to ${limit}.${tick ? ` It holds amount, a count from 1 to 2, starting at ${amount}.` : ''} It sends push to the Sink, carrying amount.\n\n## States\n[S1] Live: sends a bounded number of messages.\n\n## Events\n[E1] ${tick ? 'tick, from the chain: a block passes.' : 'send, from the operator: send a field. Carries amount, a count from 1 to 2.'}\n\n## Moves\n[M1] When Live receives ${tick ? 'tick' : 'send'} and {n < ${limit}}, it stays Live, n grows by 1${tick ? ', amount becomes 1' : ''}, sends push.\n[R1] In Live, ${tick ? 'tick' : 'send'} is refused when {n = ${limit}}.\n`;
  const sink = `# Sink\n\nIt holds total, a count from 0 to ${bound}.\n\n## States\n[S1] Live: receives only when the sum fits.\n\n## Events\n[E1] push, from the Source: receive a field. Carries amount, a count from 1 to 2.\n\n## Moves\n[M1] When Live receives push and {total + amount <= ${bound}}, it stays Live, total grows by amount.\n[R1] In Live, push is refused when {total + amount > ${bound}}.\n`;
  const watcher = `# Watcher\n\nIt holds clock, a count from 0 to ${limit}.\n\n## States\n[S1] Live: tracks ticks independently of delivery.\n\n## Events\n[E1] tick, from the chain: a block passes.\n\n## Moves\n[M1] When Live receives tick and {clock < ${limit}}, it stays Live, clock grows by 1.\n[R1] In Live, tick is refused when {clock = ${limit}}.\n`;
  const wiring = '# Wiring\n\n```yaml\nmembers:\n  - part: source\n  - part: sink\n  - part: watcher\nwiring:\n  - effect: source.push\n    event: sink.push\nclosure: []\nscenarios: [all-honest]\n```\n';
  const actors = '# Actors\n\n```yaml\nactors:\n  - id: chain\n    kind: chain\n  - id: operator\n    kind: user\n```\n';
  const prose = '# Wiring\nConcern: wiring\n\n## Always\n[A1] Always, {sink.total <= ' + bound + '}.\n';
  return { seed, kind, members: { source, sink, watcher }, wiring, actors, prose };
}

export async function compareComposition(seed: number, kind: CompositionKind, directory: string, plugin: string, mutate?: (tla: string) => string) {
  const inputs = compositionInputs(seed, kind);
  mkdirSync(join(directory, 'actors'), { recursive: true });
  writeFileSync(join(directory, 'actors/actors.md'), inputs.actors);
  writeFileSync(join(directory, 'wiring.md'), inputs.wiring);
  writeFileSync(join(directory, 'prose.md'), inputs.prose);
  const members = Object.fromEntries(Object.entries(inputs.members).map(([id, text]) => {
    writeFileSync(join(directory, `${id}.md`), text);
    const ir = compileIR(parseProse(text));
    assert.deepEqual(ir.errors, []);
    return [id, ir];
  }));
  const actors = readActors(directory), wiring = readWiring(directory);
  assert.deepEqual(actors.errors, []); assert.deepEqual(wiring.errors, []);
  const compiled = composeMembers({ name: 'Wiring', prose: parseCompositionProse(inputs.prose), wiring, members, actors });
  assert.deepEqual(compiled.errors, []);
  const runtime = await loadRuntime(plugin);
  assert.ok(!runtime.error, runtime.error);
  const machines = Object.fromEntries(Object.entries(members).map(([id, ir]) => [id, buildMachine(ir, runtime.xstate!)]));
  const initial = Object.fromEntries(Object.entries(machines).map(([id, machine]) => [id, runtime.xstate!.createActor(machine).getSnapshot()]));
  type Combined = Record<string, Snapshot>;
  const projection = (state: Combined) => Object.entries(members).flatMap(([id, ir]) => [leavesOf(state[id].value)[0], ...ir.context.map(d => state[id].context[d.name])]);
  const names = Object.entries(members).flatMap(([id, ir]) => [`${id}_state`, ...ir.context.map(d => `${id}_${d.name}`)]);
  const events: ChartEvent[] = [{ type: 'tick' }, ...(kind === 'event-field' ? [{ type: 'send', amount: 1 }, { type: 'send', amount: 2 }] : [])];
  const delivery = (state: Combined, event: ChartEvent) => {
    const outgoing = { type: 'push', amount: kind === 'tick-data' ? state.source.context.amount : event.amount } as ChartEvent;
    if (!state.source.can(event) || !state.sink.can(outgoing)) return null;
    return {
      ...state,
      source: runtime.xstate!.getNextSnapshot(machines.source, state.source, event),
      sink: runtime.xstate!.getNextSnapshot(machines.sink, state.sink, outgoing),
    };
  };
  const next = (state: Combined, event: ChartEvent) => {
    if (event.type !== 'tick') return delivery(state, event);
    const changed = kind === 'tick-data' ? delivery(state, event) || state : state;
    // One global tick updates independent tick members in the same step.
    return { ...changed, watcher: state.watcher.can(event) ? runtime.xstate!.getNextSnapshot(machines.watcher, state.watcher, event) : state.watcher };
  };
  const key = (state: Combined) => JSON.stringify(projection(state));
  const reached = new Map([[key(initial), initial]]), queue = [initial], edges = new Set<string>();
  for (let i = 0; i < queue.length; i++) for (const [index, event] of events.entries()) {
    const after = next(queue[i], event);
    if (!after) continue;
    edges.add(JSON.stringify([projection(queue[i]), index + 1, projection(after)]));
    if (!reached.has(key(after))) { reached.set(key(after), after); queue.push(after); }
  }
  const tuple = (state: Combined) => `<<${projection(state).map(v => JSON.stringify(v)).join(', ')}>>`;
  let tla = mutate ? mutate(compiled.tla) : compiled.tla;
  const parsed = parseTla(tla);
  const eventActions = ['TickStep'], variants: string[] = [];
  if (kind === 'event-field') for (const amount of [1, 2]) {
    const body = parsed.definitions.source_M1_Send.text.replace(/^source_M1_Send ==/, `DiffSend${amount} ==`).replace(/(\\E [^\n]+ :)/, `$1 amount = ${amount} /\\ `);
    variants.push(body); eventActions.push(`DiffSend${amount}`);
  }
  const allowedDelivery = queue.filter(s => kind === 'tick-data' ? Boolean(delivery(s, { type: 'tick' })) : [1, 2].some(amount => delivery(s, { type: 'send', amount })));
  const can = `Can_source_M1_${kind === 'tick-data' ? 'Tick' : 'Send'}`;
  const footer = `\nVARIABLES diff_previous, diff_event\nDiffProjection == <<${names.join(', ')}>>\n${variants.join('\n')}\nDiffInit == /\\ Init /\\ diff_previous = DiffProjection /\\ diff_event = 0\nDiffNext ==\n${eventActions.map((action, index) => `  \\/ (/\\ ${action} /\\ diff_previous' = DiffProjection /\\ diff_event' = ${index + 1})`).join('\n')}\nDiffAgreement == ${can} = (DiffProjection \\in {${allowedDelivery.map(tuple).join(', ')}})\n`;
  tla = tla.replace(/^={4,}\s*$/m, footer + '======================================================================');
  writeFileSync(join(directory, 'Wiring.tla'), tla);
  const config = compiled.cfgs['A1_all_honest.cfg'];
  assert.ok(config);
  writeFileSync(join(directory, 'Wiring.cfg'), config.replace('SPECIFICATION Spec', 'INIT DiffInit\nNEXT DiffNext').replace('INVARIANTS TypeOK A1', 'INVARIANTS TypeOK A1 DiffAgreement'));
  const dumped = runTlc(directory, 'Wiring', 'Wiring.cfg');
  const actualStates = new Set<string>(), actualEdges = new Set<string>();
  for (const state of dumped) {
    const current = names.map(n => state[n]);
    actualStates.add(JSON.stringify(current));
    if (state.diff_event !== 0) actualEdges.add(JSON.stringify([state.diff_previous, state.diff_event, current]));
  }
  assert.deepEqual([...actualStates].sort(), [...reached.keys()].sort(), 'simultaneous composition reachable states agree');
  assert.deepEqual([...actualEdges].sort(), [...edges].sort(), 'simultaneous composition and tick edges agree');
  return { seed, kind, states: reached.size, edges: edges.size };
}
