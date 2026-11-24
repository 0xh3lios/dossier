```json
{
  "format": "dossier-review@0.2.0",
  "subject": {
    "kind": "behavior",
    "dossier": "parts/breaker",
    "behaviors": [
      "halt-once"
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
      "path": "parts/breaker/behaviors/halt-once.md",
      "sha256": "a57b78b58f0c089307a80b03aba4ddffdb1387561ccc0c3dea3df168958f86b3",
      "claims": {
        "C1": "dc1cf46763b149f55f070d4c6b0295a7bb7d8d3d5f8452fc68a3cf05d5a92a51",
        "C2": "5112f9ea6f50a322799df2852748186be369c69f7f18ef2ac495946372521ee3"
      },
      "explanation": "cb0701098be05f6aaa371dcc19c2753742abecf9af4cfc95ce6630aa93c29025"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/breaker/decisions.log",
      "sha256": "3b5a024c3754e80b9cb85c277c0369b021b27c8380e502f0eb8902b3bbd34fb1"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/breaker/evidence/blunder-A1-62ac88.json",
      "sha256": "a853e6930c1440ae5040c3ba39731fcc99faad886e158d1ae3bddc2972dc765e"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/breaker/evidence/blunder-A1-62ac88.md",
      "sha256": "2e5c4f9b0532167a88c782df2449e08fbb9abea9351ef1e422479f7913696cfb"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/breaker/evidence/chart-64fcc7.json",
      "sha256": "2585637c3ed229a47a0048ecc8f6b24059d256e1a1be9218ba80a1f9baa7f124"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/breaker/evidence/chart-64fcc7.md",
      "sha256": "9ba013355e828ac261fe04860438443ef5559a5c9d1ec4b5b426d6e236629c4a"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/breaker/evidence/tlc-A1-a6aa65.json",
      "sha256": "3293afc5f55ccd9883964b446910ecf3ccc67b73cf06347c7120201765ed6829"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/breaker/evidence/tlc-A1-a6aa65.md",
      "sha256": "9767d4910ac46599ad51766fec3aba074567f112f358ded56c0469cdca3fcf7c"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/breaker/evidence/tlc-W1-b9babb.json",
      "sha256": "63936e22432e909145af676b587744e45a08c87e347d14da3e3fba3cd8ca9a18"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/breaker/evidence/tlc-W1-b9babb.md",
      "sha256": "c3213aa854a2c5413967ca7b3d58c24eaf67482fe2dbd710b411ee5746febe75"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/breaker/integrity.json",
      "sha256": "fa95ee3efb3802ee4db9b5edcbafb445560556cd10c59eee8c514e1d09a29ee9"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/breaker/model/blunders/unhalted_A1.cfg",
      "sha256": "dd72eab7f7e31820881501ef896686222ccd6a43c353761d827971cb790d8e73"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/breaker/model/blunders/unhalted.tla",
      "sha256": "fc0a4e21fe5b97d2e132a3d68013170754d53e2da6ad1619aaa2e3946bc14a1f"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/breaker/model/Breaker_W1.cfg",
      "sha256": "4a90c9befd026d9a86f572a1a8d1254753519b9e86f34b0274563eecb3f3f249"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/breaker/model/Breaker.cfg",
      "sha256": "f6fc43c5f1d0bc5fc1ad2d0ef2db994c00e794326b20f2fff769cd14707197e4"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/breaker/model/Breaker.tla",
      "sha256": "548bf0d52107c1d2fec1bc6c47414c8b5c783c1a35cbcce901568a2e509cc1e4"
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
      "root": "knowledge",
      "path": "modules/breaker/behavior/operations.md",
      "sha256": "9aaec9a091c07d0a15f922e3b0827d3b294035051b0865cc104438a6df576bab"
    }
  ],
  "coverage": {
    "examined": [
      "behavior:halt-once:claims",
      "behavior:halt-once:scope",
      "behavior:halt-once:mappings",
      "behavior:halt-once:explanation",
      "formal:1",
      "formal:2",
      "formal:3",
      "formal:4",
      "formal:5",
      "formal:7",
      "formal:9",
      "formal:13",
      "formal:16",
      "formal:17",
      "formal:18",
      "formal:19"
    ],
    "unexamined": [
      {
        "item": "formal:6",
        "reason": "Does not apply: the Breaker's prose declares no Given, and no passage this behavior depends on cites one."
      },
      {
        "item": "formal:8",
        "reason": "Does not apply: no guarantee of the Breaker is assumed; K1 is backed."
      },
      {
        "item": "formal:10",
        "reason": "Does not apply: closure belongs to a composition, and this is a part."
      },
      {
        "item": "formal:11",
        "reason": "Does not apply: wiring and free sends belong to a composition, and this is a part."
      },
      {
        "item": "formal:12",
        "reason": "Does not apply: scenarios belong to a composition; the part has none and its walk runs with scenario null."
      },
      {
        "item": "formal:14",
        "reason": "Does not apply: no answer in the dossier is miscalled; all six entries are as-called with previous null."
      },
      {
        "item": "formal:15",
        "reason": "Does not apply: decisions.log holds no risk decision, so no acceptance exists to read."
      },
      {
        "item": "formal:20",
        "reason": "Does not apply: the prose has no Once or Within, and no Given."
      }
    ]
  },
  "assessments": [
    {
      "mapping": "halt-once/C1/M1",
      "result": "supported",
      "rationale": "W1 is checked on both sides at its current hash. The chart answer chart-64fcc7 (trial 2026-11-24-1431-chart-5bf4a7) replays W1, attempting the second stop and finding it refused, with halt sent once. The TLC witness tlc-W1-b9babb (trial 2026-11-24-1431-tlc-ad1aac) reaches W1_End by one M1_Stop step from Armed to Spent, with halted TRUE, one halt sent and the stop move no longer enabled. Within the claim's stated scope, the W1 path in the finite model, this establishes that Governance's first stop is taken, the second is refused and exactly one halt is sent.",
      "limitations": [
        "One path witness, not every execution; neither R1's general refusal nor a bound on the halts sent in every run is what this mapping establishes.",
        "On the model side the second stop is shown refused by non-enabledness of M1_Stop in Spent, a state predicate at the end of the walk, not an attempted step; only the chart replay attempts it.",
        "R1 and W1 are unsettled: decisions.log accepts S1, S2, E1, M1, A1 and A2 only.",
        "The knowledge record modules/breaker/behavior/operations.md line 29 says a second stop succeeds and changes nothing; that lies outside this model claim and is unreconciled.",
        "Model only: no source or deployment correspondence is established."
      ]
    },
    {
      "mapping": "halt-once/C2/M1",
      "result": "supported",
      "rationale": "A1 is checked on the model side at its current hash. tlc-A1-a6aa65 (trial 2026-11-24-1431-tlc-92c128) found A1, (state = \"Spent\") => halted, holding over the model's 2 distinct reachable states with none queued at MaxSent 4, and blunder-A1-62ac88 (trial 2026-11-24-1431-blunder-b185c0), which leaves halted unset when M1_Stop enters Spent, violated A1. The definition says what the claim says, clause by clause, within the finite model.",
      "limitations": [
        "A bounded TLC check at the recorded reach; no inductive answer is recorded, and the exhausted reachable space does not make the evidence a proof.",
        "Model only: no source or deployment correspondence is established.",
        "A1 follows directly from M1 setting halted in the step that enters Spent, with no move leaving Spent; the property is faithful and shallow.",
        "The Adapter's response is a separate composed property and is not established here."
      ]
    }
  ],
  "replaces": []
}
```

