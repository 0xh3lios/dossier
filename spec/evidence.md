# Evidence and decisions

Read when reading a ledger or the index, when verify says FAIL, and before a report.

## The owner's column

`decisions.log` holds one line per decision, written by `dossier decide` from the owner's words and the current hashes, chained by the hash of the previous line:

Example `decision-chain`. Illustrative decisions with invented passage hashes; the chain itself must parse intact. These words authorize nothing.

```
2026-11-03T20:10:00Z accept S1@f9029fad E1@c45ac20d "the ledger as deployed" 00000000
2026-11-03T20:12:00Z reject K4@009184be "the ceiling is also lowered by a governance plan; say so" 332d89d5
2026-11-03T20:15:00Z risk N1@2f9eddcf lanes-offline 2026-11-03-2014-apalache-5c1e0a "both lanes down is an incident" 5391e1df
```

A passage is settled when its latest committed decision is an accept at its current hash, rejected when a reject at its current hash, otherwise unsettled. [Publication and integrity](storage.md) defines the committed prefix. Pending bytes grant no decisions. A broken chain is a tripwire. While the dossier has a tripwire, `dossier decide` appends nothing, except `begin` and `retire`, and `forget` while the only tripwires are `answer removed`. These exceptions cannot bypass unavailable or damaged publication authority, or a missing `integrity.json` beside decisions or entries.

A risk accepts a violation a trial has shown. `dossier decide` records one only on a cell that is violated now, and the line names the trial that established the cell's deciding answer. The latest risk decision on a cell holds while the cell is violated and the answer that decides it is still the one that trial established. A trial that gives the same answer again writes no entry, so it keeps the acceptance. Any other answer that comes to decide the cell leaves the violation without an acceptance, and the cell owes a new decision. It may be a new answer to the same question, after a change that lapsed the accepted one, such as a reworded property or a changed Given, member or scenario under the same name, or at a new reach. It may also be an answer to another question on the cell. Verify then shows `acceptance lapsed` with what moved, or with the trial whose answer now decides.

A doubt is open until the owner's `answer D<n> a|b` decision closes it. The decision records `D<n>@<hash>` and the selected alternative, and the hash binds the doubt's normalized authored text. Changing the alternatives reopens the doubt and flags `doubt answer stale`. A component's tier comes from `Tier:` in its prose, and is modeled when the prose names none. A begin decision records the dossier's lifecycle, not its tier.

`retire` sets a dossier aside. Verify skips its ordinary analysis, index entry and route, while still auditing its integrity. A system that still names a retired component fails composition, and an event from a retired component has an undeclared sender. Trial, draw and scaffold refuse a retired dossier. A later `begin` reopens it. Every other decision verb is refused while it is retired. `begin` on an open dossier records nothing.

`forget <name>@<digest>` lets go of the answer an entry holds, named by its entry and the first eight hexadecimal digits of the digest the manifest binds. It applies to an entry whose file is gone, which an `answer removed` finding names, to a violation that a new answer on an unchanged basis would replace (ANSWER-VIOLATION), and to a superseded answer that holds a counterexample (ANSWER-SUPERSEDED). An entry that is still there can be forgotten only while it holds a counterexample, in its outcomes or in `previous`. The dossier may have no tripwire other than `answer removed`. A forgotten removed answer covers nothing, and its manifest line stays until a new answer to its question is written. On a cell, a forgotten violation ranks below every proof and check (MARK-DECIDING). A forget lets one answer go. It deletes no entry by itself and repairs no other integrity failure.

## Questions and answers

A trial asks a question and gets an answer. The record keeps one answer per question, its current answer, so a question can be asked again without the record growing.

**ANSWER-KEY.** A question is the call's kind, the files it executes other than `prose.md`, the passages it expects outcomes for, its scenario and its walk. The reach belongs to the answer, so a trial that looks further answers the same question again. Each question has at most one entry, `evidence/<name>.json`, which only the runner writes. The name joins the kind, up to six of the passages the question names (its property, the passages it expects outcomes for, its walk), and its scenario with hyphens, and ends with the first six hexadecimal digits of the question's SHA-256, such as `tlc-O1-3fa2c1` or `tlc-N1-executor-offline-9b1e04`.

