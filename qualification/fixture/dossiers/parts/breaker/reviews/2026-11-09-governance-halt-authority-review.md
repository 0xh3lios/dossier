```json
{
  "format": "dossier-review@0.2.0",
  "subject": {
    "kind": "behavior",
    "dossier": "parts/breaker",
    "behaviors": [
      "governance-halt-authority"
    ]
  },
  "basis": [
    {
      "role": "required",
      "root": "dossiers",
      "path": "actors/actors.md",
      "sha256": "46d5c75f216614487f98c497cba91f3fc6832f9f617bf70816151e95e563e592"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/breaker/behaviors/governance-halt-authority.md",
      "sha256": "ee9e4cee6d64a90727944665afd399be8c51272aa84d7d8ecae1cca4cf530b52",
      "claims": {
        "C1": "8f8d017ebd3cc44328a77990633fc944fd62a1d79bb612e0a05221913ef6a4c8"
      },
      "explanation": "20cff642020e32bbe8c5457cd0fb90776ef304ca602847a4b678b205542ee50b"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/breaker/decisions.log",
      "sha256": "d45f62cc62dced443efcf95b122f4da4d9d4182e496efd28afc8d0a3f02d5637"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/breaker/evidence/alloy-A2-de2df5.json",
      "sha256": "aa2354b42bf11b746513462697d2fe01976318c8d18893454a7662bdbada0f4b"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/breaker/evidence/alloy-A2-de2df5.md",
      "sha256": "7d4fd698832a0a7f337a744abc1d741b23b80ecb81e7c79766ec31d6b581de17"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/breaker/evidence/blunder-A2-e8ec8a.json",
      "sha256": "b6ee5c28c704ab113bd7a7c8911dda36f3b83855673c1c89781657fb4b1eddd0"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/breaker/evidence/blunder-A2-e8ec8a.md",
      "sha256": "312b1fb879c968bb11aa5009c8887e6c7e73ca2a01629046190b1bb9a2de0c49"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/breaker/integrity.json",
      "sha256": "6c04b12e14f171f75a9469864b4052cb6f3436469c69086942b4cb87a6b7334d"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/breaker/model/blunders/rogue.als",
      "sha256": "53ecac2189058dfdfbae91bdd95b865ecc42fc2e590d9d4080366428e4e2b6c0"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/breaker/model/Breaker.als",
      "sha256": "d0e1979eb62c35acf1d899543ad8b3937c9c88cc6d0eb832b41db16285be3e8d"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/breaker/prose.md",
      "sha256": "0c69391516bd3ac7b007a668766d2281ed78d618b43bf33b70d8eb329e2bb202"
    },
    {
      "role": "required",
      "root": "knowledge",
      "path": "modules/breaker/behavior/invariants.md",
      "sha256": "304654127884051b018b074654ed1a6ff9f7849d4f2e748fa185a9453e27badd"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/breaker/README.md",
      "sha256": "27bd1c29fddb97ef0b4759acf86e654aef6812286626c203317ae3d03be6a83a"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/breaker/model/Breaker.tla",
      "sha256": "548bf0d52107c1d2fec1bc6c47414c8b5c783c1a35cbcce901568a2e509cc1e4"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/breaker/model/Breaker.cfg",
      "sha256": "f6fc43c5f1d0bc5fc1ad2d0ef2db994c00e794326b20f2fff769cd14707197e4"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/adapter/prose.md",
      "sha256": "58d831b706099361e3b3fa6855a8b79b5d0c0fc8227521e7582ac34ad48c73fb"
    }
  ],
  "coverage": {
    "examined": [
      "behavior:governance-halt-authority:claims",
      "behavior:governance-halt-authority:scope",
      "behavior:governance-halt-authority:mappings",
      "behavior:governance-halt-authority:explanation",
      "formal:2",
      "formal:3",
      "formal:4",
      "formal:5",
      "formal:7",
      "formal:16",
      "formal:18"
    ],
    "unexamined": [
      {
        "item": "formal:1",
        "reason": "Partially examined: verify and the call/answer/basis comparison of both mapped entries were completed. Recheck was not run because the user permits only verify, review-basis, show and where; the complete item is left unexamined."
      },
      {
        "item": "formal:6",
        "reason": "Not applicable to this structural behavior: A2 uses no Given, prompt, on-event fairness or only-when restriction."
      },
      {
        "item": "formal:8",
        "reason": "Not applicable: this behavior has no passage marked assumed. K1 is backed; the authority constraint incorrectly attributed to K1 is examined under formal:4 and formal:7."
      },
      {
        "item": "formal:9",
        "reason": "Not applicable to the model-only C1, whose scope has no pins. Currency of a deployed instance and the Governance actor record pin were not assessed."
      },
      {
        "item": "formal:10",
        "reason": "Not applicable: this is a part-level structural claim, not a composition with an asset closure rule."
      },
      {
        "item": "formal:11",
        "reason": "Not applicable: no composition wiring or free sends are in this behavior. The X1 seam text was compared under formal:18; transactional composition was not examined."
      },
      {
        "item": "formal:12",
        "reason": "Not applicable: neither mapped Alloy question has a scenario, mode assignment, window or start."
      },
      {
        "item": "formal:13",
        "reason": "Cannot complete from the published files: this structural behavior has no mapped witness or violated composition cell, and the Alloy blunder entry retains no instance or trace. Its specific Other-sender reading cannot be retold independently."
      },
      {
        "item": "formal:14",
        "reason": "Not applicable: both mapped answers are as-called with empty miscalls, and both previous fields are null; there is no current or preserved earlier miscall to classify for A2."
      },
      {
        "item": "formal:15",
        "reason": "Not applicable: decisions.log contains an accept of A2, not a risk acceptance of a violated cell; this behavior has no accepted-risk trace."
      },
      {
        "item": "formal:17",
        "reason": "Partially examined: current entries have previous, narrowed and replaced all null; read-only Git follow-history of the Alloy models and prose contains their introduction and unchanged rename, with no HEAD diff. The behavior file has no tracked history. No pre-rebuild answer sequence survives here to audit changes between earlier answers, so the complete history item remains unexamined."
      },
      {
        "item": "formal:19",
        "reason": "Not applicable to the structural A2 mapping: W1 describes the stateful halt-once path, not alternative authority structures. Its path coverage belongs to the other behavior and was not reviewed."
      },
      {
        "item": "formal:20",
        "reason": "Not applicable: this behavior has no Once, Within or Given-dependent eventual promise."
      }
    ]
  },
  "replaces": [],
  "assessments": [
    {
      "mapping": "governance-halt-authority/C1/M1",
      "result": "supported",
      "rationale": "C1 explicitly concerns the recorded Alloy structure and scope (parts/breaker/behaviors/governance-halt-authority.md:9-15,24-27). A2 represents the structural chain Halt.by -> Breaker.authority -> Governance (parts/breaker/prose.md:21; parts/breaker/model/Breaker.als:4-10), and the current answer records no counterexample at scope 4 (parts/breaker/evidence/alloy-A2-de2df5.json:27-42). Removing the Breaker-only sender fact produces the expected counterexample (parts/breaker/model/blunders/rogue.als:6-9; parts/breaker/evidence/blunder-A2-e8ec8a.json:27-42). This supports the stated model relation, while the erroneous K1 attribution and the incomplete instance reading remain findings.",
      "limitations": [
        "Scope 4 bounded structural evidence only; Halt represents receipt by convention, with no Adapter object or initiating-call field. There is no source, deployment or transaction correspondence claim.",
        "Breaker.authority is restricted to one Governance by the signature, and Halt.by to Breaker by X1. These are model constraints; prose K1 and its backing establish only that a breaker never enables, not Governance authority.",
        "The blunder removes the Breaker-only sender constraint while retaining the Governance authority type. It tests that sender restriction; it does not test a wrong authority on a Breaker.",
        "The blunder entry preserves the counterexample verdict but no instance identifying its sender. The reading naming an Other is not independently verified.",
        "Recheck was prohibited, and the published entries preserve no earlier differing answers. Reproduction and a complete pre-rebuild history audit were not performed."
      ]
    }
  ]
}
```

