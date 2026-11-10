# Read a dossier

Find out what a part or a composition does, and how far each statement about it is established. Start from its [behaviors](../explanation/behaviors.md) and follow one claim down to its evidence.

## Steps

1. **Ask where things stand.** Say "where are we on control?" The agent runs `dossier verify`, which changes nothing. Under each dossier's summary, a `claims:` line counts its claims by standing. For Harbor's Control composition:

   ```
     claims: 3 behaviors, 10 claims · supported 9 · contradicted 1
   ```

   A `review owed` flag beside supported claims means that each behavior was reviewed and the dossier as a whole was not.

2. **Read the orientation.** Open the dossier's `README.md`. It says what the part or the composition is for, who acts on it, the usual flow and what the model leaves out. It then lists the behaviors in the order to read them. [Control's orientation](../../qualification/fixture/dossiers/compositions/control/README.md#control) is an example.

3. **Read a behavior.** Open `behaviors/<id>.md`. Its explanation follows the JSON block at the top of the file. To see its claims with their standing, say "what do we claim about resolving a plan?" The agent runs `dossier where` with the behavior's address:

   ```
   dossier where compositions/control#resolve-plan
   ```

   Each claim's line gives its statement, its standing, its scope and whether its evidence is current. A mapping joins a claim to what tests it. Each mapping's line gives its relation, its target, whether a review has assessed it and whether its evidence is current. [Behaviors and claims](../explanation/behaviors.md#a-behavior-its-claims-and-their-mappings) shows this output.

4. **Follow one claim to its evidence.** Take the claim that matters to you, and read these in order:

   - **Its scope and its assumptions,** in the behavior's file. They say what the claim covers and what it takes for granted.
   - **Its mapping's target.** A passage is a sentence of `prose.md`. A cell is one property of a composition under one scenario. A cell or a walk of a composition is a row of its `ledger.md`, which names the answer that decides it.
   - **The answer.** Each answer is an entry under `evidence/`. `dossier show <dossier> <entry>`, which you or the agent can run, prints the entry's question, its outcomes, how far the check looked and its trace as a table. The agent's reading retells the trace in the actors' words, in the file of the same name ending in `.md`.
   - **The review.** `reviews/` holds each independent assessment of the mapping, with what the reviewer examined and what it left out.
   - **Your decision,** when one stands on that passage or that cell. The ledger's owner column shows it.

   For the claim C1 of Resolve a scheduled plan, the target is the cell N1 × executor-offline. Its answer is the entry [tlc-N1-executor-offline-4dafb3](../../qualification/fixture/dossiers/compositions/control/evidence/tlc-N1-executor-offline-4dafb3.json). Its [reading](../../qualification/fixture/dossiers/compositions/control/evidence/tlc-N1-executor-offline-4dafb3.md) retells the path: Governance schedules a plan, the chain ticks four times, and nobody executes.

5. **Read what no behavior covers.** The report lists the passages, cells, walks and scenarios that no behavior maps to. The explorer shows them under No behavior. The agent reads them from `dossier verify --json`, as `coverage.unassociated` in each dossier's `behaviors`. They are not unfinished for that reason. The list covers the model and says nothing about what the source does beyond it.

6. **Or read it in the explorer.** [Open the explorer](open-the-explorer.md) to see the same behaviors and claims as an outline, with each claim's evidence, review and decision beside it.

## Read a standing with its parts

A standing such as `supported within the stated scope` is a summary. Before you rely on a claim, read what stands beside it:

- **The scope.** A claim about the model says nothing about the source or a deployment.
- **The kind of evidence and how far it looked.** One path, a bounded check and a proof are different kinds, as [Marks](../reference/marks.md#kinds-of-evidence) lists.
- **The freshness.** `stale` means an answer the claim rests on has lapsed, or a pinned record changed.
- **The assessment.** `unreviewed` means only the agent has judged the mapping.
- **Your decision.** An accepted risk on a cell leaves the claim it contradicts contradicted.

## See also

- [Write a behavior](write-a-behavior.md) to add a claim of your own.
- [Get a second read](get-a-second-read.md) for how a review assesses the mappings.
- [Marks](../reference/marks.md#claim-standing) for every standing and every freshness.
