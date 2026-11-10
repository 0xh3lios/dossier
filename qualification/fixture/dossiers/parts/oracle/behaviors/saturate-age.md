```json
{
  "format": "dossier-behavior@0.2.0",
  "id": "saturate-age",
  "title": "Saturate the age counter",
  "claims": [
    {
      "kind": "descriptive",
      "statement": "The finite chart stops increasing stale once it reaches three.",
      "scope": {
        "level": "model",
        "description": "Oracle M3 at stale three in the Stale chart state.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "passage",
            "dossier": "parts/oracle",
            "id": "M3",
            "side": "chart"
          },
          "relation": "supports",
          "rationale": "M3 keeps the Stale state without increasing the age variable.",
          "limitations": [
            "The model-side path is not covered, and D1 leaves the meaning of an older price open."
          ],
          "id": "M1"
        }
      ],
      "id": "C1"
    },
    {
      "kind": "descriptive",
      "statement": "After reaching stale three and receiving further ticks, the model can still accept a lane post and return to Fresh.",
      "scope": {
        "level": "model",
        "description": "The proposed D1 recovery path after the finite Oracle age counter saturates.",
        "pins": []
      },
      "assumptions": [
        "D1 currently assumes that a post can refresh the price after the age counter saturates."
      ],
      "mappings": [],
      "id": "C2"
    }
  ]
}
```

# Saturate the age counter

The finite age variable has no value above three. Further ticks leave it at three, so several different real ages share the same model state.

C2 asks for a checked recovery path after further ticks at the limit. That path is distinct from the prompt refresh walks.

The counter representation also does not decide whether consumers should use such an old price. The [open doubt](../doubts.md) records the competing interpretations and the current assumption. Even a successful recovery check would not establish that using the price during the outage was safe.
