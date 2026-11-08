# Files

The layout of a dossiers root and the format of each file. "Tool-written" files change only through the `dossier` command, never by hand. The [storage contract](../../spec/storage.md) defines which records are authoritative and how they are published.

## Layout

```
dossiers/
  dossier.json            setup: storage format, plugin version, knowledge, runners
  README.md               what the area holds
  .gitignore              setup: keeps index.md, each dossier's trials/ and .running/, _scratch/ and node_modules/ out of git
  index.md                render: a view of parts by compositions, kept out of git
  package.json            the chart's libraries
  actors/
    actors.md             the actors and their modes
    scenarios.md          the scenarios
  parts/<id>/
    prose.md              the abstraction
    margin.md             working notes: intake lines, the import's draft list
    doubts.md             passages read two ways, as two walks
    decisions.log         decide: owner words; only the committed prefix applies
    integrity.json        publication/recovery: the digest of each entry in evidence/ and the decisions' prefix
    ledger.md             render: a view of the dossier's marks and answers
    chart/                tool-written by draw: machine.json, grid.md
    chart/blunders/       mutated machines for chart blunders
    model/                <Id>.tla, its .cfg files, <Id>.als, blunders/
    model/*.scaffold.tla  tool-written by scaffold: a fresh scaffold beside a refined module
    calls/                calls waiting to run
    evidence/<name>.json  trial: one question's entry, which holds its current answer
    evidence/<name>.md    the agent's reading of that answer
    trials/<id>/          trial: a trial's bundle, local and kept out of git
    reviews/              second reads
  compositions/<id>/
    wiring.md             members, wiring, free sends, closure, default scenarios
    prose.md              the properties
    model/generated/      scaffold: <Concern>.tla, one .cfg per cell and one per walk
    model/extras.tla      appended to the generated module
    model/blunders/       mutated copies of the generated module
    calls/  evidence/  trials/  integrity.json  decisions.log  ledger.md  doubts.md  margin.md  reviews/
  _scratch/               local workspace, kept out of git
  .explorer/              dossier explore --install: the explorer's built page and its stamp; it ignores itself
```

A project whose dossiers root is not `dossiers/` at its top keeps a `.dossier-root` file there instead, one line with the root's path relative to it. Setup writes it, and the `dossier` command reads it.

A dossier's id names its folder. It is lower case letters, digits and hyphens, starts with a letter, does not end with a hyphen, and has no two hyphens in a row, such as `timelock` or `price-feed`. TLA+ names write its hyphens as underscores.

A dossier's module is named from its id, with each hyphenated segment capitalized and the segments joined: a part's `<Id>`, such as `Timelock`, or `PasFiniteKey` for `pas-finite-key`, and a composition's `<Concern>`, such as `Control`, or `PriceFeed` for `price-feed`. Scaffold materializes a composition's generated module and configurations. Verify computes their expected identities in memory, and trial prepares generated inputs in a private copy. Neither rewrites `model/generated/`.

