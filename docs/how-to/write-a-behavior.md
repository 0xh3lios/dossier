# Write a behavior

Add a behavior to a dossier, or a claim to a behavior, and take the claim from a hypothesis to a reviewed standing. [Behaviors and claims](../explanation/behaviors.md) explains what each of these is.

## You need

A part or a composition to add it to. See [Start a part](start-a-part.md) or [Start a composition](start-a-composition.md).

## Steps

1. **Ask for it.** Say "explain how cancellation works in the timelock", or "add a claim that a cancelled plan can be replaced". The agent first reads the dossier's orientation and its behaviors. It then proposes where the claim belongs, in an existing behavior or in a new one, with its statement, its kind and its scope.

2. **Let the agent write it down as a hypothesis.** A new behavior is a file `behaviors/<id>.md`, and the agent adds its id to the reading order in the dossier's `README.md`. A new claim joins its behavior's `claims`, and it needs no mapping yet. Harbor's Timelock keeps this one in `behaviors/cancel-plan.md`:

   ```json
   {
     "id": "C3",
     "kind": "descriptive",
     "statement": "A cancelled plan can be replaced by scheduling and successfully executing another plan.",
     "scope": {
       "level": "model",
       "description": "Sequential plans in the finite Timelock abstraction.",
       "pins": []
     },
     "assumptions": [],
     "mappings": []
   }
   ```

   Beneath the JSON block, the agent explains the mechanism in words, so that a reader can follow the claims without opening a trial's output. Verify reports the claim as `hypothesis`. Writing it down runs no check and reopens no decision of yours.

3. **Read the claim before anything is checked.** A claim is worth checking when:

   - It is one statement that can be judged by itself. Two outcomes joined by "and" are two claims.
   - Its kind is right. A `descriptive` claim says what happens. A `requirement` says what is wanted, and it stays in the collection when a counterexample contradicts it.
   - Its scope names what it is about: `model`, `source` or `deployment`. A claim about the source or a deployment pins the knowledge records that identify it.
   - Its assumptions are listed, such as a written assumption about an actor that the claim relies on.

4. **Map the claim to evidence.** The agent looks for a passage, a cell, a walk or a recorded answer that already tests the claim. It maps the claim to that target and gives its reason. When nothing tests the claim yet, follow [Check a claim](check-a-claim.md) to state a property or a walk and try it. A mapping `supports` the claim, `challenges` it or `illustrates` it. An illustration, such as one walk for a claim about every path, never supports the claim by itself. The first claim of the same behavior, with its mapping to the walk W2:

   ```json
   {
     "id": "C1",
     "kind": "descriptive",
     "statement": "Governance can cancel after one tick; a subsequent execute is refused and no change is sent.",
     "scope": {
       "level": "model",
       "description": "The W2 path in the finite Timelock abstraction, with remaining in 0..2.",
       "pins": []
     },
     "assumptions": [],
     "mappings": [
       {
         "id": "M1",
         "target": {
           "kind": "walk",
           "dossier": "parts/timelock",
           "id": "W2",
           "scenario": null
         },
         "relation": "supports",
         "rationale": "W2 schedules, ticks once, cancels, and attempts execution; its expected end has no change effect.",
         "limitations": [
           "This is one path in an abstraction, not a source or deployment result."
         ]
       }
     ]
   }
   ```

5. **Read where the claim stands.** Say "where does that claim stand?" The agent runs `dossier where parts/timelock#cancel-plan/C3`. With a current answer in its favor and no review yet, the claim reads `evidence available; mapping unreviewed`.

6. **Get it reviewed.** Ask for a review of the behavior, as [Get a second read](get-a-second-read.md) describes. A reviewer in a fresh context assesses each mapping. A claim reads `supported within the stated scope` only after that.

## Keep the ids stable

- A correction of wording keeps the claim's id. The claim's earlier assessments go out of effect, and the other claims keep theirs.
- A question that differs in substance takes a new id.
- An id is never renumbered and never reused, even after its claim is deleted.
- An edit to the explanation alone keeps every assessment. A review of the whole dossier then no longer clears the review the dossier owes.

## Check

Say "where are we?", or run `dossier verify`. The dossier's `claims:` line counts the new claim under its standing, and no `invalid behavior collection` tripwire shows. [Read a dossier](read-a-dossier.md) follows the claim down to its evidence.

## See also

- [Files](../reference/files.md#behavior-collections-and-reviews) for the fields of a collection, a behavior and a claim.
- [Refresh after a change](refresh-after-a-change.md) for what a later edit asks you to redo.
