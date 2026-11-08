# Quantities

```yaml
quantities:
  - id: authority
    description: The election contract the breaker asks for the current governance.
    inputs_schema:
      type: object
      properties: {}
      required: []
      additionalProperties: false
    read:
      target_contract: breaker#contract:breaker
      method: authority()
      args: []
      return_type: address
    reference_refs:
      - breaker-pinned-source
```
