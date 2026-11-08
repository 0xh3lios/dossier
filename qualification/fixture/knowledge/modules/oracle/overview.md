# oracle

## Module Record

```yaml
module:
  id: oracle
  name: Harbor Oracle
  status: live
  documentation_group: oracles
  protocol_role: Delayed price feed posted by two keeper lanes
  main_chains:
    - chain: Ethereum
      chain_id: 1
  related_docs: []
  export_path: oracles/oracle
```

## Purpose

Two keeper lanes post a price to the oracle every tick. The vault refuses new borrowing when the feed is stale, so the lanes' liveness bounds how long credit can be drawn against an old price.

## Protocol Role

The only offchain input the protocol depends on.

## Scope

```yaml
scope:
  protocol_areas:
    - oracles
  mechanisms:
    - keeper posts
    - staleness counter
```

## Module Boundary

[Contract records](contracts/contracts.md) define the one operating contract. The lanes are external keepers recorded as a dependency.

### Connected Modules

- `vault` reads the price and the staleness before a borrow.

### External Dependencies

- The keeper network running lane A and lane B.

## Status Notes

```yaml
status_notes:
  - id: oracle-fresh-2026-11-01
    status: confirmed
    note: At block 26300000 stale was 0; both lanes had posted within the previous two ticks.
    reference_refs:
      - oracle-pinned-source
```

## Open Gaps

```yaml
gaps:
  - id: lane-operators
    topic: Which operator runs each lane
    needed_for: Scenario modes per lane
    status: open
    notes: The lanes are known by address only.
```
