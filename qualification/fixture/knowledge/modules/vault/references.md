# References

```yaml
references:
  - id: vault-pinned-source
    type: source_code
    title: Vault.sol at 1a2b0000
    url: https://github.com/harbor-protocol/vault/blob/1a2b0000000000000000000000000000000f9f8e/src/Vault.sol
    date_checked: "2026-11-01"
    notes: Pinned source of the deployed vault.
  - id: vault-certora-spec
    type: source_code
    title: Vault.spec at 1a2b0000
    url: https://github.com/harbor-protocol/vault/blob/1a2b0000000000000000000000000000000f9f8e/certora/Vault.spec
    date_checked: "2026-11-01"
    notes: Certora invariants and rules over the ledger.
  - id: vault-checkpoint-2026-11-01
    type: observation
    title: Vault checkpoint at block 26300000
    path: observations/checkpoint-2026-11-01.json
    chain: Ethereum
    date_checked: "2026-11-01"
    notes: debt, free, issued and ceiling read at one finalized block.
```
