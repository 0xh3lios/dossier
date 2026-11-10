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
      "path": "actors/actors.md",
      "sha256": "46d5c75f216614487f98c497cba91f3fc6832f9f617bf70816151e95e563e592"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/timelock/behaviors/cancel-plan.md",
      "sha256": "ab6295456ec7a142918b5d12f936ed73191ba5c7f8624a7ff7662a51e221d4ee",
      "claims": {
        "C1": "45e72985fb07007298725bb05d82acc337e515906db2a19508b269e947f3584d",
        "C2": "8cff295bbc09401ef89eea9d39e813eb92d5427cea0712a657f86050b48abb2f",
        "C3": "818831a62c5723f2998a3d03e4a1c8b889276bba1b00bd7538980c7abecf14ed"
      },
      "explanation": "bcb823823ce81d568b60c4f8246e3b10d39c359ffd85385d6432da6cf9281af5"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/timelock/decisions.log",
      "sha256": "b291e8ec2de26b8af88db679e858790f663a451635945daa3804821c74ec7e04"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/timelock/evidence/chart-64fcc7.json",
      "sha256": "bc6cbedb0bc703c5a60b1e97da84f10b5f345684fbf8abf7188a46132fab1380"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/timelock/evidence/chart-64fcc7.md",
      "sha256": "cabd2285da0243062364800321ba0b119fb7aab95aafd8fcb50059323c0d4d71"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/timelock/evidence/tlc-W2-c29421.json",
      "sha256": "8ed2ec05735e60f8fdfd50748f79529ea459cdf605c01b1abe99c5d8cff33728"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/timelock/evidence/tlc-W2-c29421.md",
      "sha256": "18ce4674ee4980aeb6395bcd74c0cca0588782f5cb37bbdae3ee60389f771d05"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/timelock/integrity.json",
      "sha256": "74717a14e35d5a4dbc1f633087cab82b22ddd66fb678df7d605ce24e0d330204"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/timelock/model/Timelock_W2.cfg",
      "sha256": "004840668b01171de6315108e30b2c353294803b1ab03784357548033d2ac78c"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/timelock/model/Timelock.tla",
      "sha256": "fd4fe6306d29eca6c86664b03ad064dbfb7b831d3eb117faae7d20a4ca46916a"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/timelock/prose.md",
      "sha256": "b912853ee887614675a70aeefd773c1af273a1879625de9307d477754e4afd91"
    },
    {
      "role": "required",
      "root": "knowledge",
      "path": "modules/timelock/behavior/invariants.md",
      "sha256": "152d7288333871eb719c29f01af8aa5e1e3b93c8759fb87a46735d223bf9ed0f"
    },
    {
      "role": "required",
      "root": "knowledge",
      "path": "modules/timelock/observations/delay-check-2026-11-01.md",
      "sha256": "d33b3049427305ab84017068c7912f368068b6faacb2d19bb83735a86a55db28"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/timelock/README.md",
      "sha256": "c518c1783dc2fcf10a5a3cfe234bc78a99dd91069359c7a08baf7d11b16cdd12"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/timelock/evidence/tlc-W1-37d5b8.json",
      "sha256": "82a129bd5e7ab943e358bd56124a715b572d190e37cc013acd7316d6470d84fe"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/timelock/evidence/tlc-W1-37d5b8.md",
      "sha256": "4b5328ce42897d1966c52a4be90084c9764e4350901d47209078ffa79866a025"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/timelock/model/Timelock_W1.cfg",
      "sha256": "4a90c9befd026d9a86f572a1a8d1254753519b9e86f34b0274563eecb3f3f249"
    }
  ],
  "coverage": {
    "examined": [
      "behavior:cancel-plan:claims",
      "behavior:cancel-plan:scope",
      "behavior:cancel-plan:mappings",
      "behavior:cancel-plan:explanation",
      "formal:1",
      "formal:2",
      "formal:6",
      "formal:7",
      "formal:8",
      "formal:9",
      "formal:16",
      "formal:18",
      "formal:19"
    ],
    "unexamined": [
      {
        "item": "formal:3",
        "reason": "T1 concerns what executed plans change in the Vault, not cancellation or replacement availability. Its substantive Vault claim is outside this behavior review."
      },
      {
        "item": "formal:4",
        "reason": "No cancel-plan mapping targets A1, O1 or N1. Clause-by-clause examination of those safety/completion properties belongs to the other behaviors; this review examines W2 and its enabling/refusal predicates only."
      },
      {
        "item": "formal:5",
        "reason": "The focused evidence contains no cancellation-property blunder. A1/O1/N1 blunders test other behaviors and were not reviewed."
      },
      {
        "item": "formal:10",
        "reason": "This subject is a part behavior, not a composition or asset-closure claim. Composition closure does not concern the cancellation mappings."
      },
      {
        "item": "formal:11",
        "reason": "W2 emits no change and targets no composition wiring. Vault transaction wiring and free sends do not concern this cancellation witness and were not examined."
      },
      {
        "item": "formal:12",
        "reason": "Both mappings target the part walk with scenario null. No composition scenario, window or alternate start concerns these mappings."
      },
      {
        "item": "formal:13",
        "reason": "Partial only: W2 was independently retold before its reading, but the part has no violated composition cell and the focused evidence has no cancellation blunder. The full witness/cell/blunder sample was not completed; unrelated traces were not substituted."
      },
      {
        "item": "formal:14",
        "reason": "Neither mapped answer is miscalled, and both previous fields are null. No current or replaced miscall classification concerns these cancellation mappings."
      },
      {
        "item": "formal:15",
        "reason": "The sole decision is a passage acceptance, not a risk decision. No accepted violated cell concerns this part behavior."
      },
      {
        "item": "formal:17",
        "reason": "Incomplete history audit: mapped entries have null previous, narrowed and replaced; available git history has one prose/model baseline and no tracked cancel-plan behavior history. Pre-rebuild changes and ID continuity could not be reconstructed. No absence-of-weakening conclusion is claimed."
      },
      {
        "item": "formal:20",
        "reason": "Cancel-plan asserts no Within/Once promise and neither mapping targets one. G1/G2 exercise for O1/N1 completion belongs to the complete-plan behavior and was not examined."
      }
    ]
  },
  "replaces": [],
  "assessments": [
    {
      "mapping": "cancel-plan/C1/M1",
      "result": "supported",
      "rationale": "The claim is scoped to W2 in parts/timelock/behaviors/cancel-plan.md:10-29. The current witness at parts/timelock/evidence/tlc-W2-c29421.json:51-112 follows M4_Schedule, M2_Tick and M6_Cancel to Idle/1 with sent_change=0. Execute is disabled there by parts/timelock/model/Timelock.tla:49-53, and W2_End checks refusal and zero effect delta at parts/timelock/model/Timelock.tla:154-155. The chart explicitly passes R1 and W2 at parts/timelock/evidence/chart-64fcc7.json:137-143,169-175. These two current path witnesses justify the stated example.",
      "limitations": [
        "One finite model path at delay 2, MaxSent=4; no universal cancellation, source or deployment conclusion.",
        "TLC represents the refused execute through a disabled-action predicate, not an additional trace step; the chart replays the refusal.",
        "W2 is checked but not owner-settled. Recheck was not run under the task command restriction."
      ]
    },
    {
      "mapping": "cancel-plan/C2/M1",
      "result": "supported",
      "rationale": "The relation is explicitly illustrates and the rationale names remaining=1 (parts/timelock/behaviors/cancel-plan.md:37-56). The trace at parts/timelock/evidence/tlc-W2-c29421.json:82-110 is exactly that Scheduled/1 cancellation example, and the chart passes W2 at parts/timelock/evidence/chart-64fcc7.json:169-175. It faithfully illustrates the universal statement without establishing it; support for this illustration is not support for all remaining values.",
      "limitations": [
        "The mapped W2 path does not establish cancellation at remaining=0 or remaining=2. C2 remains a hypothesis.",
        "The guard has no remaining test (parts/timelock/model/Timelock.tla:50,115-123), but this inspection is not a newly recorded checker answer or an authored support mapping.",
        "One model path only, no source/deployment result; W2 is owner-unsettled and recheck was not run."
      ]
    }
  ]
}
```
# Cancel-plan review

This review concerns only `parts/timelock#cancel-plan`. Paths below are relative to the declared `dossiers` root unless prefixed `knowledge:`. The earlier review was not consulted. No owner decision, mark or solver answer is supplied here.

