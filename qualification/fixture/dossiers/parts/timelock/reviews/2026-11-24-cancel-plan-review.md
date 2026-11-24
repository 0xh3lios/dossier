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
      "sha256": "091233d56d0ce8f7d83cb7fbf53fb604ae5f8091c12c31af406c5b79e4673cc0"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/timelock/evidence/chart-64fcc7.json",
      "sha256": "b81720879858cf387e1a304f802da8e4b3ad6059e0f081e1d54d6bef8e94d971"
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
      "sha256": "bb958264ad39ebd8078e1bd1da7bcec1cc75039c5947201a5bd47aeca2163379"
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
      "sha256": "8c4a54f442ca2b5a289c4790245739bb814d94bdd8cf39496832849c9232e06d"
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
      "root": "knowledge",
      "path": "modules/timelock/behavior/operations.md",
      "sha256": "7648a31ee48e466072395704799f442fe3bfec5bbb4ab13f357910483d438ea6"
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
      "formal:13",
      "formal:14",
      "formal:15",
      "formal:16",
      "formal:17",
      "formal:18",
      "formal:19"
    ],
    "unexamined": [
      {
        "item": "formal:3",
        "reason": "Does not apply: T1 is the only words-only passage, and no claim or sentence of this behavior rests on it."
      },
      {
        "item": "formal:4",
        "reason": "Does not apply: this behavior maps no Always, Once or Within. Its targets are the walk W2 alone, whose end predicate is read under formal:2 and formal:13."
      },
      {
        "item": "formal:5",
        "reason": "Does not apply: blunders test Always, Once and Within properties, and this behavior maps none."
      },
      {
        "item": "formal:6",
        "reason": "Does not apply: no claim of this behavior cites a Given, and cancel, Governance's move, has none."
      },
      {
        "item": "formal:7",
        "reason": "Does not apply: every claim of this behavior is model-level with no pins, and no mapping targets a guarantee. K1 and its backing record enter this review only as lapse triggers in the answers' snapshots."
      },
      {
        "item": "formal:8",
        "reason": "Does not apply: no claim of this behavior rests on the assumed K2."
      },
      {
        "item": "formal:9",
        "reason": "Does not apply: the claims carry no pins and make no source or deployment claim. The prose's pin enters the answers' snapshots only as a lapse trigger."
      },
      {
        "item": "formal:10",
        "reason": "Does not apply: closure is a composition item, and parts/timelock is a part."
      },
      {
        "item": "formal:11",
        "reason": "Does not apply: wiring is a composition item, and parts/timelock is a part."
      },
      {
        "item": "formal:12",
        "reason": "Does not apply: scenarios are a composition item, and a part has none."
      },
      {
        "item": "formal:20",
        "reason": "Does not apply: this behavior maps no Within and no Once."
      }
    ]
  },
  "replaces": [],
  "assessments": [
    {
      "mapping": "cancel-plan/C1/M1",
      "result": "supported",
      "rationale": "W2 (prose.md line 45) is checked. The chart replay passed (chart-64fcc7, check \"W2: walk Cancelled replays\"); it attempts execute after the cancel and finds it refused. The witness tlc-W2-c29421 (trial 2026-11-24-1431-tlc-a9a696) matched its called trace Idle/0 > Scheduled/2 > Scheduled/1 > Idle/1. Retold from the entry: M4_Schedule, M2_Tick from remaining 2 to 1, M6_Cancel. W2_End then also requires that M5 is not enabled and that no change was sent since the walk armed (Timelock.tla lines 53 and 154), and both hold. Cancel after one tick, a refused execute and no change sent are what the claim says.",
      "limitations": [
        "One path, at remaining 1.",
        "In the witness the refused execute is a state predicate on the final state. The chart replay is what attempts the event.",
        "Governance as the sender comes from the words of E4 (prose.md line 17). The part model checks no sender."
      ]
    },
    {
      "mapping": "cancel-plan/C2/M1",
      "result": "supported",
      "rationale": "The relation is illustrates, so the question is whether W2 is a faithful example. It is. The witness cancels from Scheduled with remaining 1 (tlc-W2-c29421, trace state 4, M6_Cancel), one of the three remaining values the claim ranges over, and the chart replay cancels at the same point. The rationale names it as the remaining=1 example, which is accurate.",
      "limitations": [
        "An illustration does not establish the general claim. C2 has no supporting mapping and stays a hypothesis.",
        "No mapped evidence shows cancel at remaining 2 or at remaining 0."
      ]
    }
  ]
}
```

# Review of "Cancel a waiting governance plan"

Subject: the behavior `cancel-plan` of `parts/timelock`, reviewed alone. A review of one behavior does not stand in for the dossier review that verify still flags as owed. Written on 2026-11-24 against the dossier as rebuilt under plugin 0.3.0, from the artifacts alone, with none of the keeper's conversation.

## Standing when the review began

`dossier verify --brief parts/timelock`, with its `read:` line left out:

```
verify: ok · 6 parts, 3 compositions · dossier 0.3.0 · 0 tripwires
Timelock: 26 passages · settled 16 · confirmed 15 · unsettled 10 · proved 1 · checked 19 · drawn 1 · backed 1 · assumed 1 · text 1 · given 2 · prose@70bff9
  claims: 3 behaviors, 8 claims · evidence unreviewed 6 · hypothesis 2
  next: Encode — not tried on the model side: M3
  flags: review owed (no current dossier review with complete scoped basis and coverage)
