// A second read is owed (spec/review.md): a dossier with marks a reviewer judges and no review under
// reviews/ naming its current prose is flagged `review owed`, its next step is Review once nothing else
// is owed, and the root routes to Review after everything else. A review whose first line names the
// prose, as the dossier's verify line ends, clears both; one of an earlier wording says which prose it
// read; one that names none counts for none.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { proseHash } from '../../src/hash.ts';
import { verifyAll } from '../../src/commands/verify.ts';
import { reviewOwedWhy } from '../../src/verify/analyze.ts';
import { summaryLine } from '../../src/verify/render.ts';
import { routeRoot } from '../../src/verify/route.ts';
import type { Analysis } from '../../src/verify/analyze.ts';

const fixture = join(fileURLToPath(new URL('../../', import.meta.url)), 'qualification/fixture');

test('why a second read is owed: marks a reviewer judges, and no review at the current prose', () => {
  const hashes = { A1: 'a1', S1: 's1' };
  const now = proseHash(hashes);
  assert.equal(reviewOwedWhy([], hashes, false), null, 'nothing a reviewer judges yet');
  assert.equal(reviewOwedWhy([], hashes, true), `no review at prose@${now}`);
  assert.equal(reviewOwedWhy([{ file: '2026-11-07-review.md', prose: now }], hashes, true), null);
  assert.equal(reviewOwedWhy([{ file: 'a.md', prose: now }, { file: 'b.md', prose: 'abcdef' }], hashes, true), null, 'any review at the current prose counts');
  assert.equal(reviewOwedWhy([{ file: 'a.md', prose: 'abcdef' }], hashes, true), `reviews/a.md read prose@abcdef; now prose@${now}`);
  assert.equal(reviewOwedWhy([{ file: 'a.md', prose: null }], hashes, true), `reviews/a.md read prose@none named; now prose@${now}`);
});

test('on Harbor, every dossier owes a second read: the flag, the next step once nothing else is owed, and the review that clears it', t => {
  const work = mkdtempSync(join(tmpdir(), 'dossier-review-'));
  t.after(() => rmSync(work, { recursive: true, force: true }));
  cpSync(fixture, work, { recursive: true });
  const root = join(work, 'dossiers');
  let v = verifyAll({ root, version: '0.1.0' });
  const all = [...v.components, ...v.systems];
  for (const a of all) {
    const now = proseHash(a.hashes);
    assert.deepEqual(a.flags.filter(f => f.name === 'review owed'), [{ name: 'review owed', where: `no review at prose@${now}` }], a.ref);
    assert.ok(summaryLine(a).endsWith(` · prose@${now}`), 'the verify line ends with the prose hash a review names');
  }
  // Harbor's systems and two of its components owe nothing else, so the review is their next step.
  assert.deepEqual(all.filter(a => a.route.pass === 'Review').map(a => a.ref).sort(), ['components/adapter', 'components/breaker', 'systems/control', 'systems/supply', 'systems/upkeep']);
  assert.ok(all.every(a => a.route.pass !== 'Report'), 'no dossier reports before its second read');
  assert.equal(v.route.pass, 'Encode', 'the root routes to Review only once nothing else is owed');

  // A review whose first line names the current prose clears the flag, and the system reports.
  const control = v.systems.find(a => a.ref === 'systems/control')!;
  const now = proseHash(control.hashes);
  const dir = join(root, 'systems', 'control');
  mkdirSync(join(dir, 'reviews'), { recursive: true });
  writeFileSync(join(dir, 'reviews', '2026-11-07-review.md'), `prose@${now}\n\n${summaryLine(control)}\n\nNo findings.\n`);
  v = verifyAll({ root, version: '0.1.0' });
  let again = v.systems.find(a => a.ref === 'systems/control')!;
  assert.deepEqual(again.flags.filter(f => f.name === 'review owed'), []);
  assert.deepEqual(again.route, { pass: 'Report', why: ['nothing owed'], read: 'spec/evidence.md' });

  // Only the first line names the prose: a review that quotes the hash further down, in a copied
  // verify line, names none, and the read is still owed.
  writeFileSync(join(dir, 'reviews', '2026-11-07-review.md'), `# Review\n\n${summaryLine(control)}\n\nNo findings.\n`);
  v = verifyAll({ root, version: '0.1.0' });
  again = v.systems.find(a => a.ref === 'systems/control')!;
  assert.deepEqual(again.flags.filter(f => f.name === 'review owed'), [{ name: 'review owed', where: `reviews/2026-11-07-review.md read prose@none named; now prose@${now}` }], 'a hash quoted below the first line names nothing');

  // A review of an earlier wording says which prose it read, and the read is owed again.
  writeFileSync(join(dir, 'reviews', '2026-11-07-review.md'), 'prose@000000\n\nNo findings.\n');
  v = verifyAll({ root, version: '0.1.0' });
  again = v.systems.find(a => a.ref === 'systems/control')!;
  const why = `reviews/2026-11-07-review.md read prose@000000; now prose@${now}`;
  assert.deepEqual(again.flags.filter(f => f.name === 'review owed'), [{ name: 'review owed', where: why }]);
  assert.deepEqual(again.route, { pass: 'Review', why: [why], read: 'spec/review.md' });

});

test('the root routes to Review after everything else, and to Report once every second read is in', () => {
  const stub = (ref: string, pass: string, why: string[]) => ({ kind: ref.startsWith('systems/') ? 'system' : 'component', ref, title: ref, tripwires: [], composition: { members: ['x'] }, route: { pass, why, read: '' } }) as unknown as Analysis;
  const owed = stub('components/vault', 'Review', ['no review at prose@abc123']);
  const done = stub('systems/control', 'Report', ['nothing owed']);
  assert.deepEqual(routeRoot([owed], [done]), { pass: 'Review', why: ['components/vault: no review at prose@abc123'], read: 'spec/review.md', target: 'components/vault' });
  const encode = stub('components/token', 'Encode', ['calls pending: a']);
  assert.equal(routeRoot([owed, encode], [done]).pass, 'Encode', 'a loop still owed comes first');
  assert.deepEqual(routeRoot([stub('components/vault', 'Report', ['nothing owed'])], [done]), { pass: 'Report', why: ['nothing owed'], read: 'spec/evidence.md', target: null });
});
