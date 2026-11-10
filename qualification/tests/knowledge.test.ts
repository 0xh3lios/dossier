// The knowledge adapter on the Harbor fixture and on a knowledge base with
// another layout. Run from the repo root: node --test qualification/tests/knowledge.test.ts

import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  COLLECTIONS, REF_TYPES, knowledgeFor, nullKnowledge, openKnowledge, parseRef, parseTarget, stableJson,
} from '../../src/knowledge.ts';
import type { Backed, BackingSpec, Edge, Knowledge, Resolved } from '../../src/knowledge.ts';
import type { YamlMap } from '../../src/prose/yaml.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE = join(HERE, '..', 'fixture', 'knowledge');
const HEX64 = /^[0-9a-f]{64}$/;
const HEX16 = /^[0-9a-f]{16}$/;

const scratch = mkdtempSync(join(tmpdir(), 'dossier-knowledge-'));
after(() => rmSync(scratch, { recursive: true, force: true }));

const ids = (edges: Edge[]) => edges.map((edge) => edge.id).sort();

function assertResolved(found: Resolved | null, expected: Pick<Resolved, 'ref' | 'module' | 'type' | 'id' | 'path'>): asserts found is Resolved {
  assert.ok(found, `${expected.ref} resolves`);
  assert.equal(found.ref, expected.ref);
  assert.equal(found.module, expected.module);
  assert.equal(found.type, expected.type);
  assert.equal(found.id, expected.id);
  assert.equal(found.path, expected.path);
  assert.equal(typeof found.text, 'string');
  assert.match(found.hash, HEX16);
  assert.match(found.sha256, HEX64);
  assert.equal(found.hash, found.sha256.slice(0, 16));
}

describe('parseRef and parseTarget', () => {
  it('reads the typed forms', () => {
    assert.deepEqual(parseRef('vault#quantity:debt'), { module: 'vault', type: 'quantity', id: 'debt' });
    assert.deepEqual(parseRef('gov-timelock#observation:finalized-state-2026-09-07'), {
      module: 'gov-timelock', type: 'observation', id: 'finalized-state-2026-09-07',
    });
    assert.deepEqual(parseRef('  token#asset:hrd  '), { module: 'token', type: 'asset', id: 'hrd' });
    assert.deepEqual(parseTarget('contract:vault'), { module: null, type: 'contract', id: 'vault' });
    assert.deepEqual(parseTarget('token#asset:hrd'), { module: 'token', type: 'asset', id: 'hrd' });
  });

  it('rejects malformed strings', () => {
    for (const bad of ['', 'vault', 'vault#debt', '#quantity:debt', 'vault#quantity:', 'vault#:debt', 'vault quantity:debt',
      'vault#Quantity:debt', 'vault#quantity:debt:more', 'vault#quantity:a b', 'vault##quantity:debt', null, undefined, 42]) {
      assert.equal(parseRef(bad), null, `rejects ${JSON.stringify(bad)}`);
    }
    assert.equal(parseTarget('vault'), null);
    assert.equal(parseTarget('asset:'), null);
  });

  it('knows every type the adapter resolves', () => {
    assert.ok(REF_TYPES.includes('contract') && REF_TYPES.includes('observation'));
    assert.deepEqual(COLLECTIONS.property, ['invariants']);
    assert.ok(COLLECTIONS.read.includes('state_reads') && COLLECTIONS.read.includes('rates_and_prices'));
  });
});

