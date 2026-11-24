```json
{
  "format": "dossier-review@0.2.0",
  "subject": {
    "kind": "behavior",
    "dossier": "parts/oracle",
    "behaviors": [
      "limit-price-step"
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
      "path": "parts/oracle/behaviors/limit-price-step.md",
      "sha256": "984159d48ce6b8a2b5e718c5aac127f805d2c04946e7e338a50e09817c5d9121",
      "claims": {
        "C1": "b173a066f2b8f9f68fe007bdd3b9eccae1ff9b484c82063bd9eccada011204ad"
      },
      "explanation": "1e3805a336653b3d23c300d4c960e179de32fda91c76bf3af62947a789764803"
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
      "path": "parts/oracle/evidence/blunder-A2-a033c6.json",
      "sha256": "a6d13135b7a81256fe466d29ca06d60b32c49a6369244fad4da41bfa2dc89755"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/oracle/evidence/blunder-A2-a033c6.md",
      "sha256": "ea21209b7d8a40f8dac3fc41992be1e7f5b56b9e1b92e063d5eb7ace1b39b1b4"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/oracle/evidence/tlc-A1-A2-N1-2d9e4b.json",
      "sha256": "b3f7ace4cd1bf8abb003b3a8420209ddee0c4b61962f2a94558b9e1e87efa1cc"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/oracle/evidence/tlc-A1-A2-N1-2d9e4b.md",
      "sha256": "1b5cfe1f31e05f4af796c30b320ed5e7ba9d52a1b3e7562d77837f94a9451b12"
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
      "path": "parts/oracle/model/blunders/jumpy_A2.cfg",
      "sha256": "425dd16cb05a537c6372d19fc869db88ec88a782547adc7708ad256da628d17c"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/oracle/model/blunders/jumpy.tla",
      "sha256": "0ce2e110f8f8c3bb202c634548083f7ae929a29c30b03609cae8dc91be89f386"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/oracle/model/Oracle.cfg",
      "sha256": "e99dab8ced9d1d795dfa6213c8cd64449d5bdc4e994a49cc021f969d35e12bf9"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/oracle/model/Oracle.tla",
      "sha256": "4f641228846353c4319f724a72664834218ea6e8e60dbc63ca819a7cfe1294a1"
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
      "path": "compositions/upkeep/behaviors/price-step-under-honesty.md",
      "sha256": "41f5f046debbeed55ed9eec6429053d373e382c096c45d0e66735b421ade0192"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/oracle/evidence/chart-64fcc7.json",
      "sha256": "f6ca2b77b3b4d2c5b59ea07650cb2eca08db581289c358ed94512ccb61bc2f19"
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
    }
  ],
  "coverage": {
    "examined": [
      "behavior:limit-price-step:claims",
      "behavior:limit-price-step:scope",
      "behavior:limit-price-step:mappings",
      "behavior:limit-price-step:explanation",
      "formal:1",
      "formal:2",
      "formal:3",
      "formal:4",
      "formal:5",
      "formal:6",
      "formal:13",
      "formal:14",
      "formal:16",
      "formal:17",
      "formal:18",
      "formal:19"
    ],
    "unexamined": [
      {
        "item": "formal:7",
        "reason": "Does not apply: no claim of this behavior rests on a guarantee; K1 concerns staleness, not the price step."
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
        "item": "formal:15",
        "reason": "Does not apply: a part has no cells, and parts/oracle has no decisions.log, so no risk was accepted."
      },
      {
        "item": "formal:20",
        "reason": "Does not apply: A2 is an Always; this behavior maps no Within or Once."
      }
    ]
  },
  "replaces": [],
  "assessments": [
    {
      "mapping": "limit-price-step/C1/M1",
      "result": "supported",
      "rationale": "A2 in parts/oracle/model/Oracle.tla line 128 is the passage's condition, prose.md line 27, clause by clause. last holds the price before the latest post: Init sets both to 2 (lines 33 and 34), each post sets last to the old price and price to the value (lines 88 and 89, 100 and 101), and ticks change neither. So A2 says that consecutive modeled prices differ by at most one. The deciding answer tlc-A1-A2-N1-2d9e4b, from trial 2026-11-24-1431-tlc-55837b, holds A2 over the exhausted reachable space with the only-when bands of G3 and G4 in force. The jumpy blunder, trial 2026-11-24-1431-blunder-cf93a1, drops both bands, and A2 catches it when lane A posts 0 over a price of 2.",
      "limitations": [
        "A2 is the only-when band of G3 and G4 carried through a post's bookkeeping. The check adds only that last records the price before the post and that ticks leave price and last alone. It gives no evidence about the lanes.",
        "Bounded model evidence over the finite model, not an inductive proof. The chart cannot check A2, because A2 cites Givens.",
        "Honest lanes only, with G1 and G2 also in force. Nothing in the recorded source enforces the band."
      ]
    }
  ]
}
```

