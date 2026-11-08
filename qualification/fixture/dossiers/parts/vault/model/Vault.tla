---------------------------- MODULE Vault ----------------------------
\* Scaffolded by dossier from the prose of Vault. Every action and property
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
  debt,
  \* @type: Int;
  free,
  \* @type: Int;
  issued,
  \* @type: Int;
  ceiling,
  \* @type: Int;
  w1_at,
  \* @type: Int;
  w2_at,
  \* @type: Int;
  w3_at
vars == <<state, debt, free, issued, ceiling, w1_at, w2_at, w3_at>>

States == {"Open"}   \* S1

Init ==                                           \* S1
  /\ state = "Open"
  /\ debt = 0
  /\ free = 0
  /\ issued = 0
  /\ ceiling = 2
  /\ w1_at = 0
  /\ w2_at = 0
  /\ w3_at = 0

Can_M1_Borrow == \E amount \in 0..2 : state = "Open" /\ ((debt + amount) <= ceiling)
Can_M2_Repay == \E amount \in 0..2 : state = "Open" /\ ((amount <= free) /\ (amount <= debt))
Can_M3_Move == \E amount \in 0..2 : state = "Open" /\ (amount <= free)
Can_M4_Release == \E amount \in 0..2 : state = "Open" /\ (amount <= issued)
Can_M5_Change == state = "Open" /\ (ceiling < 4)
Can_M6_Change == state = "Open" /\ (ceiling = 4)
W2_Refused2 == ~((\E amount \in 0..2 : amount = 1 /\ state = "Open" /\ ((debt + amount) <= ceiling)))
W3_Refused2 == ~((\E amount \in 0..2 : amount = 1 /\ state = "Open" /\ ((debt + amount) <= ceiling)))

M1_Borrow ==                                 \* M1 on borrow
  \E amount \in 0..2 :
    /\ state = "Open"
    /\ ((debt + amount) <= ceiling)
    /\ state' = state
    /\ debt' = (debt + amount)
    /\ free' = (free + amount)
    /\ UNCHANGED <<issued, ceiling>>
    /\ w1_at' = IF state = "Open" /\ amount = 2 THEN 1 ELSE 0
    /\ w2_at' = IF state = "Open" /\ amount = 2 THEN 1 ELSE 0
    /\ w3_at' = IF w3_at = 2 /\ amount = 1 THEN 3 ELSE IF state = "Open" /\ amount = 2 THEN 1 ELSE 0

M2_Repay ==                                 \* M2 on repay
  \E amount \in 0..2 :
    /\ state = "Open"
    /\ ((amount <= free) /\ (amount <= debt))
    /\ state' = state
    /\ debt' = (debt - amount)
    /\ free' = (free - amount)
    /\ UNCHANGED <<issued, ceiling>>
    /\ w1_at' = IF w1_at = 1 /\ amount = 1 THEN 2 ELSE 0
    /\ w2_at' = 0
    /\ w3_at' = 0

M3_Move ==                                 \* M3 on move
  \E amount \in 0..2 :
    /\ state = "Open"
    /\ (amount <= free)
    /\ state' = state
    /\ free' = (free - amount)
    /\ issued' = (issued + amount)
    /\ UNCHANGED <<debt, ceiling>>
    /\ w1_at' = 0
    /\ w2_at' = 0
    /\ w3_at' = 0

M4_Release ==                                 \* M4 on release
  \E amount \in 0..2 :
    /\ state = "Open"
    /\ (amount <= issued)
    /\ state' = state
    /\ issued' = (issued - amount)
    /\ free' = (free + amount)
    /\ UNCHANGED <<debt, ceiling>>
    /\ w1_at' = 0
    /\ w2_at' = 0
    /\ w3_at' = 0

M5_Change ==                                 \* M5 on change
  /\ state = "Open"
  /\ (ceiling < 4)
  /\ state' = state
  /\ ceiling' = (ceiling + 1)
  /\ UNCHANGED <<debt, free, issued>>
  /\ w1_at' = 0
  /\ w2_at' = 0
  /\ w3_at' = IF w3_at = 1 /\ W3_Refused2 THEN 2 ELSE 0

M6_Change ==                                 \* M6 on change
  /\ state = "Open"
  /\ (ceiling = 4)
  /\ state' = state
  /\ UNCHANGED <<debt, free, issued, ceiling>>
  /\ w1_at' = 0
  /\ w2_at' = 0
  /\ w3_at' = IF w3_at = 1 /\ W3_Refused2 THEN 2 ELSE 0

User == M1_Borrow \/ M2_Repay
Adapter == M3_Move \/ M4_Release
Timelock == M5_Change \/ M6_Change
Next == User \/ Adapter \/ Timelock

Spec == Init /\ [][Next]_vars

TypeOK ==
  /\ state \in States
  /\ debt \in 0..4
  /\ free \in 0..4
  /\ issued \in 0..4
  /\ ceiling \in 2..4
  /\ w1_at \in 0..2
  /\ w2_at \in 0..1
  /\ w3_at \in 0..3
SentBounded == TRUE

A1 == (debt = (free + issued))
A2 == (debt <= ceiling)
Inv_A1 == TypeOK /\ A1
Inv_A2 == TypeOK /\ A1 /\ A2   \* strengthened: A1 bounds free by debt
W1_End == w1_at = 2 /\ state = "Open" /\ debt = 1 /\ free = 1
NotW1 == ~W1_End
W2_End == w2_at = 1 /\ W2_Refused2 /\ state = "Open" /\ debt = 2
NotW2 == ~W2_End
W3_End == w3_at = 3 /\ state = "Open" /\ debt = 3 /\ ceiling = 3
NotW3 == ~W3_End
======================================================================
