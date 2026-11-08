// An external runner: replays a part's walks against the stand-in
// deployment and reports which walks the deployment agrees with. Reads the
// runner's JSON on stdin, prints one JSON verdict.
//   outcomes: { W1: 'pass' | 'fail' }   covers: the walks that passed
import { Harbor } from '../protocol/harbor.mjs';

const input = JSON.parse(await new Promise(resolve => { let s = ''; process.stdin.on('data', d => s += d); process.stdin.on('end', () => resolve(s)); }));
const ir = input.ir;
const part = input.dossier.id;
const outcomes = {}, evidence = {};
const value = (ast) => (ast && (ast.t === 'lit' || ast.t === 'int' || ast.t === 'bool') ? ast.v : null);
for (const w of ir.walks || []) {
  const h = new Harbor();
  const problems = [];
  // The walk's preconditions on the rest of the deployment: the Adapter needs free credit in the Vault.
  if (part === 'adapter') h.call('vault', 'borrow', { amount: 2 });
  const startSent = { ...h.sent };
  for (const [i, step] of w.steps.entries()) {
    const args = Object.fromEntries(Object.entries(step.args).map(([k, v]) => [k, value(v)]));
    let reverted = false;
    try { h.call(part, step.event, args); } catch (e) { if (!e.reverted) throw e; reverted = true; }
    if (step.refused && !reverted) { problems.push(`step ${i + 1} ${step.event} did not revert`); break; }
    if (!step.refused && reverted) { problems.push(`step ${i + 1} ${step.event} reverted`); break; }
  }
  const snap = h.snapshot(part);
  if (!problems.length) {
    if (snap.state !== w.ends.split('.').pop()) problems.push(`ends in ${snap.state}, not ${w.ends}`);
    for (const [k, v] of Object.entries(w.endData)) if (snap[k] !== value(v)) problems.push(`${k} is ${snap[k]}, expected ${value(v)}`);
    for (const [e, n] of Object.entries(w.sent)) if (((h.sent[e] || 0) - (startSent[e] || 0)) !== n) problems.push(`${e} sent ${(h.sent[e] || 0)} times, expected ${n}`);
    for (const e of w.notSent) if ((h.sent[e] || 0) - (startSent[e] || 0) !== 0) problems.push(`${e} was sent`);
  }
  outcomes[w.id] = problems.length ? 'fail' : 'pass';
  evidence[w.id] = { end: snap, problems };
}
console.log(JSON.stringify({ outcomes, covers: Object.keys(outcomes).filter(k => outcomes[k] === 'pass'), evidence, reach: { walks: Object.keys(outcomes).length } }));
