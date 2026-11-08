# Invariants

```yaml
invariants:
  - id: held-equals-supply
    name: Held credit equals supply
    kind: accounting
    statement: credit held by the adapter equals the token supply
    applies_to:
      contracts:
        - contract:adapter
        - vault#contract:vault
        - token#contract:token
      flows: []
      state_reads: []
    check_hint: Read vault.issued and token.totalSupply at one block; exit and enter change both by the same amount in one transaction.
    reference_refs:
      - adapter-pinned-source
  - id: halt-stops-exit
    name: Halt stops exit
    kind: timelock
    statement: exit is refused while live is zero
    applies_to:
      contracts:
        - contract:adapter
      flows: []
      state_reads: []
    check_hint: Call exit after the breaker halted the adapter; enter still succeeds.
    reference_refs:
      - adapter-pinned-source
```
