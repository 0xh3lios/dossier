---------------------------- MODULE unfair ----------------------------
\* Scaffolded by dossier from the prose of Timelock. Every action and property
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
  remaining,
  \* @type: Bool;
  early,
  \* @type: Int;
  sent_change,
  \* @type: Int;
  n1_ticks,
  \* @type: Int;
  w1_at,
  \* @type: Int;
  w1_armed_sent_change,
  \* @type: Int;
  w2_at,
  \* @type: Int;
  w2_armed_sent_change
vars == <<state, remaining, early, sent_change, n1_ticks, w1_at, w1_armed_sent_change, w2_at, w2_armed_sent_change>>

States == {"Idle", "Scheduled"}   \* S1 S2

Init ==                                           \* S1
  /\ state = "Idle"
  /\ remaining = 0
  /\ early = FALSE
  /\ sent_change = 0
  /\ n1_ticks = 0
  /\ w1_at = 0
  /\ w1_armed_sent_change = 0
  /\ w2_at = 0
  /\ w2_armed_sent_change = 0

Can_M1_Tick == state = "Idle"
Can_M2_Tick == state = "Scheduled" /\ (remaining > 0)
Can_M3_Tick == state = "Scheduled" /\ (remaining = 0)
Can_M4_Schedule == state = "Idle"
Can_M5_Execute == state = "Scheduled" /\ (remaining = 0)
Can_M6_Cancel == state = "Scheduled"
Due_Public == Can_M5_Execute   \* G1: acts before the next tick
W1_Refused2 == ~(Can_M5_Execute)
W2_Refused4 == ~(Can_M5_Execute)

