Observed: TypeOK: holds; N1: holds.

Scope: stale up to 3; price and last up to 4; clock up to 2; effects up to 4. Scenario: lanes-down-one. Recorded values: {"MaxSent":4,"Mode_chain":"honest","Mode_lane_a":"offline","Mode_lane_b":"offline","From_lane_a":0,"Until_lane_a":1,"From_lane_b":0,"Until_lane_b":1,"Start_oracle_state":"Fresh","Start_oracle_stale":0}.

Both lanes are offline only while the clock is below 1. The first tick ends that window and a prompt lane can refresh before another tick; this does not cover a two-tick outage.

TLC checked the recorded finite model and configuration. This is bounded evidence, not an inductive proof or a claim that the deployed contracts implement the abstraction.

This reading interprets this answer; current freshness, coverage and owner acceptance remain the verifier's separate judgments.
