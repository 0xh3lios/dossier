Observed: TypeOK: holds; N1: holds.

Scope: stale up to 3; price and last up to 4; clock up to 2; effects up to 4. Scenario: stale-start. Recorded values: {"MaxSent":4,"Mode_chain":"honest","Mode_lane_a":"honest","Mode_lane_b":"honest","From_lane_a":0,"Until_lane_a":0,"From_lane_b":0,"Until_lane_b":0,"Start_oracle_state":"Stale","Start_oracle_stale":3}.

The price begins three blocks stale with both lanes available. Promptness requires refresh before the next tick; passing the relative deadline does not mean the starting price was fresh.

TLC checked the recorded finite model and configuration. This is bounded evidence, not an inductive proof or a claim that the deployed contracts implement the abstraction.

This reading interprets this answer; current freshness, coverage and owner acceptance remain the verifier's separate judgments.
