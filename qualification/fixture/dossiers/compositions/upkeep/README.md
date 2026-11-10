```json
{
  "format": "dossier-collection@0.2.0",
  "behaviors": [
    "refresh-with-a-backup",
    "recover-from-outage",
    "price-step-under-honesty"
  ]
}
```

# Upkeep

Upkeep examines one Oracle with two keeper lanes. A lane can be offline or malicious independently of the other. The composition asks how quickly a stale price is refreshed and how far an honest post may move it.

Read the behaviors in this order:

1. [Refresh with a backup lane](behaviors/refresh-with-a-backup.md#refresh-with-a-backup-lane): the ordinary deadline and one unavailable lane.
2. [Recover from a keeper outage](behaviors/recover-from-outage.md#recover-from-a-keeper-outage): bounded outage windows, a stale starting price and failed deadlines.
3. [Keep price steps within the honest-lane band](behaviors/price-step-under-honesty.md#keep-price-steps-within-the-honest-lane-band): the assumption that a malicious lane can break.

The [scenarios](../../actors/scenarios.md) define the outage windows and the stale starting state. The [formal abstraction](prose.md) caps stale age at three and prices at four. It does not assess price accuracy, keeper economics or a deployed service's uptime.

An outage that misses its deadline remains a violated cell even after the owner accepts the risk. A later refresh does not repair that deadline. Longer and repeated outages, and the safety of using a price after the age counter saturates, remain outside these checked scenarios.
