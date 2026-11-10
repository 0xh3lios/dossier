```json
{
  "format": "dossier-collection@0.2.0",
  "behaviors": [
    "borrow-and-repay",
    "move-credit",
    "raise-ceiling"
  ]
}
```

# Vault

The Vault records debt and internal credit in Harbor. Borrowing creates debt and free credit together. The Adapter moves credit between free and issued, while a Timelock change raises the borrowing ceiling. HRD is the unit used for these amounts.

Read the behaviors in this order:

1. [Borrow and repay](behaviors/borrow-and-repay.md#borrow-and-repay): paired accounting changes and the debt ceiling.
2. [Move credit through the Adapter](behaviors/move-credit.md#move-credit-through-the-adapter): the two credit balances that back token conversion.
3. [Raise the ceiling](behaviors/raise-ceiling.md#raise-the-ceiling): the modeled change and its finite upper limit.

The [formal abstraction](prose.md) bounds debt and credit at four and action amounts at two. It leaves out collateral, prices and individual holders. The conservation proof concerns those model variables. [Supply](../../compositions/supply/README.md) relates them to the Adapter and Token.

The Overdraw and Raised walks have no model-side witness. The source guarantee that only an executed plan raises the ceiling is unbacked and rejected by the owner. A model transition from the Timelock does not settle that source claim. Existing source replays and guarantee backings retain their own scope in the [ledger](ledger.md).
