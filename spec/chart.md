# Chart exploration

The chart is compiled from the prose. An agent interprets its diagnostics through [the shared process](process.md). Editing a file that draw writes changes no evidence.

## What `dossier draw <component>` does

1. Compiles `prose.md` into the intermediate form, `chart/machine.json`: states as a tree, events with their fields, the context from the boundary, transitions with guards and changes, refusals, invariants, walks, every element with the passage ids it came from.
2. Builds the XState machine from it, with guards and changes evaluated from the same expressions the prose holds.
3. Explores every reachable state and context over the declared ranges, with every event case enumerated from the fields' domains, up to a limit of 20000 distinct states unless `--limit` sets another.
4. Runs the generated checks and prints the summary. Nothing is recorded. `--brief` prints the summary's first line only.
5. Writes the grid. `chart/grid.md` is the table of states by events, with the covering passage in each cell or `unsaid`. Earlier versions of draw also wrote two Mermaid pictures, `chart/chart.mmd` and `chart/walks.mmd`, which nothing reads. Draw removes either one it finds as a regular file.

After each edit of `prose.md`, run `dossier draw <id> --brief` and read its one line. Run `dossier draw <id>` for the whole summary.

## The checks, and what a failure means

| Check | Named by | A failure means |
| --- | --- | --- |
| in range | TypeOK | A reached snapshot holds a datum outside its declared range. The path there is printed. The chart stops expanding such a snapshot, so a wrong that drives a count past its bound is caught here instead of exhausting the limit. |
| state reachable | S | No sequence of events reaches it: a missing move, or a guard that cannot be met in the ranges. |
| event handled | E | No move accepts it, or it is never accepted on an explored path. |
| handled by refusal | E with `Refusal only.` | A move accepts it, a reached state or a value of its fields has no single refusal covering it, or no passing walk attempts it as refused. |
| move replays | M | At a snapshot where its guard holds, the target or a change differs from the passage, or no explored snapshot satisfies its guard. |
| refused as said | R | A move accepts the event in that state, or the machine accepts it at a snapshot the refusal covers. |
| walk replays | W | A step is refused that should be accepted, or accepted that should be refused, or the end state, data or effects differ. |
| one applies | M R | Two guards hold at once for the same state and event, or a move and a refusal both apply. |
| always | A | A reached snapshot falsifies it. The path there is printed. An Always that cites a Given and a structural Always are skipped. Once and Within properties also need model checks; chart exploration does not establish them. |

A gap, printed as `unsaid under condition`, is a state and event with a guarded move and no refusal when the guard is false. It is not a failed check. It is a sentence the prose owes.

## Recording the chart

Example `chart-call`. Complete call form; plan against Harbor Timelock without running the chart.

```
kind: chart
executes:
  - prose.md
reach: the chart over <the ranges>
expect:
  checks: pass
because: |
  Every state is reachable, every move and refusal replays as said, every walk ends as said.
```

`dossier trial <component> chart.md`. `checks: fail W3` is a call too, when a check is expected to fail and the call says why. After it, in a modeled component, the S, E, M, R and W passages are drawn, and so is each Always the chart explored. In a charted component, the S, E, M, R and W passages are checked, each Always the chart explored is held until a chart blunder catches it, and an Always that cites a Given is untried.

## Chart blunders

A mutated machine under `chart/blunders/<name>.json`, a copy of `chart/machine.json` with one wrong: a guard set to null, a target changed, a change removed. A call of kind `blunder` executing it with `checks: fail <ids>` names the passages whose checks must fail. The prose's own checks run against the mutated machine. Each id the call names is caught where its check fails and hollow where it passes. No other id counts. A chart blunder counts toward an Always in a charted component. In a modeled one the model's blunder is what counts.

## Limits

The explored space is the product of the declared ranges and the enumerated event cases, capped by the limit. Effect counters saturate so a loop of effects stays finite, and a snapshot outside a declared range is kept for the range check and not expanded. An exploration that exceeds the limit stops, and draw fails with `exploration exceeded <n> states` and runs no check. Narrow the ranges, or raise the limit with `--limit`, a whole number of states. Parallel regions draw and check, and they do not scaffold to TLA+.
