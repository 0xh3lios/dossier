```json
{
  "format": "dossier-behavior@0.2.0",
  "id": "recover-from-outage",
  "title": "Recover from a keeper outage",
  "claims": [
    {
      "kind": "requirement",
      "statement": "The Oracle must return to Fresh within one tick even while both keeper lanes remain offline.",
      "scope": {
        "level": "model",
        "description": "Upkeep N1 under lanes-offline.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "cell",
            "dossier": "compositions/upkeep",
            "property": "N1",
            "scenario": "lanes-offline"
          },
          "relation": "challenges",
          "rationale": "The recorded counterexample reaches the deadline without a lane able to refresh.",
          "limitations": [
            "The owner acceptance records a risk decision; the deadline remains violated."
          ],
          "id": "M1"
        }
      ],
      "id": "C1"
    },
    {
      "kind": "descriptive",
      "statement": "The one-tick refresh deadline holds when both lanes are offline only during the first-block window.",
      "scope": {
        "level": "model",
        "description": "Upkeep N1 under lanes-down-one, with the exact window in actors/scenarios.md.",
        "pins": []
      },
      "assumptions": [
        "Both lanes become honest outside the declared offline window."
      ],
      "mappings": [
        {
          "target": {
            "kind": "cell",
            "dossier": "compositions/upkeep",
            "property": "N1",
            "scenario": "lanes-down-one"
          },
          "relation": "supports",
          "rationale": "The scenario restores both lanes after its one-block window and the recorded check preserves N1.",
          "limitations": [
            "The result applies to this initial window, not arbitrary repeated outages."
          ],
          "id": "M1"
        }
      ],
      "id": "C2"
    },
    {
      "kind": "requirement",
      "statement": "The Oracle must meet the one-tick refresh deadline when both lanes are offline during the first two-block window.",
      "scope": {
        "level": "model",
        "description": "Upkeep N1 under lanes-down-two, with the exact window in actors/scenarios.md.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "cell",
            "dossier": "compositions/upkeep",
            "property": "N1",
            "scenario": "lanes-down-two"
          },
          "relation": "challenges",
          "rationale": "The recorded counterexample misses N1 during the longer initial outage.",
          "limitations": [
            "Later recovery cannot turn the missed deadline into a pass."
          ],
          "id": "M1"
        }
      ],
      "id": "C3"
    },
    {
      "kind": "descriptive",
      "statement": "Starting Stale with stale equal to three, the Oracle returns to Fresh within one tick when the lanes are prompt.",
      "scope": {
        "level": "model",
        "description": "Upkeep N1 under stale-start.",
        "pins": []
      },
      "assumptions": [
        "G1 and G2: the live lanes post a stale Oracle before the next block."
      ],
      "mappings": [
        {
          "target": {
            "kind": "cell",
            "dossier": "compositions/upkeep",
            "property": "N1",
            "scenario": "stale-start"
          },
          "relation": "supports",
          "rationale": "The scenario begins with the specified old price and checks the refresh deadline from that state.",
          "limitations": [
            "This does not establish that using the old price before refresh is safe."
          ],
          "id": "M1"
        }
      ],
      "id": "C4"
    }
  ]
}
```

# Recover from a keeper outage

Outage duration changes whether the same deadline can be met. The scenarios keep the initial one-block and two-block windows separate. They also distinguish an outage from a starting state whose price is already old.

A prompt lane can refresh after availability returns, but a completed recovery does not erase an earlier missed deadline. C1 and C3 preserve the failed requirements. C2 and C4 describe the specific checked recovery conditions. The [Oracle age behavior](../../../parts/oracle/behaviors/saturate-age.md) retains the unresolved question about using a price while it is too old.
