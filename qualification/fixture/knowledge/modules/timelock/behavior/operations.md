# Operations

```yaml
operations:
  - id: schedule
    description: Queue a plan; its eta becomes the current tick plus delay.
    inputs_schema:
      type: object
      properties:
        target:
          type: string
          pattern: ^0x[0-9a-fA-F]{40}$
        data:
          type: string
          pattern: ^0x([0-9a-fA-F]{2})*$
      required:
        - target
        - data
      additionalProperties: false
    preconditions:
      - msg.sender is governance.
      - The plan is not already scheduled.
    call:
      target_contract: timelock#contract:timelock
      method: schedule(address,bytes)
      args:
        - input: target
        - input: data
    mutability: nonpayable
    privileged: true
    expected_callers:
      - actor:governance
    state_reads: []
    emitted_events:
      - Schedule(bytes32,uint256)
    reference_refs:
      - timelock-pinned-source
  - id: execute
    description: Execute a scheduled plan whose eta has arrived.
    inputs_schema:
      type: object
      properties:
        target:
          type: string
          pattern: ^0x[0-9a-fA-F]{40}$
        data:
          type: string
          pattern: ^0x([0-9a-fA-F]{2})*$
      required:
        - target
        - data
      additionalProperties: false
    preconditions:
      - The plan is scheduled.
      - The current tick is at or after the plan's eta.
    call:
      target_contract: timelock#contract:timelock
      method: execute(address,bytes)
      args:
        - input: target
        - input: data
    mutability: nonpayable
    privileged: false
    expected_callers:
      - actor:executor
    state_reads: []
    emitted_events:
      - Execute(bytes32)
    reference_refs:
      - timelock-pinned-source
  - id: cancel
    description: Cancel a scheduled plan.
    inputs_schema:
      type: object
      properties:
        target:
          type: string
          pattern: ^0x[0-9a-fA-F]{40}$
        data:
          type: string
          pattern: ^0x([0-9a-fA-F]{2})*$
      required:
        - target
        - data
      additionalProperties: false
    preconditions:
      - msg.sender is governance.
    call:
      target_contract: timelock#contract:timelock
      method: cancel(address,bytes)
      args:
        - input: target
        - input: data
    mutability: nonpayable
    privileged: true
    expected_callers:
      - actor:governance
    state_reads: []
    emitted_events:
      - Cancel(bytes32)
    reference_refs:
      - timelock-pinned-source
```

execute clears the plan before the call, so a plan runs once.
