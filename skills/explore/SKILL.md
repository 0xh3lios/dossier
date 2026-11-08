---
name: explore
description: Open the explorer, a page in the person's browser that shows the dossiers root and never changes it. It lists every dossier under its next step, shows a component's prose beside its statechart with the grid and the walks, plays walks, doubts and traces step by step, and shows a system's members, wiring and cells under each scenario. Builds the page once with dossier explore --install, starts dossier explore and gives the address. Use for "show me the dossiers", "open the explorer" or "let me see the oracle's chart". Not for checking or changing anything.
argument-hint: "[<component|system>]"
allowed-tools: Bash(dossier explore *), Bash(dossier doctor), Bash(dossier doctor *)
---

# Explore

`dossier` is [`bin/dossier`](../../bin/dossier) at the root of this plugin. Where it is not on the PATH, run it by that path.

The explorer is for people. It shows what `dossier verify` concludes, with the passages, charts and answers behind it, and it computes no standing of its own. It reads and never writes. Where the owner is asked for a decision, it prepares the `dossier decide` line with the words left blank, for the owner to fill in. You read the same facts from `dossier verify --json` and `dossier show`, not from the page.

1. Read the `explorer` line of `dossier doctor`. When it says the page is built by this version, go on to step 2. When it says the page is not built, or was built from other sources, ask the person before building it, since building downloads packages: `dossier explore --install` fetches the page's packages from the npm registry, at the versions the plugin pins, builds the page into `.explorer/` under the dossiers root and removes the packages. On their yes, run it. `.explorer/` ignores itself, so git does not see it.
2. Start `dossier explore --port 3677` in the background where the host keeps a process running after the command returns. Otherwise give the person that command to run in a terminal of their own. It serves the page on 127.0.0.1, prints the address, and moves to the next free port when 3677 is taken. It runs until it is stopped.
3. Give the person the address. For a dossier named in `$ARGUMENTS`, add `#/c/<id>` for a component or `#/s/<id>` for a system. Say that the page follows the files: a change under the root refreshes it, and the ribbon at the top lists the marks that moved.
4. When the person is done, stop the process you started.

The page is bounded. The root is a list, the largest graph is one system, and a graph with more than 25 boxes is refused rather than drawn. [Open the explorer](../../docs/how-to/open-the-explorer.md) is the person's guide to it.
