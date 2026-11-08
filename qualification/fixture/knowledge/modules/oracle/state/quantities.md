# Quantities

```yaml
quantities:
  - id: stale
    description: Ticks since the last post.
    inputs_schema:
      type: object
      properties: {}
      required: []
      additionalProperties: false
    read:
      target_contract: oracle#contract:oracle
      method: stale()
      args: []
      return_type: uint256
    measurement:
      unit: ticks
      decimals: 0
    reference_refs:
      - oracle-pinned-source
  - id: price
    description: The last posted price of HRD in the reference currency.
    inputs_schema:
      type: object
      properties: {}
      required: []
      additionalProperties: false
    read:
      target_contract: oracle#contract:oracle
      method: price()
      args: []
      return_type: uint256
    measurement:
      unit: USD
      decimals: 18
    reference_refs:
      - oracle-pinned-source
```
