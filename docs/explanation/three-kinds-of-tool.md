# Three kinds of tool

Dossier uses three kinds of tool, and each does a different job. Keeping them apart lets a mark say exactly which kind of tool established it.

## The chart designs

The chart checks whether the prose is coherent. The XState chart is compiled from the prose, and the agent redraws and checks it with `dossier draw` each time it edits the prose. It explores every state and every value within the declared ranges, which takes seconds, and records nothing. What it finds comes back to the author: a pair of state and event nobody said, two guards that hold at once, a walk that ends in the wrong state, a datum that leaves its range.

The chart knows nothing about actors or assumptions. A statement that fails on the chart without any assumption in force cannot stand as an Always on its own, however good it looks under fairness in a model. It is a Within or a Once with the Given it needs, or an Always that cites a step Given, one with `prompt` or `only when`. The chart skips such an Always, and the solvers check it under scenarios.

A chart trial records the chart's checks through the runner, which marks the states, events, moves, refusals and walks as `drawn`. In a charted part, where no model follows, it marks them `checked`.

## The trials check

The trials check whether the composition keeps its properties. The solvers run on models scaffolded from the same compiled prose:

- **TLC** explores every reachable state within the bounds a configuration sets. It checks invariants, finds traces for walks, and checks liveness under fairness. Its marks say `checked`, with the reach beside them.
- **Apalache** checks symbolically. In bounded mode it looks for a violation within a number of steps. In inductive mode it proves that an invariant holds in every state the model can reach, with no bound on steps. Only an inductive proof makes a mark `proved`.
- **Alloy** checks structure rather than what happens over time: who may call what, which signers sit on which multisig.

A model lets the actors, the parts and the chain move in any order. TLC and Apalache explore every order within their bounds, including orders no test was written for.

A solver runs in a trial, with a call written before it and an answer recorded after it. At this level a counterexample is a path to a failure, and it is the most useful thing a trial can return.

## The grounding backs

The grounding shows whether the abstraction matches the deployed code. The abstraction leans on facts about the deployed code that it does not model itself. Those facts are written as Guarantee passages, and each names what backs it:

- **A Certora rule at a pinned commit**, found in the knowledge base's source cache.
- **A record**, such as an invariant your team already keeps.
- **A runner**, such as a replay against a fork of the deployment.

Dossier does not run any of these as proofs of its own. It records which guarantee each one backs, and lapses the marks that rest on it when the backing moves.

Example walks can be replayed against the deployment by a runner you provide. A walk the runner passed is marked grounded when the trial came back as called. It shows that the abstraction and the real thing agree on that path. Parts also pin the records that fix their instance, such as a checkpoint observation. When a pinned record changes, the model-side marks and the cells that rest on it lapse.

The chart and the trials need no code, and only the grounding does. A design can be drawn and checked before its code exists, and grounded once there is a deployment or a stand-in to replay against.

## What each kind gives a claim

A [behavior's claim](behaviors.md) rests on what these tools record, and the kind of tool limits what the claim can say. A walk that the chart or a solver replayed shows one path. A bounded check supports a claim within its reach, and an inductive proof within the model's ranges. All of these are about the model. A claim about the source or about a deployment also needs a backing from the grounding. [Marks](../reference/marks.md#kinds-of-evidence) lists the kinds of evidence. Neither a mapping nor a review can make one stronger.
