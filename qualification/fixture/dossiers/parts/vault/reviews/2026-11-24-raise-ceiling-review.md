```json
{
  "format": "dossier-review@0.2.0",
  "subject": {
    "kind": "behavior",
    "dossier": "parts/vault",
    "behaviors": [
      "raise-ceiling"
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
      "path": "parts/vault/behaviors/raise-ceiling.md",
      "sha256": "3f47e0234a7248c5e1128d029adfb3b983c40b46ee62620e56678f19a176b753",
      "claims": {
        "C1": "530fd710137464f80928ada29bf6f458d6bd8ce679dac8d7fd863fde0c820d4a",
        "C2": "8e21cc55ec7de4a0bec46907c670ff56f5f58cbdc50ab45aa534fc8e90f410a3",
        "C3": "c099913c80bb6f2b52277a4dc31ac0a6a2beb900f42529629c1536c2bef6a2f7"
      },
      "explanation": "28f5e28ea9de153737c5b08094ff9ac9e155e9b33a0a4fe0aedc626938180e5a"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/vault/decisions.log",
      "sha256": "13a12828dce2680eeb0a3ede7c2c3845007afd9c2c74835bb3b37d4fbb99d4b9"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/vault/evidence/chart-64fcc7.json",
      "sha256": "a54bc85d36f53d78a1cd68e0d657aaee93d6b1889b23c50e2a073dcf87c768d6"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/vault/evidence/chart-64fcc7.md",
      "sha256": "b76b8ff32fe399808a8c6f6eb9ae6c8148cb33d8fa318f7219925d74891c0028"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/vault/evidence/external-W1-W2-W3-1d4587.json",
      "sha256": "16a557d123a6bbad1c6bbc275c20d02228c589d3b14161afa03a6140ce0d33f0"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/vault/evidence/external-W1-W2-W3-1d4587.md",
      "sha256": "8d123a0d1c9accc035bfd54d1f60c794c4e7413eecc0d10b7f3f9d0c9c276bdf"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/vault/integrity.json",
      "sha256": "43e807d027e586ab4345d0f87b03445015083057f8ece9e39360be65d8f4a473"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/vault/prose.md",
      "sha256": "ad6f1070f6fac376ab9d505f4e9c60e58994a1c6a47cf780ee12f2f93165a6fa"
    },
    {
      "role": "required",
      "root": "knowledge",
      "path": "modules/vault/observations/checkpoint-2026-11-01.json",
      "sha256": "f53d903a45677849bbaa5354473cf43bd8203705cdf8778ca6f044eeb9de593e"
    },
    {
      "role": "required",
      "root": "knowledge",
      "path": "modules/vault/source-cache/github/commit-1a2b-9f8e/certora/Vault.spec",
      "sha256": "05878b94f4b6d6480701c00fd42a6cc509649f58dcc774530fd8f8346e0bfe71"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/vault/evidence/tlc-W1-a19770.json",
      "sha256": "830a081793bfa6e9f03b969f6180c8ac953cb15370a3b51888540fe86c3d82e5"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/vault/evidence/tlc-A1-A2-9b40ec.json",
      "sha256": "33a800888770ef52b33dc02f2dccb6041445958e6d6a4858237055c379464efa"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/vault/model/Vault.tla",
      "sha256": "4ee0c1c2aad920b34c03d500450054518ff9ded215dae317700601b62799d2b0"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/vault/model/Vault_W3.cfg",
      "sha256": "c5c0375eef21f7e9b73710aecada3a0f3e4bdc283573c0346cb0bf2342b9e308"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/timelock/prose.md",
      "sha256": "b912853ee887614675a70aeefd773c1af273a1879625de9307d477754e4afd91"
    },
    {
      "role": "additional",
      "root": "knowledge",
      "path": "modules/vault/source-cache/github/commit-1a2b-9f8e/src/Vault.sol",
      "sha256": "856b4e0469acbd01574a182114efbde57263f167b0511850f4c695ca2e0b5dde"
    }
  ],
  "coverage": {
    "examined": [
      "behavior:raise-ceiling:claims",
      "behavior:raise-ceiling:scope",
      "behavior:raise-ceiling:mappings",
      "behavior:raise-ceiling:explanation",
      "formal:1",
      "formal:2",
      "formal:3",
      "formal:6",
      "formal:8",
      "formal:9",
      "formal:13",
      "formal:14",
      "formal:15",
      "formal:16",
      "formal:17",
      "formal:18",
      "formal:19",
      "formal:20"
    ],
    "unexamined": [
      {
        "item": "formal:4",
        "reason": "Does not apply: this behavior's claims map to the Moves M5 and M6 and the walk W3, not to an Always, Once or Within. A2 is examined in the borrow-and-repay review of this date."
      },
      {
        "item": "formal:5",
        "reason": "Does not apply: no property is a target of this behavior, so no blunder bears on its claims. The A2 blunder is examined in the borrow-and-repay review of this date."
      },
      {
        "item": "formal:7",
        "reason": "Does not apply: no backed guarantee concerns how the ceiling changes. K1 to K3 are examined in the borrow-and-repay and move-credit reviews of this date."
      },
      {
        "item": "formal:10",
        "reason": "Does not apply: parts/vault is a part, with no closure rules. The Control composition, which wires the Timelock's change to the Vault, is reviewed separately."
      },
      {
        "item": "formal:11",
        "reason": "Does not apply: parts/vault is a part, with no wiring or free sends."
      },
      {
        "item": "formal:12",
        "reason": "Does not apply: parts/vault is a part, and its answers run under no scenario."
      }
    ]
  },
  "replaces": [],
  "assessments": [
    {
      "mapping": "raise-ceiling/C1/M1",
      "result": "too-broad",
      "rationale": "M5's chart side is decided by chart-64fcc7, established by trial 2026-11-24-1430-chart-a57cb9. Its check, 'M5: Open receives change as said', compares only the first explored snapshot where M5's guard holds (dossier repository, src/chart/checks.ts lines 137-159). That is the initial snapshot, with ceiling 2, and it found ceiling 3. The W3 replay passes through the same step from ceiling 2. No recorded check compares a change at ceiling 3, and the chart's range check shows only that a change never takes the ceiling past 4. The target establishes the increase from 2, while the claim covers every ceiling below four.",
      "limitations": [
        "The case compared agrees with the claim. The gap is ceiling 3, where the increase follows from how the chart is built rather than from a recorded comparison.",
        "M5 is unsettled by the owner, and the owner's rejection of K4 says a governance plan also lowers the ceiling, which the chart has no transition for.",
        "One unit per change and the cap at 4 belong to the abstraction. The pinned source sets the ceiling to any value at least equal to debt."
      ]
    },
    {
      "mapping": "raise-ceiling/C2/M1",
      "result": "too-broad",
      "rationale": "M6 names no change, and the chart's Move check compares only the target state and the changes a passage lists (dossier repository, src/chart/checks.ts lines 147-152). So 'M6: Open receives change as said' in chart-64fcc7 (trial 2026-11-24-1430-chart-a57cb9) established only that a change at the first explored snapshot with ceiling 4 leaves the machine in Open. The range check over every explored snapshot shows such a change never raises the ceiling past 4, but nothing recorded compares the ceiling after it. The target establishes that the ceiling is not raised, which is what the mapping's rationale says. The claim says it is unchanged.",
      "limitations": [
        "The model's action (model/Vault.tla lines 109-116) leaves the ceiling unchanged by inspection. Its cover is that M6_Change fired in tlc-A1-A2-9b40ec, and no model property compares the ceiling after a change.",
        "No walk takes a change at ceiling 4.",
        "M6 is unsettled by the owner. Four is a model constant, not a deployed limit."
      ]
    },
    {
      "mapping": "raise-ceiling/C3/M1",
      "result": "supported",
      "rationale": "The relation is illustrates, so the question is whether W3 is a faithful example of the claim. The chart's W3 check in chart-64fcc7 (trial 2026-11-24-1430-chart-a57cb9) replays it from the initial snapshot and compares the end. A borrow of 2 reaches the ceiling of 2. A borrow of 1 is refused under R1, since 2 + 1 > 2. Change raises the ceiling to 3 under M5, and a borrow of 1 is accepted under M1, ending in Open with debt 3 and ceiling 3. Each step is one the claim names, in its order.",
      "limitations": [
        "An illustration does not establish the claim, which stays a hypothesis.",
        "The replay is on the chart. No answer executed model/Vault_W3.cfg, so no TLC witness records the path in the TLA+ model.",
        "W3 is grounded only by the external replay on the fixture's stand-in, which raises the ceiling by one as the prose does. That lies outside the model scope and says nothing about the source.",
        "W3 is unsettled by the owner."
      ]
    }
  ]
}
```

