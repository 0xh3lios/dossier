# Open the explorer

See where the dossiers stand, and read a component's prose beside its statechart, in a page in your browser. The explorer reads the dossiers root and never changes it. It shows what `dossier verify` concludes and computes no standing of its own.

## Steps

1. **Build the page once.** Ask the agent to open the explorer, which runs the explore skill, or run `dossier explore --install` yourself. The agent asks before it downloads anything. The command downloads the page's packages from the npm registry, at the versions the plugin pins, builds the page into `.explorer/` under the dossiers root and removes the packages. The folder ignores itself, so git does not see it. After the plugin is updated, `dossier explore` says the page was built from other sources, and `--install` builds it again.

2. **Start it.** Run `dossier explore`, or let the agent start it. It serves the page at `http://127.0.0.1:3677/` until you stop it with Ctrl-C. When that port is taken it takes the next free one, and `--port` picks another. It answers only on this machine, and only to a page opened at that address.

3. **Find your way.** The board lists every dossier under its [next step](../reference/marks.md#the-next-step), from `Fix` to `Report`. Open a component to see its prose beside its statechart, the grid of states by events, and its walks as lanes, one for each sender. Open a system to see its members, the wiring between them, the actors that send into them, and each property under each scenario. ⌘K or Ctrl K goes to any dossier, passage, doubt, walk, cell or answer, and `?` lists the keys and what each mark means.

4. **Play what happened.** The Play tab replays a walk, either reading of a [doubt](../reference/glossary.md), or the trace an answer holds, step by step on the chart, with the passage that decides each step. Simulate sends any event from any explored state and shows each condition evaluated. Find a path searches the explored states for one you describe.

5. **Decide.** The explorer writes nothing. Where a decision is yours, such as answering a doubt or accepting a risk, it prepares the `dossier decide` line with your words left blank. Fill them in and run it, or ask the agent to record it, as [Record a decision](record-a-decision.md) describes.

The page follows the files. A change under the root, such as a new answer or an edited passage, or in the knowledge base, refreshes it. The ribbon at the top lists the marks that moved, and when you open the page, what moved since your last visit.

The views are bounded. The root is a list, the largest graph is one system, and a graph with more than 25 boxes is refused rather than drawn.
