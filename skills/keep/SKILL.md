---
name: keep
description: Develop the dossier's account of a system through readable behaviors and precise claims. Form hypotheses, connect them to models and evidence, run checks, and report what the answers establish. Use to begin a part or a composition, check a claim, investigate an actor or an outage, widen a check, refresh after a change, or explain where the work stands. Not for preparing a repository or for an independent second read.
allowed-tools: Bash(dossier *)
---

# Keep

`dossier` is [`bin/dossier`](../../bin/dossier) at the root of this plugin. Where it is not on the PATH, run it by that path.

Follow [one process](../../spec/process.md) to turn the user's request into scoped claims and checked work. A [behavior collection](../../spec/behaviors.md) is the readable account. Its README introduces the system, and its behaviors explain the mechanisms through claims that can each be judged on their own. Owners settle formal meaning and accept risk. The agent writes the explanations, the models and the mappings. The tools execute the checks and derive the facts about the evidence. An independent reviewer assesses whether the evidence supports the meaning.

Read each claim's current standing, scope, freshness, evidence and independent assessments from `dossier verify --json`. The ledger is a derived view and may be stale. Write the records in the formats the specification gives. Never write a status, and never take a valid record as support for what it says.

Begin by running `dossier verify --brief`. Open the selected dossier's README and the relevant behaviors, then follow the claim's mappings into the formal inputs and the evidence. `dossier where parts/<id>#<behavior>` prints a behavior's claims with their standing, and `/C<n>` after it selects one claim. For a composition, use `compositions/<id>`. `dossier verify --brief <dossier>` keeps the output to one dossier. Follow the user's scope before the next action the router suggests. A new hypothesis, or a violation not yet accepted, does not block an authorized investigation of it.

After every edit to a part's `prose.md`, run `dossier draw <id> --brief` and read its line before going on. Drawing is a diagnostic, and records no answer. Read the page named by `read:` when its operation is unfamiliar. Use `dossier render` for reports. For an interrupted publication, follow [publication and integrity](../../spec/storage.md).

| Task | Read |
| --- | --- |
| Understand a dossier, formulate a hypothesis or connect a claim to evidence | [Behaviors](../../spec/behaviors.md), then [the process](../../spec/process.md) |
| New or changed part | [Language](../../spec/language.md), [chart](../../spec/chart.md), then [models and trials](../../spec/models.md) for the declared tier |
| Composition property or scenario | [Composition](../../spec/composition.md), [models and trials](../../spec/models.md) |
| Refresh or what-if | [Process obligations](../../spec/process.md#obligations-by-task), then the relevant input and checker contract |
| An answer, a tripwire or a status report | [Evidence](../../spec/evidence.md) and [artifact ownership](../../spec/artifacts.md) |
| Asking a question again, or rechecking its answer | [Questions and answers](../../spec/evidence.md#questions-and-answers) |
| Backing or knowledge references | [Knowledge](../../spec/knowledge.md) |
| Owner decision | [Decision boundary](../../spec/process.md#decide-when-needed); invoke `dossier decide` with their words |
| Independent review | The review skill, in its own context |

The checker contracts are [TLC](../../spec/checkers/tlc.md), [Apalache](../../spec/checkers/apalache.md), [Alloy](../../spec/checkers/alloy.md) and [external](../../spec/checkers/external.md). Read only the one needed. The [command reference](../../docs/reference/commands.md) owns syntax.

Predict before executing. Have `dossier call` write the lines that identify a call's question, and `dossier blunder` write a model blunder's copy, its configuration and its call. Then write the prediction they leave empty: the reach, each expected outcome and the reason. Read an answer with `dossier show <dossier> <entry>`, which prints its trace as a table.

Use the answer to support, challenge or illustrate the claim at the scope it actually has. A walk does not establish every possible execution. A bounded check does not become an inductive proof. A model result does not by itself establish how the source or a deployment behaves. An external runner may execute a simulator or a stand-in. Support for a source or a deployment claim also needs a knowledge-backing mapping, adequate and independently reviewed, that establishes the correspondence to the pinned source or instance. Mappings and their rationale let a reviewer check that reasoning. They grant no evidence.

Never edit a published answer or another tool-owned file by hand, and run every checker through `dossier trial`. Classify a miscall before asking its question again. Get the owner's decision before changing settled meaning to accommodate a counterexample, and the owner's `forget` before a new answer overturns a violation that has not lapsed. Keep an accepted violation visibly violated. The detailed requirements are in the process and evidence contracts.

Install dependencies only when authorized. Repository-specific instructions govern commits.

Finish with what each affected behavior claim now establishes, its kind of evidence and its scope, where it applies, its freshness, the review's assessment and the owner's exact decision. Include the current verify findings, the changed artifacts and the new trial ids, the work still unresolved and the next useful step. Do not write a blanket verified status, and do not invent an owner's decision.