# Review of limit-price-step

A focused review of one behavior, `parts/oracle/behaviors/limit-price-step.md`, after Harbor was rebuilt under Dossier 0.3.0. It assesses the single mapping of C1 and accounts for every review item. It does not review the whole dossier and does not clear the dossier review that verify reports as owed. It records no decision and changes no claim.

## Standing when examined

`dossier verify --brief parts/oracle`, before this file was written, with the `read:` line left out. The refresh-price review of the same date was already in place:

```
verify: ok · 6 parts, 3 compositions · dossier 0.3.0 · 0 tripwires
Oracle: 22 passages · unsettled 22 · checked 14 · drawn 2 · backed 1 · doubts open 1 · text 1 · given 4 · prose@e20cbb
  claims: 3 behaviors, 7 claims · supported 4 · evidence unreviewed 2 · hypothesis 1
  next: Encode — not tried on the model side: M2 M3
  flags: doubt open (D1 on M3, assumed a) · review owed (no current dossier review with complete scoped basis and coverage)
next: Encode on parts/oracle — Oracle: not tried on the model side: M2 M3; Timelock: not tried on the model side: M3; Token: not tried on the model side: W1
```

`dossier review-basis parts/oracle --behavior limit-price-step --json` reported no issues. The header binds its 14 required files unchanged. It adds four files with `role: "additional"`: `compositions/upkeep/behaviors/price-step-under-honesty.md` for the explanation's link, `parts/oracle/evidence/chart-64fcc7.json` for F4, and `modules/oracle/behavior/operations.md` and `modules/oracle/overview.md` in the knowledge root for F2.

`dossier recheck parts/oracle`, run once for the dossier: 7 same, 0 different, 0 not run. tlc-A1-A2-N1-2d9e4b came back `as-called` with A2 holding at "stale up to 3; price up to 4", and blunder-A2-a033c6 came back with A2 violated at the same reach. The comparison wrote nothing and is no new evidence.

`parts/oracle` holds no `decisions.log`, and `integrity.json` has `decisionHead: null`. The owner has decided nothing about A2, G3 or G4.

## Assessment

| Mapping | Target | Result | In short |
| --- | --- | --- | --- |
| limit-price-step/C1/M1 | A2, model side | supported | A2 holds over the exhausted model with G3 and G4 in force, and the blunder that drops both bands is caught. The property is the Givens' band restated (F1) |

The evidence is a bounded model check (TLC over the finite model). No answer is inductive, and no chart check covers A2. The claim is model-level, and nothing here bears on the pinned source or a deployment.

## Findings

Ordered by importance. Line numbers refer to the files as bound in the header. The plugin's own files are named by their path in the plugin repository at commit 9f94d71bb39755171813b2c0f5ea3ec205f62f8e.

### F1. A2 is the only-when band of G3 and G4, restated over price and last

