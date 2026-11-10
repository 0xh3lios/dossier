// Dispatches `dossier <command>` to src/commands/<module>.ts. Each module exports
// main(command, args, { root, version }) and returns an exit code. A refused name is exit 2,
// as any usage error is; anything else thrown is an internal error, exit 4, so that a crash
// is never read as a failed check (1) or a refusal (2).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findRoot, UsageError } from './dossiers/root.ts';

// What every command receives: the toolkit's folder and its version.
export interface CommandContext { root: string; version: string }
// A command's entry point: it returns the exit code.
export type Command = (command: string, args: string[], context: CommandContext) => Promise<number>;

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const modules = { 'review-basis': 'review-basis', verify: 'verify', render: 'render', recover: 'recover', draw: 'draw', scaffold: 'scaffold', trial: 'trial', call: 'call', show: 'show', blunder: 'blunder', recheck: 'recheck', decide: 'decide', where: 'where', import: 'import', doctor: 'doctor', setup: 'setup', explore: 'explore' } as Record<string, string>;
// `--root <path>` may stand before the command as well as after it, as in `dossier --root x verify`.
const argv = process.argv.slice(2), leading: string[] = [];
while (argv[0] === '--root' && argv.length > 2) leading.push(...argv.splice(0, 2));
const [command, ...rest] = argv;
const args = [...rest, ...leading];

const usage = `usage: dossier <command> [args] [--root <path>]
  verify [--brief] [--json] [<dossier>...]
      analyze without writing and print the verify line; exit 1 on a tripwire
  render [--brief] [--json] [<dossier>...]
      explicitly write ledger and index views; records no evidence
  recover <dossier> trial <id> [--dry-run] | decisions [--dry-run | --confirm <suffix-sha256>] | lock [--dry-run]
      explicitly finish an interrupted answer publication, or recover a dead local writer lock
  recover --root-lock [--dry-run]
      recover a demonstrably dead local lock on the root, which setup and new dossiers take
  draw <part> [--brief] [--json] [--limit <n>]
      compile the prose, write the chart's files, run the chart's checks; records no evidence
  scaffold <part|composition>
      write a part's TLA+ scaffold, or regenerate a composition's module and its configurations
  call <dossier> <name> <kind> [<target>] [--scenario <id>] [--mode <m>] [--inv <name>] [--length <n>]
       [--reach <words>] [--expect "<name>: <outcome>"]... [--because <words>] [--blunder <words>]
       [--trace-data <variables>] [--runner <id>] [--base <module>] [--force]
      write calls/<name>.md: the tool's lines, and the prediction as given or left empty
  blunder <dossier> <copy> --replace <text> --with <text> --wrong <words> [--property <id>]
       [--scenario <id>] [--base <module>] [--all] [--reach <words>] [--because <words>] [--force]
      copy the module to model/blunders/<copy>, apply the replacement, write its configuration and call
  show <dossier> <entry> [--json]
      print an answer in evidence/: the question, the outcomes, the reach and the trace as a table
  trial <dossier> <call.md> [--timeout <seconds>] [--workers <n>] [--limit <n>]
      run one call through the runner and publish its answer to evidence/
  recheck [<dossier>...] [--timeout <seconds>] [--workers <n>] [--limit <n>]
      ask every current answer's question again in a private folder; writes nothing; exit 1 on a difference
  decide <dossier> <verb> ... -- "<words>"
      record a decision: begin [charted|modeled|composition] | accept <ids> | reject <id>
      | answer D<n> a|b | risk <property> <scenario> | forget <entry>@<digest> | retire
  review-basis <dossier> [--behavior <id>] [--json]
      print the required review fingerprints and coverage checklist; records no assessment
  where <ref>
      what a part, composition, property, scenario, actor or record touches
  explore [--install] [--port <n>] [--limit <n>]
      serve a read-only page over the root on 127.0.0.1 until stopped; --install builds the page and exits
  import <module> [--as <part>]
      draft a part from the knowledge base's records
  doctor
      what the toolchain has and lacks
  setup [--knowledge <path>] [--install] [--dir <path> | --root <path>]
      prepare dossiers/ here or under --dir, or the folder --root names, as a dossiers root
  version
      print the toolkit's version
Every command takes --root <path>, before or after it, to name the dossiers root. Otherwise it uses DOSSIER_ROOT, or
the nearest dossier.json, dossiers/dossier.json or .dossier-root at or above the working directory.
<dossier> is a bare id, parts/<id> or compositions/<id>.`;

// The toolkit's version, from package.json; both plugin manifests carry the same one.
const version = (): string => JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;

// A refused name ends as a usage error; any other throw, caught here or escaping later from a
// callback or a promise nobody awaited, as an internal error with the stack under DOSSIER_DEBUG.
function fail(error: unknown): number {
  if (error instanceof UsageError) { console.error(`dossier ${command}: ${error.message}`); return 2; }
  const e = error instanceof Error ? error : new Error(String(error));
  console.error(`dossier: internal error: ${e.message}`);
  if (process.env.DOSSIER_DEBUG && e.stack) console.error(e.stack);
  return 4;
}
process.on('uncaughtException', error => process.exit(fail(error)));
process.on('unhandledRejection', error => process.exit(fail(error)));

try {
  if (command === 'version') { console.log(version()); process.exit(0); }
  if (!command || command === 'help' || command === '--help') { console.log(usage); process.exit(command ? 0 : 2); }
  if (!modules[command]) { console.error(`dossier: unknown command "${command}"\n${usage}`); process.exit(2); }
  // A root that --root, DOSSIER_ROOT or .dossier-root names must hold dossier.json; when it does
  // not, one line says so. setup prepares the folder --root names, and doctor reports it among its rows.
  if (!['setup', 'doctor'].includes(command)) {
    try { findRoot(args); } catch (e) { if (!(e instanceof UsageError)) throw e; console.error(`dossier: ${e.message}`); process.exit(2); }
  }
  const mod = await import(pathToFileURL(join(root, 'src', 'commands', `${modules[command]}.ts`)).href) as { main: Command };
  const code = await mod.main(command, args, { root, version: version() });
  process.exitCode = typeof code === 'number' ? code : 0;
} catch (error) {
  process.exitCode = fail(error);
}
