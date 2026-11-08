# Operations

```yaml
operations:
  - id: stop
    description: Halt the adapter at once by clearing its live flag.
    inputs_schema:
      type: object
      properties: {}
      required: []
      additionalProperties: false
    preconditions:
      - msg.sender is governance.
    call:
      target_contract: breaker#contract:breaker
      method: stop()
      args: []
    mutability: nonpayable
    privileged: true
    expected_callers:
      - actor:governance
    state_reads: []
    emitted_events:
      - Stop(address)
    reference_refs:
      - breaker-pinned-source
```

stop is idempotent; a second call on a halted adapter succeeds and changes nothing.
