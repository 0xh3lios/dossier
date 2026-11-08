# Apalache

Read when trying an Apalache call. Apalache checks TLA+ symbolically with an SMT solver: bounded checks with symbolic constants, and inductive invariants, which is how a mark becomes `proved`. The runner executes `apalache-mc check --inv=<inv> --length=<n> [--init=<op>] [--cinit=<op>] --no-deadlock --out-dir=.running/<id>/apalache/<label> <tla>` from the module's folder, with one work folder per invocation: `bounded` for a bounded check, and `step` and `base` for an inductive one. Deadlock checking is off, as it is for TLC. It reads the outcome from the line `The outcome is:`, and the ITF trace from the folder the `Output directory:` line names. `NoError` holds and `Error` is a counterexample. Any other outcome, such as `ExecutionsTooShort` when no execution reaches the length, says nothing of the invariant, and the trial is aborted with that reason. The runner copies the trace into `result.json` and the log into `output.txt`, and removes the work folder.

## Modes

- `mode: bounded`, `length: <steps>`: no violation within that many steps from Init. The reach is the length.
- `mode: inductive`, `inv: Inv_A<n>`: two invocations. The step: `--init=Inv_A<n> --inv=Inv_A<n> --length=1`, every state satisfying the invariant steps to one that does. The base: `--inv=Inv_A<n> --length=0`, Init satisfies it. Both must say NoError. The reach is unbounded.

`cinit:` names the operator that assigns the constants: `ConstInit` in a component, and in a system exactly `ConstInit_<scenario>` for the cell's own scenario, with its hyphens as underscores, such as `ConstInit_all_honest`. The composer writes one for each scenario a cell or a walk claims and for `all-honest`, and no other, so checking a property under a scenario needs the property to claim it.

## Writing for Apalache

Every variable and constant carries a type annotation, which the scaffold and the composition write. Apalache has no ENABLED, which is why the scaffold writes `Can_` and `Due_` predicates. Fairness is ignored, so Once passages are TLC's. Within passages are invariants over a ghost counter and belong here. `CONSTRAINT` in a configuration is not read, and the counters saturate instead.

An invariant that is true but not inductive fails the step on a state no execution of the model reaches, which is the usual cause. Strengthen it with the lemmas the prose already states. In a component's module, redefine `Inv_A<n>` keeping its name. In a system, add `Inv_A<n>_<words>` to `model/extras.tla` and name it under `inv:`. Say in the reading what you added and why the prose implies it. Classify the miscall that showed the need `call was wrong`. In a component the strengthened invariant keeps its name, so its answer replaces the miscall, and the entry keeps the miscall as `previous`. In a system `Inv_A<n>_<words>` asks a new question, so the miscall keeps its own entry, superseded but holding a counterexample, until the owner forgets it ([ANSWER-DROP](../evidence.md#questions-and-answers)).

## Writing the call

Example `inductive-call`. Complete call form; plan against Harbor Vault. This test does not execute induction.

```
kind: apalache
mode: inductive
inv: Inv_A1
cinit: ConstInit
executes:
  - model/Vault.tla
reach: unbounded; TypeOK and A1 inductive
expect:
  Inv_A1: holds
because: |
  Every action adds or removes the same amount on both sides.
```

A blunder for Apalache is a copy under `model/blunders/` with `mode: bounded` and a length that reaches the wrong. It expects `violated`.
