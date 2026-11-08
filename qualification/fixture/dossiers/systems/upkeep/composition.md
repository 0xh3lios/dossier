# Composition

Keeper upkeep: two lanes keep the Oracle fresh; one lane suffices.

```yaml
members:
  - component: oracle
    role: member
wiring: []
closure: []
scenarios: [all-honest, lane-a-offline, lanes-offline, lanes-down-one, lanes-down-two, stale-start, lane-a-captured]
```
