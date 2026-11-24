```json
{
  "format": "dossier-review@0.2.0",
  "subject": {
    "kind": "behavior",
    "dossier": "parts/vault",
    "behaviors": [
      "move-credit"
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
      "path": "parts/vault/behaviors/move-credit.md",
      "sha256": "73557a0ba5592c7ad74865810e577ad732562f8f296c4f24f586759a1a5b61f1",
      "claims": {
        "C1": "61acef1192218a4f1125442c18c1ec8b3fdcae71c5d8493ce7503f955a322ecd",
        "C2": "6f2feed5e33c5822e2d6afbfeda6591278209149a1fc8b44b860cca31ddce529"
      },
      "explanation": "a45e516e0c5c9cb536df25f90fbd183a37380eebad316edafa98c9e269d7eb4a"
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
      "path": "parts/vault/model/Vault.tla",
      "sha256": "4ee0c1c2aad920b34c03d500450054518ff9ded215dae317700601b62799d2b0"
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
      "behavior:move-credit:claims",
      "behavior:move-credit:scope",
      "behavior:move-credit:mappings",
      "behavior:move-credit:explanation",
      "formal:1",
      "formal:2",
      "formal:6",
      "formal:7",
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
        "item": "formal:3",
        "reason": "Does not apply: the words-only passages T1 and T2 say nothing about move or release. They are examined in the borrow-and-repay review of this date."
      },
      {
        "item": "formal:4",
        "reason": "Does not apply: this behavior's claims map to the Moves M3 and M4, not to an Always, Once or Within. A1 and A2 are examined in the borrow-and-repay review of this date."
      },
      {
        "item": "formal:5",
        "reason": "Does not apply: no property is a target of this behavior, so no blunder bears on its claims. The A1 and A2 blunders are examined in the borrow-and-repay review of this date."
      },
      {
        "item": "formal:8",
        "reason": "Does not apply: the only assumed guarantee, K4, concerns the ceiling, not credit moves. It is examined in the raise-ceiling review of this date."
      },
      {
        "item": "formal:10",
        "reason": "Does not apply: parts/vault is a part, with no closure rules. The Supply composition, which wires move and release, is reviewed separately."
      },
      {
        "item": "formal:11",
        "reason": "Does not apply: parts/vault is a part, with no wiring or free sends. The Adapter-to-Vault wiring belongs to the Supply composition."
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
      "mapping": "move-credit/C1/M1",
      "result": "too-broad",
      "rationale": "M3's chart side is decided by chart-64fcc7, established by trial 2026-11-24-1430-chart-a57cb9. The check that compares M3 with its passage, 'M3: Open receives move as said', stops at the first explored snapshot and event case where M3's guard holds (dossier repository, src/chart/checks.ts lines 137-159). Exploration is breadth first from the initial snapshot, where free is 0, so the only move that meets amount <= free there is a move of 0: the check compared a move that leaves free and issued at 0. The one-applies check evaluates the prose's guards at every explored snapshot and shows that no other Move or Refusal applies to move where M3's guard holds. No walk sends move. The target therefore establishes that M3's transition exists, is the only one, and replays as said for a zero amount. That is narrower than the claim that every accepted move takes the requested amount from free to issued.",
      "limitations": [
        "That every accepted move applies M3's change follows from how the chart is built from the passage's expression. No recorded check compares it beyond the one case.",
        "The model's action (model/Vault.tla lines 75-85) encodes the same change. Its cover is that M3_Move fired in the W1 witness run, and no model property compares the amount moved.",
        "An answer that compares every accepted move with M3, such as a chart check over every snapshot and amount, or a model property on the move action, would support the claim as worded.",
        "Local to the Vault. Whether the Token minted belongs to the Supply composition."
      ]
    },
    {
      "mapping": "move-credit/C2/M1",
      "result": "too-broad",
      "rationale": "M4's chart side is decided by chart-64fcc7, established by trial 2026-11-24-1430-chart-a57cb9. Its check, 'M4: Open receives release as said', stops at the first explored snapshot and event case where M4's guard holds (dossier repository, src/chart/checks.ts lines 137-159). At the initial snapshot issued is 0, so the only release that meets amount <= issued is a release of 0, which leaves both balances at 0. The one-applies check evaluates the prose's guards at every explored snapshot and shows that no other Move or Refusal applies to release where M4's guard holds. No walk sends release. The target establishes that M4's transition exists, is the only one, and replays as said for a zero amount, which is narrower than the claim for every accepted release.",
      "limitations": [
        "That every accepted release applies M4's change follows from how the chart is built, not from a recorded comparison.",
        "The model's action (model/Vault.tla lines 87-97) encodes the same change. Its cover is that M4_Release fired in the W1 witness run, where it found no new distinct state.",
        "An answer that compares every accepted release with M4 would support the claim as worded.",
        "This does not show that tokens were burned. That belongs to the Supply composition."
      ]
    }
  ]
}
```

