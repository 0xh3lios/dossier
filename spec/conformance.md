# Specification conformance

Conformance means that the accepted artifacts, tool transformations and agent claims satisfy the named contracts. Link checks establish discovery. Parser tests establish forms. Execution tests establish particular behavior. Independent agent exercises establish particular uses of the instructions. None substitutes for the others.

## Contract obligations

| Contract | Observable obligation |
| --- | --- |
| `PROC-OBSERVE` | Agent starts from current findings and targets the requested scope |
| `PROC-PREPARE` | Produced prose, wiring and models satisfy their parsers and preserve the requested meaning |
| `PROC-CALL` | Prediction exists before execution and names exactly the enabled property/scenario |
| `PROC-EXECUTE` | Only a completed answer in an intact entry contributes its permitted evidence |
| `PROC-INTERPRET` | A reading follows the entry's answer and classifies a miscall with one of the five classifications, without adding cover |
| `PROC-NO-WEAKENING` | A counterexample does not trigger an unauthorized semantic weakening |
| `PROC-OWNER` | Owner decisions use supplied words; accepted violations remain violations |
| `PROC-REPORT` | Claims preserve scope, bounds, proof status, staleness and unresolved assumptions |
| `ART-EVIDENCE` | An entry changes only by a publication the evidence rules allow, never by a read |
| `ART-HISTORY` | Integrity history persists across repeated verification |
| `ART-VIEWS` | Generated diagnostics do not become solver evidence |
| `ART-SCOPE` | Evidence for one mode/property/scenario cannot silently support another |
| `STORE-FORMAT` | A marker without `storage: integrity-v1`, or a missing or malformed manifest, grants no authority and never falls back to a view |
| `STORE-BUNDLE` | Verification reads no bundle, and deleting one changes no conclusion |
| `STORE-ANSWER`, `STORE-DECISION` | Partial publications grant neither evidence nor owner authority |
| `STORE-INITIALIZE`, `STORE-WRITERS` | A new visible dossier is complete. Begin adopts a folder without `integrity.json` only when it holds no decisions or entries. Competing writers do not mix candidates or lose publications |
| `STORE-RECOVER` | Recovery places a bound candidate and deletes exactly what its publication dropped, or puts the bundle's answer through publication again under the evidence rules, and recovering again changes nothing |
| `STORE-READ` | Verification preserves bytes and metadata. Deleting or editing a view leaves conclusions unchanged |
| `ANSWER-KEY` | Two configurations of one passage are two questions, and a changed reach is the same question |
| `ANSWER-SAME` | A trial that confirms the current answer leaves its entry byte-identical, and writes no byte of the record when nothing is dropped |
| `ANSWER-REPLACE` | A replacing answer keeps the last different one as `previous` and a further reach as `narrowed` |
| `ANSWER-VIOLATION` | On an unchanged basis, no answer at a smaller reach, from a changed toolchain or made by hand replaces a counterexample or a failed check without the owner's `forget` |
| `ANSWER-MISCALL` | An unclassified miscall is never replaced |
| `ANSWER-ABORTED` | An aborted trial's answer is written only for a question with no entry |
| `ANSWER-GONE` | The answer to a question whose passages, scenario, walk or authored files are gone covers nothing |
| `ANSWER-SUPERSEDED` | The answers that decide are never superseded, and of answers that stand in for each other the earlier is, so removing every superseded answer changes no conclusion |
| `ANSWER-DROP` | Every publication that is not refused removes gone questions and superseded answers, never its own question's entry, and keeps a superseded counterexample until the owner's `forget` |
| `ANSWER-RECHECK` | Recheck writes nothing, agrees with every current answer it reruns, reports a planted difference, and runs nothing it lists as not run |
| `MARK-DECIDING` | Each side of a passage and each cell takes its mark from one answer, the strongest that has not lapsed and the latest among equals. A miscall that is the latest answer decides, and a counterexample that has not lapsed and is not forgotten decides before any later proof or check, on a cell and on a passage alike. A forgotten violation and an answer that looked at nothing rank below every proof and check |
| `REVIEW-OWED` | A dossier with marks a reviewer judges and no review naming its current prose hash on its first line is flagged `review owed` and, once nothing earlier is owed, routed to Review. A review whose first line names the hash clears both, and the flag names a review of an earlier wording |
| `REVIEW-STATUS` | Each finding states its claim and carries `verified`, `not verified` or `retracted` for the support behind that claim, never for whether the composition passes; a retraction keeps the claim and gives the correction |

## Examples and fixtures

Only examples explicitly identified by the qualification suite as complete inputs are executed without setup. Grammar templates, partial file excerpts and command placeholders are not complete inputs. Negative cases carry expected refusals. Store minimal reusable cases in `qualification/conformance/` and keep expected outcomes independent of production renderers.

For every failure retain the smallest input or command sequence that still fails. A fixture extracted from a real repository must remove private records, addresses, machine paths and unrelated material. Preserve its mechanism and independently specified expectation. Domain-specific provenance belongs with development records outside the plugin.

## Agent exercises

Provide the agent a realistic user request, the skill/spec entrypoint and only the raw artifacts needed for the task. Withhold the grading key and previous findings. Use an isolated workspace. Grade the resulting files with the real parser/planner/verifier and check claims against what the tools report. Keep the request, spec identity, produced artifacts, relevant execution evidence and grading outcome together.

A static instruction review is not an agent run. A simulated action sequence is not a live host integration check. Record those limits explicitly. A failed exercise is evidence to improve the contract or its adapter. Do not adjust its grading key to match the agent.

The [qualification index](../qualification/README.md) names the executable layers and the commands that run them.