describe('the Harbor fixture', () => {
  const k = openKnowledge(FIXTURE);

  it('opens as a records adapter', () => {
    assert.equal(k.kind, 'records');
    assert.equal(k.root, FIXTURE);
  });

  it('lists the six Harbor modules', () => {
    assert.deepEqual(k.modules(), ['adapter', 'breaker', 'oracle', 'timelock', 'token', 'vault']);
  });

  it('caches module records and reads every file without errors', () => {
    const first = k.moduleRecords('vault');
    assert.equal(k.moduleRecords('vault'), first);
    assert.deepEqual(first.errors, []);
    assert.ok(Object.keys(first.files).includes('state/quantities.md'));
    assert.ok(Array.isArray(first.files['state/quantities.md'].quantities));
    assert.ok(!Object.keys(first.files).some((path) => path.startsWith('source-cache/') || path.startsWith('observations/')));
    assert.deepEqual(k.moduleRecords('nowhere'), { files: {}, errors: [] });
  });

  it('resolves a quantity as stable JSON', () => {
    const found = k.resolve('vault#quantity:debt');
    assertResolved(found, { ref: 'vault#quantity:debt', module: 'vault', type: 'quantity', id: 'debt', path: 'modules/vault/state/quantities.md' });
    const parsed = JSON.parse(found.text);
    assert.equal(parsed.id, 'debt');
    assert.equal(parsed.measurement.unit, 'HRD');
    assert.deepEqual(Object.keys(parsed), [...Object.keys(parsed)].sort());
    assert.equal(found.text, stableJson(found.record));
    assert.equal(found.collection, 'quantities');
  });

  it('resolves a property, an actor, an edge and an asset', () => {
    const property = k.resolve('vault#property:debt-equals-credit');
    assertResolved(property, { ref: 'vault#property:debt-equals-credit', module: 'vault', type: 'property', id: 'debt-equals-credit', path: 'modules/vault/behavior/invariants.md' });
    assert.equal(property.record!.statement, 'debt equals free plus issued');
    assert.equal(property.record!.kind, 'accounting');

    const actor = k.resolve('vault#actor:adapter');
    assertResolved(actor, { ref: 'vault#actor:adapter', module: 'vault', type: 'actor', id: 'adapter', path: 'modules/vault/relationships/actors.md' });
    assert.equal(actor.record!.kind, 'contract');
    assert.equal(actor.record!.role, 'the only caller of move and release');

    const edge = k.resolve('adapter#edge:adapter-mints-hrd');
    assertResolved(edge, { ref: 'adapter#edge:adapter-mints-hrd', module: 'adapter', type: 'edge', id: 'adapter-mints-hrd', path: 'modules/adapter/relationships/edges.md' });
    assert.equal(edge.record!.type, 'mints_asset');
    assert.equal(edge.record!.to, 'token#asset:hrd');

    const asset = k.resolve('token#asset:hrd');
    assertResolved(asset, { ref: 'token#asset:hrd', module: 'token', type: 'asset', id: 'hrd', path: 'modules/token/relationships/assets.md' });
    assert.equal(asset.record!.symbol, 'HRD');
    assert.equal(asset.record!.decimals, 18);
  });

  it('resolves the other collection types', () => {
    assert.equal(k.resolve('vault#read:vault-debt')!.record!.quantity_ref, 'vault#quantity:debt');
    assert.equal(k.resolve('oracle#dependency:keepers')!.record!.kind, 'keeper');
    assert.equal(k.resolve('timelock#operation:execute')!.record!.privileged, false);
    assert.equal(k.resolve('vault#reference:vault-pinned-source')!.record!.type, 'source_code');
    assert.equal(k.resolve('vault#role:adapter')!.record!.role, 'the only caller of move and release');
  });

  it('resolves a contract as its Markdown section', () => {
    const contract = k.resolve('vault#contract:vault');
    assertResolved(contract, { ref: 'vault#contract:vault', module: 'vault', type: 'contract', id: 'vault', path: 'modules/vault/contracts/contracts.md' });
    assert.equal(contract.heading, 'Contract: vault');
    assert.ok(contract.text.startsWith('## Contract: vault\n'));
    assert.ok(contract.text.includes('entity-harbor-vault'));
    assert.ok(!contract.text.includes('# Contracts\n'));
  });

  it('resolves observations as files', () => {
    const json = k.resolve('vault#observation:checkpoint-2026-11-01');
    assertResolved(json, { ref: 'vault#observation:checkpoint-2026-11-01', module: 'vault', type: 'observation', id: 'checkpoint-2026-11-01', path: 'modules/vault/observations/checkpoint-2026-11-01.json' });
    const parsed = JSON.parse(json.text) as { block: number; reads: { quantity: string }[] };
    assert.equal(parsed.block, 26300000);
    assert.deepEqual(parsed.reads.map((read) => read.quantity), ['debt', 'free', 'issued', 'ceiling']);

    const direct = k.observation('vault', 'checkpoint-2026-11-01')!;
    assert.equal(direct.path, json.path);
    assert.equal(direct.hash, json.hash);
    assert.equal(direct.text, json.text);

    const markdown = k.observation('timelock', 'delay-check-2026-11-01')!;
    assert.equal(markdown.path, 'modules/timelock/observations/delay-check-2026-11-01.md');
    assert.ok(markdown.text.startsWith('# Delay check 2026-11-01'));

    assert.equal(k.observation('vault', 'nothing'), null);
    assert.equal(k.observation('vault', '../overview'), null);
    assert.equal(k.observation('nowhere', 'checkpoint-2026-11-01'), null);
  });

  it('returns null for unknown records, modules and types', () => {
    assert.equal(k.resolve('vault#quantity:nothing'), null);
    assert.equal(k.resolve('nowhere#quantity:debt'), null);
    assert.equal(k.resolve('vault#thing:debt'), null);
    assert.equal(k.resolve('vault#contract:adapter'), null);
    assert.equal(k.resolve('vault#observation:nothing'), null);
    assert.equal(k.resolve('vault#debt'), null);
    assert.equal(k.resolve(''), null);
    assert.equal(k.resolve(undefined), null);
  });

  it('hashes are stable across calls and follow the text', () => {
    const once = k.resolve('vault#quantity:debt')!;
    const twice = k.resolve('vault#quantity:debt')!;
    assert.equal(once.hash, twice.hash);
    assert.equal(once.sha256, twice.sha256);
    assert.equal(openKnowledge(FIXTURE).resolve('vault#quantity:debt')!.sha256, once.sha256);

    const copy = join(scratch, 'copy');
    cpSync(FIXTURE, copy, { recursive: true });
    const file = join(copy, 'modules/vault/state/quantities.md');
    const original = readFileSync(file, 'utf8');
    const edited = original.replace('Total debt borrowed against the vault', 'Total debt owed to the vault');
    assert.notEqual(edited, original);
    writeFileSync(file, edited);

    const changed = openKnowledge(copy);
    const after = changed.resolve('vault#quantity:debt')!;
    assert.notEqual(after.hash, once.hash);
    assert.notEqual(after.sha256, once.sha256);
    assert.ok(after.text.includes('owed to the vault'));
    assert.equal(changed.resolve('vault#quantity:free')!.sha256, k.resolve('vault#quantity:free')!.sha256);
    assert.equal(changed.resolve('vault#contract:vault')!.sha256, k.resolve('vault#contract:vault')!.sha256);
  });

  it('lists edges and filters them by type and asset', () => {
    const minted = k.edges({ types: ['mints_asset'], asset: 'hrd' });
    assert.equal(minted.length, 1);
    assert.equal(minted[0].id, 'adapter-mints-hrd');
    assert.equal(minted[0].module, 'adapter');
    assert.equal(minted[0].type, 'mints_asset');
    assert.equal(minted[0].from, 'contract:adapter');
    assert.equal(minted[0].to, 'token#asset:hrd');
    assert.equal(minted[0].path, 'modules/adapter/relationships/edges.md');
    assert.ok(Array.isArray(minted[0].conditions) && minted[0].conditions.length === 1);
    assert.equal(minted[0].record.id, 'adapter-mints-hrd');

    assert.deepEqual(ids(k.edges({ types: ['mints_asset'] })), ['adapter-mints-hrd']);
    assert.deepEqual(ids(k.edges({ types: ['mints_asset', 'burns_asset'] })), ['adapter-burns-hrd', 'adapter-mints-hrd']);
    assert.deepEqual(ids(k.edges({ asset: 'hrd' })), ['adapter-burns-hrd', 'adapter-mints-hrd', 'vault-accounts-hrd']);
    assert.deepEqual(ids(k.edges({ types: ['controls'] })), ['breaker-halts-adapter', 'timelock-changes-vault']);
    assert.deepEqual(ids(k.edges({ types: ['privileged_call'] })), ['adapter-authorized', 'adapter-moves-credit', 'governance-schedules', 'governance-stops']);
    assert.deepEqual(ids(k.edges({ module: 'timelock' })), ['executor-executes', 'governance-schedules', 'timelock-changes-vault']);
    assert.deepEqual(k.edges({ types: ['mints_asset'], asset: 'nothing' }), []);
    assert.deepEqual(k.edges({ module: 'nowhere' }), []);
    assert.deepEqual(k.edges({ types: [] }).length, k.edges().length);
    assert.equal(k.edges().length, 18);
    assert.deepEqual(k.edges().slice(0, 4).map((edge) => edge.module), ['adapter', 'adapter', 'adapter', 'adapter']);
  });

  it('resolves Certora backing at an abbreviated or full commit', () => {
    const short = k.backing({ module: 'vault', kind: 'certora', path: 'certora/Vault.spec', rule: 'debtEqualsCredit', commit: '1a2b9f8e' });
    assert.equal(short.status, 'backed');
    assert.equal(short.path, 'modules/vault/source-cache/github/commit-1a2b-9f8e/certora/Vault.spec');
    assert.equal(short.keyword, 'invariant');
    assert.ok(short.text.startsWith('invariant debtEqualsCredit()'));
    assert.ok(short.text.includes('preserved move(address user, uint256 amount)'));
    assert.ok(!short.text.includes('creditSumsToFree'));
    assert.ok(!short.text.includes('rule borrowIncreasesDebt'));
    assert.match(short.hash, HEX16);
    assert.match(short.sha256, HEX64);

    const full = k.backing({ module: 'vault', kind: 'certora', path: 'certora/Vault.spec', rule: 'debtEqualsCredit', commit: '1a2b0000000000000000000000000000000f9f8e' });
    assert.equal(full.status, 'backed');
    assert.equal(full.sha256, short.sha256);
    assert.equal(full.text, short.text);

    const borrow = k.backing({ module: 'vault', kind: 'certora', path: 'certora/Vault.spec', rule: 'borrowIncreasesDebt', commit: '1A2B9F8E' });
    assert.equal(borrow.status, 'backed');
    assert.equal(borrow.keyword, 'rule');
    assert.ok(borrow.text.startsWith('rule borrowIncreasesDebt(uint256 amount) {'));
    assert.ok(borrow.text.endsWith('}'));
    assert.ok(borrow.text.includes('borrow respects the ceiling'));
    assert.ok(!borrow.text.includes('repayDecreasesDebt'));
    assert.notEqual(borrow.sha256, short.sha256);

    const repay = k.backing({ module: 'vault', kind: 'certora', path: 'certora/Vault.spec', rule: 'repayDecreasesDebt', commit: 'commit-1a2b-9f8e' });
    assert.equal(repay.status, 'backed');
    assert.ok(repay.text.startsWith('rule repayDecreasesDebt(uint256 amount) {'));
    assert.ok(!repay.text.includes('onlyAdapterMovesCredit'));

    const last = k.backing({ module: 'vault', kind: 'certora', path: 'certora/Vault.spec', rule: 'onlyAdapterMovesCredit', commit: '1a2b9f8e' });
    assert.equal(last.status, 'backed');
    assert.ok(last.text.endsWith('"move and release are adapter-only";\n}'));
  });

  it('reports unresolved backing with a reason', () => {
    const unknownRule = k.backing({ module: 'vault', kind: 'certora', path: 'certora/Vault.spec', rule: 'nothingHere', commit: '1a2b9f8e' });
    assert.equal(unknownRule.status, 'unresolved');
    assert.match(unknownRule.reason, /nothingHere/);

    const prefix = k.backing({ module: 'vault', kind: 'certora', path: 'certora/Vault.spec', rule: 'drawIncreases', commit: '1a2b9f8e' });
    assert.equal(prefix.status, 'unresolved');

    assert.equal(k.backing({ module: 'vault', kind: 'certora', path: 'certora/Vault.spec', rule: 'debtEqualsCredit', commit: 'ffff0000' }).status, 'unresolved');
    assert.equal(k.backing({ module: 'vault', kind: 'certora', path: 'certora/Vault.spec', rule: 'debtEqualsCredit', commit: '1a2b' }).status, 'unresolved');
    assert.equal(k.backing({ module: 'vault', kind: 'certora', path: 'certora/Other.spec', rule: 'debtEqualsCredit', commit: '1a2b9f8e' }).status, 'unresolved');
    assert.equal(k.backing({ module: 'vault', kind: 'certora', path: '../../../overview.md', rule: 'debtEqualsCredit', commit: '1a2b9f8e' }).status, 'unresolved');
    assert.equal(k.backing({ module: 'adapter', kind: 'certora', path: 'certora/Vault.spec', rule: 'debtEqualsCredit', commit: '1a2b9f8e' }).status, 'unresolved');
    assert.equal(k.backing({ module: 'vault', kind: 'certora', path: 'certora/Vault.spec', commit: '1a2b9f8e' }).status, 'unresolved');
    assert.equal(k.backing({ kind: 'external', runner: 'x' } as BackingSpec).status, 'unresolved');
    assert.equal(k.backing(null).status, 'unresolved');
  });

  it('finds a repository-qualified cache through codebases.md, and refuses colliding abbreviations, unknown revisions and a revision two repositories share', () => {
    const base = join(scratch, 'colliding-pins'), mod = join(base, 'modules/vault');
    mkdirSync(mod, { recursive: true });
    const shaA = 'aaaa' + '1'.repeat(32) + 'bbbb', shaB = 'aaaa' + '2'.repeat(32) + 'bbbb';
    function add(repository: string, sha: string): string {
      const path = `source-cache/github/${repository}/commit-aaaa-bbbb`;
      mkdirSync(join(mod, path), { recursive: true });
      writeFileSync(join(mod, path, 'Permission.spec'), `rule revokeRole() { /* ${repository} */ }`);
      return `  - id: ${repository}\n    ref: ${sha}\n    cache_path: ${path}/`;
    }
    const rows = [add('one', shaA), add('two', shaB)];
    const lookup = (commit: string) => {
      writeFileSync(join(mod, 'codebases.md'), '```yaml\nrepositories:\n' + rows.join('\n') + '\n```\n');
      return openKnowledge(base).backing({ module: 'vault', kind: 'certora', path: 'Permission.spec', rule: 'revokeRole', commit });
    };
    assert.equal(lookup('aaaabbbb').status, 'unresolved', 'the abbreviation names two revisions');
    assert.equal(lookup('aaaa' + '3'.repeat(32) + 'bbbb').status, 'unresolved', 'no cache holds that revision');
    const a = lookup(shaA) as Backed;
    assert.equal(a.status, 'backed');
    assert.equal(a.path, 'modules/vault/source-cache/github/one/commit-aaaa-bbbb/Permission.spec');
    assert.deepEqual((openKnowledge(base) as Extract<Knowledge, { kind: 'records' }>).sourcePins('vault').map(p => p.repository), ['one', 'two']);
    rows.push(add('three', shaA));
    assert.equal(lookup(shaA).status, 'unresolved', 'two repositories record the same revision');
  });

  it('resolves file backing under the knowledge root', () => {
    const spec = 'modules/vault/source-cache/github/commit-1a2b-9f8e/certora/Vault.spec';
    const rule = k.backing({ kind: 'file', path: spec, rule: 'repayDecreasesDebt' });
    assert.equal(rule.status, 'backed');
    assert.equal(rule.path, spec);
    assert.ok(rule.text.startsWith('rule repayDecreasesDebt'));
    assert.equal(rule.sha256, (k.backing({ module: 'vault', kind: 'certora', path: 'certora/Vault.spec', rule: 'repayDecreasesDebt', commit: '1a2b9f8e' }) as Backed).sha256);

    const whole = k.backing({ kind: 'file', path: spec });
    assert.equal(whole.status, 'backed');
    assert.equal(whole.text, readFileSync(join(FIXTURE, spec), 'utf8'));

    const solidity = k.backing({ kind: 'file', path: 'modules/vault/source-cache/github/commit-1a2b-9f8e/src/Vault.sol', rule: 'borrow' });
    assert.equal(solidity.status, 'backed');
    assert.ok(solidity.text.startsWith('    function borrow(uint256 amount) external {'));
    assert.ok(!solidity.text.includes('function repay'));

    const section = k.backing({ kind: 'file', path: 'modules/vault/contracts/contracts.md', rule: 'vault' });
    assert.equal(section.status, 'backed');
    assert.ok(section.text.startsWith('## Contract: vault'));

    assert.equal(k.backing({ kind: 'file', path: 'modules/vault/nothing.md' }).status, 'unresolved');
    assert.equal(k.backing({ kind: 'file', path: spec, rule: 'nothingHere' }).status, 'unresolved');
    assert.equal(k.backing({ kind: 'file', path: '/etc/hosts' }).status, 'unresolved');
    assert.equal(k.backing({ kind: 'file', path: '../package.json' }).status, 'unresolved');
  });
});

