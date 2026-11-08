Observed: TypeOK: holds; A3: holds.

Scope: amounts up to 2; debt, free, issued, held and supply up to 4; effects up to 4. Scenario: user-malicious. Recorded values: {"MaxSent":4,"Mode_holder":"malicious","Mode_user":"malicious"}.

The property equates Adapter held credit with Token supply. Wiring changes the two together. The strengthened invariant also carries Vault conservation; it does not model who holds the tokens.

TLC checked the recorded finite model and configuration. This is bounded evidence, not an inductive proof or a claim that the deployed contracts implement the abstraction.

This reading interprets this answer; current freshness, coverage and owner acceptance remain the verifier's separate judgments.