- **verified — C2's mapping is a faithful illustration; its universal claim remains unestablished by that mapping.** Items `behavior:cancel-plan:claims`, `behavior:cancel-plan:mappings`, `formal:19`. `parts/timelock/behaviors/cancel-plan.md:37-56` explicitly uses `illustrates` for W2 at remaining=1. The current trace reaches Scheduled/1 and cancels (`parts/timelock/evidence/tlc-W2-c29421.json:82-110`). The guard permits cancellation from Scheduled without testing remaining (`parts/timelock/model/Timelock.tla:50,115-123`), but the mapped witness supplies neither the remaining=0 nor remaining=2 cancellation path. Thus `cancel-plan/C2/M1` is **supported as an illustration**, not `too-broad` and not universal support. The named walks also omit Idle/cancel refusal and any replacement sequence (`parts/timelock/prose.md:25-28,44-45`). These are coverage limits, not counterexamples.

- **verified — C3 has no mapping and neither named walk witnesses replacement after cancellation.** Items `behavior:cancel-plan:claims`, `behavior:cancel-plan:explanation`, `formal:19`. C3 is an intelligible model-level existential claim with an empty mappings array (`parts/timelock/behaviors/cancel-plan.md:61-71`). W1 executes a first plan, while W2 cancels a first plan (`parts/timelock/prose.md:44-45`; `parts/timelock/evidence/tlc-W1-37d5b8.json:52-128`; `parts/timelock/evidence/tlc-W2-c29421.json:51-112`). The static actions allow Idle to schedule again and eventually execute (`parts/timelock/model/Timelock.tla:91-118`), but that reading is no published replacement witness. **not verified — C3's successful replacement sequence is established by recorded evidence:** a supporting mapping and evidence of that combined sequence are missing. C3 receives no invented mapping assessment. The explanation correctly calls C2 and C3 questions (`parts/timelock/behaviors/cancel-plan.md:79-86`; `parts/timelock/README.md:24`).

