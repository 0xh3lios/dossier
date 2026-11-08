Observed: TypeOK: holds; A2: holds.

Scope: amounts up to 2; debt, free, issued, held and supply up to 4; effects up to 4. Scenario: user-malicious. Recorded values: {"MaxSent":4,"Mode_holder":"malicious","Mode_user":"malicious"}.

The property equates Token supply with Vault issued credit. Wiring credits and mints, or releases and burns, in the same modeled step; the proof relies on that transaction abstraction. The strengthened invariant also carries Vault conservation.

TLC checked the recorded finite model and configuration. This is bounded evidence, not an inductive proof or a claim that the deployed contracts implement the abstraction.

This reading interprets this answer; current freshness, coverage and owner acceptance remain the verifier's separate judgments.
