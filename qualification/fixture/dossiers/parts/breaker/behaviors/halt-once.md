```json
{
  "format": "dossier-behavior@0.2.0",
  "id": "halt-once",
  "title": "Send one emergency halt",
  "claims": [
    {
      "kind": "descriptive",
      "statement": "Governance can stop the Breaker once; a second stop is refused and exactly one halt is sent.",
      "scope": {
        "level": "model",
        "description": "The W1 Halt path in the finite Breaker model.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "walk",
            "dossier": "parts/breaker",
            "id": "W1",
            "scenario": null
          },
          "relation": "supports",
          "rationale": "W1 witnesses the first stop, second refusal and single halt effect.",
          "limitations": [
            "This is the modeled path, not a transaction replay."
          ],
          "id": "M1"
        }
      ],
      "id": "C1"
    },
    {
      "kind": "descriptive",
      "statement": "The Breaker model has halted set whenever it is Spent.",
      "scope": {
        "level": "model",
        "description": "Breaker A1 in the finite state model.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "passage",
            "dossier": "parts/breaker",
            "id": "A1",
            "side": "model"
          },
          "relation": "supports",
          "rationale": "A1 connects the final Spent state to the halt flag.",
          "limitations": [
            "The Adapter response is a separate composed property."
          ],
          "id": "M1"
        }
      ],
      "id": "C2"
    }
  ]
}
```

# Send one emergency halt

Governance sends stop while the Breaker is Armed. The Breaker sets halted, sends halt to the Adapter and becomes Spent. It refuses another stop after that transition.

Spent is final. This mechanism only reduces the Adapter's available actions. The [Control halt behavior](../../../compositions/control/behaviors/emergency-halt.md) checks the receiving side; this part does not provide a recovery action that enables exits again.
