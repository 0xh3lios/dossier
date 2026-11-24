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
      "sha256": "40b39cf9803c679b68494e74cf80f8d469727a2793fea713b3bdc0c4af5ae1d3"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/token/evidence/chart-64fcc7.json",
      "sha256": "b2988ec92caa626bc158ea6aadb681f1dddd0f0a47c5a541327bb1b0c7fbb7e8"
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
      "sha256": "c36cf497e9801e0ddbd6c151f0cdd7e8739d2bfe2bd81bcc0372b7c67d9b8582"
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
      "path": "parts/token/evidence/tlc-A1-09afe0.json",
      "sha256": "7c310fb6309d386fac8827661952a07c252feae82a10d39690a19831b21a8f48"
    },
    {
      "role": "additional",
      "root": "knowledge",
      "path": "modules/token/behavior/operations.md",
      "sha256": "35f24c42dc617f840ae87f93b106a838875cb128cd10d93a82589f3e0f71ba8e"
    }
  ],
  "coverage": {
    "examined": [
      "behavior:transfer-without-supply-change:claims",
      "behavior:transfer-without-supply-change:scope",
      "behavior:transfer-without-supply-change:mappings",
      "behavior:transfer-without-supply-change:explanation",
      "formal:1",
      "formal:2",
      "formal:3",
      "formal:6",
      "formal:7",
      "formal:8",
      "formal:9",
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
        "reason": "Does not apply: the behavior's only claim maps to M3, a Move, and depends on no Always, Once or Within. A1 is examined in the review of mint-and-burn."
      },
      {
        "item": "formal:5",
        "reason": "Does not apply: a blunder tests a property, and no property is among this behavior's dependencies. No property states that a transfer keeps the supply, so none could be blundered."
      },
      {
        "item": "formal:10",
        "reason": "Does not apply: closure belongs to a composition. parts/token is a part, and the Supply composition that has it as a member is outside this subject."
      },
      {
        "item": "formal:11",
        "reason": "Does not apply: wiring belongs to a composition. A part has no wiring.md and no free sends."
      },
      {
        "item": "formal:12",
        "reason": "Does not apply: scenarios belong to a composition. Every answer of this part runs under no scenario."
      },
      {
        "item": "formal:13",
        "reason": "Does not apply: the behavior's only answer, chart-64fcc7, records checks and no trace, and no witness, violated cell or blunder trace exercises transfer. W1's chart replay passes through a transfer but keeps no trace to retell."
      }
    ]
  },
  "replaces": [],
  "assessments": [
    {
      "mapping": "transfer-without-supply-change/C1/M1",
      "result": "too-broad",
      "rationale": "M3 (prose.md line 19) says Live stays Live on transfer and names no change. Its deciding chart answer, chart-64fcc7, established by trial 2026-11-24-1431-chart-e9477f, records 'M3: Live receives transfer as said' passed (line 93) and the one-applies check passed (line 127) over 5 explored snapshots. The move check replays M3 at one explored snapshot and compares only the target state, since M3 names no change, and the one-applies check compares no data. So the target establishes a narrower statement: a transfer is accepted in Live and keeps the chart in Live, and M3 alone takes transfer at every supply value. No check on this target observes that the supply is unchanged, and both would still have passed had the chart changed supply on a transfer. The only recorded comparison is W1's replay (line 117), another target, at supply 2. Read from the IR the answer binds (chart/machine.json lines 193-200, no assignment and no effect) together with the chart compiler's empty update, the claim is true of the chart by construction, but that reading is an inspection, not the recorded evidence, and cannot widen it. Recheck returned the answer the same.",
      "limitations": [
        "Missing: a recorded check that compares supply before and after a transfer at every explored snapshot, such as a move check that also compares the data a move leaves unnamed, or a property that states it.",
        "The reviewer's inspection of the bound IR and the chart compiler finds the claim true of the chart. It is not evidence of the recorded kind and does not change the result.",
        "Model scope only: the abstraction has no named holders, balances, approvals or transfer refusals, and the source's ERC-20 transfer was not examined."
      ]
    }
  ]
}
```

# Review of Transfer without changing supply

Subject: the behavior `transfer-without-supply-change` of `parts/token`, with one claim and one mapping. This is an independent second read for the Dossier 0.3.0 release, made from the files alone after the rebuild that wrote every answer afresh. It assesses this one behavior. It does not stand in for the dossier review the Token owes, records no decision, sets no mark and ran no trial.

## Standing when the review began

`dossier verify --brief parts/token`, without its `read:` line. The review of `mint-and-burn` written the same day was already in place, which is why three claims read as supported:

```text
verify: ok · 6 parts, 3 compositions · dossier 0.3.0 · 0 tripwires
Token: 15 passages · settled 8 · confirmed 8 · unsettled 7 · checked 11 · drawn 1 · backed 1 · text 2 · prose@825926
  claims: 2 behaviors, 5 claims · supported 3 · evidence unreviewed 1 · hypothesis 1
  next: Encode — not tried on the model side: W1
  flags: review owed (no current dossier review with complete scoped basis and coverage)
