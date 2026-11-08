// The explorer: its server agrees with verify, reads and never writes, answers only GETs at a local
// address, tells open pages of a change, and takes the deciding passages and walk replays from the
// chart's own code. Its marks' meanings are the reference page's rows. Run on a copy of Harbor.
//   node --test qualification/tests/explore.test.ts
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { request } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fingerprint } from '../conformance/files.ts';
import { checkIR } from '../../src/chart/draw.ts';
import { parseDoubts } from '../../src/dossiers/doubts.ts';
import { verifyAll } from '../../src/commands/verify.ts';
import { buildState, EXPLORER, install, sourceHash } from '../../src/explore/build.ts';
import { readMeanings } from '../../src/explore/meanings.ts';
import { chartRun, compileWalkText, explainAt } from '../../src/explore/run.ts';
import { NoFreePort, quiet, startExplorer } from '../../src/explore/server.ts';
import { actorOfAction, memberOfVariable } from '../../src/explore/model.ts';
import type { Explorer } from '../../src/explore/server.ts';
import type { VerifyJson } from '../../src/commands/verify.ts';

const pluginRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const bin = join(pluginRoot, 'bin', 'dossier');
const version = (JSON.parse(readFileSync(join(pluginRoot, 'package.json'), 'utf8')) as { version: string }).version;
const env = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'DOSSIER_ROOT'));

// A copy of Harbor beside its knowledge base, as the fixture lays them out.
function harborCopy(): string {
  const dir = mkdtempSync(join(tmpdir(), 'dossier-explore-'));
  for (const part of ['dossiers', 'knowledge', 'protocol', 'tools']) cpSync(join(pluginRoot, 'qualification', 'fixture', part), join(dir, part), { recursive: true });
  return dir;
}
// A GET, or another method, with the Host header as given.
function ask(url: string, { method = 'GET', host }: { method?: string; host?: string } = {}): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method, headers: host ? { host } : {} }, res => {
      let body = '';
      res.setEncoding('utf8').on('data', d => { body += d; }).on('end', () => resolve({ status: res.statusCode!, body }));
    });
    req.on('error', reject).end();
  });
}
// Waits for the server to tell an open page of a change, writing again every half second until it does:
// a watch can miss a change made before it is fully running, as on a busy machine. It gives up after
// fifteen seconds, so the test's cleanup still runs and no server is left open.
function changeEvent(ex: Explorer, write: () => void): Promise<string> {
  return new Promise((resolve, reject) => {
    let text = '', finished = false, poke: NodeJS.Timeout | undefined;
    const done = (error: Error | null) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      clearInterval(poke);
      req.destroy();
      if (error) reject(error); else resolve(text);
    };
    const timer = setTimeout(() => done(new Error('no change event within fifteen seconds')), 15000);
    const req = request(ex.url + 'api/events', res => {
      res.setEncoding('utf8').on('data', d => {
        text += d;
        if (!poke && text.includes(': connected')) { write(); poke = setInterval(write, 500); }
        if (text.includes('event: change')) done(null);
      });
    });
    req.on('error', e => { if (!finished) done(e); }).end();
  });
}
const get = async (ex: Explorer, path: string) => { const r = await ask(ex.url + path.slice(1)); assert.equal(r.status, 200, `${path}: ${r.body.slice(0, 200)}`); return JSON.parse(r.body); };

