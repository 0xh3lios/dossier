# The map

The map gives a dossiers root its hierarchy: groups that nest to any depth, components as the leaves, and the parts and compositions each component holds. Storage stays flat. A dossier keeps its path, `parts/<id>` or `compositions/<id>`, which answers and reviews bind, and the map is a view over those paths.

## The block

**MAP-FORMAT.** The map is the fenced `json` block the root's `README.md` begins with. It is read as a collection's block is read ([BEH-FORMAT](behaviors.md#records)): at byte zero, three backticks, `json` and a newline, with the closing fence on a line of its own, UTF-8 with LF or CRLF line endings, and unique keys. The heading after the block is the root's title, and the paragraphs after it explain the root. The first paragraph is the root's lead.

| Node | Required fields | Optional fields |
| --- | --- | --- |
| Root | `format`, the map identifier in [record formats](artifacts.md#record-formats) | `featured`, `groups`, `components` |
| Group | `id`, `title`, `lead` | `record`, `featured`, `groups`, `components` |
| Component | `id`, `title`, `lead`, `dossiers` | `record`, `featured`, `flows` |

| Field | Value |
| --- | --- |
| `id` | Matches `[a-z][a-z0-9]*(?:-[a-z0-9]+)*` and is unique across the map, among groups and components alike, so a node's id is its address |
| `title`, `lead` | Nonempty, on one line. The lead says in a sentence what the node is |
| `record` | A typed knowledge reference, `<module>#<type>:<id>`, as [knowledge](knowledge.md#the-records) defines it. The title and the lead stay in the map, so the root reads without the knowledge base |
| `groups`, `components` | Arrays of nodes, in reading order |
| `dossiers` | Array of entries, each dossier once. An entry is a dossier's path, or an object with exactly `ref`, the path, and `select`, a nonempty array of behavior ids and claims written `<behavior>/C<n>`, each once |
| `featured` | Array of readings, each with exactly `dossier`, a path, `behavior`, a behavior id or `<behavior>/C<n>`, and `lead`, a line saying why to read it. A node features each behavior or claim of a dossier at most once |
| `flows` | `true` or `false`. Absent means `true` |

An unknown or missing field, a wrong type, another format identifier, an id or a path of the wrong form, a node id used twice, an entry, a selection item or a reading given twice, and an empty `select` each make the block malformed. A whole dossier is always written as its path, so each placement has one spelling.

A README that does not begin with a `json` fence, and a root without a README, read as an empty map. A `json` fence meant as the map but not at byte zero, after a byte order mark or blank lines, or with more than `json` on its line, is malformed, never read as no map. Harbor's [root README](../qualification/fixture/dossiers/README.md) is a complete map.

## Placement

**MAP-PLACEMENT.** A component holds each dossier one of its entries names. It holds the dossier whole through an entry without `select`. An entry with `select` is a cross-reference: it places the dossier it names, and it makes no flow and sites no composition. Placement follows from the entries alone:

- A live part must be held by at least one component, through any entry. It may be held by several.
- A composition that a component holds, through any entry, is placed there.
- A live composition that no component holds sits at the lowest node whose subtree holds every component that holds one of its live members whole. That is the component itself when one component holds them all, and the root when no group's subtree holds them all. A composition with no member held whole anywhere is unplaced, whatever the selections name. An entry naming the composition places it.
- A component lists under its flows every live composition with a member it holds whole, unless its `flows` is `false` or it holds the composition itself. This holds whether or not the composition is placed. Flows are for finding a composition, and they count nowhere.
- A selection takes the claims of each behavior it names and each claim it names. An item the dossier lacks takes nothing.
- A retired dossier, and a path that names no dossier, drop out of the tree.

The map holds no status. A placement says where a dossier is read. It adds no evidence and changes no claim's standing.

## Counts

**MAP-COUNTS.** For each node, verify counts what the node's subtree reaches: the dossiers its components hold, with their selections, and the compositions sited at it or below it. Counts are over distinct dossiers and distinct claims. A claim is named by its dossier's path and `<behavior>/C<n>`, so a claim reached twice counts once.

| Count | What it counts |
| --- | --- |
| `dossiers` | The dossiers reached |
| `claims` | The claims reached |
| `standing` | One count for each standing [BEH-STANDING](behaviors.md#claim-standing) gives a claim: `supported`, `evidence-available`, `hypothesis`, `contradicted` and `contested`. They sum to `claims` |
| `stale` | The claims whose freshness is not current |
| `needs.claims` | The claims contradicted, contested, or with evidence a review has not yet assessed |
| `needs.reviews` | The stale reviews of the dossiers reached |
| `needs.doubts` | The open doubts of the dossiers reached |
| `needs.decisions` | The cells violated without an acceptance that holds, in the compositions reached |
| `needs.notes` | The notes on the node or below it. The root counts every note |
| `needs.reviewsOwed` | The dossiers reached whose flags include `review owed`, each dossier once |
| `needs.tripwires` | The dossiers reached that hold a tripwire, each dossier once however many it holds |

The `needs` counts are what an owner, a reviewer or the agent must act on. A dossier's reviews, doubts, cells, flags and tripwires count wherever the dossier is reached, whole or selected. `needs.reviews` counts stale review files, and `needs.reviewsOwed` counts dossiers. The unplaced dossiers get the same counts, with one note each.

## Notes and the tripwire

**MAP-NOTES.** A block that does not parse or does not follow MAP-FORMAT, a `json` fence near the top that is not at byte zero, and a README that is a symbolic link or is not UTF-8, are the root tripwire `malformed map` ([tripwires](evidence.md#tripwires)). While it holds, verify places nothing. Every other finding is a note. A note never fails verify and blocks no work.

| Note | Meaning |
| --- | --- |
| `dossier unplaced` | A live part no component holds, or a live composition neither held nor sited |
| `dossier unknown` | An entry or a featured reading names a path where there is no part or composition |
| `dossier retired` | An entry or a featured reading names a retired dossier |
| `reading unknown` | A selection item or a featured reading names a behavior or a claim its dossier lacks |
| `reading outside its node` | A featured reading names a dossier that its node's subtree does not reach |
| `record unresolved` | A node's `record` does not resolve. It is checked only when `dossier.json` configures a knowledge root |

A featured reading with a note drops out of the tree. `dossier verify` and `dossier verify --brief` print one `map:` line when notes exist, counting them by name. Full verify then lists each as `map note: <name>: <where>`.

`dossier verify --json` carries `map`: the root's `title` and `lead`, the `tree`, `unplaced` with the paths and their counts, and `notes`, each with its `name`, `where` and `node`, null for the root. The tree is the root node, whose `groups` and `components` nest. Every node gives its `featured` readings that resolve, the compositions `sited` at it and its `counts`. A group and a component give their `id`, `title`, `lead` and `record`. A component gives its `dossiers`, each a `ref` with its `select` or null, its `flows` and `flowsOff`. A selection keeps only the items that resolve. `tree` and `unplaced` are null while `malformed map` holds. Nothing in `map` is a time or an absolute path. `dossier render` prints the tree in `index.md`.

## Writers

**MAP-WRITE.** The owner or an authorized agent writes the map. `dossier setup` writes a README that begins with an empty map, `{ "format": "dossier-map@0.3.0", "groups": [] }`, and keeps a README that is already there. `dossier decide <id> begin` places nothing, so a new part is unplaced until the map holds it.

`dossier place` adds a dossier at a component, or takes it away. It creates a missing component or group when it is given the title and the lead, under the parent it is given or at the top. It rewrites the block alone, under the root lock, as canonical JSON in the README's line endings: two spaces of indentation, one item a line, and the keys in a fixed order. That order is `format`, `featured`, `groups`, `components` at the root, and `id`, `title`, `lead`, `record`, `featured` in a node, followed by `groups` and `components` in a group or by `flows` and `dossiers` in a component. An entry gives `ref` before `select`, and a reading gives `dossier`, `behavior`, `lead`. An optional field that is absent stays absent. The rest of the README stays byte for byte as it was, and a README without a block gets one at byte zero, followed by a blank line, in the README's line endings. A map equal to the one the block holds writes nothing, however the block is spelled, so an entry or a group already so is kept as it is. It refuses an unknown or retired dossier, a selection its dossier lacks, a malformed map, and a change after which the README would not read as the map. The [command reference](../docs/reference/commands.md) gives its syntax.

No answer, review basis or integrity record binds the root README. Editing the map lapses no answer and stales no review. Removing the block takes away the hierarchy and nothing else: every dossier becomes unplaced, and no conclusion about a claim changes.
