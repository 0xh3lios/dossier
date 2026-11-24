```json
{
  "format": "dossier-review@0.2.0",
  "subject": {
    "kind": "behavior",
    "dossier": "parts/adapter",
    "behaviors": [
      "convert-credit"
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
      "path": "parts/adapter/behaviors/convert-credit.md",
      "sha256": "a1262ecf3e1b92d6eeebbe0b20234e869e5abb651247d31e409bbe053f477546",
      "claims": {
        "C1": "2754c47aad63fd75de578160db932541143441b5f0eca1a072ee675137c0ff49",
        "C2": "5711a600e26d7bdab1404e1b42fe26c051a5e366f75a7695167e6f6910834dbe",
        "C3": "0ed624a26ac3bfc9afe688621fc589621961b38fa851369298d760048e8cba23"
      },
      "explanation": "5ebe614a5403c9cbf2b38535c5d13686820c3507b9bbe99d417cc7fb422b83a4"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/adapter/decisions.log",
      "sha256": "5f53b799cc277f14b98c41002f1edc3aa8eba8d55acf86a92695f1a5be9b459c"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/adapter/evidence/chart-64fcc7.json",
      "sha256": "0ec583402145fa2c2d26de6b172103812657a4d8e215f3e18d59bca1ec3f919e"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/adapter/evidence/chart-64fcc7.md",
      "sha256": "befaee48cdf34249bf101b4f2363f3211d2f65f22311570f9dbbef637b64df13"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/adapter/evidence/external-W1-W2-98c5aa.json",
      "sha256": "107dc9538d97521ed7370954ba71ac9c51abfee70bb78c67e3bfb5344abd1f8a"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/adapter/evidence/external-W1-W2-98c5aa.md",
      "sha256": "c29ec647c803244db8e4295b70ec4d972a7368aa1c597b13f3ce33ad548c3520"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/adapter/evidence/tlc-W1-fb78f0.json",
      "sha256": "7e888fb398a0c6bf927e524b902730374f34c392f1d0110ac6c4264d49fae5e8"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/adapter/evidence/tlc-W1-fb78f0.md",
      "sha256": "2a3ed000fa89dbbed65805ad927eabbb8beb37877e75c7964ef34e6de5829b3e"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/adapter/integrity.json",
      "sha256": "cf3fcbdea25dba57500734b20abdefa75f210e71c3899e82e0910a40140a61b1"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/adapter/model/Adapter_W1.cfg",
      "sha256": "4a90c9befd026d9a86f572a1a8d1254753519b9e86f34b0274563eecb3f3f249"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/adapter/model/Adapter.tla",
      "sha256": "12bea82c7f234a39aa0467a03faf1d8dc2b5d5343c6b203b7cf3c528289e4729"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/adapter/prose.md",
      "sha256": "58d831b706099361e3b3fa6855a8b79b5d0c0fc8227521e7582ac34ad48c73fb"
    },
    {
      "role": "required",
      "root": "knowledge",
      "path": "modules/adapter/behavior/invariants.md",
      "sha256": "1321ece4bbced1057b54077d460d45e8cdda11ae347865aa7aa29ca298ec393e"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "compositions/supply/prose.md",
      "sha256": "4c104ddae554c6bcb09d1361e18619be3b42f774994bffd87f6f11603c34683d"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "compositions/supply/wiring.md",
      "sha256": "613f91fd87ef47e8ff980e411c9e8833803c93bb8a3f6f8e28e720195f82d2b3"
    }
  ],
  "coverage": {
    "examined": [
      "behavior:convert-credit:claims",
      "behavior:convert-credit:scope",
      "behavior:convert-credit:mappings",
      "behavior:convert-credit:explanation",
      "formal:1",
      "formal:2",
      "formal:6",
      "formal:7",
      "formal:13",
      "formal:14",
      "formal:16",
      "formal:17",
      "formal:18",
      "formal:19"
    ],
    "unexamined": [
      {
        "item": "formal:3",
        "reason": "Does not apply: no claim or sentence of this behavior rests on a words-only passage; T1 is about eventual promises, which this behavior does not make."
      },
      {
        "item": "formal:4",
        "reason": "Does not apply: this behavior maps no Always, Once or Within; its targets are the walk W1 and the refusals R2 and R3."
      },
      {
        "item": "formal:5",
        "reason": "Does not apply: no property is among this behavior's targets, and no blunder targets W1, R2 or R3."
      },
      {
        "item": "formal:8",
        "reason": "Does not apply: the Adapter has no assumed guarantee; K1 is backed and is examined under formal:7."
      },
      {
        "item": "formal:9",
        "reason": "Does not apply: every claim of this behavior is model level with no pins, and the Adapter's prose and answers pin no record."
      },
      {
        "item": "formal:10",
        "reason": "Does not apply: closure belongs to compositions, and parts/adapter is a part."
      },
      {
        "item": "formal:11",
        "reason": "Does not apply: wiring belongs to compositions, and parts/adapter is a part."
      },
      {
        "item": "formal:12",
        "reason": "Does not apply: scenarios belong to compositions; the Adapter's walks run under none."
      },
      {
        "item": "formal:15",
        "reason": "Does not apply: a part has no cells, and decisions.log records no risk acceptance."
      },
      {
        "item": "formal:20",
        "reason": "Does not apply: the Adapter has no Once or Within passage."
      }
    ]
  },
  "replaces": [],
  "assessments": [
    {
      "mapping": "convert-credit/C1/M1",
      "result": "supported",
      "rationale": "W1 is checked on both sides: chart-64fcc7 replays it (trial 2026-11-24-1431-chart-c026ab) and the TLC witness tlc-W1-fb78f0 (trial 2026-11-24-1431-tlc-5d358b) reached W1_End as called. Retold from that entry's trace, the path is exit 2 by M1 and enter 2 by M2, from Open with held 0 back to Open with held 0, sending move, mint, burn and release once each. C1 claims that this one path of the model can happen, which is what a witness establishes.",
      "limitations": [
        "One path at amount 2 from the initial state; a witness establishes its path, not every execution.",
        "W1, W1_End and the chart's replay compare only move, mint and burn; release rests on the recorded trace alone (sent_release = 1 at state 3), and the call compares held.",
        "No evidence in this part records the amount an effect carries; the model counts sends.",
        "external-W1-W2-98c5aa grounds W1 on a stand-in, does not decide it, and lies outside this model-level claim."
      ]
    },
    {
      "mapping": "convert-credit/C2/M1",
      "result": "supported",
      "rationale": "R2's chart side is checked by chart-64fcc7 (trial 2026-11-24-1431-chart-c026ab): 'R2: refused as said' passed over 702 explored snapshots with held 0..4 and every enter amount 0..2, in Open and in Halted, where amount > held is met at reachable snapshots (held 0 or 1). That is the claim's statement about the finite chart.",
      "limitations": [
        "The check compares R2's condition with the M2 and M3 guards compiled from the same prose: it shows the chart consistent, and nothing about the source.",
        "A conditional refusal needs no model answer, and none covers R2; the TLA+ guards agree only by inspection.",
        "No walk attempts an entry that R2 refuses.",
        "Held credit is aggregate, not a holder's balance."
      ]
    },
    {
      "mapping": "convert-credit/C3/M1",
      "result": "supported",
      "rationale": "R3's chart side is checked by chart-64fcc7 (trial 2026-11-24-1431-chart-c026ab): 'R3: refused as said' passed, and in Open held + amount > 4 is met at reachable snapshots (held 3 with amount 2, held 4 with amount 1 or 2). The claim's scope limits it to R3 in Open, which matches the passage.",
      "limitations": [
        "The check compares R3's condition with M1's guard compiled from the same prose: it shows the chart consistent, and nothing about the source.",
        "No model answer covers a conditional refusal; in Halted every exit is refused by R1, which this mapping does not cover.",
        "No walk attempts an exit that R3 refuses.",
        "The capacity of 4 is the model's fixed range."
      ]
    }
  ]
}
```

