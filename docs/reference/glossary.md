# Glossary

The words Dossier uses, in plain terms, with the page that defines each one. The README uses a few everyday words where the docs use Dossier's own, and the table below pairs them.

| The README says | The docs say |
| --- | --- |
| sentence | passage |
| specification | prose |
| check | trial |
| result | mark, for a component's passage, or cell, for a system's property under one scenario |
| bounds | reach |
| a copy of the model with a deliberate bug | blunder |

## Terms

- **Actor.** A part of the system's surroundings that sends events and fails as a unit, such as a governance key, a keeper, the public or the chain. See [Components, systems and scenarios](../explanation/components-systems-scenarios.md#actors-modes-and-scenarios).
- **Always, Once and Within.** The three kinds of property. An Always says a bad state is never reached, a Once says a required state eventually follows a trigger, and a Within says it follows within so many ticks. See [Components, systems and scenarios](../explanation/components-systems-scenarios.md#prose-and-passages).
- **Answer.** What a trial observed for its question: whether it came back as called, miscalled or aborted, the outcome for each passage, how far it looked, the trace where there is one, and whatever else the runner parsed from the checker's output. The question's entry holds its current answer. A doubt's answer is something else, the owner's decision. See [How a claim earns its mark](../explanation/evidence.md#one-answer-per-question).
- **Backing.** What supports a Guarantee: a Certora rule at a commit, a record in the knowledge base, or a runner's replay. A guarantee with a backing is `backed`, and one without is `assumed`. See [Back a guarantee](../how-to/back-a-guarantee.md).
- **Basis.** What an answer rested on: its snapshot, the hashes of the passages, records and backings it depended on, and for a system the composition, the generated module, the scenario and the actors, together with the hashes of the files its trial executed and its input identity. An answer lapses when its basis no longer matches the present. See [Files](files.md#evidence).
- **Blunder.** A copy of the model with one deliberate wrong, which a property must fail on before it can be marked `checked` or `proved`. A property whose blunder failed is `caught`, one with no blunder tried yet is `owed`, and one that held on its blunder is `hollow`. See [How a claim earns its mark](../explanation/evidence.md#a-planted-bug-for-every-property).
- **Bundle.** A trial's local folder, `trials/<id>/`: the call as captured, the checker's output, `result.json` and the receipt, with the files its kind adds, such as a blunder's diff. Nothing reads it for a mark. See [Files](files.md#trial-bundles).
- **Call.** The file written before a trial runs. It names what to run, how far to look and what each property will return. An answer that matches its call is `as-called`, and one that differs is `miscalled`. See [Files](files.md#calls).
- **Cell.** One system property under one scenario, the unit a system's ledger reports. See [Components, systems and scenarios](../explanation/components-systems-scenarios.md#cells-and-the-matrix).
- **Chart.** The XState statechart compiled from a component's prose. It checks the prose against itself before any model runs. See [Three kinds of tool](../explanation/three-kinds-of-tool.md).
- **Component.** A contract or a procedure, described in its own prose. See [Components, systems and scenarios](../explanation/components-systems-scenarios.md).
- **Composition.** A system's members and how their effects are wired to each other's events, in `composition.md`. See [Compose a system](../how-to/compose-a-system.md).
- **Confirmed.** A count of the passages the owner settled and a checker established, not lapsed and with no doubt open. Verify and the ledgers print it beside `settled`. See [Marks](marks.md#summary-lines).
- **Current answer.** The answer an entry holds now. A trial whose answer the rules refuse leaves the earlier answer current. See [Files](files.md#evidence).
- **Deciding answer.** Among the current answers on a cell, or on the chart side or the model side of a passage, the one that decides the mark: the strongest, and the latest among equals. See [Marks](marks.md).
- **Doubt.** A passage the agent can read two ways, written as two walks that differ, for the owner to choose between. See [Files](files.md#doubtsmd).
- **Doubt's answer.** The owner's `answer D<n> a|b` decision, which closes a doubt by choosing one of its two walks. See [Files](files.md#doubtsmd).
- **Dossier.** The folder that holds one component's or one system's prose, models, answers, decisions and ledger. See [What Dossier keeps](../explanation/what-dossier-keeps.md).
- **Entry.** The tool-written file `evidence/<name>.json` that holds one question's current answer, with the call's prediction, the answer's basis, the trial that established it, and the last answer that differed. See [Files](files.md#evidence).
- **Event.** Something a component receives, and who sends it, written as an E passage. See [Components, systems and scenarios](../explanation/components-systems-scenarios.md#prose-and-passages).
- **Explorer.** A page in your browser over the dossiers root, which `dossier explore` serves. It shows what verify concludes, a component's prose beside its chart, and walks, doubts and traces step by step, and it never changes a file. See [Open the explorer](../how-to/open-the-explorer.md).
- **Given.** A passage stating an assumption about an actor, such as a keeper acting before the next block. A scenario can drop it. See [Components, systems and scenarios](../explanation/components-systems-scenarios.md#prose-and-passages).
- **Guarantee.** A passage stating what the abstraction relies on in the deployed code, with its backing. See [Back a guarantee](../how-to/back-a-guarantee.md).
- **Lapse.** What happens to an answer when something in its basis changes, and to the mark or the cell it decides. A lapsed mark waits for a trial to ask that answer's question again. See [How a claim earns its mark](../explanation/evidence.md#a-snapshot-behind-every-result).
- **Ledger.** The report `dossier render` writes for a dossier, with the owner's column beside the machine's. It is a view, rebuilt from the authored inputs and the record. See [Files](files.md#ledgers-and-the-index).
- **Margin.** `margin.md`, the agent's notes beside a component's prose, such as what the knowledge base's records say. It is not part of the specification. See [Start a component](../how-to/start-a-component.md).
- **Mark.** The machine's word on a passage or a cell, such as `proved`, `checked`, `violated` or `lapsed`. Marks are computed from the authored inputs and the record, never written by hand. See [Marks](marks.md).
- **Member.** A component that takes part in a system. See [Components, systems and scenarios](../explanation/components-systems-scenarios.md#systems-and-compositions).
- **Mode.** How an actor behaves under a scenario: `honest` keeps its Givens, `malicious` drops them, and `offline` sends nothing. See [Components, systems and scenarios](../explanation/components-systems-scenarios.md#actors-modes-and-scenarios).
- **Move.** What an event does in a state, written as an M passage, such as `When Idle receives schedule, it becomes Scheduled`. Every action in a model names the Move it encodes. See [Components, systems and scenarios](../explanation/components-systems-scenarios.md#prose-and-passages).
- **Passage.** One numbered paragraph of prose, such as `[S1] Idle: no plan waits.`, with one claim. The README calls passages sentences. See [Components, systems and scenarios](../explanation/components-systems-scenarios.md#prose-and-passages).
- **Pin.** A record in the knowledge base that fixes which instance a component or an actor is, such as a checkpoint observation. An answer that rested on a pinned record lapses when the record changes. See [Set up a repository](../how-to/set-up-a-repository.md).
- **Prose.** A component's or a system's passages, written in a controlled English that a compiler reads. The README calls it the specification. See [Prose](prose.md).
- **Publication.** The step after a trial, under the dossier's lock, that writes the trial's answer to its question's entry, keeps the entry as it is, or refuses the answer. See [Files](files.md#evidence).
- **Question.** What a call asks: its kind, the files it executes other than `prose.md`, the passages it expects outcomes for, its scenario and its walk. How far the trial looks belongs to the answer, so a trial that looks further asks the same question again. See [How a claim earns its mark](../explanation/evidence.md#one-answer-per-question).
- **Reach.** How far a trial looked, such as `delay 2; amounts up to 2`. A `checked` mark holds within its reach. See [Marks](marks.md).
- **Reading.** The agent's interpretation of an answer, such as a counterexample retold, in `evidence/<name>.md` beside its entry. A miscall's reading carries its classification. It never changes a mark, and it is removed when a new answer replaces the one it reads. See [Files](files.md#evidence).
- **Receipt.** The hashes the runner writes into a trial's bundle, so that an edited bundle shows on the machine that holds it. See [Files](files.md#trial-bundles).
- **Record.** The committed whole a dossier keeps beside its authored inputs: its entries, the readings beside them, its decisions and its `integrity.json`, which binds the entries and the decisions. See [Files](files.md#integrityjson).
- **Refusal.** What an event cannot do in a state, written as an R passage. See [Components, systems and scenarios](../explanation/components-systems-scenarios.md#prose-and-passages).
- **Runner.** The part of `dossier trial` that executes a call. It copies the files the call names, runs the checker on the copies, leaves the trial's bundle and passes its answer to publication. An external runner, such as a replay against a fork, is one you provide. See [How a claim earns its mark](../explanation/evidence.md#a-call-before-every-trial).
- **Scenario.** An assignment of a mode to each actor, such as `governance-captured`, in which Governance is malicious. See [Components, systems and scenarios](../explanation/components-systems-scenarios.md#actors-modes-and-scenarios).
- **Seam.** A passage naming where one component meets another. Both components hold the same text. See [Prose](prose.md).
- **Settled.** A passage the owner accepted at its current words. One the owner has not yet accepted is `unsettled`, and one turned down is `rejected`. See [Marks](marks.md#the-owners-column).
- **State.** A situation a component can be in, written as an S passage. See [Components, systems and scenarios](../explanation/components-systems-scenarios.md#prose-and-passages).
- **System.** Several components wired together around one concern, such as governance control. See [Components, systems and scenarios](../explanation/components-systems-scenarios.md#systems-and-compositions).
- **Tier.** How far a component goes. A `charted` component stops at the chart, and a `modeled` one also gets TLA+ models and solver trials. See [Components, systems and scenarios](../explanation/components-systems-scenarios.md#the-chart).
- **Trial.** One execution of a checker on a call, through `dossier trial`, named by an id of the form `<date>-<hhmm>-<kind>-<hash>`. It leaves a bundle, and its publication writes its answer to the question's entry when the rules for a new answer allow it. See [Files](files.md#trial-bundles).
- **Tripwire.** A finding that makes verify fail, such as an edited entry or a model action that cites no passage. See [Marks](marks.md#tripwires).
- **Verify line.** The first line `dossier verify` prints, which says whether the record is intact. See [What Dossier keeps](../explanation/what-dossier-keeps.md#the-verify-line).
- **Walk.** An example run written in the prose, step by step, with where it ends. A witness trial checks that the model can take it. See [Components, systems and scenarios](../explanation/components-systems-scenarios.md#systems-and-compositions).
- **Witness.** A trial that asks a checker to find the path a walk describes, which shows the model can take it. See [Components, systems and scenarios](../explanation/components-systems-scenarios.md#systems-and-compositions).
- **Words only.** A passage stating what no tool here can check, and why, so the gap shows. See [What Dossier keeps](../explanation/what-dossier-keeps.md#what-the-ledger-says-and-what-it-does-not).
