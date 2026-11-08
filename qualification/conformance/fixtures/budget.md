# Budget
Tier: charted
Module: budget

The budget pays fixed lots from inventory. It holds capacity, a count from 0 to 2, starting at 2. It holds balance, a count from 0 to 3, starting at 3. It holds paid, a count from 0 to 3. There is no refill or deposit.

## States
[S1] Live: payment is subject to both limits.

## Events
[E1] pay, from the operator: request one lot.

## Moves
[M1] When Live receives pay and {capacity > 0 and balance > 0}, it stays Live, capacity drops by 1, balance drops by 1, paid grows by 1.
[R1] In Live, pay is refused when {capacity = 0 or balance = 0}.

## Always
[A1] Always, {paid + balance = 3}.

## Walks
[W1] Walk Exhaust: from Live, pay, pay, pay refused; ends Live with capacity 0, balance 1, paid 2.

## Words only
[T1] This part states no eventual promise.
