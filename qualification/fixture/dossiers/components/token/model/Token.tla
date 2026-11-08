---------------------------- MODULE Token ----------------------------
\* Scaffolded by dossier from the prose of Token. Every action and property
\* names the passage it encodes; refusals are the absent actions.
EXTENDS Naturals

CONSTANTS
  \* @type: Int;
  MaxSent                                        \* bounds the effect counters
ConstInit == MaxSent = 4

VARIABLES
  \* @type: Str;
  state,
  \* @type: Int;
  supply,
  \* @type: Int;
  w1_at
vars == <<state, supply, w1_at>>

States == {"Live"}   \* S1

Init ==                                           \* S1
  /\ state = "Live"
  /\ supply = 0
  /\ w1_at = 0

Can_M1_Mint == \E amount \in 0..2 : state = "Live" /\ ((supply + amount) <= 4)
Can_M2_Burn == \E amount \in 0..2 : state = "Live" /\ (amount <= supply)
Can_M3_Transfer == state = "Live"

M1_Mint ==                                 \* M1 on mint
  \E amount \in 0..2 :
    /\ state = "Live"
    /\ ((supply + amount) <= 4)
    /\ state' = state
    /\ supply' = (supply + amount)
    /\ w1_at' = IF state = "Live" /\ amount = 2 THEN 1 ELSE 0

M2_Burn ==                                 \* M2 on burn
  \E amount \in 0..2 :
    /\ state = "Live"
    /\ (amount <= supply)
    /\ state' = state
    /\ supply' = (supply - amount)
    /\ w1_at' = IF w1_at = 2 /\ amount = 2 THEN 3 ELSE 0

M3_Transfer ==                                 \* M3 on transfer
  /\ state = "Live"
  /\ state' = state
  /\ UNCHANGED <<supply>>
  /\ w1_at' = IF w1_at = 1 THEN 2 ELSE 0

Adapter == M1_Mint \/ M2_Burn
Holder == M3_Transfer
Next == Adapter \/ Holder

Spec == Init /\ [][Next]_vars

TypeOK ==
  /\ state \in States
  /\ supply \in 0..4
  /\ w1_at \in 0..3
SentBounded == TRUE

A1 == (supply <= 4)
Inv_A1 == TypeOK /\ A1
W1_End == w1_at = 3 /\ state = "Live" /\ supply = 0
NotW1 == ~W1_End
======================================================================
