```json
{
  "format": "dossier-behavior@0.2.0",
  "id": "return-after-halt",
  "title": "Return tokens after a halt",
  "claims": [
    {
      "kind": "descriptive",
      "statement": "Whenever the Adapter model is Halted, its live flag is clear.",
      "scope": {
        "level": "model",
        "description": "Adapter A1 in the finite model.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "passage",
            "dossier": "parts/adapter",
            "id": "A1",
            "side": "model"
          },
          "relation": "supports",
          "rationale": "A1 connects the Halted state to the cleared live flag.",
          "limitations": [
            "The result concerns the local model and its sensitivity check."
          ],
          "id": "M1"
        }
      ],
      "id": "C1"
    },
    {
      "kind": "descriptive",
      "statement": "After exiting one unit and being halted, the model refuses another exit but can accept an entry that returns held credit to zero.",
      "scope": {
        "level": "model",
        "description": "The W2 Stopped path in the finite Adapter model.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "walk",
            "dossier": "parts/adapter",
            "id": "W2",
            "scenario": null
          },
          "relation": "supports",
          "rationale": "W2 includes the halt, refused exit and accepted entry.",
          "limitations": [
            "This witnesses one amount and path, not eventual repayment by every user."
          ],
          "id": "M1"
        }
      ],
      "id": "C2"
    },
    {
      "kind": "descriptive",
      "statement": "The finite chart refuses exit and another halt in Halted.",
      "scope": {
        "level": "model",
        "description": "Adapter R1 in the Halted chart state.",
        "pins": []
      },
      "assumptions": [],
      "mappings": [
        {
          "target": {
            "kind": "passage",
            "dossier": "parts/adapter",
            "id": "R1",
            "side": "chart"
          },
          "relation": "supports",
          "rationale": "R1 lists both refused events after the halt.",
          "limitations": [
            "No enable transition is modeled."
          ],
          "id": "M1"
        }
      ],
      "id": "C3"
    }
  ]
}
```

# Return tokens after a halt

A Breaker halt moves the Adapter from Open to Halted and clears live. The exit path closes immediately. Entry remains available while its amount is covered by held credit, so the halt does not trap already issued HRD in this model.

The part has no path back to Open. Returning tokens reduces held credit while the Adapter remains Halted. The return walk demonstrates that distinction; it does not promise that all users will redeem or that a deployed receiver will accept every call.
