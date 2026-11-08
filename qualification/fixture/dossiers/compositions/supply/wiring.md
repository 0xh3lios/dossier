# Wiring

The HRD supply: every unit of HRD stands for credit the Adapter holds, and every unit of credit stands for debt. Closure follows the asset: any module that mints, burns or accounts for HRD must be a member.

```yaml
members:
  - part: vault
    role: member
    pins: [vault#observation:checkpoint-2026-11-01]
  - part: adapter
    role: member
  - part: token
    role: member
wiring:
  - effect: adapter.move
    event: vault.move
  - effect: adapter.release
    event: vault.release
  - effect: adapter.mint
    event: token.mint
  - effect: adapter.burn
    event: token.burn
closure:
  - asset: hrd
    edges: [mints_asset, burns_asset, accounts_for_asset]
scenarios: [all-honest, user-malicious]
```
