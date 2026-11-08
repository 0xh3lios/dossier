// dossier decide <dossier> begin|accept|reject|answer|risk|forget|retire ... -- "<words>"
// Appends the owner's decision, in the owner's words, with the chain hash. A dossier
// begins once; retire takes it out of verify, where and the compositions until a begin reopens it.
// forget lets go of a recorded answer: one whose entry is gone, a violation a new answer on an
// unchanged basis would replace, or a superseded answer that holds a counterexample.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { dossierDirProblem, dossierName, findRoot, idProblem, locate, stripRootArgs } from '../dossiers/root.ts';
import { parseProse, parseCompositionProse } from '../prose/prose.ts';
import { parseDoubts } from '../dossiers/doubts.ts';
import { FORGET, forgets, parseDecisions, retiredBy, VERBS } from '../dossiers/decisions.ts';
import { INTEGRITY, readIntegrity, requireCurrent } from '../dossiers/integrity.ts';
import { acquirePublicationLock, currentManifest, publishDecisionLocked, writeIntegrity } from '../dossiers/publication.ts';
import { dossierPathExists, initializeDossierLocked } from '../dossiers/initialize.ts';
import { EVIDENCE, holdsCounterexample } from '../trials/answers.ts';
import { sha256 } from '../hash.ts';
import { verifyAll } from './verify.ts';
import { verifyLine } from '../verify/render.ts';
import type { CommandContext } from '../cli.ts';
import type { CompositionAnalysis } from '../verify/analyze.ts';

const PART = (title: string, tier: string, id: string) => `# ${title}\n\nTier: ${tier}\nModule: ${id}\n\nWhat the piece is, the data it holds with each datum's range, the events it receives and from whom, the effects it sends and to whom, and what it never knows.\n\n## States\n\n## Events\n\n## Moves\n\n## Always\n\n## Once\n\n## Within\n\n## Given\n\n## Walks\n\n## Seams\n\n## Guarantees\n\n## Words only\n\n## Retired\n`;
const COMPOSITION = (title: string, id: string) => `# ${title}\n\nConcern: ${id}\n\nWhat this composition is for, in a paragraph.\n\n## Always\n\n## Once\n\n## Within\n\n## Given\n\n## Walks\n\n## Words only\n\n## Retired\n`;
const WIRING = '# Wiring\n\n```yaml\nmembers: []\nwiring: []\nfree: []\nclosure: []\nscenarios: [all-honest]\n```\n';
const USAGE = 'usage: dossier decide <dossier> <verb> ... -- "<words>", where <verb> is begin [charted|modeled|composition] | accept <ids> | reject <id> | answer D<n> a|b | risk <property> <scenario> | forget <entry>@<digest> | retire';
// The tripwires of actors.md and scenarios.md, which one dossier reports for the whole root.
const ACTORS_FILES = new Set(['malformed actors', 'scenario names unknown actor', 'stronger_than unsound']);
// The tripwire forget answers: an entry integrity.json binds whose file is gone.
const REMOVED = 'answer removed';

const decisionsIn = (dir: string) => parseDecisions(readIntegrity(dir).decisions).decisions;
// What a dossier folder holds that integrity.json would have to bind: decisions, or published
// answers. A folder with neither holds only authored inputs, views and local bundles.
const recordsIn = (dir: string) => [
  ...(dossierPathExists(join(dir, 'decisions.log')) ? ['decisions.log'] : []),
  ...[EVIDENCE].filter(name => dossierPathExists(join(dir, name)) && readdirSync(join(dir, name)).some(entry => entry !== '.DS_Store')).map(name => `${name}/`),
];

