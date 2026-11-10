# One process

An agent develops a [behavior collection](behaviors.md), checks its claims and explains what the answers support or challenge. Part, composition, refresh and probe work use this process with different obligations. No workflow state file is required. The current inputs, evidence, reviews and decisions determine what remains.

## Observe and select

**PROC-OBSERVE.** Begin with `dossier verify --brief` and read its findings. A tripwire blocks new evidence work on the affected record until addressed. Report the blockage and continue unrelated work where possible. An owner's request selects scope before the suggested `next:` route.

Open the dossier's README for what it is for, its vocabulary, its actors, the usual flow, its boundaries and its behaviors in order. Read the behavior the request concerns, and each claim's standing, before following its mappings into the prose, a walk, a model or the source. Locate a behavior's claim, a part, a composition, a property, a scenario or a typed knowledge reference with `dossier where`.

Select a claim to challenge or refresh, or state a new one. A claim without enough support stays a hypothesis, and it does not block unrelated work. A walk or another passage that no behavior is associated with can still be found, and it is not for that reason unfinished.

A request that names no claim yet needs an explicit proposed scope. Notes in `margin.md` may preserve unfinished reasoning. They do not grant evidence, settle passages or choose which answer counts. An intake line is not required for correctness.

## Prepare

**PROC-PREPARE.** Author only the inputs the request needs. Keep behavior, claim and passage ids stable. A behavior explains one mechanism and may hold several claims, each judged by itself. It need not match one function or one transition. State each claim's kind, descriptive or requirement, with its scope, assumptions and limits. [The behavior contract](behaviors.md) owns the form of its file.

Choose evidence that can answer the claim as it is worded. A walk shows one path, a bounded model check examines the states its reach gives, and a case run against the source establishes the outcome it exercised at the inputs it pins. None of them lends its kind of support to another by association. State data ranges, actor assumptions, scenario and requested reach before execution. Resolve the applicable [language](language.md), [composition](composition.md), [model](models.md) and [checker](checkers/tlc.md) contracts.

Write the shared formal abstraction in `prose.md`. Connect a claim to an exact passage, cell, walk, answer or knowledge record with a mapping that gives its reason. Do not copy a fact about the source or a solver's conclusion into the behavior file as a second authority to edit.

Draw a changed part to check its sentences against the chart. Drawing creates a diagnostic view. A chart claim needs a chart answer. Scaffold a part before model refinement. Scaffold a composition to materialize its generated module and configurations. A composition's generated files remain tool-owned.

Every guarantee names its backing or explicitly says `none`. A missing backing remains an assumption or unresolved reference. Closure remains open until all required members are present. Neither an agent's explanation nor a successful checker makes an open composition closed.

## Predict and execute

**PROC-CALL.** Write the call before the trial runs. It identifies the exact executed inputs, enabled properties, scope, expected outcomes and reasons. A witness predicts its path. A blunder identifies the deliberate fault and the one property it tests. An inductive call names its invariant and constant initialization. The agent may have `dossier call` write the lines that identify the question: the kind, the executed files, the cell or walk, the mode, invariant and constant initialization, a blunder's base, and the names the call must expect an outcome for. For a model blunder, the agent may have `dossier blunder` write the copy with its one replacement, the configuration beside it that enables only the property, and the call. The runner accepts a call or a blunder copy written by hand alike. The agent writes the prediction, `reach:`, the outcomes under `expect:` and `because:`, and what only it knows, such as a blunder's wrong.

**PROC-EXECUTE.** Run recorded checks through `dossier trial`. A refused call grants no evidence and creates no trial. An aborted trial covers nothing. A completed trial's answer goes through publication even when it differs from the prediction, and [the evidence rules](evidence.md#questions-and-answers) decide whether it is written, kept or refused. A trial that confirms the current answer writes no entry. The agent cannot repair a disagreement by editing the call, the entry or the bundle.

For a composition cell, use its property/scenario configuration or constant initialization exactly. An answer under one scenario does not become evidence for another merely because the agent chose a different label.

## Interpret

