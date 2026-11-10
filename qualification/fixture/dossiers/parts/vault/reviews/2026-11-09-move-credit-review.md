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
      "sha256": "4f47c2a9172084d47848d2375edc95ead14f9b3dc221b8a8cf87160e28d65a28"
    },
    {
      "role": "required",
      "root": "dossiers",
      "path": "parts/vault/evidence/chart-64fcc7.json",
      "sha256": "e478e32d36648971e540e3cf320cdae491c41c11ba10d442985a2ad929cba211"
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
      "sha256": "26a1e935a3641c941c391143285e33f8f38f89e4aac33b39cb403687fe6104a5"
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
      "path": "parts/vault/README.md",
      "sha256": "9179c7846523fd14a4f3d403c6a9a950193913ae7ce377f2385609f9bde7f00d"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/adapter/prose.md",
      "sha256": "58d831b706099361e3b3fa6855a8b79b5d0c0fc8227521e7582ac34ad48c73fb"
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
      "path": "parts/vault/model/Vault.cfg",
      "sha256": "2cee7df8386bc04a477d009071ad7bd1e307eb6bee52c4e585b605d0b5751f55"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/vault/model/Vault_W1.cfg",
      "sha256": "4a90c9befd026d9a86f572a1a8d1254753519b9e86f34b0274563eecb3f3f249"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/vault/model/blunders/lostfree.tla",
      "sha256": "2ac6694d232aa1109d792cd73841ff5d9bccb17cca5a13e9acc4c2e7011731ef"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/vault/model/blunders/lostfree_A1.cfg",
      "sha256": "dd72eab7f7e31820881501ef896686222ccd6a43c353761d827971cb790d8e73"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/vault/model/blunders/noceiling.tla",
      "sha256": "b60c04b9e39610cfe2c22f1b698f4461c10283ac7143288a97e9f18e1d034394"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/vault/model/blunders/noceiling_A2.cfg",
      "sha256": "425dd16cb05a537c6372d19fc869db88ec88a782547adc7708ad256da628d17c"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/vault/evidence/apalache-A1-58fbed.json",
      "sha256": "5029579a7f769c3b237aaea97f1717ddefd978766b503a6d8f3aafb6536bf0ea"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/vault/evidence/apalache-A1-58fbed.md",
      "sha256": "0fcc092c37e354d1a16c7a1cf04fd96a460662d8d322d7bf6ba03050c2a40f30"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/vault/evidence/apalache-A2-48fb4e.json",
      "sha256": "1626d276a9992fd506247bbbed43de882fbb249e0e20344091dfac220f80a853"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/vault/evidence/apalache-A2-48fb4e.md",
      "sha256": "4048db275acee79e90ccc810e46c7f611fe5c55a674173cc4c86f79680a4e084"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/vault/evidence/blunder-A1-6fffaa.json",
      "sha256": "ee3f335c9dad3493987f3b24f2a64114bb72c82df47e0b95917dff40be443cc4"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/vault/evidence/blunder-A1-6fffaa.md",
      "sha256": "27bf8247974fe7ac10c07f2873f0953dc2f9eba971a58a1d791db158a2603fea"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/vault/evidence/blunder-A2-20cffe.json",
      "sha256": "496afa34e18575f340bd072598a463e426d0473e0e9cff03de8cf386126bc7e9"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/vault/evidence/blunder-A2-20cffe.md",
      "sha256": "619173a3519d0d9c47e570b04c74f4eef8260817570d22460893388ea2bfaa79"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/vault/evidence/tlc-A1-A2-9b40ec.json",
      "sha256": "0575a04a0beffd1ba2a1ee6c82a3f7aafc04f0eea6e4bb5d5a2381ecb45dd601"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/vault/evidence/tlc-A1-A2-9b40ec.md",
      "sha256": "2d0e86a4da9d7161e3de6186fc59440d41aa12a4f5b60184c9fdfbd8f75fe69d"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/vault/evidence/tlc-W1-a19770.json",
      "sha256": "9a08398536468a0e161462f63145c8a8bdaf93c84d9b28dfb33e9343a3da7f04"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/vault/evidence/tlc-W1-a19770.md",
      "sha256": "d4976a00a2d9a0c1f48a090b332675c0fecb776e85766a6f4635999666f8d4ea"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/vault/evidence/external-W1-W2-W3-1d4587.json",
      "sha256": "7134ae242daa64c8ccedf278f8b269d578b042fed095bed608102b9211232588"
    },
    {
      "role": "additional",
      "root": "dossiers",
      "path": "parts/vault/evidence/external-W1-W2-W3-1d4587.md",
      "sha256": "8d123a0d1c9accc035bfd54d1f60c794c4e7413eecc0d10b7f3f9d0c9c276bdf"
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
      "formal:3",
      "formal:4",
      "formal:5",
      "formal:7",
      "formal:9",
      "formal:14",
      "formal:16",
      "formal:18",
      "formal:19"
    ],
    "unexamined": [
      {
        "item": "formal:6",
        "reason": "No Given appears in this part or these claims; actor fairness, prompt and only-when obligations do not apply to this finite-chart transfer behavior."
      },
      {
        "item": "formal:8",
        "reason": "The only assumed guarantee, K4, concerns the source of ceiling raises. C1/C2 assert local transfer arithmetic and do not rely on that governance guarantee; its consequences for other behaviors were not examined."
      },
      {
        "item": "formal:10",
        "reason": "Composition asset closure does not apply to this part-level chart behavior. The linked Supply composition was not reviewed."
      },
      {
        "item": "formal:11",
        "reason": "Composition wiring and free sends do not apply to these local chart targets. Only the matching Adapter seam text was examined; transaction wiring in Supply was not."
      },
      {
        "item": "formal:12",
        "reason": "This part behavior has no scenario columns, modes, windows or custom starts. Supply scenarios are outside the review."
      },
      {
        "item": "formal:13",
        "reason": "The complete witness/violated-cell/blunder sampling was not performed for this behavior: no Vault move/release walk exists, and this part has no violated scenario cell. W1 and the two property blunders were retold as supporting context only."
      },
      {
        "item": "formal:15",
        "reason": "No risk acceptance appears in this part’s decisions.log; the passage acceptances are not accepted violations. Composition risk decisions do not concern these mappings."
      },
      {
        "item": "formal:17",
        "reason": "Current entries’ previous and narrowed fields and a limited version-control listing were inspected, but the complete authored history and old executed model were not audited. No conclusion about all historical guard, property, Given, scope or identifier changes is made."
      },
      {
        "item": "formal:20",
        "reason": "There is no Once, Within or Given in this part; an unexercised temporal premise does not apply to these transfer claims."
      }
    ]
  },
  "replaces": [],
  "assessments": [
    {
      "mapping": "move-credit/C1/M1",
      "result": "supported",
      "rationale": "C1 is explicitly about accepted moves in the finite chart (parts/vault/behaviors/move-credit.md:9–27). M3 transfers exactly amount from free to issued under amount <= free (parts/vault/prose.md:22). Its exact chart check passed in the current entry, trial 2026-11-09-2228-chart-a57cb9 (parts/vault/evidence/chart-64fcc7.json:105–111, :254–261, :334). That finite-chart result supports the stated local arithmetic at the declared ranges, without asserting a remote mint.",
      "limitations": [
        "Finite chart over reachable states with balances 0..4 and requested amounts 0..2; no source, deployment, transaction-wiring or token-mint guarantee.",
        "No named Vault walk exercises move or its refusal; no execution was repeated during this review."
      ]
    },
    {
      "mapping": "move-credit/C2/M1",
      "result": "supported",
      "rationale": "C2 is explicitly about accepted releases in the finite chart (parts/vault/behaviors/move-credit.md:36–54). M4 transfers exactly amount from issued to free under amount <= issued (parts/vault/prose.md:23). Its exact chart check passed in the current entry, trial 2026-11-09-2228-chart-a57cb9 (parts/vault/evidence/chart-64fcc7.json:113–119, :254–261, :334). That finite-chart result supports the stated local arithmetic at the declared ranges, without asserting a token burn.",
      "limitations": [
        "Finite chart over reachable states with balances 0..4 and requested amounts 0..2; no source, deployment, transaction-wiring or token-burn guarantee.",
        "No named Vault walk exercises release or its refusal; no execution was repeated during this review."
      ]
    }
  ]
}
```

This is a focused review of `parts/vault`, behavior `move-credit`, against the current files. Both mappings are **supported** at finite-chart strength. The earlier review was not consulted. Paths below are relative to the basis root named in the JSON; `parts/` and `actors/` use `dossiers`, and `modules/` uses `knowledge`.

1. **verified — The A1 reading overstates the amount reach (`formal:16`).** `parts/vault/evidence/apalache-A1-58fbed.md:1` says “amounts unbounded above.” The executed model explicitly quantifies move and release amounts over `0..2` (`parts/vault/model/Vault.tla:76`, `:88`), and keeps debt, free and issued in `0..4` (`:125`). The inductive answer removes a step bound, not these numeric ranges (`parts/vault/evidence/apalache-A1-58fbed.json:34`, `:58`; trial `2026-11-09-2228-apalache-22eec8`). This is a defect in the supporting reading, not a contradiction of either chart-scoped claim. The mapped chart's recorded reach and 31 explored snapshots agree with the boundary (`parts/vault/evidence/chart-64fcc7.json:254`; `parts/vault/prose.md:7`, `:15`); the ordinary TLC reach agrees too (`parts/vault/evidence/tlc-A1-A2-9b40ec.json:117`). No inspected entry records a narrowed reach.

2. **verified — The behavior explanation omits its refusal conditions (`behavior:move-credit:explanation`).** The body describes the two directions of transfer and the separation from token effects, but does not explain when a request is refused (`parts/vault/behaviors/move-credit.md:67`, `:69`). Its mapping rationales name guards without stating their inequalities (`:25`, `:52`). The actual conditions are `amount <= free` for move and `amount <= issued` for release, with the complementary refusals R3/R4 (`parts/vault/prose.md:22`, `:23`, `:28`, `:29`). Thus the qualified claims about “accepted” requests are sound, but a reader needs the formal prose to understand acceptance. The body's statement that neither action changes debt agrees with the encoding (`parts/vault/model/Vault.tla:82`, `:94`). Its Supply link is a handoff, not evidence assessed by this review.

3. **verified — No Vault walk exercises this behavior (`formal:19`).** W1–W3 contain borrow, repay and change only; they omit M3/M4, R3/R4 and final states with redistributed credit (`parts/vault/prose.md:36`–`:38`). Before reading the keeper's reading, I retold the W1 entry as Open `(debt,free,issued,ceiling)=(0,0,0,2)` —M1_Borrow 2→ `(2,2,0,2)` —M2_Repay 1→ `(1,1,0,2)`, still Open (`parts/vault/evidence/tlc-W1-a19770.json:50`; trial `2026-11-09-2228-tlc-80392a`). That agrees with `parts/vault/evidence/tlc-W1-a19770.md:1`, but supplies no move/release path. The external entry covers the same three walks, on a stand-in, and adds none (`parts/vault/evidence/external-W1-W2-W3-1d4587.json:18`, `:45`; its reading `:1` in the paired `.md`). This is a walk-coverage gap, not an absence of chart checks for M3/M4 or R3/R4.

4. **verified — Both claims and mappings fit their declared scope (`behavior:move-credit:claims`, `behavior:move-credit:scope`, `behavior:move-credit:mappings`).** C1 and C2 each describe one transfer, explicitly in the finite chart with balances `0..4` and amounts `0..2`, without source/deployment pins or fairness assumptions (`parts/vault/behaviors/move-credit.md:8`–`:29`, `:35`–`:56`). “Accepted” restricts them to M3/M4's guards; amount zero has zero deltas. E3/E4 identify the Adapter as the sender (`parts/vault/prose.md:15`–`:16`; `actors/actors.md:3` distinguishes parts from actors). M3 and M4 specify exactly the claimed equal-and-opposite updates (`parts/vault/prose.md:22`–`:23`). Their exact chart checks passed (`parts/vault/evidence/chart-64fcc7.json:105`–`:119`), as did exclusivity (`:193`–`:204`), in trial `2026-11-09-2228-chart-a57cb9`. Therefore `move-credit/C1/M1` and `move-credit/C2/M1` are each supported. The chart reading preserves this finite, local scope (`parts/vault/evidence/chart-64fcc7.md:3`–`:7`). The owner's accept of M3/M4 (`parts/vault/decisions.log:1`) is separate from evidence and does not establish deployment correspondence.

5. **verified — The sampled records agree with verification; execution was not repeated (`formal:1`).** Initial `verify --brief parts/vault` reported `verify: ok` and zero tripwires; `review-basis` reported no issues. A random sample without replacement selected `chart-64fcc7.json` and `apalache-A2-48fb4e.json`. I reread their calls, answers and bases: chart checks pass at the recorded finite reach (`parts/vault/evidence/chart-64fcc7.json:16`, `:29`, `:254`), and both inductive invocations return NoError for Inv_A2 (`parts/vault/evidence/apalache-A2-48fb4e.json:18`, `:31`–`:65`). `verify --json` resolves the same trials, outcomes, current freshness and reaches for M3/M4 and A2. The executed prose/model SHA-256 values match the files read (`parts/vault/evidence/chart-64fcc7.json:321`; `parts/vault/evidence/apalache-A2-48fb4e.json:125`), and the manifest binds these entries (`parts/vault/integrity.json:4`–`:5`). The sampled trial IDs are `2026-11-09-2228-chart-a57cb9` and `2026-11-09-2228-apalache-6ed955`. Recheck was not run: the task expressly prohibits it. This finding verifies record consistency, not repeatability or checker soundness.

6. **verified — Relevant marks have the recorded bases, with thin coverage kept distinct (`formal:2`).** For S1, E3/E4 and M3/M4, the deciding chart entry is `chart-64fcc7`, trial `2026-11-09-2228-chart-a57cb9` (`parts/vault/evidence/chart-64fcc7.json:41`, `:65`–`:79`, `:105`–`:119`, `:334`). The deciding model entry is `tlc-W1-a19770`, trial `2026-11-09-2228-tlc-80392a`: Init accepted states and both transfer actions generated successors (`parts/vault/evidence/tlc-W1-a19770.json:117`–`:152`, `:252`). Model coverage here means an action fired, not that its updates were independently proved faithful; it can remain covered with a wrong update. Chart failure to reach Open or to handle/update the named event as said would instead fail its corresponding check. R3/R4 are conditional refusals, checked by the chart alone (`parts/vault/evidence/chart-64fcc7.json:153`–`:167`); the model guards exclude those requests, and no refusal action or separate model answer is required. X1 is checked by identical seam text, not by a trial (`parts/vault/prose.md:41`; `parts/adapter/prose.md:34`).

   A1 is decided by `apalache-A1-58fbed`, trial `2026-11-09-2228-apalache-22eec8`, and A2 by `apalache-A2-48fb4e`, trial `2026-11-09-2228-apalache-6ed955`; each records successful base and step checks (`parts/vault/evidence/apalache-A1-58fbed.json:31`–`:64`, `:140`; `parts/vault/evidence/apalache-A2-48fb4e.json:31`–`:64`, `:140`). A reachable failure of either conjunction would defeat its base or preservation obligation. Their proved marks also require the caught blunders described below. These proofs are contextual; neither replaces the chart targets in C1/C2.

7. **verified — The state properties match the prose (`formal:4`).** A1 is exactly `debt = free + issued`, and A2 exactly `debt <= ceiling` (`parts/vault/prose.md:32`–`:33`; `parts/vault/model/Vault.tla:136`–`:137`). Inv_A1 conjoins TypeOK; Inv_A2 additionally conjoins A1 as a lemma (`:138`–`:139`). The move/release actions subtract and add the same amount while preserving debt and ceiling (`:75`–`:94`), so their relationship to both properties is explicit. The normal TLC configuration enables TypeOK, A1 and A2 (`parts/vault/model/Vault.cfg:1`–`:5`), and its answer reports all hold (`parts/vault/evidence/tlc-A1-A2-9b40ec.json:37`–`:45`); its reading correctly limits that result (`parts/vault/evidence/tlc-A1-A2-9b40ec.md:3`–`:7`). There are no O/N definitions in this part. No composition translation was examined.

8. **verified — The two blunders discriminate real faults (`formal:5`).** `lostfree` deliberately omits the free increment on borrow (`parts/vault/model/blunders/lostfree.tla:51`–`:57`); its configuration checks A1 alone (`parts/vault/model/blunders/lostfree_A1.cfg:5`). Retold before reading the interpretation: Open `(0,0,0,2)` —M1_Borrow 1→ `(1,0,0,2)` breaks A1 while A2 and the ranges remain true (`parts/vault/evidence/blunder-A1-6fffaa.json:32`–`:68`; trial `2026-11-09-2228-blunder-903d9f`, `:224`). `noceiling` removes the borrow ceiling guard (`parts/vault/model/blunders/noceiling.tla:51`–`:57`), and its configuration checks A2 alone (`parts/vault/model/blunders/noceiling_A2.cfg:5`). Its trace is Open `(0,0,0,2)` —M1_Borrow 1→ `(1,1,0,2)` —M1_Borrow 2→ `(3,3,0,2)`, breaking A2 while A1 and the ranges remain true (`parts/vault/evidence/blunder-A2-20cffe.json:32`–`:82`; trial `2026-11-09-2228-blunder-c28d86`, `:238`). A tautology would catch neither. Both paired readings correctly identify their deliberate fault (`parts/vault/evidence/blunder-A1-6fffaa.md:1`; `parts/vault/evidence/blunder-A2-20cffe.md:1`). Neither blunder specifically mutates move or release, so they do not independently test those transfer implementations.

9. **verified — Words-only passages describe scope, not hidden promises (`formal:3`).** T1 explicitly makes no eventual promise, and T2 excludes collateral and prices (`parts/vault/prose.md:51`–`:52`). The collection repeats the abstraction's exclusions and finite ranges (`parts/vault/README.md:22`), and the model defines no O/N property (`parts/vault/model/Vault.tla:123`–`:145`). I found no concealed transfer guarantee or liveness assertion in these text-marked passages.

10. **verified — Backing text has narrower authority than a deployment result (`formal:7`, `formal:9`).** The K1 equation matches `debtEqualsCredit`, whose move/release preservation clauses explicitly require the Adapter caller (`parts/vault/prose.md:45`; `modules/vault/source-cache/github/commit-1a2b-9f8e/certora/Vault.spec:24`–`:33`). K3's named rule filters move/release selectors and asserts the Adapter caller (`parts/vault/prose.md:47`; the same `Vault.spec:67`–`:74`). That rule states authorization, not the exact amount deltas of C1/C2. Resolving these rule texts is not a Certora execution result or general source correspondence. The part's pin names the inspected observation (`parts/vault/prose.md:5`); it records a block/hash, date and the debt/free/issued/ceiling quantities of this ledger (`modules/vault/observations/checkpoint-2026-11-01.json:3`–`:9`, `:12`–`:37`). The model deliberately abstracts those quantities to small ranges and omits holders (`parts/vault/prose.md:7`). K2 concerns borrowing and was not assessed as a transfer guarantee.

    **not verified — Current deployment correspondence.** The inspected observation and specification do not establish that the recorded checkpoint is still a deployed instance's current state, that the model is a faithful translation of deployed bytecode, or that the named rules were proved against that bytecode. Those results were not supplied by the mapped chart answer or established by this review. C1/C2 make model claims, so these missing deployment assurances do not invalidate their scoped mappings.

11. **verified — The retained A2 miscall demonstrates a gap in the induction hypothesis (`formal:14`).** The previous answer is a miscalled induction step, trial `2026-11-09-2228-apalache-b9e763`, classified `call was wrong` (`parts/vault/evidence/apalache-A2-48fb4e.json:149`–`:178`, `:248`–`:259`, `:334`–`:344`). Before reading the current interpretation, I read its trace: `(debt,free,issued,ceiling)=(0,3,0,2)` becomes `(2,5,0,2)`, consistent with borrowing 2 (`:191`–`:245`). A2 holds at both ends; the free range fails. The starting state already violates the prose's A1, so this is not a demonstrated reachable A2 violation. The old reach states TypeOK plus A2; the current Inv_A2 adds A1 and the current reading says exactly that (`parts/vault/model/Vault.tla:139`; `parts/vault/evidence/apalache-A2-48fb4e.md:1`). The classification is consistent with an overoptimistic prediction of induction, without establishing that every historical model edit was sound. All current entries inspected are as-called; no current miscall classification is owed.

12. **verified — No local unsaid pair, chart gap or owed Adapter seam was found; owner settlement remains separate (`formal:18`).** The chart reports no gaps or failing checks (`parts/vault/evidence/chart-64fcc7.json:251`–`:253`). The relevant guards and refusals are complementary (`parts/vault/prose.md:22`–`:29`), and X1 agrees with the Adapter seam (`parts/vault/prose.md:41`; `parts/adapter/prose.md:34`). No `doubts.md` or `margin.md` is present. The decision file accepts S1/E3/E4/M3/M4 and A1/A2 but leaves R3/R4, X1, K1/K3 and T1/T2 unsettled (`parts/vault/decisions.log:1`–`:2`). It separately rejects K4, the ceiling guarantee, which is outside these transfer claims (`parts/vault/prose.md:48`). The repository still owes its whole-dossier review. This focused review neither settles those passages nor inspects Supply's closure.

The unexamined items and reasons are recorded in the JSON. In particular, the witness and blunder retellings above do not complete `formal:13`: there is no move/release witness or relevant violated composition cell in this subject. For `formal:17`, current `previous`/`narrowed` fields were inspected, and a read-only history query found only one commit for the selected authored paths; a complete historical audit, including recovery of the old executed model, was not performed. No claim that forbidden historical changes never occurred is made.

The procedure calls for `recheck`, but the task's explicit command restriction forbids it; no recheck was run. No other contract ambiguity blocked the review. No new trial, owner decision, mark, ledger, source change or earlier-review edit was made. The nine required basis entries are preserved unchanged; additional entries bind the other inspected semantic files. No ledger, index, tool binary or local trial bundle is used as a basis file.
