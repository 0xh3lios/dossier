// The plugin, as ChatGPT and Codex install it and as Claude Code installs it: two manifests, two
// marketplaces, five Agent Skills and the dossier command, and nothing a host runs on its own.
// One version and one description, held here so that no copy drifts.
//   node --test qualification/tests/packaging.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const json = (path: string) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const pkg = json('package.json'), portable = json('plugin.json'), claude = json('.claude-plugin/plugin.json');
const claudeMarket = json('.claude-plugin/marketplace.json'), openaiMarket = json('.agents/plugins/marketplace.json');
const openai = portable.extensions['com.openai'];

test('package.json and both plugin manifests carry one version and one name', () => {
  assert.equal(portable.version, pkg.version, 'plugin.json');
  assert.equal(claude.version, pkg.version, '.claude-plugin/plugin.json');
  assert.equal(portable.name, 'dossier');
  assert.equal(claude.name, 'dossier');
});

test('every place that describes the plugin says the same thing', () => {
  for (const [where, said] of [['plugin.json', portable.description], ['its ChatGPT long description', openai.interface.longDescription], ['the Claude Code marketplace entry', claudeMarket.plugins[0].description]]) {
    assert.equal(said, claude.description, where);
  }
});

test('the portable manifest declares the Agent Plugins schema and opens ChatGPT on the setup skill', () => {
  assert.equal(portable.$schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
  assert.equal(openai.onboardingSkill, './skills/setup/SKILL.md');
  assert.ok(existsSync(join(root, openai.onboardingSkill)));
  assert.equal(openai.interface.displayName, 'Dossier');
});

test('each marketplace lists the plugin under the name its manifests give, from this repository', () => {
  assert.equal(claudeMarket.name, 'dossier');
  assert.deepEqual(claudeMarket.plugins.map((p: { name: string; source: unknown }) => [p.name, p.source]), [['dossier', './']]);
  assert.equal(openaiMarket.name, 'dossier');
  assert.deepEqual(openaiMarket.plugins.map((p: { name: string; source: unknown }) => [p.name, p.source]), [['dossier', { source: 'url', url: `${portable.repository}.git` }]]);
  assert.equal(claude.repository, portable.repository);
});

test('the plugin is its skills and the dossier command: no hooks, agents, commands or servers a host would run', () => {
  for (const path of ['hooks', 'agents', 'commands', '.mcp.json', '.app.json']) assert.equal(existsSync(join(root, path)), false, `${path} is not part of the plugin`);
  for (const [where, manifest] of [['plugin.json', portable], ['its OpenAI extension', openai], ['.claude-plugin/plugin.json', claude]]) {
    for (const key of ['hooks', 'agents', 'commands', 'mcpServers', 'apps']) assert.equal(Object.hasOwn(manifest, key), false, `${where} declares ${key}`);
  }
});

test('with nothing a host runs on its own, no page says a check happens at every prompt', () => {
  // Verify runs when the agent runs it, so a page may not promise what only a hook could do.
  const pages = ['README.md', ...['docs', 'spec', 'skills'].flatMap(dir => readdirSync(join(root, dir), { recursive: true, encoding: 'utf8' }).filter(path => path.endsWith('.md')).map(path => join(dir, path)))];
  const promises = pages.flatMap(page => readFileSync(join(root, page), 'utf8').split('\n')
    .flatMap((line, i) => /\b(?:at|with|on|by) (?:every|each|the next) prompt\b/i.test(line) ? [`${page}:${i + 1}`] : []));
  assert.deepEqual(promises, []);
});

test('every skill is an Agent Skill both hosts read: known fields, its folder name, and the dossier command named by its path', () => {
  // The fields ChatGPT and Codex document for SKILL.md, which Claude Code reads too.
  const known = new Set(['name', 'description', 'argument-hint', 'disable-model-invocation', 'context', 'allowed-tools']);
  const skills = readdirSync(join(root, 'skills')).filter(name => !name.startsWith('.')).sort();
  assert.deepEqual(skills, ['decide', 'explore', 'keep', 'review', 'setup']);
  for (const id of skills) {
    const text = readFileSync(join(root, 'skills', id, 'SKILL.md'), 'utf8');
    const front = text.match(/^---\n([\s\S]*?)\n---\n/);
    assert.ok(front, `${id}: no frontmatter`);
    const fields = Object.fromEntries(front[1].split('\n').map(line => [line.slice(0, line.indexOf(':')), line.slice(line.indexOf(':') + 1).trim()]));
    assert.deepEqual(Object.keys(fields).filter(key => !known.has(key)), [], `${id}: a field one host does not read`);
    assert.equal(fields.name, id);
    assert.ok(fields.description.length <= 1024, `${id}: a description over 1024 characters`);
    assert.doesNotMatch(text, /\$\{CLAUDE_|\/dossier:/, `${id}: a host's own path or invocation`);
    assert.match(text, /\]\(\.\.\/\.\.\/bin\/dossier\)/, `${id}: does not say where the dossier command is`);
    for (const [, target] of text.matchAll(/\]\((\.\.?\/[^)#\s]+)/g)) assert.ok(existsSync(join(root, 'skills', id, target)), `${id}: ${target} does not exist`);
  }
});

test('decide runs only when the owner invokes it, in Claude Code and in ChatGPT and Codex', () => {
  assert.match(readFileSync(join(root, 'skills/decide/SKILL.md'), 'utf8'), /^disable-model-invocation: true$/m);
  assert.match(readFileSync(join(root, 'skills/decide/agents/openai.yaml'), 'utf8'), /^policy:\n {2}allow_implicit_invocation: false$/m);
});
