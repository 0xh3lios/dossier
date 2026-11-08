# Actors

```yaml
actors:
  - id: lane-a
    name: Keeper lane A
    kind: keeper
    chain: Ethereum
    address: "0xc2d3e4f5a6b7081920314c5d6e7f8a9b01234569"
    role: keeper lane A
    controls: []
    reference_refs:
      - oracle-pinned-source
  - id: lane-b
    name: Keeper lane B
    kind: keeper
    chain: Ethereum
    address: "0xd3e4f5a6b7c8091a2b3c4d5e6f708192a3b4c5d6"
    role: keeper lane B
    controls: []
    reference_refs:
      - oracle-pinned-source
```

Either lane alone keeps the feed fresh; both are whitelisted and nothing else may post.