Independent review of `parts/breaker`, behavior `governance-halt-authority`, on 2026-11-09. All judgments use the current files; the earlier review was not consulted. References below are relative to the dossiers root, except those prefixed `knowledge:`, which are relative to its configured knowledge root. `review-basis` reported no issues. The only mapping, `governance-halt-authority/C1/M1`, is **supported within its declared model scope**, with the limits below. Finding statuses describe the support for each finding, not a new mark or owner decision.

- **verified — K1 is misidentified as an authority guarantee** (`formal:4`, `formal:7`; A2/C1/M1). `parts/breaker/model/Breaker.als:4,8` attributes Governance authority to K1, and `parts/breaker/evidence/alloy-A2-de2df5.json:18-25` repeats that rationale. Actual K1, `parts/breaker/prose.md:30`, says only that a breaker halts and never enables; `knowledge:modules/breaker/behavior/invariants.md:5-17` supports exactly that statement. Neither supplies a rule about who controls a Breaker. The model instead imposes `authority: one Governance` by type; its K1 fact is redundant. Thus the current model relation holds, but its claimed derivation from the backed K1 is wrong. No source or deployment authority correspondence was examined or established.

- **verified — A2 tests an imposed structural relation, and its blunder tests the sender restriction** (`formal:4`, `formal:5`; A2). Clause by clause, `parts/breaker/model/Breaker.als:6-9` restricts each received Halt's `by` to a Breaker and that Breaker's authority to Governance, matching the structural reading of `parts/breaker/prose.md:21`. There is no Adapter signature or initiating-caller field; the comment at model line 6 supplies the receipt interpretation. `parts/breaker/model/blunders/rogue.als:4-9` removes only `X1_halt_by_breaker`, retaining the assertion and Governance authority type. The recorded counterexample (`parts/breaker/evidence/blunder-A2-e8ec8a.json:27-42`) therefore demonstrates sensitivity to a non-Breaker sender. An assertion that is always true would not detect it. A wrong authority on an actual Breaker remains excluded by typing in both models; there is no independent blunder for that clause. This limits what the successful blunder demonstrates without changing the recorded checked mark.

