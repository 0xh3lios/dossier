# Quantities

All four public getters are represented. Credit is counted in HRD with eighteen decimals; the ledger holds no other unit.

```yaml
quantities:
  - id: debt
    description: Total debt borrowed against the vault, a count of HRD credit outstanding.
    inputs_schema:
      type: object
      properties: {}
      required: []
      additionalProperties: false
    read:
      target_contract: vault#contract:vault
      method: debt()
      args: []
      return_type: uint256
    measurement:
      unit: HRD
      decimals: 18
    reference_refs:
      - vault-pinned-source
      - vault-checkpoint-2026-11-01
  - id: free
    description: Credit held by users, summed over every account.
    inputs_schema:
      type: object
      properties: {}
      required: []
      additionalProperties: false
    read:
      target_contract: vault#contract:vault
      method: free()
      args: []
      return_type: uint256
    measurement:
      unit: HRD
      decimals: 18
    reference_refs:
      - vault-pinned-source
      - vault-checkpoint-2026-11-01
  - id: issued
    description: Credit held by the adapter, backing the circulating HRD.
    inputs_schema:
      type: object
      properties: {}
      required: []
      additionalProperties: false
    read:
      target_contract: vault#contract:vault
      method: issued()
      args: []
      return_type: uint256
    measurement:
      unit: HRD
      decimals: 18
    reference_refs:
      - vault-pinned-source
      - vault-checkpoint-2026-11-01
  - id: ceiling
    description: Ceiling on debt, set by the timelock through a delayed plan.
    inputs_schema:
      type: object
      properties: {}
      required: []
      additionalProperties: false
    read:
      target_contract: vault#contract:vault
      method: ceiling()
      args: []
      return_type: uint256
    measurement:
      unit: HRD
      decimals: 18
    reference_refs:
      - vault-pinned-source
      - vault-checkpoint-2026-11-01
```
