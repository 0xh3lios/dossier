// dossier doctor: what is present, what is missing, and the one-line fix for each.
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { findRoot, readMarker } from '../dossiers/root.ts';
import { findModule } from '../chart/draw.ts';
import * as apalache from '../trials/checkers/apalache.ts';
import { buildState } from '../explore/build.ts';
import type { CommandContext } from '../cli.ts';

export async function main(command: string, args: string[], { root: pluginRoot, version }: CommandContext): Promise<number> {
  const rows: [string, string, string][] = [];
  const ok = (what: string, detail: string) => rows.push(['ok', what, detail]);
  const missing = (what: string, detail: string, fix: string) => rows.push(['missing', what, `${detail.replace(/\.$/, '')}. Fix: ${fix}`]);
  const info = (what: string, detail: string) => rows.push(['info', what, detail]);

  const node = process.versions.node;
  // Node runs the plugin's TypeScript without a flag or a warning from 22.18 on the 22 line, and from 24.3.
  const [major, minor] = node.split('.').map(Number);
  if ((major === 22 && minor >= 18) || (major === 24 && minor >= 3) || major >= 25) ok('node', `node ${node}`); else missing('node', `node ${node} is too old to run the plugin's TypeScript`, 'install Node 24.3 or later, or 22.18 or later on the 22 line');
  const javaBin = process.env.JAVA || 'java';
  const java = spawnSync(javaBin, ['-version'], { encoding: 'utf8' });
  const banner = `${java.stderr || ''}${java.stdout || ''}`.split('\n')[0].trim();
  if (java.status === 0 && /version/.test(banner)) ok('java', `${banner}${process.env.JAVA ? ` (JAVA=${process.env.JAVA})` : ''}`);
  else missing('java', java.error ? 'java is not on the PATH and JAVA is not set' : (banner || 'java does not run'), 'install a JDK 17 or later, or set JAVA=/path/to/bin/java');
  jar('TLA_TOOLS', 'tla2tools.jar', 'https://github.com/tlaplus/tlaplus/releases');
  jar('ALLOY_JAR', 'org.alloytools.alloy.dist-6.x.jar', 'https://github.com/AlloyTools/org.alloytools.alloy/releases');
  const ap = process.env.APALACHE;
  if (!ap) missing('APALACHE', 'not set', 'export APALACHE=/path/to/apalache/bin/apalache-mc (https://github.com/apalache-mc/apalache/releases)');
  else if (!existsSync(ap)) missing('APALACHE', `${ap} does not exist`, 'point APALACHE at the apalache-mc launcher');
  else { const v = apalache.version(); if (v) ok('APALACHE', `apalache ${v}`); else missing('APALACHE', `${ap} does not run`, 'check the JDK: Apalache needs Java 17 or later'); }

  let root: string | null = null;
  try { root = findRoot(args); } catch (e) { missing('dossiers root', (e as Error).message, 'point --root at a folder holding dossier.json'); }
  if (!root) info('dossiers/', `none under ${process.cwd()}; run dossier setup to create one`);
  else {
    ok('dossiers root', root);
    for (const name of ['xstate', '@xstate/graph']) { const m = findModule(root, name); if (m) ok(name, `${m.version} at ${m.dir.includes(pluginRoot) ? 'the plugin' : 'the project'}`); else missing(name, 'not installed under the dossiers root or the plugin', 'run dossier setup --install'); }
    const marker = readMarker(root);
    if (marker.error) missing('dossier.json', marker.error.replace(/^dossier\.json:?\s*/, ''), 'correct dossier.json by hand, or remove it and run dossier setup');
    else if (marker.plugin === version) ok('dossier.json', `set up with dossier ${marker.plugin}`); else info('dossier.json', `set up with dossier ${marker.plugin || '?'}; this is ${version}: run dossier setup`);
    if (marker.knowledge && marker.knowledge.root) { const k = resolve(root, marker.knowledge.root); if (existsSync(join(k, 'modules'))) ok('knowledge', `${k} (modules/ present)`); else missing('knowledge', `${k} has no modules/ folder`, 'point knowledge.root in dossier.json at the records'); }
    else info('knowledge', 'none configured; references resolve to nothing');
    const ext = marker.external && typeof marker.external === 'object' ? Object.keys(marker.external) : [];
    info('external runners', ext.length ? ext.join(', ') : 'none declared');
    // The explorer is optional: a page not built yet is information, not a missing piece.
    const page = buildState(root, pluginRoot);
    info('explorer', page.ready ? `page built by dossier ${page.stamp!.version} in ${page.dist}` : `page ${page.why}`);
  }
  info('plugin', `dossier ${version} at ${pluginRoot}`);
  for (const [state, what, detail] of rows) console.log(`${state.padEnd(8)} ${what}: ${detail}`);
  return rows.some(row => row[0] === 'missing') ? 1 : 0;

  function jar(name: string, file: string, url: string): void {
    const value = process.env[name];
    if (!value) missing(name, 'not set', `export ${name}=/path/to/${file} (${url})`);
    else if (!existsSync(value)) missing(name, `${value} does not exist`, `point ${name} at ${file} (${url})`);
    else ok(name, value);
  }
}