Transient paths may also appear. A trial runs in `.running/<id>/` within its dossier, and an interrupted publication leaves its candidate entry there, with the list of the entries it drops in `.running/<id>.dropped.json`. Begin and import build a new dossier in a hidden `.initializing-<id>-<uuid>` sibling under `parts/` or `compositions/`. Publication locks and atomic replacement temporary files appear while a command writes. None of them carries evidence or owner authority. Use the [recovery commands](commands.md#storage-and-recovery) for an interrupted publication, and never rename a private candidate into place by hand.

## dossier.json

```json
{
  "storage": "integrity-v1",
  "plugin": "0.1.1",
  "setup": "2026-11-03",
  "updated": "2026-11-03",
  "knowledge": { "root": "../records" },
  "external": {
    "replay": { "command": ["node", "tools/replay.mjs"], "cwd": ".." }
  }
}
```

`knowledge.root` and each runner's `cwd` are relative to the dossiers root, except a knowledge base outside the repository, which [setup](commands.md#the-command) stores as an absolute path. Setup updates the marker under the root publication lock, keeping its knowledge settings, runners and other metadata. It refuses a malformed marker.

`storage` is independent of `plugin`, and its one value is `integrity-v1`. A marker that names no storage or another one grants no authority, and [Publication and integrity](../../spec/storage.md#format-and-authority) says how verify and each command treat it. Setup adds `storage: integrity-v1` to a marker that names none while no dossier exists under the root, and refuses it once dossiers exist.

## integrity.json

Every visible part or composition has a tool-written manifest with `schema: 1`, `evidence` and `decisionHead`. `evidence` maps the name of each [entry](#evidence), its file name in `evidence/` without `.json`, to the SHA-256 digest of the entry's bytes. `decisionHead` is `null` before any decision, or `{ algorithm: sha256-prefix, bytes, digest }`, which binds the exact committed UTF-8 prefix of `decisions.log`. `dossier decide <id> begin` writes an empty manifest into a folder of hand-drafted inputs that holds no decisions or entries yet.

A reading is not bound, and `.DS_Store` is ignored. A symbolic link or a special file in `evidence/` is refused. When the owner forgets an answer whose entry was removed, its line stays until a new answer to its question replaces it. The manifest stores no marks or routes. Its precise schema, prefix algorithm and recovery rules are in [Publication and integrity](../../spec/storage.md#format-and-authority).

## actors/actors.md and actors/scenarios.md

YAML blocks in Markdown.

```yaml
actors:
  - id: governance
    name: Governance
    kind: governance            # governance | multisig | keeper | user | public | chain | market | external
    modes: [honest, malicious, offline]
    pins: [timelock#actor:governance]     # optional: the records that fix who the actor is
```

An actor is a source of events in the surroundings that fails as a unit. `public` stands for anyone at all. `market` stands for prices, rates and liquidity. `external` stands for a contract or protocol with no dossier here. A contract that has a dossier is a part, never an actor. `name` defaults to the id, `kind` to `public`, and `modes` to all three. An id declared twice is `malformed actors`.

Of the kinds, only `chain` means anything to the tool. A tick, one block passing, is an event whose sender is an actor of kind `chain`. The tool goes by the event's name, `tick`, only when no actors file resolves the sender.

`pins` names records in the knowledge base that fix who the actor is, such as a multisig's signer set. Their hashes enter the snapshot of every answer in a composition the actor sends events into. A change to a pinned record lapses the cells that rest on the actor, as a change to a member's pinned record does. A pin that does not resolve in the knowledge base is flagged `pin unresolved`.

```yaml
scenarios:
  - id: governance-captured
    modes: { governance: malicious }
    stronger_than: [all-honest]
  - id: lanes-down-two
    modes:
      lane-a: { mode: offline, from: 0, until: 2 }
      lane-b: { mode: offline, from: 0, until: 2 }
    notes: both lanes down for the first two blocks
  - id: stale-start
    start: { oracle.state: Stale, oracle.stale: 3 }
    notes: the price is already three blocks stale when the lanes are live
```

These are three of Harbor's scenarios. `all-honest` always exists. Actors a scenario leaves out are honest. A scenario id declared twice is `malformed actors`.

`notes` on an actor or a scenario is free text for readers, and the tool reads nothing from it. An answer's snapshot hashes a scenario only by the modes, windows and start it gives, so an edit to its `notes` or its `stronger_than` lapses nothing.

A mode is a string, or a map that gives it a window: `mode`, an optional `from` and an optional `until`. `from` is the tick the mode starts at, and defaults to 0. `until` is the tick the mode ends before. Without `until`, the mode holds for the rest of the run. The actor is in the mode while `from <= clock < until` and honest otherwise. `clock` counts the ticks taken, starting at 0. `lanes-down-two` takes both lanes offline for the first two blocks and leaves them honest after that. Both bounds are whole numbers of ticks. A window's mode is `malicious` or `offline`. A window whose `until` is not above its `from`, that has no `mode`, or whose mode is `honest` is `malformed actors`. A window on the chain's offline mode cannot end, since the clock counts the chain's ticks, so it names the tick the chain stops at and `until` is an error there. A window in a composition where no member takes the chain's tick is `wiring does not compose`, since the clock that opens and closes it would never move.

`start` names the values a cell under the scenario begins from. A key is `<part>.<datum>` or `<part>.state`. A value is a number for a count or an amount, `true` or `false` for a flag, one of a choice's values, or a state's name for `<part>.state`. Everything the start leaves out begins from the boundary's starting values. A key that names no part, a datum the part does not hold, or a value outside the datum's range is `malformed actors`. Each composition checks the start of every scenario in `scenarios.md` against its members, whether or not a property claims the scenario. A composition ignores an entry for a part that is not one of its members.

A scenario is stronger than another only when every actor's mode in it is the same or malicious. When either scenario gives an actor a window, both must give that actor the same mode in the same window, unless the stronger one has the actor malicious for the whole run, which allows every behavior. The two must also have the same start, since a run from one start says nothing about a run from another. A declared `stronger_than` that the modes or the starts do not support is the tripwire `stronger_than unsound`.

## wiring.md

A YAML block in Markdown. Harbor's Control:

```yaml
members:
  - part: timelock
    role: member
    pins: [timelock#observation:delay-check-2026-11-01]
  - part: vault
    role: member
  - part: breaker
    role: member
  - part: adapter
    role: member
wiring:
  - effect: timelock.change
    event: vault.change
  - effect: breaker.halt
    event: adapter.halt
free: [vault.move, vault.release]
closure: []
scenarios: [all-honest, governance-captured, executor-offline]
```

| Key | Holds |
| --- | --- |
| `members` | each member's `part` id, its `role`, and optional `pins`, the records that fix its instance |
| `wiring` | one member's effect delivered as another member's event in the same step, as `effect: <part>.<effect>` and `event: <part>.<event>` |
| `free` | the sends of members that this concern leaves unwired, each `<part>.<event>` |
| `closure` | rules that name the modules a property about an asset needs as members |
| `scenarios` | the scenarios a property claims when it names none |

A role is `member` or `surroundings`. A `surroundings` member is composed exactly like a `member`, and the role only tells readers that the part is there as context for the concern. A member listed twice is `malformed wiring`.

An event a member sends that no wiring reaches is a free action. Verify flags it `left free` until it is listed under `free:`. Each entry is `<part>.<event>`, names an event a member receives and a member sends, and is not wired, or the wiring is malformed. Control declares the Adapter's sends to the Vault free, because the Supply composition wires them.

A closure rule names an asset and the kinds of edge whose owners must be members, as in Harbor's Supply:

```yaml
closure:
  - asset: hrd
    edges: [mints_asset, burns_asset, accounts_for_asset]
```

Verify reads the edges from the knowledge base. A rule can also list `modules:`, which must be members whatever the knowledge base holds. When `scenarios:` is empty, a property that names no scenarios claims `all-honest`.

## Calls

A call is a file under `calls/`, written before the trial by hand or with `dossier call`, or for a blunder with `dossier blunder`. The runner accepts either. It captures the call as `call.md` in the trial's bundle, and the entry keeps its prediction. Publication deletes the pending call when it writes the answer, or keeps the entry after a completed trial, and only if the call still has those exact bytes. A refused answer, and an aborted trial whose answer is not written, leave the call pending, and recovery preserves it.

| Key | Holds |
| --- | --- |
| `kind` | `chart`, `blunder`, `tlc`, `apalache`, `alloy` or `external` |
| `executes` | the files to run, one `- path` per line, relative to the dossier and inside it |
| `reach` | how far the trial looks, in words |
| `expect` | one line per enabled property, such as `A1: holds`, or for the chart `checks: pass` or `checks: fail <ids>` |
| `because` | why, as an indented block |
| `property`, `scenario` | the cell, for a composition trial or a composition blunder |
| `walk`, `scenario` | the walk and its own scenario, `all-honest` when it names none, for a composition witness, in place of `property` |
| `mode`, `length`, `inv`, `init`, `cinit` | for Apalache: `bounded` with a length, or `inductive` |
| `blunder`, `base` | for a blunder: the wrong in words, and the module it copies, which the call must name when `model/` holds more than one module |
| `trace-data` | for a witness: the variables its expected trace shows, each one a variable of the module |
| `runner` | for an external trial |

Outcomes under `expect` are `holds`, `violated`, `violated; trace: <state> > <state>`, `counterexample`, `no counterexample`, `instance`, `no instance`, `pass` and `fail`.

A composition's TLC call executes `model/generated/<Concern>.tla` and its own configuration: `<Property>_<scenario>.cfg` for a cell, or `W<n>_<scenario>.cfg` for a walk, under `model/generated/`, with the scenario's hyphens as underscores. A composition's Apalache call names `cinit: ConstInit_<scenario>` in the same way. A cell is never marked from another scenario's configuration.

## Evidence

A call asks a question: its kind, the files it executes other than `prose.md`, the passages it expects outcomes for, its scenario and its walk. The reach does not belong to the question. It belongs to the answer, so a trial that looks further answers the same question again. A dossier keeps at most one entry per question, `evidence/<name>.json`, which only the runner writes. The name joins the kind, up to six of the passages the question names (its property, the passages it expects outcomes for, its walk), and its scenario with hyphens, and ends with the first six hex digits of the question's SHA-256, such as `tlc-O1-3fa2c1` or `tlc-N1-executor-offline-9b1e04`.

| Field | Holds |
| --- | --- |
| `question` | the kind, the executed files, the expected passages, the scenario and the walk |
| `call` | the prediction: the call as written, the reach, the expectations and the reason the call gave |
| `answer` | the observation: the verdict, `as-called`, `miscalled` or `aborted`, the outcome per passage, the reach, and everything else the runner parsed from the checker's output, such as the actions that fired, a chart's checks and gaps, Apalache's mode and the outcome of each invocation, and the trace of a violation or a witness |
| `basis` | what the answer rested on: its snapshot, the hashes of the files it executed and its input identity, which lapse compares with the present |
| `established` | the trial that first gave this answer on this basis, its time, the plugin and checker versions, and the digest of its bundle |
| `previous` | the last answer to the question whose verdict or outcomes differed from the current one, with its basis, its establishing trial, its trace and its reading's classification, or `null` |
| `narrowed` | the reach of a replaced answer that looked further than the current one, or `null` |
| `replaced` | the trial whose answer this one replaced, and what had moved under that answer, empty when the basis had not, or `null`, which says why an owner's acceptance lapsed |

The answer leaves out what only the trial's bundle needs: the command line, the working directory, the exit status, the timing and the paths of Alloy's instance files.

`evidence/<name>.md` is the reading, the agent's account of the current answer, such as a counterexample retold. A miscall's reading adds a `classification:` line to its retelling. The tools read only that line, and a reading never changes a mark. When a new answer replaces the entry, the old answer's reading is removed. If the old answer becomes `previous`, its classification, if it has one, moves with it.

When a trial ends, its publication compares its answer with the question's entry. Two answers are the same when their verdicts, outcomes and reach are equal. A different trace, state count or time does not make them differ.

- **The same answer keeps the entry.** While the recorded answer has not lapsed, a trial that gives it again leaves the entry and its reading as they are.
- **Otherwise the answer is written,** as the question's first entry or in place of the answer the entry holds, unless one of the next two rules refuses it or the trial aborted. When the verdict or outcomes differ, the replaced answer becomes `previous`. When the replaced answer looked further, its reach is kept as `narrowed` until an answer looks as far again.
- **A violation needs the owner's `forget`.** While the recorded answer has not lapsed, an answer that turns an outcome showing a counterexample or a failed check, `violated`, `counterexample` or `fail`, into any other outcome is refused, unless the owner's `forget` names the entry. A smaller reach, a changed toolchain and an answer made by hand all meet this rule. Once the recorded answer has lapsed, no decision is needed, since the change that lapsed it says why.
- **A miscall needs a classification.** A miscalled answer is replaced only once its reading carries a `classification:` line.
- **An abort never replaces an answer.** An aborted trial's answer is written only for a question with no entry, and an aborted answer never becomes `previous`. It covers nothing and is flagged `unrun` until a completed answer replaces it.
- **A gone question is removed.** A question is gone when its property, a passage it expects an outcome for, its walk, its scenario or an authored file it executes no longer exists. A generated view under `chart/` or `model/generated/` does not count. The next publication in its dossier that is not refused removes its entry, its reading and its manifest line. Until then verify flags it `question gone`, and it covers nothing.
- **A superseded answer is removed.** An answer is superseded when the answers that decide stand in its place: each passage it touched, each target of a blunder, and the cell or walk it answered, has a completed answer to another question, and verify concludes the same without it, the same marks, cells, walks, backing, tripwires, flags and next step. The answer that does not decide goes, and among equals the earlier one, so a check that a proof stands in for goes, whether it ran before the proof or after. The publication that supersedes it removes its entry, its reading and its manifest line, and so does the next publication after a change that supersedes one. Until then verify flags it `answer superseded`. An answer that holds a counterexample, in its outcomes or in `previous`, waits for the owner's `forget` instead.

Publication runs under the dossier's publication lock. To write an entry, it writes a candidate first, `.running/<id>/entry.json`, binds the candidate's digest in `integrity.json`, removes the reading of the answer it replaces, and renames the candidate onto `evidence/<name>.json`. A candidate grants no evidence until it is in place under its binding. A publication that is not refused also drops the entries of gone questions and superseded answers. Before the binding, it lists their names beside the bundle in `.running/<id>.dropped.json`, so that a recovery deletes exactly those files whatever has changed since. Their manifest lines go with the binding, their entries and readings after the rename, and the list after that. Last, the publication moves the trial's bundle to `trials/<id>/`. One that keeps the entry takes the same steps without a candidate, so it writes nothing when it drops nothing. One the rules refuse only moves the bundle. Either says why.

## Trial bundles

A trial's id is `<date>-<hhmm>-<kind>-<hash>`, with the date and time in UTC. A trial runs in `.running/<id>/` and leaves its bundle in `trials/<id>/`. The `.gitignore` that setup writes keeps both out of git, and [the limits of a mark](../explanation/limits.md) say what a clone holds without them. No bundle belongs to the record. Verify never reads `trials/`, and deleting a bundle changes no conclusion. The receipt lets the runner, and the agent on the machine that ran the trial, check the bundle's own files.

| File | Holds |
| --- | --- |
| `call.md` | the call as captured |
| `output.txt` | the checker's output, with machine paths, and the paths their symlinks resolve to, written as `$TRIAL`, `$DOSSIERS`, `$JAVA` and the like |
| `result.json` | the answer, with what the entry keeps beside it and what only the bundle keeps: the command line, the working directory, the exit status and the timing |
| `receipt.json` | the hashes the runner writes at execution, so that an edited bundle shows on the machine that holds it |
| `blunder.diff` | for a blunder: the wrong, as a diff against its base |
| `alloy/` | for an Alloy trial: the Analyzer's receipt and instances |

A call the runner refuses before execution leaves no bundle. Checker output over 512 KiB goes whole to the folder `DOSSIER_EVIDENCE_STORE` names, as `<sha256>.txt`, and `output.txt` says so. Without that variable, `output.txt` keeps the first 512 KiB and gives the whole output's size and SHA-256. The receipt says which.

The input identity that `result.json` records, and the entry keeps in its basis:

| Field | Meaning |
| --- | --- |
| `strategy` | `private-copy`: planning and execution use the same captured inputs. |
| `files` | SHA-256 hashes keyed by dossier-relative paths for declared files and reachable local imports supported by the runner. |
| `shared` | String names of recognized shared model libraries, such as `tla:Naturals`. These are not frozen local copies. |
| `limitation` | The execution boundary recorded with the answer. Toolchains, shared libraries, chart runtime and external runner commands, root and working directory remain outside the private copy. |

External runners must use the supplied file map for declared inputs. The descriptor identifies captured bytes. It does not claim a fully isolated execution or independently prove honest checker behavior. An entry whose basis lacks an input identity, or whose identity disagrees with the files it executed, trips `input identity malformed`. The [execution identity contract](../../spec/models.md#execution-identity) defines supported import forms and exclusions.

## Ledgers and the index

A ledger's first line names its dossier and gives the time the view last changed, the prose hash, `answers <n>`, counting each entry verify can read, and `decisions <n>`. A part's `ledger.md` then holds a table of passages with each passage's words, the owner's column, the mark, the answers behind it and the reach, then the guarantees with their backing, the compositions that use it, the summary, the flags, the next step, and what moved when the file last changed.

A composition's `ledger.md` holds the table of its members, then a line for each of these that has content:

- `Wiring:` the effects wired to events
- `Free:` the sends of members that no wiring reaches, by sender
- `Outside:` the sends into members from parts that are not members
- `Closure open:` the modules the closure requires that are not members

Then come the matrix, with each property's sentence beside its id and without the Scenarios sentence its columns show, one line per tried cell with the members it rests on, the walks table with the columns walk, scenario, mark and trial, and the same closing lines as a part's ledger.

A ledger links each trial id it names to the entry under `evidence/` that holds the answer that trial established. Its summary line, like verify's, prints only the counts above zero.

Each ends with a machine form in a fenced JSON block. `rebuilt` is the time the view last changed. Its `answers` lists one row for each entry verify can read. A row gives the entry's name, the trial that established its answer and when, the question's kind, checker, property and scenario, the verdict, whether the answer completed or the entry is void, the tripwires the entry trips, the reading's classification and the prose hash the trial found, and is marked `gone` or `superseded` when the entry is. `dossier verify --json` lists the same rows. `dossier render` writes a view only when its content moved, and verify writes nothing. The ledgers and the index are views. Nothing reads them as a record, and deleting or editing one changes no conclusion. The earlier ledger feeds only its `Since last rebuild:` line, which says what moved since that ledger was written. The index changes whenever any dossier does, so the `.gitignore` that setup writes keeps it out of git, and `dossier render` rebuilds it where it is needed.

## decisions.log

One line per decision, such as this risk accepted on a cell of Harbor's Control. Its time and its trial id change with every rebuild of Harbor, so they appear here as placeholders:

```
<time> risk N1@674ccf7e executor-offline <trial> "an offline executor is the very thing N1 is conditioned on; governance re-plans" 00000000
```

The time, the verb, its arguments with passages at their hashes, the owner's words, and the first eight hex of the previous line's hash. A risk also names the trial that established the cell's deciding answer, the violation the owner accepted. A forget names an entry as `<name>@<digest>`, with the first eight hex of the digest `integrity.json` binds for it. The first line chains to `00000000`. Only the prefix that `integrity.json` binds counts. An appended suffix grants nothing until publication or explicit recovery commits it.

A doubt's answer targets `D<n>@<hash>`, binding the authored alternatives at the time of the decision. It does not rewrite `doubts.md`. A part's tier comes from `Tier:` in its prose, and a begin line does not set it.

## doubts.md

```
## D1
on: M3
assumed: a
Whether a stale price older than three blocks is still a price at all.
Walk a: from Stale, tick, tick, tick, post-a; ends Fresh with stale 0.
Walk b: from Stale, tick, tick, tick; ends Stale and the price is void until a post.
```

The header is the id alone, then `on:`, `assumed:` and both walks. The file has no `status:` line. A doubt is open until the owner's `answer D<n> a|b` decision closes it, bound to the hash of these alternatives. Editing the alternatives reopens the doubt and flags `doubt answer stale`. An entry that breaks this form, a `status:` line included, is a [`malformed doubt`](marks.md#tripwires).
