# Ledger: Token   rebuilt 2026-11-07T23:24:48Z   prose@825926   answers 4   decisions 1
Written by dossier render from the records. The JSON block at the end says the same for tools.
verify: ok · Token · dossier 0.1.0 · 0 tripwires

| id | kind | passage | owner | machine | answers | reach |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | State | Live: the token mints, burns and transfers. | settled | checked | [chart-e9477f](evidence/chart-64fcc7.json), [tlc-84d374](evidence/tlc-A1-09afe0.json) | amounts up to 2; supply up to 4 |
| E1 | Event | mint, from the Adapter: new HRD for credit the adapter now holds. Carries amount, an amount of HRD up to 2. | settled | checked | [chart-e9477f](evidence/chart-64fcc7.json), [tlc-84d374](evidence/tlc-A1-09afe0.json) | amounts up to 2; supply up to 4 |
| E2 | Event | burn, from the Adapter: HRD returned for credit. Carries amount, an amount of HRD up to 2. | settled | checked | [chart-e9477f](evidence/chart-64fcc7.json), [tlc-84d374](evidence/tlc-A1-09afe0.json) | amounts up to 2; supply up to 4 |
| E3 | Event | transfer, from the Holder: HRD changes hands; the supply does not. | settled | checked | [chart-e9477f](evidence/chart-64fcc7.json), [tlc-84d374](evidence/tlc-A1-09afe0.json) | amounts up to 2; supply up to 4 |
| M1 | Move | When Live receives mint and {supply + amount <= 4}, it stays Live, supply grows by amount. | settled | checked | [chart-e9477f](evidence/chart-64fcc7.json), [tlc-84d374](evidence/tlc-A1-09afe0.json) | amounts up to 2; supply up to 4 |
| M2 | Move | When Live receives burn and {amount <= supply}, it stays Live, supply drops by amount. | settled | checked | [chart-e9477f](evidence/chart-64fcc7.json), [tlc-84d374](evidence/tlc-A1-09afe0.json) | amounts up to 2; supply up to 4 |
| M3 | Move | When Live receives transfer, it stays Live. | settled | checked | [chart-e9477f](evidence/chart-64fcc7.json), [tlc-84d374](evidence/tlc-A1-09afe0.json) | amounts up to 2; supply up to 4 |
| R1 | Refusal | In Live, mint is refused when {supply + amount > 4}. | unsettled | checked | [chart-e9477f](evidence/chart-64fcc7.json) | the chart over supply 0..4 |
| R2 | Refusal | In Live, burn is refused when {amount > supply}. | unsettled | checked | [chart-e9477f](evidence/chart-64fcc7.json) | the chart over supply 0..4 |
| A1 | Always | Always, {supply <= 4}. | settled | checked | [tlc-84d374](evidence/tlc-A1-09afe0.json), [blunder-2431d4](evidence/blunder-A1-2c362d.json) | amounts up to 2; supply up to 4 |
| W1 | Walk | Walk Mint-and-burn: from Live, mint amount 2, transfer, burn amount 2; ends Live with supply 0. | unsettled | drawn, grounded | [chart-e9477f](evidence/chart-64fcc7.json) | the chart over supply 0..4 |
| X1 | Seam | Seam with adapter: mint and burn cross from Adapter to Token carrying the amount. | unsettled | checked |  |  |
| K1 | Guarantee | The supply changes only through mint and burn, which only the Adapter may call. Backing: record token#property:supply-only-via-adapter. | unsettled | backed |  |  |
| T1 | Words only | This piece promises nothing eventual. | unsettled | text |  |  |
| T2 | Words only | Balances per holder are the Holder's business; only the supply is modeled here. | unsettled | text |  |  |

| guarantee | backing | status |
| --- | --- | --- |
| K1 | record token#property:supply-only-via-adapter | backed |

Used by: supply
Summary: 15 passages · settled 8 · confirmed 8 · unsettled 7 · checked 11 · drawn 1 · backed 1 · text 2 · prose@825926
Flags: review owed (no review at prose@825926)
Next: Encode — not tried on the model side: W1
Since last rebuild: first rebuild

