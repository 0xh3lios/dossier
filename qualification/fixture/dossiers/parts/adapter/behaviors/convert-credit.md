```json
{
  "format": "dossier-behavior@0.2.0",
  "id": "convert-credit",
  "title": "Convert credit into tokens and back",
  "claims": [
    {
      "kind": "descriptive",
      "statement": "The model can exit two units and enter them again, returning held credit to zero and sending the modeled conversion effects.",
      "scope": {
        "level": "model",
        "description": "The W1 Round-trip path in the finite Adapter model.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "walk",
            "dossier": "parts/adapter",
            "id": "W1",
            "scenario": null
          },
          "relation": "supports",
          "rationale": "W1 witnesses exit followed by entry and records the sent move, mint and burn effects.",
          "limitations": [
            "This is a local path; cross-part conservation is checked by Supply."
          ],
          "id": "M1"
        }
      ],
      "id": "C1"
    },
    {
      "kind": "descriptive",
      "statement": "The finite chart refuses entry when the amount exceeds held credit.",
      "scope": {
        "level": "model",
        "description": "Adapter chart refusal R2, with held in 0..4 and amounts in 0..2.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "passage",
            "dossier": "parts/adapter",
            "id": "R2",
            "side": "chart"
          },
          "relation": "supports",
          "rationale": "R2 covers the held-credit guard for entry in both states.",
          "limitations": [
            "The guard is about aggregate held credit, not a particular holder balance."
          ],
          "id": "M1"
        }
      ],
      "id": "C2"
    },
    {
      "kind": "descriptive",
      "statement": "The finite chart refuses an exit that would put held credit above four.",
      "scope": {
        "level": "model",
        "description": "Adapter chart refusal R3 in Open, with held in 0..4 and amounts in 0..2.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "passage",
            "dossier": "parts/adapter",
            "id": "R3",
            "side": "chart"
          },
          "relation": "supports",
          "rationale": "R3 covers the capacity guard for an exit in Open.",
          "limitations": [
            "The capacity is a fixed model range."
          ],
          "id": "M1"
        }
      ],
      "id": "C3"
    }
  ]
}
```

# Convert credit into tokens and back

An exit increases held credit and sends move to the Vault and mint to the Token. An entry decreases held credit and sends burn and release. Each effect carries the same amount as the user action.

The two guards serve different purposes. The capacity guard limits new exits, while the held-credit guard prevents an entry from returning more than the Adapter accounts for. The [Supply composition](../../../compositions/supply/README.md) checks the balances across these effect boundaries.