describe('the explorer over a copy of Harbor', () => {
  let dir: string, root: string, ex: Explorer;
  before(async () => {
    dir = harborCopy();
    root = join(dir, 'dossiers');
    ex = await startExplorer({ root, pluginRoot, version, port: 0, dist: null });
  });
  after(async () => { await ex?.close(); rmSync(dir, { recursive: true, force: true }); });

  it('shows the standing verify --json gives, mark for mark and cell for cell', async () => {
    const r = spawnSync(bin, ['verify', '--json', '--root', root], { encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 });
    const json = JSON.parse(r.stdout) as VerifyJson;
    const page = await get(ex, '/api/root');
    assert.deepEqual(page.route, json.route);
    assert.deepEqual(page.tripwires, json.tripwires);
    for (const c of json.parts) {
      const d = page.dossiers.find((x: { id: string }) => x.id === c.id);
      assert.deepEqual(d.marks, Object.fromEntries(Object.entries(c.marks).map(([k, m]) => [k, m.mark])), c.id);
      assert.deepEqual(d.route, c.route, c.id);
      assert.deepEqual(d.summary, c.summary, c.id);
      assert.deepEqual(d.flags.map((f: { name: string }) => f.name), c.flags.map(f => f.name), c.id);
      const model = await get(ex, `/api/part/${c.id}`);
      assert.deepEqual(Object.fromEntries(Object.entries(model.marks).map(([k, m]) => [k, (m as { mark: string }).mark])), d.marks, c.id);
      assert.deepEqual(model.evidence.map((e: { entry: string }) => e.entry).sort(), c.answers.map(a => a.entry).sort(), `${c.id}: one row for each answer`);
    }
    for (const s of json.compositions) {
      const model = await get(ex, `/api/composition/${s.id}`);
      assert.deepEqual(model.cells.map((c: { property: string; scenario: string; mark: string }) => `${c.property} ${c.scenario} ${c.mark}`), s.cells.map(c => `${c.property} ${c.scenario} ${c.mark}`), s.id);
      assert.deepEqual(model.route, s.route, s.id);
    }
  });

  it('explains every mark and cell in the reference page\'s words', async () => {
    const page = await get(ex, '/api/root');
    for (const d of page.dossiers.filter((x: { kind: string }) => x.kind === 'part')) {
      const model = await get(ex, `/api/part/${d.id}`);
      for (const [id, m] of Object.entries(model.marks) as [string, { mark: string; explain: { means: string | null } }][]) assert.ok(m.explain.means, `${d.id} ${id} ${m.mark} has no row in docs/reference/marks.md`);
    }
    for (const d of page.dossiers.filter((x: { kind: string }) => x.kind === 'composition')) {
      const model = await get(ex, `/api/composition/${d.id}`);
      for (const c of model.cells) assert.ok(c.means, `${d.id} ${c.property} ${c.scenario}: ${c.mark} has no row`);
    }
    const marks = readFileSync(join(pluginRoot, 'docs', 'reference', 'marks.md'), 'utf8');
    for (const row of page.legend.marks) assert.ok(marks.includes(`| \`${row.mark}\` | ${row.for} |`), `${row.mark} for ${row.for} is a row of the page`);
    assert.ok(page.legend.cells.length >= 8);
  });

  it('decides each explored step and replays each walk with the chart\'s own code, as the checks do', async () => {
    const v = verifyAll({ root, version, write: false });
    for (const a of v.parts) {
      const run = await chartRun(root, a);
      const checks = await checkIR({ root, ir: a.ir });
      assert.equal(run.view.outcome, checks.outcome, a.id);
      const ids = new Set([...a.ir.transitions.map(t => t.id), ...a.ir.refusals.map(r => r.id)]);
      for (const e of run.view.edges) {
        for (const id of e.by) assert.ok(ids.has(id), `${a.id}: ${id} is a move or a refusal`);
        // Check 6 passed and nothing is unsaid: one passage decides each leaf, and every step has one.
        if (checks.outcome === 'pass' && !checks.gaps!.length) assert.ok(e.by.length >= 1 && e.by.length <= run.view.snapshots[e.from].leaves.length, `${a.id}: step ${e.from} ${e.event.type} decided by ${e.by.join(' ') || 'nothing'}`);
      }
      for (const w of run.view.walks) {
        const check = checks.checks!.find(c => c.ids.includes(w.id))!;
        assert.equal(w.problems.join('; '), check.message, `${a.id} ${w.id}: the replay and the walk check agree`);
        assert.equal(w.steps.length, check.status === 'passed' ? a.ir.walks.find(x => x.id === w.id)!.steps.length + 1 : w.steps.length, `${a.id} ${w.id}: a passing walk plays every step`);
      }
    }
  });

  it('explains a snapshot: each event case with its candidates, conditions and changes', async () => {
    const run = await get(ex, '/api/part/oracle/run');
    const at = run.edges.find((e: { by: string[] }) => e.by.some(id => id.startsWith('M')))?.from ?? 0;
    const x = await get(ex, `/api/part/oracle/explain?at=${at}`);
    assert.equal(x.at, at);
    for (const c of x.cases) {
      assert.ok(Array.isArray(c.by));
      for (const id of c.by) assert.ok(c.candidates.some((k: { id: string; holds: boolean }) => k.id === id && k.holds), `${id} decides only where its condition holds`);
    }
    assert.ok(x.cases.some((c: { changes: unknown[] }) => c.changes.length), 'some move changes the data');
  });

  it('maps a trace\'s actions onto the moves they encode', async () => {
    const model = await get(ex, '/api/part/timelock');
    const entry = model.evidence.find((e: { answer?: { steps: number } }) => (e.answer?.steps || 0) > 2);
    assert.ok(entry, 'timelock holds an answer with a trace');
    const trace = await get(ex, `/api/part/timelock/trace/${entry.entry}`);
    assert.ok(trace.steps.length > 2);
    for (const s of trace.steps as { move: string | null; action: string | null }[]) assert.equal(s.move, /^M(\d+)_/.exec(s.action || '') ? `M${/^M(\d+)_/.exec(s.action!)![1]}` : null, `${s.action} encodes ${s.move}`);
    assert.ok(trace.steps.some((s: { move: string | null }) => s.move), 'at least one step names its move');
  });

  it('answers only GETs, only at a local address, and nothing outside its questions', async () => {
    assert.equal((await ask(ex.url + 'api/root', { method: 'POST' })).status, 405);
    assert.equal((await ask(ex.url + 'api/root', { method: 'DELETE' })).status, 405);
    assert.equal((await ask(ex.url + 'api/root', { host: 'example.com' })).status, 403);
    assert.equal((await ask(ex.url + 'api/root', { host: `example.com:${ex.port}` })).status, 403, 'a name rebound to this machine is refused');
    assert.equal((await ask(ex.url + 'api/root', { host: `localhost:${ex.port}` })).status, 200);
    assert.equal((await ask(ex.url + 'api/nothing')).status, 404);
    assert.equal((await ask(ex.url + 'api/part/nobody')).status, 404);
    assert.equal((await ask(ex.url)).status, 503, 'no page is served before one is built');
    assert.match(new URL(ex.url).hostname, /^127\.0\.0\.1$/);
  });

  it('writes nothing under the root while every question is asked', async () => {
    const before = fingerprint(root);
    const page = await get(ex, '/api/root');
    await get(ex, '/api/addresses');
    for (const d of page.dossiers) {
      if (d.kind === 'composition') {
        const s = await get(ex, `/api/composition/${d.id}`);
        for (const c of s.cells.filter((x: { steps: number }) => x.steps)) await get(ex, `/api/composition/${d.id}/trace/${c.property}/${c.scenario}`);
        continue;
      }
      const c = await get(ex, `/api/part/${d.id}`);
      const run = await get(ex, `/api/part/${d.id}/run`);
      await get(ex, `/api/part/${d.id}/explain?at=${run.snapshots.length - 1}`);
      for (const e of c.evidence.filter((x: { answer?: { steps: number } }) => x.answer?.steps)) await get(ex, `/api/part/${d.id}/trace/${e.entry}`);
    }
    assert.deepEqual(fingerprint(root), before);
  });

  it('tells an open page when a file under the root changes', async () => {
    const note = join(root, 'parts', 'oracle', 'margin.md');
    try {
      const events = await changeEvent(ex, () => writeFileSync(note, 'A note in the margin.\n'));
      assert.match(events, /event: change\ndata: .*margin\.md/);
    } finally { rmSync(note, { force: true }); }
  });

  it('serves a built page from the folder it is given, and only its own files', async () => {
    const dist = join(dir, 'page');
    mkdirSync(dist);
    writeFileSync(join(dist, 'index.html'), '<!doctype html><title>page</title>');
    writeFileSync(join(dist, '.hidden'), 'no');
    mkdirSync(join(dist, 'sub'));
    const served = await startExplorer({ root, pluginRoot, version, port: 0, dist });
    try {
      const page = await ask(served.url);
      assert.equal(page.status, 200);
      assert.match(page.body, /<title>page<\/title>/);
      assert.equal((await ask(served.url + '.hidden')).status, 404);
      assert.equal((await ask(served.url + 'sub')).status, 404, 'a folder is not a file of the page');
      assert.equal((await ask(served.url + '..%2Fdossiers%2Fdossier.json')).status, 404);
    } finally { await served.close(); }
  });
});

