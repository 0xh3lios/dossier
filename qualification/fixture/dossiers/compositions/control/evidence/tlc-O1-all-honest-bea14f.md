Observed: O1: holds.

Scope: delay 2; effects up to 4. Scenario: all-honest. Recorded values: {"MaxSent":4,"Mode_chain":"honest","Mode_governance":"honest","Mode_public":"honest","Mode_user":"honest"}.

The property checks eventual return to Idle after Scheduled under the encoded fairness assumptions. Those assumptions and the modeled free Vault sends require separate justification.

TLC checked the recorded finite model and configuration. This is bounded evidence, not an inductive proof or a claim that the deployed contracts implement the abstraction.

Checker warnings:
- Declaring state or action constraints during liveness checking is dangerous: Please read section 14.3.5 on page 247 of Specifying Systems (https://lamport.azurewebsites.net/tla/book.html) and optionally the discussion at https://discuss.tlapl.us/msg00994.html for more details.

In particular, a state-constrained liveness run must not be generalized to unconstrained behavior.

This reading interprets this answer; current freshness, coverage and owner acceptance remain the verifier's separate judgments.
