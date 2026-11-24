// The map: the block the root's README begins with, its reader, verify's notes and its tripwire, the tree
// with its counts, composition siting and flows, the index's tree, `dossier place` and setup's README.
// The synthetic root is a copy of Harbor, whose dossiers carry real behaviors and standings, under a map
// four levels deep that holds a dossier under several components, selects behaviors and claims, features
// readings and turns one component's flows off. Expected counts are worked out here from the dossiers'
// behavior reports and the sites this file states, not by the code under test.
//   node --test qualification/tests/map.test.ts
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalMap, emptyMap, parseMap, readRootMap, titleAndLead, withMapBlock } from '../../src/dossiers/map.ts';
import { parseUniqueJson } from '../../src/behaviors/records.ts';
import { MAP_NOTES, placeMap } from '../../src/verify/map.ts';
import { nullKnowledge } from '../../src/knowledge.ts';
import type { DossierMap } from '../../src/dossiers/map.ts';
import type { MapNode, MapRootNode, MapView } from '../../src/verify/map.ts';
import type { VerifyJson } from '../../src/commands/verify.ts';
import type { Analysis } from '../../src/verify/analyze.ts';
import type { ClaimReport } from '../../src/behaviors/report.ts';

const plugin = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
const bin = join(plugin, 'bin', 'dossier');
const env = { ...process.env };
for (const name of ['JAVA', 'TLA_TOOLS', 'ALLOY_JAR', 'APALACHE', 'DOSSIER_ROOT']) delete env[name];

const work = mkdtempSync(join(tmpdir(), 'dossier-map-'));
after(() => rmSync(work, { recursive: true, force: true }));
let copies = 0;
// A copy of Harbor's fixture, with its knowledge base beside the dossiers as in the plugin.
function harbor(): string {
  const dir = join(work, `harbor-${++copies}`);
  cpSync(join(plugin, 'qualification', 'fixture'), dir, { recursive: true });
  return join(dir, 'dossiers');
}
function dossier(root: string, args: string[]) {
  const r = spawnSync(bin, [...args, '--root', root], { cwd: dirname(root), env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error) throw r.error;
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, out: r.stdout + r.stderr };
}
const json = (root: string) => { const r = dossier(root, ['verify', '--json']); return { status: r.status, result: JSON.parse(r.stdout) as VerifyJson }; };
const readme = (root: string) => readFileSync(join(root, 'README.md'), 'utf8');
const BODY = '# Synthetic root\n\nA copy of Harbor under a deeper map, for the tests.\n\nA second paragraph.\n';
const withMap = (map: unknown, body = BODY) => '```json\n' + JSON.stringify(map, null, 2) + '\n```\n\n' + body;
const writeMap = (root: string, map: unknown, body = BODY) => writeFileSync(join(root, 'README.md'), withMap(map, body));

// Four levels down to a component, with vault, timelock and token under several components, behavior and
// claim selections, featured readings at the root and in a group, records, and the token component's
// flows turned off.
const DEEP = {
  format: 'dossier-map@0.3.0',
  featured: [{ dossier: 'compositions/control', behavior: 'emergency-halt', lead: 'The halt reaches the Adapter at once.' }],
  groups: [
    {
      id: 'system', title: 'System', lead: 'Everything Harbor does with credit and control.',
      groups: [
        {
          id: 'money', title: 'Money', lead: 'Credit and the HRD that represents it.',
          featured: [{ dossier: 'compositions/supply', behavior: 'match-token-backing/C1', lead: 'Supply equals issued credit.' }],
          groups: [
            {
              id: 'ledger-module', title: 'Ledger module', lead: 'The Vault and the plans that change its ceiling.',
              components: [
                { id: 'vault-core', title: 'Vault core', lead: 'Debt, credit and the ceiling.', record: 'vault#contract:vault', dossiers: ['parts/vault'] },
                { id: 'vault-ceiling', title: 'Ceiling changes', lead: 'How a plan raises the ceiling.', dossiers: [{ ref: 'parts/vault', select: ['raise-ceiling'] }, { ref: 'parts/timelock', select: ['schedule-and-execute/C1', 'complete-plan'] }] },
              ],
            },
            {
              id: 'hrd-module', title: 'HRD module', lead: 'Conversion and the token.',
              components: [
                { id: 'conversion', title: 'Conversion', lead: 'Credit into HRD and back.', dossiers: ['parts/adapter', { ref: 'parts/token', select: ['mint-and-burn/C1', 'mint-and-burn/C3'] }] },
                { id: 'token', title: 'Token', lead: 'The HRD supply.', flows: false, dossiers: ['parts/token'] },
              ],
            },
          ],
        },
        {
          id: 'control-area', title: 'Control', lead: 'Delays and the emergency halt.',
          components: [
            { id: 'timelock', title: 'Timelock', lead: 'One plan at a time.', dossiers: ['parts/timelock'] },
            { id: 'breaker', title: 'Breaker', lead: 'One halt.', dossiers: ['parts/breaker'] },
          ],
        },
      ],
    },
    {
      id: 'prices', title: 'Prices', lead: 'The Oracle and its keepers.',
      components: [{ id: 'oracle', title: 'Oracle', lead: 'A price and its age.', record: 'oracle#contract:oracle', dossiers: ['parts/oracle'] }],
    },
  ],
};
// Where this file expects each composition no component holds to sit: the lowest node over the
// components that hold its members.
const SITES: Record<string, string | null> = { 'compositions/supply': 'money', 'compositions/control': 'system', 'compositions/upkeep': 'oracle' };

// The nodes of a tree, by id, the root as null.
function nodesOf(tree: MapRootNode): Map<string | null, MapNode> {
  const out = new Map<string | null, MapNode>();
  const walk = (n: MapNode) => { out.set(n.id, n); if (n.kind !== 'component') for (const c of [...n.groups, ...n.components]) walk(c); };
  walk(tree);
  return out;
}
// The claims of every dossier, by `<ref>#<behavior>/<claim>`, as verify's behavior reports give them.
function claimsByKey(result: VerifyJson): Map<string, ClaimReport & { ref: string; behavior: string }> {
  const out = new Map<string, ClaimReport & { ref: string; behavior: string }>();
  for (const a of [...result.parts, ...result.compositions]) for (const b of a.behaviors!.behaviors) for (const c of b.claims) out.set(`${a.behaviors!.dossier}#${b.id}/${c.id}`, { ...c, ref: a.behaviors!.dossier, behavior: b.id });
  return out;
}
// What a node of the authored map reaches, worked out here from the map, SITES and the reports.
function expectedReach(spec: Record<string, unknown>, all: ReturnType<typeof claimsByKey>, sites = SITES): { dossiers: Set<string>; claims: Set<string> } {
  const dossiers = new Set<string>(), claims = new Set<string>();
  const take = (ref: string, select: string[] | null) => {
    dossiers.add(ref);
    for (const [key, c] of all) if (c.ref === ref && (!select || select.includes(c.behavior) || select.includes(`${c.behavior}/${c.id}`))) claims.add(key);
  };
  for (const e of (spec.dossiers as unknown[] | undefined) || []) typeof e === 'string' ? take(e, null) : take((e as { ref: string }).ref, (e as { select: string[] }).select);
  for (const child of [...((spec.groups as Record<string, unknown>[] | undefined) || []), ...((spec.components as Record<string, unknown>[] | undefined) || [])]) {
    const r = expectedReach(child, all, sites);
    for (const d of r.dossiers) dossiers.add(d);
    for (const k of r.claims) claims.add(k);
  }
  for (const [ref, site] of Object.entries(sites)) if (site === (spec.id ?? null)) take(ref, null);
  return { dossiers, claims };
}
function specNodes(spec: Record<string, unknown>, out = new Map<string | null, Record<string, unknown>>()) {
  out.set((spec.id as string | undefined) ?? null, spec);
  for (const child of [...((spec.groups as Record<string, unknown>[] | undefined) || []), ...((spec.components as Record<string, unknown>[] | undefined) || [])]) specNodes(child, out);
  return out;
}