# Review of raise-ceiling

An independent second read of one behavior of `parts/vault`, made for the Dossier 0.3.0 release after the fixture was rebuilt with the real solvers. It covers the behavior's three claims and what they depend on. It does not count as a review of the whole dossier.

## Verify before the review

```
verify: ok · 6 parts, 3 compositions · dossier 0.3.0 · 0 tripwires
Vault: 29 passages · settled 12 · confirmed 12 · unsettled 16 · rejected 1 · proved 2 · checked 19 · drawn 2 · backed 3 · assumed 1 · text 2 · prose@2fb3b4
  claims: 3 behaviors, 8 claims · evidence unreviewed 7 · hypothesis 1
  next: Write — rejected: K4
  flags: review owed (no current dossier review with complete scoped basis and coverage)
next: Encode on parts/oracle — Oracle: not tried on the model side: M2 M3; Timelock: not tried on the model side: M3; Token: not tried on the model side: W1
```

`dossier review-basis parts/vault --behavior raise-ceiling --json` reported no issues and 11 required files, all bound above unchanged. Six additional files are bound, because the findings rest on them: the two TLC entries that decide M5's and M6's model side, the model and its unexecuted W3 configuration, the Timelock's prose, which sends change, and the pinned Vault source.

`dossier recheck parts/vault` asked all eight recorded questions again: 8 came back the same, 0 different, 0 not run. It wrote nothing and is no new evidence.

