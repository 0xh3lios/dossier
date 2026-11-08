Observed: Inv_A3_lemma: holds.

Scope: unbounded; TypeOK, A1 and A3 inductive. Scenario: all-honest. Recorded values: {"inductive":1}.

The property equates Adapter held credit with Token supply. Wiring changes the two together. The strengthened invariant also carries Vault conservation; it does not model who holds the tokens.

Both stored base and step checks pass for the named invariant under the recorded constant initialization and TypeOK restrictions. This is induction over that model, not an unbounded claim about every deployment or unrelated property.

This reading interprets this answer; current freshness, coverage and owner acceptance remain the verifier's separate judgments.
