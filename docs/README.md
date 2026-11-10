# Dossier documentation

The pages are in three groups. Read an explanation to understand how Dossier thinks, follow a how-to guide to get a task done, and look things up in the reference. [Harbor](reference/harbor.md) is a complete worked example you can open and follow.

Start with [Behaviors and claims](explanation/behaviors.md). A dossier is read from its behaviors, and what is established is reported claim by claim. Then [Read a dossier](how-to/read-a-dossier.md) follows one claim down to its evidence, and [What Dossier keeps](explanation/what-dossier-keeps.md) says who writes each file. The [behavior contract](../spec/behaviors.md) defines the format. [Implementation status](../spec/implementation.md) names the tools that read it, the guards on publication and the limits of each.

The agent runs the `dossier` command the pages show, and you can ask it to run any of them. To run one in your own terminal, put the command on your PATH as [Commands and skills](reference/commands.md#the-command) shows.

## Explanation

- [Why model the system](explanation/why-model-the-system.md): what checking a model of the whole system tells you, why an agent can keep one current, and the four conditions under which that work can be trusted
- [Behaviors and claims](explanation/behaviors.md): the account a dossier is read from, what rests on a claim, how a claim earns its standing, and what a person and an agent each do with one
- [What Dossier keeps](explanation/what-dossier-keeps.md): who writes what in a dossier, how the work divides, and what you are asked to do
- [Parts, compositions and scenarios](explanation/parts-compositions-scenarios.md): the pieces of the formal specification that claims map to
- [Three kinds of tool](explanation/three-kinds-of-tool.md): why the chart, the solvers and the grounding are kept apart
- [How a mark is earned](explanation/evidence.md): calls, one answer per question, planted bugs, lapse and the guards, and what a mark gives a claim
- [The limits of a mark](explanation/limits.md): what a mark and a claim's standing do not establish

## How-to guides

- [Set up a repository](how-to/set-up-a-repository.md)
- [Install the solvers](how-to/install-the-solvers.md)
- [Read a dossier](how-to/read-a-dossier.md)
- [Choose what to model first](how-to/choose-what-to-model.md)
- [Start a part](how-to/start-a-part.md)
- [Start a composition](how-to/start-a-composition.md)
- [Write a behavior](how-to/write-a-behavior.md)
- [Check a claim](how-to/check-a-claim.md)
- [Explore a what-if](how-to/explore-a-what-if.md)
- [Record a decision](how-to/record-a-decision.md)
- [Back a guarantee](how-to/back-a-guarantee.md)
- [Replay walks against a deployment](how-to/replay-walks-against-a-deployment.md)
- [Refresh after a change](how-to/refresh-after-a-change.md)
- [Get a second read](how-to/get-a-second-read.md)
- [Open the explorer](how-to/open-the-explorer.md)
- [Recheck in CI](how-to/recheck-in-ci.md)

## Reference

- [Marks](reference/marks.md): every mark, cell, flag, tripwire and next step
- [Prose](reference/prose.md): the forms the compiler reads
- [Files](reference/files.md): the layout of a dossiers root and every file format
- [Commands and skills](reference/commands.md): the `dossier` command and its exit codes, the skills and the environment
- [Toolchain](reference/toolchain.md): what each trial needs, and the versions tested
- [Harbor](reference/harbor.md): the fixture, piece by piece
- [Glossary](reference/glossary.md): the terms the pages use, in plain words, and the README's words beside the docs'

The [specification](../spec/README.md) owns the shared process, language, artifact and evidence contracts. [Publication and integrity](../spec/storage.md) defines how answers and decisions are published, and how an interrupted publication is recovered. The skills select tasks and provide host integration. Part, composition, refresh and probe work use [one process](../spec/process.md), with distinct evidence obligations. The [review contract](../spec/review.md) defines the independent second read.
