# Refresh after a change

Bring the dossiers back up to date when something they depend on moves: a passage was edited, a model a trial ran was refined, a member changed, a record was updated, a backing moved to a new commit, or a scenario changed.

## Steps

1. **Say what happened.** "The parameter change went through" or "there is a new checkpoint" is enough. `dossier verify` already lists what lapsed.

2. **Read what moved.** Each lapsed cell names what moved, such as `passage A1`, `passage G1`, `member vault`, `member vault backing`, `generated module` or `record vault#observation:checkpoint-2026-11-01`. A part's next step names them for its lapsed passages, such as `lapsed: A1 M1 (executed model/Timelock.tla)`. To see how far a change reaches, run:

   ```bash
   dossier where vault
   dossier where vault#observation:checkpoint-2026-11-01
   ```

3. **Decide what the change means.** A parameter change may change a range in a part's boundary. Re-pin the members to the new checkpoint, and revise the prose where ranges or moves changed. A Certora spec on a new commit changes only the guarantee's backing sentence, which then names the new commit. Verify looks for the rule at that commit, and the marks that rest on the guarantee lapse until rerun.

4. **Rerun in order.** Parts first, compositions after, because a composition's module is composed from its members' prose. The agent writes new calls and never reuses a consumed one.

## Check

`dossier verify` shows nothing lapsed. Whatever is still lapsed has a dependency that was not rerun. A change that removed a passage, a walk or a file that a [question](../explanation/evidence.md#one-answer-per-question) names leaves the question's answer flagged `question gone`. The next publication in that dossier, which ends any trial there whose answer is not refused, removes the question's entry from `evidence/`.

Each entry under a dossier's `evidence/` holds an answer and its basis, what the answer rested on. Never edit one to clear a lapse. The tripwire `answer edited` catches it, and the record would no longer mean anything.
