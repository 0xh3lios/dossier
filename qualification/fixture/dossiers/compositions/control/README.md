```json
{
  "format": "dossier-collection@0.2.0",
  "behaviors": [
    "delayed-change",
    "emergency-halt",
    "resolve-plan"
  ]
}
```

# Control

Control connects the Timelock, Vault, Breaker and Adapter. A Timelock execution changes the Vault. A Breaker action halts the Adapter immediately. Governance controls scheduling, cancellation and the emergency stop, while the public supplies the execution action.

Read the behaviors in this order:

1. [Delay a governance change](behaviors/delayed-change.md#delay-a-governance-change): the delay under honest actors, malicious Governance and an offline executor.
2. [Halt exits immediately](behaviors/emergency-halt.md#halt-exits-immediately): the independent emergency path into the Adapter.
3. [Resolve a scheduled plan](behaviors/resolve-plan.md#resolve-a-scheduled-plan): completion assumptions and the failed deadline when the executor is offline.

The [wiring](wiring.md) connects change and halt effects. Adapter credit movements are intentionally left free because [Supply](../supply/README.md) owns their accounting concern. Control does not claim asset closure or model who gains the governance key.

The [formal properties](prose.md) use the members' finite ranges. Their results do not establish source or deployment correspondence. A violated completion deadline remains a violation even where the owner accepted the risk. There is no separately checked automatic replacement for an offline executor.
