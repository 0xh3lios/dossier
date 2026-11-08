# breaker

## Module Record

```yaml
module:
  id: breaker
  name: Harbor Breaker
  status: live
  documentation_group: governance
  protocol_role: Circuit breaker that halts the adapter without the timelock delay
  main_chains:
    - chain: Ethereum
      chain_id: 1
  related_docs: []
  export_path: governance/breaker
```

## Purpose

The breaker lets governance halt the adapter at once. It can only halt; re-enabling is impossible by design, so a captured governance can stop minting but cannot start it.

## Protocol Role

The one path around the delay, limited to actions that reduce what the protocol can do.

## Scope

```yaml
scope:
  protocol_areas:
    - governance
    - emergency
  mechanisms:
    - immediate halt
```

## Module Boundary

[Contract records](contracts/contracts.md) define the one operating contract.

### Connected Modules

- `adapter` accepts `halt` only from the breaker.
- `timelock` is bypassed; the breaker reads the same governance.

### External Dependencies

- None.

## Status Notes

```yaml
status_notes:
  - id: breaker-authority-2026-11-01
    status: confirmed
    note: At block 26300000 the breaker's authority was governance election and no halt had been issued.
    reference_refs:
      - breaker-pinned-source
```

## Open Gaps

```yaml
gaps: []
```
