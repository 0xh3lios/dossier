# Ledger: Timelock   rebuilt 2026-11-07T23:24:48Z   prose@70bff9   answers 9   decisions 1
Written by dossier render from the records. The JSON block at the end says the same for tools.
verify: ok · Timelock · dossier 0.1.0 · 0 tripwires

| id | kind | passage | owner | machine | answers | reach |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | State | Idle: no plan waits. | settled | checked | [chart-ab1807](evidence/chart-64fcc7.json), [tlc-b67048](evidence/tlc-W1-37d5b8.json) | one plan; delay 2 |
| S2 | State | Scheduled: one plan waits out its delay. | settled | checked | [chart-ab1807](evidence/chart-64fcc7.json), [tlc-b67048](evidence/tlc-W1-37d5b8.json) | one plan; delay 2 |
| E1 | Event | tick, from the chain: one block passes. | settled | checked | [chart-ab1807](evidence/chart-64fcc7.json), [tlc-b67048](evidence/tlc-W1-37d5b8.json) | one plan; delay 2 |
| E2 | Event | schedule, from Governance: a plan is scheduled with the full delay ahead of it. | settled | checked | [chart-ab1807](evidence/chart-64fcc7.json), [tlc-b67048](evidence/tlc-W1-37d5b8.json) | one plan; delay 2 |
| E3 | Event | execute, from the public: anyone asks to execute the waiting plan. | settled | checked | [chart-ab1807](evidence/chart-64fcc7.json), [tlc-b67048](evidence/tlc-W1-37d5b8.json) | one plan; delay 2 |
| E4 | Event | cancel, from Governance: the waiting plan is cancelled. | settled | checked | [chart-ab1807](evidence/chart-64fcc7.json), [tlc-b67048](evidence/tlc-W1-37d5b8.json) | one plan; delay 2 |
| M1 | Move | When Idle receives tick, it stays Idle. | settled | checked | [chart-ab1807](evidence/chart-64fcc7.json), [tlc-b67048](evidence/tlc-W1-37d5b8.json) | one plan; delay 2 |
| M2 | Move | When Scheduled receives tick and remaining is above 0, it stays Scheduled, remaining drops by one. | settled | checked | [chart-ab1807](evidence/chart-64fcc7.json), [tlc-b67048](evidence/tlc-W1-37d5b8.json) | one plan; delay 2 |
| M3 | Move | When Scheduled receives tick and remaining is 0, it stays Scheduled. | settled | drawn | [chart-ab1807](evidence/chart-64fcc7.json) | the chart over remaining 0..2 |
| M4 | Move | When Idle receives schedule, it becomes Scheduled, with remaining 2. | settled | checked | [chart-ab1807](evidence/chart-64fcc7.json), [tlc-b67048](evidence/tlc-W1-37d5b8.json) | one plan; delay 2 |
| M5 | Move | When Scheduled receives execute and remaining is 0, it becomes Idle, {early := remaining > 0}, sends change. | settled | checked | [chart-ab1807](evidence/chart-64fcc7.json), [tlc-b67048](evidence/tlc-W1-37d5b8.json) | one plan; delay 2 |
| M6 | Move | When Scheduled receives cancel, it becomes Idle. | settled | checked | [chart-ab1807](evidence/chart-64fcc7.json), [tlc-b67048](evidence/tlc-W1-37d5b8.json) | one plan; delay 2 |
| R1 | Refusal | In Idle, execute and cancel are refused. | unsettled | checked | [chart-ab1807](evidence/chart-64fcc7.json), [tlc-b67048](evidence/tlc-W1-37d5b8.json) | one plan; delay 2 |
| R2 | Refusal | In Scheduled, schedule is refused. | unsettled | checked | [chart-ab1807](evidence/chart-64fcc7.json), [tlc-b67048](evidence/tlc-W1-37d5b8.json) | one plan; delay 2 |
| R3 | Refusal | In Scheduled, execute is refused when remaining is above 0. | unsettled | checked | [chart-ab1807](evidence/chart-64fcc7.json) | the chart over remaining 0..2 |
| A1 | Always | Always, {not early}. | settled | proved | [apalache-09222c](evidence/apalache-A1-78bb75.json), [blunder-3dbc67](evidence/blunder-A1-48f8c0.json) | unbounded; TypeOK and A1 inductive |
| O1 | Once | Once Scheduled, eventually Idle, given G1 and G2. | unsettled | checked, given G1 G2 | [tlc-6c76a9](evidence/tlc-O1-2be705.json), [blunder-2421dc](evidence/blunder-O1-06ff15.json) | one plan; delay 2 |
| N1 | Within | Within 3 ticks of Scheduled, Idle, given G1 and G2. | settled | checked, given G1 G2 | [tlc-dadb9c](evidence/tlc-A1-N1-59ce72.json), [blunder-3f38ed](evidence/blunder-N1-0df476.json) | one plan; delay 2; effects up to 4 |
| G1 | Given | Given that someone executes the plan as soon as its delay is out. If this is false, N1 and O1 are void. Actor: the public, on execute, prompt. | settled | given |  |  |
| G2 | Given | Given that the chain keeps ticking. If this is false, O1 and N1 are void. Actor: the chain. | settled | given |  |  |
| W1 | Walk | Walk Delayed: from Idle, schedule, execute refused, tick, tick, execute; ends Idle with remaining 0; change sent once. | unsettled | checked | [chart-ab1807](evidence/chart-64fcc7.json), [tlc-b67048](evidence/tlc-W1-37d5b8.json) | one plan; delay 2 |
| W2 | Walk | Walk Cancelled: from Idle, schedule, tick, cancel, execute refused; ends Idle; change not sent. | unsettled | checked | [chart-ab1807](evidence/chart-64fcc7.json), [tlc-a9a696](evidence/tlc-W2-c29421.json) | one plan; delay 2 |
| X1 | Seam | Seam with vault: change crosses from Timelock to Vault carrying nothing. | unsettled | checked |  |  |
| K1 | Guarantee | execute succeeds only once the plan's delay has passed. Backing: record timelock#property:execute-after-eta. | unsettled | backed |  |  |
| K2 | Guarantee | A scheduled plan's delay cannot be shortened. Backing: none. | unsettled | assumed |  |  |
| T1 | Words only | What a plan changes is the Vault's business; here every plan raises the ceiling. | unsettled | text |  |  |

