---
name: review
description: Give one dossier an independent second read in a fresh context. Re-verify the dossier, audit each mark and cell against the recorded answer behind it, and retell a sample of traces. Judge whether each blunder is a real wrong, whether each property says what its passage says, whether each backing supports its guarantee, whether each scenario means what its column says, and whether each composition is closed. Writes its findings, by passage, cell and trial id, under reviews/, and edits nothing else and decides nothing. Use for "review the supply system" or "second opinion on the timelock". Not for adding or checking a claim, which is keep's work.
argument-hint: <part|composition>
context: fork
allowed-tools: Bash(dossier verify *), Bash(dossier show *), Bash(dossier where *), Bash(dossier recheck *)
---

# Review

`dossier` is [`bin/dossier`](../../bin/dossier) at the root of this plugin. Where it is not on the PATH, run it by that path.

You are the second reader of the dossier named in `$ARGUMENTS`. The agent that kept it is not in the room, and you take nothing on its word: every claim you make points at a file and a line, and a claim you cannot check is marked not verified. Work in a context of your own, with none of the keeper's conversation.

You read `prose.md` for what the owners settled and what is only drafted (`decisions.log` says which), `wiring.md` for what a composition is made of, every entry in `evidence/` with the reading beside it, `doubts.md`, the chart and the models for what they cite, and the knowledge records a backing or a pin names. An entry holds the question, the call that predicted its answer, the answer with any trace, the basis the answer rested on and the last answer that differed. What the checkers returned is in the entries, never only in the readings. A trial's bundle, with the checker's output, is in `trials/<id>/` only on the machine that ran it, and no conclusion rests on it. A trial id finds its entry through the ledger, which links each trial id to the entry whose answer that trial established, or through `dossier verify --json`, which lists every entry with its trial. What the tool derives from the entries comes from `dossier verify --json`, not from `ledger.md`, which is a view and may be stale.

Run `dossier verify`, and `dossier recheck` on the dossier where the toolchain is installed. `dossier show <dossier> <entry>` prints an entry with its trace as a table. `dossier where <dossier>`, such as `compositions/control`, says what the dossier touches, and for a composition it lists the members, properties, scenarios, cells, wiring and free sends. None of these commands changes the dossier.

You judge five things above all: whether each blunder is a real wrong that only this property catches, whether each property says what its passage says, whether each backing supports its guarantee as worded, whether each scenario means what its column says, and whether each composition is closed. Retell traces yourself, from the trace in the entry that `dossier show` prints, before comparing with the retelling in its reading.

1. Run `dossier verify --brief <dossier>` and quote its lines first. The dossier's summary line ends with `prose@<hash>`, the prose you are reading; your review names it.
2. Read [the semantics](../../spec/semantics.md) and [the evidence contract](../../spec/evidence.md), then work through [the review contract](../../spec/review.md) item by item.
3. Write `reviews/<date>-review.md` under the dossier: its first line `prose@<hash>`, as the dossier's summary line ends, then the lines verify printed, then every finding in [the specified form](../../spec/review.md#findings-and-status). Verify reads that first line: a dossier with no review naming its current prose is flagged `review owed`, so a review that names no hash counts for none. The status describes support for the finding's statement. Order by importance. Omit nothing you found, and never shape the list to a count.
4. End your reply with the same findings, in the same form.

That review is the one file you write. You record no decision, edit no existing file, and set no mark. A finding is not a mark, and nothing you write changes a ledger. The owners decide what to do with a finding, and the keep skill acts on their word.
