# Breaker

Tier: modeled
Module: breaker

The Breaker lets Governance halt the Adapter at once, without the Timelock's delay. It holds halted, a flag. It receives stop from Governance. It sends halt to the Adapter. It never knows why Governance stops.

## States
[S1] Armed: the breaker will relay a halt.
[S2] Spent: the breaker has halted the adapter. Final.

## Events
[E1] stop, from Governance: governance halts exits.

## Moves
[M1] When Armed receives stop, it becomes Spent, halted is set, sends halt.
[R1] In Spent, stop is refused.

## Always
[A1] Always, while Spent, halted is set.
[A2] Always, in structure, every halt the Adapter receives comes from Governance through a Breaker whose authority is Governance.

## Walks
[W1] Walk Halt: from Armed, stop, stop refused; ends Spent; halt sent once.

## Seams
[X1] Seam with adapter: halt crosses from Breaker to Adapter carrying nothing.

## Guarantees
[K1] A breaker action only halts, never enables. Backing: record breaker#property:breaker-only-reduces.

## Words only
[T1] This piece promises nothing eventual.

## Retired
