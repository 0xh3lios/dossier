# Independent review

Work through every item. For each, say what you looked at and what you found, with file and line.

Write the review to one file, `reviews/<date>-review.md` under the dossier. Its first line is `prose@<hash>` and nothing else, with the six hexadecimal characters that end the dossier's summary line in `dossier verify`, so that it names the prose you read. Verify reads that line and nothing else of the review, and tells by it whether a second read is still owed ([REVIEW-OWED](evidence.md#flags)). The findings follow, in the form [Findings and status](#findings-and-status) gives. A review names no mark and changes none.

## The standing against its files

1. `dossier verify` says ok, or it says what is wrong. Either way, re-read two entries in `evidence/` at random: do their call, answer and basis agree with what `dossier verify --json` shows for the passages or cells they cover? Where the toolchain is available, run `dossier recheck` on one dossier and say whether its answers came back the same.
2. For every passage marked `checked` or `proved`, name the entry whose answer decides it and the trial that established that answer, and say why the answer would have come back otherwise had the passage been false. Where the mechanical rule is thin (a State covered because an action fired once, a refusal covered by absence), say so.
3. For every passage marked `text`: could it have been checked? A words-only passage that hides a claim is a finding.

## Properties against passages

4. Read every A, O and N definition in the model beside its passage, clause by clause. A property that says less than its passage, or something else, is a finding whether or not its answer held. In a system, read the generated module's translation of each property.
5. For every A, O and N, read its blunder: what was changed, and would a property that says nothing have caught it too? A blunder any property catches proves nothing about this one. A property with no blunder is held; say whether the obvious blunder would catch it.
6. Every Given cites an actor or says why not. Does it restrain that actor in a way the owners can be held to, or does it assume the conclusion? Is `prompt` warranted? Is `on` scoped to the right event? Is an `only when` condition what the owners can be held to?

## Guarantees and the knowledge base

7. For every K passage marked backed, open the rule the backing names. Does the rule as written support the claim as worded? A backed guarantee whose rule proves something narrower is a finding.
8. For every K passage marked assumed, say which marks rest on it and what would change if it were false.
9. Pins: do the pinned records describe the instance the prose abstracts, at a checkpoint that is still the deployed one?

## Compositions and scenarios

10. Closure: for each asset the system's properties speak of, read the knowledge base's edges yourself and confirm every owner of a relevant edge is a member. A closure rule that lists too few edge kinds is a finding.
11. Wiring: does every effect wired to an event carry the fields the event needs, and is every internal event wired from exactly the effect the prose names? A step that happens in the composition and could not happen in a transaction is a finding. Read the `free:` list in `composition.md` and the `left free` flags `dossier verify` prints: is each free send a defensible abstraction for the concern?
12. Scenarios: for every column, does the mode assignment mean what the property's reader will take it to mean? A scenario called `governance-captured` that leaves a second governance actor honest is a finding if the real capture would take both. Ask the same of every window and every start. A window counts ticks from 0 and ends before `until`, so a scenario called `lanes-down-two` whose window is `until: 1` is a finding. A start that leaves a datum at its boundary value where the situation it names would not, such as `oracle.state: Stale` with `stale` still 0, is a finding.

## Traces and readings

13. Retell at least one witness, one violated cell and one blunder trace yourself, from the trace in its entry, before reading the answer's reading, which the agent that kept the dossier wrote. `dossier show <dossier> <entry>` prints an entry's trace as a table. Compare. A retelling that skips a step or names the wrong action is a finding.
14. Every miscalled answer has a classification, the current one in its reading and a replaced one in its entry's `previous`. Check it against the procedure in [models](models.md#classifying-a-miscall): was a `call was wrong` really that, or a prose fault dressed down?
15. Every accepted risk: read the decision's words, and the trace in the entry whose answer the trial it names established. The ledger links each trial id to that entry, and `dossier verify --json` lists every entry with its trial. Does the acceptance speak to the path the trace shows, and is that answer's scenario the one the words describe? A cell whose acceptance lapsed waits for the owner, and its old words cover nothing.

## Reach and the ground

16. Compare each answer's reach with the ranges the boundary gives. A reach narrower than the data allows is a finding unless the call says why it suffices. `narrowed` and `reworded` flags help.
17. Look for the forbidden move in history, in each entry's `previous` and `narrowed` and in version control: a property whose definition changed between two answers where the earlier one miscalled; a guard loosened while its Move stayed; a Given added to make a cell pass; a scenario softened.

## The prose itself

18. Unsaid pairs, gaps, doubts open or closed, seams owed, closure open: each is a decision the owners have not made or a member that does not exist yet. List them.
19. Walks: do they cover the paths the prose makes possible, including the refused steps and the final states? A path no walk takes is a finding.
20. A Within or Once with a Given that no answer exercises is a promise with no evidence behind it.

## Findings and status

**REVIEW-STATUS.** A status describes the support for the finding's statement. It does not describe whether the system or property passes. Write the statement explicitly, cite the artifacts, and use one of these statuses:

| Status | Meaning |
| --- | --- |
| `verified` | The cited evidence establishes the finding as worded, within its stated scope. This includes confirmed defects, limits and successful checks. |
| `not verified` | The finding is a concern or claim that the available evidence does not establish. Name the missing evidence or unresolved interpretation. |
| `retracted` | Further examination contradicts an earlier finding. Preserve its statement and explain the correction with evidence. |

For example, “the bounded answer is being described as a proof” is `verified` when the answer records bounded execution and the report claims proof. “The deployed executor always meets this assumption” is `not verified` without evidence about that executor. An accepted violation can be the subject of a verified finding, and its cell remains `violated`.

Order findings by importance. Each must name the affected passages, cells or trials, its precise statement, file and line references, status, scope, and any missing evidence. Do not turn an unverified concern into an owner decision. A retraction is interpretation history, not a deletion of solver evidence.
