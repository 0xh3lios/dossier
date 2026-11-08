-------------------------- MODULE Control --------------------------
\* Composed by dossier from timelock, vault, breaker, adapter: their moves, wired where one's effect is another's event,
\* with every actor's mode a constant. Properties are the system's passages.
EXTENDS Naturals

CONSTANTS
  \* @type: Int;
  MaxSent,
  \* @type: Str;
  Mode_chain,
  \* @type: Str;
  Mode_governance,
  \* @type: Str;
  Mode_public,
  \* @type: Str;
  Mode_user
ConstInit_all_honest == MaxSent = 4 /\ Mode_chain = "honest" /\ Mode_governance = "honest" /\ Mode_public = "honest" /\ Mode_user = "honest"
ConstInit_governance_captured == MaxSent = 4 /\ Mode_chain = "honest" /\ Mode_governance = "malicious" /\ Mode_public = "honest" /\ Mode_user = "honest"
ConstInit_executor_offline == MaxSent = 4 /\ Mode_chain = "honest" /\ Mode_governance = "honest" /\ Mode_public = "offline" /\ Mode_user = "honest"

VARIABLES
  \* @type: Str;
  timelock_state,
  \* @type: Int;
  timelock_remaining,
  \* @type: Bool;
  timelock_early,
  \* @type: Int;
  timelock_sent_change,
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
  breaker_state,
  \* @type: Bool;
  breaker_halted,
  \* @type: Int;
  breaker_sent_halt,
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
  \* @type: Int;
  n1_ticks,
  \* @type: Int;
  w1_at
vars == <<timelock_state, timelock_remaining, timelock_early, timelock_sent_change, vault_state, vault_debt, vault_free, vault_issued, vault_ceiling, breaker_state, breaker_halted, breaker_sent_halt, adapter_state, adapter_held, adapter_live, adapter_sent_move, adapter_sent_release, adapter_sent_mint, adapter_sent_burn, n1_ticks, w1_at>>

Init ==
  /\ timelock_state = "Idle"
  /\ timelock_remaining = 0
  /\ timelock_early = FALSE
  /\ timelock_sent_change = 0
  /\ vault_state = "Open"
  /\ vault_debt = 0
  /\ vault_free = 0
  /\ vault_issued = 0
  /\ vault_ceiling = 2
  /\ breaker_state = "Armed"
  /\ breaker_halted = FALSE
  /\ breaker_sent_halt = 0
  /\ adapter_state = "Open"
  /\ adapter_held = 0
  /\ adapter_live = TRUE
  /\ adapter_sent_move = 0
  /\ adapter_sent_release = 0
  /\ adapter_sent_mint = 0
  /\ adapter_sent_burn = 0
  /\ n1_ticks = 0
  /\ w1_at = 0

Can_timelock_M1_Tick == timelock_state = "Idle"
Can_timelock_M2_Tick == timelock_state = "Scheduled" /\ (timelock_remaining > 0)
Can_timelock_M3_Tick == timelock_state = "Scheduled" /\ (timelock_remaining = 0)
Can_timelock_M4_Schedule == timelock_state = "Idle"
Can_timelock_M5_Execute == timelock_state = "Scheduled" /\ (timelock_remaining = 0) /\ ((vault_state = "Open" /\ (vault_ceiling < 4)) \/ (vault_state = "Open" /\ (vault_ceiling = 4)))
Can_timelock_M6_Cancel == timelock_state = "Scheduled"
Can_vault_M1_Borrow == \E amount \in 0..2 : vault_state = "Open" /\ ((vault_debt + amount) <= vault_ceiling)
Can_vault_M2_Repay == \E amount \in 0..2 : vault_state = "Open" /\ ((amount <= vault_free) /\ (amount <= vault_debt))
Can_vault_M3_Move == \E amount \in 0..2 : vault_state = "Open" /\ (amount <= vault_free)
Can_vault_M4_Release == \E amount \in 0..2 : vault_state = "Open" /\ (amount <= vault_issued)
Can_vault_M5_Change == vault_state = "Open" /\ (vault_ceiling < 4)
Can_vault_M6_Change == vault_state = "Open" /\ (vault_ceiling = 4)
Can_breaker_M1_Stop == breaker_state = "Armed" /\ ((adapter_state = "Open"))
Can_adapter_M1_Exit == \E amount \in 0..2 : adapter_state = "Open" /\ ((adapter_held + amount) <= 4)
Can_adapter_M2_Enter == \E amount \in 0..2 : adapter_state = "Open" /\ (amount <= adapter_held)
Can_adapter_M3_Enter == \E amount \in 0..2 : adapter_state = "Halted" /\ (amount <= adapter_held)
Can_adapter_M4_Halt == adapter_state = "Open"
W1_Refused2 == ~(Can_timelock_M5_Execute)

