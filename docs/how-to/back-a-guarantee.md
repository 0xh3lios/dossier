# Back a guarantee

Tie a part's guarantee to the evidence that backs it. A guarantee is a K passage, a fact about the deployed code that the abstraction relies on without modeling it. Its last sentence names the backing. Once the backing resolves, the guarantee is marked `backed` instead of `assumed`.

## Steps

1. **Find the evidence.** It can be a Certora rule, a record your team already keeps, a file in the knowledge base, or a runner.

2. **Name it in the passage.** The passage's last sentence is `Backing:` followed by one of five forms. Two of Harbor's Vault guarantees:

   ```
   [K1] Debt equals free plus issued on the deployed Vault. Backing: certora certora/Vault.spec#debtEqualsCredit at 1a2b9f8e.
   [K4] The ceiling is raised only by an executed plan. Backing: none.
   ```

   And the one guarantee of Harbor's Token:

   ```
   [K1] The supply changes only through mint and burn, which only the Adapter may call. Backing: record token#property:supply-only-via-adapter.
   ```

   - **`certora <spec>#<rule> at <commit>`** looks for `rule <rule>` or `invariant <rule>` in the commit cache the module's `codebases.md` records. The cache may be flat, `source-cache/github/commit-<first four>-<last four>/`, or under the upstream repository's name, `source-cache/github/<repository>/commit-<first four>-<last four>/`. Prefer the full commit hash. An abbreviation, the first and last four hex characters, must select a single cache. A rule from an upstream's cache is in the margin after `dossier import`; check that it applies to the module before citing it.
   - **`record <module#type:id>`** resolves a record in the knowledge base, such as a recorded invariant.
   - **`file <path>#<rule>`** looks under the knowledge root for a rule, a declaration or a heading, such as `file modules/vault/source-cache/github/commit-1a2b-9f8e/src/Vault.sol#file` in Harbor's knowledge base.
   - **`external <runner>`** names a runner declared in `dossier.json`, such as `external replay` for Harbor's runner. The guarantee stays `unresolved` until an answer from that runner lists its K id under `covers`.
   - **`none`** says on purpose that nothing backs it.

3. **Verify.** Run `dossier verify` to read the current backing status. `dossier render` saves it in the part ledger's guarantees table:

   - `backed`: the rule or record was found, and every answer that rests on it records a hash of its text.
   - `assumed`: the passage says `none`.
   - `unresolved`: something was named and not found, or an `external` backing has no answer that covers it yet. The flag `backing unresolved` gives the reason, usually a wrong path or commit.

## What backed means

`backed` says a rule with that name exists at that commit. Whether the rule proves the guarantee as the passage words it is a judgment the agent writes in the margin or a reading, and a reviewer checks. When the passage names a new commit, the marks that rested on the old one lapse until rerun.

A [claim](../explanation/behaviors.md) about the source or about a deployment needs a backing among its evidence before it can read supported. A mapping to a backed guarantee supplies one, and so does a mapping straight to the record. The reviewer then judges whether the rule or the record says what the claim says.
