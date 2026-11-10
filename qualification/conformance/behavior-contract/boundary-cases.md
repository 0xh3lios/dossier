# Revision and correction boundaries

These are complete decision cases for a reader of the contract, not executed
production parser tests. The positive knowledge identity uses Harbor's
`timelock#property:execute-after-eta` record in
`knowledge/modules/timelock/behavior/invariants.md`. Its resolved record digest
is `6d688aa061b03fd31bed4b87c89198990e1ced65acfc654aed1ec50c9741dd6e`.

The complete target is:

```json
{
  "kind": "knowledge",
  "ref": "timelock#property:execute-after-eta",
  "revision": "sha256:6d688aa061b03fd31bed4b87c89198990e1ced65acfc654aed1ec50c9741dd6e"
}
```

| Change | Required result |
| --- | --- |
| Resolve that exact current record | Identity matches; only record availability, no new test or semantic verification |
| Edit the statement, keep the requested digest | Stale pin; do not silently use the changed statement |
| Use the record's 16-character display hash | Invalid revision, not an abbreviation to expand |
| Supply a Git commit as revision | Invalid revision; source commit belongs in the referenced record |
| Change only an unrelated record in the file | Record revision may still match; a review hashing the whole file becomes stale |
| Record has a plausible statement but no source/instance correspondence | No source or deployment support merely because the digest matches |

For correction, let A be a current independent review that incorrectly marks
`cancel-plan/C1/M1` contradicted. B independently rereads the same files and
assesses it supported. Each record is otherwise complete under
[the review contract](../../../spec/review.md).

| Case | Required result |
| --- | --- |
| B is later, with an empty replaces array | A and B remain contested; later date grants no precedence |
| B explicitly replaces A's exact review path, digest and mapping, explaining the mistake | Only that A assessment is suppressed while B stays current; both documents remain |
| Another independent current review C disagrees with B and is not replaced | B and C remain contested |
| B's required input changes or B is removed | B suppresses nothing; an otherwise current A applies again |
| B merely says “A retracted” in Markdown | No structured replacement; A still applies |
| B names a wrong digest, another mapping, a different behavior-file digest or a cycle | Invalid replacement; suppress nothing |
| A's reviewed behavior text changes | A is stale on its own; new input needs a new assessment, not a fabricated historical-content match |

Replacement never changes a checker answer, an accepted risk or the claim's
owner. Correcting a reviewer does not permit relabeling a bounded result as a
proof.
