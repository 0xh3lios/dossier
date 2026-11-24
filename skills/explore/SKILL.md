---
name: explore
description: Open the explorer, a page in the person's browser that reads the dossiers root through its map and never changes it. A spine shows the map's groups and components. The Read lens merges the dossiers each component holds into its behaviors, guarantees, what it relies on and its flows, and a selected claim shows why it holds, from its source and runs to the independent review and the owner's decision. Attention lists only what an owner, a reviewer or the agent must act on, with a dossier decide line prepared where a decision settles it. Workbench keeps the next-step board, the chart, the system, the walks and the players. Builds the page once with dossier explore --install, starts dossier explore and gives the address. Use for "show me the dossiers", "open the explorer" or "let me see the oracle's chart". Not for checking or changing anything.
argument-hint: "[<part|composition>]"
allowed-tools: Bash(dossier explore *), Bash(dossier doctor), Bash(dossier doctor *)
---

# Explore

`dossier` is [`bin/dossier`](../../bin/dossier) at the root of this plugin. Where it is not on the PATH, run it by that path.

The explorer is for people. It opens on the map the root's README begins with: a spine of its groups and components, and a page for the root, each group and each component, with the dossiers no component holds under Not placed. Three lenses read the same spine. Read merges the dossiers a component holds, with only what a selection names, and a selected claim opens Why this holds beside the page: its source, what each run showed, the independent review and the owner's decision. Attention lists only what an owner, a reviewer or the agent must act on. Where a decision settles an item, it prepares the `dossier decide` line with the owner's words left blank, for the owner to fill in. Workbench keeps the board of next steps, each dossier's claims in full, the chart or the system, the players and the raw records. The page shows what `dossier verify` concludes and computes no standing of its own. It reads and never writes. You read the same facts from `dossier verify --json` and `dossier show`, not from the page.

1. Read the `explorer` line of `dossier doctor`. When it says the page is built by this version, go on to step 2. When it says the page is not built, or was built from other sources, ask the person before building it, since building downloads packages: `dossier explore --install` fetches the page's packages from the npm registry, at the versions the plugin pins, builds the page into `.explorer/` under the dossiers root and removes the packages. On their yes, run it. `.explorer/` ignores itself, so git does not see it.
2. Start `dossier explore --port 3677` in the background where the host keeps a process running after the command returns. Otherwise give the person that command to run in a terminal of their own. It serves the page on 127.0.0.1, prints the address, and moves to the next free port when 3677 is taken. It runs until it is stopped.
3. Give the person the address. For a dossier named in `$ARGUMENTS`, add `#/part/<id>` for a part or `#/composition/<id>` for a composition. For a group or a component of the map the person names, add `#/node/<id>`. Say that the page follows the files: a change under the root refreshes it, and the ribbon at the top lists the marks that moved.
4. When the person is done, stop the process you started.

The page is bounded. The spine and every page are lists, the largest graph is one composition, and a graph with more than 25 boxes is refused rather than drawn. [Open the explorer](../../docs/how-to/open-the-explorer.md) is the person's guide to it.
