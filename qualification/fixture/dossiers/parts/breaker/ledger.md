# Ledger: Breaker   rebuilt 2026-11-08T23:40:32Z   prose@02aa1d   answers 6   decisions 1
Written by dossier render from the records. The JSON block at the end says the same for tools.
verify: ok · Breaker · dossier 0.1.1 · 0 tripwires

| id | kind | passage | owner | machine | answers | reach |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | State | Armed: the breaker will relay a halt. | settled | checked | [chart-5bf4a7](evidence/chart-64fcc7.json), [tlc-ad1aac](evidence/tlc-W1-b9babb.json) | one breaker |
| S2 | State | Spent: the breaker has halted the adapter. Final. | settled | checked | [chart-5bf4a7](evidence/chart-64fcc7.json), [tlc-ad1aac](evidence/tlc-W1-b9babb.json) | one breaker |
| E1 | Event | stop, from Governance: governance halts exits. | settled | checked | [chart-5bf4a7](evidence/chart-64fcc7.json), [tlc-ad1aac](evidence/tlc-W1-b9babb.json) | one breaker |
| M1 | Move | When Armed receives stop, it becomes Spent, halted is set, sends halt. | settled | checked | [chart-5bf4a7](evidence/chart-64fcc7.json), [tlc-ad1aac](evidence/tlc-W1-b9babb.json) | one breaker |
| R1 | Refusal | In Spent, stop is refused. | unsettled | checked | [chart-5bf4a7](evidence/chart-64fcc7.json), [tlc-ad1aac](evidence/tlc-W1-b9babb.json) | one breaker |
| A1 | Always | Always, while Spent, halted is set. | settled | checked | [tlc-92c128](evidence/tlc-A1-a6aa65.json), [blunder-b185c0](evidence/blunder-A1-62ac88.json) | one breaker |
| A2 | Always | Always, in structure, every halt the Adapter receives comes from Governance through a Breaker whose authority is Governance. | settled | checked | [alloy-285659](evidence/alloy-A2-de2df5.json), [blunder-13b1bb](evidence/blunder-A2-e8ec8a.json) | scope 4 |
| W1 | Walk | Walk Halt: from Armed, stop, stop refused; ends Spent; halt sent once. | unsettled | checked | [chart-5bf4a7](evidence/chart-64fcc7.json), [tlc-ad1aac](evidence/tlc-W1-b9babb.json) | one breaker |
| X1 | Seam | Seam with adapter: halt crosses from Breaker to Adapter carrying nothing. | unsettled | checked |  |  |
| K1 | Guarantee | A breaker action only halts, never enables. Backing: record breaker#property:breaker-only-reduces. | unsettled | backed |  |  |
| T1 | Words only | This piece promises nothing eventual. | unsettled | text |  |  |

| guarantee | backing | status |
| --- | --- | --- |
| K1 | record breaker#property:breaker-only-reduces | backed |

Used by: control
Summary: 11 passages · settled 6 · confirmed 6 · unsettled 5 · checked 9 · backed 1 · text 1 · prose@02aa1d
Flags: review owed (no review at prose@02aa1d)
Next: Review — no review at prose@02aa1d
Since last rebuild: first rebuild