- **not verified — the recorded blunder's sender was specifically an `Other`** (limit on `formal:13`; trial `2026-11-09-2229-blunder-13b1bb`). `parts/breaker/evidence/blunder-A2-e8ec8a.md:1` says an Other halts and the Analyzer shows the instance. Before reading that interpretation, I read the entry and used `show`: `parts/breaker/evidence/blunder-A2-e8ec8a.json:27-43` retains only the enabled check, counterexample outcome, reach and verdict, with no instance or trace. From `parts/breaker/model/blunders/rogue.als:2-8`, a counterexample entails a non-Breaker sender; it does not identify whether that sender is an Other or Governance. The particular instance is missing, so no concrete blunder retelling is claimed. This behavior supplies neither a mapped witness nor a violated composition cell to complete the other trace requirements.

- **verified — C1 and M1 preserve the bounded model scope** (`behavior:governance-halt-authority:claims`, `:scope`, `:mappings`, `:explanation`). `parts/breaker/behaviors/governance-halt-authority.md:8-29` contains one descriptive, judgeable structural assertion, explicitly about A2 in the recorded Alloy structure and scope; model scope permits its empty pin list. Its empty assumptions list carries no external actor-behavior promise: the restrictions are the declared model's type and fact, identified above. Governance is a declared actor (`actors/actors.md:19-23`); its deployed membership and record pin were not checked. The exact model-side A2 target resolves to the current bounded answer and its sensitivity check, not to a transaction replay. The structural explanation and real-key exclusion (`parts/breaker/behaviors/governance-halt-authority.md:40-42`) agree with that reading, as does `parts/breaker/README.md:17`. The missing trace and K1 attribution defect do not refute this expressly model-scoped relation.

