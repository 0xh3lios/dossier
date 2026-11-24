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
      "sha256": "3b5a024c3754e80b9cb85c277c0369b021b27c8380e502f0eb8902b3bbd34fb1"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/breaker/evidence/alloy-A2-de2df5.json",
      "sha256": "2ffe153c55b0368d9be7cf05bfeb789c2f845a7e3d01ec0819ddd3d498f27ca2"
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
      "sha256": "12a9156eca364e43f1ac01a4cad29d212ee73ba177cae66fe82e5a0ad2e89f29"
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
      "sha256": "fa95ee3efb3802ee4db9b5edcbafb445560556cd10c59eee8c514e1d09a29ee9"
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
      "path": "parts/adapter/prose.md",
      "sha256": "58d831b706099361e3b3fa6855a8b79b5d0c0fc8227521e7582ac34ad48c73fb"
    },
    {
      "role": "additional",
      "root": "knowledge",
      "path": "modules/breaker/relationships/edges.md",
      "sha256": "785cc4768ece71643900746c8b9e2bd660f4e2a873a7cfc4969cd169285cfe3b"
    },
    {
      "role": "additional",
      "root": "knowledge",
      "path": "modules/breaker/state/quantities.md",
      "sha256": "0b55ead8c93bfaf0bc846d8961e82949e4043d5b9e6ce598ce38cb71dc1e2891"
    }
  ],
  "coverage": {
    "examined": [
      "behavior:governance-halt-authority:claims",
      "behavior:governance-halt-authority:scope",
      "behavior:governance-halt-authority:mappings",
      "behavior:governance-halt-authority:explanation",
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
      "formal:18"
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
        "item": "formal:19",
        "reason": "Does not apply: the claim maps only to A2's structural model side, and no walk bears on it."
      },
      {
        "item": "formal:20",
        "reason": "Does not apply: the prose has no Once or Within, and no Given."
      }
    ]
  },
  "assessments": [
    {
      "mapping": "governance-halt-authority/C1/M1",
      "result": "too-broad",
      "rationale": "A2 is checked on the model side: alloy-A2-de2df5 (trial 2026-11-24-1431-alloy-285659) found no counterexample at scope 4, and blunder-A2-e8ec8a (trial 2026-11-24-1431-blunder-13b1bb) found one once the X1 fact was removed. But the assertion checked (Breaker.als line 9) is the fact X1_halt_by_breaker (line 7) restated: its second conjunct holds of every halt, since a Breaker's authority is declared one Governance (line 4) and the join is empty for a sender that is not a Breaker. The target therefore establishes a narrower statement: in a structure that assumes every received halt is sent by a Breaker, every halt is sent by a Breaker, and each Breaker is declared to answer to some Governance atom. The structure has no relation for who originated a halt, no Adapter and possibly several Governance atoms, so 'comes from Governance' is not established, and the claim lists no assumption although its result is assumed.",
      "limitations": [
        "Model only. The recorded evidence is a bounded Alloy check at scope 4; by reading, the entailment does not depend on the scope, and this review does not make the evidence stronger.",
        "Read so that 'comes from Governance' says no more than that the Breaker's authority is Governance, the words would match the assertion, and the claim would still need the X1 fact stated as its assumption to be supported.",
        "The blunder exercises only the conjunct that a Breaker sent the halt; nothing exercises the authority conjunct.",
        "The Alloy entries record no instance, so the blunder's counterexample cannot be retold from the record."
      ]
    }
  ],
  "replaces": []
}
```

# Review of governance-halt-authority: Restrict the structural halt authority

Subject: the behavior `governance-halt-authority` of `parts/breaker`, with its one claim C1. This is a focused review of one behavior. It does not count as a review of the whole dossier. It was written on 2026-11-24 in a fresh context, from the dossier's files, its evidence entries and the files bound above. The keeper's conversation and the removed earlier reviews were not read.

## Verify, basis and recheck

Before this file was written, `dossier verify --brief parts/breaker` printed these lines, the `read:` line left out:

- `verify: ok · 6 parts, 3 compositions · dossier 0.3.0 · 0 tripwires`
- `Breaker: 11 passages · settled 6 · confirmed 6 · unsettled 5 · checked 9 · backed 1 · text 1 · prose@02aa1d`
- `claims: 2 behaviors, 3 claims · evidence unreviewed 3`
- `next: Review — no current dossier review with complete scoped basis and coverage`
- `flags: review owed (no current dossier review with complete scoped basis and coverage)`
- `next: Encode on parts/oracle — Oracle: not tried on the model side: M2 M3; Timelock: not tried on the model side: M3; Token: not tried on the model side: W1`

`dossier review-basis parts/breaker --behavior governance-halt-authority --json` reported no issues. Its 12 required files are bound above as it printed them. Three files this review cites are bound as additional: the Adapter's prose and two knowledge records of the Breaker.

`dossier recheck parts/breaker`, run once for the dossier, asked all six recorded questions again: 6 same, 0 different, 0 not run. The two answers this behavior rests on came back the same: `alloy-A2-de2df5`, no counterexample at scope 4, and `blunder-A2-e8ec8a`, counterexample at scope 4. The other four, `chart-64fcc7`, `tlc-A1-a6aa65`, `tlc-W1-b9babb` and `blunder-A1-62ac88`, came back the same as well. No file of the dossier changed.

## Assessment

| Mapping | Result | In short |
| --- | --- | --- |
| `governance-halt-authority/C1/M1`, A2 on the model side | too-broad | The Alloy check confirms only what its structure assumes, that every halt is sent by a Breaker. The halt's origin, "comes from Governance", is not represented. |

## Findings

The findings are ordered by importance. Each status describes the support for the finding's own statement, as REVIEW-STATUS defines it. Statements about what the Alloy module entails rest on reading `parts/breaker/model/Breaker.als` under Alloy's relational semantics. No checker was run for this review.

### G1. A2's Alloy check restates an assumption of the structure

- Status: verified.
- Affects: A2 on the model side; claim C1; trials `2026-11-24-1431-alloy-285659` and `2026-11-24-1431-blunder-13b1bb`.
- Statement: The assertion checked is `all h: Halt | h.by in Breaker and h.by.authority in Governance` (`parts/breaker/model/Breaker.als` line 9). Its first conjunct is the fact `X1_halt_by_breaker`, `all h: Halt | h.by in Breaker`, word for word (line 7). Its second conjunct holds of every halt. When the sender is a Breaker, its authority is exactly one Governance atom, by the declaration `authority: one Governance` (line 4). When the sender is not a Breaker, `h.by.authority` is empty, and the empty set is in Governance. The assertion is therefore equivalent to the fact, and the answer "no counterexample" (`parts/breaker/evidence/alloy-A2-de2df5.json` line 32) shows that the assumed structure entails itself. Nothing in the structure derives the conclusion. The call's reason (line 25) and the reading (`parts/breaker/evidence/alloy-A2-de2df5.md` line 1) say that A2 holds because of the facts.
- Scope: the model. Within this module the answer could not have come back otherwise at any scope unless its facts or declarations changed.

### G2. The claim says more than the target establishes

- Status: verified.
- Affects: claim C1; mapping `governance-halt-authority/C1/M1`.
- Statement: C1 says that every halt reaching an Adapter "comes from Governance through a Breaker whose authority is Governance" (`parts/breaker/behaviors/governance-halt-authority.md` line 9). The structure's only relation for a halt is `by: one Actor` (`parts/breaker/model/Breaker.als` line 6), its immediate sender. Nothing relates a halt to the actor that caused it. The structure declares no Adapter, since a `Halt` is only commented as received by the Adapter, and Governance may hold several atoms at scope 4 rather than being one actor. The target establishes the narrower statement that every halt is sent by a Breaker, which the structure assumes (G1), and that each Breaker answers to some Governance atom, which it declares. Read as naming the halt's origin, as this review reads it, "comes from Governance" goes beyond that, so the assessment is `too-broad`. The origin of a stop is stated elsewhere, in E1, which makes Governance the sender of stop (`parts/breaker/prose.md` line 13). The mapping targets A2's model side only.
- Scope: the mapping. The module establishes the structural content above. The conclusion rests on reading "comes from Governance" as the halt's origin. Read so that the words say no more than that the Breaker's authority is Governance, they would match the assertion, and G3 would still stand in the way of `supported`. What the owner means by the words is the owner's to say, and the owner has not said it.

### G3. The claim states no assumption, though its result is assumed

- Status: verified.
- Affects: claim C1.
- Statement: C1's `assumptions` is empty (`parts/breaker/behaviors/governance-halt-authority.md` line 15). Its result rests on the fact that every halt the Adapter receives is sent by a Breaker (`parts/breaker/model/Breaker.als` line 7), which is most of its conclusion. The mapping's limitation (line 27) states the reach of the check, not this assumption.
- Scope: the claim's form.

### G4. The fact named for K1 encodes what K1 does not say

- Status: verified.
- Affects: K1; the facts of `parts/breaker/model/Breaker.als`; the call of `alloy-A2-de2df5`.
- Statement: `fact K1_breaker_authority { all m: Breaker | m.authority in Governance }` (`parts/breaker/model/Breaker.als` line 8), with the comment "K1: a breaker answers to Governance" on line 4, gives K1 an authority statement. K1 (`parts/breaker/prose.md` line 30) and its backing record (knowledge `modules/breaker/behavior/invariants.md` line 8) say only "a breaker action only halts, never enables". The call credits "K1 makes every Breaker answer to Governance" (`parts/breaker/evidence/alloy-A2-de2df5.json` line 25). The fact also repeats the field's declaration (line 4), so it contributes nothing to the answer. The authority content it names belongs in the prose to E1 and the boundary, which make Governance the sender of stop (`parts/breaker/prose.md` lines 6 and 13). In the knowledge base it belongs to the edge `governance-stops`, "stop requires msg.sender to be the current governance" (knowledge `modules/breaker/relationships/edges.md` lines 5 to 10), and to the quantity `authority` (knowledge `modules/breaker/state/quantities.md` lines 5 and 6). No passage cites either record. The tripwire `fact without passage` only checks that a fact names an existing passage, so verify cannot see this.
- Scope: the model's attribution. K1's own backing is sound (formal:7).

### G5. The fact named for X1 says more than X1, and the rest comes from the Adapter's prose

- Status: verified.
- Affects: X1; the facts of `parts/breaker/model/Breaker.als`.
- Statement: X1 says "halt crosses from Breaker to Adapter carrying nothing" (`parts/breaker/prose.md` line 27). The fact named for it says that every halt the Adapter receives is sent by a Breaker (`parts/breaker/model/Breaker.als` line 7), an exclusivity X1's words do not state. Within the abstraction the exclusivity comes from the Adapter's E3, "halt, from the Breaker" (`parts/adapter/prose.md` line 15, and the boundary at line 6), which names the Breaker as the event's sender. The knowledge edge `breaker-halts-adapter` says "halt on the adapter accepts only the breaker" (knowledge `modules/breaker/relationships/edges.md` line 18). The fact is a defensible reading of the prose, and A2's check then repeats the Adapter's sender declaration rather than establishing it. X1 is marked checked because the Adapter's X3 says it word for word (`parts/adapter/prose.md` line 36).
- Scope: the model's encoding of the seam.

### G6. The blunder tests only half of A2

- Status: verified.
- Affects: A2; trial `2026-11-24-1431-blunder-13b1bb`.
- Statement: `parts/breaker/model/blunders/rogue.als` differs from the base only by dropping the fact `X1_halt_by_breaker` (base line 7). It was caught (`parts/breaker/evidence/blunder-A2-e8ec8a.json` line 32), and a property that says nothing would not have been, so A2 is not hollow. But the blunder removes the fact the assertion repeats, and only the first conjunct can fail. No blunder exercises "whose authority is Governance", and removing the K1 fact could not, since the declaration on line 4 enforces it.
- Scope: the blunder for A2.

### G7. The explanation states the assumed structure as a requirement

- Status: verified.
- Affects: the explanation of `governance-halt-authority`.
- Statement: "A halt must pass through a Breaker controlled by Governance before reaching an Adapter" (`parts/breaker/behaviors/governance-halt-authority.md` line 40) states what the structure assumes as a fact, without saying that it is assumed or that the check repeats it (G1). The explanation does keep the key holder and the timing of a stop out of the claim (line 42), which agrees with the model scope and the mapping's limitation.
- Scope: the explanation.

### G8. The Alloy entries hold no instance to retell

- Status: verified.
- Affects: entries `alloy-A2-de2df5` and `blunder-A2-e8ec8a`.
- Statement: Both answers record the outcome and the reach only (`parts/breaker/evidence/blunder-A2-e8ec8a.json` lines 27 to 43, and the same fields in `parts/breaker/evidence/alloy-A2-de2df5.json` lines 27 to 43). The reading's "without X1 an Other halts the Adapter" (`parts/breaker/evidence/blunder-A2-e8ec8a.md` line 1) cannot be recovered from the record. By reading `parts/breaker/model/blunders/rogue.als`, a counterexample needs a halt whose sender is not a Breaker, an `Other` or a `Governance` atom, so the reading names one possibility.
- Scope: the record of the Alloy answers.
- Missing evidence: which instance the Analyzer returned. It stays in the trial's local bundle, which was not read. That part is not verified.

### G9. The record's history shows no forbidden move

- Status: verified.
- Affects: the entries and models this behavior depends on.
- Statement: Both entries have `previous`, `narrowed` and `replaced` null. In the plugin repository, `prose.md`, `model/Breaker.als` and `model/blunders/rogue.als` were added in commit 0d92f08 under `qualification/fixture/dossiers/components/breaker` and moved without change to `qualification/fixture/dossiers/parts/breaker` in commit 5f7e9b9. None has changed since. The behavior file was added in commit 9f94d71 and has not changed since. Both entries were compared across their committed versions, at commit 0d92f08 under the earlier path and at commits 5f7e9b9 and 9f94d71 under `qualification/fixture/dossiers/parts/breaker/evidence`, and with the rebuilt entries. All four versions of each have the same question, call, executed digests, snapshot passages and backing, verdict, outcomes and reach, with `previous`, `narrowed` and `replaced` null throughout. Only the establishing trial and the plugin version, 0.1.0, 0.1.1, 0.2.0 and then 0.3.0, changed. Uncommitted work between those commits was not seen.
- Scope: the authored inputs and the entries of `parts/breaker` that this behavior uses.

## Examination by item

### behavior:governance-halt-authority:claims

Read the claims block (`parts/breaker/behaviors/governance-halt-authority.md` lines 1 to 36). C1 is one statement, descriptive, at the model level. Its kind fits. It states no assumption although its result rests on one (G3).

### behavior:governance-halt-authority:scope

The level is `model` with empty pins (lines 11 and 13), and the description names A2 in the recorded Alloy structure and scope. The actors are Governance and the Breaker. The reach is scope 4. The claim speaks of "an Adapter", which the structure does not declare (G2). Nothing in the scope reaches the source or a deployment, and the mapping's limitation excludes the deployed authority set.

### behavior:governance-halt-authority:mappings

`governance-halt-authority/C1/M1` to A2 on the model side is `too-broad` (G1, G2). The target is current, verify reports no conflicting answer, and the relation is `supports`.

### behavior:governance-halt-authority:explanation

Read lines 38 to 42. The explanation separates the structural question from the stateful halt path and keeps the key holder and the timing of a stop out. It states the assumed structure as a requirement without saying that it is assumed (G7). The link to the halt path resolves.

### formal:1

Verify says ok, with 0 tripwires. All six entries were read, not only two. For the two this behavior rests on, the executed digests equal the current files' digests in this basis: `parts/breaker/model/Breaker.als` d0e1979e and `parts/breaker/model/blunders/rogue.als` 53ecac21. `parts/breaker/integrity.json` binds both entries' current digests (lines 7 and 8). `dossier verify --json` names `alloy-A2-de2df5` and `blunder-A2-e8ec8a` for A2, with A2 checked on the model side and not covered on the chart side, which skips a structural Always. Recheck gave 6 same.

### formal:2

A2 is checked. `alloy-A2-de2df5`, established by trial `2026-11-24-1431-alloy-285659`, decides it, and `blunder-A2-e8ec8a`, established by trial `2026-11-24-1431-blunder-13b1bb`, caught it. Had A2 been false in the model, some halt would have a sender that is not a Breaker, and the X1 fact forbids that. Within this module the answer could have come back otherwise only if the facts changed (G1). That is the thinnest kind of support: the check confirms its own assumption.

### formal:3

T1, "This piece promises nothing eventual" (`parts/breaker/prose.md` line 33), is the only words-only passage. It hides no claim this structural behavior depends on. Nothing is wrong.

### formal:4

A2's assertion was read beside its passage (`parts/breaker/prose.md` line 21), clause by clause. "Every halt the Adapter receives" is every `Halt`, with no Adapter declared. "Through a Breaker" is `h.by in Breaker`, which is the X1 fact. "Whose authority is Governance" is `h.by.authority in Governance`, which holds of every halt. "Comes from Governance" has no counterpart (G1, G2). The facts named for X1 and K1 were read beside those passages: the X1 fact says more than X1 (G5), and the K1 fact says something K1 does not (G4).

### formal:5

A2's blunder drops the X1 fact, and a property that says nothing would not catch it, but it tests only the first conjunct (G6).

### formal:7

K1 is backed by the record `breaker-only-reduces` (knowledge `modules/breaker/behavior/invariants.md` lines 5 to 17). Its statement, "a breaker action only halts, never enables" (line 8), is K1 as worded (`parts/breaker/prose.md` line 30). The record supports K1. It does not support the authority fact the model names for K1 (G4). The record states the guarantee and points to the pinned source for it (its `check_hint`, line 15). It does not establish it.

### formal:9

Neither the part nor the claim pins a record. The claim's pins are empty, and every entry's snapshot records none. No record here identifies the deployed authority, and the claim and its mapping's limitation say that the deployed authority set is outside it. Nothing is wrong for a model claim.

### formal:13

The Alloy entries this behavior rests on hold no trace or instance, so nothing could be retold from the record (G8). The witness and the blunder trace of this dossier are TLC answers that this behavior does not use. A part has no cells.

### formal:16

The boundary gives no range for the number of Breakers, Governance atoms or halts (`parts/breaker/prose.md` line 6). The prose speaks of one Breaker and one Governance, and scope 4 admits more of each. By reading, the result follows from the X1 fact at every scope, so the scope does not limit it. The recorded kind stays a bounded Alloy check, and this review does not make it stronger. There is no `narrowed` flag, and `narrowed` is null in both entries.

### formal:17

No forbidden move was found (G9).

### formal:18

The owner accepted A2 at its current hash, ad929dbe, with the words "a breaker halts and that is all" (`parts/breaker/decisions.log` line 1). That acceptance is of the passage's words, not of the Alloy encoding. X1 and K1, which the structure's facts are named for, are unsettled, and so are R1, W1 and T1. No doubt is posed, and verify flags no unsaid pair and no gap. No closure applies to a part.

## Items not examined

- formal:6: the Breaker's prose declares no Given, and A2 cites none.
- formal:8: no guarantee is assumed. K1 is backed.
- formal:10, formal:11 and formal:12: closure, wiring and scenarios are a composition's. A part has none.
- formal:14: no answer is miscalled. All six are as-called, with `previous` null.
- formal:15: `parts/breaker/decisions.log` holds no risk decision.
- formal:19: the claim maps only to A2's structural model side, and no walk bears on it.
- formal:20: the prose has no Once or Within.

## Limits of this review

- The pinned source and the deployed authority were not examined. The claim does not reach them.
- The trials' local bundles were not read, so the Analyzer's instances were not seen (G8).
- The stateful model, W1 and A1 lie outside this behavior and were not assessed here.
- The Adapter's prose was read only for its sender declaration and seam (G5). Nothing else in the Adapter's dossier was assessed.
