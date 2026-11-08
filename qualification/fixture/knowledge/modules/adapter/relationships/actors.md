# Actors

```yaml
actors:
  - id: user
    name: Token user
    kind: public_caller
    chain: Ethereum
    role: Any address may exit its own credit into HRD and enter HRD back into credit.
    controls: []
    reference_refs:
      - adapter-pinned-source
  - id: breaker
    name: Harbor Breaker
    kind: contract
    chain: Ethereum
    role: Sets live to zero; the adapter has no other administrator.
    controls:
      - contract:adapter
    reference_refs:
      - adapter-pinned-source
```

The adapter has no owner or admin list. Its `live` flag is cleared by the breaker and never set again; a halted adapter needs a new deployment.
