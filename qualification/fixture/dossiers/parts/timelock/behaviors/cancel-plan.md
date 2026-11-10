```json
{
  "format": "dossier-behavior@0.2.0",
  "id": "cancel-plan",
  "title": "Cancel a waiting governance plan",
  "claims": [
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
    },
    {
      "id": "C2",
      "kind": "descriptive",
      "statement": "Governance can cancel a scheduled plan at every possible remaining delay.",
      "scope": {
        "level": "model",
        "description": "Every reachable Scheduled state in the finite Timelock abstraction.",
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
          "relation": "illustrates",
          "rationale": "W2 supplies the remaining=1 example.",
          "limitations": [
            "A single path cannot establish every remaining value. A new check is needed."
          ]
        }
      ]
    },
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
  ]
}
```

# Cancel a waiting governance plan

Cancellation removes the waiting plan. Governance is the actor allowed to send
cancel; this is not a public cleanup action. The public execute action then
has no waiting plan to act on. C1 names the worked path. C2 asks whether that
path generalizes, and C3 asks what happens next.

The model's formal definitions and walks remain in [prose](../prose.md). Its cancellation
move has no remaining-delay guard, but that source reading alone is not a new
checker answer. The collection does not claim source or deployed behavior.
