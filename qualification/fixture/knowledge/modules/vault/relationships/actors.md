# Actors

```yaml
actors:
  - id: user
    name: Credit user
    kind: public_caller
    chain: Ethereum
    role: Any address may borrow credit against the ceiling and repay its own credit.
    controls: []
    reference_refs:
      - vault-pinned-source
  - id: adapter
    name: Harbor Adapter
    kind: contract
    chain: Ethereum
    role: the only caller of move and release
    controls:
      - contract:vault
    reference_refs:
      - vault-pinned-source
      - vault-checkpoint-2026-11-01
```

The adapter address is an immutable constructor argument; the vault keeps no admin list. A user's credit is free until the adapter moves it, and issued until the adapter releases it.
