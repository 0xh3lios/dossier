# Prose language

Component prose defines the behavior its chart and models encode. A system also has authored composition and actor inputs, defined in [Composition](composition.md). The compiler reads the forms below. An unreadable form is a compile error, reported with the line and expected form.

## Shape

Example `component-shape`. Grammar template with placeholders; not a complete component.

```
# <Name>

Tier: charted | modeled
Module: <module id in the knowledge base>
Pins: <module#observation:name>, <module#contract:id>

<Boundary: a paragraph with declaration sentences>

## States          S
## Events          E
## Moves           M, R
## Always          A
## Once            O
## Within          N
## Given           G
## Walks           W
## Seams           X
## Guarantees      K
## Words only      T
## Retired
```

The `# <Name>` line is required in a component, and the name holds at least one letter, because it names the component's TLA+ module. A system's title is optional, since its module is named from its id.

`Module:` names the module the component abstracts in the knowledge base. `dossier decide <id> begin` writes the component's own id there; `dossier import` writes the imported module's id.

A passage is one paragraph that begins with its id in square brackets. Its hash is the hash of its text after the id, whitespace collapsed. A decision names a passage as `id@hash`, and an answer's basis records the hash of each passage. A changed passage keeps its id and gets a new hash. A removed one keeps its id under Retired with the date and the reason. An id is never reused.

## The boundary

Free text plus sentences the compiler reads:

Example `boundary-forms`. Grammar alternatives with placeholders; not declaration sentences to compile literally.

```
It holds <name>, a count from <a> to <b>[, starting at <n>].
It holds <name>, a flag[, starting set].
It holds <name>, an amount of <Unit> up to <n>.
It holds <name>, one of <A>, <B> or <C>[, starting at <B>].
It sends <effect> to <Receiver>[, carrying <name>[, <name>]].
It sends <effect> to <Receiver> and <effect> to <Receiver>.
```

Data names are lower case letters, digits and underscores. A count starts at its minimum, a flag clear, an enum at its first value, unless `starting` says otherwise. Ranges are the reach of the chart's checks. Keep them small enough to explore and large enough that every move fires and every walk completes. Bounds and starting values are whole numbers, the smaller bound first, and a starting value lies within its type: inside the range, `set` or `clear` for a flag, one of the listed values for a choice. A count or an amount spans at most 1000, as from 0 to 1000. An event's fields take at most 10000 combinations of values together. A declaration past either cap is a compile error. An effect that carries fields binds them by name to the fields of the event it is wired to.

## The kinds and their forms

**S, States.** `Name: what is true while the piece is in it.` A final state ends with `Final.` The first S passage is the initial state. A compound state adds `Within it, it is either A or B; it starts A.` and its children are passages named `Parent.Child`. A parallel state adds `Within it, it is both X and Y.` and each region is a compound child. A State's cover says the state is reached. What is true in it goes in an Always.

**E, Events.** `name, from <Sender>: what it means.[ Carries <field>, <type phrase>[; <field>, <type phrase>].][ Refusal only.]` A name starts with a lower case letter and may hold digits, underscores and hyphens. A sender is a component or an actor. The sender resolves first to a component by its id, so `the Adapter` names the component `adapter`, and otherwise to an actor declared in `actors/actors.md` by id or name. A component sender has no mode. Its sends happen when its moves allow them. An event whose sender is an actor of kind `chain` is a tick, whatever its name, and the name `tick` decides only when no actors file resolves the sender. `the public` is the actor that stands for anyone at all.

An Event that ends with `Refusal only.` is an input that must never succeed, such as a collection by someone who does not own the token. No Move may accept it. Exactly one Refusal must cover it in every reachable state for every value of its fields, and a passing Walk must attempt it as refused. A state with no move for the event is silence, not a refusal, so the chart asks for both. This is checked over the declared ranges and says nothing of how the deployed code authorizes a call.

A sender id is its name lower-cased, with a leading `the` dropped and each run of other characters replaced by one hyphen: `the Adapter` becomes `adapter`, and `lane A` becomes `lane-a`. This normalization is shared by declaration and resolution.