# Review of halt-once: Send one emergency halt

Subject: the behavior `halt-once` of `parts/breaker`, with its claims C1 and C2. This is a focused review of one behavior. It does not count as a review of the whole dossier. It was written on 2026-11-24 in a fresh context, from the dossier's files, its evidence entries and the knowledge records bound above. The keeper's conversation and the removed earlier reviews were not read.

## Verify, basis and recheck

Before this file was written, `dossier verify --brief parts/breaker` printed these lines, the `read:` line left out:

- `verify: ok · 6 parts, 3 compositions · dossier 0.3.0 · 0 tripwires`
- `Breaker: 11 passages · settled 6 · confirmed 6 · unsettled 5 · checked 9 · backed 1 · text 1 · prose@02aa1d`
- `claims: 2 behaviors, 3 claims · evidence unreviewed 3`
- `next: Review — no current dossier review with complete scoped basis and coverage`
- `flags: review owed (no current dossier review with complete scoped basis and coverage)`
- `next: Encode on parts/oracle — Oracle: not tried on the model side: M2 M3; Timelock: not tried on the model side: M3; Token: not tried on the model side: W1`

`dossier review-basis parts/breaker --behavior halt-once --json` reported no issues. Its 19 required files are bound above as it printed them. One knowledge record this review cites is bound as additional.

