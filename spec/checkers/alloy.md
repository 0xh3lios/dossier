# Alloy

Read when writing an Alloy module or its call. Alloy checks structure, not time: who may call what, which signers sit on which multisig, which Breaker answers to which authority. The runner executes `java -jar $ALLOY_JAR exec -q -c <command> -t xml -s sat4j -r 1 -u -1 -f -o .running/<id>/alloy <als>` and reads the outcome from the `receipt.json` the Analyzer writes there, which is the Analyzer's own and not the runner's receipt, and from the presence of an XML solution. One command per trial.

## The module

Hand-written under `model/<Id>.als`. Signatures named as the prose names things. One `fact` per Seam, Guarantee or Always passage that is a rule of the structure, named `X<n>_<words>`, `K<n>_<words>` or `A<n>_<words>`. One `assert` and its `check` per structural Always, named `A<n>_<words>`, with the scope as reach. A `pred` or `fun` needs no passage. A fact, assert, check or run whose name does not begin with a passage id is the tripwire `fact without passage`.

A structural Always is written `[A2] Always, in structure, <words>.` in the prose. The chart skips it, and the Alloy check covers it.

## Outcomes

A `check` returns `no counterexample` or `counterexample`. A `run` returns `instance` or `no instance`. An assert whose check finds no counterexample covers its passage within the scope. A blunder is a copy under `model/blunders/` with one fact removed, whose check must find a counterexample.

## The call

Example `alloy-call`. Complete call form; plan against Harbor Breaker. The scope is not unbounded proof.

```
kind: alloy
executes:
  - model/Breaker.als
reach: scope 4
expect:
  A2_halts_from_governance: no counterexample
because: |
  X1 makes every halt come from a Breaker and K1 makes every Breaker answer to Governance.
```
