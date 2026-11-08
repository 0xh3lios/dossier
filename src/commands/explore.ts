// dossier explore [--install] [--port <n>] [--limit <n>]: serve the explorer, a read-only page over
// the dossiers root on 127.0.0.1, until stopped. --install builds the page, in the root's .explorer/,
// and exits.
import { findRoot } from '../dossiers/root.ts';
import { buildState, install, shown } from '../explore/build.ts';
import { DEFAULT_PORT, NoFreePort, startExplorer } from '../explore/server.ts';
import { LIMIT } from '../explore/run.ts';
import type { CommandContext } from '../cli.ts';

// A whole number given after a flag, within bounds, or the default; a usage error names the flag.
function number(args: string[], flag: string, fallback: number, min: number, max: number): number | string {
  const at = args.indexOf(flag);
  if (at < 0) return fallback;
  const written = args[at + 1];
  if (written === undefined || !/^\d+$/.test(written) || Number(written) < min || Number(written) > max) return `${flag} takes a whole number from ${min} to ${max}${written === undefined ? '' : `, not "${written}"`}`;
  return Number(written);
}

export async function main(command: string, args: string[], { root: pluginRoot, version }: CommandContext): Promise<number> {
  const root = findRoot(args);
  if (!root) { console.error('dossier explore: no dossiers root here. Run dossier setup.'); return 2; }
  const port = number(args, '--port', DEFAULT_PORT, 0, 65535);
  // The limit on explored states, as draw takes it: a chart a trial drew past 20000 needs the same here.
  const limit = number(args, '--limit', LIMIT, 1, Number.MAX_SAFE_INTEGER);
  for (const value of [port, limit]) if (typeof value === 'string') { console.error(`dossier explore: ${value}`); return 2; }

  if (args.includes('--install')) {
    const state = buildState(root, pluginRoot);
    if (state.ready) { console.log(`explore: the page in ${shown(state.dist)} is current; nothing to build`); return 0; }
    return install(root, pluginRoot, version, line => console.log(line));
  }
  const state = buildState(root, pluginRoot);
  if (!state.ready) { console.error(`dossier explore: the page is ${state.why}`); return 1; }
  let explorer;
  try { explorer = await startExplorer({ root, pluginRoot, version, port: port as number, limit: limit as number, dist: state.dist, log: line => console.error(line) }); }
  catch (e) { if (e instanceof NoFreePort) { console.error(`dossier explore: ${e.message}`); return 1; } throw e; }
  if (explorer.port !== port && port !== 0) console.log(`explore: port ${port} is taken, so the page is on ${explorer.port}; what it remembers is kept per address`);
  console.log(`explore: ${explorer.url} over ${root}. It reads and never writes. Stop it with Ctrl-C.`);
  await new Promise<void>(resolve => { process.once('SIGINT', () => resolve()); process.once('SIGTERM', () => resolve()); });
  await explorer.close();
  return 0;
}