- **verified — C1 is supported for the stated W2 path.** Items `behavior:cancel-plan:claims`, `behavior:cancel-plan:scope`, `behavior:cancel-plan:mappings`, `behavior:cancel-plan:explanation`; witness portion of `formal:13` only. C1's single scenario outcome and explicit finite-model scope are judgeable together (`parts/timelock/behaviors/cancel-plan.md:8-29`). Independently retold before reading the keeper's reading: Idle/0, with no changes sent, takes M4_Schedule to Scheduled/2, M2_Tick to Scheduled/1, then M6_Cancel to Idle/1; `sent_change` remains zero throughout (`parts/timelock/evidence/tlc-W2-c29421.json:51-112`). There is no executed refusal transition in the TLC trace. At the endpoint `Can_M5_Execute` is false; `W2_End` checks that refusal, the matched walk and zero effect delta (`parts/timelock/model/Timelock.tla:49-53,154-155`). The chart independently records R1 and W2 passing (`parts/timelock/evidence/chart-64fcc7.json:137-143,169-175`). This agrees with `parts/timelock/evidence/tlc-W2-c29421.md:1-2`; the reading describes a modeled refusal, not a transaction replay. The `NotW2` violation is the expected existence witness, not a refuted requirement. Consequently `cancel-plan/C1/M1` is **supported**. No general ban on executing a later replacement is inferred.

