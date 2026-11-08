// dossier import <module> [--as <component>]: start a component dossier from
// the knowledge base's records. Writes a draft prose that compiles and a
// margin with everything the records say, for the agent to turn into passages.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findRoot, idProblem, readMarker, stripRootArgs } from '../dossiers/root.ts';
import { knowledgeOf } from '../dossiers/load.ts';
import { parseProse } from '../prose/prose.ts';
import { requireCurrent } from '../dossiers/integrity.ts';
import { acquirePublicationLock } from '../dossiers/publication.ts';
import { dossierPathExists, initializeDossierLocked } from '../dossiers/initialize.ts';
import type { YamlMap, YamlValue } from '../prose/yaml.ts';

const cap = (s: string) => s.split(/[-_\s]+/).map(w => (w ? w[0].toUpperCase() + w.slice(1) : '')).join('');
const eventName = (s: unknown) => String(s).replace(/\(.*$/, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase().replace(/^(\d)/, 'e$1') || 'act';
// A data name as the grammar reads one: lower case letters, digits and underscores.
const DATA_NAME = /^[a-z_][a-z0-9_]*$/;
// An event's sender: the record's name as written, or its id when it has none, after "the",
// so that it names the actor actors.md declares under that name.
const sender = (actor: YamlMap | undefined) => {
  if (!actor) return 'the public';
  const n = String(actor.name || actor.id).trim();
  return /^the /i.test(n) ? n : `the ${n}`;
};
// A folder's entries in name order, so that a draft reads the same on every machine.
const entries = (dir: string) => readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

export async function main(command: string, args: string[]): Promise<number> {
  const root = findRoot(args);
  if (!root) { console.error('dossier import: no dossiers root here. Run dossier setup.'); return 2; }
  const rest = stripRootArgs(args);
  const asAt = rest.indexOf('--as');
  const id = asAt >= 0 ? rest[asAt + 1] : null;
  const module = rest.filter((a, i) => !a.startsWith('--') && rest[i - 1] !== '--as')[0];
  if (!module || (asAt >= 0 && (!id || id.startsWith('--')))) { console.error('usage: dossier import <module> [--as <component>]'); return 2; }
  const component = id || module;
  const problem = idProblem(component);
  if (problem) { console.error(`dossier import: ${problem}${id ? '' : `; name the component with --as <id>`}`); return 2; }
  const marker = readMarker(root);
  if (marker.error) { console.error(`dossier import: ${marker.error}`); return 2; }
  requireCurrent(root);
  const knowledge = knowledgeOf(root);
  if (knowledge.kind === 'none') {
    if ('error' in knowledge) { console.error(`dossier import: the knowledge base dossier.json names does not open: ${knowledge.error}`); return 2; }
    console.error('dossier import: no knowledge base is configured in dossier.json'); return 2;
  }
  if (!knowledge.modules().includes(module)) { console.error(`dossier import: the knowledge base has no module ${module} (it has ${knowledge.modules().join(', ')})`); return 2; }
  const dir = join(root, 'components', component);
  if (existsSync(join(dir, 'prose.md'))) { console.error(`dossier import: components/${component}/prose.md exists; import writes only a fresh dossier`); return 1; }
  const records = knowledge.moduleRecords(module);
  const collect = (name: string) => { const out: YamlMap[] = []; for (const [path, r] of Object.entries(records.files)) if (Array.isArray(r[name])) for (const item of r[name] as YamlMap[]) out.push({ ...item, _path: path }); return out; };
  const actors = collect('actors'), operations = collect('operations'), invariants = collect('invariants'), quantities = collect('quantities'), edges = collect('edges'), flows = collect('flows');
  const overview = (Object.values(records.files).map(r => r.module).find(Boolean) || {}) as YamlMap;
  const role = (overview.protocol_role || `the ${module} module`) as string;

  // Backing: rules and invariants of any Certora spec in a commit cache the module records, read in
  // name order, at the cache's recorded commit. A cache under source-cache/github/<repository>/
  // holds an upstream the module builds on, so its declarations start in the margin for review,
  // not as the module's guarantees. Nested checkouts and dot folders are not walked.
  const specs: { path: string; rule: string; kind: string; commit: string; repository: string | null }[] = [];
  for (const pin of knowledge.sourcePins(module)) {
    const cache = join(knowledge.root, 'modules', module, pin.path);
    if (!existsSync(cache)) continue;
    const walk = (d: string, rel: string): void => {
      for (const e of entries(d)) {
        if (e.name.startsWith('.') || e.name === 'node_modules') continue;
        const full = join(d, e.name), r = rel ? `${rel}/${e.name}` : e.name;
        if (e.isDirectory()) { if (!existsSync(join(full, '.git'))) walk(full, r); }
        else if (e.isFile() && e.name.endsWith('.spec')) {
          for (const line of readFileSync(full, 'utf8').split('\n')) { const rule = line.match(/^\s*(rule|invariant)\s+([A-Za-z_]\w*)/); if (rule) specs.push({ path: r, rule: rule[2], kind: rule[1], commit: pin.commit, repository: pin.repository }); }
        }
      }
    };
    walk(cache, '');
  }
  const observations: string[] = [];
  const obsDir = join(knowledge.root, 'modules', module, 'observations');
  if (existsSync(obsDir)) for (const f of entries(obsDir)) if (f.isFile()) observations.push(f.name.replace(/\.(json|md)$/, ''));

  const title = cap(component);
  const lines: string[] = [];
  lines.push(`# ${title}`, '', 'Tier: modeled', `Module: ${module}`);
  if (observations.length) lines.push(`Pins: ${observations.map(o => `${module}#observation:${o}`).join(', ')}`);
  lines.push('');
  // A quantity is a datum when its id, with hyphens as underscores, is a data name; each once.
  const data = [...new Set(quantities.map(q => String(q.id).replace(/-/g, '_')).filter(q => DATA_NAME.test(q)))].slice(0, 6);
  const boundary = [`${title} is ${role.replace(/\.$/, '')}.`];
  for (const d of data) boundary.push(`It holds ${d}, a count from 0 to 3.`);
  lines.push(boundary.join(' '), '');
  lines.push('## States', `[S1] Live: ${title} operates as the records describe.`, '');
  lines.push('## Events');
  const ops = operations.length ? operations : flows;
  const events: string[] = [];
  ops.forEach((op, i) => {
    const name = eventName(op.id || op.name || `act${i + 1}`);
    if (events.includes(name)) return;
    events.push(name);
    const actor = actors.find(a => a.kind === 'public_caller') || actors[0];
    lines.push(`[E${events.length}] ${name}, from ${sender(actor)}: ${String(op.description || op.name || op.id || '').replace(/\.$/, '') || 'as the records say'}.`);
  });
  if (!events.length) { events.push('act'); lines.push(`[E1] act, from the public: the module is used.`); }
  lines.push('');
  lines.push('## Moves');
  events.forEach((e, i) => lines.push(`[M${i + 1}] When Live receives ${e}, it stays Live.`));
  lines.push('');
  lines.push('## Always', '', '## Once', '', '## Within', '', '## Given', '', '## Walks', '', '## Seams', '');
  lines.push('## Guarantees');
  // A rule the module's own cache declares once becomes a draft guarantee that says only what is
  // known: the cached specification declares it. A name declared twice stays in the margin.
  const counts = new Map<string, number>();
  for (const s of specs) counts.set(s.rule, (counts.get(s.rule) || 0) + 1);
  let k = 0;
  for (const s of specs) {
    if (s.repository || counts.get(s.rule) !== 1) continue;
    k++;
    lines.push(`[K${k}] The cached specification declares ${s.rule}. Backing: certora ${s.path}#${s.rule} at ${s.commit}.`);
  }
  for (const inv of invariants) { if (k >= 12) break; k++; lines.push(`[K${k}] ${String(inv.statement || inv.name || inv.id).replace(/\.$/, '')}. Backing: none.`); }
  lines.push('');
  lines.push('## Words only', '[T1] This piece promises nothing eventual.', '', '## Retired', '');
  const prose = lines.join('\n');
  const check = parseProse(prose);
  const margin: string[] = [];
  margin.push(`# Margin: imported from ${module}`, '', 'What the records say, for turning into passages. Nothing here is a mark.', '');
  margin.push('## Actors', ...actors.map(a => `- ${a.id} (${a.kind}): ${a.role || a.name || ''}`), '');
  margin.push('## Operations', ...operations.map(o => `- ${o.id}: ${o.description || ''}${o.preconditions ? ` Preconditions: ${([] as YamlValue[]).concat(o.preconditions).join('; ')}` : ''}`), '');
  margin.push('## Invariants recorded', ...invariants.map(i => `- ${i.id} (${i.kind || ''}): ${i.statement || ''}`), '');
  margin.push('## Quantities', ...quantities.map(q => `- ${q.id}: ${q.description || ''}`), '');
  margin.push('## Edges', ...edges.map(e => `- ${e.id}: ${e.type} ${e.from} → ${e.to}`), '');
  if (specs.length) margin.push('## Certora', ...specs.map(s => `- ${s.kind} ${s.rule} in ${s.path} at ${s.commit}${s.repository ? ` (repository: ${s.repository}; review applicability)` : ''}`), '');
  const releaseRoot = acquirePublicationLock(root);
  try {
    if (dossierPathExists(dir)) { console.error(`dossier import: components/${component} exists; import cannot replace its authority`); return 1; }
    initializeDossierLocked(root, 'components', component, { 'prose.md': prose, 'margin.md': margin.join('\n') });
  } finally { releaseRoot(); }
  console.log(`wrote components/${component}/prose.md (${events.length} events, ${k} guarantees, ${data.length} data placeholders) and margin.md`);
  const senders = [...new Set(check.events.map(e => e.sender).filter(Boolean))];
  if (senders.length) console.log(`declare these senders in actors/actors.md unless they already are, or start a component for each contract among them: ${senders.join(', ')}`);
  if (check.errors.length || check.misnamed.length) console.log(`the draft does not compile yet: ${[...check.errors, ...check.misnamed].join('; ')}`);
  else console.log('the draft compiles; replace the placeholders with what the piece actually does, then dossier draw');
  return 0;
}
