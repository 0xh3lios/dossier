# Edges

```yaml
edges:
  - id: vault-accounts-hrd
    type: accounts_for_asset
    from: contract:vault
    to: token#asset:hrd
    conditions:
      - Issued credit backs the circulating HRD one for one; the vault never holds the token.
    reference_refs:
      - vault-pinned-source
      - vault-checkpoint-2026-11-01
  - id: adapter-moves-credit
    type: privileged_call
    from: adapter#contract:adapter
    to: contract:vault
    conditions:
      - move and release require msg.sender to be the immutable adapter address.
    reference_refs:
      - vault-pinned-source
  - id: user-borrows
    type: calls
    from: actor:user
    to: contract:vault
    conditions:
      - borrow requires debt plus amount at most ceiling and a fresh oracle price; repay requires the caller's credit to cover amount.
    reference_refs:
      - vault-pinned-source
edge_gaps: []
```

The timelock's authority over the ceiling and the oracle read are recorded by the timelock and oracle modules, which own those relationships.
