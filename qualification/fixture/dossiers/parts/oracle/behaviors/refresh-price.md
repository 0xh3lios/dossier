```json
{
  "format": "dossier-behavior@0.2.0",
  "id": "refresh-price",
  "title": "Refresh a stale price",
  "claims": [
    {
      "kind": "descriptive",
      "statement": "Whenever the Oracle model is Fresh, stale is zero.",
      "scope": {
        "level": "model",
        "description": "Oracle A1 in the finite age-and-price model.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "passage",
            "dossier": "parts/oracle",
            "id": "A1",
            "side": "model"
          },
          "relation": "supports",
          "rationale": "A1 ties the Fresh state to the reset age.",
          "limitations": [
            "The state describes time since a post, not accuracy of the posted price."
          ],
          "id": "M1"
        }
      ],
      "id": "C1"
    },
    {
      "kind": "descriptive",
      "statement": "A stale Oracle becomes Fresh within one tick under the prompt-lane assumptions.",
      "scope": {
        "level": "model",
        "description": "Oracle N1 with stale in 0..3 and prices in 0..4.",
        "pins": []
      },
      "assumptions": [
        "G1: lane A posts a stale Oracle before the next block.",
        "G2: lane B posts a stale Oracle before the next block."
      ],
      "mappings": [
        {
          "target": {
            "kind": "passage",
            "dossier": "parts/oracle",
            "id": "N1",
            "side": "model"
          },
          "relation": "supports",
          "rationale": "N1 is the refresh deadline supplied by G1 and G2.",
          "limitations": [
            "This result relies on modeled lane behavior, not guaranteed keeper availability."
          ],
          "id": "M1"
        }
      ],
      "id": "C2"
    },
    {
      "kind": "descriptive",
      "statement": "Lane A can refresh the Oracle after a tick, ending Fresh with stale zero and price two.",
      "scope": {
        "level": "model",
        "description": "The W1 Refresh path in the finite Oracle model.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "walk",
            "dossier": "parts/oracle",
            "id": "W1",
            "scenario": null
          },
          "relation": "supports",
          "rationale": "W1 shows lane A resetting stale age with a post of value two.",
          "limitations": [
            "This witnesses one lane-A path."
          ],
          "id": "M1"
        }
      ],
      "id": "C3"
    },
    {
      "kind": "descriptive",
      "statement": "Lane B can post value three after a tick, after which lane A is refused a second post while the Oracle is Fresh.",
      "scope": {
        "level": "model",
        "description": "The W2 Backup path in the finite Oracle model.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "walk",
            "dossier": "parts/oracle",
            "id": "W2",
            "scenario": null
          },
          "relation": "supports",
          "rationale": "W2 shows a lane-B post of value three followed by a refused post while Fresh.",
          "limitations": [
            "These paths do not cover all outage histories."
          ],
          "id": "M1"
        }
      ],
      "id": "C4"
    }
  ]
}
```

# Refresh a stale price

A tick moves Fresh to Stale. A post from either lane resets stale to zero, records the previous price in last and stores the new value. Once Fresh, another post is refused until a tick makes the Oracle stale again.

The two example paths make the shared mechanism visible. The timing claim adds a separate assumption: at least one lane must act promptly. [Upkeep](../../../compositions/upkeep/README.md) tests how the deadline behaves when lane availability changes.
