# Dossier

Dossier is a toolkit for building a model of a system, checking it with formal methods and keeping it current as the system changes. An agent drafts the sentences and the models, runs the checks, and reruns a check when anything it rested on changes. The checkers, not the agent, decide whether each property holds. You review the sentences, which are the specification, and you decide what a counterexample means: a mistake in the specification, a flaw in the design, or a risk you accept.

- **Parts and compositions** say what the code does. A part is a contract or a procedure, written as sentences about its states, events and moves, which become models in TLA+, or in Alloy for structure. A composition wires parts together around one concern, such as governance control.
- **Properties** say what must hold. An Always says a bad state is never reached, a Once that an outcome eventually follows, and a Within that it follows within so many blocks. TLC, Apalache and Alloy check them within stated bounds, and Apalache can also prove an Always or a Within by induction, with no bound on steps.
- **Actors, Givens and scenarios** describe the surroundings. Actors send events from outside the model: a governance key, a keeper, the public, the chain. A Given is a written assumption about how an honest actor behaves, such as a keeper acting within a block. A scenario makes chosen actors malicious or offline, which drops their Givens, and a property is checked under each scenario it claims.
- **Guarantees, walks and words-only sentences** tie the model to the code. A guarantee is a fact about the deployed code that the model relies on, backed by a Certora rule or a record, or listed as assumed. A walk is an example run that a checker confirms the model can take, and that can be replayed against a deployment. A words-only sentence says what no tool here can check, and why.

[Parts, compositions and scenarios](docs/explanation/parts-compositions-scenarios.md) explains each of them.

## Install

Install Dossier as a plugin from this repository, in ChatGPT or in Claude Code. It runs on macOS and Linux. The hosted workflow runs its tests on Linux, and they also run on macOS before each release. Windows is untested.

### ChatGPT

Add this repository as a plugin marketplace with the Codex CLI, which shares its plugins with ChatGPT:

```bash
codex plugin marketplace add 0xh3lios/dossier
```

Then open Plugins in the ChatGPT desktop app, choose the Dossier marketplace and install Dossier, or install it from the command line:

```bash
codex plugin add dossier@dossier
```

### Claude Code

Add this repository as a plugin marketplace and install from it:

```bash
claude plugin marketplace add 0xh3lios/dossier
```

```bash
claude plugin install dossier@dossier
```

To work from a checkout instead, load it with `claude --plugin-dir /path/to/dossier`.

### What it needs

