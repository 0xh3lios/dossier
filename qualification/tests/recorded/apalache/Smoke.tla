---- MODULE Smoke ----
EXTENDS Naturals
VARIABLES
  \* @type: Int;
  x,
  \* @type: Str;
  s
Init == x = 0 /\ s = "Idle"
Next == \/ (x < 10 /\ x' = x + 1 /\ s' = "Busy")
        \/ (x' = x /\ s' = "Idle")
InvFails == x < 3
InvHolds == x >= 0 /\ x <= 10
TypeOK == x \in 0..10 /\ s \in {"Idle", "Busy"}
Inductive == TypeOK /\ InvHolds
====
