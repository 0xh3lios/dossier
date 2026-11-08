# Composition

A composition has members, wiring, free sends, closure and default scenarios in `wiring.md`, actor modes and starts in `actors/scenarios.md`, properties and walks in `prose.md`, and a module generated from its members' prose. [The shared process](process.md) defines the authoring and execution sequence.

## wiring.md

Example `wiring-shape`. Wiring syntax example; its member and knowledge dependencies are not a complete composition.

```yaml
members:
  - part: vault
    role: member                 # member | surroundings
    pins: [vault#observation:checkpoint-2026-11-01]
  - part: adapter
    role: member
wiring:
  - effect: adapter.move            # <part>.<effect>
    event: vault.move            # <part>.<event>
free: []                         # sends of a member this concern leaves unwired
closure:
  - asset: hrd
    edges: [mints_asset, burns_asset, accounts_for_asset]
scenarios: [all-honest, user-malicious]   # the defaults; their modes, windows and starts are in actors/scenarios.md
```

A member's moves enter the composed module. Wiring makes one member's effect another member's event in the same step. The source's action takes the target's move for that event as a conjunct, fields bound by name, and the step is enabled only if the target accepts. An event that is reached through wiring has no free-standing action, and it happens only when wired. A surroundings member is composed like a member, and the role is for the readers. A member listed twice is `malformed wiring`.

A part sender gets a plain disjunct in the module, with no mode constant, no fairness and no due check, such as `Adapter == vault_M3_Move \/ vault_M4_Release`. `Next` is `TickStep \/ <actors> \/ <parts>`. An event a member sends that no wiring reaches is a free action. Verify flags it `left free` (`vault.move, vault.release from adapter; wire them or list them under free:`) and the ledger prints `Free: vault.move, vault.release from adapter` after the Wiring line. Listing the events under `free:` acknowledges the choice and clears the flag. Harbor's control composition declares `free: [vault.move, vault.release]` because Supply wires them. A `free:` item that is not `<part>.<event>`, or names an event no member receives, no member sends, or a wiring reaches, is `malformed wiring`. Events sent by a part that is not a member print under `Outside:`, such as `Outside: timelock sends vault.change`, with no flag.

Closure names an asset and the edge kinds that make a module a necessary member. `verify` lists every module owning such an edge on the asset that is not a member, and marks the composition's cells open until it is. A rule can also list `modules:`, which must be members whatever the knowledge base holds. When `scenarios:` is empty, a property that names no scenarios claims `all-honest`.

## Actors and scenarios

An actor is a source of events in the surroundings, and it fails as a unit. `actors/actors.md` declares each one: id, name, kind (`governance`, `multisig`, `keeper`, `user`, `public`, `chain`, `market`, `external`), the modes it may take, and optionally its pins. `public` is anyone at all, `market` is prices, rates and liquidity, and `external` is a contract or protocol with no dossier here. A contract that has a dossier is a part, never an actor. `name` defaults to the id, `kind` to `public`, and `modes` to all three, and an id declared twice is `malformed actors`. Only `chain` means anything to the tool. An event whose sender is an actor of kind `chain` is a tick, and the name `tick` decides only when no actors file resolves the sender. An event's sender resolves first to a part by id, then to an actor by id or name. An actor whose id is a part's id is flagged `actor shadows part`. For a modeled part a situation is a state, not a mode. The Adapter halted is `adapter.Halted`, reached through the Breaker's wiring.

An actor's `pins`, such as `pins: [timelock#actor:governance]`, name the records that fix who it is. Their hashes enter the snapshot of every answer in a composition whose members receive the actor's events, as a member's pins do. A change to a pinned record, such as a rotated signer set, lapses the cells that rest on the actor. A pin that does not resolve in the knowledge base is flagged `pin unresolved`, on a part for its own pins and on a composition for its members' and its actors' pins.

`actors/scenarios.md` gives a mode per actor. `all-honest` always exists, and `stronger_than` lets a proof under one scenario imply another. A scenario id declared twice is `malformed actors`. A mode may hold for a window, and a scenario may give a start, as two of Harbor's scenarios do:

Example `scenario-windows`. Scenario fragment; read with Harbor actor declarations.

```yaml
scenarios:
  - id: lanes-down-two
    modes:
      lane-a: { mode: offline, from: 0, until: 2 }
      lane-b: { mode: offline, from: 0, until: 2 }
    notes: both lanes down for the first two blocks
  - id: stale-start
    start: { oracle.state: Stale, oracle.stale: 3 }
```

