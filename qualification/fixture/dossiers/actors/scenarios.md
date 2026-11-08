# Scenarios

A mode for every actor. `all-honest` is every actor honest; a scenario declared stronger than another lets a proof under it imply the weaker one. A mode with a window holds from one tick until another and is honest outside it, and a start names the values a cell begins from.

```yaml
scenarios:
  - id: all-honest
    modes: {}
  - id: user-malicious
    modes: { user: malicious, holder: malicious }
    stronger_than: [all-honest]
  - id: governance-captured
    modes: { governance: malicious }
    stronger_than: [all-honest]
  - id: executor-offline
    modes: { public: offline }
  - id: lane-a-offline
    modes: { lane-a: offline }
  - id: lane-a-captured
    modes: { lane-a: malicious }
    stronger_than: [all-honest]
  - id: lanes-offline
    modes: { lane-a: offline, lane-b: offline }
  - id: lanes-down-one
    modes:
      lane-a: { mode: offline, from: 0, until: 1 }
      lane-b: { mode: offline, from: 0, until: 1 }
    notes: both lanes down for the first block only
  - id: lanes-down-two
    modes:
      lane-a: { mode: offline, from: 0, until: 2 }
      lane-b: { mode: offline, from: 0, until: 2 }
    notes: both lanes down for the first two blocks
  - id: stale-start
    start: { oracle.state: Stale, oracle.stale: 3 }
    notes: the price is already three blocks stale when the lanes are live
```
