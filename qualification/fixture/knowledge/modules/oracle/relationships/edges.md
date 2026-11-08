# Edges

```yaml
edges:
  - id: oracle-feeds-vault
    type: reads_oracle
    from: vault#contract:vault
    to: contract:oracle
    conditions:
      - borrow reads price and stale; a stale feed refuses the borrow.
    reference_refs:
      - oracle-pinned-source
  - id: lane-a-posts
    type: calls
    from: actor:lane-a
    to: contract:oracle
    conditions:
      - post requires the caller to be a whitelisted lane.
    reference_refs:
      - oracle-pinned-source
  - id: lane-b-posts
    type: calls
    from: actor:lane-b
    to: contract:oracle
    conditions:
      - post requires the caller to be a whitelisted lane.
    reference_refs:
      - oracle-pinned-source
  - id: oracle-run-by-keepers
    type: depends_on
    from: contract:oracle
    to: dependency:keepers
    conditions:
      - Freshness holds only while a lane keeps poking.
    reference_refs:
      - oracle-pinned-source
edge_gaps: []
```
