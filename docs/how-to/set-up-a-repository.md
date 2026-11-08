# Set up a repository

Prepare a repository for dossiers: the `dossiers/` folder, its marker, the actors files, and the link to your knowledge base.

## You need

- The plugin installed in ChatGPT or Claude Code, as [Install](../../README.md#install) shows.
- Node 24.3 or later, or 22.18 or later on the 22 line.
- Optionally, a knowledge base: a folder holding `modules/<id>/` with Markdown files that carry YAML records.

## Steps

1. **Run setup from the repository root.** Ask the agent to set the repository up for dossiers, or [run the command yourself](../reference/commands.md#the-command):

   ```bash
   dossier setup
   ```

   If you keep a knowledge base, add `--knowledge path/to/records`. Without one, references resolve to nothing, and the marks say so. A knowledge base outside the repository is kept as an absolute path, as [Commands and skills](../reference/commands.md#the-command) explains. To prepare another folder as the dossiers root, run `dossier setup --root <path>`. Setup names that root in a `.dossier-root` file in the project folder, where the `dossier` command finds it. Commit that file.

   Setup creates `dossiers/` with `dossier.json`, `README.md`, `package.json`, `.gitignore`, `actors/actors.md`, `actors/scenarios.md`, `components/` and `systems/`. A new root declares `storage: integrity-v1`. Each dossier gets a folder under `components/` or `systems/`, named by its id in the form [Files](../reference/files.md#layout) gives. Setup then runs the doctor, reads the plugin's fixture as a smoke test, and verifies the root without writing reports.

2. **Know what to commit.** The `.gitignore` that setup writes keeps these paths out of git:

   ```
   /index.md
   /_scratch/
   /node_modules/
   /components/*/trials/
   /systems/*/trials/
   /components/*/.running/
   /systems/*/.running/
   ```

   `dossier render` rebuilds `index.md`, an overview of every dossier, so a committed copy would change, and conflict, whenever any dossier did. `_scratch/` is a local workspace, and `node_modules/` holds the chart's libraries. A trial runs a checker on a call through `dossier trial`. It works in its dossier's `.running/<id>/`, then leaves its bundle in `trials/<id>/`: the call as captured, the checker's output, `result.json` and a receipt of their hashes. If the root already has a `.gitignore`, setup leaves it as it is, so add any of these lines it lacks.

   Commit the authored inputs and the record, which is each dossier's `evidence/`, its `decisions.log` and its `integrity.json`. `evidence/` holds an entry with the answer to each question the dossier's calls ask, and the agent's reading beside each entry. [How a claim earns its mark](../explanation/evidence.md#one-answer-per-question) explains why the record holds the answers and not the bundles. Ledgers and generated views can be regenerated. Publication locks, candidate entries and temporary files are transient. Do not move one into place or take one over by hand. [Storage](../../spec/storage.md) explains interrupted work.

3. **Install the chart's libraries.** Run `dossier setup --install`. It runs `npm install` in `dossiers/`, which installs `xstate` and `@xstate/graph`, the libraries the chart runs on. Until then the chart uses the plugin's own copies, when the plugin's folder has them installed.

4. **Declare your actors.** Open `dossiers/actors/actors.md`. It starts with the chain and the public, the actor that stands for anyone at all. Add every part of the surroundings that sends events and fails as a unit, with its kind and the modes it can take:

   ```yaml
   actors:
     - id: governance
       name: Governance
       kind: governance
       modes: [honest, malicious, offline]
       pins: [timelock#actor:governance]
   ```

   Kinds are `governance`, `multisig`, `keeper`, `user`, `public`, `chain`, `market` and `external`. `external` is a contract or protocol with no dossier here. A contract that has a dossier is a component, never an actor. The optional `pins` name the records in your knowledge base that fix who the actor is, and the answers that rest on the actor lapse when one of those records changes. Add scenarios to `actors/scenarios.md` when you need them. [Compose a system](compose-a-system.md) shows how.

5. **Let the command run without prompts.** If your agent asks before every command, allow the `dossier` command in its settings. The setup skill offers to do it. In Claude Code the rule is `Bash(dossier *)` in the project's `.claude/settings.json`.

## Check

```bash
dossier doctor
dossier verify
```

The doctor says what is present and missing, with a fix for each, and exits 1 when something is missing. Verify prints `verify: ok · no dossiers · dossier 0.1.0 · 0 tripwires` on a fresh setup.

Running setup again keeps existing files and updates `dossier.json` under the root publication lock, preserving configured runners. It refuses a malformed marker instead of replacing it, and a marker that names another storage is malformed. A marker with no `storage` field gets `storage: integrity-v1` while no dossier exists under the root. Once dossiers exist, setup refuses it. A missing marker beside existing dossier directories must be restored from version control, and setup refuses until it is.

Run `dossier render` when you want ledger and index files written from the current analysis.

## Next

[Install the solvers](install-the-solvers.md) for model trials, then [start a component](start-a-component.md).
