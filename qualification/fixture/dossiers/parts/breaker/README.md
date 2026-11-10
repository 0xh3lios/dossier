```json
{
  "format": "dossier-collection@0.2.0",
  "behaviors": [
    "halt-once",
    "governance-halt-authority"
  ]
}
```

# Breaker

The Breaker relays an emergency stop from Governance to the Adapter. It starts Armed. After sending one halt it becomes Spent, a final state. It does not wait for a Timelock plan.

Read [Send one emergency halt](behaviors/halt-once.md#send-one-emergency-halt), then [Restrict the structural halt authority](behaviors/governance-halt-authority.md#restrict-the-structural-halt-authority).

The [formal abstraction](prose.md) separates the state transition from the structural authority question. [Control](../../compositions/control/README.md) checks that the halt reaches the Adapter. The Breaker does not decide whether a stop is justified and has no reset or enable action. Neither the bounded state check nor the structural check proves a deployed authority configuration.
