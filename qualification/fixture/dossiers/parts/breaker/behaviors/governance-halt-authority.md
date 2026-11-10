```json
{
  "format": "dossier-behavior@0.2.0",
  "id": "governance-halt-authority",
  "title": "Restrict the structural halt authority",
  "claims": [
    {
      "kind": "descriptive",
      "statement": "Within the checked structure, every halt reaching an Adapter comes from Governance through a Breaker whose authority is Governance.",
      "scope": {
        "level": "model",
        "description": "Breaker A2 in the recorded Alloy structure and scope.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "passage",
            "dossier": "parts/breaker",
            "id": "A2",
            "side": "model"
          },
          "relation": "supports",
          "rationale": "A2 states the structural relation among Governance, Breaker and Adapter.",
          "limitations": [
            "Alloy checks the declared structure within its scope, not the membership of a deployed authority set."
          ],
          "id": "M1"
        }
      ],
      "id": "C1"
    }
  ]
}
```

# Restrict the structural halt authority

The authority question concerns which connections can exist. A halt must pass through a Breaker controlled by Governance before reaching an Adapter.

This structural claim complements the stateful [halt path](halt-once.md). It does not establish who owns a real key or whether the actor chooses the right moment to stop the system.
