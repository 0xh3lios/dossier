# Dependencies

```yaml
dependencies:
  - id: token
    name: Harbor HRD
    kind: module
    chain: Ethereum
    module_ref: token
    contract_ref: token
    deployment_ref: token-ethereum
    role: The asset whose circulating supply the issued credit backs; the vault never calls it.
    reference_refs:
      - vault-pinned-source
  - id: oracle
    name: Harbor oracle
    kind: oracle
    chain: Ethereum
    module_ref: oracle
    contract_ref: oracle
    deployment_ref: oracle-ethereum
    role: Price feed read by borrow; a stale feed refuses new credit.
    reference_refs:
      - vault-pinned-source
```

The vault reads the oracle and nothing else. The token binding records which supply the ledger backs; it is not a call target.
