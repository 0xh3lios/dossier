---------------------------- MODULE Breaker ----------------------------
\* Scaffolded by dossier from the prose of Breaker. Every action and property
\* names the passage it encodes; refusals are the absent actions.
EXTENDS Naturals

CONSTANTS
  \* @type: Int;
  MaxSent                                        \* bounds the effect counters
ConstInit == MaxSent = 4

VARIABLES
  \* @type: Str;
  state,
  \* @type: Bool;
  halted,
  \* @type: Int;
  sent_halt,
  \* @type: Int;
  w1_at,
  \* @type: Int;
  w1_armed_sent_halt
vars == <<state, halted, sent_halt, w1_at, w1_armed_sent_halt>>

States == {"Armed", "Spent"}   \* S1 S2

Init ==                                           \* S1
  /\ state = "Armed"
  /\ halted = FALSE
  /\ sent_halt = 0
  /\ w1_at = 0
  /\ w1_armed_sent_halt = 0

Can_M1_Stop == state = "Armed"
W1_Refused2 == ~(Can_M1_Stop)

M1_Stop ==                                 \* M1 on stop
  /\ state = "Armed"
  /\ state' = "Spent"
  /\ halted' = TRUE
  /\ sent_halt' = sent_halt + 1
  /\ w1_at' = IF state = "Armed" THEN 1 ELSE 0
  /\ w1_armed_sent_halt' = IF w1_at' = 1 THEN sent_halt ELSE IF w1_at' = 0 THEN 0 ELSE w1_armed_sent_halt

Governance == M1_Stop
Next == Governance

Spec == Init /\ [][Next]_vars

TypeOK ==
  /\ state \in States
  /\ halted \in BOOLEAN
  /\ sent_halt \in Nat
  /\ w1_at \in 0..1
  /\ w1_armed_sent_halt \in Nat
SentBounded == sent_halt <= MaxSent

A1 == (state = "Spent") => halted
Inv_A1 == TypeOK /\ A1
W1_End == w1_at = 1 /\ W1_Refused2 /\ state = "Spent" /\ sent_halt - w1_armed_sent_halt = 1
NotW1 == ~W1_End
======================================================================
