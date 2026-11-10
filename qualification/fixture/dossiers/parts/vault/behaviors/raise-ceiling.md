```json
{
  "format": "dossier-behavior@0.2.0",
  "id": "raise-ceiling",
  "title": "Raise the ceiling",
  "claims": [
    {
      "kind": "descriptive",
      "statement": "A change raises the chart ceiling by one when it is below four.",
      "scope": {
        "level": "model",
        "description": "The Vault chart with ceiling in 2..4.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "passage",
            "dossier": "parts/vault",
            "id": "M5",
            "side": "chart"
          },
          "relation": "supports",
          "rationale": "M5 applies the one-unit increase only below the upper limit.",
          "limitations": [
            "The chart event names the Timelock as sender but does not prove source authorization."
          ],
          "id": "M1"
        }
      ],
      "id": "C1"
    },
    {
      "kind": "descriptive",
      "statement": "A change at ceiling four leaves the chart ceiling unchanged.",
      "scope": {
        "level": "model",
        "description": "The Vault chart at its maximum ceiling.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "passage",
            "dossier": "parts/vault",
            "id": "M6",
            "side": "chart"
          },
          "relation": "supports",
          "rationale": "M6 keeps the current state without increasing the ceiling.",
          "limitations": [
            "Four is a model constant, not a deployed limit."
          ],
          "id": "M1"
        }
      ],
      "id": "C2"
    },
    {
      "kind": "descriptive",
      "statement": "A borrower can reach the old ceiling, be refused, receive a ceiling increase and borrow again.",
      "scope": {
        "level": "model",
        "description": "The W3 sequence proposed for the finite Vault model.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "walk",
            "dossier": "parts/vault",
            "id": "W3",
            "scenario": null
          },
          "relation": "illustrates",
          "rationale": "W3 describes the refusal and renewed borrowing after change.",
          "limitations": [
            "The walk has no model-side witness; its drawing does not establish model reachability."
          ],
          "id": "M1"
        }
      ],
      "id": "C3"
    }
  ]
}
```

# Raise the ceiling

An executed plan is represented by change arriving from the Timelock. Below the modeled maximum, each change adds one to the ceiling. At the maximum, another change has no effect.

Raising the ceiling changes what a later borrow may do. It does not itself create debt or credit. C3 names the recovery path a reader would want to check on the model. The rejected source guarantee about who may raise the ceiling remains separate from these chart transitions.
