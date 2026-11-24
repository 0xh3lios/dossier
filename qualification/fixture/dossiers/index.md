# Dossiers   rebuilt 2026-11-24T15:10:26Z   dossier 0.3.0
Written by dossier render: parts by compositions, every composition at a glance, and the map.
verify: ok · 6 parts, 3 compositions · dossier 0.3.0 · 0 tripwires

| part | module | tier | control | supply | upkeep |
| --- | --- | --- | --- | --- | --- |
| adapter | adapter | modeled | member | member |  |
| breaker | breaker | modeled | member |  |  |
| oracle | oracle | modeled |  |  | member |
| timelock | timelock | modeled | member |  |  |
| token | token | modeled |  | member |  |
| vault | vault | modeled | member | member |  |

- Adapter: 20 passages · settled 11 · confirmed 11 · unsettled 9 · checked 18 · backed 1 · text 1 · prose@3ae029
- Breaker: 11 passages · settled 6 · confirmed 6 · unsettled 5 · checked 9 · backed 1 · text 1 · prose@02aa1d
- Oracle: 22 passages · unsettled 22 · checked 14 · drawn 2 · backed 1 · doubts open 1 · text 1 · given 4 · prose@e20cbb
- Timelock: 26 passages · settled 16 · confirmed 15 · unsettled 10 · proved 1 · checked 19 · drawn 1 · backed 1 · assumed 1 · text 1 · given 2 · prose@70bff9
- Token: 15 passages · settled 8 · confirmed 8 · unsettled 7 · checked 11 · drawn 1 · backed 1 · text 2 · prose@825926
- Vault: 29 passages · settled 12 · confirmed 12 · unsettled 16 · rejected 1 · proved 2 · checked 19 · drawn 2 · backed 3 · assumed 1 · text 2 · prose@2fb3b4
- Control: 4 properties × 3 scenarios · 9 cells · proved 1 · checked 7 · violated 1 (accepted 1) · prose@6c8765
- Supply: 3 properties × 2 scenarios · 6 cells · proved 3 · checked 3 · prose@720a6e
- Upkeep: 2 properties × 7 scenarios · 8 cells · checked 5 · violated 3 (accepted 3) · prose@7c3f26

Next: Encode on parts/oracle — Oracle: not tried on the model side: M2 M3; Timelock: not tried on the model side: M3; Token: not tried on the model side: W1

## Map

Harbor dossiers: 9 dossiers, 62 claims · supported 47 · contradicted 4 · hypothesis 11 · needs: claims 4, doubts 1, reviews owed 9

- Featured: compositions/control#emergency-halt — A Breaker halt stops exits at once, while a Timelock plan still waits out its delay.
- **Credit and HRD** `credit` · The Vault's credit ledger, and the HRD tokens the Adapter issues against it. · 4 dossiers, 26 claims · supported 19 · hypothesis 7 · needs: reviews owed 4
  - Featured: compositions/supply#match-token-backing — Issued credit, the Adapter's holdings and the HRD supply stay equal as credit moves.
  - **Vault** `vault` · Records debt, free and issued credit, and the ceiling on borrowing. · holds parts/vault · 1 dossier, 8 claims · supported 3 · hypothesis 5 · needs: reviews owed 1
    - Flows: compositions/control, compositions/supply
  - **Conversion** `conversion` · The Adapter exchanges credit for HRD, which the Token mints and burns. · holds parts/adapter, parts/token (mint-and-burn) · 2 dossiers, 10 claims · supported 9 · hypothesis 1 · needs: reviews owed 2
    - Flows: compositions/control, compositions/supply
  - **Token** `token` · Records the total HRD supply, which a transfer leaves unchanged. · holds parts/token · 1 dossier, 5 claims · supported 3 · hypothesis 2 · needs: reviews owed 1
    - Flows: compositions/supply
  - Sited here: compositions/supply