next: Encode on parts/oracle — Oracle: not tried on the model side: M2 M3; Timelock: not tried on the model side: M3; Token: not tried on the model side: W1
```

`dossier review-basis parts/timelock --behavior cancel-plan --json` reported no issues. Its 13 required files are bound above, unchanged. Two additional files are bound: `parts/timelock/README.md`, which findings F2 and F7 cite, and the knowledge file `modules/timelock/behavior/operations.md`, which F3 cites.

`dossier recheck parts/timelock`, run once for the dossier, wrote nothing:

```
same: parts/timelock/evidence/chart-64fcc7.json · as-called, checks pass, reach the chart over remaining 0..2
same: parts/timelock/evidence/tlc-A1-N1-59ce72.json · as-called, TypeOK holds, A1 holds, N1 holds, reach one plan; delay 2; effects up to 4
same: parts/timelock/evidence/tlc-O1-2be705.json · as-called, O1 holds, reach one plan; delay 2
same: parts/timelock/evidence/tlc-W2-c29421.json · as-called, TypeOK holds, NotW2 violated, reach one plan; delay 2
same: parts/timelock/evidence/tlc-W1-37d5b8.json · as-called, TypeOK holds, NotW1 violated, reach one plan; delay 2
same: parts/timelock/evidence/apalache-A1-78bb75.json · as-called, Inv_A1 holds, reach unbounded; TypeOK and A1 inductive
same: parts/timelock/evidence/blunder-A1-48f8c0.json · as-called, A1 violated, reach one plan; delay 2
same: parts/timelock/evidence/blunder-N1-0df476.json · as-called, N1 violated, reach one plan; delay 2
same: parts/timelock/evidence/blunder-O1-06ff15.json · as-called, O1 violated, reach one plan; delay 2
recheck: 9 same, 0 different, 0 not run
```

Every answer came back with the verdict, outcomes and reach its entry records. That includes the two this behavior's mappings resolve to, chart-64fcc7 and tlc-W2-c29421. Recheck repeats questions. It creates no evidence.

## Assessments

| Mapping | Target | Relation | Result |
| --- | --- | --- | --- |
| cancel-plan/C1/M1 | walk W2, checked | supports | supported |
| cancel-plan/C2/M1 | walk W2, checked | illustrates | supported, as a faithful example only |

C3 has no mapping, so it has no assessment. It is a hypothesis (F2). C2's only mapping illustrates, so C2 is a hypothesis too (F1). All three claims are model-level with no pins.

## Findings

They are ordered by importance. A status describes the support for the finding's own statement.

### F1. C2 stays a hypothesis. W2 is a faithful example, and nothing mapped establishes cancel at every remaining value

- Status: verified, for the statement that the support is missing. C2 itself is not verified by any mapped evidence.
- Scope: claim C2 (cancel-plan.md lines 34-60), the model and the chart.
- Statement: C2's only mapping illustrates (line 53), and verify reports the claim as a hypothesis. The model makes C2 true by reading. M6 has no condition (prose.md line 25), and M6_Cancel requires only `state = "Scheduled"` (Timelock.tla line 116), with no prompt and no other conjunct. The exhaustive answer tlc-A1-N1-59ce72 is consistent with this. It records M6_Cancel with 15 generated and 10 distinct states (tlc-A1-N1-59ce72.json lines 100-109). This reviewer's enumeration of the constrained graph has exactly 15 reachable Scheduled states, remaining 2, 1 and 0 for each sent_change from 0 to 4, and it reproduces every count that answer records: 39 distinct states; generated and distinct per action, M1 24 and 9, M2 10 and 10, M3 0 and 0, M4 24 and 5, M5 5 and 4, M6 15 and 10. So that run took cancel from every reachable Scheduled state. But the entry records counts, not states, and the conclusion rests on the enumeration, not on a recorded check. Mapping M6's chart side would not close the gap either. In the plugin repository at commit 9f94d71, the move check in `src/chart/checks.ts` (lines 138-158) stops at the first explored Scheduled snapshot that satisfies the move.
- Missing: evidence that names each remaining value, such as walks that cancel at remaining 2 and at remaining 0, then a mapping to it and a review. C2's own limitation says a new check is needed (line 56).

### F2. C3 has no mapping and no evidence, and the model allows it by reading

- Status: verified.
- Scope: claim C3 (cancel-plan.md lines 61-72), the model.
- Statement: C3's mappings are empty (line 71), and verify reports a hypothesis. By reading the model, M6 leaves remaining unchanged (Timelock.tla line 118), so Idle can hold a stale value. The W2 witness ends in Idle with remaining 1 (tlc-W2-c29421.json, trace state 4 at line 98). M4 sets remaining to 2 from any Idle state (line 94, and prose.md line 23), so a replacement plan gets the full delay, and M2, M2 and M5 can follow. No walk and no answer shows that sequence, and README line 24 lists it as a separate question.
- Missing: a walk such as schedule, tick, cancel, schedule, tick, tick, execute, then a mapping and a review.

### F3. "Governance is the actor allowed to send cancel; this is not a public cleanup action" describes the prose's attribution. The part model checks no sender, and no claim maps the source-level record

- Status: verified.
- Scope: the explanation, cancel-plan.md lines 79-80.
- Statement: E4 names Governance as cancel's sender (prose.md line 17). In the model `Governance` is only a name for the disjunction of M4 and M6 (Timelock.tla line 126), and M6_Cancel's guard reads no sender (lines 115-117). The attribution is what a composition's scenario acts on when it sets an actor's mode. At model scope the sentence is a correct account of the prose, not a checked access rule. The knowledge record timelock#operation:cancel gives the precondition "msg.sender is governance" and `privileged: true` (operations.md lines 71-102, at lines 87 and 95). That record would be the source-level counterpart. No claim maps it, and this review did not assess it against the pinned source.

### F4. "that source reading" (cancel-plan.md line 85) names a reading of the prose and the model, not of the source

- Status: verified.
- Statement: The cancel move with no remaining-delay guard is M6 (prose.md line 25) and M6_Cancel (Timelock.tla line 116). No evidence in this behavior reads the contract source. The behavior contract uses model, source and deployment as scope levels, so "source" puts the observation at the wrong level. The next sentence says that the collection does not claim source behavior, so the intent is plain. Only the wording is at fault.

### F5. C1 is supported by W2's witness and its chart replay

- Status: verified.
- Scope: one path at remaining 1, in the model and in the chart.
- Statement: Retold from the entry, trial 2026-11-24-1431-tlc-a9a696: Idle/0. M4_Schedule to Scheduled/2, observer at 1. M2_Tick to Scheduled/1, observer at 2. M6_Cancel to Idle/1, observer at 3. `W2_End` (Timelock.tla line 154) then also requires `W2_Refused4`, M5 not enabled (line 53), and sent_change unchanged since the walk armed. Both hold in Idle with sent_change 0. The chart replay, "W2: walk Cancelled replays" (chart-64fcc7.json line 173), attempts execute after the cancel and finds it refused. The keeper's reading (tlc-W2-c29421.md line 1) agrees with this retelling. In the witness the refused execute is a predicate on the final state. The chart replay is what attempts the event.

### F6. The owner has accepted M6 but not W2

- Status: verified.
- Statement: decisions.log line 1 accepts M6 at cb6d8f36, its current hash. No decision names W2 or R1, and verify marks both unsettled. Both mapped claims rest on a walk the owner has not accepted. That is the owner's matter, and it changes neither assessment.

### F7. Paths of this mechanism that no walk takes

- Status: verified.
- Statement: W2 is the only walk through cancel, and it cancels at remaining 1. No walk cancels at remaining 2 or 0. No walk attempts cancel in Idle, R1's other event, which the chart's R1 check covers over every explored Idle snapshot (chart-64fcc7.json line 141). No walk schedules again after a cancel. The first two are what C2 asks, and the last is C3. README line 24 says the same.

### F8. Nothing wrong was found in the standing, the history, the reach, the miscalls or the risks

- Status: verified.
- formal:1: verify says ok, with 0 tripwires. integrity.json binds the nine entries with digests equal to the files' SHA-256. Two entries picked at random, tlc-W1-37d5b8 and blunder-O1-06ff15, agree with `dossier verify --json`. W1's mark cites the trial 2026-11-24-1431-tlc-b67048, O1's mark cites the blunder's trial 2026-11-24-1431-blunder-2421dc, and the files each one executed still have the digests its basis records. Recheck found all nine the same.
- formal:14: all nine entries are as-called and none has a previous answer. No miscall needs a classification.
- formal:15: a part has no cells. decisions.log holds one accept and no risk.
- formal:16: the boundary gives remaining 0..2 (prose.md line 7). The W2 witness ran on the whole constrained graph (MaxSent 4 under `CONSTRAINT SentBounded`, which bounds only the effect counter, as the call's reach says), and the chart covers remaining 0..2. C2's question ranges over remaining 0..2, and all three values are reachable in Scheduled. No entry is narrowed. The witness lists TypeOK both as holding and under `partial` (tlc-W2-c29421.json lines 179-181), so its TypeOK covers nothing.
- formal:17: every entry has `previous`, `narrowed` and `replaced` null. Version control holds four commits. The prose and the model entered in one commit (5f7e9b9), and the behaviors in another (9f94d71). Against the last commit (9f94d71), the 0.3.0 rebuild changed only each entry's `established` block and the decision's timestamp. No forbidden move is visible within that short history.

## Items

What each item read, and what came of it.

- `behavior:cancel-plan:claims`, examined. C1, C2 and C3 (cancel-plan.md lines 10, 37 and 64) are each one descriptive statement that can be judged alone. C1 describes one path, C2 generalizes it over every remaining value, and C3 asks what can follow. None states an assumption, and none needs one, since cancel is Governance's move and Governance has no Given here. Nothing wrong was found in the claims themselves. C2 and C3 lack support (F1 and F2).
- `behavior:cancel-plan:scope`, examined. All three claims are model-level with no pins, and their descriptions match their targets: the W2 path with remaining in 0..2, every reachable Scheduled state, and sequential plans. Governance sends cancel and the public sends execute (E3 and E4, prose.md lines 16-17), and both are declared in `actors/actors.md`. No claim speaks for the source or a deployment, and the explanation says so (line 86).
- `behavior:cancel-plan:mappings`, examined. C1/M1 joins C1 to W2 with the right relation, and its limitation keeps the evidence at one path. Its rationale says W2 "attempts execution". That is accurate for the chart replay, while the witness checks the refusal as a state predicate (F5). C2/M1 illustrates, and its limitation says that a new check is needed (F1). C3 has no mapping (F2).
- `behavior:cancel-plan:explanation`, examined. Lines 79-82 agree with M6, E4 and R1. The exclusivity sentence describes the prose's attribution (F3). Line 85 calls a prose reading a "source reading" (F4). The link to the prose resolves.
- `formal:1`, examined. See F8.
- `formal:2`, examined. W2 is checked by chart-64fcc7 (trial 2026-11-24-1431-chart-ab1807) and tlc-W2-c29421 (trial 2026-11-24-1431-tlc-a9a696). Had W2 been impossible, with cancel refused at remaining 1, execute enabled after it or a change sent, the replay would have named the step and TLC would have found NotW2 holding, a miscall. The rule is not thin here. The witness checks the end state, and the chart attempts every step (F5).
- `formal:13`, examined. The W2 witness was retold from its entry (F5), and the reading agrees. A part has no cells, and no blunder targets a walk, so no violated cell and no blunder trace concerns this behavior.
- `formal:14`, `formal:15`, `formal:16` and `formal:17`, examined. See F8.
- `formal:18`, examined. Open for this mechanism: W2 and R1 are unsettled (F6), and C2 and C3 are hypotheses (F1 and F2). No doubts file exists, verify flags nothing unsaid or said twice, and the chart answer reports no gaps (chart-64fcc7.json line 225).
- `formal:19`, examined. See F7.

Left unexamined, with the reasons the record gives: formal:3 to formal:12 and formal:20. In short, the behavior maps no Always, Once or Within, cites no Given, makes no source or deployment claim and is not a composition.
