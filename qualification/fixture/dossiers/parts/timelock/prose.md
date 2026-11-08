# Timelock

Tier: modeled
Module: timelock
Pins: timelock#observation:delay-check-2026-11-01

The Timelock holds one governance plan at a time and lets anyone execute it once its delay has run out. It holds remaining, a count from 0 to 2. It holds early, a flag. It receives tick from the chain, schedule and cancel from Governance, and execute from the public. It sends change to the Vault. It never knows what a plan does once it runs.

## States
[S1] Idle: no plan waits.
[S2] Scheduled: one plan waits out its delay.

## Events
[E1] tick, from the chain: one block passes.
[E2] schedule, from Governance: a plan is scheduled with the full delay ahead of it.
[E3] execute, from the public: anyone asks to execute the waiting plan.
[E4] cancel, from Governance: the waiting plan is cancelled.

## Moves
[M1] When Idle receives tick, it stays Idle.
[M2] When Scheduled receives tick and remaining is above 0, it stays Scheduled, remaining drops by one.
[M3] When Scheduled receives tick and remaining is 0, it stays Scheduled.
[M4] When Idle receives schedule, it becomes Scheduled, with remaining 2.
[M5] When Scheduled receives execute and remaining is 0, it becomes Idle, {early := remaining > 0}, sends change.
[M6] When Scheduled receives cancel, it becomes Idle.
[R1] In Idle, execute and cancel are refused.
[R2] In Scheduled, schedule is refused.
[R3] In Scheduled, execute is refused when remaining is above 0.

## Always
[A1] Always, {not early}.

## Once
[O1] Once Scheduled, eventually Idle, given G1 and G2.

## Within
[N1] Within 3 ticks of Scheduled, Idle, given G1 and G2.

## Given
[G1] Given that someone executes the plan as soon as its delay is out. If this is false, N1 and O1 are void. Actor: the public, on execute, prompt.
[G2] Given that the chain keeps ticking. If this is false, O1 and N1 are void. Actor: the chain.

## Walks
[W1] Walk Delayed: from Idle, schedule, execute refused, tick, tick, execute; ends Idle with remaining 0; change sent once.
[W2] Walk Cancelled: from Idle, schedule, tick, cancel, execute refused; ends Idle; change not sent.

## Seams
[X1] Seam with vault: change crosses from Timelock to Vault carrying nothing.

## Guarantees
[K1] execute succeeds only once the plan's delay has passed. Backing: record timelock#property:execute-after-eta.
[K2] A scheduled plan's delay cannot be shortened. Backing: none.

## Words only
[T1] What a plan changes is the Vault's business; here every plan raises the ceiling.

## Retired