describe('the map block', () => {
  it('reads a complete map, and its canonical form reads back the same', () => {
    const map = parseMap(DEEP);
    assert.deepEqual(parseMap(parseUniqueJson(canonicalMap(map))), map);
    assert.equal(canonicalMap(parseMap(parseUniqueJson(canonicalMap(map)))), canonicalMap(map), 'canonical twice is canonical once');
    assert.ok(canonicalMap(map).startsWith('{\n  "format": "dossier-map@0.3.0",\n  "featured": [\n'), 'two spaces of indentation, the format first');
    assert.match(canonicalMap(map), /\n {18}"dossiers": \[\n {20}"parts\/vault"\n {18}\]/, 'one item a line');
    // Keys come out in the fixed order whatever order they were written in.
    const shuffled = { groups: [{ components: [{ dossiers: ['parts/vault'], lead: 'L', record: 'vault#contract:vault', title: 'T', id: 'c', flows: false, featured: [{ lead: 'x', behavior: 'move-credit', dossier: 'parts/vault' }] }], lead: 'L', title: 'G', id: 'g' }], format: 'dossier-map@0.3.0' };
    const keys = (text: string) => [...text.matchAll(/^ *"([a-z]+)":/gm)].map(m => m[1]);
    assert.deepEqual(keys(canonicalMap(parseMap(shuffled))), ['format', 'groups', 'id', 'title', 'lead', 'components', 'id', 'title', 'lead', 'record', 'featured', 'dossier', 'behavior', 'lead', 'flows', 'dossiers']);
    assert.equal(canonicalMap(emptyMap()), '{\n  "format": "dossier-map@0.3.0",\n  "groups": []\n}');
  });

  it('refuses a block that does not match the format, each with its reason', () => {
    const group = (extra: Record<string, unknown>) => ({ format: 'dossier-map@0.3.0', groups: [{ id: 'g', title: 'G', lead: 'L', ...extra }] });
    const component = (extra: Record<string, unknown>) => group({ components: [{ id: 'c', title: 'C', lead: 'L', dossiers: ['parts/vault'], ...extra }] });
    const refused: [unknown, RegExp][] = [
      [[], /map must be an object/],
      [{ groups: [] }, /lacks the field "format"/],
      [{ format: 'dossier-map@0.1.0', groups: [] }, /map\.format must be dossier-map@0\.3\.0/],
      [{ format: 'dossier-collection@0.2.0', groups: [] }, /map\.format must be/],
      [{ format: 'dossier-map@0.3.0', groups: [], status: 'done' }, /unknown field "status"/],
      [{ format: 'dossier-map@0.3.0', groups: {} }, /map\.groups must be an array/],
      [group({ id: 'Bad_Id' }), /map\.groups\[0\]\.id must be an id/],
      [group({ title: '' }), /title must be a nonempty string/],
      [group({ lead: 'two\nlines' }), /lead must be one line/],
      [group({ dossiers: [] }), /unknown field "dossiers"/],
      [group({ flows: false }), /unknown field "flows"/],
      [group({ record: 'vault' }), /record must be a typed knowledge reference/],
      [{ format: 'dossier-map@0.3.0', groups: [{ id: 'g', title: 'G', lead: 'L', components: [{ id: 'g', title: 'C', lead: 'L', dossiers: [] }] }] }, /node id g is used twice/],
      [component({ dossiers: ['vault'] }), /dossiers\[0\] must be parts\/<id> or compositions\/<id>/],
      [component({ dossiers: ['parts/vault', 'parts/vault'] }), /lists parts\/vault twice/],
      [component({ dossiers: ['parts/vault', { ref: 'parts/vault', select: ['move-credit'] }] }), /lists parts\/vault twice/],
      [component({ dossiers: [{ ref: 'parts/vault', select: [] }] }), /select must name at least one behavior or claim/],
      [component({ dossiers: [{ ref: 'parts/vault' }] }), /lacks the field "select"/],
      [component({ dossiers: [{ ref: 'parts/vault', select: ['move-credit', 'move-credit'] }] }), /names one behavior or claim twice/],
      [component({ dossiers: [{ ref: 'parts/vault', select: ['move-credit/M1'] }] }), /select\[0\] must be <behavior> or <behavior>\/C<n>/],
      [component({ flows: 'no' }), /flows must be true or false/],
      [component({ dossiers: undefined }), /lacks the field "dossiers"/],
      [component({ featured: [{ dossier: 'parts/vault', behavior: 'move-credit' }] }), /lacks the field "lead"/],
      [component({ featured: [{ dossier: 'parts/vault', behavior: 'move-credit', lead: 'a' }, { dossier: 'parts/vault', behavior: 'move-credit', lead: 'b' }] }), /featured twice/],
      [component({ groups: [] }), /unknown field "groups"/],
    ];
    for (const [value, reason] of refused) assert.throws(() => parseMap(JSON.parse(JSON.stringify(value))), reason, JSON.stringify(value));
    // The block's own form: duplicate keys and JSON that does not parse are refused before the format is read.
    assert.throws(() => parseUniqueJson('{"format": "dossier-map@0.3.0", "format": "dossier-map@0.3.0"}'), /duplicate JSON key/);
  });

  it('reads the title and the lead after the block, and a root without a block as an empty map', t => {
    const root = harbor();
    t.after(() => rmSync(dirname(root), { recursive: true, force: true }));
    assert.deepEqual(titleAndLead('\n# Harbor\n\nThe lead, on\ntwo lines.\n\nMore.\n'), { title: 'Harbor', lead: 'The lead, on two lines.' });
    assert.deepEqual(titleAndLead('Only a paragraph.\n'), { title: null, lead: 'Only a paragraph.' });
    writeMap(root, DEEP);
    const read = readRootMap(root);
    assert.equal(read.error, null);
    assert.equal(read.block, true);
    assert.deepEqual([read.title, read.lead], ['Synthetic root', 'A copy of Harbor under a deeper map, for the tests.']);
    writeFileSync(join(root, 'README.md'), BODY);
    assert.deepEqual({ ...readRootMap(root), title: null, lead: null }, { map: emptyMap(), error: null, block: false, title: null, lead: null }, 'a README without a block reads as an empty map');
    assert.equal(readRootMap(root).title, 'Synthetic root');
    unlinkSync(join(root, 'README.md'));
    assert.deepEqual(readRootMap(root), { map: emptyMap(), error: null, block: false, title: null, lead: null }, 'so does a root without a README');
  });
});

