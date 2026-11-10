```json
{
  "format": "dossier-collection@0.2.0",
  "behaviors": [
    "resolve-plan"
  ]
}
```

# Control behavior collection

Control composes Timelock, Vault, Breaker and Adapter. Start with
[resolving a scheduled plan](behaviors/resolve-plan.md). The public actor's
availability matters to progress; governance capture is a separate scenario.

This example leaves delay safety, halting and other composed behavior
unexplained. Existing walks remain discoverable independently of this list.
