# Ledger: Adapter   rebuilt 2026-11-08T23:40:32Z   prose@3ae029   answers 6   decisions 1
Written by dossier render from the records. The JSON block at the end says the same for tools.
verify: ok · Adapter · dossier 0.1.1 · 0 tripwires

| id | kind | passage | owner | machine | answers | reach |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | State | Open: exits and entries are accepted. | settled | checked | [chart-c026ab](evidence/chart-64fcc7.json), [tlc-5d358b](evidence/tlc-W1-fb78f0.json) | amounts up to 2 |
| S2 | State | Halted: the Breaker stopped exits; entries continue so HRD can always return. | settled | checked | [chart-c026ab](evidence/chart-64fcc7.json), [tlc-5d358b](evidence/tlc-W1-fb78f0.json) | amounts up to 2 |
| E1 | Event | exit, from the User: converts free credit into HRD. Carries amount, an amount of HRD up to 2. | settled | checked | [chart-c026ab](evidence/chart-64fcc7.json), [tlc-5d358b](evidence/tlc-W1-fb78f0.json) | amounts up to 2 |
| E2 | Event | enter, from the User: burns HRD back into free credit. Carries amount, an amount of HRD up to 2. | settled | checked | [chart-c026ab](evidence/chart-64fcc7.json), [tlc-5d358b](evidence/tlc-W1-fb78f0.json) | amounts up to 2 |
| E3 | Event | halt, from the Breaker: exits stop without the Timelock's delay. | settled | checked | [chart-c026ab](evidence/chart-64fcc7.json), [tlc-5d358b](evidence/tlc-W1-fb78f0.json) | amounts up to 2 |
| M1 | Move | When Open receives exit and {held + amount <= 4}, it stays Open, held grows by amount, sends move, sends mint. | settled | checked | [chart-c026ab](evidence/chart-64fcc7.json), [tlc-5d358b](evidence/tlc-W1-fb78f0.json) | amounts up to 2 |
| M2 | Move | When Open receives enter and {amount <= held}, it stays Open, held drops by amount, sends burn, sends release. | settled | checked | [chart-c026ab](evidence/chart-64fcc7.json), [tlc-5d358b](evidence/tlc-W1-fb78f0.json) | amounts up to 2 |
| M3 | Move | When Halted receives enter and {amount <= held}, it stays Halted, held drops by amount, sends burn, sends release. | settled | checked | [chart-c026ab](evidence/chart-64fcc7.json), [tlc-b5f968](evidence/tlc-W2-f022fb.json) | amounts up to 2; held up to 4 |
| M4 | Move | When Open receives halt, it becomes Halted, live is cleared. | settled | checked | [chart-c026ab](evidence/chart-64fcc7.json), [tlc-5d358b](evidence/tlc-W1-fb78f0.json) | amounts up to 2 |
| R1 | Refusal | In Halted, exit and halt are refused. | settled | checked | [chart-c026ab](evidence/chart-64fcc7.json), [tlc-5d358b](evidence/tlc-W1-fb78f0.json) | amounts up to 2 |
| R2 | Refusal | In Open and Halted, enter is refused when {amount > held}. | unsettled | checked | [chart-c026ab](evidence/chart-64fcc7.json) | the chart over held 0..4 |
| R3 | Refusal | In Open, exit is refused when {held + amount > 4}. | unsettled | checked | [chart-c026ab](evidence/chart-64fcc7.json) | the chart over held 0..4 |
| A1 | Always | Always, while Halted, live is clear. | settled | checked | [tlc-47e689](evidence/tlc-A1-1d90d3.json), [blunder-178da3](evidence/blunder-A1-cf3362.json) | amounts up to 2; held up to 4 |
| W1 | Walk | Walk Round-trip: from Open, exit amount 2, enter amount 2; ends Open with held 0; move sent once; mint sent once; burn sent once. | unsettled | checked, grounded | [chart-c026ab](evidence/chart-64fcc7.json), [tlc-5d358b](evidence/tlc-W1-fb78f0.json) | amounts up to 2 |
| W2 | Walk | Walk Stopped: from Open, exit amount 1, halt, exit amount 1 refused, enter amount 1; ends Halted with held 0. | unsettled | checked, grounded | [chart-c026ab](evidence/chart-64fcc7.json), [tlc-b5f968](evidence/tlc-W2-f022fb.json) | amounts up to 2; held up to 4 |
| X1 | Seam | Seam with vault: move and release cross from Adapter to Vault carrying the amount. | unsettled | checked |  |  |
| X2 | Seam | Seam with token: mint and burn cross from Adapter to Token carrying the amount. | unsettled | checked |  |  |
| X3 | Seam | Seam with breaker: halt crosses from Breaker to Adapter carrying nothing. | unsettled | checked |  |  |
| K1 | Guarantee | Credit held by the adapter equals the token supply. Backing: record adapter#property:held-equals-supply. | unsettled | backed |  |  |
| T1 | Words only | This piece promises nothing eventual. | unsettled | text |  |  |