describe('verify places the dossiers and counts each node', () => {
  let root: string, result: VerifyJson, status: number | null;
  before(() => {
    root = harbor();
    writeMap(root, DEEP);
    ({ status, result } = json(root));
  });

  it('passes with no notes, sites each composition at the lowest node over its members, and lists the flows', () => {
    assert.equal(status, 0);
    assert.match(result.verify, /^verify: ok · /);
    assert.deepEqual(result.map.notes, []);
    assert.deepEqual(result.map.unplaced!.dossiers, []);
    const nodes = nodesOf(result.map.tree!);
    for (const [ref, site] of Object.entries(SITES)) assert.ok(nodes.get(site)!.sited.includes(ref), `${ref} sits at ${site}`);
    assert.deepEqual([...nodes.values()].flatMap(n => n.sited).sort(), Object.keys(SITES).sort(), 'each composition sits once');
    const flows = Object.fromEntries([...nodes.values()].flatMap(n => n.kind === 'component' ? [[n.id, n.flows]] : []));
    // vault-ceiling holds the Vault and the Timelock only through selections, which make no flow; conversion
    // lists Supply through the Adapter it holds whole, not through its selection of the Token.
    assert.deepEqual(flows, {
      'vault-core': ['compositions/control', 'compositions/supply'],
      'vault-ceiling': [],
      conversion: ['compositions/control', 'compositions/supply'],
      token: [],
      timelock: ['compositions/control'],
      breaker: ['compositions/control'],
      oracle: ['compositions/upkeep'],
    }, 'a component lists the compositions its whole dossiers take part in, unless its flows are off');
    assert.equal((nodes.get('token') as { flowsOff: boolean }).flowsOff, true);
    assert.deepEqual((nodes.get('vault-ceiling') as { dossiers: unknown }).dossiers, [{ ref: 'parts/vault', select: ['raise-ceiling'] }, { ref: 'parts/timelock', select: ['schedule-and-execute/C1', 'complete-plan'] }]);
    assert.deepEqual(result.map.tree!.featured, DEEP.featured);
    assert.deepEqual([result.map.title, result.map.lead], ['Synthetic root', 'A copy of Harbor under a deeper map, for the tests.']);
  });

  it('counts distinct claims with the selections applied, a claim reached twice once, at every node', () => {
    const all = claimsByKey(result);
    const nodes = nodesOf(result.map.tree!);
    const specs = specNodes(DEEP as Record<string, unknown>);
    assert.equal(nodes.size, specs.size);
    for (const [id, spec] of specs) {
      const node = nodes.get(id)!, reach = expectedReach(spec, all);
      const c = node.counts;
      assert.equal(c.dossiers, reach.dossiers.size, `${id ?? 'root'} dossiers`);
      assert.equal(c.claims, reach.claims.size, `${id ?? 'root'} claims`);
      const standing = { supported: 0, 'evidence-available': 0, hypothesis: 0, contradicted: 0, contested: 0 };
      for (const key of reach.claims) standing[all.get(key)!.standing] += 1;
      assert.deepEqual(c.standing, standing, `${id ?? 'root'} standing`);
      assert.equal(Object.values(c.standing).reduce((x, y) => x + y, 0), c.claims, 'the standings sum to the claims');
      assert.equal(c.stale, [...reach.claims].filter(k => all.get(k)!.freshness !== 'current').length);
      assert.equal(c.needs.claims, standing.contradicted + standing.contested + standing['evidence-available']);
      const reports = [...result.parts, ...result.compositions].filter(a => reach.dossiers.has(a.behaviors!.dossier));
      assert.equal(c.needs.doubts, reports.reduce((n, a) => n + (a.summary.doubtsOpen || 0), 0), `${id ?? 'root'} doubts`);
      assert.equal(c.needs.reviews, reports.reduce((n, a) => n + a.behaviors!.reviews.reviews.filter(r => r.status === 'stale').length, 0));
      assert.equal(c.needs.decisions, result.compositions.filter(a => reach.dossiers.has(`compositions/${a.id}`)).reduce((n, a) => n + a.cells.filter(x => x.mark === 'violated' && !x.accepted).length, 0));
      assert.equal(c.needs.reviewsOwed, reports.filter(a => a.flags.some(f => f.name === 'review owed')).length, `${id ?? 'root'} reviews owed`);
      assert.equal(c.needs.tripwires, reports.filter(a => a.tripwires.length > 0).length, `${id ?? 'root'} tripwires`);
    }
    // Worked by hand from Harbor's collections: the Vault's eight claims, reached whole and again through
    // raise-ceiling, and three of the Timelock's, one selected claim and complete-plan's two.
    assert.equal(nodes.get('ledger-module')!.counts.claims, 11);
    assert.equal(nodes.get('ledger-module')!.counts.dossiers, 2);
    assert.equal(nodes.get('vault-ceiling')!.counts.claims, 6, 'raise-ceiling\'s three, schedule-and-execute/C1, complete-plan\'s two');
    assert.equal(nodes.get('conversion')!.counts.claims, 6 + 2, 'the Adapter whole, and two selected Token claims');
    assert.equal(result.map.tree!.counts.claims, all.size, 'every claim of every placed dossier, each once');
    assert.equal(result.map.tree!.counts.dossiers, 9);
    assert.equal(nodes.get('oracle')!.counts.needs.doubts, 1, 'the Oracle\'s open doubt counts where the Oracle is reached');
    // Every Harbor dossier, the six parts and the three compositions, owes a review of the whole dossier.
    assert.equal(result.map.tree!.counts.needs.reviewsOwed, 9);
    assert.equal(nodes.get('vault-ceiling')!.counts.needs.reviewsOwed, 2, 'a dossier reached through a selection still owes its review');
  });

  it('carries no time and no absolute path in the map', () => {
    const text = JSON.stringify(result.map);
    assert.ok(!text.includes(work) && !/"\/(?:Users|home|private|var|tmp)\//.test(text), 'no absolute path');
    assert.ok(!/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text), 'no time');
    assert.deepEqual(Object.keys(result.map), ['title', 'lead', 'tree', 'unplaced', 'notes']);
    const nodes = nodesOf(result.map.tree!);
    assert.deepEqual(Object.keys(nodes.get(null)!), ['kind', 'id', 'title', 'lead', 'featured', 'groups', 'components', 'sited', 'counts']);
    assert.deepEqual(Object.keys(nodes.get('money')!), ['kind', 'id', 'title', 'lead', 'record', 'featured', 'groups', 'components', 'sited', 'counts']);
    assert.deepEqual(Object.keys(nodes.get('vault-core')!), ['kind', 'id', 'title', 'lead', 'record', 'featured', 'dossiers', 'flows', 'flowsOff', 'sited', 'counts']);
    assert.deepEqual(Object.keys(nodes.get('vault-core')!.counts), ['dossiers', 'claims', 'standing', 'stale', 'needs']);
    assert.deepEqual(Object.keys(nodes.get('vault-core')!.counts.needs), ['claims', 'reviews', 'doubts', 'decisions', 'notes', 'reviewsOwed', 'tripwires']);
  });

  it('prints no map line without notes, and render puts the tree in the index', () => {
    for (const args of [['verify'], ['verify', '--brief']]) assert.ok(!/^map/m.test(dossier(root, args).stdout), args.join(' '));
    const r = dossier(root, ['render']);
    assert.equal(r.status, 0, r.out);
    const index = readFileSync(join(root, 'index.md'), 'utf8');
    const section = index.slice(index.indexOf('\n## Map\n'), index.indexOf('\n```json\n'));
    const tree = result.map.tree!;
    assert.ok(section.includes(`\nSynthetic root: 9 dossiers, ${tree.counts.claims} claims · `), section);
    assert.ok(section.includes('\n- Featured: compositions/control#emergency-halt — The halt reaches the Adapter at once.\n'));
    assert.ok(section.includes('\n- **System** `system` · Everything Harbor does with credit and control. · '));
    assert.ok(section.includes('\n  - **Money** `money` · '));
    assert.ok(section.includes('\n    - Featured: compositions/supply#match-token-backing/C1 — Supply equals issued credit.\n'));
    assert.ok(section.includes('\n    - **Ledger module** `ledger-module` · '));
    assert.ok(section.includes('\n      - **Ceiling changes** `vault-ceiling` · How a plan raises the ceiling. · holds parts/vault (raise-ceiling), parts/timelock (schedule-and-execute/C1, complete-plan) · 2 dossiers, 6 claims'), 'four levels down, with the selections');
    assert.match(section, /\n {6}- \*\*Vault core\*\* [^\n]*\n {8}- Flows: compositions\/control, compositions\/supply\n {6}- \*\*Ceiling changes\*\* [^\n]*\n {4}- \*\*HRD module\*\*/, 'a component\'s flows sit under it, and a component with none prints no line');
    assert.ok(section.includes('\n    - Sited here: compositions/supply\n'));
    assert.ok(section.includes('\n  - Sited here: compositions/control\n'));
    assert.ok(!section.includes('Not placed') && !section.includes('Map notes'));
    assert.ok(!section.includes(work), 'no absolute path in the index\'s tree');
    const again = dossier(root, ['render']);
    assert.equal(again.status, 0);
    assert.equal(readFileSync(join(root, 'index.md'), 'utf8'), index, 'a render that moves nothing rewrites nothing');
  });
});

