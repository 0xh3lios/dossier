# Ledger: Upkeep   rebuilt 2026-11-08T23:40:32Z   prose@7c3f26   answers 10   decisions 4
Written by dossier render from the records. The JSON block at the end says the same for tools.
verify: ok · Upkeep · dossier 0.1.1 · 0 tripwires

| member | role | module | pins |
| --- | --- | --- | --- |
| oracle | member | oracle |  |

| property | owner | all-honest | lane-a-captured | lane-a-offline | lanes-offline | lanes-down-one | lanes-down-two | stale-start |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A1 · Always, {oracle.price + 1 >= oracle.last and oracle.last + 1 >= oracle.price}, given G3 and G4. | unsettled | checked ([tlc-6c552b](evidence/tlc-A1-all-honest-0a17a1.json)) | violated, accepted ([tlc-e72613](evidence/tlc-A1-lane-a-captured-5b4a2c.json)) |  |  |  |  |  |
| N1 · Within 1 tick of oracle.Stale, oracle.Fresh, given G1 and G2. | unsettled | checked ([tlc-90042f](evidence/tlc-N1-all-honest-fdfe6f.json)) |  | checked ([tlc-79faf2](evidence/tlc-N1-lane-a-offline-03c322.json)) | violated, accepted ([apalache-8258c3](evidence/apalache-N1-lanes-offline-717d7a.json)) | checked ([tlc-bea6ca](evidence/tlc-N1-lanes-down-one-ab7493.json)) | violated, accepted ([tlc-39418f](evidence/tlc-N1-lanes-down-two-2770b9.json)) | checked ([tlc-ed4e21](evidence/tlc-N1-stale-start-26ce5c.json)) |

- A1 × all-honest: checked, reach stale up to 3; price and last up to 4; clock up to 2; effects up to 4, [2026-11-08-2340-tlc-6c552b](evidence/tlc-A1-all-honest-0a17a1.json), members oracle@b7da5a
- A1 × lane-a-captured: violated, reach stale up to 3; price and last up to 4; clock up to 2; effects up to 4, [2026-11-08-2340-tlc-e72613](evidence/tlc-A1-lane-a-captured-5b4a2c.json), members oracle@b7da5a
- N1 × all-honest: checked, reach stale up to 3; price and last up to 4; clock up to 2; effects up to 4, [2026-11-08-2340-tlc-90042f](evidence/tlc-N1-all-honest-fdfe6f.json), members oracle@b7da5a
- N1 × lane-a-offline: checked, reach stale up to 3; price and last up to 4; clock up to 2; effects up to 4, [2026-11-08-2340-tlc-79faf2](evidence/tlc-N1-lane-a-offline-03c322.json), members oracle@b7da5a
- N1 × lanes-offline: violated, reach 4 steps, [2026-11-08-2340-apalache-8258c3](evidence/apalache-N1-lanes-offline-717d7a.json), members oracle@b7da5a
- N1 × lanes-down-one: checked, reach stale up to 3; price and last up to 4; clock up to 2; effects up to 4, [2026-11-08-2340-tlc-bea6ca](evidence/tlc-N1-lanes-down-one-ab7493.json), members oracle@b7da5a
- N1 × lanes-down-two: violated, reach stale up to 3; price and last up to 4; clock up to 2; effects up to 4, [2026-11-08-2340-tlc-39418f](evidence/tlc-N1-lanes-down-two-2770b9.json), members oracle@b7da5a
- N1 × stale-start: checked, reach stale up to 3; price and last up to 4; clock up to 2; effects up to 4, [2026-11-08-2340-tlc-ed4e21](evidence/tlc-N1-stale-start-26ce5c.json), members oracle@b7da5a

Summary: 2 properties × 7 scenarios · 8 cells · checked 5 · violated 3 (accepted 3) · prose@7c3f26
Flags: review owed (no review at prose@7c3f26)
Next: Review — no review at prose@7c3f26
Since last rebuild: first rebuild