| Field | What an entry holds |
| --- | --- |
| `question` | The kind, the executed files, the expected passages, the scenario and the walk |
| `call` | The prediction: the call as written, the reach, the expectations and the reason the call gave |
| `answer` | The observation: the verdict, `as-called`, `miscalled` or `aborted`, the outcome per passage, the reach, and everything else the runner parsed from the checker's output, such as the actions that fired, a chart's checks and gaps, Apalache's mode and the outcome of each invocation, and a violation's or a witness's trace. It leaves out what only the bundle needs: the command line, the working directory, the exit status, the timing and the paths of Alloy's instance files. |
| `basis` | What the answer rested on: its snapshot, the hashes of the files it executed and its input identity, which lapse compares with the present |
| `established` | The trial that first gave this answer on this basis, its time, the plugin and checker versions, and the digest of its bundle |
| `previous` | The last answer to the question whose verdict or outcomes differed from the current one, with its basis, its establishing trial, its trace and its reading's classification, or `null` |
| `narrowed` | The reach of a replaced answer that looked further than the current one, or `null` |
| `replaced` | The trial whose answer this one replaced, and what had moved under that answer, empty when its basis had not, or `null` |

The agent's reading of the current answer is `evidence/<name>.md`, beside the entry.

When a trial ends, its answer goes through publication, under the dossier's publication lock and in the steps [STORE-ANSWER](storage.md#trials-and-answers) gives. Publication compares the answer with its question's entry, and writes the answer, keeps the entry as it is, or refuses the answer:

**ANSWER-SAME.** A trial whose answer equals the entry's, on an unchanged basis, keeps the entry as it is. Two answers are equal when their verdicts, outcomes and reach are equal. A different trace, state count or time does not make a different answer.

**ANSWER-REPLACE.** Any other answer is written, as the question's first entry or in place of the answer the entry holds, unless ANSWER-VIOLATION or ANSWER-MISCALL refuses it, or it is an aborted trial's, which ANSWER-ABORTED governs. The entry records the replaced answer's trial and what had moved under it as `replaced`. When the verdict or outcomes differ, the replaced answer becomes `previous`. When the replaced answer looked further than the new one, its reach is kept as `narrowed` until an answer looks as far again. The replaced answer's reading is removed. When the replaced answer becomes `previous`, its classification, if any, moves with it. Otherwise the classification goes with the reading, and a new miscall needs its own.

**ANSWER-VIOLATION.** On an unchanged basis, an answer that turns an outcome showing a counterexample or a failed check, `violated`, `counterexample` or `fail`, into any other outcome is refused, unless the owner's `forget` names the entry it would replace. The refusal names the argument `forget` takes. A basis is unchanged when the entry's answer has not lapsed. A smaller reach, a changed toolchain and an answer made by hand all meet this rule. When the basis changed, no decision is needed, since the change that moved it says why.

**ANSWER-MISCALL.** A miscalled answer is replaced only once its reading carries a `classification:` line. Until then a new answer to its question is refused.

**ANSWER-ABORTED.** An aborted trial's answer is written only for a question with no entry. There it covers nothing, and verify flags it `unrun` until a completed answer replaces it. On a question that has an entry, an aborted trial keeps the entry as it is. An aborted answer never becomes `previous`.

A publication that is not refused also removes what no longer answers anything, whether or not it writes an entry:

**ANSWER-GONE.** A question is gone when its property, a passage it expects an outcome for, its walk, its scenario or an authored file it executes no longer exists. A generated view under `chart/` or `model/generated/` does not count. A chart blunder under `chart/blunders/` is authored, and counts. The answer to a gone question covers nothing.

**ANSWER-SUPERSEDED.** An answer is superseded when the answers that decide stand in its place: completed answers to other questions cover all it answered for, and verify concludes the same without it. Verify tries the answers oldest first, each against the answers that remain once the superseded ones before it are gone. An answer that decides something is therefore never superseded, and of two answers that stand in for each other the earlier is. A check established after a proof is superseded, since the proof decides, and the proof stays. Nothing rests on a superseded answer, so removing it changes no conclusion.

A component's answer answered for each passage it touched, a blunder's for each passage it targets, and a chart answer for the chart as well. A system's answer answered for its cell or its walk under its scenario, and a blunder's for its property. An aborted answer answered nothing, so it is weighed by what its question names. The conclusions compared are a component's marks, backing, chart gaps and model files changed since their answers, a system's cells, walks and blunders' standing, and for either the tripwires, the next step and every flag but the entry's own.

