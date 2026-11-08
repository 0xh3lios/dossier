# Quantities

```yaml
quantities:
  - id: held
    description: Credit held by the adapter, read from the vault's issued slot.
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
      - adapter-pinned-source
  - id: live
    description: One while the adapter may mint; zero after the breaker halts it.
    inputs_schema:
      type: object
      properties: {}
      required: []
      additionalProperties: false
    read:
      target_contract: adapter#contract:adapter
      method: live()
      args: []
      return_type: uint256
    measurement:
      unit: flag
      decimals: 0
    reference_refs:
      - adapter-pinned-source
```
