# Ledger: Control   rebuilt 2026-11-07T23:24:48Z   prose@6c8765   answers 14   decisions 2
Written by dossier render from the records. The JSON block at the end says the same for tools.
verify: ok · Control · dossier 0.1.0 · 0 tripwires

| member | role | module | pins |
| --- | --- | --- | --- |
| timelock | member | timelock | timelock#observation:delay-check-2026-11-01 |
| vault | member | vault |  |
| breaker | member | breaker |  |
| adapter | member | adapter |  |

Wiring: timelock.change → vault.change · breaker.halt → adapter.halt
Free: vault.move, vault.release from adapter

| property | owner | all-honest | governance-captured | executor-offline |
| --- | --- | --- | --- | --- |
| A1 · Always, {not timelock.early}. | unsettled | proved ([apalache-2cfc72](evidence/apalache-A1-all-honest-e39a7b.json)) | checked ([tlc-2062e2](evidence/tlc-A1-governance-captured-ffd8c6.json)) | checked ([tlc-d20abd](evidence/tlc-A1-executor-offline-2a340d.json)) |
| A2 · Always, {not breaker.halted or adapter.Halted}. | unsettled | checked ([tlc-501fd1](evidence/tlc-A2-all-honest-b3f346.json)) | checked ([tlc-3db6c3](evidence/tlc-A2-governance-captured-8c118d.json)) |  |
| O1 · Once timelock.Scheduled, eventually timelock.Idle, given G1 and G2. | unsettled | checked ([tlc-3f0227](evidence/tlc-O1-all-honest-bea14f.json)) |  |  |
| N1 · Within 3 ticks of timelock.Scheduled, timelock.Idle, given G1 and G2. | unsettled | checked ([tlc-cc5272](evidence/tlc-N1-all-honest-25a708.json)) | checked ([tlc-145607](evidence/tlc-N1-governance-captured-4691a3.json)) | violated, accepted ([tlc-ff2ce3](evidence/tlc-N1-executor-offline-4dafb3.json)) |

- A1 × all-honest: proved, reach unbounded; TypeOK, the Vault's conservation and A1 inductive, [2026-11-07-2323-apalache-2cfc72](evidence/apalache-A1-all-honest-e39a7b.json), members timelock@b91285, vault@ad6f10, breaker@0c6939, adapter@58d831
- A1 × governance-captured: checked, reach delay 2; amounts up to 2; ceiling 2..4; effects up to 4, [2026-11-07-2323-tlc-2062e2](evidence/tlc-A1-governance-captured-ffd8c6.json), members timelock@b91285, vault@ad6f10, breaker@0c6939, adapter@58d831
- A1 × executor-offline: checked, reach delay 2; amounts up to 2; ceiling 2..4; effects up to 4, [2026-11-07-2323-tlc-d20abd](evidence/tlc-A1-executor-offline-2a340d.json), members timelock@b91285, vault@ad6f10, breaker@0c6939, adapter@58d831
- A2 × all-honest: checked, reach delay 2; amounts up to 2; ceiling 2..4; effects up to 4, [2026-11-07-2323-tlc-501fd1](evidence/tlc-A2-all-honest-b3f346.json), members timelock@b91285, vault@ad6f10, breaker@0c6939, adapter@58d831
- A2 × governance-captured: checked, reach delay 2; amounts up to 2; ceiling 2..4; effects up to 4, [2026-11-07-2323-tlc-3db6c3](evidence/tlc-A2-governance-captured-8c118d.json), members timelock@b91285, vault@ad6f10, breaker@0c6939, adapter@58d831
- O1 × all-honest: checked, reach delay 2; effects up to 4, [2026-11-07-2323-tlc-3f0227](evidence/tlc-O1-all-honest-bea14f.json), members timelock@b91285, vault@ad6f10, breaker@0c6939, adapter@58d831
- N1 × all-honest: checked, reach delay 2; amounts up to 2; ceiling 2..4; effects up to 4, [2026-11-07-2324-tlc-cc5272](evidence/tlc-N1-all-honest-25a708.json), members timelock@b91285, vault@ad6f10, breaker@0c6939, adapter@58d831
- N1 × governance-captured: checked, reach delay 2; amounts up to 2; ceiling 2..4; effects up to 4, [2026-11-07-2324-tlc-145607](evidence/tlc-N1-governance-captured-4691a3.json), members timelock@b91285, vault@ad6f10, breaker@0c6939, adapter@58d831
- N1 × executor-offline: violated, reach delay 2; amounts up to 2; ceiling 2..4; effects up to 4, [2026-11-07-2324-tlc-ff2ce3](evidence/tlc-N1-executor-offline-4dafb3.json), members timelock@b91285, vault@ad6f10, breaker@0c6939, adapter@58d831

| walk | scenario | mark | trial |
| --- | --- | --- | --- |
| W1 | governance-captured | checked | [tlc-9d8e77](evidence/tlc-W1-governance-captured-e9942f.json) |

