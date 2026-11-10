# Behavior collections

A behavior collection explains what a part or a composition does. It gives the reader the mechanisms in order, the claims each one makes, and the evidence for each claim.

## Behaviors and claims

A **behavior** explains one mechanism: who can act, under what conditions, what happens, and what can prevent or reverse it. A **claim** is one statement in that explanation that can be judged by itself. The **collection** introduces the dossier and gives the order to read its behaviors in. It need not explain every function or every possible execution.

`README.md` owns the orientation and the reading order. `behaviors/<id>.md` owns the explanation, the claims and the mappings proposed for them. `prose.md` owns the shared formal abstraction and its stable passages. A behavior cites that abstraction and never defines a second state machine. Each claim says whether it is about the model, the pinned source or a deployed instance.

A **mapping** says why a passage, a cell, a walk, an answer or a knowledge record supports, challenges or illustrates one claim. The agent writes it, and an independent [reviewer](review.md) assesses it. A mapping is interpretation. The evidence is in the runner's entries, and an owner's decision keeps its own scope.

## Records

**BEH-FORMAT.** Every part and every composition has a collection in its `README.md` and a `behaviors/` directory, which may be empty at first.

The collection and each behavior begin at byte zero with a fenced `json` block, and Markdown follows it. The opening fence is three backticks, `json` and a newline, and the closing fence stands on its own line. The file is UTF-8 with LF or CRLF line endings. JSON keys must be unique. An unknown field, a wrong type, a duplicate id or an unsupported format is an error. No other header or serialization is accepted. Any other fence in the body is explanation.

### Collection

The collection's block has exactly these fields:

