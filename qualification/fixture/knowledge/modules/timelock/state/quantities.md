# Quantities

Ticks are the timelock's unit of time; one tick is one block.

```yaml
quantities:
  - id: delay
    description: Ticks a plan must wait between schedule and execute.
    inputs_schema:
      type: object
      properties: {}
      required: []
      additionalProperties: false
    read:
      target_contract: timelock#contract:timelock
      method: delay()
      args: []
      return_type: uint256
    measurement:
      unit: ticks
      decimals: 0
    reference_refs:
      - timelock-pinned-source
      - timelock-delay-check-2026-11-01
  - id: eta
    description: The tick at or after which a scheduled plan may execute; zero when the plan is not scheduled.
    inputs_schema:
      type: object
      properties:
        plan:
          type: string
          pattern: ^0x[0-9a-fA-F]{64}$
          description: keccak256 of the plan's target and calldata.
      required:
        - plan
      additionalProperties: false
    read:
      target_contract: timelock#contract:timelock
      method: eta(bytes32)
      args:
        - input: plan
      return_type: uint256
    measurement:
      unit: ticks
      decimals: 0
    reference_refs:
      - timelock-pinned-source
```
