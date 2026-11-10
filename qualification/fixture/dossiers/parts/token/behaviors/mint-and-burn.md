```json
{
  "format": "dossier-behavior@0.2.0",
  "id": "mint-and-burn",
  "title": "Mint and burn within the cap",
  "claims": [
    {
      "kind": "descriptive",
      "statement": "The Token model keeps supply at or below four.",
      "scope": {
        "level": "model",
        "description": "Token A1 in the finite supply model.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "passage",
            "dossier": "parts/token",
            "id": "A1",
            "side": "model"
          },
          "relation": "supports",
          "rationale": "A1 is the supply cap invariant.",
          "limitations": [
            "Four is the abstraction limit, not an assertion about a deployed token cap."
          ],
          "id": "M1"
        }
      ],
      "id": "C1"
    },
    {
      "kind": "descriptive",
      "statement": "The finite chart refuses minting above the cap.",
      "scope": {
        "level": "model",
        "description": "Token chart refusal R1, with supply in 0..4 and amounts in 0..2.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "passage",
            "dossier": "parts/token",
            "id": "R1",
            "side": "chart"
          },
          "relation": "supports",
          "rationale": "R1 rejects a mint whose result exceeds four.",
          "limitations": [
            "This covers the chart guard."
          ],
          "id": "M1"
        }
      ],
      "id": "C2"
    },
    {
      "kind": "descriptive",
      "statement": "The model can mint two units, transfer and burn the same amount, ending with zero supply.",
      "scope": {
        "level": "model",
        "description": "The W1 sequence proposed for the finite Token model.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "walk",
            "dossier": "parts/token",
            "id": "W1",
            "scenario": null
          },
          "relation": "illustrates",
          "rationale": "W1 specifies the mint, transfer and burn sequence.",
          "limitations": [
            "The recorded source replay concerns the stand-in; it does not supply the missing model witness."
          ],
          "id": "M1"
        }
      ],
      "id": "C3"
    },
    {
      "kind": "descriptive",
      "statement": "The finite chart refuses burning more than the existing supply.",
      "scope": {
        "level": "model",
        "description": "Token chart refusal R2, with supply in 0..4 and amounts in 0..2.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "passage",
            "dossier": "parts/token",
            "id": "R2",
            "side": "chart"
          },
          "relation": "supports",
          "rationale": "R2 rejects a burn larger than the existing supply.",
          "limitations": [
            "Per-holder balance sufficiency is outside the abstraction."
          ],
          "id": "M1"
        }
      ],
      "id": "C4"
    }
  ]
}
```

# Mint and burn within the cap

Mint grows supply and burn reduces it. Both arrive from the Adapter and carry an amount. The cap and available-supply guards stop either action from crossing the modeled balance limits.

C3 asks whether the full Mint-and-burn sequence is witnessed on the model side. Its existing chart and stand-in replay remain useful evidence with different reach. The source access-control guarantee is recorded separately in the [formal prose](../prose.md).
