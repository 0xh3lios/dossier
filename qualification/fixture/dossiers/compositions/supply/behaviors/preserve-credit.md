```json
{
  "format": "dossier-behavior@0.2.0",
  "id": "preserve-credit",
  "title": "Preserve the credit equation",
  "claims": [
    {
      "kind": "descriptive",
      "statement": "With all actors honest, Vault debt equals free plus issued credit throughout the composed model.",
      "scope": {
        "level": "model",
        "description": "Supply A1 under all-honest with the declared finite member ranges.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "cell",
            "dossier": "compositions/supply",
            "property": "A1",
            "scenario": "all-honest"
          },
          "relation": "supports",
          "rationale": "A1 lifts the Vault conservation equation into the wired composition.",
          "limitations": [
            "The inductive result has no step bound but retains the member ranges and abstraction."
          ],
          "id": "M1"
        }
      ],
      "id": "C1"
    },
    {
      "kind": "descriptive",
      "statement": "The same credit equation holds within the checked bounds when the User and Holder are malicious.",
      "scope": {
        "level": "model",
        "description": "Supply A1 under user-malicious.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "cell",
            "dossier": "compositions/supply",
            "property": "A1",
            "scenario": "user-malicious"
          },
          "relation": "supports",
          "rationale": "The named malicious scenario checks the same equation. No Given restricts User or Holder here, so changing those actors from honest to malicious does not enlarge their modeled choices.",
          "limitations": [
            "The result is bounded and covers only the actions granted to those actors in the model."
          ],
          "id": "M1"
        }
      ],
      "id": "C2"
    }
  ]
}
```

# Preserve the credit equation

Borrow and repay change debt and free credit together. Exiting and entering shift credit between free and issued without changing total debt. The composed equation checks that the linked actions preserve this accounting across the Adapter boundary.

User and Holder have no behavioral Given in this composition. Their honest and malicious modes therefore admit the same modeled actions; this column adds no hostile power beyond the nondeterministic choices already checked. [Token backing](match-token-backing.md) adds the separate obligations that connect this credit to HRD.
