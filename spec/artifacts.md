# Artifact ownership

An artifact's writer and authority determine whether it may be edited, regenerated or discarded. [Publication and integrity](storage.md) defines how the records are published.

| Artifact | Writer | Authority and consumer |
| --- | --- | --- |
| `prose.md` | Owner or authorized agent; import/begin may draft | Authored meaning, stable ids, ranges and tier; compiler and reviewer input |
| `wiring.md`, `actors/*.md` | Owner or authorized agent | Authored membership, wiring, closure and environment assumptions |
| Refined part model, Alloy module, `extras.tla` | Agent following prose | Authored encoding. The exact executed identities belong to each answer's basis |
| Blunders under `model/blunders/` and `chart/blunders/` | Agent following prose, by hand or, for a model blunder, through `dossier blunder`, which may write the copy, its configuration and its call | Authored deliberate fault, which the property it targets must catch |
| `calls/*.md` | Agent before execution, by hand or through `dossier call`, which may write the lines that identify the question. The runner accepts a call written either way | Pending prediction and planner input, never evidence by itself |
| `evidence/<name>.json` | Runner, at publication | The current answer to one question: its prediction, observation, scope and basis, the trial that established it, and the last answer that differed. Verify computes the marks from the entries |
| `evidence/<name>.md` | Agent, once the answer is written | The reading: interpretation and miscall classification of the current answer. Verify reads only its `classification:` line, and it cannot grant coverage. Removed with its answer when a new one replaces it |
| `trials/<id>/` | Runner | The trial's bundle: the call as captured, the checker's output, `result.json`, the receipt, traces and diffs. Local to the machine that ran it and kept out of version control, never in the record |
| `decisions.log` | Decision command with owner words | Durable owner decisions at identified hashes |
| `doubts.md` | Agent | Authored alternatives and the one assumed. Only a doubt's answer, the owner's decision bound to the alternatives' hash, closes a doubt |
| `reviews/*.md` | Independent reviewer | Findings about the evidence, never marks or decisions. Verify reads only the first line, `prose@<hash>`, to tell whether a second read is owed |
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
