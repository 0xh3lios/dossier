# Actors

This is an expected refusal: a sender of the retired kind `contract` is not given another kind automatically.

```yaml
actors:
  - id: payer
    name: the payer
    kind: contract
    modes: [honest, malicious, offline]
```
