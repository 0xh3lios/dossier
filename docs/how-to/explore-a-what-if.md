# Explore a what-if

Find out what happens in a situation that no claim is about yet, such as "what happens if a keeper lane goes down for ten blocks?" To check a change before it is made, follow [Try a proposed change](#try-a-proposed-change).

## Steps

1. **Ask it.** Put the what-if as you would to a colleague.

2. **Read the chart first.** The chart's grid of states and events shows the events each state refuses, and for a what-if about one part it is often enough. The agent draws and reads it. Nothing is recorded.

3. **Name the scenario.** An outage or a malicious actor is a scenario. An outage for a number of blocks is a scenario with a window, such as a keeper lane offline from tick 0 until tick 10. A what-if that begins from a stressed state, such as a price already three blocks stale, is a scenario with a start. When none fits, the agent proposes one for `actors/scenarios.md` and says so.

4. **Run one trial when a property is at stake.** The agent writes the path the what-if describes as a walk in the composition, under that scenario, and runs it as a witness. Or the agent adds the scenario to the claims of the property the what-if is about, which adds a cell, and runs a bounded Apalache check of that cell. Claiming a scenario changes the property's text, so its other cells lapse and the owner settles it again. A surprising answer from the checker is a finding, not a failure.

5. **Read the answer as a walk.** The agent says who did what, in which block, and where the part ended up.

6. **Decide whether to keep it.** The agent offers to keep what it found as a walk in the part or the composition, or as a property and a scenario in a composition. Not every what-if needs keeping. A walk you do not keep comes out of the prose, and verify flags its answer `question gone`. The next publication in that dossier, which ends any trial there whose answer is not refused, removes the answer's entry from `evidence/`.

## Try a proposed change

A what-if about a change that has not been made, such as "what if the delay were one block?", is tried by writing the change into the prose and rerunning what it touches. Work on a branch of the repository, so the current record stays as it is.

1. **Describe the change.** Say what would differ: a delay, a range, a new emergency path, a member added to a composition. The agent writes a change of behavior into the prose and updates the part's model to match, since a refined model is kept when the scaffold runs again. A new member or a change of wiring goes into the composition's `wiring.md`. A passage whose words change is unsettled again, and the answers that rested on what changed lapse. A passage, a walk or a file the change removes leaves the answers whose questions name it flagged `question gone`, until the next publication in that dossier removes their entries.

2. **Rerun what lapsed.** The agent writes new calls for the answers that lapsed and runs them, parts first and compositions after, under the scenarios the properties already claim. When the change raises a case no scenario covers, such as a key the new path trusts turning malicious, the agent proposes a scenario for it.

3. **Compare the ledgers.** Run `dossier render` on the branch and on the main line, and compare each composition's `ledger.md`. The difference shows what the change does: which cells still hold, which now fail, and the trace behind each new failure.

4. **Let the branch go.** The branch was a preview. When the change goes ahead, the agent makes it on the main line, where the same lapses and the same new trials follow.
