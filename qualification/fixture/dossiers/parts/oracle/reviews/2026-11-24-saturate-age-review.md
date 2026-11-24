```json
{
  "format": "dossier-review@0.2.0",
  "subject": {
    "kind": "behavior",
    "dossier": "parts/oracle",
    "behaviors": [
      "saturate-age"
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
      "path": "parts/oracle/behaviors/saturate-age.md",
      "sha256": "fc97eaf9f07d7448d0f2876e09041b65e538ab3f7256b5271b6615d6d76f6ccd",
      "claims": {
        "C1": "c8877d7276e0df689f12c9840fde19ffba5ce084964db259d510a0faeb29bb50",
        "C2": "b500349d183b34ecd6eb3f5b9f39ba5727f7c94382d5d821de35ccb917bc72e7"
      },
      "explanation": "dcd1c348a1fbea36ec043c6fa7c6d4d4aa0497d5baaa258316381445db36423c"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/oracle/doubts.md",
      "sha256": "e941ea027ffc086ecd5e164af6fe226e6d1fa0827251550af85ac1c6a24bcd5f"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/oracle/evidence/chart-64fcc7.json",
      "sha256": "f6ca2b77b3b4d2c5b59ea07650cb2eca08db581289c358ed94512ccb61bc2f19"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/oracle/evidence/chart-64fcc7.md",
      "sha256": "3f6bf495143cf50d6235a0d3204c884222d05b076b87e59c18fe4ae1fef4abce"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/oracle/integrity.json",
      "sha256": "55140a30b6a8580bec41632388fb994abe740e188f5c3bb10929d341cbe66319"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/oracle/prose.md",
      "sha256": "b7da5a952322a30666afb67e459dce4dde362fecbc2834d66df7c7b04901c62a"
    },
    {
      "role": "required",
      "root": "knowledge",
      "path": "modules/oracle/behavior/invariants.md",
      "sha256": "d2eff438f18bb8d8661edf565cc8dd7ca6e083f788703a8a22eda23ef2783de9"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/oracle/README.md",
      "sha256": "0ef4a51528a3a582531982c5f863b3072a5fb634af064738468ecde5eaa4d7a9"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/oracle/evidence/blunder-N1-a38027.json",
      "sha256": "8634b8e501df6584ad66a771eef92f72a92108f23b21c6b946c9de60d88832af"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/oracle/evidence/tlc-A1-A2-N1-2d9e4b.json",
      "sha256": "b3f7ace4cd1bf8abb003b3a8420209ddee0c4b61962f2a94558b9e1e87efa1cc"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/oracle/model/Oracle.tla",
      "sha256": "4f641228846353c4319f724a72664834218ea6e8e60dbc63ca819a7cfe1294a1"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/vault/prose.md",
      "sha256": "ad6f1070f6fac376ab9d505f4e9c60e58994a1c6a47cf780ee12f2f93165a6fa"
    },
    {
      "role": "additional",
      "root": "knowledge",
      "path": "modules/oracle/behavior/operations.md",
      "sha256": "2f5d9a5d2820bcd8f45e2203f88999dce0484625d8e6249e64a3327d52a04fb0"
    },
    {
      "role": "additional",
      "root": "knowledge",
      "path": "modules/oracle/overview.md",
      "sha256": "3debb67f60e30ac589322af302c7a1dc588745771a52064015b5b0f37a7ce5e6"
    },
    {
      "role": "additional",
      "root": "knowledge",
      "path": "modules/oracle/relationships/edges.md",
      "sha256": "688075c912f7a07ddbd9720828fb25589f8d96b5368135e5b255303a7a69a090"
    }
  ],
  "coverage": {
    "examined": [
      "behavior:saturate-age:claims",
      "behavior:saturate-age:scope",
      "behavior:saturate-age:mappings",
      "behavior:saturate-age:explanation",
      "formal:1",
      "formal:2",
      "formal:3",
      "formal:6",
      "formal:7",
      "formal:14",
      "formal:16",
      "formal:17",
      "formal:18",
      "formal:19"
    ],
    "unexamined": [
      {
        "item": "formal:4",
        "reason": "Does not apply: this behavior maps no Always, Once or Within; its one mapping targets the Move M3."
      },
      {
        "item": "formal:5",
        "reason": "Does not apply: this behavior maps no Always, Once or Within, so no blunder bears on its mapping."
      },
      {
        "item": "formal:8",
        "reason": "Does not apply: the dossier has no K passage marked assumed; K1 is backed."
      },
      {
        "item": "formal:9",
        "reason": "Does not apply: the prose names no Pins line and every claim of this behavior is model-level with no pins."
      },
      {
        "item": "formal:10",
        "reason": "Does not apply: it concerns a composition, and parts/oracle is a part."
      },
      {
        "item": "formal:11",
        "reason": "Does not apply: it concerns a composition, and parts/oracle is a part."
      },
      {
        "item": "formal:12",
        "reason": "Does not apply: it concerns a composition, and parts/oracle is a part."
      },
      {
        "item": "formal:13",
        "reason": "Does not apply: the only answer this behavior's mapping resolves to is chart-64fcc7, which records checks and no trace; no witness, cell or blunder bears on M3."
      },
      {
        "item": "formal:15",
        "reason": "Does not apply: a part has no cells, and parts/oracle has no decisions.log, so no risk was accepted."
      },
      {
        "item": "formal:20",
        "reason": "Does not apply: this behavior maps no Within or Once."
      }
    ]
  },
  "replaces": [],
  "assessments": [
    {
      "mapping": "saturate-age/C1/M1",
      "result": "supported",
      "rationale": "M3 (prose.md line 20) keeps the Oracle Stale at stale 3 and names no change, and the condition of M2 (line 19) applies only below 3. The deciding chart answer chart-64fcc7, from trial 2026-11-24-1431-chart-5c0890, explored with no Given in force. It passed 'M3: Stale receives tick as said' (line 101), the check that at most one move applies to each state and event over M1 to M5 (line 153), and TypeOK over all 100 explored snapshots (lines 37 and 187). On the chart, then, stale never exceeds 3, and a tick at 3 leaves the Oracle Stale. That is the claim, at the strength of a finite chart check.",
      "limitations": [
        "The M3 check replays a single explored snapshot and compares only the end state, since M3 names no change. That stale stays at 3 rests on the compiled move having no change and on the chart's TypeOK check, which is not among the checks the mapping lists.",
        "Chart side only. M3 is drawn, and as the model stands no model answer of this part can cover it, because the prompt guards disable every tick in Stale.",
        "A finite representation. The knowledge base records the source's stale as growing without bound."
      ]
    }
  ]
}
```

