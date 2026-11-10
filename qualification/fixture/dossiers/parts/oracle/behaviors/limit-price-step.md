```json
{
  "format": "dossier-behavior@0.2.0",
  "id": "limit-price-step",
  "title": "Limit each price step",
  "claims": [
    {
      "kind": "descriptive",
      "statement": "Consecutive modeled prices differ by at most one while both lanes obey their price-step assumptions.",
      "scope": {
        "level": "model",
        "description": "Oracle A2 with price and last in 0..4.",
        "pins": []
      },
      "assumptions": [
        "G3: lane A posts only values within one step of the current price.",
        "G4: lane B posts only values within one step of the current price."
      ],
      "mappings": [
        {
          "target": {
            "kind": "passage",
            "dossier": "parts/oracle",
            "id": "A2",
            "side": "model"
          },
          "relation": "supports",
          "rationale": "A2 is the one-step band, checked under G3 and G4.",
          "limitations": [
            "The restriction is an assumption about honest lane actions, not a guard that constrains a malicious lane."
          ],
          "id": "M1"
        }
      ],
      "id": "C1"
    }
  ]
}
```

# Limit each price step

Each accepted post saves the previous price in last before replacing price. The band compares those consecutive values.

The lane assumptions restrict which value an honest lane submits. They do not establish that the value reflects a market, and they do not constrain a lane made malicious by a scenario. [Upkeep's price-step behavior](../../../compositions/upkeep/behaviors/price-step-under-honesty.md) keeps that failure case visible.
