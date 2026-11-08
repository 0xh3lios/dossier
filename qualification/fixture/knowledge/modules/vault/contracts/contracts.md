# Contracts

The vault is one singleton; the adapter address is an immutable constructor argument.

## Contract: vault

```yaml
contract:
  id: vault
  name: Vault
  status: live
  kind: singleton
  role: Keeps debt, free and issued credit and the ceiling
live_deployments:
  - id: vault-ethereum
    entity_ref: entity-harbor-vault
    inventory_ref: null
    transaction: "0x5b1e9c2d7f3a4860b2c4d6e8f0a1b3c5d7e9f1a2b4c6d8e0f2a4b6c8d0e2f4a6"
    block: 26120000
    deployer: "0x0a1b2c3d4e5f60718293a4b5c6d7e8f901234567"
    constructor_args:
      - name: adapter_
        type: address
        value: "0x2c8e4f1a7b9d3e5c6a0f2b4d6e8a1c3f5b7d9e02"
      - name: ceiling_
        type: uint256
        value: "2000000000000000000000000"
    salt: null
    linked_libraries: []
implementation_source:
  codebase: harbor-vault
  source_file: vault-src-vault-sol
  contract_name: Vault
  compiler:
    version: 0.8.24
    optimized: true
    runs: 200
    evm_version: cancun
verified_code: []
verification_checks:
  - id: vault-code-exists
    type: code_exists
    target_entity_ref: entity-harbor-vault
    expected: nonempty runtime code on Ethereum
contract_gaps: []
```

The timelock proxy is the only admin; `setCeiling` is the only function it may call.