- Status: verified.
- Affects: A2, G3, G4, limit-price-step/C1/M1. Trials 2026-11-24-1431-tlc-55837b (entry tlc-A1-A2-N1-2d9e4b) and 2026-11-24-1431-blunder-cf93a1 (entry blunder-A2-a033c6).
- Statement: each post sets `last' = price` and `price' = value` (`parts/oracle/model/Oracle.tla` lines 88 and 89, 100 and 101). The only-when guard of G3 or G4 (lines 85 and 97) limits `value` to one step from the current price. Ticks leave price and last unchanged (lines 54, 66 and 77), and Init starts both at 2 (lines 33 and 34). After every post, A2 (line 128) is therefore exactly the band the Given imposed on that post, and it holds by a one-step induction that is the Given itself. The answer confirms that the model keeps this bookkeeping: last records the price before the post, and ticks move neither value. The jumpy blunder confirms that A2 depends on G3 and G4 (`blunder-A2-a033c6.json` lines 39 to 79). Neither adds evidence about what a lane does. C1 states G3 and G4 as its assumptions (limit-price-step.md lines 15 to 18), so the claim does not overstate. Its support has the weight of those assumptions.
- Scope: the part model as encoded, with every actor honest.
- Missing evidence: none for the statement.

### F2. Nothing recorded enforces the band or identifies who is held to it

- Status: verified.
- Affects: G3, G4, the scope of C1.
- Statement: the knowledge base's `post` operation lists only the lane whitelist as a precondition (`modules/oracle/behavior/operations.md` lines 16 to 17) and records no limit on the step. The module's gap `lane-operators` is open, and the lanes are known by address only (`modules/oracle/overview.md` lines 64 to 69). G3 and G4 are therefore assumptions about keeper conduct that the records neither enforce nor assign to a named operator. The mapping's limitation, that the restriction is "not a guard that constrains a malicious lane" (limit-price-step.md line 30), and the explanation at line 45 say this correctly. This is a limit on what A2 can carry, not a defect in the behavior.
- Scope: the knowledge records as bound. The pinned source was not read.
- Missing evidence: the source, for whether any step limit exists there.

### F3. The explanation's link to Upkeep says what the linked behavior holds

- Status: verified.
- Affects: the explanation at limit-price-step.md line 45.
- Statement: the link resolves to `compositions/upkeep/behaviors/price-step-under-honesty.md`. Its C2 (lines 37 to 62) is a requirement that the band hold when lane A is malicious, and its mapping `challenges` that requirement through the cell A1 under lane-a-captured. That keeps the malicious-lane failure in view, as line 45 says. This review assessed neither that mapping nor Upkeep's evidence.
- Scope: the authored text of the linked behavior.

### F4. A2 has a single positive answer; the chart cannot speak for it

