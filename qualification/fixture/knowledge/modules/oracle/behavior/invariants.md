# Invariants

```yaml
invariants:
  - id: freshness
    name: Freshness
    kind: oracle
    statement: stale never exceeds one tick while a lane is live
    applies_to:
      contracts:
        - contract:oracle
      flows: []
      state_reads: []
    check_hint: Holds under the keeper liveness assumption only; with both lanes offline stale grows without bound.
    reference_refs:
      - oracle-pinned-source
```
