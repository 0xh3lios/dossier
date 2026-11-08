# Record a decision

Record what you decide about a dossier, in your own words. Use the decide skill, which passes your words through untouched. Give it the dossier, the verb and its arguments, then your words after `--`:

```
<dossier> <verb> ... -- "<your words>"
```

In Claude Code that is `/dossier:decide` followed by those arguments. In ChatGPT, choose Dossier's decide skill with `@`, and in the Codex CLI mention it with `$`, then give the same arguments. Only you invoke it. The agent never decides on its own. The same arguments work as `dossier decide` in a shell. `<dossier>` is a component's or a system's id. When a component and a system share an id, the bare id names the component, and `systems/<id>` names the system.

## The verbs

| To | Give decide |
| --- | --- |
| accept passages | `timelock accept S1 E1 M1 -- "the delay as deployed"` |
| reject one passage, with your reason | `timelock reject M4 -- "the delay is set per plan"` |
| give a doubt's answer, alternative a or b | `oracle answer D1 a -- "a stale price is still a price"` |
| accept a violated cell as a risk | `systems/upkeep risk N1 lanes-offline -- "both lanes down is an incident"` |
| begin a component | `timelock begin modeled -- "the timelock"` |
| begin a system | `control begin system -- "governance control"` |
| let go of an answer whose file is gone | `timelock forget <name>@<digest> -- "the file went with the old branch"` |
| let a new answer overturn a violation that has not lapsed | `systems/upkeep forget <name>@<digest> -- "the trace came from a checker build we no longer trust"` |
| let go of a superseded answer that holds a counterexample | `systems/control forget <name>@<digest> -- "the plain inductive call was wrong; the lemma question answers the cell"` |
| retire a dossier | `oracle retire -- "replaced by the new feed"` |

Accept, reject, risk, forget and retire need your words after `--`. A risk is accepted on a system cell that is violated now, after a trial has shown the violation. A forget names an entry, the file under the dossier's `evidence/` that holds the answer to one question. `<name>` is the file's name without `.json`, and `<digest>` is the first eight hex digits of the digest `integrity.json` binds for it. You don't need to look it up. Three outputs print the exact argument: the `answer removed` tripwire, a trial's refusal to overturn a violation, and the `answer superseded` flag on an answer that holds a counterexample.

## What happens

Each decision becomes one line of the dossier's `decisions.log`, with the time, the verb, its targets at their current hashes, your words, and the hash of the line before. The command then commits that exact prefix in `integrity.json`. Verify reads it without writing, and `dossier render` updates the ledger's owner column.

- **A decision follows its text.** Accepting `M4` accepts it as worded now. When its words change, it is unsettled again until you accept the new text.
- **A doubt's answer follows its alternatives.** Answering `D1 a` closes the doubt and records the hash of its authored alternatives. It writes nothing into `doubts.md`. If the alternatives change, the doubt is open again and the doubt's old answer is flagged `doubt answer stale` until you answer anew.
- **A risk follows the answer you were shown.** The line names the trial that established the violation you accepted, and the acceptance holds while that answer still decides the cell. A trial that gives the same answer again keeps your acceptance. Any other answer that comes to decide the cell lapses it. A new answer follows a reworded property, a changed Given or member, or a scenario changed under the same name, such as an outage lengthened from two blocks to six. A trial that looks further gives a new answer too, and so can a trial of another question on the cell. The cell stays `violated` and shows `accepted`, or `acceptance lapsed` with what moved, until you decide again.
- **Retire sets a dossier aside.** A committed `retire` removes it from ordinary analysis, the active index and routing. Its integrity is still checked. Its files stay for the record. A system that lists a retired member fails with `composition cites unknown component`, and a retired sender fails with `sender is not declared`. Trial, draw, scaffold, call and blunder refuse it, and `dossier where` says it is retired.
- **Begin reopens a retired dossier.** Any other verb on a retired dossier is refused, and the refusal names the `begin` that reopens it. On a dossier that is already open, begin records nothing. A component's tier comes from `Tier:` in its prose. Begin writes that line into a new component's skeleton, and the decision itself sets no tier.
- **Begin adopts hand-drafted inputs.** A folder whose prose you wrote before any decision has no `integrity.json`. When it also holds no `decisions.log` and nothing in `evidence/`, begin writes an empty `integrity.json` and records the begin. The bundles that trials leave in `trials/` do not count, since no bundle is part of the record. Begin refuses a folder with a `decisions.log` or entries but no `integrity.json`. Restore that file from version control.
- **Forget lets one answer go.** An entry whose file is gone trips `answer removed` at every verify, until the file is restored from version control or you forget it. A forgotten removed answer covers nothing, and its line in `integrity.json` stays until a new answer to its question is published. While a violation has not lapsed, a new answer that would turn it into a pass is refused until you forget the entry, whether that answer comes from a narrower trial or another version of the checker, or was made by hand. Once you forget it, a new answer can replace it. A superseded answer that holds a counterexample, which verify flags `answer superseded`, stays until you forget it, and the next publication in the dossier, which ends any trial there whose answer is not refused, then removes it. Forget deletes no entry by itself, and it refuses an entry that is still there and holds no counterexample.
- **Decide refuses on a broken record.** Ordinary decisions stop on tripwires. Begin and retire can bypass ordinary analysis findings, but cannot bypass damaged or incomplete publication authority. Forget can address `answer removed` for the entry it names. Inspect a pending decision with `dossier recover <dossier> decisions --dry-run`. Only an explicit confirmation of its exact suffix digest can publish it.
