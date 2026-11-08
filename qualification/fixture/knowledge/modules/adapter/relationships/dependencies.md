# Dependencies

```yaml
dependencies:
  - id: vault
    name: Harbor Vault
    kind: module
    chain: Ethereum
    module_ref: vault
    contract_ref: vault
    deployment_ref: vault-ethereum
    role: Ledger the adapter moves credit in and out of; the vault accepts only this adapter.
    reference_refs:
      - adapter-pinned-source
  - id: token
    name: Harbor HRD
    kind: module
    chain: Ethereum
    module_ref: token
    contract_ref: token
    deployment_ref: token-ethereum
    role: Token the adapter mints and burns; the token accepts only this adapter.
    reference_refs:
      - adapter-pinned-source
```