# Behavior review: convert-credit

Subject: the behavior `convert-credit` of `parts/adapter`, read on 2026-11-24 after the 0.3.0 rebuild. This is a review of one behavior. It assesses that behavior's three mappings, does not stand in for the dossier review the Adapter owes, and records no decision. The reviews the rebuild removed were not consulted, and this review replaces none of them.

## Standing before this review

`dossier verify --brief parts/adapter`, without its `read:` line:

```
verify: ok · 6 parts, 3 compositions · dossier 0.3.0 · 0 tripwires
Adapter: 20 passages · settled 11 · confirmed 11 · unsettled 9 · checked 18 · backed 1 · text 1 · prose@3ae029
  claims: 2 behaviors, 6 claims · evidence unreviewed 6
  next: Review — no current dossier review with complete scoped basis and coverage
  flags: review owed (no current dossier review with complete scoped basis and coverage)
next: Encode on parts/oracle — Oracle: not tried on the model side: M2 M3; Timelock: not tried on the model side: M3; Token: not tried on the model side: W1
```

`dossier review-basis parts/adapter --behavior convert-credit --json` reported no issues. The record above binds its fourteen entries unchanged, with the claim and explanation digests of the behavior file, and adds two files with `role: "additional"`: the Supply composition's `prose.md` and `wiring.md`, which finding F6 relies on.

