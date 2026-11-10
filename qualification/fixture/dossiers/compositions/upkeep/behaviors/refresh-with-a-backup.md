```json
{
  "format": "dossier-behavior@0.2.0",
  "id": "refresh-with-a-backup",
  "title": "Refresh with a backup lane",
  "claims": [
    {
      "kind": "descriptive",
      "statement": "With both lanes honest and prompt, a stale Oracle becomes Fresh within one tick.",
      "scope": {
        "level": "model",
        "description": "Upkeep N1 under all-honest in the recorded finite bounds.",
        "pins": []
      },
      "assumptions": [
        "G1: lane A posts a stale Oracle before the next block.",
        "G2: lane B posts a stale Oracle before the next block."
      ],
      "mappings": [
        {
          "target": {
            "kind": "cell",
            "dossier": "compositions/upkeep",
            "property": "N1",
            "scenario": "all-honest"
          },
          "relation": "supports",
          "rationale": "N1 checks the refresh deadline while both prompt-lane assumptions apply.",
          "limitations": [
            "The result depends on actor assumptions rather than proving external keeper availability."
          ],
          "id": "M1"
        }
      ],
      "id": "C1"
    },
    {
      "kind": "descriptive",
      "statement": "The one-tick refresh deadline still holds when lane A is offline and lane B remains prompt.",
      "scope": {
        "level": "model",
        "description": "Upkeep N1 under lane-a-offline.",
        "pins": []
      },
      "assumptions": [
        "G2: lane B posts a stale Oracle before the next block."
      ],
      "mappings": [
        {
          "target": {
            "kind": "cell",
            "dossier": "compositions/upkeep",
            "property": "N1",
            "scenario": "lane-a-offline"
          },
          "relation": "supports",
          "rationale": "This scenario drops lane A and checks the deadline with lane B available.",
          "limitations": [
            "Only lane A is disabled in this scenario; it does not cover simultaneous failure."
          ],
          "id": "M1"
        }
      ],
      "id": "C2"
    }
  ]
}
```

# Refresh with a backup lane

Either lane can reset the Oracle's stale age. With lane A offline, lane B still supplies the refresh action. The deadline relies on that remaining lane acting before the next block.

This is redundancy against the named single-lane outage. The [outage behavior](recover-from-outage.md) examines periods when neither lane can post.
