# Get a second read

Have an independent reviewer audit one dossier before you rely on it. `dossier verify` says when one is owed. It flags the dossier `review owed`, as [Marks](../reference/marks.md#flags) describes, and once nothing else is owed the dossier's next step is `Review`.

## Steps

1. **Ask for the review.** Invoke the review skill with the dossier, such as `compositions/control`, or say "review the supply composition".

   The review runs in a fresh context, with a reviewer that reads the dossier's files and writes only its review. It re-verifies the dossier with `dossier verify`, audits each mark and cell against the answer that decides it, and judges five things: whether each blunder is a real wrong, whether each property says what its passage says, whether each backing supports its guarantee, whether each scenario means what its column says, and whether each composition is closed. It also retells a sample of traces. Where the solvers are installed, it rechecks the dossier with `dossier recheck` and says whether its answers came back the same. [How a claim earns its mark](../explanation/evidence.md#one-answer-per-question) explains what a recheck confirms.

2. **Read the findings.** The reviewer writes `reviews/<date>-review.md` under the dossier. Its first line is `prose@<hash>`, as the dossier's [summary line](../reference/marks.md#summary-lines) in `dossier verify` ends, so verify can tell which wording the review read. When the prose changes, a read is owed again, and the flag names the review that read the earlier wording. Each finding names the passage, cell and trial it concerns, the evidence, and its status: `verified`, `not verified` or `retracted`.

3. **Decide what to do.** A finding is not a mark, and nothing the reviewer writes changes a ledger. Ask the agent to act on a finding, or record a decision.
