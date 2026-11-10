// The mechanically resolvable files a review must bind: what the subject's claims and formal targets
// rest on, and nothing whose change verify already reflects in the marks and standing. Semantic
// additions remain the reviewer's work.
import { existsSync, lstatSync, readFileSync, readdirSync, readlinkSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import { cachedFileHash, sha256 } from '../hash.ts';
import { UsageError } from '../dossiers/root.ts';
import { inputFiles } from '../trials/answers.ts';
import { resolveTarget } from './resolve.ts';
import { behaviorParts, behaviorPath } from './records.ts';
import type { Analysis } from '../verify/analyze.ts';
import type { LoadedKnowledge } from '../dossiers/load.ts';
import type { BehaviorCollection, RequiredBasis, ReviewSubject } from './types.ts';

// Chart blunders are authored inputs; ordinary chart files and generated models are views.
const generatedInput = (path: string): boolean => path.startsWith('model/generated/') || path.startsWith('chart/') && !path.startsWith('chart/blunders/');

export interface DependencyContext { root: string; analysis: Analysis; analyses: Record<string, Analysis>; knowledge: LoadedKnowledge; collection: BehaviorCollection }
export function requiredReviewBasis(subject: ReviewSubject, context: DependencyContext): RequiredBasis {
  const { root, analysis, analyses, knowledge, collection } = context;
  const files = new Map<string, RequiredBasis['files'][number]>();
  const issues = collection.issues.map(i => `${i.path}: ${i.message}`);
  const add = (kind: 'dossiers' | 'knowledge', path: string, optional = false): void => {
    const base = kind === 'dossiers' ? root : knowledge.root;
    if (!base) { issues.push(`no ${kind} root for ${path}`); return; }
    if (!path || isAbsolute(path) || path.split(/[\\/]/).includes('..')) { issues.push(`invalid dependency path: ${path}`); return; }
    const full = resolve(base, path);
    if (!existsSync(full)) { if (!optional) issues.push(`missing ${kind}/${path}`); return; }
    const actual = realpathSync(full), within = relative(realpathSync(base), actual);
    if (within.startsWith(`..${sep}`) || within === '..' || isAbsolute(within) || !lstatSync(actual).isFile()) { issues.push(`dependency outside ${kind} or not a file: ${path}`); return; }
    files.set(`${kind}:${path}`, { role: 'required', root: kind, path, sha256: cachedFileHash(full) });
  };
  const record = (ref: string, revision?: string): void => {
    const found = knowledge.resolve(ref);
    if (!found) { issues.push(`unresolved knowledge reference: ${ref}`); return; }
    if (revision && revision !== `sha256:${found.sha256}`) issues.push(`knowledge revision changed: ${ref}`);
    add('knowledge', found.path);
  };
  const formal = (a: Analysis, whole: boolean): void => {
    if (seen.has(`${a.ref}:${whole}`)) return;
    seen.add(`${a.ref}:${whole}`);
    add('dossiers', `${a.ref}/prose.md`);
    add('dossiers', `${a.ref}/integrity.json`);
    add('dossiers', `${a.ref}/decisions.log`, true);
    add('dossiers', `${a.ref}/doubts.md`, true);
    for (const ref of Object.keys(a.pins)) record(ref);
    if (a.kind === 'composition') {
      add('dossiers', `${a.ref}/wiring.md`);
      add('dossiers', `${a.ref}/model/extras.tla`, true);
      add('dossiers', 'actors/actors.md', true);
      add('dossiers', 'actors/scenarios.md', true);
      for (const member of a.wiring.members) {
        const child = analyses[`parts/${member.part}`];
        if (child) formal(child, whole);
        else issues.push(`missing member: parts/${member.part}`);
      }
    } else {
      // A part's senders and Givens name actors. Scenarios belong to compositions.
      add('dossiers', 'actors/actors.md', true);
      for (const pin of a.ir.pins) record(pin);
      for (const backing of Object.values(a.backing)) if (backing.status === 'backed' && backing.path) {
        if (backing.path.startsWith('evidence/')) add('dossiers', `${a.ref}/${backing.path}`);
        else add('knowledge', backing.path);
      }
      if (whole) for (const file of a.modelFiles) if (!file.endsWith('.scaffold.tla')) add('dossiers', `${a.ref}/${file}`);
      // The authored chart faults, whether or not an answer has run them yet.
      if (whole) for (const file of filesUnder(join(a.dir, 'chart', 'blunders'), 'chart/blunders')) add('dossiers', `${a.ref}/${file}`);
    }
    if (whole) for (const answer of a.answers) {
      add('dossiers', `${a.ref}/evidence/${answer.name}.json`);
      add('dossiers', `${a.ref}/evidence/${answer.name}.md`, true);
      if (answer.entry) for (const path of Object.keys(inputFiles(answer.entry.basis))) {
        if (generatedInput(path)) continue;
        add('dossiers', `${a.ref}/${path}`);
      }
    }
  };
  const seen = new Set<string>();
  // The collection's orientation and order are examined in a dossier review. A behavior review
  // stays current through an edit to the orientation, and a behavior gone from the collection
  // makes it stale through the collection check. dossier.json resolves nothing a judgment rests on.
  if (subject.kind === 'dossier') add('dossiers', `${analysis.ref}/README.md`);
  if (subject.dossier !== analysis.ref) issues.push(`subject names ${subject.dossier}, expected ${analysis.ref}`);
  for (const id of subject.behaviors) {
    const behavior = collection.behaviors.find(b => b.record.id === id);
    if (!behavior) { issues.push(`missing behavior: ${id}`); continue; }
    // A review binds a subject behavior's file part by part, so that a changed claim takes only its own assessments.
    add('dossiers', behaviorPath(analysis.ref, id));
    const entry = files.get(`dossiers:${behaviorPath(analysis.ref, id)}`);
    if (entry) Object.assign(entry, behaviorParts(behavior.text));
    for (const claim of behavior.record.claims) {
      for (const pin of claim.scope.pins) record(pin.ref, pin.revision);
      for (const mapping of claim.mappings) {
        const target = resolveTarget(mapping.target, { analysis, analyses, knowledge });
        for (const dep of target.dependencies) add(dep.root, dep.path, dep.path.endsWith('/decisions.log') || dep.path.includes('/evidence/') && dep.path.endsWith('.md'));
        for (const evidence of target.evidence) {
          if (!evidence.entry) continue;
          const owner = analyses[evidence.dossier];
          const entry = owner?.answers.find(a => a.name === evidence.entry)?.entry;
          if (!entry) continue;
          for (const path of Object.keys(inputFiles(entry.basis))) {
            if (generatedInput(path)) continue;
            add('dossiers', `${owner.ref}/${path}`);
          }
        }
        if (['missing', 'invalid'].includes(target.freshness)) issues.push(...target.reasons);
        if (mapping.target.kind !== 'knowledge') {
          const a = analyses[mapping.target.dossier];
          if (a) formal(a, false);
        }
      }
    }
  }
  // The subject's wiring and interpretation authorize member mappings.
  formal(analysis, subject.kind === 'dossier');
  // No knowledge file is bound beyond those the subject's references resolve to. A new record that
  // makes one of those references ambiguous leaves it unresolved, which the next recomputation of
  // this basis reports and which stales the review. A new owner of a closure edge opens the
  // composition's closure, which verify reports and which takes the cells' support away.
  return { files: [...files.values()].sort((a, b) => `${a.root}/${a.path}`.localeCompare(`${b.root}/${b.path}`)), issues: [...new Set(issues)] };
}

// Every regular file under a folder, by its path from `prefix`, in a stable order.
function filesUnder(dir: string, prefix: string): string[] {
  if (!existsSync(dir) || !lstatSync(dir).isDirectory()) return [];
  return readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(e =>
    e.name === '.DS_Store' ? [] : e.isDirectory() ? filesUnder(join(dir, e.name), `${prefix}/${e.name}`) : e.isFile() ? [`${prefix}/${e.name}`] : []);
}

// Authored changes are not coordinated by publication locks. Detect a changed root inventory or
// relevant bytes immediately before committing a retention decision. Derived views and local bundles
// supply no authority and are deliberately excluded.
// A folder reached through a link, as its files and their digests, without following links further.
function linkedTree(dir: string): string {
  const out: [string, string][] = [];
  const walk = (d: string, prefix: string): void => {
    for (const e of readdirSync(d, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const p = join(d, e.name);
      if (e.isSymbolicLink()) out.push([`${prefix}${e.name}`, `symlink:${readlinkSync(p)}`]);
      else if (e.isDirectory()) walk(p, `${prefix}${e.name}/`);
      else if (e.isFile()) out.push([`${prefix}${e.name}`, sha256(readFileSync(p))]);
    }
  };
  walk(dir, '');
  return sha256(JSON.stringify(out));
}
export function retentionInputFingerprint(root: string): string {
  const files: [string, string][] = [];
  const walk = (dir: string, prefix: string): void => {
    if (!existsSync(dir)) return;
    const authoredBlunder = /^(parts|compositions)\/[^/]+\/chart\/blunders\//.test(prefix);
    for (const name of readdirSync(dir).sort()) {
      if (!authoredBlunder) {
        // Transient coordination files, a write's temporary copy and local bundles; any other hidden
        // file is authored and binds.
        if (['.running', '.DS_Store', '.explorer', '.git'].includes(name) || name.startsWith('.publication-lock') || name.startsWith('.initializing-') || /^\..+\.tmp$/.test(name) || ['node_modules', 'trials', 'calls', 'generated'].includes(name)) continue;
        if (['ledger.md', 'index.md'].includes(name)) continue;
        if (/^(parts|compositions)\/[^/]+\/chart\/$/.test(prefix) && name !== 'blunders') continue;
      }
      const path = join(dir, name), rel = `${prefix}${name}`, stat = lstatSync(path);
      if (stat.isSymbolicLink()) {
        const faultPath = /^(parts|compositions)\/[^/]+\/chart\/blunders(?:\/|$)/.test(rel);
        const chartAncestor = /^(parts|compositions)\/[^/]+\/chart$/.test(rel) && existsSync(join(path, 'blunders'));
        if (faultPath || chartAncestor) throw new UsageError(`authored chart blunders must use regular directories and files for publication; symbolic link at ${rel}`);
        // A link binds where it points and what is there now, so an executed file reached through
        // one cannot change unseen.
        const target = readlinkSync(path), resolved = statSync(path, { throwIfNoEntry: false });
        files.push([rel, `symlink:${target}:${!resolved ? 'missing' : resolved.isFile() ? sha256(readFileSync(path)) : resolved.isDirectory() ? linkedTree(path) : 'other'}`]);
        continue;
      }
      if (stat.isDirectory()) walk(path, `${rel}/`);
      else if (stat.isFile()) files.push([rel, sha256(readFileSync(path))]);
    }
  };
  for (const name of ['dossier.json']) if (existsSync(join(root, name))) files.push([name, sha256(readFileSync(join(root, name)))]);
  for (const name of ['parts', 'compositions', 'actors']) walk(join(root, name), `${name}/`);
  return sha256(JSON.stringify(files));
}

// Match the adapter's record search, including observations which can introduce an
// ambiguous identity. Source caches are bound separately when a target uses them.
export function knowledgeRecordFiles(root: string | null, modules?: Set<string>): string[] {
  if (!root || !existsSync(join(root, 'modules'))) return [];
  const files: string[] = [];
  const walk = (dir: string, prefix: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.name.startsWith('.') || ['source-cache', 'node_modules'].includes(entry.name)) continue;
      const path = `${prefix}/${entry.name}`;
      if (entry.isDirectory()) walk(join(dir, entry.name), path);
      else if (entry.isFile() && (entry.name.endsWith('.md') || prefix.includes('/observations') && entry.name.endsWith('.json'))) files.push(path);
    }
  };
  for (const entry of readdirSync(join(root, 'modules'), { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory() && !entry.name.startsWith('.') && (!modules || modules.has(entry.name))) walk(join(root, 'modules', entry.name), `modules/${entry.name}`);
  }
  return files;
}
// Whether the knowledge base's record files changed while a publication ran: their names, sizes and
// modification times. A knowledge base can hold observations of tens of megabytes, which a
// publication need not read to see that they were written meanwhile.
export function knowledgeInputFingerprint(root: string | null): string {
  return sha256(JSON.stringify(knowledgeRecordFiles(root).map(path => { const s = statSync(join(root!, path)); return [path, s.size, s.mtimeMs, s.ino]; })));
}
