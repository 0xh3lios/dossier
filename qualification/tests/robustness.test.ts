// Malformed prose never takes a command down. Each case writes one malformed dossier beside a
// sound part in a fresh temporary root, then runs scaffold and verify on it, and draw on a
// part. Every command ends with exit 0, 1 or 2, and one that fails names the problem. None
// prints an internal error or a stack trace, and nothing written holds "undefined" or "NaN". A
// command that refuses writes no model/ and no chart/. A malformed actors or scenarios file
// trips once, however many dossiers read it.
//   node --test qualification/tests/robustness.test.ts
import { emptyCollection } from './collection-fixture.ts';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { VerifyJson } from '../../src/commands/verify.ts';
import type { Note } from '../../src/verify/tripwires.ts';

const pluginRoot = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const bin = join(pluginRoot, 'bin', 'dossier');
const version = (JSON.parse(readFileSync(join(pluginRoot, 'package.json'), 'utf8')) as { version: string }).version;
// DOSSIER_DEBUG prints the stack of an internal error, so a crash shows where it came from.
const env: NodeJS.ProcessEnv = { ...process.env, DOSSIER_DEBUG: '1' };
delete env.DOSSIER_ROOT;

const ACTORS = '# Actors\n\n```yaml\nactors:\n  - id: public\n    name: the public\n    kind: public\n  - id: chain\n    name: the chain\n    kind: chain\n```\n';
const SCENARIOS = '# Scenarios\n\n```yaml\nscenarios:\n  - id: all-honest\n    modes: {}\n  - id: public-malicious\n    modes: { public: malicious }\n```\n';
const INTEGRITY = JSON.stringify({ schema: 1, evidence: {}, decisionHead: null }) + '\n';

// The part every case breaks, sound as written: it draws, scaffolds and verifies.
const PIECE = `# Piece

Tier: charted

The piece counts pokes. It holds x, a count from 0 to 2. It holds lit, a flag. It sends ring to the Bell.

## States
[S1] Idle: nothing is happening.

## Events
[E1] go, from the public: someone pokes the piece. Carries amount, a count from 0 to 1.

## Moves
[M1] When Idle receives go, it stays Idle, sends ring.

## Walks
[W1] Walk Poke: from Idle, go; ends Idle; ring sent once.

## Words only
[T1] This piece promises nothing eventual.
`;
// The composition every composition case breaks, over the sound part.
const NET = '# Net\n\nConcern: net\n\nThe sound piece alone.\n\n## Always\n[A1] Always, {sound.x <= 2}.\n';
const COMPOSITION = (members: string[]) => `# Wiring\n\n\`\`\`yaml\nmembers:\n${members.map(m => `  - part: ${m}\n    role: member\n`).join('')}wiring: []\nclosure: []\nscenarios: [all-honest]\n\`\`\`\n`;

interface Root { root: string; write: (path: string, text: string) => void; run: (args: string[]) => { status: number | null; out: string }; remove: () => void }
// A dossiers root as setup leaves it, with the sound part and the given parts and compositions.
function makeRoot({ parts = {}, compositions = {} }: { parts?: Record<string, string>; compositions?: Record<string, { prose: string; members?: string[] }> } = {}): Root {
  const repo = mkdtempSync(join(tmpdir(), 'dossier-robustness-'));
  const root = join(repo, 'dossiers');
  const write = (path: string, text: string) => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); if (/^(parts|compositions)\/[^/]+\/prose\.md$/.test(path)) emptyCollection(dirname(join(root, path))); };
  write('dossier.json', JSON.stringify({ plugin: version, storage: 'integrity-v1' }, null, 2) + '\n');
  write('actors/actors.md', ACTORS);
  write('actors/scenarios.md', SCENARIOS);
  for (const [id, prose] of Object.entries({ sound: PIECE.replace('# Piece', '# Sound'), ...parts })) { write(`parts/${id}/integrity.json`, INTEGRITY); write(`parts/${id}/prose.md`, prose); }
  for (const [id, { prose, members = ['sound'] }] of Object.entries(compositions)) { write(`compositions/${id}/integrity.json`, INTEGRITY); write(`compositions/${id}/wiring.md`, COMPOSITION(members)); write(`compositions/${id}/prose.md`, prose); }
  const run = (args: string[]) => {
    const r = spawnSync(bin, [args[0], '--root', root, ...args.slice(1)], { cwd: repo, env, encoding: 'utf8' });
    if (r.error) throw r.error;
    return { status: r.status, out: `${r.stdout || ''}${r.stderr || ''}` };
  };
  return { root, write, run, remove: () => rmSync(repo, { recursive: true, force: true }) };
}

