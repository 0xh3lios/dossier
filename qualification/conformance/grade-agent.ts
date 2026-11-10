// Independent task oracle for agents/budget-request.md. It checks produced
// artifacts and raw task facts, not matching wording or a model answer.
// The answer cites a trial id. HEAD keeps the answer that trial established in
// its question's entry, evidence/<name>.json, with the reading beside it. The
// trial's local bundle is no record, and nothing here reads it.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { compilePart, checkIR, loadRuntime } from '../../src/chart/draw.ts';
import { buildMachine } from '../../src/chart/machine.ts';
import { TRIAL_ID } from '../../src/trials/trials.ts';
import { completed } from '../../src/trials/answers.ts';
import { verifyAll } from '../../src/commands/verify.ts';
import { answerOf } from './evidence.ts';
import { fingerprint } from './files.ts';

export async function gradeBudget(workspace: string) {
  const before = fingerprint(workspace);
  try {
    const answer = JSON.parse(readFileSync(join(workspace, 'answer.json'), 'utf8'));
    assert.equal(answer.part, 'budget');
    assert.equal(answer.checker, 'chart');
    assert.equal(answer.proof, false, 'a chart result is not inductive proof');
    assert.equal(answer.thirdPaymentAllowed, false);
    assert.equal(answer.remainingCapacity, 0);
    assert.equal(answer.remainingInventory, 1);
    assert.ok(Array.isArray(answer.limitations) && answer.limitations.length > 0 && answer.limitations.every((x: unknown) => typeof x === 'string' && x.trim()), 'report limits');
    assert.ok(readFileSync(join(workspace, 'answer.md'), 'utf8').trim(), 'provide the human interpretation');
    const root = join(workspace, 'dossiers');
    const dir = join(root, 'parts/budget');
    const { ir } = compilePart(join(dir, 'prose.md'));
    assert.deepEqual(ir.errors, []);
    assert.equal(ir.tier, 'charted');
    assert.equal(ir.states.length, 1, 'one live operating state');
    assert.equal(ir.events.length, 1, 'only payment is in the task');
    assert.ok(ir.walks.some(w => w.steps.length === 3 && w.steps[2].refused), 'preserve the question as a three-payment walk');
    const check = await checkIR({ root, ir });
    assert.equal(check.outcome, 'pass', JSON.stringify(check));
    assert.equal(check.limitHit || false, false);

    // Identify the task's data by their distinct initial values, allowing the
    // agent to choose its names. Expectations come from the request above.
    const field = (initial: number) => {
      const candidates = ir.context.filter(d => d.initial === initial);
      assert.equal(candidates.length, 1, `one task datum initially ${initial}`);
      return candidates[0].name;
    };
    const capacity = field(2), inventory = field(3), paid = field(0);
    const rt = await loadRuntime(root);
    assert.ifError(rt.error);
    const machine = buildMachine(ir, rt.xstate!);
    let state = rt.xstate!.createActor(machine).getSnapshot();
    const event = { type: ir.events[0].name };
    for (let count = 1; count <= 2; count++) {
      assert.equal(state.can(event), true, `payment ${count} is enabled`);
      state = rt.xstate!.getNextSnapshot(machine, state, event);
      assert.equal(state.context[capacity], 2 - count);
      assert.equal(state.context[inventory], 3 - count);
      assert.equal(state.context[paid], count);
    }
    assert.equal(state.can(event), false, 'third payment is refused');
    assert.deepEqual(rt.xstate!.getNextSnapshot(machine, state, event).context, state.context, 'refusal changes no data');

    // Integrity first: an entry edited by hand, unbound, removed or left with an unclassified
    // miscall is a tripwire, and a tripwire voids every answer the grade would rest on.
    const verified = verifyAll({ root, version: '0.2.0', write: false });
    assert.deepEqual(verified.tripwires, []);
    const part = verified.parts.find(c => c.id === 'budget');
    assert.ok(part);
    assert.deepEqual(part.tripwires, []);

    assert.ok(typeof answer.trial === 'string' && TRIAL_ID.test(answer.trial), 'name a real trial id');
    const cited = answerOf(dir, answer.trial);
    assert.ok(cited, 'cite the trial that established a published answer: its entry in evidence/ names it');
    // The entry the trial established, as verify reads it under its integrity.json binding.
    const found = part.answers.find(a => a.name === cited.name);
    assert.ok(found && found.entry && found.entry.established.trial === answer.trial, 'verify reads the cited answer from its bound entry');
    assert.deepEqual(found.problems, []);
    assert.ok(completed(found), 'the cited answer completed');
    const { question, answer: observed, basis } = found.entry;
    assert.equal(question.kind, 'chart', 'the answer must cite the ordinary chart trial, not a sensitivity blunder');
    assert.equal(question.checker, 'chart');
    assert.equal(observed.result, 'as-called');
    assert.equal(observed.outcomes.checks, 'pass', 'the published chart checks passed');
    assert.equal(observed.limitHit || false, false, 'the published check completed its finite exploration');
    for (const walk of ir.walks.filter(w => w.steps.length === 3 && w.steps[2].refused)) {
      assert.ok(observed.covers?.includes(walk.id), 'the cited answer covers the three-payment walk');
    }
    assert.deepEqual(basis.snapshot.passages, ir.hashes, 'the answer rests on the current input');
    assert.ok(found.reading?.trim(), `interpret the published answer in evidence/${cited.name}.md; only a miscall requires a classification`);

    assert.ok(part.decisions.every(d => !d.malformed && d.verb === 'begin'), 'no owner decisions were authorized');
    assert.ok(Object.values(part.marks).every(m => m.mark !== 'proved' && m.owner !== 'settled' && m.owner !== 'rejected'), 'chart evidence never grants proof or owner decisions');
    return { outcome: 'pass', part: 'budget', trial: answer.trial, entry: `evidence/${cited.name}.json`, checks: ['task semantics', 'current published chart answer', 'interpretation present', 'bounded claim', 'owner boundary', 'read-only grading'], manual: [`Read answer.md and evidence/${cited.name}.md for unsupported claims and meaningful limitations.`] };
  } finally {
    assert.deepEqual(fingerprint(workspace), before, 'the grader must be read-only');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const workspace = process.argv[2];
  if (!workspace) { console.error('usage: node qualification/conformance/grade-agent.ts <workspace>'); process.exitCode = 2; }
  else try { console.log(JSON.stringify(await gradeBudget(resolve(workspace)), null, 2)); }
  catch (error) { console.error(JSON.stringify({ outcome: 'fail', reason: (error as Error).message }, null, 2)); process.exitCode = 1; }
}
