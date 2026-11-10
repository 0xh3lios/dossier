```json
{
  "format": "dossier-behavior@0.2.0",
  "id": "complete-plan",
  "title": "Complete a scheduled plan",
  "claims": [
    {
      "kind": "descriptive",
      "statement": "A scheduled plan returns to Idle within three ticks when a ready plan is executed promptly and the chain keeps ticking.",
      "scope": {
        "level": "model",
        "description": "N1 in the finite Timelock model, with one plan and delay 2.",
        "pins": []
      },
      "assumptions": [
        "G1: the public executes a plan as soon as its delay is out.",
        "G2: the chain keeps ticking."
      ],
      "mappings": [
        {
          "target": {
            "kind": "passage",
            "dossier": "parts/timelock",
            "id": "N1",
            "side": "model"
          },
          "relation": "supports",
          "rationale": "N1 is the three-tick completion obligation under G1 and G2.",
          "limitations": [
            "This is a bounded model result with explicit actor assumptions."
          ],
          "id": "M1"
        }
      ],
      "id": "C1"
    },
    {
      "kind": "descriptive",
      "statement": "Every scheduled plan eventually returns to Idle while the prompt-execution and ticking assumptions hold.",
      "scope": {
        "level": "model",
        "description": "O1 in the finite Timelock model under its fairness assumptions.",
        "pins": []
      },
      "assumptions": [
        "G1: the public executes a plan as soon as its delay is out.",
        "G2: the chain keeps ticking."
      ],
      "mappings": [
        {
          "target": {
            "kind": "passage",
            "dossier": "parts/timelock",
            "id": "O1",
            "side": "model"
          },
          "relation": "supports",
          "rationale": "O1 requires eventual return to Idle after Scheduled.",
          "limitations": [
            "Liveness is checked for this finite model; the assumptions do not prove an executor will appear."
          ],
          "id": "M1"
        }
      ],
      "id": "C2"
    }
  ]
}
```

# Complete a scheduled plan

A plan becomes ready when the chain has supplied enough ticks. It does not execute itself. The completion obligations assume that someone sends execute promptly and that time continues to advance.

Returning to Idle includes cancellation as well as execution. These claims therefore describe resolution of a waiting plan, not a promise that every scheduled change is applied. [Control's completion behavior](../../../compositions/control/behaviors/resolve-plan.md) separates the ordinary case from an offline executor.
