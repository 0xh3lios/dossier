# What Dossier keeps

A dossier is a written account of one part of a system, or of several parts working together. It lives in files beside your code and records. Its behavior collection explains what the system does and which evidence supports each claim.

The [behavior contract](../../spec/behaviors.md) defines the collection. The agent runs `dossier verify` before it works on the collection. Verify reads the behaviors, the formal inputs, the published answers and the scoped reviews without changing them. It reports each claim's support and its limits.

## Start with behaviors

The dossier's README introduces its purpose, actors, vocabulary, normal flow and boundaries. It gives the order in which to read `behaviors/*.md`. Each behavior explains one mechanism and makes claims, and each claim is checked separately. A claim can begin as a hypothesis, with its scope and its assumptions stated before it has any support. [Behaviors and claims](behaviors.md) explains what rests on them and how a claim earns its standing.

`prose.md` defines the shared formal abstraction in states, events, moves, properties and walks. The behavior files explain the mechanisms and their outcomes to a reader. Their mappings connect that explanation to the formal statements and the answers. A disagreement between a behavior and the prose needs investigation. A walk that no behavior maps to stays available to investigate, and it is not unfinished work for that reason alone.

## Who writes what

The files keep apart what the agent writes, what the runner records, what an independent reviewer assesses and what the owner decides.

**The owner decides.** The owner is the person whose part or composition it is. A [passage](parts-compositions-scenarios.md#prose-and-passages) means what its owner says it means. Owners accept passages, reject them with a reason, answer doubts, accept risks, and let go of answers with `forget`. Each of those decisions is recorded in the owner's own words and never paraphrased.

**The machine computes.** Marks such as `proved`, `checked` and `violated` are computed from the answers the runner records from the checkers. Nobody writes a mark by hand. When anything a mark rests on changes, the mark lapses.

**The agent drafts and reads.** The agent writes the behaviors' explanations, their scoped claims and their mappings to evidence. It drafts the formal passages, draws the chart, writes the models and the [calls](evidence.md#a-call-before-every-trial), runs each call in a trial and reads its answer. Its readings, the notes it writes beside each answer, explain a trace or a planted bug to people and never change a mark. The tools read only one line of a reading, its classification of an answer that surprised the agent.

**The reviewer assesses independently.** A reviewer in a fresh context checks whether the evidence a claim maps to supports it at its stated scope. The review records its findings, its exact inputs and what the reviewer examined. A review of one behavior does not cover the whole dossier.

A behavior's support, its freshness, the review's assessment and the owner's decisions stay separate. Nobody writes a `verified` flag on a behavior. A requirement contradicted by a counterexample stays contradicted, even when another claim explains why that path is possible. Accepting a formal passage, or the risk on a cell, does not accept a behavior by association.

The ledger puts the owner and the machine side by side. Each passage gets a row with the owner's column, the machine's column, the answers that cover it and how far their trials looked.

The authored files say what is asked. Each [question](evidence.md#one-answer-per-question) a trial asked has an entry under `evidence/` that keeps its current answer, and `decisions.log` keeps what the owners decided. `integrity.json` records which entries and decisions belong to the dossier, so verify notices one that goes missing or changes. Charts, generated composition models, ledgers and the index are views, rebuilt from these files. [Publication and integrity](../../spec/storage.md) defines which records are published and what a reader may trust.

## Parts and compositions

A **part** is anything with states and events, such as a contract or a procedure a multisig runs. Its dossier starts with the behavior collection and keeps the formal prose, chart, models, answers and ledger behind it.

A **composition** wires parts together for one concern, such as a supply, a control plane or keeper upkeep. Its dossier explains the combined behaviors and keeps the wiring, the properties of the whole, the current answers for each property under each [scenario](parts-compositions-scenarios.md#actors-modes-and-scenarios), and a matrix of the results.

[Parts, compositions and scenarios](parts-compositions-scenarios.md) explains how they fit together.

## What the ledger says, and what it does not

For each passage and each [cell](parts-compositions-scenarios.md#cells-and-the-matrix), the ledger says one of four things:

- **A checker established it.** The mark says how, `proved` by induction or `checked` within a stated reach.
- **A checker found it false.** The answer carries the path, and the owner decides what it means.
- **Nobody has tried it yet.** It is `pending`, or `drawn` when only the chart has checked it.
- **It is only words.** Some statements no tool here can check. They are written as Words-only passages that say why, so the gap is visible instead of silent.

Every cell names the scenario it was tried under and the members it rests on. Every part ledger lists the guarantees its abstraction leans on, and a guarantee that nothing backs is printed as assumed. [The limits of a mark](limits.md) lists what a mark does not establish.

## How the work divides

| Step | What happens |
| --- | --- |
| Say what matters | You choose a behavior or a question. The agent reads the collection, proposes a claim with its scope and says which part or composition owns it. |
| Make the passages reviewable | The agent drafts the passages, and redraws the chart compiled from them each time it edits them. It reports any pair of state and event that is said twice or not at all. An ambiguous passage becomes a doubt for you to answer. You settle the passages. |
| Predict and run | The agent writes the models and, before each trial, a call with the outcome it expects. Then it runs the checkers through the runner. |
| Challenge the claims | The agent looks for counterexamples and missing cases. A planted bug, called a blunder, tests whether a property can fail. An independent review assesses what the claims and their mappings mean, and whether they are supported. |
| Interpret a surprise | The agent classifies each answer that differs from its call. A violated cell reaches you with its counterexample retold as who did what. |
| Keep it current | The agent tells a changed explanation, mapping or review apart from a change to the inputs a trial executed. A solver's answer lapses only when its own basis changes. |

## Where you come in

The agent can investigate a hypothesis without asking you to accept it. These decisions remain yours.

- **Settle passages.** Accept a batch, or reject one with your reason.
- **Answer a doubt.** The agent poses a passage it can read two ways as two walks that differ, and you pick one.
- **Decide what a counterexample means.** Accept a violated cell as a risk, add a control, or correct the prose. A counterexample you no longer trust, or one that other answers have superseded, stays until you let it go with `forget`.
- **Resolve a contradiction.** When a trial shows the prose contradicting itself, you say which sentence is wrong.

The agent uses the authority you have already given, and asks you when it needs a further decision. It can go on investigating while a violation stays visible and unaccepted. [Get a second read](../how-to/get-a-second-read.md) explains how a review works.

Whether the model represents your system is also yours to judge, since no checker can. Backings and replays are the evidence for that judgment, and [The limits of a mark](limits.md) lists what a mark leaves to it.

## The verify line

The agent starts from `dossier verify` whenever it works on the dossiers, and "where are we?" asks for it directly. Its first line, the verify line, says whether the record is intact. The lines after it name the next step for each dossier: `Fix`, `Write`, `Draw`, `Encode`, `Compose`, `Try`, `Refresh`, `Review` or `Report`. [Marks](../reference/marks.md#the-next-step) says when each applies. A fresh session derives what remains from the authored inputs, the entries, the decisions, the reviews, the calls waiting to run and the open doubts. The agent may note where it stopped in the margin beside a part's prose, but no separate progress record is required.