**ANSWER-DROP.** Each publication that is not refused removes the entry, the reading and the manifest line of every gone question and every superseded answer among the entries it leaves, with its own answer in its question's place when it writes one. It never removes its own question's entry. A superseded answer that holds a counterexample, in its outcomes or in `previous`, stays until the owner's `forget` names it. Until a publication removes them, verify flags a gone question's entry `question gone` and a superseded answer `answer superseded`.

Recheck asks the recorded questions again without changing the record:

**ANSWER-RECHECK.** `dossier recheck [<dossier>...]` asks each entry's question again, at its recorded reach, in a private workspace, with the trial command's `--timeout`, `--workers` and `--limit`. It compares the verdict, the outcomes and the reach with the entry's, writes nothing and consumes no call. It exits 1 on any difference. It lists without running an entry whose answer has lapsed, is aborted or void, is superseded or answers a gone question, and an entry whose call no longer runs here, such as one for an external runner the marker does not configure. A dossier whose records, or whose members' records, do not verify is named once, and none of its entries runs. Recheck needs the toolchain the answers came from.

## Covers

Covers come from the current answers in `evidence/`, never from a reading. A completed answer covers:

- S: a chart check named with the id that passed. On the model side, Init fired for the initial state, or an action that writes the state fired.
- E and M: a chart check. On the model side, the action named for the event or the Move fired.
- R: a chart check. On the model side, by absence when no action encodes a Move for the pair and every Move has its action. A conditional refusal needs no model answer.
- A: the chart's exploration. On the model side, the invariant held, or an Alloy check named for it found no counterexample. `proved` needs an inductive Apalache answer.
- O and N: the property held, in TLC with fairness or in Apalache for a Within.
- W: a chart check. On the model side, only a witness whose trace matched the call. An external answer that lists the walk under `covers`, and came back as called, grounds it.

