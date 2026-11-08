# adapter

## Module Record

```yaml
module:
  id: adapter
  name: Harbor Adapter
  status: live
  documentation_group: core
  protocol_role: The adapter between vault credit and HRD; exit mints, enter burns
  main_chains:
    - chain: Ethereum
      chain_id: 1
  related_docs: []
  export_path: core/adapter
```

## Purpose

The adapter is the only bridge between the ledger and the token. `exit` moves a user's credit to the adapter and mints the same amount of HRD; `enter` burns HRD and releases the credit.

## Protocol Role

Because it is the token's only minter and the vault's only mover, the adapter is where the accounting identity between issued credit and HRD supply is kept.

## Scope

```yaml
scope:
  protocol_areas:
    - tokens
    - accounting
  mechanisms:
    - credit to token conversion
    - breaker halt
```

## Module Boundary

[Contract records](contracts/contracts.md) define the one operating contract. The breaker's authority to halt the adapter is recorded by the breaker module.

### Connected Modules

- `vault` accepts `move` and `release` only from the adapter.
- `token` accepts `mint` and `burn` only from the adapter.
- `breaker` sets `live` to zero without delay.

### External Dependencies

- None.

## Status Notes

```yaml
status_notes:
  - id: adapter-live-2026-11-01
    status: confirmed
    note: At block 26300000 live was 1 and held equalled the HRD supply, 600000 HRD.
    reference_refs:
      - adapter-pinned-source
```

## Open Gaps

```yaml
gaps: []
```