// Every text file under a folder, by path.
function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap(name => (statSync(join(dir, name)).isDirectory() ? filesUnder(join(dir, name)) : [join(dir, name)]));
}

// What no command may print, and what nothing written may hold.
const CRASH = /internal error|^\s+at \S|\b(?:TypeError|ReferenceError|RangeError|SyntaxError)\b|Cannot read propert|is not a function/m;
const UNREAD = /\bundefined\b|\bNaN\b/;
type Outcome = [code: number, text: string];

function expectOutcome(r: { status: number | null; out: string }, [code, text]: Outcome, what: string): void {
  assert.ok(r.status === 0 || r.status === 1 || r.status === 2, `${what}: exit ${r.status}\n${r.out}`);
  assert.doesNotMatch(r.out, CRASH, `${what}: crashed\n${r.out}`);
  assert.doesNotMatch(r.out, UNREAD, `${what}: printed a value that did not read\n${r.out}`);
  assert.equal(r.status, code, `${what}: exit ${r.status}, not ${code}\n${r.out}`);
  assert.ok(r.out.includes(text), `${what}: does not say "${text}"\n${r.out}`);
}

// A part case breaks the piece; problem is what all three commands say, exit 1, unless one says otherwise.
interface PartCase { name: string; prose: string; problem: string; draw?: Outcome; scaffold?: Outcome; verify?: Outcome }
const broken = (from: string, to: string) => { assert.ok(PIECE.includes(from), from); return PIECE.replace(from, to); };
const PART_CASES: PartCase[] = [
  { name: 'a starting value that is not a whole number', prose: broken('a count from 0 to 2.', 'a count from 0 to 2, starting at lots.'), problem: 'boundary: "x" has no readable type: starting value "lots" is not a whole number' },
  { name: 'a range bound that is not a whole number', prose: broken('a count from 0 to 2.', 'a count from 0 to lots.'), problem: 'boundary: "x" has no readable type: bound "lots" is not a whole number' },
  { name: 'a lower bound that is not a whole number', prose: broken('a count from 0 to 2.', 'a count from none to 2.'), problem: 'boundary: "x" has no readable type: bound "none" is not a whole number' },
  { name: 'an amount bound that is not a whole number', prose: broken('a count from 0 to 2.', 'an amount of HRD up to lots.'), problem: 'boundary: "x" has no readable type: bound "lots" is not a whole number' },
  { name: 'a range that runs backwards', prose: broken('a count from 0 to 2.', 'a count from 3 to 1.'), problem: 'boundary: "x" has no readable type: the range from 3 to 1 holds no value' },
  { name: 'a starting value outside the range', prose: broken('a count from 0 to 2.', 'a count from 0 to 2, starting at 5.'), problem: 'boundary: "x" has no readable type: starting value 5 is outside the range from 0 to 2' },
  { name: 'a flag that starts neither set nor clear', prose: broken('It holds lit, a flag.', 'It holds lit, a flag, starting lots.'), problem: 'boundary: "lit" has no readable type: starting value "lots" is not set or clear' },
  { name: 'a choice that starts at none of its values', prose: broken('It holds lit, a flag.', 'It holds lane, one of A or B, starting at C.'), problem: 'boundary: "lane" has no readable type: starting value "C" is not one of A, B' },
  { name: 'a field bound that is not a whole number', prose: broken('Carries amount, a count from 0 to 1.', 'Carries amount, a count from 0 to lots.'), problem: 'E1: field "amount" has no readable type: bound "lots" is not a whole number' },
  { name: 'a field starting value that is not a whole number', prose: broken('Carries amount, a count from 0 to 1.', 'Carries amount, a count from 0 to 1, starting at lots.'), problem: 'E1: field "amount" has no readable type: starting value "lots" is not a whole number' },
  { name: 'a walk that counts sends in a word that is not a whole number', prose: broken('ring sent once', 'ring sent lots times'), problem: 'W1: end clause "ring sent lots times": "lots" is not a whole number' },
  { name: 'a walk step whose value is no datum', prose: broken('from Idle, go;', 'from Idle, go amount lots;'), problem: 'W1: "lots" is not data, a field of the event or an enum value (the step go)' },
  { name: 'a Within whose ticks are not a number', prose: broken('## Words only\n[T1] This piece promises nothing eventual.', '## Within\n[N1] Within lots ticks of Idle, Idle, given G1.\n\n## Given\n[G1] Given that someone pokes. If this is false, nothing moves.'), problem: 'N1: "lots" is not a number of ticks' },
  { name: 'no title', prose: broken('# Piece\n', ''), problem: 'no title: a "# <Name>" line names the part' },
  { name: 'an empty title', prose: broken('# Piece\n', '#\n'), problem: 'no title: a "# <Name>" line names the part' },
  { name: 'an empty prose.md', prose: '', problem: 'no title: a "# <Name>" line names the part' },
  { name: 'a section the grammar does not know', prose: broken('## Walks', '## Walkies'), problem: 'unknown section "## Walkies"' },
  { name: 'a Move that follows no form', prose: broken('[M1] When Idle receives go, it stays Idle, sends ring.', '[M1] Idle takes go.'), problem: 'M1: does not follow the Move form' },
  { name: 'no Events section, with a Move that names an event', prose: broken('## Events\n[E1] go, from the public: someone pokes the piece. Carries amount, a count from 0 to 1.\n\n', ''), problem: 'M1 names event go, which no Event passage declares' },
  // Nothing is malformed, but no state is said yet, as in a fresh dossier: verify reads it, draw
  // finds the event nothing accepts, and scaffold has no state for the module to start in.
  {
    name: 'no States section', prose: '# Piece\n\nTier: charted\n\nIt holds x, a count from 0 to 2.\n\n## Events\n[E1] go, from the public: someone pokes the piece.\n\n## Words only\n[T1] This piece promises nothing eventual.\n', problem: '',
    verify: [0, 'Piece: 2 passages'], draw: [1, 'E1: go is handled'], scaffold: [1, 'dossier scaffold: piece has no State passage for the module to start in'],
  },
];

