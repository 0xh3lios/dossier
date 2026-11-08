Observed: TypeOK: holds; N1: holds.

Scope: delay 2; amounts up to 2; ceiling 2..4; effects up to 4. Scenario: all-honest. Recorded values: {"MaxSent":4,"Mode_chain":"honest","Mode_governance":"honest","Mode_public":"honest","Mode_user":"honest"}.

The property checks the encoded deadline counter under this scenario. A prompt executor prevents a tick while execution is due; this result cannot be transferred to executor-offline or used to prove that the owner's intended real-time deadline has the same endpoint.

TLC checked the recorded finite model and configuration. This is bounded evidence, not an inductive proof or a claim that the deployed contracts implement the abstraction.

This reading interprets this answer; current freshness, coverage and owner acceptance remain the verifier's separate judgments.
