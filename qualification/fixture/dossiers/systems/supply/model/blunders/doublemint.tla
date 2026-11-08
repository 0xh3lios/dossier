-------------------------- MODULE doublemint --------------------------
\* Composed by dossier from vault, adapter, token: their moves, wired where one's effect is another's event,
\* with every actor's mode a constant. Properties are the system's passages.
EXTENDS Naturals

CONSTANTS
  \* @type: Int;
  MaxSent,
  \* @type: Str;
  Mode_holder,
  \* @type: Str;
  Mode_user
ConstInit_all_honest == MaxSent = 4 /\ Mode_holder = "honest" /\ Mode_user = "honest"
ConstInit_user_malicious == MaxSent = 4 /\ Mode_holder = "malicious" /\ Mode_user = "malicious"

VARIABLES
  \* @type: Str;
  vault_state,
  \* @type: Int;
  vault_debt,
  \* @type: Int;
  vault_free,
  \* @type: Int;
  vault_issued,
  \* @type: Int;
  vault_ceiling,
  \* @type: Str;
  adapter_state,
  \* @type: Int;
  adapter_held,
  \* @type: Bool;
  adapter_live,
  \* @type: Int;
  adapter_sent_move,
  \* @type: Int;
  adapter_sent_release,
  \* @type: Int;
  adapter_sent_mint,
  \* @type: Int;
  adapter_sent_burn,
  \* @type: Str;
  token_state,
  \* @type: Int;
  token_supply,
  \* @type: Int;
  w1_at
vars == <<vault_state, vault_debt, vault_free, vault_issued, vault_ceiling, adapter_state, adapter_held, adapter_live, adapter_sent_move, adapter_sent_release, adapter_sent_mint, adapter_sent_burn, token_state, token_supply, w1_at>>

Init ==
  /\ vault_state = "Open"
  /\ vault_debt = 0
  /\ vault_free = 0
  /\ vault_issued = 0
  /\ vault_ceiling = 2
  /\ adapter_state = "Open"
  /\ adapter_held = 0
  /\ adapter_live = TRUE
  /\ adapter_sent_move = 0
  /\ adapter_sent_release = 0
  /\ adapter_sent_mint = 0
  /\ adapter_sent_burn = 0
  /\ token_state = "Live"
  /\ token_supply = 0
  /\ w1_at = 0

Can_vault_M1_Borrow == \E amount \in 0..2 : vault_state = "Open" /\ ((vault_debt + amount) <= vault_ceiling)
Can_vault_M2_Repay == \E amount \in 0..2 : vault_state = "Open" /\ ((amount <= vault_free) /\ (amount <= vault_debt))
Can_vault_M3_Move == \E amount \in 0..2 : vault_state = "Open" /\ (amount <= vault_free)
Can_vault_M4_Release == \E amount \in 0..2 : vault_state = "Open" /\ (amount <= vault_issued)
Can_vault_M5_Change == vault_state = "Open" /\ (vault_ceiling < 4)
Can_vault_M6_Change == vault_state = "Open" /\ (vault_ceiling = 4)
Can_adapter_M1_Exit == \E amount \in 0..2 : adapter_state = "Open" /\ ((adapter_held + amount) <= 4) /\ ((vault_state = "Open" /\ (amount <= vault_free))) /\ ((token_state = "Live" /\ ((token_supply + amount) <= 4)))
Can_adapter_M2_Enter == \E amount \in 0..2 : adapter_state = "Open" /\ (amount <= adapter_held) /\ ((token_state = "Live" /\ (amount <= token_supply))) /\ ((vault_state = "Open" /\ (amount <= vault_issued)))
Can_adapter_M3_Enter == \E amount \in 0..2 : adapter_state = "Halted" /\ (amount <= adapter_held) /\ ((token_state = "Live" /\ (amount <= token_supply))) /\ ((vault_state = "Open" /\ (amount <= vault_issued)))
Can_adapter_M4_Halt == adapter_state = "Open"
Can_token_M1_Mint == \E amount \in 0..2 : token_state = "Live" /\ ((token_supply + amount) <= 4)
Can_token_M2_Burn == \E amount \in 0..2 : token_state = "Live" /\ (amount <= token_supply)
Can_token_M3_Transfer == token_state = "Live"