- **verified — the focused record comparison agrees with verification.** Item `formal:1`. Initial `verify --brief` returned `verify: ok`, zero tripwires, W2 checked, and `review owed`; `review-basis` reported no issues. Random selection without replacement from the two mapped entries selected chart-64fcc7 and tlc-W2-c29421, so both were reread. Their calls, recorded outcomes, reach, snapshots and executed-file hashes agree with the resolved W2 evidence in `verify --json` (`parts/timelock/evidence/chart-64fcc7.json:15-30,169-175,227-306`; `parts/timelock/evidence/tlc-W2-c29421.json:19-49,190-275`), and their digests agree with `parts/timelock/integrity.json:4,7`. The chart reports 20 passing checks and 54 explored snapshots; the model reports the expected witness at delay 2, MaxSent=4. TLC lists TypeOK under `partial` (`parts/timelock/evidence/tlc-W2-c29421.json:179-181`); its `holds` outcome is not a completed exhaustive TypeOK result. **Limit:** `recheck` was not run because the task explicitly forbids it, despite the procedure requesting it. No independent replay result is claimed.

- **verified — W2's checked mark has an identifiable deciding pair, with narrow mechanical coverage.** Item `formal:2`, limited to cancellation's target and direct state/event dependencies. W2 is decided by chart-64fcc7, trial `2026-11-09-2229-chart-ab1807`, and tlc-W2-c29421, trial `2026-11-09-2229-tlc-a9a696` (`parts/timelock/evidence/chart-64fcc7.json:169-175,293-302`; `parts/timelock/evidence/tlc-W2-c29421.json:43-49,263-271`). Without the matched state sequence, Idle refusal or zero change delta, `NotW2` would not provide this as-called witness (`parts/timelock/model/Timelock.tla:99-100,122-123,154-155`). For the directly involved S1, S2, E1-E4, M2, M4, M6 and R1, verification selects that chart and the later tlc-W1-37d5b8, trial `2026-11-09-2229-tlc-b67048` (`parts/timelock/evidence/chart-64fcc7.json:41-87,97-103,113-143`; `parts/timelock/evidence/tlc-W1-37d5b8.json:135-194,279-287`). States/actions receive coverage from initialization or firing; M6 has generated actions even though it is absent from W1's displayed execution trace. R1 relies on missing enabled execute/cancel actions in Idle, not a model refusal transition (`parts/timelock/model/Timelock.tla:45-50,102-129`). These checks would detect missing reachability/firing or a failed chart check; firing alone would not detect every incorrectly implemented action or prove cancellation at every delay. Unrelated A/O/N marks and the Vault seam were not audited under this item.

- **verified — the actor attribution and the finite witness do not require an unstated governance fairness assumption.** Items `formal:6`, `behavior:cancel-plan:scope`. Governance sends schedule/cancel and the public sends execute (`parts/timelock/prose.md:7,15-17`; `actors/actors.md:19-27`; `parts/timelock/model/Timelock.tla:125-129`). G1 names the public on execute with `prompt`; G2 names the chain (`parts/timelock/prose.md:40-41`; `actors/actors.md:7-10`). They constrain Spec through executor/chain fairness and a tick guard (`parts/timelock/model/Timelock.tla:51,69,82,131-133`). They do not require cancellation or presume its outcome; the exhibited finite cancellation path remains permitted without those restrictions. Empty claim assumptions do not turn this existential example into a completion promise. `prompt` is an explicit idealization, accepted in `parts/timelock/decisions.log:1`, not an observed fact about public actors. It disables M3 at remaining=0, explaining the dossier's separate drawn-only limit (`parts/timelock/model/Timelock.tla:47-51,79-84`; `parts/timelock/README.md:24`). **not verified — actual actors always satisfy G1/G2:** no such operational evidence was examined or claimed.

