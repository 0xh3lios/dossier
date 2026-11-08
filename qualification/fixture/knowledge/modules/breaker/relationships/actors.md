# Actors

```yaml
actors:
  - id: governance
    name: Governance
    kind: governance
    chain: Ethereum
    role: the governance authority
    controls:
      - contract:breaker
    reference_refs:
      - breaker-pinned-source
```

The breaker consults the same election as the timelock; there is no owner.
