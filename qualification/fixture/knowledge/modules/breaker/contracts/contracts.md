# Contracts

## Contract: breaker

```yaml
contract:
  id: breaker
  name: Breaker
  status: live
  kind: singleton
  role: Halts the adapter on governance's call without a delay
live_deployments:
  - id: breaker-ethereum
    entity_ref: entity-harbor-breaker
    inventory_ref: null
    transaction: "0x9f5c3a6b1d7e80a4f6a8b0c2d4e5f7a9b1c3d5e6f8a0b2c4d6e8f0a2b4c6d8e0"
    block: 26119995
    deployer: "0x0a1b2c3d4e5f60718293a4b5c6d7e8f901234567"
    constructor_args:
      - name: authority_
        type: address
        value: "0xb1c2d3e4f5a6071829304b5c6d7e8f9a01234568"
    salt: null
    linked_libraries: []
implementation_source:
  codebase: harbor-breaker
  source_file: breaker-src-breaker-sol
  contract_name: Breaker
  compiler:
    version: 0.8.24
    optimized: true
    runs: 200
    evm_version: cancun
verified_code: []
verification_checks:
  - id: breaker-code-exists
    type: code_exists
    target_entity_ref: entity-harbor-breaker
    expected: nonempty runtime code on Ethereum
contract_gaps: []
```
