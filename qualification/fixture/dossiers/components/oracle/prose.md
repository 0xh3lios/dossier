# Oracle

Tier: modeled
Module: oracle

The Oracle holds a price that two keeper lanes refresh. It holds stale, a count from 0 to 3. It holds price, a count from 0 to 4, starting at 2. It holds last, a count from 0 to 4, starting at 2. It receives tick from the chain, post-a from lane A and post-b from lane B. It never knows where a lane's price comes from.

## States
[S1] Fresh: the price was posted since the last block.
[S2] Stale: at least one block passed since the last post.

## Events
[E1] tick, from the chain: one block passes.
[E2] post-a, from lane A: lane A posts a price. Carries value, a count from 0 to 4.
[E3] post-b, from lane B: lane B posts a price. Carries value, a count from 0 to 4.

## Moves
[M1] When Fresh receives tick, it becomes Stale, with stale 1.
[M2] When Stale receives tick and stale is below 3, it stays Stale, stale grows by one.
[M3] When Stale receives tick and stale is 3, it stays Stale.
[M4] When Stale receives post-a, it becomes Fresh, with stale 0, last becomes price, price becomes value.
[M5] When Stale receives post-b, it becomes Fresh, with stale 0, last becomes price, price becomes value.
[R1] In Fresh, post-a and post-b are refused.

## Always
[A1] Always, while Fresh, stale is 0.
[A2] Always, {price + 1 >= last and last + 1 >= price}, given G3 and G4.

## Within
[N1] Within 1 tick of Stale, Fresh, given G1 and G2.

## Given
[G1] Given that lane A posts a stale oracle before the next block. If this is false, N1 rests on G2 alone. Actor: lane A, on post-a, prompt.
[G2] Given that lane B posts a stale oracle before the next block. If this is false, N1 rests on G1 alone. Actor: lane B, on post-b, prompt.
[G3] Given that lane A moves the price by at most one step per post. If this is false, A2 is void. Actor: lane A, on post-a, only when {value + 1 >= price and value <= price + 1}.
[G4] Given that lane B moves the price by at most one step per post. If this is false, A2 is void. Actor: lane B, on post-b, only when {value + 1 >= price and value <= price + 1}.

## Walks
[W1] Walk Refresh: from Fresh, tick, post-a value 2; ends Fresh with stale 0 and price 2.
[W2] Walk Backup: from Fresh, tick, post-b value 3, post-a value 3 refused; ends Fresh with price 3 and last 2.

## Guarantees
[K1] stale never exceeds one block while a lane is live. Backing: record oracle#property:freshness.

## Words only
[T1] Where a lane's price comes from is the lanes' business; what is modeled is the price's age and the step a post may move it.

## Retired
