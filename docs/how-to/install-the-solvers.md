# Install the solvers

Model trials need a JDK and three solvers. TLC is the TLA+ model checker, and it ships in `tla2tools.jar`. Apalache is a symbolic model checker for TLA+. The Alloy Analyzer checks Alloy models. The chart needs none of them, so you can write and draw parts before this step.

## With the installer

Install a JDK 17 or later, as in step 1 below. Then run the installer that ships in the plugin's folder. The `plugin` line of `dossier doctor` names that folder. Ask the agent to run doctor, which it can do in ChatGPT, Codex and Claude Code, or put the command on your PATH first, as [Commands and skills](../reference/commands.md#the-command) shows:

```bash
node /path/to/dossier/qualification/install-toolchain.mjs --into ~/dossier-toolchain
. ~/dossier-toolchain/env.sh
```

It downloads TLC, Apalache and Alloy from their GitHub releases, at the versions [Toolchain](../reference/toolchain.md#the-installer) lists, and refuses a download whose SHA-256 differs from the one it pins. It writes `env.sh` in the folder, exporting `TLA_TOOLS`, `APALACHE` and `ALLOY_JAR`, and `JAVA` from `$JAVA` or the `java` on your PATH. Without `--into` it installs into `.local/toolchain/` under the working directory. Running it again downloads nothing. Source `env.sh` before a session, then go to [Check](#check). [Recheck in CI](recheck-in-ci.md) runs the same installer in a CI job.

## Steps

1. **Install a JDK, version 17 or later.** If `java` is not on your PATH, set `JAVA` to the binary:

   ```bash
   export JAVA=/path/to/jdk/bin/java
   ```

2. **Get TLC.** Download `tla2tools.jar` from the TLA+ releases at https://github.com/tlaplus/tlaplus/releases and point at it. The installer pins release 1.7.4:

   ```bash
   export TLA_TOOLS=/path/to/tla2tools.jar
   ```

3. **Get Apalache.** Download and unpack the distribution from https://github.com/apalache-mc/apalache/releases, then point at its launcher. The installer pins release 0.62.4:

   ```bash
   export APALACHE=/path/to/apalache/bin/apalache-mc
   ```

4. **Get Alloy.** Download the Alloy 6.2 or later distribution jar from https://github.com/AlloyTools/org.alloytools.alloy/releases. The installer pins release 6.2.0:

   ```bash
   export ALLOY_JAR=/path/to/org.alloytools.alloy.dist-6.2.0.jar
   ```

5. **Keep the settings in one file.** Put the exports in a script you source before a session, kept outside version control, since the paths belong to your machine.

## Check

```bash
dossier doctor
```

Every solver line should say `ok`, as in:

```
ok       TLA_TOOLS: /path/to/tla2tools-1.7.4.jar
ok       APALACHE: apalache 0.62.4
```

A missing one names the variable to set.

[Toolchain](../reference/toolchain.md) lists the versions tested and how recorded commands name these paths.