// A composition case breaks the composition net; scaffold and verify each say the problem, exit 1, unless the case says otherwise.
interface CompositionCase { name: string; prose: string; problem: string; scaffold?: Outcome; verify?: Outcome }
const COMPOSITION_CASES: CompositionCase[] = [
  { name: 'a Within whose ticks are not a number', prose: NET.replace('## Always\n[A1] Always, {sound.x <= 2}.', '## Within\n[N1] Within lots ticks of sound.Idle, sound.Idle, given G1.\n\n## Given\n[G1] Given that someone pokes. If this is false, nothing moves.'), problem: 'N1: "lots" is not a number of ticks' },
  { name: 'a walk step that does not read', prose: `${NET}\n## Walks\n[W1] Walk Poke: from sound.Idle, sound.go amount; ends sound.Idle.\n`, problem: 'W1: step "sound.go amount" is not "<part>.<event>[ <field> <value>...][ refused]"' },
  { name: 'an Always whose condition does not read', prose: NET.replace('{sound.x <= 2}', '{sound.x <=}'), problem: 'A1: unexpected end of {sound.x <=}' },
  { name: 'a property citing a Given that does not exist', prose: NET.replace('{sound.x <= 2}.', '{sound.x <= 2}, given G9.'), problem: 'A1 cites G9, which does not exist' },
  { name: 'no title, which a composition does not need', prose: NET.replace('# Net\n\n', ''), problem: '', scaffold: [0, 'cells: A1×all-honest'], verify: [0, 'verify: ok'] },
  { name: 'an empty prose.md', prose: '', problem: '', scaffold: [0, 'cells: '], verify: [0, 'verify: ok'] },
];

