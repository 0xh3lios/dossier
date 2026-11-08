# Token

Tier: modeled
Module: token

The Token is Harbor's HRD. It holds supply, an amount of HRD up to 4. It receives mint and burn from the Adapter, and transfer from the Holder. It never knows why the Adapter mints.

## States
[S1] Live: the token mints, burns and transfers.

## Events
[E1] mint, from the Adapter: new HRD for credit the adapter now holds. Carries amount, an amount of HRD up to 2.
[E2] burn, from the Adapter: HRD returned for credit. Carries amount, an amount of HRD up to 2.
[E3] transfer, from the Holder: HRD changes hands; the supply does not.

## Moves
[M1] When Live receives mint and {supply + amount <= 4}, it stays Live, supply grows by amount.
[M2] When Live receives burn and {amount <= supply}, it stays Live, supply drops by amount.
[M3] When Live receives transfer, it stays Live.
[R1] In Live, mint is refused when {supply + amount > 4}.
[R2] In Live, burn is refused when {amount > supply}.

## Always
[A1] Always, {supply <= 4}.

## Walks
[W1] Walk Mint-and-burn: from Live, mint amount 2, transfer, burn amount 2; ends Live with supply 0.

## Seams
[X1] Seam with adapter: mint and burn cross from Adapter to Token carrying the amount.

## Guarantees
[K1] The supply changes only through mint and burn, which only the Adapter may call. Backing: record token#property:supply-only-via-adapter.

## Words only
[T1] This piece promises nothing eventual.
[T2] Balances per holder are the Holder's business; only the supply is modeled here.

## Retired
