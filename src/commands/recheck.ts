// dossier recheck [<dossier>...] [--timeout <seconds>] [--workers <n>] [--limit <states>]
// Ask the question of every entry whose answer has not lapsed again, at its recorded reach, in a
// private folder, and compare the verdict, the outcomes and the reach with the entry
// (ANSWER-RECHECK). It writes nothing and consumes no call. Whether an answer has lapsed is read
// from the entry's own basis, against the present as the runner would hash it, before any checker
// starts. Lapsed, aborted, gone and superseded entries are listed and not run, a dossier whose records
// do not verify is named once and skipped, and an entry whose call no longer runs here, such as an
// external runner this marker does not configure, is listed with why. Exit 1 on any difference.
import { join } from 'node:path';
import { findRoot, locate, stripRootArgs, UsageError } from '../dossiers/root.ts';
import { requireCurrent } from '../dossiers/integrity.ts';
import { knowledgeOf, loadComponent, loadSystem } from '../dossiers/load.ts';
import { parseCall } from '../trials/calls.ts';
import { readable, sameAnswer } from '../trials/answers.ts';
import { basisMoved } from '../verify/lapse.ts';
import { answerContext, execute, integrityPreflight, presentNow, trialOptions } from './trial.ts';
import { verifyAll } from './verify.ts';
import type { Answer } from '../trials/answers.ts';
import type { TrialResult } from '../trials/trials.ts';
import type { Loaded } from './trial.ts';
import type { CommandContext } from '../cli.ts';

const OPTIONS = ['--timeout', '--workers', '--limit'];

const said = (r: Pick<Answer, 'result' | 'outcomes' | 'reach'>) => `${r.result}, ${Object.entries(r.outcomes || {}).map(([n, o]) => `${n} ${o}`).join(', ') || 'no outcomes'}${r.reach && r.reach.text ? `, reach ${r.reach.text}` : ''}`;

export async function main(_command: string, args: string[], { root: pluginRoot, version }: CommandContext): Promise<number> {
  const { timeoutSeconds, workers, limit, problems } = trialOptions(args);
  if (problems.length) throw new UsageError(problems.join('; '));
  const root = findRoot(args);
  if (!root) throw new UsageError('no dossiers root here. Run dossier setup.');
  requireCurrent(root);
  const wanted = stripRootArgs(args).filter((a, i, all) => !a.startsWith('--') && !OPTIONS.includes(all[i - 1]));
  for (const name of wanted) if (!locate(root, name)) throw new UsageError(`no component or system named ${name} under ${root}`);
  const verified = verifyAll({ root, version, wanted, write: false });
  const knowledge = knowledgeOf(root);
  let same = 0, different = 0, unrun = 0;
  for (const a of verified.selected) {
    const where = locate(root, a.ref)!;
    const loaded: Loaded = where.kind === 'component' ? loadComponent(root, where.id) : loadSystem(root, where.id);
    const answers = a.answers.filter(readable);
    // A dossier whose records, or whose members' records, do not verify runs no trial, so none is
    // rechecked. Every entry with a problem trips there, so each entry asked below reads clean.
    const relevant = [where.dir, ...(loaded.composition?.members || []).map(m => join(root, 'components', m.component))];
    try { for (const dir of relevant) integrityPreflight(dir); }
    catch (error) { unrun += answers.length; console.log(`not run: ${a.ref} · its records do not verify: ${(error as Error).message}`); continue; }
    const context = answerContext(where, loaded, where.dir);
    for (const { name, entry } of answers) {
      const label = `${a.ref}/evidence/${name}.json`;
      const skip = (why: string) => { unrun++; console.log(`not run: ${label} · ${why}`); };
      if (entry.answer.result === 'aborted') { skip('aborted'); continue; }
      if (a.gone[name]) { skip(`question gone: ${a.gone[name]}`); continue; }
      if (a.superseded[name]) { skip(`answer superseded: ${a.superseded[name]}`); continue; }
      const moved = basisMoved(entry, presentNow(where, loaded, knowledge, parseCall(entry.call.text)), context);
      if (moved.length) { skip(`lapsed: ${moved.join(', ')}; a trial answers it again, not a recheck`); continue; }
      const out: { result?: TrialResult } = {};
      const status = await execute({ root, where, name: where.id, callText: entry.call.text, recheck: true, timeoutSeconds, workers, limit, pluginRoot, version }, out);
      if (!out.result) { skip(`its call did not run here (exit ${status})`); continue; }
      if (sameAnswer(entry.answer, out.result)) { same++; console.log(`same: ${label} · ${said(out.result)}`); }
      else { different++; console.log(`different: ${label} · recorded ${said(entry.answer)}; now ${said(out.result)}`); }
    }
  }
  console.log(`recheck: ${same} same, ${different} different, ${unrun} not run`);
  return different ? 1 : 0;
}
