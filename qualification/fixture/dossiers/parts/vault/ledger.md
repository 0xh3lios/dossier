# Ledger: Vault   rebuilt 2026-11-08T23:40:32Z   prose@2fb3b4   answers 8   decisions 2
Written by dossier render from the records. The JSON block at the end says the same for tools.
verify: ok · Vault · dossier 0.1.1 · 0 tripwires

| id | kind | passage | owner | machine | answers | reach |
| --- | --- | --- | --- | --- | --- | --- |
| S1 | State | Open: the vault accepts borrowing, repayments and credit moves. | settled | checked | [chart-a57cb9](evidence/chart-64fcc7.json), [tlc-80392a](evidence/tlc-W1-a19770.json) | amounts up to 2 |
| E1 | Event | borrow, from the User: takes on debt against collateral. Carries amount, an amount of HRD up to 2. | settled | checked | [chart-a57cb9](evidence/chart-64fcc7.json), [tlc-80392a](evidence/tlc-W1-a19770.json) | amounts up to 2 |
| E2 | Event | repay, from the User: repays debt from free credit. Carries amount, an amount of HRD up to 2. | settled | checked | [chart-a57cb9](evidence/chart-64fcc7.json), [tlc-80392a](evidence/tlc-W1-a19770.json) | amounts up to 2 |
| E3 | Event | move, from the Adapter: free credit is handed to the adapter. Carries amount, an amount of HRD up to 2. | settled | checked | [chart-a57cb9](evidence/chart-64fcc7.json), [tlc-80392a](evidence/tlc-W1-a19770.json) | amounts up to 2 |
| E4 | Event | release, from the Adapter: credit held by the adapter returns to the user. Carries amount, an amount of HRD up to 2. | settled | checked | [chart-a57cb9](evidence/chart-64fcc7.json), [tlc-80392a](evidence/tlc-W1-a19770.json) | amounts up to 2 |
| E5 | Event | change, from the Timelock: an executed plan raises the ceiling by one. | settled | checked | [chart-a57cb9](evidence/chart-64fcc7.json), [tlc-80392a](evidence/tlc-W1-a19770.json) | amounts up to 2 |
| M1 | Move | When Open receives borrow and {debt + amount <= ceiling}, it stays Open, debt grows by amount, free grows by amount. | settled | checked | [chart-a57cb9](evidence/chart-64fcc7.json), [tlc-80392a](evidence/tlc-W1-a19770.json) | amounts up to 2 |
| M2 | Move | When Open receives repay and {amount <= free} and {amount <= debt}, it stays Open, debt drops by amount, free drops by amount. | settled | checked | [chart-a57cb9](evidence/chart-64fcc7.json), [tlc-80392a](evidence/tlc-W1-a19770.json) | amounts up to 2 |
| M3 | Move | When Open receives move and {amount <= free}, it stays Open, free drops by amount, issued grows by amount. | settled | checked | [chart-a57cb9](evidence/chart-64fcc7.json), [tlc-80392a](evidence/tlc-W1-a19770.json) | amounts up to 2 |
| M4 | Move | When Open receives release and {amount <= issued}, it stays Open, issued drops by amount, free grows by amount. | settled | checked | [chart-a57cb9](evidence/chart-64fcc7.json), [tlc-80392a](evidence/tlc-W1-a19770.json) | amounts up to 2 |
| M5 | Move | When Open receives change and ceiling is below 4, it stays Open, ceiling grows by one. | unsettled | checked | [chart-a57cb9](evidence/chart-64fcc7.json), [tlc-80392a](evidence/tlc-W1-a19770.json) | amounts up to 2 |
| M6 | Move | When Open receives change and ceiling is 4, it stays Open. | unsettled | checked | [chart-a57cb9](evidence/chart-64fcc7.json), [tlc-d12ab1](evidence/tlc-A1-A2-9b40ec.json) | amounts up to 2; debt, free, issued up to 4; ceiling 2..4 |
| R1 | Refusal | In Open, borrow is refused when {debt + amount > ceiling}. | unsettled | checked | [chart-a57cb9](evidence/chart-64fcc7.json) | the chart over debt, free, issued 0..4 and ceiling 2..4 |
| R2 | Refusal | In Open, repay is refused when {amount > free or amount > debt}. | unsettled | checked | [chart-a57cb9](evidence/chart-64fcc7.json) | the chart over debt, free, issued 0..4 and ceiling 2..4 |
| R3 | Refusal | In Open, move is refused when {amount > free}. | unsettled | checked | [chart-a57cb9](evidence/chart-64fcc7.json) | the chart over debt, free, issued 0..4 and ceiling 2..4 |
| R4 | Refusal | In Open, release is refused when {amount > issued}. | unsettled | checked | [chart-a57cb9](evidence/chart-64fcc7.json) | the chart over debt, free, issued 0..4 and ceiling 2..4 |
| A1 | Always | Always, {debt = free + issued}. | settled | proved | [apalache-22eec8](evidence/apalache-A1-58fbed.json), [blunder-903d9f](evidence/blunder-A1-6fffaa.json) | unbounded; TypeOK and A1 inductive |
| A2 | Always | Always, {debt <= ceiling}. | settled | proved | [apalache-6ed955](evidence/apalache-A2-48fb4e.json), [blunder-c28d86](evidence/blunder-A2-20cffe.json) | unbounded; TypeOK, A1 and A2 inductive |
| W1 | Walk | Walk Borrow: from Open, borrow amount 2, repay amount 1; ends Open with debt 1, free 1. | unsettled | checked, grounded | [chart-a57cb9](evidence/chart-64fcc7.json), [tlc-80392a](evidence/tlc-W1-a19770.json) | amounts up to 2 |
| W2 | Walk | Walk Overdraw: from Open, borrow amount 2, borrow amount 1 refused; ends Open with debt 2. | unsettled | drawn, grounded | [chart-a57cb9](evidence/chart-64fcc7.json) | the chart over debt, free, issued 0..4 and ceiling 2..4 |
| W3 | Walk | Walk Raised: from Open, borrow amount 2, borrow amount 1 refused, change, borrow amount 1; ends Open with debt 3, ceiling 3. | unsettled | drawn, grounded | [chart-a57cb9](evidence/chart-64fcc7.json) | the chart over debt, free, issued 0..4 and ceiling 2..4 |
| X1 | Seam | Seam with adapter: move and release cross from Adapter to Vault carrying the amount. | unsettled | checked |  |  |
| X2 | Seam | Seam with timelock: change crosses from Timelock to Vault carrying nothing. | unsettled | checked |  |  |
| K1 | Guarantee | Debt equals free plus issued on the deployed Vault. Backing: certora certora/Vault.spec#debtEqualsCredit at 1a2b9f8e. | unsettled | backed |  |  |
| K2 | Guarantee | A borrow increases debt by exactly the amount borrowed. Backing: certora certora/Vault.spec#borrowIncreasesDebt at 1a2b9f8e. | unsettled | backed |  |  |
| K3 | Guarantee | Only the Adapter moves credit between free and issued. Backing: certora certora/Vault.spec#onlyAdapterMovesCredit at 1a2b9f8e. | unsettled | backed |  |  |
| K4 | Guarantee | The ceiling is raised only by an executed plan. Backing: none. | rejected | assumed |  |  |
| T1 | Words only | This piece promises nothing eventual. | unsettled | text |  |  |
| T2 | Words only | Collateral and prices are outside the Vault's abstraction; the ceiling stands in for every limit. | unsettled | text |  |  |