timelock_M4_Schedule ==                                   \* timelock M4
  /\ timelock_state = "Idle"
  /\ timelock_state' = "Scheduled"
  /\ timelock_remaining' = 2
  /\ UNCHANGED <<timelock_early, timelock_sent_change, vault_state, vault_debt, vault_free, vault_issued, vault_ceiling, breaker_state, breaker_halted, breaker_sent_halt, adapter_state, adapter_held, adapter_live, adapter_sent_move, adapter_sent_release, adapter_sent_mint, adapter_sent_burn>>
  /\ n1_ticks' = IF ((timelock_state' = "Idle")) THEN 0 ELSE IF ~(((timelock_state' = "Scheduled"))) THEN 0 ELSE n1_ticks
  /\ w1_at' = IF (timelock_state = "Idle") THEN 1 ELSE 0

timelock_M5_Execute ==                                   \* timelock M5
  /\ timelock_state = "Scheduled"
  /\ (timelock_remaining = 0)
  /\ timelock_state' = "Idle"
  /\ timelock_early' = (timelock_remaining > 0)
  /\ timelock_sent_change' = timelock_sent_change + 1
  /\ ((vault_state = "Open" /\ (vault_ceiling < 4) /\ vault_state' = vault_state /\ vault_ceiling' = (vault_ceiling + 1) /\ UNCHANGED <<vault_debt, vault_free, vault_issued>>) \/ (vault_state = "Open" /\ (vault_ceiling = 4) /\ vault_state' = vault_state /\ UNCHANGED <<vault_debt, vault_free, vault_issued, vault_ceiling>>))
  /\ UNCHANGED <<timelock_remaining, breaker_state, breaker_halted, breaker_sent_halt, adapter_state, adapter_held, adapter_live, adapter_sent_move, adapter_sent_release, adapter_sent_mint, adapter_sent_burn>>
  /\ n1_ticks' = IF ((timelock_state' = "Idle")) THEN 0 ELSE IF ~(((timelock_state' = "Scheduled"))) THEN 0 ELSE n1_ticks
  /\ w1_at' = IF w1_at = 3 THEN 4 ELSE 0

timelock_M6_Cancel ==                                   \* timelock M6
  /\ timelock_state = "Scheduled"
  /\ timelock_state' = "Idle"
  /\ UNCHANGED <<timelock_remaining, timelock_early, timelock_sent_change, vault_state, vault_debt, vault_free, vault_issued, vault_ceiling, breaker_state, breaker_halted, breaker_sent_halt, adapter_state, adapter_held, adapter_live, adapter_sent_move, adapter_sent_release, adapter_sent_mint, adapter_sent_burn>>
  /\ n1_ticks' = IF ((timelock_state' = "Idle")) THEN 0 ELSE IF ~(((timelock_state' = "Scheduled"))) THEN 0 ELSE n1_ticks
  /\ w1_at' = 0

timelock_Tick == \/ (timelock_state = "Idle" /\ timelock_state' = timelock_state /\ UNCHANGED <<timelock_remaining, timelock_early, timelock_sent_change>>)
            \/ (timelock_state = "Scheduled" /\ (timelock_remaining > 0) /\ timelock_state' = timelock_state /\ timelock_remaining' = (timelock_remaining - 1) /\ UNCHANGED <<timelock_early, timelock_sent_change>>)
            \/ (timelock_state = "Scheduled" /\ (timelock_remaining = 0) /\ timelock_state' = timelock_state /\ UNCHANGED <<timelock_remaining, timelock_early, timelock_sent_change>>)
            \/ (~(Can_timelock_M1_Tick \/ Can_timelock_M2_Tick \/ Can_timelock_M3_Tick) /\ UNCHANGED <<timelock_state, timelock_remaining, timelock_early, timelock_sent_change>>)

vault_M1_Borrow ==                                   \* vault M1
  \E amount \in 0..2 :
    /\ vault_state = "Open"
    /\ ((vault_debt + amount) <= vault_ceiling)
    /\ vault_state' = vault_state
    /\ vault_debt' = (vault_debt + amount)
    /\ vault_free' = (vault_free + amount)
    /\ UNCHANGED <<timelock_state, timelock_remaining, timelock_early, timelock_sent_change, vault_issued, vault_ceiling, breaker_state, breaker_halted, breaker_sent_halt, adapter_state, adapter_held, adapter_live, adapter_sent_move, adapter_sent_release, adapter_sent_mint, adapter_sent_burn>>
    /\ n1_ticks' = IF ((timelock_state' = "Idle")) THEN 0 ELSE IF ~(((timelock_state' = "Scheduled"))) THEN 0 ELSE n1_ticks
    /\ w1_at' = 0

vault_M2_Repay ==                                   \* vault M2
  \E amount \in 0..2 :
    /\ vault_state = "Open"
    /\ ((amount <= vault_free) /\ (amount <= vault_debt))
    /\ vault_state' = vault_state
    /\ vault_debt' = (vault_debt - amount)
    /\ vault_free' = (vault_free - amount)
    /\ UNCHANGED <<timelock_state, timelock_remaining, timelock_early, timelock_sent_change, vault_issued, vault_ceiling, breaker_state, breaker_halted, breaker_sent_halt, adapter_state, adapter_held, adapter_live, adapter_sent_move, adapter_sent_release, adapter_sent_mint, adapter_sent_burn>>
    /\ n1_ticks' = IF ((timelock_state' = "Idle")) THEN 0 ELSE IF ~(((timelock_state' = "Scheduled"))) THEN 0 ELSE n1_ticks
    /\ w1_at' = 0

vault_M3_Move ==                                   \* vault M3
  \E amount \in 0..2 :
    /\ vault_state = "Open"
    /\ (amount <= vault_free)
    /\ vault_state' = vault_state
    /\ vault_free' = (vault_free - amount)
    /\ vault_issued' = (vault_issued + amount)
    /\ UNCHANGED <<timelock_state, timelock_remaining, timelock_early, timelock_sent_change, vault_debt, vault_ceiling, breaker_state, breaker_halted, breaker_sent_halt, adapter_state, adapter_held, adapter_live, adapter_sent_move, adapter_sent_release, adapter_sent_mint, adapter_sent_burn>>
    /\ n1_ticks' = IF ((timelock_state' = "Idle")) THEN 0 ELSE IF ~(((timelock_state' = "Scheduled"))) THEN 0 ELSE n1_ticks
    /\ w1_at' = 0

vault_M4_Release ==                                   \* vault M4
  \E amount \in 0..2 :
    /\ vault_state = "Open"
    /\ (amount <= vault_issued)
    /\ vault_state' = vault_state
    /\ vault_issued' = (vault_issued - amount)
    /\ vault_free' = (vault_free + amount)
    /\ UNCHANGED <<timelock_state, timelock_remaining, timelock_early, timelock_sent_change, vault_debt, vault_ceiling, breaker_state, breaker_halted, breaker_sent_halt, adapter_state, adapter_held, adapter_live, adapter_sent_move, adapter_sent_release, adapter_sent_mint, adapter_sent_burn>>
    /\ n1_ticks' = IF ((timelock_state' = "Idle")) THEN 0 ELSE IF ~(((timelock_state' = "Scheduled"))) THEN 0 ELSE n1_ticks
    /\ w1_at' = 0

\* vault_M5_Change is reached through wiring only

\* vault_M6_Change is reached through wiring only

breaker_M1_Stop ==                                   \* breaker M1
  /\ breaker_state = "Armed"
  /\ breaker_state' = "Spent"
  /\ breaker_halted' = TRUE
  /\ breaker_sent_halt' = breaker_sent_halt + 1
  /\ (adapter_state = "Open" /\ adapter_state' = "Halted" /\ adapter_live' = FALSE /\ UNCHANGED <<adapter_held, adapter_sent_move, adapter_sent_release, adapter_sent_mint, adapter_sent_burn>>)
  /\ UNCHANGED <<timelock_state, timelock_remaining, timelock_early, timelock_sent_change, vault_state, vault_debt, vault_free, vault_issued, vault_ceiling>>
  /\ n1_ticks' = IF ((timelock_state' = "Idle")) THEN 0 ELSE IF ~(((timelock_state' = "Scheduled"))) THEN 0 ELSE n1_ticks
  /\ w1_at' = 0

adapter_M1_Exit ==                                   \* adapter M1
  \E amount \in 0..2 :
    /\ adapter_state = "Open"
    /\ ((adapter_held + amount) <= 4)
    /\ adapter_state' = adapter_state
    /\ adapter_held' = (adapter_held + amount)
    /\ adapter_sent_move' = adapter_sent_move + 1
    /\ adapter_sent_mint' = adapter_sent_mint + 1
    /\ UNCHANGED <<timelock_state, timelock_remaining, timelock_early, timelock_sent_change, vault_state, vault_debt, vault_free, vault_issued, vault_ceiling, breaker_state, breaker_halted, breaker_sent_halt, adapter_live, adapter_sent_release, adapter_sent_burn>>
    /\ n1_ticks' = IF ((timelock_state' = "Idle")) THEN 0 ELSE IF ~(((timelock_state' = "Scheduled"))) THEN 0 ELSE n1_ticks
    /\ w1_at' = 0

adapter_M2_Enter ==                                   \* adapter M2
  \E amount \in 0..2 :
    /\ adapter_state = "Open"
    /\ (amount <= adapter_held)
    /\ adapter_state' = adapter_state
    /\ adapter_held' = (adapter_held - amount)
    /\ adapter_sent_burn' = adapter_sent_burn + 1
    /\ adapter_sent_release' = adapter_sent_release + 1
    /\ UNCHANGED <<timelock_state, timelock_remaining, timelock_early, timelock_sent_change, vault_state, vault_debt, vault_free, vault_issued, vault_ceiling, breaker_state, breaker_halted, breaker_sent_halt, adapter_live, adapter_sent_move, adapter_sent_mint>>
    /\ n1_ticks' = IF ((timelock_state' = "Idle")) THEN 0 ELSE IF ~(((timelock_state' = "Scheduled"))) THEN 0 ELSE n1_ticks
    /\ w1_at' = 0

adapter_M3_Enter ==                                   \* adapter M3
  \E amount \in 0..2 :
    /\ adapter_state = "Halted"
    /\ (amount <= adapter_held)
    /\ adapter_state' = adapter_state
    /\ adapter_held' = (adapter_held - amount)
    /\ adapter_sent_burn' = adapter_sent_burn + 1
    /\ adapter_sent_release' = adapter_sent_release + 1
    /\ UNCHANGED <<timelock_state, timelock_remaining, timelock_early, timelock_sent_change, vault_state, vault_debt, vault_free, vault_issued, vault_ceiling, breaker_state, breaker_halted, breaker_sent_halt, adapter_live, adapter_sent_move, adapter_sent_mint>>
    /\ n1_ticks' = IF ((timelock_state' = "Idle")) THEN 0 ELSE IF ~(((timelock_state' = "Scheduled"))) THEN 0 ELSE n1_ticks
    /\ w1_at' = 0

\* adapter_M4_Halt is reached through wiring only

Tick == timelock_Tick /\ UNCHANGED <<vault_state, vault_debt, vault_free, vault_issued, vault_ceiling, breaker_state, breaker_halted, breaker_sent_halt, adapter_state, adapter_held, adapter_live, adapter_sent_move, adapter_sent_release, adapter_sent_mint, adapter_sent_burn>> /\ (n1_ticks' = IF ((timelock_state' = "Idle")) THEN 0 ELSE IF ~(((timelock_state' = "Scheduled"))) THEN 0 ELSE (IF n1_ticks > 3 THEN n1_ticks ELSE n1_ticks + 1)) /\ (w1_at' = IF w1_at = 1 /\ W1_Refused2 /\ (Can_timelock_M1_Tick \/ Can_timelock_M2_Tick \/ Can_timelock_M3_Tick) THEN 2 ELSE IF w1_at = 2 /\ (Can_timelock_M1_Tick \/ Can_timelock_M2_Tick \/ Can_timelock_M3_Tick) THEN 3 ELSE 0)

Governance == (Mode_governance /= "offline") /\ (timelock_M4_Schedule \/ timelock_M6_Cancel \/ breaker_M1_Stop)
HonestGovernance == (Mode_governance = "honest") /\ Governance
Public == (Mode_public /= "offline") /\ (timelock_M5_Execute)
HonestPublic == (Mode_public = "honest") /\ Public
HonestPublic_timelock_Execute == (Mode_public = "honest") /\ (timelock_M5_Execute)   \* on timelock.execute
Due_public == (Mode_public = "honest") /\ (Can_timelock_M5_Execute)   \* control.G1 timelock.G1: acts before the next tick
User == (Mode_user /= "offline") /\ (vault_M1_Borrow \/ vault_M2_Repay \/ adapter_M1_Exit \/ adapter_M2_Enter \/ adapter_M3_Enter)
HonestUser == (Mode_user = "honest") /\ User
Adapter == vault_M3_Move \/ vault_M4_Release   \* sends left free
TickStep == (Mode_chain /= "offline") /\ Tick /\ ~Due_public
Next == TickStep \/ Governance \/ Public \/ User \/ Adapter

Spec == Init /\ [][Next]_vars
        /\ WF_vars(HonestPublic_timelock_Execute)        \* from control.G1 timelock.G1
        /\ WF_vars((Mode_chain = "honest") /\ TickStep)        \* from control.G2 timelock.G2

TypeOK ==
  /\ timelock_state \in {"Idle", "Scheduled"}
  /\ timelock_remaining \in 0..2
  /\ timelock_early \in BOOLEAN
  /\ timelock_sent_change \in Nat
  /\ vault_state \in {"Open"}
  /\ vault_debt \in 0..4
  /\ vault_free \in 0..4
  /\ vault_issued \in 0..4
  /\ vault_ceiling \in 2..4
  /\ breaker_state \in {"Armed", "Spent"}
  /\ breaker_halted \in BOOLEAN
  /\ breaker_sent_halt \in Nat
  /\ adapter_state \in {"Open", "Halted"}
  /\ adapter_held \in 0..4
  /\ adapter_live \in BOOLEAN
  /\ adapter_sent_move \in Nat
  /\ adapter_sent_release \in Nat
  /\ adapter_sent_mint \in Nat
  /\ adapter_sent_burn \in Nat
  /\ n1_ticks \in Nat
  /\ w1_at \in 0..4
SentBounded == timelock_sent_change <= MaxSent /\ breaker_sent_halt <= MaxSent /\ adapter_sent_move <= MaxSent /\ adapter_sent_release <= MaxSent /\ adapter_sent_mint <= MaxSent /\ adapter_sent_burn <= MaxSent

A1 == ~(timelock_early)
A2 == (~(breaker_halted) \/ (adapter_state = "Halted"))
O1 == ((timelock_state = "Scheduled")) ~> ((timelock_state = "Idle"))      \* given G1 G2
N1 == n1_ticks <= 3      \* given G1 G2
Inv_A1 == TypeOK /\ A1
Inv_A2 == TypeOK /\ A2
Inv_N1 == TypeOK /\ N1
W1_End == w1_at = 4 /\ (timelock_state = "Idle")
NotW1 == ~W1_End
======================================================================
