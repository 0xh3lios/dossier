Observed: TypeOK: holds; A1: holds.

Scope: delay 2; amounts up to 2; ceiling 2..4; effects up to 4. Scenario: executor-offline. Recorded values: {"MaxSent":4,"Mode_chain":"honest","Mode_governance":"honest","Mode_public":"offline","Mode_user":"honest"}.

The property checks that timelock.early stays false. It does not establish that every possible governance change is delayed; the encoded plan and Vault change are narrower than that claim.

TLC checked the recorded finite model and configuration. This is bounded evidence, not an inductive proof or a claim that the deployed contracts implement the abstraction.

This reading interprets this answer; current freshness, coverage and owner acceptance remain the verifier's separate judgments.