- **verified — the knowledge backing and pin do not ground cancellation in deployed source.** Items `formal:7`, `formal:8`, `formal:9`, `behavior:cancel-plan:scope`. K1's named record states execution only at/after eta, matching K1's delay condition (`parts/timelock/prose.md:51`; `knowledge:modules/timelock/behavior/invariants.md:5-16`). It is a declarative backing record with a check hint, not an inspected cancellation rule or proof. K2 remains explicitly assumed (`parts/timelock/prose.md:52`; `parts/timelock/evidence/tlc-W2-c29421.json:235-243`). W2's checked model result rests on a fixed schedule value and tick decrement (`parts/timelock/model/Timelock.tla:66-72,91-95`). If real plans could shorten their delay, correspondence of this countdown would need re-examination: the current model omits that transition. The recorded finite-model witness would remain what it is; this does not show that cancellation itself fails when K2 is false. No source-level cancellation mark follows. The pinned observation reports delay=2 at the named historical block, consistent with the model (`parts/timelock/prose.md:5,7`; `knowledge:modules/timelock/observations/delay-check-2026-11-01.md:3-10`), but reports no queued plan or cancellation experiment. The behavior's three scopes are model-only with no pins (`parts/timelock/behaviors/cancel-plan.md:11-16,38-43,65-70`); the collection expressly excludes deployed-address conclusions (`parts/timelock/README.md:22`). **Limit:** no current deployment checkpoint, executable source correspondence, or source cancellation authorization was established.

- **verified — recorded reach matches C1 and the example used by C2.** Item `formal:16`. The boundary's remaining range is 0..2 (`parts/timelock/prose.md:7`), and the chart records that range (`parts/timelock/evidence/chart-64fcc7.json:227-232`). W2's call deliberately asks one plan at delay 2 and explains the single-tick cancellation (`parts/timelock/evidence/tlc-W2-c29421.json:20-36,190-200`); `parts/timelock/model/Timelock_W2.cfg:1-5` imposes MaxSent=4. That bound cannot cut off this zero-change witness. The model can schedule repeatedly, so the phrase "one plan" describes the question/path, not a global limit on the transition system (`parts/timelock/model/Timelock.tla:91-123`). Neither entry records narrowing (`parts/timelock/evidence/chart-64fcc7.json:304-306`; `parts/timelock/evidence/tlc-W2-c29421.json:273-275`). The reach cannot establish C2's universal claim or C3's combined sequence from these mappings.

- **verified — the cancellation account leaves evidence and owner decisions distinct.** Item `formal:18`. The chart reports no gaps or failing checks (`parts/timelock/evidence/chart-64fcc7.json:224-226`); the formal cancellation/refusal pairs are stated (`parts/timelock/prose.md:25-28`). `doubts.md` and `margin.md` are absent. The sole decision accepts E4 and M6 among other passages, but does not accept R1 or W2 and records no risk acceptance (`parts/timelock/decisions.log:1`). Thus W2 and R1 remain unsettled despite their checked marks. C2/C3's unanswered coverage questions remain explicitly visible (`parts/timelock/README.md:24`; `parts/timelock/behaviors/cancel-plan.md:79-86`). No cancellation effect crosses a seam; the Vault change seam belongs to execution (`parts/timelock/prose.md:24-25,45,48`). No composition closure was assessed. The dossier still owes its whole-dossier review.

Unexamined coverage is listed in the JSON with reasons. In particular, the W2 retelling above is only the witness portion of formal:13; this part has no violated composition cell, and the focused mappings provide no cancellation blunder. The current entries' null `previous`/`narrowed` and a read-only git inspection are insufficient for a complete pre-rebuild history audit: prose/model have one recorded baseline with no working difference, while the behavior file has no tracked history. Formal:17 therefore stays unexamined. No prior review finding was adopted. The only procedural conflict was the requested `recheck` versus the task's explicit command restriction; the restriction was followed.