next: Encode on parts/oracle — Oracle: not tried on the model side: M2 M3; Timelock: not tried on the model side: M3; Token: not tried on the model side: W1
```

`dossier review-basis parts/token --behavior transfer-without-supply-change --json` reported 8 required files and no issues, the same before and after the other review was written. The record above binds them unchanged and adds, as `additional`, five files this review read and relies on: the collection's README, the compiled chart `chart/machine.json`, the model `model/Token.tla`, the TLC answer `evidence/tlc-A1-09afe0.json` and the token's operations record.

Two files the judgment depends on lie outside both roots and are named instead, in the dossier plugin repository at commit `9f94d71bb39755171813b2c0f5ea3ec205f62f8e`: the chart checker `src/chart/checks.ts` and the chart compiler `src/chart/machine.ts`. The chart spec cited below is `spec/chart.md` at the same commit.

## Recheck

`dossier recheck parts/token`, run once for the dossier:

```text
same: parts/token/evidence/chart-64fcc7.json · as-called, checks pass, reach the chart over supply 0..4
same: parts/token/evidence/tlc-A1-09afe0.json · as-called, TypeOK holds, A1 holds, reach amounts up to 2; supply up to 4
same: parts/token/evidence/blunder-A1-2c362d.json · as-called, A1 violated, reach amounts up to 2
same: parts/token/evidence/external-W1-08c91c.json · as-called, W1 pass, reach the stand-in deployment
recheck: 4 same, 0 different, 0 not run
```

The comparison wrote nothing and creates no evidence. Of these, chart-64fcc7 is this behavior's evidence, and tlc-A1-09afe0 is read for M3's model side.

## Assessment

| Mapping | Target | Relation | Result |
| --- | --- | --- | --- |
| transfer-without-supply-change/C1/M1 | M3, chart side | supports | too-broad |

The target establishes that a transfer is accepted in Live, keeps the chart in Live and is taken by M3 alone at every supply value. It does not establish that the supply is unchanged, since no check on this target compares it (F1). Read from the bound IR, the claim is true of the chart by construction, but that reading is an inspection and no recorded evidence, so the result is too-broad. The rationale and limitations are in the record above.

## Findings

Ordered by importance. A status describes the support for the finding's own statement, not whether a property passes.

### F1. M3's chart check compares no datum, so no recorded check establishes the unchanged supply

- Affects: transfer-without-supply-change/C1/M1; passage M3, chart side; chart-64fcc7, trial 2026-11-24-1431-chart-e9477f.
- Statement: The chart's move check replays a move at the first explored snapshot whose guard holds, and compares there the target state and the changes the passage names (`src/chart/checks.ts` lines 137-159; `spec/chart.md` line 23). M3 names no change (prose line 19), so its check, "M3: Live receives transfer as said" (chart-64fcc7 line 93), compared only the target state Live, at one snapshot. Had the chart changed supply on a transfer, that check would still have passed. The one-applies check (line 127) shows that M3 alone takes transfer at each of the five explored snapshots, but compares no data either. The only recorded comparison is indirect and belongs to another target: W1's replay (line 117) mints 2, transfers, burns 2 and ends at supply 0, which holds only if the transfer kept supply at 2. For every other snapshot the statement rests on inspection alone. The answer's snapshot binds the IR `e3f4cadfeac59a31` (line 197), the first sixteen digits of the SHA-256 of the IR that `chart/machine.json` holds, serialized compactly. There M3 has no assignment and no effect (`chart/machine.json` lines 193-200). The compiler builds a move with neither as an empty update of the context (`src/chart/machine.ts` line 75), so in that chart a transfer cannot change supply. That reading is the reviewer's, of a generated cache and of tool source, and is not a recorded check. The entry's input identity also states that the chart runtime is not frozen.
- Status: verified.
- Scope: the finite chart over supply 0..4.
- Missing evidence: a recorded check that compares supply before and after a transfer at every explored snapshot, for example a move check that also compares the data a move leaves unnamed. This is why the assessment of C1/M1 is `too-broad` rather than `supported`: the inspection finds the claim true of the chart, but it cannot stand in for the recorded check.

### F2. E3's words "the supply does not" sit in a checked passage that no check tests

- Affects: E3 and M3, both marked `checked`; transfer-without-supply-change/C1.
- Statement: E3 (prose line 14) reads "transfer, from the Holder: HRD changes hands; the supply does not." Its chart check, "E3: transfer is handled" (chart-64fcc7 line 69), passes when a move accepts transfer on an explored path. Its model-side cover is M3_Transfer having fired in tlc-A1-09afe0 (lines 66-73). Neither tests the clause. The model encodes it in M3_Transfer as `UNCHANGED <<supply>>` (`model/Token.tla` line 50), and no property in the model or the prose states it, so no answer and no blunder could test it. The behavior's point is carried by these words and by M3's lack of a change. F1 says how far the chart's answer goes.
- Status: verified.
- Scope: the prose, the model and their recorded checks.
- Missing evidence: a property or check that states that a transfer keeps the supply, should the keeper want the point checked rather than built in.

### F3. The owner accepted E3 and M3 in words about mint and burn

- Affects: E3 and M3, both settled.
- Statement: `decisions.log` line 1 accepts S1, E1, E2, E3, M1, M2, M3 and A1 at their current hashes with the words "only the adapter mints and burns". The acceptance of E3 and M3 stands at their hashes, but its words describe who may mint and burn, and say nothing of transfer or of the supply it keeps.
- Status: verified.
- Scope: the owner's decisions as recorded. This review implies none.
- Missing evidence: none. How the owner words an acceptance is the owner's.

### F4. Nothing in this dossier establishes what the source's transfer does

- Affects: the claim's scope and the explanation.
- Statement: The claim is a model claim with no pins. The README says the model tracks supply only, without balances, allowances or destinations (line 13). The token records keep transfers as standard ERC-20 and not as operations (`modules/token/behavior/operations.md` line 72). The source-level counterpart of this claim is the record behind K1: its statement says totalSupply changes only in mint and burn, and its check hint says transfers leave totalSupply unchanged (`modules/token/behavior/invariants.md` lines 8 and 14). The behavior maps no knowledge record, and that record cites the source only by URL, so nothing here ties the source's transfer to the model's. The explanation keeps to that scope: it "does not describe an ERC-20 transfer implementation, its approvals or its refusal conditions" (`behaviors/transfer-without-supply-change.md` line 42).
- Status: verified.
- Scope: model against source. The claim is correct for its model scope.
- Missing evidence: a reviewed knowledge-backing mapping, if a source claim about transfer is ever wanted.

### F5. The record agrees with itself and with its history

- Affects: chart-64fcc7 and the passages it covers for this behavior.
- Statement: Verify says ok with no tripwire. In `dossier verify --json`, M3's mark lists chart-64fcc7 and tlc-A1-09afe0 with trials 2026-11-24-1431-chart-e9477f and 2026-11-24-1431-tlc-84d374, matching the entries, and its reach matches. `integrity.json` binds chart-64fcc7's digest and the whole decision log. Against the committed fixture, the rebuild changed only the entry's `established` field (trial id, time, versions and bundle digest). Its `previous`, `narrowed` and `replaced` are null. The prose is unchanged since the dossier's first commit, apart from a move of folder, and the behavior since it was added. Recheck returned the answer the same.
- Status: verified.
- Scope: the record as it stands and as version control keeps it.
- Missing evidence: none.

## What each item examined

- `behavior:transfer-without-supply-change:claims`: The one claim (`behaviors/transfer-without-supply-change.md` lines 7-33) is one descriptive statement that can be judged by itself. It states no assumption and needs none, since M3 is unguarded and the prose has no Given.
- `behavior:transfer-without-supply-change:scope`: A model claim with no pins, scoped to M3 in the Live chart state. That fits: the chart has the single state Live, and transfer carries no field, so one event case at each of five snapshots is its whole domain. F4 concerns the source.
- `behavior:transfer-without-supply-change:mappings`: The one mapping resolves current, with no conflict. Its rationale, "M3 stays Live and applies no supply update", is true of the compiled chart, but the target's checks establish only its first half, so the result is too-broad (F1). Its limitation, no named holders and no balance validation, agrees with T2 (prose line 37) and the README (line 13).
- `behavior:transfer-without-supply-change:explanation`: Lines 38-42 agree with the claim and its limits. "The event therefore stays in Live and has no supply update" is what M3 and the IR say. Transfer does appear between mint and burn in W1 without changing the result, which the walk's replay shows at supply 2.
- `formal:1`: Verify is ok with no tripwire. chart-64fcc7 and tlc-A1-09afe0 were read in full and compared with `dossier verify --json` and with `integrity.json`, and recheck ran once (F5).
- `formal:2`: M3 is `checked`: chart-64fcc7 decides its chart side and tlc-A1-09afe0 its model side, the latter because M3_Transfer fired. The checks that cover M3 would not have come back otherwise had a transfer changed supply: the chart's M3 check compares no datum, and firing is all the model-side rule asks (F1, F2). Other checks in the same answers would catch some such faults, W1's replay one that changes supply at 2 and A1 one that raises it past 4. E3 is `checked` by the same thin rules, and S1 by reachability and Init.
- `formal:3`: T2 (prose line 37) states what the abstraction leaves out, which the mapping's limitation repeats, and hides no claim. T1 does not bear on transfer. The claim that could have been checked sits instead in E3's words (F2).
- `formal:6`: The prose has no G passage. Transfer's sender, the Holder, is an actor without pins (`actors/actors.md` lines 15-18), and M3 needs no Given, since it is unguarded and accepted at every snapshot. There is no Given to judge.
- `formal:7`: K1's backing, `token#property:supply-only-via-adapter` (`modules/token/behavior/invariants.md` lines 5-16), says what K1 says, and is the source-level counterpart of this claim. The behavior does not map to it (F4).
- `formal:8`: No guarantee is assumed, since K1 is backed. Nothing applies.
- `formal:9`: The prose names no `Pins:` line, the answer's snapshot records are empty, and the claim pins nothing. As a model claim it has no instance to compare.
- `formal:14`: chart-64fcc7 came back as called, with no miscall and no `previous`. Nothing applies.
- `formal:15`: `decisions.log` holds one accept and no risk, and a part has no cells. Nothing applies.
- `formal:16`: The chart's reach, "the chart over supply 0..4" with 5 explored snapshots, is the boundary's whole range (prose line 6). Transfer carries no field to bound. The entry is not narrowed.
- `formal:17`: The history is clean (F5). No passage this behavior rests on changed between answers.
- `formal:18`: Transfer has one move and no refusal, and no pair is unsaid (`chart/machine.json` lines 385-386; the entry's `gaps` at line 159 is empty). There is no `doubts.md`. Seam X1 concerns mint and burn, not transfer. M3, E3 and S1 are settled (F3). T2 and K1, which bound this claim's scope, are unsettled.
- `formal:19`: W1 is the only walk that takes a transfer, at supply 2. No walk transfers at another supply value, and the prose has no refused transfer to walk. This is why the recorded comparison in F1 is a single point.
- `formal:20`: The prose has no Within, Once or Given. Nothing applies.

## Not examined

- The Supply composition, which has this part as a member, and any transfer it may model. It is outside this subject.
- The source's ERC-20 transfer, approvals and refusal conditions. The records name the source only by URL, and the claim does not speak of it.
- Trial bundles, which are not part of the record.
- The behavior `mint-and-burn`, which has its own review, and the dossier as a whole, which still owes a review.
