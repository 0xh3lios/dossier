\* Lemma for the inductive proof: the Vault's conservation bounds free by debt, which TypeOK alone does not.
Inv_A1_lemma == TypeOK /\ (vault_debt = vault_free + vault_issued) /\ A1
