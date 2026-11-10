# Independent review

A review assesses a dossier's claims, their evidence and the explanation that connects them. It can confirm a defect, challenge an interpretation or name work that is missing. It changes no claim, records no owner's decision and grants no solver evidence.

`dossier verify` checks a review's form, works out its basis as the dossier now stands and combines the assessments in effect. It does not do the reviewer's reading.

## Scope and binding

Work in a fresh context, without the keeper's conversation. The subject is one behavior or the whole dossier. A behavior review follows that behavior's claims through everything they depend on. A dossier review also examines what the collection explains and leaves out, the formal abstraction, and the work no behavior is associated with. A review of one behavior never stands in for a dossier review.

Write one new file under `reviews/`, such as `reviews/2026-11-09-capacity-review.md`. It begins at byte zero with a fenced `json` object, whose format is named in [record formats](artifacts.md#record-formats). The findings and their explanations follow in Markdown. A header that is only a short hash, or another version of the format, is invalid.

| Field | Required value |
| --- | --- |
| `format` | The review identifier in [record formats](artifacts.md#record-formats) |
| `subject` | Object with `kind`, `dossier` and `behaviors` |
| `subject.kind` | `"behavior"` or `"dossier"` |
| `subject.dossier` | The dossier's path under the root, `parts/<id>` or `compositions/<id>` |
| `subject.behaviors` | Array of behavior ids: exactly one for a behavior review, and every behavior in the collection's order for a dossier review |
| `basis` | Array of `{ "role": "required" or "additional", "root": "dossiers" or "knowledge", "path": "...", "sha256": "..." }` entries, one for each file the review binds. The entry for each of the subject's behavior files also has `claims` and `explanation`, as described below |
| `coverage` | Object with `examined` and `unexamined` arrays |
| `coverage.examined` | The review item keys you completed, each once |
| `coverage.unexamined` | A `{ "item": "...", "reason": "..." }` object, once, for each item not examined or not applicable |
| `replaces` | Array of the earlier assessments this review replaces, as defined below. Empty for a first review |
| `assessments` | Array of `{ "mapping": "<behavior>/C<n>/M<n>", "result": "...", "rationale": "...", "limitations": [] }` objects |

Every field is required, and an unknown field is invalid. Ids, paths, rationales and reasons are nonempty strings. `limitations` is an array of nonempty strings and may be empty. Every mapping in the subject's behaviors, as they stand, has exactly one assessment. A mapping you did not examine gets `inconclusive`, with the missing work named. Claim and mapping ids follow [the behavior contract](behaviors.md).

A behavior id, a basis root and path, an item key or a mapping's assessment that appears twice is invalid. No item is both examined and unexamined.

Each `basis.path` is relative to the root it names and stays inside it. An absolute path, a path with a `..` segment or a symbolic link that leaves the root is invalid. `dossier.json` configures the `knowledge` root, and without it a knowledge entry in the basis is invalid. A digest is the lowercase, 64-character SHA-256 of the file's whole UTF-8 bytes, with no newline normalized.

The required basis is every file the subject depends on that the tool can work out. It holds the subject's behavior files in full and, for a dossier review, the collection's README. It also holds the current authored inputs, published answers, readings, manifests, decisions and resolved knowledge files that the subject's mappings use, the actors file, and for a composition the scenarios file. The subject's own formal inputs stay required even when a review of one behavior of a composition maps only to a member. It holds no other knowledge file. A new record that makes a reference ambiguous leaves the reference unresolved, which the basis worked out again reports and which makes the review stale. A new owner of a closure edge in another module opens the composition's closure, which verify reports, rather than staling the review. `dossier.json` resolves nothing a judgment rests on and is not in the basis. You cannot shorten the required basis.

A dossier review binds all of the dossier's formal claims, scenarios and walks, the ones no behavior is associated with included. A behavior review binds what its claims depend on in the prose and the knowledge base. Tool binaries and local bundles are never basis files. An answer's entry keeps the identity of what its trial executed.

Run `dossier review-basis <dossier> --json`, with `--behavior <id>` for a review of one behavior. It prints `subject`, `basis`, `coverageItems` and `issues`, and writes nothing. Resolve the issues it reports before relying on the basis. The list is no assessment, and it does not establish that any file was read.

Every file of the required basis appears in `basis` with `role: "required"`. You may add source or knowledge files you read for your judgment, with `role: "additional"`, under the same rules for root, path and digest. Bind only files that another clone can have again byte for byte: the files version control keeps, and source checked out at a fixed commit, which a fetch recreates exactly. A checkout of a branch moves when it is fetched again, so a review that binds it reads as stale there. Findings cite the paths the basis declares, and name a source left unbound by its repository, commit and path. An additional file stays bound even where the tool cannot tell why it matters. The required basis does not establish that you found everything your judgment depends on.

The entry for each of the subject's behavior files also binds its parts. `claims` maps the id of each of the behavior's claims to the claim's digest, and `explanation` is the digest of the rest of the file. A claim's digest is the SHA-256 of its JSON value written with every object's keys in sorted order and no whitespace. The explanation's digest is the SHA-256 of the behavior's JSON object without `claims`, written the same way, followed by a newline and the Markdown after the block, byte for byte. `dossier review-basis` prints both, and you copy them unchanged. Any other entry that has either field is invalid. Where the behavior file is as the entry binds it, its parts must match the entry, and every mapping of each claim must have its one assessment. Otherwise the review is invalid.

Verify works out the required basis again. Every file in it must appear among the entries whose role is `required`. Verify also checks the digest of every declared file, the `additional` ones included. A `required` entry the tool no longer requires binds as an additional one does, so a change in what the tool requires stales no review by itself. A ledger or the index binds nothing, since every render rewrites them, and neither does `dossier.json`, on which no judgment rests. An additional file cannot stand in for a required entry that is missing.

A required file the basis lacks, a declared file that is missing, a reference that does not resolve or a digest that does not match makes the review stale. So an answer that newly decides, or a changed list of behaviors, can make a review stale while every file it read is still there. A change to an additional file can do the same. A dependency of the judgment that you left out is a defect of the review even when these checks pass.

A subject's behavior file is the exception, since verify compares its parts. An assessment of a claim whose digest changed, or that is gone, is no longer in effect, and the review's other assessments stay in effect. A claim added since the review has no assessment from it. A change to the explanation alone leaves every assessment in effect. Once any part of a subject's behavior has changed, the review no longer clears the review the dossier owes, since what it examined is no longer the behavior as it stands. None of these changes lapses a solver's answer. A changed claim that maps a target the review did not bind makes the review stale through its required basis. A review never lists itself in its basis. The basis records what was examined. It approves nothing and authenticates no one. A later review keeps the earlier findings, and cites them when it corrects or retracts one.

## Correcting an assessment

`replaces` is always present, and empty in a first review. Each item has exactly `review`, `sha256`, `mappings` and `reason`.

| Field | Required value |
| --- | --- |
| `review` | The earlier review's path within this dossier, under `reviews/`, with no symbolic link and no `..` segment |
| `sha256` | The full lowercase digest of that review's bytes |
| `mappings` | A nonempty list of qualified mapping ids, each once |
| `reason` | An account of the correction, not empty |

Every mapping named is assessed in both reviews, and both are of the same dossier. Both must be well-formed and current before a replacement counts. Both must bind the mapping's claim with the same digest, which establishes that the claim and its mappings are unchanged without fetching any earlier text. When the claim changed, assess it as it now stands. The earlier assessment is then out of effect, not replaced.

A replacement is in effect while the replacing review and its assessment of the mapping stay well-formed and current. It takes only the named earlier assessments out of the ones verify combines, and it keeps the earlier review, its findings and the basis it had. A correction may change the result or make it `inconclusive`, and its findings explain the mistake. A retraction written only in the Markdown changes no assessment.

A replacement whose earlier path does not resolve, whose digest does not match, or that names itself or closes a cycle is invalid and suppresses nothing. Two current replacements that disagree leave the mapping contested, and neither the order of the files nor a date gives one precedence. A replacing review that becomes stale or is removed no longer suppresses an earlier review that is otherwise current. A replacement changes a reviewer's interpretation. It changes no owner's decision and no outcome a checker recorded.

## Coverage and mapping assessments

For each behavior of the subject, account for these item keys, with its id in place of `<id>`:

| Item key | Examination |
| --- | --- |
| `behavior:<id>:claims` | Every claim is one statement that can be judged, of the right kind, with its assumptions stated |
| `behavior:<id>:scope` | The actors, the reach, the source or deployment pins and where the claim applies match what it asserts |
| `behavior:<id>:mappings` | Every mapping joins this claim to this target and keeps the evidence at the strength recorded |
| `behavior:<id>:explanation` | The account in words agrees with the claims, their support and their limits |

A dossier review also accounts for `collection:orientation` and `collection:coverage`. The first asks whether a fresh reader can follow what the system is for, its actors, its usual flow and its boundaries. The second examines what the collection says it explains and the work no behavior is associated with, including paths and entry points that were left out. A list of every modeled transition does not establish that all the source's behavior is explained.

The formal examination below supplies the item keys `formal:1` to `formal:20`, and every review accounts for all twenty. The examined and unexamined keys together must equal the keys the subject requires: its behavior keys, the twenty formal keys and, for a dossier review only, the two collection keys. An unknown key, or a key for another behavior, is invalid.

A review of one behavior marks the items that do not concern it unexamined, with a reason that says they do not apply. For each examined item, the findings name what was read and what came of it, a supported finding that nothing was wrong included. `coverage` records that an item was examined, not that it passed, and filling in the keys does not replace the explanations. A current dossier review clears the review a dossier owes only when it leaves no item unexamined, no part of a subject's behavior has changed since, and the assessments in effect are conclusive and uncontested. An item examined for whether it applies may report that it does not. A partial review is a valid account of the work done, and what it left unexamined is still owed. An assessment of `contradicted` or `too-broad` is a finished judgment, and nothing requires that it be made positive.

Each `result` under `assessments` says how one claim and one target are connected:

| Result | Meaning |
| --- | --- |
| `supported` | The target justifies the claim within its declared scope and assumptions, at the strength of the evidence, for the relation the mapping declares |
| `too-broad` | The target establishes a narrower statement, or a smaller scope, than the claim |
| `contradicted` | The target and the claim conflict within the scope they share |
| `inconclusive` | The evidence at hand, or the review, does not settle the connection. Say what is missing |

For `illustrates`, `supported` means the target is a faithful example, and it does not establish the general claim. For `challenges`, it means the target supports the challenge as stated, and it does not make a refuted requirement pass. An assessment cannot widen a bounded result, turn a result about the model into a claim about the source, or turn one execution into a guarantee for all of them. An unresolved assumption, and a dependency that matters and was not examined, stay limitations even when another mapping is supported.

No behavior and no claim carries an authored `verified` flag. Whatever reads a review keeps the kind of evidence and its reach, where it applies, its freshness, the mapping's assessments and the owner's exact decisions apart. Below, the word `verified` describes the support for a review finding's statement.

## Formal examination

For each item that applies, say what you looked at and what you found, with file and line. Where the kind of evidence an item asks for does not exist, report that as a limit. Do not produce it with a new trial, and do not weaken a claim.

### The standing against its files

1. `dossier verify` says ok, or it says what is wrong. Either way, re-read two entries in `evidence/` at random: do their call, answer and basis agree with what `dossier verify --json` shows for the passages or cells they cover? Where the toolchain is available, run `dossier recheck` on one dossier and say whether its answers came back the same.
2. For every passage marked `checked` or `proved`, name the entry whose answer decides it and the trial that established that answer, and say why the answer would have come back otherwise had the passage been false. Where the mechanical rule is thin (a State covered because an action fired once, a refusal covered by absence), say so.
3. For every passage marked `text`: could it have been checked? A words-only passage that hides a claim is a finding.

### Properties against passages

4. Read every A, O and N definition in the model beside its passage, clause by clause. A property that says less than its passage, or something else, is a finding whether or not its answer held. In a composition, read the generated module's translation of each property.
5. For every A, O and N, read its blunder: what was changed, and would a property that says nothing have caught it too? A blunder any property catches proves nothing about this one. A property with no blunder is held; say whether the obvious blunder would catch it.
6. Every Given cites an actor or says why not. Does it restrain that actor in a way the owners can be held to, or does it assume the conclusion? Is `prompt` warranted? Is `on` scoped to the right event? Is an `only when` condition what the owners can be held to?

### Guarantees and the knowledge base

7. For every K passage marked backed, open the rule the backing names. Does the rule as written support the claim as worded? A backed guarantee whose rule proves something narrower is a finding.
8. For every K passage marked assumed, say which marks rest on it and what would change if it were false.
9. Pins: do the pinned records describe the instance the prose abstracts, at a checkpoint that is still the deployed one?

### Wiring and scenarios

10. Closure: for each asset the composition's properties speak of, read the knowledge base's edges yourself and confirm every owner of a relevant edge is a member. A closure rule that lists too few edge kinds is a finding.
11. Wiring: does every effect wired to an event carry the fields the event needs, and is every internal event wired from exactly the effect the prose names? A step that happens in the composition and could not happen in a transaction is a finding. Read the `free:` list in `wiring.md` and the `left free` flags `dossier verify` prints: is each free send a defensible abstraction for the concern?
12. Scenarios: for every column, does the mode assignment mean what the property's reader will take it to mean? A scenario called `governance-captured` that leaves a second governance actor honest is a finding if the real capture would take both. Ask the same of every window and every start. A window counts ticks from 0 and ends before `until`, so a scenario called `lanes-down-two` whose window is `until: 1` is a finding. A start that leaves a datum at its boundary value where the situation it names would not, such as `oracle.state: Stale` with `stale` still 0, is a finding.

### Traces and readings

13. Retell at least one witness, one violated cell and one blunder trace yourself, from the trace in its entry, before reading the answer's reading, which the agent that kept the dossier wrote. `dossier show <dossier> <entry>` prints an entry's trace as a table. Compare. A retelling that skips a step or names the wrong action is a finding.
14. Every miscalled answer has a classification, the current one in its reading and a replaced one in its entry's `previous`. Check it against the procedure in [models](models.md#classifying-a-miscall): was a `call was wrong` really that, or a prose fault dressed down?
15. Every accepted risk: read the decision's words, and the trace in the entry whose answer the trial it names established. The ledger links each trial id to that entry, and `dossier verify --json` lists every entry with its trial. Does the acceptance speak to the path the trace shows, and is that answer's scenario the one the words describe? A cell whose acceptance lapsed waits for the owner, and its old words cover nothing.

### Reach and the ground

16. Compare each answer's reach with the ranges the boundary gives. A reach narrower than the data allows is a finding unless the call says why it suffices. `narrowed` and `reworded` flags help.
17. Look for the forbidden move in history, in each entry's `previous` and `narrowed` and in version control: a property whose definition changed between two answers where the earlier one miscalled; a guard loosened while its Move stayed; a Given added to make a cell pass; a scenario softened.

### The prose itself

18. Unsaid pairs, gaps, doubts open or closed, seams owed, closure open: each is a decision the owners have not made or a member that does not exist yet. List them.
19. Walks: do they cover the paths the prose makes possible, including the refused steps and the final states? A path no walk takes is a finding.
20. A Within or Once with a Given that no answer exercises is a promise with no evidence behind it.

## Findings and status

**REVIEW-STATUS.** A status describes the support for the finding's statement. It does not describe whether the composition or property passes. Write the statement explicitly, cite the artifacts, and use one of these statuses:

| Status | Meaning |
| --- | --- |
| `verified` | The cited evidence establishes the finding as worded, within its stated scope. This includes confirmed defects, limits and successful checks. |
| `not verified` | The finding is a concern or claim that the available evidence does not establish. Name the missing evidence or unresolved interpretation. |
| `retracted` | Further examination contradicts an earlier finding. Preserve its statement and explain the correction with evidence. |

For example, “the bounded answer is being described as a proof” is `verified` when the answer records bounded execution and the report claims proof. “The deployed executor always meets this assumption” is `not verified` without evidence about that executor. An accepted violation can be the subject of a verified finding, and its cell remains `violated`.

Order findings by importance. Each must name the affected passages, cells or trials, its precise statement, file and line references, status, scope, and any missing evidence. Do not turn an unverified concern into an owner decision. A retraction is interpretation history, not a deletion of solver evidence.
