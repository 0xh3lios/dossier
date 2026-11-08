// What each completed answer of a component touched and covered, computed from its entry and never
// from its reading. An answer covers a passage only when, had the passage been false of the model,
// its trial would have returned otherwise.
import type { Ir } from '../prose/ir.ts';
import type { Basis, Reach, Readable, Verdict } from '../trials/answers.ts';

// One answer's touch on one passage: its entry and the trial that established it, how it ran, the
// passage's hash then, how far it looked, and the basis lapse compares with the present.
export interface Touch {
  entry: string;
  trial: string;
  kind: string;
  checker: string;
  result: Verdict;
  miscalled: boolean;
  hash: string | null;
  reach: Reach | null;
  basis: Basis;
  proved?: boolean;
  // The answer found this property violated, a counterexample the mark must not hide.
  violated?: boolean;
  grounded?: boolean;
  // The other passages the verdict on this one rested on, as the answer recorded them, such as the walk
  // that showed a refusal-only event refused. A change to one of them lapses this cover.
  leaned?: string[];
}
export interface Covers {
  // The answers that touched each passage, in the order established. A blunder touches only the passages it targets.
  touches: Record<string, Touch[]>;
  // The touches that covered it.
  covers: Record<string, Touch[]>;
  // The blunders' answers that caught each passage, and those that showed it hollow, by entry.
  caught: Record<string, string[]>;
  hollow: Record<string, string[]>;
}

// The passage a model-side name stands for: A1, Inv_A1, Inv_A1_lemma, NotW1, W1_End.
export const propertyId = (name: unknown): string | null => (String(name).match(/^(?:Inv_)?(A\d+|O\d+|N\d+|R\d+)(?:_\w+)?$/) || [])[1] || (String(name).match(/^Not(W\d+)$/) || [])[1] || (String(name).match(/^([AONRW]\d+)_/) || [])[1] || null;

