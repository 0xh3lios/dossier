# Vault

Tier: modeled
Module: vault
Pins: vault#observation:checkpoint-2026-11-01

The Vault is Harbor's ledger of debt and internal credit. It holds debt, an amount of HRD up to 4. It holds free, an amount of HRD up to 4. It holds issued, an amount of HRD up to 4. It holds ceiling, a count from 2 to 4, starting at 2. It receives borrow and repay from the User, move and release from the Adapter, and change from the Timelock. It never knows who holds the HRD the Adapter mints.

## States
[S1] Open: the vault accepts borrowing, repayments and credit moves.

## Events
[E1] borrow, from the User: takes on debt against collateral. Carries amount, an amount of HRD up to 2.
[E2] repay, from the User: repays debt from free credit. Carries amount, an amount of HRD up to 2.
[E3] move, from the Adapter: free credit is handed to the adapter. Carries amount, an amount of HRD up to 2.
[E4] release, from the Adapter: credit held by the adapter returns to the user. Carries amount, an amount of HRD up to 2.
[E5] change, from the Timelock: an executed plan raises the ceiling by one.

## Moves
[M1] When Open receives borrow and {debt + amount <= ceiling}, it stays Open, debt grows by amount, free grows by amount.
[M2] When Open receives repay and {amount <= free} and {amount <= debt}, it stays Open, debt drops by amount, free drops by amount.
[M3] When Open receives move and {amount <= free}, it stays Open, free drops by amount, issued grows by amount.
[M4] When Open receives release and {amount <= issued}, it stays Open, issued drops by amount, free grows by amount.
[M5] When Open receives change and ceiling is below 4, it stays Open, ceiling grows by one.
[M6] When Open receives change and ceiling is 4, it stays Open.
[R1] In Open, borrow is refused when {debt + amount > ceiling}.
[R2] In Open, repay is refused when {amount > free or amount > debt}.
[R3] In Open, move is refused when {amount > free}.
[R4] In Open, release is refused when {amount > issued}.

## Always
[A1] Always, {debt = free + issued}.
[A2] Always, {debt <= ceiling}.

## Walks
[W1] Walk Borrow: from Open, borrow amount 2, repay amount 1; ends Open with debt 1, free 1.
[W2] Walk Overdraw: from Open, borrow amount 2, borrow amount 1 refused; ends Open with debt 2.
[W3] Walk Raised: from Open, borrow amount 2, borrow amount 1 refused, change, borrow amount 1; ends Open with debt 3, ceiling 3.

## Seams
[X1] Seam with adapter: move and release cross from Adapter to Vault carrying the amount.
[X2] Seam with timelock: change crosses from Timelock to Vault carrying nothing.

## Guarantees
[K1] Debt equals free plus issued on the deployed Vault. Backing: certora certora/Vault.spec#debtEqualsCredit at 1a2b9f8e.
[K2] A borrow increases debt by exactly the amount borrowed. Backing: certora certora/Vault.spec#borrowIncreasesDebt at 1a2b9f8e.
[K3] Only the Adapter moves credit between free and issued. Backing: certora certora/Vault.spec#onlyAdapterMovesCredit at 1a2b9f8e.
[K4] The ceiling is raised only by an executed plan. Backing: none.

## Words only
[T1] This piece promises nothing eventual.
[T2] Collateral and prices are outside the Vault's abstraction; the ceiling stands in for every limit.

## Retired
