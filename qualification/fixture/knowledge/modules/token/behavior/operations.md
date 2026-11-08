# Operations

```yaml
operations:
  - id: mint
    description: Create an amount of HRD for a user.
    inputs_schema:
      type: object
      properties:
        user:
          type: string
          pattern: ^0x[0-9a-fA-F]{40}$
        amount:
          type: string
          pattern: ^[0-9]+$
      required:
        - user
        - amount
      additionalProperties: false
    preconditions:
      - minters(msg.sender) == 1.
    call:
      target_contract: token#contract:token
      method: mint(address,uint256)
      args:
        - input: user
        - input: amount
    mutability: nonpayable
    privileged: true
    expected_callers:
      - actor:adapter
    state_reads: []
    emitted_events:
      - Transfer(address,address,uint256)
    reference_refs:
      - token-pinned-source
  - id: burn
    description: Destroy an amount of HRD held by a user.
    inputs_schema:
      type: object
      properties:
        user:
          type: string
          pattern: ^0x[0-9a-fA-F]{40}$
        amount:
          type: string
          pattern: ^[0-9]+$
      required:
        - user
        - amount
      additionalProperties: false
    preconditions:
      - minters(msg.sender) == 1.
      - user's balance covers amount.
    call:
      target_contract: token#contract:token
      method: burn(address,uint256)
      args:
        - input: user
        - input: amount
    mutability: nonpayable
    privileged: true
    expected_callers:
      - actor:adapter
    state_reads: []
    emitted_events:
      - Transfer(address,address,uint256)
    reference_refs:
      - token-pinned-source
```

Transfers and approvals are standard ERC20 and are not recorded as operations.