`dossier recheck parts/breaker`, run once for the dossier, asked all six recorded questions again: 6 same, 0 different, 0 not run. `chart-64fcc7`, `tlc-A1-a6aa65`, `tlc-W1-b9babb`, `alloy-A2-de2df5`, `blunder-A2-e8ec8a` and `blunder-A1-62ac88` came back with the same verdicts, outcomes and reach. No file of the dossier changed.

## Assessments

| Mapping | Result | In short |
| --- | --- | --- |
| `halt-once/C1/M1`, walk W1 | supported | On the one W1 path of the finite model, the chart replay and the TLC witness show the first stop taken, the second refused and one halt sent. |
| `halt-once/C2/M1`, A1 on the model side | supported | A1's definition says what C2 says. TLC held it over the whole reachable model, and a blunder specific to A1 caught it. |

The limitations recorded with each assessment stay with it: one path, not every run; the model, not the source; a bounded check, not a proof.

## Findings

The findings are ordered by importance. Each status describes the support for the finding's own statement, as REVIEW-STATUS defines it.

### F1. The explanation states the refused second stop without its model scope, and a knowledge record disagrees

- Status: verified.
- Affects: the explanation of `halt-once`; passages R1 and W1; claim C1.
- Statement: The explanation says the Breaker "refuses another stop after that transition" (`parts/breaker/behaviors/halt-once.md` line 67) with no model qualifier. The knowledge record of the Breaker's operation says "stop is idempotent; a second call on a halted adapter succeeds and changes nothing" (knowledge `modules/breaker/behavior/operations.md` line 29). The keeper's readings note that the answers do "not reconcile" that record (`parts/breaker/evidence/chart-64fcc7.md` line 5, `parts/breaker/evidence/tlc-A1-a6aa65.md` line 5). Neither the behavior nor a doubt carries the difference. The dossier has no `doubts.md`, and the owner has not settled R1 or W1: `parts/breaker/decisions.log` line 1 accepts S1, S2, E1, M1, A1 and A2 only.
- Scope: C1 is a model claim, so the record lies outside it and does not contradict it, and the assessment of `halt-once/C1/M1` stands. The finding concerns the explanation and an owner decision that has not been made.
- Missing evidence: what the pinned source does on a second stop, whether it reverts, returns with no effect or calls the Adapter's halt again. The knowledge base names that source only by the reference `breaker-pinned-source`, and it was not examined.

### F2. On the model side the second stop is refused by non-enabledness, not by an attempted step

- Status: verified.
- Affects: W1 and R1 on the model side; trial `2026-11-24-1431-tlc-ad1aac`.
- Statement: The TLC witness has two states, Init and one `M1_Stop` step (`parts/breaker/evidence/tlc-W1-b9babb.json` lines 49 to 72). "stop refused" is checked as the state predicate `W1_Refused2`, the negation of `Can_M1_Stop`, at the end state (`parts/breaker/model/Breaker.tla` lines 33, 34 and 59). R1's model cover is by absence: no action encodes a Move for Spent and stop. Only the chart answer attempts the second stop and checks that it is refused, through its check "W1: walk Halt replays" (`parts/breaker/evidence/chart-64fcc7.json` line 85), which fails when a step is accepted that should be refused.
- Scope: the mechanical rule behind W1 and R1 on the model side. It is the scaffold's documented encoding of a refused step and does not make the mapping wrong. It is the thin rule that formal item 2 asks a review to name.

### F3. The explanation's "only reduces" sentence rests on a record, and no claim carries it

