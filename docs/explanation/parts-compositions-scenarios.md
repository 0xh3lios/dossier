# Parts, compositions and scenarios

A part is a contract or a procedure, described in sentences that a compiler reads. A composition wires parts together around one concern, such as governance control. A property is a sentence that must hold, of a part or of a composition as a whole. An actor is a source of events in the surroundings, such as a keeper or a governance key. A scenario says whether each actor is honest, malicious or offline, and a property is checked under the scenarios it names.

These pieces make up the formal specification. A dossier's [behaviors](behaviors.md) explain it in words, and each of their claims maps to a passage, a cell or a walk described on this page.

## Prose and passages

A part's prose is a series of numbered passages, each one paragraph that says one thing. The passages come in kinds:

| Kind | Says |
| --- | --- |
| S State | a situation the part can be in |
| E Event | something it receives, and who sends it |
| M Move | what an event does in a state |
| R Refusal | what an event cannot do in a state |
| A Always | what is true in every state |
| O Once | what eventually follows a trigger |
| N Within | what follows a trigger within so many blocks |
| G Given | an assumption about an actor, and what fails without it |
| W Walk | an example run, step by step, with its end |
| X Seam | where this part meets another |
| K Guarantee | what the abstraction relies on in the deployed code, and what backs it |
| T Words only | what no tool here can check, and why |

The prose is written in a controlled English that a compiler reads. The chart, the models and the wiring all cite passages by id, and none of them adds meaning of its own. When a model needs something the prose lacks, the prose gets a passage first.

A passage keeps its id forever. Its hash changes when its words change, which is how the record knows that a decision or a checker's answer was about an older text.

Above the passages sits the boundary: what the part is, the data it holds with each datum's range, and the effects it sends. The ranges matter. They are what the chart explores and what the scaffolded model starts from.

## The chart

The prose compiles to an XState statechart. Each time the agent edits the prose, it redraws the chart with `dossier draw` and checks it against the prose itself: whether every state is reachable, whether every move does what its passage says, whether every pair of state and event is said exactly once, and whether every walk ends where it says. What it finds comes back to the author, such as a pair nobody said or two guards that overlap, while the passage is still fresh.

The chart has no actors and no assumptions, so it judges only whether the prose is coherent. Whether the prose is true of the world is left to the solvers and the grounding. [Three kinds of tool](three-kinds-of-tool.md) explains the split.

A part has a tier. A **charted** part stops at the chart. A **modeled** one also gets TLA+ models and solver trials. `Tier:` in the prose sets it, and a part whose prose names no tier is modeled.

## Compositions and wiring

A composition names its members and wires them together. Wiring says that one member's effect is another member's event in the same step. When the timelock sends `change`, the vault receives `change` at that moment, and the step happens only if the vault accepts it. An event reached through wiring cannot happen on its own.

The wiring can also declare a closure: an asset and the kinds of edge that make a module a necessary member, such as minting or burning it. Dossier reads those edges from the knowledge base and names any module the composition is missing. A property about an asset means little if a module that mints it is left out, so the composition's cells stay open until the closure is met.

The composition's prose states properties over its members' data and states, written as `vault.debt` or `adapter.Halted`. A walk in a composition's prose is an example run across the members. A witness trial checks it under the scenario the walk names. The trial asks TLC to confirm that the walk never reaches its end, so the counterexample TLC returns is the walk itself.

## Actors, modes and scenarios

Every event has a sender. The sender is either a part or an actor. An actor is a source of events in the surroundings, one that fails as a unit: governance, a multisig, a keeper, a user, the public, the chain, a market, or a contract or protocol with no dossier here. A contract that has a dossier is a part, never an actor.

A sender that is a part has no mode. Its sends happen when its own moves allow them. A situation such as the Adapter halted is a state of the Adapter, reached through the Breaker's wiring.