Summary: 4 properties × 3 scenarios · 9 cells · proved 1 · checked 7 · violated 1 (accepted 1) · prose@6c8765
Flags: review owed (no review at prose@6c8765)
Next: Review — no review at prose@6c8765
Since last rebuild: first rebuild

```json
{
  "kind": "system",
  "id": "control",
  "title": "Control",
  "concern": "control",
  "rebuilt": "2026-11-07T23:24:48Z",
  "plugin": "0.1.0",
  "summary": {"properties":4,"scenarios":3,"cells":9,"proved":1,"checked":7,"implied":0,"violated":1,"accepted":1,"lapsed":0,"pending":0,"miscalled":0,"held":0,"hollow":0,"open":0,"doubtsOpen":0},
  "members": [{"component":"timelock","role":"member","pins":["timelock#observation:delay-check-2026-11-01"]},{"component":"vault","role":"member","pins":[]},{"component":"breaker","role":"member","pins":[]},{"component":"adapter","role":"member","pins":[]}],
  "wiring": [{"effect":{"component":"timelock","name":"change"},"event":{"component":"vault","name":"change"}},{"effect":{"component":"breaker","name":"halt"},"event":{"component":"adapter","name":"halt"}}],
  "free": [{"event":"vault.move","from":"adapter","declared":true},{"event":"vault.release","from":"adapter","declared":true}],
  "outside": [],
  "closureMissing": [],
  "cells": [
    {"property":"A1","scenario":"all-honest","mark":"proved","trial":"2026-11-07-2323-apalache-2cfc72","entry":"apalache-A1-all-honest-e39a7b","reach":"unbounded; TypeOK, the Vault's conservation and A1 inductive","lapsed":[],"accepted":false,"acceptanceLapsed":[],"open":false,"impliedBy":null,"held":"caught"},
    {"property":"A1","scenario":"governance-captured","mark":"checked","trial":"2026-11-07-2323-tlc-2062e2","entry":"tlc-A1-governance-captured-ffd8c6","reach":"delay 2; amounts up to 2; ceiling 2..4; effects up to 4","lapsed":[],"accepted":false,"acceptanceLapsed":[],"open":false,"impliedBy":null,"held":"caught"},
    {"property":"A1","scenario":"executor-offline","mark":"checked","trial":"2026-11-07-2323-tlc-d20abd","entry":"tlc-A1-executor-offline-2a340d","reach":"delay 2; amounts up to 2; ceiling 2..4; effects up to 4","lapsed":[],"accepted":false,"acceptanceLapsed":[],"open":false,"impliedBy":null,"held":"caught"},
    {"property":"A2","scenario":"all-honest","mark":"checked","trial":"2026-11-07-2323-tlc-501fd1","entry":"tlc-A2-all-honest-b3f346","reach":"delay 2; amounts up to 2; ceiling 2..4; effects up to 4","lapsed":[],"accepted":false,"acceptanceLapsed":[],"open":false,"impliedBy":null,"held":"caught"},
    {"property":"A2","scenario":"governance-captured","mark":"checked","trial":"2026-11-07-2323-tlc-3db6c3","entry":"tlc-A2-governance-captured-8c118d","reach":"delay 2; amounts up to 2; ceiling 2..4; effects up to 4","lapsed":[],"accepted":false,"acceptanceLapsed":[],"open":false,"impliedBy":null,"held":"caught"},
    {"property":"O1","scenario":"all-honest","mark":"checked","trial":"2026-11-07-2323-tlc-3f0227","entry":"tlc-O1-all-honest-bea14f","reach":"delay 2; effects up to 4","lapsed":[],"accepted":false,"acceptanceLapsed":[],"open":false,"impliedBy":null,"held":"caught"},
    {"property":"N1","scenario":"all-honest","mark":"checked","trial":"2026-11-07-2324-tlc-cc5272","entry":"tlc-N1-all-honest-25a708","reach":"delay 2; amounts up to 2; ceiling 2..4; effects up to 4","lapsed":[],"accepted":false,"acceptanceLapsed":[],"open":false,"impliedBy":null,"held":"caught"},
    {"property":"N1","scenario":"governance-captured","mark":"checked","trial":"2026-11-07-2324-tlc-145607","entry":"tlc-N1-governance-captured-4691a3","reach":"delay 2; amounts up to 2; ceiling 2..4; effects up to 4","lapsed":[],"accepted":false,"acceptanceLapsed":[],"open":false,"impliedBy":null,"held":"caught"},
    {"property":"N1","scenario":"executor-offline","mark":"violated","trial":"2026-11-07-2324-tlc-ff2ce3","entry":"tlc-N1-executor-offline-4dafb3","reach":"delay 2; amounts up to 2; ceiling 2..4; effects up to 4","lapsed":[],"accepted":true,"acceptanceLapsed":[],"open":false,"impliedBy":null,"held":"caught"}
  ],
  "walks": [
    {"id":"W1","scenario":"governance-captured","mark":"checked","trial":"2026-11-07-2324-tlc-9d8e77","entry":"tlc-W1-governance-captured-e9942f"}
  ],
  "owner": {"A1":"unsettled","A2":"unsettled","O1":"unsettled","N1":"unsettled","G1":"unsettled","G2":"unsettled","W1":"unsettled","T1":"unsettled"},
  "propertyHeld": {"A1":"caught","A2":"caught","O1":"caught","N1":"caught"},
  "answers": [
    {"entry":"apalache-A1-all-honest-e39a7b","trial":"2026-11-07-2323-apalache-2cfc72","at":"2026-11-07T23:23:08.684Z","kind":"apalache","checker":"apalache","completed":true,"void":false,"result":"as-called","property":"A1","scenario":"all-honest","problems":[],"classification":null,"prose":"6c8765"},
    {"entry":"tlc-A1-governance-captured-ffd8c6","trial":"2026-11-07-2323-tlc-2062e2","at":"2026-11-07T23:23:14.917Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":"A1","scenario":"governance-captured","problems":[],"classification":null,"prose":"6c8765"},
    {"entry":"tlc-A1-executor-offline-2a340d","trial":"2026-11-07-2323-tlc-d20abd","at":"2026-11-07T23:23:22.109Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":"A1","scenario":"executor-offline","problems":[],"classification":null,"prose":"6c8765"},
    {"entry":"tlc-A2-all-honest-b3f346","trial":"2026-11-07-2323-tlc-501fd1","at":"2026-11-07T23:23:24.079Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":"A2","scenario":"all-honest","problems":[],"classification":null,"prose":"6c8765"},
    {"entry":"tlc-A2-governance-captured-8c118d","trial":"2026-11-07-2323-tlc-3db6c3","at":"2026-11-07T23:23:32.088Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":"A2","scenario":"governance-captured","problems":[],"classification":null,"prose":"6c8765"},
    {"entry":"tlc-O1-all-honest-bea14f","trial":"2026-11-07-2323-tlc-3f0227","at":"2026-11-07T23:23:39.636Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":"O1","scenario":"all-honest","problems":[],"classification":null,"prose":"6c8765"},
    {"entry":"tlc-N1-all-honest-25a708","trial":"2026-11-07-2324-tlc-cc5272","at":"2026-11-07T23:24:00.197Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":"N1","scenario":"all-honest","problems":[],"classification":null,"prose":"6c8765"},
    {"entry":"tlc-N1-governance-captured-4691a3","trial":"2026-11-07-2324-tlc-145607","at":"2026-11-07T23:24:07.849Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":"N1","scenario":"governance-captured","problems":[],"classification":null,"prose":"6c8765"},
    {"entry":"tlc-N1-executor-offline-4dafb3","trial":"2026-11-07-2324-tlc-ff2ce3","at":"2026-11-07T23:24:15.157Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":"N1","scenario":"executor-offline","problems":[],"classification":null,"prose":"6c8765"},
    {"entry":"blunder-A1-all-honest-b276d0","trial":"2026-11-07-2324-blunder-439b98","at":"2026-11-07T23:24:16.474Z","kind":"blunder","checker":"tlc","completed":true,"void":false,"result":"as-called","property":"A1","scenario":"all-honest","problems":[],"classification":null,"prose":"6c8765"},
    {"entry":"blunder-A2-all-honest-0e8db0","trial":"2026-11-07-2324-blunder-d16c98","at":"2026-11-07T23:24:17.694Z","kind":"blunder","checker":"tlc","completed":true,"void":false,"result":"as-called","property":"A2","scenario":"all-honest","problems":[],"classification":null,"prose":"6c8765"},
    {"entry":"blunder-N1-all-honest-e79ab8","trial":"2026-11-07-2324-blunder-d965d4","at":"2026-11-07T23:24:18.916Z","kind":"blunder","checker":"tlc","completed":true,"void":false,"result":"as-called","property":"N1","scenario":"all-honest","problems":[],"classification":null,"prose":"6c8765"},
    {"entry":"blunder-O1-all-honest-a0756b","trial":"2026-11-07-2324-blunder-84ad90","at":"2026-11-07T23:24:20.200Z","kind":"blunder","checker":"tlc","completed":true,"void":false,"result":"as-called","property":"O1","scenario":"all-honest","problems":[],"classification":null,"prose":"6c8765"},
    {"entry":"tlc-W1-governance-captured-e9942f","trial":"2026-11-07-2324-tlc-9d8e77","at":"2026-11-07T23:24:24.643Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":null,"scenario":"governance-captured","problems":[],"classification":null,"prose":"6c8765"}
  ],
  "removed": [],
  "tripwires": [],
  "flags": [{"name":"review owed","where":"no review at prose@6c8765"}],
  "route": {"pass":"Review","why":["no review at prose@6c8765"],"read":"spec/review.md"}
}
```