- **Governance** `governance` · Plans that wait out the Timelock's delay, and the emergency halt that does not. · 2 dossiers, 11 claims · supported 8 · hypothesis 3 · needs: reviews owed 2
  - **Timelock** `timelock` · Holds one plan while its delay runs down, then sends its change to the Vault. · holds parts/timelock · 1 dossier, 8 claims · supported 6 · hypothesis 2 · needs: reviews owed 1
    - Flows: compositions/control
  - **Breaker** `breaker` · Relays one emergency halt from Governance to the Adapter. · holds parts/breaker · 1 dossier, 3 claims · supported 2 · hypothesis 1 · needs: reviews owed 1
    - Flows: compositions/control
- **Prices** `prices` · The Oracle's price, and the two keeper lanes that keep it fresh. · 2 dossiers, 15 claims · supported 11 · contradicted 3 · hypothesis 1 · needs: claims 3, doubts 1, reviews owed 2
  - **Oracle** `oracle` · Stores a price and its age; either keeper lane may post a replacement. · holds parts/oracle · 2 dossiers, 15 claims · supported 11 · contradicted 3 · hypothesis 1 · needs: claims 3, doubts 1, reviews owed 2
    - Flows: compositions/upkeep
    - Sited here: compositions/upkeep
- Sited here: compositions/control

