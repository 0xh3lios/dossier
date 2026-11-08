# Chart and TLA differential qualification

This harness compares two independently executed translations of the same small prose input. The chart uses XState; the generated TLA+ module runs through TLC. A passing comparison establishes agreement for those finite inputs, not compiler correctness for all inputs or solver soundness.

From the plugin root, configure `JAVA` and `TLA_TOOLS` as described in [solver installation](../../docs/how-to/install-the-solvers.md), then run:

```bash
node qualification/differential/run.mjs --seed 0 --count 200 --out /tmp/dossier-differential-results
```

The output directory must be new. The run uses temporary working directories and leaves a summary with seed identities, source hashes, toolchain identity, per-case counts and failures. Failed inputs, generated models and TLC output remain under the output directory. These local diagnostic artifacts may contain machine paths; promote only a minimized, scrubbed mechanism into portable fixtures.

`node --test qualification/tests/differential.test.ts` always runs generator, dump-reader and minimizer regressions. When `TLA_TOOLS` is set it also runs actual component/composition checks and deliberate translation faults. Without it, the solver check explicitly skips; deterministic generator checks do not count as a solver run. TLC may require permission to start its local RMI listener in a restricted execution environment.

## Component comparison

`generate.ts` deterministically varies two or three states, three events, integer data ranges, event fields, guard order, assignments, resets and walks. The first 200 seeds contain at least 100 distinct inputs after removing the title. All inputs compile. Each includes a positive walk, a positive walk starting at a reachable noninitial state, and an intentionally false refusal-only walk. That last walk is expected to fail in both encodings.

`component.ts` explores the production chart, scaffolds the production TLA module, and adds observation variables without changing its original data or witness observers. A cloned action binds each event field to one declared value; this makes each event case observable instead of comparing an unlabeled union of transitions. TLC then checks:

- Exact reachable state/data sets and event/field-specific transition relations.
- Each production `Can_<move>` against chart enabledness over declared field values.
- `ENABLED` of each field-bound action against the chart's accepted and refused event cases at every reachable state.
- Existence of each generated witness observer's end against chart walk replay, including refused steps and noninitial starts.

Effect counters and witness observers are excluded from the state/data projection; witness outcomes are compared separately. Component cases contain no emitted effects, so counter saturation cannot conceal a transition discrepancy. The tested actions have one move per state/event and no priority conflict.

## Composition comparison

`composition.ts` writes raw actor and composition files, reads them through the production parsers and runs the production composer. Twelve cases use three members: a sender, a receiving sink and an independent clock observer. One family wires an effect emitted by a chain tick; another carries a field from an ordinary event. The sink's capacity can block delivery. Data carried from the source use its pre-transition value, even when the source changes that datum in the same step.

The reference composes the actual member charts in JavaScript. A delivered effect and its source move happen together or neither happens. Independent tick members move in the same global tick. A member with no enabled tick stays unchanged. Exact projected states and event-specific edges are compared with TLC, and the source's `Can_` predicate must account for target enabledness. The maximum number of sends is below the generated counter bound.

## Failures and limits

A component disagreement is reduced by deleting complete passage lines while the input remains compilable and the same kind of disagreement still occurs. The original input remains available. Execution/environment failures are retained without treating an invalid or unexecutable model as a semantic counterexample. Composition failures retain the complete small three-member input and its generated model.

The regression suite deliberately corrupts a generated enabledness predicate and a wired target update. Both must fail the comparison. This checks that the oracle can detect concrete translation defects; it is not a mutation-coverage percentage.

The common fragment excludes temporal liveness/fairness, Givens, malicious/offline modes, scenario windows, hierarchy/parallel regions, overlapping transition priority, final-state behavior, external knowledge and handwritten model refinements. Charts do not establish the temporal properties that TLC checks. The generator uses small integer fields and ranges; it is not a random sample of every valid grammar form. No generated test updates Harbor, any other dossiers, a ledger, an evidence bundle or an owner decision.

TLC's state dump and execution options are read from the installed `tlc2.TLC -help`. The parser supports the scalar and tuple values emitted by these test cases and rejects unsupported syntax instead of guessing.
