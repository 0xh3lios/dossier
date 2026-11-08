# Qualification

This folder holds everything that shows the plugin does what its documentation says. Each layer checks something the others cannot.

| Layer | Where | What it shows | Needs |
| --- | --- | --- | --- |
| Types | `../tsconfig.json` | The source and the suites type-check in strict mode, so every call between them agrees on the shapes it passes. | Node, and the dev dependencies |
| Spec conformance | [conformance/](conformance/README.md) | Portable spec/skill routes, complete and invalid examples, semantic mutations, byte-preserving verification, historical integrity, and an independent cell lifecycle compared with the real evidence functions. | Node, dependencies; `npm run test:spec` |
| Command lifecycle | `conformance/command-lifecycle.ts`, `tests/command-lifecycle.test.ts` | Selected XState paths execute the real CLI in isolated dossiers, including lapse/refresh, abort/retry, risk acceptance, rendering and interrupted publication/recovery. | Node; live violation trials additionally need `JAVA` and `TLA_TOOLS` |
| Translation agreement | [differential/](differential/README.md) | Generated small prose cases compare chart and TLC reachable states, enabled/refused events and witnesses; three-member cases compare simultaneous wired effects and ticks. | Deterministic generator tests need Node; actual comparisons need `JAVA` and `TLA_TOOLS` |
| Agent exercises | [conformance/agents/](conformance/agents/budget-request.md) | A fresh agent can discover the spec and produce supported artifacts and claims for a particular task. The grader checks files; a reader checks its explanation. | An isolated agent session; separate from `npm test` |
| Proving-ground probe | `conformance/probe-project.ts` | An existing project's current inputs compile and its recorded evidence is interpreted with visible failures, without changing the dossier tree. | Node; `node qualification/conformance/probe-project.ts <dossiers-root>` |
| Suites | `tests/*.test.ts` | The grammar and the intermediate form, the chart on real XState, the scaffold, the model readers and the composition, calls and the runner's plans, the YAML subset, the checker drivers, every mark, cell, tripwire and flag with the router and the ledgers, the names the ledger references use, the knowledge adapter on Harbor's records, the command line, and every command end to end. | Node |
| Pages | `tests/pages.test.ts`, `tests/packaging.test.ts` | Every relative link and anchor in the pages resolves, every known defect a user could meet is listed among the limits, no page gives one host's mechanism alone, and no page promises a check that only a hook could run. | Node |
| Recorded output | `tests/recorded/` | The TLC, Apalache and Alloy parsers read real checker output correctly. Paths in it are placeholders, and `versions.txt` names the tools that produced it. | Node |
| A live Apalache run | `tests/checkers.test.ts` | A bounded Apalache check runs end to end through its driver and leaves its trace. | `APALACHE` |
| Harbor | `fixture/` | Harbor's answers in `evidence/`, one per question, with their readings, and the decisions. Its trial bundles stay with the rebuild that ran them. Verification compares the answers' standing with `fixture/expected-marks.json`, the reviewed golden. | Node |
| Harbor rebuild | `rebuild-fixture.mjs`, `tests/fixture-rebuild.test.ts` | An explicit isolated output starts from the fixture's authored inputs with empty authority. Preparation and refusal tests and real chart publication run without solvers. A complete rebuild runs the full solver recipe separately. | A complete rebuild needs `JAVA`, `TLA_TOOLS`, `APALACHE` and `ALLOY_JAR` |

## Running it

From the plugin's root:

```bash
npm test
```

That runs every suite with recorded output and needs no solver. Tests marked `todo` record known defects that a later release fixes. Node lists them at the end of the run as failing tests, and the run still passes with `fail 0`. To check the types as well:

```bash
npm run typecheck
```

The suites are TypeScript, run by Node directly. The compiler only checks them.

