# Ledger: Oracle   rebuilt 2026-11-08T23:40:32Z   prose@e20cbb   answers 7   decisions 0
Written by dossier render from the records. The JSON block at the end says the same for tools.
verify: ok · Oracle · dossier 0.1.1 · 0 tripwires

| id | kind | passage | owner | machine | answers | reach |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | State | Fresh: the price was posted since the last block. | unsettled | checked | [chart-5c0890](evidence/chart-64fcc7.json), [tlc-f0ca57](evidence/tlc-W1-285c2c.json) | stale up to 3 |
| S2 | State | Stale: at least one block passed since the last post. | unsettled | checked | [chart-5c0890](evidence/chart-64fcc7.json), [tlc-f0ca57](evidence/tlc-W1-285c2c.json) | stale up to 3 |
| E1 | Event | tick, from the chain: one block passes. | unsettled | checked | [chart-5c0890](evidence/chart-64fcc7.json), [tlc-f0ca57](evidence/tlc-W1-285c2c.json) | stale up to 3 |
| E2 | Event | post-a, from lane A: lane A posts a price. Carries value, a count from 0 to 4. | unsettled | checked | [chart-5c0890](evidence/chart-64fcc7.json), [tlc-f0ca57](evidence/tlc-W1-285c2c.json) | stale up to 3 |
| E3 | Event | post-b, from lane B: lane B posts a price. Carries value, a count from 0 to 4. | unsettled | checked | [chart-5c0890](evidence/chart-64fcc7.json), [tlc-879601](evidence/tlc-W2-c3848e.json) | stale up to 3; price and last up to 4 |
| M1 | Move | When Fresh receives tick, it becomes Stale, with stale 1. | unsettled | checked | [chart-5c0890](evidence/chart-64fcc7.json), [tlc-f0ca57](evidence/tlc-W1-285c2c.json) | stale up to 3 |
| M2 | Move | When Stale receives tick and stale is below 3, it stays Stale, stale grows by one. | unsettled | drawn | [chart-5c0890](evidence/chart-64fcc7.json) | the chart over stale 0..3, price and last 0..4 |
| M3 | Move | When Stale receives tick and stale is 3, it stays Stale. | unsettled | drawn, doubt D1 | [chart-5c0890](evidence/chart-64fcc7.json) | the chart over stale 0..3, price and last 0..4 |
| M4 | Move | When Stale receives post-a, it becomes Fresh, with stale 0, last becomes price, price becomes value. | unsettled | checked | [chart-5c0890](evidence/chart-64fcc7.json), [tlc-f0ca57](evidence/tlc-W1-285c2c.json) | stale up to 3 |
| M5 | Move | When Stale receives post-b, it becomes Fresh, with stale 0, last becomes price, price becomes value. | unsettled | checked | [chart-5c0890](evidence/chart-64fcc7.json), [tlc-879601](evidence/tlc-W2-c3848e.json) | stale up to 3; price and last up to 4 |
| R1 | Refusal | In Fresh, post-a and post-b are refused. | unsettled | checked | [chart-5c0890](evidence/chart-64fcc7.json), [tlc-f0ca57](evidence/tlc-W1-285c2c.json) | stale up to 3 |
| A1 | Always | Always, while Fresh, stale is 0. | unsettled | checked | [tlc-55837b](evidence/tlc-A1-A2-N1-2d9e4b.json), [blunder-0fae6c](evidence/blunder-A1-9d3c7c.json) | stale up to 3; price up to 4 |
| A2 | Always | Always, {price + 1 >= last and last + 1 >= price}, given G3 and G4. | unsettled | checked, given G3 G4 | [tlc-55837b](evidence/tlc-A1-A2-N1-2d9e4b.json), [blunder-cf93a1](evidence/blunder-A2-a033c6.json) | stale up to 3; price up to 4 |
| N1 | Within | Within 1 tick of Stale, Fresh, given G1 and G2. | unsettled | checked, given G1 G2 | [tlc-55837b](evidence/tlc-A1-A2-N1-2d9e4b.json), [blunder-abc576](evidence/blunder-N1-a38027.json) | stale up to 3; price up to 4 |
| G1 | Given | Given that lane A posts a stale oracle before the next block. If this is false, N1 rests on G2 alone. Actor: lane A, on post-a, prompt. | unsettled | given |  |  |
| G2 | Given | Given that lane B posts a stale oracle before the next block. If this is false, N1 rests on G1 alone. Actor: lane B, on post-b, prompt. | unsettled | given |  |  |
| G3 | Given | Given that lane A moves the price by at most one step per post. If this is false, A2 is void. Actor: lane A, on post-a, only when {value + 1 >= price and value <= price + 1}. | unsettled | given |  |  |
| G4 | Given | Given that lane B moves the price by at most one step per post. If this is false, A2 is void. Actor: lane B, on post-b, only when {value + 1 >= price and value <= price + 1}. | unsettled | given |  |  |
| W1 | Walk | Walk Refresh: from Fresh, tick, post-a value 2; ends Fresh with stale 0 and price 2. | unsettled | checked | [chart-5c0890](evidence/chart-64fcc7.json), [tlc-f0ca57](evidence/tlc-W1-285c2c.json) | stale up to 3 |
| W2 | Walk | Walk Backup: from Fresh, tick, post-b value 3, post-a value 3 refused; ends Fresh with price 3 and last 2. | unsettled | checked | [chart-5c0890](evidence/chart-64fcc7.json), [tlc-879601](evidence/tlc-W2-c3848e.json) | stale up to 3; price and last up to 4 |
| K1 | Guarantee | stale never exceeds one block while a lane is live. Backing: record oracle#property:freshness. | unsettled | backed |  |  |
| T1 | Words only | Where a lane's price comes from is the lanes' business; what is modeled is the price's age and the step a post may move it. | unsettled | text |  |  |