# Review of saturate-age

A focused review of one behavior, `parts/oracle/behaviors/saturate-age.md`, after Harbor was rebuilt under Dossier 0.3.0. It assesses the one mapping of C1. C2 has no mapping, so it has no assessment, and it is examined under the claim and scope items. It does not review the whole dossier and does not clear the dossier review that verify reports as owed. It records no decision, answers no doubt and changes no claim.

## Standing when examined

`dossier verify --brief parts/oracle`, before this file was written, with the `read:` line left out. The refresh-price and limit-price-step reviews of the same date were already in place:

```
verify: ok · 6 parts, 3 compositions · dossier 0.3.0 · 0 tripwires
Oracle: 22 passages · unsettled 22 · checked 14 · drawn 2 · backed 1 · doubts open 1 · text 1 · given 4 · prose@e20cbb
  claims: 3 behaviors, 7 claims · supported 5 · evidence unreviewed 1 · hypothesis 1
  next: Encode — not tried on the model side: M2 M3
  flags: doubt open (D1 on M3, assumed a) · review owed (no current dossier review with complete scoped basis and coverage)
next: Encode on parts/oracle — Oracle: not tried on the model side: M2 M3; Timelock: not tried on the model side: M3; Token: not tried on the model side: W1
```

`dossier review-basis parts/oracle --behavior saturate-age --json` reported no issues. The header binds its 8 required files unchanged. It adds eight files with `role: "additional"`, each for a finding below: the collection's `README.md`, `model/Oracle.tla`, and the entries tlc-A1-A2-N1-2d9e4b and blunder-N1-a38027, all in this part; `parts/vault/prose.md`; and `modules/oracle/behavior/operations.md`, `modules/oracle/overview.md` and `modules/oracle/relationships/edges.md` in the knowledge root.

