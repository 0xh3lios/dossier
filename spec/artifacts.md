# Artifact ownership

An artifact's writer and authority determine whether it may be edited, regenerated or discarded. [Publication and integrity](storage.md) defines how the records are published.

| Artifact | Writer | Authority and consumer |
| --- | --- | --- |
| `README.md`, `behaviors/*.md` | Owner or authorized agent | Authored orientation, explanations, scoped claims and mappings under [the behavior contract](behaviors.md), never evidence or an owner's acceptance |
| `prose.md` | Owner or authorized agent; import/begin may draft | Authored formal meaning, stable ids, ranges and tier; compiler and reviewer input |
| `wiring.md`, `actors/*.md` | Owner or authorized agent | Authored membership, wiring, closure and environment assumptions |
| Refined part model, Alloy module, `extras.tla` | Agent following prose | Authored encoding. The exact executed identities belong to each answer's basis |
| Blunders under `model/blunders/` and `chart/blunders/` | Agent following prose, by hand or, for a model blunder, through `dossier blunder`, which may write the copy, its configuration and its call | Authored deliberate fault, which the property it targets must catch |
| `calls/*.md` | Agent before execution, by hand or through `dossier call`, which may write the lines that identify the question. The runner accepts a call written either way | Pending prediction and planner input, never evidence by itself |
| `evidence/<name>.json` | Runner, at publication | The current answer to one question: its prediction, observation, scope and basis, the trial that established it, and the last answer that differed. Verify computes the marks from the entries |
| `evidence/<name>.md` | Agent, once the answer is written | The reading: interpretation and miscall classification of the current answer. Verify reads only its `classification:` line, and it cannot grant coverage. Removed with its answer when a new one replaces it |
| `trials/<id>/` | Runner | The trial's bundle: the call as captured, the checker's output, `result.json`, the receipt, traces and diffs. Local to the machine that ran it and kept out of version control, never in the record |
| `decisions.log` | Decision command with owner words | Durable owner decisions at identified hashes |
| `doubts.md` | Agent | Authored alternatives and the one assumed. Only a doubt's answer, the owner's decision bound to the alternatives' hash, closes a doubt |
| `reviews/*.md` | Independent reviewer | Scoped findings and mapping assessments, bound by digest to the files the reviewer read, under [the review contract](review.md), never marks or decisions |
| `margin.md` | Agent or import | Optional continuation notes; no machine authority |
| `chart/*` except blunders | Draw/trial | Generated diagnostics and IR cache, never a substitute for an answer |
| `model/generated/*`, `*.scaffold.tla` | Scaffold; trial prepares private generated inputs | Disposable model/configuration views; refined part models remain authored |
| `integrity.json` | Publication and recovery commands | The digest of every entry and the exact committed decision prefix. It caches no mark or route |
| `ledger.md`, `index.md` | Render | Views. Nothing reads them as a record, and deleting one changes no conclusion. The index changes with every dossier and stays out of version control |
| `dossier.json`, `.gitignore`, optional `.dossier-root` | Setup | Root discovery, storage identity, tool configuration, knowledge adapter location, and what version control leaves out |
| `.running/`, `.initializing-*`, publication locks and atomic replacement temporary files | Runner or publication command | Transient coordination and candidates, never evidence or owner authority. `.running/<id>/` stages a trial's bundle and its candidate entry, and stays out of version control |

**ART-EVIDENCE.** Never edit an entry. A changed input requires a new trial, whose answer replaces the entry only as [the evidence rules](evidence.md#questions-and-answers) allow. A reading and a review have their own authorship and cannot rewrite an answer.

**ART-HISTORY.** The record keeps the current answer to each question with the last answer that differed, and the committed decision prefix. Earlier answers live in version control. Verification cannot forget a removed entry or a truncated decision because a view disappeared. Storage identity is independent of plugin version.

**ART-VIEWS.** A regenerated picture or report establishes no additional evidence. Report materialization and evidence execution are different transformations. A refined part model is authored even though a scaffold produced its first version.

**ART-SCOPE.** Keep the checker kind and mode, property, scenario, reach, basis and observed outcome together when interpreting an answer. A digest checks that an entry is the one published, and a receipt that a local bundle's files are the ones executed. Neither proves the checker is sound or the abstraction faithful.

## Record formats

A collection, a behavior and a review each name their serialization in a `format` field. Use the exact identifier below. Any other identifier is invalid, and so is an omitted field.

| Record | Format identifier | Fields and interpretation |
| --- | --- | --- |
| Collection | `dossier-collection@0.2.0` | [Behavior collections](behaviors.md#collection) |
| Behavior | `dossier-behavior@0.2.0` | [Behaviors](behaviors.md#behavior) |
| Review | `dossier-review@0.2.0` | [Review scope and binding](review.md#scope-and-binding) |

## Reader reports

Verify derives one report per dossier, with `format: "dossier-behavior-report@0.2.0"`. It is the dossier's `behaviors` field in `dossier verify --json` and in the machine form of its ledger. An explorer reads the same report, and must refuse a format it does not support rather than compute a standing of its own.

The report carries the dossier's path, the order of the collection and each behavior's scoped claims, with the path of the file that holds its explanation. It copies no authored text: a reader takes the orientation, the explanations and a review's findings from their files. It names each fact once, so it grows with the dossier's claims and not with its reviews. Each claim comes with its standing, its freshness, the reasons, the limitations, its pins and its resolved mappings. Each mapping keeps its relation and its rationale as authored, beside the evidence, the formal standing of its target, the owner's exact decision and the independent assessments. Each review keeps whether it is valid and current, the claims and the explanations of its subject that changed since it was written, its subject, its coverage, what it replaces, the result of each assessment and the number of files its basis binds. The report also lists the passages, cells, walks and scenarios that no behavior is associated with, and says that the list does not establish that the source is explained in full.

A report is a view and can be discarded. Rendering writes no evidence, no assessment and no decision. A reader of the report may select and arrange what it carries. It cannot derive stronger support, hide a current contradiction or turn an illustration into a general guarantee.
