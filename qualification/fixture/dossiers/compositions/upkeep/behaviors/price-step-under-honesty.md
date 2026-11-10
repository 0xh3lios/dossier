```json
{
  "format": "dossier-behavior@0.2.0",
  "id": "price-step-under-honesty",
  "title": "Keep price steps within the honest-lane band",
  "claims": [
    {
      "kind": "descriptive",
      "statement": "Consecutive Oracle prices differ by at most one while both lanes obey their step restrictions.",
      "scope": {
        "level": "model",
        "description": "Upkeep A1 under all-honest.",
        "pins": []
      },
      "assumptions": [
        "G3: lane A posts only within one step of the current price.",
        "G4: lane B posts only within one step of the current price."
      ],
      "mappings": [
        {
          "target": {
            "kind": "cell",
            "dossier": "compositions/upkeep",
            "property": "A1",
            "scenario": "all-honest"
          },
          "relation": "supports",
          "rationale": "A1 checks the band under the two honest-lane value restrictions.",
          "limitations": [
            "The band does not establish external price accuracy."
          ],
          "id": "M1"
        }
      ],
      "id": "C1"
    },
    {
      "kind": "requirement",
      "statement": "The one-step band must still hold when lane A is malicious.",
      "scope": {
        "level": "model",
        "description": "Upkeep A1 under lane-a-captured.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "cell",
            "dossier": "compositions/upkeep",
            "property": "A1",
            "scenario": "lane-a-captured"
          },
          "relation": "challenges",
          "rationale": "The recorded counterexample lets the malicious lane move the price outside the band.",
          "limitations": [
            "The scenario removes lane A's honest action restriction; owner acceptance does not restore the invariant."
          ],
          "id": "M1"
        }
      ],
      "id": "C2"
    }
  ]
}
```

# Keep price steps within the honest-lane band

The model restricts an honest lane's submitted value. A malicious lane keeps its ability to post but loses that restriction, so having a second honest lane does not by itself prevent a bad price step.

This failure concerns the size of a modeled step. Neither scenario determines whether any submitted price is economically correct. The violated requirement remains visible alongside the narrower claim that keeps both honesty assumptions.