# Review of move-credit

An independent second read of one behavior of `parts/vault`, made for the Dossier 0.3.0 release after the fixture was rebuilt with the real solvers. It covers the behavior's two claims and what they depend on. It does not count as a review of the whole dossier.

## Verify before the review

```
verify: ok · 6 parts, 3 compositions · dossier 0.3.0 · 0 tripwires
Vault: 29 passages · settled 12 · confirmed 12 · unsettled 16 · rejected 1 · proved 2 · checked 19 · drawn 2 · backed 3 · assumed 1 · text 2 · prose@2fb3b4
  claims: 3 behaviors, 8 claims · evidence unreviewed 7 · hypothesis 1
  next: Write — rejected: K4
  flags: review owed (no current dossier review with complete scoped basis and coverage)
next: Encode on parts/oracle — Oracle: not tried on the model side: M2 M3; Timelock: not tried on the model side: M3; Token: not tried on the model side: W1
```

`dossier review-basis parts/vault --behavior move-credit --json` reported no issues and 9 required files, all bound above unchanged. Three additional files are bound, because the findings rest on them: the W1 witness entry, which decides M3's and M4's model side; the model, whose move and release actions I compared with the passages; and the pinned Vault source, which finding 4 cites.

`dossier recheck parts/vault` asked all eight recorded questions again: 8 came back the same, 0 different, 0 not run. It wrote nothing and is no new evidence.

## Assessments

| Mapping | Target | Result |
| --- | --- | --- |
| C1/M1 | M3, chart side | too-broad |
| C2/M1 | M4, chart side | too-broad |

Reading the prose and `parts/vault/model/Vault.tla` lines 75 to 97, I find both claims true of the abstraction as written: every accepted move and release changes free and issued by the requested amount. That reading is an inspection, not evidence. The assessments ask what the recorded target establishes, and the chart's answer compared only a zero amount (finding 1). These are the reviewer's assessments. The marks are the tool's, and the owner's decisions are in `decisions.log`.

## Findings

Ordered by importance.

### 1. The chart's move checks compared a move of 0 and a release of 0, and nothing else

- Affects: M3 and M4; entry `chart-64fcc7`, trial 2026-11-24-1430-chart-a57cb9; mappings C1/M1 and C2/M1.
- Statement: The chart specification describes a Move check as failing when "At a snapshot where its guard holds, the target or a change differs from the passage" (dossier repository, `spec/chart.md` line 23), which can be read as every such snapshot. The check stops at the first explored snapshot and event case where the guard holds (dossier repository, commit 9f94d71bb39755171813b2c0f5ea3ec205f62f8e, `src/chart/checks.ts` lines 137 to 159: both branches end with `break outer`). It compares only the target state and the changes the passage lists, not the data the passage leaves alone (lines 147 to 152). The graph library recorded in the entry, @xstate/graph 3.0.4, builds its map breadth first from the initial snapshot, so that snapshot comes first. There free and issued are 0, and the only move and release cases whose guards hold are amounts of 0. So `M3: Open receives move as said` and `M4: Open receives release as said` (`parts/vault/evidence/chart-64fcc7.json` lines 109 and 117) passed by comparing two no-ops. No walk sends move or release (`parts/vault/prose.md` lines 36 to 38). No recorded answer, on either side, compares a nonzero move or release with its passage.
- Status: verified, by reading the check, the graph library's traversal and the entry.
- Scope: the chart side of M3 and M4. The same mechanism applies to every Move's chart check in every dossier.
- Missing: a check that compares every explored case, or a model property on the move and release actions, to support claims worded for every accepted move.

### 2. The model-side covers of M3 and M4 rest on the actions firing

- Affects: M3 and M4, marked `checked`; entry `tlc-W1-a19770`, trial 2026-11-24-1431-tlc-80392a.
- Statement: The model side of both is decided by the W1 witness, the latest TLC answer that covers them. That run stopped at depth 3 on the walk's end, with M3_Move generating 3 states and M4_Release 2, and M4_Release finding no new distinct state (`parts/vault/evidence/tlc-W1-a19770.json` lines 117 to 132). An action that moved some other amount between free and issued would have fired the same way. A1's proof catches a change that breaks debt equal to free plus issued, but not one that takes the same wrong amount from free and adds it to issued. This is the thin mechanical rule formal item 2 asks to name.
- Status: verified.

### 3. No walk takes move, release or their refusals

- Affects: M3, M4, R3 and R4.
- Statement: The walks W1 to W3 use borrow, repay and change only (`parts/vault/prose.md` lines 36 to 38). R3 and R4 pass the chart's refusal check, which tries every explored snapshot and amount where their conditions hold, and as conditional refusals they need no model answer. Still, no walk takes a move, a release or a refusal of either, and no recorded trace shows one.
- Status: verified.

### 4. K3's backing rule is narrower than K3