**M, Moves.** `When <State> receives <event>[ and <condition>], it becomes|stays <State>[, <clause>]*.` Clauses, separated by commas and `and`: `with <name> <value>`, `<name> grows by <value>`, `<name> drops by <value>`, `<name> becomes <value>`, `<flag> is set`, `<flag> is cleared`, `{<name> := <expr>}`, `sends <effect>`.

**R, Refusals.** `In <State>[, <State> and <State>], <event>[, <event> and <event>] is|are refused[, sends <effect>][ when <condition>].` `every event` names them all. Every pair of state and event is covered by exactly one Move or one unconditional Refusal. A pair with a guarded Move needs a Refusal `when` the guard is false, or the chart reports the gap. A pair with neither is `unsaid`. One with both an unconditional Refusal and a Move, or with two unconditional Refusals, is `said twice`.

**A, Always.** `Always[, while <State>], <condition>[, given G<n>[ and G<m>]].` Without a Given, the chart checks it on every explored snapshot with no Given in force. With a Given, it cites only step Givens, those with `prompt` or `only when`. The chart skips it, and the solvers check it under scenarios. It stays `pending` until a model answer covers it, and it still owes a blunder. In a charted piece, which runs no model trials, it is `untried`. Citing a Given with neither is `misnamed`. `Always, in structure, <words>.` is a structural claim for Alloy, named by its id in the module, and the chart skips it.

**O, Once.** `Once <trigger>, eventually <goal>, given G<n>[ and G<m>].` A trigger or goal is a state name or a condition.

**N, Within.** `Within <k> ticks of <trigger>, <goal>, given G<n>[ and G<m>].`, with `tick` for one. It is a bounded response. From the moment the trigger holds, the goal holds before more than k ticks pass with the trigger still holding. The ticks are the events the chain sends.

For the implemented Within counter, the initial value is 0. A transition resets it to 0 when its resulting state satisfies the goal or no longer satisfies the trigger. Otherwise a chain tick increments it, saturating at `k + 1`; another event leaves it unchanged. The property requires the counter to be at most `k`. For `Within 3`, remaining unresolved after three counted ticks is still within the bound; a fourth such tick violates it. This convention is distinct from requiring completion in the state immediately after tick three. If the owner intends that stricter deadline, record the ambiguity before changing the passage or model.

**G, Given.** `Given that <text>. If this is false, <text>.[ Actor: <Actor>[, on <event>][, prompt][, only when <condition>].]` The clauses come in that order. The actor is declared in `actors/actors.md`. A Given that names a component, in a component's prose or a system's, is the tripwire `Given names a component`, since a rely on a component is a Guarantee or a wiring. `on <event>` names one event the actor sends, `component.event` in a system. `prompt` and `only when` each require `on`. `only when` is a condition over the component's data and the event's fields, `component.data` in a system. While the actor is honest:

- A Given without `only when` is fairness on its moves, scoped to the event when `on` is present.
- `prompt` also keeps the chain from ticking while a move of that event is enabled.
- `only when` restricts its moves of that event to the condition, and adds no fairness unless `prompt` is also present.

A malicious actor drops all of it, and an offline one sends nothing. A Given that names an event its actor does not send, or that no Event passage declares, is `misnamed`. Harbor's Timelock has a prompt Given, and its Oracle an `only when` Given:

Example `given-fragments`. Two independent excerpts; each must match its cited Harbor passage and compile in its own component.

```
[G1] Given that someone executes the plan as soon as its delay is out. If this is false, N1 and O1 are void. Actor: the public, on execute, prompt.
[G3] Given that lane A moves the price by at most one step per post. If this is false, A2 is void. Actor: lane A, on post-a, only when {value + 1 >= price and value <= price + 1}.
```