## Assessments

| Mapping | Target | Result |
| --- | --- | --- |
| C1/M1 | M5, chart side | too-broad |
| C2/M1 | M6, chart side | too-broad |
| C3/M1 | walk W3, illustrates | supported, as an illustration |

Reading the prose and `parts/vault/model/Vault.tla` lines 99 to 116, I find C1 and C2 true of the abstraction as written. That reading is an inspection, not evidence. The assessments ask what the recorded target establishes (finding 2). These are the reviewer's assessments. The marks are the tool's, and the owner's decisions are in `decisions.log`.

## Findings

Ordered by importance.

### 1. The explanation keeps the K4 rejection apart from the chart transitions, but the owner's reason is about those transitions

- Affects: E5, M5, M6 and K4; the explanation; claims C1 and C2 through their limits.
- Statement: The owner rejected K4 with the words "the ceiling is also lowered by a governance plan; say so" (`parts/vault/decisions.log` line 2). In the Vault's prose, change from the Timelock only raises the ceiling, by one below 4, and otherwise leaves it (`parts/vault/prose.md` lines 17, 24 and 25). The Timelock's prose says the same from the sending side: "here every plan raises the ceiling" (`parts/timelock/prose.md` line 55). The behavior says "An executed plan is represented by change arriving from the Timelock" (`parts/vault/behaviors/raise-ceiling.md` line 94) and "The rejected source guarantee about who may raise the ceiling remains separate from these chart transitions" (line 96). The owner's words are about how the ceiling changes, which is the mechanism this behavior explains, and a plan that lowers the ceiling has no representation in the prose, the chart or the behavior. The rejection is not separate from these transitions. It says they are incomplete.
- Status: verified.
- Scope: the explanation and the abstraction. C1 and C2 are about the chart as it stands, and this does not contradict them.
- Missing: the owner's sentence in the prose, with whatever guard the owner gives lowering, and then this behavior's account. The route already says Write for K4. Whether lowering becomes a new event or changes E5, which the owner accepted on line 1 with the words "an executed plan raises the ceiling by one", is the owner's to settle.

### 2. The chart's checks of M5 and M6 compare less than the claims say