- Status: verified.
- Affects: the explanation of `halt-once`; guarantee K1.
- Statement: "This mechanism only reduces the Adapter's available actions" (`parts/breaker/behaviors/halt-once.md` line 69) is guarantee K1 (`parts/breaker/prose.md` line 30). K1 is backed by the record `breaker-only-reduces` (knowledge `modules/breaker/behavior/invariants.md` lines 5 to 17), not by an answer. No claim of this behavior maps to K1, so the sentence has no assessed support here.
- Scope: the explanation. The record's words match K1's, as formal:7 below says.

### F4. C1 joins three assertions about one path

- Status: verified.
- Affects: claim C1.
- Statement: C1 asserts that the first stop is taken, that a second stop is refused and that exactly one halt is sent (`parts/breaker/behaviors/halt-once.md` line 9). W1 checks all three together, so the claim can be judged as one, but its general wording reads beyond one path. The scope description, "The W1 Halt path in the finite Breaker model" (line 12), is what confines it. Neither R1's general refusal nor a bound on the halts sent in every run is mapped.
- Scope: the claim's form. Whether to split it is the keeper's choice.

### F5. A1's evidence is specific and exhausts the finite model, and the property is shallow

- Status: verified.
- Affects: A1; claim C2; trials `2026-11-24-1431-tlc-92c128` and `2026-11-24-1431-blunder-b185c0`.
- Statement: The definition `A1 == (state = "Spent") => halted` (`parts/breaker/model/Breaker.tla` line 57) says what A1 says (`parts/breaker/prose.md` line 20), clause by clause: "while Spent" is the antecedent and "halted is set" the consequent. TLC found it holding with 2 distinct states, none queued, depth 2 (`parts/breaker/evidence/tlc-A1-a6aa65.json` lines 37 to 48). The constraint `SentBounded` never binds, since `M1_Stop` is the only action and it leaves Armed for Spent, so no reachable state has sent more than one halt. The blunder `parts/breaker/model/blunders/unhalted.tla` differs from the base, apart from its module name, only at line 39, where halted keeps its value instead of being set. Its configuration enables A1 alone (`parts/breaker/model/blunders/unhalted_A1.cfg` line 5). A property that says nothing, or TypeOK, still holds under that change, so the catch is specific to A1. A1 follows directly from M1 setting halted in the step that enters Spent, with no move leaving Spent.
- Scope: the model. The recorded kind is a bounded TLC check. There is no inductive answer, and this review does not make the evidence stronger.

### F6. The record's history shows no forbidden move

- Status: verified.
- Affects: every entry this behavior depends on.
- Statement: Every entry has `previous`, `narrowed` and `replaced` null. In the plugin repository, `prose.md`, the model files, their configurations and the blunders were added in commit 0d92f08 under `qualification/fixture/dossiers/components/breaker` and moved without change to `qualification/fixture/dossiers/parts/breaker` in commit 5f7e9b9. None has changed since. The behavior file was added in commit 9f94d71 and has not changed since. Each of the six entries was compared across its committed versions, at commit 0d92f08 under the earlier path and at commits 5f7e9b9 and 9f94d71 under `qualification/fixture/dossiers/parts/breaker/evidence`, and with the rebuilt entry. All four have the same question, call, executed digests, snapshot passages and backing, verdict, outcomes, reach, partial list and trace, with `previous`, `narrowed` and `replaced` null throughout. Only the establishing trial and the plugin version, 0.1.0, 0.1.1, 0.2.0 and then 0.3.0, changed.
- Scope: the authored inputs and the entries of `parts/breaker`, through the commits named. Uncommitted work between those commits was not seen.

### F7. The W1 entry lists TypeOK both as holding and as unfinished

- Status: verified.
- Affects: entry `tlc-W1-b9babb`.
- Statement: The entry records `"TypeOK": "holds"` (`parts/breaker/evidence/tlc-W1-b9babb.json` line 42) and lists TypeOK under `partial` (lines 95 to 97), since TLC stopped at the NotW1 violation. Under the evidence rules that answer covers nothing for TypeOK. TypeOK holds in full in `tlc-A1-a6aa65` (line 38, with `partial` empty at line 65). Nothing in this behavior relies on TypeOK from the witness.
- Scope: the reading of one entry. It changes no assessment.

