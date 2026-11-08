# Ledger: Supply   rebuilt 2026-11-08T23:40:32Z   prose@720a6e   answers 10   decisions 1
Written by dossier render from the records. The JSON block at the end says the same for tools.
verify: ok · Supply · dossier 0.1.1 · 0 tripwires

| member | role | module | pins |
| --- | --- | --- | --- |
| vault | member | vault | vault#observation:checkpoint-2026-11-01 |
| adapter | member | adapter |  |
| token | member | token |  |

Wiring: adapter.move → vault.move · adapter.release → vault.release · adapter.mint → token.mint · adapter.burn → token.burn
Outside: breaker sends adapter.halt · timelock sends vault.change

| property | owner | all-honest | user-malicious |
| --- | --- | --- | --- |
| A1 · Always, {vault.debt = vault.free + vault.issued}. | settled | proved ([apalache-ff05ff](evidence/apalache-A1-all-honest-b80ec4.json)) | checked ([tlc-b20669](evidence/tlc-A1-user-malicious-55c163.json)) |
| A2 · Always, {token.supply = vault.issued}. | settled | proved ([apalache-89aafb](evidence/apalache-A2-all-honest-829e26.json)) | checked ([tlc-bdef73](evidence/tlc-A2-user-malicious-3bd827.json)) |
| A3 · Always, {adapter.held = token.supply}. | settled | proved ([apalache-a07e5a](evidence/apalache-A3-all-honest-089212.json)) | checked ([tlc-533869](evidence/tlc-A3-user-malicious-58334f.json)) |

- A1 × all-honest: proved, reach unbounded; TypeOK and A1 inductive, [2026-11-08-2338-apalache-ff05ff](evidence/apalache-A1-all-honest-b80ec4.json), members vault@ad6f10, adapter@58d831, token@69858f
- A1 × user-malicious: checked, reach amounts up to 2; debt, free, issued, held and supply up to 4; effects up to 4, [2026-11-08-2338-tlc-b20669](evidence/tlc-A1-user-malicious-55c163.json), members vault@ad6f10, adapter@58d831, token@69858f
- A2 × all-honest: proved, reach unbounded; TypeOK, A1 and A2 inductive, [2026-11-08-2338-apalache-89aafb](evidence/apalache-A2-all-honest-829e26.json), members vault@ad6f10, adapter@58d831, token@69858f
- A2 × user-malicious: checked, reach amounts up to 2; debt, free, issued, held and supply up to 4; effects up to 4, [2026-11-08-2338-tlc-bdef73](evidence/tlc-A2-user-malicious-3bd827.json), members vault@ad6f10, adapter@58d831, token@69858f
- A3 × all-honest: proved, reach unbounded; TypeOK, A1 and A3 inductive, [2026-11-08-2338-apalache-a07e5a](evidence/apalache-A3-all-honest-089212.json), members vault@ad6f10, adapter@58d831, token@69858f
- A3 × user-malicious: checked, reach amounts up to 2; debt, free, issued, held and supply up to 4; effects up to 4, [2026-11-08-2338-tlc-533869](evidence/tlc-A3-user-malicious-58334f.json), members vault@ad6f10, adapter@58d831, token@69858f

| walk | scenario | mark | trial |
| --- | --- | --- | --- |
| W1 | all-honest | checked | [tlc-e1e557](evidence/tlc-W1-all-honest-2cdc8e.json) |

Summary: 3 properties × 2 scenarios · 6 cells · proved 3 · checked 3 · prose@720a6e
Flags: review owed (no review at prose@720a6e)
Next: Review — no review at prose@720a6e
Since last rebuild: first rebuild