`dossier recheck parts/adapter`, run once for the dossier, wrote nothing and reported `6 same, 0 different, 0 not run`. The entries chart-64fcc7, tlc-A1-1d90d3, tlc-W2-f022fb, tlc-W1-fb78f0, blunder-A1-cf3362 and external-W1-W2-98c5aa came back with the verdict, outcomes and reach their entries hold. The recheck is a comparison and creates no evidence.

## What was read

- The behavior, `parts/adapter/behaviors/convert-credit.md` (lines 1-96), and the abstraction, `parts/adapter/prose.md` (lines 1-44).
- The model `parts/adapter/model/Adapter.tla` (lines 1-143) and the configuration the W1 witness executed, `parts/adapter/model/Adapter_W1.cfg` (lines 1-5).
- The entries and readings the mappings resolve to, `chart-64fcc7`, `tlc-W1-fb78f0` and `external-W1-W2-98c5aa` under `parts/adapter/evidence/`, with `dossier show` for the witness trace.
- `parts/adapter/decisions.log` (line 1), `parts/adapter/integrity.json`, `actors/actors.md` and the K1 backing record, `modules/adapter/behavior/invariants.md` in the knowledge base (lines 1-31).
- `dossier verify --json` for the marks, the deciding entries and the behavior report, and `dossier where parts/adapter`.
- Bound as additional: `compositions/supply/prose.md` (lines 1-16) and `compositions/supply/wiring.md` (lines 1-27), read only to check what this behavior says Supply does.
- Read as generated views of the bound prose, and not bound: `parts/adapter/chart/machine.json` and `parts/adapter/chart/grid.md`.
- Not read: the trials' local bundles, the external replay runner behind `external-W1-W2-98c5aa`, which lies outside both roots, Supply's evidence, and the removed earlier reviews.

## Assessments

| Mapping | Target | Result |
| --- | --- | --- |
| convert-credit/C1/M1 | walk W1 | supported |
| convert-credit/C2/M1 | passage R2, chart side | supported |
| convert-credit/C3/M1 | passage R3, chart side | supported |

