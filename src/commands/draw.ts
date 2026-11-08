// dossier draw <part> [--brief] [--json] [--limit <states>]
import { findRoot, stripRootArgs, locate } from '../dossiers/root.ts';
import { isRetired } from '../dossiers/decisions.ts';
import { draw, summarize } from '../chart/draw.ts';
import type { CommandContext } from '../cli.ts';

export async function main(command: string, args: string[], { root: pluginRoot }: CommandContext): Promise<number> {
  const root = findRoot(args);
  if (!root) { console.error('dossier draw: no dossiers root here. Run dossier setup.'); return 2; }
  // --limit bounds the distinct states the exploration may reach: a whole number, at least 1.
  const limitAt = args.indexOf('--limit');
  const written = limitAt >= 0 ? args[limitAt + 1] : undefined;
  if (limitAt >= 0 && (written === undefined || !/^[1-9]\d*$/.test(written))) { console.error(`dossier draw: --limit takes a whole number of states, at least 1${written === undefined ? '' : `, not "${written}"`}`); return 2; }
  const limit = written === undefined ? 20000 : Number(written);
  const name = stripRootArgs(args).filter((a, i, all) => !a.startsWith('--') && all[i - 1] !== '--limit')[0];
  if (!name) { console.error('usage: dossier draw <part>'); return 2; }
  const where = locate(root, name);
  if (!where || where.kind !== 'part') { console.error(`dossier draw: no part named ${name} under ${root}`); return 2; }
  const ref = `parts/${where.id}`;
  if (isRetired(where.dir)) { console.error(`dossier draw: ${ref} is retired; dossier decide ${ref} begin reopens it`); return 2; }
  const result = await draw({ root, part: where.id, limit });
  if (args.includes('--json')) { const { ir, ...rest } = result; console.log(JSON.stringify(rest, null, 2)); }
  // --brief: the summary's first line, the outcome and the counts.
  else if (args.includes('--brief')) console.log(summarize(result).split('\n')[0]);
  else console.log(summarize(result));
  if (result.error || !result.ok) return 1;
  return result.outcome === 'pass' ? 0 : 1;
}
