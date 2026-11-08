# Semantics

These terms define what Dossier represents and what its evidence means. The [process](process.md) assigns responsibilities, and [evidence](evidence.md) defines the derived marks.

## What this is for

The dossiers keep a checked account of how a system behaves: one abstraction per component, compositions of components into systems, properties checked by solvers under scenarios, and every claim tied to the evidence that backs it and the assumptions it rests on.

The readers are the owners. They read prose, pictures and a matrix. The ledger tells them which sentences a checker established, within what reach, under which scenario, resting on which guarantees, and which sentences are only words.

## The three roles

**The chart designs.** Prose compiles to an XState machine. Each time you edit the prose, `dossier draw` compiles the machine and checks it against the prose itself: every state reachable, every pair of state and event said exactly once, guards exclusive and complete over the declared ranges, every walk replaying, every Always holding on every explored snapshot. It runs in seconds, records nothing, and reports what the prose leaves open: a pair unsaid, a guard that overlaps, a walk that ends elsewhere.

**The trials check.** TLC, Apalache and Alloy run only through the runner. A call written before the trial runs says what will come back and why. Each trial's answer goes to its question's entry with its basis, the hashes of everything it rested on. Every property must catch a blunder, a deliberate wrong, or it stays held, and a blunder it fails to catch shows it hollow. The checkers answer in counterexamples, which in a composition are attack or failure paths, and in bounds: how far the check looked.

**The grounding backs.** Certora rules at a commit, fork replays through an external runner, and the chain observations the records hold tie the abstraction to the deployed system. Dossier runs none of them as proofs of its own. It records which guarantee each one backs, and lapses the marks that rest on it when the backing moves.

## The words

Use these exactly. Define any other word where it first appears, and nowhere else.

**Knowledge base.** The record repository: modules with contracts, actors, edges, quantities, operations, invariants and observations. Dossier reads it through an adapter and never writes it. Every reference into it is a typed id, `module#type:id`, never a copied address or value.

**Component.** One part of the system, a contract role or an offchain procedure, abstracted in a component dossier named by the module id. A multisig's operating procedure is a component as much as a contract is.

**System.** A named composition of components for one concern: the HRD supply, the governance control plane, keeper upkeep. It owns its properties and the cells they claim.

**Owner.** The person whose piece it is. A passage means what its owner says it means. A risk is accepted by whoever may accept it. You draft, draw, encode, compose, try and report. You never settle meaning.

**Decision.** What an owner says about a dossier, recorded by `dossier decide` in `decisions.log` in their own words: begin, accept, reject, answer, risk, forget, retire. Each line is chained to the one before by a hash.

**Prose.** The abstraction in words. The only place meaning lives. The chart, the models and the composition cite it and add nothing to it.

**Passage.** One paragraph with a stable id and one claim. The kinds: S State, E Event, M Move, R Refusal, A Always, O Once, N Within, G Given, W Walk, X Seam, K Guarantee, T Words only. An id is never renumbered and never reused.

**Boundary.** The paragraph under the title: what the piece is, the data it holds with each datum's range, the effects it sends and what they carry, and what it never knows. Everyone reads it, nothing checks it, and every range the checks explore comes from it.

**Actor.** A part of the surroundings that sends events and fails as a unit: governance, a multisig, a keeper, a user, the public, the chain, a market, or a contract or protocol with no dossier here. Declared once under `actors/`. A contract that has a dossier is a component, never an actor. Every event's sender names a component or an actor. An event whose sender is an actor of kind `chain` is a tick, one block passing. An actor may pin the records that fix who it is, such as a signer set, and a change to one lapses the cells that rest on the actor.

**Mode.** How an actor behaves in a scenario. `honest`: its Givens hold. `malicious`: its Givens are dropped, and it sends whatever it may, whenever it likes. `offline`: it sends nothing. A component has no mode. A situation of a modeled component is one of its states.

**Scenario.** A mode for every actor. A mode holds for the whole run, or for a window from one tick until another, with the actor honest outside it. A scenario may also give a start: the values a cell begins from in place of the boundary's starting values. `all-honest` always exists. A scenario is the checkable form of the Givens: an honest column is the Given holding, a malicious or offline column is the Given broken. A scenario is stronger than another only when every actor's mode in it is the same or malicious, an actor with a window in either has the same mode in the same window in both unless the stronger has it malicious for the whole run, and both start from the same values. A declared `stronger_than` that the modes or the starts do not support is a tripwire.

**Given.** An assumption about an actor, stated in words with what breaks if it is false: `Given that <text>. If this is false, <text>. Actor: <actor>[, on <event>][, prompt][, only when <condition>].` `prompt` and `only when` each require `on`. When that actor is honest, a Given without `only when` becomes fairness on its moves, or on its moves of the event `on` names. `prompt` also keeps the chain from ticking while a move of that event is enabled. `only when` restricts its moves of that event to the condition, and adds no fairness unless `prompt` is also present. A Given with `prompt` or `only when` is a step Given. A Once or a Within cites any Given, and an Always cites only a step Given. A Given is used, never checked.