- Affects: M5 and M6; entry `chart-64fcc7`, trial 2026-11-24-1430-chart-a57cb9; mappings C1/M1 and C2/M1.
- Statement: A Move check stops at the first explored snapshot and event case where the guard holds (dossier repository, commit 9f94d71bb39755171813b2c0f5ea3ec205f62f8e, `src/chart/checks.ts` lines 137 to 159). It compares only the target state and the changes the passage lists (lines 147 to 152). The graph library recorded in the entry, @xstate/graph 3.0.4, explores breadth first from the initial snapshot. So `M5: Open receives change as said` (`parts/vault/evidence/chart-64fcc7.json` line 125) compared a change at the initial ceiling of 2 and found 3. No recorded check compares a change at ceiling 3. `M6: Open receives change as said` (line 133) compared only that a change at the first snapshot with ceiling 4 stays in Open, since M6 lists no change. The range check over every explored snapshot rules out a ceiling above 4. Nothing recorded compares the ceiling after a change at 4 with the ceiling before. The mapping's own rationale for C2, "without increasing the ceiling" (`parts/vault/behaviors/raise-ceiling.md` line 52), is what the evidence shows. The claim, "unchanged", is more.
- Status: verified, by reading the check, the graph library's traversal and the entry.
- Scope: the chart side of M5 and M6. The same mechanism applies to every Move's chart check.
- Missing: a check that compares every explored case, the data a passage leaves alone included, or a model property on change.

### 3. The model-side covers of M5 and M6 rest on the actions firing

- Affects: M5 and M6, marked `checked`.
- Statement: M5's model side is decided by the W1 witness `tlc-W1-a19770` (trial 2026-11-24-1431-tlc-80392a), where M5_Change generated 2 states (`parts/vault/evidence/tlc-W1-a19770.json` lines 133 to 140). M6's is decided by `tlc-A1-A2-9b40ec` (trial 2026-11-24-1431-tlc-d12ab1), where M6_Change generated 34 (`parts/vault/evidence/tlc-A1-A2-9b40ec.json` lines 96 to 103). A change that moved the ceiling some other way within 2..4 would have fired the same way. A2's proof catches a change that leaves debt above the ceiling, not one that lowers the ceiling while staying above debt.
- Status: verified.

### 4. W3 has no model-side witness, and its grounding replays the prose's own rule

- Affects: W3 (`drawn`, grounded) and mapping C3/M1.
- Statement: `parts/vault/model/Vault_W3.cfg` exists, but no entry executes it, and the same holds for W2. The mapping's limitation and the dossier's README say so. The external answer `external-W1-W2-W3-1d4587` (trial 2026-11-24-1431-external-adf0ef) passed W3 with end values debt 3, free 3, issued 0 and ceiling 3, which match the walk. It ran on the fixture's stand-in, whose change is "if the ceiling is below 4, add one" (dossier repository, same commit, `qualification/fixture/protocol/harbor.mjs` line 26). That is the prose's rule, as the call's own reason says, not the source's.
- Status: verified.
- Not verified: by reading the model's walk counters (`parts/vault/model/Vault.tla` lines 49, 61, 107 and 144), a TLC witness with `Vault_W3.cfg` would reach W3's end. That reading is not evidence, and only a trial would record it.

### 5. No walk takes a change at the maximum

- Affects: M6.
- Statement: W3 takes change once, at ceiling 2. No walk reaches ceiling 4 or sends change there (`parts/vault/prose.md` lines 36 to 38). A path no walk takes is a gap in the walks.
- Status: verified.

### 6. The source sets the ceiling to a value, up or down

- Affects: E5, X2 and the explanation's "each change adds one".
- Statement: In the pinned source, `setCeiling(data)` is restricted to `auth` callers and sets the ceiling to any value at least equal to debt (`modules/vault/source-cache/github/commit-1a2b-9f8e/src/Vault.sol` lines 20 and 29 to 33, knowledge root). It can raise or lower it, and it carries a value, where X2 says change carries nothing (`parts/vault/prose.md` line 42). One unit per change and the cap at 4 are the abstraction's. The word "represented" and the limitations of C1 and C2 partly say so, and the claims are scoped to the chart.
- Status: verified as a reading of the pinned file. Not verified as deployed behavior: nothing recorded establishes that the deployment runs this source, or who holds `auth`.

## Items examined

