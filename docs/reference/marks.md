# Marks

Every word the analysis and rendered ledger use, what it means, and when it applies. Verify writes nothing, and `dossier render` writes the ledgers and the index. [Evidence](../../spec/evidence.md) and [storage](../../spec/storage.md) are the canonical contracts.

These marks describe the formal passages and the cells. A [behavior claim's standing](../../spec/behaviors.md#claim-standing) combines their evidence with a current independent assessment. Reports keep a claim's scope, its freshness, its review and the owner's exact decision separate from these marks.

Marks are computed from the current answers under each dossier's `evidence/`, one entry per question, as [Files](files.md#evidence) describes. Answers are ordered by the time they were established. One answer decides each side of a passage and each cell, by the rule [MARK-DECIDING](../../spec/evidence.md#the-marks) states:

- **The chart side of a passage, and an external runner's word on it.** Each has one strength, so the latest answer that covers the passage decides.
- **The model side of a passage.** Among the TLC, Apalache and Alloy answers that cover the passage and have not lapsed, the strongest decides, a proof before a check, and the latest among equals.
- **A cell.** A miscall decides while it is the cell's latest answer and has not lapsed. Otherwise the latest answer that found the property violated, has not lapsed and is not one the owner forgot decides, whether it came back as called or not, whatever answers to other questions established after it say. Otherwise, among the answers that have not lapsed and are no miscall, the strongest decides, and the latest among equals: a proof, then a check, then a violation the owner forgot, then an answer that looked at nothing. When every answer that has not lapsed is a miscall, the latest of them decides.

An answer that has lapsed therefore decides nothing on the model side or on a cell while another one has not. When every one there has lapsed, the latest decides, and the mark or the cell shows what moved.

## Summary lines

`dossier verify` prints one line for the root, one per dossier, and the next step:

```
verify: ok · 6 parts, 3 compositions · dossier 0.2.0 · 0 tripwires
Timelock: 26 passages · settled 16 · confirmed 15 · unsettled 10 · proved 1 · checked 19 · drawn 1 · backed 1 · assumed 1 · text 1 · given 2 · prose@70bff9
  claims: 3 behaviors, 8 claims · supported 6 · hypothesis 2
Control: 4 properties × 3 scenarios · 9 cells · proved 1 · checked 7 · violated 1 (accepted 1) · prose@6c8765
  claims: 3 behaviors, 10 claims · supported 9 · contradicted 1
```

A part line counts passages by the owner's column and by mark. A composition line counts cells by mark. The `claims:` line under a dossier's line counts its behaviors and their claims by [standing](#claim-standing), once the dossier has a behavior. A line prints only the counts above zero, so a count it leaves out is zero. Each line ends with the hash of the dossier's prose. A scoped review records all the exact inputs it examined, not just that abbreviated hash. The machine form, `dossier verify --json`, keeps every count. `verify: FAIL` replaces `ok` when any tripwire holds, and the line then ends with each tripwire as `<name> (<dossier>: <where>)`. A root with one dossier prints that dossier's title in place of the counts.

## The owner's column

| Value | When |
| --- | --- |
| `settled` | The latest decision on the passage is an accept at its current hash. |
| `rejected` | The latest decision is a reject at its current hash. |
| `unsettled` | Anything else, including a passage whose words changed after it was accepted. |

`confirmed` counts passages that are settled, marked `checked`, `proved`, `text`, `given` or `backed`, not lapsed, and with no doubt open on them.

## Part marks

The first rule that applies gives the mark.

| Mark | For | Means |
| --- | --- | --- |
| `text` | T | Words only, read as prose. |
| `given` | G | An assumption. Scenarios decide when it holds. |
| `backed` | K | The named rule or record was found. An `external` backing is backed while the latest answer from its runner that names the guarantee came back as called, lists it under `covers`, and was established at its current words. |
| `assumed` | K | The passage says `Backing: none`. |
| `unresolved` | K | A backing was named and not found, or an `external` backing has no answer from its runner yet, or the latest one does not back it. |
| `untried` | O, N, and an A that cites a Given | The part is charted, so no model tries it. |
| `owed` | X | The other dossier does not hold the seam in the same words. |
| `checked` | X | The other dossier holds the same words. |
| `lapsed` | any | The answer that decides the passage's chart side or model side has lapsed. Since it was established, the passage or a Given it cites changed, another passage its cover leaned on changed or is gone, such as the walk that showed a refusal-only event refused, or a file it executed changed, `prose.md` aside. On the model side, a record the part pins or a guarantee's backing that moved lapses it too. An edit to a hand-refined model therefore lapses the marks that rest on it. The part's next step names what moved beyond the passage's own words, such as `lapsed: A1 M1 (executed model/Timelock.tla)`. |
| `hollow` | A, O, N | The latest blunder answer at the property's current text held, so the property did not fail where it should have. A later answer that is not a blunder's does not clear it. |
| `miscalled` | any | The latest answer that touched the passage missed its expectation on it and has not lapsed, or an answer that has not lapsed missed by finding it violated, whatever answers to other questions established after it say. A violation the owner forgot does this only when no other answer decides the passage. |
| `proved` | A, O, N | An inductive Apalache answer decides its model side, and the latest blunder at its current text caught it. |
| `checked` | A, O, N | Another model answer decides its model side, and the latest blunder at its current text caught it. The mark holds within that answer's reach. |
| `held` | A, O, N | A model answer decides its model side, and no blunder at its current text has caught it yet. |
| `checked` | A in a charted part | A chart answer covers it, and the latest chart blunder at its current text caught it. |
| `held` | A in a charted part | A chart answer covers it, and no chart blunder at its current text has caught it yet. |
| `drawn` | A in a modeled part | A chart answer covers it, its exploration having found it true on every snapshot, and no model answer covers it yet. Never for an Always that cites a Given. |
| `checked` | S, E, M, R, W | A chart answer covers it and, in a modeled part, a model answer too. For a walk, that model answer is a witness's whose trace matched. A refusal with a condition needs no model answer, so a chart answer alone checks it. |
| `drawn` | S, E, M, R, W | In a modeled part, only a chart answer covers it. Never for a refusal with a condition. |
| `pending` | any | No answer covers it yet. |

A blunder counts only at the property's current text. When the passage changes, the blunders tried on the old text count for nothing, and the property owes a new one.

A TLC answer that stopped at a violation lists the properties it had not finished checking under `partial`, and covers none of them.

In a modeled part, an Always that cites a Given stays `pending` until a model answer covers it. The ledger prints the Givens an Always, a Once or a Within cites beside its mark, as `checked, given G1`.

`grounded` is added beside a mark while the latest external answer that covers the passage, a runner's replay against something that is not a model, covered its current words. An external answer covers the ids it lists under `covers`, and only when it came back as called. A replay call expects every walk to pass, so an answer in which a walk failed is miscalled and grounds none.

## Cells

| Cell | Means |
| --- | --- |
| `pending` | No answer speaks for the cell yet, or the deciding answer looked at nothing, having stopped before the property or given no outcome for it. |
| `checked` | The deciding answer is a TLC or bounded Apalache answer in which the property held under that scenario, with no violation within its reach. |
| `proved` | The deciding answer is an inductive Apalache answer in which the property held under that scenario. |
| `implied` | Proved under a scenario declared stronger than this one. The cell names it. |
| `violated` | The deciding answer found a path that breaks the property, as its call expected. With `accepted`, the owner accepted the violation, and the deciding answer is still the one the owner was shown. With `acceptance lapsed`, another answer has come to decide the cell since, after a change, from a trial that looked further, or to another question, and the line says what moved. The owner decides again. |
| `lapsed` | Every answer on the cell has lapsed, and the latest shows what moved since it was established: the property's passage or a Given it cites, a member or a member's backing, a record a member or an actor pins, the modes, windows and start the scenario gives the actors the composition uses, those actors, the wiring, `extras.tla`, the generated module (another scenario's constants in it aside), or the configuration it executed. What moved is listed, such as `passage G1`, `member vault backing` or `generated module`. |
| `open` | The composition lacks a module its closure requires, or the cell's scenario is not declared, which also trips `property claims unknown scenario`. |
| `miscalled` | The deciding answer is a miscall: the cell's latest answer, or the latest answer that found the property violated. |

A property's row also shows a badge when it needs one. `held` means no blunder has been tried for the property at its current text. `hollow` means the latest blunder answer at that text held, and the badge stays until a later blunder catches the property or the text changes.

The generated module is hashed into each answer's snapshot, so a change in the module the tool composes lapses the cell, whether it comes from a new version of the composer or from the `only when` of a Given the property does not cite. The snapshot hashes only the actors the composition uses, without their `notes`, and a scenario only by the modes, windows and start it gives them. An edit elsewhere in `actors.md`, or to a scenario's `notes` or `stronger_than`, lapses no cell.

## Walks in a composition

A composition's ledger lists its walks after the cells' lines, in a table with the columns walk, scenario, mark and trial. A walk is tried by a witness, a TLC trial whose configuration asserts that the walk never reaches its end, so that the counterexample TLC finds is the walk itself. The witness runs under the scenario the walk names, or under `all-honest` when it names none. The witness counts the walk's steps only from its `from` state and checks that each refused step is refused there, so it matches the walk's own path and no other. The latest witness answer under that scenario decides the walk's mark, and the trial column links to its entry.

| Mark | Means |
| --- | --- |
| `pending` | No witness answer yet. |
| `checked` | The latest witness answer matched the walk's trace. |
| `miscalled` | The latest witness answer missed its expectation. |
| `lapsed` | Something the latest witness answer rested on moved since it was established. |

## Claim standing

A behavior's claim carries one standing, which verify derives from its mappings, their current answers and the current independent assessments. [Behavior collections](../../spec/behaviors.md#claim-standing) defines them. The report gives the claim's scope, its freshness and the owner's decisions beside it.

| Standing | Means |
| --- | --- |
| `hypothesis` | The claim has no adequate support yet: no mapping, no current evidence, or an assessment that grants none. |
| `evidence available; mapping unreviewed` | A current answer supports the claim, and no independent review has assessed the mapping. |
| `supported within the stated scope` | A current mapping supports the claim, and a current independent review assessed it `supported`. A source or a deployment claim also needs a knowledge backing among its evidence. |
| `contradicted within the stated scope` | A current review assessed a mapping `contradicted`, or confirmed a challenge whose evidence is current. |
| `contested` | Current assessments of one mapping disagree, or current answers conflict on its target. |

## Claim freshness

| Freshness | Means |
| --- | --- |
| `current` | Every pin and every mapping resolves to current answers and records. |
| `stale` | An answer the claim rests on has lapsed, or a pinned record changed. |
| `missing` | A target or a pinned record does not resolve. |
| `invalid` | A file the claim depends on does not read: its collection, the dossier's manifest or an answer. |

## Kinds of evidence

Each answer or record behind a mapping has a kind. Neither a mapping nor a review can make it stronger.

| Kind | Means |
| --- | --- |
| `path-witness` | One recorded path through the model, not every execution. |
| `finite-chart` | A check over the finite chart. |
| `bounded-model` | A model check within its stated reach. |
| `inductive-model` | A proof by induction, with no bound on steps, within the model's ranges and assumptions. |
| `model-observation` | A state, an event or a move seen to occur in a model check. It does not establish every execution of the passage. |
| `external-cases` | The cases an external runner executed, against the source, a simulator or a stand-in. The kind alone establishes no correspondence to the source. |
| `sensitivity` | A blunder's answer. It tests whether a fault is caught and adds no positive evidence. |
| `knowledge-backing` | A record or a rule that resolves in the knowledge base. Whether its text supports the claim is for review. |

## Flags

Flags are printed and never block work.

| Flag | Raised when |
| --- | --- |
| `unsaid` | A pair of state and event has no Move and no Refusal. |
| `said twice` | A pair has both a Move and an unconditional Refusal, or two unconditional Refusals. |
| `unsaid under condition` | A guarded Move has no Refusal for when its guard is false. |
| `reworded` | A part property's definition in its model differs from the one the latest model answer on it ran, while its passage has not changed since that answer. A composition's module is generated and never edited, so a composition never raises it. |
| `narrowed` | A property's answer reaches less far than the answer it replaced, whose reach the entry keeps until an answer looks as far again, or than the answer to another question just before it on the same property or cell. It applies to a part's properties and to a composition's cells. |
| `unrun` | An entry holds an aborted trial's answer, written because its question had no answer yet, and no completed answer has replaced it. |
| `doubt open` | The owner has not yet chosen between the two walks of a doubt in `doubts.md`. |
| `doubt answer unbound` | A doubt's answer names the doubt without the hash of its alternatives, so it closes nothing. |
| `doubt answer stale` | A doubt's answer names different alternatives from the ones now authored. |
| `Given without use` | A Given with no actor that no Once, Within or Always cites. |
| `Move without action` | No action in the model encodes the Move. |
| `no eventual promise stated` | The part has no Once or Within, and no Words-only passage saying it promises nothing eventual. |
| `blunder owed` | A property is marked `held`. |
| `hollow` | A composition property's latest blunder answer at its current text held. |
| `backing unresolved` | A guarantee's backing was named and not found. The flag gives the reason. |
| `pin unresolved` | A pin does not resolve in the knowledge base, such as `timelock#actor:governance does not resolve in the knowledge base`. A part raises it for its own pins, and a composition for its members' and its actors' pins. |
| `closure open` | A module the closure requires is not a member. |
| `left free` | A member sends an event that no wiring reaches and `free:` does not list, such as `vault.move, vault.release from adapter; wire them or list them under free:`. |
| `plugin updated` | `dossier.json` names an earlier plugin version than the one reading it, in the same formats. Run `dossier setup` to bring the root up to date. |
| `actor shadows part` | `actors.md` lists an actor whose id is a part's id, such as `actor adapter is shadowed by part adapter; remove it from actors.md`. |
| `question gone` | An entry's question no longer exists, because its property, a passage it expects an outcome for, its walk, its scenario or an authored file it executes is gone. It covers nothing, and the next publication in its dossier that is not refused removes it, when the [behavior retention guard](../../spec/behaviors.md#change-and-deletion) permits it. |
| `answer superseded` | The answers that decide stand in for an entry: they cover everything it answered for, and verify concludes the same without it. The next publication in its dossier that is not refused removes it, when the behavior retention guard permits it. One that holds a counterexample stays until the owner forgets it, and the flag names the `forget` to record. |
| `review owed` | The [review contract](../../spec/review.md) requires a current review of the relevant scope, at its exact inputs. A focused review of one behavior does not cover the whole dossier. Verify raises the flag when the dossier holds formal work a reviewer judges, and no current review of the whole dossier covers every item with assessments that are conclusive and uncontested. [Get a second read](../how-to/get-a-second-read.md) describes the assessment. |
| `review stale` | A scoped review's set of required files, its declared digests or its dependencies no longer match the current inputs. Its assessments then give no current support. |

## Tripwires

A tripwire makes verify print `FAIL` and replaces the next step with `fix:`. It clears only when fixed.

| Tripwire | Means | Fix |
| --- | --- | --- |
| `invalid behavior collection` | A collection, behavior or claim record breaks the behavior contract. | Correct the authored record at the path verify reports. |
| `invalid review` | A review's format, its coverage, its list of mapping assessments or a replacement it names is invalid. | Correct the file, or remove it, since version control keeps it. A new review cannot replace an invalid one. |
| `answer edited` | An entry's bytes no longer match the digest `integrity.json` binds. | Restore the entry from version control, and say it happened. A changed answer is never repaired by changing the manifest. |
| `answer removed` | `integrity.json` binds an entry whose file is gone, for a question that still exists. The manifest keeps that entry's identity across verification and rendering. | Restore the entry from version control, or record the owner's explicit `forget` decision. A forgotten answer covers nothing. |
| `decisions chain broken` | A line of `decisions.log` was rewritten or removed. | Restore it from version control. |
| `integrity unavailable`, `integrity missing`, `integrity malformed` | `dossier.json` does not read, names no storage or names another one, or the dossier's `integrity.json` is missing or malformed. Nothing establishes authority. | Restore the file from version control. Never recreate it from the entries, decisions or views that survive. A folder of hand-drafted inputs with no `decisions.log` and nothing in `evidence/` gets its manifest from `dossier decide <id> begin` instead. |
| `answer publication incomplete`, `decision publication incomplete` | A decision suffix is not committed, or a candidate entry waits in `.running/` that the manifest does not bind, or binds before it is in place. | Inspect it and use [explicit recovery](commands.md#storage-and-recovery). Verify never completes it. |
| `answer unbound`, `answer malformed`, `input identity malformed` | A file in `evidence/` that the manifest does not bind; an entry that does not parse, names another dossier or question than its name says, or lacks some of its basis, its own or its previous answer's, such as a composition's module hash; or captured execution dependencies that do not match their contract, an input identity missing among them. | Remove an unbound file, or restore the entry from version control. A superseded entry that an interrupted publication left unbound, `dossier recover` removes when it finishes that publication. Recovery cannot bless a changed entry. |
| `authored input missing` | A visible dossier has lost its required prose or wiring. | Restore that input. Integrity checks still apply to the folder. |
| `stray files` | A file nobody expects in a dossier or in `evidence/`, such as a reading with no entry. A `.DS_Store` is ignored. | Move it to the margin, to `reviews/`, or out. |
| `malformed marker` | `dossier.json` does not parse, names a storage other than `integrity-v1`, or holds a known field in the wrong shape. | Fix the file by hand. Setup refuses to rewrite it and names the error, and the agent leaves it to you. |
| `malformed passage`, `malformed wiring`, `malformed actors` | A passage, the wiring or the actors files break their form, or name the same actor, scenario or member twice. | Fix the prose or the record. |
| `misnamed` | A passage of a part or a composition names a state, an event, an effect, a datum or a passage that nothing declares, or a property in a model names a passage that does not exist. In a composition this includes a member's datum, state or event that the member does not have. | Fix the name in the prose or the model. |
| `sender is not declared` | An event's sender or a Given's actor is neither an actor nor a part, or is a retired part, in a part's prose or a composition's. | Declare it in `actors/`, start the part, or begin the retired one again. |
| `scenario names unknown actor` | A scenario gives a mode to an actor that `actors.md` does not declare. | Declare the actor, or fix the scenario. |
| `property claims unknown scenario` | A composition property claims a scenario that `scenarios.md` does not declare, in its `Scenarios:` sentence or through the wiring's defaults, or a composition walk runs under one. | Declare the scenario, or fix the claim. |
| `Given names a part` | A Given's actor is a part, in a part's prose or a composition's, even when an actor in `actors.md` has the same id. | Write the rely as a Guarantee or a wiring. |
| `stronger_than unsound` | A scenario is declared stronger than one its modes or its start do not support. [Files](files.md#actorsactorsmd-and-actorsscenariosmd) gives the rule. | Fix the declaration in `scenarios.md`. |
| `wiring names unknown part` | The wiring lists a member that has no dossier, is retired, or does not compile, or a wiring entry, a condition or a walk step names a part that is not a member. A member that does not compile is reported once, with no other wiring tripwire. | Fix the wiring, or the member. |
| `wiring names unknown effect or event` | A wiring entry names an effect or an event its part does not have. | Fix the wiring. |
| `wiring does not compose` | The members cannot be composed as written, or a walk steps on an event that is reached through wiring. | Fix the wiring, the walk or the member. |
| `action without Move`, `fact without passage`, `fairness without Given` | A model element has no passage behind it. | Write the passage, or remove the element. |
| `malformed doubt` | A doubt's header is not `## D<n>` alone, or the doubt has no `on:`, has a `status:` line, has an `assumed:` that is missing or not `a` or `b`, lacks `Walk a:` or `Walk b:`, or repeats another doubt's id. | Complete it, or remove the `status:` line. A doubt's answer, the owner's decision, closes a doubt. |
| `miscall unclassified` | A current answer is miscalled, and its reading has no `classification:` line. | Classify it. |
| `classification unknown` | A reading's `classification:` line is none of the five [the model contract](../../spec/models.md#classifying-a-miscall) names: `model misread prose, action`, `model misread prose, property`, `chart differs from prose`, `prose at fault`, `call was wrong`. The next step reads the line word for word, so any other wording would give a wrong next step. | Write one of the five, and the explanation on the lines after it. |

## The next step

Each dossier gets a next step, and so does the root.

- **A part:** `Fix` on any tripwire. `Write` when the prose is empty, a passage is rejected, or pairs are unsaid, said twice or gapped. `Report` while a current answer is a miscall classified `prose at fault` and the prose has not changed since that answer was established. `Refresh` when a mark lapsed. `Encode` when calls are pending. `Draw` when no chart answer covers the current words of a passage the chart checks, or while a chart answer is a miscall classified `chart differs from prose`. The chart checks no Always that cites a Given and no structural Always. `Encode` when a modeled part has no model, a passage the model does not cite, a held or hollow property, a reworded property, a passage no model answer covers, a miscall classified `model misread prose, action` or `model misread prose, property`, or a model file that changed since the latest completed answer's trial executed it. Only that answer's files in `model/` and `model/blunders/` are compared. In a charted part, `Encode` when an Always is `held` and owes a chart blunder. `Review` when the dossier owes a second read, as the `review owed` flag says, and [Get a second read](../how-to/get-a-second-read.md) shows how to ask for one. `Report` otherwise.
- **A composition:** `Fix`, then `Compose` when there are no members or the closure is open, `Report` on prose at fault, `Refresh` on a lapsed cell or walk, `Encode` on pending calls, `Try` when there are no properties, or on pending cells, pending walks, owed blunders or a violated cell without an acceptance that holds, naming a lapsed acceptance and what moved under it, `Review` when the composition owes a second read, and `Report` otherwise.
- **The root:** `Fix`, then `Refresh`, `Encode`, `Compose` and `Try`, then the first part owing `Write` or `Draw`, then `Review`, then `Report`. When a composition waits on `Compose` because it has no members, a part owing `Write` or `Draw` comes before it.

A next step of `Report` says that no step is owed. It does not say that every claim is supported, since a hypothesis or a contradicted requirement can remain. The dossier's `claims:` line counts them.

A next step gives its reasons, which name the passages, cells and entries they rest on, such as `no chart answer covers: S2 E1` or `chart answer miscalled: evidence/<name>.json`.
