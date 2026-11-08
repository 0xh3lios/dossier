# Codebases

The deployed vault is reproduced by `harbor-vault` at 1a2b0000; the Certora spec in the same tree states the ledger invariant and the borrow and repay rules.

```yaml
repositories:
  - id: harbor-vault
    name: harbor-vault
    provider: github
    url: https://github.com/harbor-protocol/vault
    ref: 1a2b0000000000000000000000000000000f9f8e
    ref_type: commit
    source_code_roots:
      - src
      - certora
    cache_path: source-cache/github/commit-1a2b-9f8e/
    public_export:
      submodule_path: ./codebases/harbor-vault/commit-1a2b-9f8e
      checked_out_branch: ""
      pinned_commit: 1a2b0000000000000000000000000000000f9f8e
source_files:
  - id: vault-src-vault-sol
    repository: harbor-vault
    path: src/Vault.sol
  - id: vault-certora-vault-spec
    repository: harbor-vault
    path: certora/Vault.spec
codebase_gaps: []
```
