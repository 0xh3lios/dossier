# Recheck in CI

Run `dossier recheck` in a CI job, so the build fails when a checker no longer gives the answers your dossiers hold. A dossier is the folder that holds one part's or one composition's record. Each trial runs a checker on a call through `dossier trial`, and its answer goes to an entry under the dossier's `evidence/`, one entry per question. Recheck asks each entry's question again, in a private workspace, and writes nothing. [How a claim earns its mark](../explanation/evidence.md#one-answer-per-question) explains questions and answers, and what a recheck confirms.

Recheck needs the toolchain the answers came from. The plugin ships an installer, `qualification/install-toolchain.mjs`, that downloads TLC, Apalache and Alloy at pinned versions and refuses a download whose SHA-256 differs from the one it pins. [Toolchain](../reference/toolchain.md#the-installer) lists the versions.

## Steps

1. **Find the plugin's version.** Ask the agent to run `dossier doctor`. Claude Code puts the command on the session's PATH, and in ChatGPT and Codex the skills run it by its path in the plugin's folder, so the agent can run it in both. The `plugin` line of its output names the version you run and the plugin's folder. To run doctor in your own terminal, put the command on your PATH first, as [Commands and skills](../reference/commands.md#the-command) shows. The CI job uses the same version.

2. **Add the job to your workflow.** You add it, in your repository's CI configuration. For GitHub Actions:

   ```yaml
   recheck-dossiers:
     runs-on: ubuntu-latest
     permissions:
       contents: read
     steps:
       - uses: actions/checkout@v7
         with:
           persist-credentials: false
       - uses: actions/checkout@v7
         with:
           repository: 0xh3lios/dossier
           ref: '<version>'
           path: .dossier-plugin
           persist-credentials: false
       - uses: actions/setup-node@v7
         with:
           node-version: '24.3.0'
       - uses: actions/setup-java@v6
         with:
           distribution: temurin
           java-version: '21'
       - uses: actions/cache@v6
         with:
           path: ~/dossier-toolchain
           key: dossier-toolchain-${{ runner.os }}-${{ hashFiles('.dossier-plugin/qualification/install-toolchain.mjs') }}
       - run: npm install --no-audit --no-fund
         working-directory: dossiers
       - run: node .dossier-plugin/qualification/install-toolchain.mjs --into ~/dossier-toolchain
       - shell: bash
         run: |
           . ~/dossier-toolchain/env.sh
           .dossier-plugin/bin/dossier recheck | tee "$RUNNER_TEMP/recheck.log"
           grep -Eq '^recheck: [0-9]+ same, 0 different, 0 not run$' "$RUNNER_TEMP/recheck.log" || { echo "recheck left answers not run"; exit 1; }
   ```

   Replace `<version>` with the version from step 1. The plugin's tags are the plain version, such as `0.1.0`, with no `v` before it. The second checkout puts the plugin beside your repository. Recheck asks the chart's questions again too, and the chart loads its libraries from `dossiers/node_modules/` first and the plugin's own only when those are missing, so the job installs the ones `dossiers/package.json` names, as `dossier setup --install` does. Use `npm ci` there instead when `dossiers/package-lock.json` is committed. TLC, Apalache and Alloy need nothing from npm. The installer writes `env.sh` in the folder you give it, exporting `TLA_TOOLS`, `APALACHE` and `ALLOY_JAR`. It leaves `JAVA` to the machine, using `$JAVA` when it is set and otherwise the `java` on the PATH. The cache is keyed on the installer, so a later job downloads nothing until the pinned versions change.

3. **Point recheck at your dossiers.** Run from the repository's top, `dossier recheck` finds `dossiers/` there, or the root a committed `.dossier-root` names. Otherwise add `--root <path>`. Name dossiers after `recheck` to recheck only those.

4. **Give it what the answers rest on.** `knowledge.root` in `dossier.json` names the knowledge base. A knowledge base inside the repository is stored relative to `dossiers/`, so the checkout brings it along. One outside the repository is stored as an absolute path, which holds on one machine only, so the job must check it out at that same absolute path, or recheck cannot read it. Each entry holds its answer's basis, the hashes of the files and records the answer rested on. An answer whose basis has moved has lapsed, and a missing knowledge base moves the basis of every answer that cites it. Recheck lists a lapsed answer as `not run` without asking its question, since a trial answers it again, not a recheck. An external runner runs as `dossier.json` configures it, so its command must work on the CI machine. Recheck lists a call to a runner that `dossier.json` does not configure as `not run`.

## Read the output

Recheck prints one line per entry, then a summary:

```
recheck: 74 same, 0 different, 0 not run
```

That is Harbor's summary with the pinned toolchain. Harbor is the example that ships with the plugin. Recheck exits 1 when any answer comes back different, which fails the job. A `different` line names the entry, then gives the answer it holds and the answer that came back, each as a verdict, outcomes and reach. The checker no longer gives the entry's answer at that reach. Recheck writes nothing, so the entry stays as it is until a trial's answer replaces it, as the [evidence rules](../reference/files.md#evidence) allow.

Recheck itself exits 0 when it lists answers as `not run`, so the job's last line fails it when the summary counts any. A job that passes has asked every entry's question again. Each trial ends in a publication, which writes its answer, keeps the entry as it is, or refuses the answer. A publication that is not refused also removes the entries of gone questions and superseded answers in its dossier. When the job fails on `not run`, each line names its reason, and each reason clears in its own way:

- `lapsed`: something the answer rested on has moved since its trial. When it moved in the repository, a new trial clears it, so ask the agent to refresh the dossier as [Refresh after a change](refresh-after-a-change.md) shows. When the CI machine lacks it, such as a knowledge base outside the repository, give the job what step 4 names.
- `aborted`: the checker did not finish, and the question has no completed answer. A later trial whose checker finishes clears it.
- `question gone`: something the question named, such as a walk or a file, no longer exists. The next publication in that dossier removes the entry.
- `answer superseded`: answers to other questions now stand in for this one. The next publication in that dossier removes it. One that holds a counterexample is removed only after the owner's `forget` names it, as [Record a decision](record-a-decision.md#the-verbs) shows. The forget deletes nothing itself, so the job stays red until that next publication.
- `its records do not verify`: the dossier, or for a composition one of its members, has a tripwire. Recheck names the dossier once and asks none of its questions. Fix the tripwire as [Marks](../reference/marks.md#tripwires) says.
- `its call did not run here`: the checker or an external runner could not run on the CI machine. Install the checker, or declare the runner in `dossier.json` with a command that works there.

The job checks out what is committed, so each reason clears once the change that clears it is committed. [Commands and skills](../reference/commands.md#the-command) gives recheck's options and exit codes.