**C1/M1, supported.** C1 says the model can exit two units, enter them again, return held credit to zero and send the modeled conversion effects (`convert-credit.md` line 9). W1 is checked on both sides. The chart replays it (`chart-64fcc7.json` line 141, trial 2026-11-24-1431-chart-c026ab), and the TLC witness `tlc-W1-fb78f0` (trial 2026-11-24-1431-tlc-5d358b) reached `W1_End` as called (`tlc-W1-fb78f0.json` lines 42-45, 172). Retold from the entry in F8, the path is exit 2 by M1 and then enter 2 by M2, from Open with held 0 back to Open with held 0, with move, mint, burn and release each sent once. A witness establishes exactly such a path. The limits: it is one path at one amount; W1, `W1_End` and the chart's replay compare only move, mint and burn, so release rests on the recorded trace alone (F3); no evidence in this part records the amount an effect carries (F1); and the external replay grounds W1 on a stand-in without deciding it, outside this model-level claim.

**C2/M1, supported.** C2 says the finite chart refuses entry when the amount exceeds held credit (line 36), scoped to R2 with held 0..4 and amounts 0..2 (line 39). The check `R2: refused as said` passed (`chart-64fcc7.json` line 125) over 702 explored snapshots (line 195) with every enter amount 0..2. The condition `amount > held` is met at reachable snapshots in both Open and Halted, since held 0 and 1 are reachable in each, so the check is not vacuous. The limits: the check compares R2's condition with the M2 and M3 guards compiled from the same prose, so it establishes the chart's consistency and nothing about the source; R2 is a conditional refusal, so no model answer covers it (F5); no walk attempts a refused entry (F4); and held credit is aggregate, as the mapping's own limitation says.

**C3/M1, supported.** C3 says the finite chart refuses an exit that would put held credit above four (line 63), scoped to R3 in Open (line 66). The check `R3: refused as said` passed (`chart-64fcc7.json` line 133). In Open the condition `held + amount > 4` is met at reachable snapshots (held 3 with amount 2, held 4 with amount 1 or 2). The statement omits "in Open", but the scope supplies it, and in Halted every exit is refused by R1 instead, which this mapping does not cover. The limits are those of C2: a consistency check of the chart, no model answer for a conditional refusal, no walk, and a fixed capacity of 4.

## Findings

Ordered by importance. A status describes the support for the finding's statement, not whether a claim passes.

### F1. The carried amount is stated in words and checked nowhere in this part

- Statement: the explanation's sentence "Each effect carries the same amount as the user action" (`convert-credit.md` line 94) is not established by any evidence of `parts/adapter`. The model counts sends and records no amount: `M1_Exit` and `M2_Enter` add one to `sent_move`, `sent_mint`, `sent_burn` and `sent_release` (`Adapter.tla` lines 66-67, 81-82). W1 compares send counts only (`prose.md` line 30, `Adapter.tla` line 139), and so does the chart's replay (`chart-64fcc7.json` line 141). M1 and M2 name their effects without values (`prose.md` lines 18-19). The boundary (`prose.md` line 6) and the seams X1 and X2 (lines 34-35) say the effects carry the amount, but a seam is covered by its counterpart's words, not by a check. No claim of this behavior maps a carried amount.
- Where it would be exercised: Supply wires the four effects to the Vault's and the Token's events (`compositions/supply/wiring.md` lines 14-22) and states A2 and A3 over `token.supply`, `vault.issued` and `adapter.held` (`compositions/supply/prose.md` lines 9-10). This review did not read Supply's evidence and says nothing about whether those cells hold.
- Affected: the explanation of `convert-credit`; passages M1, M2, X1, X2. No assessment changes.
- Status: verified.
- Missing: a claim mapped to evidence that compares carried amounts, or a sentence that sends the reader to Supply for them.

### F2. The general account of exit and entry is carried by no claim

- Statement: "An exit increases held credit and sends move to the Vault and mint to the Token. An entry decreases held credit and sends burn and release" (`convert-credit.md` line 94) describes M1 and M2 (and M3) for every amount. The claims map one walk at amount 2 (C1) and two refusals (C2, C3). The behavior report in `dossier verify --json` lists M1, M2, M3 and M4 among the passages no behavior is associated with. Evidence for the general sentences exists: the chart checks `M1: Open receives exit as said` and `M2: Open receives enter as said` passed (`chart-64fcc7.json` lines 85, 93), and both actions fired in `tlc-W1-fb78f0`. It is not mapped, so the explanation says more than its claims carry.
- Affected: the explanation; passages M1, M2.
- Status: verified.
- Missing: a claim mapped to M1 and M2, if the keeper wants the general statement carried.

