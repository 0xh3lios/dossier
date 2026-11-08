# Quantities

```yaml
quantities:
  - id: supply
    description: Total HRD in circulation.
    inputs_schema:
      type: object
      properties: {}
      required: []
      additionalProperties: false
    read:
      target_contract: token#contract:token
      method: totalSupply()
      args: []
      return_type: uint256
    measurement:
      unit: HRD
      decimals: 18
    reference_refs:
      - token-pinned-source
  - id: balance
    description: HRD balance of one account.
    inputs_schema:
      type: object
      properties:
        account:
          type: string
          pattern: ^0x[0-9a-fA-F]{40}$
      required:
        - account
      additionalProperties: false
    read:
      target_contract: token#contract:token
      method: balanceOf(address)
      args:
        - input: account
      return_type: uint256
    measurement:
      unit: HRD
      decimals: 18
    reference_refs:
      - token-pinned-source
```
