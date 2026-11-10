```json
{
  "format": "dossier-review@0.2.0",
  "subject": {
    "kind": "behavior",
    "dossier": "parts/token",
    "behaviors": [
      "transfer-without-supply-change"
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
      "path": "parts/token/behaviors/transfer-without-supply-change.md",
      "sha256": "dd9780b0fe2248738502e11d3885497b421939b2a76e52c1fa3e8d2df2f8343a",
      "claims": {
        "C1": "7c3aac8163c29137c62f19608c2edc37f02ec1295d2432d044672c89586b578f"
      },
      "explanation": "aedcef7523efe25ae4e035a4b25d87200c8ea769d2a83bb6901f54505d6bd3f0"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/token/decisions.log",
      "sha256": "0389198b29fe376203c7d9917d348e680922cad747ab045f1871a7ada7587caa"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/token/evidence/chart-64fcc7.json",
      "sha256": "cbfc55052a582a2471a7007c06458f4076ed5f3c7864d35fbd64c38523623bf0"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/token/evidence/chart-64fcc7.md",
      "sha256": "0beea4fa4835e195c4ac8ee06ed08b9c7e18d25c7621b1c9195430f265cb1433"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/token/integrity.json",
      "sha256": "5f273f065bdc5d4601c5c1e755b0ab35b1f21f321fb3351df69b229f73d8918a"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/token/prose.md",
      "sha256": "69858faf20e7b8ea36c7baf38c55ec3e10fcda9cda79a02a55fef3f4192c4f82"
    },
    {
      "role": "required",
      "root": "knowledge",
      "path": "modules/token/behavior/invariants.md",
      "sha256": "fa9a7d24ffe7eec31a4ceab5b1e388b5f78091e59fd82a79b2ba130491d7f57f"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/token/README.md",
      "sha256": "ced5ce6aedef32bd3fd835bc4f0fa6b02a5baba3d8670a23206d788aa5730d6a"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/token/chart/machine.json",
      "sha256": "1ac3248cec7ed820fd3d273e4dce74385ed2cfc682b7ed988a19192b0d4216f9"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/token/model/Token.tla",
      "sha256": "bce1acbdd8bd3e3fcdf4f3aaa2655aa6c5f85a86e7954433b0bbcdba26e0d8e3"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/token/model/Token.cfg",
      "sha256": "f6fc43c5f1d0bc5fc1ad2d0ef2db994c00e794326b20f2fff769cd14707197e4"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/token/model/blunders/uncapped.tla",
      "sha256": "7e3fa293b7494cd17ecc3b1b21c1b5d539368ff4b27469c2d8c917270d409f47"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/token/model/blunders/uncapped_A1.cfg",
      "sha256": "dd72eab7f7e31820881501ef896686222ccd6a43c353761d827971cb790d8e73"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/token/evidence/tlc-A1-09afe0.json",
      "sha256": "3c58d02500a1e10ee9c8556c8a5d11240ef3277cbc3bf65e7b20040ca8a4f63e"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/token/evidence/tlc-A1-09afe0.md",
      "sha256": "1fe8477fcfe4804eba7cf75409d5f9ce7094944d0d8439bf1b7fb165ea356958"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/token/evidence/external-W1-08c91c.json",
      "sha256": "9e48f97a10c5042e0c5e07b65ba49b5cd0c0daa94acff415bf1501e706cea908"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/token/evidence/external-W1-08c91c.md",
      "sha256": "956a2aee5d0334ba81117e0cab832d110f7fc813926b78e01bc4835930d4f2f3"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/token/evidence/blunder-A1-2c362d.json",
      "sha256": "fac5df46fb123f782af59c477a451e23a7f2dc5c26c71d21639ffdc99f450d65"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/token/evidence/blunder-A1-2c362d.md",
      "sha256": "af484c776fa64b49051ea9a729bbed01df2468bb19c3c4564e7143329e6c311f"
    }
  ],
  "coverage": {
    "examined": [
      "behavior:transfer-without-supply-change:claims",
      "behavior:transfer-without-supply-change:scope",
      "behavior:transfer-without-supply-change:mappings",
      "behavior:transfer-without-supply-change:explanation",
      "formal:2",
      "formal:3",
      "formal:4",
      "formal:5",
      "formal:7",
      "formal:16",
      "formal:18",
      "formal:19"
    ],
    "unexamined": [
      {
        "item": "formal:1",
        "reason": "Partially examined: verify and two randomly selected entries were checked against current files and the derived report. The full item is incomplete because the user prohibits recheck; no answer was rerun."
      },
      {
        "item": "formal:6",
        "reason": "Not applicable to this behavior: no Given is authored, so there is no actor restraint, prompt, on-event scope or only-when assumption to assess."
      },
      {
        "item": "formal:8",
        "reason": "Not applicable to this behavior: its only contextual guarantee K1 is record-backed; no assumed K passage exists."
      },
      {
        "item": "formal:9",
        "reason": "Not applicable to this behavior: C1 is explicitly a finite-chart model claim with no source or deployment pins. No deployed checkpoint is asserted or assessed."
      },
      {
        "item": "formal:10",
        "reason": "Not applicable to this behavior: it is a part transition, not a composition property with asset closure rules."
      },
      {
        "item": "formal:11",
        "reason": "Not applicable to this behavior: there is no composition wiring or free-send list; M3 has no effects or internal wired event."
      },
      {
        "item": "formal:12",
        "reason": "Not applicable to this behavior: C1 targets the part chart, with no scenario columns, windows or scenario starts."
      },
      {
        "item": "formal:13",
        "reason": "Partially examined: the A1 blunder was retold before its reading. W1 has no retained step trace or model witness, and no violated composition cell concerns this part behavior; the required three trace kinds cannot be examined."
      },
      {
        "item": "formal:14",
        "reason": "Not applicable to this behavior: all current Token answers are as-called and all retained previous answers are null, so no current or previous miscall classification applies."
      },
      {
        "item": "formal:15",
        "reason": "Not applicable to this behavior: the decision log records passage acceptance only, with no accepted risk on a violated cell."
      },
      {
        "item": "formal:17",
        "reason": "Partially examined: previous/narrowed/replaced fields and read-only Git log/diff were inspected. All retained histories are null; only one Token baseline is available and the behavior has no tracked history, so a complete historical weakening or ID-reuse audit is unavailable."
      },
      {
        "item": "formal:20",
        "reason": "Not applicable to this behavior: it authors no Within, Once or Given, and explicitly makes no eventual promise."
      }
    ]
  },
  "replaces": [],
  "assessments": [
    {
      "mapping": "transfer-without-supply-change/C1/M1",
      "result": "supported",
      "rationale": "C1 explicitly asserts finite-chart transfer preservation (parts/token/behaviors/transfer-without-supply-change.md:8-27). M3 stays Live without a supply update (parts/token/prose.md:19; parts/token/chart/machine.json:192-201). Its deciding chart answer records M3 passed and covers M3 over all five explored supply snapshots in 0..4, established by trial 2026-11-09-2229-chart-e9477f (parts/token/evidence/chart-64fcc7.json:89-96,121-168,211-220). This supports exactly the declared model/chart scope.",
      "limitations": [
        "Finite chart evidence over supply 0..4; no source correspondence, deployment result or inductive proof is established.",
        "The chart has no holder balances, destinations, amounts on transfer, approvals or transfer refusals (parts/token/chart/machine.json:9-18,73-78,192-201; parts/token/behaviors/transfer-without-supply-change.md:27,42).",
        "No recheck was run because the user prohibits it. The W1 stand-in has only a retained final state and cannot supply the missing model witness or a per-step transfer trace (parts/token/evidence/external-W1-08c91c.json:36-49; parts/token/README.md:17)."
      ]
    }
  ]
}
```
# Transfer without changing supply — independent behavior review

