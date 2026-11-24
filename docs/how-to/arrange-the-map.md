# Arrange the map

Group the dossiers the way a reader thinks about the system, from its areas down to the places where each one is read. A dossier is the folder that holds one part or one composition. The map sits at the top of the root's `README.md`. The index prints it, and the [explorer](open-the-explorer.md) reads the dossiers from it. Each dossier keeps its own folder, so the map only says where to read it.

## You need

A repository set up for dossiers. Setup writes the root's `README.md` with an empty map, as [Set up a repository](set-up-a-repository.md) shows. A README without the map reads as an empty one, and `dossier place` adds the map at its top.

## Steps

1. **Read the map.** The root's `README.md` begins with a fenced `json` block whose `format` is `dossier-map@0.3.0`. Groups nest to any depth. A component is a leaf of the map, a place where dossiers are read, and it holds them by their paths, such as `parts/timelock`. Every group and component has an id, a title and a lead, one line saying what it is. The heading and the paragraphs after the block are the root's title and explanation. [Files](../reference/files.md#the-map) lists every field.

2. **Place each part.** Ask the agent to place the timelock under Governance, or run `dossier place` yourself. With the names of Harbor, the example system that ships with the plugin, and on an empty map, the first command creates a group at the top. The second creates a component under it and places the Timelock's dossier there:

   ```bash
   dossier place --group governance --title "Governance" --lead "Plans that wait out the Timelock's delay, and the emergency halt that does not."
   dossier place parts/timelock timelock --parent governance --title "Timelock" --lead "Holds one plan while its delay runs down, then sends its change to the Vault."
   ```

   Once a component exists, `dossier place <dossier> <component>` places another dossier at it, and `--remove` takes one away. A dossier may sit under several components. The same command run twice keeps what is there and writes nothing. It rewrites only the map's block and leaves the rest of the README as it was. A placement records no evidence and changes no claim's [standing](../reference/marks.md#claim-standing).

3. **Let each composition find its place.** A composition no component holds sits where the components that hold its members whole meet: at that component when one holds them all, otherwise at the lowest group over them, or at the top. Harbor's Supply sits under its Credit and HRD group, Control at the top, and Upkeep at the Oracle. Each component also lists, as its flows, the compositions that a dossier it holds whole is a member of. Place a composition with `dossier place` only to read it somewhere else, or when no component holds one of its members whole. Set `"flows": false` on a component to stop it listing flows.

4. **Show part of a dossier where it also belongs.** A component can hold a dossier in part: some of its behaviors, or single claims written `<behavior>/C<n>`. Harbor's Conversion component holds the Adapter whole and the Token's minting and burning:

   ```bash
   dossier place parts/token conversion --select mint-and-burn
   ```

   This is a selection. It places the Token and brings the claims it names into the component's page and counts. It is a cross-reference, so it adds no flow and decides where no composition sits. `dossier place` refuses a behavior or a claim the dossier lacks.

5. **Feature a reading.** A group, a component or the top of the map can recommend where to start: a dossier under it, one of the dossier's behaviors or claims, and a line saying why. Harbor's map features one at the top:

   ```json
   {
     "dossier": "compositions/control",
     "behavior": "emergency-halt",
     "lead": "A Breaker halt stops exits at once, while a Timelock plan still waits out its delay."
   }
   ```

   `dossier place` writes groups, components and their entries. A node's `featured` readings, its `flows` and its `record`, the knowledge record it describes, are edits you or the agent make in the block itself.

6. **Read the notes.** Say "where are we?", or run `dossier verify`. When the map has notes, verify prints one line that counts them, and without `--brief` one line for each. Halfway through Harbor's map:

   ```
   map: 2 notes · dossier unplaced 2
   map note: dossier unplaced: parts/oracle
   map note: dossier unplaced: compositions/upkeep
   ```

   A note never fails verify and blocks no work. Besides a dossier no component holds, a note names an entry or a featured reading whose dossier does not exist or is retired, a selection or a featured reading of a behavior or claim its dossier lacks, a featured reading of a dossier outside its node, and a `record` that does not resolve, which is checked only when a knowledge base is configured. A block that does not parse or does not follow the format is a [tripwire](../reference/marks.md#tripwires) instead, `malformed map`, and verify fails until the block is fixed. `dossier place` does not rewrite a malformed map.

## Check

`dossier verify` prints no `map:` line once the map has no notes. `dossier render` then prints the tree in `index.md`, with each node's claims counted by standing and its needs, what an owner, a reviewer or the agent must act on beneath it. A claim reached through two components counts once. No claim's standing moved. The map holds no status, and editing it [lapses](../explanation/evidence.md#a-snapshot-behind-every-result) no answer and stales no review. Removing the block only leaves every dossier unplaced.

## See also

- [The map contract](../../spec/map.md) for every rule of placement, counting and notes.
- [Commands and skills](../reference/commands.md#the-command) for the syntax of `dossier place`.
- [Open the explorer](open-the-explorer.md) to read the dossiers from the map.