### F3. Release appears in C1 only through the recorded trace

- Statement: C1 says the path sends "the modeled conversion effects". I read these as the four effects M1 and M2 send. W1 as written (`prose.md` line 30), the witness's end condition `W1_End` (`Adapter.tla` line 139) and the chart's replay all compare move, mint and burn only. The mapping's rationale names those three (`convert-credit.md` line 25). Release is visible only in the trace the checker returned: state 3 holds `sent_release = 1` (`tlc-W1-fb78f0.json` line 94). The call compares held alone (`trace-data: held`, line 20). On this one path the trace supports release, so the assessment stays supported, but no expectation would fail if M2 stopped sending release.
- Affected: convert-credit/C1/M1; passages W1, M2.
- Status: verified.
- Missing: release in W1's expectations, or a narrower wording of C1.

### F4. No walk takes the refused entry or the refused over-capacity exit

- Statement: neither walk attempts an entry that R2 refuses or an exit that R3 refuses. W1 (`prose.md` line 30) refuses nothing, and W2's refused step (line 31) is an exit in Halted, refused by R1. The refusals C2 and C3 claim are established only by the chart's refusal checks (`chart-64fcc7.json` lines 125, 133), which explore every reachable snapshot with every amount 0..2. The review contract counts a path that no walk takes as a finding. It does not weaken C2 or C3, which are scoped to the chart.
- Affected: R2, R3; walks W1, W2.
- Status: verified.

### F5. What decides W1, R2 and R3, and where the rule is thin

- W1: the chart side is decided by `chart-64fcc7` (trial 2026-11-24-1431-chart-c026ab, check at line 141), and the model side by `tlc-W1-fb78f0` (trial 2026-11-24-1431-tlc-5d358b), as `dossier verify --json` reports. Had W1 been false, for example had M2 not sent burn or not returned held to 0, the replay would fail on effects or end data, `W1_End` would be unreachable, `NotW1` would hold and the trial would come back miscalled. `external-W1-W2-98c5aa` (trial 2026-11-24-1431-external-5bdd8c) grounds W1 and decides nothing.
- R2 and R3: both are marked checked from `chart-64fcc7` alone, with no model answer, since a conditional refusal needs none. The check compares two sentences of the same prose, R2's condition with the M2 and M3 guards (`prose.md` lines 19-20, 23), and R3's with M1's guard (lines 18, 24). It would fail had a guard admitted a case the refusal covers. It shows the prose consistent with itself. The TLA+ guards agree by inspection (`Adapter.tla` lines 63, 78, 93), but no model answer checks R2 or R3.
- Status: verified.

### F6. The pointer to Supply matches what Supply states

- Statement: C1/M1's limitation "cross-part conservation is checked by Supply" (`convert-credit.md` line 27) and the explanation's "The Supply composition checks the balances across these effect boundaries" (line 96) agree with Supply's text. Its wiring routes `adapter.move`, `adapter.release`, `adapter.mint` and `adapter.burn` to `vault.move`, `vault.release`, `token.mint` and `token.burn` (`compositions/supply/wiring.md` lines 14-22). Its prose states A1 to A3 under `all-honest` and `user-malicious`, A3 being `adapter.held = token.supply` (`compositions/supply/prose.md` lines 8-10). This finding is about what Supply states, not about whether its cells hold, which this review did not examine.
- Status: verified.
- Missing: an examination of Supply's evidence, which would show whether its cells establish the balances.

### F7. Claims, scope and the remaining mappings