- Status: verified.
- Affects: A2, chart-64fcc7.
- Statement: A2 cites G3 and G4, so the chart skips it (the plugin's `spec/language.md`, A, Always). chart-64fcc7 records no A2 check (its checks end with A1 at line 161), and `dossier verify --json` gives A2 no chart cover. With no Given in force the chart explored 100 snapshots (line 187), a set that admits posts outside the band. A2's only positive evidence is the one TLC answer, together with the blunder that shows A2 is sensitive to the band.
- Scope: the current answers of this part.

### F5. The recorded evidence re-reads as published, and recheck agrees

- Status: verified.
- Affects: entries tlc-A1-A2-N1-2d9e4b and blunder-A2-a033c6.
- Statement: both entries' `executed` hashes match the bound model, configuration and blunder files. Their snapshots carry the current passage hashes, A2 at ef269f93. `integrity.json` binds both digests, and the trials that `dossier verify --json` lists for A2 are these entries' `established` trials. Recheck returned the same verdict, outcomes and reach.

## Review items

- `behavior:limit-price-step:claims`: C1 is one descriptive statement that can be judged, at model level. Its assumptions paraphrase G3 and G4 (prose.md lines 35 and 36) faithfully. "Consecutive modeled prices" are price and last, with last the previous posted price or the starting 2.
- `behavior:limit-price-step:scope`: model level with no pins, "price and last in 0..4". TLC exhausted the reachable space (`tlc-A1-A2-N1-2d9e4b.json` lines 56 to 58: 32 distinct states, 0 queued) within those ranges. No actor, source or deployment reach is claimed.
- `behavior:limit-price-step:mappings`: the mapping joins C1 to A2's model side with `supports`, at the kind recorded, a bounded model check. Its limitation is accurate. It does not say that A2 restates the Givens (F1).
- `behavior:limit-price-step:explanation`: line 43 agrees with the assignments of M4 and M5 (prose.md lines 21 and 22). Line 45 keeps the Givens apart from market accuracy and from malicious lanes, and its link says what the target holds (F3).
- `formal:1`: verify is ok with 0 tripwires. I re-read tlc-A1-A2-N1-2d9e4b and blunder-A2-a033c6 in full, and they agree with `dossier verify --json` (F5). Recheck: 7 same.
- `formal:2`: A2 is checked. tlc-A1-A2-N1-2d9e4b decides it (trial 2026-11-24-1431-tlc-55837b), and the jumpy blunder (trial 2026-11-24-1431-blunder-cf93a1) caught it. Had the bookkeeping been wrong, say last taking the posted value, or the band wider than one step, the invariant would have failed at the first post outside the band, as the blunder's trace shows. The mechanical rule is not thin here, but what it shows follows directly from the Givens (F1).
- `formal:3`: T1 (prose.md line 46) says the step a post may move the price is modeled. It is, as the Givens G3 and G4 and not as a guard. T1 hides no checkable claim.
- `formal:4`: A2 (Oracle.tla line 128) is `price + 1 >= last and last + 1 >= price`, prose.md line 27 clause by clause.
- `formal:5`: jumpy removes only the two only-when lines (85 and 97 of the copy). A1, N1 and TypeOK still hold under it: stale handling is unchanged, every Stale state still admits a post, and values stay in 0..4. So only A2 catches it. It is the obvious blunder, and an empty property would not catch it.
- `formal:6`: G3 and G4 cite lane A and lane B (`actors/actors.md` lines 28 to 35), `on` post-a and post-b, each the lane's own event. Their `only when` is a condition over the event's field and the part's datum, with no `prompt`, so they add no fairness. They restrain what an honest lane submits, but nothing recorded makes the owners able to hold a named operator to that (F2), and A2 is nearly their conclusion (F1).
- `formal:13`: retold from the `dossier show` table of blunder-A2-a033c6: Fresh with price 2 and last 2; a tick (M1_Tick) to Stale; lane A's post (M4_PostA) of 0 to Fresh with price 0 and last 2. 0 + 1 is below 2, so A2 fails on the first post. That agrees with the call and the reading. No walk or witness is mapped by this behavior, and a part has no cells. Limitation: the reading was printed in the same output as the entry, so this retelling was not made before seeing it.
- `formal:14`: there is no miscall. Both answers are `as-called`, and `previous` is null.
- `formal:16`: the reach "stale up to 3; price up to 4" gives the boundary's ranges (prose.md line 6). Price and last span them in the exhausted space. Stale reached only 0 and 1 there, which does not bear on A2. No entry has `narrowed`, and verify flags no `reworded`.
- `formal:17`: version control shows prose.md, Oracle.tla, jumpy.tla and their configurations unchanged since they were added (commit 5f7e9b9). The later rebuilds changed only the entries' `established` blocks and `integrity.json`. I found no loosened guard, no added Given and no reworded property.
- `formal:18`: no pair is unsaid, chart-64fcc7 records no gaps, and the part has no seams. D1 is open on M3, with no owner decision, and does not bear on A2.
- `formal:19`: W2 is the only walk that moves the price, from 2 to 3 with last 2, a step inside the band. No walk steps down or posts at either end of the range. A walk cannot show the band refused, since the band is a Given, not a Refusal. That is no defect for this claim.

## Not examined

- formal:7, formal:8, formal:9, formal:10, formal:11, formal:12, formal:15 and formal:20 do not apply to this behavior, for the reasons in the header.
- The pinned source and any deployment were not read. The claim is model-level, and whether Oracle.sol limits a step was not assessed.
- Upkeep's A1 cells and their evidence were not assessed. Only the linked behavior's text was read.
- The local trial bundles were not opened.
