# Choose what to model first

Decide which components and systems to start with, so that the first matrix addresses what people already ask about the system.

## Start from what people ask

1. **List what people ask about the whole.** "What holds if the governance key turns malicious?" "What if a keeper lane is down?" "Can anything change the books before the delay runs out?" Each one names a concern, a property and a scenario.

2. **Make one system per concern.** A supply, a control plane, emergency response, keeper upkeep. Keep each system to the members its properties need.

3. **List the members each system needs.** These are its first components. If you keep records, a closure rule in the composition will name any module that mints, burns or accounts for the asset and is missing.

4. **Include the procedures, not only the contracts.** A runbook a multisig follows has states, events from named people, and walks that are its steps. It is a component like any other.

5. **Write the scenarios the list implies.** A key in the wrong hands makes its actor malicious. An outage takes it offline.

## Keep the first round small

- **Model only what a property needs.** A component's boundary should hold the data its properties speak of, and nothing more.
- **Keep ranges small.** A count from 0 to 2 explores in seconds and still makes every move fire. Widen a check once it passes.
- **Start charted where in doubt.** A charted component stops at the chart, which is enough to settle its prose. Raise it to modeled when a property needs a solver.

## Next

[Start a component](start-a-component.md) for each member, then [compose the system](compose-a-system.md).