| Field | Value |
| --- | --- |
| `format` | The collection identifier in [record formats](artifacts.md#record-formats) |
| `behaviors` | Array of behavior ids in reading order, each once |

An id matches `[a-z][a-z0-9]*(?:-[a-z0-9]+)*`. Each listed id resolves to `behaviors/<id>.md` in the dossier, and every behavior file must be listed. A symbolic link, an absolute path or a path with a `..` segment is invalid. An empty collection is valid, and incomplete.

The body says what the part or the composition is for, its vocabulary, its main actors, the usual flow, the boundary of what is modeled and the open questions. It keeps what the source does apart from what the abstraction says.

### Behavior

The behavior's block has exactly these fields:

| Field | Value |
| --- | --- |
| `format` | The behavior identifier in [record formats](artifacts.md#record-formats) |
| `id` | The behavior id the file is named by |
| `title` | A readable name, not empty |
| `claims` | Array of claims, at least one |

The body explains the mechanism: its actors, what starts it and what comes of it, with failure and recovery where they apply. A reader must be able to understand the claims without opening a trial's output. Each claim's statement, and what is said of its evidence, stays in one place to edit. A behavior needs no heading for every function of the implementation.

### Claim

A claim has exactly `id`, `kind`, `statement`, `scope`, `assumptions` and `mappings`. Its id is `C` and a positive integer, unique in the behavior. The statement is not empty. The kind is `descriptive` or `requirement`. A descriptive claim says what happens. A requirement says what is wanted, and it may be violated. Either needs evidence for the scope it states.

The scope has exactly these fields:

| Field | Value |
| --- | --- |
| `level` | `model`, `source` or `deployment` |
| `description` | What the claim covers, in words, not empty |
| `pins` | Array of objects with `ref` and `revision` |

Each pin is a typed knowledge reference with the record's exact revision, as [knowledge](knowledge.md#behavior-revisions) defines it. Only a model claim may have no pins. The record a source claim pins identifies source that cannot change. The records a deployment claim pins also identify the instance, the checkpoint and how the source corresponds to it. A branch name, the label of a current role or a bare address is not enough.

The knowledge records own these identities. A claim refers to them and keeps no second copy to edit. A pin that matches identifies the record that was read. It does not prove that the source matches the instance.

`assumptions` is an array of nonempty strings, empty when the claim asserts none. `mappings` is an array, and a new hypothesis may leave it empty.

### Mapping

A mapping has exactly `id`, `target`, `relation`, `rationale` and `limitations`. Its id is `M` and a positive integer, unique in the claim. The relation is `supports`, `challenges` or `illustrates`. The rationale is not empty. `limitations` is an array of nonempty strings, and it states every assumption and limit that matters.

### Identity

**BEH-IDENTITY.** `<behavior>/C<n>` names a claim and `<behavior>/C<n>/M<n>` a mapping, each within its dossier. Across dossiers the dossier comes first, as `parts/<id>#` or `compositions/<id>#`.

An id is never renumbered and never reused. The parser finds a duplicate among the files as they stand. An id reused after a deletion shows only in the authored history, which the reviewer checks. Version control keeps that history, and there is no separate log of ids.

A question that differs in substance takes a new id. A correction of wording keeps the id and makes the earlier assessment stale. A refuted requirement stays refuted until the owner changes it. A recovery that is useful by itself gets its own claim.

## Targets and current answers

**BEH-TARGET.** A mapping's target is one of the objects below, and nothing else. A dossier is named by its path under the root, `parts/<id>` or `compositions/<id>`. A file path or an alias is invalid.

| Kind | Fields besides `kind` | Meaning |
| --- | --- | --- |
| `passage` | `dossier`, `id`, `side` | One passage, on its `chart` side or its `model` side. A composition's property takes a cell |
| `cell` | `dossier`, `property`, `scenario` | One property of a composition under one named scenario |
| `walk` | `dossier`, `id`, `scenario` | One W passage. The scenario is `null` for a part and named for a composition, `all-honest` included |
| `answer` | `dossier`, `question`, `check` | One current answer, by its exact question, and one check or covered passage id that it records |
| `knowledge` | `ref`, `revision` | One typed knowledge reference at one fixed revision |

An answer target carries the entry's exact [question](evidence.md#questions-and-answers), and the check it names appears in the recorded answer. An aggregate K result supports that aggregate alone. To cite one test, the evidence kept has to identify the test. A knowledge reference that resolves shows that the record is there and which record it is. Whether its text supports the claim is for review.

A part may target itself and the configured knowledge base. A composition may also target its declared members. No other dossier, root or behavior's claim supplies evidence by reference. A Markdown link to a related behavior is for navigation only.

The tool resolves a passage, cell or walk target from the answers that decide it now and from the blunders that test it. It resolves an answer target by its question. An older entry, a trial id or a file name that can be replaced selects no current support. A mapping to one answer also shows the other current answers that conflict on the same passage, cell or walk, so choosing a question that passed cannot hide a counterexample that decides.

A target that resolves two ways, or a check that its answer lacks, is unresolved. An answer that is aborted, edited, incomplete, gone or lapsed gives no current support. A walk's witness establishes its path, not every path. A blunder tests whether a fault is caught. It does not establish that the production behavior is correct.

The body may cite an earlier trial to explain how something was found. The citation binds no current evidence. A missing local bundle does not invalidate an intact entry, and a bundle or a screenshot that survives cannot stand in for an entry that is missing or invalid.

## Claim standing

**BEH-STANDING.** Verify derives each claim's standing. The authored files hold no `verified`, `status` or `accepted` field, and no field that sums up strength. A report shows these together:

| Part of the standing | What the report gives |
| --- | --- |
| The claim | Its statement, its kind, its scope as model, source or deployment, its pins and its assumptions |
| The evidence | The resolved target, the recorded outcome, the kind of evidence, the reach, the limits and any results that conflict |
| Freshness | Current, stale, missing or invalid, with the dependency that changed or did not resolve |
| The assessment | Unreviewed, or the current independent assessment of the mapping, with what the review examined and what it left out |
| The owner's decision | The decision that stands on the exact passage or cell the mapping names, with what it was made on, or none |

A path witness, a finite chart check, a bounded model check, an inductive result, external cases, an inspection of the source and a knowledge backing that resolves stay distinct kinds of evidence. Neither an agent nor a reviewer can give evidence a stronger kind than the one recorded. External cases may execute the source, a simulator or a stand-in, so the runner's kind alone establishes no correspondence to the source. A source or a deployment claim needs, for that correspondence, an adequate knowledge-backing mapping that was independently reviewed. Cases and inspection do not verify the source in general, and a proof about the model does not establish what a deployment does. A report keeps `held`, `hollow`, an open closure, an unresolved assumption and a lapsed acceptance in view.

A claim without adequate support is a **hypothesis**. The word describes its evidence. It is not a stored state of the work, a Given or a doubt. A hypothesis may be investigated under the same id until it is assessed or corrected. Current evidence in a claim's favor that no review has assessed is reported as **evidence available; mapping unreviewed**.

A claim is reported as **supported within the stated scope** only when all of these hold:

- At least one current mapping has the relation `supports` and a current independent assessment of `supported`.
- The evidence recorded for it establishes the statement exactly.
- Every declared dependency resolves.
- No current contradiction that matters remains, and no assessment is disputed.

An illustration alone does not meet them. A `supported` assessment of a `challenges` mapping confirms the challenge, which stays in view as evidence against the claim. An outcome outside the claim's scope does not contradict it, and a review has to say that it lies outside.

Current assessments that conflict leave the mapping contested, and a later date alone does not decide between them. Only a valid [replacement](review.md#correcting-an-assessment) takes an earlier assessment out of the ones verify combines. An assessment of `too-broad` or `inconclusive` gives no support. An assessment of `contradicted` names the refutation and its scope, and it does not change the owner's requirement.

One supported claim does not verify a whole behavior or a collection. Never call anything verified without saying what the word qualifies. In a review's findings, `verified` describes the support for the finding's own statement, a confirmed defect included, as [REVIEW-STATUS](review.md#findings-and-status) defines.

## Change and deletion

**BEH-FRESHNESS.** A [review](review.md) binds, by digest, the behavior file and each of its claims, for a dossier review the collection, the prose and the other authored inputs, the current evidence and whatever else its judgment rested on. A change to a claim takes that claim's assessments out of effect and leaves the others in effect. A change to the explanation alone leaves the assessments in effect, and the review no longer clears what the dossier owes. Neither lapses a solver's answer whose own basis is unchanged. A changed model, scenario, source pin or answer can make the whole review stale and lapse an answer, each under its own rule.

Verify works out the required set of files again, as well as their digests. An answer that newly decides can make a review stale while every file the review read is still there.

Version control keeps the authored revisions, and the entries and the decisions keep their own authority. There is no second history of behaviors, no copied result and no status database to edit. An index generated from the mappings, such as one of the mappings that name an answer, can be discarded. Verify still writes nothing, and rendering creates no evidence and no assessment.

**BEH-RETENTION.** Before it removes an answer, publication looks through every dossier under the root for the mappings that depend on it. The answer goes only when every current target it affects keeps admissible support that is equivalent or stronger, at the same scope, and every conclusion it protects remains. The rules for an equal answer, a violation, the record's history and the owner's `forget` apply as before.

Publication compares support, not trial ids. A passage, cell or walk mapping protects the answers that decide its target, and a mapping to one answer protects that question's entry. An older answer with the same conclusion may be superseded while the deciding support is unchanged and the rules for the owner's `forget` allow it. Current answers that conflict stay protected. The comparison takes the kind of evidence, the checks, the outcomes and which way they point, the exact reach, the basis and the limitations, together with the target's formal standing and the owner's decisions on it. It does not judge that one reach includes another from the way the two are described. A new counterexample can refute earlier support, and retention does not keep it from being published. A citation of an earlier trial does not by itself keep an answer. When publication cannot establish that the support is equivalent, it keeps the entry and reports the dependency. It reads one stable set of inputs for the check and the removal, so a dependency that changes meanwhile means a retry or a refusal before anything is removed. Only publication removes entries.

## Coverage and agent work

**BEH-COVERAGE.** A collection says what it explains and what it leaves unexplained. The tool can list the states, events, moves, refusals, properties, scenarios and walks that no behavior is associated with. That list does not establish that the source is explained in full, and a walk with no behavior is not for that reason unfinished or wrong.

The agent starts from the orientation and the claims, then follows their targets into the prose and the evidence. It may challenge a supported claim, propose a hypothesis, point out a behavior that is missing or refine a model. It states the question and the scope before anything executes, and follows [the shared process](process.md). Calling a claim supported takes an independent review.

The reviewer records what was examined and what was left unexamined. A list of the source's functions needs an authored scope and an independent review. Counting functions establishes nothing about what is explained.

The code parses the files, resolves the references, computes the evidence and its freshness, checks the hashes and lists what in the model no behavior names. The agent explains the mechanisms, chooses the claims and the checks, and justifies the mappings. An independent reviewer assesses those mappings and the correspondence to the source. The owner decides what is meant and which risks are accepted.

## Examples and implementation

The [contract exercise](../qualification/conformance/behavior-contract/README.md) holds complete authored files, raw evidence and the outcomes a reader is expected to reach. It tests how the contract is read and claims no new solver evidence. [Conformance](conformance.md) lists the checks of the implementation, and [implementation status](implementation.md) says which tool reads each contract and where its checks stop.
