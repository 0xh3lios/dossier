# Contracts

## Contract: timelock

```yaml
contract:
  id: timelock
  name: Timelock
  status: live
  kind: singleton
  role: Queues governance's plans and executes them after the delay
live_deployments:
  - id: timelock-ethereum
    entity_ref: entity-harbor-timelock
    inventory_ref: null
    transaction: "0x8e4b2f5a0c6d7193e5f7a9b1c3d4e6f8a0b2c4d5e7f9a1b3c5d7e9f1a3b5c7d9"
    block: 26119990
    deployer: "0x0a1b2c3d4e5f60718293a4b5c6d7e8f901234567"
    constructor_args:
      - name: delay_
        type: uint256
        value: "2"
    salt: null
    linked_libraries: []
implementation_source:
  codebase: harbor-timelock
  source_file: timelock-src-timelock-sol
  contract_name: Timelock
  compiler:
    version: 0.8.24
    optimized: true
    runs: 200
    evm_version: cancun
verified_code: []
verification_checks:
  - id: timelock-code-exists
    type: code_exists
    target_entity_ref: entity-harbor-timelock
    expected: nonempty runtime code on Ethereum
contract_gaps: []
```

The delay can only be changed by a plan executed through the timelock itself.