- `behavior:raise-ceiling:claims`: C1 and C2 are each one statement that can be judged, descriptive, about the chart, with no assumption needed. Both are general ("when it is below four", "at ceiling four"), and that is why finding 2 matters. C3 is existential and proposed as a path to check. Its relation, illustrates, fits.
- `behavior:raise-ceiling:scope`: all three are model-level with no pins, and the ranges match the boundary (`parts/vault/prose.md` line 7). The sender of change is the Timelock, a part. C1's limitation rightly says that naming the sender does not prove source authorization. Finding 1 is the limit the scopes leave unsaid.
- `behavior:raise-ceiling:mappings`: each mapping joins its claim to the right passage or walk with its declared relation. The chart evidence behind C1 and C2 is narrower than the claims (finding 2). C3's illustration is faithful.
- `behavior:raise-ceiling:explanation`: the account of M5 and M6 agrees with the prose, and "it does not itself create debt or credit" agrees with M5 and M6, which change only the ceiling. It sets the K4 rejection apart from the transitions it bears on (finding 1).
- `formal:1`: verify says ok with no tripwire. `chart-64fcc7` and `external-W1-W2-W3-1d4587` agree with what `dossier verify --json` lists for M5, M6 and W3: the deciding chart entry and its checks, W3 `drawn`, and grounded by the external trial. Recheck: 8 same, 0 different, 0 not run.
- `formal:2`: M5 and M6 are `checked` by chart-64fcc7 together with the model answers in finding 3. Had M5 been false at ceiling 2, its chart check would have failed. At ceiling 3, and for M6 anywhere, neither side would have come back otherwise (findings 2 and 3). W3 is `drawn`: chart only.
- `formal:3`: T2, that the ceiling stands in for every limit, agrees with C2's limitation that four is a model constant. T1 says nothing about the ceiling. Neither hides a claim a checker could take.
- `formal:6`: the Vault's prose has no Given. Nothing to examine.
- `formal:8`: K4 (`parts/vault/prose.md` line 48) is assumed, with no backing, and rejected. Every model answer's snapshot records it as assumed, so backing it would lapse the model-side marks. The chart-side marks and the claims here do not rest on its truth. If it is false in the way the owner says, change is not the only way the ceiling moves (finding 1).
- `formal:9`: the pinned `vault#observation:checkpoint-2026-11-01` reads the ceiling at 2000000 HRD and debt at 1500000 at block 26300000. The model's ceiling of 2 to 4 is a scaled abstraction of that. The claims carry no pins.
- `formal:13`: no recorded witness, violated cell or blunder trace sends change. The chart keeps no trace for a passing walk check, so I replayed W3 by hand against the prose (see C3/M1). The external answer keeps only end values, and they match.
- `formal:14`: neither `chart-64fcc7` nor `external-W1-W2-W3-1d4587` has a previous answer or a miscall. Nothing to classify.
- `formal:15`: `decisions.log` holds no risk. Nothing to examine.
- `formal:16`: the chart's reach is the boundary's ranges, and its 31 snapshots include ceiling 4, which M6's check found. The external reach, each walk from a fresh Vault on the stand-in, is the stand-in's. Nothing is narrowed.
- `formal:17`: no entry this behavior rests on has `previous`, `narrowed` or `replaced`. M5's and M6's passage hashes are the same in every answer's snapshot. `prose.md` and the model are unchanged since commit 5f7e9b9, and the behavior file first appears in commit 9f94d71, so no claim id was reused.
- `formal:18`: K4 is rejected and owes the prose a sentence (finding 1). M5, M6 and W3 are unsettled. Seam X2 is `checked`, with its counterpart, the Timelock's X1, word for word. No unsaid pair and no doubts file.
- `formal:19`: finding 5.
- `formal:20`: the Vault has no Once or Within. Nothing to examine.

## Not examined

- `formal:4`, `formal:5` and `formal:7`: they do not concern how the ceiling changes, and the other two reviews of this date examine them.
- `formal:10`, `formal:11` and `formal:12`: compositions only. The Control composition, which wires the Timelock's change to the Vault, is reviewed separately, as is the Timelock itself.
- Who holds `auth` on the deployed Vault, and whether the deployment runs the pinned source.
- The trials' local bundles, and the soundness of the checkers.
