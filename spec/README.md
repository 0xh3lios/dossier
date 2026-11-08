# Dossier specification

The specification defines the artifacts Dossier accepts, the transformations its tools perform, the evidence behind its claims, and the responsibilities of an agent using it. Skill entrypoints select the task and provide host integration. They do not own a second version of these rules.

These pages describe the implemented contract unless a limitation is stated.

| What you need to know | Contract |
| --- | --- |
| What does each term mean? | [Semantics](semantics.md) |
| What does an agent do next, and when must an owner decide? | [One process](process.md) |
| Which files are authored, evidence, decisions or generated? | [Artifacts](artifacts.md) |
| Which records are published, and how does recovery work? | [Publication and integrity](storage.md) |
| Which sentences compile? | [Language](language.md) |
| What does chart exploration establish? | [Chart](chart.md) |
| How are models, calls and readings related? | [Models and trials](models.md) |
| How do members, wiring and scenarios compose? | [Composition](composition.md) |
| What backs an assumption about the deployed system? | [Knowledge](knowledge.md) |
| What justifies each mark and next step? | [Evidence](evidence.md) |
| How does a checker execute and report? | [TLC](checkers/tlc.md), [Apalache](checkers/apalache.md), [Alloy](checkers/alloy.md), [external runners](checkers/external.md) |
| What must an independent reviewer examine? | [Review](review.md) |
| How is the specification tested? | [Conformance](conformance.md) |

The [command reference](../docs/reference/commands.md) owns command syntax. The [file reference](../docs/reference/files.md) indexes serialized forms and links their contracts. The [reader documentation](../docs/README.md) explains use and interpretation. A mismatch between an implementation and this specification is a defect to investigate, not permission to rewrite the expected result.
