# Dossiers   rebuilt 2026-11-09T22:32:13Z   dossier 0.2.0
Written by dossier render: parts by compositions, and every composition at a glance.
verify: ok · 6 parts, 3 compositions · dossier 0.2.0 · 0 tripwires

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

```json
{
  "rebuilt": "2026-11-09T22:32:13Z",
  "plugin": "0.2.0",
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
