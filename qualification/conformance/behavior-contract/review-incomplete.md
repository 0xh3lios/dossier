```json
{
  "format": "dossier-review@0.2.0",
  "subject": {
    "kind": "behavior",
    "dossier": "parts/timelock",
    "behaviors": [
      "cancel-plan"
    ]
  },
  "basis": [
    {
      "role": "required",
      "root": "dossiers",
      "path": "dossier.json",
      "sha256": "5173c48ce1fa840a59c57d93a479d76a046910053ca2fa9f7206c9b675bfde25"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/timelock/README.md",
      "sha256": "eb640404c086b9856f169213b04115ac98bf7ca021500c4d3ab848bad6286fe9"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/timelock/behaviors/cancel-plan.md",
      "sha256": "f708c1a596d3a7c15d7fa04e4a099f41511e9b009a2a2dd4b674467e49673482",
      "claims": {
        "C1": "45e72985fb07007298725bb05d82acc337e515906db2a19508b269e947f3584d",
        "C2": "8cff295bbc09401ef89eea9d39e813eb92d5427cea0712a657f86050b48abb2f",
        "C3": "818831a62c5723f2998a3d03e4a1c8b889276bba1b00bd7538980c7abecf14ed"
      },
      "explanation": "922d2411d370554d23ded1ee1046df599c8f5ea58c1001be1d63ef3d14692605"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/timelock/prose.md",
      "sha256": "b912853ee887614675a70aeefd773c1af273a1879625de9307d477754e4afd91"
    }
  ],
  "coverage": {
    "examined": [
      "behavior:cancel-plan:claims",
      "behavior:cancel-plan:scope",
      "behavior:cancel-plan:mappings",
      "behavior:cancel-plan:explanation"
    ],
    "unexamined": [
      {
        "item": "formal:1",
        "reason": "The supplied contract packet does not contain the evidence needed for this formal examination."
      },
      {
        "item": "formal:2",
        "reason": "The supplied contract packet does not contain the evidence needed for this formal examination."
      },
      {
        "item": "formal:3",
        "reason": "The supplied contract packet does not contain the evidence needed for this formal examination."
      },
      {
        "item": "formal:4",
        "reason": "The supplied contract packet does not contain the evidence needed for this formal examination."
      },
      {
        "item": "formal:5",
        "reason": "The supplied contract packet does not contain the evidence needed for this formal examination."
      },
      {
        "item": "formal:6",
        "reason": "The supplied contract packet does not contain the evidence needed for this formal examination."
      },
      {
        "item": "formal:7",
        "reason": "The supplied contract packet does not contain the evidence needed for this formal examination."
      },
      {
        "item": "formal:8",
        "reason": "The supplied contract packet does not contain the evidence needed for this formal examination."
      },
      {
        "item": "formal:9",
        "reason": "The supplied contract packet does not contain the evidence needed for this formal examination."
      },
      {
        "item": "formal:10",
        "reason": "The supplied contract packet does not contain the evidence needed for this formal examination."
      },
      {
        "item": "formal:11",
        "reason": "The supplied contract packet does not contain the evidence needed for this formal examination."
      },
      {
        "item": "formal:12",
        "reason": "The supplied contract packet does not contain the evidence needed for this formal examination."
      },
      {
        "item": "formal:13",
        "reason": "The supplied contract packet does not contain the evidence needed for this formal examination."
      },
      {
        "item": "formal:14",
        "reason": "The supplied contract packet does not contain the evidence needed for this formal examination."
      },
      {
        "item": "formal:15",
        "reason": "The supplied contract packet does not contain the evidence needed for this formal examination."
      },
      {
        "item": "formal:16",
        "reason": "The supplied contract packet does not contain the evidence needed for this formal examination."
      },
      {
        "item": "formal:17",
        "reason": "The supplied contract packet does not contain the evidence needed for this formal examination."
      },
      {
        "item": "formal:18",
        "reason": "The supplied contract packet does not contain the evidence needed for this formal examination."
      },
      {
        "item": "formal:19",
        "reason": "The supplied contract packet does not contain the evidence needed for this formal examination."
      },
      {
        "item": "formal:20",
        "reason": "The supplied contract packet does not contain the evidence needed for this formal examination."
      }
    ]
  },
  "assessments": [
    {
      "mapping": "cancel-plan/C1/M1",
      "result": "inconclusive",
      "rationale": "This format example is not an independent examination of the published answer or its semantic mapping.",
      "limitations": [
        "No new execution or verified claim is established by this example."
      ]
    },
    {
      "mapping": "cancel-plan/C2/M1",
      "result": "inconclusive",
      "rationale": "This format example is not an independent examination of the published answer or its semantic mapping.",
      "limitations": [
        "No new execution or verified claim is established by this example."
      ]
    }
  ],
  "replaces": []
}
```

# Incomplete review example

This is a complete serialization example and an expected refusal of current
review standing. Resolve paths against the example files overlaid on Harbor.
The hashes identify real input bytes, but the basis deliberately omits
the mapped answer, integrity manifest and their formal dependencies.
The consumer must report an incomplete basis. No assessment here can
clear review owed or grant supported claim standing. An accurately hashed
subset is not a current review. This document records no actual independent
review or new execution.

Finding: not verified. The mapping has not been independently examined; the
formal evidence and dependencies required for its assessment are missing
from this review basis. The statements in the examples remain proposed
interpretations of Harbor until independently assessed.
