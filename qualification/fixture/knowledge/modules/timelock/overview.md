# timelock

## Module Record

```yaml
module:
  id: timelock
  name: Harbor Timelock
  status: live
  documentation_group: governance
  protocol_role: Delayed execution of governance's plans against the vault
  main_chains:
    - chain: Ethereum
      chain_id: 1
  related_docs: []
  export_path: governance/timelock
```

## Purpose

Governance schedules a plan; anyone may execute it once its eta has passed; governance may cancel it before then. The delay is the protocol's defense window.

## Protocol Role

The timelock is the only address the vault accepts `setCeiling` from, so every change to the ceiling waits the delay.

## Scope

```yaml
scope:
  protocol_areas:
    - governance
  mechanisms:
    - scheduled plans with a delay
```

## Module Boundary

[Contract records](contracts/contracts.md) define the one operating contract. The breaker bypasses this delay for halts; that path is recorded by the breaker module.

### Connected Modules

- `vault` accepts `setCeiling` only from the timelock.
- `breaker` halts the adapter without the delay.

### External Dependencies

- None.

## Status Notes

```yaml
status_notes:
  - id: timelock-delay-2026-11-01
    status: confirmed
    note: At block 26300000 the delay was 2 ticks and no plan was queued.
    reference_refs:
      - timelock-delay-check-2026-11-01
```

## Open Gaps

```yaml
gaps: []
```
