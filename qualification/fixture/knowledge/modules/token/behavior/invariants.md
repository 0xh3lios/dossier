# Invariants

```yaml
invariants:
  - id: supply-only-via-adapter
    name: Supply changes only through the adapter
    kind: authorization
    statement: totalSupply changes only in mint and burn, and both accept only the adapter
    applies_to:
      contracts:
        - contract:token
      flows: []
      state_reads: []
    check_hint: Call mint and burn from a non-minter and expect a revert; transfers leave totalSupply unchanged.
    reference_refs:
      - token-pinned-source
```