The sole mapping, `transfer-without-supply-change/C1/M1`, is **supported** at its declared finite-chart scope. This review grants no mark or owner decision and does not establish token-source or deployment behavior. The earlier review was not consulted; all assessments below use the current files.

References beginning `parts/` or `actors/` are relative to the dossiers root. References beginning `modules/` are relative to its configured knowledge root. Coverage is deliberately partial: items 1, 13 and 17 have the limited work described below; the other unexamined items do not apply to this behavior.

## Findings

1. **Verified — the claim and mapping agree with the finite chart.** Items `behavior:transfer-without-supply-change:claims` and `behavior:transfer-without-supply-change:mappings`; claim C1, mapping M1, passage M3. C1 is one descriptive assertion, explicitly about the finite chart; it asserts no actor fairness or source correspondence (`parts/token/behaviors/transfer-without-supply-change.md:8–32`). M3 remains Live without an update (`parts/token/prose.md:19`); the inspected chart represents it with no guard, assignments or effects (`parts/token/chart/machine.json:192–201`). The deciding entry records M3 passed, no overlapping move/refusal, five explored snapshots and an as-called result (`parts/token/evidence/chart-64fcc7.json:89–96`, `:121–129`, `:158–168`), established by trial `2026-11-09-2229-chart-e9477f` (`:211–220`). Its reading preserves the finite-chart limit (`parts/token/evidence/chart-64fcc7.md:3–7`). This is adequate support for the chart transition, without widening it to source, balances or an inductive result.