M1_Tick ==                                 \* M1 on tick
  /\ state = "Idle"
  /\ ~Due_Public                      \* G1
  /\ state' = state
  /\ UNCHANGED <<remaining, early, sent_change>>
  /\ n1_ticks' = IF state' = "Idle" THEN 0 ELSE IF ~(state' = "Scheduled") THEN 0 ELSE (IF n1_ticks > 3 THEN n1_ticks ELSE n1_ticks + 1)
  /\ w1_at' = IF w1_at = 1 /\ W1_Refused2 THEN 2 ELSE IF w1_at = 2 THEN 3 ELSE 0
  /\ w1_armed_sent_change' = IF w1_at' = 1 THEN sent_change ELSE IF w1_at' = 0 THEN 0 ELSE w1_armed_sent_change
  /\ w2_at' = IF w2_at = 1 THEN 2 ELSE 0
  /\ w2_armed_sent_change' = IF w2_at' = 1 THEN sent_change ELSE IF w2_at' = 0 THEN 0 ELSE w2_armed_sent_change

M2_Tick ==                                 \* M2 on tick
  /\ state = "Scheduled"
  /\ (remaining > 0)
  /\ ~Due_Public                      \* G1
  /\ state' = state
  /\ remaining' = (remaining - 1)
  /\ UNCHANGED <<early, sent_change>>
  /\ n1_ticks' = IF state' = "Idle" THEN 0 ELSE IF ~(state' = "Scheduled") THEN 0 ELSE (IF n1_ticks > 3 THEN n1_ticks ELSE n1_ticks + 1)
  /\ w1_at' = IF w1_at = 1 /\ W1_Refused2 THEN 2 ELSE IF w1_at = 2 THEN 3 ELSE 0
  /\ w1_armed_sent_change' = IF w1_at' = 1 THEN sent_change ELSE IF w1_at' = 0 THEN 0 ELSE w1_armed_sent_change
  /\ w2_at' = IF w2_at = 1 THEN 2 ELSE 0
  /\ w2_armed_sent_change' = IF w2_at' = 1 THEN sent_change ELSE IF w2_at' = 0 THEN 0 ELSE w2_armed_sent_change

M3_Tick ==                                 \* M3 on tick
  /\ state = "Scheduled"
  /\ (remaining = 0)
  /\ ~Due_Public                      \* G1
  /\ state' = state
  /\ UNCHANGED <<remaining, early, sent_change>>
  /\ n1_ticks' = IF state' = "Idle" THEN 0 ELSE IF ~(state' = "Scheduled") THEN 0 ELSE (IF n1_ticks > 3 THEN n1_ticks ELSE n1_ticks + 1)
  /\ w1_at' = IF w1_at = 1 /\ W1_Refused2 THEN 2 ELSE IF w1_at = 2 THEN 3 ELSE 0
  /\ w1_armed_sent_change' = IF w1_at' = 1 THEN sent_change ELSE IF w1_at' = 0 THEN 0 ELSE w1_armed_sent_change
  /\ w2_at' = IF w2_at = 1 THEN 2 ELSE 0
  /\ w2_armed_sent_change' = IF w2_at' = 1 THEN sent_change ELSE IF w2_at' = 0 THEN 0 ELSE w2_armed_sent_change

M4_Schedule ==                                 \* M4 on schedule
  /\ state = "Idle"
  /\ state' = "Scheduled"
  /\ remaining' = 2
  /\ UNCHANGED <<early, sent_change>>
  /\ n1_ticks' = IF state' = "Idle" THEN 0 ELSE IF ~(state' = "Scheduled") THEN 0 ELSE n1_ticks
  /\ w1_at' = IF state = "Idle" THEN 1 ELSE 0
  /\ w1_armed_sent_change' = IF w1_at' = 1 THEN sent_change ELSE IF w1_at' = 0 THEN 0 ELSE w1_armed_sent_change
  /\ w2_at' = IF state = "Idle" THEN 1 ELSE 0
  /\ w2_armed_sent_change' = IF w2_at' = 1 THEN sent_change ELSE IF w2_at' = 0 THEN 0 ELSE w2_armed_sent_change

M5_Execute ==                                 \* M5 on execute
  /\ state = "Scheduled"
  /\ (remaining = 0)
  /\ state' = "Idle"
  /\ early' = (remaining > 0)
  /\ sent_change' = sent_change + 1
  /\ UNCHANGED <<remaining>>
  /\ n1_ticks' = IF state' = "Idle" THEN 0 ELSE IF ~(state' = "Scheduled") THEN 0 ELSE n1_ticks
  /\ w1_at' = IF w1_at = 3 THEN 4 ELSE 0
  /\ w1_armed_sent_change' = IF w1_at' = 1 THEN sent_change ELSE IF w1_at' = 0 THEN 0 ELSE w1_armed_sent_change
  /\ w2_at' = 0
  /\ w2_armed_sent_change' = 0

M6_Cancel ==                                 \* M6 on cancel
  /\ state = "Scheduled"
  /\ state' = "Idle"
  /\ UNCHANGED <<remaining, early, sent_change>>
  /\ n1_ticks' = IF state' = "Idle" THEN 0 ELSE IF ~(state' = "Scheduled") THEN 0 ELSE n1_ticks
  /\ w1_at' = 0
  /\ w1_armed_sent_change' = 0
  /\ w2_at' = IF w2_at = 2 THEN 3 ELSE 0
  /\ w2_armed_sent_change' = IF w2_at' = 1 THEN sent_change ELSE IF w2_at' = 0 THEN 0 ELSE w2_armed_sent_change

Chain == M1_Tick \/ M2_Tick \/ M3_Tick
Governance == M4_Schedule \/ M6_Cancel
Public == M5_Execute
Public_Execute == M5_Execute
Next == Chain \/ Governance \/ Public

Spec == Init /\ [][Next]_vars
        /\ WF_vars(Chain)                        \* from G2

TypeOK ==
  /\ state \in States
  /\ remaining \in 0..2
  /\ early \in BOOLEAN
  /\ sent_change \in Nat
  /\ n1_ticks \in Nat
  /\ w1_at \in 0..4
  /\ w1_armed_sent_change \in Nat
  /\ w2_at \in 0..3
  /\ w2_armed_sent_change \in Nat
SentBounded == sent_change <= MaxSent

A1 == ~(early)
O1 == (state = "Scheduled") ~> (state = "Idle")      \* given G1 G2
N1 == n1_ticks <= 3      \* given G1 G2
Inv_A1 == TypeOK /\ A1
Inv_N1 == TypeOK /\ N1
W1_End == w1_at = 4 /\ state = "Idle" /\ remaining = 0 /\ sent_change - w1_armed_sent_change = 1
NotW1 == ~W1_End
W2_End == w2_at = 3 /\ W2_Refused4 /\ state = "Idle" /\ sent_change - w2_armed_sent_change = 0
NotW2 == ~W2_End
======================================================================