You need Node 24.3 or later, or 22.18 or later on the 22 line. Dossier draws each part as an XState statechart, which needs the `xstate` and `@xstate/graph` packages, and the agent offers to install them when it sets up your repository. Solver checks also need a JDK 17 or later and the TLC, Apalache and Alloy distributions. [Install the solvers](docs/how-to/install-the-solvers.md) covers them, and `dossier doctor` reports what is missing. The explorer, a page that shows the dossiers in your browser, is optional. It is built once, from packages downloaded from the npm registry. The skills run the `dossier` command for you. To run it in your own terminal, put it on your PATH as [Commands and skills](docs/reference/commands.md#the-command) shows.

## Use

In your repository, ask the agent to set it up for dossiers, which runs the setup skill. A dossier is the folder that holds one part or one composition: its specification, its models, the answers behind its results and a ledger of those results. Setup looks for a [knowledge base](docs/how-to/set-up-a-repository.md), a folder of records about the system's modules, and works without one. With one, the agent can draft a part from its records. Without one, it drafts from your code and what you tell it. Setup also offers to let the agent run the `dossier` command without asking each time. Then ask for what you want:

- "start a dossier for the timelock module"
- "check that nothing executes before the delay"
- "what if governance turns malicious?"
- "what if the delay were one block?"
- "prove it"
- "where are we?"
- "open the explorer"

The agent turns each request into sentences, models and checks. It reports the result with its bounds, the assumptions it rests on, the trace when there is one, and any decision that needs you.

Dossier is packaged as a plugin with five skills and the `dossier` command. The skills are how an agent uses the toolkit: `keep` writes specifications and models and runs checks, `setup` prepares a repository, `review` reads a dossier independently in a fresh context, `decide` records your decisions in your own words, and `explore` opens a page in your browser that shows the dossiers and never changes them. [Commands and skills](docs/reference/commands.md) lists all of them.

## Documentation

[The documentation](docs/README.md) has explanation pages on how Dossier works, how-to guides for common tasks, and reference pages. The [glossary](docs/reference/glossary.md) explains each term the pages use. Start with [Why model the system](docs/explanation/why-model-the-system.md), then [What Dossier keeps](docs/explanation/what-dossier-keeps.md) and [How a claim earns its mark](docs/explanation/evidence.md).

## Repository

- `spec/`: the language, process, artifact and evidence contracts shared by humans, agents and tools
- `skills/`: the five skills, which ChatGPT and Claude Code both load, and which route to the specification
- `bin/` and `src/`: the `dossier` command and its TypeScript source, which Node runs without a build step, with one file per command under `src/commands/` and one folder per stage: prose, chart, models, trials, verify and dossiers
- `plugin.json` and `.agents/plugins/marketplace.json`: the plugin's manifest and marketplace for ChatGPT and Codex, and `.claude-plugin/` the same for Claude Code. Both manifests carry the version in `package.json`
- `apps/explorer/`: the explorer's page, which `dossier explore --install` builds on your machine from the packages it pins
- `qualification/`: the test suites, the Harbor fixture, and the script that rebuilds Harbor with the real solvers

`npm test` runs the suites against recorded checker output, so no solver is needed. Tests marked todo record known defects. Node lists them at the end of the run as failing tests, and the run still passes. `npm run typecheck` checks the source and the suites with the TypeScript compiler.

## What it is for

- **The whole composition.** Whether a change can reach a vault before a timelock's delay has passed depends on the timelock, the vault, the emergency module that bypasses the delay, and who holds which keys. The model holds all of them, and the checkers try every order of events the bounds allow, including orders no test was written for. Alloy checks the structure as well, such as which signers sit on which multisig.
- **Procedures and actors.** A multisig's procedure or a governance process is described in the same sentences as a contract and joins the same checks. Keepers, signers, markets, the chain and the public are actors, each a source of events that fails as a unit. Every assumption about an actor, such as a keeper acting within a block, is written down as a sentence.
- **Scenarios.** Under a scenario each actor is honest, malicious or offline, for the whole run or for a window of blocks. A property is checked under each scenario it claims.
- **Counterexamples.** A failed check comes with the trace that reaches the bad state, retold as who acted, in which block, and what changed. The retelling shows which actor a fix has to address.
- **Designs and changes.** A design can be checked before its code exists. A proposed change, such as a shorter delay or a new emergency path, can be checked under the same scenarios before it is made.
- **A record that stands without trusting the agent.** Whether a property holds comes only from a checker's output, and every result is computed, never written by hand. A property weakened until it passes, or a surprise rerun until it agrees, shows in the record. Anyone with a clone of the repository can confirm the results with `dossier recheck`, which the agent can run where the solvers are installed. [How a claim earns its mark](docs/explanation/evidence.md) describes how.
- **Results that stay current.** Each check records what its result rested on: the sentences, the model, the records the dossier relies on and what backs each assumption. A change to any of them lapses exactly the results that rested on it, and the record says what to rerun.

## Limitations

- **Results are about the model.** A property proved on the model holds for the deployed system only if the model is faithful to it, and that judgment is yours. Dossier records what backs each assumption the model makes about the code, such as a Certora rule, a recorded invariant or a replay against a deployment, and lists the assumptions with no backing. It does not prove them.
- **Most checks are bounded.** TLC explores the states within configured bounds, so `checked` means no violation within those bounds, which are stated next to each result. Only an inductive proof in Apalache removes the bound on steps, and only that is marked `proved`. It still holds only for the model's ranges and constants.
- **Assumptions about actors are not checked.** A result under a malicious governance key says what the procedure lets that key do. It says nothing about whether the real signers will behave that way, or how likely that is. A property that needs a keeper to act holds only while the keeper does, and the record names that assumption without saying whether it will hold.
- **A malicious actor has only the powers the model gives it.** It can do anything the modeled contracts allow, within the ranges the model declares. Capital borrowed within one transaction, or a market the model leaves out, is checked only once someone models it.
- **Modeling takes work.** The specifications have to be written, reviewed by someone who knows the system, and kept small enough to check.

[The limits of a mark](docs/explanation/limits.md) lists the rest.

## Example

Harbor is a small invented system that ships with the plugin, and its model checks ran through the real solvers. Its control composition has four parts. The Timelock holds one governance plan at a time and lets anyone execute it once its delay has run out. The Vault is the ledger the plan changes. The Adapter turns the Vault's credit into tokens and back. The Breaker is an emergency module that halts the Adapter without waiting. Governance is the key that schedules and cancels plans, and the public stands for anyone at all.

An excerpt of the Timelock's specification:

```
[S1] Idle: no plan waits.
[S2] Scheduled: one plan waits out its delay.
[E1] tick, from the chain: one block passes.
[E2] schedule, from Governance: a plan is scheduled with the full delay ahead of it.
[E3] execute, from the public: anyone asks to execute the waiting plan.
[M4] When Idle receives schedule, it becomes Scheduled, with remaining 2.
[M2] When Scheduled receives tick and remaining is above 0, it stays Scheduled, remaining drops by one.
[R3] In Scheduled, execute is refused when remaining is above 0.
```

The questions about the system are written as properties of the composition and checked under three scenarios. In `all-honest` every actor is honest, in `governance-captured` Governance is malicious, and in `executor-offline` nobody executes plans.

| Property | owner | `all-honest` | `governance-captured` | `executor-offline` |
| --- | --- | --- | --- | --- |
| A1 · no plan changes the Vault before its delay has run out | unsettled | proved | checked | checked |
| A2 · a halt reaches the Adapter at once | unsettled | checked | checked | |
| O1 · a scheduled plan is eventually executed or cancelled, given a prompt executor and a ticking chain | unsettled | checked | | |
| N1 · a scheduled plan is executed or cancelled within 3 blocks, given a prompt executor and a ticking chain | unsettled | checked | checked | violated, accepted |

- `unsettled`: no owner has accepted the property's sentence yet, so its results rest on words the owner has not reviewed.
- `proved`: Apalache proved the property by induction, for every reachable state of the model, with no bound on steps.
- `checked`: TLC found no violation within the configured bounds.
- `violated, accepted`: TLC found a trace, a plan scheduled and then four blocks in which nobody executes it, and the owner accepted the risk, since the property assumes an executor and the scenario removes one.
- blank: the property is not claimed under that scenario.

The property column puts each property in plain words. The ledger prints the sentence itself, such as `Always, {not timelock.early}` for A1.

A row shows which of these scenarios a property survives. A column shows everything that one malicious actor or one outage breaks.

In the ledger, each result links to the file that keeps its answer: the outcome expected before the check ran, the outcome the checker returned, the hashes of the model and configuration it ran on, and the trace.

A property also has to fail on a copy of the model with a deliberate bug before its result counts, which catches a property that holds vacuously. Until then its row shows `held`. Each part and each composition in Harbor has a dossier. [Harbor](docs/reference/harbor.md) describes the rest of the fixture.

## License

CC0 1.0.