- Statement: each claim is one statement that can be judged, descriptive, at model level with no pins and no assumptions (`convert-credit.md` lines 8-15, 35-42, 62-69), and none needs an assumption to hold in the model. The scopes name W1, R2 and R3 with the chart's ranges, held 0..4 and amounts 0..2, which match the boundary (`prose.md` lines 6, 13-14) and the chart's reach (`chart-64fcc7.json` lines 198-202). The actors are the User for exit and enter and the Breaker, a part, for halt. No claim depends on how either behaves. The external replay (`external-W1-W2-98c5aa.json` lines 39-58) runs a stand-in and lies outside these model claims: it neither adds to nor contradicts C1. The limitations of C2/M1 and C3/M1 (`convert-credit.md` lines 54, 81) are accurate.
- Status: verified; nothing wrong.

### F8. Retelling the W1 witness

From the trace in `tlc-W1-fb78f0.json` (lines 50-104), before reading the keeper's reading. The amounts are inferred from the changes to held:

1. Initial predicate: Open, held 0, live TRUE, every counter 0 (lines 52-68).
2. `M1_Exit`, encoding M1: the User's exit of 2 is accepted in Open since 0 + 2 <= 4; held becomes 2; move and mint are sent once; `w1_at` becomes 1 (lines 70-86).
3. `M2_Enter`, encoding M2: the User's enter of 2 is accepted in Open since 2 <= 2; held becomes 0; burn and release are sent once; `w1_at` becomes 2 (lines 88-104).

`W1_End` holds at state 3 (`Adapter.tla` line 139). The keeper's reading (`tlc-W1-fb78f0.md` line 1) retells the same steps and actions and does not mention release. No step is skipped or misnamed. A part has no violated cell, and the dossier's only blunder targets A1, so no blunder trace bears on W1, R2 or R3.

- Status: verified.

### F9. Owner decisions not made on this behavior's passages

- Statement: the only decision (`decisions.log` line 1) accepts S1, S2, E1 to E3, M1 to M4, R1 and A1 at their current hashes. W1, R2 and R3, the three passages this behavior maps, are unsettled, as verify reports. This is the owner's column, kept apart from the assessments above. No doubt is open, there is no `doubts.md`, no pair is unsaid, the chart reports no gaps (`chart-64fcc7.json` line 196), and X1 to X3 are marked checked, so their counterparts match word for word. Closure does not apply to a part.
- Status: verified.

### F10. Reach against the boundary

- Statement: the boundary gives held up to 4 and amounts up to 2 (`prose.md` lines 6, 13-14). The chart explored held 0..4 with every amount 0..2 (`chart-64fcc7.json` lines 195-202). The W1 witness quantifies amounts over 0..2 (`Adapter.tla` line 61) under the `SentBounded` constraint with MaxSent 4 (`Adapter_W1.cfg` lines 2-3). Its reach text, "amounts up to 2" (`tlc-W1-fb78f0.json` line 163), omits that send bound, which a two-step witness does not reach. `narrowed` is null in every entry read. No reach is narrower than the data allows.
- Status: verified.

### F11. History shows no forbidden move

- Statement: in version control, `prose.md` and the model files were created once, in commit 5f7e9b9, and the behavior in 9f94d71, with no later change. Commit 9f94d71 also rewrote all six entries and `decisions.log`, and the 0.3.0 rebuild, uncommitted when this review was written, did so again. In both steps the only lines that changed in any entry are those of its `established` block (trial, time, versions and bundle), and the readings did not change. Each step re-recorded the same accept, with the same passages, hashes and words, at a new time (`decisions.log` line 1). No outcome, verdict or accepted passage changed. `previous`, `narrowed` and `replaced` are null in each entry (`chart-64fcc7.json` lines 264-266, `tlc-W1-fb78f0.json` lines 235-237), which by itself shows little after a rebuild that writes every entry afresh. No property changed between answers, no guard was loosened, and no Given was added. Version control holds no earlier history of this dossier.
- Status: verified.

### F12. Entries against verify, and no miscall

