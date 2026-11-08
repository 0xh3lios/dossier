---------------------------- MODULE Adapter ----------------------------
\* Scaffolded by dossier from the prose of Adapter. Every action and property
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
  held,
  \* @type: Bool;
  live,
  \* @type: Int;
  sent_move,
  \* @type: Int;
  sent_release,
  \* @type: Int;
  sent_mint,
  \* @type: Int;
  sent_burn,
  \* @type: Int;
  w1_at,
  \* @type: Int;
  w1_armed_sent_move,
  \* @type: Int;
  w1_armed_sent_mint,
  \* @type: Int;
  w1_armed_sent_burn,
  \* @type: Int;
  w2_at
vars == <<state, held, live, sent_move, sent_release, sent_mint, sent_burn, w1_at, w1_armed_sent_move, w1_armed_sent_mint, w1_armed_sent_burn, w2_at>>

States == {"Open", "Halted"}   \* S1 S2

Init ==                                           \* S1
  /\ state = "Open"
  /\ held = 0
  /\ live = TRUE
  /\ sent_move = 0
  /\ sent_release = 0
  /\ sent_mint = 0
  /\ sent_burn = 0
  /\ w1_at = 0
  /\ w1_armed_sent_move = 0
  /\ w1_armed_sent_mint = 0
  /\ w1_armed_sent_burn = 0
  /\ w2_at = 0

Can_M1_Exit == \E amount \in 0..2 : state = "Open" /\ ((held + amount) <= 4)
Can_M2_Enter == \E amount \in 0..2 : state = "Open" /\ (amount <= held)
Can_M3_Enter == \E amount \in 0..2 : state = "Halted" /\ (amount <= held)
Can_M4_Halt == state = "Open"
W2_Refused3 == ~((\E amount \in 0..2 : amount = 1 /\ state = "Open" /\ ((held + amount) <= 4)))

M1_Exit ==                                 \* M1 on exit
  \E amount \in 0..2 :
    /\ state = "Open"
    /\ ((held + amount) <= 4)
    /\ state' = state
    /\ held' = (held + amount)
    /\ sent_move' = sent_move + 1
    /\ sent_mint' = sent_mint + 1
    /\ UNCHANGED <<live, sent_release, sent_burn>>
    /\ w1_at' = IF state = "Open" /\ amount = 2 THEN 1 ELSE 0
    /\ w1_armed_sent_move' = IF w1_at' = 1 THEN sent_move ELSE IF w1_at' = 0 THEN 0 ELSE w1_armed_sent_move
    /\ w1_armed_sent_mint' = IF w1_at' = 1 THEN sent_mint ELSE IF w1_at' = 0 THEN 0 ELSE w1_armed_sent_mint
    /\ w1_armed_sent_burn' = IF w1_at' = 1 THEN sent_burn ELSE IF w1_at' = 0 THEN 0 ELSE w1_armed_sent_burn
    /\ w2_at' = IF state = "Open" /\ amount = 1 THEN 1 ELSE 0

M2_Enter ==                                 \* M2 on enter
  \E amount \in 0..2 :
    /\ state = "Open"
    /\ (amount <= held)
    /\ state' = state
    /\ held' = (held - amount)
    /\ sent_burn' = sent_burn + 1
    /\ sent_release' = sent_release + 1
    /\ UNCHANGED <<live, sent_move, sent_mint>>
    /\ w1_at' = IF w1_at = 1 /\ amount = 2 THEN 2 ELSE 0
    /\ w1_armed_sent_move' = IF w1_at' = 1 THEN sent_move ELSE IF w1_at' = 0 THEN 0 ELSE w1_armed_sent_move
    /\ w1_armed_sent_mint' = IF w1_at' = 1 THEN sent_mint ELSE IF w1_at' = 0 THEN 0 ELSE w1_armed_sent_mint
    /\ w1_armed_sent_burn' = IF w1_at' = 1 THEN sent_burn ELSE IF w1_at' = 0 THEN 0 ELSE w1_armed_sent_burn
    /\ w2_at' = IF w2_at = 2 /\ W2_Refused3 /\ amount = 1 THEN 3 ELSE 0

M3_Enter ==                                 \* M3 on enter
  \E amount \in 0..2 :
    /\ state = "Halted"
    /\ (amount <= held)
    /\ state' = state
    /\ held' = (held - amount)
    /\ sent_burn' = sent_burn + 1
    /\ sent_release' = sent_release + 1
    /\ UNCHANGED <<live, sent_move, sent_mint>>
    /\ w1_at' = IF w1_at = 1 /\ amount = 2 THEN 2 ELSE 0
    /\ w1_armed_sent_move' = IF w1_at' = 1 THEN sent_move ELSE IF w1_at' = 0 THEN 0 ELSE w1_armed_sent_move
    /\ w1_armed_sent_mint' = IF w1_at' = 1 THEN sent_mint ELSE IF w1_at' = 0 THEN 0 ELSE w1_armed_sent_mint
    /\ w1_armed_sent_burn' = IF w1_at' = 1 THEN sent_burn ELSE IF w1_at' = 0 THEN 0 ELSE w1_armed_sent_burn
    /\ w2_at' = IF w2_at = 2 /\ W2_Refused3 /\ amount = 1 THEN 3 ELSE 0

M4_Halt ==                                 \* M4 on halt
  /\ state = "Open"
  /\ state' = "Halted"
  /\ live' = FALSE
  /\ UNCHANGED <<held, sent_move, sent_release, sent_mint, sent_burn>>
  /\ w1_at' = 0
  /\ w1_armed_sent_move' = 0
  /\ w1_armed_sent_mint' = 0
  /\ w1_armed_sent_burn' = 0
  /\ w2_at' = IF w2_at = 1 THEN 2 ELSE 0

User == M1_Exit \/ M2_Enter \/ M3_Enter
Breaker == M4_Halt
Next == User \/ Breaker

Spec == Init /\ [][Next]_vars

TypeOK ==
  /\ state \in States
  /\ held \in 0..4
  /\ live \in BOOLEAN
  /\ sent_move \in Nat
  /\ sent_release \in Nat
  /\ sent_mint \in Nat
  /\ sent_burn \in Nat
  /\ w1_at \in 0..2
  /\ w1_armed_sent_move \in Nat
  /\ w1_armed_sent_mint \in Nat
  /\ w1_armed_sent_burn \in Nat
  /\ w2_at \in 0..3
SentBounded == sent_move <= MaxSent /\ sent_release <= MaxSent /\ sent_mint <= MaxSent /\ sent_burn <= MaxSent

A1 == (state = "Halted") => ~(live)
Inv_A1 == TypeOK /\ A1
W1_End == w1_at = 2 /\ state = "Open" /\ held = 0 /\ sent_move - w1_armed_sent_move = 1 /\ sent_mint - w1_armed_sent_mint = 1 /\ sent_burn - w1_armed_sent_burn = 1
NotW1 == ~W1_End
W2_End == w2_at = 3 /\ state = "Halted" /\ held = 0
NotW2 == ~W2_End
======================================================================
