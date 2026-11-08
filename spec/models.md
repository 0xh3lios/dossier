# Models and trials

Models encode prose, and calls predict trials. Pending calls live in `calls/`. `dossier trial` validates and executes them, and each trial's answer goes to its question's entry, where the agent reads it. [The shared process](process.md) defines the sequence and owner boundary. This page defines its model, call and reading contracts.

## The scaffold

`dossier scaffold <part>` writes `model/<Id>.tla` from the prose once, and the configurations beside it: `<Id>.cfg` for the ordinary trial with TypeOK and every Always and Within, `<Id>_O<n>.cfg` per Once, `<Id>_W<n>.cfg` per walk. `<Id>` is the part's id with each hyphenated segment capitalized and the segments joined, such as `PasFiniteKey` for `pas-finite-key`. A later scaffold writes `<Id>.scaffold.tla` beside the hand-refined module for diffing. The hand-refined module is the one trials run.

What the scaffold holds, and what the ledger reads back from it:

Example `scaffold-shape`. Schematic operator list with placeholders; not an executable TLA+ module.

```
VARIABLES  state, each datum, sent_<effect> per effect, <n>_ticks per Within, w<n>_at per Walk
Init       the first State passage and every starting value
Can_M<n>_<Event>   enabledness of each move as a state predicate, with an only when condition conjoined
Due_<Actor>        the Can_ predicates of the actor's prompt events, commented \* G<n>: acts before the next tick
M<n>_<Event>       one action per Move: state, guard, an only when condition commented with its Given's id, ~Due_<Actor> on the chain's ticks, the changes, the effects, UNCHANGED, the ghost tick counters
<Sender>   the disjunction of one sender's moves, for an actor or a part that sends
Next       the disjunction of every sender, actors and part senders alike
<Actor>_<Event>    the actor's moves of the event a Given names, such as Public_Exec == M5_Exec
Spec       Init /\ [][Next]_vars, then per Given with an actor: WF_vars(<Actor>_<Event>) with on, WF_vars(<Actor>) without, nothing for only when without prompt; commented \* from G<n>
TypeOK, SentBounded, A<n>, O<n>, N<n>, Inv_<A or N>, W<n>_End, NotW<n>
```

A walk's observer `w<n>_at` counts the walk's steps as they fire with their arguments and resets on any other step, so `W<n>_End` is reached only along the walk's own path and a witness means that path, not merely its end. The observer arms only when the first step is taken from the walk's `from` state, and at a refused step it checks that the event's move is not enabled there. A Within's `<n>_ticks` counts ticks while the trigger holds and saturates one above the bound.

The reader takes an action's Move from its name, its event from the suffix, and its targets from the `state' = "..."` it writes. It takes a property's passage from its name, and a fairness clause's Given from its comment. An action whose Move is not a passage, a property whose passage does not exist, and a fairness clause with no Given are tripwires.

## Refining by hand

The scaffold says what the prose says. You add what the prose implies and TLC or Apalache need. That is a history variable commented `\* history for A<n>`, on the line that declares it or alone on the line above, when an Always speaks of the past, a strengthened `Inv_A<n>` when TypeOK and A<n> are not inductive on their own, or a walk's observer when its end state is visited earlier along the way. Every element keeps a passage's name. You never add a state, an event or a guard the prose lacks. That is a passage first. An edit to the refined module lapses the answers that executed it, so their questions are asked again.

## Calls

Example `tlc-call`. Complete call; plan against Harbor Timelock and its ordinary configuration.

```
kind: tlc
executes:
  - model/Timelock.tla
  - model/Timelock.cfg
reach: one plan; delay 2; effects up to 4
expect:
  TypeOK: holds
  A1: holds
  N1: holds
because: |
  A1: execute is guarded by remaining 0. N1: the executor is prompt and the chain waits.