A mode is a string, or a map with `mode`, an optional `from` and an optional `until`. `from` is the tick the mode starts at, 0 by default. `until` is the tick it ends before, and without it the mode holds for the rest of the run. The actor is in the mode while `from <= clock < until` and honest otherwise. `clock` counts the ticks taken, from 0, so `lanes-down-two` is both lanes down for the first two blocks. Both bounds are whole numbers of ticks. A window's mode is `malicious` or `offline`. A window whose `until` is not above its `from`, that has no `mode`, or whose mode is `honest` is `malformed actors`. A window on the chain's offline mode cannot end, since the clock counts the chain's ticks. `until` is an error there, and `from` names the tick the chain stops at. A window in a composition where no member takes the chain's tick is `wiring does not compose`, since the clock that opens and closes it would never move. `notes` is free text for readers. The snapshot hashes a scenario only by its modes, windows and start, so an edit to its `notes` or its `stronger_than` lapses nothing.

A start names the values a cell under the scenario begins from. Keys are `<part>.<datum>` or `<part>.state`. Values are a number, `true` or `false`, one of a choice's values, or a state name. Everything the start leaves out begins from the boundary's starting values. A key that names no part, a datum the part does not hold, or a value outside the datum's range is `malformed actors`. Each composition checks the start of every scenario in `scenarios.md` against its members, claimed or not. A composition ignores a key for a part that is not one of its members.

The modes decide whether a `stronger_than` is sound. Malicious has more behaviors than honest and than offline, which are incomparable, so a scenario is stronger only when every actor's mode in it is the same or malicious. An actor with a window in either scenario must have the same mode and the same window in both, unless the stronger scenario has it malicious for the whole run, which allows every behavior. The two scenarios must also have the same start. Scenarios whose starts differ are never comparable. A declaration the modes or the starts do not support is the tripwire `stronger_than unsound`.

A Given is `Actor: <Actor>[, on <part>.<event>][, prompt][, only when <condition>]` in a composition, with data as `part.data`. `prompt` and `only when` each require `on`. In the composed module every actor sender is a constant `Mode_<actor>`, and `ConstInit_<scenario>` is written for each scenario the composition claims, and for `all-honest`. An actor's moves are disabled when `offline`. `Honest<Actor>_<part>_<Event>`, such as `HonestPublic_timelock_Exec`, is the honest actor's moves of the event a Given names, with `WF_vars(HonestPublic_timelock_Exec) \* from control.G1 timelock.G1`. A Given without `on` becomes `WF_vars(Honest<Actor>)`, and a Given on the chain without `on` becomes `WF_vars((Mode_chain = "honest") /\ TickStep)`. All of them are vacuous unless the actor is honest. `Due_<actor>` is over the actor's prompt events, and `TickStep` does not fire while it holds for an honest actor. An `only when` condition appears as `(Mode_<actor> /= "honest" \/ <condition>)` in the action and its `Can_`, and adds no fairness without `prompt`. Malicious drops the Givens and nothing else. A malicious actor can do what the contracts allow it, whenever it likes.

A composition whose claimed scenarios have a window gets a variable `clock`, which `Tick` advances and which saturates at the largest window bound. Beside each `Mode_<actor>` it gets the constants `From_<actor>` and `Until_<actor>`, with `Until_<actor>` 0 for a window with no end, since a window never ends at tick 0. `ModeNow_<actor>` is the mode in force at the current tick, and every test of the actor's mode above uses it in place of `Mode_<actor>`. A composition without windows has none of these. Each key of a start becomes a constant `Start_<part>_<datum>`, such as `Start_oracle_stale`, which `Init` uses and which each scenario's `ConstInit` and `.cfg` set, to the boundary's starting value where the scenario has no start for it.

## The composition's prose

Harbor's Control:

Example `control-prose`. Complete composition prose; compose using Harbor Control members, actors and wiring.

```
# Control

Concern: control

## Always
[A1] Always, {not timelock.early}. Scenarios: all-honest, governance-captured, executor-offline.
[A2] Always, {not breaker.halted or adapter.Halted}. Scenarios: all-honest, governance-captured.

## Once
[O1] Once timelock.Scheduled, eventually timelock.Idle, given G1 and G2. Scenarios: all-honest.

## Within
[N1] Within 3 ticks of timelock.Scheduled, timelock.Idle, given G1 and G2. Scenarios: all-honest, governance-captured, executor-offline.

## Given
[G1] Given that someone executes a ready plan before the next block. If this is false, N1 and O1 are void. Actor: the public, on timelock.execute, prompt.
[G2] Given that the chain keeps ticking. If this is false, O1 is void. Actor: the chain.

## Walks
[W1] Walk Capture under governance-captured: from timelock.Idle, timelock.schedule, timelock.execute refused, timelock.tick, timelock.tick, timelock.execute; ends timelock.Idle.
```

Conditions name member data as `part.data` and member states as `part.State`. An Always may cite a step Given, one that has `prompt` or `only when`, as `Always, <condition>[, given G<n>[ and G<m>]]. Scenarios: ...`. Its cells check it under each claimed scenario. A Within needs a number of ticks. A property without a Scenarios sentence claims the composition's default scenarios. A property that claims a scenario `scenarios.md` does not declare is the tripwire `property claims unknown scenario`, and one that claims a scenario twice does not compile. Givens may also come from the members. A Given with an actor in a member's prose carries into every composition the member is in. A composition passage that names a datum, a state or an event its member does not have is `misnamed`. One that names a part that is not a member is `wiring names unknown part`.