- **verified — the current files support A2's checked mark and the owner's recorded acceptance** (`formal:2`; also the completed portion of `formal:1`). The two mapped entries were sampled without replacement, exhausting this behavior's two-entry evidence set. Their calls, observed outcomes, scope, establishing trials and snapshot/executed-file hashes agree with the extracted `verify --json` mapping. `parts/breaker/evidence/alloy-A2-de2df5.json:17-42,53-78,81-89` records no counterexample from trial `2026-11-09-2229-alloy-285659`; `parts/breaker/evidence/blunder-A2-e8ec8a.json:17-42,53-78,81-89` records the expected counterexample from trial `2026-11-09-2229-blunder-13b1bb`. Both executed hashes match the current models and the manifest digests at `parts/breaker/integrity.json:7-8`. A false A2 in a permitted structure within scope 4 would give a counterexample; the weakened sender model demonstrates that detection. The production constraints entail A2, so this check supplies no independent validation of those constraints. `parts/breaker/evidence/alloy-A2-de2df5.md:1` correctly reports scope 4, subject to the K1 defect above. `parts/breaker/decisions.log:1` accepts A2 at `ad929dbe` with “a breaker halts and that is all”; this is an acceptance of the passage, not a risk acceptance or solver result. Recheck was not run under the user's command restriction, so `formal:1` remains unexamined as a complete item.

- **verified — the recorded reach is scope 4, with no declared structural cardinality range** (`formal:16`; A2). The boundary at `parts/breaker/prose.md:6` describes one flag and the halt interface, but supplies no Actor/Halt population bound. Both Alloy commands use `for 4` (`parts/breaker/model/Breaker.als:10`; `parts/breaker/model/blunders/rogue.als:9`), matching both entries' reach at lines 34-40. The production call at `parts/breaker/evidence/alloy-A2-de2df5.json:18-25` explains the constraints but offers no coverage argument for larger populations. C1 explicitly limits itself to the recorded scope (`parts/breaker/behaviors/governance-halt-authority.md:9-12,27`); the published answer is not an unbounded solver proof of the prose's Always. No additional reach was tested.

- **verified — no authority assertion is concealed in T1, and no Given-dependent promise is made** (`formal:3`). `parts/breaker/prose.md:33` only says the piece promises nothing eventual. The structural Alloy assertion and scope command (`parts/breaker/model/Breaker.als:9-10`) make no progress promise; the companion state model uses `Spec == Init /\ [][Next]_vars` without fairness (`parts/breaker/model/Breaker.tla:44-47`), and its ordinary configuration asks only for invariants (`parts/breaker/model/Breaker.cfg:1-5`). This supports the limited words-only statement; it does not claim that the stateful behavior or its walks were reviewed.

- **verified — no open local pair, doubt or owed seam was found for this behavior's interface** (`formal:18`). The Armed/Spent states and sole stop event have their move and refusal at `parts/breaker/prose.md:9-17`; there is no missing state/event pair in that interface. No doubts or margin file was present. X1's crossing text (`parts/breaker/prose.md:27`) matches Adapter X3 (`parts/adapter/prose.md:36`), and the receiver names Breaker as the halt sender (`parts/adapter/prose.md:15`). The seam's checked status is a matching-text rule, with no deciding trial. `parts/breaker/decisions.log:1` accepts S1/S2/E1/M1/A1/A2; R1/W1/X1/K1/T1 remain unsettled. These observations make no judgment about composition wiring or closure. Initial verify reported only `review owed` for Breaker; a behavior review leaves that dossier obligation outstanding.

- **verified — the published history cannot reconstruct earlier answer changes** (limit on `formal:17`). Both `parts/breaker/evidence/alloy-A2-de2df5.json:91-93` and `parts/breaker/evidence/blunder-A2-e8ec8a.json:91-93` have null `previous`, `narrowed` and `replaced`. Read-only Git follow-history of the two Alloy files and prose showed their introduction and an unchanged directory rename, with no current HEAD diff; the behavior has no tracked history. No weakening was observed in that available authored history, but an audit of changes between pre-rebuild answers cannot be completed from these files. `formal:17` remains unexamined as a complete item; no earlier review assessment was adopted.

The coverage record gives every omitted item's reason. The main procedure limit is the required recheck conflicting with the explicit allowed-command list; the latter was followed. The trace checklist also asks for evidence this focused structural behavior does not publish. No new trial, owner decision or mark was produced, and no input or other review was edited.