## Examination by item

### behavior:halt-once:claims

Read the claims block (`parts/breaker/behaviors/halt-once.md` lines 1 to 63). Both claims are descriptive and model-scoped, which fits what they describe. C2 is one statement. C1 joins three assertions about one path (F4). Neither claim needs an assumption beyond the model: the prose has no Given, and a path witness needs none. Nothing else is wrong.

### behavior:halt-once:scope

Both claims are at the `model` level with empty pins (lines 13 and 39), the only level allowed without pins. The actor is Governance, the only sender of stop (`parts/breaker/prose.md` line 13). In the model, `Governance` is `M1_Stop` and `Next` is `Governance` (`parts/breaker/model/Breaker.tla` lines 44 and 45). The reach is the W1 path for C1 and the finite model for C2, which matches the evidence. The knowledge record on a second stop lies outside this scope (F1).

### behavior:halt-once:mappings

`halt-once/C1/M1` to walk W1 is supported, and `halt-once/C2/M1` to A1 on the model side is supported, each within the limitations recorded with its assessment. Both targets are current, verify reports no conflicting answer for either, and both relations are `supports`.

### behavior:halt-once:explanation

Read lines 65 to 69. The account agrees with the claims along the path: Armed, stop, halted set, halt sent, Spent, a second stop refused, Spent final, and no recovery action, since the prose has one event (`parts/breaker/prose.md` line 13). It does not keep the model apart from the source on the second stop (F1). It states K1's guarantee without saying that it rests on a record (F3). The pointer to Control's halt behavior resolves. That behavior was not assessed.

### formal:1

Verify says ok, with 0 tripwires. All six entries were read, not only two. For each, the executed digests equal the current files' digests in this basis, for example `parts/breaker/model/Breaker.tla` 548bf0d5, `parts/breaker/model/Breaker_W1.cfg` 4a90c9be and `parts/breaker/prose.md` 0c693915. `parts/breaker/integrity.json` binds each entry's current digest (lines 3 to 10). The entries that `dossier verify --json` names for each passage are the ones whose answers cover it: S1, S2, E1, M1, R1 and W1 by `chart-64fcc7` and `tlc-W1-b9babb`, and A1 by `tlc-A1-a6aa65` and `blunder-A1-62ac88`. Recheck gave 6 same. A minor point is F7.

### formal:2

- W1 is checked by `chart-64fcc7`, from trial `2026-11-24-1431-chart-5bf4a7`, and `tlc-W1-b9babb`, from trial `2026-11-24-1431-tlc-ad1aac`. Had W1 been false, with a second stop accepted in Spent, a second halt sent or an end elsewhere, `W1_End` could not hold at the walk's end. NotW1 would then hold, and the trial would miscall against its call (`parts/breaker/evidence/tlc-W1-b9babb.json` line 20). The chart replay would fail as well.
- A1 is checked by `tlc-A1-a6aa65`, from trial `2026-11-24-1431-tlc-92c128`, and caught by `blunder-A1-62ac88`, from trial `2026-11-24-1431-blunder-b185c0`. Had A1 been false, TLC would have reported the violation, as the blunder shows.
- S1, S2, E1, M1 and R1, which W1 walks through, are checked by the same two answers. The rules are thin: S1 by Init, S2, E1 and M1 because `M1_Stop` fired once (`parts/breaker/evidence/tlc-W1-b9babb.json` line 63), and R1 by absence (F2).

### formal:3

T1, "This piece promises nothing eventual" (`parts/breaker/prose.md` line 33), is the only words-only passage. The prose has no Once, Within or Given, so T1 hides no claim this behavior depends on. Nothing is wrong.

### formal:4

A1 was read beside its passage clause by clause and is faithful (F5). `W1_End` was read beside W1 (`parts/breaker/model/Breaker.tla` line 59, `parts/breaker/prose.md` line 24). The observer at 1 stands for the walk's one accepted step, taken from Armed. The stop move not enabled stands for "stop refused", the state Spent for "ends Spent", and one halt since the walk armed for "halt sent once". It is faithful, with the refusal encoded as non-enabledness (F2). A2 is not a dependency of this behavior.

