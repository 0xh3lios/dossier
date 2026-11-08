# State Reads

Read the four values at one block; the checkpoint records them together.

```yaml
state_reads:
  - id: vault-debt
    chain: Ethereum
    category: storage
    reason: Total outstanding credit, compared with the ceiling before every borrow.
    quantity_ref: vault#quantity:debt
    inputs: {}
    reference_refs:
      - vault-pinned-source
      - vault-checkpoint-2026-11-01
  - id: vault-ceiling
    chain: Ethereum
    category: parameter
    reason: Ceiling checked by borrow; observed 2000000 HRD at block 26300000.
    quantity_ref: vault#quantity:ceiling
    inputs: {}
    reference_refs:
      - vault-pinned-source
      - vault-checkpoint-2026-11-01
  - id: vault-issued
    chain: Ethereum
    category: storage
    reason: Credit backing the token supply; the adapter's held quantity reads the same slot.
    quantity_ref: vault#quantity:issued
    inputs: {}
    reference_refs:
      - vault-pinned-source
      - vault-checkpoint-2026-11-01
```
