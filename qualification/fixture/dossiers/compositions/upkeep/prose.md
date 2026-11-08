# Upkeep

Concern: upkeep

The Oracle and its keeper lanes: a stale price is refreshed before another block passes as long as one lane is live, and an honest lane moves the price one step at a time.

## Always
[A1] Always, {oracle.price + 1 >= oracle.last and oracle.last + 1 >= oracle.price}, given G3 and G4. Scenarios: all-honest, lane-a-captured.

## Within
[N1] Within 1 tick of oracle.Stale, oracle.Fresh, given G1 and G2. Scenarios: all-honest, lane-a-offline, lanes-offline, lanes-down-one, lanes-down-two, stale-start.

## Given
[G1] Given that lane A posts a stale oracle before the next block. If this is false, N1 rests on G2 alone. Actor: lane A, on oracle.post-a, prompt.
[G2] Given that lane B posts a stale oracle before the next block. If this is false, N1 rests on G1 alone. Actor: lane B, on oracle.post-b, prompt.
[G3] Given that lane A moves the price by at most one step per post. If this is false, A1 is void. Actor: lane A, on oracle.post-a, only when {value + 1 >= oracle.price and value <= oracle.price + 1}.
[G4] Given that lane B moves the price by at most one step per post. If this is false, A1 is void. Actor: lane B, on oracle.post-b, only when {value + 1 >= oracle.price and value <= oracle.price + 1}.

## Words only
[T1] With both lanes down the price goes stale; that is an incident, not a design flaw, and the cell says so. Down for one block they recover in time, down for two they do not, and a price already three blocks stale is refreshed before the next block. A captured lane can post any price, which is what the band in A1 is conditioned on.