| guarantee | backing | status |
| --- | --- | --- |
| K1 | record timelock#property:execute-after-eta | backed |
| K2 | none | assumed |

Used by: control
Summary: 26 passages · settled 16 · confirmed 15 · unsettled 10 · proved 1 · checked 19 · drawn 1 · backed 1 · assumed 1 · text 1 · given 2 · prose@70bff9
Flags: review owed (no review at prose@70bff9)
Next: Encode — not tried on the model side: M3
Since last rebuild: first rebuild

```json
{
  "kind": "component",
  "id": "timelock",
  "title": "Timelock",
  "tier": "modeled",
  "module": "timelock",
  "rebuilt": "2026-11-07T23:24:48Z",
  "plugin": "0.1.0",
  "summary": {"passages":26,"settled":16,"confirmed":15,"unsettled":10,"rejected":0,"proved":1,"checked":19,"drawn":1,"pending":0,"lapsed":0,"miscalled":0,"hollow":0,"held":0,"owed":0,"backed":1,"assumed":1,"unresolved":0,"doubtsOpen":0,"text":1,"given":2},
  "marks": {
    "S1": {"mark":"checked","trials":["2026-11-07-2321-chart-ab1807","2026-11-07-2321-tlc-b67048"],"entries":["chart-64fcc7","tlc-W1-37d5b8"],"reach":"one plan; delay 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "S2": {"mark":"checked","trials":["2026-11-07-2321-chart-ab1807","2026-11-07-2321-tlc-b67048"],"entries":["chart-64fcc7","tlc-W1-37d5b8"],"reach":"one plan; delay 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "E1": {"mark":"checked","trials":["2026-11-07-2321-chart-ab1807","2026-11-07-2321-tlc-b67048"],"entries":["chart-64fcc7","tlc-W1-37d5b8"],"reach":"one plan; delay 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "E2": {"mark":"checked","trials":["2026-11-07-2321-chart-ab1807","2026-11-07-2321-tlc-b67048"],"entries":["chart-64fcc7","tlc-W1-37d5b8"],"reach":"one plan; delay 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "E3": {"mark":"checked","trials":["2026-11-07-2321-chart-ab1807","2026-11-07-2321-tlc-b67048"],"entries":["chart-64fcc7","tlc-W1-37d5b8"],"reach":"one plan; delay 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "E4": {"mark":"checked","trials":["2026-11-07-2321-chart-ab1807","2026-11-07-2321-tlc-b67048"],"entries":["chart-64fcc7","tlc-W1-37d5b8"],"reach":"one plan; delay 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "M1": {"mark":"checked","trials":["2026-11-07-2321-chart-ab1807","2026-11-07-2321-tlc-b67048"],"entries":["chart-64fcc7","tlc-W1-37d5b8"],"reach":"one plan; delay 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "M2": {"mark":"checked","trials":["2026-11-07-2321-chart-ab1807","2026-11-07-2321-tlc-b67048"],"entries":["chart-64fcc7","tlc-W1-37d5b8"],"reach":"one plan; delay 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "M3": {"mark":"drawn","trials":["2026-11-07-2321-chart-ab1807"],"entries":["chart-64fcc7"],"reach":"the chart over remaining 0..2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":false,"confirmed":false},
    "M4": {"mark":"checked","trials":["2026-11-07-2321-chart-ab1807","2026-11-07-2321-tlc-b67048"],"entries":["chart-64fcc7","tlc-W1-37d5b8"],"reach":"one plan; delay 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "M5": {"mark":"checked","trials":["2026-11-07-2321-chart-ab1807","2026-11-07-2321-tlc-b67048"],"entries":["chart-64fcc7","tlc-W1-37d5b8"],"reach":"one plan; delay 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "M6": {"mark":"checked","trials":["2026-11-07-2321-chart-ab1807","2026-11-07-2321-tlc-b67048"],"entries":["chart-64fcc7","tlc-W1-37d5b8"],"reach":"one plan; delay 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "R1": {"mark":"checked","trials":["2026-11-07-2321-chart-ab1807","2026-11-07-2321-tlc-b67048"],"entries":["chart-64fcc7","tlc-W1-37d5b8"],"reach":"one plan; delay 2","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":false},
    "R2": {"mark":"checked","trials":["2026-11-07-2321-chart-ab1807","2026-11-07-2321-tlc-b67048"],"entries":["chart-64fcc7","tlc-W1-37d5b8"],"reach":"one plan; delay 2","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":false},
    "R3": {"mark":"checked","trials":["2026-11-07-2321-chart-ab1807"],"entries":["chart-64fcc7"],"reach":"the chart over remaining 0..2","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":false,"confirmed":false},
    "A1": {"mark":"proved","trials":["2026-11-07-2322-apalache-09222c","2026-11-07-2322-blunder-3dbc67"],"entries":["apalache-A1-78bb75","blunder-A1-48f8c0"],"reach":"unbounded; TypeOK and A1 inductive","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "O1": {"mark":"checked","trials":["2026-11-07-2321-tlc-6c76a9","2026-11-07-2322-blunder-2421dc"],"entries":["tlc-O1-2be705","blunder-O1-06ff15"],"reach":"one plan; delay 2","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":true,"confirmed":false},
    "N1": {"mark":"checked","trials":["2026-11-07-2321-tlc-dadb9c","2026-11-07-2322-blunder-3f38ed"],"entries":["tlc-A1-N1-59ce72","blunder-N1-0df476"],"reach":"one plan; delay 2; effects up to 4","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":true,"confirmed":true},
    "G1": {"mark":"given","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":true},
    "G2": {"mark":"given","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":true},
    "W1": {"mark":"checked","trials":["2026-11-07-2321-chart-ab1807","2026-11-07-2321-tlc-b67048"],"entries":["chart-64fcc7","tlc-W1-37d5b8"],"reach":"one plan; delay 2","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":false},
    "W2": {"mark":"checked","trials":["2026-11-07-2321-chart-ab1807","2026-11-07-2321-tlc-a9a696"],"entries":["chart-64fcc7","tlc-W2-c29421"],"reach":"one plan; delay 2","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":false},
    "X1": {"mark":"checked","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false},
    "K1": {"mark":"backed","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false},
    "K2": {"mark":"assumed","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false},
    "T1": {"mark":"text","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false}
  },
  "owner": {"S1":"settled","S2":"settled","E1":"settled","E2":"settled","E3":"settled","E4":"settled","M1":"settled","M2":"settled","M3":"settled","M4":"settled","M5":"settled","M6":"settled","R1":"unsettled","R2":"unsettled","R3":"unsettled","A1":"settled","O1":"unsettled","N1":"settled","G1":"settled","G2":"settled","W1":"unsettled","W2":"unsettled","X1":"unsettled","K1":"unsettled","K2":"unsettled","T1":"unsettled"},
  "backing": {"K1":{"status":"backed","hash":"6d688aa061b03fd3","path":"modules/timelock/behavior/invariants.md"},"K2":{"status":"assumed"}},
  "pins": {"timelock#observation:delay-check-2026-11-01":"d33b3049427305ab"},
  "usedBy": ["control"],
  "answers": [
    {"entry":"chart-64fcc7","trial":"2026-11-07-2321-chart-ab1807","at":"2026-11-07T23:21:55.669Z","kind":"chart","checker":"chart","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"70bff9"},
    {"entry":"tlc-A1-N1-59ce72","trial":"2026-11-07-2321-tlc-dadb9c","at":"2026-11-07T23:21:56.005Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"70bff9"},
    {"entry":"tlc-O1-2be705","trial":"2026-11-07-2321-tlc-6c76a9","at":"2026-11-07T23:21:57.202Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"70bff9"},
    {"entry":"tlc-W2-c29421","trial":"2026-11-07-2321-tlc-a9a696","at":"2026-11-07T23:21:58.610Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"70bff9"},
    {"entry":"tlc-W1-37d5b8","trial":"2026-11-07-2321-tlc-b67048","at":"2026-11-07T23:21:59.785Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"70bff9"},
    {"entry":"apalache-A1-78bb75","trial":"2026-11-07-2322-apalache-09222c","at":"2026-11-07T23:22:00.986Z","kind":"apalache","checker":"apalache","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"70bff9"},
    {"entry":"blunder-A1-48f8c0","trial":"2026-11-07-2322-blunder-3dbc67","at":"2026-11-07T23:22:06.739Z","kind":"blunder","checker":"tlc","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"70bff9"},
    {"entry":"blunder-N1-0df476","trial":"2026-11-07-2322-blunder-3f38ed","at":"2026-11-07T23:22:07.975Z","kind":"blunder","checker":"tlc","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"70bff9"},
    {"entry":"blunder-O1-06ff15","trial":"2026-11-07-2322-blunder-2421dc","at":"2026-11-07T23:22:09.200Z","kind":"blunder","checker":"tlc","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"70bff9"}
  ],
  "removed": [],
  "tripwires": [],
  "flags": [{"name":"review owed","where":"no review at prose@70bff9"}],
  "route": {"pass":"Encode","why":["not tried on the model side: M3"],"read":"spec/models.md"}
}
```
