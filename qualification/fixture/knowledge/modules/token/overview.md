# token

## Module Record

```yaml
module:
  id: token
  name: Harbor HRD
  status: live
  documentation_group: tokens
  protocol_role: The HRD token; minted and burned only by the adapter
  main_chains:
    - chain: Ethereum
      chain_id: 1
  related_docs: []
  export_path: tokens/token
```

## Purpose

HRD is a plain ERC20 whose supply changes only through the adapter. Holders transfer and approve; nobody else mints or burns.

## Protocol Role

The unit of account and the only asset that leaves the protocol.

## Scope

```yaml
scope:
  protocol_areas:
    - tokens
  mechanisms:
    - adapter-only mint and burn
```

## Module Boundary

[Contract records](contracts/contracts.md) define the one operating contract. Supply accounting against the vault is recorded by the adapter module.

### Connected Modules

- `adapter` is the only minter and burner.
- `vault` accounts for the supply through issued credit.

### External Dependencies

- None.

## Status Notes

```yaml
status_notes:
  - id: token-supply-2026-11-01
    status: confirmed
    note: At block 26300000 totalSupply was 600000 HRD and the adapter was the only minter.
    reference_refs:
      - token-pinned-source
```

## Open Gaps

```yaml
gaps: []
```