| guarantee | backing | status |
| --- | --- | --- |
| K1 | record oracle#property:freshness | backed |

Used by: upkeep
Summary: 22 passages · unsettled 22 · checked 14 · drawn 2 · backed 1 · doubts open 1 · text 1 · given 4 · prose@e20cbb
Flags: doubt open (D1 on M3, assumed a) · review owed (no review at prose@e20cbb)
Next: Encode — not tried on the model side: M2 M3
Since last rebuild: first rebuild

```json
{
  "kind": "part",
  "id": "oracle",
  "title": "Oracle",
  "tier": "modeled",
  "module": "oracle",
  "rebuilt": "2026-11-08T23:40:32Z",
  "plugin": "0.1.1",
  "summary": {"passages":22,"settled":0,"confirmed":0,"unsettled":22,"rejected":0,"proved":0,"checked":14,"drawn":2,"pending":0,"lapsed":0,"miscalled":0,"hollow":0,"held":0,"owed":0,"backed":1,"assumed":0,"unresolved":0,"doubtsOpen":1,"text":1,"given":4},
  "marks": {
    "S1": {"mark":"checked","trials":["2026-11-08-2337-chart-5c0890","2026-11-08-2337-tlc-f0ca57"],"entries":["chart-64fcc7","tlc-W1-285c2c"],"reach":"stale up to 3","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":false},
    "S2": {"mark":"checked","trials":["2026-11-08-2337-chart-5c0890","2026-11-08-2337-tlc-f0ca57"],"entries":["chart-64fcc7","tlc-W1-285c2c"],"reach":"stale up to 3","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":false},
    "E1": {"mark":"checked","trials":["2026-11-08-2337-chart-5c0890","2026-11-08-2337-tlc-f0ca57"],"entries":["chart-64fcc7","tlc-W1-285c2c"],"reach":"stale up to 3","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":false},
    "E2": {"mark":"checked","trials":["2026-11-08-2337-chart-5c0890","2026-11-08-2337-tlc-f0ca57"],"entries":["chart-64fcc7","tlc-W1-285c2c"],"reach":"stale up to 3","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":false},
    "E3": {"mark":"checked","trials":["2026-11-08-2337-chart-5c0890","2026-11-08-2337-tlc-879601"],"entries":["chart-64fcc7","tlc-W2-c3848e"],"reach":"stale up to 3; price and last up to 4","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":false},
    "M1": {"mark":"checked","trials":["2026-11-08-2337-chart-5c0890","2026-11-08-2337-tlc-f0ca57"],"entries":["chart-64fcc7","tlc-W1-285c2c"],"reach":"stale up to 3","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":false},
    "M2": {"mark":"drawn","trials":["2026-11-08-2337-chart-5c0890"],"entries":["chart-64fcc7"],"reach":"the chart over stale 0..3, price and last 0..4","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":false,"confirmed":false},
    "M3": {"mark":"drawn","trials":["2026-11-08-2337-chart-5c0890"],"entries":["chart-64fcc7"],"reach":"the chart over stale 0..3, price and last 0..4","doubt":["D1"],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":false,"confirmed":false},
    "M4": {"mark":"checked","trials":["2026-11-08-2337-chart-5c0890","2026-11-08-2337-tlc-f0ca57"],"entries":["chart-64fcc7","tlc-W1-285c2c"],"reach":"stale up to 3","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":false},
    "M5": {"mark":"checked","trials":["2026-11-08-2337-chart-5c0890","2026-11-08-2337-tlc-879601"],"entries":["chart-64fcc7","tlc-W2-c3848e"],"reach":"stale up to 3; price and last up to 4","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":false},
    "R1": {"mark":"checked","trials":["2026-11-08-2337-chart-5c0890","2026-11-08-2337-tlc-f0ca57"],"entries":["chart-64fcc7","tlc-W1-285c2c"],"reach":"stale up to 3","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":false},
    "A1": {"mark":"checked","trials":["2026-11-08-2337-tlc-55837b","2026-11-08-2337-blunder-0fae6c"],"entries":["tlc-A1-A2-N1-2d9e4b","blunder-A1-9d3c7c"],"reach":"stale up to 3; price up to 4","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":false},
    "A2": {"mark":"checked","trials":["2026-11-08-2337-tlc-55837b","2026-11-08-2337-blunder-cf93a1"],"entries":["tlc-A1-A2-N1-2d9e4b","blunder-A2-a033c6"],"reach":"stale up to 3; price up to 4","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":true,"confirmed":false},
    "N1": {"mark":"checked","trials":["2026-11-08-2337-tlc-55837b","2026-11-08-2337-blunder-abc576"],"entries":["tlc-A1-A2-N1-2d9e4b","blunder-N1-a38027"],"reach":"stale up to 3; price up to 4","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":true,"confirmed":false},
    "G1": {"mark":"given","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false},
    "G2": {"mark":"given","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false},
    "G3": {"mark":"given","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false},
    "G4": {"mark":"given","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false},
    "W1": {"mark":"checked","trials":["2026-11-08-2337-chart-5c0890","2026-11-08-2337-tlc-f0ca57"],"entries":["chart-64fcc7","tlc-W1-285c2c"],"reach":"stale up to 3","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":false},
    "W2": {"mark":"checked","trials":["2026-11-08-2337-chart-5c0890","2026-11-08-2337-tlc-879601"],"entries":["chart-64fcc7","tlc-W2-c3848e"],"reach":"stale up to 3; price and last up to 4","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":false},
    "K1": {"mark":"backed","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false},
    "T1": {"mark":"text","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false}
  },
  "owner": {"S1":"unsettled","S2":"unsettled","E1":"unsettled","E2":"unsettled","E3":"unsettled","M1":"unsettled","M2":"unsettled","M3":"unsettled","M4":"unsettled","M5":"unsettled","R1":"unsettled","A1":"unsettled","A2":"unsettled","N1":"unsettled","G1":"unsettled","G2":"unsettled","G3":"unsettled","G4":"unsettled","W1":"unsettled","W2":"unsettled","K1":"unsettled","T1":"unsettled"},
  "backing": {"K1":{"status":"backed","hash":"54717f13065bd868","path":"modules/oracle/behavior/invariants.md"}},
  "pins": {},
  "usedBy": ["upkeep"],
  "answers": [
    {"entry":"chart-64fcc7","trial":"2026-11-08-2337-chart-5c0890","at":"2026-11-08T23:37:44.100Z","kind":"chart","checker":"chart","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"e20cbb"},
    {"entry":"tlc-A1-A2-N1-2d9e4b","trial":"2026-11-08-2337-tlc-55837b","at":"2026-11-08T23:37:44.743Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"e20cbb"},
    {"entry":"tlc-W2-c3848e","trial":"2026-11-08-2337-tlc-879601","at":"2026-11-08T23:37:47.108Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"e20cbb"},
    {"entry":"tlc-W1-285c2c","trial":"2026-11-08-2337-tlc-f0ca57","at":"2026-11-08T23:37:49.222Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"e20cbb"},
    {"entry":"blunder-A1-9d3c7c","trial":"2026-11-08-2337-blunder-0fae6c","at":"2026-11-08T23:37:51.424Z","kind":"blunder","checker":"tlc","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"e20cbb"},
    {"entry":"blunder-N1-a38027","trial":"2026-11-08-2337-blunder-abc576","at":"2026-11-08T23:37:53.500Z","kind":"blunder","checker":"tlc","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"e20cbb"},
    {"entry":"blunder-A2-a033c6","trial":"2026-11-08-2337-blunder-cf93a1","at":"2026-11-08T23:37:55.527Z","kind":"blunder","checker":"tlc","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"e20cbb"}
  ],
  "removed": [],
  "tripwires": [],
  "flags": [{"name":"doubt open","where":"D1 on M3, assumed a"},{"name":"review owed","where":"no review at prose@e20cbb"}],
  "route": {"pass":"Encode","why":["not tried on the model side: M2 M3"],"read":"spec/models.md"}
}
```