### formal:5

A1's blunder changes only line 39 of the copy, and a property that says nothing would not catch it (F5). It was caught: A1 violated (`parts/breaker/evidence/blunder-A1-62ac88.json` line 33).

### formal:7

K1 is backed by the record `breaker-only-reduces` (knowledge `modules/breaker/behavior/invariants.md` lines 5 to 17). Its statement, "a breaker action only halts, never enables" (line 8), is K1 as worded (`parts/breaker/prose.md` line 30). The record states the guarantee and points to the pinned source for it (its `check_hint`, line 15). It does not establish it. This behavior relies on K1 only in its explanation (F3).

### formal:9

Neither the part nor the claims pin a record. The claims' pins are empty, and every entry's snapshot records none. The claims make no source or deployment statement, so there is no pinned checkpoint to compare. Nothing is wrong for model claims.

### formal:13

The witness and the blunder were retold from their entries' trace fields and the module. The readings appeared in the same output as the entries, so the retelling was not made before they were seen.

- Witness `tlc-W1-b9babb`: state 1, Init, is Armed with halted FALSE, sent_halt 0 and the observer at 0. The step `M1_Stop` encodes M1 on stop, sent by Governance. It leads to state 2: Spent, halted TRUE, sent_halt 1, the observer at 1 and no halts before the walk. At state 2 `W1_End` holds: the walk's step was taken from Armed, the stop move is not enabled in Spent, the state is Spent, and one halt has been sent since the walk armed. TLC reports NotW1 violated there. The reading (`parts/breaker/evidence/tlc-W1-b9babb.md` line 1) agrees, but its "then stop is refused" is the end-state predicate, not a step of the trace (F2).
- Blunder `blunder-A1-62ac88`: state 1 is as above. The step `M1_Stop` under the blunder leads to Spent with halted still FALSE and sent_halt 1 (`parts/breaker/evidence/blunder-A1-62ac88.json` lines 53 to 60). A1 fails at state 2. The reading (`parts/breaker/evidence/blunder-A1-62ac88.md` line 1) agrees.
- A part has no cells, so there is no violated cell to retell.

### formal:16

The boundary declares one datum, halted, a flag (`parts/breaker/prose.md` line 6), and no numeric range. `MaxSent` 4 bounds only the effect counter, which never exceeds 1. Both TLC answers explored the whole reachable model, and the chart explored both states (`parts/breaker/evidence/chart-64fcc7.json` line 120). There is no `narrowed` flag, and `narrowed` is null in every entry.

### formal:17

No forbidden move was found (F6).

### formal:18

Owner decisions not yet made: R1, W1, X1, K1 and T1 are unsettled (`parts/breaker/decisions.log` line 1 accepts S1, S2, E1, M1, A1 and A2). R1 and W1 carry C1, and the knowledge record that disagrees with R1 is unreconciled (F1). No doubt is posed, verify flags no unsaid pair and no gap, and the seam X1 is marked checked. No closure applies to a part.

### formal:19

The prose allows one path: Armed takes stop to Spent (M1), and Spent refuses stop (R1) and is final (`parts/breaker/prose.md` lines 9, 10, 16 and 17). W1 walks it, with the refused step and the final state (line 24). No path is left unwalked.

## Items not examined

- formal:6: the Breaker's prose declares no Given, and neither A1 nor W1 cites one.
- formal:8: no guarantee is assumed. K1 is backed.
- formal:10, formal:11 and formal:12: closure, wiring and scenarios are a composition's. A part has none, and W1 runs with scenario null.
- formal:14: no answer is miscalled. All six are as-called, with `previous` null.
- formal:15: `parts/breaker/decisions.log` holds no risk decision.
- formal:20: the prose has no Once or Within.

## Limits of this review

- The pinned source and any deployment were not examined. The claims do not reach them.
- The trials' local bundles were not read. The entries suffice for every conclusion here.
- Control's receiving side was followed only as a link. Nothing here assesses it.
- A2, the Alloy structure and the README lie outside this behavior and were not assessed here.
