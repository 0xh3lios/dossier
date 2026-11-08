# Operations

```yaml
operations:
  - id: exit
    description: Convert an amount of the caller's credit into HRD.
    inputs_schema:
      type: object
      properties:
        amount:
          type: string
          pattern: ^[0-9]+$
      required:
        - amount
      additionalProperties: false
    preconditions:
      - live is 1.
      - The caller's vault credit covers amount.
    call:
      target_contract: adapter#contract:adapter
      method: exit(uint256)
      args:
        - input: amount
    mutability: nonpayable
    privileged: false
    expected_callers:
      - actor:user
    state_reads: []
    emitted_events:
      - Exit(address,uint256)
    reference_refs:
      - adapter-pinned-source
  - id: enter
    description: Burn an amount of the caller's HRD and release the credit.
    inputs_schema:
      type: object
      properties:
        amount:
          type: string
          pattern: ^[0-9]+$
      required:
        - amount
      additionalProperties: false
    preconditions:
      - The caller's HRD balance covers amount.
    call:
      target_contract: adapter#contract:adapter
      method: enter(uint256)
      args:
        - input: amount
    mutability: nonpayable
    privileged: false
    expected_callers:
      - actor:user
    state_reads: []
    emitted_events:
      - Enter(address,uint256)
    reference_refs:
      - adapter-pinned-source
```

`halt` is the breaker's operation, recorded there; on the adapter it clears `live` and takes no argument.
