# Source

Tier: charted
Module: source

The Source can send two fixed lots. It holds remaining, a count from 0 to 2, starting at 2. It holds paid, a count from 0 to 2. It holds lot, a count from 1 to 1, starting at 1. It sends credit to the Sink, carrying lot. Nothing replenishes remaining.

## States
[S1] Live: the operator may request a lot.

## Events
[E1] send, from the operator: request one lot.

## Moves
[M1] When Live receives send and {remaining > 0}, it stays Live, remaining drops by 1, paid grows by 1, sends credit.
[R1] In Live, send is refused when {remaining = 0}.

## Always
[A1] Always, {remaining + paid = 2}.

## Seams
[X1] Seam with sink: credit carries the fixed lot into receive.

## Words only
[T1] This part promises no eventual request.