| guarantee | backing | status |
| --- | --- | --- |
| K1 | record adapter#property:held-equals-supply | backed |

Used by: control, supply
Summary: 20 passages · settled 11 · confirmed 11 · unsettled 9 · checked 18 · backed 1 · text 1 · prose@3ae029
Flags: review owed (no review at prose@3ae029)
Next: Review — no review at prose@3ae029
Since last rebuild: first rebuild

```json
{
  "kind": "part",
  "id": "adapter",
  "title": "Adapter",
  "tier": "modeled",
  "module": "adapter",
  "rebuilt": "2026-11-08T23:40:32Z",
  "plugin": "0.1.1",
  "summary": {"passages":20,"settled":11,"confirmed":11,"unsettled":9,"rejected":0,"proved":0,"checked":18,"drawn":0,"pending":0,"lapsed":0,"miscalled":0,"hollow":0,"held":0,"owed":0,"backed":1,"assumed":0,"unresolved":0,"doubtsOpen":0,"text":1,"given":0},
  "marks": {
    "S1": {"mark":"checked","trials":["2026-11-08-2337-chart-c026ab","2026-11-08-2337-tlc-5d358b"],"entries":["chart-64fcc7","tlc-W1-fb78f0"],"reach":"amounts up to 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "S2": {"mark":"checked","trials":["2026-11-08-2337-chart-c026ab","2026-11-08-2337-tlc-5d358b"],"entries":["chart-64fcc7","tlc-W1-fb78f0"],"reach":"amounts up to 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "E1": {"mark":"checked","trials":["2026-11-08-2337-chart-c026ab","2026-11-08-2337-tlc-5d358b"],"entries":["chart-64fcc7","tlc-W1-fb78f0"],"reach":"amounts up to 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "E2": {"mark":"checked","trials":["2026-11-08-2337-chart-c026ab","2026-11-08-2337-tlc-5d358b"],"entries":["chart-64fcc7","tlc-W1-fb78f0"],"reach":"amounts up to 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "E3": {"mark":"checked","trials":["2026-11-08-2337-chart-c026ab","2026-11-08-2337-tlc-5d358b"],"entries":["chart-64fcc7","tlc-W1-fb78f0"],"reach":"amounts up to 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "M1": {"mark":"checked","trials":["2026-11-08-2337-chart-c026ab","2026-11-08-2337-tlc-5d358b"],"entries":["chart-64fcc7","tlc-W1-fb78f0"],"reach":"amounts up to 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "M2": {"mark":"checked","trials":["2026-11-08-2337-chart-c026ab","2026-11-08-2337-tlc-5d358b"],"entries":["chart-64fcc7","tlc-W1-fb78f0"],"reach":"amounts up to 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "M3": {"mark":"checked","trials":["2026-11-08-2337-chart-c026ab","2026-11-08-2337-tlc-b5f968"],"entries":["chart-64fcc7","tlc-W2-f022fb"],"reach":"amounts up to 2; held up to 4","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "M4": {"mark":"checked","trials":["2026-11-08-2337-chart-c026ab","2026-11-08-2337-tlc-5d358b"],"entries":["chart-64fcc7","tlc-W1-fb78f0"],"reach":"amounts up to 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "R1": {"mark":"checked","trials":["2026-11-08-2337-chart-c026ab","2026-11-08-2337-tlc-5d358b"],"entries":["chart-64fcc7","tlc-W1-fb78f0"],"reach":"amounts up to 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "R2": {"mark":"checked","trials":["2026-11-08-2337-chart-c026ab"],"entries":["chart-64fcc7"],"reach":"the chart over held 0..4","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":false,"confirmed":false},
    "R3": {"mark":"checked","trials":["2026-11-08-2337-chart-c026ab"],"entries":["chart-64fcc7"],"reach":"the chart over held 0..4","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":false,"confirmed":false},
    "A1": {"mark":"checked","trials":["2026-11-08-2337-tlc-47e689","2026-11-08-2337-blunder-178da3"],"entries":["tlc-A1-1d90d3","blunder-A1-cf3362"],"reach":"amounts up to 2; held up to 4","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "W1": {"mark":"checked","trials":["2026-11-08-2337-chart-c026ab","2026-11-08-2337-tlc-5d358b"],"entries":["chart-64fcc7","tlc-W1-fb78f0"],"reach":"amounts up to 2","doubt":[],"owner":"unsettled","grounded":true,"groundedBy":"2026-11-08-2337-external-5bdd8c","chartCovered":true,"modelCovered":true,"confirmed":false},
    "W2": {"mark":"checked","trials":["2026-11-08-2337-chart-c026ab","2026-11-08-2337-tlc-b5f968"],"entries":["chart-64fcc7","tlc-W2-f022fb"],"reach":"amounts up to 2; held up to 4","doubt":[],"owner":"unsettled","grounded":true,"groundedBy":"2026-11-08-2337-external-5bdd8c","chartCovered":true,"modelCovered":true,"confirmed":false},
    "X1": {"mark":"checked","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false},
    "X2": {"mark":"checked","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false},
    "X3": {"mark":"checked","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false},
    "K1": {"mark":"backed","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false},
    "T1": {"mark":"text","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false}
  },
  "owner": {"S1":"settled","S2":"settled","E1":"settled","E2":"settled","E3":"settled","M1":"settled","M2":"settled","M3":"settled","M4":"settled","R1":"settled","R2":"unsettled","R3":"unsettled","A1":"settled","W1":"unsettled","W2":"unsettled","X1":"unsettled","X2":"unsettled","X3":"unsettled","K1":"unsettled","T1":"unsettled"},
  "backing": {"K1":{"status":"backed","hash":"7b42dc7c1831a88a","path":"modules/adapter/behavior/invariants.md"}},
  "pins": {},
  "usedBy": ["control","supply"],
  "answers": [
    {"entry":"chart-64fcc7","trial":"2026-11-08-2337-chart-c026ab","at":"2026-11-08T23:37:09.153Z","kind":"chart","checker":"chart","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"3ae029"},
    {"entry":"tlc-A1-1d90d3","trial":"2026-11-08-2337-tlc-47e689","at":"2026-11-08T23:37:09.512Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"3ae029"},
    {"entry":"tlc-W2-f022fb","trial":"2026-11-08-2337-tlc-b5f968","at":"2026-11-08T23:37:10.958Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"3ae029"},
    {"entry":"tlc-W1-fb78f0","trial":"2026-11-08-2337-tlc-5d358b","at":"2026-11-08T23:37:12.174Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"3ae029"},
    {"entry":"blunder-A1-cf3362","trial":"2026-11-08-2337-blunder-178da3","at":"2026-11-08T23:37:13.389Z","kind":"blunder","checker":"tlc","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"3ae029"},
    {"entry":"external-W1-W2-98c5aa","trial":"2026-11-08-2337-external-5bdd8c","at":"2026-11-08T23:37:14.572Z","kind":"external","checker":"external","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"3ae029"}
  ],
  "removed": [],
  "tripwires": [],
  "flags": [{"name":"review owed","where":"no review at prose@3ae029"}],
  "route": {"pass":"Review","why":["no review at prose@3ae029"],"read":"spec/review.md"}
}
```