**PROC-INTERPRET.** Read the trial's output and its answer before writing the answer's reading, `evidence/<name>.md`. Retell a witness or counterexample from its trace. Explain why a blunder tests the stated property. Classify a miscall using [the model contract](models.md#classifying-a-miscall). The reading is interpretation. It cannot add a checked property, widen reach or replace the runner's observation.

Once the answer is read, explain how it bears on the behavior's claim, and revise the mapping's rationale or limitations where they need it. A mapping to a current answer resolves the published evidence again each time. A trial id kept from memory is history and selects nothing. The code checks identity, freshness and the recorded outcomes. The author judges the claim and the encoding, and an independent reviewer judges whether the mapped evidence supports what the claim asserts. Neither an explanation nor a review changes the recorded result.

**PROC-NO-WEAKENING.** Do not loosen a guard, weaken a property, drop a Given, soften a scenario or shrink reach to make an unexpected answer match the call. If the model mistranslates the prose, repair the encoding and run a new trial. If settled prose or a requirement is at fault, present the conflicting walks and obtain the owner's decision before changing its meaning. A descriptive hypothesis may be corrected or refuted, with its earlier wording and the reason kept in a review's findings or in version control. Do not reword a violated requirement into a description of the violation and call it satisfied.

## Decide when needed

**PROC-OWNER.** The owner settles passages and accepts risk. The agent records only the owner's supplied words through `dossier decide`. Do not invent an approval, a risk acceptance or a doubt's answer. Stop only the work that needs a decision the owner has not made, such as changing a settled meaning, choosing a consequential alternative or accepting a risk. A violated cell may stay unaccepted while the investigation the owner allowed, the analysis of a recovery and an independent review go on. Do not ask again for a decision the owner already gave, and do not take leave to investigate as an acceptance.

| Decision | Effect |
| --- | --- |
| Accept/reject passages | Applies to the identified passage hashes |
| Answer a doubt | Records the chosen alternative at the authored doubt's hash, which closes the doubt until its alternatives change |
| Accept a risk | The violated cell remains violated and shows acceptance while its deciding answer is the one the owner was shown |
| Forget an answer | Lets one answer go: an entry whose file is gone, a violation that a new answer on an unchanged basis would replace, or a superseded answer that holds a counterexample |
| Retire/begin | Changes the dossier's lifecycle; beginning again reopens it |

No decision accepts or rejects a behavior. Report a decision that stands with the exact passage or cell it was made on and its hash. A behavior associated with that passage or cell does not extend the decision.

Decisions do not create solver evidence. A changed property invalidates an acceptance tied to its old hash. An entry's digest or the decisions' hash chain detects selected changes; it does not authenticate an owner who can rewrite the whole repository.

## Report

**PROC-REPORT.** Verify again. Lead with the behavior and what is now known of each claim the work touched. Keep the kind of evidence and its reach, where it applies, its freshness, the review's assessment and the owner's decision apart. Report the exact current marks and dependencies behind the account, plus changes made, new trial ids, unresolved doubts and the next useful action. State whether an answer is bounded, inductive, violated, lapsed, held or assumed. A successful prediction is not a proof. An accepted violation is not a successful property.

Ask for an independent review when a new or changed mapping is meant to support a claim. [The review contract](review.md) tells a review of one behavior from a review of the whole dossier. A file that parses, and a claim whose support is current, can still be wrong in what they mean. Report any review still owed, and do not call anything verified yourself.

Verify writes nothing. Use `dossier render` for the ledgers and the index, and `dossier scaffold` for generated model views. Follow [the storage contract](storage.md) to recover interrupted work.

## Obligations by task

| Task | Additional inputs | Required outcome | What remains distinct |
| --- | --- | --- | --- |
| Part | Module records or procedure, behavior collection, prose, backing | Chart evidence, model evidence at the declared tier, readings, unresolved assumptions reported | A charted part does not owe model checks it cannot perform; Once/Within and Given-dependent claims are not proved by its chart |
| Composition | Behavior collection, members, wiring, closure, actors, scenarios, properties/walks | Each claimed cell/walk has its own evidence, each property has a sensitivity blunder, violations are surfaced | Wiring is simultaneous; modes belong to actors; assumptions and closure must remain visible |
| Refresh | Changed claim, explanation, dependency or evidence | Affected mappings and reviews examined again, and the lapsed questions asked again in dependency order | An edit to one claim takes only that claim's assessments out of effect, and an edit to the explanation alone takes none; neither lapses a solver's answer. Never alter an entry to clear a lapse |
| Probe | The owner's request and its scope | A reply supported by a chart diagnostic or a witness or property answer, with its limits | A diagnostic is not durable evidence; extending a claim changes the authored property |
| Decision | Finding and owner words | Exact decision recorded and its effect reported | Acceptance, truth and evidence freshness remain separate |
| Review | The subject, one behavior or the dossier, with its required basis and evidence, without the keeper's conversation | Coverage, an assessment of each mapping and independent findings with artifact references and status | A review of one behavior never stands in for a dossier review; no decisions or input/evidence edits; one new review file is the intended write |

A part followed by a composition is one dependency-ordered task. A refreshed cell and a new cell use the same call, trial and reading operations. The router's `Write`, `Draw`, `Encode`, `Compose`, `Try`, `Refresh`, `Fix`, `Review` and `Report` are suggestions about unmet obligations, not separate stores of progress.
