# Dependencies

```yaml
dependencies:
  - id: keepers
    name: Keeper network
    kind: keeper
    chain: Ethereum
    role: Runs lane A and lane B; the protocol assumes at least one lane is live.
    reference_refs:
      - oracle-pinned-source
```