```json
{
  "kind": "component",
  "id": "token",
  "title": "Token",
  "tier": "modeled",
  "module": "token",
  "rebuilt": "2026-11-07T23:24:48Z",
  "plugin": "0.1.0",
  "summary": {"passages":15,"settled":8,"confirmed":8,"unsettled":7,"rejected":0,"proved":0,"checked":11,"drawn":1,"pending":0,"lapsed":0,"miscalled":0,"hollow":0,"held":0,"owed":0,"backed":1,"assumed":0,"unresolved":0,"doubtsOpen":0,"text":2,"given":0},
  "marks": {
    "S1": {"mark":"checked","trials":["2026-11-07-2321-chart-e9477f","2026-11-07-2321-tlc-84d374"],"entries":["chart-64fcc7","tlc-A1-09afe0"],"reach":"amounts up to 2; supply up to 4","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "E1": {"mark":"checked","trials":["2026-11-07-2321-chart-e9477f","2026-11-07-2321-tlc-84d374"],"entries":["chart-64fcc7","tlc-A1-09afe0"],"reach":"amounts up to 2; supply up to 4","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "E2": {"mark":"checked","trials":["2026-11-07-2321-chart-e9477f","2026-11-07-2321-tlc-84d374"],"entries":["chart-64fcc7","tlc-A1-09afe0"],"reach":"amounts up to 2; supply up to 4","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "E3": {"mark":"checked","trials":["2026-11-07-2321-chart-e9477f","2026-11-07-2321-tlc-84d374"],"entries":["chart-64fcc7","tlc-A1-09afe0"],"reach":"amounts up to 2; supply up to 4","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "M1": {"mark":"checked","trials":["2026-11-07-2321-chart-e9477f","2026-11-07-2321-tlc-84d374"],"entries":["chart-64fcc7","tlc-A1-09afe0"],"reach":"amounts up to 2; supply up to 4","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "M2": {"mark":"checked","trials":["2026-11-07-2321-chart-e9477f","2026-11-07-2321-tlc-84d374"],"entries":["chart-64fcc7","tlc-A1-09afe0"],"reach":"amounts up to 2; supply up to 4","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "M3": {"mark":"checked","trials":["2026-11-07-2321-chart-e9477f","2026-11-07-2321-tlc-84d374"],"entries":["chart-64fcc7","tlc-A1-09afe0"],"reach":"amounts up to 2; supply up to 4","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "R1": {"mark":"checked","trials":["2026-11-07-2321-chart-e9477f"],"entries":["chart-64fcc7"],"reach":"the chart over supply 0..4","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":false,"confirmed":false},
    "R2": {"mark":"checked","trials":["2026-11-07-2321-chart-e9477f"],"entries":["chart-64fcc7"],"reach":"the chart over supply 0..4","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":false,"confirmed":false},
    "A1": {"mark":"checked","trials":["2026-11-07-2321-tlc-84d374","2026-11-07-2321-blunder-2431d4"],"entries":["tlc-A1-09afe0","blunder-A1-2c362d"],"reach":"amounts up to 2; supply up to 4","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "W1": {"mark":"drawn","trials":["2026-11-07-2321-chart-e9477f"],"entries":["chart-64fcc7"],"reach":"the chart over supply 0..4","doubt":[],"owner":"unsettled","grounded":true,"groundedBy":"2026-11-07-2321-external-5cf0af","chartCovered":true,"modelCovered":false,"confirmed":false},
    "X1": {"mark":"checked","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false},
    "K1": {"mark":"backed","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false},
    "T1": {"mark":"text","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false},
    "T2": {"mark":"text","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false}
  },
  "owner": {"S1":"settled","E1":"settled","E2":"settled","E3":"settled","M1":"settled","M2":"settled","M3":"settled","R1":"unsettled","R2":"unsettled","A1":"settled","W1":"unsettled","X1":"unsettled","K1":"unsettled","T1":"unsettled","T2":"unsettled"},
  "backing": {"K1":{"status":"backed","hash":"9dbf540264cc615a","path":"modules/token/behavior/invariants.md"}},
  "pins": {},
  "usedBy": ["supply"],
  "answers": [
    {"entry":"chart-64fcc7","trial":"2026-11-07-2321-chart-e9477f","at":"2026-11-07T23:21:51.435Z","kind":"chart","checker":"chart","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"825926"},
    {"entry":"tlc-A1-09afe0","trial":"2026-11-07-2321-tlc-84d374","at":"2026-11-07T23:21:51.762Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"825926"},
    {"entry":"blunder-A1-2c362d","trial":"2026-11-07-2321-blunder-2431d4","at":"2026-11-07T23:21:52.934Z","kind":"blunder","checker":"tlc","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"825926"},
    {"entry":"external-W1-08c91c","trial":"2026-11-07-2321-external-5cf0af","at":"2026-11-07T23:21:54.084Z","kind":"external","checker":"external","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"825926"}
  ],
  "removed": [],
  "tripwires": [],
  "flags": [{"name":"review owed","where":"no review at prose@825926"}],
  "route": {"pass":"Encode","why":["not tried on the model side: W1"],"read":"spec/models.md"}
}
```
