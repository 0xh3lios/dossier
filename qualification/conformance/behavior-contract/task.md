# Task for an independent reader

Use only the supplied files. Read spec/README.md and follow its behavior,
review and process contracts. Read the example collections, then the matching
Harbor formal inputs and current evidence. Do not modify the input tree, run
solvers, accept a risk, or implement software. Write only answer.json and
answer.md in the designated output directory.

Explain what a newcomer can learn and where the evidence stops. Evaluate
Timelock cancel-plan C1, C2 and C3 and Control resolve-plan C1 and C2. Name
the actor who can cancel and whether anyone can force offline execution.
Distinguish proposed mappings from an independent review already on file.
Report whether these inputs are a complete operational 0.2.0 dossier.

Then consider these changes separately from the baseline:
1. Describe cancel-plan C1 as verified deployed behavior.
2. Add a supported independent assessment to the challenges mapping of
   resolve-plan C1. Does the requirement become supported?
3. Copy the all-honest answer's label into the executor-offline column.
4. Change only a behavior's explanation after it was reviewed.
5. Replace a deciding answer while leaving the old answer file intact.
6. Review only cancel-plan. Does that clear a whole-dossier review?
7. Delete a member's answer still needed by a composition behavior.
8. Add an authored verified=true field, or change the record version to 0.1.1.
9. List every model walk under a behavior. Is source coverage complete?

answer.json must have fields claims (an object keyed by full example claim
path, each value containing evidence, scope, assessment and ownerDecision),
mutations (an object with keys 1..9 explaining each result), cancellationActor,
operational020 (boolean), and limitations (array of strings). answer.md gives
your explanation, exact evidence references and useful next actions. A record that parses and links successfully can still explain its evidence incorrectly.
