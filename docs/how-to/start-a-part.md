# Start a part

Write a part's dossier until its prose is settled and its chart passes.

## You need

A repository set up for dossiers. See [Set up a repository](set-up-a-repository.md).

## Steps

1. **Ask for it.** Say "start a dossier for the timelock module".

   - When the knowledge base has the module, the agent runs `dossier import timelock`. That drafts a `prose.md` that compiles, and a `margin.md` listing what the records say: actors, operations, invariants, quantities, edges and Certora rules. A rule from an upstream repository's cache stays in the margin for review.
   - When there is no module, the agent runs `dossier decide timelock begin`, which writes an empty skeleton. Add `charted` to stop at the chart. The default is `modeled`.

2. **Let the agent write the abstraction.** It turns the draft into passages: the boundary with each datum's range, the states, the events and who sends them, the moves and refusals, the properties and their assumptions, the walks, the seams and the guarantees. [Prose](../reference/prose.md) has every form.

3. **Read the chart.** Each time the agent edits `prose.md`, it redraws the chart and checks it. After an edit of your own, say "draw it". Open `chart/grid.md`, the chart's table of states by events, or [open the explorer](open-the-explorer.md) to see the statechart beside the prose. A pair marked `unsaid` is a sentence the prose still owes.

4. **Settle the passages.** Read them as claims about your part. Accept the ones that are right, and reject one with your reason, through the decide skill:

   ```
   timelock accept S1 S2 E1 M1 M2 -- "two blocks of delay, then anyone executes"
   timelock reject M4 -- "the delay is set per plan, not fixed"
   ```

   The agent rewrites a rejected passage under the same id.

5. **Give each doubt its answer.** When a passage can be read two ways, the agent writes a doubt in `doubts.md` as two walks that differ and carries on with one of them. Pick the walk that matches your part, again through the decide skill:

   ```
   oracle answer D1 a -- "a stale price is still a price"
   ```

6. **Let the agent record and try.** A chart trial records the chart's checks. In a modeled part, the agent then scaffolds the TLA+ model, writes calls with `dossier call` and a blunder for each property with `dossier blunder`, runs the trials, and reads their answers.

## Check

Say "where are we?", or run `dossier verify`. When its next step is `Review`, nothing is owed but a second read: [get one](get-a-second-read.md). The part is done when its next step is `Report`. Run `dossier render` to save `ledger.md` with your column and the machine's for every passage.

## See also

- [Record a decision](record-a-decision.md) for every decision form.
- [Back a guarantee](back-a-guarantee.md) for the K passages.
