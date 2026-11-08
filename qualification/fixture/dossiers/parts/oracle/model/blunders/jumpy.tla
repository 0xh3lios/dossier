---------------------------- MODULE jumpy ----------------------------
\* Scaffolded by dossier from the prose of Oracle. Every action and property
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
  stale,
  \* @type: Int;
  price,
  \* @type: Int;
  last,
  \* @type: Int;
  n1_ticks,
  \* @type: Int;
  w1_at,
  \* @type: Int;
  w2_at
vars == <<state, stale, price, last, n1_ticks, w1_at, w2_at>>

States == {"Fresh", "Stale"}   \* S1 S2

Init ==                                           \* S1
  /\ state = "Fresh"
  /\ stale = 0
  /\ price = 2
  /\ last = 2
  /\ n1_ticks = 0
  /\ w1_at = 0
  /\ w2_at = 0

Can_M1_Tick == state = "Fresh"
Can_M2_Tick == state = "Stale" /\ (stale < 3)
Can_M3_Tick == state = "Stale" /\ (stale = 3)
Can_M4_PostA == \E value \in 0..4 : state = "Stale" /\ (((value + 1) >= price) /\ (value <= (price + 1)))
Can_M5_PostB == \E value \in 0..4 : state = "Stale" /\ (((value + 1) >= price) /\ (value <= (price + 1)))
Due_LaneA == Can_M4_PostA   \* G1: acts before the next tick
Due_LaneB == Can_M5_PostB   \* G2: acts before the next tick
W2_Refused3 == ~((\E value \in 0..4 : value = 3 /\ state = "Stale" /\ (((value + 1) >= price) /\ (value <= (price + 1)))))

M1_Tick ==                                 \* M1 on tick
  /\ state = "Fresh"
  /\ ~Due_LaneA                      \* G1
  /\ ~Due_LaneB                      \* G2
  /\ state' = "Stale"
  /\ stale' = 1
  /\ UNCHANGED <<price, last>>
  /\ n1_ticks' = IF state' = "Fresh" THEN 0 ELSE IF ~(state' = "Stale") THEN 0 ELSE (IF n1_ticks > 1 THEN n1_ticks ELSE n1_ticks + 1)
  /\ w1_at' = IF state = "Fresh" THEN 1 ELSE 0
  /\ w2_at' = IF state = "Fresh" THEN 1 ELSE 0

M2_Tick ==                                 \* M2 on tick
  /\ state = "Stale"
  /\ (stale < 3)
  /\ ~Due_LaneA                      \* G1
  /\ ~Due_LaneB                      \* G2
  /\ state' = state
  /\ stale' = (stale + 1)
  /\ UNCHANGED <<price, last>>
  /\ n1_ticks' = IF state' = "Fresh" THEN 0 ELSE IF ~(state' = "Stale") THEN 0 ELSE (IF n1_ticks > 1 THEN n1_ticks ELSE n1_ticks + 1)
  /\ w1_at' = IF state = "Fresh" THEN 1 ELSE 0
  /\ w2_at' = IF state = "Fresh" THEN 1 ELSE 0

M3_Tick ==                                 \* M3 on tick
  /\ state = "Stale"
  /\ (stale = 3)
  /\ ~Due_LaneA                      \* G1
  /\ ~Due_LaneB                      \* G2
  /\ state' = state
  /\ UNCHANGED <<stale, price, last>>
  /\ n1_ticks' = IF state' = "Fresh" THEN 0 ELSE IF ~(state' = "Stale") THEN 0 ELSE (IF n1_ticks > 1 THEN n1_ticks ELSE n1_ticks + 1)
  /\ w1_at' = IF state = "Fresh" THEN 1 ELSE 0
  /\ w2_at' = IF state = "Fresh" THEN 1 ELSE 0

M4_PostA ==                                 \* M4 on post-a
  \E value \in 0..4 :
    /\ state = "Stale"
    \* G3: only when
    /\ state' = "Fresh"
    /\ stale' = 0
    /\ last' = price
    /\ price' = value
    /\ n1_ticks' = IF state' = "Fresh" THEN 0 ELSE IF ~(state' = "Stale") THEN 0 ELSE n1_ticks
    /\ w1_at' = IF w1_at = 1 /\ value = 2 THEN 2 ELSE 0
    /\ w2_at' = 0

M5_PostB ==                                 \* M5 on post-b
  \E value \in 0..4 :
    /\ state = "Stale"
    \* G4: only when
    /\ state' = "Fresh"
    /\ stale' = 0
    /\ last' = price
    /\ price' = value
    /\ n1_ticks' = IF state' = "Fresh" THEN 0 ELSE IF ~(state' = "Stale") THEN 0 ELSE n1_ticks
    /\ w1_at' = 0
    /\ w2_at' = IF w2_at = 1 /\ value = 3 THEN 2 ELSE 0

Chain == M1_Tick \/ M2_Tick \/ M3_Tick
LaneA == M4_PostA
LaneB == M5_PostB
LaneA_PostA == M4_PostA
LaneB_PostB == M5_PostB
Next == Chain \/ LaneA \/ LaneB

Spec == Init /\ [][Next]_vars
        /\ WF_vars(LaneA_PostA)                        \* from G1
        /\ WF_vars(LaneB_PostB)                        \* from G2

TypeOK ==
  /\ state \in States
  /\ stale \in 0..3
  /\ price \in 0..4
  /\ last \in 0..4
  /\ n1_ticks \in Nat
  /\ w1_at \in 0..2
  /\ w2_at \in 0..2
SentBounded == TRUE

A1 == (state = "Fresh") => (stale = 0)
A2 == (((price + 1) >= last) /\ ((last + 1) >= price))
N1 == n1_ticks <= 1      \* given G1 G2
Inv_A1 == TypeOK /\ A1
Inv_A2 == TypeOK /\ A2
Inv_N1 == TypeOK /\ N1
W1_End == w1_at = 2 /\ state = "Fresh" /\ stale = 0 /\ price = 2
NotW1 == ~W1_End
W2_End == w2_at = 2 /\ W2_Refused3 /\ state = "Fresh" /\ price = 3 /\ last = 2
NotW2 == ~W2_End
======================================================================