**Guarantee.** A component claim the abstraction relies on, with its backing: a Certora rule at a commit, a record or a file in the knowledge base, an external answer, or none. It is backed, assumed or unresolved. An external backing is unresolved until an external answer that came back as called lists the guarantee under `covers`.

**Chart.** The XState machine compiled from the prose, and the grid of states by events. It is tool-written under `chart/`.

**Model.** A TLA+ module scaffolded from the prose and refined by hand, or an Alloy module for structure. For a system, it is the module composed from the members and never edited.

**Composition.** `composition.md`: a system's members with their roles and pins, the wiring where one member's effect is another's event in the same step, the members' sends it leaves unwired on purpose under `free:`, the closure rules, and the default scenarios.

**Closure.** For a system property about an asset, every module that owns an edge of the listed kinds on that asset must be a member. `verify` computes it from the knowledge base, and a missing member makes the cells open. A rule can also list `modules:` that must be members.

**Trial.** One execution of a checker on a call, through `dossier trial`, named by its id, such as `2026-11-07-1135-apalache-fe2621`. It leaves a bundle on the machine that ran it, and its answer goes to its question's entry under [the evidence rules](evidence.md#questions-and-answers). "Run" stays a verb, never a second name for a trial.

**Call.** A file in `<dossier>/calls/` that says what the checker will return and why. The runner captures it before the trial runs, and the entry keeps it beside the answer. A trial whose outcome differs from its call is a **miscall**, and the runner, not you, says so.

**Question.** What a call asks: its kind, the files it executes other than `prose.md`, the passages it expects outcomes for, its scenario and its walk. The reach is not part of it, so a trial that looks further asks the same question again.

**Answer.** What a trial observed for its question: the verdict, `as-called`, `miscalled` or `aborted`, the outcome per passage, the reach, the trace, and the rest the runner parsed from the checker's output. A doubt's answer is something else, the owner's decision that closes a doubt, and is always called that.

**Entry.** The tool-written file `evidence/<name>.json` that holds one question's current answer, with the prediction, the basis, the trial that established the answer and the last answer that differed. Each question has at most one entry. A trial that confirms the answer, or whose answer is refused, leaves an earlier answer current.

**Reading.** Your interpretation of an answer, `evidence/<name>.md`, beside its entry. It retells and classifies, and covers nothing.

**Bundle.** A trial's local folder, `trials/<id>/`: the call as captured, the checker's output, `result.json`, the receipt, and the files its kind adds, such as traces, diffs or Alloy instances. It stays on the machine that ran the trial and is no part of the record.

**Receipt.** The hashes the runner writes into the bundle at execution, so that an edited bundle shows on the machine that holds it.

**Basis.** What an answer rested on: its snapshot, together with the hashes of the files the trial executed and its input identity.

**Snapshot.** The part of a basis taken from the dossier's text and records, hashed when the trial ran. A component's holds the passages, the compiled prose, the records it pins and its guarantees' backing. A system's holds the passages, the members with their backing, the composition, the generated module as the trial's scenario rests on it, `extras.tla`, the actors the system uses with the modes, windows and start the scenario gives them, and the records the members and the actors pin.

**Reach.** How far a trial looked: the constants, the scopes, the step bound, or unbounded for an inductive proof. It belongs to the answer, it is shown beside every mark, and it proves nothing beyond itself.

**Blunder.** A deliberate wrong in a copy of a model or a machine, which a property must catch. A property with no blunder tried at its current text is held. One whose latest blunder at that text held is hollow, and a later answer that is not a blunder's does not clear it.