describe('counts over stand-in reports', () => {
  // Harbor has no stale claim, stale review, unreviewed evidence, contested claim, violation without an
  // acceptance or tripwire. These stand-ins carry each, with every count below worked out by hand.
  const claim = (behavior: string, id: string, standing: string, freshness = 'current') => ({ id, key: `${behavior}/${id}`, standing, freshness });
  const stand = (kind: 'part' | 'composition', id: string, behaviors: { id: string; claims: unknown[] }[], { reviews = [] as { status: string }[], doubtsOpen = 0, ...rest }: Record<string, unknown> & { reviews?: { status: string }[]; doubtsOpen?: number } = {}) =>
    ({ kind, id, ref: `${kind}s/${id}`, behaviors: { behaviors, reviews: { reviews } }, summary: { doubtsOpen }, cells: [], wiring: { members: [] }, flags: [], tripwires: [], ...rest }) as unknown as Analysis;
  const owed = { name: 'review owed', where: 'no current dossier review' };
  const analyses = [
    stand('part', 'p1', [{ id: 'a', claims: [claim('a', 'C1', 'supported'), claim('a', 'C2', 'evidence-available', 'stale'), claim('a', 'C3', 'contested')] }], { reviews: [{ status: 'stale' }, { status: 'current' }], doubtsOpen: 2, flags: [owed] }),
    stand('part', 'p2', [{ id: 'b', claims: [claim('b', 'C1', 'hypothesis'), claim('b', 'C2', 'contradicted', 'missing')] }], { flags: [owed, { name: 'doubt open', where: 'D1' }], tripwires: [{ name: 'answer edited', where: 'evidence/x.json' }] }),
    stand('part', 'p3', [{ id: 'c', claims: [claim('c', 'C1', 'hypothesis')] }], { flags: [{ name: 'blunder owed', where: 'A1' }] }),
    stand('composition', 's1', [{ id: 'x', claims: [claim('x', 'C1', 'supported')] }], { wiring: { members: [{ part: 'p1' }, { part: 'p2' }] }, cells: [{ mark: 'violated', accepted: false }, { mark: 'violated', accepted: true }, { mark: 'checked' }], tripwires: [{ name: 'answer edited', where: 'a' }, { name: 'stray files', where: 'b' }] }),
    stand('composition', 's2', [{ id: 'y', claims: [claim('y', 'C1', 'evidence-available')] }], { wiring: { members: [{ part: 'p3' }] }, cells: [{ mark: 'violated', accepted: false }], flags: [owed] }),
    stand('composition', 's3', [{ id: 'z', claims: [claim('z', 'C1', 'supported')] }], { wiring: { members: [{ part: 'p2' }] }, tripwires: [{ name: 'stray files', where: 'c' }] }),
  ];
  // c1 holds p1 whole. c2 holds p2 and p1 only through selections, which place them and site nothing.
  const components = [
    { id: 'c1', title: 'C1', lead: 'L', dossiers: ['parts/p1'] },
    { id: 'c2', title: 'C2', lead: 'L', dossiers: [{ ref: 'parts/p2', select: ['b/C2'] }, { ref: 'parts/p1', select: ['a/C1'] }] },
  ];
  const placed = (list: unknown[]) => placeMap({ readme: { map: parseMap({ format: 'dossier-map@0.3.0', groups: [{ id: 'g', title: 'G', lead: 'L', components: list }] }), error: null, block: true, title: 'T', lead: 'L' }, analyses, retired: [], knowledge: nullKnowledge() });
  const view = placed(components);
  const nodes = nodesOf(view.tree!);
  const zero = { supported: 0, 'evidence-available': 0, hypothesis: 0, contradicted: 0, contested: 0 };

  it('counts each standing, the stale claims and what needs a person', () => {
    // s1's members are p1, held whole by c1 alone, and p2, held only through c2's selection: s1 sits at c1.
    assert.deepEqual(nodes.get('c1')!.sited, ['compositions/s1']);
    assert.deepEqual(nodes.get('g')!.sited, []);
    assert.deepEqual(nodes.get('c1')!.counts, { dossiers: 2, claims: 4, standing: { ...zero, supported: 2, 'evidence-available': 1, contested: 1 }, stale: 1, needs: { claims: 2, reviews: 1, doubts: 2, decisions: 1, notes: 0, reviewsOwed: 1, tripwires: 1 } });
    assert.deepEqual(nodes.get('c2')!.counts, { dossiers: 2, claims: 2, standing: { ...zero, supported: 1, contradicted: 1 }, stale: 1, needs: { claims: 1, reviews: 1, doubts: 2, decisions: 0, notes: 0, reviewsOwed: 2, tripwires: 1 } }, 'a dossier reached through a selection brings its reviews, doubts, flags and tripwires');
    // p1's a/C1 is reached by both components and counted once at g, and so is each dossier that owes a review.
    // s1's two tripwires count it once; p3's blunder owed is not a review owed.
    assert.deepEqual(nodes.get('g')!.counts, { dossiers: 3, claims: 5, standing: { ...zero, supported: 2, 'evidence-available': 1, contradicted: 1, contested: 1 }, stale: 2, needs: { claims: 3, reviews: 1, doubts: 2, decisions: 1, notes: 0, reviewsOwed: 2, tripwires: 2 } });
  });

  it('makes flows and sites from whole holdings only', () => {
    assert.deepEqual((nodes.get('c1') as { flows: string[] }).flows, ['compositions/s1'], 's1 sits at c1, which holds a member of it whole');
    assert.deepEqual((nodes.get('c2') as { flows: string[] }).flows, [], 'selections make no flow');
    // s3's one member, p2, is held only through a selection: s3 is unplaced, with no fallback.
    assert.ok(view.unplaced!.dossiers.includes('compositions/s3'));
    // An entry naming s3 places it, even through a selection, and it then sits nowhere and flows nowhere.
    const placedS3 = placed([components[0], { ...components[1], dossiers: [...components[1].dossiers, { ref: 'compositions/s3', select: ['z'] }] }]);
    assert.deepEqual(placedS3.unplaced!.dossiers, ['parts/p3', 'compositions/s2']);
    const again = nodesOf(placedS3.tree!);
    assert.deepEqual([...again.values()].flatMap(n => n.sited), ['compositions/s1']);
    assert.deepEqual([...again.values()].flatMap(n => n.kind === 'component' ? n.flows : []), ['compositions/s1']);
  });

  it('gives the unplaced the same counts: a part no component holds, and compositions whose members none hold whole', () => {
    assert.deepEqual(view.unplaced!.dossiers, ['parts/p3', 'compositions/s2', 'compositions/s3']);
    assert.deepEqual(view.unplaced!.counts, { dossiers: 3, claims: 3, standing: { ...zero, supported: 1, hypothesis: 1, 'evidence-available': 1 }, stale: 0, needs: { claims: 1, reviews: 0, doubts: 0, decisions: 1, notes: 3, reviewsOwed: 1, tripwires: 1 } });
    assert.equal(view.tree!.counts.needs.notes, 3, 'the root counts the unplaced notes');
    assert.equal(nodes.get('g')!.counts.needs.notes, 0, 'which belong to no node');
  });
});