export async function main(command: string, args: string[], { version }: CommandContext): Promise<number> {
  const root = findRoot(args);
  if (!root) { console.error('dossier decide: no dossiers root here. Run dossier setup.'); return 2; }
  const rest = stripRootArgs(args);
  const dash = rest.indexOf('--');
  const words = dash >= 0 ? rest.slice(dash + 1).join(' ') : '';
  const [name, verb, ...more] = dash >= 0 ? rest.slice(0, dash) : rest;
  if (!name || !VERBS.includes(verb)) { console.error(USAGE); return 2; }
  requireCurrent(root);
  const refuse = (message: string) => { console.error(`dossier decide: ${message}`); return 2; };
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  if (verb === 'begin') {
    const { kind, id } = dossierName(name);
    const problem = idProblem(id);
    if (problem) return refuse(problem);
    if (more.length > 1 || more.some(a => !['charted', 'modeled', 'composition'].includes(a))) return refuse('begin takes one of charted, modeled or composition');
    if (kind === 'parts' && more.includes('composition')) return refuse(`parts/${id} names a part; begin composition begins compositions/${id}`);
    if (kind === 'compositions' && more.some(a => a !== 'composition')) return refuse(`compositions/${id} names a composition, which has no tier`);
    const asComposition = kind === 'compositions' || more.includes('composition');
    const dir = join(root, asComposition ? 'compositions' : 'parts', id);
    const title = id.split('-').filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join('');
    const releaseRoot = acquirePublicationLock(root);
    try {
    requireCurrent(root);
    const tier = more.find(a => /^(charted|modeled)$/.test(a)) || 'modeled';
    if (!dossierPathExists(dir)) {
      const inputs = asComposition ? { 'prose.md': COMPOSITION(title, id), 'wiring.md': WIRING } : { 'prose.md': PART(title, tier, id) };
      const initialized = initializeDossierLocked(root, asComposition ? 'compositions' : 'parts', id, inputs, { time: now, verb, args: [asComposition ? 'composition' : tier], words });
      console.log(initialized.decision);
      return 0;
    }
    const aliased = dossierDirProblem(root, dir);
    if (aliased) return refuse(aliased);
    const release = acquirePublicationLock(dir);
    try {
    // A folder of hand-drafted inputs has no evidence or decision to protect: the begin gives it an
    // empty integrity.json. Records without one are never adopted, since that would bless whatever
    // history is left; integrity.json is restored from version control instead.
    if (!dossierPathExists(join(dir, INTEGRITY))) {
      const records = recordsIn(dir);
      if (records.length) return refuse(`${asComposition ? 'compositions' : 'parts'}/${id} holds ${records.join(' and ')} but no ${INTEGRITY}; restore ${INTEGRITY} from version control, since a begin cannot vouch for records it did not publish`);
      writeIntegrity(dir, { schema: 1, evidence: {}, decisionHead: null });
    }
    currentManifest(dir);
    // A begin opens a dossier with no decision yet, or reopens a retired one; a second begin appends nothing.
    const decisions = decisionsIn(dir);
    const begun = decisions.some(d => !d.malformed) && !retiredBy(decisions);
    if (asComposition) {
      if (!existsSync(join(dir, 'wiring.md'))) writeFileSync(join(dir, 'wiring.md'), WIRING);
      if (!existsSync(join(dir, 'prose.md'))) writeFileSync(join(dir, 'prose.md'), COMPOSITION(title, id));
      if (!begun) console.log(publishDecisionLocked(dir, { time: now, verb, args: ['composition'], words }));
    } else {
      if (!existsSync(join(dir, 'prose.md'))) writeFileSync(join(dir, 'prose.md'), PART(title, tier, id));
      if (!begun) console.log(publishDecisionLocked(dir, { time: now, verb, args: [tier], words }));
    }
    if (begun) console.log(`${asComposition ? 'compositions' : 'parts'}/${id} has begun already; nothing appended`);
    return 0;
    } finally { release(); }
    } finally { releaseRoot(); }
  }
  const where = locate(root, name);
  if (!where) return refuse(`no part or composition named ${name} under ${root}`);
  const ref = where.kind === 'part' ? `parts/${where.id}` : `compositions/${where.id}`;
  const release = acquirePublicationLock(where.dir);
  try {
  currentManifest(where.dir);
  // The ref names the kind, so the begin it suggests reopens this dossier and not a new part.
  if (retiredBy(decisionsIn(where.dir))) return refuse(`${ref} is retired; dossier decide ${ref} begin reopens it`);

  // The arguments first, from the files alone; then the record must be clean, except that a
  // dossier with a tripwire can still be retired, and forget clears the answer removed it names.
  const proseText = readFileSync(join(where.dir, 'prose.md'), 'utf8');
  const prose = where.kind === 'part' ? parseProse(proseText) : parseCompositionProse(proseText);
  const resolve = (id: string) => { const p = prose.byId[id]; if (!p || p.retired) throw new Error(`${id} is not a passage of ${where.id}`); return `${id}@${p.hash}`; };
  let lineArgs: string[] = [];
  try {
    if (verb === 'accept') {
      if (more.length === 0) throw new Error('accept names at least one passage id');
      if (!words.trim()) throw new Error("accept carries the owner's words after --");
      lineArgs = more.map(resolve);
    } else if (verb === 'reject') {
      if (more.length !== 1) throw new Error('reject names exactly one passage id');
      if (!words.trim()) throw new Error("reject carries the owner's reason after --");
      lineArgs = [resolve(more[0])];
    } else if (verb === 'answer') {
      const [doubt, reading] = more;
      if (more.length !== 2 || !/^D\d+$/.test(doubt || '') || !/^[ab]$/.test(reading || '')) throw new Error('answer names a doubt and a reading: answer D1 a');
      const d = parseDoubts(existsSync(join(where.dir, 'doubts.md')) ? readFileSync(join(where.dir, 'doubts.md'), 'utf8') : '').find(x => x.id === doubt);
      if (!d) throw new Error(`${doubt} is not in doubts.md`);
      lineArgs = [`${doubt}@${d.hash}`, reading];
    } else if (verb === 'risk') {
      const [prop, scenario] = more;
      if (where.kind !== 'composition') throw new Error('risk is accepted on a composition cell: risk <Property> <scenario>');
      if (more.length !== 2) throw new Error('risk names a property and a scenario: risk A1 governance-captured');
      if (!words.trim()) throw new Error("risk carries the owner's words after --");
      lineArgs = [resolve(prop), scenario];
    } else if (verb === 'forget') {
      const [named] = more;
      if (more.length !== 1) throw new Error('forget names exactly one entry and its digest');
      const m = (named || '').match(FORGET);
      if (!m) throw new Error(`forget names an entry and the first eight hex of its digest, such as tlc-N1-executor-offline-9b1e04@3fa2c1d0, not ${named}`);
      if (!words.trim()) throw new Error("forget carries the owner's words after --");
      const bound = currentManifest(where.dir).evidence[m[1]];
      if (!forgets({ digest: m[2] }, bound)) throw new Error(`${EVIDENCE}/${m[1]}.json at ${m[2]} is not an answer integrity.json binds in ${ref}`);
      const path = join(where.dir, EVIDENCE, `${m[1]}.json`);
      // A surviving entry is let go only when it holds a counterexample, in its answer or in the previous
      // one: one a new answer would replace, or one the answers that decide have superseded.
      if (existsSync(path)) {
        const text = readFileSync(path);
        if (sha256(text) !== bound) throw new Error(`${EVIDENCE}/${m[1]}.json does not match integrity.json; restore it first`);
        const entry = JSON.parse(text.toString('utf8'));
        if (!holdsCounterexample((entry.answer || {}).outcomes, entry.previous)) throw new Error(`${EVIDENCE}/${m[1]}.json holds no counterexample, in its answer or its previous one; forget lets go of a removed answer or of a violation`);
      }
      lineArgs = [named];
    } else if (verb === 'retire') {
      if (more.length) throw new Error('retire takes no argument before --');
      if (!words.trim()) throw new Error("retire carries the owner's words after --");
    }
  } catch (e) { return refuse((e as Error).message); }

  if (verb !== 'retire') {
    const r = verifyAll({ root, version, write: false });
    const all = [...r.parts, ...r.compositions];
    const a = all.find(x => x.ref === ref);
    const blocking = a ? a.tripwires.filter(t => verb !== 'forget' || t.name !== REMOVED) : [];
    // The actors files belong to the root. One dossier reports them, and they hold back every owner's
    // reading: accept, reject, answer and risk.
    const actorsFiles = ['accept', 'reject', 'answer', 'risk'].includes(verb) ? all.filter(x => x !== a).flatMap(x => x.tripwires.filter(t => ACTORS_FILES.has(t.name)).map(t => ({ ...t, where: `${x.title}: ${t.where}` }))) : [];
    if (blocking.length || actorsFiles.length) { console.error(verifyLine(a ? [a] : [], version, actorsFiles)); console.error('dossier decide: refused until the tripwires are fixed'); return 1; }
    if (verb === 'risk') {
      // A risk accepts the violation a trial has shown: the cell is violated now, and the decision
      // names the trial that established its deciding answer, so the acceptance holds only while that
      // answer decides the cell and nothing moved under it. Any new answer to the cell lapses it.
      const cell = a ? (a as CompositionAnalysis).cells.find(c => c.property === more[0] && c.scenario === more[1]) : undefined;
      if (!cell) return refuse(`${more[0]} × ${more[1]} is not a cell of ${where.id}`);
      if (cell.mark !== 'violated' || !cell.trial) return refuse(`${more[0]} × ${more[1]} is ${cell.mark}, not violated: a risk accepts the violation a trial has shown${cell.mark === 'lapsed' ? '; rerun the cell first' : ''}`);
      lineArgs.push(cell.trial);
    }
    // A forget of a removed answer answers its tripwire; of a surviving entry, the dossier must be clean.
    const named = (more[0] || '').split('@')[0];
    if (verb === 'forget' && !existsSync(join(where.dir, EVIDENCE, `${named}.json`)) && !(a && a.tripwires.some(t => t.name === REMOVED && t.where.includes(`${named}.json`)))) return refuse(`${EVIDENCE}/${named}.json is not a removed answer of ${ref}; verify names each one as ${REMOVED}`);
  }
  console.log(publishDecisionLocked(where.dir, { time: now, verb, args: lineArgs, words }));
  return 0;
  } finally { release(); }
}
