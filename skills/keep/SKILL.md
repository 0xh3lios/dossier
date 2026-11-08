---
name: keep
description: Keep the dossiers. Abstract parts from the records, draw and check them, wire them into compositions, write properties and scenarios, run solver trials through the runner, and report the ledgers. Every turn starts from the verify line. Use when the team begins a part or a composition, asks to check a claim (never, always, within N blocks, eventually), asks what happens under a malicious actor or an outage, widens a check, or asks where things stand: start a dossier for X, draw it, compose the supply system, check that X never Y, what if a keeper is offline, prove the conservation, where are we, refresh after the upgrade. Not for preparing a repository (setup) or for an independent second read (review).
allowed-tools: Bash(dossier *)
---

# Keep

`dossier` is [`bin/dossier`](../../bin/dossier) at the root of this plugin. Where it is not on the PATH, run it by that path.

Turn the user's request into checked work on the dossiers, using [the specification](../../spec/README.md) and [one process](../../spec/process.md). Owners settle meaning and accept risk. The agent authors inputs and readings. The tools execute checks and derive claims.

Begin by running `dossier verify --brief`. After every edit to a part's `prose.md`, run `dossier draw <id> --brief` and read its line before going on. Read the page named by `read:` when its operation is unfamiliar. Follow the user's requested scope. The router identifies unmet obligations. Use `dossier render` for report materialization. For an interrupted publication, follow [publication and integrity](../../spec/storage.md).

| Task | Read |
| --- | --- |
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

Keep these boundaries in view too: never edit a published answer; derive claims from answers; obtain an owner decision before changing meaning to accommodate a counterexample, and the owner's `forget` before a new answer overturns a violation that has not lapsed; classify a miscall before running its question again; state each reach and what has lapsed; keep an accepted violation visibly violated. The detailed requirements are in the process and evidence contracts.

Never write a tool-owned file by hand, and run every checker through `dossier trial`. Verify trips on an edited entry or decision line, and nothing records what a checker returns outside the runner. Install dependencies only when authorized. Repository-specific instructions govern commits.

Finish with current verify findings, the artifacts and entries changed with the new trial ids, the claims the answers support with their scope and assumptions, any owner decision needed, and the next useful step. Do not invent a decision or hide an incomplete check behind a successful command.
