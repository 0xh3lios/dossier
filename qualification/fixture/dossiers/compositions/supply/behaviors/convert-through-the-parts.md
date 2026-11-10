```json
{
  "format": "dossier-behavior@0.2.0",
  "id": "convert-through-the-parts",
  "title": "Convert through all three parts",
  "claims": [
    {
      "kind": "descriptive",
      "statement": "The composed model can borrow two units, exit two and enter one, ending with the Adapter Open.",
      "scope": {
        "level": "model",
        "description": "Supply W1 under all-honest.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "walk",
            "dossier": "compositions/supply",
            "id": "W1",
            "scenario": "all-honest"
          },
          "relation": "supports",
          "rationale": "W1 witnesses the sequence through the declared credit and token wiring.",
          "limitations": [
            "This establishes one path and its stated end condition, not every amount or receiver refusal."
          ],
          "id": "M1"
        }
      ],
      "id": "C1"
    }
  ]
}
```

# Convert through all three parts

The walk starts at the Vault. Borrowing creates credit, an Adapter exit converts it into HRD, and a partial entry returns some HRD to credit.

The witness makes the wiring concrete. The [credit](preserve-credit.md) and [backing](match-token-backing.md) claims state the broader accounting obligations. They retain their own evidence and do not become proved merely because the path can run.