```json
{
  "kind": "part",
  "id": "breaker",
  "title": "Breaker",
  "tier": "modeled",
  "module": "breaker",
  "rebuilt": "2026-11-08T23:40:32Z",
  "plugin": "0.1.1",
  "summary": {"passages":11,"settled":6,"confirmed":6,"unsettled":5,"rejected":0,"proved":0,"checked":9,"drawn":0,"pending":0,"lapsed":0,"miscalled":0,"hollow":0,"held":0,"owed":0,"backed":1,"assumed":0,"unresolved":0,"doubtsOpen":0,"text":1,"given":0},
  "marks": {
    "S1": {"mark":"checked","trials":["2026-11-08-2337-chart-5bf4a7","2026-11-08-2337-tlc-ad1aac"],"entries":["chart-64fcc7","tlc-W1-b9babb"],"reach":"one breaker","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "S2": {"mark":"checked","trials":["2026-11-08-2337-chart-5bf4a7","2026-11-08-2337-tlc-ad1aac"],"entries":["chart-64fcc7","tlc-W1-b9babb"],"reach":"one breaker","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "E1": {"mark":"checked","trials":["2026-11-08-2337-chart-5bf4a7","2026-11-08-2337-tlc-ad1aac"],"entries":["chart-64fcc7","tlc-W1-b9babb"],"reach":"one breaker","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "M1": {"mark":"checked","trials":["2026-11-08-2337-chart-5bf4a7","2026-11-08-2337-tlc-ad1aac"],"entries":["chart-64fcc7","tlc-W1-b9babb"],"reach":"one breaker","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "R1": {"mark":"checked","trials":["2026-11-08-2337-chart-5bf4a7","2026-11-08-2337-tlc-ad1aac"],"entries":["chart-64fcc7","tlc-W1-b9babb"],"reach":"one breaker","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":false},
    "A1": {"mark":"checked","trials":["2026-11-08-2337-tlc-92c128","2026-11-08-2337-blunder-b185c0"],"entries":["tlc-A1-a6aa65","blunder-A1-62ac88"],"reach":"one breaker","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "A2": {"mark":"checked","trials":["2026-11-08-2337-alloy-285659","2026-11-08-2337-blunder-13b1bb"],"entries":["alloy-A2-de2df5","blunder-A2-e8ec8a"],"reach":"scope 4","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":true,"confirmed":true},
    "W1": {"mark":"checked","trials":["2026-11-08-2337-chart-5bf4a7","2026-11-08-2337-tlc-ad1aac"],"entries":["chart-64fcc7","tlc-W1-b9babb"],"reach":"one breaker","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":false},
    "X1": {"mark":"checked","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false},
    "K1": {"mark":"backed","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false},
    "T1": {"mark":"text","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false}
  },
  "owner": {"S1":"settled","S2":"settled","E1":"settled","M1":"settled","R1":"unsettled","A1":"settled","A2":"settled","W1":"unsettled","X1":"unsettled","K1":"unsettled","T1":"unsettled"},
  "backing": {"K1":{"status":"backed","hash":"8f4359bc3def3404","path":"modules/breaker/behavior/invariants.md"}},
  "pins": {},
  "usedBy": ["control"],
  "answers": [
    {"entry":"chart-64fcc7","trial":"2026-11-08-2337-chart-5bf4a7","at":"2026-11-08T23:37:34.811Z","kind":"chart","checker":"chart","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"02aa1d"},
    {"entry":"tlc-A1-a6aa65","trial":"2026-11-08-2337-tlc-92c128","at":"2026-11-08T23:37:35.128Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"02aa1d"},
    {"entry":"tlc-W1-b9babb","trial":"2026-11-08-2337-tlc-ad1aac","at":"2026-11-08T23:37:36.497Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"02aa1d"},
    {"entry":"alloy-A2-de2df5","trial":"2026-11-08-2337-alloy-285659","at":"2026-11-08T23:37:37.667Z","kind":"alloy","checker":"alloy","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"02aa1d"},
    {"entry":"blunder-A2-e8ec8a","trial":"2026-11-08-2337-blunder-13b1bb","at":"2026-11-08T23:37:39.126Z","kind":"blunder","checker":"alloy","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"02aa1d"},
    {"entry":"blunder-A1-62ac88","trial":"2026-11-08-2337-blunder-b185c0","at":"2026-11-08T23:37:40.646Z","kind":"blunder","checker":"tlc","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"02aa1d"}
  ],
  "removed": [],
  "tripwires": [],
  "flags": [{"name":"review owed","where":"no review at prose@02aa1d"}],
  "route": {"pass":"Review","why":["no review at prose@02aa1d"],"read":"spec/review.md"}
}
```