2. **Verified — the explanation keeps the checked mechanism within an explicit abstraction boundary.** Items `behavior:transfer-without-supply-change:scope` and `behavior:transfer-without-supply-change:explanation`; C1, E3, M3, T2. The Holder is a declared actor (`actors/actors.md:15–18`), and transfer is its event (`parts/token/prose.md:14`). The scope is Live/M3 with no source pins; the mapping expressly excludes named holders and balance validation (`parts/token/behaviors/transfer-without-supply-change.md:10–27`). Supply alone is modeled (`parts/token/README.md:13`, `parts/token/prose.md:6`, `:37`). Thus “changes who holds HRD” in the explanation is informal motivation, not an observed ownership update: the chart has only supply and transfer has no fields (`parts/token/chart/machine.json:9–18`, `:73–78`). The same explanation expressly excludes ERC-20 implementation, approvals and refusals (`parts/token/behaviors/transfer-without-supply-change.md:40–42`). No source or deployment assertion is established by this review.

3. **Not verified — the stand-in's individual transfer preserved supply.** Partial item `formal:13`; W1, trial `2026-11-09-2229-external-5cf0af`. The reading says transfers leave supply unchanged (`parts/token/evidence/external-W1-08c91c.md:5`), but its entry retains only W1's final Live/supply=0 state, no problems, and the one-walk stand-in reach (`parts/token/evidence/external-W1-08c91c.json:25–52`, `:95–102`). It contains no intermediate supply values from which to check that sentence for this execution. The reading accurately limits the replay to a stand-in (`parts/token/evidence/external-W1-08c91c.md:7`). A step trace would be needed for the requested independent witness retelling. This missing evidence concerns the stand-in reading; it does not contradict the separately supported chart mapping.

4. **Verified — the deciding marks do not themselves constitute a transfer invariant proof.** Item `formal:2`, scoped to S1/E3/M3 and the shared cap A1. For S1/E3/M3, the chart entry `chart-64fcc7`, trial `2026-11-09-2229-chart-e9477f`, records reachability, event handling and transition checks (`parts/token/evidence/chart-64fcc7.json:41–48`, `:65–72`, `:89–96`, `:212`). The model entry `tlc-A1-09afe0`, trial `2026-11-09-2229-tlc-84d374`, records an accepted Init and fired M3_Transfer action (`parts/token/evidence/tlc-A1-09afe0.json:66–78`, `:144`). Absent those checks or firings, those covers would not stand. The model coverage rule is thin: an action firing is not a relational assertion about its supply delta. Inspection supplies that correspondence here: M3 explicitly leaves supply unchanged (`parts/token/model/Token.tla:47–51`). For A1, the same TLC entry reports `holds`, and `blunder-A1-2c362d`, trial `2026-11-09-2229-blunder-2431d4`, reports the expected violation (`parts/token/evidence/tlc-A1-09afe0.json:33–40`; `parts/token/evidence/blunder-A1-2c362d.json:28–38`, `:179`). A cap violation in the checked model would instead fail A1. No inductive answer is claimed. The existing acceptance names M3's current hash, with the exact owner words “only the adapter mints and burns” (`parts/token/decisions.log:1`); this review changes none of it.

