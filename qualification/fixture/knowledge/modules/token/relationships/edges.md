# Edges

```yaml
edges:
  - id: adapter-authorized
    type: privileged_call
    from: adapter#contract:adapter
    to: contract:token
    conditions:
      - mint and burn require minters(caller) == 1; the adapter is the only minter.
    reference_refs:
      - token-pinned-source
  - id: holder-transfers
    type: calls
    from: actor:holder
    to: contract:token
    conditions:
      - transfer, approve and transferFrom act on the caller's balance and allowances.
    reference_refs:
      - token-pinned-source
edge_gaps: []
```

The mint and burn relationships to the asset are owned by the adapter module as `adapter-mints-hrd` and `adapter-burns-hrd`.
