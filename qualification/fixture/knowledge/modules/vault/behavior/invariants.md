# Invariants

Both properties follow from the pinned source; the Certora spec states the first as `debtEqualsCredit`.

```yaml
invariants:
  - id: debt-equals-credit
    name: Debt equals credit
    kind: accounting
    statement: debt equals free plus issued
    applies_to:
      contracts:
        - contract:vault
      flows: []
      state_reads:
        - vault-debt
        - vault-issued
    check_hint: Read debt, free and issued at one block and compare; every operation changes two of the three by the same amount.
    reference_refs:
      - vault-pinned-source
      - vault-certora-spec
  - id: ceiling-respected
    name: Line respected
    kind: accounting
    statement: debt never exceeds ceiling
    applies_to:
      contracts:
        - contract:vault
      flows: []
      state_reads:
        - vault-debt
        - vault-ceiling
    check_hint: borrow checks the ceiling and setCeiling refuses a ceiling below debt, so the bound holds at every block.
    reference_refs:
      - vault-pinned-source
```

A repay never checks the ceiling, so a ceiling lowered to the current debt still lets users repay.