```json
{
  "kind": "composition",
  "id": "upkeep",
  "title": "Upkeep",
  "concern": "upkeep",
  "rebuilt": "2026-11-08T23:40:32Z",
  "plugin": "0.1.1",
  "summary": {"properties":2,"scenarios":7,"cells":8,"proved":0,"checked":5,"implied":0,"violated":3,"accepted":3,"lapsed":0,"pending":0,"miscalled":0,"held":0,"hollow":0,"open":0,"doubtsOpen":0},
  "members": [{"part":"oracle","role":"member","pins":[]}],
  "wiring": [],
  "free": [],
  "outside": [],
  "closureMissing": [],
  "cells": [
    {"property":"A1","scenario":"all-honest","mark":"checked","trial":"2026-11-08-2340-tlc-6c552b","entry":"tlc-A1-all-honest-0a17a1","reach":"stale up to 3; price and last up to 4; clock up to 2; effects up to 4","lapsed":[],"accepted":false,"acceptanceLapsed":[],"open":false,"impliedBy":null,"held":"caught"},
    {"property":"A1","scenario":"lane-a-captured","mark":"violated","trial":"2026-11-08-2340-tlc-e72613","entry":"tlc-A1-lane-a-captured-5b4a2c","reach":"stale up to 3; price and last up to 4; clock up to 2; effects up to 4","lapsed":[],"accepted":true,"acceptanceLapsed":[],"open":false,"impliedBy":null,"held":"caught"},
    {"property":"N1","scenario":"all-honest","mark":"checked","trial":"2026-11-08-2340-tlc-90042f","entry":"tlc-N1-all-honest-fdfe6f","reach":"stale up to 3; price and last up to 4; clock up to 2; effects up to 4","lapsed":[],"accepted":false,"acceptanceLapsed":[],"open":false,"impliedBy":null,"held":"caught"},
    {"property":"N1","scenario":"lane-a-offline","mark":"checked","trial":"2026-11-08-2340-tlc-79faf2","entry":"tlc-N1-lane-a-offline-03c322","reach":"stale up to 3; price and last up to 4; clock up to 2; effects up to 4","lapsed":[],"accepted":false,"acceptanceLapsed":[],"open":false,"impliedBy":null,"held":"caught"},
    {"property":"N1","scenario":"lanes-offline","mark":"violated","trial":"2026-11-08-2340-apalache-8258c3","entry":"apalache-N1-lanes-offline-717d7a","reach":"4 steps","lapsed":[],"accepted":true,"acceptanceLapsed":[],"open":false,"impliedBy":null,"held":"caught"},
    {"property":"N1","scenario":"lanes-down-one","mark":"checked","trial":"2026-11-08-2340-tlc-bea6ca","entry":"tlc-N1-lanes-down-one-ab7493","reach":"stale up to 3; price and last up to 4; clock up to 2; effects up to 4","lapsed":[],"accepted":false,"acceptanceLapsed":[],"open":false,"impliedBy":null,"held":"caught"},
    {"property":"N1","scenario":"lanes-down-two","mark":"violated","trial":"2026-11-08-2340-tlc-39418f","entry":"tlc-N1-lanes-down-two-2770b9","reach":"stale up to 3; price and last up to 4; clock up to 2; effects up to 4","lapsed":[],"accepted":true,"acceptanceLapsed":[],"open":false,"impliedBy":null,"held":"caught"},
    {"property":"N1","scenario":"stale-start","mark":"checked","trial":"2026-11-08-2340-tlc-ed4e21","entry":"tlc-N1-stale-start-26ce5c","reach":"stale up to 3; price and last up to 4; clock up to 2; effects up to 4","lapsed":[],"accepted":false,"acceptanceLapsed":[],"open":false,"impliedBy":null,"held":"caught"}
  ],
  "walks": [],
  "owner": {"A1":"unsettled","N1":"unsettled","G1":"unsettled","G2":"unsettled","G3":"unsettled","G4":"unsettled","T1":"unsettled"},
  "propertyHeld": {"A1":"caught","N1":"caught"},
  "answers": [
    {"entry":"tlc-N1-all-honest-fdfe6f","trial":"2026-11-08-2340-tlc-90042f","at":"2026-11-08T23:40:12.521Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":"N1","scenario":"all-honest","problems":[],"classification":null,"prose":"7c3f26"},
    {"entry":"tlc-N1-lane-a-offline-03c322","trial":"2026-11-08-2340-tlc-79faf2","at":"2026-11-08T23:40:13.788Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":"N1","scenario":"lane-a-offline","problems":[],"classification":null,"prose":"7c3f26"},
    {"entry":"apalache-N1-lanes-offline-717d7a","trial":"2026-11-08-2340-apalache-8258c3","at":"2026-11-08T23:40:16.444Z","kind":"apalache","checker":"apalache","completed":true,"void":false,"result":"as-called","property":"N1","scenario":"lanes-offline","problems":[],"classification":null,"prose":"7c3f26"},
    {"entry":"tlc-N1-lanes-down-one-ab7493","trial":"2026-11-08-2340-tlc-bea6ca","at":"2026-11-08T23:40:20.110Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":"N1","scenario":"lanes-down-one","problems":[],"classification":null,"prose":"7c3f26"},
    {"entry":"tlc-N1-lanes-down-two-2770b9","trial":"2026-11-08-2340-tlc-39418f","at":"2026-11-08T23:40:21.361Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":"N1","scenario":"lanes-down-two","problems":[],"classification":null,"prose":"7c3f26"},
    {"entry":"tlc-N1-stale-start-26ce5c","trial":"2026-11-08-2340-tlc-ed4e21","at":"2026-11-08T23:40:22.561Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":"N1","scenario":"stale-start","problems":[],"classification":null,"prose":"7c3f26"},
    {"entry":"tlc-A1-all-honest-0a17a1","trial":"2026-11-08-2340-tlc-6c552b","at":"2026-11-08T23:40:23.816Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":"A1","scenario":"all-honest","problems":[],"classification":null,"prose":"7c3f26"},
    {"entry":"tlc-A1-lane-a-captured-5b4a2c","trial":"2026-11-08-2340-tlc-e72613","at":"2026-11-08T23:40:25.045Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":"A1","scenario":"lane-a-captured","problems":[],"classification":null,"prose":"7c3f26"},
    {"entry":"blunder-N1-all-honest-392ed8","trial":"2026-11-08-2340-blunder-475e68","at":"2026-11-08T23:40:26.294Z","kind":"blunder","checker":"tlc","completed":true,"void":false,"result":"as-called","property":"N1","scenario":"all-honest","problems":[],"classification":null,"prose":"7c3f26"},
    {"entry":"blunder-A1-all-honest-64f26e","trial":"2026-11-08-2340-blunder-2bb42a","at":"2026-11-08T23:40:27.547Z","kind":"blunder","checker":"tlc","completed":true,"void":false,"result":"as-called","property":"A1","scenario":"all-honest","problems":[],"classification":null,"prose":"7c3f26"}
  ],
  "removed": [],
  "tripwires": [],
  "flags": [{"name":"review owed","where":"no review at prose@7c3f26"}],
  "route": {"pass":"Review","why":["no review at prose@7c3f26"],"read":"spec/review.md"}
}
```
