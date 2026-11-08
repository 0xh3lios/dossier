# Contracts

## Contract: token

```yaml
contract:
  id: token
  name: Hrd
  status: live
  kind: singleton
  role: ERC20 with adapter-only mint and burn
live_deployments:
  - id: token-ethereum
    entity_ref: entity-harbor-token
    inventory_ref: null
    transaction: "0x7d3a1e4f9b5c6082d4e6f8a0b2c3d5e7f9a1b3c4d6e8f0a2b4c6d8e0f2a4b6c8"
    block: 26120002
    deployer: "0x0a1b2c3d4e5f60718293a4b5c6d7e8f901234567"
    constructor_args: []
    salt: null
    linked_libraries: []
implementation_source:
  codebase: harbor-token
  source_file: token-src-hrd-sol
  contract_name: Hrd
  compiler:
    version: 0.8.24
    optimized: true
    runs: 200
    evm_version: cancun
verified_code: []
verification_checks:
  - id: token-code-exists
    type: code_exists
    target_entity_ref: entity-harbor-token
    expected: nonempty runtime code on Ethereum
contract_gaps: []
```

The deployer relied on the adapter in the deployment transaction and then denied itself.