| guarantee | backing | status |
| --- | --- | --- |
| K1 | certora certora/Vault.spec#debtEqualsCredit at 1a2b9f8e | backed |
| K2 | certora certora/Vault.spec#borrowIncreasesDebt at 1a2b9f8e | backed |
| K3 | certora certora/Vault.spec#onlyAdapterMovesCredit at 1a2b9f8e | backed |
| K4 | none | assumed |

Used by: control, supply
Summary: 29 passages · settled 12 · confirmed 12 · unsettled 16 · rejected 1 · proved 2 · checked 19 · drawn 2 · backed 3 · assumed 1 · text 2 · prose@2fb3b4
Flags: review owed (no review at prose@2fb3b4)
Next: Write — rejected: K4
Since last rebuild: first rebuild

```json
{
  "kind": "part",
  "id": "vault",
  "title": "Vault",
  "tier": "modeled",
  "module": "vault",
  "rebuilt": "2026-11-08T23:40:32Z",
  "plugin": "0.1.1",
  "summary": {"passages":29,"settled":12,"confirmed":12,"unsettled":16,"rejected":1,"proved":2,"checked":19,"drawn":2,"pending":0,"lapsed":0,"miscalled":0,"hollow":0,"held":0,"owed":0,"backed":3,"assumed":1,"unresolved":0,"doubtsOpen":0,"text":2,"given":0},
  "marks": {
    "S1": {"mark":"checked","trials":["2026-11-08-2336-chart-a57cb9","2026-11-08-2336-tlc-80392a"],"entries":["chart-64fcc7","tlc-W1-a19770"],"reach":"amounts up to 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "E1": {"mark":"checked","trials":["2026-11-08-2336-chart-a57cb9","2026-11-08-2336-tlc-80392a"],"entries":["chart-64fcc7","tlc-W1-a19770"],"reach":"amounts up to 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "E2": {"mark":"checked","trials":["2026-11-08-2336-chart-a57cb9","2026-11-08-2336-tlc-80392a"],"entries":["chart-64fcc7","tlc-W1-a19770"],"reach":"amounts up to 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "E3": {"mark":"checked","trials":["2026-11-08-2336-chart-a57cb9","2026-11-08-2336-tlc-80392a"],"entries":["chart-64fcc7","tlc-W1-a19770"],"reach":"amounts up to 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "E4": {"mark":"checked","trials":["2026-11-08-2336-chart-a57cb9","2026-11-08-2336-tlc-80392a"],"entries":["chart-64fcc7","tlc-W1-a19770"],"reach":"amounts up to 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "E5": {"mark":"checked","trials":["2026-11-08-2336-chart-a57cb9","2026-11-08-2336-tlc-80392a"],"entries":["chart-64fcc7","tlc-W1-a19770"],"reach":"amounts up to 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "M1": {"mark":"checked","trials":["2026-11-08-2336-chart-a57cb9","2026-11-08-2336-tlc-80392a"],"entries":["chart-64fcc7","tlc-W1-a19770"],"reach":"amounts up to 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "M2": {"mark":"checked","trials":["2026-11-08-2336-chart-a57cb9","2026-11-08-2336-tlc-80392a"],"entries":["chart-64fcc7","tlc-W1-a19770"],"reach":"amounts up to 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "M3": {"mark":"checked","trials":["2026-11-08-2336-chart-a57cb9","2026-11-08-2336-tlc-80392a"],"entries":["chart-64fcc7","tlc-W1-a19770"],"reach":"amounts up to 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "M4": {"mark":"checked","trials":["2026-11-08-2336-chart-a57cb9","2026-11-08-2336-tlc-80392a"],"entries":["chart-64fcc7","tlc-W1-a19770"],"reach":"amounts up to 2","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "M5": {"mark":"checked","trials":["2026-11-08-2336-chart-a57cb9","2026-11-08-2336-tlc-80392a"],"entries":["chart-64fcc7","tlc-W1-a19770"],"reach":"amounts up to 2","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":false},
    "M6": {"mark":"checked","trials":["2026-11-08-2336-chart-a57cb9","2026-11-08-2336-tlc-d12ab1"],"entries":["chart-64fcc7","tlc-A1-A2-9b40ec"],"reach":"amounts up to 2; debt, free, issued up to 4; ceiling 2..4","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":false},
    "R1": {"mark":"checked","trials":["2026-11-08-2336-chart-a57cb9"],"entries":["chart-64fcc7"],"reach":"the chart over debt, free, issued 0..4 and ceiling 2..4","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":false,"confirmed":false},
    "R2": {"mark":"checked","trials":["2026-11-08-2336-chart-a57cb9"],"entries":["chart-64fcc7"],"reach":"the chart over debt, free, issued 0..4 and ceiling 2..4","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":false,"confirmed":false},
    "R3": {"mark":"checked","trials":["2026-11-08-2336-chart-a57cb9"],"entries":["chart-64fcc7"],"reach":"the chart over debt, free, issued 0..4 and ceiling 2..4","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":false,"confirmed":false},
    "R4": {"mark":"checked","trials":["2026-11-08-2336-chart-a57cb9"],"entries":["chart-64fcc7"],"reach":"the chart over debt, free, issued 0..4 and ceiling 2..4","doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":false,"confirmed":false},
    "A1": {"mark":"proved","trials":["2026-11-08-2336-apalache-22eec8","2026-11-08-2337-blunder-903d9f"],"entries":["apalache-A1-58fbed","blunder-A1-6fffaa"],"reach":"unbounded; TypeOK and A1 inductive","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "A2": {"mark":"proved","trials":["2026-11-08-2337-apalache-6ed955","2026-11-08-2337-blunder-c28d86"],"entries":["apalache-A2-48fb4e","blunder-A2-20cffe"],"reach":"unbounded; TypeOK, A1 and A2 inductive","doubt":[],"owner":"settled","grounded":false,"groundedBy":null,"chartCovered":true,"modelCovered":true,"confirmed":true},
    "W1": {"mark":"checked","trials":["2026-11-08-2336-chart-a57cb9","2026-11-08-2336-tlc-80392a"],"entries":["chart-64fcc7","tlc-W1-a19770"],"reach":"amounts up to 2","doubt":[],"owner":"unsettled","grounded":true,"groundedBy":"2026-11-08-2337-external-adf0ef","chartCovered":true,"modelCovered":true,"confirmed":false},
    "W2": {"mark":"drawn","trials":["2026-11-08-2336-chart-a57cb9"],"entries":["chart-64fcc7"],"reach":"the chart over debt, free, issued 0..4 and ceiling 2..4","doubt":[],"owner":"unsettled","grounded":true,"groundedBy":"2026-11-08-2337-external-adf0ef","chartCovered":true,"modelCovered":false,"confirmed":false},
    "W3": {"mark":"drawn","trials":["2026-11-08-2336-chart-a57cb9"],"entries":["chart-64fcc7"],"reach":"the chart over debt, free, issued 0..4 and ceiling 2..4","doubt":[],"owner":"unsettled","grounded":true,"groundedBy":"2026-11-08-2337-external-adf0ef","chartCovered":true,"modelCovered":false,"confirmed":false},
    "X1": {"mark":"checked","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false},
    "X2": {"mark":"checked","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false},
    "K1": {"mark":"backed","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false},
    "K2": {"mark":"backed","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false},
    "K3": {"mark":"backed","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false},
    "K4": {"mark":"assumed","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"rejected","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false},
    "T1": {"mark":"text","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false},
    "T2": {"mark":"text","trials":[],"entries":[],"reach":null,"doubt":[],"owner":"unsettled","grounded":false,"groundedBy":null,"chartCovered":false,"modelCovered":false,"confirmed":false}
  },
  "owner": {"S1":"settled","E1":"settled","E2":"settled","E3":"settled","E4":"settled","E5":"settled","M1":"settled","M2":"settled","M3":"settled","M4":"settled","M5":"unsettled","M6":"unsettled","R1":"unsettled","R2":"unsettled","R3":"unsettled","R4":"unsettled","A1":"settled","A2":"settled","W1":"unsettled","W2":"unsettled","W3":"unsettled","X1":"unsettled","X2":"unsettled","K1":"unsettled","K2":"unsettled","K3":"unsettled","K4":"rejected","T1":"unsettled","T2":"unsettled"},
  "backing": {"K1":{"status":"backed","hash":"48fb01304d30b4b7","path":"modules/vault/source-cache/github/commit-1a2b-9f8e/certora/Vault.spec"},"K2":{"status":"backed","hash":"e8e54bc755943a68","path":"modules/vault/source-cache/github/commit-1a2b-9f8e/certora/Vault.spec"},"K3":{"status":"backed","hash":"bb4712dfb9f4915d","path":"modules/vault/source-cache/github/commit-1a2b-9f8e/certora/Vault.spec"},"K4":{"status":"assumed"}},
  "pins": {"vault#observation:checkpoint-2026-11-01":"f53d903a45677849"},
  "usedBy": ["control","supply"],
  "answers": [
    {"entry":"chart-64fcc7","trial":"2026-11-08-2336-chart-a57cb9","at":"2026-11-08T23:36:47.155Z","kind":"chart","checker":"chart","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"2fb3b4"},
    {"entry":"tlc-A1-A2-9b40ec","trial":"2026-11-08-2336-tlc-d12ab1","at":"2026-11-08T23:36:52.849Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"2fb3b4"},
    {"entry":"tlc-W1-a19770","trial":"2026-11-08-2336-tlc-80392a","at":"2026-11-08T23:36:54.115Z","kind":"tlc","checker":"tlc","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"2fb3b4"},
    {"entry":"apalache-A1-58fbed","trial":"2026-11-08-2336-apalache-22eec8","at":"2026-11-08T23:36:55.301Z","kind":"apalache","checker":"apalache","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"2fb3b4"},
    {"entry":"apalache-A2-48fb4e","trial":"2026-11-08-2337-apalache-6ed955","at":"2026-11-08T23:37:00.507Z","kind":"apalache","checker":"apalache","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"2fb3b4"},
    {"entry":"blunder-A1-6fffaa","trial":"2026-11-08-2337-blunder-903d9f","at":"2026-11-08T23:37:05.504Z","kind":"blunder","checker":"tlc","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"2fb3b4"},
    {"entry":"blunder-A2-20cffe","trial":"2026-11-08-2337-blunder-c28d86","at":"2026-11-08T23:37:06.714Z","kind":"blunder","checker":"tlc","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"2fb3b4"},
    {"entry":"external-W1-W2-W3-1d4587","trial":"2026-11-08-2337-external-adf0ef","at":"2026-11-08T23:37:07.899Z","kind":"external","checker":"external","completed":true,"void":false,"result":"as-called","property":null,"scenario":null,"problems":[],"classification":null,"prose":"2fb3b4"}
  ],
  "removed": [],
  "tripwires": [],
  "flags": [{"name":"review owed","where":"no review at prose@2fb3b4"}],
  "route": {"pass":"Write","why":["rejected: K4"],"read":"spec/language.md"}
}
```
