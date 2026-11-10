# Behavior contract exercise

The exercise uses authored collections and behaviors with Harbor's formal inputs and evidence. A fresh reader assesses the claims and recognizes where their support ends. The examples add no runner entries or source executions.

## Inputs

- `examples/parts/timelock/` describes a cancellation path, a proposed generalization and a hypothesis without mappings.
- `examples/compositions/control/` keeps a violated requirement beside a narrower claim that holds. The risk decision applies to the formal cell.
- `boundary-cases.md` defines expected knowledge-revision and assessment-correction results.
- `review-incomplete.md` is a complete serialized review with an incomplete basis. Its hashes are accurate, but it cannot count as a current review.
- `task.md` is the reader's task.
- `cases.json` is the evaluator key. Withhold it and prior findings from the reader.

## Procedure

Freeze the task, contracts, fixture and examples by recording each file's hash before dispatch. Give the reader the examples, contracts and a read-only copy of Harbor. Keep the workspace isolated and permit only the requested output files.

Inspect `answer.json` and `answer.md` against the key. Preserve a failed attempt and use a new directory for a retry. Harbor supplies the formal inputs and model evidence. The separate exercise examples have their own claims and mappings; reviews of Harbor do not assess those examples. The reader must report that limit.

## What the exercise establishes

`answer.json` is an exercise response, not a Dossier record. A successful exercise establishes one reader's interpretation of the supplied claims and evidence. JSON and link checks establish structure only. The [implementation status](../../../spec/implementation.md) lists the separate parser, standing, freshness and retention work. The [behavior contract](../../../spec/behaviors.md) defines the required records.