**W, Walks.** `Walk <Name>: from <State>[ with <name> <value>], <event>[ <field> <value>], <event> refused, ...; ends <State>[ with <name> <value>, <name> <value>][; <effect> sent <n> times][; <effect> sent once][; <effect> not sent][; sends <effect>, <effect>].` The clauses after `ends <State>` are separated by semicolons. `sent <n> times` and `sent once` say how often the walk sends an effect, `not sent` says it never does, and `sends <effect>, <effect>` counts one send of each effect it names. A component's walk names no scenario. A system's walk names members' states and events as `component.State` and `component.event`, and the scenario it runs under, as `Walk <Name>[ under <scenario>]: from <component>.<State>, <component>.<event>, ...; ends <component>.<State>.` Nothing may follow its end state. [compose.md](composition.md) says how it is tried.

**X, Seams.** `Seam with <component>: <text>.` The other dossier holds the same text after the colon under its own `Seam with`, or the seam is owed.

**K, Guarantees.** `<claim>. Backing: certora <spec path>#<rule> at <commit>.` | `Backing: record <module#type:id>.` | `Backing: file <path>#<rule>.` | `Backing: external <runner>.` | `Backing: none.` The spec path is relative to a commit cache the module records in `codebases.md`. The commit is the full hash or its first and last four hex characters, and an abbreviation must select a single cache. A record is a typed reference into the knowledge base, such as a recorded invariant. A file path is relative to the knowledge root, and the rule is a line or a heading in it.

**T, Words only.** What the method cannot check, each saying why. Absence is stated here: `This piece promises nothing eventual.`

## Conditions and values

A condition is atoms joined by `and`: `<name> is <value>`, `is not`, `is below`, `is above`, `is at least`, `is at most`, `<flag> is set`, `<flag> is clear`, or `{<expr>}`. A value is an integer, a number word up to ten, an enum literal, a data name or an event field. Inside braces: identifiers, integers, `+ - *`, `div`, `mod`, `< <= = != > >=`, `and`, `or`, `not`, parentheses, `true`, `false`. The same expression prints as a JS guard, as TLA+, and as the label the chart's messages and the explorer show.

## Writing rules

- One claim per passage. If `and` joins two claims that could be checked apart, split them.
- One spelling across prose, chart, model and composition. The compiler reports a name no passage declares.
- No `should`, `usually`, `typically`. Say what is, under what condition.
- Bounds are numbers. No clock time. Blocks are ticks from the chain, and durations are counts of them.
- Every event names its sender. Actors send what they like, whenever they like, unless a Given says otherwise. The scenarios decide which Givens hold.
- A Given names the event it is about with `on` whenever its fairness or promptness belongs to one event.
- A bound on what an actor sends, such as a price step, is an `only when` Given, cited by the Always that needs it.
- When a model or a composition needs something the prose lacks, the prose gets a passage first.

## Doubts

A passage that can be read two ways gets a doubt in `doubts.md`, posed as two walks that differ, never as a query about a model:

Example `doubt-entry`. A complete doubt with two alternatives. Parsing it settles nothing.

```
## D1
on: M3
assumed: a
Whether a stale price older than three blocks is still a price at all.
Walk a: from Stale, tick, tick, tick, post-a; ends Fresh with stale 0.
Walk b: from Stale, tick, tick, tick; ends Stale and the price is void until a post.
Assumed a, because the Vault reads the price regardless of its age.
```

The header is the id alone. `on:` and `assumed:` follow, then both walks. A doubt is open until the owner's `answer D<n> a|b` decision closes it. No line in `doubts.md` records that, and a `status:` line makes the doubt a `malformed doubt`. Assume one alternative, draw and encode it, and continue. The passages the doubt is on cannot be sealed while it is open. [Decision semantics](evidence.md#the-owners-column) defines how changed alternatives invalidate a doubt's answer.

## After a reject

`dossier decide <dossier> reject M4 -- "<reason>"` makes M4 rejected and the next step Write. Rewrite the passage under its id. When the reason rests on an interpretation the walks contradict, do not rewrite: retell the walk beside the passage, leave it rejected, and ask. That is a stop of the first kind.