X and K are covered without an answer. X is covered by the counterpart passage in the other dossier, word for word. K is covered by its backing, resolved in the knowledge base, or for an `external` backing by an external answer, as rule 2 of [the marks](#the-marks) says.

A TLC answer that stopped at a violation lists the properties it had not finished under `partial`. It covers none of them, and a blunder's answer that stopped so shows none of them hollow. A blunder's answer covers nothing. It catches a property or shows it hollow, and only at the property's current text. A miscalled answer covers nothing it missed its expectation on, and the rest of what it established still counts, unless it is external. An external answer covers only when it came back as called. An aborted answer covers nothing.

## The marks

**MARK-DECIDING.** One answer decides each side of a passage and each cell, chosen among the current answers that speak for it:

- The chart side of a passage, and an external runner's word on it, have one strength. The latest answer that covers the passage decides.
- On the model side, among the TLC, Apalache and Alloy answers that cover the passage and have not lapsed, the strongest decides, a proof before a check, and the latest among equals.
- On a cell, the completed answers to its property under its scenario speak, other than blunders'. A miscall decides while it is the cell's latest answer and has not lapsed. Otherwise a counterexample decides: the latest answer that found the property violated, has not lapsed and is not one the owner forgot, whether it came back as called or not, whatever answers to other questions established after it say. Otherwise, among the answers that have not lapsed and are no miscall, the strongest decides, and the latest among equals: a proof, then a check, then a violation the owner forgot, and last an answer that looked at nothing, partial or without an outcome for the property, which leaves the cell `pending`. When every answer that has not lapsed is a miscall, the latest of them decides.

When every answer on the model side or on the cell has lapsed, the latest decides, and the mark or the cell shows what moved.

Component passages take the first rule that applies:

1. `text` for T, and `given` for G.
2. `backed`, `assumed` or `unresolved` for K. An `external` backing is `backed` while the latest answer from its runner that names the guarantee came back as called, lists its K id under `covers`, and was established at its current words, and `unresolved` otherwise.
3. `untried` for O and N in a charted piece, and for an A that cites a Given there.
4. `owed` or `checked` for a seam.
5. `lapsed` when the answer that decides its chart side or its model side has lapsed for it. Since that answer was established, the passage or a Given it cites changed, another passage its cover rested on changed or is gone, such as the walk that showed a refusal-only event refused, or a file it executed changed, `prose.md` aside. On the model side, a pinned record or a guarantee's backing that moved lapses it too. The component's next step names what moved, such as `lapsed: A1 M1 (executed model/Timelock.tla)`.
6. `hollow` for an A, O or N whose latest blunder answer at its current text held. A later answer that is not a blunder's does not clear it.
7. `miscalled` when the latest answer that touched it missed its expectation on it and has not lapsed, or when an answer that has not lapsed missed by finding it violated, whatever answers to other questions established after it say. A violation the owner forgot does this only when no other answer decides the passage.
8. For A, O and N, by the latest blunder answer at the property's current text, a model one in a modeled piece: `proved` when an inductive Apalache answer decides its model side and that blunder caught it, `checked` when another model answer decides it and that blunder caught it, `held` when a model answer decides it and no blunder caught it. For an A in a charted piece, `checked` when a chart answer covers it and a chart blunder caught it, and `held` with the chart answer alone. For an A in a modeled piece, `drawn` when only a chart answer covers it, never for an A that cites a Given. `pending` otherwise.
9. For S, E, M, R and W: `checked` when a chart answer and, in a modeled piece, a model answer cover it, `drawn` when only a chart answer does, `pending` otherwise. A walk's model answer is its witness's, and a conditional refusal needs none.

`grounded` is added while the latest external answer that covers the passage covered its current words.

A cell takes its mark from its deciding answer: `proved` when an inductive Apalache answer holds, `checked` when a bounded Apalache answer or a TLC answer holds, `violated` when it found the property violated, `miscalled` when it is a miscall, `lapsed` with what moved when it has lapsed, and `pending` when no answer speaks for the cell or the deciding one looked at nothing. A `violated` cell shows `accepted` while the latest risk decision on the cell holds, as [the owner's column](#the-owners-column) says, and `acceptance lapsed` with what moved once it does not. A `pending` cell is `implied` when the cell of the same property under a declared stronger scenario is `proved`. A cell is `open` while the closure misses a member or its scenario is not declared. A TLC cell executes exactly `model/generated/<Property>_<scenario>.cfg`, and an Apalache cell names exactly `cinit: ConstInit_<scenario>`, each with the scenario's hyphens as underscores, so no cell is marked from another scenario's configuration. A property carries `held` beside its cells while no blunder has been tried at its current text, and `hollow` when the latest blunder answer there held.

A cell lapses when the property's passage or a Given it cites changed (`passage G1`), a member's prose or backing moved (`member vault`, `member vault backing`), a record a member or an actor pins changed, or the module the tool generates or the configuration the answer executed changed (`generated module`). The module counts as the cell's scenario rests on it: another scenario's `ConstInit_<scenario>` line in it lapses nothing. An edit to one scenario lapses only its own cells and walks, unless it changes what the scenarios share: the clock's bound, which the longest window sets, or the constants of a window or a start no other scenario has. The scenario's modes, windows and start, the actors the system uses, the composition and `extras.tla` lapse it too. The snapshot hashes the actors without their `notes`, and a scenario only by its modes, windows and start, so an edit elsewhere in `actors.md`, or to a scenario's `notes` or `stronger_than`, lapses nothing.

A system's ledger lists its walks after the cells' lines, in the table `| walk | scenario | mark | trial |`, each under the scenario it names or `all-honest`. The latest witness answer under that scenario decides a walk: `pending` while there is none, `checked` when it matched its trace, `miscalled` when it missed its expectation, and `lapsed` when something it rested on moved.

`confirmed` is a count: settled, and checked, proved, text, given or backed, not lapsed, no doubt open.

## Tripwires

Each makes `verify: FAIL`, replaces `next:` with `fix:`, and clears only when fixed:

| Tripwire | Meaning | Fix |
| --- | --- | --- |
| `answer edited` | An entry's bytes no longer match the digest the manifest binds. | Restore the entry from version control. A changed answer is never repaired by changing the manifest. Say in the report that it happened. |
| `answer removed` | The manifest binds an entry whose file is gone, for a question that still exists. The manifest line keeps that identity across verification and rendering. | Restore the entry from version control, or record the owner's explicit `forget`. A forgotten answer covers nothing. |
| `decisions chain broken` | A line of `decisions.log` was rewritten or removed. | Ask the owner to restore it from version control, and say what happened. |
| `integrity unavailable`, `integrity missing`, `integrity malformed` | `dossier.json` does not read, names no storage or names another one, or the dossier's `integrity.json` is missing or malformed. Nothing establishes authority. | Restore the file from version control. Never recreate it from the entries, decisions or views that survive. A folder of hand-drafted inputs that holds no `decisions.log` and nothing in `evidence/` gets its manifest from `dossier decide <id> begin` instead. |
| `answer publication incomplete`, `decision publication incomplete` | A candidate entry or a decision suffix is not committed: a candidate in `.running/` that the manifest does not bind, or binds before it is in place. | Inspect it and use explicit validated recovery. Verification grants it no authority. |
| `answer unbound`, `answer malformed`, `input identity malformed` | A file in `evidence/` that the manifest does not bind; an entry that does not parse, names another dossier or question than its name says, or lacks a part of its basis, its own or its previous answer's, such as a system's module hash; or captured execution dependencies that do not match their contract, an input identity missing among them. | Remove an unbound file, or restore the entry from version control. A superseded entry that an interrupted publication left unbound, `dossier recover` removes when it finishes that publication. Recovery cannot bless a changed entry. |
| `authored input missing` | A visible dossier has lost required prose or composition. | Restore its authored input. The folder still receives integrity checks. |
| `stray files` | A file nobody expects in a dossier or in `evidence/`, such as a reading with no entry. A `.DS_Store` is ignored. | Move it to the margin, to `reviews/`, or out. |
| `malformed marker` | `dossier.json` does not parse, names a storage other than `integrity-v1`, or holds a known field in the wrong shape. | Ask the owner to fix it. Setup will not rewrite it, and it is not yours to edit. |
| `malformed passage`, `malformed composition`, `malformed actors` | A passage, a composition or the actors files do not follow their form, or name the same actor, scenario or member twice. | Fix the prose, the composition or the actors files. |
| `misnamed` | A passage of a component or a system names a state, an event, an effect, a datum or a passage that nothing declares, or a property in a model names a passage that does not exist. In a system this includes a member's datum, state or event that the member does not have. | Fix the name in the prose or the model. |
| `sender is not declared` | An event's sender or a Given's actor is neither an actor in `actors.md` nor a component, or is a retired component, in a component's prose or a system's. | Declare it in `actors/`, start the component, or have the retired one begun again. |
| `scenario names unknown actor` | A scenario gives a mode to an actor `actors.md` does not declare. | Declare the actor, or fix the scenario. |
| `property claims unknown scenario` | A system property claims a scenario `scenarios.md` does not declare, by its `Scenarios:` sentence or through the composition's defaults, or a system walk runs under one. | Declare the scenario, or fix the claim. |
| `Given names a component` | A Given's actor is a component, in a component's prose or a system's, even when an actor shares its id. A rely on a component is a Guarantee or a wiring. | Rewrite it as one of those. |
| `stronger_than unsound` | A declared `stronger_than` the scenarios do not support. Every actor's mode in the stronger one must be the same or malicious. A window agrees only with the same mode in the same window, unless the stronger scenario has the actor malicious for the whole run. Both must start from the same values. | Fix `scenarios.md`. |
| `composition cites unknown component` | The composition lists a member that has no dossier, is retired, or does not compile, or a wiring, a condition or a walk step names a component that is not a member. A member that does not compile is reported once, with no other composition tripwire. | Fix the composition, or the component loop. |
| `wiring names unknown effect or event` | A wiring names an effect or an event its component does not have. | Fix the wiring. |
| `composition does not compose` | The members cannot be composed as written, or a walk steps on an event that is reached through wiring. | Fix the composition, the walk, or the component loop. |
| `action without Move`, `fact without passage`, `fairness without Given` | A model element with no passage behind it. | Write the passage, or remove the element. |
| `malformed doubt` | A doubt whose header is not `## D<n>` alone, or that has no `on:`, has a `status:` line, has an `assumed:` that is missing or not `a` or `b`, lacks `Walk a:` or `Walk b:`, or repeats another doubt's id. | Complete it, or remove the `status:` line. The owner's answer decision closes a doubt. |
| `miscall unclassified` | A miscalled answer whose reading has no `classification:` line. | Classify it. |
| `classification unknown` | A reading's `classification:` line is not one of [the five classifications](models.md#classifying-a-miscall). | Write one of the five, word for word. |

## Flags

Printed, never blocking: `unsaid`, `said twice` (a Move and an unconditional Refusal, or two unconditional Refusals), `unsaid under condition`, `reworded` (a component's property only, since a system's module is generated and never edited), `narrowed` (a component's property or a system's cell), `unrun` (an aborted answer, ANSWER-ABORTED), `doubt open`, `Given without use` (a Given with no actor that no Once, Within or Always cites), `Move without action`, `no eventual promise stated`, `blunder owed`, `hollow`, `backing unresolved`, `pin unresolved` (a pin the knowledge base does not resolve: a component's own, or a system's member's or actor's), `closure open`, `left free`, `actor shadows component`, `plugin updated`, `question gone` (an entry whose question is gone, ANSWER-GONE), `answer superseded` (ANSWER-SUPERSEDED, saying whether the answer waits for the owner's forget), `review owed` (REVIEW-OWED, below).

`doubt answer unbound` names a doubt's answer that carries no hash of the alternatives. `doubt answer stale` names a doubt's answer to alternatives that have since changed. Neither closes the doubt.

**REVIEW-OWED.** A dossier owes a second read while it holds a mark a reviewer judges, a passage marked checked, proved or backed or a cell checked, proved, violated or implied, and no review under `reviews/` names its current prose hash on its first line. The prose hash is the six hexadecimal characters after `prose@` at the end of the dossier's summary line, and it changes whenever a passage does. Verify flags such a dossier `review owed`, naming the latest review and the hash it read, or saying there is none. Once nothing earlier in [the next step](#the-next-step) applies, the dossier's next step is Review. A review names no mark and changes none, and [the review contract](review.md) says what the reviewer writes.

## The next step

Per component, the first rule that applies:

1. Fix on any tripwire.
2. Write when the prose is empty, a passage is rejected, or pairs are unsaid, said twice or gapped.
3. Report while an answer is a miscall classified `prose at fault` and the prose has not changed since it was established.
4. Refresh when a mark lapsed.
5. Encode when calls are pending.
6. Draw when a chart answer is owed or a chart miscall stands. A chart answer is owed when none covers the current words of a passage the chart checks, which leaves out an Always that cites a Given and a structural Always. A chart miscall stands while an answer from the chart is a miscall classified `chart differs from prose`.
7. Encode when a modeled piece has no model, an uncited passage, a held or hollow property, a reworded property, a passage no model answer covers, a miscall other than the chart's classified `model misread prose, action` or `model misread prose, property`, or a model file that changed since the latest completed answer executed it, and in a charted piece when an Always is held and owes a chart blunder. Only that answer's files in `model/` and `model/blunders/` are compared.
8. Review when a second read is owed (REVIEW-OWED).
9. Report otherwise.

Per system, the first rule that applies:

1. Fix.
2. Compose when there are no members or the closure is open.
3. Report on prose at fault, as rule 3 for a component says.
4. Refresh on a lapsed cell or walk.
5. Encode on pending calls.
6. System on pending cells, pending walks, owed blunders, or a violated cell without an acceptance that holds, naming a lapsed acceptance and what moved under it.
7. Review when a second read is owed (REVIEW-OWED).
8. Report otherwise.

At the root: Fix, then Refresh, Encode, Compose, System, then the first component owing Write or Draw, then Review, then Report. When a system waits on Compose because it has no members, a component owing Write or Draw comes before it.

## The files

`ledger.md` per dossier. A component's holds the table of passages with their words, the guarantees, who uses the component, the summary, the flags, the next step, what moved when the file last changed, and the machine form in a fenced JSON block. A system's holds the members, the `Wiring:`, `Free:`, `Outside:` and `Closure open:` lines when they have content, the matrix with each property's sentence beside its id, one line per tried cell with the members it rests on, the walks table, then the same closing lines. Each trial id links to the entry whose answer it established, and a summary line prints only the counts above zero. `index.md` at the root holds components by systems, one summary line per dossier, the root's next step and the machine form. `dossier render` writes them, and only when their content moved. `rebuilt` is the time of the last change. The ledgers and the index are views. Nothing reads them as a record, and deleting one changes no conclusion.
