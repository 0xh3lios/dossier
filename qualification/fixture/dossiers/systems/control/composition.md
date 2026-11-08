# Composition

Governance control: a plan waits out the Timelock's delay before it changes the Vault, while the Breaker halts the Adapter at once.

```yaml
members:
  - component: timelock
    role: member
    pins: [timelock#observation:delay-check-2026-11-01]
  - component: vault
    role: member
  - component: breaker
    role: member
  - component: adapter
    role: member
wiring:
  - effect: timelock.change
    event: vault.change
  - effect: breaker.halt
    event: adapter.halt
free: [vault.move, vault.release]
closure: []
scenarios: [all-honest, governance-captured, executor-offline]
```
