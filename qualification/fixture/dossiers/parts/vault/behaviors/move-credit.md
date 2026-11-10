```json
{
  "format": "dossier-behavior@0.2.0",
  "id": "move-credit",
  "title": "Move credit through the Adapter",
  "claims": [
    {
      "kind": "descriptive",
      "statement": "For each accepted move in the finite chart, free credit decreases and issued credit increases by the requested amount.",
      "scope": {
        "level": "model",
        "description": "The Vault chart over credit balances in 0..4 and action amounts in 0..2.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "passage",
            "dossier": "parts/vault",
            "id": "M3",
            "side": "chart"
          },
          "relation": "supports",
          "rationale": "M3 moves the same amount from free to issued under the free-credit guard.",
          "limitations": [
            "This is a local chart transition, not a proof that a remote Token minted."
          ],
          "id": "M1"
        }
      ],
      "id": "C1"
    },
    {
      "kind": "descriptive",
      "statement": "For each accepted release in the finite chart, issued credit decreases and free credit increases by the requested amount.",
      "scope": {
        "level": "model",
        "description": "The Vault chart over credit balances in 0..4 and action amounts in 0..2.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "passage",
            "dossier": "parts/vault",
            "id": "M4",
            "side": "chart"
          },
          "relation": "supports",
          "rationale": "M4 returns the same amount from issued to free under the issued-credit guard.",
          "limitations": [
            "This does not by itself establish that tokens were burned."
          ],
          "id": "M1"
        }
      ],
      "id": "C2"
    }
  ]
}
```

# Move credit through the Adapter

The Vault records where credit is held. A move hands free credit to the Adapter by shifting it into issued. A release returns it to free. Neither action changes debt.

The local part does not mint or burn HRD. [Supply](../../../compositions/supply/README.md) connects these movements to the Adapter's token effects and checks that the balances agree. That composition supplies the cross-part obligation; this behavior supplies the Vault side.