5. **Verified — the two text passages state exclusions rather than conceal an unchecked transfer condition.** Item `formal:3`; T1/T2. T1 disclaims eventual behavior and T2 excludes per-holder balances (`parts/token/prose.md:35–37`). The chart has no Once, Within or Given and only supply as context (`parts/token/chart/machine.json:9–18`, `:277–279`). There is no balance or liveness assertion hidden in these text passages that the stated model could check.

6. **Verified — A1 matches its passage and its blunder tests the cap, not transfer preservation.** Items `formal:4` and `formal:5`; A1, trial `2026-11-09-2229-blunder-2431d4`. The only A/O/N definition is A1: `supply <= 4`, matching its passage exactly (`parts/token/prose.md:23–24`; `parts/token/model/Token.tla:65`). This bound says nothing by itself about preserving supply across transfer. The deliberate wrong removes mint's cap guard while retaining its addition (`parts/token/model/Token.tla:31–37`; `parts/token/model/blunders/uncapped.tla:31–36`). The blunder configuration checks A1 alone, so the reported failure is not merely a separate TypeOK failure (`parts/token/model/blunders/uncapped_A1.cfg:1–5`; `parts/token/evidence/blunder-A1-2c362d.json:29–38`). A vacuous TRUE property would not reject the recorded state. Before opening the reading, I retold the entry: initial Live/supply=0/w1_at=0; M1_Mint to supply=1/w1_at=0; M1_Mint to supply=3/w1_at=1; M1_Mint to supply=5/w1_at=1. The deltas imply amounts 1, 2, 2; no transfer or burn appears (`parts/token/evidence/blunder-A1-2c362d.json:39–76`). The concise reading agrees (`parts/token/evidence/blunder-A1-2c362d.md:1`). This sensitivity result provides no positive production or per-transfer evidence.

7. **Verified — K1's record backing matches its wording, with no independently established source correspondence.** Item `formal:7`; K1. The guarantee says supply changes only through mint/burn and only the Adapter may call them (`parts/token/prose.md:33`). The named knowledge record states both clauses (`modules/token/behavior/invariants.md:5–14`). This is a matching record assertion and a test hint, not an executable rule or retained test outcome establishing authorization in deployed code. The model-level C1 does not require promoting that backing to a source proof. No assumed K passage exists in this prose.

8. **Verified — the chart reach covers the declared supply range without an unadvertised reduction.** Item `formal:16`; C1/M1. The boundary admits supply 0..4, with mint/burn amounts 0..2 (`parts/token/prose.md:6`, `:12–13`); the inspected chart gives exactly those ranges, all three amount cases, and the fieldless transfer (`parts/token/chart/machine.json:9–18`, `:44–107`). The deciding answer records five explored snapshots over supply 0..4, no gaps, and no narrowed answer (`parts/token/evidence/chart-64fcc7.json:158–168`, `:222–224`). The additional TLC answer has matching amount/supply reach and no narrowing (`parts/token/evidence/tlc-A1-09afe0.json:86–96`, `:153–155`). Its configuration imposes only SentBounded, which is TRUE here (`parts/token/model/Token.cfg:1–5`; `parts/token/model/Token.tla:63`). The blunder deliberately exceeds the cap; the external answer covers only one stand-in walk, neither a wider production bound nor a general transfer guarantee (`parts/token/evidence/blunder-A1-2c362d.json:67–74`, `:121–131`; `parts/token/evidence/external-W1-08c91c.json:45–52`).

9. **Verified — no transfer pair is unsaid; remaining owner work is visible.** Item `formal:18`; S1/E3/M3, W1/K1/T2 and contextual passages. Live's transfer is unconditional (`parts/token/prose.md:9`, `:14`, `:19`); the chart lists that pair and no unsaid or duplicate pair, and the answer reports no gaps (`parts/token/chart/machine.json:375–386`; `parts/token/evidence/chart-64fcc7.json:159`). No `doubts.md` or `margin.md` is present. The sole decision settles S1, E1–E3, M1–M3 and A1 (`parts/token/decisions.log:1`); R1, R2, W1, X1, K1, T1 and T2 remain unsettled. There is no transfer seam; X1 concerns mint/burn (`parts/token/prose.md:30`). No composition closure is claimed here. W1 still lacks a model witness, as the orientation acknowledges (`parts/token/README.md:17`). These limits are not new owner decisions.

