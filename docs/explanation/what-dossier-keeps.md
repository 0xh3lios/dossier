# What Dossier keeps

A dossier is a written account of one part of a system, or of several parts working together. It lives in files beside your code and records. `dossier verify` reads those files and reports their current standing without changing them. The agent runs it first whenever it works on the dossiers. `dossier render` writes a ledger when you want a saved report.

## Who writes what

Three parties write into a dossier, and the files keep their writing apart.

**The owner decides.** The owner is the person whose part or composition it is. A [passage](parts-compositions-scenarios.md#prose-and-passages) means what its owner says it means. Owners accept passages, reject them with a reason, answer doubts, accept risks, and let go of answers with `forget`. Each of those decisions is recorded in the owner's own words and never paraphrased.

**The machine computes.** Marks such as `proved`, `checked` and `violated` are computed from the answers the runner records from the checkers. Nobody writes a mark by hand. When anything a mark rests on changes, the mark lapses.

**The agent drafts and reads.** The agent drafts the passages, draws the chart, writes the models and the [calls](evidence.md#a-call-before-every-trial), runs each call in a trial and reads its answer. Its readings, the notes it writes beside each answer, explain a trace or a planted bug to people and never change a mark. The tools read only one line of a reading, its classification of an answer that surprised the agent.

The ledger puts the owner and the machine side by side. Each passage gets a row with the owner's column, the machine's column, the answers that cover it and how far their trials looked.

The authored files say what is asked. Each [question](evidence.md#one-answer-per-question) a trial asked has an entry under `evidence/` that keeps its current answer, and `decisions.log` keeps what the owners decided. `integrity.json` records which entries and decisions belong to the dossier, so verify notices one that goes missing or changes. Charts, generated composition models, ledgers and the index are views, rebuilt from these files. [Publication and integrity](../../spec/storage.md) defines which records are published and what a reader may trust.

## Parts and compositions

A **part** is anything with states and events, such as a contract or a procedure a multisig runs. Its dossier holds the prose, the chart drawn from it, the models, the answer to each question its trials asked, and the ledger.

A **composition** wires parts together for one concern, such as a supply, a control plane or keeper upkeep. Its dossier holds the wiring, the properties of the whole, the current answers for each property under each [scenario](parts-compositions-scenarios.md#actors-modes-and-scenarios), and a matrix of the results.

[Parts, compositions and scenarios](parts-compositions-scenarios.md) explains how they fit together.

## What the ledger says, and what it does not

For each passage and each [cell](parts-compositions-scenarios.md#cells-and-the-matrix), the ledger says one of four things:

- **A checker established it.** The mark says how, `proved` by induction or `checked` within a stated reach.
- **A checker found it false.** The answer carries the path, and the owner decides what it means.
- **Nobody has tried it yet.** It is `pending`, or `drawn` when only the chart has checked it.
- **It is only words.** Some claims no tool here can check. They are written as Words-only passages that say why, so the gap is visible instead of silent.

Every cell names the scenario it was tried under and the members it rests on. Every part ledger lists the guarantees its abstraction leans on, and a guarantee that nothing backs is printed as assumed. [The limits of a mark](limits.md) lists what a mark does not establish.

## How the work divides

| Step | What happens |
| --- | --- |
| Say what matters | You say what behavior matters, which parts are involved and which circumstances to try. The agent decides whether that behavior belongs to a part or a composition, and proposes scenarios. |
| Make the passages reviewable | The agent drafts the passages, and redraws the chart compiled from them each time it edits them. It reports any pair of state and event that is said twice or not at all. An ambiguous passage becomes a doubt for you to answer. You settle the passages. |
| Predict and run | The agent writes the models and, before each trial, a call with the outcome it expects. Then it runs the checkers through the runner. |
| Challenge the claims | A planted bug, called a blunder, tests whether each property can fail. The review skill gives the dossier a second read in a fresh context. |
| Interpret a surprise | The agent classifies each answer that differs from its call. A violated cell reaches you with its counterexample retold as who did what. |
| Keep it current | Results lapse when what they rested on changes. The agent reruns what lapsed, parts before compositions. |

## Where you come in

Everything except meaning proceeds without you. You are asked for four kinds of decision.

- **Settle passages.** Accept a batch, or reject one with your reason.
- **Answer a doubt.** The agent poses a passage it can read two ways as two walks that differ, and you pick one.
- **Decide what a counterexample means.** Accept a violated cell as a risk, add a control, or correct the prose. A counterexample you no longer trust, or one that other answers have superseded, stays until you let it go with `forget`.
- **Resolve a contradiction.** When a trial shows the prose contradicting itself, you say which sentence is wrong.

The agent stops and asks for these, and reports where things stand at the end of every turn. Once a dossier owes nothing else, its next step is `Review`, which asks you for a second read by the review skill, as [Get a second read](../how-to/get-a-second-read.md) shows.

Whether the model represents your system is also yours to judge, since no checker can. Backings and replays are the evidence for that judgment, and [The limits of a mark](limits.md) lists what a mark leaves to it.

## The verify line

The agent starts from `dossier verify` whenever it works on the dossiers, and "where are we?" asks for it directly. Its first line, the verify line, says whether the record is intact. The lines after it name the next step for each dossier: `Fix`, `Write`, `Draw`, `Encode`, `Compose`, `Try`, `Refresh`, `Review` or `Report`. [Marks](../reference/marks.md#the-next-step) says when each applies. A fresh session derives what remains from the authored inputs, the entries, the decisions, the reviews, the calls waiting to run and the open doubts. The agent may note where it stopped in the margin beside a part's prose, but no separate progress record is required.