- Statement: verify reports ok with no tripwire. Two entries were re-read against `dossier verify --json`. `chart-64fcc7` (trial 2026-11-24-1431-chart-c026ab, as called, checks pass, reach "the chart over held 0..4") is the entry verify names for R2, R3 and W1's chart side. Its executed `prose.md` digest matches the file, and its snapshot's passage hashes match the decision's. `tlc-W1-fb78f0` (trial 2026-11-24-1431-tlc-5d358b, `NotW1` violated as called, reach "amounts up to 2") is the entry verify names for W1's model side, and its executed digests match `Adapter.tla` and `Adapter_W1.cfg`. Every entry read is as called, with `miscalls` empty and `previous` null (`chart-64fcc7.json` line 205, `tlc-W1-fb78f0.json` line 173), so there is no classification to check. `TypeOK` in the witness is under `partial` (`tlc-W1-fb78f0.json` line 152) and is not cited as a completed check.
- Status: verified.

### F13. Guarantees and Givens behind this behavior

- Statement: the prose has no Given (`prose.md` lines 1-44), and none is needed, since C1 is a possibility on one path and C2 and C3 hold at every explored snapshot whatever the User sends. K1 is backed by the record `adapter#property:held-equals-supply` (`prose.md` line 39). The record's statement, "credit held by the adapter equals the token supply" (`invariants.md` line 8), is K1's sentence word for word. It is a recorded invariant with a check hint and a reference, not a rule or a proof, and this review did not follow that reference. No claim of this behavior relies on K1. The basis binds it because every answer's snapshot carries its backing hash (for example `tlc-W1-fb78f0.json` lines 200-206), so a change to the record would lapse the model-side mark C1 rests on.
- Status: verified.

### F14. An unexplained initial-state count in the W1 witness

- Statement: `tlc-W1-fb78f0` records `init` as 2 accepted and 2 generated (`tlc-W1-fb78f0.json` lines 148-151), but `Init` fixes every variable (`Adapter.tla` lines 40-52) and so admits one state. The runner parses this from TLC's coverage output. Its cause was not established. No outcome depends on it, and S1's model-side cover needs only a count above zero.
- Status: not verified. Missing: the trial's bundle, or the checker's output, to see what TLC reported.

### F15. Which side decides a walk once an external answer covers it

- Statement: MARK-DECIDING in the evidence contract says the chart side of a passage and an external runner's word on it have one strength, and that the latest answer covering the passage decides. `external-W1-W2-98c5aa` (established 14:31:24) is later than `chart-64fcc7` (14:31:19), yet verify treats the external answer as grounding W1 and names the chart answer as deciding. The contract's Covers section says an external answer grounds a walk, which supports verify's reading. The two rules read differently. Both answers pass W1, so no conclusion here depends on which reading holds.
- Status: not verified. The interpretation is for the plugin's maintainers, and nothing in this dossier is wrong.

## Coverage

Examined:

- `behavior:convert-credit:claims`: F7, with F3 on C1's wording.
- `behavior:convert-credit:scope`: F7 and F10.
- `behavior:convert-credit:mappings`: the assessments above, with F3, F5 and F6.
- `behavior:convert-credit:explanation`: F1, F2 and F6.
- `formal:1`: F12 and the recheck above.
- `formal:2`: F5, with F15.
- `formal:6`: F13.
- `formal:7`: F13.
- `formal:13`: F8.
- `formal:14`: F12.
- `formal:16`: F10.
- `formal:17`: F11.
- `formal:18`: F9.
- `formal:19`: F4.

Unexamined, with the reasons the record gives: `formal:3`, `formal:4`, `formal:5`, `formal:8`, `formal:9`, `formal:10`, `formal:11`, `formal:12`, `formal:15` and `formal:20` do not apply to this behavior. It maps no Always, Once, Within or words-only passage, the Adapter has no assumed guarantee and no pins, and closure, wiring, scenarios and accepted risks belong to compositions.

This review of one behavior never clears the dossier review the Adapter owes.
