```json
{
  "format": "dossier-behavior@0.2.0",
  "id": "match-token-backing",
  "title": "Match tokens to their backing",
  "claims": [
    {
      "kind": "descriptive",
      "statement": "Token supply equals Vault issued credit throughout the all-honest composed model.",
      "scope": {
        "level": "model",
        "description": "Supply A2 under all-honest.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "cell",
            "dossier": "compositions/supply",
            "property": "A2",
            "scenario": "all-honest"
          },
          "relation": "supports",
          "rationale": "A2 equates these two balances across the wired parts.",
          "limitations": [
            "The all-honest result is inductive in model steps.",
            "Neither result establishes deployment correspondence or individual token ownership."
          ],
          "id": "M1"
        }
      ],
      "id": "C1"
    },
    {
      "kind": "descriptive",
      "statement": "Token supply equals Vault issued credit within the checked user-malicious bounds.",
      "scope": {
        "level": "model",
        "description": "Supply A2 under user-malicious.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "cell",
            "dossier": "compositions/supply",
            "property": "A2",
            "scenario": "user-malicious"
          },
          "relation": "supports",
          "rationale": "A2 equates these two balances across the wired parts.",
          "limitations": [
            "The malicious-actor result is bounded.",
            "Neither result establishes deployment correspondence or individual token ownership."
          ],
          "id": "M1"
        }
      ],
      "id": "C2"
    },
    {
      "kind": "descriptive",
      "statement": "Adapter held credit equals Token supply throughout the all-honest composed model.",
      "scope": {
        "level": "model",
        "description": "Supply A3 under all-honest.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "cell",
            "dossier": "compositions/supply",
            "property": "A3",
            "scenario": "all-honest"
          },
          "relation": "supports",
          "rationale": "A3 equates these two balances across the wired parts.",
          "limitations": [
            "The all-honest result is inductive in model steps.",
            "Neither result establishes deployment correspondence or individual token ownership."
          ],
          "id": "M1"
        }
      ],
      "id": "C3"
    },
    {
      "kind": "descriptive",
      "statement": "Adapter held credit equals Token supply within the checked user-malicious bounds.",
      "scope": {
        "level": "model",
        "description": "Supply A3 under user-malicious.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "cell",
            "dossier": "compositions/supply",
            "property": "A3",
            "scenario": "user-malicious"
          },
          "relation": "supports",
          "rationale": "A3 equates these two balances across the wired parts.",
          "limitations": [
            "The malicious-actor result is bounded.",
            "Neither result establishes deployment correspondence or individual token ownership."
          ],
          "id": "M1"
        }
      ],
      "id": "C4"
    }
  ]
}
```

# Match tokens to their backing

An exit sends move to the Vault and mint to the Token. An entry sends burn and release. Both directions carry the user's amount through the connected effects.

Two equalities are needed. Issued credit must match the Token's total supply, and the Adapter's held balance must match that supply too. A local guarantee in one part cannot replace these composed checks. The [conversion walk](convert-through-the-parts.md) gives a concrete sequence beneath the invariants.
