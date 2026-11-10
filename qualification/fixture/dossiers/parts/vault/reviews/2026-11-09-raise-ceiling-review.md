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
      "path": "parts/vault/evidence/external-W1-W2-W3-1d4587.json",
      "sha256": "7134ae242daa64c8ccedf278f8b269d578b042fed095bed608102b9211232588"
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
      "path": "parts/vault/chart/machine.json",
      "sha256": "c6a3b988aba370e0bc9918b3e201859a758911cbb8aa02fd482bb30c13bfecc1"
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
      "path": "parts/vault/model/Vault_W3.cfg",
      "sha256": "c5c0375eef21f7e9b73710aecada3a0f3e4bdc283573c0346cb0bf2342b9e308"
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
      "path": "parts/timelock/prose.md",
      "sha256": "b912853ee887614675a70aeefd773c1af273a1879625de9307d477754e4afd91"
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
      "formal:2",
      "formal:3",
      "formal:4",
      "formal:5",
      "formal:8",
      "formal:9",
      "formal:14",
      "formal:16",
      "formal:18",
      "formal:19"
    ],
    "unexamined": [
      {
        "item": "formal:1",
        "reason": "Verification and two randomly selected entry audits were completed, but the task prohibits recheck. Checker reproducibility was not examined, so this item is incomplete."
      },
      {
        "item": "formal:6",
        "reason": "Not applicable to this behavior: the Vault abstraction has no Givens, prompt obligations or actor fairness assumptions. Timelock liveness is not asserted here."
      },
      {
        "item": "formal:7",
        "reason": "No backed guarantee concerns this ceiling-change behavior: K4 is assumed, while K1-K3 concern accounting and Adapter credit movement. The required backing file was read for context, but those other guarantees were not assessed."
      },
      {
        "item": "formal:10",
        "reason": "Not applicable to this behavior of a part: it has no composition asset-closure property or membership set to examine."
      },
      {
        "item": "formal:11",
        "reason": "Not applicable to this part-level chart behavior: it asserts no composed transaction or wiring claim. The Timelock seam was compared under formal:18; composition wiring and free sends were not audited."
      },
      {
        "item": "formal:12",
        "reason": "Not applicable to this behavior: its part-level targets have no scenario columns, actor-mode assignments, windows or alternate starts."
      },
      {
        "item": "formal:13",
        "reason": "Partial trace sampling only. W1 and the A1/A2 blunders were retold before their readings, but the mapped W3 entries retain no step trace, W3 has no model witness, and this part has no violated composition cell to retell."
      },
      {
        "item": "formal:15",
        "reason": "Not applicable to this behavior: decisions.log contains passage acceptance and the K4 rejection, with no accepted risk or scenario-cell decision."
      },
      {
        "item": "formal:17",
        "reason": "Entry previous/narrowed/replaced fields and the available Git history were inspected, but no historical model matching the previous Inv_A2 trial digest was available. The full change after that miscall could not be reconstructed; the historical forbidden-move audit remains incomplete."
      },
      {
        "item": "formal:20",
        "reason": "Not applicable to this behavior: the Vault declares no Within, Once or Given whose exercise could be checked."
      }
    ]
  },
  "replaces": [],
  "assessments": [
    {
      "mapping": "raise-ceiling/C1/M1",
      "result": "supported",
      "rationale": "The claim is expressly about the finite chart (parts/vault/behaviors/raise-ceiling.md:9-12). M5 specifies ceiling < 4 and a one-unit increase (parts/vault/prose.md:24); the chart encodes precisely that guard and sole assignment (parts/vault/chart/machine.json:421-456). The current finite-chart answer passes M5 and exclusivity at the declared 0..4/2..4 reach (parts/vault/evidence/chart-64fcc7.json:121-127,193-204,254-260). This supports the claim as scoped, independently of source authorization.",
      "limitations": [
        "Finite chart evidence only; it does not establish source authorization or deployment correspondence.",
        "M5 is not owner-settled; decisions.log:1-2 does not accept it."
      ]
    },
    {
      "mapping": "raise-ceiling/C2/M1",
      "result": "supported",
      "rationale": "C2 is restricted to ceiling four in the chart (parts/vault/behaviors/raise-ceiling.md:36-39). M6 stays Open without a data update (parts/vault/prose.md:25); its chart guard is ceiling = 4 and its assignments are empty (parts/vault/chart/machine.json:458-477). The current answer passes M6 and exclusivity (parts/vault/evidence/chart-64fcc7.json:129-135,193-204), justifying unchanged ceiling within this finite model.",
      "limitations": [
        "Four is a model limit, not a deployed ceiling.",
        "No authored walk exercises M6; its support here is the finite chart check and inspected transition.",
        "M6 is not owner-settled; decisions.log:1-2 does not accept it."
      ]
    },
    {
      "mapping": "raise-ceiling/C3/M1",
      "result": "supported",
      "rationale": "For the declared illustrates relation, W3 is a faithful example of the proposed sequence (parts/vault/behaviors/raise-ceiling.md:63-81; parts/vault/prose.md:38). Its borrow/refusal/change/borrow steps follow M1, R1 and M5 (parts/vault/prose.md:20,24,26); its chart replay passed (parts/vault/evidence/chart-64fcc7.json:185-191). The external answer separately reports the expected endpoint and no problems at stand-in-only reach (parts/vault/evidence/external-W1-W2-W3-1d4587.json:71-89). Supported here validates the illustration, not model reachability or every execution.",
      "limitations": [
        "The current published entries contain no W3 model witness; W3 remains drawn and C3 remains a hypothesis supported only by illustration.",
        "The mapped chart and external entries contain no W3 step trace for independent step-by-step retelling.",
        "The external replay uses a stand-in and establishes no source or deployment correspondence.",
        "W3 is not owner-settled; decisions.log:1-2 does not accept it."
      ]
    }
  ]
}
```

Independent review of **parts/vault / raise-ceiling**, limited to the three claims and their dependencies. Paths below are relative to the declared `dossiers` or `knowledge` basis root. All assessments use the rebuilt entries. The earlier review was not consulted; no assessment is replaced. `review-basis` reported no issues. No trial, recheck, owner decision or mark was produced.

**1. W3 is an illustration with an incomplete model witness, and no walk exercises the maximum — verified.** (`behavior:raise-ceiling:mappings`, `behavior:raise-ceiling:explanation`, `formal:19`.) `parts/vault/prose.md:36-38` contains all three walks: W1 and W2 never change the ceiling; W3 raises it only from 2 to 3. Thus neither the second increase to 4 nor M6's no-op at 4 is walked, although both are possible under `parts/vault/prose.md:24-25`. W3's chart replay passed in `parts/vault/evidence/chart-64fcc7.json:185-191`, trial `2026-11-09-2228-chart-a57cb9`; the stand-in reports its expected endpoint, debt/free/ceiling 3 and issued 0, in `parts/vault/evidence/external-W1-W2-W3-1d4587.json:71-89`, trial `2026-11-09-2229-external-adf0ef`. Neither entry contains W3's step trace. The published inventory (`parts/vault/integrity.json:3-11`) contains no W3 model witness; a configuration alone (`parts/vault/model/Vault_W3.cfg:1-5`) is not an answer. The limitation is correctly disclosed at `parts/vault/behaviors/raise-ceiling.md:78-81,96`. C3/M1 is **supported for illustrates**, while C3 remains a hypothesis about model reachability, not a checked model walk. The missing maximum walk does not negate the separate finite-chart check of M6.

**2. Two descriptions overstate what their evidence establishes — verified.** (`behavior:raise-ceiling:scope`, `behavior:raise-ceiling:explanation`, `formal:2`.) `parts/vault/README.md:24` calls the existing replays “source replays”, but their retained call and reach explicitly identify a stand-in (`parts/vault/evidence/external-W1-W2-W3-1d4587.json:18-31,82-86`); only prose is identified as executed (`:149-158`). The actual reading correctly calls it a stand-in (`parts/vault/evidence/external-W1-W2-W3-1d4587.md:1`). Source execution or source correspondence is not established. Also, E5 unconditionally says an executed plan “raises the ceiling by one” (`parts/vault/prose.md:17`), although M6 makes change a no-op at 4 (`:25`). E5's handled-event check (`parts/vault/evidence/chart-64fcc7.json:81-87`) cannot validate that unconditional description. The behavior itself correctly distinguishes below-maximum and maximum cases (`parts/vault/behaviors/raise-ceiling.md:94`); these wording defects do not contradict its scoped C1 or C2.

**3. Every claim has one judgeable, appropriately scoped statement; all mappings preserve their declared strength — verified.** (All four `behavior:raise-ceiling:*` items.) C1 and C2 are descriptive chart statements, with model scope, empty pins and no actor-fairness assumption (`parts/vault/behaviors/raise-ceiling.md:8-29,35-56`). M5 guards ceiling below 4 and assigns exactly ceiling + 1; M6 guards equality to 4 and assigns nothing (`parts/vault/chart/machine.json:421-477`; `parts/vault/prose.md:24-25`). Their individual chart checks and exclusivity check passed (`parts/vault/evidence/chart-64fcc7.json:121-135,193-204`), so **C1/M1 and C2/M1 are supported**. C3 is one sequence claim, explicitly proposed rather than supplied with a model witness (`parts/vault/behaviors/raise-ceiling.md:62-81`); its illustrative mapping is justified as in finding 1. The prose reconstruction is Open with debt/free/issued/ceiling `(0,0,0,2)`, borrow 2 to `(2,2,0,2)`, borrow 1 refused with no change, change to `(2,2,0,3)`, then borrow 1 to `(3,3,0,3)` (`parts/vault/prose.md:20,24,26,38`). This is a reconstruction from the abstraction, not a recovered solver trace. The explanation that change creates no debt or credit agrees with both chart assignments and `parts/vault/model/Vault.tla:99-116`. Naming Timelock as sender establishes no source authorization. M5, M6 and W3 have no owner acceptance in `parts/vault/decisions.log:1-2`.

**4. K4 remains assumed and rejected; lowering and authorization remain outside these chart claims — verified.** (`formal:8`, `formal:18`.) K4 has no backing (`parts/vault/prose.md:48`); the owner's exact rejection asks that governance lowering be stated (`parts/vault/decisions.log:2`). The model has only increasing and unchanged ceiling transitions (`parts/vault/model/Vault.tla:99-121`). The inspected source instead assigns any authorized `data >= debt`, which can lower the ceiling or increase it by more than one (`modules/vault/source-cache/github/commit-1a2b-9f8e/src/Vault.sol:20,29-32`). That source observation establishes neither the deployed admin set nor unauthorized execution. M5/M6's chart marks and W3's replay do not mathematically rely on K4 being true of a deployment; their snapshots record K4 as assumed, not checked (`parts/vault/evidence/chart-64fcc7.json:315-317`; `parts/vault/evidence/external-W1-W2-W3-1d4587.json:143-145`). If K4 is false, those chart results remain about the abstract interface and cannot establish plan-only source authorization. The behavior explicitly preserves this distinction (`parts/vault/behaviors/raise-ceiling.md:27,96`). No open change-event pair or guard gap is recorded (`parts/vault/chart/machine.json:887-899`; `parts/vault/evidence/chart-64fcc7.json:252-253`). X2 matches Timelock's seam verbatim (`parts/vault/prose.md:42`; `parts/timelock/prose.md:48`), so this seam owes no counterpart. `doubts.md` and `margin.md` are absent. The unresolved owner work relevant here is K4's rejected wording and the unsettled M5/M6/W3 passages, not a new risk acceptance.

**5. Current deployment correspondence of the pinned checkpoint — not verified.** (`formal:9`.) The prose pins the November 1 observation (`parts/vault/prose.md:5`), and both mapped entries retain its digest (`parts/vault/evidence/chart-64fcc7.json:296-298`; `parts/vault/evidence/external-W1-W2-W3-1d4587.json:124-126`). The record identifies an invented checkpoint and balance/ceiling reads (`modules/vault/observations/checkpoint-2026-11-01.json:3-9,10-38`), not implementation identity, admin configuration or a later deployment check. No supplied evidence establishes that this is a current deployed instance implementing the finite abstraction. This is a limit of grounding; none of C1-C3 asserts deployment scope.

**6. Relevant marks have identifiable answers, with thin action coverage kept distinct from semantic proof — verified.** (`formal:2`.) The entries agree with the derived report. The chart checks S1/E1/E5/M1/M5/M6/R1 and the walk, at the recorded finite reach (`parts/vault/evidence/chart-64fcc7.json:41-55,81-95,121-143,185-204,254-260`), established by `2026-11-09-2228-chart-a57cb9` (`:334`). The model-side deciding answers are:

| Relevant passages | Entry, trial and what it establishes |
| --- | --- |
| S1, E1, E5, M1, M5 | `parts/vault/evidence/tlc-W1-a19770.json:50-93,100-140,150-175,252`: `2026-11-09-2228-tlc-80392a`; Init and the named actions fired. M5 fired during exploration but is not in the retained W1 trace. |
| M6 | `parts/vault/evidence/tlc-A1-A2-9b40ec.json:96-102,117-127,204`: `2026-11-09-2228-tlc-d12ab1`; M6 fired during the finite invariant check. |
| A1 | `parts/vault/evidence/apalache-A1-58fbed.json:27-65,140`: `2026-11-09-2228-apalache-22eec8`; base and induction step held. Its caught blunder is `parts/vault/evidence/blunder-A1-6fffaa.json:28-68,224`, trial `2026-11-09-2228-blunder-903d9f`. |
| A2 | `parts/vault/evidence/apalache-A2-48fb4e.json:27-65,140`: `2026-11-09-2228-apalache-6ed955`; strengthened base and induction step held. Its caught blunder is `parts/vault/evidence/blunder-A2-20cffe.json:28-82,238`, trial `2026-11-09-2228-blunder-c28d86`. |

An incorrect chart update/refusal or walk endpoint would fail its respective replay check; a false inductive invariant would fail the base or preservation obligation. In contrast, firing an action once does not prove its assignments match the passage: the matching change assignments were inspected directly (`parts/vault/model/Vault.tla:99-116`). R1 is a conditional refusal, checked by the chart, without a model refusal trial; its complementary borrow guard is visible at `parts/vault/model/Vault.tla:51-58`. X2 is checked by matching counterpart text, without any trial (finding 4). W3 is drawn, not model-checked (finding 1). These distinctions keep the broad E5 wording from being validated merely by its mark.

**7. The properties match the passages and the blunders test substantive faults — verified.** (`formal:4`, `formal:5`.) A1's equality and A2's inequality match `parts/vault/prose.md:32-33` exactly in `parts/vault/model/Vault.tla:136-139`; there are no O/N definitions in this part. `Inv_A2` conjoins TypeOK, A1 and A2 rather than weakening A2. The lost-free mutation omits crediting free (`parts/vault/model/blunders/lostfree.tla:51-57`), and its A1-only configuration (`parts/vault/model/blunders/lostfree_A1.cfg:5`) finds debt 1 versus free + issued 0 after one borrow of 1 (`parts/vault/evidence/blunder-A1-6fffaa.json:39-68`). The no-ceiling mutation removes the borrow guard (`parts/vault/model/blunders/noceiling.tla:51-57`); its A2-only configuration (`parts/vault/model/blunders/noceiling_A2.cfg:5`) retains Init, then borrow 1, then borrow 2, reaching debt/free 3 with ceiling 2 and issued 0 (`parts/vault/evidence/blunder-A2-20cffe.json:39-82`). A1 and the type bounds still hold on that second trace; A2 and the type bounds still hold on the first. A vacuous TRUE property would catch neither. The blunders' older `Inv_A2` helper is not enabled by either configuration. The readings agree with these independently retold traces (`parts/vault/evidence/blunder-A1-6fffaa.md:1`; `parts/vault/evidence/blunder-A2-20cffe.md:1`); the latter is a summary, omitting the intermediate borrow of 1.

**8. Whether the previous miscall was solely a wrong prediction — not verified.** (`formal:14`; partial `formal:17`.) The previous `Inv_A2` step starts with debt 0/free 3/issued 0/ceiling 2, then reaches debt 2/free 5/issued 0/ceiling 2 (`parts/vault/evidence/apalache-A2-48fb4e.json:180-247`, trial `2026-11-09-2228-apalache-b9e763` at `:335`). This is an arbitrary induction state, not Init, and already violates A1; the successor violates TypeOK, not the debt ceiling. Thus `call was wrong` (`:344`) is consistent with predicting that TypeOK and A2 alone were inductive. The current reading names the added A1 lemma (`parts/vault/evidence/apalache-A2-48fb4e.md:1`), and the current proof includes it (`parts/vault/model/Vault.tla:139`). However, the old model digest differs (`parts/vault/evidence/apalache-A2-48fb4e.json:321` versus `:126`), and the available Git history has only the current model bytes. The earlier source cannot be compared clause by clause. No claim is made that every historical guard/property change was legitimate; formal:17 remains unexamined in full.

**9. Actual reach matches the finite abstraction; one proof reading obscures the numerical bound — verified.** (`formal:16`.) The boundary and events bound balances at 4, ceiling at 2..4 and amounts at 2 (`parts/vault/prose.md:7,13-16`). The chart's 31 explored snapshots and finite reach (`parts/vault/evidence/chart-64fcc7.json:251-260`) agree, as does the TLC call/configuration (`parts/vault/evidence/tlc-A1-A2-9b40ec.json:21-34,117-127`; `parts/vault/model/Vault.cfg:1-5`). The external reach is only three fresh stand-in cases (`parts/vault/evidence/external-W1-W2-W3-1d4587.json:82-86`). Inductive reach is unbounded in steps, with the same finite numeric domains (`parts/vault/evidence/apalache-A1-58fbed.json:34-63`; `parts/vault/model/Vault.tla:51-52,63-64,75-76,87-88,125-139`). Consequently the phrase about “amounts unbounded” in `parts/vault/evidence/apalache-A1-58fbed.md:1` is misleading: TypeOK is not the only numerical restriction; each amount is explicitly in 0..2. No inspected entry records a `narrowed` reach. No larger numerical or deployed claim is supported by these answers.

**10. The words-only passages state exclusions, without hiding a temporal guarantee — verified.** (`formal:3`.) T1 promises nothing eventual and T2 excludes collateral/prices (`parts/vault/prose.md:51-52`). The model's variables, actions and Spec contain no collateral/pricing state, fairness or eventual promise (`parts/vault/model/Vault.tla:11-28,42-123`); the compiled abstraction has no Once, Within or Given (`parts/vault/chart/machine.json:638-641`). These words describe the abstraction's limits, not checked source properties.

**11. Partial audits and remaining work — verified as limits.** Formal:1 remains unexamined in full because the task forbids `recheck`. The randomly sampled entries were `blunder-A2-20cffe` and `external-W1-W2-W3-1d4587`: their calls/outcomes, establishing trials, passage/backing snapshots and executed-file hashes agree with the current files and derived report (`parts/vault/evidence/blunder-A2-20cffe.json:18-38,163-249`; `parts/vault/evidence/external-W1-W2-W3-1d4587.json:17-89,91-172`). This is record inspection, not checker reproducibility.

Formal:13 remains unexamined in full. Before opening readings, the W1 witness was retold from `parts/vault/evidence/tlc-W1-a19770.json:50-93`: Init Open/debt 0/free 0, M1 borrow 2 to debt/free 2, M2 repay 1 to debt/free 1; ceiling stays 2 and issued stays 0. This matches `parts/vault/evidence/tlc-W1-a19770.md:1-2` and is a witness, not a violated safety cell. The blunder retellings are in finding 7. No violated composition cell concerns this part, and no W3 step trace or model witness exists to satisfy the full trace sample. The external reading's statement about a reverting refused step (`parts/vault/evidence/external-W1-W2-W3-1d4587.md:1`) has only an aggregate pass and endpoint in the entry, not a transaction-level trace to independently retell.

The remaining unexamined items are formal:6 and formal:20 (no Vault Givens or O/N promises), formal:7 (no backed ceiling-change guarantee; K1-K3 concern other mechanisms), formal:10-12 (no composition closure, wiring or scenarios in this subject), and formal:15 (no risk decision in `parts/vault/decisions.log:1-2`). The historical gap for formal:17 is described in finding 8. The command restriction overrides the procedure's recheck step; no other procedural ambiguity prevented the scoped assessments. A behavior review leaves the dossier's `review owed` flag in place.
