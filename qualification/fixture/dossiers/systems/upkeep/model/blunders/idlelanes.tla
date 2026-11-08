-------------------------- MODULE idlelanes --------------------------
\* Composed by dossier from oracle: their moves, wired where one's effect is another's event,
\* with every actor's mode a constant. Properties are the system's passages.
EXTENDS Naturals

CONSTANTS
  \* @type: Int;
  MaxSent,
  \* @type: Str;
  Mode_chain,
  \* @type: Str;
  Mode_lane_a,
  \* @type: Str;
  Mode_lane_b,
  \* @type: Int;
  From_lane_a,
  \* @type: Int;
  Until_lane_a,
  \* @type: Int;
  From_lane_b,
  \* @type: Int;
  Until_lane_b,
  \* @type: Str;
  Start_oracle_state,
  \* @type: Int;
  Start_oracle_stale
ConstInit_all_honest == MaxSent = 4 /\ Mode_chain = "honest" /\ Mode_lane_a = "honest" /\ Mode_lane_b = "honest" /\ From_lane_a = 0 /\ Until_lane_a = 0 /\ From_lane_b = 0 /\ Until_lane_b = 0 /\ Start_oracle_state = "Fresh" /\ Start_oracle_stale = 0
ConstInit_lane_a_offline == MaxSent = 4 /\ Mode_chain = "honest" /\ Mode_lane_a = "offline" /\ Mode_lane_b = "honest" /\ From_lane_a = 0 /\ Until_lane_a = 0 /\ From_lane_b = 0 /\ Until_lane_b = 0 /\ Start_oracle_state = "Fresh" /\ Start_oracle_stale = 0
ConstInit_lane_a_captured == MaxSent = 4 /\ Mode_chain = "honest" /\ Mode_lane_a = "malicious" /\ Mode_lane_b = "honest" /\ From_lane_a = 0 /\ Until_lane_a = 0 /\ From_lane_b = 0 /\ Until_lane_b = 0 /\ Start_oracle_state = "Fresh" /\ Start_oracle_stale = 0
ConstInit_lanes_offline == MaxSent = 4 /\ Mode_chain = "honest" /\ Mode_lane_a = "offline" /\ Mode_lane_b = "offline" /\ From_lane_a = 0 /\ Until_lane_a = 0 /\ From_lane_b = 0 /\ Until_lane_b = 0 /\ Start_oracle_state = "Fresh" /\ Start_oracle_stale = 0
ConstInit_lanes_down_one == MaxSent = 4 /\ Mode_chain = "honest" /\ Mode_lane_a = "offline" /\ Mode_lane_b = "offline" /\ From_lane_a = 0 /\ Until_lane_a = 1 /\ From_lane_b = 0 /\ Until_lane_b = 1 /\ Start_oracle_state = "Fresh" /\ Start_oracle_stale = 0
ConstInit_lanes_down_two == MaxSent = 4 /\ Mode_chain = "honest" /\ Mode_lane_a = "offline" /\ Mode_lane_b = "offline" /\ From_lane_a = 0 /\ Until_lane_a = 2 /\ From_lane_b = 0 /\ Until_lane_b = 2 /\ Start_oracle_state = "Fresh" /\ Start_oracle_stale = 0
ConstInit_stale_start == MaxSent = 4 /\ Mode_chain = "honest" /\ Mode_lane_a = "honest" /\ Mode_lane_b = "honest" /\ From_lane_a = 0 /\ Until_lane_a = 0 /\ From_lane_b = 0 /\ Until_lane_b = 0 /\ Start_oracle_state = "Stale" /\ Start_oracle_stale = 3

VARIABLES
  \* @type: Str;
  oracle_state,
  \* @type: Int;
  oracle_stale,
  \* @type: Int;
  oracle_price,
  \* @type: Int;
  oracle_last,
  \* @type: Int;
  n1_ticks,
  \* @type: Int;
  clock
vars == <<oracle_state, oracle_stale, oracle_price, oracle_last, n1_ticks, clock>>

\* The mode of an actor with a window, honest outside it.
ModeNow_lane_a == IF clock >= From_lane_a /\ (Until_lane_a = 0 \/ clock < Until_lane_a) THEN Mode_lane_a ELSE "honest"
ModeNow_lane_b == IF clock >= From_lane_b /\ (Until_lane_b = 0 \/ clock < Until_lane_b) THEN Mode_lane_b ELSE "honest"

Init ==
  /\ oracle_state = Start_oracle_state
  /\ oracle_stale = Start_oracle_stale
  /\ oracle_price = 2
  /\ oracle_last = 2
  /\ n1_ticks = 0
  /\ clock = 0

Can_oracle_M1_Tick == oracle_state = "Fresh"
Can_oracle_M2_Tick == oracle_state = "Stale" /\ (oracle_stale < 3)
Can_oracle_M3_Tick == oracle_state = "Stale" /\ (oracle_stale = 3)
Can_oracle_M4_PostA == \E value \in 0..4 : oracle_state = "Stale" /\ (ModeNow_lane_a /= "honest" \/ (((value + 1) >= oracle_price) /\ (value <= (oracle_price + 1)))) /\ (ModeNow_lane_a /= "honest" \/ (((value + 1) >= oracle_price) /\ (value <= (oracle_price + 1))))
Can_oracle_M5_PostB == \E value \in 0..4 : oracle_state = "Stale" /\ (ModeNow_lane_b /= "honest" \/ (((value + 1) >= oracle_price) /\ (value <= (oracle_price + 1)))) /\ (ModeNow_lane_b /= "honest" \/ (((value + 1) >= oracle_price) /\ (value <= (oracle_price + 1))))