describe('a knowledge base with another layout', () => {
  const root = join(scratch, 'other');
  mkdirSync(join(root, 'modules', 'alpha', 'notes'), { recursive: true });
  writeFileSync(join(root, 'modules', 'alpha', 'notes', 'everything.md'), [
    '# Alpha', '', '```yaml', 'quantities:', '  - id: level', '    description: The level.', 'edges:',
    '  - id: alpha-holds-gold', '    type: holds_asset', '    from: contract:alpha', '    to: dependency:gold',
    '  - id: alpha-reads-feed', '    type: reads_oracle', '    from: contract:alpha', '    to: dependency:feed',
    'contracts:', '  - id: alpha', '    name: Alpha', '```', '', '```yaml', 'quantities:', '  - id: cap',
    '    description: The cap.', '```', '', '## Contract: beta', '', 'Beta is described in prose only.', '',
  ].join('\n'));
  writeFileSync(join(root, 'modules', 'alpha', 'broken.md'), '# Broken\n\n```yaml\nquantities:\n  - id: x\n      bad: indentation\n```\n');
  const k = openKnowledge(root);

  it('finds collections in any Markdown file and concatenates blocks', () => {
    assert.equal(k.resolve('alpha#quantity:level')!.path, 'modules/alpha/notes/everything.md');
    assert.equal(k.resolve('alpha#quantity:cap')!.record!.description, 'The cap.');
    assert.deepEqual(ids(k.edges({ asset: 'gold' })), ['alpha-holds-gold']);
    assert.deepEqual(ids(k.edges({ types: ['reads_oracle', 'holds_asset'], asset: 'feed' })), ['alpha-reads-feed']);
  });

  it('resolves a contract from a contracts collection or a heading', () => {
    const item = k.resolve('alpha#contract:alpha')!;
    assert.equal(item.collection, 'contracts');
    assert.equal(JSON.parse(item.text).name, 'Alpha');
    const heading = k.resolve('alpha#contract:beta');
    assert.equal(heading, null, 'headings outside contracts/*.md are not contract sections');
  });

  it('keeps going past a file that fails to parse and reports it', () => {
    const { errors } = k.moduleRecords('alpha');
    assert.equal(errors.length, 1);
    assert.equal(errors[0].path, 'modules/alpha/broken.md');
    assert.match(errors[0].message, /yaml line/);
  });

  it('refuses a root without modules', () => {
    assert.throws(() => openKnowledge(join(scratch, 'empty')), /modules/);
    assert.throws(() => openKnowledge(''), /root/);
  });
});