`dossier recheck parts/oracle`, run once for the dossier: 7 same, 0 different, 0 not run. chart-64fcc7 came back `as-called` with its checks passing at "the chart over stale 0..3, price and last 0..4". The comparison wrote nothing and is no new evidence.

`parts/oracle` holds no `decisions.log`, and `integrity.json` has `decisionHead: null`. No owner has answered D1, so its `assumed: a` is the keeper's working assumption, not a decision.

## Assessment

| Mapping | Target | Result | In short |
| --- | --- | --- | --- |
| saturate-age/C1/M1 | M3, chart side | supported | The chart replays M3 at stale 3, the move is exclusive with M2, and TypeOK holds over every explored snapshot. The M3 check alone is thin (F5) |

C2 is a hypothesis with no mapping, as verify reports. Its path cannot be witnessed on the model side as the model stands (F1).

## Findings

Ordered by importance. Line numbers refer to the files as bound in the header. The plugin's own files are named by their path in the plugin repository at commit 9f94d71bb39755171813b2c0f5ea3ec205f62f8e.

### F1. In this part's model, every tick in Stale is disabled, so M2, M3 and C2's path cannot be reached

- Status: verified.
- Affects: M2, M3, saturate-age/C1/M1 (its limitation), C2, and the route "Encode — not tried on the model side: M2 M3". Trial 2026-11-24-1431-tlc-55837b (entry tlc-A1-A2-N1-2d9e4b) and trial 2026-11-24-1431-blunder-abc576 (entry blunder-N1-a38027).
- Statement: `Can_M4_PostA` and `Can_M5_PostB` (`parts/oracle/model/Oracle.tla` lines 42 and 43) hold in every Stale state, since `value = price` always meets the only-when band of G3 and G4. So `Due_LaneA` and `Due_LaneB` (lines 44 and 45) equal `state = "Stale"`. The prompt guards of G1 and G2 on M2_Tick and M3_Tick (lines 62 to 63 and 74 to 75) can never hold. The exhaustive answer records 0 generated states for both actions (`tlc-A1-A2-N1-2d9e4b.json` lines 72 to 86, over 32 distinct states with 0 queued at lines 56 to 58), and stale never exceeds 1 in the reachable model. M2_Tick fires only in the idlelanes blunder, which drops those guards (`blunder-N1-a38027.json` lines 68 and 97 to 103), and a blunder's answer covers nothing. As the model stands, no trial of it can cover M2 or M3 on the model side or witness C2's path, which needs three ticks in a row while Stale (doubts.md line 5). The mapping's limitation, "The model-side path is not covered" (saturate-age.md line 27), and the explanation at line 56 are accurate, but neither says why. A reader, or a keeper following the Encode route, could take the gap for missing work rather than for a consequence of the Givens.
- Scope: the part model as encoded, with every actor honest. The chart applies no Given and does reach stale 3 (F5).
- Missing evidence: none for the statement. On the chart, M4 has no condition on stale (prose.md line 21), so by the compiled moves a chart walk of C2's path would be accepted. This review replayed none, and no W passage takes that path (F4). A model-side witness would need the lanes late for several ticks, which a part's model with G1 and G2 honest cannot express. A part's behavior also cannot target a composition's cells (the plugin's `spec/behaviors.md`, Targets and current answers).

### F2. D1's stated reasons do not support its assumed alternative

- Status: verified as to what the cited texts say. Which alternative D1 should assume is the owner's decision.
- Affects: D1, M3, C2 (whose only assumption is D1's current alternative, saturate-age.md lines 42 to 44).
- Statement: doubts.md line 7 says "Assumed a, because the Vault reads the price regardless of its age and the lanes are prompt." First, under G1 and G2 as encoded, prompt lanes are exactly the condition under which the situation D1 asks about never arises (F1). Promptness therefore cannot decide what a price older than three blocks means. Second, the Vault's own prose places prices outside its abstraction (`parts/vault/prose.md` line 52, T2), so the Vault's model reads no price at any age. The knowledge base records the opposite of reading it regardless of age: "The vault refuses new borrowing when the feed is stale" (`modules/oracle/overview.md` line 21), and the edge `oracle-feeds-vault` carries the condition "a stale feed refuses the borrow" (`modules/oracle/relationships/edges.md` line 10). On the files bound here, then, neither reason supports alternative a: the first does not bear on the question, and the second runs against the records. No owner decision exists on D1.
- Scope: the doubt's authored rationale against the bound knowledge records and the Vault's prose. The Vault's source was not read.
- Missing evidence: the owner's answer to D1. If the Vault's source does read an old price somewhere, that source, which no record bound here describes.

### F3. C2 ties the recovery to D1's alternative a, but alternative b also ends with a post

- Status: not verified (it interprets an informal doubt).
- Affects: C2, D1.
- Statement: C2's assumption reads "D1 currently assumes that a post can refresh the price after the age counter saturates" (saturate-age.md line 43). D1's walk b (doubts.md line 6) ends "Stale and the price is void until a post", which also lets a post end the condition. The collection describes D1 as asking "what an older price means after the counter stops increasing" (README.md line 22). On that reading, recovery by a post is common to both alternatives, and what D1 decides is whether a saturated price is still usable, which C2 does not state. C2 may then not depend on D1's answer the way its assumption says.
- Scope: the authored texts of C2, D1 and the collection.
- Missing evidence: the owner's reading of D1's alternatives.

### F4. No walk takes M2 or M3

- Status: verified.
- Affects: M2, M3, C2, W1, W2.
- Statement: W1 and W2 (prose.md lines 39 and 40) each take one tick from Fresh and then a post. No W passage has two ticks while Stale, so the saturating path exists only in D1's walks (doubts.md lines 5 and 6), which are not evidence. On the chart side, M2 and M3 are covered by the move checks alone (F5), and C2 has no target it could map to.
- Scope: the prose's walks.
- Missing evidence: a walk of the saturated path, at least on the chart side, if the owner wants C2 checked.

### F5. The chart's cover of M3 is thin, though enough for C1

- Status: verified.
- Affects: M3, saturate-age/C1/M1, entry chart-64fcc7 (trial 2026-11-24-1431-chart-5c0890).
- Statement: in the plugin's `src/chart/checks.ts` (lines 137 to 159), a move check replays the event at the first explored snapshot that is in the move's from-state and meets its condition, and compares only the end state and the changes the move declares. M3 declares none (prose.md line 20), so "M3: Stale receives tick as said" (`chart-64fcc7.json` line 101) establishes only that a tick at stale 3 leaves the Oracle Stale. That stale does not grow there comes from the compiled move having no change. The same answer corroborates it: the TypeOK check (line 37) holds over all 100 explored snapshots (line 187), so no explored snapshot leaves 0..3, and the exclusivity check (line 153) shows that M2 does not also apply at 3. Together these establish C1 on the chart. The mapping cites the M3 and exclusivity checks but not TypeOK.
- Scope: the finite chart over the declared ranges.

### F6. The finite age differs from the recorded source, and the behavior says so

- Status: verified.
- Affects: C1, the explanation at saturate-age.md lines 54 and 58, T1.
- Statement: the knowledge base records stale as computed from the last post's block, growing by one every tick without a post (`modules/oracle/behavior/operations.md` line 35), and growing without bound when both lanes are offline (`modules/oracle/behavior/invariants.md` line 14). The chart folds every age from 3 upward into stale 3. C1 is scoped to the finite chart, and the explanation says that several real ages share one model state and that the counter does not decide whether an old price is safe to use. No claim is contradicted. Any claim about the source after three ticks would need its own scope and evidence.
- Scope: the claims and explanation against the knowledge records. The pinned source was not read.

## Review items

- `behavior:saturate-age:claims`: C1 is one descriptive statement that can be judged, at model level, with no assumptions, which fits a statement about the chart's moves. C2 is also judgeable, but it is a hypothesis with no mapping, so this review gives it no assessment. Its one assumption cites D1, whose stated reasons do not support the assumed alternative (F2), and its reading of D1 may be off (F3).
- `behavior:saturate-age:scope`: C1's scope, "Oracle M3 at stale three in the Stale chart state", matches its chart-side target. C2's scope is model level, but the model side cannot show its path as encoded (F1). Neither claim pins a record, and the divergence from the recorded source is acknowledged (F6).
- `behavior:saturate-age:mappings`: C1's mapping joins the claim to M3's chart side with `supports`, at the kind recorded, a finite chart check. Its rationale is right, and its limitation is accurate but leaves out why the model side is uncovered (F1) and that TypeOK carries part of the claim (F5). C2 has none.
- `behavior:saturate-age:explanation`: lines 54, 56 and 58 agree with the prose and with the limits of the evidence. In particular, a recovery check would not show that using the price during an outage was safe. The explanation does not say that C2's path cannot be reached on the model side (F1). Its link to the doubt resolves.
- `formal:1`: verify is ok with 0 tripwires. I re-read chart-64fcc7 and tlc-A1-A2-N1-2d9e4b in full. Their established trials are the ones `dossier verify --json` lists, their executed hashes match prose.md and the model files, and `integrity.json` binds both. verify reports M2 and M3 as covered on the chart and not on the model side, which agrees with F1. Recheck: 7 same.
- `formal:2`: no passage this behavior maps is marked checked or proved. M3 is drawn, from chart-64fcc7 (trial 2026-11-24-1431-chart-5c0890). Had M3 been false, for example had a tick at 3 left Stale or raised stale out of range, the M3 check or TypeOK would have failed. The rule is thin, as F5 says.
- `formal:3`: T1 (prose.md line 46) says the price's age is modeled. It is, but only up to 3 (F6). T1 hides no checkable claim.
- `formal:6`: G1 and G2 cite lane A and lane B (`actors/actors.md` lines 28 to 35), `on` post-a and post-b, with `prompt`. Prompt is warranted for N1's deadline, but it also makes the saturated age unreachable in the part model (F1). D1's walks need G1 and G2 both broken, and nothing in the part can break them.
- `formal:7`: K1 (prose.md line 43) is backed by `oracle#property:freshness`, `modules/oracle/behavior/invariants.md` lines 5 to 14. Its statement supports K1 as worded. Its check_hint says that with both lanes offline stale grows without bound, the very case the chart folds into stale 3 (F6). No claim of this behavior rests on K1.
- `formal:14`: there is no miscall. chart-64fcc7 and the other answers are `as-called`, with `previous` null.
- `formal:16`: the chart's reach, "the chart over stale 0..3, price and last 0..4", is the boundary's ranges, and its 100 snapshots reach stale 3. The TLC answers' reach text "stale up to 3" also gives the range, but they reached only stale 0 and 1 (F1). No entry has `narrowed`.
- `formal:17`: version control shows prose.md, doubts.md and the model unchanged since they were added (commit 5f7e9b9). The rebuilds changed only the entries' `established` blocks and `integrity.json`. I found no softened guard and no added Given.
- `formal:18`: D1 is open on M3, `assumed: a`, with no owner decision (F2, F3). No pair is unsaid, chart-64fcc7 records no gaps, and the part has no seams.
- `formal:19`: see F4. The paths that no walk takes are those that grow the age, including the saturating tick of M3.

## Not examined

- formal:4, formal:5, formal:8, formal:9, formal:10, formal:11, formal:12, formal:13, formal:15 and formal:20 do not apply to this behavior, for the reasons in the header.
- No chart replay of D1's walks was run. The statement in F1 that the chart would accept C2's path rests on reading the compiled moves.
- The pinned source and any deployment were not read, and neither was the Vault's source. Upkeep's outage scenarios and evidence were not assessed.
- The local trial bundles were not opened.