```json
{
  "kind": "composition",
  "id": "supply",
  "title": "Supply",
  "concern": "supply",
  "rebuilt": "2026-11-08T23:40:32Z",
  "plugin": "0.1.1",
  "summary": {"properties":3,"scenarios":2,"cells":6,"proved":3,"checked":3,"implied":0,"violated":0,"accepted":0,"lapsed":0,"pending":0,"miscalled":0,"held":0,"hollow":0,"open":0,"doubtsOpen":0},
  "members": [{"part":"vault","role":"member","pins":["vault#observation:checkpoint-2026-11-01"]},{"part":"adapter","role":"member","pins":[]},{"part":"token","role":"member","pins":[]}],
  "wiring": [{"effect":{"part":"adapter","name":"move"},"event":{"part":"vault","name":"move"}},{"effect":{"part":"adapter","name":"release"},"event":{"part":"vault","name":"release"}},{"effect":{"part":"adapter","name":"mint"},"event":{"part":"token","name":"mint"}},{"effect":{"part":"adapter","name":"burn"},"event":{"part":"token","name":"burn"}}],
  "free": [],
  "outside": [{"from":"breaker","events":["adapter.halt"]},{"from":"timelock","events":["vault.change"]}],
  "closureMissing": [],
  "cells": [
    {"property":"A1","scenario":"all-honest","mark":"proved","trial":"2026-11-08-2338-apalache-ff05ff","entry":"apalache-A1-all-honest-b80ec4","reach":"unbounded; TypeOK and A1 inductive","lapsed":[],"accepted":false,"acceptanceLapsed":[],"open":false,"impliedBy":null,"held":"caught"},
    {"property":"A1","scenario":"user-malicious","mark":"checked","trial":"2026-11-08-2338-tlc-b20669","entry":"tlc-A1-user-malicious-55c163","reach":"amounts up to 2; debt, free, issued, held and supply up to 4; effects up to 4","lapsed":[],"accepted":false,"acceptanceLapsed":[],"open":false,"impliedBy":null,"held":"caught"},
    {"property":"A2","scenario":"all-honest","mark":"proved","trial":"2026-11-08-2338-apalache-89aafb","entry":"apalache-A2-all-honest-829e26","reach":"unbounded; TypeOK, A1 and A2 inductive","lapsed":[],"accepted":false,"acceptanceLapsed":[],"open":false,"impliedBy":null,"held":"caught"},
    {"property":"A2","scenario":"user-malicious","mark":"checked","trial":"2026-11-08-2338-tlc-bdef73","entry":"tlc-A2-user-malicious-3bd827","reach":"amounts up to 2; debt, free, issued, held and supply up to 4; effects up to 4","lapsed":[],"accepted":false,"acceptanceLapsed":[],"open":false,"impliedBy":null,"held":"caught"},
    {"property":"A3","scenario":"all-honest","mark":"proved","trial":"2026-11-08-2338-apalache-a07e5a","entry":"apalache-A3-all-honest-089212","reach":"unbounded; TypeOK, A1 and A3 inductive","lapsed":[],"accepted":false,"acceptanceLapsed":[],"open":false,"impliedBy":null,"held":"caught"},
    {"property":"A3","scenario":"user-malicious","mark":"checked","trial":"2026-11-08-2338-tlc-533869","entry":"tlc-A3-user-malicious-58334f","reach":"amounts up to 2; debt, free, issued, held and supply up to 4; effects up to 4","lapsed":[],"accepted":false,"acceptanceLapsed":[],"open":false,"impliedBy":null,"held":"caught"}
  ],
  "walks": [
    {"id":"W1","scenario":"all-honest","mark":"checked","trial":"2026-11-08-2338-tlc-e1e557","entry":"tlc-W1-all-honest-2cdc8e"}
  ],
  "owner": {"A1":"settled","A2":"settled","A3":"settled","W1":"unsettled","T1":"unsettled"},
  "propertyHeld": {"A1":"caught","A2":"caught","A3":"caught"},
  "answers": [
    {"entry":"apalache-A1-all-honest-b80ec4","trial":"2026-11-08-2338-apalache-ff05ff","at":"2026-11-08T23:38:01.134Z","kind":"apalache","checker":"apalache","completed":true,"void":false,"result":"as-called","property":"A1","scenario":"all-honest","problems":[],"classification":null,"prose":"720a6e"},
    {"entry":"apalache-A2-all-honest-829e26","trial":"2026-11-08-2338-apalache-89aafb","at":"2026-11-08T23:38:08.869Z","kind":"apalache","checker":"apalache","completed":true,"void":false,"result":"as-called","property":"A2","scenario":"all-honest","problems":[],"classification":null,"prose":"720a6e"},
    {"entry":"apalache-A3-all-honest-089212","trial":"2026-11-08-2338-apalache-a07e5a","at":"2026-11-08T23:38:15.880Z","kind":"apalache","checker":"apalache","completed":true,"void":false,"result":"as-called","property":"A3","scenario":"all-honest","problems":[],"classification":null,"prose":"720a6e"},
    {"entry":"tlc-A1-user-malicious-55c163","trial":"2026-11-08-2338-tlc-b20669","at":"2026-11-08T23:38:22.052Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":"A1","scenario":"user-malicious","problems":[],"classification":null,"prose":"720a6e"},
    {"entry":"tlc-A2-user-malicious-3bd827","trial":"2026-11-08-2338-tlc-bdef73","at":"2026-11-08T23:38:23.601Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":"A2","scenario":"user-malicious","problems":[],"classification":null,"prose":"720a6e"},
    {"entry":"tlc-A3-user-malicious-58334f","trial":"2026-11-08-2338-tlc-533869","at":"2026-11-08T23:38:25.110Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":"A3","scenario":"user-malicious","problems":[],"classification":null,"prose":"720a6e"},
    {"entry":"blunder-A2-all-honest-345531","trial":"2026-11-08-2338-blunder-e1d10d","at":"2026-11-08T23:38:26.588Z","kind":"blunder","checker":"tlc","completed":true,"void":false,"result":"as-called","property":"A2","scenario":"all-honest","problems":[],"classification":null,"prose":"720a6e"},
    {"entry":"blunder-A1-all-honest-4c6824","trial":"2026-11-08-2338-blunder-82bfbd","at":"2026-11-08T23:38:27.907Z","kind":"blunder","checker":"tlc","completed":true,"void":false,"result":"as-called","property":"A1","scenario":"all-honest","problems":[],"classification":null,"prose":"720a6e"},
    {"entry":"blunder-A3-all-honest-2de1da","trial":"2026-11-08-2338-blunder-04e95f","at":"2026-11-08T23:38:29.131Z","kind":"blunder","checker":"tlc","completed":true,"void":false,"result":"as-called","property":"A3","scenario":"all-honest","problems":[],"classification":null,"prose":"720a6e"},
    {"entry":"tlc-W1-all-honest-2cdc8e","trial":"2026-11-08-2338-tlc-e1e557","at":"2026-11-08T23:38:30.377Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":null,"scenario":"all-honest","problems":[],"classification":null,"prose":"720a6e"}
  ],
  "removed": [],
  "tripwires": [],
  "flags": [{"name":"review owed","where":"no review at prose@720a6e"}],
  "route": {"pass":"Review","why":["no review at prose@720a6e"],"read":"spec/review.md"}
}
```
