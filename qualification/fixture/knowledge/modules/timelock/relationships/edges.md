# Edges

```yaml
edges:
  - id: governance-schedules
    type: privileged_call
    from: actor:governance
    to: contract:timelock
    conditions:
      - schedule and cancel require msg.sender to be the current governance.
    reference_refs:
      - timelock-pinned-source
  - id: executor-executes
    type: calls
    from: actor:executor
    to: contract:timelock
    conditions:
      - execute requires a scheduled plan whose eta is at or before the current tick.
    reference_refs:
      - timelock-pinned-source
  - id: timelock-changes-vault
    type: controls
    from: contract:timelock
    to: vault#contract:vault
    conditions:
      - The timelock is the vault's only admin; an executed plan calls setCeiling.
    reference_refs:
      - timelock-pinned-source
edge_gaps: []
```