A walk is `Walk <Name>[ under <scenario>]: from <part>.<State>, <part>.<event>[ <field> <value>][ refused], ...; ends <part>.<State>.` Nothing may follow its end state. It runs under the scenario it names, or under `all-honest` when it names none. A wired event happens only inside the step that sends it, so a walk names the event that starts that step. A step on an event that is reached through wiring is `wiring does not compose`. A step on a part that is not a member is `wiring names unknown part`, and a step on an event its member does not receive is `misnamed`. A scenario `scenarios.md` does not declare is `property claims unknown scenario`.

## The generated module

`dossier scaffold <composition>` writes `model/generated/<Concern>.tla` and one configuration per cell, `<Property>_<scenario>.cfg`, with the scenario's modes, windows and start as constants. A trial prepares these same inputs inside its private execution copy. Verification reconstructs their identities in memory and writes nothing. The module is named from the composition's id, with each hyphenated segment capitalized and the segments joined, such as `PriceFeed` for `price-feed`. Explicit scaffolding removes obsolete generated files, such as a configuration for a scenario no property claims any more. Each walk gets an observer `w<n>_at`, the definitions `W<n>_End` and `NotW<n>`, and a configuration `W<n>_<scenario>.cfg` under the walk's scenario. The observer arms only when the walk's first step is taken from its `from` state, and at a refused step it checks that the event's move is not enabled there. A file name writes the scenario with underscores for hyphens, such as `A1_all_honest.cfg`. The module also holds one `ConstInit_<scenario>` line per claimed scenario, which only an Apalache cell under that scenario reads, so each cell and walk rests on the module without the other scenarios' lines. An edit to one scenario lapses its own cells and walks, and every other cell only when it changes what the scenarios share: the clock's bound, which the longest window sets, or the constants of a window or a start no other scenario has. Never edit these generated views. `model/extras.tla` is authored input appended verbatim before the end of the module for helper definitions and strengthened invariants that name the generated variables.

## Cells and calls

A cell is one property under one scenario. Its call names both:

Example `composition-call`. Complete cell call; plan against Harbor Supply and its all-honest scenario.

```
kind: apalache
mode: inductive
property: A1
scenario: all-honest
inv: Inv_A1
cinit: ConstInit_all_honest
executes:
  - model/generated/Supply.tla
reach: unbounded; TypeOK and A1 inductive
expect:
  Inv_A1: holds
because: |
  Every wired step changes both sides of the equation together.
```

A TLC cell executes the generated module and exactly `model/generated/<Property>_<scenario>.cfg`. An Apalache cell names exactly `cinit: ConstInit_<scenario>`, with the scenario's hyphens as underscores. No cell is marked from another scenario's configuration. A cell you expect violated is called `violated`, and its trace shows the path that breaks the property. A composition blunder is a copy of the generated module under `model/blunders/` with one wrong, and a configuration enabling the property under the scenario. Its call names `property:` and `scenario:` as a cell's does, and needs no `base:`, since the generated module is the base.

A walk is tried as a witness. Its call has `kind: tlc` and names `walk: W<n>` and `scenario:` in place of `property:`, where the scenario is the walk's own, `all-honest` when the walk names none. It executes the generated module and `W<n>_<scenario>.cfg`, and expects `NotW<n>: violated; trace: ...` with `trace-data:`, as a part's witness does in [tlc.md](checkers/tlc.md), except that a composition has no `state` variable. Its trace is the `trace-data` values alone, slash-joined, so a member's state is listed there by name, such as `trace-data: timelock_state, timelock_remaining`. Each `trace-data` name must be a variable of the module. The answer records the walk. The ledger's walks table, `| walk | scenario | mark | trial |`, shows it `pending` until a witness answers it, `checked` when the latest witness answer matched its trace, `miscalled` when it did not, and `lapsed` when something it rested on moved.

## Reading the matrix

The matrix shows each cell's mark, as [the marks](evidence.md#the-marks) derive it:

- `proved` is an inductive Apalache answer.
- `checked` is a bounded Apalache answer, or a TLC answer within its reach.
- `violated` carries its trace, and `accepted` once an owner accepts the risk, for as long as the answer that decides the cell is the one the owner accepted. Any other deciding answer shows `acceptance lapsed` until the owner decides again, as [the owner's column](evidence.md#the-owners-column) says.
- `implied` leans on the proof under a declared stronger scenario that the modes and the start support.
- `lapsed` lists what moved.
- `open` means the closure is missing a member, or the cell's scenario is not declared.

A property shows `held` beside its cells while no blunder has been tried at its current text, and `hollow` when the latest blunder answer there held. Every cell lists the members it rests on, and each member's ledger lists its guarantees, backed or assumed.
