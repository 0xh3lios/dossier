# Operations

```yaml
operations:
  - id: post
    description: Record a new price and reset stale to zero.
    inputs_schema:
      type: object
      properties:
        value:
          type: string
          pattern: ^[0-9]+$
      required:
        - value
      additionalProperties: false
    preconditions:
      - msg.sender is lane A or lane B.
    call:
      target_contract: oracle#contract:oracle
      method: post(uint256)
      args:
        - input: value
    mutability: nonpayable
    privileged: true
    expected_callers:
      - actor:lane-a
      - actor:lane-b
    state_reads: []
    emitted_events:
      - Post(address,uint256)
    reference_refs:
      - oracle-pinned-source
```

stale grows by one every tick without a post; it is computed from the last post's block, not stored.