10. **Verified — the named walk does not cover every transfer context.** Item `formal:19`; W1. The sole walk mints 2, transfers, then burns 2 to end Live/supply=0 (`parts/token/prose.md:26–27`). From the starting supply of 0, its transfer occurs at supply 2 (`parts/token/chart/machine.json:9–18`, `:280–323`). There is no named walk for transfer at supply 0, 1, 3 or 4, consecutive transfers, or either mint/burn refusal; no final state or transfer refusal is modeled (`parts/token/prose.md:8–27`; `parts/token/chart/machine.json:20–38`, `:375–383`). The chart reports W1 replay passed, but no model witness is retained (`parts/token/evidence/chart-64fcc7.json:113–120`; `parts/token/README.md:17`). This is a walk-coverage limit, not a counterexample to C1: C1 maps to the general finite-chart M3 check, not W1 alone.

## Partial examinations and procedure limits

- **Verified — static consistency checked; replay not performed (`formal:1`, unexamined as a complete item).** Initial `verify --brief parts/token` reported `verify: ok`, zero tripwires and the expected `review owed`; `review-basis` reported no issues. Two entries were selected at random, without replacement: `tlc-A1-09afe0` and `external-W1-08c91c`. Their predictions, answers, reaches, establishing trials and basis agreed with the derived report: A1/TypeOK hold with M3 firing; W1 has a passing stand-in replay but remains drawn without a model witness (`parts/token/evidence/tlc-A1-09afe0.json:19–40`, `:66–96`, `:98–155`; `parts/token/evidence/external-W1-08c91c.json:15–52`, `:54–106`). Their entry hashes match `parts/token/integrity.json:5–7`, and their executed/input-identity hashes match the bound files. The readings preserve the bounded/stand-in scopes (`parts/token/evidence/tlc-A1-09afe0.md:1–9`; `parts/token/evidence/external-W1-08c91c.md:1–9`). Recheck was **not run**: the user expressly prohibited it despite the procedure requesting it. No conclusion about reproduced answers is made. The entries also explicitly disclaim hermetic execution (`parts/token/evidence/tlc-A1-09afe0.json:140`; `parts/token/evidence/external-W1-08c91c.json:92`).
- **Verified — only the blunder trace could be independently retold (`formal:13`, unexamined as a complete item).** The retelling above preceded reading the keeper's interpretation. The W1 chart answer records a pass without a step trace; the external answer records only the final state (`parts/token/evidence/chart-64fcc7.json:113–120`; `parts/token/evidence/external-W1-08c91c.json:36–43`). The intended 0 → 2 → 2 → 0 sequence can be reconstructed from the prose, but that is not a retained witness trace. There is no violated composition-cell answer in this part; the A1 blunder is not a substitute for one. No new trial was run to fill either gap.
- **Verified — retained history cannot establish the absence of past weakening (`formal:17`, unexamined as a complete item).** All four current entries have null `previous`, `narrowed` and `replaced` (`parts/token/evidence/chart-64fcc7.json:222–224`; `parts/token/evidence/tlc-A1-09afe0.json:153–155`; `parts/token/evidence/blunder-A1-2c362d.json:188–190`; `parts/token/evidence/external-W1-08c91c.json:104–106`). Read-only Git inspection found one Token baseline, `5f7e9b9`, no working-tree difference for tracked prose/models, and no tracked history for this behavior file. It therefore cannot audit that claim's earlier wording or ID reuse. No forbidden edit is alleged; the missing historical comparison remains a limit.

Items `formal:6`, `formal:8`, `formal:9`, `formal:10`, `formal:11`, `formal:12`, `formal:14`, `formal:15` and `formal:20` are unexamined because this behavior has no applicable Givens, assumed guarantees, source/deployment pins, composition closure/wiring/scenarios, miscalls, accepted risks or eventual promises, respectively. The reasons are also recorded individually in the JSON coverage.

The contract's binding and assessment format were clear. The only procedural conflict was the recheck step, resolved by honoring the user's explicit prohibition. Missing retained traces and behavior history are evidence limits, not permission to create evidence. The required basis is preserved unchanged; inspected dependencies outside it are added by hash. No ledger or index is bound.
