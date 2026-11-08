import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Raw starting inputs and an interrupted prediction, not expected agent answers.
export function prepareWorkflow(exercise: string, plugin: string, workspace: string) {
  if (exercise === 'compose-probe') {
    const root = join(workspace, 'dossiers');
    for (const name of ['actors', 'parts/source', 'parts/sink', 'compositions']) mkdirSync(join(root, name), { recursive: true });
    writeFileSync(join(root, 'dossier.json'), JSON.stringify({ plugin: '0.1.0', storage: 'integrity-v1' }, null, 2) + '\n');
    writeFileSync(join(root, 'actors/actors.md'), '# Actors\n\n```yaml\nactors:\n  - id: operator\n    kind: user\n```\n');
    writeFileSync(join(root, 'actors/scenarios.md'), '# Scenarios\n\n```yaml\nscenarios:\n  - id: all-honest\n    modes: {}\n```\n');
    for (const id of ['source', 'sink']) {
      cpSync(join(plugin, `qualification/conformance/fixtures/transfer-${id}.md`), join(root, `parts/${id}/prose.md`));
      // A new exercise root with no published answers or decisions: each dossier
      // starts with an empty integrity.json, as dossier decide begin would leave it.
      writeFileSync(join(root, `parts/${id}/integrity.json`), JSON.stringify({ schema: 1, evidence: {}, decisionHead: null }, null, 2) + '\n');
    }
  } else if (exercise === 'refresh-decision') {
    const dir = join(workspace, 'dossiers/compositions/control');
    const prose = readFileSync(join(dir, 'prose.md'), 'utf8');
    if (!prose.includes('[N1] Within 3 ticks')) throw new Error('the refresh exercise starts from Harbor\'s three-tick N1');
    writeFileSync(join(dir, 'prose.md'), prose.replace('[N1] Within 3 ticks', '[N1] Within 2 ticks'));
    mkdirSync(join(dir, 'calls'), { recursive: true });
    writeFileSync(join(dir, 'calls/continuation.md'), 'kind: tlc\nproperty: N1\nscenario: executor-offline\nexecutes:\n  - model/generated/Control.tla\n  - model/generated/N1_executor_offline.cfg\nreach: delay 2; amounts up to 2; line 2..4; effects up to 4\nexpect:\n  TypeOK: holds\n  N1: holds\nbecause: The previous keeper predicted that the two-tick deadline would still hold without an executor. This prediction is retained for the interrupted continuation.\n');
  } else throw new Error(`unknown workflow: ${exercise}`);
}
