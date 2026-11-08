# Edges

```yaml
edges:
  - id: governance-stops
    type: privileged_call
    from: actor:governance
    to: contract:breaker
    conditions:
      - stop requires msg.sender to be the current governance.
    reference_refs:
      - breaker-pinned-source
  - id: breaker-halts-adapter
    type: controls
    from: contract:breaker
    to: adapter#contract:adapter
    conditions:
      - halt on the adapter accepts only the breaker; it clears live and cannot be undone.
    reference_refs:
      - breaker-pinned-source
edge_gaps: []
```
