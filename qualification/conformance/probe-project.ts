// Read-only proving-ground probe. Write stdout to a local development record;
// it can contain project identities and must not become a portable fixture.
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { verifyAll } from '../../src/commands/verify.ts';
import { checkIR } from '../../src/chart/draw.ts';
import { fingerprint } from './files.ts';

const root = process.argv[2] && resolve(process.argv[2]);
if (!root) { console.error('usage: node qualification/conformance/probe-project.ts <dossiers-root>'); process.exitCode = 2; }
else {
  const before = fingerprint(root);
  const verified = verifyAll({ root, version: '0.1.0', write: false });
  const charts = [];
  for (const c of verified.components) {
    const run = c.ir.ok ? await checkIR({ root, ir: c.ir }) : null;
    charts.push({ id: c.id, compiled: c.ir.ok, errors: c.ir.errors, outcome: run?.outcome || 'unable', explored: run?.explored, limitHit: run?.limitHit || false, error: run?.error || run?.exceeded || run?.unevaluable, failed: run?.checks?.filter(x => x.status === 'failed'), gaps: run?.gaps });
  }
  assert.deepEqual(fingerprint(root), before, 'the probe must not write any dossier artifact');
  console.log(JSON.stringify({ root, readOnly: true, tripwires: verified.tripwires, components: verified.components.map(c => ({ id: c.id, summary: c.summary, tripwires: c.tripwires, route: c.route })), systems: verified.systems.map(s => ({ id: s.id, summary: s.summary, tripwires: s.tripwires, cells: s.cells, route: s.route })), charts }, null, 2));
  if (verified.tripwires.length || [...verified.components, ...verified.systems].some(x => x.tripwires.length) || charts.some(c => c.outcome !== 'pass')) process.exitCode = 1;
}