oracle_M4_PostA ==                                   \* oracle M4
  \E value \in 0..4 :
    /\ oracle_state = "Stale"
    /\ (ModeNow_lane_a /= "honest" \/ (((value + 1) >= oracle_price) /\ (value <= (oracle_price + 1))))   \* upkeep.G3
    /\ (ModeNow_lane_a /= "honest" \/ (((value + 1) >= oracle_price) /\ (value <= (oracle_price + 1))))   \* oracle.G3
    /\ oracle_state' = "Fresh"
    /\ oracle_stale' = 0
    /\ oracle_last' = oracle_price
    /\ oracle_price' = value
    /\ UNCHANGED <<clock>>
    /\ n1_ticks' = IF ((oracle_state' = "Fresh")) THEN 0 ELSE IF ~(((oracle_state' = "Stale"))) THEN 0 ELSE n1_ticks

oracle_M5_PostB ==                                   \* oracle M5
  \E value \in 0..4 :
    /\ oracle_state = "Stale"
    /\ (ModeNow_lane_b /= "honest" \/ (((value + 1) >= oracle_price) /\ (value <= (oracle_price + 1))))   \* upkeep.G4
    /\ (ModeNow_lane_b /= "honest" \/ (((value + 1) >= oracle_price) /\ (value <= (oracle_price + 1))))   \* oracle.G4
    /\ oracle_state' = "Fresh"
    /\ oracle_stale' = 0
    /\ oracle_last' = oracle_price
    /\ oracle_price' = value
    /\ UNCHANGED <<clock>>
    /\ n1_ticks' = IF ((oracle_state' = "Fresh")) THEN 0 ELSE IF ~(((oracle_state' = "Stale"))) THEN 0 ELSE n1_ticks

oracle_Tick == \/ (oracle_state = "Fresh" /\ oracle_state' = "Stale" /\ oracle_stale' = 1 /\ UNCHANGED <<oracle_price, oracle_last>>)
            \/ (oracle_state = "Stale" /\ (oracle_stale < 3) /\ oracle_state' = oracle_state /\ oracle_stale' = (oracle_stale + 1) /\ UNCHANGED <<oracle_price, oracle_last>>)
            \/ (oracle_state = "Stale" /\ (oracle_stale = 3) /\ oracle_state' = oracle_state /\ UNCHANGED <<oracle_stale, oracle_price, oracle_last>>)
            \/ (~(Can_oracle_M1_Tick \/ Can_oracle_M2_Tick \/ Can_oracle_M3_Tick) /\ UNCHANGED <<oracle_state, oracle_stale, oracle_price, oracle_last>>)

Tick == oracle_Tick /\ (n1_ticks' = IF ((oracle_state' = "Fresh")) THEN 0 ELSE IF ~(((oracle_state' = "Stale"))) THEN 0 ELSE (IF n1_ticks > 1 THEN n1_ticks ELSE n1_ticks + 1)) /\ (clock' = IF clock < 2 THEN clock + 1 ELSE clock)

Lane_a == (ModeNow_lane_a /= "offline") /\ (oracle_M4_PostA)
HonestLane_a == (ModeNow_lane_a = "honest") /\ Lane_a
HonestLane_a_oracle_PostA == (ModeNow_lane_a = "honest") /\ (oracle_M4_PostA)   \* on oracle.post-a
Due_lane_a == (ModeNow_lane_a = "honest") /\ (Can_oracle_M4_PostA)   \* upkeep.G1 oracle.G1: acts before the next tick
Lane_b == (ModeNow_lane_b /= "offline") /\ (oracle_M5_PostB)
HonestLane_b == (ModeNow_lane_b = "honest") /\ Lane_b
HonestLane_b_oracle_PostB == (ModeNow_lane_b = "honest") /\ (oracle_M5_PostB)   \* on oracle.post-b
Due_lane_b == (ModeNow_lane_b = "honest") /\ (Can_oracle_M5_PostB)   \* upkeep.G2 oracle.G2: acts before the next tick
TickStep == (Mode_chain /= "offline") /\ Tick
Next == TickStep \/ Lane_a \/ Lane_b

Spec == Init /\ [][Next]_vars
        /\ WF_vars(HonestLane_a_oracle_PostA)        \* from upkeep.G1 oracle.G1
        /\ WF_vars(HonestLane_b_oracle_PostB)        \* from upkeep.G2 oracle.G2

TypeOK ==
  /\ oracle_state \in {"Fresh", "Stale"}
  /\ oracle_stale \in 0..3
  /\ oracle_price \in 0..4
  /\ oracle_last \in 0..4
  /\ n1_ticks \in Nat
  /\ clock \in 0..2
SentBounded == TRUE

A1 == (((oracle_price + 1) >= oracle_last) /\ ((oracle_last + 1) >= oracle_price))
N1 == n1_ticks <= 1      \* given G1 G2
Inv_A1 == TypeOK /\ A1
Inv_N1 == TypeOK /\ N1
======================================================================
