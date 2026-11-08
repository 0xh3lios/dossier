# Start a composition

Put parts together for one concern, declare the scenarios that matter, and state the properties of the whole.

## You need

The member parts, each with prose that compiles. See [Start a part](start-a-part.md).

## Steps

1. **Begin the composition.** Say "start a composition for control with the timelock, the vault, the breaker and the adapter", or run:

   ```bash
   dossier decide control begin composition
   ```

   That writes `compositions/control/wiring.md` and `prose.md`.

2. **Name the members and the wiring** in `wiring.md`. Harbor's Control:

   ```yaml
   members:
     - part: timelock
       role: member
       pins: [timelock#observation:delay-check-2026-11-01]
     - part: vault
       role: member
     - part: breaker
       role: member
     - part: adapter
       role: member
   wiring:
     - effect: timelock.change
       event: vault.change
     - effect: breaker.halt
       event: adapter.halt
   free: [vault.move, vault.release]
   closure: []
   scenarios: [all-honest, governance-captured, executor-offline]
   ```

   Wiring makes the timelock's `change` effect the vault's `change` event in the same step. Fields an effect carries bind by name to the event's fields. `pins` fix each member's instance to records in the knowledge base. `scenarios` lists the defaults a property claims when it names none.

   A member's sends that no wiring reaches are free actions, and verify flags them `left free`. When this concern leaves them unwired on purpose, list them under `free:`. Control lists the Adapter's sends to the Vault, `vault.move` and `vault.release`, because the Supply composition wires them.

3. **Add a closure when a property is about an asset.** Name the asset and the edge kinds that make a module a necessary member. Harbor's Supply closes over its stablecoin, HRD:

   ```yaml
   closure:
     - asset: hrd
       edges: [mints_asset, burns_asset, accounts_for_asset]
   ```

   Verify then names every module that owns such an edge and is not a member, and keeps the cells open until it is added. A rule can also list `modules:`, which must be members whatever the knowledge base holds.

4. **Declare the scenarios** in `actors/scenarios.md`. Give modes only to the actors that differ from honest:

   ```yaml
   scenarios:
     - id: governance-captured
       modes: { governance: malicious }
       stronger_than: [all-honest]
   ```

   `stronger_than` lets a proof under this scenario imply the weaker one, when the modes and the starts support it. [Files](../reference/files.md) gives the rule.

   A mode with a window holds from the tick `from` (0 when left out) until the tick `until`, and the actor is honest outside it:

   ```yaml
     - id: lanes-down-two
       modes:
         lane-a: { mode: offline, from: 0, until: 2 }
         lane-b: { mode: offline, from: 0, until: 2 }
       notes: both lanes down for the first two blocks
   ```

   A start names the values a cell under the scenario begins from, keyed `part.data` or `part.state`:

   ```yaml
     - id: stale-start
       start: { oracle.state: Stale, oracle.stale: 3 }
   ```

5. **State the properties** in the composition's `prose.md`. Name member data as `part.data` and member states as `part.State`, and say which scenarios each property claims:

   ```
   [A1] Always, {not timelock.early}. Scenarios: all-honest, governance-captured, executor-offline.
   [N1] Within 3 ticks of timelock.Scheduled, timelock.Idle, given G1 and G2. Scenarios: all-honest, governance-captured, executor-offline.
   ```

   A property without a Scenarios sentence claims the wiring's defaults, or `all-honest` when the wiring lists none.

   A walk is an example run across the members. It names the scenario it runs under, or runs under `all-honest` when it names none:

   ```
   [W1] Walk Capture under governance-captured: from timelock.Idle, timelock.schedule, timelock.execute refused, timelock.tick, timelock.tick, timelock.execute; ends timelock.Idle.
   ```

6. **Compose the module.** Run `dossier scaffold control`. It writes `model/generated/Control.tla`, one configuration per cell and one per walk. Verify derives their identities in memory, and trials prepare private generated inputs without rewriting these views. Put helper definitions and strengthened invariants in `model/extras.tla`, which is appended to the module. The generated files are never edited by hand.

## Check

`dossier verify` lists the composition with its cells and walks, all `pending` until tried. A tripwire such as `wiring names unknown effect or event` names the wiring to fix.

## Next

[Check a claim](check-a-claim.md) to try each cell.
