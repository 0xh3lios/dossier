```json
{
  "format": "dossier-behavior@0.2.0",
  "id": "delayed-change",
  "title": "Delay a governance change",
  "claims": [
    {
      "kind": "descriptive",
      "statement": "The Timelock never executes early with all actors honest.",
      "scope": {
        "level": "model",
        "description": "Control A1 under all-honest, using the declared member ranges.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "cell",
            "dossier": "compositions/control",
            "property": "A1",
            "scenario": "all-honest"
          },
          "relation": "supports",
          "rationale": "A1 preserves the Timelock early-execution invariant in the composed model.",
          "limitations": [
            "The proof is inductive in model steps, with fixed model ranges and assumptions."
          ],
          "id": "M1"
        }
      ],
      "id": "C1"
    },
    {
      "kind": "descriptive",
      "statement": "Malicious Governance cannot make the Timelock execute early within the checked model bounds.",
      "scope": {
        "level": "model",
        "description": "Control A1 under governance-captured.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "cell",
            "dossier": "compositions/control",
            "property": "A1",
            "scenario": "governance-captured"
          },
          "relation": "supports",
          "rationale": "This cell checks the same invariant with Governance malicious.",
          "limitations": [
            "This is bounded model checking, not a claim about powers omitted from the model."
          ],
          "id": "M1"
        }
      ],
      "id": "C2"
    },
    {
      "kind": "descriptive",
      "statement": "Taking the public executor offline does not permit early execution within the checked model bounds.",
      "scope": {
        "level": "model",
        "description": "Control A1 under executor-offline.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "cell",
            "dossier": "compositions/control",
            "property": "A1",
            "scenario": "executor-offline"
          },
          "relation": "supports",
          "rationale": "The offline scenario changes completion but preserves the checked safety invariant.",
          "limitations": [
            "A safety result does not establish that any plan completes."
          ],
          "id": "M1"
        }
      ],
      "id": "C3"
    },
    {
      "kind": "descriptive",
      "statement": "Under malicious Governance, a scheduled plan can refuse early execution, wait two ticks and then execute.",
      "scope": {
        "level": "model",
        "description": "Control W1 under governance-captured.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "walk",
            "dossier": "compositions/control",
            "id": "W1",
            "scenario": "governance-captured"
          },
          "relation": "supports",
          "rationale": "W1 witnesses the scheduled, refused, delayed and executed sequence.",
          "limitations": [
            "The witness establishes one path under this scenario."
          ],
          "id": "M1"
        }
      ],
      "id": "C4"
    }
  ]
}
```

# Delay a governance change

An executed Timelock plan sends change into the Vault through the [declared wiring](../wiring.md). Governance may choose a plan, but it cannot bypass the modeled delay through that path.

The scenario claims keep safety separate from availability. An offline executor can leave a plan waiting without causing it to run early. The [completion behavior](resolve-plan.md) records that difference. These claims concern the Timelock path; the [emergency halt](emergency-halt.md) has its own authority and effect.
