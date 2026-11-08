# Actors

```yaml
actors:
  - id: adapter
    name: Harbor Adapter
    kind: contract
    chain: Ethereum
    role: the only minter and burner
    controls:
      - contract:token
    reference_refs:
      - token-pinned-source
  - id: holder
    name: Token holder
    kind: public_caller
    chain: Ethereum
    role: Any address may transfer and approve its own balance.
    controls: []
    reference_refs:
      - token-pinned-source
```

The minter list holds one entry, the adapter. There is no governance path to add another without a new deployment.
