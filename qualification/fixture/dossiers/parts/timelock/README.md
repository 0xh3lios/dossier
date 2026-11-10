```json
{
  "format": "dossier-collection@0.2.0",
  "behaviors": [
    "schedule-and-execute",
    "cancel-plan",
    "complete-plan"
  ]
}
```

# Timelock

The Timelock holds one governance plan while its delay runs down. Governance schedules or cancels the plan, the chain advances time, and anyone may execute a ready plan. Execution sends a change to the Vault. The Timelock does not decide what that change does.

Read the behaviors in this order:

1. [Schedule and execute a plan](behaviors/schedule-and-execute.md#schedule-and-execute-a-plan): the delay, early refusal and execution path.
2. [Cancel a waiting plan](behaviors/cancel-plan.md#cancel-a-waiting-governance-plan): Governance's cancellation path and the questions it leaves open.
3. [Complete a scheduled plan](behaviors/complete-plan.md#complete-a-scheduled-plan): the assumptions needed for a deadline and eventual completion.

The [formal abstraction](prose.md) holds one plan and counts two ticks of delay. Its checks concern this model. The source correspondence still relies on the listed guarantees, including the unbacked claim that the delay cannot be shortened. No claim here establishes behavior at a deployed address.

The cancellation walk covers one remaining-delay value. Cancellation at every value and completion of a replacement plan remain separate questions. The model-side coverage of waiting at zero is also incomplete. [Control](../../compositions/control/README.md) examines the Timelock together with the Vault and the emergency path.
