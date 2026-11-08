# Contracts

## Contract: oracle

```yaml
contract:
  id: oracle
  name: Oracle
  status: live
  kind: singleton
  role: Holds the last posted price and reports staleness
live_deployments:
  - id: oracle-ethereum
    entity_ref: entity-harbor-oracle
    inventory_ref: null
    transaction: "0xa06d4b7c2e8f91b5a7b9c1d3e5f6a8b0c2d4e6f7a9b1c3d5e7f9a1b3c5d7e9f1"
    block: 26119980
    deployer: "0x0a1b2c3d4e5f60718293a4b5c6d7e8f901234567"
    constructor_args:
      - name: laneA_
        type: address
        value: "0xc2d3e4f5a6b7081920314c5d6e7f8a9b01234569"
      - name: laneB_
        type: address
        value: "0xd3e4f5a6b7c8091a2b3c4d5e6f708192a3b4c5d6"
    salt: null
    linked_libraries: []
implementation_source:
  codebase: harbor-oracle
  source_file: oracle-src-oracle-sol
  contract_name: Oracle
  compiler:
    version: 0.8.24
    optimized: true
    runs: 200
    evm_version: cancun
verified_code: []
verification_checks:
  - id: oracle-code-exists
    type: code_exists
    target_entity_ref: entity-harbor-oracle
    expected: nonempty runtime code on Ethereum
contract_gaps: []
```