export function coversOf({ completed, ir, hashes }: { completed: Pick<Readable, 'name' | 'entry'>[]; ir: Ir; hashes: Record<string, string> }): Covers {
  const touches: Record<string, Touch[]> = {}, covers: Record<string, Touch[]> = {}, caught: Record<string, string[]> = {}, hollow: Record<string, string[]> = {};
  const add = <T,>(map: Record<string, T[]>, id: string, item: T) => (map[id] ||= []).push(item);
  for (const a of completed) {
    const { question: q, call, answer: r, basis } = a.entry;
    const passageHashes = basis.snapshot.passages;
    const mismatched = new Set<string>();
    if (r.result === 'miscalled') {
      for (const [name, o] of Object.entries(call.expect)) {
        const got = r.outcomes[name];
        const missed = name === 'checks' ? true : got !== o.expect || (o.trace && (r.miscalls || []).some(m => m.startsWith(`${name}:`)));
        if (!missed) continue;
        if (name === 'checks') for (const id of (o.failing && o.failing.length ? o.failing : (r.failing || []))) mismatched.add(id);
        else { const id = propertyId(name); if (id) mismatched.add(id); }
      }
    }
    const touch = (id: string, more: { proved?: boolean; grounded?: boolean; violated?: boolean } = {}): Touch => ({ entry: a.name, trial: a.entry.established.trial, kind: q.kind, checker: q.checker, result: r.result, miscalled: mismatched.has(id), hash: passageHashes[id] || null, reach: r.reach || null, basis, ...more });
    const touchIds = new Set<string>(), coverIds = new Set<string>(), violatedIds = new Set<string>();
    // What a cover rested on beyond its own passage, by passage, as this answer recorded it.
    const leans: Record<string, string[]> = {};
    let proved = false, grounded = false;
    if (q.checker === 'chart') {
      if (q.kind === 'blunder') {
        // A blunder covers nothing. It counts only for the ids its call says it must break: caught where
        // the mutated machine fails them, hollow where it does not. Its other checks ran on a machine
        // that is not the prose's, and touch nothing.
        const targets = call.expect.checks?.failing || [];
        for (const c of r.checks || []) for (const id of c.ids) if (targets.includes(id)) touchIds.add(id);
        for (const id of targets) { if ((r.failing || []).includes(id)) add(caught, id, a.name); else add(hollow, id, a.name); }
      } else for (const c of r.checks || []) for (const id of c.ids) { touchIds.add(id); if (c.status === 'passed') { coverIds.add(id); if (c.rests && c.rests.length) leans[id] = [...(leans[id] || []), ...c.rests]; } else if (c.status === 'failed') violatedIds.add(id); }
    } else if (q.checker === 'alloy') {
      for (const [cmd, outcome] of Object.entries(r.outcomes)) {
        const id = (cmd.match(/^([SEMRAONGWXKT]\d+)(?:_|$)/) || [])[1];
        if (!id) continue;
        touchIds.add(id);
        if (q.kind === 'blunder') { if (outcome === 'counterexample' || outcome === 'no instance') add(caught, id, a.name); else add(hollow, id, a.name); continue; }
        if (outcome === 'no counterexample' || outcome === 'instance') coverIds.add(id);
        else if (outcome === 'counterexample' || outcome === 'no instance') violatedIds.add(id);
      }
    } else if (q.checker === 'apalache') {
      for (const [name, outcome] of Object.entries(r.outcomes)) {
        const id = propertyId(name);
        // NotW<n> holding means the walk is never reached, so Apalache's result says nothing for it.
        if (!id || /^W\d+$/.test(id)) continue;
        touchIds.add(id);
        if (q.kind === 'blunder') { if (outcome === 'violated') add(caught, id, a.name); else if (outcome === 'holds') add(hollow, id, a.name); continue; }
        if (outcome === 'holds') { coverIds.add(id); proved = r.mode === 'inductive'; }
        else if (outcome === 'violated') violatedIds.add(id);
      }
    } else if (q.checker === 'tlc') {
      const outcomes = r.outcomes;
      // A run that stopped at a violation reports the other properties as holding so far: partial,
      // which covers nothing and shows nothing hollow.
      const partial = new Set(r.partial || []);
      for (const name of r.enabled) {
        const id = propertyId(name);
        // A blunder catches a property. Reaching a walk's end in a broken module shows nothing.
        if (!id || (q.kind === 'blunder' && /^W\d+$/.test(id))) continue;
        touchIds.add(id);
        if (q.kind === 'blunder') { if (outcomes[name] === 'violated') add(caught, id, a.name); else if (outcomes[name] === 'holds' && !partial.has(name)) add(hollow, id, a.name); continue; }
        if (/^(A|O|N|R)\d+$/.test(id) && outcomes[name] === 'holds' && !partial.has(name)) coverIds.add(id);
        else if (/^(A|O|N)\d+$/.test(id) && outcomes[name] === 'violated') violatedIds.add(id);
        if (/^W\d+$/.test(id) && /^NotW/.test(name) && outcomes[name] === 'violated' && r.result === 'as-called') coverIds.add(id);
      }
      if (q.kind === 'tlc') {
        // A refusal with no property is covered by absence: no action encodes a
        // Move for the pair, every Move has its action, and no action lacks a Move.
        const actions = Object.values(r.actions || {}).filter(act => act.move);
        const movesComplete = ir.transitions.every(mv => actions.some(act => act.move === mv.id)) && actions.every(act => hashes[act.move!]);
        for (const rf of ir.refusals) {
          if (r.enabled.includes(rf.id) || !movesComplete) continue;
          const pairs: [string, string | null][] = [];
          for (const st of rf.states) for (const ev of (rf.events === 'every' ? ir.events.map(e => e.name) : rf.events)) pairs.push([st, ev]);
          const absent = pairs.every(([st, ev]) => !ir.transitions.some(mv => mv.from === st && mv.event === ev && actions.some(act => act.move === mv.id)));
          if (absent || rf.cond) { touchIds.add(rf.id); if (absent) coverIds.add(rf.id); }
        }
        const init = ir.states.find(s => s.key === ir.initial);
        if (init && r.init && r.init.generated > 0) { touchIds.add(init.id); coverIds.add(init.id); }
        for (const act of actions) {
          const ids: string[] = [];
          if (act.move) ids.push(act.move);
          for (const ev of ir.events) if (ev.name === act.event) ids.push(ev.id);
          for (const st of ir.states) if ((act.targets || []).includes(st.key)) ids.push(st.id);
          for (const id of ids) { touchIds.add(id); if ((act.generated || 0) > 0) coverIds.add(id); }
        }
      }
    } else if (q.checker === 'external') {
      grounded = true;
      for (const id of r.covers || []) { touchIds.add(id); if (r.result === 'as-called') coverIds.add(id); }
    }
    for (const id of touchIds) if (hashes[id]) add(touches, id, touch(id, violatedIds.has(id) ? { violated: true } : {}));
    for (const id of coverIds) if (hashes[id] && r.result !== 'aborted' && !mismatched.has(id)) add(covers, id, { ...touch(id, { proved, grounded }), ...(leans[id] ? { leaned: [...new Set(leans[id])] } : {}) });
  }
  return { touches, covers, caught, hollow };
}
