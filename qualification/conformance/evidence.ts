// Readers the tests and the graders use, and the tool does not: verify reads evidence/ with
// readEvidence, and the runner reads the bundle it is about to publish with readBundle. Here a test
// finds the entry a cited trial established, lists the bundles a dossier keeps in trials/, reads one,
// and rebuilds the result.json a trial would have left from what its entry keeps.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { EVIDENCE, listEntries } from '../../src/trials/answers.ts';
import { readBundle, TRIAL_ID } from '../../src/trials/trials.ts';
import type { Entry } from '../../src/trials/answers.ts';
import type { Bundle, TrialResult } from '../../src/trials/trials.ts';

// The entry whose answer a trial established, with its reading, or null: how a report that cites a
// trial id finds the answer it rests on. An entry that does not parse is no trial's answer.
export function answerOf(dir: string, trial: string): { name: string; entry: Entry; reading: string | null } | null {
  for (const name of listEntries(dir)) {
    try {
      const entry = JSON.parse(readFileSync(join(dir, EVIDENCE, `${name}.json`), 'utf8')) as Entry;
      if (!entry || !entry.established || entry.established.trial !== trial) continue;
      const reading = join(dir, EVIDENCE, `${name}.md`);
      return { name, entry, reading: existsSync(reading) ? readFileSync(reading, 'utf8') : null };
    } catch { /* Malformed: verify reports it. */ }
  }
  return null;
}

// The ids of the bundles a dossier keeps in its local trials/, oldest first.
export function listBundles(dir: string): string[] {
  const folder = join(dir, 'trials');
  if (!existsSync(folder)) return [];
  return readdirSync(folder).filter(n => TRIAL_ID.test(n) && statSync(join(folder, n)).isDirectory()).sort();
}

// The bundle a trial left in its dossier's trials/, as the runner reads one.
export const trialBundle = (dir: string, id: string): Bundle => readBundle(join(dir, 'trials', id), id);

// The result.json a trial left, rebuilt from what its entry keeps: entryOf's mapping run backwards,
// with what only the bundle held, the command line, the working directory, the exit status and the
// time taken, left empty.
export function resultOf(e: Entry): TrialResult {
  return {
    ...e.answer,
    kind: e.question.kind, checker: e.question.checker, dossier: e.dossier,
    id: e.established.trial, at: e.established.at, versions: e.established.versions,
    command: null, cwd: null, exit: null, seconds: null,
    property: e.question.property, scenario: e.question.scenario, walk: e.question.walk,
    executed: e.basis.executed, inputIdentity: e.basis.inputIdentity,
    expect: e.call.expect, snapshot: e.basis.snapshot,
  };
}
