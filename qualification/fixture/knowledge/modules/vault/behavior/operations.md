# Operations

Four callable operations. The caller of borrow and repay is any address; move and release accept only the adapter.

```yaml
operations:
  - id: borrow
    description: Borrow an amount of credit against the ceiling into the caller's account.
    inputs_schema:
      type: object
      properties:
        amount:
          type: string
          pattern: ^[0-9]+$
          description: Unsigned integer in raw base units.
      required:
        - amount
      additionalProperties: false
    preconditions:
      - debt + amount <= ceiling.
      - The oracle price is fresh; stale is at most one tick.
    call:
      target_contract: vault#contract:vault
      method: borrow(uint256)
      args:
        - input: amount
    mutability: nonpayable
    privileged: false
    expected_callers:
      - actor:user
    state_reads:
      - vault-debt
      - vault-ceiling
    emitted_events:
      - Borrow(address,uint256)
    reference_refs:
      - vault-pinned-source
  - id: repay
    description: Repay an amount of the caller's free credit, reducing debt.
    inputs_schema:
      type: object
      properties:
        amount:
          type: string
          pattern: ^[0-9]+$
          description: Unsigned integer in raw base units.
      required:
        - amount
      additionalProperties: false
    preconditions:
      - The caller's credit covers amount.
    call:
      target_contract: vault#contract:vault
      method: repay(uint256)
      args:
        - input: amount
    mutability: nonpayable
    privileged: false
    expected_callers:
      - actor:user
    state_reads:
      - vault-debt
    emitted_events:
      - Repay(address,uint256)
    reference_refs:
      - vault-pinned-source
  - id: move
    description: Move an amount of a user's free credit to the adapter.
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
      - msg.sender is the adapter.
      - The user's credit covers amount.
    call:
      target_contract: vault#contract:vault
      method: move(address,uint256)
      args:
        - input: user
        - input: amount
    mutability: nonpayable
    privileged: true
    expected_callers:
      - actor:adapter
    state_reads:
      - vault-issued
    emitted_events:
      - Move(address,uint256)
    reference_refs:
      - vault-pinned-source
  - id: release
    description: Return an amount of issued credit to a user.
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
      - msg.sender is the adapter.
      - issued covers amount.
    call:
      target_contract: vault#contract:vault
      method: release(address,uint256)
      args:
        - input: user
        - input: amount
    mutability: nonpayable
    privileged: true
    expected_callers:
      - actor:adapter
    state_reads:
      - vault-issued
    emitted_events:
      - Release(address,uint256)
    reference_refs:
      - vault-pinned-source
```

`setCeiling(amount)` is administration, not a user operation: it accepts only the timelock and refuses a value below the current debt.