```

Kinds: `tlc` (ordinary, witness, liveness by the configuration), `apalache` (bounded or inductive), `alloy`, `external`, `blunder`, `chart`. Every enabled property has a line under `expect`, and every line names an enabled property. Every path under `executes` lies inside the dossier. The runner refuses otherwise.

- A witness configuration enables TypeOK and one `NotW<n>`. The call expects `NotW<n>: violated; trace: <state>/<data> > ...` with `trace-data: <the variables after the slash>`, each a variable of the module. A composition's witness is called the same way, naming `walk:` and the walk's own `scenario:`, with a trace of the `trace-data` values alone, as [Composition](composition.md) shows.
- A liveness configuration enables one `O<n>`.
- An Apalache call sets `mode: bounded` with `length: <steps>`, or `mode: inductive`, with `inv: Inv_A<n>` and `cinit: ConstInit`. Inductive runs the step from the invariant and the base from Init, and both must pass.
- A blunder executes a copy under `model/blunders/`, enables exactly one property, expects it `violated`, and says `blunder: <the wrong, in words>`. `base:` names the module copied, and is required when `model/` holds more than one module. The runner diffs the copy against its base, and refuses a copy that changes what the property asks: the property, a definition it reads, a Within's tick counter or a history variable it keeps, or the value the base gives a constant they read. For Alloy, that is the assertion checked and the preds and funs it reads.
- An external call names `runner: <id>` from `dossier.json` and expects `pass` or `fail` per id the runner reports.

## Blunders

Every Always, Once and Within has at least one blunder that catches it. Until then its mark is held. A blunder that fails to catch it makes it hollow, and only a later blunder that catches it clears that. A blunder counts only at the property's current text, so a changed passage owes a new one. A doubt's other alternative is usually the best blunder. Good blunders: a guard loosened, a change dropped, a prompt guard removed, an only when condition dropped, a fairness clause dropped, a fact removed. A blunder changes the model, never the property. A property no blunder can catch says nothing. Take it back to the prose.

## Reach

Keep the reach small enough to finish and large enough that every action fires and every walk completes. The runner records the constants, the scopes or the step bound beside the words you give. An ordinary answer on a property that looks less far than the answer established before it is flagged `narrowed`. When it replaced that answer, its entry keeps the further reach until an answer looks as far again. An inductive proof's reach is unbounded, and the call says so.

## Running the calls

`dossier trial <part> <call.md>` validates the call and relevant integrity, or refuses without changing dossier records or generated views. A valid call is executed from a private copy, and the trial leaves a bundle: the call as captured, `output.txt`, `result.json` with its snapshot and input identities, and `receipt.json`. [Publication](storage.md#trials-and-answers) decides what its answer does to the question's entry. The verdict `as-called` means every outcome matches its expectation, `miscalled` means a completed trial's outcomes disagree with the call, and `aborted` means the checker started without a complete verdict. A missing checker is a refusal. `--timeout`, `--workers` and `--limit` must be numbers. A trial whose answer the evidence rules refuse exits 2, writes no entry and leaves its call pending. An aborted trial on a question that has an entry writes none either, and its call stays pending. The only authored file beside an entry is its reading.

## Execution identity

Each answer's basis holds the trial's `inputIdentity`: `strategy: private-copy`, a `files` map of normalized dossier-relative paths to SHA-256 digests, a list of `shared` libraries and a `limitation` statement. The map includes the call's declared files and reachable local model imports. Built-in solvers run those copied files. Generated composition paths identify the canonical composed module, not a cached view. A changed or missing captured dependency lapses the answer. An unrelated local module does not.

The supported local dependency forms are static TLA+ `EXTENDS`, `INSTANCE` and configuration module overrides, and Alloy `open`. Unsupported local forms, missing nonstandard imports and nested TLA+ modules are refused instead of being silently omitted. Standard TLA+ libraries and Alloy `util/` modules remain shared. An answer whose basis holds no `inputIdentity` stays readable, and its identity is the executed files it lists. No import it did not record is inferred.

This is not a hermetic environment. Toolchains, libraries, the chart runtime and an external runner's command, root, working directory or undeclared dependencies remain outside the copied-file identity. External runners receive copied declared file paths but can observe their live environment. Their answer supports only the replay and the scope it records.

## Your reading

After every trial whose answer is written, write its reading, `evidence/<name>.md`. A trial that confirms the current answer writes no entry, and the reading beside it stands. This requirement keeps an explicit interpretation hand-off. It does not ask for a second copy of the answer's counters or of evidence status. An ordinary reading may briefly identify the supported claim, its scope and any assumptions or warnings, referring to the answer for measurements. For a witness, retell the trace as a walk. For a blunder, say what the wrong was and why the property is therefore not hollow. For a miscall, write the retelling and the classification line [the next section](#classifying-a-miscall) gives. The verifier computes covers independently and reads a reading only for its classification. A reading's presence alone does not prove the author examined the answer. Agent exercises test that interpretation separately.

## Classifying a miscall

A miscalled answer whose reading has no `classification:` line is the tripwire `miscall unclassified`, and [ANSWER-MISCALL](evidence.md#questions-and-answers) refuses a new answer to its question until it has one. The line is `classification:` followed by one of the five classifications below, word for word, with the explanation on the lines after it. The route reads the line whole, so any other wording is the tripwire `classification unknown`. Classify in this order:

1. Retell the trace: each step as `<state/data> --event--> <state/data>`, naming the action and the Move it encodes.
2. If a step's action encodes no Move, or its guard differs from the Move's condition, write `classification: model misread prose, action`. Fix the action, and a new call and trial follow.
3. Else compare the failing property clause by clause with its passage. If it says something the passage does not, write `classification: model misread prose, property`. Fix it, and it shows reworded until a new answer.
4. Else replay the same events on the chart. If the chart ends elsewhere, write `classification: chart differs from prose`, which means the compiler and the model disagree. Report it as a defect of the tool.
5. Else every step is licensed by the prose and the property is faithful, so the prose contradicts itself. Write `classification: prose at fault`, propose the change as two walks, and stop. The decision loop takes it.
6. If the outcome is what the prose implies and only your prediction was wrong, write `classification: call was wrong`. The answer stays a miscall until a new answer to its question replaces it, and the entry then keeps it, with its classification, as `previous`. It is history, not a score.

The mark follows the answer, not the call. The forbidden move has a signature. You are about to change a guard, a property, a Given or a reach so that a trial comes back as called. Stop, and write a doubt.
