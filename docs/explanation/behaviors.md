# Behaviors and claims

A dossier is read from its behaviors. A behavior explains one mechanism of a part or a composition, and it makes claims about that mechanism. Dossier reports what is established claim by claim. The specification, the models, the checks and the reviews are all reached from a claim.

## A behavior, its claims and their mappings

A **behavior** explains one mechanism in words: who can act, under what conditions, what happens, and what can prevent or reverse it. Each behavior is one file, `behaviors/<id>.md`. The dossier's `README.md` introduces the system and gives the order in which to read the behaviors. That introduction is the **orientation**, and the two together are the dossier's **behavior collection**.

A **claim** is one statement in a behavior that can be judged by itself. A descriptive claim says what happens. A requirement says what is wanted, and it may turn out to be violated. Each claim states its scope, which is the model, the pinned source or a deployed instance. It also lists the assumptions it relies on.

A **mapping** joins a claim to what tests it. The target is a [passage](parts-compositions-scenarios.md#prose-and-passages) of the formal specification, a [cell](parts-compositions-scenarios.md#cells-and-the-matrix) of a composition's matrix, a walk, one recorded [answer](evidence.md#one-answer-per-question) or a record in the knowledge base. A walk is an example run through the model. The mapping says whether the target supports the claim, challenges it or illustrates it, and why.

Harbor's Control composition wires together a timelock, the vault it changes and an emergency path. Its behavior [Resolve a scheduled plan](../../qualification/fixture/dossiers/compositions/control/behaviors/resolve-plan.md#resolve-a-scheduled-plan) explains what becomes of a plan once Governance, the key that schedules Harbor's plans, has scheduled it. The agent runs `dossier where compositions/control#resolve-plan`, or you do, and it prints the behavior's claims. These are two of its four:

```
compositions/control#resolve-plan: Resolve a scheduled plan
  C1: Every scheduled plan must resolve within three ticks even when the public executor is offline. — contradicted within the stated scope; model; current
    M1 challenges cell N1 × executor-offline; assessed; current
  C2: With the public executor prompt and the chain ticking, scheduled plans resolve within three ticks. — supported within the stated scope; model; current
    M1 supports cell N1 × all-honest; assessed; current
```

C1 is a requirement. Its mapping names the cell where the property N1 was tried with the executor offline, and there a checker found a path that breaks it. C2 describes what holds while the public, which stands for anyone at all, executes a ready plan promptly. Each claim's line ends with its standing, its scope and whether its evidence is current.

A behavior defines no states and no rules of its own. `prose.md` holds the formal specification, the states, events, moves, properties and walks that the checkers read. A behavior explains that specification to a reader and points into it. [Parts, compositions and scenarios](parts-compositions-scenarios.md) describes those pieces.

## What rests on a claim

The rest of a dossier depends on its behaviors and claims in these ways.

| What | How it depends on them |
| --- | --- |
| Reading | The orientation gives the reading order. `dossier verify` counts each dossier's claims by standing. Each ledger, the rendered table of a dossier's results, and the [explorer](../how-to/open-the-explorer.md) open with the behaviors and their claims. All three read one derived report. |
| Work | The agent turns a request into a claim with a stated scope before anything runs. A request that names no claim gets a proposed scope first. |
| Standing | Verify derives one standing for each claim from its mappings, the current answers and the current reviews. No file holds a `verified` flag. |
| Review | An independent review takes one behavior or the whole dossier as its subject. It assesses every mapping and binds each claim by its digest. |
| Change | A reworded claim loses its own assessments, and the other claims keep theirs. A lapsed answer makes the claims mapped to it stale. |
| The record | Publication, the step that writes a check's answer into the record, keeps an answer while a current mapping still needs it. |
| Gaps | The report lists the passages, cells, walks and scenarios that no behavior maps to. The explorer shows them under No behavior. |

Some things do not depend on them. A [mark](../reference/marks.md), the result on one passage, is computed from the recorded answers whether or not a claim maps to that passage. An owner's decision applies to the passage or the cell it names, never to a claim. Removing a behavior removes no evidence by itself, though publication may then let go of an answer that only one of its mappings kept.

Every part and every composition has a collection. An empty one is valid and explains nothing yet. A collection that the tool cannot parse makes verify fail with `invalid behavior collection`, and none of its claims counts as supported until it parses again.

## How a claim earns its standing

A claim's standing is verify's summary of its support. [Marks](../reference/marks.md#claim-standing) defines each one.

A new claim is a **hypothesis**. It needs no evidence and no mapping to be written down, so a question can be recorded before anyone knows its answer. Harbor's Timelock keeps one:

```
  C3: A cancelled plan can be replaced by scheduling and successfully executing another plan. — hypothesis; model; current
```

No walk in the Timelock shows that path yet.

Once a mapping names a target whose current answer is in the claim's favor, the claim reads **evidence available; mapping unreviewed**. The agent wrote the mapping, and nobody independent has judged it.

A claim reads **supported within the stated scope** only when all of these hold:

- A current mapping supports it, and a current independent review assessed that mapping `supported`.
- The recorded evidence establishes the statement as it is worded.
- Every pinned record and every target the claim depends on resolves.
- No current answer or assessment contradicts it, and no assessment is disputed.

A claim reads **contradicted** when a current review confirms evidence against it. It reads **contested** when current assessments or current answers disagree.

A standing never says more than its evidence. A walk shows one path. A bounded check covers its stated reach. A proof is about the model. A claim about the source or about a deployment also needs a record in the knowledge base that backs it, and a review of that mapping. [Three kinds of tool](three-kinds-of-tool.md) explains why these stay apart.

The report keeps four things side by side and never merges them: the evidence with its reach, whether that evidence is current, the reviewer's assessment and the owner's decision. In Harbor, the owner accepted the risk of the missed deadline in the cell N1 × executor-offline, and the cell reads `violated, accepted`. The claim C1 still reads contradicted, since accepting a risk does not make the requirement hold.

## What a person does with them

- **Read in order.** The orientation and the behaviors say what the system does before any formal sentence. [Read a dossier](../how-to/read-a-dossier.md) gives the route from a claim down to a trace.
- **Ask in claims.** A question about the system becomes a claim, which stays a hypothesis until evidence and a review support it. [Write a behavior](../how-to/write-a-behavior.md) gives the steps.
- **Judge at the stated scope.** A claim says whether it is about the model, the source or a deployment, and its standing holds for that scope alone.
- **Decide on passages and cells.** You accept or reject formal passages, and you accept risks on cells. No decision accepts or rejects a claim, since a claim's standing comes from its evidence and its review. [Record a decision](../how-to/record-a-decision.md) lists the forms.

## What an agent does with them

- **Starts from them.** In a new session the agent runs `dossier verify`, then opens the dossier's orientation and the behavior the request concerns. Only then does it follow a claim's mappings into the specification and the evidence. It needs no notes from an earlier session.
- **Addresses them.** `parts/timelock#cancel-plan/C1` names one claim, and `/M1` after it names one of its mappings. `dossier where` takes such an address and prints the claim with its standing.
- **States the question first.** The agent states the claim, or the question that is not yet a claim, with its scope before a check runs. The answer is then read against words that were fixed beforehand.
- **Reports by claim.** A reply ends with what each claim it touched now establishes. It keeps the kind of evidence, the scope, the freshness, the review's assessment and your decision apart.
- **Does not grade its own work.** The agent writes the claims and the mappings. It never calls a claim supported, which takes an independent review in a fresh context.

The agent's instructions for this are [one process](../../spec/process.md) and the `keep` skill, which [Commands and skills](../reference/commands.md#skills) lists.

## What a behavior does not establish

- One supported claim does not verify its behavior, and a collection of supported claims does not verify the system.
- A mapping is the agent's interpretation, and a review of it can be incomplete or wrong.
- The list of what no behavior maps to covers the model. It does not show that the source is explained in full.
- A behavior that reads well grants nothing. Evidence is a recorded answer or a record in the knowledge base.

[The limits of a mark](limits.md#behavior-collections) says more. The [behavior contract](../../spec/behaviors.md) defines every rule on this page, and [Files](../reference/files.md#behavior-collections-and-reviews) shows the fields of each file.
