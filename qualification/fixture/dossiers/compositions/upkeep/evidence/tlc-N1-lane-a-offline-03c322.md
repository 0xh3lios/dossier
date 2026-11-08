Observed: TypeOK: holds; N1: holds.

Scope: stale up to 3; price and last up to 4; clock up to 2; effects up to 4. Scenario: lane-a-offline. Recorded values: {"MaxSent":4,"Mode_chain":"honest","Mode_lane_a":"offline","Mode_lane_b":"honest","From_lane_a":0,"Until_lane_a":0,"From_lane_b":0,"Until_lane_b":0,"Start_oracle_state":"Fresh","Start_oracle_stale":0}.

Lane B remains available and prompt while lane A is offline; the result depends on B's assumption.

TLC checked the recorded finite model and configuration. This is bounded evidence, not an inductive proof or a claim that the deployed contracts implement the abstraction.

This reading interprets this answer; current freshness, coverage and owner acceptance remain the verifier's separate judgments.
