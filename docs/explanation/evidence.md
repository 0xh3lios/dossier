# How a claim earns its mark

An agent does most of the work in a [dossier](what-dossier-keeps.md), so the record has to stand without trusting the agent. The tool computes every [mark](../reference/marks.md) from files that the agent cannot change without leaving a trace. Each mechanism below guards against a way an agent's work can go wrong: an assumption nobody chose, a property weakened until it passes, a surprise rerun until it agrees, or a result that has gone stale. [Why model the system](why-model-the-system.md#where-the-risk-moves) sets out those risks.

## A call before every trial

Before a checker runs, the agent writes a call with `dossier call`. The command fills in the files to run and the names to expect from the model and its configuration, and the agent adds how far to look, what each property will return, and why. A trial then executes the call through `dossier trial`. The runner copies the files the call names, runs the checker on the copies and parses what the checker returns into the trial's answer. Toolchains, shared libraries and an external runner's surroundings are not copied, and [Files](../reference/files.md#trial-bundles) describes that boundary.

Writing the expectation first matters. An answer that matches the call is `as-called`. An answer that differs is `miscalled`, and a miscall cannot be quietly rerun until it agrees. The agent interprets each answer in a reading, a note it writes beside the answer. A miscall's reading classifies it on a `classification:` line, with one of these five, word for word:

- `model misread prose, action`. An action says something its [passage](parts-compositions-scenarios.md#prose-and-passages) does not. The model is fixed and tried again.
- `model misread prose, property`. A property says something its passage does not. The model is fixed and tried again.
- `chart differs from prose`. The compiler and the model disagree, which is a defect in the tool.
- `prose at fault`. Every step is licensed by the prose and the property is faithful, so the prose contradicts itself. The owner decides.
- `call was wrong`. The answer is what the prose implies, and only the prediction missed. Whether it was really that, and not a prose fault dressed down, only a second read judges.

An unclassified miscall fails verify, and so does a classification worded otherwise. The reading explains the classification on the lines after it. The one thing the agent may never do is change a guard, a property, an assumption or a reach so that a trial comes back as called.

## One answer per question

Each call asks a question: which kind of check to run on which files, which passages to expect outcomes for, and under which [scenario](parts-compositions-scenarios.md#actors-modes-and-scenarios) or along which walk. How far the trial looks does not belong to the question. It belongs to the answer, so a trial that looks further asks the same question again. Each question's current answer is kept in a file under the dossier's `evidence/`, the question's entry, which only the runner writes. The entry holds the call's prediction, the answer with any trace, the hashes of everything the answer rested on, and the trial that established it. The agent's reading of the answer sits beside it. A dossier keeps one entry per question, so its record grows with the questions it asks, not with how often it asks them.

A trial ends in publication, the step that writes its answer to the entry, keeps the entry as it is, or refuses the answer. A trial that gives the current answer again, while that answer has not [lapsed](#a-snapshot-behind-every-result), leaves the entry unchanged. Otherwise the new answer replaces the entry, within limits that keep a surprise from being rerun away:

- **A violation stays until what it rested on changes.** While the current answer has not lapsed, no new answer replaces a violation with a pass, whether it looks less far, comes from another version of the checker or was made by hand. Only the owner's `forget` lets the violation go. Once something it rested on changes, the change itself says why.
- **A miscall stays until it is classified.** When a different answer replaces it, its classification moves with it into the entry's previous answer.
- **The last different answer stays.** When a new answer's verdict or outcomes differ, the entry keeps the answer it replaced, with its trace and its classification. When the new answer looks less far, the entry keeps the further reach, flagged `narrowed`, until an answer looks as far again.
- **An aborted trial never replaces an answer.** Its answer is written only for a question with no entry yet, and is flagged `unrun` until a completed answer replaces it.

Each question keeps its own entry, so several current answers can speak for one passage or one [cell](parts-compositions-scenarios.md#cells-and-the-matrix). One of them decides the mark. A miscall on that passage or cell decides while it is the latest answer there and has not lapsed. Otherwise a counterexample that has not lapsed decides over any proof or check from another question, until the owner forgets it. Among the rest, a proof decides before a check, and the latest decides among equals. [Marks](../reference/marks.md) gives the rule in full.

A question is gone when a passage it expects an outcome for, its scenario, its walk or a file it executes no longer exists. Verify flags its entry `question gone`, and the next publication in the dossier that is not refused removes it.

An answer is superseded when answers to other questions speak for everything it spoke for, and verify concludes the same without it. A check of a cell established after a proof of that cell is one, since the proof decides. Verify flags it `answer superseded`, and the next publication removes it in the same way. Removing it keeps the record to the questions the dossier asks now. A superseded answer that holds a counterexample stays until the owner forgets it. [Files](../reference/files.md#evidence) gives the entry's fields and these rules in full.

`dossier recheck` asks each entry's question again, at the reach the entry records, and reports any answer that comes back different. It writes nothing. It does not ask the question of a lapsed, aborted or superseded answer, or of a gone question, and lists each as not run. It needs the toolchain the answers came from. The agent can run it, and so can a CI job, as [Recheck in CI](../how-to/recheck-in-ci.md) shows. A clone of the repository confirms its answers this way, since the record keeps [the answers but not the checker's output](limits.md).

## Every model element cites a passage

A model encodes the prose and is meant to add nothing of its own. Every action in a TLA+ model names the Move it encodes, and every fairness clause names the [Given](parts-compositions-scenarios.md#prose-and-passages) it comes from. Every fact, assertion and check in an Alloy model names its passage. An element that names none is a tripwire: `action without Move`, `fairness without Given` or `fact without passage`. An agent therefore cannot slip in an assumption that a keeper always acts. The fairness needs a Given, the Given names the keeper, and a scenario can drop it. Verify does not read a model's `Init` or a state constraint in a TLC configuration this way, so a restriction there is a question for a [second read](#a-second-read).

Two flags catch quieter edits. A property whose definition in a part's model changed while its passage did not is `reworded` until a trial runs the new definition. An answer that records a smaller reach than the answer it replaced, in the numbers both record, is `narrowed`. A composition's properties cannot be reworded this way, because its model is generated from the prose and never edited.

## A planted bug for every property

A property that has never failed has not shown it can fail. For every Always, Once and Within, the agent writes a blunder: a copy of the model with one deliberate wrong, such as a guard loosened or a fairness clause dropped, together with a call that expects the property to fail. This is mutation testing, with the model as the program and the properties as the tests.

- **Caught.** The property failed on the blunder, so it is testing something.
- **Owed.** No blunder has been tried yet. The mark stays `held` until one is caught.
- **Hollow.** The latest blunder was tried and the property held anyway, so it was never testing anything. A later trial that is not a blunder does not clear it.

A blunder counts only for the property's current text. When the passage changes, the property owes a new one.

## A snapshot behind every result

Every answer records its basis, the hashes of everything it rested on. Its snapshot is what the basis takes from the dossier's text and records: the passages and the Givens they cite, the records the dossier pins or cites, and the backing of each [guarantee](three-kinds-of-tool.md#the-grounding-backs). A composition's snapshot also holds its wiring, its members, the module the tool generated, and the actors the composition uses with the modes, windows and start its scenario gives them. The rest of the basis is the hashes of the files the trial executed and of the local files they import. When anything in it moves, the marks and cells that rested on it lapse. An edit to a hand-refined model, for instance, lapses every mark whose answer executed it. Nothing else lapses a mark or a cell, so a change costs exactly one new trial for each answer it lapsed.

## Guards and tripwires

Nothing refuses the agent's edits. What protects the record is that it shows them. `integrity.json`, the dossier's manifest, binds every entry and every committed decision. An edited entry trips `answer edited`, an edited decision line trips `decisions chain broken`, and an entry that disappears trips `answer removed`. A checker run anywhere but through `dossier trial` records nothing, and no mark comes from it. The [ledgers](../reference/files.md#ledgers-and-the-index), the index and the generated models are views that the commands rewrite, and only the reading stays the author's to edit.

Tripwires detect changed, missing or unbound entries, a broken decision log, a manifest that is missing or unreadable, and model elements with no passage behind them. When an entry's file is removed, the manifest keeps its line, and verify fails until the file is restored or the owner forgets its answer. Rendering a ledger cannot erase that line. An edited or deleted ledger changes no conclusion. Verification never repairs or acknowledges a fault. Fix the fault before further evidence work in that dossier, while unrelated work continues.

## Decisions in the owner's words

`dossier decide` records each decision with its targets' hashes, the owner's exact words, and the hash of the previous line. Only the lines the manifest commits apply. A line appended after them counts for nothing until an explicit recovery commits it. A doubt's answer binds the authored alternatives, and changed alternatives need a new decision.

A risk accepted on a cell names the trial that established the violation the owner saw. The cell stays violated, and shows the acceptance while its deciding answer is the one that trial established. A trial that gives the same answer again keeps the acceptance. Any other answer that comes to decide the cell lapses it. That may be a new answer after a change to the property's text, its Givens, the members or the scenario's modes, windows and start, an answer from a trial that looked further, or an answer to another question on the cell.

A `forget` names one entry, by its name and the start of the digest the manifest binds for it, and lets that answer go. It applies to an entry whose file is gone, to a violation that a new answer would replace while nothing it rested on has changed, and to a superseded answer that holds a counterexample. A forget deletes no entry by itself. A new answer can then replace a forgotten violation, and the next publication removes a forgotten superseded answer.

## A second read

The review skill reads a dossier with none of the conversation that built it, and the only file it writes is its review. It judges what the mechanisms above cannot: whether each blunder is a real wrong, whether each property says what its passage says, whether each backing supports its guarantee, whether each scenario means what its column says, and whether each composition is closed. Where the solvers are installed, it also runs [`dossier recheck`](#one-answer-per-question) on the dossier. Its findings change no mark, and the owner decides what to do about each one. [Get a second read](../how-to/get-a-second-read.md) shows how to ask for one.

## Summary

A mark is a computation over authored inputs, current answers and decisions. A model element with no passage behind it is a tripwire. An answer that surprised the agent stays visible as a surprise. A violation is not rerun away while what it rested on is unchanged. A property that was never shown to fail is held, and one that tests nothing is hollow. A dependency change is a lapse. Local hashes cannot authenticate an owner or detect an actor rewriting every record and anchor consistently. The [storage contract](../../spec/storage.md) and [limits of a mark](limits.md) state those limits.
