# Prose

The [prose language specification](../../spec/language.md) owns the accepted forms and their meaning. Use it when authoring or interpreting passages. This reference is an index; it does not maintain another grammar. Prose is the formal specification. A dossier's [behaviors](../explanation/behaviors.md) explain it in words, and they are not written in these forms.

| Input | Contract |
| --- | --- |
| Part shape, stable ids, module and pins | [Shape](../../spec/language.md#shape) |
| Data declarations, ranges and effects | [The boundary](../../spec/language.md#the-boundary) |
| States, events, moves, refusals and properties | [Kinds and forms](../../spec/language.md#the-kinds-and-their-forms) |
| Conditions and expression syntax | [Conditions and values](../../spec/language.md#conditions-and-values) |
| Alternative interpretations | [Doubts](../../spec/language.md#doubts) |
| Composition properties and scenario-specific walks | [Composition prose](../../spec/composition.md#the-compositions-prose) |
| Actor identity, modes, windows and starts | [Actors and scenarios](../../spec/composition.md#actors-and-scenarios) |

To create a part, follow [Start a part](../how-to/start-a-part.md). A parser accepts a form; chart and model checks establish particular behavior under the declared bounds and assumptions.
