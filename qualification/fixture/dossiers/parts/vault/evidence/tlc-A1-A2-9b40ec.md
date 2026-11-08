Observed: TypeOK: holds; A1: holds; A2: holds.

Scope: amounts up to 2; debt, free, issued up to 4; ceiling 2..4. Recorded values: {"MaxSent":4}.

Borrow and repay change debt and credit together, move and release transfer credit between free and issued, and borrow respects the ceiling. This abstraction omits governance lowering the ceiling; a successful check does not resolve the rejected K4.

TLC checked the recorded finite model and configuration. This is bounded evidence, not an inductive proof or a claim that the deployed contracts implement the abstraction.

This reading interprets this answer; current freshness, coverage and owner acceptance remain the verifier's separate judgments.
