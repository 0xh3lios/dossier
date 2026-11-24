# Start a part

Write a part's behavior collection and check its formal model. The collection explains the mechanism, and its mappings lead to the evidence behind each claim.

## You need

A repository set up for dossiers. See [Set up a repository](set-up-a-repository.md).

## Steps

1. **Ask for it.** Say "start a dossier for the timelock module".

   - When the knowledge base has the module, the agent runs `dossier import timelock`. That creates an empty behavior collection. It also drafts a `prose.md` that compiles, and a `margin.md` listing what the records say: actors, operations, invariants, quantities, edges and Certora rules. A rule from an upstream repository's cache stays in the margin for review.
   - When there is no module, the agent runs `dossier decide timelock begin`, which writes an empty skeleton, a collection README and `behaviors/`. Add `charted` to stop at the chart. The default is `modeled`.

2. **Write the account and the abstraction.** The agent drafts the README's orientation and the first behaviors. Each claim is a hypothesis until it has evidence and a review. [Write a behavior](write-a-behavior.md) gives the steps, and the [behavior contract](../../spec/behaviors.md) defines the files. Keep the collection's reading order current as behaviors are added. The agent then writes the formal passages: the boundary with each datum's range, the states, the events and who sends them, the moves and refusals, the properties and their assumptions, the walks, the seams and the guarantees. [Prose](../reference/prose.md) has every form.

3. **Place it in the map.** Once the README says what the part is, ask the agent to place it in the [map](arrange-the-map.md) at the top of the root's `README.md`, or run `dossier place` yourself:

   ```bash
   dossier place parts/timelock timelock --title "Timelock" --lead "Holds one plan while its delay runs down, then sends its change to the Vault."
   ```

   That creates the component `timelock` at the top of the map and holds the whole dossier there. With `--parent <group>`, a new component goes under a group that exists, and [Arrange the map](arrange-the-map.md) shows how to create one. Neither `begin` nor `import` places a part, so verify notes a new part as `dossier unplaced` until a component holds it. The note blocks nothing, and a placement changes no claim's standing.

4. **Read the chart.** Each time the agent edits `prose.md`, it redraws the chart and checks it. After an edit of your own, say "draw it". Open `chart/grid.md`, the chart's table of states by events, or [open the explorer](open-the-explorer.md) and its Chart to see the statechart beside the prose. A pair marked `unsaid` is a sentence the prose still owes.

5. **Settle the passages.** Read them as statements about your part. Accept the ones that are right, and reject one with your reason, through the decide skill:

   ```
   timelock accept S1 S2 E1 M1 M2 -- "two blocks of delay, then anyone executes"
   timelock reject M4 -- "the delay is set per plan, not fixed"
   ```

   The agent rewrites a rejected passage under the same id.

6. **Give each doubt its answer.** When a passage can be read two ways, the agent writes a doubt in `doubts.md` as two walks that differ and carries on with one of them. Pick the walk that matches your part, again through the decide skill:

   ```
   oracle answer D1 a -- "a stale price is still a price"
   ```

7. **Let the agent record and try.** A chart trial records the chart's checks. In a modeled part, the agent then scaffolds the TLA+ model, writes calls with `dossier call` and a blunder for each property with `dossier blunder`, runs the trials, and reads their answers. It then maps each answer to the claim it tests.

## Check

Say "where are we?", or run `dossier verify`. Its `map:` line stops counting the part as unplaced once a component holds it. Once the earlier steps are done, verify gives the part the next step `Review`. It stays there until a current review of the whole dossier has examined every item and assessed every mapping conclusively. It cannot tell whether the behaviors explain the part well, or whether the review judged rightly. [Get an independent review](get-a-second-read.md), and report its scope and what it left out. Run `dossier render` to save `ledger.md` with your column and the machine's for every passage.

## See also

- [Read a dossier](read-a-dossier.md) to follow a claim down to its evidence.
- [Record a decision](record-a-decision.md) for every decision form.
- [Back a guarantee](back-a-guarantee.md) for the K passages.
