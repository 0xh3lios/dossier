# Why model the system

A model of a system lets a model checker answer questions about the system as a whole, across its contracts, the procedures around them, and the people and machines that act on them. The model is useful only while it matches the system, so it has to be kept current as the system changes. An agent can now do most of the writing and the upkeep. Dossier is built around four conditions under which that work can be trusted.

## The four conditions

- **A checker decides each result.** The agent drafts the sentences and the models and runs the checks. Whether a property holds comes from a checker's output, and every [mark](../reference/marks.md) is computed from the record, never written by hand.
- **Every assumption is written down.** An assumption about an actor, such as a keeper acting within a block, is a Given. An assumption about the deployed code is a Guarantee, which names what backs it or says that nothing does. A fairness clause or a fact in a model must cite the sentence it comes from.
- **A result lapses when what it rested on changes.** Each result rests on a checker's answer, which records the sentences, files, records and backings it depended on. When any of them changes, the result lapses until the check is run again.
- **Meaning stays with the owners.** The owners are the people whose system it is. They settle the sentences, answer the agent's doubts and decide what each counterexample means.

## The system and its surroundings

Much of what happens to a system comes from outside its code. Key holders, keepers and the public send its transactions. Prices come from markets through oracles, and time comes from the chain. A procedure such as a multisig's signing process or a governance cycle has states of its own, and the people who run it act through events the contracts define.

A procedure is written in the same sentences as a contract, and the same checks cover it. Everything else that sends events into the model is an actor. An actor is a source that fails as a unit, such as a governance key, a keeper, a market or the chain. A scenario then decides, actor by actor, whether the assumptions about each one hold. Honest keeps them, malicious drops them, and offline removes the actor's steps.

Splitting the surroundings this way puts each assumption with the one source that can break it. A counterexample then names the actor behind the bad state, whether it acted or failed to, and a fix has to address that actor. A longer delay guards against a malicious key, and a second keeper against an outage. Had the counterexample blamed the environment as a whole, nobody would know what to change.

The checkers try every order in which the actors, the parts and the chain can move, within the bounds, including orders no test was written for. A failure can come from how the parts behave together while each does what it was written to do, so a property of the whole is checked against all of them at once.

The world around the code changes more often than the code. A signer is replaced, a parameter is voted through, a record is corrected. Each change lapses exactly the results that rested on it, and the agent reruns those.

The sentences describe a design, so a design can be checked before its code exists, while a fix still costs only an edit. A proposed change, such as a shorter delay or a new emergency path, can be checked under the same scenarios before it is made. Once the code exists, the model's example runs can be replayed against a fork of the deployment, which shows that the model and the code agree on those paths.

## Why an agent, and why a checker

TLC, Apalache and Alloy are free and have been capable for years. Models stayed rare because each one needed a person who could carry an owner's intent into sentences, the sentences into a model, and a checker's output back into a revision. That person also had to keep the model current as the system changed. A model written once and left alone goes stale, and its results go on reading as checked after the system has moved.

An agent takes on that work. It drafts the sentences and the models, configures and runs the checkers, reads the traces, keeps the record, and reruns whatever a change touched.

An agent drafts wrong things as fluently as right ones, so its work needs a judge that does not take its word. Tests an agent writes for its own code share the gaps in its understanding. A model checker is a judge of another kind. It tries the stated property against every behavior within its bounds and returns either a trace or nothing, whatever the agent expected. The agent proposes, the checker answers, and the answer decides what the agent does next.

Two judgments stay with people: what to model, and whether the model represents the system. No checker makes either. The owners' work moves from writing TLA+ to reviewing statements about their own system, settling what those statements mean and deciding what a counterexample shows.

## Where the risk moves

With an agent doing the work, the risk is no longer that no model exists. Four risks take its place.

- **Unchosen assumptions.** A model passes its checks more easily if it assumes that a keeper always acts or that a majority stays honest. An agent reaches for assumptions like these and says nothing about them unless the method makes it.
- **Weakened properties.** An agent that wants a check to pass can get there by loosening a guard, dropping a fairness assumption, narrowing a bound or rewording the property. Any one of these edits can look reasonable. Together they turn a failing property into a passing one that means less.
- **Forgotten results.** A surprising result can be rerun until it stops surprising, and once it does, nothing shows that it ever surprised.
- **Stale conclusions.** Once a parameter changes, an earlier result goes on reading as checked unless something marks it stale. An agent starting a later session has no way to know what moved since.

The record guards against each of them, and [How a claim earns its mark](evidence.md) describes how.

| Risk | What guards against it |
| --- | --- |
| Unchosen assumptions | Every assumption is a sentence the owners settle. An action, a fairness clause or a fact in a model with no sentence behind it fails verification. A restriction that verify does not read, such as a state constraint, is left to a second read. |
| Weakened properties | The expected outcome is written before each check runs. A property counts only after it catches a planted bug. A property reworded in a model, or an answer that records a smaller reach than the one it replaced, is flagged. A decision holds only for the words it was about. |
| Forgotten results | An answer that differs from the expectation fails verification until the agent classifies it, and no later answer replaces it before then. A violation stays on the record until something it rested on changes or the owners let it go. When a later answer does replace one, the record keeps the last answer whose outcome differed. An answer that goes missing fails verification until it is restored or the owners let it go. |
| Stale conclusions | A result lapses when anything it rested on changes. Lapse is computed from the files at every verification, so a later session sees what moved. |

## What stays with you

The agent carries on without you except where meaning is at stake. It stops and asks when a sentence needs settling, a doubt needs your choice, a counterexample needs a decision, or the sentences contradict each other. A decision on a counterexample can accept it as a risk, or let it go with `forget`. [What Dossier keeps](what-dossier-keeps.md#where-you-come-in) lists those decisions. Once a dossier owes nothing else, the agent asks you for a second read by the review skill. The sentences are a controlled English, so owners who do not read TLA+, such as a risk team, can review them. A counterexample comes back retold step by step.

You also judge whether the model represents the system, with backings and replays as evidence. Thorough checking cannot rescue a model of the wrong thing. [The limits of a mark](limits.md) lists what a result does not establish.

## The specification it leaves

The work leaves a specification of the whole system, which usually did not exist before. The owners can read it, the checkers keep checking it, and someone new to the system can learn it there. Lapse keeps it current as the system changes. Its properties are exact enough to drive a fuzzer or to monitor the deployed contracts. Either use would need a mapping from the deployed state to the model's variables, and Dossier does not provide one.

## Where it fits

The method fits a system whose surroundings act through an interface the model can name, such as contracts and the procedures around them, consensus, replication or a cloud control plane. It fits less well where people act outside any interface the model can name.

Protocols show the fit. Their governance, emergency powers and upkeep are procedures with states, run through events the contracts define, against an adversary with money at stake. Parameter changes and new modules pass through governance, so the changes that lapse a result are ones the team already watches. The chain's public log lets the model's example runs be replayed against a fork.
