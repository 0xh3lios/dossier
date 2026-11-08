# Actors

```yaml
actors:
  - id: governance
    name: Governance
    kind: governance
    chain: Ethereum
    role: the governance authority
    controls:
      - contract:timelock
    reference_refs:
      - timelock-pinned-source
  - id: executor
    name: Plan executor
    kind: public_caller
    chain: Ethereum
    role: Any address may execute a scheduled plan at or after its eta.
    controls: []
    reference_refs:
      - timelock-pinned-source
```

Governance is whichever address the election names at the block; the timelock reads it and keeps no copy.
