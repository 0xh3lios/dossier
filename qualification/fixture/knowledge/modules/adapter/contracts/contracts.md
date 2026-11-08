# Contracts

## Contract: adapter

```yaml
contract:
  id: adapter
  name: Adapter
  status: live
  kind: adapter
  role: Converts vault credit into HRD and back
live_deployments:
  - id: adapter-ethereum
    entity_ref: entity-harbor-adapter
    inventory_ref: null
    transaction: "0x6c2f0d3e8a4b5971c3d5e7f9a1b2c4d6e8f0a2b3c5d7e9f1a3b5c7d9e1f3a5b7"
    block: 26120004
    deployer: "0x0a1b2c3d4e5f60718293a4b5c6d7e8f901234567"
    constructor_args:
      - name: vault_
        type: address
        value: "0x7a1b3e5c9d2f4a6b8c0d1e2f3a4b5c6d7e8f9a0b"
      - name: token_
        type: address
        value: "0x9f3d1b5a7c2e4068a1c3e5b7d9f2a4c6e8b0d2f4"
      - name: breaker_
        type: address
        value: "0x6b0d2f4a8c1e3579b2d4f6a8c0e1b3d5f7a9c1e3"
    salt: null
    linked_libraries: []
implementation_source:
  codebase: harbor-adapter
  source_file: adapter-src-adapter-sol
  contract_name: Adapter
  compiler:
    version: 0.8.24
    optimized: true
    runs: 200
    evm_version: cancun
verified_code: []
verification_checks:
  - id: adapter-code-exists
    type: code_exists
    target_entity_ref: entity-harbor-adapter
    expected: nonempty runtime code on Ethereum
contract_gaps: []
```

The vault, token and breaker addresses are immutable; the adapter cannot be re-pointed.