describe('the map moves nothing else', () => {
  it('leaves every mark, cell, flag, route and claim as it was, and reads through a root that is a link', t => {
    const root = harbor();
    t.after(() => rmSync(dirname(root), { recursive: true, force: true }));
    writeFileSync(join(root, 'README.md'), BODY);
    const without = json(root).result;
    writeMap(root, DEEP);
    const withMapped = json(root).result;
    for (const key of ['verify', 'route', 'tripwires', 'parts', 'compositions'] as const) assert.deepEqual(withMapped[key], without[key], key);
    // A dossiers root may itself be a link; only the README is refused as one.
    const linked = join(dirname(root), 'linked');
    symlinkSync(root, linked);
    const through = json(linked);
    assert.equal(through.status, 0, JSON.stringify(through.result.tripwires));
    assert.deepEqual(through.result.map.notes, []);
    assert.deepEqual(through.result.map.tree!.counts, withMapped.map.tree!.counts);
    const placed = dossier(linked, ['place', 'breaker', 'oracle']);
    assert.equal(placed.status, 0, placed.out);
    assert.ok(readme(root).includes('"parts/breaker"\n          ]\n        }\n      ]\n    }\n  ]\n}\n```\n'), 'place writes through the linked root');
  });
});

describe('notes and the tripwire', () => {
  it('notes each finding without failing verify, and lists them all in full verify', t => {
    const root = harbor();
    t.after(() => rmSync(dirname(root), { recursive: true, force: true }));
    const retired = dossier(root, ['decide', 'compositions/upkeep', 'retire', '--', 'set aside for the test']);
    assert.equal(retired.status, 0, retired.out);
    const map = JSON.parse(JSON.stringify(DEEP));
    const prices = map.groups[1];
    prices.featured = [{ dossier: 'parts/vault', behavior: 'move-credit', lead: 'Not under Prices.' }];
    prices.components[0].record = 'oracle#contract:nope';
    prices.components[0].dossiers = ['compositions/upkeep'];
    map.groups[0].groups[0].groups[0].components[1].dossiers[0].select.push('no-such-behavior', 'move-credit/C9');
    map.groups[0].groups[1].components[1].dossiers = ['parts/nope'];
    map.featured.push({ dossier: 'compositions/gone', behavior: 'anything', lead: 'Names no dossier.' }, { dossier: 'compositions/control', behavior: 'emergency-halt/C7', lead: 'No such claim.' });
    writeMap(root, map);
    const { status, result } = json(root);
    assert.equal(status, 0, 'notes never fail verify');
    assert.match(result.verify, /^verify: ok · /);
    const where = result.map.notes.map(n => `${n.name}: ${n.where}`);
    // In the order of the tree, each node's notes as they were found, and the unplaced last.
    assert.deepEqual(where, [
      'dossier unknown: compositions/gone#anything featured at the root',
      'reading unknown: compositions/control#emergency-halt/C7 featured at the root',
      'reading unknown: parts/vault#no-such-behavior in vault-ceiling',
      'reading unknown: parts/vault#move-credit/C9 in vault-ceiling',
      'dossier unknown: parts/nope in breaker',
      'reading outside its node: parts/vault#move-credit featured in prices',
      'record unresolved: oracle#contract:nope cited by oracle',
      'dossier retired: compositions/upkeep in oracle',
      'dossier unplaced: parts/breaker',
      'dossier unplaced: parts/oracle',
    ], 'one note for each finding');
    assert.deepEqual([...new Set(result.map.notes.map(n => n.name))].sort(), [...MAP_NOTES].sort(), 'every kind of note');
    assert.deepEqual(result.map.notes.map(n => n.node), [null, null, 'vault-ceiling', 'vault-ceiling', 'breaker', 'prices', 'oracle', 'oracle', null, null]);
    // What does not resolve drops out of the tree: the unknown and retired dossiers, the readings, the selection items.
    const nodes = nodesOf(result.map.tree!);
    assert.deepEqual((nodes.get('vault-ceiling') as { dossiers: unknown }).dossiers, [{ ref: 'parts/vault', select: ['raise-ceiling'] }, { ref: 'parts/timelock', select: ['schedule-and-execute/C1', 'complete-plan'] }]);
    assert.deepEqual((nodes.get('breaker') as { dossiers: unknown }).dossiers, []);
    assert.deepEqual((nodes.get('oracle') as { dossiers: unknown }).dossiers, []);
    assert.deepEqual(result.map.tree!.featured, [DEEP.featured[0]]);
    assert.deepEqual(nodes.get('money')!.featured, DEEP.groups[0].groups![0].featured, 'Supply still sits under Money');
    assert.deepEqual(nodes.get('prices')!.featured, []);
    assert.deepEqual(result.map.unplaced!.dossiers, ['parts/breaker', 'parts/oracle'], 'a part whose only placement is gone is unplaced; the retired composition is not listed');
    assert.equal(result.map.unplaced!.counts.claims, 3 + 7, 'the unplaced Breaker\'s and Oracle\'s claims');
    assert.equal(result.map.unplaced!.counts.needs.notes, 2);
    assert.equal(result.map.tree!.counts.needs.notes, 10, 'the root counts every note');
    assert.equal(nodes.get('money')!.counts.needs.notes, 2, 'a group counts the notes below it');
    assert.equal(nodes.get('control-area')!.counts.needs.notes, 1);
    assert.equal(nodes.get('prices')!.counts.needs.notes, 3);
    assert.equal(nodes.get('oracle')!.counts.needs.notes, 2);
    // The lines: one map line counting the notes by name, and in full verify one line for each.
    const brief = dossier(root, ['verify', '--brief']);
    assert.equal(brief.status, 0);
    const line = 'map: 10 notes · dossier unplaced 2 · dossier unknown 2 · dossier retired 1 · reading unknown 3 · reading outside its node 1 · record unresolved 1';
    assert.deepEqual(brief.stdout.split('\n').filter(l => l.startsWith('map')), [line]);
    const full = dossier(root, ['verify']);
    assert.equal(full.status, 0);
    assert.deepEqual(full.stdout.split('\n').filter(l => l.startsWith('map')), [line, ...where.map(w => `map note: ${w}`)]);
    const render = dossier(root, ['render']);
    assert.equal(render.status, 0);
    const index = readFileSync(join(root, 'index.md'), 'utf8');
    assert.ok(index.includes('\nNot placed: parts/breaker, parts/oracle · 2 dossiers, 10 claims'), 'the index names the unplaced');
    assert.ok(index.includes(`\nMap notes: 10 · dossier unplaced 2 · `) && index.includes('\n- record unresolved: oracle#contract:nope cited by oracle\n'));
  });

  it('places nothing on a root without a block, and notes every live dossier unplaced', t => {
    const root = harbor();
    t.after(() => rmSync(dirname(root), { recursive: true, force: true }));
    writeFileSync(join(root, 'README.md'), BODY);
    const { status, result } = json(root);
    assert.equal(status, 0);
    assert.deepEqual(result.map.unplaced!.dossiers, [...result.parts.map(p => `parts/${p.id}`), ...result.compositions.map(c => `compositions/${c.id}`)]);
    assert.deepEqual(result.map.tree!.groups, []);
    assert.equal(result.map.tree!.counts.claims, 0);
    assert.equal(result.map.unplaced!.counts.claims, claimsByKey(result).size);
    assert.equal(result.map.title, 'Synthetic root');
    assert.deepEqual(dossier(root, ['verify', '--brief']).stdout.split('\n').filter(l => l.startsWith('map')), ['map: 9 notes · dossier unplaced 9']);
  });

  it('fails verify with malformed map when the block does not read, and places nothing', t => {
    const root = harbor();
    t.after(() => rmSync(dirname(root), { recursive: true, force: true }));
    const cases: [string, RegExp][] = [
      ['```json\n{"format": "dossier-map@0.3.0", "groups": [}\n```\n\n' + BODY, /README\.md: /],
      ['```json\n{"format": "dossier-map@0.3.0", "groups": [{"id": "a", "title": "A", "lead": "L", "colour": "red"}]}\n```\n\n' + BODY, /unknown field "colour"/],
      ['```json\n{"format": "dossier-map@0.3.0", "groups": []}\n' + BODY, /no closing fence/],
      ['```json\r\n{"format": "dossier-map@0.3.0", "groups": []}\r\n```\r\n\r# Stray\n', /LF or CRLF/],
      // A block meant as the map but not at byte zero is malformed, never read as no map at all.
      ['﻿```json\n{"format": "dossier-map@0.3.0", "groups": []}\n```\n\n' + BODY, /byte order mark/],
      ['\n```json\n{"format": "dossier-map@0.3.0", "groups": []}\n```\n\n' + BODY, /blank space comes before/],
      ['```json \n{"format": "dossier-map@0.3.0", "groups": []}\n```\n\n' + BODY, /must be ```json alone on its line/],
    ];
    for (const [text, reason] of cases) {
      writeFileSync(join(root, 'README.md'), text);
      const { status, result } = json(root);
      assert.equal(status, 1, text);
      assert.match(result.verify, /^verify: FAIL · .*malformed map \(README\.md: /);
      assert.equal(result.tripwires.length, 1);
      assert.equal(result.tripwires[0].name, 'malformed map');
      assert.match(result.tripwires[0].where, reason);
      assert.equal(result.route.pass, 'Fix');
      assert.deepEqual([result.map.tree, result.map.unplaced, result.map.notes], [null, null, []]);
    }
    const full = dossier(root, ['verify']);
    assert.equal(full.status, 1);
    assert.match(full.stdout, /^tripwire: malformed map: README\.md: /m);
    assert.ok(!/^map/m.test(full.stdout), 'no notes while the block does not read');
    // A README that is a link does not read either.
    unlinkSync(join(root, 'README.md'));
    writeFileSync(join(root, 'elsewhere.md'), withMap(DEEP));
    symlinkSync(join(root, 'elsewhere.md'), join(root, 'README.md'));
    assert.match(json(root).result.tripwires[0].where, /README\.md must be a regular file/);
    // Nor does one that is not UTF-8.
    unlinkSync(join(root, 'README.md'));
    writeFileSync(join(root, 'README.md'), Buffer.from('# Caf\xe9\n', 'latin1'));
    const latin = json(root);
    assert.equal(latin.status, 1);
    assert.match(latin.result.tripwires[0].where, /^README\.md: .*utf-8/i);
  });
});

describe('dossier place', () => {
  it('builds the map from nothing, rewrites the block alone, and keeps what is already so', t => {
    const root = harbor();
    t.after(() => rmSync(dirname(root), { recursive: true, force: true }));
    writeFileSync(join(root, 'README.md'), BODY);
    const run = (...args: string[]) => dossier(root, ['place', ...args]);
    let r = run('--group', 'credit', '--title', 'Credit', '--lead', 'The ledger and the token.');
    assert.equal(r.status, 0, r.out);
    assert.equal(r.stdout, 'created group credit at the top\n');
    assert.ok(readme(root).endsWith('\n```\n\n' + BODY), 'a README without a block gets one at byte zero, and the rest stays byte for byte');
    r = run('vault', 'vault', '--parent', 'credit', '--title', 'Vault', '--lead', 'Debt and credit.');
    assert.equal(r.status, 0, r.out);
    assert.equal(r.stdout, 'created component vault under credit\nplaced parts/vault in vault\n');
    const before = readme(root);
    r = run('vault', 'vault', '--parent', 'credit', '--title', 'Vault', '--lead', 'Debt and credit.');
    assert.equal(r.status, 0, r.out);
    assert.equal(r.stdout, 'kept parts/vault in vault\n', 'the same command runs again');
    assert.equal(readme(root), before, 'and writes nothing');
    r = run('parts/token', 'vault', '--select', 'mint-and-burn', '--select', 'transfer-without-supply-change/C1');
    assert.equal(r.status, 0, r.out);
    assert.equal(r.stdout, 'placed parts/token (mint-and-burn, transfer-without-supply-change/C1) in vault\n');
    r = run('token', 'vault', '--select', 'mint-and-burn');
    assert.equal(r.stdout, 'placed parts/token (mint-and-burn) in vault\n', 'a placement sets the entry to what is given');
    r = run('--group', 'governance', '--parent', 'credit', '--title', 'Governance', '--lead', 'Plans and halts.');
    assert.equal(r.stdout, 'created group governance under credit\n');
    r = run('compositions/control', 'halt', '--parent', 'governance', '--title', 'Halt', '--lead', 'The emergency stop.', '--select', 'emergency-halt');
    assert.equal(r.status, 0, r.out);
    const expected = {
      format: 'dossier-map@0.3.0',
      groups: [{
        id: 'credit', title: 'Credit', lead: 'The ledger and the token.',
        groups: [{ id: 'governance', title: 'Governance', lead: 'Plans and halts.', components: [{ id: 'halt', title: 'Halt', lead: 'The emergency stop.', dossiers: [{ ref: 'compositions/control', select: ['emergency-halt'] }] }] }],
        components: [{ id: 'vault', title: 'Vault', lead: 'Debt and credit.', dossiers: ['parts/vault', { ref: 'parts/token', select: ['mint-and-burn'] }] }],
      }],
    };
    assert.equal(readme(root), '```json\n' + canonicalMap(parseMap(expected)) + '\n```\n\n' + BODY, 'canonical JSON, then the README as it was');
    r = run('parts/token', 'vault', '--remove');
    assert.equal(r.stdout, 'removed parts/token from vault\n');
    assert.deepEqual(readRootMap(root).map!.groups![0].components![0].dossiers, ['parts/vault']);
    const { status, result } = json(root);
    assert.equal(status, 0);
    assert.ok(result.map.notes.every(n => n.name === 'dossier unplaced'), 'what place writes reads without other notes');
    assert.ok(result.map.unplaced!.dossiers.includes('parts/token'));
  });

  it('refuses what the map cannot hold, and writes nothing then', t => {
    const root = harbor();
    t.after(() => rmSync(dirname(root), { recursive: true, force: true }));
    writeMap(root, DEEP);
    const original = readme(root);
    const refused: [string[], RegExp][] = [
      [['parts/nope', 'oracle'], /no part or composition named parts\/nope/],
      [['vault', 'oracle', '--select', 'no-such'], /parts\/vault has no behavior no-such/],
      [['vault', 'oracle', '--select', 'move-credit/C9'], /parts\/vault#move-credit has no claim C9/],
      [['vault', 'oracle', '--select', 'move-credit', '--select', 'move-credit'], /names one behavior or claim twice/],
      [['vault', 'money'], /money is a group in the map, not a component/],
      [['vault', 'fresh'], /no component fresh in the map; give --title and --lead/],
      [['vault', 'fresh', '--parent', 'oracle', '--title', 'F', '--lead', 'L'], /oracle is a component, and a component holds no node/],
      [['vault', 'fresh', '--parent', 'nowhere', '--title', 'F', '--lead', 'L'], /no group nowhere in the map/],
      [['vault', 'oracle', '--title', 'Another'], /component oracle exists with the title "Oracle"/],
      [['vault', 'oracle', '--parent', 'money'], /component oracle exists under prices, not under money/],
      [['vault', 'oracle', '--remove'], /parts\/vault is not at oracle/],
      [['vault', 'Bad_Component'], /is not a component id/],
      [['vault'], /place takes a dossier and a component/],
      [['--group', 'money', '--title', 'Other', '--lead', 'L'], /group money exists with the title "Money"/],
      [['vault', 'oracle', '--lead', 'two\nlines'], /--lead must be one nonempty line/],
      [['vault', 'oracle', '--colour', 'red'], /unknown option --colour/],
    ];
    for (const [args, reason] of refused) {
      const r = dossier(root, ['place', ...args]);
      assert.equal(r.status, 2, `${args.join(' ')}: ${r.out}`);
      assert.match(r.stderr, reason, args.join(' '));
      assert.equal(readme(root), original, `${args.join(' ')} wrote nothing`);
    }
    // A retired dossier is not placed, and a malformed map is not rewritten (exit 1).
    assert.equal(dossier(root, ['decide', 'compositions/upkeep', 'retire', '--', 'set aside for the test']).status, 0);
    const retired = dossier(root, ['place', 'compositions/upkeep', 'oracle']);
    assert.equal(retired.status, 2);
    assert.match(retired.stderr, /compositions\/upkeep is retired/);
    writeFileSync(join(root, 'README.md'), '```json\n{"format": "dossier-map@0.3.0", "groups": "none"}\n```\n\n' + BODY);
    const broken = readme(root);
    const malformed = dossier(root, ['place', 'vault', 'oracle']);
    assert.equal(malformed.status, 1, malformed.out);
    assert.match(malformed.stderr, /the map does not read, so it is not rewritten: map\.groups must be an array/);
    assert.equal(readme(root), broken);
    unlinkSync(join(root, 'README.md'));
    const missing = dossier(root, ['place', 'vault', 'oracle']);
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /no README\.md at the root, which holds the map; dossier setup writes one with an empty map/);
  });

  it('rewrites a hand-written block in canonical form and keeps a CRLF README\'s line endings in the block', t => {
    const root = harbor();
    t.after(() => rmSync(dirname(root), { recursive: true, force: true }));
    const body = '# Synthetic root\r\n\r\nWritten on another machine.\r\n';
    writeFileSync(join(root, 'README.md'), '```json\r\n{"groups":[{"lead":"L","title":"G","id":"g","components":[{"dossiers":[],"lead":"L","title":"C","id":"c"}]}],"format":"dossier-map@0.3.0"}\r\n```\r\n' + body);
    const r = dossier(root, ['place', 'vault', 'c']);
    assert.equal(r.status, 0, r.out);
    const text = readme(root);
    assert.ok(text.endsWith('```\r\n' + body), 'the rest stays byte for byte');
    const block = text.slice(0, text.length - body.length);
    assert.ok(!/[^\r]\n/.test(block), 'the block keeps CRLF');
    assert.equal(block.replace(/\r\n/g, '\n'), '```json\n' + canonicalMap(parseMap({ format: 'dossier-map@0.3.0', groups: [{ id: 'g', title: 'G', lead: 'L', components: [{ id: 'c', title: 'C', lead: 'L', dossiers: ['parts/vault'] }] }] })) + '\n```\n');
    assert.equal(withMapBlock(text, readRootMap(root).map!), text, 'rewriting the same map changes nothing');
  });

  // Found 2026-11-24 by an independent review before 0.3.0: a command that changed nothing still reformatted a
  // hand-written block, a README with a stray CR came out failing, a CRLF README got an LF block, and a block
  // after a byte order mark was read as no map and placed in front of.
  it('writes nothing for an equal map, refuses a change that would not read, and keeps a CRLF README\'s line endings in a new block', t => {
    const root = harbor();
    t.after(() => rmSync(dirname(root), { recursive: true, force: true }));
    const run = (...args: string[]) => dossier(root, ['place', ...args]);
    const handWritten = '```json\n{"format":"dossier-map@0.3.0","groups":[{"id":"g","title":"G","lead":"L","components":[{"id":"c","title":"C","lead":"L","dossiers":["parts/vault"]}]}]}\n```\n\n' + BODY;
    writeFileSync(join(root, 'README.md'), handWritten);
    let r = run('vault', 'c');
    assert.equal(r.status, 0, r.out);
    assert.equal(r.stdout, 'kept parts/vault in c\n');
    assert.equal(readme(root), handWritten, 'an entry already so writes nothing, and the block keeps its spelling');
    r = run('--group', 'g');
    assert.equal(r.status, 0, r.out);
    assert.equal(r.stdout, 'kept group g\n');
    assert.equal(readme(root), handWritten, 'nor does a group that is already there');

    const stray = '# Dossiers\n\nPasted\rtext\n';
    writeFileSync(join(root, 'README.md'), stray);
    r = run('--group', 'x', '--title', 'X', '--lead', 'L.');
    assert.equal(r.status, 1, r.out);
    assert.match(r.stderr, /README\.md would not read as the map after this change \(.*LF or CRLF.*\); fix README\.md first/);
    assert.equal(readme(root), stray, 'a passing root is not turned into a failing one');

    const windows = '# Dossiers\r\n\r\nWritten on Windows.\r\n';
    writeFileSync(join(root, 'README.md'), windows);
    r = run('--group', 'x', '--title', 'X', '--lead', 'L.');
    assert.equal(r.status, 0, r.out);
    const text = readme(root);
    assert.ok(text.endsWith('```\r\n\r\n' + windows), 'the new block and its blank line take the README\'s CRLF');
    assert.ok(!/[^\r]\n/.test(text), 'no LF stands alone');
    assert.equal(json(root).status, 0);

    const marked = '﻿```json\n{"format": "dossier-map@0.3.0", "groups": []}\n```\n\n' + BODY;
    writeFileSync(join(root, 'README.md'), marked);
    r = run('--group', 'x', '--title', 'X', '--lead', 'L.');
    assert.equal(r.status, 1, r.out);
    assert.match(r.stderr, /the map does not read, so it is not rewritten: it begins with a byte order mark/);
    assert.equal(readme(root), marked, 'no second block goes in front of the first');
  });

  it('places a composition where it is held, not where its members meet, and its members\' components still list it', t => {
    const root = harbor();
    t.after(() => rmSync(dirname(root), { recursive: true, force: true }));
    writeMap(root, DEEP);
    assert.equal(dossier(root, ['place', 'compositions/upkeep', 'breaker']).status, 0);
    const { result } = json(root);
    const nodes = nodesOf(result.map.tree!);
    assert.deepEqual(nodes.get('oracle')!.sited, [], 'a held composition sits nowhere');
    assert.deepEqual((nodes.get('oracle') as { flows: string[] }).flows, ['compositions/upkeep'], 'the component that holds its member still lists it');
    assert.deepEqual((nodes.get('breaker') as { flows: string[] }).flows, ['compositions/control'], 'the component that holds it does not list it as a flow');
    assert.equal(nodes.get('breaker')!.counts.dossiers, 2);
    assert.equal(result.map.tree!.counts.claims, claimsByKey(result).size);
  });

  it('lets a selection place a dossier without pulling a composition up or making a flow', t => {
    const root = harbor();
    t.after(() => rmSync(dirname(root), { recursive: true, force: true }));
    writeMap(root, DEEP);
    // The Oracle, held whole under Prices, is also cross-referenced from Vault core, in another top group.
    const r = dossier(root, ['place', 'oracle', 'vault-core', '--select', 'refresh-price']);
    assert.equal(r.status, 0, r.out);
    const { result } = json(root);
    const nodes = nodesOf(result.map.tree!);
    assert.deepEqual(nodes.get('oracle')!.sited, ['compositions/upkeep'], 'Upkeep still sits at the Oracle, the one component that holds its member whole');
    assert.deepEqual(result.map.tree!.sited, []);
    assert.deepEqual((nodes.get('vault-core') as { flows: string[] }).flows, ['compositions/control', 'compositions/supply'], 'and Vault core does not list it');
    assert.deepEqual(result.map.notes, []);
  });
});

describe('the pages show maps that read', () => {
  it('spec/map.md names every note the code emits, and no other', () => {
    const spec = readFileSync(join(plugin, 'spec', 'map.md'), 'utf8');
    const section = spec.split(/^## /m).find(s => s.startsWith('Notes and the tripwire'))!;
    const named = section.split('\n').filter(l => l.startsWith('| `')).map(l => /^\| `([^`]+)`/.exec(l)![1]);
    assert.deepEqual(named, [...MAP_NOTES]);
  });

  it('every map block in the docs parses as a map', () => {
    const pages = (dir: string): string[] => readdirSync(dir).flatMap(name => { const path = join(dir, name); return statSync(path).isDirectory() ? pages(path) : name.endsWith('.md') ? [path] : []; });
    let shown = 0;
    for (const page of [join(plugin, 'README.md'), ...pages(join(plugin, 'docs'))]) {
      for (const [, block] of readFileSync(page, 'utf8').matchAll(/^```json\n([\s\S]*?)^```$/gm)) {
        if (!block.includes('"dossier-map@')) continue;
        shown += 1;
        assert.doesNotThrow(() => parseMap(parseUniqueJson(block)), page);
        assert.equal(block.trim(), canonicalMap(parseMap(parseUniqueJson(block))), `${page} shows the map in its canonical form`);
      }
    }
    assert.ok(shown > 0, 'the file reference shows a map');
  });

  it('Harbor\'s map places every dossier, with no note', () => {
    const harborRoot = join(plugin, 'qualification', 'fixture', 'dossiers');
    assert.ok(existsSync(join(harborRoot, 'README.md')));
    const read = readRootMap(harborRoot);
    assert.equal(read.error, null);
    assert.equal(readme(harborRoot).slice(0, readme(harborRoot).indexOf('\n```\n') + 5), '```json\n' + canonicalMap(read.map as DossierMap) + '\n```\n', 'Harbor\'s block is canonical, so place rewrites only what it changes');
    const { status, result } = json(harborRoot);
    assert.equal(status, 0);
    const view: MapView = result.map;
    assert.deepEqual(view.notes, []);
    assert.equal(view.title, 'Harbor dossiers');
    const nodes = nodesOf(view.tree!);
    assert.deepEqual(nodes.get('credit')!.sited, ['compositions/supply']);
    assert.deepEqual(view.tree!.sited, ['compositions/control']);
    assert.deepEqual(nodes.get('oracle')!.sited, ['compositions/upkeep']);
    assert.equal(view.tree!.counts.claims, claimsByKey(result).size);
    assert.deepEqual(view.tree!.counts.needs, { claims: 4, reviews: 0, doubts: 1, decisions: 0, notes: 0, reviewsOwed: 9, tripwires: 0 }, 'the four accepted contradictions, the Oracle\'s doubt and a review owed by every dossier');
  });
});
