# Adapter

Tier: modeled
Module: adapter

The Adapter turns the Vault's free credit into HRD and back. It holds held, an amount of HRD up to 4. It holds live, a flag, starting set. It receives exit and enter from the User, and halt from the Breaker. It sends move to the Vault, carrying amount. It sends release to the Vault, carrying amount. It sends mint to the Token, carrying amount. It sends burn to the Token, carrying amount.

## States
[S1] Open: exits and entries are accepted.
[S2] Halted: the Breaker stopped exits; entries continue so HRD can always return.

## Events
[E1] exit, from the User: converts free credit into HRD. Carries amount, an amount of HRD up to 2.
[E2] enter, from the User: burns HRD back into free credit. Carries amount, an amount of HRD up to 2.
[E3] halt, from the Breaker: exits stop without the Timelock's delay.

## Moves
[M1] When Open receives exit and {held + amount <= 4}, it stays Open, held grows by amount, sends move, sends mint.
[M2] When Open receives enter and {amount <= held}, it stays Open, held drops by amount, sends burn, sends release.
[M3] When Halted receives enter and {amount <= held}, it stays Halted, held drops by amount, sends burn, sends release.
[M4] When Open receives halt, it becomes Halted, live is cleared.
[R1] In Halted, exit and halt are refused.
[R2] In Open and Halted, enter is refused when {amount > held}.
[R3] In Open, exit is refused when {held + amount > 4}.

## Always
[A1] Always, while Halted, live is clear.

## Walks
[W1] Walk Round-trip: from Open, exit amount 2, enter amount 2; ends Open with held 0; move sent once; mint sent once; burn sent once.
[W2] Walk Stopped: from Open, exit amount 1, halt, exit amount 1 refused, enter amount 1; ends Halted with held 0.

## Seams
[X1] Seam with vault: move and release cross from Adapter to Vault carrying the amount.
[X2] Seam with token: mint and burn cross from Adapter to Token carrying the amount.
[X3] Seam with breaker: halt crosses from Breaker to Adapter carrying nothing.

## Guarantees
[K1] Credit held by the adapter equals the token supply. Backing: record adapter#property:held-equals-supply.

## Words only
[T1] This piece promises nothing eventual.

## Retired
