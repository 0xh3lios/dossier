```json
{
  "format": "dossier-behavior@0.2.0",
  "id": "emergency-halt",
  "title": "Halt exits immediately",
  "claims": [
    {
      "kind": "descriptive",
      "statement": "Whenever the Breaker has halted in the all-honest model, the Adapter is Halted.",
      "scope": {
        "level": "model",
        "description": "Control A2 under all-honest.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "cell",
            "dossier": "compositions/control",
            "property": "A2",
            "scenario": "all-honest"
          },
          "relation": "supports",
          "rationale": "A2 checks that the Breaker flag and the Adapter state remain aligned after the wired halt.",
          "limitations": [
            "The result concerns the composition and its bounded model."
          ],
          "id": "M1"
        }
      ],
      "id": "C1"
    },
    {
      "kind": "descriptive",
      "statement": "The same halt reaches the Adapter when Governance is malicious.",
      "scope": {
        "level": "model",
        "description": "Control A2 under governance-captured.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "cell",
            "dossier": "compositions/control",
            "property": "A2",
            "scenario": "governance-captured"
          },
          "relation": "supports",
          "rationale": "A2 is checked with Governance malicious, so the authority may halt without becoming able to leave the Adapter open afterward.",
          "limitations": [
            "This says nothing about whether a halt is warranted."
          ],
          "id": "M1"
        }
      ],
      "id": "C2"
    }
  ]
}
```

# Halt exits immediately

Governance can send stop to the Breaker without scheduling a Timelock plan. The Breaker sends halt directly to the Adapter. The Adapter then refuses exits, while its entry path remains available subject to its ordinary balance guard.

The two claims concern delivery of the halt, not the judgment behind it. [The Breaker](../../../parts/breaker/README.md) describes the one-use authority. [The Adapter](../../../parts/adapter/README.md) describes returning tokens after the halt. This composition does not provide an enable action.