vault_M1_Borrow ==                                   \* vault M1
  \E amount \in 0..2 :
    /\ vault_state = "Open"
    /\ ((vault_debt + amount) <= vault_ceiling)
    /\ vault_state' = vault_state
    /\ vault_debt' = (vault_debt + amount)
    /\ vault_free' = (vault_free + amount)
    /\ UNCHANGED <<vault_issued, vault_ceiling, adapter_state, adapter_held, adapter_live, adapter_sent_move, adapter_sent_release, adapter_sent_mint, adapter_sent_burn, token_state, token_supply>>
    /\ w1_at' = IF (vault_state = "Open") /\ amount = 2 THEN 1 ELSE 0

vault_M2_Repay ==                                   \* vault M2
  \E amount \in 0..2 :
    /\ vault_state = "Open"
    /\ ((amount <= vault_free) /\ (amount <= vault_debt))
    /\ vault_state' = vault_state
    /\ vault_debt' = (vault_debt - amount)
    /\ vault_free' = (vault_free - amount)
    /\ UNCHANGED <<vault_issued, vault_ceiling, adapter_state, adapter_held, adapter_live, adapter_sent_move, adapter_sent_release, adapter_sent_mint, adapter_sent_burn, token_state, token_supply>>
    /\ w1_at' = 0

\* vault_M3_Move is reached through wiring only

\* vault_M4_Release is reached through wiring only

vault_M5_Change ==                                   \* vault M5
  /\ vault_state = "Open"
  /\ (vault_ceiling < 4)
  /\ vault_state' = vault_state
  /\ vault_ceiling' = (vault_ceiling + 1)
  /\ UNCHANGED <<vault_debt, vault_free, vault_issued, adapter_state, adapter_held, adapter_live, adapter_sent_move, adapter_sent_release, adapter_sent_mint, adapter_sent_burn, token_state, token_supply>>
  /\ w1_at' = 0

vault_M6_Change ==                                   \* vault M6
  /\ vault_state = "Open"
  /\ (vault_ceiling = 4)
  /\ vault_state' = vault_state
  /\ UNCHANGED <<vault_debt, vault_free, vault_issued, vault_ceiling, adapter_state, adapter_held, adapter_live, adapter_sent_move, adapter_sent_release, adapter_sent_mint, adapter_sent_burn, token_state, token_supply>>
  /\ w1_at' = 0