```json
{
  "rebuilt": "2026-11-24T15:10:26Z",
  "plugin": "0.3.0",
  "parts": [
    {
      "id": "adapter",
      "module": "adapter",
      "tier": "modeled",
      "summary": {
        "passages": 20,
        "settled": 11,
        "confirmed": 11,
        "unsettled": 9,
        "rejected": 0,
        "proved": 0,
        "checked": 18,
        "drawn": 0,
        "pending": 0,
        "lapsed": 0,
        "miscalled": 0,
        "hollow": 0,
        "held": 0,
        "owed": 0,
        "backed": 1,
        "assumed": 0,
        "unresolved": 0,
        "doubtsOpen": 0,
        "text": 1,
        "given": 0
      },
      "route": {
        "pass": "Review",
        "why": [
          "no current dossier review with complete scoped basis and coverage"
        ],
        "read": "spec/review.md"
      },
      "usedBy": [
        "control",
        "supply"
      ]
    },
    {
      "id": "breaker",
      "module": "breaker",
      "tier": "modeled",
      "summary": {
        "passages": 11,
        "settled": 6,
        "confirmed": 6,
        "unsettled": 5,
        "rejected": 0,
        "proved": 0,
        "checked": 9,
        "drawn": 0,
        "pending": 0,
        "lapsed": 0,
        "miscalled": 0,
        "hollow": 0,
        "held": 0,
        "owed": 0,
        "backed": 1,
        "assumed": 0,
        "unresolved": 0,
        "doubtsOpen": 0,
        "text": 1,
        "given": 0
      },
      "route": {
        "pass": "Review",
        "why": [
          "no current dossier review with complete scoped basis and coverage"
        ],
        "read": "spec/review.md"
      },
      "usedBy": [
        "control"
      ]
    },
    {
      "id": "oracle",
      "module": "oracle",
      "tier": "modeled",
      "summary": {
        "passages": 22,
        "settled": 0,
        "confirmed": 0,
        "unsettled": 22,
        "rejected": 0,
        "proved": 0,
        "checked": 14,
        "drawn": 2,
        "pending": 0,
        "lapsed": 0,
        "miscalled": 0,
        "hollow": 0,
        "held": 0,
        "owed": 0,
        "backed": 1,
        "assumed": 0,
        "unresolved": 0,
        "doubtsOpen": 1,
        "text": 1,
        "given": 4
      },
      "route": {
        "pass": "Encode",
        "why": [
          "not tried on the model side: M2 M3"
        ],
        "read": "spec/models.md"
      },
      "usedBy": [
        "upkeep"
      ]
    },
    {
      "id": "timelock",
      "module": "timelock",
      "tier": "modeled",
      "summary": {
        "passages": 26,
        "settled": 16,
        "confirmed": 15,
        "unsettled": 10,
        "rejected": 0,
        "proved": 1,
        "checked": 19,
        "drawn": 1,
        "pending": 0,
        "lapsed": 0,
        "miscalled": 0,
        "hollow": 0,
        "held": 0,
        "owed": 0,
        "backed": 1,
        "assumed": 1,
        "unresolved": 0,
        "doubtsOpen": 0,
        "text": 1,
        "given": 2
      },
      "route": {
        "pass": "Encode",
        "why": [
          "not tried on the model side: M3"
        ],
        "read": "spec/models.md"
      },
      "usedBy": [
        "control"
      ]
    },
    {
      "id": "token",
      "module": "token",
      "tier": "modeled",
      "summary": {
        "passages": 15,
        "settled": 8,
        "confirmed": 8,
        "unsettled": 7,
        "rejected": 0,
        "proved": 0,
        "checked": 11,
        "drawn": 1,
        "pending": 0,
        "lapsed": 0,
        "miscalled": 0,
        "hollow": 0,
        "held": 0,
        "owed": 0,
        "backed": 1,
        "assumed": 0,
        "unresolved": 0,
        "doubtsOpen": 0,
        "text": 2,
        "given": 0
      },
      "route": {
        "pass": "Encode",
        "why": [
          "not tried on the model side: W1"
        ],
        "read": "spec/models.md"
      },
      "usedBy": [
        "supply"
      ]
    },
    {
      "id": "vault",
      "module": "vault",
      "tier": "modeled",
      "summary": {
        "passages": 29,
        "settled": 12,
        "confirmed": 12,
        "unsettled": 16,
        "rejected": 1,
        "proved": 2,
        "checked": 19,
        "drawn": 2,
        "pending": 0,
        "lapsed": 0,
        "miscalled": 0,
        "hollow": 0,
        "held": 0,
        "owed": 0,
        "backed": 3,
        "assumed": 1,
        "unresolved": 0,
        "doubtsOpen": 0,
        "text": 2,
        "given": 0
      },
      "route": {
        "pass": "Write",
        "why": [
          "rejected: K4"
        ],
        "read": "spec/language.md"
      },
      "usedBy": [
        "control",
        "supply"
      ]
    }
  ],
  "compositions": [
    {
      "id": "control",
      "members": [
        "timelock",
        "vault",
        "breaker",
        "adapter"
      ],
      "summary": {
        "properties": 4,
        "scenarios": 3,
        "cells": 9,
        "proved": 1,
        "checked": 7,
        "implied": 0,
        "violated": 1,
        "accepted": 1,
        "lapsed": 0,
        "pending": 0,
        "miscalled": 0,
        "held": 0,
        "hollow": 0,
        "open": 0,
        "doubtsOpen": 0
      },
      "route": {
        "pass": "Review",
        "why": [
          "no current dossier review with complete scoped basis and coverage"
        ],
        "read": "spec/review.md"
      }
    },
    {
      "id": "supply",
      "members": [
        "vault",
        "adapter",
        "token"
      ],
      "summary": {
        "properties": 3,
        "scenarios": 2,
        "cells": 6,
        "proved": 3,
        "checked": 3,
        "implied": 0,
        "violated": 0,
        "accepted": 0,
        "lapsed": 0,
        "pending": 0,
        "miscalled": 0,
        "held": 0,
        "hollow": 0,
        "open": 0,
        "doubtsOpen": 0
      },
      "route": {
        "pass": "Review",
        "why": [
          "no current dossier review with complete scoped basis and coverage"
        ],
        "read": "spec/review.md"
      }
    },
    {
      "id": "upkeep",
      "members": [
        "oracle"
      ],
      "summary": {
        "properties": 2,
        "scenarios": 7,
        "cells": 8,
        "proved": 0,
        "checked": 5,
        "implied": 0,
        "violated": 3,
        "accepted": 3,
        "lapsed": 0,
        "pending": 0,
        "miscalled": 0,
        "held": 0,
        "hollow": 0,
        "open": 0,
        "doubtsOpen": 0
      },
      "route": {
        "pass": "Review",
        "why": [
          "no current dossier review with complete scoped basis and coverage"
        ],
        "read": "spec/review.md"
      }
    }
  ],
  "route": {
    "pass": "Encode",
    "why": [
      "Oracle: not tried on the model side: M2 M3",
      "Timelock: not tried on the model side: M3",
      "Token: not tried on the model side: W1"
    ],
    "read": "spec/models.md",
    "target": "parts/oracle"
  }
}
```