// Everything a command wrote under the root reads: no "undefined", no "NaN".
function expectWrittenReads(root: string, what: string): void {
  for (const file of [...filesUnder(join(root, 'parts')), ...filesUnder(join(root, 'compositions'))].filter(f => /\/(?:model|chart)\//.test(f))) {
    assert.doesNotMatch(readFileSync(file, 'utf8'), UNREAD, `${what}: ${file.slice(root.length + 1)} holds a value that did not read`);
  }
}

describe('malformed part prose', () => {
  it('leaves the sound piece sound: it draws, scaffolds and verifies', () => {
    const r = makeRoot({ parts: { piece: PIECE } });
    try {
      expectOutcome(r.run(['draw', 'piece']), [0, 'draw: piece · pass'], 'draw');
      expectOutcome(r.run(['scaffold', 'piece']), [0, 'wrote parts/piece/model/Piece.tla'], 'scaffold');
      expectOutcome(r.run(['verify']), [0, 'verify: ok'], 'verify');
      expectWrittenReads(r.root, 'the sound piece');
    } finally { r.remove(); }
  });

  for (const c of PART_CASES) it(`names ${c.name} in draw, scaffold and verify, and never crashes`, () => {
    const r = makeRoot({ parts: { piece: c.prose } });
    const dir = join(r.root, 'parts', 'piece');
    try {
      const draw = r.run(['draw', 'piece']);
      expectOutcome(draw, c.draw || [1, c.problem], `draw (${c.name})`);
      if (draw.out.includes('does not compile')) assert.equal(existsSync(join(dir, 'chart')), false, 'draw writes no chart for a prose that does not compile');
      const scaffold = r.run(['scaffold', 'piece']);
      expectOutcome(scaffold, c.scaffold || [1, c.problem], `scaffold (${c.name})`);
      if (scaffold.status !== 0) assert.equal(existsSync(join(dir, 'model')), false, 'a scaffold that refuses makes no model/');
      // One malformed prose never takes the root down: verify still reads the sound part.
      const verify = r.run(['verify']);
      expectOutcome(verify, c.verify || [1, c.problem], `verify (${c.name})`);
      assert.match(verify.out, /^Sound: /m, 'verify still reports the sound part');
      expectWrittenReads(r.root, c.name);
    } finally { r.remove(); }
  });
});

describe('malformed composition prose', () => {
  for (const c of COMPOSITION_CASES) it(`names ${c.name} in scaffold and verify, and never crashes`, () => {
    const r = makeRoot({ compositions: { net: { prose: c.prose } } });
    try {
      const scaffold = r.run(['scaffold', 'net']);
      expectOutcome(scaffold, c.scaffold || [1, c.problem], `scaffold (${c.name})`);
      if (scaffold.status !== 0) assert.equal(existsSync(join(r.root, 'compositions', 'net', 'model')), false, 'a scaffold that refuses makes no model/');
      expectOutcome(r.run(['verify']), c.verify || [1, c.problem], `verify (${c.name})`);
      expectWrittenReads(r.root, c.name);
    } finally { r.remove(); }
  });
});

// The actors files are the root's. However many parts or compositions read them, each problem in
// them trips once, on one dossier: the first open composition, or the first open part with no composition.
describe('a malformed actors or scenarios file', () => {
  const ACTOR_NAMES = new Set(['malformed actors', 'scenario names unknown actor', 'stronger_than unsound']);
  const CASES: { name: string; file: string; text: string; trips: Note[] }[] = [
    { name: 'an actor of an unknown kind', file: 'actors/actors.md', text: ACTORS.replace('kind: chain', 'kind: weather'), trips: [{ name: 'malformed actors', where: 'actors.md: chain has kind "weather", not one of governance, multisig, keeper, user, public, chain, market, external' }] },
    { name: 'a scenario naming an actor actors.md does not declare', file: 'actors/scenarios.md', text: SCENARIOS.replace('{ public: malicious }', '{ governance: malicious }'), trips: [{ name: 'scenario names unknown actor', where: 'scenarios.md: public-malicious names actor "governance", which actors.md does not declare' }] },
    { name: 'a stronger_than its modes do not support', file: 'actors/scenarios.md', text: SCENARIOS.replace('    modes: {}\n', '    modes: {}\n    stronger_than: [public-malicious]\n'), trips: [{ name: 'stronger_than unsound', where: 'scenarios.md: all-honest is declared stronger than public-malicious, which its modes do not support: public is honest in all-honest and malicious in public-malicious' }] },
  ];
  // Every actors tripwire verify --json reports, with the dossier that reports it.
  const actorTrips = (json: VerifyJson) => [
    ...json.tripwires.map(t => ({ at: 'root', ...t })),
    ...[...json.parts, ...json.compositions].flatMap(a => a.tripwires.map(t => ({ at: a.id, ...t }))),
  ].filter(t => ACTOR_NAMES.has(t.name));

  for (const c of CASES) it(`trips ${c.name} once, with no composition and with two`, () => {
    const r = makeRoot({ parts: { piece: PIECE } });
    try {
      r.write(c.file, c.text);
      const alone = r.run(['verify', '--json']);
      assert.equal(alone.status, 1, alone.out);
      assert.deepEqual(actorTrips(JSON.parse(alone.out) as VerifyJson), c.trips.map(t => ({ at: 'piece', ...t })), 'the first open part reports it, and no other');
      const text = r.run(['verify']);
      expectOutcome(text, [1, `tripwire: Piece: ${c.trips[0].name}: ${c.trips[0].where}`], 'verify');
      assert.equal(text.out.split(`: ${c.trips[0].name}: ${c.trips[0].where}`).length - 1, 1, 'one tripwire line');
      for (const id of ['web', 'net']) { r.write(`compositions/${id}/integrity.json`, INTEGRITY); r.write(`compositions/${id}/wiring.md`, COMPOSITION(['sound', 'piece'])); r.write(`compositions/${id}/prose.md`, NET); }
      const both = r.run(['verify', '--json']);
      assert.equal(both.status, 1, both.out);
      assert.deepEqual(actorTrips(JSON.parse(both.out) as VerifyJson), c.trips.map(t => ({ at: 'net', ...t })), 'the first open composition reports it, and no part and no other composition');
    } finally { r.remove(); }
  });
});
