```json
{
  "format": "dossier-behavior@0.2.0",
  "id": "borrow-and-repay",
  "title": "Borrow and repay",
  "claims": [
    {
      "kind": "descriptive",
      "statement": "The Vault model preserves debt = free + issued.",
      "scope": {
        "level": "model",
        "description": "The finite Vault model, with debt, free and issued in 0..4.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "passage",
            "dossier": "parts/vault",
            "id": "A1",
            "side": "model"
          },
          "relation": "supports",
          "rationale": "A1 is the conservation equation over the Vault state.",
          "limitations": [
            "Induction removes the step bound but does not remove the model ranges or establish deployed accounting."
          ],
          "id": "M1"
        }
      ],
      "id": "C1"
    },
    {
      "kind": "descriptive",
      "statement": "The Vault model never lets debt exceed its ceiling.",
      "scope": {
        "level": "model",
        "description": "The finite Vault model, with ceiling in 2..4.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "passage",
            "dossier": "parts/vault",
            "id": "A2",
            "side": "model"
          },
          "relation": "supports",
          "rationale": "A2 bounds debt by the current ceiling.",
          "limitations": [
            "The ceiling stands in for limits that the abstraction does not model individually."
          ],
          "id": "M1"
        }
      ],
      "id": "C2"
    },
    {
      "kind": "descriptive",
      "statement": "A user can borrow two units and repay one, ending with debt one and free credit one.",
      "scope": {
        "level": "model",
        "description": "The W1 path in the finite Vault model.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "walk",
            "dossier": "parts/vault",
            "id": "W1",
            "scenario": null
          },
          "relation": "supports",
          "rationale": "W1 records the borrowing and repayment sequence and final balances.",
          "limitations": [
            "One witnessed path does not cover every amount or refusal."
          ],
          "id": "M1"
        }
      ],
      "id": "C3"
    }
  ]
}
```

# Borrow and repay

Borrowing increases debt and free credit by the same amount. It is refused if the resulting debt would exceed the ceiling. Repayment consumes free credit and reduces debt, so it is refused when either balance is too small.

These changes explain the conservation equation: repaying debt does not consume issued credit still held through the Adapter. A user must first bring that credit back through the [credit movement path](move-credit.md). The example in C3 makes the paired changes concrete without claiming coverage of every amount.
