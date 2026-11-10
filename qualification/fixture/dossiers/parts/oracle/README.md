```json
{
  "format": "dossier-collection@0.2.0",
  "behaviors": [
    "refresh-price",
    "limit-price-step",
    "saturate-age"
  ]
}
```

# Oracle

The Oracle stores a price and the age of its latest post. A tick makes a fresh price stale. Either keeper lane may then post a replacement. The lanes supply values; the Oracle model does not establish where those values came from.

Read the behaviors in this order:

1. [Refresh a stale price](behaviors/refresh-price.md#refresh-a-stale-price): either lane can post, and prompt-lane assumptions supply the deadline.
2. [Limit each price step](behaviors/limit-price-step.md#limit-each-price-step): honest lanes restrict how far a post moves the price.
3. [Saturate the age counter](behaviors/saturate-age.md#saturate-the-age-counter): the finite age representation and its open interpretation question.

The [formal abstraction](prose.md) counts stale age only up to three and price values from zero to four. The [open doubt](doubts.md) asks what an older price means after the counter stops increasing. That is a modeling judgment, not a checked claim that an old price is valid.

[Upkeep](../../compositions/upkeep/README.md) varies lane availability and honesty. Those scenarios explain which assumptions matter without establishing external price accuracy or deployment availability.
