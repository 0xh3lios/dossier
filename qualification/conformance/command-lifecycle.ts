// Qualification expectations, independently stated before commands execute.
// No machine state is persisted in a dossier or consulted by production code.
// Selected paths cover these commands; they do not prove arbitrary histories,
// concurrent writers, or every crash boundary of the publication protocol.
import { createMachine } from 'xstate';

export const commandLifecycle = createMachine({
  id: 'commands', initial: 'empty',
  on: { READ: {}, RENDER: {} },
  states: {
    empty: { on: { AUTHOR: 'pending' } },
    pending: { on: { CHECK: 'checked', ABORT: 'aborted', INTERRUPT_ANSWER: 'bound' } },
    aborted: { on: { RETRY: 'retried' } },
    checked: { on: { EDIT: 'lapsed', INTERRUPT_DECISION: 'pendingDecision' } },
    lapsed: { on: { REFRESH: 'refreshed' } },
    bound: { on: { RECOVER_ANSWER: 'recovered' } },
    pendingDecision: { on: { RECOVER_DECISION: 'settled' } },
    retried: {}, refreshed: {}, recovered: {}, settled: {},
  },
});

export const commandEvents = ['AUTHOR', 'CHECK', 'ABORT', 'RETRY', 'EDIT', 'REFRESH', 'INTERRUPT_ANSWER', 'RECOVER_ANSWER', 'INTERRUPT_DECISION', 'RECOVER_DECISION', 'READ', 'RENDER'].map(type => ({ type }));

export function commandExpectation(state: unknown) {
  const name = String(state);
  const marks: Record<string, string> = {
    pending: 'pending', aborted: 'pending', bound: 'pending',
    checked: 'checked', pendingDecision: 'checked', retried: 'checked',
    refreshed: 'checked', recovered: 'checked', settled: 'checked', lapsed: 'lapsed',
  };
  if (!marks[name]) throw new Error(`no command expectation for ${name}`);
  return {
    mark: marks[name], owner: name === 'settled' ? 'settled' : 'unsettled',
    tripwire: name === 'bound' ? 'answer publication incomplete' : name === 'pendingDecision' ? 'decision publication incomplete' : null,
    successful: !['pending', 'aborted', 'bound'].includes(name),
  };
}

// Harbor ships Control's N1 under executor-offline violated with the risk accepted, so a path
// on a copy of Harbor starts at accepted; a fresh system starts at pending. The acceptance holds
// while the cell's entry still names the trial the owner was shown (spec/evidence.md). EDIT moves
// the property's words and SHIFT something else that answer rested on, such as the scenario under
// the same name or a member: either lapses the cell, and the violation a refresh shows owes a new
// decision. RERUN repeats the trial at the same reach on the same basis, which gives the same
// answer, writes nothing and keeps the acceptance. REACH reruns it at a new reach on the same
// basis: a new answer, still violated, which replaces the entry and owes a new decision.
export function riskLifecycle(initial: 'pending' | 'accepted') {
  return createMachine({
    id: 'riskCommands', initial,
    on: { READ: {}, RENDER: {} },
    states: {
      pending: { on: { VIOLATE: 'violated' } },
      violated: { on: { ACCEPT: 'accepted' } },
      accepted: { on: { ACCEPT: {}, RERUN: {}, REACH: 'violated', EDIT: 'lapsed', SHIFT: 'lapsed' } },
      lapsed: { on: { REFRESH: 'violated' } },
    },
  });
}

export const riskEvents = ['VIOLATE', 'ACCEPT', 'RERUN', 'REACH', 'EDIT', 'SHIFT', 'REFRESH', 'READ', 'RENDER'].map(type => ({ type }));
export function riskExpectation(state: unknown) {
  const name = String(state);
  if (!['violated', 'accepted', 'lapsed'].includes(name)) throw new Error(`no observed risk expectation for ${name}`);
  return { mark: name === 'lapsed' ? 'lapsed' : 'violated', accepted: name === 'accepted' };
}