adapter_M1_Exit ==                                   \* adapter M1
  \E amount \in 0..2 :
    /\ adapter_state = "Open"
    /\ ((adapter_held + amount) <= 4)
    /\ adapter_state' = adapter_state
    /\ adapter_held' = (adapter_held + amount)
    /\ adapter_sent_move' = adapter_sent_move + 1
    /\ adapter_sent_mint' = adapter_sent_mint + 1
    /\ (vault_state = "Open" /\ (amount <= vault_free) /\ vault_state' = vault_state /\ vault_free' = (vault_free - amount) /\ vault_issued' = (vault_issued + amount) /\ UNCHANGED <<vault_debt, vault_ceiling>>)
    /\ (token_state = "Live" /\ ((token_supply + amount) <= 4) /\ token_state' = token_state /\ token_supply' = (token_supply + amount + amount))
    /\ UNCHANGED <<adapter_live, adapter_sent_release, adapter_sent_burn>>
    /\ w1_at' = IF w1_at = 1 /\ amount = 2 THEN 2 ELSE 0

adapter_M2_Enter ==                                   \* adapter M2
  \E amount \in 0..2 :
    /\ adapter_state = "Open"
    /\ (amount <= adapter_held)
    /\ adapter_state' = adapter_state
    /\ adapter_held' = (adapter_held - amount)
    /\ adapter_sent_burn' = adapter_sent_burn + 1
    /\ adapter_sent_release' = adapter_sent_release + 1
    /\ (token_state = "Live" /\ (amount <= token_supply) /\ token_state' = token_state /\ token_supply' = (token_supply - amount))
    /\ (vault_state = "Open" /\ (amount <= vault_issued) /\ vault_state' = vault_state /\ vault_issued' = (vault_issued - amount) /\ vault_free' = (vault_free + amount) /\ UNCHANGED <<vault_debt, vault_ceiling>>)
    /\ UNCHANGED <<adapter_live, adapter_sent_move, adapter_sent_mint>>
    /\ w1_at' = IF w1_at = 2 /\ amount = 1 THEN 3 ELSE 0

adapter_M3_Enter ==                                   \* adapter M3
  \E amount \in 0..2 :
    /\ adapter_state = "Halted"
    /\ (amount <= adapter_held)
    /\ adapter_state' = adapter_state
    /\ adapter_held' = (adapter_held - amount)
    /\ adapter_sent_burn' = adapter_sent_burn + 1
    /\ adapter_sent_release' = adapter_sent_release + 1
    /\ (token_state = "Live" /\ (amount <= token_supply) /\ token_state' = token_state /\ token_supply' = (token_supply - amount))
    /\ (vault_state = "Open" /\ (amount <= vault_issued) /\ vault_state' = vault_state /\ vault_issued' = (vault_issued - amount) /\ vault_free' = (vault_free + amount) /\ UNCHANGED <<vault_debt, vault_ceiling>>)
    /\ UNCHANGED <<adapter_live, adapter_sent_move, adapter_sent_mint>>
    /\ w1_at' = IF w1_at = 2 /\ amount = 1 THEN 3 ELSE 0

adapter_M4_Halt ==                                   \* adapter M4
  /\ adapter_state = "Open"
  /\ adapter_state' = "Halted"
  /\ adapter_live' = FALSE
  /\ UNCHANGED <<vault_state, vault_debt, vault_free, vault_issued, vault_ceiling, adapter_held, adapter_sent_move, adapter_sent_release, adapter_sent_mint, adapter_sent_burn, token_state, token_supply>>
  /\ w1_at' = 0

\* token_M1_Mint is reached through wiring only

\* token_M2_Burn is reached through wiring only

token_M3_Transfer ==                                   \* token M3
  /\ token_state = "Live"
  /\ token_state' = token_state
  /\ UNCHANGED <<vault_state, vault_debt, vault_free, vault_issued, vault_ceiling, adapter_state, adapter_held, adapter_live, adapter_sent_move, adapter_sent_release, adapter_sent_mint, adapter_sent_burn, token_supply>>
  /\ w1_at' = 0


Holder == (Mode_holder /= "offline") /\ (token_M3_Transfer)
HonestHolder == (Mode_holder = "honest") /\ Holder
User == (Mode_user /= "offline") /\ (vault_M1_Borrow \/ vault_M2_Repay \/ adapter_M1_Exit \/ adapter_M2_Enter \/ adapter_M3_Enter)
HonestUser == (Mode_user = "honest") /\ User
Breaker == adapter_M4_Halt   \* outside the composition
Timelock == vault_M5_Change \/ vault_M6_Change   \* outside the composition
Next == Holder \/ User \/ Breaker \/ Timelock

Spec == Init /\ [][Next]_vars

TypeOK ==
  /\ vault_state \in {"Open"}
  /\ vault_debt \in 0..4
  /\ vault_free \in 0..4
  /\ vault_issued \in 0..4
  /\ vault_ceiling \in 2..4
  /\ adapter_state \in {"Open", "Halted"}
  /\ adapter_held \in 0..4
  /\ adapter_live \in BOOLEAN
  /\ adapter_sent_move \in Nat
  /\ adapter_sent_release \in Nat
  /\ adapter_sent_mint \in Nat
  /\ adapter_sent_burn \in Nat
  /\ token_state \in {"Live"}
  /\ token_supply \in 0..4
  /\ w1_at \in 0..3
SentBounded == adapter_sent_move <= MaxSent /\ adapter_sent_release <= MaxSent /\ adapter_sent_mint <= MaxSent /\ adapter_sent_burn <= MaxSent

A1 == (vault_debt = (vault_free + vault_issued))
A2 == (token_supply = vault_issued)
A3 == (adapter_held = token_supply)
Inv_A1 == TypeOK /\ A1
Inv_A2 == TypeOK /\ A2
Inv_A3 == TypeOK /\ A3
W1_End == w1_at = 3 /\ (adapter_state = "Open")
NotW1 == ~W1_End
\* extras.tla, hand-written:
\* Lemmas for the inductive proofs: A1 bounds free by debt, which TypeOK alone does not.
Inv_A2_lemma == TypeOK /\ A1 /\ A2
Inv_A3_lemma == TypeOK /\ A1 /\ A3
======================================================================
