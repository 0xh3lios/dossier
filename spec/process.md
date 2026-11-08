# One process

An agent turns an owner's request into scoped inputs, checks those inputs through the tools, interprets the evidence and reports what it establishes. Part, composition, refresh and probe work use this process with different obligations. No workflow state file is required. The current inputs, evidence and decisions determine what remains.

## Observe and select

**PROC-OBSERVE.** Begin with `dossier verify --brief` and read its findings. A tripwire blocks new evidence work on the affected record until addressed. Report the blockage and continue unrelated work where possible. An owner's request selects scope before the suggested `next:` route.

Locate the part, composition, property, scenario or typed knowledge reference with `dossier where`. A request that names no property yet needs an explicit proposed scope. Notes in `margin.md` may preserve unfinished reasoning. They do not grant evidence, settle passages or choose which answer counts. An intake line is not required for correctness.

## Prepare

**PROC-PREPARE.** Author only the inputs the request needs. Keep passage ids stable. State data ranges, actor assumptions, scenario and requested reach before execution. Resolve the applicable [language](language.md), [composition](composition.md), [model](models.md) and [checker](checkers/tlc.md) contracts.

Draw a changed part to check its sentences against the chart. Drawing creates a diagnostic view. A chart claim needs a chart answer. Scaffold a part before model refinement. Scaffold a composition to materialize its generated module and configurations. A composition's generated files remain tool-owned.

Every guarantee names its backing or explicitly says `none`. A missing backing remains an assumption or unresolved reference. Closure remains open until all required members are present. Neither an agent's explanation nor a successful checker makes an open composition closed.

## Predict and execute

**PROC-CALL.** Write the call before the trial runs. It identifies the exact executed inputs, enabled properties, scope, expected outcomes and reasons. A witness predicts its path. A blunder identifies the deliberate fault and the one property it tests. An inductive call names its invariant and constant initialization. The agent may have `dossier call` write the lines that identify the question: the kind, the executed files, the cell or walk, the mode, invariant and constant initialization, a blunder's base, and the names the call must expect an outcome for. For a model blunder, the agent may have `dossier blunder` write the copy with its one replacement, the configuration beside it that enables only the property, and the call. The runner accepts a call or a blunder copy written by hand alike. The agent writes the prediction, `reach:`, the outcomes under `expect:` and `because:`, and what only it knows, such as a blunder's wrong.

**PROC-EXECUTE.** Run recorded checks through `dossier trial`. A refused call grants no evidence and creates no trial. An aborted trial covers nothing. A completed trial's answer goes through publication even when it differs from the prediction, and [the evidence rules](evidence.md#questions-and-answers) decide whether it is written, kept or refused. A trial that confirms the current answer writes no entry. The agent cannot repair a disagreement by editing the call, the entry or the bundle.

For a composition cell, use its property/scenario configuration or constant initialization exactly. An answer under one scenario does not become evidence for another merely because the agent chose a different label.

## Interpret

**PROC-INTERPRET.** Read the trial's output and its answer before writing the answer's reading, `evidence/<name>.md`. Retell a witness or counterexample from its trace. Explain why a blunder tests the stated property. Classify a miscall using [the model contract](models.md#classifying-a-miscall). The reading is interpretation. It cannot add a checked property, widen reach or replace the runner's observation.

**PROC-NO-WEAKENING.** Do not loosen a guard, weaken a property, drop a Given, soften a scenario or shrink reach to make an unexpected answer match the call. If the model mistranslates the prose, repair the encoding and run a new trial. If the prose is at fault, present the conflicting walks and obtain the owner's decision before changing its meaning.

## Decide when needed

**PROC-OWNER.** The owner settles passages and accepts risk. The agent records only the owner's supplied words through `dossier decide`. Do not invent an approval, a risk acceptance or a doubt's answer. Stop the affected work for unsettled meaning that controls the next step, a consequential doubt, or a violated cell needing a decision. Other work can continue.

| Decision | Effect |
| --- | --- |
| Accept/reject passages | Applies to the identified passage hashes |
| Answer a doubt | Records the chosen alternative at the authored doubt's hash, which closes the doubt until its alternatives change |
| Accept a risk | The violated cell remains violated and shows acceptance while its deciding answer is the one the owner was shown |
| Forget an answer | Lets one answer go: an entry whose file is gone, a violation that a new answer on an unchanged basis would replace, or a superseded answer that holds a counterexample |
| Retire/begin | Changes the dossier's lifecycle; beginning again reopens it |

Decisions do not create solver evidence. A changed property invalidates an acceptance tied to its old hash. An entry's digest or the decisions' hash chain detects selected changes; it does not authenticate an owner who can rewrite the whole repository.

## Report

**PROC-REPORT.** Verify again. Report the exact current mark, scope and dependencies, plus changes made, new trial ids, unresolved doubts and the next useful action. State whether an answer is bounded, inductive, violated, lapsed, held or assumed. A successful prediction is not a proof. An accepted violation is not a successful property.

Verify writes nothing. Use `dossier render` for the ledgers and the index, and `dossier scaffold` for generated model views. Follow [the storage contract](storage.md) to recover interrupted work.

## Obligations by task

| Task | Additional inputs | Required outcome | What remains distinct |
| --- | --- | --- | --- |
| Part | Module records or procedure, prose, backing | Chart evidence, model evidence at the declared tier, readings, unresolved assumptions reported | A charted part does not owe model checks it cannot perform; Once/Within and Given-dependent claims are not proved by its chart |
| Composition | Members, wiring, closure, actors, scenarios, properties/walks | Each claimed cell/walk has its own evidence, each property has a sensitivity blunder, violations are surfaced | Wiring is simultaneous; modes belong to actors; assumptions and closure must remain visible |
| Refresh | Changed dependency and the answers it lapsed | Relevant inputs corrected and the lapsed questions asked again in dependency order | Never alter an entry to clear a lapse |
| Probe | The owner's request and its scope | A reply supported by a chart diagnostic or a witness or property answer, with its limits | A diagnostic is not durable evidence; extending a claim changes the authored property |
| Decision | Finding and owner words | Exact decision recorded and its effect reported | Acceptance, truth and evidence freshness remain separate |
| Review | Inputs and evidence, without the keeper's conversation | Independent findings with artifact references and status | No decisions or input/evidence edits; one review file is the only intended write |

A part followed by a composition is one dependency-ordered task. A refreshed cell and a new cell use the same call, trial and reading operations. The router's `Write`, `Draw`, `Encode`, `Compose`, `Try`, `Refresh`, `Fix`, `Review` and `Report` are suggestions about unmet obligations, not separate stores of progress.
