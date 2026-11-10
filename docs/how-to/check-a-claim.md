# Check a claim

Take a claim about a part or a composition, state the property or the walk that tests it, try it under the scenarios that matter, and read what the answer gives the claim.

The claim is a [behavior's claim](../explanation/behaviors.md). The agent writes it down first, as a hypothesis, in the behavior it belongs to. The steps below get evidence for the property or the walk that tests it. An [independent review](get-a-second-read.md) then assesses whether the evidence supports the claim. `dossier verify` resolves that evidence and combines it with the review's assessment. Verify does not judge whether the evidence supports the claim.

## Steps

1. **Say the claim.** The agent recognizes forms like these:

   - "check that nothing executes before the delay" becomes an Always.
   - "within 3 blocks of a schedule, the plan is resolved" becomes a Within, with the assumption it rests on.
   - "every plan is eventually resolved" becomes a Once, with its assumption.
   - "what if governance turns malicious?" becomes a scenario, and the property is tried under it.

   The agent records the claim in a behavior and writes the property that tests it. The property lands on the part it is about, or on the composition whose concern it belongs to. It starts unsettled. Settle it like any passage.

2. **Let the agent try it.** For each cell, the agent first writes a call, the file that says what will come back and why. `dossier call` writes the lines that identify the question the call asks: the model's files, the cell, and the properties to expect an outcome for, among them `TypeOK`, the model's type invariant. The agent writes the prediction: how far to look, the outcome each property will have, and why. It gives them as the options `--reach`, `--expect` and `--because`, or fills in the lines the command leaves empty. Then the agent runs the call with `dossier trial`, which runs the checker and records its answer. For Harbor's `control` composition under an offline executor:

   ```
   dossier call compositions/control n1-executor-offline tlc N1 --scenario executor-offline \
     --reach "delay 2; amounts up to 2; ceiling 2..4; effects up to 4" \
     --expect "TypeOK: holds" --expect "N1: violated" \
     --because "With the executor offline a scheduled plan is never executed and the ticks pass; the counter exceeds 3."
   dossier trial compositions/control n1-executor-offline.md
   ```

   A cell the agent expects to fail is called violated. The trial then shows the path to the violation as a trace.

3. **Let the agent plant a bug.** Every property needs a blunder it catches before its marks count. Until then the property shows `held`. A blunder counts only for the property's current text, so a property whose passage changes owes a new one. The agent chooses the wrong and writes the blunder with `dossier blunder`. The command copies the model and makes the one change. It also writes the configuration that enables only the property, and the blunder's call, here `calls/blunder-impatient.md`. The agent adds the reach and the reason, as for any call, and runs the call with `dossier trial`. The replaced text is a line of the composition's generated module, `model/generated/Control.tla`, which the agent reads first:

   ```
   dossier blunder compositions/control impatient \
     --replace 'TickStep == (Mode_chain /= "offline") /\ Tick /\ ~Due_public' \
     --with 'TickStep == (Mode_chain /= "offline") /\ Tick' \
     --property N1 --scenario all-honest --wrong "the chain ticks while an execute is due"
   dossier trial compositions/control blunder-impatient.md
   ```

4. **Ask for a proof when it matters.** Say "prove it". The agent runs Apalache in inductive mode. The cell becomes `proved` when Apalache's two checks pass: the base, that every initial state satisfies the invariant, and the step, that every action keeps it. Until a blunder is caught, the property's row also shows `held`, and a part's passage shows `held` in place of `proved`. A cell that only bounded answers speak for stays `checked`, with its reach.

5. **Widen a check.** Say "widen that check" to try larger ranges. The wider trial asks [the same question](../explanation/evidence.md#one-answer-per-question) again, and its answer takes the place of the narrower one. An answer that looks less far than the one it replaces is flagged `narrowed`. A narrower trial that finds no violation cannot replace one while nothing the violation rested on has changed, unless you let the violation go with [`forget`](record-a-decision.md#the-verbs).

6. **Map the answer to the claim.** The agent maps the claim to the cell, the passage or the walk the trial answered. It says why the answer supports the claim, challenges it or only illustrates it. A violated cell challenges a requirement. The requirement stays in the collection, and it reads contradicted once a review confirms the challenge.

## Read the answer

Say "where does that claim stand?" The agent runs `dossier where` with the claim's address, such as `compositions/control#resolve-plan/C1`, and the line gives the claim's standing. With a current answer in its favor, the claim reads `evidence available; mapping unreviewed` until a [review](get-a-second-read.md) assesses the mapping.

The cells beneath the claim carry the marks. Run `dossier verify` for current findings, or `dossier render` to update the composition's `ledger.md`. Each cell names its mark and the trial whose answer decides it:

- **`checked` or `proved`:** read the reach and the members it rests on, then the part ledgers' guarantees.
- **`violated`:** follow the trial's link to its entry, the file under the dossier's `evidence/` that holds the answer and its trace. To read the trace as a table of the values each step changed, run `dossier show <dossier> <entry>`, or ask the agent to, naming the entry by its file name without `.json`. The agent's reading sits beside the entry, in the file of the same name ending in `.md`, and retells the path in the actors' words. Then [record a decision](record-a-decision.md): accept the risk, add a control, or correct the prose. `violated, acceptance lapsed` means an answer other than the one you accepted now decides the cell. It may follow a change the cell's line names, come from a trial that looked further, or belong to another question on the cell. The violation waits for a new decision.
- **`open`:** the composition misses a member its closure requires, or the cell's scenario is not declared in `actors/scenarios.md`.
- **`lapsed`:** something the cell's answer rested on has moved since its trial. See [Refresh after a change](refresh-after-a-change.md).

[Marks](../reference/marks.md) defines every mark.
