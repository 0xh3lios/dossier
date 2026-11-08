Observed: Inv_A2_lemma: holds.

Scope: unbounded; TypeOK, A1 and A2 inductive. Scenario: all-honest. Recorded values: {"inductive":1}.

The property equates Token supply with Vault issued credit. Wiring credits and mints, or releases and burns, in the same modeled step; the proof relies on that transaction abstraction. The strengthened invariant also carries Vault conservation.

Both stored base and step checks pass for the named invariant under the recorded constant initialization and TypeOK restrictions. This is induction over that model, not an unbounded claim about every deployment or unrelated property.

This reading interprets this answer; current freshness, coverage and owner acceptance remain the verifier's separate judgments.