describe('nullKnowledge', () => {
  const none = nullKnowledge();

  it('answers nothing', () => {
    assert.equal(none.kind, 'none');
    assert.equal(none.root, null);
    assert.deepEqual(none.modules(), []);
    assert.deepEqual(none.moduleRecords('vault'), { files: {}, errors: [] });
    assert.equal(none.resolve('vault#quantity:debt'), null);
    assert.deepEqual(none.edges({ types: ['mints_asset'] }), []);
    assert.equal(none.observation('vault', 'checkpoint-2026-11-01'), null);
    const backing = none.backing({ module: 'vault', kind: 'certora', path: 'certora/Vault.spec', rule: 'debtEqualsCredit', commit: '1a2b9f8e' });
    assert.equal(backing.status, 'unresolved');
    assert.ok(backing.reason);
  });
});

describe('knowledgeFor', () => {
  it('opens the root that dossier.json names, relative to the dossiers root', () => {
    const dossiers = join(scratch, 'project', 'dossiers');
    mkdirSync(dossiers, { recursive: true });
    writeFileSync(join(dossiers, 'dossier.json'), JSON.stringify({ version: '0.2.0', knowledge: { root: relative(dossiers, FIXTURE) } }, null, 2));
    const k = knowledgeFor(dossiers);
    assert.equal(k.kind, 'records');
    assert.equal(k.root, FIXTURE);
    assert.deepEqual(k.modules(), ['adapter', 'breaker', 'oracle', 'timelock', 'token', 'vault']);
    assert.ok(k.resolve('vault#quantity:debt'));
  });

  it('falls back to nullKnowledge without a knowledge setting or a dossier.json', () => {
    const bare = join(scratch, 'bare', 'dossiers');
    mkdirSync(bare, { recursive: true });
    assert.equal(knowledgeFor(bare).kind, 'none');
    writeFileSync(join(bare, 'dossier.json'), JSON.stringify({ version: '0.2.0' }));
    assert.equal(knowledgeFor(bare).kind, 'none');
    writeFileSync(join(bare, 'dossier.json'), JSON.stringify({ version: '0.2.0', knowledge: 'none' }));
    assert.equal(knowledgeFor(bare).kind, 'none');
    assert.equal(knowledgeFor(join(scratch, 'missing')).kind, 'none');
  });

  it('throws when the named root has no modules', () => {
    const wrong = join(scratch, 'wrong', 'dossiers');
    mkdirSync(wrong, { recursive: true });
    writeFileSync(join(wrong, 'dossier.json'), JSON.stringify({ knowledge: { root: '../knowledge' } }));
    assert.throws(() => knowledgeFor(wrong), /modules/);
  });
});