- Affects: K3. No claim of this behavior maps to it. The explanation's account of who moves credit is where it bears.
- Statement: K3 says "Only the Adapter moves credit between free and issued" (`parts/vault/prose.md` line 47). Its rule `onlyAdapterMovesCredit` (`modules/vault/source-cache/github/commit-1a2b-9f8e/certora/Vault.spec` lines 67 to 75, knowledge root) is filtered to move and release, and asserts that a successful call of either came from the adapter. It does not speak to any other function. The pinned source has no other function that changes issued (`modules/vault/source-cache/github/commit-1a2b-9f8e/src/Vault.sol`), but that is an inspection, not what the rule proves. The knowledge base holds the specification, not a run's result, so `backed` records that the rule was found.
- Status: verified. Importance: low for this behavior.

## Items examined

- `behavior:move-credit:claims`: C1 and C2 are each one statement that can be judged, descriptive, about the model, with no assumption needed. Both are universal ("for each accepted move", "for each accepted release"), and that is why finding 1 matters.
- `behavior:move-credit:scope`: model-level, with no pins. The amounts include 0, as the prose's "up to 2" and the model's 0..2 do, so a zero move is accepted and changes nothing. "Credit balances in 0..4" is read as the reachable balances, where free plus issued equals debt and debt is at most the ceiling, since those are what the chart explores. The Adapter, a part, is the declared sender of both events (`parts/vault/prose.md` lines 15 and 16). Nothing wrong.
- `behavior:move-credit:mappings`: each mapping joins its claim to the right passage and side, with the relation it declares. The recorded evidence is narrower than the claims. See the assessments and finding 1.
- `behavior:move-credit:explanation`: the account agrees with M3, M4 and the model. Neither action changes debt: the passages name no change to debt, the model leaves it unchanged, and A1 is proved. It leaves minting and burning to Supply and claims nothing for the Token. Nothing wrong in the words. Their support is as thin as finding 1 says.
- `formal:1`: verify says ok with no tripwire. `chart-64fcc7` and `tlc-W1-a19770` agree with what `dossier verify --json` lists for M3 and M4: the deciding chart entry and its checks, and the W1 witness on the model side. Recheck: 8 same, 0 different, 0 not run.
- `formal:2`: M3 and M4 are `checked`. The chart side is chart-64fcc7 (trial 2026-11-24-1430-chart-a57cb9), and the model side is tlc-W1-a19770 (trial 2026-11-24-1431-tlc-80392a). Had either passage been false for a nonzero amount, neither answer would have come back otherwise: findings 1 and 2. R3 and R4 are `checked` by the chart's refusal check over every case where their conditions hold, which would have failed had the machine accepted one.
- `formal:6`: the Vault's prose has no Given. The Adapter is a part, so no Given restrains it here. Nothing to examine.
- `formal:7`: K3, read against its rule. Finding 4.
- `formal:9`: the pinned `vault#observation:checkpoint-2026-11-01` reads free 900000 and issued 600000 HRD at block 26300000, summing to debt 1500000. That is one block's split of credit, consistent with the model. The claims carry no pins.
- `formal:13`: no recorded witness, violated cell or blunder trace exercises move or release. The W1 witness and both blunder traces use borrow and repay only, and the chart keeps no trace for a passing check. That is a limit of the evidence.
- `formal:14`: neither `chart-64fcc7` nor `tlc-W1-a19770` has a previous answer or a miscall. Nothing to classify.
- `formal:15`: `decisions.log` holds no risk. Nothing to examine.
- `formal:16`: the chart's reach is the boundary's ranges (`parts/vault/prose.md` line 7 and lines 15 and 16). Its 31 snapshots are every reachable combination of the balances and the ceiling. The witness's reach, amounts up to 2, matches the events. Nothing is narrowed.
- `formal:17`: `chart-64fcc7` has no `previous`, `narrowed` or `replaced`. M3's and M4's passage hashes are the same in every answer's snapshot. `prose.md` and the model are unchanged since commit 5f7e9b9, and the behavior file first appears in commit 9f94d71, so no claim id was reused.
- `formal:18`: no unsaid pair (`parts/vault/chart/grid.md`) and no doubts file. Seam X1 is `checked`, with its counterpart in the Adapter's prose word for word, as verify marks it. M3 and M4 are settled by the accept on `decisions.log` line 1. R3 and R4 are unsettled.
- `formal:19`: finding 3.
- `formal:20`: the Vault has no Once or Within. Nothing to examine.

## Not examined

- `formal:3`, `formal:4`, `formal:5` and `formal:8`: they do not concern move or release, and the other two reviews of this date examine them.
- `formal:10`, `formal:11` and `formal:12`: compositions only. The Supply composition, which wires the Adapter's move and release into the Vault and checks that the balances agree, is reviewed separately.
- The trials' local bundles, and the soundness of the checkers.
- The source's per-user credit, which the model leaves out with individual holders.
