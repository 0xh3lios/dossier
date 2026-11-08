// Freeze the task inputs before dispatch. The manifest is evaluator evidence,
// outside the agent's writable workspace. It contains no expected answer.
import { cpSync, existsSync, mkdirSync, readFileSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { delimiter, dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { fingerprint } from './files.ts';
import { prepareWorkflow } from './workflow-inputs.ts';

const plugin = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const identity = (path: string | undefined) => {
  if (!path) return null;
  const found = isAbsolute(path) ? path : path.includes('/') || existsSync(path) ? resolve(path) : (process.env.PATH || '').split(delimiter).map(dir => join(dir, path)).find(candidate => existsSync(candidate));
  if (!found || !existsSync(found)) return { requested: path, available: false as const };
  return { requested: path, path: resolve(found), resolvedPath: realpathSync(found), sha256: createHash('sha256').update(readFileSync(found)).digest('hex'), available: true as const };
};
const [exercise, destination] = process.argv.slice(2);
if (!['budget', 'review', 'compose-probe', 'refresh-decision'].includes(exercise) || !destination) {
  console.error('usage: node qualification/conformance/prepare-agent.ts <budget|review|compose-probe|refresh-decision> <new-evaluation-directory>');
  process.exitCode = 2;
} else {
  const evaluation = resolve(destination), frozen = join(evaluation, 'plugin'), evaluator = join(evaluation, 'evaluator'), workspace = join(evaluation, 'workspace');
  if (existsSync(evaluation)) throw new Error('use a new directory; never replace prior evaluation evidence');
  mkdirSync(evaluation, { recursive: true });
  mkdirSync(frozen);
  for (const name of ['src', 'bin', 'skills', 'spec', 'docs', 'plugin.json', '.claude-plugin', 'README.md', 'package.json', 'package-lock.json']) {
    cpSync(join(plugin, name), join(frozen, name), { recursive: true, preserveTimestamps: true });
  }
  // Setup's smoke check reads Harbor. Golden marks and test/grader code are
  // deliberately excluded from both the plugin snapshot and the raw task.
  const fixture = join(plugin, 'qualification/fixture');
  const copyFixture = (target: string) => cpSync(fixture, target, { recursive: true, preserveTimestamps: true, filter: source => !source.endsWith('/expected-marks.json') });
  copyFixture(join(frozen, 'qualification/fixture'));
  symlinkSync(join(plugin, 'node_modules'), join(frozen, 'node_modules'), 'dir');
  // Evaluator code is outside the agent-visible plugin. Its production imports
  // resolve to that exact frozen plugin, rather than the future working tree.
  const evaluatorCode = join(evaluator, 'qualification/conformance');
  mkdirSync(evaluatorCode, { recursive: true });
  for (const name of ['grade-exercise.ts', 'grade-agent.ts', 'grade-review.ts', 'grade-workflows.ts', 'files.ts', 'evidence.ts']) {
    cpSync(join(plugin, 'qualification/conformance', name), join(evaluatorCode, name), { preserveTimestamps: true });
  }
  symlinkSync(join(frozen, 'src'), join(evaluator, 'src'), 'dir');
  symlinkSync(join(plugin, 'node_modules'), join(evaluator, 'node_modules'), 'dir');
  if (['review', 'refresh-decision'].includes(exercise)) copyFixture(workspace); else mkdirSync(workspace);
  if (['compose-probe', 'refresh-decision'].includes(exercise)) prepareWorkflow(exercise, plugin, workspace);
  const usesTlc = ['compose-probe', 'refresh-decision'].includes(exercise);
  const java = usesTlc ? identity(process.env.JAVA || (process.env.JAVA_HOME && join(process.env.JAVA_HOME, 'bin/java')) || 'java') : null;
  const tlc = usesTlc ? identity(process.env.TLA_TOOLS) : null;
  const toolchain = usesTlc ? { source: 'preparation environment', java, tlc, environment: { JAVA: java?.available ? java.path : null, TLA_TOOLS: tlc?.available ? tlc.path : null }, shared: true } : null;
  const runtime = { node: process.version, executable: identity(process.execPath) };
  const solverInstructions = !usesTlc ? '' : java?.available && tlc?.available
    ? `The evaluator authorizes use of these already installed tools through Dossier's trial runner. Set the following environment values for Dossier commands:\n\n\`\`\`json\n${JSON.stringify(toolchain!.environment, null, 2)}\n\`\`\`\n\nDo not install a toolchain or invoke the solver directly. These shared executable paths were recorded at preparation; they are not a hermetic runtime image.\n\n`
    : 'TLC configuration was unavailable at preparation. This evaluation directory can test preparation only. Before a live agent run, the evaluator must prepare a new evaluation directory with JAVA and TLA_TOOLS configured; do not install tools or infer a replacement runtime.\n\n';
  const request = `Plugin snapshot: ${frozen}\nWritable workspace: ${workspace}\nUse ${frozen}/bin/dossier. Read the named skill from the snapshot. Do not edit the plugin, read its qualification/ directory, read evaluator files outside the workspace, or consult other agents' work.\n\n${solverInstructions}` + readFileSync(join(plugin, `qualification/conformance/agents/${exercise}-request.md`), 'utf8');
  writeFileSync(join(evaluation, 'request.md'), request);
  const files = fingerprint(frozen);
  const digest = (value: unknown) => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
  const content = (entries: Record<string, string>) => Object.fromEntries(Object.entries(entries).map(([name, signature]) => [name, signature.replace(/^[^:]*:[^:]*:/, '')]));
  const evaluatorFiles = fingerprint(evaluator);
  const workspaceBefore = fingerprint(workspace);
  // The starting entries are kept whole: a grader tells a fresh answer from an old one, and a
  // replaced entry from an edited one, by the trials they name.
  const initialTexts = Object.fromEntries(Object.keys(workspaceBefore)
    .filter(name => name.endsWith('/decisions.log') || name === 'dossiers/dossier.json' || name === 'dossiers/compositions/control/calls/continuation.md' || /^dossiers\/(?:parts|compositions)\/[^/]+\/evidence\/[^/]+\.json$/.test(name))
    .map(name => [name, readFileSync(join(workspace, name), 'utf8')]));
  const manifest = {
    schema: 1, exercise, created: new Date().toISOString(), node: process.version,
    runtime, toolchain,
    plugin: frozen, evaluator, workspace, requestHash: digest(request), pluginHash: digest(content(files)),
    specHash: digest(content(Object.fromEntries(Object.entries(files).filter(([name]) => name.startsWith('spec/'))))),
    evaluatorHash: digest(content(evaluatorFiles)), evaluatorBefore: evaluatorFiles,
    pluginBefore: files, workspaceBefore, initialTexts,
    dependencies: { lockfileHash: digest(readFileSync(join(plugin, 'package-lock.json'), 'utf8')), sharedModules: join(plugin, 'node_modules') },
  };
  writeFileSync(join(evaluation, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(JSON.stringify({ exercise, request: join(evaluation, 'request.md'), workspace, pluginHash: manifest.pluginHash, specHash: manifest.specHash, evaluatorHash: manifest.evaluatorHash }, null, 2));
}
