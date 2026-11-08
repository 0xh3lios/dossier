# Edges

```yaml
edges:
  - id: adapter-mints-hrd
    type: mints_asset
    from: contract:adapter
    to: token#asset:hrd
    conditions:
      - exit mints amount to the caller after the vault accepted the move; requires live.
    reference_refs:
      - adapter-pinned-source
  - id: adapter-burns-hrd
    type: burns_asset
    from: contract:adapter
    to: token#asset:hrd
    conditions:
      - enter burns amount from the caller before the vault releases the credit; allowed while halted.
    reference_refs:
      - adapter-pinned-source
  - id: adapter-calls-vault
    type: calls
    from: contract:adapter
    to: vault#contract:vault
    conditions:
      - move on exit and release on enter; the vault checks that the caller is this adapter.
    reference_refs:
      - adapter-pinned-source
  - id: user-exits
    type: calls
    from: actor:user
    to: contract:adapter
    conditions:
      - exit and enter act on the caller's own credit and balance.
    reference_refs:
      - adapter-pinned-source
edge_gaps: []
```

A halt stops minting only. Burning stays open so holders can always return HRD to credit.
