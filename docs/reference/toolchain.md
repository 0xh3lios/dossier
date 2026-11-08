# Toolchain

What each kind of trial needs, how to point Dossier at it, and the versions tested.

| Needed for | What | Set |
| --- | --- | --- |
| everything | macOS or Linux, the systems the tests run on. Windows is untested. | |
| everything | Node 24.3 or later, or 22.18 or later on the 22 line, which run the plugin's TypeScript directly | |
| the chart | `xstate` and `@xstate/graph`, under `dossiers/` or in the plugin's own `node_modules/` | `dossier setup --install`, which installs them under `dossiers/` |
| TLC trials | a JDK 17 or later and `tla2tools.jar` | `TLA_TOOLS`, and `JAVA` when `java` is not on the PATH |
| Apalache trials | the same JDK and the Apalache distribution | `APALACHE`, the `apalache-mc` launcher |
| Alloy trials | the same JDK and the Alloy 6.2 or later distribution jar | `ALLOY_JAR` |
| external trials | your own runner | `external` in `dossier.json` |
| the explorer's page | npm and the npm registry, once per root, for the packages `apps/explorer/package-lock.json` pins | `dossier explore --install`, which builds the page into the root's `.explorer/` |

## Versions tested

| Tool | Version |
| --- | --- |
| JDK | Temurin OpenJDK 21.0.13 |
| TLC | TLC2 2.19, from tla2tools 1.7.4 |
| Apalache | 0.62.4 |
| Alloy | 6.2.0 |
| xstate | 5.33 |
| @xstate/graph | 3.0 |
| Node | 26 |
| TypeScript | 7.0.2, for type checking only |

The recorded checker output the tests read predates this JDK. It came from OpenJDK 21.0.2, as `qualification/tests/recorded/versions.txt` says.

## The installer

`qualification/install-toolchain.mjs` in the plugin installs the three solvers at the versions the answers in Harbor came from. It downloads each from its project's GitHub release and refuses a file whose SHA-256 differs from the one it pins.

| Tool | Version | Downloaded file | SHA-256 |
| --- | --- | --- | --- |
| TLC | tla2tools 1.7.4 | `tla2tools.jar` | `936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88` |
| Apalache | 0.62.4 | `apalache-0.62.4.tgz` | `b781b53bba32fac14ac2e02b0332e1dc2edc64cb7b850c0608d8142cc7aa2ef4` |
| Alloy | 6.2.0 | `org.alloytools.alloy.dist.jar` | `6b8c1cb5bc93bedfc7c61435c4e1ab6e688a242dc702a394628d9a9801edb78d` |

It unpacks Apalache beside its archive and writes `env.sh` in the folder it installs into, `.local/toolchain/` under the working directory unless `--into` names another. `env.sh` exports `TLA_TOOLS`, `APALACHE` and `ALLOY_JAR`, and `JAVA` from `$JAVA` when it is set, otherwise from the `java` on the PATH. The installer installs no JDK. It keeps a file that already has its pinned hash, so a second run downloads nothing, and it refuses to replace an `env.sh` it did not write. [Install the solvers](../how-to/install-the-solvers.md) and [Recheck in CI](../how-to/recheck-in-ci.md) use it. The plugin's hosted workflow runs it in its `recheck-harbor` job, which then rechecks Harbor with a Temurin JDK 21, the JDK the answers came from.

## Where the solvers work

Planning and execution read private input copies, including generated composition models. A trial runs in its dossier's `.running/<id>/`, and its [bundle](files.md#trial-bundles) then moves to `trials/<id>/`. TLC's state folder and Apalache's output folder are removed once the checker's output is parsed. Alloy's receipt and instances stay under the bundle's `alloy/`, because the instances are the only copy of what the Analyzer found. Toolchain binaries and shared libraries are outside the copied-file identity, as [Execution identity](../../spec/models.md#execution-identity) explains.

TLC exports a Java RMI object when it starts model checking, which opens a local network socket. A sandbox that forbids network access makes every TLC trial abort with `Listen failed on port: 0` and `Operation not permitted` in `output.txt`. Allow local network access where an agent runs trials, as with `sandbox_workspace_write.network_access` in Codex.

An [entry](files.md#evidence) keeps no command line, working directory or path. The bundle keeps the command line and the working directory in `result.json`, and the checker's output in `output.txt`. Both name the toolchain as `$JAVA`, `$TLA_TOOLS`, `$APALACHE` and `$ALLOY_JAR`, and the folders as `$TRIAL`, `$INPUTS`, `$DOSSIERS` and `$PLUGIN`. TLC's banner there names the machine's cores, heap, process id and system as `$CORES`, `$HEAP`, `$PID` and `$OS`, and the JVM's vendor and architecture as `$JDK_VENDOR` and `$JDK_ARCH`. Output copied out of a bundle, into the agent's reading of an answer or into a report, therefore names no machine.

## The plugin's tests

`npm test` runs every suite with recorded checker output, so no solver is needed. `npm run typecheck` checks the source and the suites with the TypeScript compiler. The plugin itself runs without the compiler. With `APALACHE` set, a bounded Apalache check also runs end to end. `qualification/rebuild-fixture.mjs` runs every trial of the fixture with TLC, Apalache and Alloy.
