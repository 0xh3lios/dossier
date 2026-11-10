```json
{
  "format": "dossier-behavior@0.2.0",
  "id": "resolve-plan",
  "title": "Resolve a scheduled plan",
  "claims": [
    {
      "id": "C1",
      "kind": "requirement",
      "statement": "Every scheduled plan must resolve within three ticks even when the public executor is offline.",
      "scope": {
        "level": "model",
        "description": "The executor-offline column of the finite Control composition.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "id": "M1",
          "target": {
            "kind": "cell",
            "dossier": "compositions/control",
            "property": "N1",
            "scenario": "executor-offline"
          },
          "relation": "challenges",
          "rationale": "The recorded violation leaves the scheduled plan unresolved past its deadline.",
          "limitations": [
            "An accepted risk still leaves this requirement violated. No behavior-level acceptance exists."
          ]
        }
      ]
    },
    {
      "id": "C2",
      "kind": "descriptive",
      "statement": "With the public executor prompt and the chain ticking, scheduled plans resolve within three ticks.",
      "scope": {
        "level": "model",
        "description": "The all-honest column of the finite Control composition.",
        "pins": []
      },
      "assumptions": [
        "G1: the public executes a ready plan before the next block.",
        "G2: the chain keeps ticking."
      ],
      "mappings": [
        {
          "id": "M1",
          "target": {
            "kind": "cell",
            "dossier": "compositions/control",
            "property": "N1",
            "scenario": "all-honest"
          },
          "relation": "supports",
          "rationale": "This is the N1 obligation under its two stated Givens.",
          "limitations": [
            "The all-honest result does not transfer to executor-offline and is not an inductive source proof."
          ]
        }
      ]
    },
    {
      "kind": "descriptive",
      "statement": "With the public executor prompt and the chain ticking, scheduled plans also resolve within three ticks when Governance is malicious.",
      "scope": {
        "level": "model",
        "description": "Control N1 under governance-captured.",
        "pins": []
      },
      "assumptions": [
        "G1: the public executes a ready plan before the next block.",
        "G2: the chain keeps ticking."
      ],
      "mappings": [
        {
          "target": {
            "kind": "cell",
            "dossier": "compositions/control",
            "property": "N1",
            "scenario": "governance-captured"
          },
          "relation": "supports",
          "rationale": "N1 remains checked when Governance is malicious but the public execution and chain assumptions remain.",
          "limitations": [
            "This result does not transfer to executor-offline."
          ],
          "id": "M1"
        }
      ],
      "id": "C3"
    },
    {
      "kind": "descriptive",
      "statement": "With the stated fairness and execution assumptions, every scheduled plan eventually returns to Idle.",
      "scope": {
        "level": "model",
        "description": "Control O1 under all-honest.",
        "pins": []
      },
      "assumptions": [
        "G1: the public executes a ready plan before the next block.",
        "G2: the chain keeps ticking."
      ],
      "mappings": [
        {
          "target": {
            "kind": "cell",
            "dossier": "compositions/control",
            "property": "O1",
            "scenario": "all-honest"
          },
          "relation": "supports",
          "rationale": "O1 is the eventual-resolution obligation under G1 and G2.",
          "limitations": [
            "The result is liveness in a finite composed model, not an assurance about actual executor availability."
          ],
          "id": "M1"
        }
      ],
      "id": "C4"
    }
  ]
}
```

# Resolve a scheduled plan

Waiting out the delay and executing the change involve different actors. A chain that keeps ticking does not make an offline public executor act. C1 preserves the desired deadline as a requirement so the observed failure remains visible. The other claims describe scenarios that retain the execution and ticking assumptions.

Returning to Idle includes cancellation. Completion therefore does not mean that every scheduled change takes effect. A recovery mechanism would need its own scoped claim and evidence. It would not turn a failed deadline into a success.