In a composition, an event a member sends that no wiring reaches is a free action. Verify flags it until the wiring lists it under `free:`, which records that the concern leaves it unwired on purpose. The control composition declares the Adapter's supply sends free, because the supply composition wires them.

An actor can pin the records in the knowledge base that fix who it is, such as a multisig's signer set. Every answer in a composition the actor sends events into records the hashes of those records, as it does for a member's pins. When a signer is rotated and the record changes, the cells that rest on the actor [lapse](evidence.md#a-snapshot-behind-every-result).

Each actor has the modes it can take:

- **Honest.** The Givens about it hold. A Given is fairness on that actor's moves, or on its moves of one event when the Given names that event with `on`. A prompt Given also keeps the chain from ticking while a move of that event is enabled. A Given with `only when` restricts the actor's moves of that event to a condition, such as a keeper lane that moves the price by at most one step per post. It adds no fairness unless it is also `prompt`.
- **Malicious.** Its Givens are dropped. It can do anything the contracts allow it, whenever it likes.
- **Offline.** It sends nothing at all.

An honest actor is not a scripted one. The model lets every actor send any of its events whenever the contracts accept them, and honest adds only the Givens about that actor. So a column where an actor is malicious differs from `all-honest` only if a Given names that actor.

These are ideas from the field under plain names. A Given is a rely condition, in Cliff Jones's sense, attached to the actor it is about. Distributed computing calls honest, malicious and offline correct, Byzantine and crash. A scenario is a fault model.

An Always can cite a step Given, a Given with `prompt` or `only when`. The chart skips such an Always, since it has no Givens, and the solvers check it under each scenario. In a charted part, which has no solver trials, it is `untried`.

Time is counted in blocks. A tick is one block passing, and it comes from the chain, the actor of kind `chain`. A Within passage counts ticks.

A scenario assigns a mode to each actor. `all-honest` always exists. One scenario can set several modes at once, such as a malicious key with an offline keeper, and its column shows what the pair breaks.

A mode can hold for a window instead of the whole run. The window starts at one tick and ends before another, and the actor is honest outside it. Ticks are counted from 0. Two keeper lanes offline from tick 0 until tick 2 are down for the first two blocks and live after that.

A scenario can also give a start: the state and the data a cell under it begins from. Everything the start leaves out begins from the boundary's starting values. A start tries a property from a situation the boundary's starting values do not give, such as a price feed already three blocks stale.

A scenario can be declared stronger than another, so that a proof under the stronger one also holds for the weaker. The modes decide whether the declaration is sound. A malicious actor can do everything an honest or an offline one can, and more. Honest and offline are incomparable. So one scenario is stronger than another only when every actor's mode in it is the same or malicious. An actor with a window in either scenario must have the same mode in the same window in both, unless the stronger scenario has it malicious for the whole run, which allows everything. The two scenarios must also have the same start, since a run from one start says nothing about a run from another. Verify fails on a declaration that the modes or the starts do not support.

## Cells and the matrix

A cell is one property under one scenario, and it is the unit the composition ledger reports. A property claims the scenarios it names, or the wiring's defaults, which are `all-honest` when the wiring lists none.

Read the matrix two ways:

- **Across a row:** the weakest set of assumptions, among the scenarios the property claims, that it survives.
- **Down a column:** everything one malicious actor or one outage breaks.

An Always says a bad state is never reached, which is safety. It can hold with every actor malicious, and a scenario of that kind shows whether it does, within the reach. Under other scenarios the Givens of the honest actors shape what the model can reach, whether or not the property cites them. A Once says something eventually follows, which is liveness, and a Within says it follows within so many blocks. Both need someone to act, so both rest on the Givens they name. Under a scenario that drops those Givens or takes their actor offline, they can fail by design. Harbor's control composition shows the difference. Nothing changes the Vault early under any of its three scenarios, while a scheduled plan is not resolved within three blocks once the executor is offline.

A cell can be implied by a proof under a declared stronger scenario. A violated cell carries its path, and an owner decides what it means.
