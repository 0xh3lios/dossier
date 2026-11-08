Observed: TypeOK: holds; A1: holds; A2: holds; N1: holds.

Scope: stale up to 3; price up to 4. Recorded values: {"MaxSent":4}.

A post enters Fresh with stale = 0 and records the previous price in last. The price band depends on the lanes' only-when assumptions, and freshness depends on a prompt lane. Neither assumption is a property of an arbitrary deployed keeper.

TLC checked the recorded finite model and configuration. This is bounded evidence, not an inductive proof or a claim that the deployed contracts implement the abstraction.

This reading interprets this answer; current freshness, coverage and owner acceptance remain the verifier's separate judgments.