[The qualification workflow](../.github/workflows/qualification.yml) runs type checking and all deterministic suites on the two minimum supported Node releases. It includes spec conformance and grader tests. It does not dispatch independent agents or rebuild solver evidence; those are separate recorded checks. The workflow uses the documented [checkout](https://github.com/actions/checkout) and [Node setup](https://github.com/actions/setup-node) actions.

To run the live Apalache check too, point `APALACHE` at the launcher, and `JAVA` at a JDK when `java` is not on the PATH. [Install the solvers](../docs/how-to/install-the-solvers.md) says where to get them.

```bash
export APALACHE=/path/to/apalache/bin/apalache-mc JAVA=/path/to/bin/java
npm test
```

Tests that need an unavailable solver skip explicitly. A deterministic generator or recorded-output test is not a live solver run.

## Command and translation checks

The command model selects four short paths that cover every declared part command event. The suite also exercises a fresh composition violation when TLC is available. It checks that bounded results never become proved, accepted risk leaves a violation violated, changed meaning lapses evidence and acceptance, verification preserves bytes and mtimes, and rendering leaves integrity and decision records unchanged. A test-only preload kills the real CLI after one rename: the manifest binding the candidate, the candidate becoming the entry, or the bundle moving to `trials/`, the three of STORE-ANSWER, or the decision log's. A candidate the manifest does not bind grants no authority, and explicit recovery finishes a publication the manifest already binds.

```bash
node --test qualification/tests/command-lifecycle.test.ts
# Set JAVA and TLA_TOOLS to include the live composition path.
DOSSIER_QUAL_KEEP=1 node --test qualification/tests/command-lifecycle.test.ts
```

`DOSSIER_QUAL_KEEP=1` retains the temporary command artifacts and prints their locations. These selected paths and four crash boundaries are bounded qualification, not a proof of arbitrary histories, concurrent writers or all crash points.

The differential harness runs 200 deterministic part seeds and twelve composition cases by default. It retains summaries and disagreements, and minimizes part disagreements while preserving compilability and the failure. Deliberately corrupted translations must fail its oracle.

```bash
node --test qualification/tests/differential.test.ts
# With JAVA and TLA_TOOLS set; --out must be new:
node qualification/differential/run.mjs --seed 0 --count 200 --out /tmp/dossier-differential-results
```

Agreement covers the documented common finite fragment. It excludes temporal fairness/liveness, hierarchy, overlapping transition priority, hostile scenarios and handwritten refinements. See [the harness's comparison contract and limits](differential/README.md) before interpreting a passing run.

## Rebuilding Harbor

Only `rebuild-fixture.mjs` with `--install` writes to `qualification/fixture/`. To retain a discovered regression, add a small portable mechanism fixture rather than another full Harbor copy.

Rebuild Harbor in a separate output:

```bash
node qualification/rebuild-fixture.mjs --out /tmp/harbor-current
```

The full recipe needs all four solver variables. The output must be outside the plugin tree, must not alias a plugin path, and must be absent or empty. Preparation copies the fixture's authored prose, wiring, alternatives, actors, knowledge and stand-in replay code. It leaves out answers, owner decisions, views, calls and models, and the recipe writes the models and their reviewed refinements itself. Each dossier gets an empty `integrity.json`, and the root gets `storage: integrity-v1`.

The recipe draws, scaffolds, runs actual trials, whose answers the runner publishes to `evidence/`, writes interpretations beside them and publishes decisions through the ordinary commands. It renders the views, verifies, and writes `observed-marks.json` under the output. That report is an observation to review against the intended guarantees. A rebuild never writes `fixture/expected-marks.json`, the reviewed golden. Preparation tests alone do not establish that the complete solver recipe passes.

Install a rebuild as the fixture with `--install`:

```bash
node qualification/rebuild-fixture.mjs --out /tmp/harbor-current --install
```

The output's dossiers replace `fixture/dossiers` only when verify passes on the rebuild and the observed marks equal `fixture/expected-marks.json`. A rebuild that moves a mark stops there and leaves the fixture unchanged, and the move is reviewed by hand. The install copies the answers, not the bundles in `trials/` and `.running/`, which stay in the output. Trial ids, timestamps and decision hashes change with every rebuild.

A rebuild always starts from a new or empty folder and asks every question afresh. To confirm the answers an existing output or the installed fixture holds, run `dossier recheck` on it instead.

The import-safe `prepareFixture({ out })` helper lets the preparation suite check these boundaries and exercise chart and decision commands without starting the full solver recipe:

```bash
node --test qualification/tests/fixture-rebuild.test.ts qualification/tests/fixture-readings.test.ts
```

## What the fixture must never hold

A test fails if any file under `fixture/` or `tests/recorded/` names a machine path. Entries keep no command line, working directory or path, and the recorded checker output names machine paths with placeholders, such as `$TRIAL`, `$DOSSIERS`, `$PLUGIN` and `$ALLOY_JAR`.
