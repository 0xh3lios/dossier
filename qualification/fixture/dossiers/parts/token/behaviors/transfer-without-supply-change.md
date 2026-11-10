```json
{
  "format": "dossier-behavior@0.2.0",
  "id": "transfer-without-supply-change",
  "title": "Transfer without changing supply",
  "claims": [
    {
      "kind": "descriptive",
      "statement": "The transfer transition leaves total supply unchanged in the finite chart.",
      "scope": {
        "level": "model",
        "description": "Token M3 in the Live chart state.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "passage",
            "dossier": "parts/token",
            "id": "M3",
            "side": "chart"
          },
          "relation": "supports",
          "rationale": "M3 stays Live and applies no supply update.",
          "limitations": [
            "The abstraction does not model transfers between named holders or validate balances."
          ],
          "id": "M1"
        }
      ],
      "id": "C1"
    }
  ]
}
```

# Transfer without changing supply

A Holder transfer changes who holds HRD without changing the modeled total. The event therefore stays in Live and has no supply update.

This behavior explains why transfer can appear between mint and burn without changing the conservation question. It does not describe an ERC-20 transfer implementation, its approvals or its refusal conditions.
