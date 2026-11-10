```json
{
  "format": "dossier-collection@0.2.0",
  "behaviors": [
    "cancel-plan"
  ]
}
```

# Timelock behavior collection

The Timelock delays a governance change. Governance schedules or cancels;
the chain supplies ticks; the public may execute after two ticks.
The Vault receives the change. This part abstracts what the change does.

Start with [cancelling a plan](behaviors/cancel-plan.md). This example collection
covers cancellation only. Scheduling, delayed execution, repeated scheduling
and eventual progress are not fully documented here. The collection is
incomplete even though it lists every behavior file currently authored.
