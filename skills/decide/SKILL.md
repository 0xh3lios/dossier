---
name: decide
description: Record one of the owners' decisions on a dossier in their own words. Accept passages, reject one with a reason, give a doubt's answer, accept the risk on a violated cell, forget a recorded answer, begin or retire a dossier. The owner invokes it with the dossier, the verb and its arguments, then their words after --, such as decide timelock accept S1 -- "the delay as deployed". The words pass through untouched.
argument-hint: <component|system> accept|reject|answer|risk|forget|begin|retire ... -- "<words>"
disable-model-invocation: true
allowed-tools: Bash(dossier *)
---

# Decide

`dossier` is [`bin/dossier`](../../bin/dossier) at the root of this plugin. Where it is not on the PATH, run it by that path.

Run exactly this, with the arguments untouched:

    dossier decide $ARGUMENTS

Then run:

    dossier verify --brief

Print both outputs verbatim. Add no words of your own to the decision. If the tool refuses, show its reason and stop.

Decision effects and refusal rules are defined in [the evidence contract](../../spec/evidence.md#the-owners-column). This entrypoint passes through the owner's instruction; it does not authorize additional decisions.
