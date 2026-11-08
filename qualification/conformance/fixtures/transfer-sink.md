# Sink

Tier: charted
Module: sink

The Sink records the lots the Source sends. It holds received, a count from 0 to 2. It receives receive from the Source. It cannot initiate a receipt itself.

## States
[S1] Live: a received lot is counted.

## Events
[E1] receive, from the Source: count a lot. Carries lot, a count from 1 to 1.

## Moves
[M1] When Live receives receive and {received + lot <= 2}, it stays Live, received grows by lot.
[R1] In Live, receive is refused when {received + lot > 2}.

## Always
[A1] Always, {received <= 2}.

## Seams
[X1] Seam with source: receive is reached by the Source's credit.

## Words only
[T1] This component promises no eventual receipt.
