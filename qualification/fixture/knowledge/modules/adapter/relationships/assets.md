# Assets

```yaml
assets:
  - id: hrd
    symbol: HRD
    name: Harbor HRD
    kind: token
    module_ref: token
    contract_ref: token
    deployment_ref: token-ethereum
    chain: Ethereum
    decimals: 18
    role: Minted on exit and burned on enter, one for one with issued credit.
    reference_refs:
      - adapter-pinned-source
```

The canonical asset record lives in the token module; this binding selects its deployment without copying the address.
