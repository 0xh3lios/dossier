```json
{
  "format": "dossier-behavior@0.2.0",
  "id": "schedule-and-execute",
  "title": "Schedule and execute a plan",
  "claims": [
    {
      "kind": "descriptive",
      "statement": "The model never executes a plan while its remaining delay is positive.",
      "scope": {
        "level": "model",
        "description": "The Timelock model with remaining in 0..2 and one outstanding plan.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "passage",
            "dossier": "parts/timelock",
            "id": "A1",
            "side": "model"
          },
          "relation": "supports",
          "rationale": "A1 asserts that the early-execution flag is never set.",
          "limitations": [
            "The inductive result concerns the model and its fixed constants, not deployed code."
          ],
          "id": "M1"
        }
      ],
      "id": "C1"
    },
    {
      "kind": "descriptive",
      "statement": "A plan can be scheduled, refuse early execution, wait two ticks, and execute once with one change sent.",
      "scope": {
        "level": "model",
        "description": "The W1 path in the finite Timelock model.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "walk",
            "dossier": "parts/timelock",
            "id": "W1",
            "scenario": null
          },
          "relation": "supports",
          "rationale": "W1 records this sequence, its final state and its single change effect.",
          "limitations": [
            "A witness establishes this path, not all execution histories."
          ],
          "id": "M1"
        }
      ],
      "id": "C2"
    },
    {
      "kind": "descriptive",
      "statement": "The chart refuses a second schedule while a plan is already waiting.",
      "scope": {
        "level": "model",
        "description": "The Scheduled state of the Timelock chart, with remaining in 0..2.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "passage",
            "dossier": "parts/timelock",
            "id": "R2",
            "side": "chart"
          },
          "relation": "supports",
          "rationale": "R2 refuses schedule in Scheduled.",
          "limitations": [
            "This claim describes the finite chart refusal."
          ],
          "id": "M1"
        }
      ],
      "id": "C3"
    }
  ]
}
```

# Schedule and execute a plan

Governance starts a plan from Idle. The plan enters Scheduled with its full delay. A tick reduces the remaining delay until it reaches zero. The public execute action is refused while time remains.

A ready plan stays Scheduled until an actor resolves it. Successful execution returns to Idle and sends change to the Vault. Waiting for the delay and causing the change are separate steps. The [completion behavior](complete-plan.md) states the assumptions that make the second step timely.

The invariant and the example path answer different questions. C1 concerns every reachable model state covered by its result. C2 gives a sequence a reader can replay. C3 describes the chart's single-plan restriction.
