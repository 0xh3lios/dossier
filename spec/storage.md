# Publication and integrity

Storage separates authored inputs, the entries that hold the answers, owner decisions, local bundles and disposable views. This contract defines which records are published and what a reader may trust. [Evidence](evidence.md#questions-and-answers) defines what an answer establishes and when a new answer replaces it. Publication alone never turns an abort into evidence or a bounded check into a proof.

## Format and authority

**STORE-FORMAT.** The root's `dossier.json` must say `"storage": "integrity-v1"`. It is the only storage format. Every visible component or system directory must have `integrity.json`. A missing, malformed or unsupported manifest grants no fallback to any other record.

A marker that names no storage grants no authority. Verify trips `integrity unavailable` at the root and in every dossier, with `dossier.json names no storage; this plugin reads integrity-v1 only`. A marker that names another storage, such as `integrity-v2`, is a `malformed marker` at the root, and every dossier trips `integrity unavailable` with `dossier.json names storage "integrity-v2"; this plugin reads integrity-v1 only`. `trial`, `decide`, `import` and `recover` refuse either root with exit 2, except that `recover` still clears a dead lock. A refusal names what the marker says, such as `dossier.json names no storage; this plugin reads integrity-v1 only; no evidence or decision is published to a root in another format`.

Setup writes `storage: integrity-v1` into a new root's marker. It adds the field to a marker that names no storage while no dossier exists under `components/` or `systems/`. With dossiers under it, setup refuses with `dossier.json names no storage while dossiers exist under it; this plugin keeps integrity-v1 roots only, and setup does not convert another format`. A marker that names another storage is malformed, and setup refuses it with `dossier.json: unsupported storage format (<path>); correct it before running setup`.

A lost or damaged `dossier.json` or `integrity.json` is restored from version control. Neither is ever recreated from the entries, decisions or views that survive. A recreated file would vouch for whatever history was left.

The per-dossier manifest has exactly these fields:

| Field | Meaning |
| --- | --- |
| `schema` | Integer `1`. Any other version is refused. |
| `evidence` | Map from each entry's name, the file name in `evidence/` without `.json`, to the 64-character hexadecimal SHA-256 digest of the entry's bytes. |
| `decisionHead` | `null` before any committed decision, otherwise `{ algorithm: sha256-prefix, bytes, digest }`. |

In a decision binding, `bytes` is a positive integer and `digest` is the full SHA-256 of exactly those UTF-8 bytes at the start of `decisions.log`.

An entry's digest covers its bytes exactly. A reading, `evidence/<name>.md`, is authored interpretation and is not bound. Finder's `.DS_Store` is ignored. A symbolic link or a special file in `evidence/` is refused.

The manifest holds no marks, routes, copies of doubts' answers, acceptance statuses or last-read timestamps. An answer the owner forgot after its file was removed keeps its manifest line until a new answer to its question replaces it.

## Trials and answers

**STORE-BUNDLE.** `dossier trial` executes a call in a private staging folder, `.running/<id>/`, under the dossier, and no two processes write into the same one. The trial's bundle is the call as captured, the checker's output, `result.json` and the receipt, with any traces, diffs or Alloy instances. When publication ends, the bundle moves to `trials/<id>/`. A publication that does not finish leaves it in `.running/<id>/` for `dossier recover`. Both folders stay on the machine that ran the trial, and the `.gitignore` that setup writes keeps them out of version control. Setup leaves an existing `.gitignore` as it is, so one without those lines needs them added. No bundle is part of the record. Verify never reads `trials/`, and deleting a bundle changes no conclusion. The receipt lets the runner, and the agent on that machine, check a bundle's own files.

**STORE-ANSWER.** Publication runs under the dossier publication lock. [The evidence rules](evidence.md#questions-and-answers) decide whether it writes the trial's answer to its question's entry, keeps the entry as it is, or refuses the answer. A publication that writes an entry proceeds in this order:

1. Validate the bundle: the call, `result.json`, the receipt, the scope and the identities. Write the new entry as a candidate, `.running/<id>/entry.json`, and flush it.
2. Atomically replace and flush `integrity.json` with the candidate's digest under the entry's name.
3. Remove the reading of the answer it replaces, atomically rename the candidate onto `evidence/<name>.json`, and flush the directory. The reading goes first, so that no interruption leaves it beside the new answer.
4. Move the bundle to `trials/<id>/`.

A publication that keeps the entry runs the same steps without the candidate. A refused one runs step 4 alone and says why.

A publication that is not refused also drops the entries of gone questions and superseded answers ([ANSWER-DROP](evidence.md#questions-and-answers)). Before step 2 it lists their names beside the bundle, in `.running/<id>.dropped.json`. Their manifest lines go with step 2, their entries and readings are deleted after step 3, and the list is deleted before step 4. A publication that keeps the entry and drops nothing therefore runs step 4 alone, and writes no byte of the record. An interruption between those steps leaves unbound entries, which cover nothing. The next publication removes one whose question is gone, and `dossier recover` removes a superseded one when it finishes the interrupted publication. A candidate grants no evidence until it is in place under its binding. Metadata that conflicts with the call is refused. Successful inductive evidence requires matching mode and successful base and step observations.

Publication consumes the pending call, deleting it from `calls/`, when it writes the answer or keeps the entry for a completed trial, and only if the call still has the exact captured bytes and resides in that dossier's `calls/`. A refused answer, and an aborted trial whose answer is not written, leave the call pending. Recovery preserves pending calls. A changed draft is new intent and cannot be consumed by an earlier trial.

## Publish decisions and new dossiers

**STORE-DECISION.** The decision command holds the dossier publication lock across validation and append. It writes and flushes the extended chain, then atomically replaces and flushes the manifest's exact prefix binding. Any suffix beyond that prefix is pending and grants no owner authority. An intact committed prefix remains effective even when pending bytes are malformed.

A recovery of a pending decision requires inspection of its exact words and confirmation of the suffix's SHA-256. Under the lock, recovery rechecks that digest and an intact chain containing exactly one pending decision. It adopts those bytes without rewriting words, rebinding targets, or inventing approval.

**STORE-INITIALIZE.** Begin and import create a complete new dossier in a hidden sibling directory before renaming it into place under the root lock. The initial manifest, authored inputs and any begin decision are flushed before visibility. An abandoned `.initializing-<id>-<uuid>` directory has no authority. A retry builds a new candidate and never adopts it.

A visible folder of hand-drafted inputs may lack `integrity.json`. When it holds no `decisions.log` and nothing in `evidence/`, `begin` writes an empty `integrity.json` and records the begin. Bundles in `trials/` do not count, since they are no part of the record. A folder that holds a decision log or entries without `integrity.json` is a defect to restore from version control. Begin refuses it with a message such as `components/<id> holds decisions.log and evidence/ but no integrity.json; restore integrity.json from version control, since a begin cannot vouch for records it did not publish`.

## Writers, locks and recovery

**STORE-WRITERS.** Publication locks coordinate local cooperating processes. They record host, process id and a unique ownership token. There is no age-based expiration or automatic stealing. Setup, `begin` and `import` take the root lock. Dossier publications take the dossier lock. A writer rereads authority under its lock before replacing it.

Lock recovery may remove only a demonstrably dead owner on the same host. `dossier recover <dossier> lock` recovers a dossier's lock, and `dossier recover --root-lock` the root's. A live, foreign, malformed or uninspectable owner is refused. A separate recovery guard serializes reclaimers, and acquiring writers honor that guard. `--dry-run` inspects ownership without writing. A crashed or malformed recovery guard requires manual inspection with all writers stopped. The command does not guess that it is safe to remove it.

**STORE-RECOVER.** `dossier recover <dossier> trial <id>` finishes a publication interrupted while its bundle waited in `.running/<id>/`. A candidate whose digest the manifest already binds is renamed into place, and the entries the publication had dropped from the manifest are deleted, as its list names them, whatever has changed since. A candidate the manifest does not bind is discarded, and the bundle's answer goes through publication again under the evidence rules, as if its trial had just ended. So does a bundle that waits without a candidate. Recovery never replaces an entry that differs from its binding. Recovering the same publication again changes nothing. Verification reports incomplete publications and never completes them. Atomic replacement temporary files are nonauthoritative, and their presence is not permission to adopt their contents.

File and directory flushes define the implementation's ordering. Tests separately exercise injected failures, process termination and concurrent processes. Those tests establish the observed process-interruption behavior, not universal power-loss safety across filesystems or network mounts.

## Read-only verification and trust limits

**STORE-READ.** Verify writes nothing. It reads the authored inputs, the entries, the `classification:` line of each reading, the first line of each review under `reviews/`, the manifests and the decisions, and derives conclusions without repairing or acknowledging anything. It reads `.running/` only for candidate entries, to report a publication interrupted before or after its binding and to tell it from an edited entry, and it never reads `trials/`. It reconstructs expected generated identities in memory. `dossier render` writes `ledger.md` and `index.md`, which are views. Nothing reads a view as a record, so ledgers, the index and generated views may be deleted or edited without changing a conclusion. The earlier view feeds only a ledger's `Since last rebuild:` line, which says what moved since that view was written.

Retired dossiers remain subject to integrity checks. A missing authored input cannot hide a visible dossier's removed entries or decision damage. Entire dossier deletion cannot be detected from a per-dossier manifest after that directory is gone; version control or an external inventory must detect it. An actor able to rewrite every local record and anchor can construct a self-consistent history. Local hashes neither authenticate owner identity nor independently prove honest checker execution.

An entry is the runner's account of what a checker answered. The checker's own output stays in the bundle on the machine that ran the trial. `dossier recheck` reproduces an answer by asking its question again. Version control keeps the answers an entry replaced, until that history is rewritten.
