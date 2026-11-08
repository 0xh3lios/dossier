# Invariants

```yaml
invariants:
  - id: breaker-only-reduces
    name: Breaker only reduces
    kind: authorization
    statement: a breaker action only halts, never enables
    applies_to:
      contracts:
        - contract:breaker
        - adapter#contract:adapter
      flows: []
      state_reads: []
    check_hint: The breaker's only function is stop, and the adapter's live flag has no setter back to one.
    reference_refs:
      - breaker-pinned-source
```
