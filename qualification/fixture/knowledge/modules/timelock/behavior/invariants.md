# Invariants

```yaml
invariants:
  - id: execute-after-eta
    name: Execute after eta
    kind: timelock
    statement: execute succeeds only at or after the plan's eta
    applies_to:
      contracts:
        - contract:timelock
      flows: []
      state_reads: []
    check_hint: Schedule, then execute one tick early and expect a revert; execute at the eta succeeds.
    reference_refs:
      - timelock-pinned-source
  - id: schedule-sets-eta
    name: Schedule sets eta
    kind: timelock
    statement: schedule records the plan's eta as the current tick plus delay
    applies_to:
      contracts:
        - contract:timelock
      flows: []
      state_reads: []
    check_hint: Read eta(plan) right after schedule and compare with the block number plus delay.
    reference_refs:
      - timelock-pinned-source
```

A later change of the delay does not move the eta of plans already scheduled.