describe('the page\'s build', () => {
  it('is not ready until built from the current sources, and verify ignores its folder', () => {
    const dir = harborCopy(), root = join(dir, 'dossiers');
    try {
      const before = spawnSync(bin, ['verify', '--json', '--root', root], { encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 }).stdout;
      assert.equal(buildState(root, pluginRoot).ready, false);
      assert.match(buildState(root, pluginRoot).why!, /dossier explore --install/);
      const folder = join(root, EXPLORER);
      mkdirSync(join(folder, 'dist'), { recursive: true });
      writeFileSync(join(folder, 'dist', 'index.html'), '');
      writeFileSync(join(folder, 'stamp.json'), JSON.stringify({ source: 'other', version: '0.0.0', built: '' }));
      assert.match(buildState(root, pluginRoot).why!, /built from other sources, by dossier 0\.0\.0/);
      writeFileSync(join(folder, 'stamp.json'), JSON.stringify({ source: sourceHash(pluginRoot), version, built: '' }));
      assert.equal(buildState(root, pluginRoot).ready, true);
      const after = spawnSync(bin, ['verify', '--json', '--root', root], { encoding: 'utf8', env, maxBuffer: 64 * 1024 * 1024 }).stdout;
      assert.equal(after, before, 'a built page in the root moves nothing verify reports');
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it('pins every package exactly, and the lock agrees with the manifest', () => {
    const app = join(pluginRoot, 'apps', 'explorer');
    const pkg = JSON.parse(readFileSync(join(app, 'package.json'), 'utf8')) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
    const lock = JSON.parse(readFileSync(join(app, 'package-lock.json'), 'utf8')) as { packages: Record<string, { version?: string; integrity?: string; dependencies?: Record<string, string>; devDependencies?: Record<string, string> }> };
    const wanted = { ...pkg.dependencies, ...pkg.devDependencies };
    for (const [name, v] of Object.entries(wanted)) {
      assert.match(v, /^\d+\.\d+\.\d+$/, `${name} is pinned to one version`);
      assert.equal(lock.packages[`node_modules/${name}`]?.version, v, `${name} in the lock`);
    }
    assert.deepEqual({ ...lock.packages[''].dependencies, ...lock.packages[''].devDependencies }, wanted);
    for (const [path, p] of Object.entries(lock.packages)) if (path) assert.ok(p.integrity, `${path} has an integrity hash`);
  });

  it('the command refuses a bad port and a page that is not built, and names the fix', () => {
    const dir = harborCopy(), root = join(dir, 'dossiers');
    try {
      const bad = spawnSync(bin, ['explore', '--port', 'abc', '--root', root], { encoding: 'utf8', env });
      assert.equal(bad.status, 2);
      assert.match(bad.stderr, /--port takes a whole number from 0 to 65535/);
      const unbuilt = spawnSync(bin, ['explore', '--root', root], { encoding: 'utf8', env });
      assert.equal(unbuilt.status, 1);
      assert.match(unbuilt.stderr, /not built: run dossier explore --install/);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

describe('a doubt as the explorer reads it', () => {
  it('keeps the doubt\'s own words beside its walks', () => {
    const [d] = parseDoubts('## D1\non: M1\nassumed: a\nWhether the keeper is prompt.\nIt matters for A1.\nWalk a: from Idle, go; ends Busy.\nWalk b: from Idle, go refused; ends Idle.\n');
    assert.equal(d.text, 'Whether the keeper is prompt. It matters for A1.');
    assert.deepEqual(d.walks, { a: 'from Idle, go; ends Busy.', b: 'from Idle, go refused; ends Idle.' });
  });

  it('compiles a doubt\'s walk with the plugin\'s parser, as one more Walk passage', () => {
    const prose = readFileSync(join(pluginRoot, 'qualification', 'fixture', 'dossiers', 'parts', 'oracle', 'prose.md'), 'utf8');
    const walk = compileWalkText(prose, 'a', 'from Fresh, tick; ends Stale.');
    assert.ok('walk' in walk, JSON.stringify(walk));
    const authored = [...prose.matchAll(/^\[(W\d+)\]/gm)].map(m => m[1]);
    assert.ok(authored.length && !authored.includes(walk.walk.id), `${walk.walk.id} is a new id, after ${authored.join(' ')}`);
    assert.deepEqual(walk.walk.steps.map(s => s.event), ['tick']);
    assert.equal(walk.walk.from, 'Fresh');
    assert.equal(walk.walk.ends, 'Stale');
    const bad = compileWalkText(prose, 'b', 'from Fresh, tick; ends Stale and then some.');
    assert.ok('error' in bad);
    assert.match(bad.error, /^the walk/);
  });

  it('reads the meaning of each mark for its kind and tier', () => {
    const m = readMeanings(pluginRoot);
    assert.match(m.mark('A', 'held', 'charted')!, /chart answer/);
    assert.match(m.mark('A', 'held', 'modeled')!, /model answer/);
    assert.match(m.mark('M', 'drawn', 'modeled')!, /only a chart answer covers it/);
    assert.match(m.mark('R', 'checked', 'modeled')!, /refusal with a condition needs no model answer/);
    assert.match(m.mark('A', 'drawn', 'modeled')!, /every snapshot/);
    assert.ok(m.mark('X', 'owed', 'charted'));
    assert.equal(m.mark('A', 'nonsense', 'charted'), null);
    assert.ok(m.cell('implied'));
    assert.ok(m.flag('unsaid'));
  });
});

// The parts the review of the explorer used to find its edges, written beside Harbor's: a
// parallel chart whose second region reads what the first changes, a condition that is a number,
// a refusal whose condition divides by zero, a chart past the limit, and prose that does not compile.
const EDGES: Record<string, string> = {
  lamp: `# Lamp\nTier: charted\nModule: lamp\n\nThe Lamp has two halves. It holds n, a count from 0 to 1. It holds m, a count from 0 to 1.\n\n## States\n[S1] Off: dark.\n[S2] Running: lit. Within it, it is both Clock and Beam.\n[S3] Running.Clock: the clock half. Within it, it is either Slow or Fast; it starts Slow.\n[S4] Running.Clock.Slow: slow.\n[S5] Running.Clock.Fast: fast.\n[S6] Running.Beam: the beam half. Within it, it is either Dim or Bright; it starts Dim.\n[S7] Running.Beam.Dim: dim.\n[S8] Running.Beam.Bright: bright.\n\n## Events\n[E1] on, from the user: switch on.\n[E2] off, from the user: switch off.\n[E3] tick, from the user: a tick.\n\n## Moves\n[M1] When Off receives on, it becomes Running.\n[M2] When Running receives off, it becomes Off, n becomes 0, m becomes 0.\n[M3] When Running.Clock.Slow receives tick, it becomes Running.Clock.Fast, n becomes 1.\n[M4] When Running.Beam.Dim receives tick, it becomes Running.Beam.Bright, m becomes n.\n[M5] When Running.Clock.Fast receives tick, it stays Running.Clock.Fast.\n[M6] When Running.Beam.Bright receives tick, it stays Running.Beam.Bright.\n[R1] In Off, off and tick are refused.\n[R2] In Running, on is refused.\n\n## Words only\n[T1] The piece promises nothing eventual.\n`,
  nonbool: `# Nonbool\nTier: charted\nModule: nonbool\n\nIt holds n, a count from 0 to 2, starting at 2.\n\n## States\n[S1] Idle: idle.\n\n## Events\n[E1] go, from the user: go.\n\n## Moves\n[M1] When Idle receives go and {n}, it stays Idle, n drops by one.\n[R1] In Idle, go is refused when n is 0.\n\n## Words only\n[T1] The piece promises nothing eventual.\n`,
  divz: `# Divz\nTier: charted\nModule: divz\n\nIt holds d, a count from 0 to 2, starting at 1.\n\n## States\n[S1] Idle: idle.\n\n## Events\n[E1] go, from the user: go.\n[E2] down, from the user: d drops.\n\n## Moves\n[M1] When Idle receives go and d is above 0, it stays Idle.\n[M2] When Idle receives down and d is above 0, it stays Idle, d drops by one.\n[R1] In Idle, go is refused when {4 div d = 0}.\n[R2] In Idle, down is refused when d is 0.\n\n## Walks\n[W1] Walk Down: from Idle, down, go refused; ends Idle with d 0.\n\n## Words only\n[T1] The piece promises nothing eventual.\n`,
  huge: `# Huge\nTier: charted\nModule: huge\n\nIt holds a, a count from 0 to 200. It holds b, a count from 0 to 200.\n\n## States\n[S1] Idle: idle.\n\n## Events\n[E1] inc-a, from the user: a grows.\n[E2] inc-b, from the user: b grows.\n\n## Moves\n[M1] When Idle receives inc-a and a is below 200, it stays Idle, a grows by one.\n[M2] When Idle receives inc-b and b is below 200, it stays Idle, b grows by one.\n[R1] In Idle, inc-a is refused when a is 200.\n[R2] In Idle, inc-b is refused when b is 200.\n\n## Words only\n[T1] The piece promises nothing eventual.\n`,
  broken: `# Broken\nTier: charted\nModule: broken\n\nIt holds n, a count from 0 to 1.\n\n## States\n[S1] Idle: idle.\n\n## Events\n[E1] go, from the user: go.\n\n## Moves\n[M1] When Nowhere receives go, it becomes Idle.\n\n## Words only\n[T1] The piece promises nothing eventual.\n`,
};

describe('the explorer at the edges a review found', () => {
  let dir: string, root: string;
  const analysis = (id: string) => verifyAll({ root, version, write: false }).parts.find(a => a.id === id)!;
  before(() => {
    dir = harborCopy();
    root = join(dir, 'dossiers');
    for (const [id, prose] of Object.entries(EDGES)) { mkdirSync(join(root, 'parts', id), { recursive: true }); writeFileSync(join(root, 'parts', id, 'prose.md'), prose); }
  });
  after(() => rmSync(dir, { recursive: true, force: true }));

  it('says when a chart did not run, and takes the limit it is given', async () => {
    const broken = await chartRun(root, analysis('broken'));
    assert.match(broken.view.error!, /does not compile/);
    assert.equal(broken.view.outcome, 'fail');
    const huge = await chartRun(root, analysis('huge'));
    assert.equal(huge.view.limitHit, true);
    assert.match(huge.view.error!, /exceeded 20000 states/);
    assert.equal(huge.view.snapshots.length, 0, 'no part of a graph cut short is shown');
    const wide = await chartRun(root, analysis('huge'), 50000);
    assert.equal(wide.view.limitHit, false);
    assert.equal(wide.view.snapshots.length, 201 * 201);
  });

  it('decides a condition as the chart does, a number counting as true', async () => {
    const run = await chartRun(root, analysis('nonbool'));
    assert.equal(run.view.outcome, 'pass');
    const x = explainAt(run, run.view.initial)!;
    const go = x.cases.find(c => c.event.type === 'go')!;
    assert.deepEqual(go.by, ['M1']);
    assert.equal(go.candidates.find(c => c.id === 'M1')!.holds, true);
  });

  it('shows the changes the machine made, not ones worked out beside it', async () => {
    const run = await chartRun(root, analysis('lamp'));
    const at = run.view.snapshots.findIndex(s => s.leaves.includes('Running.Clock.Slow') && s.leaves.includes('Running.Beam.Dim') && s.context.n === 0 && s.context.m === 0);
    assert.ok(at >= 0, 'the lamp reaches both halves at their start');
    const tick = explainAt(run, at)!.cases.find(c => c.event.type === 'tick')!;
    assert.deepEqual(tick.by.sort(), ['M3', 'M4'], 'one move at each region');
    assert.deepEqual(Object.fromEntries(tick.changes.map(c => [c.name, c.after])), { n: 1, m: 1 }, 'the second region read what the first changed');
  });

  it('names a condition that cannot be evaluated instead of calling the pair unsaid', async () => {
    const run = await chartRun(root, analysis('divz'));
    const atZero = run.view.snapshots.findIndex(s => s.context.d === 0);
    const go = run.view.edges.find(e => e.from === atZero && e.event.type === 'go')!;
    assert.deepEqual(go.by, []);
    assert.match(go.byError!, /R1/);
    const x = explainAt(run, atZero)!.cases.find(c => c.event.type === 'go')!;
    assert.equal(x.candidates.find(c => c.id === 'M1')!.holds, false, 'the move was asked on its own, and its condition is false');
    assert.match(x.candidates.find(c => c.id === 'R1')!.error!, /cannot be evaluated/);
    const walk = run.view.walks.find(w => w.id === 'W1')!;
    assert.match(walk.steps.at(-1)!.byError || walk.steps.at(-1)!.error || '', /R1/, 'the walk step that meets it says so');
  });
});

describe('the explorer\'s names and folders', () => {
  it('reads who acted by the composer\'s names for actions and variables', () => {
    const actorOf = actorOfAction(['lane-a', 'governance'], ['vault'], 'chain');
    assert.equal(actorOf('Lane_a'), 'lane-a');
    assert.equal(actorOf('Governance'), 'governance');
    assert.equal(actorOf('Vault'), 'vault');
    assert.equal(actorOf('TickStep'), 'chain');
    assert.equal(actorOf('Unknown'), null);
    assert.equal(actorOf(null), null);
    const split = memberOfVariable(['price', 'price-feed']);
    assert.deepEqual(split('price_feed_x'), ['price-feed', 'x']);
    assert.deepEqual(split('price_y'), ['price', 'y']);
    assert.deepEqual(split('clock'), [null, 'clock']);
  });

  it('names an actor or a member for every step of every cell trace Harbor holds', async () => {
    const dir = harborCopy(), root = join(dir, 'dossiers');
    const ex = await startExplorer({ root, pluginRoot, version, port: 0, dist: null });
    try {
      let steps = 0;
      for (const id of ['control', 'supply', 'upkeep']) {
        const s = await get(ex, `/api/composition/${id}`);
        for (const c of s.cells.filter((x: { steps: number }) => x.steps)) {
          const t = await get(ex, `/api/composition/${id}/trace/${c.property}/${c.scenario}`);
          // TLC names the first state's line Initial predicate: the start, which no one took.
          for (const step of t.steps.filter((x: { action: string | null; stuttering: boolean }) => x.action && x.action !== 'Initial predicate' && !x.stuttering)) { steps++; assert.ok(step.actor, `${id} ${c.property} ${c.scenario}: ${step.action} names no one`); }
          for (const step of t.steps) for (const m of Object.keys(step.members)) assert.ok(s.members.some((x: { id: string }) => x.id === m), `${m} is a member`);
        }
      }
      assert.ok(steps > 0, 'Harbor holds at least one cell trace with actions');
    } finally { await ex.close(); rmSync(dir, { recursive: true, force: true }); }
  });

  it('shows an accepted violation in verify\'s words, and why a composition does not compose', async () => {
    const dir = harborCopy(), root = join(dir, 'dossiers');
    const file = join(root, 'compositions', 'supply', 'wiring.md');
    writeFileSync(file, readFileSync(file, 'utf8').replace('  - part: token\n', '  - part: nosuch\n'));
    const ex = await startExplorer({ root, pluginRoot, version, port: 0, dist: null });
    try {
      const page = await get(ex, '/api/root');
      const control = page.dossiers.find((d: { id: string }) => d.id === 'control');
      assert.ok(Object.values(control.marks).includes('violated, accepted'), JSON.stringify(control.marks));
      const words = new Set([...page.legend.cells.map((c: { mark: string }) => c.mark), 'violated, accepted', 'violated, acceptance lapsed']);
      for (const d of page.dossiers.filter((x: { kind: string }) => x.kind === 'composition')) for (const m of Object.values(d.marks)) assert.ok(words.has(m as string), `${d.id}: ${m} is a cell's word`);
      const supply = await get(ex, '/api/composition/supply');
      assert.ok(supply.errors.length > 0, 'a wiring that cites no such part says why');
    } finally { await ex.close(); rmSync(dir, { recursive: true, force: true }); }
  });

  it('refreshes on a change in the knowledge base and in .running/, and not in trials/ or its own build', async () => {
    for (const path of ['.explorer/dist/app.js', 'node_modules/x/index.js', '.git/HEAD', '_scratch/a', 'parts/oracle/trials/t1/result.json']) assert.equal(quiet(path), true, path);
    for (const path of ['parts/oracle/.running/t1/entry.json', 'parts/trials/prose.md', 'parts/oracle/prose.md', 'compositions/supply/evidence/a.json']) assert.equal(quiet(path), false, path);
    const dir = harborCopy(), root = join(dir, 'dossiers');
    const ex = await startExplorer({ root, pluginRoot, version, port: 0, dist: null });
    try {
      const events = await changeEvent(ex, () => writeFileSync(join(dir, 'knowledge', 'a-new-note.md'), 'A note.\n'));
      assert.match(events, /knowledge: a-new-note\.md/);
    } finally { await ex.close(); rmSync(dir, { recursive: true, force: true }); }
  });

  it('takes the next free port, and says plainly when none is free', async () => {
    const hold = (port: number) => new Promise<ReturnType<typeof createServer>>((resolve, reject) => { const s = createServer(); s.once('error', reject); s.listen(port, '127.0.0.1', () => resolve(s)); });
    const first = await hold(0);
    const port = (first.address() as { port: number }).port;
    const held = [first];
    const warnings: string[] = [];
    const onWarning = (w: Error) => warnings.push(w.name);
    process.on('warning', onWarning);
    const dir = harborCopy(), root = join(dir, 'dossiers');
    try {
      for (let p = port + 1; p < port + 12; p++) held.push(await hold(p).catch(() => first));
      const ex = await startExplorer({ root, pluginRoot, version, port, dist: null });
      assert.ok(ex.port > port, `took ${ex.port}`);
      await ex.close();
      let edge: ReturnType<typeof createServer> | null = null;
      try { edge = await hold(65535); } catch { /* Someone else holds it, which serves as well. */ }
      // A server that started after all would be closed before the assertion fails, so nothing stays open.
      const outcome = await startExplorer({ root, pluginRoot, version, port: 65535, dist: null }).then(async started => { await started.close(); return null; }, (e: Error) => e);
      assert.ok(outcome instanceof NoFreePort && /no free port from 65535 to 65535/.test(outcome.message), String(outcome));
      edge?.close();
      assert.deepEqual(warnings.filter(w => w === 'MaxListenersExceededWarning'), []);
    } finally {
      process.off('warning', onWarning);
      for (const s of held) s.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('removes a half-made build when npm is missing, and says npm is missing', () => {
    const dir = harborCopy(), root = join(dir, 'dossiers'), path = process.env.PATH;
    const said: string[] = [];
    try {
      process.env.PATH = join(dir, 'no-such-folder');
      const code = install(root, pluginRoot, version, line => said.push(line));
      assert.notEqual(code, 0);
      assert.match(said.join('\n'), /npm is not on the PATH/);
      assert.equal(existsSync(join(root, EXPLORER, 'build')), false, 'nothing of the build is left');
      assert.equal(buildState(root, pluginRoot).ready, false);
    } finally { process.env.PATH = path; rmSync(dir, { recursive: true, force: true }); }
  });

  it('the command refuses a bad limit, and doctor names the page', () => {
    const dir = harborCopy(), root = join(dir, 'dossiers');
    try {
      const bad = spawnSync(bin, ['explore', '--limit', '0', '--root', root], { encoding: 'utf8', env });
      assert.equal(bad.status, 2);
      assert.match(bad.stderr, /--limit takes a whole number/);
      const doctor = spawnSync(bin, ['doctor', '--root', root], { encoding: 'utf8', env });
      assert.match(doctor.stdout, /explorer: page not built: run dossier explore --install/);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
