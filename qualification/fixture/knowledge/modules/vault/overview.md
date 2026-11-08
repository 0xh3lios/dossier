# vault

## Module Record

```yaml
module:
  id: vault
  name: Harbor Vault
  status: live
  documentation_group: core
  protocol_role: The credit ledger of Harbor, with debt, free credit, issued credit and the ceiling
  main_chains:
    - chain: Ethereum
      chain_id: 1
  related_docs: []
  export_path: core/vault
```

## Purpose

The vault keeps Harbor's single ledger. Users borrow credit against the ceiling and repay it; the adapter moves credit between a user and itself when HRD leaves or enters the system.

## Protocol Role

Every other Harbor module reads or changes this ledger: the adapter converts its credit into HRD, the timelock sets the ceiling, the breaker halts the adapter, and the oracle's freshness gates new borrows.

## Scope

```yaml
scope:
  protocol_areas:
    - accounting
  mechanisms:
    - credit borrowed against a ceiling
    - adapter-only credit moves
```

## Module Boundary

[Contract records](contracts/contracts.md) define the one operating contract. [Actors](relationships/actors.md), [edges](relationships/edges.md), [quantities](state/quantities.md), [operations](behavior/operations.md) and [invariants](behavior/invariants.md) record the reviewed source; the [checkpoint](observations/checkpoint-2026-11-01.json) is a read-only snapshot.

### Connected Modules

- `adapter` is the only caller of `move` and `release`.
- `timelock` sets the ceiling through a delayed plan.
- `oracle` supplies the price that `borrow` requires to be fresh.
- `token` is the asset the issued credit backs.

### External Dependencies

- None.

## Status Notes

```yaml
status_notes:
  - id: vault-checkpoint-2026-11-01
    status: confirmed
    note: At block 26300000 debt was 1500000 HRD, free 900000, issued 600000 and the ceiling 2000000. These values are block-specific.
    reference_refs:
      - vault-checkpoint-2026-11-01
```

## Open Gaps

```yaml
gaps: []
```
