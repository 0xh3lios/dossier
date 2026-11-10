# The knowledge base

Read when a part cites a record, pins an instance, or names a backing, and when a composition's closure is open.

## The records

A knowledge base is a folder of module records: `modules/<module>/` with Markdown files holding ```yaml blocks of records, each record an item with an `id`. `dossier.json` names the root: `"knowledge": { "root": "../knowledge" }`. Without one, references resolve to nothing and the marks say so.

Typed references, as the records themselves use them: `<module>#<type>:<id>`, where the type is one of `contract`, `actor`, `asset`, `dependency`, `edge`, `quantity`, `read`, `accounting`, `operation`, `property` (the invariants collection), `flow`, `procedure`, `role`, `entrypoint`, `reference`, `observation`. A reference resolves to the record's text and its hash, and nothing is copied into the dossier.

## Where the dossiers use them

- `Module: <module>` under a part's title names the module it abstracts. `dossier import <module>` drafts the prose and margin from the module's actors, operations, invariants, quantities, edges and Certora rules. A rule the module's own cache declares once becomes a draft Guarantee, `The cached specification declares <rule>`, at the full commit `codebases.md` records. A rule in a cache under `source-cache/github/<repository>/` belongs to an upstream the module builds on, and import lists it in the margin for review, not as a guarantee. So does a rule name declared twice.
- `Pins: <ref>, <ref>` names the records that fix the part's instance: a checkpoint observation, a contract. Their hashes enter every answer's snapshot. When a record changes, the model-side marks lapse.
- A member's `pins:` in the wiring do the same for a composition.
- An actor's `pins:` in `actors/actors.md` name the records that fix who it is, such as a signer set. Their hashes enter the snapshot of every answer in a composition whose members receive the actor's events. A pin of a part or an actor that does not resolve is flagged `pin unresolved`.
- Closure rules in the wiring name an asset and the edge kinds whose owners must be members, such as `edges: [mints_asset, burns_asset, accounts_for_asset]`. `verify` lists every module that owns such an edge on the asset and is not a member. A rule can also list `modules:` that must be members.
- A Guarantee's backing. `record <module#type:id>` resolves a record, typically a recorded invariant, and hashes it. `certora <spec>#<rule> at <commit>` looks for `rule <name>` or `invariant <name>` in the commit cache the module's `codebases.md` records for that commit, flat under `source-cache/github/commit-<first four>-<last four>/` or under `source-cache/github/<repository>/commit-<first four>-<last four>/`. A full hash selects its cache. An abbreviation must select one cache, and a revision two repositories both record is ambiguous: back it with `file` and the exact path. Without a `codebases.md` manifest, only a flat cache can be selected, by its abbreviation. `file <path>#<rule>` looks under the knowledge root for a rule, a declaration or a heading. A backing found is backed, with the rule's text hashed. One named but not found is unresolved and flagged. `none` is assumed.

## What backing means

A backed guarantee says a rule exists at that commit with that name. It does not say the rule proves the guarantee as the prose words it. Whether the rule supports the claim is your judgment, written in the margin or in a reading. A rule's text cannot change at a pinned commit, so nothing moves until the prose names a new commit. Then the hash in each answer's snapshot no longer matches, and the model-side marks and the cells that rest on the guarantee lapse until their questions are asked again.

## Reality

Dossier reads the knowledge base and never writes it. A finding that corrects a record goes back through the team's own maintenance workflow, citing the trial id. A doubt about the deployed system itself becomes a tracking item there, not a passage here.

## Behavior revisions

A pin in a claim's scope, and a `knowledge` target, give a typed reference with `revision: "sha256:<digest>"`. The digest is the full lowercase SHA-256 of the record's resolved UTF-8 `text`. It names the record. It is not a Git commit, the hash of a whole file or a short hash for display.

The text of a YAML record is JSON with object keys sorted at every level, arrays in their original order, two spaces of indentation and no trailing newline. A JSON or Markdown observation, and a contract's section, use the exact text the adapter resolves. The adapter returns the text, the digest and the path of the source, for the reviewer to inspect.

Resolution reads the configured knowledge base once, as it stands, and compares the record's full digest with the revision asked for. A reference that is missing or ambiguous is unresolved, and a different digest is stale. Nothing that reads a pin may put the changed text in place of the pinned revision. Verification never checks out a commit, downloads history or picks an old cache to make a pin pass.

The record a pin names owns the identity of the source commit, the instance and the checkpoint. A matching digest confirms which assertion was read. It does not establish the assertion, that the source corresponds to the deployment, or the whole provenance. A source or a deployment claim still needs fitting records, evidence and an independent review. A review's basis hashes whole files, so its digests may differ from a record's revision.
