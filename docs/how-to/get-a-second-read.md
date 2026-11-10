# Get a second read

Ask an independent reviewer to assess a behavior or a whole dossier before you rely on its claims. The reviewer checks whether the explanation agrees with the formal statements and the evidence. The review records what the reviewer examined.

The [review contract](../../spec/review.md) defines the assessment. The reviewer gets the required files and the coverage items from `dossier review-basis`, then reads and assesses them. The command writes no review and grants no support.

## Steps

1. **Select the review scope.** Invoke the review skill with the dossier, and for a focused review with the behavior to examine. A review of one behavior does not stand for a review of the whole dossier.

2. **Give the reviewer a fresh context.** The reviewer starts from the dossier's README and its behavior collection. It runs `dossier verify` to read the current claims and the findings on the model and the trials. Then it runs `dossier review-basis <dossier> --json`, adding `--behavior <id>` for a focused review. Review-basis prints the required files, their hashes and the coverage items. The reviewer reads those files, and any additional source material its assessment needs. It checks each claim against the properties, walks or records it maps to, with its scope, its assumptions and the strength of its evidence. It inspects the source or deployment evidence a claim depends on. It also works through the items of the formal examination that apply, and retells selected traces. Where the toolchain is available, it runs `dossier recheck` and says which answers came back the same.

3. **Read the assessment.** The reviewer writes one file under `reviews/`, in the contract's format. It binds the complete required basis by SHA-256, and each behavior claim by claim, so a later edit to one claim takes only that claim's assessments out of effect. An edit to a behavior's explanation alone keeps them, though a dossier review then no longer clears what the dossier owes. It adds, as additional files, the others it inspected that its judgment depends on, if another clone can have them again exactly. It assesses every mapping, and says what it reviewed and what it did not. The reviewer then runs verify again to confirm that the new review parses and that its basis is still current. Each finding carries `verified`, `not verified` or `retracted`, which describes the support for the finding's statement. A verified finding may establish a defect. It does not mean that the behavior passed.

4. **Act on the findings.** Ask the agent to correct an explanation, improve a mapping or run the missing check. When a claim or its evidence changes, the mapping it affects needs a new assessment. The owner's decisions stay separate. A reviewer cannot accept a risk or make a violated property true.

The behavior holds the explanation, and the runner's answer holds the evidence from execution. The review assesses whether the two agree.
