# TLA+ with TLC

Read when trying a TLC call. The runner executes `java -XX:+UseParallelGC -cp $TLA_TOOLS tlc2.TLC -tool -coverage 1 -workers <n> -cleanup -metadir .running/<id>/states -config <cfg> <tla>` from the module's folder, with Java's temporary files under `.running/<id>/states/`. `--workers` sets n, 1 by default. Outcomes come from TLC's framed messages, never from matching human text.

## Configurations

- `<Id>.cfg`: `SPECIFICATION Spec`, `CONSTANT MaxSent = 4`, `CONSTRAINT SentBounded`, `CHECK_DEADLOCK FALSE`, `INVARIANTS TypeOK A1 ... N1 ...`.
- `<Id>_O<n>.cfg`: `PROPERTIES O<n>` alone, because TLC reports a temporal violation without naming which property.
- `<Id>_W<n>.cfg`: `INVARIANTS TypeOK NotW<n>` and nothing else.
- A blunder's cfg beside its module under `model/blunders/`: exactly one property.
- A system's cfgs are generated per cell under `model/generated/`, with the scenario's modes, windows and start as constants, and one per walk, `W<n>_<scenario>.cfg`, which enables `TypeOK` and the walk's `NotW<n>` under the walk's scenario. A system's cell call executes exactly its own `<Property>_<scenario>.cfg`, with the scenario's hyphens as underscores. A system's witness call names `walk:` and `scenario:` in place of `property:`.

Deadlock checking is off because final states take no step. Use symmetry sets only where the prose makes values interchangeable, and never with a liveness property.

## What the runner parses

When TLC completes, every enabled property `holds`. `Invariant X is violated` or `Action property X is violated` gives X `violated` and the others `holds` as far as explored, listed under `partial`. A property under `partial` is not covered by that answer. A temporal violation gives the O property `violated`. Coverage rows give each action's counts, and an action that generated no state covers nothing. A trace is read state by state with its action and values. For a component's witness the runner compares it to the called trace by `state` and the `trace-data` variables. For a system's witness it compares the `trace-data` values alone.

When `TLA_TOOLS` is unset or names no file, the runner refuses the trial before anything runs, with exit 2 and nothing written. A parse error, an exception or a timeout makes a trial that started `aborted`, and [ANSWER-ABORTED](../evidence.md#questions-and-answers) says what becomes of its answer. Parenthesize an implication's antecedent in an action property, since TLC reads `[state \in` as the start of a function.

## Writing the call

Say under `expect`, per property, what will come back, and why in `because`. For a witness, write the trace the walk's steps produce, such as `NotW1: violated; trace: Idle/0 > Scheduled/2 > Scheduled/1 > Scheduled/0 > Idle/0` with `trace-data: remaining` in Harbor's Timelock. A refused step leaves no state, and the observer checks that the event is refused there. The observer arms only when the first step is taken from the walk's `from` state, so no other path reaches `W<n>_End`. For a blunder, write the one property and `violated`, and under `blunder:` what is wrong in words. Give the reach in words beside the constants.