**Mark.** What the machines say about a passage, computed by `dossier verify` from the answers. **Cell.** What they say about one property under one scenario. Neither is written by hand. The answer a mark or a cell comes from is its deciding answer, chosen as [MARK-DECIDING](evidence.md#the-marks) says.

**Ledger.** `ledger.md` per dossier, and `index.md` at the root with components by systems. Only `dossier render` writes them from the records, each with the machine form in a fenced block at the end. They are views. Nothing reads them as a record, and deleting one changes no conclusion.

**Tripwire.** A condition that means a file was changed where only a tool writes, or a rule was skipped. It fails verify until fixed. **Flag.** What verify prints for the owners to see without blocking anything.

**Doubt.** A passage that can be read two ways, posed in `doubts.md` as two walks that differ, with the alternative you assumed.

**Walk.** A named sequence of events with the states, data and effects expected along the way. At system level, a walk names the members' states and events and the scenario it runs under, or runs under `all-honest`. A witness checks it: a TLC trial whose configuration claims the walk never reaches its end, so the counterexample it finds is the walk.

**Seam.** Where two components meet: the events that cross, named in both dossiers in the same words, or the seam is owed.

**Lapsed.** An answer has lapsed for a passage or a cell when something in its basis that the passage or the cell rests on has changed since, such as the passage or a Given it cites, a file the trial executed, a pinned record or a backing, and for a cell also the composition, a member, the generated module, the scenario or the actors. [The marks](evidence.md#the-marks) list what each comparison covers. A mark or a cell is lapsed when its deciding answer has lapsed, and it shows what moved. **Confirmed.** A passage its owner settled and an answer checked, not lapsed, no doubt open. It is a count, not a mark.

**Process.** The shared observe, select, prepare, predict, execute, interpret, decide and report operations. A task selects its obligations; no persisted loop state determines a claim. [One process](process.md) defines the hand-offs.

## What goes wrong without it, and what notices

| Failure | Rule | What notices |
| --- | --- | --- |
| A property that restates the action it checks | Every property is a passage in the owner's words first, and a blunder must catch it | `held` until a blunder is caught, and `hollow` when the latest blunder holds |
| A race declared acceptable instead of modeled | Actors act whenever they please. A Given is the only restraint, and a scenario can drop it | A property that needs a Given is a Within, a Once, or an Always citing a step Given. The chart rejects it as an Always with no Given |
| A composition that forgets a minter | Closure is computed from the knowledge base's edges | `closure open` and open cells |
| A claim about the whole resting on an unbacked fact about a part | Every guarantee names its backing | `assumed` in the guarantees table, and `backing unresolved` when the rule cannot be found |
| Bounds shrunk until the checker finishes | Reach is in every mark | `narrowed` when a later ordinary answer looked less far |
| A property quietly weakened to pass | The property's definition is hashed into each answer | `reworded` until a new answer |
| A call tuned after the output was seen | The runner captures the call before execution, and the entry keeps it with the answer | An edited entry trips `answer edited` |
| A surprising answer, rerun until it stops surprising | One answer per question. On an unchanged basis, a violation is replaced only with the owner's `forget`, and a miscall only once it is classified | The publication is refused and says why, and the entry keeps the last answer that differed |
| An outcome declared rather than observed | The runner parses the checker's output | The answer in its entry is runner-written, and the ledger ignores anything you say about the outcome |
| A trace glanced at | Every counterexample is retold as a walk before it is classified | `miscall unclassified` |
| A governance change that moved the ground | Each answer's snapshot carries the cited records' hashes | `lapsed` until a new answer |
| A checker run on the side to peek | Every checker runs through `dossier trial` | Only an answer in an entry covers anything. A checker run beside the runner records nothing, and no mark comes from it |
| A hand in the tool-written files | Only the tools write them | `integrity.json` binds every entry and the decisions, so an edit trips `answer edited` or `decisions chain broken`, and an entry that disappears trips `answer removed` until it is restored or forgotten. Ledgers, the index and generated models are views the commands rewrite |

The principle is this. You cannot be prevented from cheating a method you run yourself, but you can be made to do it deliberately, and every rule that costs something at the moment it matters leaves a trace a tool checks. Carelessness shows as a tripwire. What remains is forgery, which version control makes visible, and the honesty of the method rests on your not committing it.

## What this toolkit cannot do

Say these when an owner asks what the method rests on, and whenever a tripwire has fired.

- A proved mark records an inductive proof about the model. Applying it to a deployed system also requires a faithful translation and justified assumptions. A resolved backing reference alone does not prove that faithfulness. Each component's ledger lists its guarantees with their backing in the guarantees table, and each cell's line in a system's ledger names the members it rests on. The assumed guarantees are the risk register of the model itself.
- Nothing refuses a hand edit to the record or a checker run beside the runner. The tripwires and the version history show them afterwards.
- Entries and manifests can be rewritten by whoever can write files. Version control makes that visible, and nothing makes it impossible.
- An entry is the runner's account of what the checker said. The checker's own output stays in the bundle, on the machine that ran the trial, as [Publication and integrity](storage.md#read-only-verification-and-trust-limits) says.
- Covers beyond the mechanical rules are your judgment in the reading. The rules catch a property that was not enabled and an action that never fired. They do not catch a property that is faithful in form and empty in substance. Only a blunder does, and you choose the blunders.
- A checked cell under a scenario says the procedure as written cannot reach a bad state within the reach when the actors behave as the scenario says. It says nothing about whether people behave so. The Givens are assumptions, never checked.
- Nothing runs in the background. A lapse is found the next time `dossier verify` runs, not when the change happens. The keep skill starts every turn with verify.
- One knowledge base, one dossiers root. A seam to a component in another repository is owed forever.
